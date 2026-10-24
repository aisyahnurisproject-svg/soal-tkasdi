# Panduan Instalasi — Bank Soal & Try Out Online

Aplikasi ini terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Isi | Dipasang di |
| --- | --- | --- |
| **Backend** (REST API) | 8 berkas `.gs` + `appsscript.json` | Google Apps Script (akun Google sekolah) |
| **Frontend** (tampilan) | `index.html`, folder `css/`, folder `js/` | GitHub Pages (gratis) |

Frontend memanggil backend lewat `fetch` ke URL `/exec`. Semua data tersimpan di satu Google Spreadsheet dan folder Google Drive milik akun pemasang.

---

## 1. Pasang backend (Google Apps Script)

### 1a. Buat proyek dan tempel kode

1. Buka <https://script.google.com> dengan akun Google sekolah, lalu klik **Proyek baru**. Beri nama, misalnya *Bank Soal TO — Backend*.
2. Ganti nama berkas `Code.gs` menjadi `Kode`, lalu tempel seluruh isi **Kode.gs**.
3. Tambahkan berkas skrip lain dengan tombol **＋ → Skrip**, dan tempel isinya satu per satu: `Setup`, `Akun`, `BankSoal`, `TryOut`, `Analisis`, `Migrasi`, `DocEngine`. Urutan berkas tidak berpengaruh.
4. Buka **⚙️ Setelan Proyek**, lalu centang **Tampilkan berkas manifes "appsscript.json" di editor**. Kembali ke editor, buka `appsscript.json`, dan ganti seluruh isinya dengan berkas **appsscript.json** dari paket ini. Manifes ini mengaktifkan layanan **Drive API** (untuk konversi Word → PDF) dan zona waktu Asia/Jakarta.
5. Tekan **💾 Simpan**.

### 1b. Jalankan setup (sekali; aman diulang)

1. Di dropdown fungsi, pilih **`setupAppEnvironment`**, lalu klik **▶ Jalankan**.
2. Klik **Tinjau izin**, pilih akun Anda, lalu **Lanjutan → Buka (tidak aman) → Izinkan**. Peringatan ini muncul karena skrip buatan sendiri belum diverifikasi Google.
3. Buka **Log eksekusi**. Anda akan melihat:
   - ✅ folder `📁 Bank Soal & Try Out Online` beserta 6 subfolder, dan spreadsheet `🗃️ Database` dengan 16 sheet + 4 sheet `DE_*` + `AppConfig`;
   - **👤 SUPER ADMIN PERTAMA**: email Anda + kata sandi sementara;
   - **🔐 AKSES DARURAT**: `darurat` + kata sandi.

> ⚠️ **Catat kedua kata sandi itu sekarang.** Keduanya hanya tampil sekali. Sistem menyimpan bentuk teracaknya saja, tidak bisa dibaca ulang.

Menjalankan `setupAppEnvironment()` lagi aman: folder dan sheet dicari ulang, kolom yang kurang ditambahkan, dan rahasia yang sudah ada **tidak** ditimpa.

### 1c. Deploy sebagai Web App

1. Klik **Terapkan → Deployment baru → ⚙️ → Aplikasi web**.
2. Isi **Jalankan sebagai: Saya**, lalu **Yang memiliki akses: Siapa saja**.
3. Klik **Terapkan**, lalu salin **URL aplikasi web** yang berakhiran `/exec`.
4. Uji di browser: `URL/exec?action=info`. Bila muncul `{"success":true,...}`, backend sudah hidup.

---

## 2. Rahasia & keamanan (Script Properties)

Semua rahasia hanya disimpan di **⚙️ Setelan Proyek → Properti skrip**. Rahasia tidak pernah ada di kode, Sheets, frontend, atau log.

