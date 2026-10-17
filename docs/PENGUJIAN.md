# Laporan pengujian Jejak Mbako 0.4.0

Tanggal: 13 Oktober 2026. Lingkungan: Windows, Node.js 22, browser Chromium tertanam di Codex. Data browser dan kunjungan pengujian menggunakan origin/file terpisah dari aplikasi utama. Seluruh ukuran viewport di bawah merupakan simulasi ukuran layar, bukan perangkat HP fisik.

## Ringkasan hasil

| Pemeriksaan | Hasil | Batas bukti |
| --- | --- | --- |
| `npm run check` | Lulus | Sintaks server dan empat modul frontend. |
| `npm test` | 29 lulus, 0 gagal | Termasuk satu tes induk API dengan 14 subtes. |
| `npm run verify:local` | Lulus | 17 berkas runtime dan satu respons cerita; HTTP loopback, referensi aset lokal, serta batas ukuran. |
| `npm audit --omit=dev` | 0 kerentanan terlapor | Advisory registry pada tanggal pemeriksaan; bukan jaminan bebas kerentanan. |
| Alur lengkap | Lulus di Chromium | Lima bab selesai, kuis 3/3, tiga misi, nama, PNG, dan pemulihan setelah reload. |
| Keyboard | Lulus pada alur yang diuji | Skip link, menu, tab peta/Home/End, radio, dialog Tab/Shift+Tab/Escape, accordion. |
| Struktur DOM | Tidak ada temuan pada pemeriksaan | Satu h1/main, `lang=id`, tanpa ID ganda, gambar tanpa atribut alt, tombol tanpa nama, atau target jangkar hilang. Tidak menilai kualitas alt secara otomatis. |
| Kontras token utama | 21 pasangan di atas 4,5:1 | Nilai terendah 6,04:1 (putih di terakota). Perhitungan warna dasar; tidak mencakup seluruh opacity/overlay atau merupakan sertifikasi aksesibilitas. |
| Responsif | Tanpa luapan halaman horizontal | 1280 × 900, 768 × 1024, 390 × 844, 320 × 740. Galeri memiliki gulir horizontal yang memang disengaja. |
| Gagal memuat cerita | Pulih | Fixture QA mengembalikan 503 pertama kali; Coba lagi memuat lima bab dan kuis, `aria-busy` kembali false. |
| Storage gagal | Lulus tes otomatis | SecurityError, JSON rusak, dan QuotaExceededError disimulasikan pada adapter storage; bukan pemblokiran lewat pengaturan browser. |
| Sinkronisasi dua tab | Lulus | Misi dibatalkan di tab kedua; tab pertama memperbarui hitungan dan mengunci kartu. |
| Nama mengandung markup | Tetap teks | `<b>Ayu</b>` tampil literal; tidak menambah elemen anak di ringkasan perjalanan. |
| Reduced motion | Lulus tes logika | Pergantian preferensi disimulasikan pada unit test; belum melalui pengaturan sistem/perangkat fisik. |
| Konsol | Tanpa galat JS/CSP pada alur normal | Respons 503 sengaja dibuat hanya pada tab fixture pemulihan. |

## Temuan yang diperbaiki

- Menu sebelumnya selalu menandai Cerita. Sekarang status mengikuti tujuan navigasi/bagian yang diamati dan menyertakan `aria-current`.
- Tujuan peta memakai h3 sehingga helper fokus lama melewatinya. Judul h1/h2/h3 sekarang dapat menerima fokus setelah navigasi.
- Pada batas dialog, Tab/Shift+Tab dapat membawa fokus keluar dari kontrol dialog. Perputaran eksplisit sekarang mempertahankan fokus di dialog; Escape mengembalikannya ke pemicu.
- Akses storage dan JSON rusak sebelumnya ditangani dalam satu blok. Adapter baru membedakan kegagalan akses dari data rusak dan dapat diuji tanpa mengubah data browser pengguna.
- Kegagalan saat inisialisasi berpotensi meninggalkan listener/panel lanjutan. Jalur error sekarang membersihkan keduanya sebelum menawarkan muat ulang.
- Dekorasi plus pada ide usaha kini tersembunyi dari nama aksesibel. Elemen judul/panel yang menerima fokus mempunyai outline yang konsisten.

## Keamanan yang diuji

Input API hanya menerima satu `chapterId` yang terdaftar. Nama, field ekstra, tipe salah, JSON rusak, origin asing, dan body lebih dari 1.024 byte ditolak, termasuk transfer chunked. Permintaan paralel tidak kehilangan hitungan. File agregat rusak, negatif, mengandung field asing, atau mencapai batas bilangan aman tidak dihapus diam-diam; antrean dapat pulih setelah data diperbaiki.

Route privat, traversal biasa, traversal Windows terenkode, serta POST/PUT/DELETE ke aset tidak mempublikasikan berkas sumber. Header keamanan tetap ada pada respons galat. Rate limit memberikan 429 dan Retry-After. Tes tidak membuktikan perlindungan terhadap semua jenis serangan atau beban produksi.

