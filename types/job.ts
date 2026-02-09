export type JobStatus = 'uploaded' | 'analyzing' | 'narrating' | 'done' | 'error' | 'deleted';

export interface Job {
  job_id: string;
  group_id: string;
  status: JobStatus;
  progress?: number;
  title?: string;
  voice?: string;
}

export interface JobResult {
  job_id: string;
  group_id: string;
  summary_text: string;
  audio_url: string;
  duration_sec: number;
}
