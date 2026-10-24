# Bank Soal & Try Out Online — Frontend

Frontend statis (HTML/CSS/JS tanpa framework) untuk GitHub Pages. Backend berupa Google Apps Script REST API (berkas `.gs` diberikan terpisah).

- `index.html` — kerangka halaman
- `css/style.css` — gaya (token desain ANBK)
- `js/config.js` — **satu-satunya yang perlu diisi**: URL `/exec` Web App
- `js/core.js` — API, cache perangkat, pengukur (`Perf.table()`), UI
- `js/publik.js`, `js/siswa.js` — halaman masuk, verifikasi, area siswa & lembar ujian
- `js/admin*.js` — panel guru/admin (dimuat hanya setelah staf masuk)

Langkah pemasangan lengkap ada di `PANDUAN-INSTALASI.md`. Jalankan `git init` di folder ini (folder yang berisi `index.html`).
