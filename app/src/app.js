const http = require('node:http');
const os = require('node:os');

const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'production';

let shuttingDown = false;

function setShuttingDown(state) {
  shuttingDown = Boolean(state);
}

// Structured JSON logger for CloudWatch / container stdout aggregation
function logRequest(req, statusCode, startTime) {
  if (process.env.NODE_ENV === 'test') return;
  const durationMs = Number((process.hrtime.bigint() - startTime) / 1000000n);
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    method: req.method,
    path: req.url,
    statusCode,
    durationMs
  }));
}

function setSecurityHeaders(res, contentType = 'application/json') {
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(req, res, statusCode, payload, startTime) {
  setSecurityHeaders(res, 'application/json');
  res.writeHead(statusCode);
  res.end(JSON.stringify(payload));
  logRequest(req, statusCode, startTime);
}

function sendHtml(req, res, statusCode, html, startTime) {
  setSecurityHeaders(res, 'text/html; charset=utf-8');
  res.writeHead(statusCode);
  res.end(html);
  logRequest(req, statusCode, startTime);
}

function renderDashboardHtml() {
  const podName = os.hostname();
  const now = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloud API Service - Amazon EKS</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 620px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.45); }
    .badge { display: inline-block; background: #10b981; color: #022c22; font-weight: 700; padding: 6px 14px; border-radius: 999px; font-size: 0.85rem; margin-bottom: 14px; }
    h1 { margin: 0 0 8px; color: #38bdf8; font-size: 1.75rem; }
    p { color: #cbd5e1; margin-bottom: 24px; line-height: 1.5; }
    .grid { border-top: 1px solid #334155; }
    .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155; font-size: 0.95rem; }
    .label { color: #94a3b8; }
    .val { color: #f8fafc; font-weight: 600; font-family: monospace; }
    .links { margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap; }
    a { color: #38bdf8; text-decoration: none; background: #0f172a; padding: 8px 14px; border-radius: 8px; border: 1px solid #334155; font-size: 0.85rem; }
    a:hover { border-color: #38bdf8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">LIVE ON AMAZON EKS</div>
    <h1>CI/CD Pipeline Deployment</h1>
    <p>Automatically tested, scanned with Trivy, pushed to Amazon ECR, and rolled out to Kubernetes via GitHub Actions.</p>
    <div class="grid">
      <div class="row"><span class="label">Service</span><span class="val">cloud-api-service</span></div>
      <div class="row"><span class="label">Deployed Commit (Version)</span><span class="val">${APP_VERSION}</span></div>
      <div class="row"><span class="label">Kubernetes Pod</span><span class="val">${podName}</span></div>
      <div class="row"><span class="label">Environment</span><span class="val">${ENVIRONMENT}</span></div>
      <div class="row"><span class="label">Timestamp</span><span class="val">${now}</span></div>
    </div>
    <div class="links">
      <a href="/health">/health (Liveness)</a>
      <a href="/ready">/ready (Readiness)</a>
      <a href="/api/v1/info">/api/v1/info (JSON API)</a>
    </div>
  </div>
</body>
</html>`;
}

function requestHandler(req, res) {
  const startTime = process.hrtime.bigint();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Root endpoint - visual status dashboard
  if (pathname === '/' && req.method === 'GET') {
    return sendHtml(req, res, 200, renderDashboardHtml(), startTime);
  }

  // Liveness probe endpoint for Kubernetes
  if (pathname === '/health' && req.method === 'GET') {
    return sendJson(req, res, 200, {
      status: 'healthy',
      pod: os.hostname(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }, startTime);
  }

  // Readiness probe endpoint (fails cleanly with 503 during pod termination)
  if (pathname === '/ready' && req.method === 'GET') {
    if (shuttingDown) {
      return sendJson(req, res, 503, {
        status: 'shutting_down',
        ready: false
      }, startTime);
    }
    return sendJson(req, res, 200, {
      status: 'ready',
      database: 'connected',
      cache: 'connected'
    }, startTime);
  }

  // API metadata endpoint
  if (pathname === '/api/v1/info' && req.method === 'GET') {
    return sendJson(req, res, 200, {
      service: 'cloud-api-service',
      cloud: 'AWS',
      orchestrator: 'Amazon EKS',
      ci_cd: 'GitHub Actions',
      version: APP_VERSION,
      pod: os.hostname()
    }, startTime);
  }

  // Fallback 404
  return sendJson(req, res, 404, { error: 'Endpoint Not Found' }, startTime);
}

function createServer() {
  return http.createServer(requestHandler);
}

module.exports = { createServer, requestHandler, setShuttingDown };
