const http = require('node:http');

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

function setSecurityHeaders(res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(req, res, statusCode, payload, startTime) {
  setSecurityHeaders(res);
  res.writeHead(statusCode);
  res.end(JSON.stringify(payload));
  logRequest(req, statusCode, startTime);
}

function requestHandler(req, res) {
  const startTime = process.hrtime.bigint();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Root endpoint
  if (pathname === '/' && req.method === 'GET') {
    return sendJson(req, res, 200, {
      status: 'success',
      message: 'Cloud API Service deployed via GitHub Actions on Amazon EKS',
      version: APP_VERSION,
      environment: ENVIRONMENT,
      timestamp: new Date().toISOString()
    }, startTime);
  }

  // Liveness probe endpoint for Kubernetes
  if (pathname === '/health' && req.method === 'GET') {
    return sendJson(req, res, 200, {
      status: 'healthy',
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
      version: APP_VERSION
    }, startTime);
  }

  // Fallback 404
  return sendJson(req, res, 404, { error: 'Endpoint Not Found' }, startTime);
}

function createServer() {
  return http.createServer(requestHandler);
}

module.exports = { createServer, requestHandler, setShuttingDown };
