#!/usr/bin/env node
/**
 * AxiomUI Stdio Transport Entrypoint (Singleton Daemon Proxy)
 * Routes all stdio MCP requests through the persistent singleton HTTP daemon
 * on http://127.0.0.1:39200/mcp so multiple IDE agents/sub-agents share a single
 * Wayland portal session, OCR concurrency queue, and in-memory cache (zero duplicate
 * processes, zero CPU spikes, zero repeated Wayland permission prompts).
 */
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CulMcpBridge } from './lib/bridge.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = process.env.AXIOM_UI_ROOT || __dirname;
const PORT = Number(process.env.AXIOM_UI_PORT || process.env.DESKTOP_UI_MCP_PORT) || 39200;
const HOST = process.env.AXIOM_UI_HOST || process.env.DESKTOP_UI_MCP_HOST || '127.0.0.1';
const DAEMON_URL = `http://${HOST}:${PORT}/mcp`;

let fallbackBridge = null;
let ensureDaemonPromise = null;

async function isDaemonUp() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 800);
    const res = await fetch(DAEMON_URL.replace(/\/mcp$/, '/health'), { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureDaemonStarted() {
  if (await isDaemonUp()) return true;
  if (ensureDaemonPromise) return ensureDaemonPromise;

  ensureDaemonPromise = new Promise((resolve) => {
    execFile(path.join(ROOT_DIR, 'axiomui'), ['up'], { timeout: 5000 }, async () => {
      const ok = await isDaemonUp();
      ensureDaemonPromise = null;
      resolve(ok);
    });
  });
  return ensureDaemonPromise;
}

async function forwardToDaemon(msg) {
  const up = await ensureDaemonStarted();
  if (up) {
    try {
      const res = await fetch(DAEMON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
      if (res.status === 202) return null;
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }

  if (!fallbackBridge) {
    fallbackBridge = new CulMcpBridge();
  }
  return fallbackBridge.handleJsonRpc(msg);
}

function writeStdoutLine(line) {
  return new Promise((resolve) => {
    if (process.stdout.write(line + '\n')) {
      resolve();
    } else {
      process.stdout.once('drain', resolve);
    }
  });
}

let stdinBuf = '';
let processingChain = Promise.resolve();

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  stdinBuf += chunk;
  let idx;
  while ((idx = stdinBuf.indexOf('\n')) !== -1) {
    const line = stdinBuf.slice(0, idx).trim();
    stdinBuf = stdinBuf.slice(idx + 1);
    if (!line) continue;
    processingChain = processingChain.then(async () => {
      try {
        const msg = JSON.parse(line);
        const reply = await forwardToDaemon(msg);
        if (reply) {
          await writeStdoutLine(JSON.stringify(reply));
        }
      } catch {
        // Ignore malformed lines
      }
    });
  }
});

process.stdin.on('end', () => {
  processingChain.finally(() => {
    process.stdout.end(() => process.exit(0));
  });
});
