import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as fs from 'fs';
import * as path from 'path';

// Load .env manualy
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function listVoices() {
    const client = new TextToSpeechClient();
    const [result] = await client.listVoices({ languageCode: 'ja-JP' });

    console.log('Available Voices:');
    result.voices?.forEach(voice => {
        if (voice.name?.includes('Neural2')) {
            console.log(`${voice.name}: ${voice.ssmlGender}`);
        }
    });
}

listVoices();
