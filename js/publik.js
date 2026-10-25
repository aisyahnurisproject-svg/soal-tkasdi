/* =====================================================================
   publik.js — masuk (siswa & guru/admin), akses darurat, verifikasi dokumen
   ===================================================================== */
(function () {
  'use strict';
  const Publik = window.Publik = {};

  function kerangka(isi) {
    return '<div class="publik"><header class="publik-atas"><div class="logo" data-logo>' + App.logo() + '</div><div><b data-nama-sekolah>' + esc(App.info.NAMA_SEKOLAH) +
      '</b><span data-nama-app>' + esc(App.info.NAMA_APP) + '</span></div></header><main class="publik-isi">' + isi + '</main>' +
      '<footer class="publik-kaki"><span data-nama-sekolah>' + esc(App.info.NAMA_SEKOLAH) + '</span> · Try out berbasis komputer</footer></div>';
  }
  Publik.segarMerek = function () {
    $$('[data-logo]').forEach((el) => { el.innerHTML = App.logo(); });
    $$('[data-nama-sekolah]').forEach((el) => { el.textContent = App.info.NAMA_SEKOLAH; });
    $$('[data-nama-app]').forEach((el) => { el.textContent = App.info.NAMA_APP; });
  };

  // ------------------------------------------------------------ MASUK
  Publik.masuk = function () {
    document.body.className = 'mode-publik';
    warmUp('pub');
    Router.tampil('masuk', (el) => {
      const mode = Store.get('mode_masuk', 'siswa');
      el.innerHTML = kerangka(
        '<div style="display:grid;justify-items:center;width:100%"><section class="kartu-masuk" aria-labelledby="judul-masuk">' +
        '<h1 id="judul-masuk">Masuk</h1><p>Gunakan akun yang dibagikan sekolah.</p>' +
        '<div class="saklar" role="tablist"><button type="button" data-mode="siswa">Siswa</button><button type="button" data-mode="staf">Guru &amp; Admin</button></div>' +
        '<form id="f-masuk" autocomplete="on" novalidate>' +
        '<div data-untuk="siswa">' + field('Nomor Induk Siswa (NIS)', '<input class="inp mono" name="nis" inputmode="numeric" autocomplete="username" placeholder="Contoh: 0012345">') + '</div>' +
        '<div data-untuk="staf">' + field('Email', '<input class="inp" name="email" type="email" autocomplete="username" placeholder="nama@sekolah.sch.id">') + '</div>' +
        field('Kata sandi', '<div style="position:relative"><input class="inp" name="password" type="password" autocomplete="current-password" style="padding-right:46px">' +
          '<button type="button" class="btn hantu kecil ikon" data-lihat style="position:absolute;right:4px;top:4px" aria-label="Tampilkan kata sandi">' + ik('mata') + '</button></div>') +
        '<div class="alert bad" id="galat-masuk" hidden></div>' +
        '<button class="btn utama lebar" type="submit" style="height:46px">Masuk</button></form></section>' +
        '<section class="tata" data-untuk="siswa"><b>Sebelum ujian</b><ol><li>Pastikan baterai perangkat cukup atau tersambung listrik.</li>' +
        '<li>Token ujian dibagikan pengawas setelah kamu masuk.</li><li>Berpindah aplikasi atau tab selama ujian akan tercatat.</li></ol></section></div>');
      const f = $('#f-masuk', el);
      const setMode = (m) => {
        Store.set('mode_masuk', m);
        $$('[data-mode]', el).forEach((b) => b.classList.toggle('aktif', b.dataset.mode === m));
        $$('[data-untuk]', el).forEach((x) => { x.hidden = x.dataset.untuk !== m; });
        f.dataset.mode = m;
        if (m === 'staf') warmUp('admin');
      };
      setMode(mode);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-mode]');
        if (b) setMode(b.dataset.mode);
        if (e.target.closest('[data-lihat]')) { const p = f.password; p.type = p.type === 'password' ? 'text' : 'password'; }
      });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = f.querySelector('[type=submit]'), galat = $('#galat-masuk', el);
        galat.hidden = true;
        const siswa = f.dataset.mode === 'siswa';
        const data = siswa ? { nis: f.nis.value.trim(), password: f.password.value } : { email: f.email.value.trim(), password: f.password.value };
        if (!(siswa ? data.nis : data.email) || !data.password) { galat.textContent = 'Lengkapi isian terlebih dahulu.'; galat.hidden = false; return; }
        sibuk(btn, true, 'Memeriksa…');
        const r = await api(siswa ? 'auth.siswa' : 'auth.login', data);
        sibuk(btn, false);
        if (!r.success) { galat.textContent = r.message; galat.hidden = false; return; }
        f.password.value = '';
        masukBerhasil(r.data, siswa ? 'siswa' : r.data.me.role);
      });
    });
  };
  function masukBerhasil(d, role) {
    Auth.simpan(d, role);
    App.boot = d.boot;
    if (d.boot && d.boot.info) App.setInfo(d.boot.info);
    if (d.boot && d.boot.set) App.setInfo({ NAMA_SEKOLAH: d.boot.set.NAMA_SEKOLAH, NAMA_APP: d.boot.set.NAMA_APP, LOGO_ID: d.boot.set.LOGO_ID });
    if (role === 'siswa') { Store.set(Store.u('sboot'), { t: Date.now(), h: '', data: d.boot }); go('#/siswa'); }
    else { Store.set(Store.u('aboot'), { t: Date.now(), h: '', data: d.boot }); go('#/admin/dashboard'); }
    Router.buang('masuk');
  }

  // ------------------------------------------------------------ DARURAT (tidak ditautkan dari mana pun)
  Publik.darurat = function () {
    document.body.className = 'mode-publik';
    Router.tampil('darurat', (el) => {
      el.innerHTML = kerangka('<section class="kartu-masuk"><h1>Akses darurat</h1><p>Hanya untuk pemulihan ketika akun Super Admin tidak bisa dipakai. Setiap percobaan tercatat.</p>' +
        '<form id="f-darurat">' + field('Nama pengguna', '<input class="inp" name="u" autocomplete="off">') + field('Kata sandi', '<input class="inp" name="p" type="password" autocomplete="off">') +
        '<div class="alert bad" hidden id="g-darurat"></div><button class="btn bahaya lebar">Masuk darurat</button></form></section>');
      $('#f-darurat', el).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target, b = f.querySelector('button');
        sibuk(b, true);
        const r = await api('auth.darurat', { username: f.u.value, password: f.p.value });
        sibuk(b, false);
        if (!r.success) { $('#g-darurat', el).textContent = r.message; $('#g-darurat', el).hidden = false; return; }
        Router.buang('darurat');
        masukBerhasil(r.data, 'superadmin');
      });
    });
  };

  // ------------------------------------------------------------ VERIFIKASI DOKUMEN (publik)
  Publik.verifikasi = function (kode) {
    document.body.className = 'mode-publik';
    Router.buang('verifikasi');
    const el = Router.tampil('verifikasi', (x) => { x.innerHTML = kerangka('<section class="kartu verif" id="v-isi"><div class="memuat">Memeriksa dokumen…</div></section>'); });
    api('doc.verifikasi', { kode }).then((r) => {
      const box = $('#v-isi', el);
      if (!r.success) { box.innerHTML = '<h2 style="margin-top:0">Dokumen tidak ditemukan</h2><p class="muted">' + esc(r.message) + '</p><p class="kecil muted">Kode: <span class="mono">' + esc(kode) + '</span></p>'; return; }
      const d = r.data, sah = d.status === 'SAH';
      box.innerHTML = '<div class="cap ' + (sah ? 'sah' : 'tarik') + '">' + ik(sah ? 'cek' : 'awas') + (sah ? 'Dokumen sah' : d.status === 'DIGANTI' ? 'Dokumen sudah diganti' : 'Dokumen ditarik') + '</div>' +
        '<dl style="display:grid;grid-template-columns:140px 1fr;gap:8px 12px;margin:18px 0">' +
        '<dt class="muted">Jenis</dt><dd style="margin:0"><b>' + esc(d.judul) + '</b></dd><dt class="muted">Atas nama</dt><dd style="margin:0">' + esc(d.subjek) + '</dd>' +
        '<dt class="muted">Diterbitkan</dt><dd style="margin:0">' + fmt.tgl(d.terbit) + '</dd><dt class="muted">Penerbit</dt><dd style="margin:0">' + esc(d.sekolah) + '</dd>' +
        '<dt class="muted">Nomor</dt><dd style="margin:0" class="mono">' + esc(d.id) + '</dd>' + (d.catatan ? '<dt class="muted">' + (d.status === 'DIGANTI' ? 'Keterangan' : 'Alasan ditarik') + '</dt><dd style="margin:0">' + esc(d.catatan) + '</dd>' : '') + '</dl>' +
        (d.hash ? '<div class="alert info">' + ik('info') + '<div>Pastikan berkas PDF yang Anda pegang tidak diubah: pilih berkasnya di bawah ini. Pengecekan berjalan di perangkat Anda, berkas tidak diunggah.</div></div>' +
          '<input type="file" accept="application/pdf" id="v-pdf" class="inp"><p id="v-hasil" class="kecil" style="margin-top:10px"></p>' : '');
      const inp = $('#v-pdf', el);
      if (inp) inp.addEventListener('change', async () => {
        const f = inp.files[0];
        if (!f) return;
        const buf = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
        const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        const p = $('#v-hasil', el);
        p.innerHTML = hex === d.hash ? lencana('Berkas asli — identik dengan yang diterbitkan', 'ok') : lencana('Berkas BERBEDA dari yang diterbitkan', 'bad');
      });
    });
  };

  // ------------------------------------------------------------ RUTE
  Router.tambah(/^verifikasi\/([A-Za-z0-9]+)$/, (m) => Publik.verifikasi(m[0]));
  Router.tambah(/^masuk$/, () => { if (App.token) return Router.bawaan(); Publik.masuk(); });
  Router.tambah(/^darurat$/, () => Publik.darurat());
  Router.tambah(/^admin(?:\/([\w-]+))?(?:\/(.+))?$/, async (m) => {
    if (!App.token && !Auth.pulih()) return go('#/masuk');
    if (App.role === 'siswa') return go('#/siswa');
    document.body.className = 'mode-admin';
    if (!window.Admin) { const el = Router.tampil('memuat-admin', (x) => { x.innerHTML = '<div class="memuat">Menyiapkan panel…</div>'; }); el.hidden = false; }
    try { await App.muatAdmin(); } catch (e) { toast('Gagal memuat modul admin. Periksa koneksi lalu muat ulang.', 'err'); return; }
    Router.buang('memuat-admin');
    Admin.rute(m[0] || 'dashboard', m[1]);
  });
  Router.bawaan = function () {
    if (!App.token) Auth.pulih();
    if (!App.token) return go('#/masuk');
    go(App.role === 'siswa' ? '#/siswa' : '#/admin/dashboard');
  };
})();
