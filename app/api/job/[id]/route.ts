import { NextRequest, NextResponse } from 'next/server';
import { deleteJob, updateJob, getJobResult } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const result = getJobResult(params.id);
    if (!result) {
        return NextResponse.json({ error: 'Result not ready' }, { status: 404 });
    }
    // API 経由で音声を配信する URL に変換（Render/Docker で確実に再生するため）
    const audioPath = result.audio_url.replace(/^\/audio\//, '/api/audio/');
    const origin = req.nextUrl?.origin ?? new URL(req.url).origin;
    const absoluteAudioUrl = result.audio_url.startsWith('http') ? result.audio_url : `${origin}${audioPath.startsWith('/') ? '' : '/'}${audioPath}`;
    return NextResponse.json({ ...result, audio_url: absoluteAudioUrl });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const { title } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title required' }, { status: 400 });
        }

        const updatedJob = updateJob(params.id, { title });
        if (!updatedJob) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json(updatedJob);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const success = deleteJob(params.id);
        if (!success) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }
}
