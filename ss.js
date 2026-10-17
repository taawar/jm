// Membuat elemen HTML dengan kelas CSS dan teks yang diberikan.
function buatElemen(tag, namaKelas, teks) {
  const elemen = document.createElement(tag);

  if (namaKelas) {
    elemen.className = namaKelas;
  }

  if (teks !== undefined) {
    elemen.textContent = teks;
  }

  return elemen;
}

// Membuat elemen gambar SVG beserta atributnya.
function buatSvg(tag, atribut = {}) {
  const elemen = document.createElementNS(
    'http://www.w3.org/2000/svg',
    tag
  );

  for (const [nama, nilai] of Object.entries(atribut)) {
    elemen.setAttribute(nama, String(nilai));
  }

  return elemen;
}

// Menampilkan tautan sumber yang sesuai dengan informasi yang dibaca.
function tambahkanSumber(wadah, daftarId, cerita) {
  const daftarTautan = buatElemen('div', 'scene-sources');

  for (const id of daftarId || []) {
    const sumber = cerita.sumber.find(function (data) {
      return data.id === id;
    });

    if (!sumber) {
      continue;
    }

    let alamat;

    try {
      alamat = new URL(sumber.url);
    } catch {
      continue;
    }

    if (alamat.protocol !== 'https:') {
      continue;
    }

    const penerbit = sumber.publisher.split(' · ').pop();
    const tautan = buatElemen('a', '', penerbit + ' ↗');

    tautan.href = alamat.href;
    tautan.target = '_blank';
    tautan.rel = 'noopener noreferrer';
    tautan.setAttribute(
      'aria-label',
      sumber.title + ', buka sumber di tab baru'
    );

    daftarTautan.append(tautan);
  }

  if (daftarTautan.childElementCount > 0) {
    wadah.append(daftarTautan);
  }
}

// Membuat deretan pilihan yang bisa digunakan lewat klik atau keyboard.
function buatTab(daftarData, awalanId, label, pilih) {
  const wadah = buatElemen('div', 'scene-tabs');
  const daftarTab = [];

  wadah.setAttribute('role', 'tablist');
  wadah.setAttribute('aria-label', label);

  for (const [indeks, data] of daftarData.entries()) {
    const tombol = buatElemen('button', 'scene-tab');

    tombol.type = 'button';
    tombol.id = awalanId + '-tab-' + data.id;
    tombol.setAttribute('role', 'tab');
    tombol.setAttribute('aria-controls', awalanId + '-panel');

    const nomor = buatElemen(
      'span',
      'tab-number',
      String(indeks + 1).padStart(2, '0')
    );

    nomor.setAttribute('aria-hidden', 'true');

    tombol.append(
      nomor,
      buatElemen('span', '', data.shortTitle || data.name || data.label)
    );

    tombol.addEventListener('click', function () {
      pilih(indeks);
    });

    tombol.addEventListener('keydown', function (kejadian) {
      let tujuan = indeks;

      if (
        kejadian.key === 'ArrowRight' ||
        kejadian.key === 'ArrowDown'
      ) {
        tujuan = (indeks + 1) % daftarData.length;
      } else if (
        kejadian.key === 'ArrowLeft' ||
        kejadian.key === 'ArrowUp'
      ) {
        tujuan = (indeks - 1 + daftarData.length) % daftarData.length;
      } else if (kejadian.key === 'Home') {
        tujuan = 0;
      } else if (kejadian.key === 'End') {
        tujuan = daftarData.length - 1;
      } else {
        return;
      }

      kejadian.preventDefault();
      pilih(tujuan);
      daftarTab[tujuan].focus({ preventScroll: true });
    });

    daftarTab.push(tombol);
    wadah.append(tombol);
  }

  return { wadah, daftarTab };
}

// Menandai tab yang sedang dipilih dan mengatur fokus keyboard.
function perbaruiTab(daftarTab, indeksTerpilih) {
  for (const [indeks, tombol] of daftarTab.entries()) {
    const aktif = indeks === indeksTerpilih;

    tombol.setAttribute('aria-selected', String(aktif));
    tombol.tabIndex = aktif ? 0 : -1;
  }
}

