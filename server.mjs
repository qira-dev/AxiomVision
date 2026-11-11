#!/usr/bin/env node
/**
 * AxiomVision — Universal AI Desktop Automation Engine
 * HTTP / Streamable-HTTP / SSE Daemon on Port 39200
 */
import http from 'node:http';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import { CulMcpBridge } from './lib/bridge.mjs';

const PORT = Number(process.env.AXIOM_UI_PORT || process.env.DESKTOP_UI_MCP_PORT) || 39200;
const HOST = process.env.AXIOM_UI_HOST || process.env.DESKTOP_UI_MCP_HOST || '127.0.0.1';

const bridge = new CulMcpBridge();
const sseSessions = new Map();

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  };
}

function sendJson(res, status, data, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(data));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    ...corsHeaders(),
    ...extraHeaders,
  });
  res.end(body);
}

function readBody(req, limit = 16 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (c) => {
      total += c.length;
      if (total > limit) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      return res.end();
    }

    // Health & status endpoint
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/status')) {
      const tools = await bridge.listTools();
      return sendJson(res, 200, {
        ok: true,
        service: 'AxiomVision',
        description: 'Universal Zero-Hallucination Desktop Automation Engine',
        version: '1.0.0',
        host: HOST,
        port: PORT,
        endpoints: {
          streamable_http: `http://${HOST}:${PORT}/mcp`,
          sse: `http://${HOST}:${PORT}/sse`,
          messages: `http://${HOST}:${PORT}/messages`,
          health: `http://${HOST}:${PORT}/health`,
        },
        tool_count: tools.length,
        tools: tools.map((t) => t.name),
      });
    }

    // Legacy SSE endpoint (/sse)
    if (req.method === 'GET' && url.pathname === '/sse') {
      const sessionId = crypto.randomUUID();
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        ...corsHeaders(),
      });
      res.write(`event: endpoint\ndata: /messages?sessionId=${sessionId}\n\n`);
      sseSessions.set(sessionId, res);
      req.on('close', () => {
        sseSessions.delete(sessionId);
      });
      return;
    }

    // Legacy SSE POST message endpoint (/messages)
    if (req.method === 'POST' && url.pathname === '/messages') {
      const sessionId = url.searchParams.get('sessionId');
      const sseRes = sessionId ? sseSessions.get(sessionId) : null;
      const raw = await readBody(req);
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
      const reply = await bridge.handleJsonRpc(msg);
      if (reply && sseRes && !sseRes.writableEnded) {
        sseRes.write(`event: message\ndata: ${JSON.stringify(reply)}\n\n`);
      }
      res.writeHead(202, corsHeaders());
      return res.end('Accepted');
    }

    // Streamable HTTP MCP endpoint (/mcp)
    if (url.pathname === '/mcp') {
      if (req.method === 'POST') {
        const raw = await readBody(req);
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON' });
        }
        const reply = await bridge.handleJsonRpc(msg);
        if (!reply) {
          res.writeHead(202, corsHeaders());
          return res.end();
        }
        const sid = req.headers['mcp-session-id'] || 's_axiom_ui';
        const proto = req.headers['mcp-protocol-version'] || '2024-11-05';
        return sendJson(res, 200, reply, {
          'Mcp-Session-Id': sid,
          'Mcp-Protocol-Version': proto,
        });
      }

      if (req.method === 'GET') {
        return sendJson(
          res,
          405,
          { jsonrpc: '2.0', error: { code: -32000, message: 'Use POST /mcp for Streamable HTTP or GET /sse for SSE' } },
          { Allow: 'POST, DELETE, OPTIONS' }
        );
      }

      if (req.method === 'DELETE') {
        res.writeHead(200, corsHeaders());
        return res.end();
      }
    }

    return sendJson(res, 404, { error: 'Not found', path: url.pathname });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[AxiomVision] Listening on http://${HOST}:${PORT}/mcp (and /sse, /health)`);
});
