import { NextRequest, NextResponse } from 'next/server';
import { getJobs, saveJob } from '@/lib/db';
import { getUploadsDir } from '@/lib/audio-dir';
import { startJob } from '@/lib/worker';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const jobs = getJobs();
    const job = jobs.find(j => j.job_id === params.id);

    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Find the file (Warning: We need to know the original filename or search)
    const uploadDir = getUploadsDir();
    const files = fs.readdirSync(uploadDir);
    const filename = files.find(f => f.startsWith(job.job_id));

    if (!filename) {
        return NextResponse.json({ error: 'File not found for retry' }, { status: 404 });
    }

    // Reset status
    job.status = 'uploaded';
    job.progress = 0;
    saveJob(job);

    // Restart worker
    startJob(job.job_id, job.group_id, path.join(uploadDir, filename));

    return NextResponse.json({ success: true });
}