// Membuat titik yang bisa diklik pada gambar peta atau motif.
function buatPenanda(data, indeks, awalanId, pilih) {
  const tombol = buatElemen('button', 'scene-marker');
  tombol.type = 'button';

  let posisiX = 50;
  let posisiY = 50;

  if (Number.isFinite(data.x)) {
    posisiX = Math.max(5, Math.min(95, data.x));
  }

  if (Number.isFinite(data.y)) {
    posisiY = Math.max(5, Math.min(95, data.y));
  }

  tombol.style.left = posisiX + '%';
  tombol.style.top = posisiY + '%';
  tombol.setAttribute('aria-label', 'Pilih ' + (data.name || data.label));
  tombol.setAttribute('aria-controls', awalanId + '-panel');

  const nomor = buatElemen(
    'span',
    'marker-number',
    String(indeks + 1).padStart(2, '0')
  );

  const label = buatElemen(
    'span',
    'marker-name',
    data.name || data.label
  );

  label.setAttribute('aria-hidden', 'true');
  tombol.append(nomor, label);

  tombol.addEventListener('click', function () {
    pilih(indeks);
  });

  return tombol;
}

// Menyusun gambar, titik pilihan, dan panel penjelasan untuk peta atau motif.
function buatPenjelajah(pengaturan, cerita) {
  const bagian = buatElemen(
    'section',
    'story-scene ' + pengaturan.namaKelas
  );

  bagian.id = pengaturan.id;
  bagian.setAttribute('aria-labelledby', pengaturan.id + '-title');

  const judul = buatElemen('h3', '', pengaturan.judul);
  judul.id = pengaturan.id + '-title';

  bagian.append(
    buatElemen('p', 'eyebrow', pengaturan.labelAtas),
    judul,
    buatElemen('p', 'scene-intro', pengaturan.deskripsi)
  );

  const wadahGambar = buatElemen('div', 'scene-stage');
  const gambar = buatElemen('img', 'scene-image');

  gambar.src = pengaturan.gambar;
  gambar.width = pengaturan.lebar;
  gambar.height = pengaturan.tinggi;
  gambar.alt = pengaturan.teksAlternatif;
  gambar.loading = 'lazy';
  gambar.decoding = 'async';

  wadahGambar.append(gambar);

  const panel = buatElemen('div', 'scene-panel');
  panel.id = pengaturan.id + '-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.tabIndex = 0;

  const status = buatElemen('p', 'sr-only');
  status.setAttribute('role', 'status');

  const daftarPenanda = [];
  let navigasi;

  // Mengganti isi penjelasan sesuai tempat atau unsur motif yang dipilih.
  function pilih(indeks, umumkan = true) {
    const data = pengaturan.daftarData[indeks];

    perbaruiTab(navigasi.daftarTab, indeks);

    for (const [indeksPenanda, penanda] of daftarPenanda.entries()) {
      penanda.setAttribute(
        'aria-pressed',
        String(indeksPenanda === indeks)
      );
    }

    panel.setAttribute(
      'aria-labelledby',
      navigasi.daftarTab[indeks].id
    );

    panel.replaceChildren(
      buatElemen('p', 'eyebrow', data.category),
      buatElemen('h4', '', data.title || data.name)
    );

    if (data.location) {
      panel.append(buatElemen('p', 'place-location', data.location));
    }

    panel.append(buatElemen('p', 'scene-description', data.text));

    if (data.note) {
      panel.append(buatElemen('p', 'verification-note', data.note));
    }

    if (data.prompt) {
      panel.append(buatElemen('p', 'scene-prompt', data.prompt));
    }

    tambahkanSumber(panel, data.sourceIds, cerita);

    if (umumkan) {
      status.textContent =
        (data.name || data.label) +
        ' dipilih. Ceritanya tersedia di panel setelah daftar pilihan.';
    }
  }

  navigasi = buatTab(
    pengaturan.daftarData,
    pengaturan.id,
    pengaturan.labelPilihan,
    pilih
  );

  for (const [indeks, data] of pengaturan.daftarData.entries()) {
    const penanda = buatPenanda(data, indeks, pengaturan.id, pilih);

    daftarPenanda.push(penanda);
    wadahGambar.append(penanda);
  }

  bagian.append(
    wadahGambar,
    buatElemen('p', 'scene-caption', pengaturan.keterangan),
    navigasi.wadah,
    panel,
    status
  );

  pilih(0, false);
  return bagian;
}

