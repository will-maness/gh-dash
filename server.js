#!/usr/bin/env node
/**
 * gh-dash HTTP server.
 *
 * Serves the static public/ directory and exposes a refresh endpoint that
 * spawns the CLI to update data for a single repo.
 *
 * Usage:
 *   node --env-file=.env server.js
 *
 * Endpoints:
 *   GET  /            → public/index.html
 *   GET  /<file>      → public/<file>
 *   POST /refresh?repo=owner/repo  → runs cli.js for that repo, blocks until done
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const REPOS = [
  'axios/axios',
  'vercel/next.js',
  'lodash/lodash',
  'facebook/react',
  'vuejs/vue',
];

/** MIME type map for files served from public/ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

/**
 * Serve a static file from public/.
 * @param {http.ServerResponse} res
 * @param {string} filePath - absolute path inside public/
 */
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

/**
 * Run the CLI for one or more repos and resolve/reject when it exits.
 * @param {string[]} repos - array of "owner/repo" slugs
 * @returns {Promise<void>}
 */
function runCLI(repos) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--env-file=.env', 'cli.js', '--repos', ...repos],
      { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`cli.js exited with code ${code}`));
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Parse URL (base required by URL constructor in Node)
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // POST /refresh?repo=owner/repo
  if (req.method === 'POST' && pathname === '/refresh') {
    const repoParam = parsedUrl.searchParams.get('repo');

    if (!repoParam || !REPOS.includes(repoParam)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: `Unknown repo: ${repoParam}` }));
      return;
    }

    // Respond immediately so the browser can start polling /progress
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, status: 'accepted' }));

    console.log(`[refresh] Starting CLI run for ${repoParam}`);
    runCLI([repoParam])
      .then(() => console.log(`[refresh] Done: ${repoParam}`))
      .catch((err) => console.error(`[refresh] Failed: ${err.message}`));
    return;
  }

  // POST /refresh-all  — refresh every in-scope repo in one CLI pass
  if (req.method === 'POST' && pathname === '/refresh-all') {
    // Respond immediately so the browser can start polling /progress
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, status: 'accepted' }));

    console.log(`[refresh-all] Starting CLI run for all ${REPOS.length} repos`);
    runCLI(REPOS)
      .then(() => console.log('[refresh-all] Done'))
      .catch((err) => console.error(`[refresh-all] Failed: ${err.message}`));
    return;
  }

  // GET /progress — return progress.json (or idle state if absent)
  if (req.method === 'GET' && pathname === '/progress') {
    const progressPath = path.join(__dirname, 'public', 'progress.json');
    fs.readFile(progressPath, (err, data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (err) {
        res.end(JSON.stringify({ running: false, completed: 0, total: 0 }));
      } else {
        res.end(data);
      }
    });
    return;
  }

  // Static file serving from public/
  if (req.method === 'GET') {
    // Map / → /index.html
    const filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // Guard against path traversal outside public/
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    serveFile(res, filePath);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`gh-dash server running at http://localhost:${PORT}`);
  console.log(`Serving: ${PUBLIC_DIR}`);
});
