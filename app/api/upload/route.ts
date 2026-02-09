import { NextRequest, NextResponse } from 'next/server';
import { saveJob } from '@/lib/db';
import { startJob } from '@/lib/worker';
import { Job } from '@/types/job';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const groupId = formData.get('group_id') as string;
        const workshopId = formData.get('workshop_id') as string;
        const voiceId = formData.get('voice_id') as string;

        if (!file || !groupId) {
            return NextResponse.json({ error: 'Missing file or group_id' }, { status: 400 });
        }

        const jobId = `job_${Date.now()}_${groupId}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, `${jobId}_${file.name}`);
        fs.writeFileSync(filePath, buffer);

        // Initial Job State
        const job: Job = {
            job_id: jobId,
            group_id: groupId,
            status: 'uploaded',
            progress: 0,
            title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
            voice: voiceId
        };
        saveJob(job);

        // Trigger Real Worker
        startJob(jobId, groupId, filePath, voiceId);

        return NextResponse.json({ job_id: jobId });
    } catch (e) {
        console.error('Upload Error Details:', e);
        return NextResponse.json({ error: 'Upload failed: ' + (e as Error).message }, { status: 500 });
    }
}