// Membuat bagian peta menggunakan daftar tempat dari data cerita.
export function createMap(cerita) {
  return buatPenjelajah({
    id: 'peta',
    namaKelas: 'map-scene',
    labelAtas: 'PETA CERITA / TEMANGGUNG',
    judul: cerita.peta.title,
    deskripsi: cerita.peta.description,
    daftarData: cerita.peta.points,
    gambar: '/assets/img/story-map.svg',
    lebar: 760,
    tinggi: 480,
    teksAlternatif:
      'Peta ilustratif dengan dua gunung, kebun, embung, sungai, dan ruang kota.',
    keterangan: cerita.peta.caption,
    labelPilihan: 'Pilih tempat di Temanggung'
  }, cerita);
}

// Membuat bagian pengenalan bentuk daun, tulang daun, dan pengulangan motif.
function buatMotif(cerita) {
  return buatPenjelajah({
    id: 'motif',
    namaKelas: 'motif-scene',
    labelAtas: 'DEKATI KAINNYA',
    judul: 'Baca cerita di antara garis.',
    deskripsi:
      'Pilih titik pada kain atau gunakan pilihan di bawah. Mulai dari bentuk, ikuti garis, lalu temukan iramanya.',
    daftarData: cerita.motifHotspot,
    gambar: '/assets/img/cloth.svg',
    lebar: 640,
    tinggi: 560,
    teksAlternatif:
      'Kain ilustrasi original dengan pola daun dan titik berulang berwarna emas di atas nila.',
    keterangan:
      'Motif original Jejak Mbako. Bukan reproduksi atau contoh motif resmi Ron Mbako maupun Rigen Mbako.',
    labelPilihan: 'Pilih unsur motif'
  }, cerita);
}

// Menggambar kain, pola daun, canting, air, dan uap menggunakan SVG.
function buatGambarProses() {
  const gambar = buatSvg('svg', {
    viewBox: '0 0 640 400',
    class: 'process-art',
    role: 'img'
  });

  gambar.append(
    buatSvg('ellipse', {
      cx: 320,
      cy: 351,
      rx: 233,
      ry: 17,
      class: 'fabric-shadow'
    }),
    buatSvg('rect', {
      x: 95,
      y: 45,
      width: 450,
      height: 292,
      rx: 8,
      class: 'process-fabric'
    })
  );

  const garisBantu = buatSvg('path', {
    d: 'M113 62H527V320H113ZM248 62V320M392 62V320M113 190H527',
    class: 'process-guides'
  });

  gambar.append(garisBantu);

  const pola = buatSvg('g', { class: 'process-pattern' });

  for (const posisiX of [132, 275, 418]) {
    for (const posisiY of [78, 208]) {
      const daun = buatSvg('g', {
        transform: 'translate(' + posisiX + ' ' + posisiY + ')'
      });

      daun.append(buatSvg('path', {
        d: 'M22 90C-5 54 23 11 89 5 99 53 64 95 22 90ZM13 103 80 17M37 72 24 43M52 50 76 44',
        class: 'process-leaf'
      }));

      pola.append(daun);
    }
  }

  gambar.append(pola);

  gambar.append(buatSvg('path', {
    d: 'M489 58 572 21 581 41 499 78 480 80Z M490 59 499 78',
    class: 'process-pencil'
  }));

  const canting = buatSvg('g', {
    class: 'process-canting',
    transform: 'translate(455 30) rotate(24)'
  });

  canting.append(
    buatSvg('path', {
      d: 'M0 0H19V93H0Z',
      class: 'tool-handle'
    }),
    buatSvg('ellipse', {
      cx: 10,
      cy: 108,
      rx: 31,
      ry: 23,
      class: 'tool-bowl'
    }),
    buatSvg('path', {
      d: 'M36 101 73 123 68 135 31 120Z',
      class: 'tool-bowl'
    })
  );

  gambar.append(canting);

  gambar.append(
    buatSvg('path', {
      d: 'M74 299Q173 283 249 299T420 299T568 299V361H74Z',
      class: 'process-water'
    }),
    buatSvg('path', {
      d: 'M180 39Q167 26 180 15M319 38Q306 24 319 12M455 39Q442 26 455 15',
      class: 'process-steam'
    })
  );

  return gambar;
}

