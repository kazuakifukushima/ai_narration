import { NextRequest, NextResponse } from 'next/server';
import { getAudioDir } from '@/lib/audio-dir';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/audio/[filename] — 音声ファイルを配信（Render/Docker で確実に再生するため Next.js API 経由で配信）
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  // path traversal 対策: ファイル名にスラッシュや .. を許可しない
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }
  if (!filename.toLowerCase().endsWith('.mp3')) {
    return NextResponse.json({ error: 'Only .mp3 allowed' }, { status: 400 });
  }

  const filePath = path.join(getAudioDir(), filename);
  let buffer: Buffer;
  let stat: fs.Stats;
  try {
    buffer = await fs.promises.readFile(filePath);
    stat = await fs.promises.stat(filePath);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
