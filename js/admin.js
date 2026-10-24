/* =====================================================================
   admin.js — kerangka panel (sidebar, topbar), data bersama, Dashboard,
   Kompetensi, Akun, Pengaturan. Halaman lain didaftarkan di admin-*.js.
   ===================================================================== */
(function () {
  'use strict';
  const Admin = window.Admin = { hal: {}, urutan: [], dengar: {} };
  const SA = ['superadmin'], SEMUA = ['superadmin', 'guru'];
  Admin.SA = SA; Admin.SEMUA = SEMUA;
  Admin.daftar = function (nama, def) { Admin.hal[nama] = Object.assign({ peran: SEMUA, grup: 'Manajemen soal' }, def); Admin.urutan.push(nama); };
  Admin.sa = () => App.role === 'superadmin';
  Admin.on = (k, fn) => { (Admin.dengar[k] = Admin.dengar[k] || []).push(fn); };
  Admin.emit = (k, v) => (Admin.dengar[k] || []).forEach((fn) => { try { fn(v); } catch (e) { console.error(e); } });

  // ------------------------------------------------------------ data bersama
  Admin.b = () => App.boot || { set: {}, master: { komp: [], sub: [] }, mapel: [], kelas: [] };
  Admin.segarBoot = async function (paksa) {
    await swr('aboot', 'admin.boot', {}, (d) => { App.boot = d; App.setInfo({ NAMA_SEKOLAH: d.set.NAMA_SEKOLAH, NAMA_APP: d.set.NAMA_APP, LOGO_ID: d.set.LOGO_ID }); Admin.emit('boot', d); }, { fresh: paksa ? 0 : 60000 });
  };
  Admin.mapelSaya = () => { const b = Admin.b(); return b.mapelSaya && b.mapelSaya.length ? b.mapelSaya : b.mapel; };
  Admin.namaKomp = (id) => { const k = Admin.b().master.komp.find((x) => x.id === id); return k ? k.nama : (id ? id : '—'); };
  Admin.kodeKomp = (id) => { const k = Admin.b().master.komp.find((x) => x.id === id); return k ? k.kode : ''; };
  Admin.namaSub = (id) => { const k = Admin.b().master.sub.find((x) => x.id === id); return k ? k.nama : ''; };
  Admin.kompMapel = (m) => Admin.b().master.komp.filter((k) => !m || k.mapel === m);
  Admin.subKomp = (idk) => Admin.b().master.sub.filter((s) => s.idk === idk);
  Admin.soal = async function (paksa) {
    await swr('soal', 'soal.daftar', {}, (d) => { App.data.soal = d.soal; Admin.emit('soal', d.soal); }, { fresh: paksa ? 0 : 45000 });
    return App.data.soal || [];
  };
  Admin.soalBasi = () => { basi('soal', 'dash'); };
  const STATUS = { draft: ['Draft', 'polos'], ditinjau: ['Ditinjau', 'info'], disetujui: ['Disetujui', 'ok'], bermasalah: ['Bermasalah', 'warn'],
    aktif: ['Aktif', 'ok'], ditutup: ['Ditutup', 'polos'], proses: ['Diproses', 'info'], selesai: ['Selesai', 'ok'], sebagian: ['Sebagian gagal', 'warn'],
    menunggu: ['Menunggu', 'warn'], ditolak: ['Ditolak', 'bad'], nonaktif: ['Nonaktif', 'bad'] };
  Admin.status = (s) => { const x = STATUS[s] || [s || '—', 'polos']; return lencana(x[0], x[1]); };
  Admin.bentuk = (b) => '<span class="lencana navy polos">' + esc((BENTUK_LABEL[b] || b || '').replace('Pilihan ganda kompleks', 'PGK').replace('Pilihan ganda', 'PG')) + '</span>';
  Admin.salin = (t) => { navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast('Disalin.', 'ok')); };
  Admin.sandiSekali = function (judul, list) {
    const rows = list.map((x) => '<tr><td class="mono">' + esc(x.NIS || x.id || '') + '</td><td>' + esc(x.nama || '') + '</td><td>' + esc(x.kelas || '') + '</td><td class="mono"><b>' + esc(x.password) + '</b></td></tr>').join('');
    const m = modal({ judul, ukuran: 'lg', lekat: true, isi: '<div class="alert warn">' + ik('awas') + '<div>Kata sandi hanya tampil <b>sekali</b>. Unduh atau catat sekarang — sistem hanya menyimpan bentuk teracaknya.</div></div>' +
      '<div class="tbl-wrap" style="max-height:50vh"><table class="tbl"><thead><tr><th>NIS / ID</th><th>Nama</th><th>Kelas</th><th>Kata sandi</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
      tombol: [{ label: ik('unduh') + 'Unduh Excel', aksi: async () => { const X = await Lib.xlsx(); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.json_to_sheet(list.map((x) => ({ NIS: x.NIS || x.id, Nama: x.nama, Kelas: x.kelas || '', 'Kata sandi': x.password }))), 'Kartu login'); X.writeFile(wb, 'kartu-login-' + Date.now() + '.xlsx'); return false; } },
        { label: 'Sudah saya catat', kelas: 'utama' }] });
    return m.hasil;
  };

  // ------------------------------------------------------------ kerangka
  function kerangka() {
    return Router.tampil('admin', (el) => {
      const peran = App.role;
      const grup = {}, URUT = ['dashboard', 'unggah', 'review', 'bank', 'pembahasan', 'kompetensi', 'paket', 'monitoring', 'hasil', 'akun', 'dokumen', 'migrasi', 'pengaturan'];
      const GRUP = ['Manajemen soal', 'Pelaksanaan & evaluasi', 'Administrasi'];
      Admin.urutan.sort((a, b) => (URUT.indexOf(a) + 1 || 99) - (URUT.indexOf(b) + 1 || 99));
      GRUP.forEach((g) => { grup[g] = []; });
      Admin.urutan.forEach((n) => { const h = Admin.hal[n]; if (h.peran.indexOf(peran) < 0 || h.tersembunyi) return; (grup[h.grup] = grup[h.grup] || []).push(n); });
      const inisial = String((App.me && App.me.nama) || 'A').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
      el.innerHTML = '<div class="adm"><aside class="sisi" aria-label="Menu utama"><div class="merek"><div class="logo" data-logo>' + App.logo() + '</div><div><b data-nama-sekolah>' + esc(App.info.NAMA_SEKOLAH) + '</b><span>Bank soal &amp; try out</span></div></div>' +
        '<nav class="nav">' + Object.keys(grup).filter((g) => grup[g].length).map((g) => '<h6>' + esc(g) + '</h6>' + grup[g].map((n) => '<a href="#/admin/' + n + '" data-nav="' + n + '">' + ik(Admin.hal[n].ikon) + '<span>' + esc(Admin.hal[n].judul) + '</span><span class="nb" data-nb="' + n + '" hidden></span></a>').join('')).join('') + '</nav>' +
        '<div class="sisi-kaki"><span>v' + App.v + '</span><span class="status-net">Terhubung</span></div></aside><div class="selubung-sisi" data-tutup-sisi></div>' +
        '<div class="utama-adm"><header class="atas"><button class="btn hantu ikon tombol-menu" data-buka-sisi aria-label="Buka menu">' + ik('menu') + '</button><div class="jejak" id="jejak"></div>' +
        '<button class="pengguna" data-menu-user aria-haspopup="true"><span class="nm"><b>' + esc(App.me.nama) + '</b><small>' + (peran === 'superadmin' ? 'Super Admin' : 'Guru mapel') + (App.me.mapel ? ' · ' + esc(App.me.mapel) : '') + '</small></span><span class="ava">' + esc(inisial) + '</span></button></header>' +
        '<main class="konten" id="konten"></main></div></div>';
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-buka-sisi]')) document.body.classList.add('sisi-buka');
        if (e.target.closest('[data-tutup-sisi]') || e.target.closest('[data-nav]')) document.body.classList.remove('sisi-buka');
        if (e.target.closest('[data-menu-user]')) menuPengguna();
      });
      if (Store.get('tema', '') === 'gelap') document.documentElement.classList.add('gelap');
    });
  }
  function menuPengguna() {
    const ada = $('.menu-tarik');
    if (ada) { ada.remove(); return; }
    const m = document.createElement('div');
    m.className = 'menu-tarik';
    m.innerHTML = '<button data-m="sandi">' + ik('gembok') + 'Ganti kata sandi</button><button data-m="tema">' + ik('bulan') + 'Mode gelap</button>' +
      '<button data-m="semua">' + ik('kunci') + 'Keluar dari semua perangkat</button><button data-m="keluar">' + ik('keluar') + 'Keluar</button>';
    document.body.appendChild(m);
    const tutup = (e) => { if (!m.contains(e.target) && !e.target.closest('[data-menu-user]')) { m.remove(); document.removeEventListener('click', tutup); } };
    setTimeout(() => document.addEventListener('click', tutup), 0);
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      m.remove();
      if (b.dataset.m === 'sandi') gantiSandi(false);
      if (b.dataset.m === 'tema') { const g = document.documentElement.classList.toggle('gelap'); Store.set('tema', g ? 'gelap' : ''); }
      if (b.dataset.m === 'keluar') Auth.keluar();
      if (b.dataset.m === 'semua' && await konfirmasi('Semua sesi akun ini di perangkat lain akan berakhir, termasuk perangkat ini.', { ya: 'Keluarkan semua', bahaya: true })) { await api('akun.keluarSemua', {}); Auth.keluar('Semua sesi diakhiri.'); }
    });
  }
  function gantiSandi(wajib) {
    if (App.me.darurat) return toast('Akses darurat tidak punya sandi akun. Buat atau reset akun Super Admin di menu Akun.', 'warn', 7000);
    modal({ judul: wajib ? 'Ganti kata sandi sementara' : 'Ganti kata sandi', tutup: !wajib, lekat: wajib,
      isi: (wajib ? '<div class="alert info">' + ik('info') + '<div>Anda masuk dengan kata sandi sementara. Buat kata sandi baru sebelum melanjutkan.</div></div>' : '') +
        field('Kata sandi lama', '<input class="inp" type="password" id="p-lama" autocomplete="current-password">') +
        field('Kata sandi baru', '<input class="inp" type="password" id="p-baru" autocomplete="new-password">', 'Minimal 8 karakter, memuat huruf dan angka.'),
      tombol: [].concat(wajib ? [] : [{ label: 'Batal' }], [{ label: 'Simpan kata sandi', kelas: 'utama', aksi: async (m) => {
        const r = await api('akun.sandi', { lama: $('#p-lama', m).value, baru: $('#p-baru', m).value });
        toast(r.message, r.success ? 'ok' : 'err');
        if (r.success) { App.me.wajibGanti = false; Store.set('sesi', Object.assign(Store.get('sesi', {}), { me: App.me })); }
        return r.success ? true : false;
      } }]) });
  }

  // ------------------------------------------------------------ router admin (halaman disimpan)
  Admin.rute = async function (nama, param) {
    const def = Admin.hal[nama];
    if (!def || def.peran.indexOf(App.role) < 0) return go('#/admin/dashboard');
    const root = kerangka();
    root.hidden = false;
    if (!App.boot || !App.boot.master) await Admin.segarBoot(true); else Admin.segarBoot(false);
    if (App.me.wajibGanti && !Admin._gantiDitanya) { Admin._gantiDitanya = true; gantiSandi(true); }
    $$('[data-nav]', root).forEach((a) => a.classList.toggle('aktif', a.dataset.nav === nama));
    $('#jejak').innerHTML = esc(def.grup) + ' › <b>' + esc(def.judul) + '</b>';
    const konten = $('#konten');
    $$('.hal', konten).forEach((x) => x.classList.remove('tampil'));
    let el = $('.hal[data-hal="' + nama + '"]', konten);
    const baru = !el;
    if (!el) { el = document.createElement('section'); el.className = 'hal'; el.dataset.hal = nama; konten.appendChild(el); }
    el.classList.add('tampil');
    window.scrollTo(0, 0);
    try {
      if (baru) await def.render(el, param);
      if (def.tampil) await def.tampil(el, param);
    } catch (e) { console.error(e); el.innerHTML = '<div class="kartu kosong"><strong>Halaman gagal dimuat</strong>' + esc(e.message) + '</div>'; }
    CBT && CBT.s && CBT.s.preview && null;
  };
  Admin.kepala = (judul, desk, aksi) => '<div class="kepala-hal"><div><h1>' + esc(judul) + '</h1>' + (desk ? '<p>' + desk + '</p>' : '') + '</div><div class="aksi">' + (aksi || '') + '</div></div>';
  Admin.badge = function (nama, n) { const el = $('[data-nb="' + nama + '"]'); if (el) { el.hidden = !n; el.textContent = n; } };

  // ============================================================ DASHBOARD
  Admin.daftar('dashboard', {
    judul: 'Dashboard', ikon: 'dash', grup: 'Manajemen soal',
    render(el) {
      el.innerHTML = Admin.kepala('Dashboard ringkasan', 'Kondisi bank soal, antrean kerja, dan try out yang berjalan.', '<button class="btn" data-segar>' + ik('segar') + 'Segarkan</button>') + '<div id="dash-isi"><div class="memuat">Memuat ringkasan…</div></div>';
      el.addEventListener('click', (e) => { if (e.target.closest('[data-segar]')) muat(el, true); });
    },
    tampil(el) { return muat(el, false); }
  });
  function muat(el, paksa) {
    return swr('dash', 'dash.ringkas', paksa ? { _fresh: true } : {}, (d) => renderDash(el, d), { fresh: paksa ? 0 : 30000, force: paksa });
  }
  function donut(data) {
    const warna = { PG: '#1E3A8A', PGK_MCMA: '#0D9488', PGK_KATEGORI: '#F59E0B', ISIAN: '#7C3AED', JODOH: '#0284C7', URAIAN: '#DC2626' };
    const tot = Object.values(data).reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    const r = 15.915, segs = Object.keys(data).map((k) => { const p = data[k] / tot * 100, s = '<circle r="' + r + '" cx="21" cy="21" fill="none" stroke="' + (warna[k] || '#94A3B8') + '" stroke-width="6" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + (25 - acc) + '"/>'; acc += p; return s; }).join('');
    return '<div class="donat"><svg viewBox="0 0 42 42" width="150" height="150" role="img" aria-label="Komposisi bentuk soal"><circle r="' + r + '" cx="21" cy="21" fill="none" stroke="var(--surface-2)" stroke-width="6"/>' + segs +
      '<text x="21" y="21" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor">' + fmt.angka(tot === 1 && !Object.keys(data).length ? 0 : tot, 0) + '</text><text x="21" y="27" text-anchor="middle" font-size="3" fill="var(--muted)">butir</text></svg>' +
      '<div>' + Object.keys(data).sort((a, b) => data[b] - data[a]).map((k) => '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px"><span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + (warna[k] || '#94A3B8') + ';margin-right:8px"></span>' + esc(BENTUK_LABEL[k] || k) + '</span><b class="mono">' + data[k] + '</b></div>').join('') + '</div></div>';
  }
  function renderDash(el, d) {
    const ps = d.perStatus || {}, review = (ps.draft || 0) + (ps.bermasalah || 0) + (ps.ditinjau || 0);
    Admin.badge('review', review); Admin.badge('pembahasan', d.bahasMenunggu || 0);
    const maks = Math.max(1, ...Object.values(d.perMapel || {}).map((m) => m.total));
    const perKomp = Object.keys(d.perKomp || {}).map((k) => ({ k, n: d.perKomp[k] })).sort((a, b) => b.n - a.n).slice(0, 8);
    $('#dash-isi', el).innerHTML =
      '<div class="kisi k4"><div class="kartu stat"><div class="lab">Total butir soal</div><div class="ang">' + fmt.angka(d.total, 0) + '<small>' + fmt.angka(ps.disetujui || 0, 0) + ' disetujui</small></div>' + bar(d.total ? (ps.disetujui || 0) / d.total * 100 : 0, 'ok') + '</div>' +
      '<a class="kartu stat ' + (review ? 'waspada' : '') + '" href="#/admin/review" style="text-decoration:none;color:inherit"><div class="lab">Menunggu review</div><div class="ang">' + review + '<small>' + (ps.bermasalah || 0) + ' bermasalah</small></div>' + bar(d.total ? review / d.total * 100 : 0, 'warn') + '</a>' +
      '<a class="kartu stat" href="#/admin/pembahasan" style="text-decoration:none;color:inherit"><div class="lab">Pembahasan menunggu persetujuan</div><div class="ang">' + (d.bahasMenunggu || 0) + '<small>' + (d.tanpaBahas || 0) + ' soal belum ada</small></div>' + (d.kunciBeda ? '<div class="kecil" style="color:var(--bad-ink);margin-top:10px">' + d.kunciBeda + ' kunci berbeda dengan AI</div>' : bar(0)) + '</a>' +
      '<a class="kartu stat" href="#/admin/monitoring" style="text-decoration:none;color:inherit"><div class="lab">Try out aktif</div><div class="ang">' + (d.paketAktif || []).length + '<small>' + d.jumlahSiswa + ' siswa terdaftar</small></div><div class="kecil muted" style="margin-top:10px">' + ((d.paketAktif || []).map((p) => esc(p.nama)).slice(0, 2).join(', ') || 'Tidak ada paket aktif') + '</div></a></div>' +
      '<div class="kisi k84" style="margin-top:16px"><section class="kartu"><div class="kartu-kepala"><div><h2>Bank soal per mapel</h2><p>Status setiap butir</p></div><div class="legenda"><span style="--c:var(--ok)">Disetujui</span><span style="--c:var(--info)">Ditinjau</span><span style="--c:#F59E0B">Bermasalah</span><span style="--c:var(--line-2)">Draft</span></div></div>' +
      (Object.keys(d.perMapel || {}).length ? Object.keys(d.perMapel).map((m) => { const x = d.perMapel[m], w = (n) => (n || 0) / maks * 100;
        return '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px"><b>' + esc(m) + '</b><span class="mono">' + x.total + '</span></div><div class="bar" style="height:14px"><i class="ok" style="width:' + w(x.disetujui) + '%"></i><i class="info" style="width:' + w(x.ditinjau) + '%"></i><i class="warn" style="width:' + w(x.bermasalah) + '%"></i><i class="abu" style="width:' + w(x.draft) + '%"></i></div></div>'; }).join('')
        : '<div class="kosong"><strong>Bank soal masih kosong</strong>Mulai dari menu Unggah &amp; Ekstraksi atau buat soal manual.</div>') + '</section>' +
      '<section class="kartu"><div class="kartu-kepala"><h2>Komposisi bentuk soal</h2></div>' + donut(d.perBentuk || {}) + '</section></div>' +
      '<div class="kisi k84" style="margin-top:16px"><section class="kartu"><div class="kartu-kepala"><div><h2>Unggahan terbaru</h2><p>Progres ekstraksi AI per berkas</p></div><a class="btn kecil" href="#/admin/unggah">' + ik('unggah') + 'Unggah</a></div>' +
      ((d.jobs || []).length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Job</th><th>Berkas</th><th>Mapel</th><th class="angka">Halaman</th><th class="angka">Soal</th><th>Status</th></tr></thead><tbody>' +
        d.jobs.map((j) => '<tr><td class="chip-id">' + esc(j.id) + '</td><td>' + esc(j.nama) + '<div class="kecil muted">' + fmt.lalu(j.tgl) + '</div></td><td>' + esc(j.mapel) + '</td><td class="angka">' + j.selesai + '/' + (j.total || '?') + '</td><td class="angka">' + j.soal + (j.masalah ? ' <span class="kecil" style="color:var(--warn-ink)">(' + j.masalah + '!)</span>' : '') + '</td><td>' + Admin.status(j.status) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="kosong">Belum ada berkas diunggah.</div>') + '</section>' +
      '<section class="kartu"><div class="kartu-kepala"><h2>Soal per kompetensi</h2></div>' + (perKomp.length ? perKomp.map((x) => '<div class="hbar" style="grid-template-columns:1fr 64px"><span>' + esc(Admin.namaKomp(x.k)) + '</span><span class="nil">' + x.n + '</span></div>').join('') : '<p class="muted kecil">Belum ada data.</p>') + '</section></div>' +
      '<p class="kecil muted" style="margin-top:14px">Diperbarui ' + fmt.lalu(d.dibuat) + (d.cached ? ' · dari cache server' : '') + '.</p>';
  }

  // ============================================================ KOMPETENSI
  Admin.daftar('kompetensi', {
    judul: 'Kompetensi', ikon: 'komp', grup: 'Manajemen soal',
    render(el) {
      el.innerHTML = Admin.kepala('Master kompetensi', 'Daftar kompetensi dan sub kompetensi yang dipakai AI dan kisi-kisi paket.',
        Admin.sa() ? '<button class="btn" data-k="impor">' + ik('unggah') + 'Impor Excel</button><button class="btn utama" data-k="tambah">' + ik('tambah') + 'Kompetensi</button>' : '') +
        '<div class="tab" id="k-tab"></div><div id="k-isi"></div>';
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-k]');
        if (!b) return;
        const a = b.dataset.k, id = b.dataset.id;
        if (a === 'mapel') { el.dataset.mapel = b.dataset.v; renderKomp(el); }
        if (a === 'tambah' || a === 'edit') formKomp(el, a === 'edit' ? Admin.b().master.komp.find((k) => k.id === id) : { mapel: el.dataset.mapel });
        if (a === 'sub' || a === 'esub') formSub(el, b.dataset.idk, a === 'esub' ? Admin.b().master.sub.find((s) => s.id === id) : null);
        if (a === 'hapus' && await konfirmasi('Hapus kompetensi ini beserta sub kompetensinya?', { bahaya: true, ya: 'Hapus' })) simpanMaster(el, 'master.hapusKomp', { id });
        if (a === 'hsub' && await konfirmasi('Hapus sub kompetensi ini?', { bahaya: true, ya: 'Hapus' })) simpanMaster(el, 'master.hapusSub', { id });
        if (a === 'impor') imporKomp(el);
      });
      Admin.on('boot', () => renderKomp(el));
    },
    tampil(el) { renderKomp(el); }
  });
  function renderKomp(el) {
    const b = Admin.b(), mapel = b.mapel;
    if (!el.dataset.mapel || mapel.indexOf(el.dataset.mapel) < 0) el.dataset.mapel = mapel[0] || '';
    $('#k-tab', el).innerHTML = mapel.map((m) => '<button data-k="mapel" data-v="' + esc(m) + '" class="' + (m === el.dataset.mapel ? 'aktif' : '') + '">' + esc(m) + '<span class="hit">' + Admin.kompMapel(m).length + '</span></button>').join('');
    const list = Admin.kompMapel(el.dataset.mapel), sa = Admin.sa();
    $('#k-isi', el).innerHTML = list.length ? '<div class="kisi k2">' + list.map((k) => '<article class="kartu"><div class="kartu-kepala"><div><span class="chip-id">' + esc(k.kode) + '</span><h3 style="margin-top:4px">' + esc(k.nama) + '</h3></div>' +
      (sa ? '<div><button class="btn kecil ikon hantu" data-k="edit" data-id="' + k.id + '" aria-label="Ubah">' + ik('pensil') + '</button><button class="btn kecil ikon hantu" data-k="hapus" data-id="' + k.id + '" aria-label="Hapus">' + ik('hapus') + '</button></div>' : '') + '</div>' +
      Admin.subKomp(k.id).map((s) => '<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);font-size:14px"><span class="chip-id" style="min-width:96px">' + esc(s.kode) + '</span><span style="flex:1">' + esc(s.nama) + '</span>' +
        (sa ? '<button class="btn kecil ikon hantu" data-k="esub" data-idk="' + k.id + '" data-id="' + s.id + '">' + ik('pensil') + '</button><button class="btn kecil ikon hantu" data-k="hsub" data-id="' + s.id + '">' + ik('hapus') + '</button>' : '') + '</div>').join('') +
      (sa ? '<button class="btn kecil" data-k="sub" data-idk="' + k.id + '" style="margin-top:8px">' + ik('tambah') + 'Sub kompetensi</button>' : '') + '</article>').join('') + '</div>'
      : '<div class="kartu kosong"><strong>Belum ada kompetensi untuk ' + esc(el.dataset.mapel) + '</strong>' + (sa ? 'Tambahkan agar AI bisa memetakan soal ke kompetensi.' : 'Minta Super Admin menambahkannya.') + '</div>';
  }
  async function simpanMaster(el, aksi, data) {
    const r = await api(aksi, data);
    toast(r.message, r.success ? 'ok' : 'err');
    if (r.success) { await Admin.segarBoot(true); renderKomp(el); }
    return r.success;
  }
  function formKomp(el, k) {
    modal({ judul: k && k.id ? 'Ubah kompetensi' : 'Tambah kompetensi', isi: field('Mapel', '<select class="inp" id="f-mapel">' + opsi(Admin.b().mapel, k.mapel) + '</select>') +
      '<div class="baris dua">' + field('Kode', '<input class="inp mono" id="f-kode" value="' + esc(k.kode || '') + '" placeholder="NUM-GEO">') + field('Nama kompetensi', '<input class="inp" id="f-nama" value="' + esc(k.nama || '') + '">') + '</div>',
      tombol: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'utama', aksi: (m) => simpanMaster(el, 'master.simpanKomp', { id: k.id, mapel: $('#f-mapel', m).value, kode: $('#f-kode', m).value, nama: $('#f-nama', m).value }).then((ok) => ok || false) }] });
  }
  function formSub(el, idk, s) {
    s = s || {};
    modal({ judul: s.id ? 'Ubah sub kompetensi' : 'Tambah sub kompetensi', isi: '<p class="muted" style="margin-top:0">' + esc(Admin.namaKomp(idk)) + '</p><div class="baris dua">' + field('Kode', '<input class="inp mono" id="f-kode" value="' + esc(s.kode || Admin.kodeKomp(idk) + '-') + '">') + field('Nama sub kompetensi', '<input class="inp" id="f-nama" value="' + esc(s.nama || '') + '">') + '</div>',
      tombol: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'utama', aksi: (m) => simpanMaster(el, 'master.simpanSub', { id: s.id, idk, kode: $('#f-kode', m).value, nama: $('#f-nama', m).value }).then((ok) => ok || false) }] });
  }
  function imporKomp(el) {
    modal({ judul: 'Impor kompetensi dari Excel', ukuran: 'lg', isi: '<p>Kolom wajib: <span class="mono">mapel, kode, nama_kompetensi</span>. Opsional: <span class="mono">sub_kode, nama_sub</span> (satu baris per sub kompetensi; kompetensi yang sama boleh berulang).</p>' +
      '<button class="btn kecil" id="k-templat">' + ik('unduh') + 'Unduh templat</button><input type="file" class="inp" id="k-file" accept=".xlsx,.xls,.csv" style="margin-top:12px"><p id="k-info" class="kecil muted"></p>',
      tombol: [{ label: 'Batal' }, { label: 'Impor', kelas: 'utama', aksi: async (m) => {
        const f = $('#k-file', m).files[0];
        if (!f) { toast('Pilih berkas dulu.', 'warn'); return false; }
        const X = await Lib.xlsx(), wb = X.read(await f.arrayBuffer());
        const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }).map((r) => { const o = {}; Object.keys(r).forEach((k) => { o[k.trim().toLowerCase().replace(/\s+/g, '_')] = r[k]; }); return o; });
        return simpanMaster(el, 'master.impor', { rows }).then((ok) => ok || false);
      } }] }).el.querySelector('#k-templat').onclick = async () => {
      const X = await Lib.xlsx(), wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['mapel', 'kode', 'nama_kompetensi', 'sub_kode', 'nama_sub'], ['Matematika', 'NUM-GEO', 'Geometri dan Pengukuran', 'NUM-GEO-01', 'Bangun datar']]), 'Kompetensi');
      X.writeFile(wb, 'templat-kompetensi.xlsx');
    };
  }

  // ============================================================ AKUN
  Admin.daftar('akun', {
    judul: 'Akun guru & siswa', ikon: 'akun', grup: 'Administrasi', peran: SA,
    render(el) {
      el.innerHTML = Admin.kepala('Akun', 'Kelola akun guru, Super Admin, dan siswa.', '') +
        '<div class="tab"><button class="aktif" data-tab="siswa">Siswa <span class="hit" id="n-siswa">0</span></button><button data-tab="guru">Guru &amp; admin <span class="hit" id="n-guru">0</span></button></div>' +
        '<div data-panel="siswa"><div class="saring"><input class="inp cari" id="a-cari" placeholder="Cari NIS atau nama…"><select class="inp" id="a-kelas"></select>' +
        '<button class="btn" data-a="impor">' + ik('unggah') + 'Impor Excel</button><button class="btn utama" data-a="tambahSiswa">' + ik('tambah') + 'Siswa</button></div>' +
        '<div class="aksi-massal" id="a-massal" hidden><strong id="a-npilih"></strong><button class="btn kecil" data-a="resetPilih">' + ik('kunci') + 'Reset sandi</button><button class="btn kecil" data-a="nonaktif">Nonaktifkan</button><button class="btn kecil" data-a="aktifkan">Aktifkan</button><button class="btn kecil bahaya" data-a="hapusPilih">' + ik('hapus') + 'Hapus</button></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="cek-sel"><input type="checkbox" id="a-semua" aria-label="Pilih semua"></th><th>NIS</th><th>Nama</th><th>Kelas</th><th>L/P</th><th>Tanggal lahir</th><th>Status</th><th></th></tr></thead><tbody id="a-siswa"></tbody></table></div><div class="halaman-nav" id="a-hal"></div></div>' +
        '<div data-panel="guru" hidden><div class="saring"><span style="flex:1"></span><button class="btn utama" data-a="tambahGuru">' + ik('tambah') + 'Akun guru/admin</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Mapel</th><th>Login terakhir</th><th>Status</th><th></th></tr></thead><tbody id="a-guru"></tbody></table></div></div>';
      el.dataset.hal = 0;
      el.pilih = new Set();
      el.addEventListener('click', (e) => aksiAkun(el, e));
      el.addEventListener('change', (e) => {
        if (e.target.id === 'a-semua') { $$('#a-siswa input[data-nis]', el).forEach((c) => { c.checked = e.target.checked; c.checked ? el.pilih.add(c.dataset.nis) : el.pilih.delete(c.dataset.nis); }); massal(el); }
        if (e.target.dataset.nis) { e.target.checked ? el.pilih.add(e.target.dataset.nis) : el.pilih.delete(e.target.dataset.nis); massal(el); }
        if (e.target.id === 'a-kelas') { el.dataset.hal = 0; tabelSiswa(el); }
      });
      $('#a-cari', el).addEventListener('input', debounce(() => { el.dataset.hal = 0; tabelSiswa(el); }, 250));
    },
    tampil(el) { return muatAkun(el); }
  });
  function muatAkun(el, paksa) { return swr('akun', 'akun.daftar', {}, (d) => { el.data = d; renderAkun(el); }, { fresh: paksa ? 0 : 30000 }); }
  function massal(el) { $('#a-massal', el).hidden = !el.pilih.size; $('#a-npilih', el).textContent = el.pilih.size + ' siswa dipilih'; }
  function renderAkun(el) {
    const d = el.data;
    $('#n-siswa', el).textContent = d.siswa.length; $('#n-guru', el).textContent = d.pengguna.length;
    const kelas = Array.from(new Set(d.siswa.map((s) => s.kelas))).sort();
    const sel = $('#a-kelas', el), v = sel.value;
    sel.innerHTML = opsi(kelas, v, 'Semua kelas');
    tabelSiswa(el);
    $('#a-guru', el).innerHTML = d.pengguna.map((p) => '<tr><td><b>' + esc(p.nama) + '</b></td><td>' + esc(p.email) + '</td><td>' + (p.role === 'superadmin' ? lencana('Super Admin', 'navy') : lencana('Guru', 'polos')) + '</td><td>' + esc(p.mapel || (p.role === 'superadmin' ? 'Semua' : '—')) + '</td><td class="kecil">' + fmt.lalu(p.login) + '</td><td>' + Admin.status(p.status) + '</td>' +
      '<td style="white-space:nowrap"><button class="btn kecil" data-a="ubahGuru" data-id="' + esc(p.id) + '">Ubah</button> <button class="btn kecil" data-a="resetGuru" data-id="' + esc(p.id) + '">Reset sandi</button> <button class="btn kecil ikon hantu" data-a="hapusGuru" data-id="' + esc(p.id) + '">' + ik('hapus') + '</button></td></tr>').join('');
  }
  function tabelSiswa(el) {
    const d = el.data;
    if (!d) return;
    const q = $('#a-cari', el).value.toLowerCase(), k = $('#a-kelas', el).value;
    const list = d.siswa.filter((s) => (!k || s.kelas === k) && (!q || s.nama.toLowerCase().indexOf(q) >= 0 || s.NIS.indexOf(q) >= 0));
    const per = 50, hal = Math.min(+el.dataset.hal, Math.max(0, Math.ceil(list.length / per) - 1));
    $('#a-siswa', el).innerHTML = list.slice(hal * per, hal * per + per).map((s) => '<tr><td><input type="checkbox" data-nis="' + esc(s.NIS) + '"' + (el.pilih.has(s.NIS) ? ' checked' : '') + '></td><td class="mono">' + esc(s.NIS) + '</td><td>' + esc(s.nama) + '</td><td>' + esc(s.kelas) + '</td><td>' + esc(s.jk || '') + '</td><td>' + esc(s.tgl ? fmt.tgl(s.tgl, false) : '—') + '</td><td>' + Admin.status(s.status) + '</td>' +
      '<td><button class="btn kecil" data-a="ubahSiswa" data-nis="' + esc(s.NIS) + '">Ubah</button></td></tr>').join('') || '<tr><td colspan="8" class="kosong"><strong>Belum ada siswa</strong>Impor dari Excel untuk menambahkan satu angkatan sekaligus.</td></tr>';
    const n = Math.ceil(list.length / per);
    $('#a-hal', el).innerHTML = n > 1 ? '<span class="kecil muted">' + list.length + ' siswa</span>' + Array.from({ length: n }, (_, i) => '<button class="btn kecil ' + (i === hal ? 'utama' : '') + '" data-a="hal" data-i="' + i + '">' + (i + 1) + '</button>').join('') : '<span class="kecil muted">' + list.length + ' siswa</span>';
  }
  async function aksiAkun(el, e) {
    const tab = e.target.closest('[data-tab]');
    if (tab) { $$('[data-tab]', el).forEach((b) => b.classList.toggle('aktif', b === tab)); $$('[data-panel]', el).forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; }); return; }
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a, d = el.data;
    const segar = () => { basi('akun'); muatAkun(el, true); };
    if (a === 'hal') { el.dataset.hal = b.dataset.i; tabelSiswa(el); }
    if (a === 'tambahSiswa' || a === 'ubahSiswa') {
      const s = a === 'ubahSiswa' ? d.siswa.find((x) => x.NIS === b.dataset.nis) : { status: 'aktif' };
      modal({ judul: s.NIS ? 'Ubah data siswa' : 'Tambah siswa', isi: '<div class="baris dua">' + field('NIS', '<input class="inp mono" id="s-nis" value="' + esc(s.NIS || '') + '"' + (s.NIS ? ' readonly' : '') + '>') + field('Nama lengkap', '<input class="inp" id="s-nama" value="' + esc(s.nama || '') + '">') +
        field('Kelas', '<input class="inp" id="s-kelas" value="' + esc(s.kelas || '') + '" list="dl-kelas"><datalist id="dl-kelas">' + Admin.b().kelas.map((k) => '<option value="' + esc(k) + '">').join('') + '</datalist>') +
        field('Jenis kelamin', '<select class="inp" id="s-jk">' + opsi([{ v: 'L', l: 'Laki-laki' }, { v: 'P', l: 'Perempuan' }], s.jk) + '</select>') + field('Tanggal lahir', '<input class="inp" type="date" id="s-tgl" value="' + esc(s.tgl || '') + '">') +
        field('Status', '<select class="inp" id="s-status">' + opsi([{ v: 'aktif', l: 'Aktif' }, { v: 'nonaktif', l: 'Nonaktif' }], s.status) + '</select>') + '</div>',
        tombol: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'utama', aksi: async (m) => {
          const r = await api('akun.simpanSiswa', { baru: !s.NIS, NIS: $('#s-nis', m).value, nama: $('#s-nama', m).value, kelas: $('#s-kelas', m).value, jk: $('#s-jk', m).value, tgl: $('#s-tgl', m).value, status: $('#s-status', m).value });
          toast(r.message, r.success ? 'ok' : 'err');
          if (!r.success) return false;
          segar();
          if (r.data.sandi) setTimeout(() => Admin.sandiSekali('Kata sandi siswa baru', [{ NIS: r.data.NIS, nama: $('#s-nama', m).value, kelas: $('#s-kelas', m).value, password: r.data.sandi }]), 50);
        } }] });
    }
    if (a === 'impor') imporSiswa(el, segar);
    if (a === 'resetPilih' && await konfirmasi('Buat kata sandi baru untuk ' + el.pilih.size + ' siswa? Sandi lama tidak berlaku lagi.', { ya: 'Reset' })) {
      const r = await api('akun.resetSandi', { tipe: 'siswa', nis: Array.from(el.pilih) });
      if (r.success) { el.pilih.clear(); massal(el); Admin.sandiSekali('Kata sandi baru', r.data.sandi); } else toast(r.message, 'err');
    }
    if (a === 'nonaktif' || a === 'aktifkan') {
      for (const nis of el.pilih) { const s = d.siswa.find((x) => x.NIS === nis); if (s) await api('akun.simpanSiswa', { NIS: s.NIS, nama: s.nama, kelas: s.kelas, jk: s.jk, tgl: s.tgl, status: a === 'nonaktif' ? 'nonaktif' : 'aktif' }); }
      toast('Status ' + el.pilih.size + ' siswa diperbarui.', 'ok'); el.pilih.clear(); massal(el); segar();
    }
    if (a === 'hapusPilih' && await konfirmasi('Hapus ' + el.pilih.size + ' siswa? Riwayat try out mereka tetap tersimpan.', { bahaya: true, ya: 'Hapus' })) {
      const r = await api('akun.hapusSiswa', { nis: Array.from(el.pilih) });
      toast(r.message, r.success ? 'ok' : 'err'); el.pilih.clear(); massal(el); segar();
    }
    if (a === 'tambahGuru' || a === 'ubahGuru') {
      const p = a === 'ubahGuru' ? d.pengguna.find((x) => x.id === b.dataset.id) : { role: 'guru', status: 'aktif', mapel: '' };
      const mp = String(p.mapel || '').split(',');
      modal({ judul: p.id ? 'Ubah akun' : 'Tambah akun guru/admin', isi: '<div class="baris dua">' + field('Nama', '<input class="inp" id="g-nama" value="' + esc(p.nama || '') + '">') + field('Email', '<input class="inp" id="g-email" type="email" value="' + esc(p.email || '') + '">') +
        field('Peran', '<select class="inp" id="g-role">' + opsi([{ v: 'guru', l: 'Guru mapel' }, { v: 'superadmin', l: 'Super Admin' }], p.role) + '</select>') + field('Status', '<select class="inp" id="g-status">' + opsi([{ v: 'aktif', l: 'Aktif' }, { v: 'nonaktif', l: 'Nonaktif' }], p.status) + '</select>') + '</div>' +
        '<div class="lbl" style="margin-bottom:6px">Mapel yang dikelola (guru)</div><div class="baris">' + Admin.b().mapel.map((m) => '<label class="cek"><input type="checkbox" class="g-mapel" value="' + esc(m) + '"' + (mp.indexOf(m) >= 0 ? ' checked' : '') + '>' + esc(m) + '</label>').join('') + '</div>',
        tombol: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'utama', aksi: async (m) => {
          const r = await api('akun.simpanPengguna', { id: p.id, nama: $('#g-nama', m).value, email: $('#g-email', m).value, role: $('#g-role', m).value, status: $('#g-status', m).value, mapel: $$('.g-mapel:checked', m).map((x) => x.value) });
          toast(r.message, r.success ? 'ok' : 'err');
          if (!r.success) return false;
          segar();
          if (r.data.sandi) setTimeout(() => Admin.sandiSekali('Kata sandi sementara', [{ id: $('#g-email', m).value, nama: $('#g-nama', m).value, password: r.data.sandi }]), 50);
        } }] });
    }
    if (a === 'resetGuru' && await konfirmasi('Buat kata sandi sementara baru untuk akun ini? Semua sesinya akan berakhir.', { ya: 'Reset' })) {
      const r = await api('akun.resetSandi', { tipe: 'pengguna', id: b.dataset.id });
      if (r.success) Admin.sandiSekali('Kata sandi sementara', r.data.sandi); else toast(r.message, 'err');
    }
    if (a === 'hapusGuru' && await konfirmasi('Hapus akun ini?', { bahaya: true, ya: 'Hapus' })) { const r = await api('akun.hapusPengguna', { id: b.dataset.id }); toast(r.message, r.success ? 'ok' : 'err'); segar(); }
  }
  function imporSiswa(el, segar) {
    const m = modal({ judul: 'Impor siswa dari Excel', ukuran: 'lg', isi: '<p style="margin-top:0">Kolom: <span class="mono">NIS, nama, kelas, jenis_kelamin (L/P), tanggal_lahir</span>, opsional <span class="mono">password</span>. Format kolom NIS sebagai <b>Teks</b> di Excel agar angka 0 di depan tidak hilang.</p>' +
      '<button class="btn kecil" id="i-templat">' + ik('unduh') + 'Unduh templat</button>' + field('Berkas Excel/CSV', '<input type="file" class="inp" id="i-file" accept=".xlsx,.xls,.csv">') +
      '<label class="cek"><input type="checkbox" id="i-timpa">Perbarui nama/kelas siswa yang NIS-nya sudah ada</label><div id="i-pratinjau" class="kecil muted" style="margin-top:10px"></div>',
      tombol: [{ label: 'Batal' }, { label: 'Impor sekarang', kelas: 'utama', aksi: async (mm) => {
        if (!m.rows || !m.rows.length) { toast('Pilih berkas yang berisi data siswa.', 'warn'); return false; }
        const r = await api('akun.imporSiswa', { rows: m.rows, timpa: $('#i-timpa', mm).checked });
        toast(r.message, r.success ? 'ok' : 'err');
        if (!r.success) return false;
        segar();
        if (r.data.peringatan.length) toast(r.data.peringatan.slice(0, 3).join(' '), 'warn', 8000);
        if (r.data.sandi.length) setTimeout(() => Admin.sandiSekali('Kartu login siswa baru (' + r.data.sandi.length + ')', r.data.sandi), 50);
      } }] });
    $('#i-templat', m.el).onclick = async () => { const X = await Lib.xlsx(), ws = X.utils.aoa_to_sheet([['NIS', 'nama', 'kelas', 'jenis_kelamin', 'tanggal_lahir'], ['0012345', 'Ahmad Fauzi', 'IX-A', 'L', '2011-08-14']]); ws['A2'].t = 's'; const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Siswa'); X.writeFile(wb, 'templat-siswa.xlsx'); };
    $('#i-file', m.el).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const X = await Lib.xlsx(), wb = X.read(await f.arrayBuffer(), { cellDates: true });
      m.rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false, dateNF: 'yyyy-mm-dd' }).map((r) => { const o = {}; Object.keys(r).forEach((k) => { const kk = k.trim().toLowerCase().replace(/\s+/g, '_'); o[kk === 'nis' ? 'NIS' : kk] = String(r[k]).trim(); }); return o; });
      const kelas = new Set(m.rows.map((r) => r.kelas));
      $('#i-pratinjau', m.el).innerHTML = '<b>' + m.rows.length + '</b> baris terbaca dari ' + kelas.size + ' kelas. Contoh: ' + esc(m.rows.slice(0, 3).map((r) => r.NIS + ' ' + r.nama).join('; '));
    };
  }

  // ============================================================ PENGATURAN
  Admin.daftar('pengaturan', {
    judul: 'Pengaturan', ikon: 'set', grup: 'Administrasi', peran: SA,
    render(el) {
      const s = Admin.b().set;
      const bent = String(s.BENTUK_AKTIF || '').split(',');
      el.innerHTML = Admin.kepala('Pengaturan sistem', 'Identitas sekolah, ekstraksi AI, penilaian, dan aturan ujian.', '<button class="btn utama" data-p="simpan">' + ik('cek') + 'Simpan pengaturan</button>') +
        '<div class="kisi k2"><section class="kartu"><div class="kartu-kepala"><h2>Identitas sekolah</h2></div>' +
        field('Nama sekolah', '<input class="inp" data-set="NAMA_SEKOLAH" value="' + esc(s.NAMA_SEKOLAH) + '">') + field('Nama aplikasi', '<input class="inp" data-set="NAMA_APP" value="' + esc(s.NAMA_APP) + '">') +
        '<div class="baris dua">' + field('Tahun ajaran', '<input class="inp" data-set="TAHUN_AJARAN" value="' + esc(s.TAHUN_AJARAN) + '">') + field('Logo sekolah', '<input type="file" class="inp" accept="image/png,image/jpeg" id="p-logo">', s.LOGO_ID ? 'Logo sudah terpasang.' : 'PNG/JPG persegi.') + '</div>' +
        field('Alamat aplikasi (URL GitHub Pages)', '<input class="inp" data-set="FRONTEND_URL" value="' + esc(s.FRONTEND_URL || (location.origin + location.pathname)) + '">', 'Dipakai pada QR verifikasi dokumen.') +
        field('Daftar mapel', '<input class="inp" data-set="MAPEL" value="' + esc(s.MAPEL) + '">', 'Pisahkan dengan koma.') + '</section>' +
        '<section class="kartu"><div class="kartu-kepala"><h2>Ekstraksi AI (Gemini)</h2><span id="p-ai"></span></div>' +
        field('Kunci API Gemini', '<div style="display:flex;gap:8px"><input class="inp" type="password" id="p-kunci" autocomplete="off" placeholder="Belum diisi"><button class="btn" data-p="kunci">Simpan kunci</button></div>', 'Disimpan di Script Properties server, tidak pernah dikirim balik utuh.') +
        field('Model', '<div style="display:flex;gap:8px"><input class="inp mono" id="p-model" value="' + esc(Admin.b().ai.model) + '"><button class="btn" data-p="model">Simpan</button></div>', 'Bawaan: gemini-flash-latest (selalu mengikuti versi Flash terbaru).') +
        field('Mode ekstraksi bawaan', '<div class="radio-kartu"><label><input type="radio" name="mode" data-set="MODE_EKSTRAK" value="review"' + (s.MODE_EKSTRAK !== 'otomatis' ? ' checked' : '') + '><span><b>Review manual</b><br><span class="kecil muted">Semua soal masuk antrean review guru.</span></span></label>' +
          '<label><input type="radio" name="mode" data-set="MODE_EKSTRAK" value="otomatis"' + (s.MODE_EKSTRAK === 'otomatis' ? ' checked' : '') + '><span><b>Otomatis penuh</b><br><span class="kecil muted">Soal tanpa masalah langsung disetujui.</span></span></label></div>') +
        '<div class="baris dua">' + field('Ambang keyakinan AI (%)', '<input class="inp" type="number" min="50" max="99" data-set="AMBANG_YAKIN" value="' + esc(s.AMBANG_YAKIN) + '">', 'Di bawahnya → bermasalah.') +
        field('Gaya bahasa pembahasan', '<select class="inp" data-set="GAYA_PEMBAHASAN">' + opsi([{ v: 'sederhana', l: 'Sederhana, ramah siswa' }, { v: 'formal', l: 'Baku & ringkas' }, { v: 'rinci', l: 'Sangat rinci' }], s.GAYA_PEMBAHASAN) + '</select>') + '</div></section>' +
        '<section class="kartu"><div class="kartu-kepala"><h2>Bentuk soal & penilaian</h2></div><div class="lbl" style="margin-bottom:8px">Bentuk soal aktif</div><div class="baris" style="margin-bottom:14px">' +
        Object.keys(BENTUK_LABEL).map((k) => '<label class="cek"><input type="checkbox" class="p-bentuk" value="' + k + '"' + (bent.indexOf(k) >= 0 ? ' checked' : '') + '>' + esc(BENTUK_LABEL[k]) + '</label>').join('') + '</div>' +
        '<div class="baris dua">' + field('Ambang penguasaan kompetensi (%)', '<input class="inp" type="number" min="40" max="100" data-set="AMBANG_KUASA" value="' + esc(s.AMBANG_KUASA) + '">') +
        field('Penilaian PGK', '<select class="inp" data-set="MODE_PGK">' + opsi([{ v: 'parsial', l: 'Parsial (proporsional)' }, { v: 'penuh', l: 'Penuh (semua harus benar)' }], s.MODE_PGK) + '</select>') + '</div></section>' +
        '<section class="kartu"><div class="kartu-kepala"><h2>Aturan ujian</h2></div><div class="baris dua">' +
        field('Batas pindah tab/aplikasi', '<input class="inp" type="number" min="1" max="20" data-set="PINDAH_TAB_BATAS" value="' + esc(s.PINDAH_TAB_BATAS) + '">') +
        field('Bila batas terlampaui', '<select class="inp" data-set="PINDAH_TAB_AKSI">' + opsi([{ v: 'catat', l: 'Catat & laporkan ke pengawas' }, { v: 'paksa_selesai', l: 'Kumpulkan otomatis' }], s.PINDAH_TAB_AKSI) + '</select>') +
        field('Cek tanggal lahir saat konfirmasi', '<select class="inp" data-set="CEK_TGL_LAHIR">' + opsi([{ v: 'ya', l: 'Ya' }, { v: 'tidak', l: 'Tidak' }], s.CEK_TGL_LAHIR) + '</select>') +
        field('Tampilkan nilai ke siswa setelah selesai', '<select class="inp" data-set="TAMPIL_NILAI">' + opsi([{ v: 'ya', l: 'Ya' }, { v: 'tidak', l: 'Tidak (diumumkan guru)' }], s.TAMPIL_NILAI) + '</select>') + '</div></section></div>' +
        '<section class="kartu" style="margin-top:16px"><div class="kartu-kepala"><div><h2>Status sistem</h2><p>Cache server, pemicu, dan kuota.</p></div><div><button class="btn kecil" data-p="status">' + ik('segar') + 'Periksa</button> <button class="btn kecil" data-p="cache">Bangun ulang cache</button></div></div><div id="p-status" class="kecil muted">Tekan Periksa.</div></section>';
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-p]');
        if (!b) return;
        const a = b.dataset.p;
        if (a === 'simpan') {
          const items = {};
          $$('[data-set]', el).forEach((x) => { if (x.type === 'radio' && !x.checked) return; items[x.dataset.set] = x.value; });
          items.BENTUK_AKTIF = $$('.p-bentuk:checked', el).map((x) => x.value).join(',');
          const f = $('#p-logo', el).files[0];
          sibuk(b, true);
          if (f) { const g = await gambarKecil(f, 512, 0.9); const r = await api('media.unggah', { b64: g.b64, mime: g.mime, nama: 'logo', jenis: 'logo' }); if (r.success) items.LOGO_ID = r.data.id; else toast(r.message, 'err'); }
          const r = await api('set.simpan', { items });
          sibuk(b, false);
          toast(r.message, r.success ? 'ok' : 'err');
          if (r.success) { await Admin.segarBoot(true); Publik.segarMerek(); }
        }
        if (a === 'kunci' || a === 'model') {
          const v = a === 'kunci' ? $('#p-kunci', el).value : $('#p-model', el).value;
          const r = await api('rahasia.simpan', { kunci: a === 'kunci' ? 'GEMINI_API_KEY' : 'GEMINI_MODEL', nilai: v });
          toast(r.message, r.success ? 'ok' : 'err');
          if (r.success && a === 'kunci') { $('#p-kunci', el).value = ''; $('#p-kunci', el).placeholder = r.data.samar; $('#p-ai', el).innerHTML = lencana('Kunci terpasang', 'ok'); Admin.b().ai.ada = true; }
        }
        if (a === 'status') statusSistem(el);
        if (a === 'cache') { const r = await api('sistem.segarkan', {}); toast(r.message, r.success ? 'ok' : 'err'); statusSistem(el); }
      });
    },
    tampil(el) { $('#p-ai', el).innerHTML = Admin.b().ai.ada ? lencana('Kunci terpasang', 'ok') : lencana('Kunci belum diisi', 'warn'); }
  });
  async function statusSistem(el) {
    const box = $('#p-status', el);
    box.innerHTML = '<div class="memuat">Memeriksa…</div>';
    const r = await api('sistem.status', {});
    if (!r.success) { box.textContent = r.message; return; }
    const d = r.data, c = d.cache, row = (k, v) => '<tr><td class="muted">' + k + '</td><td>' + v + '</td></tr>';
    box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><tbody>' + row('Versi backend', '<span class="mono">' + esc(d.versi) + '</span>') +
      row('Gemini', d.gemini.ada ? lencana('Terpasang', 'ok') + ' <span class="mono">' + esc(d.gemini.samar) + '</span> · ' + esc(d.gemini.model) : lencana('Belum diisi', 'warn')) +
      row('Cache server', ['pengaturan', 'siswa', 'soal', 'master'].map((k) => lencana(k + ': ' + (c[k] ? 'hangat' : 'dingin'), c[k] ? 'ok' : 'polos')).join(' ')) +
      row('Pemanasan terakhir', d.warm ? fmt.lalu(d.warm.at) + ' (' + esc(d.warm.scope) + ')' : '—') + row('keepWarm', d.keepWarm ? 'Nyala' : 'Mati') +
      row('Pemicu', d.pemicu.length ? d.pemicu.map(esc).join(', ') : lencana('Belum ada — jalankan setupAppEnvironment()', 'bad')) +
      row('Antrean log', d.antreanLog) + row('TO berjalan', d.toAktif ? 'Ya' : 'Tidak') + row('Script Properties', d.propsKB + ' KB dari 500 KB') +
      row('Database', '<a href="' + esc(d.spreadsheet) + '" target="_blank" rel="noopener">Buka spreadsheet</a> · <a href="' + esc(d.drive) + '" target="_blank" rel="noopener">Folder Drive</a>') + '</tbody></table></div>';
  }
})();
