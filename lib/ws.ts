import { Job } from '../types/job';

export function connectWorkshopWS(workshopId: string, onSnapshot: (jobs: Job[]) => void, onUpdate: (job: Job) => void) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const WS_URL = `${protocol}//${window.location.host}?workshop_id=${workshopId}`;
  const ws = new WebSocket(WS_URL);

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'snapshot') onSnapshot(msg.jobs);
    if (msg.type === 'job_update') onUpdate(msg.job);
  };

  ws.onerror = () => ws.close();
  return () => ws.close();
}
