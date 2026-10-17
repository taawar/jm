# Font lokal

Font diambil pada 13 Oktober 2026 dari paket resmi distribusi Fontsource di npm:

- `@fontsource/fraunces@5.3.0`: `files/fraunces-latin-600-normal.woff2`.
- `@fontsource/plus-jakarta-sans@5.3.0`: `files/plus-jakarta-sans-latin-{400,500,700}-normal.woff2`.

Nama berkas dipersingkat sesuai struktur proyek. File LICENSE masing-masing paket disertakan sebagai `OFL-Fraunces.txt` dan `OFL-Plus-Jakarta-Sans.txt`.

Sumber keluarga font: https://github.com/google/fonts/tree/main/ofl/fraunces dan https://github.com/google/fonts/tree/main/ofl/plusjakartasans.

Paket font hanya digunakan untuk mengambil aset; tidak ditambahkan sebagai dependency aplikasi. Browser memuat WOFF2 dari server lokal, tanpa Google Fonts API atau CDN saat situs berjalan.
