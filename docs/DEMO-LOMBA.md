# Panduan demo Jejak Mbako

Panduan ini menjelaskan aplikasi yang sudah dibuat berdasarkan brief proyek. Ketentuan panitia—termasuk kategori, pembagian pengerjaan sebelum/di lokasi, waktu presentasi, dan bentuk pengumpulan—perlu dicocokkan dengan juknis resmi yang berlaku. Tidak ada tanggal atau penilaian kelulusan panitia yang diasumsikan di sini.

## Cerita pembuka

“Jejak Mbako membantu pemuda mengenal budaya Temanggung melalui cerita interaktif. Pengunjung bergerak dari mengenal tanah dan kerja manusia, melihat kreativitas dalam batik, lalu memilih tindakan kecil yang bisa mereka lakukan. Benang merahnya: dari daun jadi karya, dari pemuda menuju 2045.”

Jelaskan bahwa aplikasi membahas budaya, penghidupan, dan kreativitas; ilustrasi motif merupakan karya original untuk pembelajaran. Nama/tempat atau detail sejarah yang belum pasti tetap diberi tanda verifikasi.

## Contoh alur demo sekitar lima menit

| Waktu perkiraan | Yang ditampilkan | Poin penjelasan |
| --- | --- | --- |
| 0:00–0:40 | Hero dan satu hotspot | Cerita lokal dibuka melalui ilustrasi ringan. |
| 0:40–1:30 | Peta dan satu lokasi | Tempat terhubung dengan cerita; peta ilustratif, sumber dapat ditelusuri. |
| 1:30–2:20 | Hotspot motif dan proses batik | Pengunjung mengamati bentuk serta perubahan tahap, bukan hanya membaca. |
| 2:20–3:20 | Kuis, satu penjelasan, hasil | Jawaban salah tetap menjadi kesempatan belajar; progres lokal tersimpan. |
| 3:20–4:20 | Misi dan satu ide kreatif | Hubungkan keterampilan pemuda dengan langkah nyata; checklist manual dijelaskan sebagai catatan mandiri. |
| 4:20–5:00 | Kartu PNG, reload, sumber | Tunjukkan hasil yang dibawa pulang, penyimpanan progres, dan kejujuran sumber. |

Sesuaikan durasi dengan jatah resmi. Dalam simulasi, katakan bahwa misi manual sedang dicontohkan; jangan mengklaim telah mewawancarai perajin bila belum dilakukan. Latihan singkat dapat melompat lewat menu, sementara uji pengguna baru tetap meminta penyelesaian lima bab secara utuh.

## Persiapan laptop demo

1. Pasang Node.js 22+ dan jalankan `npm ci` sebelum hari demo, lalu simpan folder proyek beserta dependency yang diperlukan untuk menjalankan lokal.
2. Jalankan `npm run check`, `npm test`, dan `npm run verify:local`. Cocokkan hasil dengan laporan pengujian.
3. Jalankan `npm start`, buka `http://localhost:3000`, dan biarkan proses server tetap hidup. Gunakan browser/profil demo yang sama selama presentasi.
4. Gunakan Perjalananmu → Mulai ulang perjalanan hanya bila ingin menghapus progres pada profil demo. Nama opsional; “Penjelajah” digunakan bila kosong.
5. Lakukan latihan tanpa internet dengan server lokal tetap berjalan. Tautan sumber eksternal tidak perlu dibuka saat sesi offline.
6. Uji unduhan PNG pada browser dan folder unduhan laptop tersebut. Siapkan berkas PNG hasil latihan sebagai cadangan visual, bukan pengganti demo interaktif.

## Cara menjelaskan teknis dengan sederhana

- **Frontend:** HTML menyusun halaman, CSS mengatur tampilan, JavaScript membuat peta, kuis, progres, dan kartu menjadi interaktif.
- **Backend:** Node.js dan Hono mengirim aset/cerita serta menghitung kunjungan bab. Hanya dua dependency runtime.
- **Dua tempat penyimpanan:** nama dan progres ada di localStorage browser; server hanya menyimpan hitungan anonim per bab pada JSON.
- **Pengamanan:** ID bab dibatasi, body kecil, origin diperiksa, header keamanan dipasang, dan penulisan file diantrekan. Tidak ada login atau unggahan bukti misi.
- **Kinerja:** total aset kecil, font dan gambar lokal, gambar di bagian bawah lazy-load, serta pembaruan animasi digabung per frame.
- **Batas:** kartu adalah kenang-kenangan, bukan sertifikasi; hitungan kunjungan bukan pengguna unik; aplikasi memerlukan server Node tetap berjalan.

## Sebelum menetapkan siap dikumpulkan

- Cocokkan fitur, kategori, orisinalitas, dan skema pengerjaan dengan juknis resmi. Bila ketentuan 70%/30% atau lima jam berasal dari brief, pastikan panitia memang menetapkannya dan simpan bukti pengerjaan sesuai ketentuannya.
- Selesaikan matriks perangkat nyata di [laporan pengujian](PENGUJIAN.md), terutama laptop/browser presentasi, HP sasaran, offline, dan pembaca layar yang tersedia.
- Tinjau semua `[PERLU DIVERIFIKASI]`. Jangan mengubah catatan menjadi fakta tanpa sumber. Jangan menyebut peta sebagai navigasi lokasi akurat.
- Saat ini semua gambar yang ditampilkan adalah SVG original. Jika ingin menambahkan foto dokumentasi, gunakan milik sendiri atau berizin, lengkapi kredit, dan ubah status menjadi `siap` setelah verifikasi.
- Sertakan README, data cerita, kode, lisensi font, serta cara menjalankan. Jangan memasukkan berkas pribadi atau mengklaim bukti QA sebagai hasil tes perangkat yang belum dilakukan.

## Tiga latihan tanya jawab

**Apa hubungan proyek ini dengan kepemudaan?**

Alur berakhir pada keterampilan dan tindakan pemuda: mendengarkan cerita, membagikan fakta bersumber, dan mengeksplorasi karya kreatif. Budaya lokal menjadi bahan belajar dan berkarya.

**Apa ukuran keberhasilannya?**

Gunakan uji tugas: apakah pengguna baru dapat menyelesaikan lima bab, kuis, tiga misi, dan mengunduh kartu tanpa bantuan? Catat hasil uji nyata. Angka keberhasilan belum diklaim karena pengujian pengguna sasaran belum dilakukan.

**Mengapa tidak menambahkan akun atau teknologi 3D?**

Kebutuhan utama adalah cerita yang mudah dicoba, ringan, dan dapat dijalankan lokal. Progres lokal serta SVG/canvas sudah memenuhi alur itu dengan lebih sedikit setup dan data yang dikumpulkan.
