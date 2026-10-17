import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { getConnInfo } from '@hono/node-server/conninfo';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const main_path = dirname(fileURLToPath(import.meta.url));
const story = JSON.parse(
  await readFile(resolve(main_path, 'data/story.json'), 'utf-8'),
);
const idBAB = new Set(
  story.bab.map(function (chapter) {
    return chapter.id;
  }),
);
const fileYgMwDibuka = resolve(main_path, process.env.VISITS_FILE || 'data/visits.json');
const limits = new Map();
const bodyLimit = 1024;
let queue = Promise.resolve();

export const app = new Hono();

//ini aga kurang oaham sih buat security aja biar ga asal akses seinggetku
app.use('*', async function headers(c, next) {
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

//api buat limitreq biar ga flooding
app.use('/api/*', async function reqLimit(c, next) {
  c.header('Cache-Control', 'no-store');

  const waktuIki = Date.now();
  for (const [alamat, catetan] of limits) {
    if (catetan.kadaluarsa <= waktuIki) {
      limits.delete(alamat);
    }
  }
  const ip = getConnInfo(c).remote.address || 'tidak tau';
  let catetan = limits.get(ip);

  if (!catetan) {
    if (limits.size >= 10000) {
      return c.json(
        {
          err: 'Server is bussy. try again later',
        },
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

  //buat nge nolak yg ke 91 x nya smpe timeout
  if (catetan.jumlah > 90) {
    const sisa = Math.ceil((catetan.kadaluarsa - waktuIki) / 1000);

    c.header('Retry-After', String(sisa));

  return c.json(
    {
      err: 'Too much ga sih, bentar dlu ok',
    },
    429,
  );
  // Priittt yakan
  }

  await next();
});
//cuma buat test 
app.get('/api/health', function (c) {
  return c.json({
    status: 'ok',
    app: 'Jejak Mbako',
    phase: story.meta.phase,
  });
});

//story
app.get('/api/story', function (c) {
  return c.json(story);
});


async function bacaDataKecil(req) {
  const sizesender = Number(req.headers.get('content-length') || 0);

  //reject
  if (sizesender > bodyLimit) {
    throw new RangeError('body-limit');
  }

  if (!req.body) return '';

  // buat baca
  const reader = req.body.getReader();
  const listCutter = [];
  let totalUkuran = 0;

  while (true) {
    const hasilBaca = await reader.read();

    if (hasilBaca.done) break;
    const potongan = hasilBaca.value;
    totalUkuran += potongan.byteLength;

    if (totalUkuran > bodyLimit) {
      await reader.cancel();
      //kalau oversize dor yekan

      throw new RangeError('body-limit');
    }
    listCutter.push(potongan);
  }
  return Buffer.concat(listCutter).toString('utf-8');
}

async function addVisit(id) {
  let count = {};

  try {
    const isiFile = await readFile(fileYgMwDibuka, 'utf-8');
    count = JSON.parse(isiFile);
    if (!count || typeof count !== 'object' || Array.isArray(count)) {
      throw new Error('Invalid counts');
    }

    for (const [savedID, jumlah] of Object.entries(count)) {
      const babyangmungkinandakenal = idBAB.has(savedID);
      const saveNumber = Number.isSafeInteger(jumlah);

      //jumlah harus int, n safe ga negatif

      if (!babyangmungkinandakenal || !saveNumber || jumlah < 0)
        throw new Error('Invalid count');
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const jumlahNow = count[id] || 0;

  if (jumlahNow >= Number.MAX_SAFE_INTEGER) throw new Error('FULL COUNTER');

  count[id] = jumlahNow + 1;

  await mkdir(dirname(fileYgMwDibuka), { recursive: true });

  const tempFile = fileYgMwDibuka + '.tmp';
  const isiTerbaru = JSON.stringify(count, null, 2) + '\n';
  await writeFile(tempFile, isiTerbaru, 'utf-8');

  await rename(tempFile, fileYgMwDibuka);


}

app.post("/api/visit", async function (c) {
  const senderFrom = c.req.header("origin") //indo wkwkwk
  const serverFrom = new URL(c.req.url).origin;

  if (senderFrom && senderFrom !== serverFrom ) {
    return c.json(
      {
        err: "request is not allowed"
      },
      403
    )
  }
  if (c.req.header('sec-fetch-site') === 'cross-site') {
    return c.json({ err: 'request is not allowed' }, 403);
  }

  const tipe = c.req.header('content-type') || '';
  if (tipe.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return c.json({ err: 'pake JSON dulu' }, 415);
  }

  let data;
  try {
    data = JSON.parse(await bacaDataKecil(c.req.raw));
  } catch (err) {
    if (err instanceof RangeError) return c.json({ err: 'data kegedean' }, 413);
    return c.json({ err: 'data ga valid' }, 400);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).length !== 1 || !idBAB.has(data.chapterId)) {
    return c.json({ err: 'pilih id bab yg ada' }, 400);
  }

  // antri dulu biar hsl hitung ga ketimpa
  const hslTulis = queue.then(() => addVisit(data.chapterId));
  queue = hslTulis.catch(() => {});
  await hslTulis;
  return c.json({ ok: true }, 201);
})

// buat nyediai css js font n foto nya

app.get(
  '/assets/*',
  serveStatic({
    root: resolve(main_path, 'public')
  })
);

//main webs
app.get(
  '/',
  serveStatic({
    path: resolve(main_path, 'public/index.html')
  })
);

app.get(
  '/index.html',
  serveStatic({
    path: resolve(main_path, 'public/index.html')
  })
);
//buat page  not foundnya

app.notFound((c) => {
  return c.redirect('/');
});
// jenis error di terminal aja
app.onError((err, c) => {
  console.error('Request gagal:', err.name);
  return c.json({ err: 'server lagi error, coba lagi bentar' }, 500);
});

// ingetin foto yg belum diganti
const cekFoto = (data, udh = new Set()) => {
  if (!data || typeof data !== 'object') return;
  if (data.status === 'sementara' && data.src && !udh.has(data.src)) {
    console.warn('Foto sementara:', data.src);
    udh.add(data.src);
  }
  Object.values(data).forEach((isi) => cekFoto(isi, udh));
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT ga valid');
  cekFoto(story);

  const server = serve({ fetch: app.fetch, hostname: process.env.HOST || '127.0.0.1', port }, (info) => {
    console.log('Jejak Mbako — fase ' + story.meta.phase);
    console.log('Local: http://localhost:' + info.port);
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;

  // simpen yg masih antri dulu baru keluar
  for (const sinyal of ['SIGINT', 'SIGTERM']) {
    process.on(sinyal, () => {
      server.close(async () => { await queue; process.exit(0); });
      server.closeIdleConnections();
    });
  }
}
