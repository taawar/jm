import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { serve } from '@hono/node-server';

test('API dan perlindungan data Jejak Mbako', async function (t) {
  const directory = await mkdtemp(join(tmpdir(), 'jejak-mbako-test-'));
  const visitFile = join(directory, 'visits.json');
  process.env.VISITS_FILE = visitFile;
  const { app } = await import('../server.js');
  const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 });
  if (!server.listening) await new Promise(function (resolve) { server.once('listening', resolve); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  t.after(async function () {
    server.closeAllConnections();
    await new Promise(function (resolve) { server.close(resolve); });
    for (const file of [visitFile, visitFile + '.tmp']) {
      try { await unlink(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await rmdir(directory);
    delete process.env.VISITS_FILE;
  });

  function visit(body, headers = {}) {
    return fetch(origin + '/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  }

  await t.test('halaman, font, dan SVG dapat diakses dengan header keamanan', async function () {
    for (const path of ['/', '/assets/css/style.css', '/assets/js/main.js', '/assets/js/story-scenes.js', '/assets/js/progress-model.js', '/assets/js/engagement.js', '/assets/img/landscape.svg', '/assets/fonts/fraunces-600.woff2', '/assets/fonts/plus-jakarta-sans-400.woff2', '/assets/fonts/plus-jakarta-sans-500.woff2', '/assets/fonts/plus-jakarta-sans-700.woff2']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
      assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
      assert.match(response.headers.get('permissions-policy'), /camera=\(\)/);
      assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
      assert.equal(response.headers.get('cache-control'), 'no-cache');
      assert.equal(response.headers.get('set-cookie'), null);
      if (path.endsWith('.woff2')) assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString(), 'wOF2');
    }
  });

  await t.test('health dan struktur konten lengkap', async function () {
    const health = await fetch(origin + '/api/health');
    const healthData = await health.json();
    assert.equal(healthData.status, 'ok');
    const response = await fetch(origin + '/api/story');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const story = await response.json();
    assert.equal(healthData.phase, story.meta.phase);
    for (const key of ['meta', 'hero', 'bab', 'kuis', 'misi']) assert.ok(story[key], key);
    assert.equal(story.bab.length, 5);
    for (const chapter of story.bab) {
      if (chapter.photo.src) assert.equal((await fetch(origin + chapter.photo.src)).status, 200);
    }
  });

  await t.test('ID valid menambah agregat saja', async function () {
    const response = await visit({ chapterId: 'bab-1' });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });
    assert.deepEqual(JSON.parse(await readFile(visitFile, 'utf8')), { 'bab-1': 1 });
  });

  await t.test('input ekstra termasuk nama dan ID ilegal ditolak', async function () {
    for (const input of [null, [], {}, { chapterId: 'bab-9' }, { chapterId: '__proto__' }, { chapterId: '../visits' }, { chapterId: 'bab-1', nickname: 'Ayu' }, { chapterId: ['bab-1'] }]) {
      assert.equal((await visit(input)).status, 400);
    }
    assert.deepEqual(JSON.parse(await readFile(visitFile, 'utf8')), { 'bab-1': 1 });
  });

  await t.test('JSON rusak dan tipe body lain ditolak', async function () {
    const invalid = await fetch(origin + '/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(invalid.status, 400);
    assert.equal((await visit({ chapterId: 'bab-1' }, { 'Content-Type': 'text/plain' })).status, 415);
  });

  await t.test('batas body berlaku dengan Content-Length', async function () {
    const response = await visit({ chapterId: 'x'.repeat(1500) });
    assert.equal(response.status, 413);
  });

  await t.test('batas body juga berlaku pada transfer chunked', async function () {
    const status = await new Promise(function (resolve, reject) {
      const req = request(origin + '/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, function (response) {
        response.resume();
        response.on('end', function () { resolve(response.statusCode); });
      });
      req.on('error', reject);
      req.write('{"chapterId":"');
      req.write('x'.repeat(1500));
      req.end('"}');
    });
    assert.equal(status, 413);
  });

  await t.test('origin asing dan permintaan lintas situs ditolak', async function () {
    assert.equal((await visit({ chapterId: 'bab-1' }, { Origin: 'https://example.com' })).status, 403);
    assert.equal((await visit({ chapterId: 'bab-1' }, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal((await visit({ chapterId: 'bab-1' }, { Origin: origin })).status, 201);
  });

  await t.test('penulisan paralel tidak kehilangan hitungan', async function () {
    const requests = [];
    for (let index = 0; index < 20; index += 1) requests.push(visit({ chapterId: 'bab-2' }));
    const responses = await Promise.all(requests);
    for (const response of responses) assert.equal(response.status, 201);
    const counts = JSON.parse(await readFile(visitFile, 'utf8'));
    assert.equal(counts['bab-2'], 20);
    assert.equal(counts['bab-1'], 2);
  });

  await t.test('berkas rusak tidak dihapus dan error tidak membocorkan detail', async function () {
    const original = await readFile(visitFile, 'utf8');
    await writeFile(visitFile, 'rusak', 'utf8');
    assert.equal((await visit({ chapterId: 'bab-3' })).status, 500);
    assert.equal(await readFile(visitFile, 'utf8'), 'rusak');
    await writeFile(visitFile, original, 'utf8');
    assert.equal((await visit({ chapterId: 'bab-3' })).status, 201);
  });

  await t.test('file server, data, dan path traversal tidak dipublikasikan', async function () {
    for (const path of ['/server.js', '/s.js', '/package.json', '/data/visits.json', '/data/story.json', '/assets/%2e%2e/%2e%2e/server.js', '/tidak-ada']) {
      const response = await fetch(origin + path, { redirect: 'manual' });
      assert.equal(response.status, 302, path);
      assert.equal(response.headers.get('location'), '/');
      assert.equal(await response.text(), '');
    }
  });

  await t.test('path Windows terenkode dan metode tulis tidak membuka file privat', async function () {
    for (const path of ['/assets/%2e%2e%5c%2e%2e%5cserver.js', '/assets/..%5c..%5cdata%5cvisits.json', '/assets/%252e%252e/server.js', '/.env', '/.git/config']) {
      const result = await new Promise(function (resolve, reject) {
        const req = request(origin, { path }, function (response) {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', function (chunk) { body += chunk; });
          response.on('end', function () {
            resolve({ status: response.statusCode, location: response.headers.location, body });
          });
        });
        req.on('error', reject);
        req.end();
      });
      assert.equal(result.status, 302, path);
      assert.equal(result.location, '/');
      assert.equal(result.body, '');
    }
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await fetch(origin + '/assets/js/main.js', { method, redirect: 'manual' });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), '/');
      assert.equal(await response.text(), '');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
  });

  await t.test('agregat ilegal atau penuh dipertahankan dan antrean dapat pulih', async function () {
    const original = await readFile(visitFile, 'utf8');
    for (const counts of [{ 'bab-1': -1 }, { nickname: 'uji' }, { 'bab-1': Number.MAX_SAFE_INTEGER }]) {
      const raw = JSON.stringify(counts);
      await writeFile(visitFile, raw, 'utf8');
      const response = await visit({ chapterId: 'bab-1' });
      assert.equal(response.status, 500);
      const message = await response.text();
      assert.doesNotMatch(message, /Error:|stack|visits\.json|invalid-counts|counter-full/);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      assert.equal(await readFile(visitFile, 'utf8'), raw);
    }
    await writeFile(visitFile, original, 'utf8');
    assert.equal((await visit({ chapterId: 'bab-4' })).status, 201);
  });

  await t.test('rate limit memberi 429 dan Retry-After', async function () {
    let limited;
    for (let index = 0; index < 95; index += 1) {
      const response = await fetch(origin + '/api/health');
      if (response.status === 429) { limited = response; break; }
    }
    assert.ok(limited);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal(limited.headers.get('access-control-allow-origin'), null);
  });
});