| Nilai | Diisi oleh | Keterangan |
| --- | --- | --- |
| `SESSION_SECRET` | otomatis (setup) | Penanda tangan token sesi (HMAC). Rotasi: jalankan `rotasiSecretSesi()` (semua pengguna keluar). |
| `PASS_PEPPER` | otomatis | Dicampur ke hash kata sandi. **Jangan dihapus** — bila hilang, semua kata sandi tidak berlaku. |
| `TOKEN_TO_SECRET` | otomatis | Pembangkit token TO yang berotasi. |
| `EMERGENCY_USER`, `EMERGENCY_PASS_HASH` | otomatis | Akses darurat. Reset: jalankan `resetAksesDarurat()`. |
| `SPREADSHEET_ID`, `DRIVE_ROOT_FOLDER_ID`, `FOLDER_*` | otomatis | Lokasi data. Sheet `AppConfig` hanya catatan; kode tidak membacanya. |
| `GEMINI_API_KEY` | **Anda**, lewat aplikasi | Menu **Pengaturan → Ekstraksi AI**. Layar hanya menampilkan versi tersamar. |
| `GEMINI_MODEL` | otomatis / Anda | Bawaan `gemini-flash-latest` (alias yang selalu menunjuk versi Flash terbaru). Bisa diganti di Pengaturan. |

**Cara mendapatkan kunci Gemini:** buka <https://aistudio.google.com>, pilih **Get API key → Create API key**, salin, lalu tempel di Pengaturan aplikasi.

Aturan menjaga keamanan:

- Kata sandi disimpan sebagai hash HMAC-SHA256 berulang dengan *salt* unik + *pepper*.
- Kunci jawaban **tidak pernah dikirim** ke perangkat siswa; penilaian dilakukan di server.
- Token sesi dikirim di badan POST (bukan di URL), berlaku 12 jam untuk staf dan 6 jam untuk siswa.
- Login salah 5× akan dikunci 15 menit.
- Jangan menambah editor proyek Apps Script sembarangan: siapa pun yang bisa mengedit proyek bisa melihat Script Properties.
- Jangan membagikan spreadsheet database. Panitia cukup memakai aplikasi.
- Akses darurat ada di `URL-situs/#/darurat`. Alamat ini sengaja tidak ditautkan dari mana pun.

---

## 3. Pasang frontend (GitHub Pages)

### 3a. Siapkan folder

1. Ekstrak **bank-soal-to-online.zip**. Folder hasil ekstraksi **adalah** folder proyek. Di dalamnya langsung terlihat `index.html`, `css/`, `js/`, `README.md`, dan panduan ini.
2. Buka `js/config.js` dengan Notepad, lalu ganti `GANTI_DENGAN_ID_DEPLOYMENT` dengan URL `/exec` dari langkah 1c:
   ```js
   window.APP_CONFIG = { GAS_URL: 'https://script.google.com/macros/s/AKfy.../exec' };
   ```
   URL `/exec` bukan rahasia dan memang satu-satunya nilai di frontend.

### 3b. Unggah lewat terminal (jangan pakai "Upload files" di web GitHub)

1. Pasang Git: <https://git-scm.com/download/win>. Pengaturan bawaan sudah cukup.
2. Buat repository **Public** baru di <https://github.com>. **Jangan** centang README, .gitignore, atau license.
3. Buka folder proyek di File Explorer, klik address bar, ketik `powershell`, lalu Enter.
4. Pastikan Anda di folder yang benar dengan mengetik `dir`. **`index.html` harus terlihat di daftar.** Kalau yang terlihat justru satu folder lagi, masuk dulu ke folder itu dengan `cd`.
5. Jalankan satu per satu:
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email-github@anda.com"
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
   Saat diminta **Password**, tempel **Personal Access Token**, bukan kata sandi GitHub. Buat tokennya di <https://github.com/settings/tokens> → *Generate new token (classic)* → centang **repo**. Layar memang tidak menampilkan apa pun saat Anda menempel token; itu normal.
6. Di repository, buka **Settings → Pages**. Pilih **Source: Deploy from a branch**, **Branch: main / (root)**, lalu centang **Enforce HTTPS**, dan **Save**.
7. Tunggu 1–2 menit. Situs tampil di `https://USERNAME.github.io/NAMA-REPO/`.

**Untuk memperbarui frontend di kemudian hari:** `git add .` → `git commit -m "keterangan"` → `git push`, lalu tekan **Ctrl+Shift+R** di browser.

---

## 4. Langkah pertama setelah online