// Menyusun pilihan tahap membatik, gambar, penjelasan, dan tombol perpindahan.
function buatProses(cerita) {
  const bagian = buatElemen('section', 'story-scene process-scene');
  bagian.id = 'proses';
  bagian.setAttribute('aria-labelledby', 'process-title');

  const judul = buatElemen('h3', '', 'Satu kain, banyak ketekunan.');
  judul.id = 'process-title';

  bagian.append(
    buatElemen('p', 'eyebrow', 'IKUTI PERUBAHANNYA'),
    judul,
    buatElemen(
      'p',
      'scene-intro',
      'Empat tahap ringkas untuk membaca proses membatik. Pilih tahap, lalu amati perubahan kainnya.'
    )
  );

  const panel = buatElemen('div', 'process-panel');
  panel.id = 'proses-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.tabIndex = 0;

  const gambar = buatGambarProses();
  const penjelasan = buatElemen('div', 'process-copy');
  const indikator = buatElemen('p', 'process-indicator');
  indikator.setAttribute('role', 'status');

  const wadahTombol = buatElemen('div', 'process-navigation');
  const sebelumnya = buatElemen(
    'button',
    'button button-secondary',
    '← Sebelumnya'
  );
  const berikutnya = buatElemen(
    'button',
    'button button-secondary',
    'Berikutnya →'
  );

  sebelumnya.type = 'button';
  berikutnya.type = 'button';
  sebelumnya.setAttribute('aria-label', 'Tahap sebelumnya');
  berikutnya.setAttribute('aria-label', 'Tahap berikutnya');

  let indeksTerpilih = 0;
  let navigasi;

  // Menampilkan tahap yang dipilih dan menyesuaikan tombol sebelumnya/berikutnya.
  function pilih(indeks) {
    indeksTerpilih = Math.max(
      0,
      Math.min(cerita.proses.length - 1, indeks)
    );

    const tahap = cerita.proses[indeksTerpilih];

    perbaruiTab(navigasi.daftarTab, indeksTerpilih);
    panel.setAttribute(
      'aria-labelledby',
      navigasi.daftarTab[indeksTerpilih].id
    );

    gambar.dataset.stage = tahap.id;
    gambar.setAttribute(
      'aria-label',
      'Ilustrasi tahap ' + tahap.title + '. ' + tahap.observe
    );

    penjelasan.replaceChildren(
      buatElemen('h4', '', tahap.title),
      buatElemen('p', '', tahap.text),
      buatElemen('p', 'scene-prompt', tahap.observe)
    );

    tambahkanSumber(penjelasan, tahap.sourceIds, cerita);

    indikator.textContent =
      'Tahap ' + (indeksTerpilih + 1) +
      ' dari ' + cerita.proses.length +
      ' · ' + tahap.shortTitle;

    sebelumnya.disabled = indeksTerpilih === 0;
    berikutnya.disabled = indeksTerpilih === cerita.proses.length - 1;
  }

  navigasi = buatTab(
    cerita.proses,
    'proses',
    'Tahapan membatik',
    pilih
  );

  sebelumnya.addEventListener('click', function () {
    pilih(indeksTerpilih - 1);

    if (sebelumnya.disabled) {
      navigasi.daftarTab[indeksTerpilih].focus();
    }
  });

  berikutnya.addEventListener('click', function () {
    pilih(indeksTerpilih + 1);

    if (berikutnya.disabled) {
      navigasi.daftarTab[indeksTerpilih].focus();
    }
  });

  panel.append(gambar, penjelasan);
  wadahTombol.append(sebelumnya, berikutnya);

  bagian.append(
    navigasi.wadah,
    panel,
    indikator,
    wadahTombol,
    buatElemen(
      'p',
      'scene-caption',
      'Ilustrasi proses umum, bukan resep produksi. Praktik dan hasil warna setiap perajin dapat berbeda.'
    )
  );

  pilih(0);
  return bagian;
}