## Ukuran dan performa

Pengukuran seluruh aset runtime lokal, bukan hanya muatan awal:

| Jenis | Byte |
| --- | ---: |
| HTML | 14.926 |
| CSS | 50.030 |
| JavaScript | 62.821 |
| Tujuh SVG | 11.062 |
| Empat font WOFF2 | 54.468 |
| Respons data cerita | 26.230 |
| **Total** | **219.537** |

Total sekitar 214,4 KiB tanpa kompresi. Font sekitar 53,2 KiB. Pada satu putaran pemeriksaan, median pembacaan HTTP aset localhost sekitar 14,43 ms; angka ini dipengaruhi mesin lokal dan **bukan waktu muat pada HP, LCP, INP, atau skor Lighthouse**.

Tes animasi memverifikasi bahwa 100 event scroll sebelum frame berikutnya hanya menjadwalkan satu render, panjang SVG tidak diukur ulang pada scroll biasa, reduced motion menghentikan penjadwalan dari scroll, serta layout compact memakai jalur lurus. Gambar cerita/galeri lazy-load. Tidak menambah library frontend.

## Makna pengujian tanpa internet

HTML, modul JavaScript, stylesheet, SVG, font, dan `/api/story` tersedia dari loopback. Pemeriksa aset membaca berkas-berkas itu melalui HTTP dan memeriksa referensi import, font/gambar CSS, sumber HTML/SVG, serta pemanggilan fetch literal. Aplikasi tidak memakai API pihak ketiga atau CDN pada runtime yang diperiksa. Tautan sumber eksternal merupakan navigasi opsional oleh pengguna.

Koneksi internet komputer **tidak dimatikan** dalam audit ini. Pemeriksaan aset lokal tidak menggantikan uji operasional tanpa internet pada laptop demo. Setelah `npm ci` berhasil, jalankan server, putuskan internet tanpa menghentikan Node, reload, lalu selesaikan cerita/kuis/misi dan unduh PNG. Jangan memilih mode DevTools yang turut memblokir localhost. Jangan menjalankan `npm ci` saat koneksi sudah diputus.

## Matriks lanjutan pada perangkat nyata

| Lingkungan | Status | Langkah utama |
| --- | --- | --- |
| Chrome/Edge desktop mandiri | Belum diuji terpisah | Ulangi alur lengkap, Tab, unduhan, reload, serta zoom 200%. |
| Firefox desktop | Belum diuji | Dialog, SVG, tab peta, scroll-snap, dan canvas PNG. |
| Safari/iOS | Belum diuji | Layout viewport, gesture galeri, safe area, dialog, serta cara menyimpan PNG. |
| Android kelas menengah | Belum diuji fisik | Gulir lima bab, seret galeri, respons tombol, keyboard layar, dan unduhan; catat perangkat/versi browser. |
| NVDA/VoiceOver/TalkBack | Belum diuji | Urutan baca, label pilihan, perubahan soal, status misi, dan kembali dari dialog. |
| Reduce motion dari pengaturan sistem | Belum diuji langsung | Aktifkan sebelum membuka aplikasi dan saat halaman sudah terbuka; fungsi tetap dapat digunakan. |
| Storage diblokir di browser | Belum diuji lewat pengaturan | Gunakan profil uji; selesaikan satu bab/soal, cek catatan bahwa progres hanya untuk sesi. |
| Internet benar-benar diputus | Belum diuji langsung | Server lokal tetap hidup; reload, selesaikan kuis/misi, dan unduh kartu. |

Untuk uji HP melalui LAN, jalankan server pada alamat IPv4 LAN laptop menggunakan variabel `HOST`, lalu buka `http://<IP-LAN-laptop>:<PORT>` pada jaringan privat yang sama. `localhost` di HP menunjuk HP itu sendiri. Setelah pengujian, kembalikan HOST ke 127.0.0.1. Konfigurasi firewall/perangkat dilakukan oleh pemilik perangkat; audit ini tidak mengubahnya.

## Bukti lokal

- `.qa/phase-4-desktop.jpg`: halaman kartu, nama uji, tautan unduh, menu aktif, dan 5 bab/3 misi.
- `.qa/phase-4-mobile.jpg`: umpan balik kuis pada viewport ponsel.
- `.qa/phase-4-card.png`: PNG yang benar-benar diunduh dan dibuka, 1200 × 760.
- `.qa/phase-4-assets.json`: keluaran pengukuran aset.
- `.qa/phase-4-contrast.json`: perhitungan rasio kontras 21 pasangan token warna.

Folder `.qa` diabaikan Git dan bukan bagian aplikasi publik. Bukti fase 3 tetap tersedia untuk skenario pengulangan kuis serta reset. Jika berkas bukti tidak ikut dibawa, hasil dapat diulang dengan langkah pada README. Jangan mengganti status “belum diuji” menjadi “lulus” tanpa menjalankan pengujiannya.