1. Masuk dengan **Guru & Admin** memakai email + sandi sementara dari log. Anda akan diminta membuat sandi baru.
2. Buka **Pengaturan**:
   - isi nama sekolah, logo, tahun ajaran, daftar mapel;
   - isi **URL aplikasi** (alamat GitHub Pages, dipakai untuk QR dokumen);
   - isi **kunci API Gemini**;
   - atur ambang penguasaan, mode PGK, dan aturan pindah tab.
3. **Kompetensi**: sesuaikan contoh kompetensi untuk Matematika dan Bahasa Indonesia, atau impor dari Excel.
4. **Akun**:
   - **Impor siswa** dari Excel (unduh templatnya; format kolom NIS sebagai *Teks*), lalu unduh **kartu login** yang muncul sekali;
   - tambahkan akun guru beserta mapelnya.
5. **Unggah & Ekstraksi** → **Antrean Review**: periksa hasil AI berdampingan dengan halaman asli, potong gambar, lalu setujui.
6. **Pembahasan**: buat pembahasan dengan AI, periksa (terutama yang berlabel *kunci berbeda*), lalu setujui.
7. **Paket TO**: buat paket, susun soal secara manual atau otomatis dari kisi-kisi, **pratinjau tampilan siswa**, lalu ubah status ke **Aktif**.
8. Hari pelaksanaan: tampilkan token dari **Monitoring TO** ke proyektor.
9. **Uji coba lapangan dengan satu kelas dulu** sebelum dipakai serentak.

---

## 5. Kecepatan (gas-scale-turbo) — apa yang dilakukan dan buktinya

| Pola | Penerapan |
| --- | --- |
| Jalur simpan jawaban tanpa lock & tanpa Sheets | `to.simpan` hanya menulis ke cache per sesi. Baris sesi di sheet diperbarui paling sering 1× per menit. **Terukur di simulator: 0 baca, 0 tulis Sheets per simpan.** |
| Finalisasi lewat antrean | Saat siswa menekan Selesai, nilai dihitung dan ditulis ke baris sesinya (tanpa lock). `Jawaban` dan `HasilTO` ditulis batch oleh pemicu tiap menit, aman diulang. Ini mencegah antrean lock ketika satu kelas selesai bersamaan. |
| Cache berversi + CacheX | Pengaturan, master kompetensi, indeks siswa, daftar soal, dan paket dicache. Nilai >100 KB dipecah. Setiap aksi tulis hanya menaikkan versi lingkup yang terdampak. |
| Satu panggilan untuk satu layar | Login langsung mengembalikan data layar pertama. Aksi baca yang terjadi bersamaan digabung otomatis menjadi satu panggilan `batch`. |
| SWR di perangkat | Menu yang pernah dibuka tampil seketika dari cache perangkat, lalu disegarkan di latar. |
| Polling adaptif | Monitoring menyegarkan tiap 15 dtk saat Anda aktif, 60 dtk saat diam, dan berhenti saat tab tidak terlihat. |
| Warmup 3 lapis | Halaman login memanaskan server (`?w=pub`/`?w=admin`), pemicu per menit menjaga cache, dan cache admin dipanaskan bila admin aktif. Ini menjamin **cache** tetap hangat, bukan menjamin mesin Google tidak pernah *cold start*. |
| Modul admin dimuat terpisah | Perangkat siswa tidak mengunduh kode panel admin. Pustaka (KaTeX, pdf.js, SheetJS, QR) dimuat saat diperlukan saja. |

**Pemicu & kuota.** Setup memasang satu pemicu `pemicuMenit`. Saat tidak ada TO, pemicu ini selesai dalam hitungan milidetik. Akun Gmail biasa mendapat ±90 menit runtime pemicu per hari, dan Workspace ±6 jam. Bila perlu menghemat, jalankan `matikanKeepWarm()` di editor; finalisasi hasil tetap berjalan. Untuk menyalakan lagi: `nyalakanKeepWarm()`. Untuk melihat status cache, pemicu, dan ukuran Script Properties: `cekPerforma()`.

