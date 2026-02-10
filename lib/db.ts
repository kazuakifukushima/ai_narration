import * as fs from 'fs';
import * as path from 'path';
import { Job, JobResult } from '@/types/job';

// Render などで data/ が書き込めない場合は DATA_DIR=/tmp/data を設定
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getJobs(): Job[] {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

export function saveJob(job: Job) {
    const jobs = getJobs();
    const index = jobs.findIndex(j => j.job_id === job.job_id);
    if (index >= 0) {
        jobs[index] = job;
    } else {
        jobs.push(job);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(jobs, null, 2));

    // Notify WS server
    // Fire and forget
    fetch(`http://localhost:${process.env.PORT || 3000}/notify-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, workshopId: 'ws_2026_demo' }) // TODO: dynamic workshop ID
    }).catch(e => console.error('Failed to notify WS server', e));
}

export function updateJob(jobId: string, updates: Partial<Job>) {
    const jobs = getJobs();
    const index = jobs.findIndex(j => j.job_id === jobId);
    if (index === -1) return null;

    jobs[index] = { ...jobs[index], ...updates };
    fs.writeFileSync(DATA_FILE, JSON.stringify(jobs, null, 2));

    // Notify WS server
    fetch(`http://localhost:${process.env.PORT || 3000}/notify-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: jobs[index], workshopId: 'ws_2026_demo' })
    }).catch(e => console.error('Failed to notify WS server', e));

    return jobs[index];
}

export function deleteJob(jobId: string) {
    // 1. Remove from jobs.json
    let jobs = getJobs();
    const job = jobs.find(j => j.job_id === jobId);
    if (!job) return false;

    jobs = jobs.filter(j => j.job_id !== jobId);
    fs.writeFileSync(DATA_FILE, JSON.stringify(jobs, null, 2));

    // 2. Remove from results.json
    if (fs.existsSync(RESULTS_FILE)) {
        let results: JobResult[] = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
        results = results.filter(r => r.job_id !== jobId);
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    }

    // 3. Notify WS server (send a 'deleted' status update or handle client-side)
    // Sending a special status 'deleted' to let client remove it from list
    fetch(`http://localhost:${process.env.PORT || 3000}/notify-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: { ...job, status: 'deleted' }, workshopId: 'ws_2026_demo' })
    }).catch(e => console.error('Failed to notify WS server', e));

    return true;
}

export function getJobResult(jobId: string): JobResult | null {
    try {
        if (!fs.existsSync(RESULTS_FILE)) return null;
        const results: JobResult[] = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
        return results.find(r => r.job_id === jobId) || null;
    } catch (error) {
        return null;
    }
}

export function saveJobResult(result: JobResult) {
    let results: JobResult[] = [];
    try {
        if (fs.existsSync(RESULTS_FILE)) {
            results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
        }
    } catch (e) { }

    const index = results.findIndex(r => r.job_id === result.job_id);
    if (index >= 0) {
        results[index] = result;
    } else {
        results.push(result);
    }
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}
