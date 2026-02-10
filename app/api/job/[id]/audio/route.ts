import { NextRequest, NextResponse } from 'next/server';
import { getJobResult } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

/**
 * GET /api/job/[id]/audio — ジョブIDで音声を配信（Render で確実に再生するためジョブ紐付けで配信）
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;
  const result = getJobResult(jobId);
  if (!result) {
    return NextResponse.json({ error: 'Result not ready' }, { status: 404 });
  }

  // result.audio_url は /audio/job_xxx.mp3 形式
  const filename = result.audio_url.replace(/^\/audio\//, '').replace(/^\/api\/audio\//, '');
  if (!filename || !filename.endsWith('.mp3')) {
    console.error('[audio] Invalid audio_url for job', jobId, result.audio_url);
    return NextResponse.json({ error: 'Invalid audio url' }, { status: 500 });
  }

  const filePath = path.join(AUDIO_DIR, filename);
  let buffer: Buffer;
  let stat: fs.Stats;
  try {
    buffer = await fs.promises.readFile(filePath);
    stat = await fs.promises.stat(filePath);
  } catch (err) {
    console.error('[audio] File not found:', filePath, 'cwd:', process.cwd(), err);
    return new NextResponse(null, {
      status: 404,
      headers: { 'X-Audio-Error': 'file-not-found' },
    });
  }

  const range = req.headers.get('range');
  if (range) {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new NextResponse(null, { status: 416 });
    }
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
    const chunk = buffer.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
    },
  });
}