**Pengukuran di browser.** Buka konsol (F12) lalu ketik `Perf.table()` atau `Perf.summary()` untuk melihat waktu total, waktu server, dan waktu jaringan tiap panggilan.

---

## 6. Migrasi data dari aplikasi lama

Menu **Migrasi Data** (khusus Super Admin):

1. Tempel URL spreadsheet aplikasi lama, lalu tekan **Pindai**. Kolom dicocokkan berdasarkan nama header (termasuk alias seperti `nis`, `nama_lengkap`, `tgl_lahir`).
2. Pilih data yang akan diimpor (Log tidak dicentang secara bawaan), lalu tekan **Dry-run** untuk melihat angka tanpa menulis apa pun.
3. Tekan **Jalankan impor**. Sheet diproses satu per satu (master dulu, lalu relasi) agar tidak terkena batas 6 menit.
4. Tepat sebelum pindah, **jalankan impor sekali lagi** untuk menangkap data baru (delta sync).

Jaminan:

- Sumber hanya dibaca.
- Impor ulang tidak membuat data dobel.
- Soal berstatus *disetujui* dan pengaturan yang sudah Anda ubah tidak ditimpa.
- NIS yang kehilangan angka 0 dipulihkan ke panjang yang lazim.

Yang **tidak** ikut pindah:

- **Kata sandi** dan **sesi login**. Pengaman (*pepper*) berbeda per proyek. Setelah impor, buka **Akun → pilih siswa → Reset sandi**, lalu unduh kartu login baru.
- File Drive lama tetap terbaca hanya bila aplikasi baru dipasang di **akun Google yang sama**.

---

## 7. Dokumen dari template (Doc Engine)

1. Buat template di Google Docs, Sheets, atau Slides. Contoh rapor:
   ```
   RAPOR TRY OUT — {{PAKET}}
   Nama: {{NAMA|kapital}}   NIS: {{NIS}}   Kelas: {{KELAS}}
   Nilai: {{NILAI}} ({{KETERANGAN}})
   | No | Kompetensi | Capaian | Status |
   | {{#KOMPETENSI}}{{KOMPETENSI.NO}} | {{KOMPETENSI.NAMA}} | {{KOMPETENSI.PERSEN}} | {{KOMPETENSI.STATUS}} |
   {{TANGGAL}}  {{JABATAN}}  {{TTD}}  {{NAMA_PEJABAT}}  NIP {{NIP}}   {{QR}}
   ```
2. Buka **Dokumen → Template → Tambah template**, tempel tautannya, lalu pilih sumber data (*Hasil TO per siswa*, *Rekap kelas*, *Kartu peserta*, atau *Isian manual*). Master disalin ke folder `Template_Dokumen`.
3. Buka **Penanda tangan**, lalu tambahkan kepala sekolah beserta spesimen tanda tangan (PNG transparan).
4. Gunakan **Buat dokumen** untuk satu siswa, atau **Buat massal** untuk satu paket/kelas. Hasil massal bisa diunduh sebagai ZIP.
5. QR pada dokumen membuka `URL-situs/#/verifikasi/KODE`. Halaman itu menampilkan status **Sah/Ditarik** dan bisa mencocokkan hash berkas PDF.

Cakupan versi ini: satu penanda tangan per dokumen, verifikasi di situs sekolah sendiri, dan keluaran PDF/DOCX/XLSX/PNG. Persetujuan multi-pejabat dengan PIN dan verifikasi pusat lintas aplikasi **belum** termasuk. Tanda tangan ini termasuk TTE *tidak tersertifikasi*: cukup untuk rapor TO dan surat internal, bukan pengganti TTE tersertifikasi PSrE.

---

## 8. Memperbarui backend

1. Cadangkan kode lama (salin ke dokumen lain).
2. Tempel kode baru, lalu **Simpan**. Bila skema berubah, jalankan `setupAppEnvironment()` lagi.
3. Klik **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**.
   **Jangan** pilih "Deployment baru", karena itu mengubah URL `/exec`.

---

