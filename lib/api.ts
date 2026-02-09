import { JobResult } from '../types/job';

export async function fetchJobResult(jobId: string): Promise<JobResult> {
  const res = await fetch(`/api/job/${jobId}`);
  if (!res.ok) throw new Error('Not ready');
  return res.json();
}

export async function retryJob(jobId: string) {
  await fetch(`/api/job/${jobId}/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function deleteJob(jobId: string) {
  const res = await fetch(`/api/job/${jobId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}

export async function updateJobTitle(jobId: string, title: string) {
  const res = await fetch(`/api/job/${jobId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}
