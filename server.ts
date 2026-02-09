import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const DATA_FILE = path.join(process.cwd(), 'data/jobs.json');

// Clients map: workshop_id -> Set<WebSocket>
const clients = new Map<string, Set<WebSocket>>();

function log(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    // Optional: write to file if needed, but stdout is better for Docker
}

function readJobs(): any[] {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        return [];
    }
}

function broadcastUpdate(workshopId: string, job: any) {
    const workshopClients = clients.get(workshopId);
    log(`[WS] Broadcasting update for ${workshopId} to ${workshopClients?.size ?? 0} clients. Job: ${job.status}`);
    if (workshopClients) {
        const msg = JSON.stringify({ type: 'job_update', job });
        for (const client of Array.from(workshopClients)) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        }
    }
}

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            const { pathname, query } = parsedUrl;

            // Handle Internal Notification (replacing the separate process on port 3002)
            if (req.method === 'POST' && pathname === '/notify-update') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
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
                return;
            }

            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const wss = new WebSocketServer({ server });

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

        // Send initial snapshot
        const jobs = readJobs().filter(j => j.group_id?.startsWith(workshopId) || true);
        ws.send(JSON.stringify({ type: 'snapshot', jobs }));

        ws.on('close', () => {
            clients.get(workshopId)?.delete(ws);
            if (clients.get(workshopId)?.size === 0) {
                clients.delete(workshopId);
            }
        });
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> WebSocket Server ready (integrated)`);
    });
});