## 9. Kendala umum

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| "Konfigurasi belum lengkap: isi GAS_URL" | `js/config.js` belum diisi | Isi URL `/exec`, lalu push ulang. |
| Situs GitHub 404 | `git init` dijalankan di folder yang salah | Pastikan `index.html` ada di root repository. |
| Tampilan tanpa gaya (CSS 404) | File diunggah lewat web GitHub sehingga struktur folder rusak | Push ulang lewat terminal dari folder yang berisi `css/` dan `js/`. |
| "Aplikasi belum dipasang" | Setup belum dijalankan | Jalankan `setupAppEnvironment()`. |
| "Kunci API Gemini belum diisi" | — | Isi di Pengaturan → Ekstraksi AI. |
| "Gemini menolak permintaan (404)" | Nama model tidak tersedia | Ganti model di Pengaturan, misalnya `gemini-flash-latest`. |
| "Konversi Word butuh Drive API" | Manifes belum dipakai | Tempel `appsscript.json`, atau aktifkan **Services → Drive API** di editor. |
| Gambar soal tidak tampil di HP siswa | Kebijakan domain Workspace melarang berbagi tautan | Minta admin Workspace mengizinkan "siapa saja yang memiliki link". Alternatif: pakai akun Gmail sekolah. |
| Rumus tampil sebagai `$\frac…$` | KaTeX dari CDN tidak termuat | Periksa internet atau filter jaringan sekolah untuk `cdnjs.cloudflare.com`. |
| Siswa "aktif di perangkat lain" | Pindah perangkat di tengah ujian | Di Monitoring, centang siswa → **Reset sesi**. Siswa lalu masuk lagi dengan token terbaru; jawaban & sisa waktu tetap. |
| Hasil belum masuk Rekap | Antrean finalisasi (≤1 menit) | Tunggu sebentar. Membuka Rekap/Monitoring juga memprosesnya. |
| Sandi Super Admin hilang | — | Jalankan `resetSandiSuperAdmin()` di editor, atau masuk lewat `#/darurat`. |

---

## 10. Batasan yang perlu diketahui

- **Akurasi AI**: PDF hasil ketik umumnya terbaca rapi. Untuk scan buram atau foto miring, akurasi 100% tidak bisa dijamin. Karena itulah ada skor keyakinan, status *bermasalah*, dan review dua panel.
- **Kapasitas**: arsitektur ini dirancang untuk satu sekolah. Mulailah dengan satu kelas, pantau, lalu naikkan ke beberapa kelas serentak.
- **Kuota Google**: UrlFetch (pemanggilan Gemini) dan runtime pemicu punya batas harian. Ekstraksi ratusan halaman sebaiknya dibagi beberapa hari pada akun Gmail biasa.
- **Grafik** memakai CSS/SVG (bukan Chart.js) agar halaman lebih ringan.
- **Font & KaTeX** dimuat dari CDN. Tanpa internet, tampilan jatuh ke font sistem.

---

## 11. Ringkasan pengujian sebelum diserahkan

- **Simulator GAS di Node** (Sheets dengan konversi angka, Cache 100 KB, Properties, Lock non-reentrant, Drive, UrlFetch tiruan): **124/124 uji lulus**. Uji ini mencakup:
  - setup idempoten;
  - login 3 peran dan penguncian;
  - allowlist rahasia;
  - ekstraksi + pemulihan LaTeX + penggabungan soal terpotong + potong gambar;
  - validasi persetujuan;
  - pembahasan dengan deteksi kunci berbeda;
  - impor siswa (NIS tetap diawali 0);
  - paket, token rotasi, kunci tidak terkirim ke siswa, stimulus kelompok berurutan, blokir perangkat lain;
  - penilaian parsial, kumpul otomatis saat waktu habis, finalisasi aman diulang;
  - rekap, analisis siswa/butir, nilai uraian;
  - migrasi dry-run/idempoten/delta;
  - fungsi murni Doc Engine;
  - log tanpa rahasia;
  - tidak ada lock tertinggal.
- **Browser (Chromium)**: alur siswa lengkap (masuk → konfirmasi token → ujian → daftar soal → kumpulkan → hasil → pembahasan), 13 halaman admin, dan pratinjau ujian di HP. Hasilnya **0 error JavaScript**, dan semua halaman muat tanpa gulir samping di layar 360 px.
