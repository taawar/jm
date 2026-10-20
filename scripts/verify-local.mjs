import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve, dirname, extname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { serve } from '@hono/node-server';
import { app } from '../server.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(root, 'public');
const runtimeTypes = new Set(['.html', '.css', '.js', '.svg', '.woff2']);
const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (runtimeTypes.has(extname(path))) files.push(path);
  }
}
await collect(publicRoot);
const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 });
if (!server.listening)
  await new Promise(function (resolve) {
    server.once('listening', resolve);
  });
const origin = 'http://127.0.0.1:' + server.address().port;
const sizes = {};
const timings = [];
try {
  for (const path of files) {
    const local = '/' + relative(publicRoot, path).replaceAll('\\', '/');
    const started = performance.now();
    const response = await fetch(origin + local);
    const bytes = Buffer.from(await response.arrayBuffer());
    timings.push(performance.now() - started);
    assert.equal(response.status, 200, local);
    assert.deepEqual(bytes, await readFile(path), local);
    const extension = extname(path);
    sizes[extension] = (sizes[extension] || 0) + bytes.length;
    const source = bytes.toString('utf8');
    if (extension === '.html') {
      assert.doesNotMatch(
        source,
        /<(?:script|img|link)[^>]+(?:src|href)=["'](?:https?:)?\/\//i,
        'Aset HTML harus lokal',
      );
    }
    if (extension === '.css') {
      for (const match of source.matchAll(/url\(["']?([^)'"\s]+)/g))
        assert.ok(match[1].startsWith('/assets/'), match[1]);
    }
    if (extension === '.js') {
      for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        assert.ok(match[1].startsWith('./'), match[1]);
        await readFile(resolve(dirname(path), match[1]));
      }
      for (const match of source.matchAll(/fetch\(['"]([^'"]+)['"]/g))
        assert.ok(match[1].startsWith('/api/'), match[1]);
    }
    if (extension === '.svg')
      assert.doesNotMatch(
        source,
        /(?:href|src)=["'](?:https?:)?\/\//i,
        'Aset SVG harus lokal',
      );
  }
  const response = await fetch(origin + '/api/story');
  assert.equal(response.status, 200);
  const storyBytes = Buffer.from(await response.arrayBuffer());
  sizes['story.json'] = storyBytes.length;
  const totalBytes = Object.values(sizes).reduce(function (sum, value) {
    return sum + value;
  }, 0);
  assert.ok(sizes['.woff2'] < 200 * 1024, 'Font di bawah 200 KiB');
  assert.ok(sizes['.js'] < 128 * 1024, 'JavaScript di bawah 128 KiB');
  assert.ok(totalBytes < 1024 * 1024, 'Seluruh aset runtime di bawah 1 MiB');
  timings.sort(function (a, b) {
    return a - b;
  });
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        localFiles: files.length,
        totalBytes,
        sizes,
        localhostMedianMs: Number(
          timings[Math.floor(timings.length / 2)].toFixed(2),
        ),
        network:
          'Semua aset runtime dan permintaan aplikasi yang diperiksa memakai origin lokal.',
        limit:
          'Pemeriksaan berkas dan HTTP lokal; bukan simulasi CPU/jaringan HP atau pengukuran Web Vitals.',
      },
      null,
      2,
    ),
  );
} finally {
  server.closeAllConnections();
  await new Promise(function (resolve) {
    server.close(resolve);
  });
}
