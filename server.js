import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const path = dirname(fileURLToPath(import.meta.url));
const story = JSON.parse(
  await readFile(resolve(path, 'data/story.json'), 'utf-8'),
);
const idBAB = new Set(story.bab.map((bab) => bab.id));
const diVercel = process.env.VERCEL === '1';
// di Vercel hitungan ini cuma sementara, bisa hilang saat server diganti
const fileYgMwDibuka = diVercel
  ? resolve(tmpdir(), 'jejak-mbako-visits.json')
  : resolve(path, process.env.VISITS_FILE || 'data/visits.json');
const limits = new Map();
const bodyLimit = 1024;
let queue = Promise.resolve();

export const app = new Hono();

// batasin sumber kode sama akses fitur browser yg ga dipakai
app.use('*', async (c, next) => {
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  c.header('Cross-Origin-Resource-Policy', 'same-origin');
  c.header('Cache-Control', 'no-cache');
  await next();
});

// maksimal 90 request per IP dalam 1 menit
app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');

  const waktuIki = Date.now();
  for (const [alamat, catetan] of limits) {
    if (catetan.kadaluarsa <= waktuIki) {
      limits.delete(alamat);
    }
  }

  // Vercel nyediain IP lewat header, lokal lewat koneksi Node
  const ip = (diVercel
    ? c.req.header('x-forwarded-for')?.split(',')[0].trim()
    : (c.env?.server ?? c.env)?.incoming?.socket?.remoteAddress) || 'unknown';
  let catetan = limits.get(ip);

  if (!catetan) {
    if (limits.size >= 10000) {
      return c.json(
        { error: 'Server sedang sibuk. Coba sebentar lagi.' },
        503,
      );
    }

    catetan = {
      jumlah: 0,
      kadaluarsa: waktuIki + 60000,
    };
    limits.set(ip, catetan);
  }

  catetan.jumlah += 1;

  if (catetan.jumlah > 90) {
    const sisa = Math.ceil((catetan.kadaluarsa - waktuIki) / 1000);
    c.header('Retry-After', String(sisa));

    return c.json(
      { error: 'Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.' },
      429,
    );
  }

  await next();
});

// cek serverr aja si
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    app: 'Jejak Mbako',
    phase: story.meta.phase,
  });
});

// kirim api story yekan
app.get('/api/story', (c) => c.json(story));

// baca sizeBodyDataa
async function bacaDataKecil(req) {
  const sizesender = Number(req.headers.get('content-length') || 0);

  if (sizesender > bodyLimit) {
    throw new RangeError('body-limit');
  }

  if (!req.body) return '';

  const reader = req.body.getReader();
  const listCutter = [];
  let totalUkuran = 0;

  while (true) {
    const hslBaca = await reader.read();
    if (hslBaca.done) break;

    const potongan = hslBaca.value;
    totalUkuran += potongan.byteLength;

    if (totalUkuran > bodyLimit) {
      await reader.cancel();
      throw new RangeError('body-limit');
    }

    listCutter.push(potongan);
  }

  return Buffer.concat(listCutter).toString('utf-8');
}

// tambah hitungan bab, simpan ke file sementara dulu baru ganti file utama
async function addVisit(id) {
  let count = {};

  try {
    const isiFile = await readFile(fileYgMwDibuka, 'utf-8');
    count = JSON.parse(isiFile);

    if (!count || typeof count !== 'object' || Array.isArray(count)) {
      throw new Error('invalid-counts');
    }

    for (const [savedID, jumlah] of Object.entries(count)) {
      const babDikenal = idBAB.has(savedID);
      const angkaAman = Number.isSafeInteger(jumlah);

      if (!babDikenal || !angkaAman || jumlah < 0) {
        throw new Error('invalid-counts');
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const jumlahNow = count[id] || 0;
  if (jumlahNow >= Number.MAX_SAFE_INTEGER) {
    throw new Error('counter-full');
  }
  count[id] = jumlahNow + 1;

  await mkdir(dirname(fileYgMwDibuka), { recursive: true });

  const tempFile = fileYgMwDibuka + '.tmp';
  const isiTerbaru = JSON.stringify(count, null, 2) + '\n';

  await writeFile(tempFile, isiTerbaru, 'utf-8');
  await rename(tempFile, fileYgMwDibuka);
}

// cek asal request dan ID bab, lalu antrekan penyimpanan kunjungannya
app.post('/api/visit', async (c) => {
  const senderFrom = c.req.header('origin');
  const serverFrom = new URL(c.req.url).origin;

  if (senderFrom && senderFrom !== serverFrom) {
    return c.json({ error: 'Asal permintaan tidak diizinkan.' }, 403);
  }

  if (c.req.header('sec-fetch-site') === 'cross-site') {
    return c.json({ error: 'Asal permintaan tidak diizinkan.' }, 403);
  }

  const jenisKonten = c.req.header('content-type') || '';
  const jenisUtama = jenisKonten.split(';')[0].trim().toLowerCase();
  if (jenisUtama !== 'application/json') {
    return c.json({ error: 'Gunakan format JSON.' }, 415);
  }

  let dataMasuk;
  try {
    const hslBaca = await bacaDataKecil(c.req.raw);
    dataMasuk = JSON.parse(hslBaca);
  } catch (err) {
    if (err instanceof RangeError) {
      return c.json({ error: 'Permintaan terlalu besar.' }, 413);
    }
    return c.json({ error: 'Data permintaan tidak valid.' }, 400);
  }

  if (
    !dataMasuk ||
    typeof dataMasuk !== 'object' ||
    Array.isArray(dataMasuk)
  ) {
    return c.json({ error: 'Pilih ID bab yang tersedia.' }, 400);
  }

  const jumlahProperti = Object.keys(dataMasuk).length;
  const babDikenal = idBAB.has(dataMasuk.chapterId);
  if (jumlahProperti !== 1 || !babDikenal) {
    return c.json({ error: 'Pilih ID bab yang tersedia.' }, 400);
  }

  const antreanTulis = queue.then(() => addVisit(dataMasuk.chapterId));
  queue = antreanTulis.catch(() => {});
  await antreanTulis;

  return c.json({ ok: true }, 201);
});

// sediain aset sama halaman utama
app.get(
  '/assets/*',
  serveStatic({ root: resolve(path, 'public') }),
);
app.get(
  '/',
  serveStatic({ path: resolve(path, 'public/index.html') }),
);
app.get(
  '/index.html',
  serveStatic({ path: resolve(path, 'public/index.html') }),
);

// alamat yg ga ada dibalikin ke beranda
app.notFound((c) => c.redirect('/'));

// rincian jenis error di terminal, pengguna cukup dapet pesan singkat
app.onError((err, c) => {
  console.error('Permintaan gagal diproses. Jenis:', err.name);
  return c.json(
    { error: 'Server belum dapat memproses permintaan. Silakan coba lagi.' },
    500,
  );
});

// nyalain server lokal; di Vercel cukup pakai export app
if (
  !diVercel && process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT tidak valid.');
  }

  const server = serve(
    {
      fetch: app.fetch,
      hostname: process.env.HOST || '127.0.0.1',
      port: port,
    },
    (info) => {
      console.log('Local: http://localhost:' + info.port);
    },
  );

  server.requestTimeout = 15000;
  server.headersTimeout = 10000;

  // tunggu antrean simpan selesai sebelum server ditutup
  for (const sinyal of ['SIGINT', 'SIGTERM']) {
    process.on(sinyal, () => {
      server.close(async () => {
        await queue;
        process.exit(0);
      });
      server.closeIdleConnections();
    });
  }
}
export default app;

