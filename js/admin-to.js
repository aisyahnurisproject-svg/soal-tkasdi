/* =====================================================================
   admin-to.js — Paket TO, Monitoring TO langsung, Hasil & Analisis
   ===================================================================== */
(function () {
  'use strict';
  const SEMUA = Admin.SEMUA;

  // ============================================================ PAKET TO
  Admin.daftar('paket', {
    judul: 'Paket TO', ikon: 'paket', grup: 'Pelaksanaan & evaluasi', peran: SEMUA,
    render(el) {
      el.innerHTML = '<div id="pk-daftar"></div><div id="pk-detail" hidden></div>';
      el.addEventListener('click', (e) => aksiPaket(el, e));
    },
    async tampil(el, param) {
      if (param) { $('#pk-daftar', el).hidden = true; $('#pk-detail', el).hidden = false; return detailPaket(el, param); }
      $('#pk-daftar', el).hidden = false; $('#pk-detail', el).hidden = true;
      return swr('paket', 'paket.daftar', {}, (d) => { el.paket = d; daftarPaket(el); }, { fresh: 15000 });
    }
  });
  function jadwal(p) { return p.buka ? fmt.tgl(p.buka) + (p.tutup ? ' – ' + fmt.tgl(p.tutup) : '') : 'Kapan saja saat aktif'; }
  function daftarPaket(el) {
    const d = el.paket || [], sa = Admin.sa();
    $('#pk-daftar', el).innerHTML = Admin.kepala('Paket ujian & try out', 'Susun soal, atur jadwal dan token, lalu aktifkan untuk siswa.', sa ? '<button class="btn utama" data-pk="baru">' + ik('tambah') + 'Buat paket</button>' : '') +
      (d.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode &amp; nama</th><th>Mapel / kelas</th><th>Komposisi</th><th>Durasi &amp; jadwal</th>' + (sa ? '<th>Token</th>' : '') + '<th>Peserta</th><th>Status</th></tr></thead><tbody>' +
        d.map((p) => '<tr class="klik" data-buka="' + esc(p.id) + '"><td><span class="chip-id">' + esc(p.id) + '</span><div><b>' + esc(p.nama) + '</b></div></td><td>' + esc(p.mapel) + '<div class="kecil muted">' + esc(p.kelas.join(', ') || 'Semua kelas') + '</div></td>' +
          '<td><b>' + p.jumlah + '</b> butir<div class="kecil muted">' + Object.keys(p.bentuk).map((b) => esc((BENTUK_LABEL[b] || b).replace('Pilihan ganda kompleks', 'PGK').replace('Pilihan ganda', 'PG')) + ' ' + p.bentuk[b]).join(' · ') + '</div></td>' +
          '<td>' + p.durasi + ' menit<div class="kecil muted">' + jadwal(p) + '</div></td>' + (sa ? '<td class="mono"><b>' + esc(p.tokenInfo ? p.tokenInfo.token : '') + '</b>' + (p.rotasi ? '<div class="kecil muted">rotasi ' + p.rotasi + ' mnt</div>' : '') + '</td>' : '') +
          '<td class="kecil">' + p.sesi.selesai + ' selesai<br>' + p.sesi.mulai + ' berjalan</td><td>' + Admin.status(p.status) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="kartu kosong"><strong>Belum ada paket</strong>' + (sa ? 'Buat paket pertama, lalu masukkan soal yang sudah disetujui.' : 'Super Admin belum membuat paket.') + '</div>');
  }
  function formPaket(p, simpan) {
    p = p || { durasi: 90, acakSoal: true, acakOpsi: true, pembahasan: 'tutup', status: 'draft', kelas: [], rotasi: 15 };
    modal({ judul: p.id ? 'Ubah paket ' + p.id : 'Buat paket TO', ukuran: 'lg', isi: '<div class="baris dua">' + field('Nama paket', '<input class="inp" id="pf-nama" value="' + esc(p.nama || '') + '" placeholder="TO-01 Numerasi Kelas IX">') +
      field('Mapel', '<select class="inp" id="pf-mapel">' + opsi(Admin.b().mapel, p.mapel) + '</select>') + field('Durasi (menit)', '<input class="inp" type="number" min="5" max="600" id="pf-durasi" value="' + (p.durasi || 90) + '">') +
      field('Rotasi token (menit, 0 = tetap)', '<input class="inp" type="number" min="0" max="120" id="pf-rotasi" value="' + (p.rotasi == null ? 15 : p.rotasi) + '">') +
      field('Dibuka', '<input class="inp" type="datetime-local" id="pf-buka" value="' + fmt.inputTgl(p.buka) + '">', 'Kosongkan = dibuka saat status Aktif.') + field('Ditutup', '<input class="inp" type="datetime-local" id="pf-tutup" value="' + fmt.inputTgl(p.tutup) + '">') + '</div>' +
      '<div class="lbl" style="margin-bottom:6px">Kelas peserta</div><div class="baris" style="margin-bottom:14px">' + (Admin.b().kelas.length ? Admin.b().kelas.map((k) => '<label class="cek"><input type="checkbox" class="pf-kelas" value="' + esc(k) + '"' + (p.kelas.indexOf(k) >= 0 ? ' checked' : '') + '>' + esc(k) + '</label>').join('') : '<span class="kecil muted">Belum ada data siswa. Tanpa centang = semua kelas.</span>') + '</div>' +
      '<div class="baris dua"><label class="cek"><input type="checkbox" id="pf-acaks"' + (p.acakSoal ? ' checked' : '') + '>Acak urutan soal per siswa (stimulus kelompok tetap bersama)</label><label class="cek"><input type="checkbox" id="pf-acako"' + (p.acakOpsi ? ' checked' : '') + '>Acak urutan pilihan jawaban</label></div>' +
      '<div class="baris dua" style="margin-top:14px">' + field('Pembahasan untuk siswa', '<select class="inp" id="pf-bahas">' + opsi([{ v: 'tutup', l: 'Tertutup' }, { v: 'buka', l: 'Dibuka setelah siswa selesai' }], p.pembahasan) + '</select>') +
      field('Status', '<select class="inp" id="pf-status">' + opsi([{ v: 'draft', l: 'Draft' }, { v: 'aktif', l: 'Aktif (bisa dikerjakan)' }, { v: 'ditutup', l: 'Ditutup' }], p.status) + '</select>') + '</div>' +
      field('Keterangan untuk siswa', '<input class="inp" id="pf-desk" value="' + esc(p.deskripsi || '') + '">'),
      tombol: [{ label: 'Batal' }, { label: 'Simpan paket', kelas: 'utama', aksi: async (m) => {
        const r = await api('paket.simpan', { id: p.id, nama: $('#pf-nama', m).value, mapel: $('#pf-mapel', m).value, durasi_menit: $('#pf-durasi', m).value, rotasi_token: $('#pf-rotasi', m).value,
          waktu_buka: $('#pf-buka', m).value, waktu_tutup: $('#pf-tutup', m).value, kelas: $$('.pf-kelas:checked', m).map((x) => x.value), acak_soal: $('#pf-acaks', m).checked, acak_opsi: $('#pf-acako', m).checked,
          mode_pembahasan: $('#pf-bahas', m).value, status: $('#pf-status', m).value, deskripsi: $('#pf-desk', m).value });
        toast(r.message, r.success ? 'ok' : 'err', 7000);
        if (!r.success) return false;
        basi('paket', 'dash');
        simpan(r.data.id);
      } }] });
  }
  async function aksiPaket(el, e) {
    const tr = e.target.closest('[data-buka]');
    if (tr) return go('#/admin/paket/' + tr.dataset.buka);
    const b = e.target.closest('[data-pk]');
    if (!b) return;
    const a = b.dataset.pk, D = el.det;
    if (a === 'baru') formPaket(null, (id) => go('#/admin/paket/' + id));
    if (a === 'kembali') go('#/admin/paket');
    if (a === 'ubah') formPaket(D.meta, () => detailPaket(el, D.meta.id));
    if (a === 'token') { const r = await api('paket.token', { id: D.meta.id, aksi: 'baru' }); if (r.success) { D.meta.tokenInfo = r.data; kartuToken(el); toast('Token baru: ' + r.data.token, 'ok'); basi('paket'); } else toast(r.message, 'err'); }
    if (a === 'naik' || a === 'turun') { const i = +b.dataset.i, j = i + (a === 'naik' ? -1 : 1); if (D.items[j]) { const t = D.items[i]; D.items[i] = D.items[j]; D.items[j] = t; D.ubah = true; renderSusunan(el); } }
    if (a === 'buang') { D.items.splice(+b.dataset.i, 1); D.ubah = true; renderSusunan(el); }
    if (a === 'tambah') pemilihSoal(el);
    if (a === 'otomatis') susunOtomatis(el);
    if (a === 'simpanSusun') {
      $$('[data-bobot]', el).forEach((x) => { D.items[+x.dataset.bobot].bobot = Number(x.value) || 1; });
      sibuk(b, true);
      const r = await api('paket.soal', { id: D.meta.id, items: D.items.map((x) => ({ id_soal: x.id, bobot: x.bobot })) });
      sibuk(b, false);
      toast(r.message, r.success ? 'ok' : 'err', 8000);
      if (r.success) { basi('paket'); detailPaket(el, D.meta.id); }
    }
    if (a === 'pratinjau') {
      sibuk(b, true);
      const r = await api('paket.pratinjau', { id: D.meta.id });
      sibuk(b, false);
      if (!r.success) return toast(r.message, 'err');
      if (!r.data.soal.length) return toast('Paket belum berisi soal tersimpan.', 'warn');
      CBT.pratinjau(r.data, '#/admin/paket/' + D.meta.id);
    }
    if (a === 'hapus' && await konfirmasi('Hapus paket ' + D.meta.id + '?', { bahaya: true, ya: 'Hapus' })) { const r = await api('paket.hapus', { id: D.meta.id }); toast(r.message, r.success ? 'ok' : 'err', 7000); if (r.success) { basi('paket'); go('#/admin/paket'); } }
  }
  async function detailPaket(el, id) {
    const box = $('#pk-detail', el);
    box.innerHTML = '<div class="memuat">Memuat paket…</div>';
    const [r] = await Promise.all([api('paket.detail', { id }), Admin.soal(false)]);
    if (!r.success) { box.innerHTML = '<div class="kartu kosong">' + esc(r.message) + '</div>'; return; }
    const D = el.det = r.data, m = D.meta, sa = Admin.sa(), terkunci = D.meta.sesi > 0;
    box.innerHTML = '<div class="kepala-hal"><div><button class="btn kecil hantu" data-pk="kembali">' + ik('kiri') + 'Semua paket</button><h1 style="margin-top:6px">' + esc(m.nama) + '</h1>' +
      '<p><span class="chip-id">' + esc(m.id) + '</span> · ' + esc(m.mapel) + ' · ' + m.durasi + ' menit · ' + esc(m.kelas.join(', ') || 'semua kelas') + ' · ' + jadwal(m) + '</p></div>' +
      '<div class="aksi">' + Admin.status(m.status) + '<button class="btn" data-pk="pratinjau">' + ik('mata') + 'Pratinjau tampilan siswa</button>' + (sa ? '<button class="btn" data-pk="ubah">' + ik('pensil') + 'Ubah</button>' + (terkunci ? '' : '<button class="btn bahaya" data-pk="hapus">' + ik('hapus') + '</button>') : '') + '</div></div>' +
      '<div class="kisi k84"><section class="kartu"><div class="kartu-kepala"><div><h2>Susunan soal</h2><p id="pk-ringkas"></p></div>' +
      (sa && !terkunci ? '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn kecil" data-pk="otomatis">' + ik('bahas') + 'Susun otomatis (kisi-kisi)</button><button class="btn kecil" data-pk="tambah">' + ik('tambah') + 'Tambah dari bank</button></div>' : '') + '</div>' +
      (terkunci ? '<div class="alert info">' + ik('gembok') + '<div>Susunan terkunci karena paket sudah dikerjakan ' + D.meta.sesi + ' siswa.</div></div>' : '') +
      '<div id="pk-susun"></div>' + (sa && !terkunci ? '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn utama" data-pk="simpanSusun">' + ik('cek') + 'Simpan susunan</button></div>' : '') + '</section>' +
      '<aside><section class="kartu" id="pk-token"></section><section class="kartu" style="margin-top:16px"><h3 style="margin:0 0 10px;font-size:16px">Pengaturan</h3><dl class="kecil" style="display:grid;grid-template-columns:1fr auto;gap:6px 10px;margin:0">' +
      '<dt class="muted">Acak soal</dt><dd style="margin:0">' + (m.acakSoal ? 'Ya' : 'Tidak') + '</dd><dt class="muted">Acak opsi</dt><dd style="margin:0">' + (m.acakOpsi ? 'Ya' : 'Tidak') + '</dd><dt class="muted">Pembahasan siswa</dt><dd style="margin:0">' + (m.pembahasan === 'buka' ? 'Dibuka' : 'Tertutup') + '</dd>' +
      '<dt class="muted">Sesi tercatat</dt><dd style="margin:0">' + D.meta.sesi + '</dd></dl>' + (m.status === 'aktif' ? '<a class="btn lebar" style="margin-top:14px" href="#/admin/monitoring/' + esc(m.id) + '">' + ik('monitor') + 'Buka monitoring</a>' : '') + '</section></aside></div>';
    D.items = D.items.map((x) => Object.assign({}, x));
    renderSusunan(el);
    kartuToken(el);
  }
  function kartuToken(el) {
    const D = el.det, box = $('#pk-token', el), t = D.meta.tokenInfo;
    if (!t) { box.innerHTML = '<h3 style="margin:0;font-size:16px">Token ujian</h3><p class="kecil muted">Token hanya ditampilkan untuk Super Admin.</p>'; return; }
    box.innerHTML = '<h3 style="margin:0 0 8px;font-size:16px">Token ujian</h3><div class="mono" style="font-size:34px;font-weight:700;letter-spacing:.2em;color:var(--navy)">' + esc(t.token) + '</div>' +
      '<p class="kecil muted" id="tk-sisa">' + (t.rotasi ? 'Berganti otomatis tiap ' + t.rotasi + ' menit' : 'Token tetap') + '</p><button class="btn kecil" data-pk="token">' + ik('segar') + 'Buat token baru</button>';
    clearInterval(el.tkTik);
    if (t.rotasi) {
      const akhir = Date.now() + t.sisa * 1000;
      el.tkTik = setInterval(async () => {
        const s = Math.round((akhir - Date.now()) / 1000), p = $('#tk-sisa', el);
        if (!p || !el.classList.contains('tampil')) return clearInterval(el.tkTik);
        if (s <= 0) { clearInterval(el.tkTik); const r = await api('paket.detail', { id: D.meta.id }); if (r.success) { D.meta.tokenInfo = r.data.meta.tokenInfo; kartuToken(el); } return; }
        p.textContent = 'Berganti dalam ' + fmt.jam(s) + ' (token lama masih diterima 1 periode)';
      }, 1000);
    }
  }
  function renderSusunan(el) {
    const D = el.det, sa = Admin.sa() && !(D.meta.sesi > 0);
    const peta = {};
    (App.data.soal || []).forEach((s) => { peta[s.id] = s; });
    const bentuk = {};
    D.items.forEach((x) => { const s = peta[x.id] || x; bentuk[s.bentuk] = (bentuk[s.bentuk] || 0) + 1; });
    $('#pk-ringkas', el).textContent = D.items.length + ' butir · ' + Object.keys(bentuk).map((b) => (BENTUK_LABEL[b] || b) + ' ' + bentuk[b]).join(', ') + (D.ubah ? ' · belum disimpan' : '');
    $('#pk-susun', el).innerHTML = D.items.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Soal</th><th>Bentuk</th><th>Kompetensi</th><th class="angka">Bobot</th>' + (sa ? '<th></th>' : '') + '</tr></thead><tbody>' +
      D.items.map((x, i) => { const s = peta[x.id] || x;
        return '<tr><td class="mono">' + (i + 1) + '</td><td><span class="chip-id">' + esc(x.id) + '</span>' + (s.stim ? ' <span class="lencana polos">' + esc(s.stim) + '</span>' : '') + (s.status && s.status !== 'disetujui' ? ' ' + Admin.status(s.status) : '') + (x.hilang ? ' ' + lencana('Soal terhapus', 'bad') : '') +
          '<div class="ringkas kecil">' + esc(s.ring || '') + '</div></td><td>' + Admin.bentuk(s.bentuk) + '</td><td class="kecil">' + esc(Admin.namaKomp(s.idk)) + '</td>' +
          '<td class="angka">' + (sa ? '<input class="inp" type="number" min="0.5" max="10" step="0.5" data-bobot="' + i + '" value="' + (x.bobot || 1) + '" style="width:76px;min-height:32px;padding:4px 8px">' : (x.bobot || 1)) + '</td>' +
          (sa ? '<td style="white-space:nowrap"><button class="btn kecil ikon hantu" data-pk="naik" data-i="' + i + '" aria-label="Naik">↑</button><button class="btn kecil ikon hantu" data-pk="turun" data-i="' + i + '" aria-label="Turun">↓</button><button class="btn kecil ikon hantu" data-pk="buang" data-i="' + i + '" aria-label="Buang">' + ik('x') + '</button></td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="kosong"><strong>Paket masih kosong</strong>Tambahkan soal disetujui dari bank, atau susun otomatis berdasarkan kisi-kisi.</div>';
  }
  function pemilihSoal(el) {
    const D = el.det, ada = new Set(D.items.map((x) => x.id));
    const kandidat = (App.data.soal || []).filter((s) => s.status === 'disetujui' && s.mapel === D.meta.mapel && !ada.has(s.id));
    const m = modal({ judul: 'Tambah soal dari bank — ' + D.meta.mapel, ukuran: 'xl', isi: '<div class="saring"><input class="inp cari" id="ps-cari" placeholder="Cari…"><select class="inp" id="ps-komp">' + opsi(Admin.kompMapel(D.meta.mapel).map((k) => ({ v: k.id, l: k.nama })), '', 'Semua kompetensi') + '</select>' +
      '<select class="inp" id="ps-bentuk">' + opsi(Object.keys(BENTUK_LABEL).map((k) => ({ v: k, l: BENTUK_LABEL[k] })), '', 'Semua bentuk') + '</select><select class="inp" id="ps-kes">' + opsi(['mudah', 'sedang', 'sulit'], '', 'Semua kesulitan') + '</select></div>' +
      '<p class="kecil muted">Soal dengan stimulus kelompok ditambahkan bersama soal saudaranya.</p><div class="tbl-wrap" style="max-height:52vh"><table class="tbl"><thead><tr><th></th><th>Soal</th><th>Bentuk</th><th>Kompetensi</th><th>Kesulitan</th></tr></thead><tbody id="ps-isi"></tbody></table></div>',
      tombol: [{ label: 'Batal' }, { label: 'Tambahkan terpilih', kelas: 'utama', aksi: (mm) => {
        const pilih = new Set($$('[data-ps]:checked', mm).map((x) => x.dataset.ps));
        Array.from(pilih).forEach((id) => { const s = kandidat.find((x) => x.id === id); if (s && s.stim) kandidat.filter((x) => x.stim === s.stim).forEach((x) => pilih.add(x.id)); });
        pilih.forEach((id) => { if (!ada.has(id)) D.items.push({ id, bobot: 1 }); });
        D.ubah = true; renderSusunan(el);
        toast(pilih.size + ' soal ditambahkan. Tekan Simpan susunan.', 'ok');
      } }] });
    const isi = () => {
      const q = $('#ps-cari', m.el).value.toLowerCase(), k = $('#ps-komp', m.el).value, b = $('#ps-bentuk', m.el).value, ks = $('#ps-kes', m.el).value;
      $('#ps-isi', m.el).innerHTML = kandidat.filter((s) => (!q || (s.id + s.ring).toLowerCase().indexOf(q) >= 0) && (!k || s.idk === k) && (!b || s.bentuk === b) && (!ks || s.kes === ks)).slice(0, 300)
        .map((s) => '<tr><td><input type="checkbox" data-ps="' + esc(s.id) + '"></td><td><span class="chip-id">' + esc(s.id) + '</span>' + (s.stim ? ' <span class="lencana polos">' + esc(s.stim) + '</span>' : '') + '<div class="ringkas kecil">' + esc(s.ring) + '</div></td><td>' + Admin.bentuk(s.bentuk) + '</td><td class="kecil">' + esc(Admin.namaKomp(s.idk)) + '</td><td>' + esc(s.kes) + '</td></tr>').join('') ||
        '<tr><td colspan="5" class="kosong">Tidak ada soal disetujui yang cocok.</td></tr>';
    };
    isi();
    m.el.addEventListener('input', debounce(isi, 200));
  }
  function susunOtomatis(el) {
    const D = el.det, komp = Admin.kompMapel(D.meta.mapel);
    const baris = (i) => '<div class="baris" style="grid-template-columns:2fr 1.2fr 1fr 90px 36px;align-items:end" data-kisi>' + field(i ? '' : 'Kompetensi', '<select class="inp" data-k="idk">' + opsi(komp.map((k) => ({ v: k.id, l: k.nama })), '', 'Semua') + '</select>') +
      field(i ? '' : 'Bentuk', '<select class="inp" data-k="bentuk">' + opsi(Object.keys(BENTUK_LABEL).map((k) => ({ v: k, l: BENTUK_LABEL[k] })), '', 'Semua') + '</select>') + field(i ? '' : 'Kesulitan', '<select class="inp" data-k="kes">' + opsi(['mudah', 'sedang', 'sulit'], '', 'Semua') + '</select>') +
      field(i ? '' : 'Jumlah', '<input class="inp" type="number" min="1" value="5" data-k="jumlah">') + '<button class="btn kecil ikon hantu" data-hapus-kisi style="margin-bottom:14px">' + ik('x') + '</button></div>';
    const m = modal({ judul: 'Susun otomatis dari kisi-kisi', ukuran: 'lg', isi: '<p class="kecil muted" style="margin-top:0">Soal diambil acak dari bank (status disetujui) sesuai baris kisi-kisi. Soal stimulus kelompok diambil bersama saudaranya.</p><div id="ks">' + baris(0) + '</div>' +
      '<button class="btn kecil" id="ks-tambah">' + ik('tambah') + 'Baris kisi-kisi</button><label class="cek" style="margin-top:12px"><input type="checkbox" id="ks-ganti">Ganti susunan saat ini (bila tidak dicentang, soal ditambahkan)</label>',
      tombol: [{ label: 'Batal' }, { label: 'Ambil soal', kelas: 'utama', aksi: async (mm) => {
        const kisi = $$('[data-kisi]', mm).map((r) => { const o = {}; $$('[data-k]', r).forEach((x) => { o[x.dataset.k] = x.value; }); return o; });
        const ganti = $('#ks-ganti', mm).checked;
        const r = await api('paket.otomatis', { mapel: D.meta.mapel, kisi, kecuali: ganti ? [] : D.items.map((x) => x.id) });
        if (!r.success) { toast(r.message, 'err'); return false; }
        D.items = (ganti ? [] : D.items).concat(r.data.items.map((x) => ({ id: x.id, bobot: 1 })));
        D.ubah = true; renderSusunan(el);
        toast(r.message + (r.data.kekurangan.length ? ' Stok kurang di ' + r.data.kekurangan.length + ' baris kisi-kisi.' : '') + ' Tekan Simpan susunan.', r.data.kekurangan.length ? 'warn' : 'ok', 8000);
      } }] });
    $('#ks-tambah', m.el).onclick = () => $('#ks', m.el).insertAdjacentHTML('beforeend', baris(1));
    m.el.addEventListener('click', (e) => { const x = e.target.closest('[data-hapus-kisi]'); if (x && $$('[data-kisi]', m.el).length > 1) x.closest('[data-kisi]').remove(); });
  }

  // ============================================================ MONITORING
  Admin.daftar('monitoring', {
    judul: 'Monitoring TO', ikon: 'monitor', grup: 'Pelaksanaan & evaluasi', peran: SEMUA,
    render(el) {
      el.innerHTML = Admin.kepala('Monitoring try out', 'Pantau progres, sisa waktu, dan integritas peserta. Diperbarui otomatis setiap 15 detik selama halaman ini terbuka.', '<select class="inp" id="mo-paket" style="min-width:260px"></select><button class="btn" data-mo="segar">' + ik('segar') + '</button>') +
        '<div id="mo-isi"><div class="memuat">Memuat paket…</div></div>';
      el.filter = 'semua'; el.pilih = new Set();
      $('#mo-paket', el).onchange = () => { el.pilih.clear(); muatMonitor(el, true); };
      el.addEventListener('click', (e) => aksiMonitor(el, e));
      el.addEventListener('change', (e) => {
        if (e.target.dataset.msid) { e.target.checked ? el.pilih.add(e.target.dataset.msid) : el.pilih.delete(e.target.dataset.msid); barMonitor(el); }
        if (e.target.id === 'mo-semua') { $$('[data-msid]', el).forEach((c) => { c.checked = e.target.checked; c.checked ? el.pilih.add(c.dataset.msid) : el.pilih.delete(c.dataset.msid); }); barMonitor(el); }
        if (e.target.id === 'mo-kelas') tabelMonitor(el);
      });
      el.addEventListener('input', debounce((e) => { if (e.target.id === 'mo-cari') tabelMonitor(el); }, 250));
      // polling adaptif: 15 dtk saat aktif, 60 dtk saat diam, berhenti saat tab tak terlihat
      setInterval(() => { if (el.classList.contains('tampil') && el.paketId && !el.sibuk && Activity.due('monitor', 15000, 60000)) muatMonitor(el, false); }, 3000);
      setInterval(() => { if (el.classList.contains('tampil')) detikMonitor(el); }, 1000);
    },
    async tampil(el, param) {
      const r = await api('paket.daftar', {});
      if (!r.success) return;
      const list = r.data.filter((p) => p.status !== 'draft').sort((a, b) => (a.status === 'aktif' ? -1 : 1) - (b.status === 'aktif' ? -1 : 1));
      const sel = $('#mo-paket', el);
      sel.innerHTML = list.length ? opsi(list.map((p) => ({ v: p.id, l: p.id + ' — ' + p.nama + (p.status === 'aktif' ? ' (aktif)' : '') })), param || el.paketId) : '<option value="">Belum ada paket aktif</option>';
      if (!list.length) { $('#mo-isi', el).innerHTML = '<div class="kartu kosong"><strong>Belum ada paket yang aktif</strong>Aktifkan paket di menu Paket TO.</div>'; return; }
      if (param) sel.value = param;
      return muatMonitor(el, true);
    }
  });
  async function muatMonitor(el, paksa) {
    const id = $('#mo-paket', el).value;
    if (!id) return;
    el.paketId = id; el.sibuk = true;
    const r = await api('monitor.data', { idPaket: id, _fresh: paksa });
    el.sibuk = false;
    if (!r.success) { if (paksa) $('#mo-isi', el).innerHTML = '<div class="kartu kosong">' + esc(r.message) + '</div>'; return; }
    el.data = r.data; el.dataAt = performance.now();
    renderMonitor(el);
  }
  function renderMonitor(el) {
    const d = el.data, s = d.stat, sa = Admin.sa();
    const kelas = Array.from(new Set(d.rows.map((r) => r.kelas))).sort();
    if (!$('#mo-tabel', el)) {
      $('#mo-isi', el).innerHTML = '<div class="kisi k4" id="mo-stat"></div><div class="kisi k84" style="margin-top:16px"><div><div class="saring" style="margin-bottom:10px"><input class="inp cari" id="mo-cari" placeholder="Cari NIS atau nama…"><select class="inp" id="mo-kelas"></select></div>' +
        '<div class="tab" id="mo-chip" style="margin-bottom:10px"></div>' + (sa ? '<div class="aksi-massal" id="mo-massal" hidden><strong id="mo-n"></strong><button class="btn kecil" data-mo="tambah">' + ik('jam') + 'Tambah waktu</button><button class="btn kecil" data-mo="reset">' + ik('segar') + 'Reset sesi (izinkan masuk lagi)</button><button class="btn kecil bahaya" data-mo="paksa">Kumpulkan paksa</button></div>' : '') +
        '<div class="tbl-wrap"><table class="tbl" id="mo-tabel"><thead><tr>' + (sa ? '<th class="cek-sel"><input type="checkbox" id="mo-semua"></th>' : '') + '<th>Peserta</th><th>Status</th><th>Progres</th><th class="angka">Sisa waktu</th><th class="angka">Pindah tab</th><th>Sinkron</th><th class="angka">Nilai</th></tr></thead><tbody id="mo-rows"></tbody></table></div></div>' +
        '<aside><section class="kartu" id="mo-token"></section><section class="kartu" style="margin-top:16px" id="mo-sebaran"></section></aside></div>';
    }
    $('#mo-kelas', el).innerHTML = opsi(kelas, $('#mo-kelas', el).value, 'Semua kelas');
    $('#mo-stat', el).innerHTML = '<div class="kartu stat"><div class="lab">Peserta terdaftar</div><div class="ang">' + s.total + '<small>' + s.belum + ' belum mulai</small></div></div>' +
      '<div class="kartu stat"><div class="lab">Sedang mengerjakan</div><div class="ang" style="color:var(--info)">' + s.mengerjakan + '<small>' + (s.terputus ? s.terputus + ' terputus' : 'semua tersinkron') + '</small></div>' + bar(s.total ? s.mengerjakan / s.total * 100 : 0, 'info') + '</div>' +
      '<div class="kartu stat"><div class="lab">Selesai</div><div class="ang" style="color:var(--ok)">' + s.selesai + '</div>' + bar(s.total ? s.selesai / s.total * 100 : 0, 'ok') + '</div>' +
      '<div class="kartu stat ' + (s.anomali ? 'awas' : '') + '"><div class="lab">Pindah tab &gt; ' + d.batasTab + '×</div><div class="ang" style="color:' + (s.anomali ? 'var(--bad)' : 'inherit') + '">' + s.anomali + '<small>siswa</small></div></div>';
    const chip = [['semua', 'Semua', s.total], ['mengerjakan', 'Mengerjakan', s.mengerjakan], ['terputus', 'Terputus', s.terputus], ['selesai', 'Selesai', s.selesai], ['belum', 'Belum mulai', s.belum], ['anomali', 'Perlu perhatian', s.anomali]];
    $('#mo-chip', el).innerHTML = chip.map((c) => '<button data-mf="' + c[0] + '" class="' + (el.filter === c[0] ? 'aktif' : '') + '">' + c[1] + '<span class="hit">' + c[2] + '</span></button>').join('');
    const t = d.token;
    $('#mo-token', el).innerHTML = '<h3 style="margin:0 0 6px;font-size:16px">' + esc(d.meta.nama) + '</h3><p class="kecil muted" style="margin:0 0 10px">' + d.meta.durasi + ' menit · ' + esc(d.meta.kelas.join(', ') || 'semua kelas') + '</p>' +
      (t ? '<div class="kecil muted">Token aktif</div><div class="mono" style="font-size:30px;font-weight:700;letter-spacing:.2em;color:var(--navy)">' + esc(t.token) + '</div><p class="kecil muted" id="mo-tk">' + (t.rotasi ? 'Berganti dalam ' + fmt.jam(t.sisa) : 'Token tetap') + '</p>' : '') +
      '<p class="kecil muted" style="margin-bottom:0">Data ' + fmt.lalu(d.dibuat) + ' · server ' + (d.ms || '') + '</p>';
    const pr = d.rows.filter((r) => r.status === 'mengerjakan' || r.status === 'terputus' || r.status === 'selesai');
    const kel = [0, 0, 0, 0, 0];
    pr.forEach((r) => { const p = r.total ? r.dijawab / r.total : 0; kel[Math.min(4, Math.floor(p * 5))]++; });
    const mx = Math.max(1, ...kel);
    $('#mo-sebaran', el).innerHTML = '<h3 style="margin:0 0 12px;font-size:16px">Sebaran progres</h3><div style="display:flex;gap:8px;align-items:flex-end;height:120px">' +
      kel.map((n, i) => '<div style="flex:1;text-align:center"><div class="kecil mono">' + n + '</div><div style="height:' + (n / mx * 90 + 4) + 'px;background:' + (i === 4 ? 'var(--ok)' : 'var(--info)') + ';border-radius:6px 6px 0 0;opacity:' + (0.5 + i * 0.12) + '"></div></div>').join('') +
      '</div><div style="display:flex;gap:8px" class="kecil muted">' + ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'].map((l) => '<span style="flex:1;text-align:center">' + l + '</span>').join('') + '</div>';
    tabelMonitor(el);
  }
  function tabelMonitor(el) {
    const d = el.data;
    if (!d) return;
    const q = ($('#mo-cari', el).value || '').toLowerCase(), k = $('#mo-kelas', el).value, sa = Admin.sa();
    const list = d.rows.filter((r) => (el.filter === 'semua' || (el.filter === 'anomali' ? r.pt > d.batasTab : r.status === el.filter)) && (!k || r.kelas === k) && (!q || (r.nis + ' ' + r.nama).toLowerCase().indexOf(q) >= 0))
      .sort((a, b) => (b.pt > d.batasTab) - (a.pt > d.batasTab) || ({ terputus: 0, mengerjakan: 1, belum: 2, selesai: 3 }[a.status] - { terputus: 0, mengerjakan: 1, belum: 2, selesai: 3 }[b.status]) || a.nama.localeCompare(b.nama));
    const st = { mengerjakan: ['Mengerjakan', 'info'], terputus: ['Terputus', 'warn'], selesai: ['Selesai', 'ok'], belum: ['Belum mulai', 'polos'] };
    $('#mo-rows', el).innerHTML = list.map((r) => '<tr' + (r.pt > d.batasTab ? ' style="background:var(--bad-bg)"' : '') + '>' + (sa ? '<td>' + (r.sid && r.status !== 'selesai' ? '<input type="checkbox" data-msid="' + esc(r.sid) + '"' + (el.pilih.has(r.sid) ? ' checked' : '') + '>' : '') + '</td>' : '') +
      '<td><b>' + esc(r.nama) + '</b><div class="kecil muted"><span class="mono">' + esc(r.nis) + '</span> · ' + esc(r.kelas) + (r.tambah ? ' · +' + r.tambah + ' mnt' : '') + '</div></td><td>' + lencana(st[r.status][0], st[r.status][1]) + (r.alasan && r.alasan !== 'dikumpulkan siswa' ? '<div class="kecil muted">' + esc(r.alasan) + '</div>' : '') + '</td>' +
      '<td style="min-width:150px"><div class="kecil"><b>' + r.dijawab + '</b> / ' + r.total + (r.ragu ? ' · ' + r.ragu + ' ragu' : '') + '</div>' + bar(r.total ? r.dijawab / r.total * 100 : 0, r.status === 'selesai' ? 'ok' : 'info') + '</td>' +
      '<td class="angka mono" data-sisa="' + (r.status === 'mengerjakan' || r.status === 'terputus' ? r.sisa : '') + '">' + (r.sisa == null ? '—' : r.status === 'selesai' ? '00:00' : fmt.jam(r.sisa)) + '</td>' +
      '<td class="angka">' + (r.pt > d.batasTab ? lencana(r.pt + '×', 'bad') : r.pt ? lencana(r.pt + '×', 'warn') : '<span class="muted">0</span>') + '</td><td class="kecil">' + (r.sync ? fmt.lalu(r.sync) : '—') + '</td>' +
      '<td class="angka"><b>' + (r.nilai == null ? '—' : fmt.angka(r.nilai)) + '</b></td></tr>').join('') || '<tr><td colspan="8" class="kosong">Tidak ada peserta pada filter ini.</td></tr>';
  }
  function detikMonitor(el) {
    if (!el.data) return;
    const lewat = (performance.now() - el.dataAt) / 1000;
    $$('[data-sisa]', el).forEach((td) => { if (td.dataset.sisa !== '') td.textContent = fmt.jam(Math.max(0, +td.dataset.sisa - lewat)); });
    const t = el.data.token, p = $('#mo-tk', el);
    if (t && t.rotasi && p) { const s = Math.round(t.sisa - lewat); p.textContent = s > 0 ? 'Berganti dalam ' + fmt.jam(s) : 'Memperbarui token…'; if (s === -2) muatMonitor(el, true); }
  }
  function barMonitor(el) { const m = $('#mo-massal', el); if (m) { m.hidden = !el.pilih.size; $('#mo-n', el).textContent = el.pilih.size + ' sesi dipilih'; } }
  async function aksiMonitor(el, e) {
    const f = e.target.closest('[data-mf]');
    if (f) { el.filter = f.dataset.mf; $$('[data-mf]', el).forEach((x) => x.classList.toggle('aktif', x === f)); return tabelMonitor(el); }
    const b = e.target.closest('[data-mo]');
    if (!b) return;
    if (b.dataset.mo === 'segar') return muatMonitor(el, true);
    const sids = Array.from(el.pilih);
    let menit = 0;
    if (b.dataset.mo === 'tambah') { const v = await tanya('Tambah waktu', 'Tambahan (menit)', '10', 'number'); if (!v) return; menit = +v; }
    if (b.dataset.mo === 'paksa' && !(await konfirmasi('Kumpulkan paksa ' + sids.length + ' sesi? Jawaban terakhir yang tersimpan akan dinilai.', { bahaya: true, ya: 'Kumpulkan' }))) return;
    if (b.dataset.mo === 'reset' && !(await konfirmasi('Izinkan ' + sids.length + ' siswa masuk lagi dari perangkat lain? Mereka perlu memasukkan token terbaru. Jawaban & sisa waktu tetap.', { ya: 'Reset sesi' }))) return;
    sibuk(b, true);
    const r = await api('monitor.aksi', { aksi: b.dataset.mo, sids, menit });
    sibuk(b, false);
    toast(r.message, r.success ? 'ok' : 'err');
    el.pilih.clear(); barMonitor(el);
    muatMonitor(el, true);
  }

  // ============================================================ HASIL & ANALISIS
  Admin.daftar('hasil', {
    judul: 'Hasil & Analisis', ikon: 'hasil', grup: 'Pelaksanaan & evaluasi', peran: SEMUA,
    render(el) {
      el.innerHTML = Admin.kepala('Hasil & analisis', 'Rekap nilai, penguasaan kompetensi per siswa dan kelas, serta kualitas butir soal.', '<select class="inp" id="h-paket" style="min-width:260px"></select>') +
        '<div class="tab" id="h-tab"><button data-ht="rekap" class="aktif">Rekap</button><button data-ht="siswa">Per siswa</button><button data-ht="kelas">Per kelas</button><button data-ht="butir">Butir soal</button></div><div id="h-isi"></div>';
      el.tab = 'rekap';
      $('#h-paket', el).onchange = () => { el.rekap = null; el.siswa = null; muatHasil(el); };
      el.addEventListener('click', (e) => aksiHasil(el, e));
      el.addEventListener('change', (e) => { if (e.target.id === 'h-kelas') renderHasil(el); if (e.target.id === 'h-pilihsiswa') { el.sid = e.target.value; renderHasil(el); } });
    },
    async tampil(el) {
      const r = await api('paket.daftar', {});
      if (!r.success) return;
      const list = r.data.filter((p) => p.sesi.selesai || p.sesi.mulai);
      $('#h-paket', el).innerHTML = list.length ? opsi(list.map((p) => ({ v: p.id, l: p.id + ' — ' + p.nama })), $('#h-paket', el).value) : '<option value="">Belum ada hasil</option>';
      if (!list.length) { $('#h-isi', el).innerHTML = '<div class="kartu kosong"><strong>Belum ada hasil try out</strong>Hasil muncul setelah siswa menyelesaikan paket.</div>'; return; }
      return muatHasil(el);
    }
  });
  async function muatHasil(el, paksa) {
    const id = $('#h-paket', el).value;
    if (!id) return;
    $('#h-isi', el).innerHTML = '<div class="memuat">Memuat hasil…</div>';
    await swr('hr_' + id, 'hasil.rekap', { idPaket: id }, (d) => { el.rekap = d; renderHasil(el); }, { fresh: paksa ? 0 : 20000, langsung: true });
  }
  function warnaP(p, amb) { return p >= amb ? 'h-ok' : p >= amb - 25 ? 'h-warn' : 'h-bad'; }
  function renderHasil(el) {
    const d = el.rekap, box = $('#h-isi', el);
    if (!d) return;
    $$('[data-ht]', el).forEach((b) => b.classList.toggle('aktif', b.dataset.ht === el.tab));
    const kelasList = Array.from(new Set(d.rows.map((r) => r.kelas))).sort();
    const kelasSel = '<select class="inp" id="h-kelas" style="max-width:200px">' + opsi(kelasList, $('#h-kelas', el) ? $('#h-kelas', el).value : '', 'Semua kelas') + '</select>';
    const kv = $('#h-kelas', el) ? $('#h-kelas', el).value : '';
    const rows = d.rows.filter((r) => !kv || r.kelas === kv);
    const nil = rows.map((r) => r.nilai), rata = nil.length ? nil.reduce((a, b) => a + b, 0) / nil.length : 0;
    const info = d.berjalan ? '<div class="alert info">' + ik('info') + '<div>' + d.berjalan + ' siswa masih mengerjakan. Hasil mereka muncul setelah dikumpulkan.</div></div>' : '';
    if (el.tab === 'rekap') {
      box.innerHTML = info + '<div class="kisi k4"><div class="kartu stat"><div class="lab">Peserta selesai</div><div class="ang">' + rows.length + '</div></div><div class="kartu stat"><div class="lab">Rata-rata</div><div class="ang">' + fmt.angka(rata) + '</div></div>' +
        '<div class="kartu stat"><div class="lab">Tertinggi / terendah</div><div class="ang">' + (nil.length ? fmt.angka(Math.max(...nil)) + '<small>/ ' + fmt.angka(Math.min(...nil)) + '</small>' : '—') + '</div></div>' +
        '<div class="kartu stat"><div class="lab">Tuntas (≥ ' + d.ambang + ')</div><div class="ang">' + nil.filter((n) => n >= d.ambang).length + '<small>' + (nil.length ? Math.round(nil.filter((n) => n >= d.ambang).length / nil.length * 100) : 0) + '%</small></div></div></div>' +
        '<div class="saring" style="margin-top:16px">' + kelasSel + '<span style="flex:1"></span><button class="btn" data-h="excel">' + ik('unduh') + 'Unduh Excel</button><button class="btn" data-h="cetak">Cetak / PDF</button></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="angka">#</th><th>NIS</th><th>Nama</th><th>Kelas</th><th class="angka">Nilai</th><th class="angka">B / S / K</th><th class="angka">Durasi</th><th>Selesai</th></tr></thead><tbody>' +
        rows.map((r) => '<tr class="klik" data-hs="' + esc(r.sid) + '"><td class="angka mono">' + r.rank + '</td><td class="mono">' + esc(r.nis) + '</td><td>' + esc(r.nama) + (r.pd ? ' ' + lencana('uraian belum dinilai', 'warn') : '') + '</td><td>' + esc(r.kelas) + '</td>' +
          '<td class="angka"><b style="color:' + (r.nilai >= d.ambang ? 'var(--ok)' : 'var(--bad)') + '">' + fmt.angka(r.nilai) + '</b></td><td class="angka mono">' + r.benar + ' / ' + r.salah + ' / ' + r.kosong + '</td><td class="angka">' + fmt.durasi(r.durasi) + '</td><td class="kecil">' + fmt.tgl(r.selesai) + '</td></tr>').join('') +
        '</tbody></table></div>';
    }
    if (el.tab === 'kelas') {
      const komp = d.komp, rk = {};
      komp.forEach((k) => { const v = rows.map((r) => r.komp[k.id]).filter((x) => x != null); rk[k.id] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });
      box.innerHTML = info + '<div class="saring">' + kelasSel + '<span class="legenda"><span style="--c:var(--ok-bg)">≥ ' + d.ambang + '% dikuasai</span><span style="--c:var(--warn-bg)">' + (d.ambang - 25) + '–' + (d.ambang - 1) + '% sedang</span><span style="--c:var(--bad-bg)">perlu remedial</span></span></div>' +
        '<section class="kartu"><div class="kartu-kepala"><h2>Rata-rata penguasaan per kompetensi</h2></div>' + komp.map((k) => '<div class="hbar"><span>' + esc(k.nama) + '</span><div class="bar"><i class="' + (rk[k.id] >= d.ambang ? 'ok' : 'bad') + '" style="width:' + rk[k.id] + '%"></i><span class="ambang" style="left:' + d.ambang + '%"></span></div><span class="nil">' + fmt.angka(rk[k.id]) + '%</span></div>').join('') + '</section>' +
        '<section class="kartu" style="margin-top:16px"><div class="kartu-kepala"><h2>Peta siswa × kompetensi</h2></div><div class="tbl-wrap"><table class="tbl heat"><thead><tr><th>Siswa</th>' + komp.map((k) => '<th title="' + esc(k.nama) + '">' + esc(k.kode) + '</th>').join('') + '<th class="angka">Nilai</th></tr></thead><tbody>' +
        rows.map((r) => '<tr><td>' + esc(r.nama) + '<div class="kecil muted">' + esc(r.kelas) + '</div></td>' + komp.map((k) => { const v = r.komp[k.id]; return v == null ? '<td class="sel">—</td>' : '<td class="sel ' + warnaP(v, d.ambang) + '">' + Math.round(v) + '</td>'; }).join('') + '<td class="angka"><b>' + fmt.angka(r.nilai) + '</b></td></tr>').join('') + '</tbody></table></div></section>';
    }
    if (el.tab === 'siswa') {
      if (!el.sid && rows[0]) el.sid = rows[0].sid;
      box.innerHTML = info + '<div class="saring">' + kelasSel + '<select class="inp" id="h-pilihsiswa">' + opsi(rows.map((r) => ({ v: r.sid, l: r.nama + ' (' + r.kelas + ') — ' + fmt.angka(r.nilai) })), el.sid) + '</select><button class="btn no-print" data-h="cetak">Cetak / PDF</button><button class="btn no-print" data-h="dokumen">' + ik('dok') + 'Buat dokumen</button></div><div id="h-siswa"><div class="memuat"></div></div>';
      if (el.sid) analisisSiswa(el, el.sid);
    }
    if (el.tab === 'butir') { box.innerHTML = '<div id="h-butir"><div class="memuat"></div></div>'; analisisButir(el, false); }
  }
  async function analisisSiswa(el, sid) {
    const r = await api('hasil.siswa', { sid });
    const box = $('#h-siswa', el);
    if (!r.success) { box.innerHTML = '<div class="kartu kosong">' + esc(r.message) + '</div>'; return; }
    const d = r.data, h = d.hasil, amb = d.ambang;
    const komp = Object.keys(h.komp || {}).map((k) => ({ id: k, nama: (d.namaKomp[k] || {}).nama || 'Tanpa kompetensi', p: h.komp[k][1] ? h.komp[k][0] / h.komp[k][1] * 100 : 0, rk: d.rataKelas[k] }));
    const urai = h.ps.filter((p) => d.soal[p[0]] && d.soal[p[0]].b === 'URAIAN');
    box.innerHTML = '<div class="kisi k4"><div class="kartu stat"><div class="lab">Nilai</div><div class="ang" style="color:' + (h.nilai >= amb ? 'var(--ok)' : 'var(--bad)') + '">' + fmt.angka(h.nilai) + '<small>skor ' + h.skor + ' / ' + h.maks + '</small></div></div>' +
      '<div class="kartu stat"><div class="lab">Benar / salah / kosong</div><div class="ang">' + h.benar + '<small>/ ' + h.salah + ' / ' + h.kosong + (h.sebagian ? ' · ' + h.sebagian + ' sebagian' : '') + '</small></div></div>' +
      '<div class="kartu stat"><div class="lab">Durasi</div><div class="ang">' + fmt.durasi(h.durasi) + '<small>' + (d.sesi.pt ? d.sesi.pt + '× pindah tab' : '') + '</small></div></div>' +
      '<div class="kartu stat"><div class="lab">Peringkat kelas</div><div class="ang">#' + (d.peringkat || '—') + '<small>dari ' + d.jumlahKelas + ' · rata kelas ' + fmt.angka(d.rataNilaiKelas) + '</small></div></div></div>' +
      '<section class="kartu" style="margin-top:16px"><div class="kartu-kepala"><div><h2>Penguasaan kompetensi — ' + esc(d.sesi.nama) + '</h2><p>Batang = siswa; garis merah = ambang ' + amb + '%; teks kanan = rata-rata kelas.</p></div></div>' +
      komp.map((k) => '<div class="hbar"><span>' + esc(k.nama) + '</span><div class="bar"><i class="' + (k.p >= amb ? 'ok' : 'bad') + '" style="width:' + k.p + '%"></i><span class="ambang" style="left:' + amb + '%"></span></div><span class="nil">' + Math.round(k.p) + '%<div class="kecil muted" style="font-weight:400">kelas ' + (k.rk == null ? '—' : Math.round(k.rk) + '%') + '</div></span></div>').join('') + '</section>' +
      '<section class="kartu" style="margin-top:16px"><div class="kartu-kepala"><h2>Matriks butir</h2><div class="legenda"><span style="--c:var(--ok)">Benar</span><span style="--c:#F59E0B">Sebagian</span><span style="--c:var(--bad)">Salah</span><span style="--c:var(--surface-2)">Kosong</span></div></div>' +
      '<div class="grid-nomor kecil">' + h.ps.map((p, i) => '<button title="' + esc(p[0] + ' · ' + (d.soal[p[0]] ? BENTUK_LABEL[d.soal[p[0]].b] : '') + ' · ' + fmt.durasi(p[4])) + '" class="' + ({ benar: 'benar', salah: 'salah', sebagian: 'sebagian', kosong: 'kosong-n', manual: 'kosong-n' }[p[3]] || '') + '">' + (i + 1) + '</button>').join('') + '</div></section>' +
      (urai.length ? '<section class="kartu" style="margin-top:16px"><div class="kartu-kepala"><h2>Nilai uraian</h2></div>' + urai.map((p) => '<div style="border-top:1px solid var(--line);padding:12px 0"><div class="kecil muted"><span class="chip-id">' + esc(p[0]) + '</span> · bobot ' + p[2] + '</div><div class="kecil">' + esc(d.soal[p[0]].ring) + '</div>' +
        '<div style="background:var(--surface-2);padding:10px;border-radius:8px;margin:8px 0;white-space:pre-wrap">' + esc(p[5] || '(tidak dijawab)') + '</div><label class="kecil">Skor (0–' + p[2] + '): <input class="inp" type="number" step="0.25" min="0" max="' + p[2] + '" data-urai="' + esc(p[0]) + '" value="' + (p[3] === 'manual' ? '' : p[1]) + '" style="width:100px;display:inline-block"></label></div>').join('') +
        '<button class="btn utama" data-h="urai" data-sid="' + esc(sid) + '">Simpan nilai uraian</button></section>' : '');
  }
  async function analisisButir(el, hitung) {
    const id = $('#h-paket', el).value, box = $('#h-butir', el);
    if (hitung) { const r = await api('hasil.hitungButir', { idPaket: id }); toast(r.message, r.success ? 'ok' : 'err', 7000); }
    const r = await api('hasil.butir', { idPaket: id });
    if (!r.success) { box.innerHTML = '<div class="kartu kosong">' + esc(r.message) + '</div>'; return; }
    const ada = r.data.items.some((x) => x.a);
    const db = (v) => v >= 0.4 ? lencana('Baik ' + v.toFixed(2), 'ok') : v >= 0.2 ? lencana('Cukup ' + v.toFixed(2), 'warn') : lencana('Revisi ' + v.toFixed(2), 'bad');
    box.innerHTML = '<div class="saring"><span class="kecil muted" style="flex:1">Tingkat kesulitan (p) = proporsi jawaban benar; daya beda = selisih p kelompok atas dan bawah (27%). Analisis ≥5 siswa juga memperbarui kesulitan di bank soal.</span><button class="btn utama" data-h="hitung">' + ik('segar') + (ada ? 'Hitung ulang' : 'Hitung analisis') + '</button></div>' +
      (ada ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="angka">No</th><th>Soal</th><th>Kompetensi</th><th class="angka">p</th><th>Kategori</th><th>Daya beda</th><th>Sebaran jawaban</th><th class="angka">Rata waktu</th></tr></thead><tbody>' +
        r.data.items.map((x) => { const a = x.a; if (!a) return '<tr><td class="angka">' + x.no + '</td><td colspan="7" class="muted">Belum ada data</td></tr>';
          const tot = Object.values(a.opsi).reduce((s, v) => s + v, 0) || 1, kunci = [].concat(x.k || []);
          const sebar = x.b === 'PG' || x.b === 'PGK_MCMA' ? Object.keys(a.opsi).sort().map((o) => '<div style="display:grid;grid-template-columns:22px 1fr 30px;gap:6px;align-items:center;font-size:12px"><b class="mono" style="color:' + (kunci.indexOf(o) >= 0 ? 'var(--ok)' : 'inherit') + '">' + esc(o) + '</b>' + bar(a.opsi[o] / tot * 100, kunci.indexOf(o) >= 0 ? 'ok' : 'abu') + '<span class="mono">' + a.opsi[o] + '</span></div>').join('') : '<span class="kecil muted">—</span>';
          return '<tr><td class="angka mono">' + x.no + '</td><td><span class="chip-id">' + esc(x.id) + '</span> ' + Admin.bentuk(x.b) + '<div class="ringkas kecil">' + esc(x.ring) + '</div></td><td class="kecil">' + esc(x.komp) + '</td><td class="angka mono">' + a.p.toFixed(2) + '</td>' +
            '<td>' + lencana(a.kat, a.kat === 'mudah' ? 'ok' : a.kat === 'sedang' ? 'info' : 'bad') + '</td><td>' + db(a.db) + '</td><td style="min-width:160px">' + sebar + '</td><td class="angka">' + fmt.durasi(a.waktu) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="kartu kosong"><strong>Analisis belum dihitung</strong>Tekan Hitung analisis setelah paket selesai dikerjakan.</div>');
  }
  async function aksiHasil(el, e) {
    const t = e.target.closest('[data-ht]');
    if (t) { el.tab = t.dataset.ht; return renderHasil(el); }
    const tr = e.target.closest('[data-hs]');
    if (tr) { el.sid = tr.dataset.hs; el.tab = 'siswa'; return renderHasil(el); }
    const b = e.target.closest('[data-h]');
    if (!b) return;
    if (b.dataset.h === 'cetak') window.print();
    if (b.dataset.h === 'hitung') { sibuk(b, true); await analisisButir(el, true); }
    if (b.dataset.h === 'dokumen') go('#/admin/dokumen/buat/' + el.sid);
    if (b.dataset.h === 'urai') {
      const nilai = {};
      $$('[data-urai]', el).forEach((x) => { if (x.value !== '') nilai[x.dataset.urai] = Number(x.value); });
      const r = await api('hasil.nilaiUraian', { sid: b.dataset.sid, nilai });
      toast(r.message, r.success ? 'ok' : 'err');
      if (r.success) { basi('hr_' + $('#h-paket', el).value); await muatHasil(el, true); }
    }
    if (b.dataset.h === 'excel') {
      const d = el.rekap, X = await Lib.xlsx(), wb = X.utils.book_new(), kv = $('#h-kelas', el).value;
      const rows = d.rows.filter((r) => !kv || r.kelas === kv);
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows.map((r) => ({ Peringkat: r.rank, NIS: r.nis, Nama: r.nama, Kelas: r.kelas, Nilai: r.nilai, Skor: r.skor, 'Skor maks': r.maks, Benar: r.benar, Salah: r.salah, Kosong: r.kosong, 'Durasi (menit)': Math.round(r.durasi / 60), Mulai: fmt.tgl(r.mulai), Selesai: fmt.tgl(r.selesai) }))), 'Rekap');
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows.map((r) => { const o = { NIS: r.nis, Nama: r.nama, Kelas: r.kelas }; d.komp.forEach((k) => { o[k.kode + ' ' + k.nama] = r.komp[k.id] == null ? '' : Math.round(r.komp[k.id]); }); return o; })), 'Per kompetensi');
      X.writeFile(wb, 'rekap-' + d.meta.id + (kv ? '-' + kv : '') + '.xlsx');
    }
  }
})();
