# Dokumentasi Karya Jejak Mbako

**Nama:** Aditya Wardani  
**Asal sekolah/daerah:** SMKN Tembarak / Temanggung  
**Kategori lomba:** Piranti Perangkat Lunak  
**Tahun:** 2026

## Tentang karya ini

Jejak Mbako adalah website cerita tentang Temanggung dan Batik Mbako. Pengguna diajak mengikuti lima bab, dari mengenal lingkungan dan kehidupan masyarakat sampai melihat bagaimana sesuatu yang dekat dengan keseharian bisa menjadi inspirasi sebuah karya.

Setelah membaca, pengguna bisa menjawab kuis dan melihat beberapa misi sederhana. Saya ingin membuat pengenalan budaya lokal terasa lebih menarik untuk diikuti, terutama oleh generasi muda.

## Kenapa saya memilih ide ini?

Saya memilih ide ini karena ingin mengangkat cerita dari daerah sendiri. Temanggung punya alam, hasil bumi, dan karya masyarakat yang menarik untuk dikenalkan. Saya tertarik pada Batik Mbako karena tanaman tembakau yang akrab dengan Temanggung dapat menjadi inspirasi karya.

Dari situ, saya ingin mengajak pengguna melihat potensi di sekitarnya. Sesuatu yang awalnya terlihat biasa bisa punya cerita dan membuka gagasan baru.

## Hubungannya dengan tema lomba

Menurut saya, generasi muda perlu punya kemauan untuk belajar dan mengembangkan kemampuan. Salah satu langkah awalnya adalah mengenali potensi di sekitar mereka.

Jejak Mbako mengajak pengguna mengenal budaya lokal, menghargai pekerjaan masyarakat, dan melihat kreativitas yang tumbuh dari lingkungan. Website ini menjadi media pengenalan dan pembelajaran sederhana. Saya belum mengukur dampaknya melalui survei, jadi manfaat yang saya sampaikan adalah tujuan yang ingin dicapai melalui karya ini.

## Isi dan cara menggunakan website

Cerita di Jejak Mbako dibagi menjadi lima bab:

1. **Di Antara Dua Gunung** — mengenal Temanggung dan lingkungan tempat cerita bermula.
2. **Daun yang Menghidupi** — melihat hubungan hasil bumi dengan kehidupan dan pekerjaan masyarakat.
3. **Lahirnya Batik Mbako** — mengenal tanaman tembakau sebagai inspirasi karya.
4. **Dari Daun ke Kain** — mengenal proses dan ketekunan dalam membuat karya.
5. **Giliran Pemuda** — mengajak generasi muda memikirkan peran mereka dalam mengenalkan budaya.

Pengguna bisa mulai dari halaman pembuka, lalu menjelajahi cerita melalui menu dan tombol di halaman. Setelah membaca, pengguna dapat mencoba kuis berisi tiga pertanyaan. Setiap jawaban mendapat penjelasan, dan setelah kuis selesai pengguna bisa melihat skor.

Ada juga tiga misi: menyelesaikan kuis, mendengarkan satu cerita lokal, dan membagikan satu fakta tentang Temanggung. Misi di luar kuis ditandai sendiri oleh pengguna setelah dilakukan.

Progres, seperti bab terakhir yang dibuka, nama, dan hasil kuis, disimpan di browser yang digunakan. Jadi pengguna tidak perlu membuat akun, tetapi progresnya tidak otomatis berpindah ke perangkat atau browser lain.

## Desain website

Saya memilih tampilan dengan warna nila gelap, krem, dan aksen emas. Warna hijau dan warna terang lain digunakan sebagai variasi. Saya ingin tampilannya terasa hangat dan berkaitan dengan alam serta kain.

Judul menggunakan font **Fraunces**, sedangkan teks isi dan menu menggunakan **Plus Jakarta Sans**. Nama “jejak mbako” di bagian atas menjadi identitas tulisan website, dengan kata “mbako” diberi penekanan agar mudah dikenali.

Foto Alun-alun Temanggung digunakan pada halaman pembuka. Foto tembakau, kain batik, dan perajin ditempatkan pada bagian cerita yang sesuai. Pada layar komputer, teks Bab 2 berada di kiri dan foto tembakau di kanan. Tampilan menyesuaikan ukuran layar ponsel agar tetap nyaman dibaca.

Ada animasi garis yang mengikuti pergerakan halaman. Bentuknya terinspirasi dari alur canting dan berfungsi menghubungkan perjalanan pengguna dari satu bagian cerita ke bagian berikutnya.


## Teknologi yang digunakan

Website ini menggunakan HTML untuk susunan halaman, CSS untuk tampilan, dan JavaScript untuk interaksi seperti kuis, misi, progres, dan animasi.

Isi cerita, pertanyaan, dan misi disimpan dalam file JSON supaya lebih mudah diperbarui. Server menggunakan Node.js dan Hono. Website dipublikasikan melalui Vercel, sedangkan progres pengguna disimpan di browser.

## Hal yang ingin saya tonjolkan

Jejak Mbako menyatukan cerita daerah, kuis, dan misi dalam satu alur. Cerita membantu pengguna mengenal konteksnya, kuis mengajak mereka mengingat isi, dan misi memberi ide sederhana untuk membawa cerita itu ke luar website.

Saya berharap pengguna bisa melihat bahwa mengenal budaya lokal dapat menjadi awal untuk belajar, menghargai karya masyarakat, dan mencari inspirasi dari lingkungan sendiri.

## Keterbatasan dan rencana ke depan

Website ini masih sedikit dan rencananya saya ingin mengembangkan lebih lanjut dengan menambahkan lebih banyak cerita improve UI/UX dll.

## Menjalankan

Untuk menjalankan website di komputer sendiri, pastikan **Node.js versi 22 atau lebih baru** sudah terpasang. Setelah itu, buka terminal di folder project dan jalankan:

```bash
npm install
npm run dev
```

Kalau server sudah aktif, buka **http://localhost:3000** di browser. Untuk menghentikan server, tekan **Ctrl + C** di terminal.
