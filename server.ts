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

// Render では DATA_DIR=/tmp/data を設定（db.ts と同一にすること）
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'jobs.json');

// Clients map: workshop_id -> Set<WebSocket>
const clients = new Map<string, Set<WebSocket>>();

function log(msg: string) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
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

            // Serve dynamically generated files (audio, uploads) directly
            // Render では AUDIO_OUTPUT_DIR / UPLOADS_DIR で /tmp を指す
            if (pathname && (pathname.startsWith('/audio/') || pathname.startsWith('/uploads/'))) {
                const baseDir = pathname.startsWith('/audio/')
                    ? (process.env.AUDIO_OUTPUT_DIR || path.join(process.cwd(), 'public', 'audio'))
                    : (process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads'));
                const filename = pathname.replace(/^\/audio\//, '').replace(/^\/uploads\//, '');
                const filePath = path.join(baseDir, filename);
                try {
                    await fs.promises.access(filePath, fs.constants.F_OK);
                    const ext = path.extname(filePath).toLowerCase();
                    const mimeTypes: Record<string, string> = {
                        '.mp3': 'audio/mpeg',
                        '.wav': 'audio/wav',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.png': 'image/png',
                    };
                    const contentType = mimeTypes[ext] || 'application/octet-stream';
                    const stat = await fs.promises.stat(filePath);

                    // Support Range requests for audio streaming
                    const range = req.headers.range;
                    if (range) {
                        const parts = range.replace(/bytes=/, '').split('-');
                        const start = parseInt(parts[0], 10);
                        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                        res.writeHead(206, {
                            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                            'Accept-Ranges': 'bytes',
                            'Content-Length': end - start + 1,
                            'Content-Type': contentType,
                        });
                        fs.createReadStream(filePath, { start, end }).pipe(res);
                    } else {
                        res.writeHead(200, {
                            'Content-Length': stat.size,
                            'Content-Type': contentType,
                            'Accept-Ranges': 'bytes',
                        });
                        fs.createReadStream(filePath).pipe(res);
                    }
                    return;
                } catch {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
            }

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

    const wss = new WebSocketServer({ noServer: true });

    // Only handle upgrade for workshop WS connections, not Next.js HMR
    server.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const workshopId = url.searchParams.get('workshop_id');

        if (!workshopId) {
            // Let Next.js handle HMR and other WS connections
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const workshopId = url.searchParams.get('workshop_id')!;

        log(`[WS] New connection: workshopId=${workshopId}`);

        if (!clients.has(workshopId)) {
            clients.set(workshopId, new Set());
        }
        clients.get(workshopId)!.add(ws);

        // Send initial snapshot
        const jobs = readJobs();
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
