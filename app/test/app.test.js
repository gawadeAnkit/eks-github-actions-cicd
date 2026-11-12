process.env.NODE_ENV = 'test';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { requestHandler, setShuttingDown } = require('../src/app');

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
        responseHeaders[name.toLowerCase()] = value;
      },
      writeHead(code, headersObj = {}) {
        statusCode = code;
        for (const [k, v] of Object.entries(headersObj)) {
          responseHeaders[k.toLowerCase()] = v;
        }
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

describe('Cloud API Microservice Unit & Security Tests', () => {
  test('GET / returns 200, valid JSON, and security headers', async () => {
    const res = await simulateRequest({ method: 'GET', url: '/' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');

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

  test('GET /ready (Readiness Probe) returns 200 when active and 503 during shutdown', async () => {
    setShuttingDown(false);
    const readyRes = await simulateRequest({ method: 'GET', url: '/ready' });
    assert.strictEqual(readyRes.statusCode, 200);
    assert.strictEqual(readyRes.json().status, 'ready');

    setShuttingDown(true);
    const drainingRes = await simulateRequest({ method: 'GET', url: '/ready' });
    assert.strictEqual(drainingRes.statusCode, 503);
    assert.strictEqual(drainingRes.json().ready, false);

    setShuttingDown(false);
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
    const res = await simulateRequest({ method: 'GET', url: '/unknown-route' });
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.json().error, 'Endpoint Not Found');
  });
});
