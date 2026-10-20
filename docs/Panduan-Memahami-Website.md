# Panduan memahami website Jejak Mbako

Dokumen ini menjelaskan cara bagian-bagian website saling bekerja. Tujuannya supaya kamu tahu harus membuka file mana saat ingin mengubah isi atau tampilan.

## Gambaran singkat

Jejak Mbako adalah website cerita interaktif tentang Temanggung dan Batik Mbako. Pengunjung membaca lima bab, menjawab kuis, lalu bisa menandai misi yang sudah dilakukan.

Urutan kerjanya kira-kira begini:

1. `index.html` menyiapkan susunan halaman dan isi tetap tiap bab, seperti judul, ringkasan, foto, dan pelajaran.
2. `server.js` menyediakan paragraf dari `data/story.json` lewat alamat `/api/story`.
3. `main.js` mencocokkan paragraf dengan bab yang ID-nya sama, lalu menampilkannya di halaman.
4. `engagement.js` menjalankan kuis dan misi.
5. `progress-model.js` merapikan progres dan menyimpannya di browser.

## File yang paling sering kamu buka

| File | Gunanya |
| --- | --- |
| `public/index.html` | Susunan halaman. Isi judul bab, eyebrow, ringkasan, foto, refleksi, dan pelajaran bab ada di sini. |
| `data/story.json` | Paragraf cerita Bab 1 sampai Bab 5 saja. Setiap bab punya `id` dan daftar `paragraphs`. |
| `public/assets/js/main.js` | Pengatur utama website: mengambil paragraf, mengisi halaman, mengatur bab terkunci, navigasi, dialog, dan progres. |
| `public/assets/js/engagement.js` | Isi dan cara kerja kuis serta misi. Kunci jawaban kuis juga ada di file ini, jadi bisa terlihat lewat Inspect. |
| `public/assets/js/progress-model.js` | Bentuk data progres, pemeriksaan jawaban, dan penyimpanan progres di browser. |
| `public/assets/js/story-scenes.js` | Garis canting interaktif yang bergerak mengikuti perjalanan halaman. |
| `public/assets/css/style.css` | Warna, ukuran, tata letak, dan tampilan responsif website. |
| `server.js` | Server Hono yang mengirim paragraf, menyediakan API, memasang security headers, dan menyajikan halaman serta aset. |
| `package.json` | Perintah untuk menjalankan server dan pemeriksaan kode. |

## Cara paragraf masuk ke bab

Di `index.html`, setiap bab sudah punya bagian kosong seperti `<div class="chapter-prose"></div>`. Bagian itu sengaja dibiarkan tanpa paragraf.

Di `data/story.json`, paragraf disimpan seperti ini:

```json
{
  "bab": [
    {
      "id": "bab-1",
      "paragraphs": [
        "Paragraf pertama.",
        "Paragraf kedua."
      ]
    }
  ]
}
```

`main.js` meminta data itu ke `/api/story`, mencari bab dengan ID yang cocok, lalu memasukkan setiap paragraf ke bagian `.chapter-prose`. Karena ID-nya harus cocok, kalau menambah atau mengganti ID bab di HTML, ID yang sama juga harus ada di JSON.

Saat mengedit paragraf, ubah teks di dalam `paragraphs`. Jangan menghapus tanda kutip atau koma JSON. Kalau ada dua paragraf, pisahkan dengan koma.

## Tugas tiga file JavaScript utama

### `main.js`

Ini yang mengatur alur halaman. File ini mengambil paragraf dari server, memasukkannya ke bab, membuat daftar navigasi, dan menentukan bab mana yang boleh dibuka.

Saat pengunjung menekan tombol lanjut di akhir bab, `main.js` menandai bab itu selesai dan membuka bab berikutnya. Link langsung ke bab terkunci juga ditahan.

### `engagement.js`

File ini mengurus kuis dan misi. Kode kuis menampilkan soal satu per satu, memeriksa pilihan, lalu menunjukkan penjelasan dan hasil. Misi selain kuis bisa ditandai setelah langkah sebelumnya selesai.

Jawaban benar ditulis di JavaScript yang dikirim ke browser. Itu wajar untuk kuis belajar tanpa hadiah atau nilai resmi, tetapi berarti kunci jawabannya bukan rahasia.

### `progress-model.js`

File ini tidak mengatur tampilan. Tugasnya menjaga data progres tetap rapi: bab dan misi yang selesai harus berurutan, jawaban kuis diperiksa, lalu progres dibaca atau ditulis ke `localStorage`.

`localStorage` berarti data tersimpan di browser yang sedang dipakai. Nama panggilan, jawaban, dan progres tidak dikirim sebagai akun pengguna.

## Alur progres pengunjung

1. Pengunjung membuka Bab 1. Bab berikutnya masih terkunci.
2. Setelah menekan tombol lanjut, Bab 1 ditandai selesai dan Bab 2 terbuka.
3. Pola yang sama berlaku sampai Bab 5.
4. Di bagian kuis dan misi, `engagement.js` mengirim perubahan ke `main.js`.
5. `main.js` meminta `progress-model.js` merapikan dan menyimpan perubahan.

## Kalau mau mengubah sesuatu

- **Paragraf cerita:** buka `data/story.json`.
- **Judul, eyebrow, ringkasan, foto, refleksi, atau pelajaran bab:** buka `public/index.html` dan cari `id="bab-1"`, `id="bab-2"`, dan seterusnya.
- **Pertanyaan, jawaban, atau misi:** buka `public/assets/js/engagement.js`.
- **Aturan buka bab atau interaksi halaman:** buka `public/assets/js/main.js`.
- **Cara progres dicek dan disimpan:** buka `public/assets/js/progress-model.js`.
- **Warna, jarak, atau tampilan HP:** buka `public/assets/css/style.css`.

Kalau hanya mau mengganti tulisan paragraf, cukup ubah `story.json`. Kalau mau mengganti judul atau ringkasan, ubah langsung di bagian bab dalam `index.html`.

## Menjalankan di komputer sendiri

Di folder project, buka terminal lalu jalankan:

```text
npm run dev
```

Setelah server aktif, buka `http://localhost:3000`. Perintah `npm run check` di `package.json` memeriksa kesalahan sintaks beberapa file JavaScript.