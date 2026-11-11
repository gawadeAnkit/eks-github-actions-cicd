const http = require('node:http');

const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'production';

function requestHandler(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Content-Type', 'application/json');

  // Root endpoint
  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: 'success',
      message: 'Cloud API Service deployed via GitHub Actions on Amazon EKS',
      version: APP_VERSION,
      environment: ENVIRONMENT,
      timestamp: new Date().toISOString()
    }));
  }

  // Liveness probe endpoint for Kubernetes
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  }

  // Readiness probe endpoint for Kubernetes
  if (pathname === '/ready' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: 'ready',
      database: 'connected',
      cache: 'connected'
    }));
  }

  // API metadata endpoint
  if (pathname === '/api/v1/info' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      service: 'cloud-api-service',
      cloud: 'AWS',
      orchestrator: 'Amazon EKS',
      ci_cd: 'GitHub Actions'
    }));
  }

  // Fallback 404
  res.writeHead(404);
  return res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
}

function createServer() {
  return http.createServer(requestHandler);
}

module.exports = { createServer, requestHandler };
