"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const ws_1 = require("ws");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
const DATA_FILE = path.join(process.cwd(), 'data/jobs.json');
// Clients map: workshop_id -> Set<WebSocket>
const clients = new Map();
function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}
function readJobs() {
    try {
        if (!fs.existsSync(DATA_FILE))
            return [];
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    catch (e) {
        return [];
    }
}
function broadcastUpdate(workshopId, job) {
    const workshopClients = clients.get(workshopId);
    log(`[WS] Broadcasting update for ${workshopId} to ${workshopClients?.size ?? 0} clients. Job: ${job.status}`);
    if (workshopClients) {
        const msg = JSON.stringify({ type: 'job_update', job });
        for (const client of Array.from(workshopClients)) {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(msg);
            }
        }
    }
}
app.prepare().then(() => {
    const server = (0, http_1.createServer)(async (req, res) => {
        try {
            const parsedUrl = (0, url_1.parse)(req.url, true);
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
                    }
                    catch (e) {
                        log(`[HTTP] Error parsing body or broadcasting: ${e}`);
                        res.writeHead(400);
                        res.end('error');
                    }
                });
                return;
            }
            await handle(req, res, parsedUrl);
        }
        catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });
    const wss = new ws_1.WebSocketServer({ server });
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
        clients.get(workshopId).add(ws);
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