// Membuat ilustrasi lima jalur cerita yang bertemu menuju angka 2045.
function buatMasaDepan(cerita) {
  const wadah = buatElemen('figure', 'future-scene');
  const gambar = buatSvg('svg', {
    viewBox: '0 0 760 440',
    class: 'future-art',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  gambar.append(
    buatSvg('circle', {
      cx: 526, cy: 220, r: 154, class: 'future-orbit'
    }),
    buatSvg('circle', {
      cx: 526, cy: 220, r: 177, class: 'future-orbit'
    })
  );

  for (let indeks = 0; indeks < 5; indeks += 1) {
    const posisiY = 68 + indeks * 76;

    gambar.append(buatSvg('circle', {
      cx: 88,
      cy: posisiY,
      r: 6,
      class: 'future-origin'
    }));

    const jalur = buatSvg('path', {
      d: 'M88 ' + posisiY + ' C260 ' + posisiY + ' 237 220 368 220',
      class: 'future-thread'
    });

    gambar.append(jalur);
  }

  gambar.append(buatSvg('circle', {
    cx: 368,
    cy: 220,
    r: 7,
    class: 'future-origin'
  }));

  const tahun = buatSvg('text', {
    x: 532,
    y: 247,
    'text-anchor': 'middle',
    class: 'future-year'
  });

  tahun.textContent = '2045';
  gambar.append(tahun);

  const daftarJudul = buatElemen('ol', 'future-labels');

  for (const bab of cerita.bab) {
    daftarJudul.append(buatElemen('li', '', bab.shortTitle));
  }

  wadah.append(
    gambar,
    daftarJudul,
    buatElemen(
      'figcaption',
      '',
      'Lima bab, satu bekal: berakar pada budaya, bertumbuh lewat karya.'
    )
  );

  return wadah;
}

// Memilih bagian interaktif yang sesuai dengan nomor bab.
export function createChapterScene(bab, cerita) {
  if (bab.id === 'bab-3') {
    return buatMotif(cerita);
  }

  if (bab.id === 'bab-4') {
    return buatProses(cerita);
  }

  if (bab.id === 'bab-5') {
    return buatMasaDepan(cerita);
  }

  return null;
}

// Menghitung kemajuan baca: 0 berarti belum mulai, 1 berarti selesai.
export function readingFraction(posisi, awal, akhir) {
  if (
    !Number.isFinite(posisi) ||
    !Number.isFinite(awal) ||
    !Number.isFinite(akhir)
  ) {
    return 0;
  }

  if (akhir <= awal) {
    return 0;
  }

  const kemajuan = (posisi - awal) / (akhir - awal);
  return Math.max(0, Math.min(1, kemajuan));
}

// Membentuk jalur canting: lurus di layar ringkas, melengkung di desktop.
function buatJalurCanting(daftarTitik, posisiX, layarRingkas) {
  let jalur = 'M' + posisiX + ' ' + daftarTitik[0];

  for (let indeks = 1; indeks < daftarTitik.length; indeks += 1) {
    const awal = daftarTitik[indeks - 1];
    const akhir = daftarTitik[indeks];

    if (layarRingkas) {
      jalur += ' L' + posisiX + ' ' + akhir;
    } else {
      const lengkungan = indeks % 2 === 0 ? 14 : -14;
      const tengah = (awal + akhir) / 2;

      jalur +=
        ' C' + (posisiX + lengkungan) +
        ' ' + (tengah - 40) +
        ' ' + (posisiX - lengkungan) +
        ' ' + (tengah + 40) +
        ' ' + posisiX +
        ' ' + akhir;
    }
  }

  return jalur;
}

// Mengaktifkan garis canting dan titik yang mengikuti posisi scroll.
export function setupCanting() {
  const halaman = document.querySelector('#story-main');
  const gambar = document.querySelector('#canting-thread');
  const jalurDasar = document.querySelector('#canting-track');
  const garisTinta = document.querySelector('#canting-ink');
  const tetes = document.querySelector('#canting-drop');
  const bagianMasaDepan = document.querySelector('.future-scene');

  const daftarGarisMasaDepan = Array.from(
    document.querySelectorAll('.future-thread')
  );

  const kurangiGerak = matchMedia('(prefers-reduced-motion: reduce)');
  const layarRingkas = matchMedia(
    '(max-width: 800px), (pointer: coarse)'
  );

  const pengendali = new AbortController();
  const opsiPendengar = { signal: pengendali.signal };

  let idFrame = 0;
  let perluUkur = true;
  let ukuran;

  // Mengukur letak bab dan panjang jalur ketika tata letak berubah.
  function ukurHalaman() {
    const batasHalaman = halaman.getBoundingClientRect();
    const daftarBab = Array.from(document.querySelectorAll('.chapter'));
    const babTerakhir = daftarBab[daftarBab.length - 1];

    if (!babTerakhir) {
      return;
    }

    const batasBeranda = document
      .querySelector('#beranda')
      .getBoundingClientRect();

    const daftarTitik = [
      batasBeranda.top - batasHalaman.top + 100,
      batasBeranda.bottom - batasHalaman.top
    ];

    for (const bab of daftarBab) {
      daftarTitik.push(
        bab.getBoundingClientRect().top - batasHalaman.top + 40
      );
    }

    daftarTitik.push(
      babTerakhir.getBoundingClientRect().bottom - batasHalaman.top - 48
    );

    let posisiX = Math.max(16, (batasHalaman.width - 1120) / 2 - 32);

    if (layarRingkas.matches) {
      posisiX = 7;
    }

    const jalur = buatJalurCanting(
      daftarTitik,
      posisiX,
      layarRingkas.matches
    );

    gambar.setAttribute(
      'viewBox',
      '0 0 ' + batasHalaman.width + ' ' + batasHalaman.height
    );

    jalurDasar.setAttribute('d', jalur);
    garisTinta.setAttribute('d', jalur);

    const panjang = garisTinta.getTotalLength();
    const posisiAtasHalaman = batasHalaman.top + window.scrollY;
    const batasMasaDepan = bagianMasaDepan.getBoundingClientRect();

    ukuran = {
      awal: posisiAtasHalaman + daftarTitik[0],
      akhir: posisiAtasHalaman + daftarTitik[daftarTitik.length - 1],
      panjang: panjang,
      awalMasaDepan: batasMasaDepan.top + window.scrollY,
      akhirMasaDepan: batasMasaDepan.bottom + window.scrollY,
      panjangGarisMasaDepan: daftarGarisMasaDepan.map(function (garis) {
        return garis.getTotalLength();
      })
    };

    gambar.dataset.motion = kurangiGerak.matches ? 'reduced' : 'full';
    gambar.dataset.layout = layarRingkas.matches ? 'compact' : 'desktop';
  }

  // Menampilkan panjang garis sesuai kemajuan baca dan memindahkan tetes ke ujungnya.
  function gambarGaris() {
    idFrame = 0;

    if (perluUkur) {
      ukurHalaman();
      perluUkur = false;
    }

    if (!ukuran) {
      return;
    }

    const posisiBaca = window.scrollY + window.innerHeight * 0.65;

    let kemajuan = 1;

    if (!kurangiGerak.matches) {
      kemajuan = readingFraction(posisiBaca, ukuran.awal, ukuran.akhir);
    }

    garisTinta.setAttribute('stroke-dasharray', String(ukuran.panjang));
    garisTinta.setAttribute(
      'stroke-dashoffset',
      String(ukuran.panjang * (1 - kemajuan))
    );

    const ujung = garisTinta.getPointAtLength(
      ukuran.panjang * kemajuan
    );

    tetes.setAttribute('cx', String(ujung.x));
    tetes.setAttribute('cy', String(ujung.y));

    let kemajuanMasaDepan = 1;

    if (!kurangiGerak.matches) {
      kemajuanMasaDepan = readingFraction(
        posisiBaca,
        ukuran.awalMasaDepan,
        ukuran.akhirMasaDepan
      );
    }

    for (const [indeks, garis] of daftarGarisMasaDepan.entries()) {
      const panjang = ukuran.panjangGarisMasaDepan[indeks];

      garis.setAttribute('stroke-dasharray', String(panjang));
      garis.setAttribute(
        'stroke-dashoffset',
        String(panjang * (1 - kemajuanMasaDepan))
      );
    }
  }

  // Menjadwalkan satu pembaruan gambar meskipun scroll terjadi berkali-kali.
  function jadwalkanGambar() {
    if (idFrame === 0) {
      idFrame = requestAnimationFrame(gambarGaris);
    }
  }

  // Meminta pengukuran ulang sebelum gambar berikutnya diperbarui.
  function tandaiPerluUkur() {
    perluUkur = true;
    jadwalkanGambar();
  }

  window.addEventListener('scroll', function () {
    if (!kurangiGerak.matches) {
      jadwalkanGambar();
    }
  }, {
    passive: true,
    signal: pengendali.signal
  });

  window.addEventListener('resize', tandaiPerluUkur, opsiPendengar);
  kurangiGerak.addEventListener('change', tandaiPerluUkur, opsiPendengar);
  layarRingkas.addEventListener('change', tandaiPerluUkur, opsiPendengar);

  let pengamatUkuran;

  if ('ResizeObserver' in window) {
    pengamatUkuran = new ResizeObserver(tandaiPerluUkur);
    pengamatUkuran.observe(halaman);
  }

  if (document.fonts) {
    document.fonts.ready.then(function () {
      if (!pengendali.signal.aborted) {
        tandaiPerluUkur();
      }
    });
  }

  jadwalkanGambar();

  // Menghentikan animasi dan pendengar kejadian saat fitur dibersihkan.
  return function hentikanCanting() {
    pengendali.abort();
    cancelAnimationFrame(idFrame);

    if (pengamatUkuran) {
      pengamatUkuran.disconnect();
    }
  };
}