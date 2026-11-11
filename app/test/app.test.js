const { test, describe } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { requestHandler } = require('../src/app');

// Helper to simulate an HTTP request and capture response without network sockets
function simulateRequest({ method = 'GET', url = '/', headers = {} }) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost:3000', ...headers };

    let statusCode = 200;
    let responseHeaders = {};
    let responseBody = '';

    const res = {
      setHeader(name, value) {
        responseHeaders[name] = value;
      },
      writeHead(code, headers = {}) {
        statusCode = code;
        Object.assign(responseHeaders, headers);
      },
      end(chunk) {
        if (chunk) responseBody += chunk;
        resolve({
          statusCode,
          headers: responseHeaders,
          body: responseBody,
          json: () => JSON.parse(responseBody)
        });
      }
    };

    requestHandler(req, res);
  });
}

describe('Cloud API Microservice Unit Tests', () => {
  test('GET / returns 200 with success status and metadata', async () => {
    const res = await simulateRequest({ method: 'GET', url: '/' });
    assert.strictEqual(res.statusCode, 200);

    const data = res.json();
    assert.strictEqual(data.status, 'success');
    assert.ok(data.version);
    assert.ok(data.timestamp);
  });

  test('GET /health (Liveness Probe) returns 200 and healthy status', async () => {
    const res = await simulateRequest({ method: 'GET', url: '/health' });
    assert.strictEqual(res.statusCode, 200);

    const data = res.json();
    assert.strictEqual(data.status, 'healthy');
    assert.strictEqual(typeof data.uptime, 'number');
  });

  test('GET /ready (Readiness Probe) returns 200 and ready status', async () => {
    const res = await simulateRequest({ method: 'GET', url: '/ready' });
    assert.strictEqual(res.statusCode, 200);

    const data = res.json();
    assert.strictEqual(data.status, 'ready');
    assert.strictEqual(data.database, 'connected');
  });

  test('GET /api/v1/info returns cloud and orchestrator metadata', async () => {
    const res = await simulateRequest({ method: 'GET', url: '/api/v1/info' });
    assert.strictEqual(res.statusCode, 200);

    const data = res.json();
    assert.strictEqual(data.cloud, 'AWS');
    assert.strictEqual(data.orchestrator, 'Amazon EKS');
    assert.strictEqual(data.ci_cd, 'GitHub Actions');
  });

  test('GET /unknown-endpoint returns 404 Not Found', async () => {
    const res = await simulateRequest({ method: 'GET', url: '/unknown-endpoint' });
    assert.strictEqual(res.statusCode, 404);

    const data = res.json();
    assert.strictEqual(data.error, 'Endpoint Not Found');
  });
});
