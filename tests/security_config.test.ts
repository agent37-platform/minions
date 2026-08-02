import assert from 'node:assert/strict';
import express from 'express';
import { createServer, request } from 'node:http';
import {
  createSecurityMiddleware,
  loadSecurityConfig,
} from '../server/security.js';

const defaults = loadSecurityConfig({});
assert.equal(defaults.host, '127.0.0.1');
assert.equal(defaults.yoloEnabled, false);
assert.deepEqual(defaults.corsOrigins, []);
assert.equal(defaults.auth, null);

assert.throws(
  () => loadSecurityConfig({ MINIONS_HOST: '0.0.0.0' }),
  /authentication/i,
);
assert.throws(
  () => loadSecurityConfig({ MINIONS_HOST: 'localhost' }),
  /authentication/i,
);
assert.throws(
  () => loadSecurityConfig({
    MINIONS_HOST: '0.0.0.0',
    MINIONS_AUTH_PASSWORD: 'secret',
    MINIONS_YOLO: 'true',
  }),
  /remote.*YOLO|YOLO.*remote/i,
);

const config = loadSecurityConfig({
  MINIONS_AUTH_USERNAME: 'vhagar',
  MINIONS_AUTH_PASSWORD: 'secret',
  MINIONS_CORS_ORIGINS: 'https://mission.example, http://127.0.0.1:6969',
});
assert.deepEqual(config.corsOrigins, [
  'https://mission.example',
  'http://127.0.0.1:6969',
]);

const app = express();
app.use(createSecurityMiddleware(config));
app.all('/api/test', (_req, res) => res.json({ ok: true }));
const server = createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const url = `http://127.0.0.1:${address.port}/api/test`;
const auth = `Basic ${Buffer.from('vhagar:secret').toString('base64')}`;

try {
  const missing = await fetch(url);
  assert.equal(missing.status, 401);
  assert.equal(missing.headers.get('www-authenticate'), 'Basic realm="Minions", charset="UTF-8"');

  const hostile = await fetch(url, {
    headers: { authorization: auth, origin: 'https://attacker.invalid' },
  });
  assert.equal(hostile.status, 403);
  assert.equal(hostile.headers.get('access-control-allow-origin'), null);

  const reboundStatus = await new Promise<number | undefined>((resolve, reject) => {
    const rebound = request(url, {
      method: 'POST',
      headers: {
        authorization: auth,
        host: `evil.example:${address.port}`,
        origin: `http://evil.example:${address.port}`,
      },
    }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    rebound.on('error', reject);
    rebound.end();
  });
  assert.equal(reboundStatus, 403);

  const browserSameOrigin = await fetch(url, {
    method: 'POST',
    headers: { authorization: auth, origin: new URL(url).origin },
  });
  assert.equal(browserSameOrigin.status, 200);
  assert.equal(browserSameOrigin.headers.get('access-control-allow-origin'), new URL(url).origin);

  const allowed = await fetch(url, {
    headers: { authorization: auth, origin: 'https://mission.example' },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://mission.example');
  assert.equal(allowed.headers.get('vary'), 'Origin');

  const sameOrigin = await fetch(url, { headers: { authorization: auth } });
  assert.equal(sameOrigin.status, 200);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

console.log('Security config and middleware tests passed');
