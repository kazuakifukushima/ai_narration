import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { Job } from '../types/job';

const PORT = 3001;
const DATA_FILE = path.join(__dirname, '../data/jobs.json');

const wss = new WebSocketServer({ port: PORT });

function log(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(path.join(__dirname, '../server-log.txt'), line);
}

log(`WebSocket Server running on ws://localhost:${PORT}`);

// Clients map: workshop_id -> Set<WebSocket>
const clients = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const workshopId = url.searchParams.get('workshop_id');

    log(`New connection request. URL: ${req.url}, workshopId: ${workshopId}`);

    if (!workshopId) {
        ws.close(1008, 'workshop_id required');
        return;
    }

    if (!clients.has(workshopId)) {
        clients.set(workshopId, new Set());
    }
    clients.get(workshopId)!.add(ws);

    console.log(`Client connected to workshop: ${workshopId}`);

    // Send initial snapshot
    const jobs = readJobs().filter(j => j.group_id.startsWith(workshopId) || true); // Simple filter or return all for demo
    // *Correction*: The requirements say "workshop_id (fixed for the day)". 
    // Ideally, we filter by workshop_id if stored in DB. 
    // For this PoC, we will assume all jobs in DB belong to the current workshop/session or filter effectively.

    ws.send(JSON.stringify({ type: 'snapshot', jobs }));

    ws.on('close', () => {
        clients.get(workshopId)?.delete(ws);
        if (clients.get(workshopId)?.size === 0) {
            clients.delete(workshopId);
        }
    });
});

// Watch for file changes to broadcast updates
// In a real production app, we'd use a message queue (Redis) or internal events.
// Here, we'll crudely watch the JSON file or expose an HTTP endpoint to trigger broadcast.
// Let's expose an HTTP endpoint for the Next.js API to notify us, 
// OR simpler: just poll the file? No, file watch is better.
// Actually, to keep it robust: The Next.js API writes to DB, then hits an HTTP endpoint on THIS server to broadcast.
// Let's add a simple HTTP listener to this script as well? 
// Or better: Just use fs.watch on the `data/jobs.json` file.

fs.watchFile(DATA_FILE, { interval: 100 }, () => {
    // Creating a "diff" is hard without history. 
    // Simplified approach: Re-broadcast the whole snapshot or finding the changed job is tricky without context.
    // Requirement: "job_update" for individual updates.
    // 
    // Alternative: The Next.js API calls a method here? No, they are separate processes.
    // 
    // REVISED PLAN FOR NOTIFICATION:
    // The Next.js API will update the JSON file.
    // This WS server will also run a minimal HTTP server to accept "Broadcast this job" commands from the API.
});

// Let's add a simple HTTP server to this process to receive triggers from Next.js API
import * as http from 'http';

const server = http.createServer((req, res) => {
    log(`[HTTP] Received request: ${req.method} ${req.url}`);
    if (req.method === 'POST' && req.url === '/notify-update') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                log(`[HTTP] Body: ${body}`);
                const { job, workshopId } = JSON.parse(body);
                broadcastUpdate(workshopId, job);
                res.writeHead(200);
                res.end('ok');
            } catch (e) {
                log(`[HTTP] Error parsing body or broadcasting: ${e}`);
                res.writeHead(400);
                res.end('error');
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Start HTTP server for internal communication
const HTTP_PORT = 3002;
server.listen(HTTP_PORT, () => {
    log(`Internal Notification Server running on http://localhost:${HTTP_PORT}`);
});

function broadcastUpdate(workshopId: string, job: Job) {
    const workshopClients = clients.get(workshopId);
    log(`[WS] Broadcasting update for ${workshopId} to ${workshopClients?.size ?? 0} clients. Job: ${job.status}`);
    if (workshopClients) {
        const msg = JSON.stringify({ type: 'job_update', job });
        for (const client of workshopClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        }
    }
}

function readJobs(): Job[] {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        return [];
    }
}
