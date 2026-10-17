// Batasi permintaan ke API: maksimal 90 kali per alamat IP dalam 1 menit.
// "limits" adalah Map yang sudah dibuat di luar fungsi ini.
app.use('/api/*', async function batasiPermintaan(c, next) {
  // Respons API tidak disimpan di cache browser.
  c.header('Cache-Control', 'no-store');

  const waktuSekarang = Date.now();

  // Hapus catatan yang masa berlakunya sudah habis.
  for (const [alamat, catatan] of limits) {
    if (catatan.kedaluwarsa <= waktuSekarang) {
      limits.delete(alamat);
    }
  }

  const alamatIp = getConnInfo(c).remote.address || 'unknown';
  let catatan = limits.get(alamatIp);

  // Buat catatan jika alamat ini belum tercatat.
  if (!catatan) {
    if (limits.size >= 10000) {
      return c.json(
        { error: 'Server sedang sibuk. Coba sebentar lagi.' },
        503
      );
    }

    catatan = {
      jumlah: 0,
      kedaluwarsa: waktuSekarang + 60000
    };

    limits.set(alamatIp, catatan);
  }

  catatan.jumlah += 1;

  // Tolak permintaan ke-91 dan seterusnya sampai waktunya habis.
  if (catatan.jumlah > 90) {
    const sisaDetik = Math.ceil(
      (catatan.kedaluwarsa - waktuSekarang) / 1000
    );

    c.header('Retry-After', String(sisaDetik));

    return c.json(
      { error: 'Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.' },
      429
    );
  }

  // Batas belum terlewati, lanjutkan ke proses API berikutnya.
  await next();
});