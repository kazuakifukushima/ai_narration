import { saveJob, saveJobResult, updateJob } from './db';
import { Job } from '@/types/job';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Note: Google TTS uses GOOGLE_APPLICATION_CREDENTIALS implicitly

if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set. Mock mode might be preferred if testing without keys.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

function log(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(path.join(process.cwd(), 'worker-log.txt'), line);
}

// --- Helpers ---
function fileToGenerativePart(path: string, mimeType: string) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString('base64'),
            mimeType,
        },
    };
}

export async function startJob(jobId: string, groupId: string, filePath: string, voiceId?: string) {
    try {
        log(`[${jobId}] Starting job`);
        updateStatus(jobId, groupId, 'analyzing', 10);

        // 1. Vision Analysis (Gemini)
        log(`[${jobId}] Calling Gemini Vision (3.0 Flash Preview)...`);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const prompt = `
      このホワイトボードの画像を分析し、そこに書かれている内容を読み取ってください。
      特に、感染症対応などの文脈で書かれている「疑う」「分ける」「守る」「つなぐ」の4つのキーワードと、それぞれの具体的な内容を正確に抽出してください。

      その上で、医師会研修の講師が読み上げるための、全体で1分程度（約300〜400文字）の落ち着いた日本語のナレーション原稿を作成してください。
      
      構成:
      1. 導入（この図解が何を示しているか）
      2. 4つのポイント（疑う・分ける・守る・つなぐ）の解説
      3. まとめ

      出力フォーマット:
      ---
      [要約]
      - 疑う: (内容)
      - 分ける: (内容)
      - 守る: (内容)
      - つなぐ: (内容)
      
      [原稿]
      (ここに読み上げ原稿テキストのみを記述してください。見出しなどは含めず、話し言葉で書いてください)
      ---
    `;

        const imagePart = fileToGenerativePart(filePath, 'image/jpeg');
        // Note: In a real robust app, detect mime type. For this workshop, assume standard image uploads.

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        log(`[${jobId}] Gemini Response: ${text.substring(0, 100)}...`);

        // Extract Script (Simple parsing)
        // Fallback: use the whole text if not formatted perfectly
        const scriptMatch = text.match(/\[原稿\]([\s\S]*?)(---|$)/);
        const script = scriptMatch ? scriptMatch[1].trim() : text;

        updateStatus(jobId, groupId, 'narrating', 50);

        // 2. Text-to-Speech (Google Cloud TTS)
        log(`[${jobId}] Calling TTS... Voice: ${voiceId || 'default'}`);
        const ttsClient = new TextToSpeechClient();
        const request = {
            input: { text: script },
            voice: { languageCode: 'ja-JP', name: voiceId || 'ja-JP-Neural2-B' }, // Use selected voice or default (Female)
            audioConfig: { audioEncoding: 'MP3' as const },
        };

        const [ttsResponse] = await ttsClient.synthesizeSpeech(request);
        const audioBuffer = ttsResponse.audioContent;

        if (!audioBuffer) throw new Error('TTS failed to generate audio');

        log(`[${jobId}] TTS Success. Saving file.`);

        // Save Audio File
        const audioFileName = `${jobId}.mp3`;
        const audioDir = path.join(process.cwd(), 'public/audio');
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

        fs.writeFileSync(path.join(audioDir, audioFileName), audioBuffer, 'binary');

        // 3. Complete
        updateStatus(jobId, groupId, 'done', 100);

        saveJobResult({
            job_id: jobId,
            group_id: groupId,
            summary_text: text, // Save full analysis as summary
            audio_url: `/audio/${audioFileName}`,
            duration_sec: 60 // Approximation, could calculate from buffer size
        });

    } catch (error) {
        log(`[${jobId}] Error: ${error}`);
        console.error(`[Job ${jobId}] Error:`, error);
        updateStatus(jobId, groupId, 'error', 0);
    }
}

function updateStatus(jobId: string, groupId: string, status: Job['status'], progress: number) {
    updateJob(jobId, { status, progress });
}
