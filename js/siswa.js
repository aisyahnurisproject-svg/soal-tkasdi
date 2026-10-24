/* =====================================================================
   siswa.js — beranda siswa, konfirmasi, LEMBAR UJIAN (CBT gaya ANBK),
   hasil, pembahasan. Dipakai juga oleh admin untuk pratinjau paket.
   ===================================================================== */
(function () {
  'use strict';
  const Siswa = window.Siswa = {};
  const HURUF = 'ABCDEFGHIJ';
  const BENTUK_LABEL = { PG: 'Pilihan ganda', PGK_MCMA: 'Pilihan ganda kompleks', PGK_KATEGORI: 'Pilihan ganda kompleks (kategori)', ISIAN: 'Isian singkat', JODOH: 'Menjodohkan', URAIAN: 'Uraian' };
  window.BENTUK_LABEL = BENTUK_LABEL;

  // ------------------------------------------------------------ KERANGKA SISWA
  function kerangka() {
    return Router.tampil('siswa', (el) => {
      el.innerHTML = '<header class="s-atas"><div class="dalam"><div class="logo" data-logo>' + App.logo() + '</div><div class="nama-app"><b data-nama-sekolah>' + esc(App.info.NAMA_SEKOLAH) +
        '</b><span>Portal siswa · try out</span></div><button class="btn hantu kecil" data-aksi="sandi">' + ik('gembok') + '<span class="label-panjang">Ganti sandi</span></button>' +
        '<button class="btn kecil" data-aksi="keluar">' + ik('keluar') + 'Keluar</button></div></header><main class="s-isi" id="s-isi"></main>';
      el.addEventListener('click', (e) => {
        const a = e.target.closest('[data-aksi]');
        if (!a) return;
        if (a.dataset.aksi === 'keluar') konfirmasi('Keluar dari akun ini?', { ya: 'Keluar' }).then((y) => y && Auth.keluar());
        if (a.dataset.aksi === 'sandi') gantiSandi();
      });
    });
  }
  function gantiSandi() {
    modal({ judul: 'Ganti kata sandi', isi: field('Kata sandi lama', '<input class="inp" type="password" id="s-lama">') + field('Kata sandi baru', '<input class="inp" type="password" id="s-baru">', 'Minimal 6 karakter.'),
      tombol: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'utama', aksi: async (m) => {
        const r = await api('siswa.sandi', { lama: $('#s-lama', m).value, baru: $('#s-baru', m).value });
        toast(r.message, r.success ? 'ok' : 'err');
        return r.success ? true : false;
      } }] });
  }
  async function boot(paksa) {
    let d = null;
    await swr('sboot', 'siswa.boot', {}, (x) => { d = x; App.boot = x; if (x.info) App.setInfo(x.info); }, { fresh: paksa ? 0 : 20000, langsung: true });
    return d || App.boot;
  }

  // ------------------------------------------------------------ BERANDA
  Siswa.beranda = async function () {
    document.body.className = 'mode-siswa';
    kerangka();
    const isi = $('#s-isi');
    const render = (b) => {
      if (!b) { isi.innerHTML = '<div class="memuat">Memuat…</div>'; return; }
      const me = App.me, now = Date.now();
      const paket = b.paket || [];
      const kartuPaket = paket.map((p) => {
        const belumBuka = p.buka && new Date(p.buka).getTime() > now, tutup = p.tutup && new Date(p.tutup).getTime() < now;
        const bisa = p.status === 'mengerjakan' || (p.status === 'belum' && !belumBuka && !tutup);
        const tombol = p.status === 'selesai' ? '<button class="btn" data-hasil="' + esc(p.sid) + '">Lihat hasil</button>'
          : bisa ? '<button class="btn" data-mulai="' + esc(p.id) + '">' + (p.status === 'mengerjakan' ? 'Lanjutkan mengerjakan' : 'Masuk ke konfirmasi') + ' ' + ik('kanan') + '</button>'
            : '<button class="btn" disabled>' + (belumBuka ? 'Dibuka ' + fmt.tgl(p.buka) : 'Sudah ditutup') + '</button>';
        return '<article class="paket-hero ' + (bisa ? '' : 'redup') + '"><div><span class="label">' + esc(p.mapel) + ' · ' +
          (p.status === 'mengerjakan' ? 'Sedang dikerjakan' : p.status === 'selesai' ? 'Selesai' : belumBuka ? 'Belum dibuka' : 'Siap dikerjakan') + '</span>' +
          '<h2>' + esc(p.nama) + '</h2><div class="meta"><span>' + ik('grid') + ' ' + p.jumlah + ' soal</span><span>' + ik('jam') + ' ' + p.durasi + ' menit</span>' +
          (p.tutup ? '<span>Ditutup ' + fmt.tgl(p.tutup) + '</span>' : '') + '</div>' + (p.deskripsi ? '<p style="margin:10px 0 0;opacity:.9">' + esc(p.deskripsi) + '</p>' : '') + '</div><div>' + tombol + '</div></article>';
      }).join('');
      const riw = (b.riwayat || []);
      const riwHtml = riw.map((r) => '<div class="riwayat-item"><div><b>' + esc(r.nama) + '</b><div class="kecil muted">' + esc(r.mapel) + ' · ' + fmt.tgl(r.selesai) + ' · ' + r.jumlah + ' soal</div></div>' +
        (b.tampilNilai ? '<div class="nilai" title="Nilai">' + fmt.angka(r.nilai) + '</div>' : '<div></div>') +
        '<div style="display:flex;gap:8px">' + '<button class="btn kecil" data-hasil="' + esc(r.sid) + '">Hasil</button>' + (r.pembahasan ? '<button class="btn kecil" data-bahas="' + esc(r.sid) + '">Pembahasan</button>' : '') + '</div></div>').join('');
      const akhir = riw[0];
      isi.innerHTML = '<section class="kartu sapa"><div><h1>Halo, ' + esc(me.nama) + '</h1><p>Kelas ' + esc(me.kelas) + ' · NIS <span class="mono">' + esc(me.nis) + '</span></p></div>' +
        '<button class="btn kecil" data-segar>' + ik('segar') + 'Segarkan</button></section>' +
        (kartuPaket || '<div class="kartu kosong" style="margin-top:16px"><strong>Belum ada try out untuk kelasmu</strong>Paket akan muncul di sini ketika guru membukanya.</div>') +
        (riw.length ? '<section style="margin-top:24px"><h2 style="font-size:18px">Riwayat try out</h2>' + riwHtml + '</section>' : '') +
        (akhir && b.tampilNilai && akhir.komp && akhir.komp.length ? '<section class="kisi k2" style="margin-top:16px">' + kompKartu(akhir.komp.filter((k) => k.kuasai), akhir.komp.filter((k) => !k.kuasai)) + '</section>' : '');
    };
    render(App.boot && App.boot.paket ? App.boot : null);
    if (!isi.dataset.siap) {
      isi.dataset.siap = '1';
      isi.addEventListener('click', async (e) => {
        const m = e.target.closest('[data-mulai]'), h = e.target.closest('[data-hasil]'), bh = e.target.closest('[data-bahas]');
        if (m) go('#/siswa/konfirmasi/' + m.dataset.mulai);
        if (h) go('#/siswa/hasil/' + h.dataset.hasil);
        if (bh) go('#/siswa/pembahasan/' + bh.dataset.bahas);
        if (e.target.closest('[data-segar]')) render(await boot(true));
      });
    }
    render(await boot(false));
  };
  function kompKartu(kuasai, belajar) {
    return '<div class="kartu"><h3 style="margin:0 0 10px;font-size:16px">Sudah dikuasai</h3>' + (kuasai.length ? '<ul class="daftar-komp ok">' + kuasai.map((k) => '<li><span>' + esc(k.nama) + '</span><b>' + k.persen + '%</b></li>').join('') + '</ul>' : '<p class="muted kecil">Belum ada kompetensi yang mencapai ambang.</p>') + '</div>' +
      '<div class="kartu"><h3 style="margin:0 0 10px;font-size:16px">Perlu dipelajari lagi</h3>' + (belajar.length ? '<ul class="daftar-komp bad">' + belajar.map((k) => '<li><span>' + esc(k.nama) + '</span><b>' + k.persen + '%</b></li>').join('') + '</ul>' : '<p class="muted kecil">Semua kompetensi sudah dikuasai.</p>') + '</div>';
  }

  // ------------------------------------------------------------ KONFIRMASI PESERTA
  Siswa.konfirmasi = async function (idPaket) {
    document.body.className = 'mode-siswa';
    kerangka();
    const isi = $('#s-isi');
    const b = App.boot && App.boot.paket ? App.boot : await boot(false);
    const p = (b.paket || []).find((x) => x.id === idPaket);
    if (!p) { isi.innerHTML = '<div class="kartu kosong"><strong>Paket tidak tersedia</strong><a href="#/siswa">Kembali ke beranda</a></div>'; return; }
    const me = App.me, lanjut = p.status === 'mengerjakan';
    isi.innerHTML = '<div class="konfirmasi"><div class="alert info">' + ik('info') + '<div>Periksa data diri dan paket ujian. ' + (lanjut ? 'Kamu sedang mengerjakan paket ini — tekan Lanjutkan.' : 'Masukkan <b>token ujian</b> yang ditampilkan pengawas.') + '</div></div>' +
      '<section class="kartu"><div class="kartu-kepala"><div><h2>Konfirmasi data peserta</h2><p>Pastikan identitas sesuai kartu peserta.</p></div>' + lencana('Data terverifikasi', 'ok') + '</div>' +
      '<div class="data-peserta"><div><small>NIS</small><b class="mono">' + esc(me.nis) + '</b></div><div><small>Nama peserta</small><b>' + esc(me.nama) + '</b></div>' +
      '<div><small>Jenis kelamin</small><b>' + (me.jk === 'P' ? 'Perempuan' : me.jk === 'L' ? 'Laki-laki' : '—') + '</b></div><div><small>Kelas</small><b>' + esc(me.kelas) + '</b></div></div>' +
      '<div style="margin-top:16px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--surface-3)"><small class="muted" style="font-weight:600">Paket ujian</small>' +
      '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-top:4px"><b style="font-size:17px">' + esc(p.nama) + '</b><span>' +
      lencana(p.jumlah + ' soal', 'navy') + ' ' + lencana(p.durasi + ' menit', 'warn') + '</span></div><div class="kecil muted">' + esc(p.mapel) + '</div></div>' +
      '<form id="f-konf" style="margin-top:18px" novalidate><div class="baris dua">' +
      (b.cekTgl && !lanjut ? field('Konfirmasi tanggal lahir', '<input class="inp" type="date" name="tgl" required>', 'Sesuai data sekolah.') : '') +
      (lanjut ? '' : field('Token ujian', '<input class="inp token" name="token" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="••••••">', 'Token dapat berganti berkala. Lihat layar pengawas.')) + '</div>' +
      '<div class="alert bad" id="g-konf" hidden></div>' +
      (lanjut ? '' : '<label class="cek" style="padding:12px;background:var(--warn-bg);border-radius:8px;margin-bottom:16px"><input type="checkbox" name="pakta"><span><b>Pakta integritas.</b> Saya mengerjakan sendiri dengan jujur, tidak membuka aplikasi lain, dan menjaga kerahasiaan soal.</span></label>') +
      '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><a class="btn" href="#/siswa">' + ik('kiri') + 'Kembali</a>' +
      '<button class="btn utama" style="height:48px;padding:0 24px">' + (lanjut ? 'Lanjutkan mengerjakan' : 'Mulai mengerjakan') + ' ' + ik('kanan') + '</button></div></form></section></div>';
    const f = $('#f-konf');
    if (f.token) f.token.addEventListener('input', () => { f.token.value = f.token.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const g = $('#g-konf'); g.hidden = true;
      if (f.pakta && !f.pakta.checked) { g.textContent = 'Centang pakta integritas terlebih dahulu.'; g.hidden = false; return; }
      if (f.token && f.token.value.length < 6) { g.textContent = 'Token terdiri dari 6 karakter.'; g.hidden = false; return; }
      layarPenuh();
      const btn = f.querySelector('button.utama');
      sibuk(btn, true, 'Menyiapkan lembar ujian…');
      const r = await api('to.mulai', { idPaket, token: f.token ? f.token.value : '', tgl: f.tgl ? f.tgl.value : '', perangkat: App.perangkat() });
      sibuk(btn, false);
      if (!r.success) {
        if (r.code === 'SELESAI' && r.sid) return go('#/siswa/hasil/' + r.sid);
        if (r.code === 'TOKEN' && !f.token) { location.reload(); return; }
        g.textContent = r.message; g.hidden = false; return;
      }
      if (r.data.selesai) { App.data.hasil = App.data.hasil || {}; basi('sboot'); toast('Waktu ujian sudah habis. Jawabanmu telah dikumpulkan.', 'warn'); return go('#/siswa'); }
      App.data.ujian = r.data;
      Store.set('cbtmeta:' + r.data.sid, { idPaket });
      basi('sboot');
      go('#/ujian/' + r.data.sid);
    });
  };
  function layarPenuh() { try { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => { }); } catch (e) { } }

  // ------------------------------------------------------------ LEMBAR UJIAN
  const CBT = window.CBT = { s: null };
  CBT.buka = async function (sid) {
    let data = App.data.ujian && App.data.ujian.sid === sid ? App.data.ujian : null;
    if (!data) {
      const meta = Store.get('cbtmeta:' + sid, null);
      if (!meta) return go('#/siswa');
      const el = Router.tampil('ujian-muat', (x) => { x.innerHTML = '<div class="memuat">Memulihkan lembar ujian…</div>'; });
      el.hidden = false;
      const r = await api('to.mulai', { idPaket: meta.idPaket, perangkat: App.perangkat() });
      Router.buang('ujian-muat');
      if (!r.success) { toast(r.message, 'err', 8000); return go(r.code === 'TOKEN' || r.code === 'PERANGKAT' ? '#/siswa/konfirmasi/' + meta.idPaket : '#/siswa'); }
      if (r.data.selesai) { toast('Waktu ujian sudah habis. Jawabanmu telah dikumpulkan.', 'warn'); return go('#/siswa'); }
      data = r.data;
    }
    CBT.mulai(data, {});
  };
  /** data: {sid, paket, soal, stim, simpan, sisa, kebijakan}; opt.preview = pratinjau admin (tanpa simpan/timer). */
  CBT.mulai = function (data, opt) {
    opt = opt || {};
    const lokal = opt.preview ? null : Store.get('cbt:' + data.sid, null);
    const sv = data.simpan || {};
    const s = CBT.s = {
      sid: data.sid, paket: data.paket, soal: data.soal, stim: data.stim || {}, preview: !!opt.preview,
      j: Object.assign({}, sv.j, lokal ? lokal.j : {}), rg: Object.assign({}, sv.rg, lokal ? lokal.rg : {}), d: Object.assign({}, sv.d, lokal ? lokal.d : {}),
      pt: Math.max(sv.pt || 0, lokal ? lokal.pt || 0 : 0), idx: lokal ? Math.min(lokal.idx || 0, data.soal.length - 1) : 0,
      font: Store.get('cbt_font', 16), batas: (data.kebijakan || {}).batasTab || 3,
      akhir: performance.now() + (data.sisa || 0) * 1000, kotor: false, kirim: false, lastSync: Date.now(), selesai: false, tMasuk: Date.now(), ptAkhir: 0, peringat: {}
    };
    document.body.className = 'mode-ujian';
    Router.buang('ujian');
    const el = Router.tampil('ujian', (x) => { x.innerHTML = cbtHtml(); });
    el.hidden = false;
    pasangCbt(el);
    tampilSoal(s.idx);
    if (!s.preview) {
      s.tik = setInterval(tikWaktu, 1000);
      s.sinkron = setInterval(() => { if (s.kotor) kirim(); }, 30000);
      tikWaktu();
    } else { $('#cbt-waktu b').textContent = data.paket.durasi + ':00'; }
  };
  function cbtHtml() {
    const s = CBT.s, me = App.me || { nama: 'Pratinjau', nis: '—' };
    return '<div class="cbt"><header class="cbt-kepala"><div class="logo">' + App.logo() + '</div><div class="judul"><b>' + esc(App.info.NAMA_SEKOLAH) + '</b><span>' + esc(s.paket.nama) + ' · ' + esc(s.paket.mapel) + '</span></div>' +
      '<div class="peserta"><b>' + esc(s.preview ? 'Pratinjau guru' : me.nama) + '</b><span class="mono">NIS ' + esc(s.preview ? '—' : me.nis) + '</span></div></header>' +
      '<div class="cbt-bilah"><span class="no-soal">Soal <b id="cbt-no">1</b> / ' + s.soal.length + '</span><span class="jenis" id="cbt-jenis"></span><span class="spasi"></span>' +
      '<div class="ukuran" role="group" aria-label="Ukuran huruf">' + [14, 16, 20].map((f, i) => '<button data-font="' + f + '" style="font-size:' + (12 + i * 2) + 'px" aria-label="Huruf ' + f + ' piksel">A</button>').join('') + '</div>' +
      '<span class="simpan-info" id="cbt-simpan">' + ik('cek') + (s.preview ? 'Mode pratinjau' : 'Tersimpan di perangkat') + '</span>' +
      '<div class="waktu" id="cbt-waktu"><small>' + (s.preview ? 'Durasi' : 'Sisa waktu') + '</small><b>--:--</b></div>' +
      '<button class="btn utama" data-cbt="daftar">' + ik('grid') + '<span class="label-panjang">Daftar soal</span></button></div>' +
      '<div class="cbt-tubuh" id="cbt-tubuh"><div class="tombol-stim"><button class="btn kecil" data-cbt="stim">Sembunyikan bacaan</button></div>' +
      '<section class="cbt-stim" id="cbt-stim" aria-label="Stimulus"></section><section class="cbt-tanya" id="cbt-tanya" aria-label="Pertanyaan"></section></div>' +
      '<footer class="cbt-kaki"><div><button class="btn sebelum" data-cbt="prev">' + ik('kiri') + '<span class="label-panjang">Soal sebelumnya</span></button></div>' +
      '<button class="btn ragu-ragu" data-cbt="ragu"><input type="checkbox" tabindex="-1" id="cbt-ragu">Ragu-ragu</button>' +
      '<div class="kanan"><button class="btn berikut" data-cbt="next"><span class="label-panjang">Soal berikutnya</span>' + ik('kanan') + '</button></div></footer></div>';
  }
  function pasangCbt(el) {
    const s = CBT.s;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cbt]'), f = e.target.closest('[data-font]');
      if (f) { s.font = +f.dataset.font; Store.set('cbt_font', s.font); terapFont(); return; }
      if (!b) return;
      const a = b.dataset.cbt;
      if (a === 'prev') pindah(s.idx - 1);
      else if (a === 'next') pindah(s.idx + 1);
      else if (a === 'selesai') s.preview ? tutupPratinjau() : konfirmasiSelesai();
      else if (a === 'ragu') { const id = s.soal[s.idx].id; s.rg[id] = !s.rg[id]; ubah(); $('#cbt-ragu').checked = !!s.rg[id]; }
      else if (a === 'daftar') panelSoal();
      else if (a === 'stim') { const st = $('#cbt-stim'); st.classList.toggle('lipat'); b.textContent = st.classList.contains('lipat') ? 'Tampilkan bacaan' : 'Sembunyikan bacaan'; }
    });
    const tanya = $('#cbt-tanya', el);
    tanya.addEventListener('change', (e) => tangkap(e.target));
    tanya.addEventListener('input', debounce((e) => { if (e.target.matches('input[type=text], textarea')) tangkap(e.target); }, 400));
    if (!s.preview) {
      s.pantau = () => {
        if (document.visibilityState === 'hidden') catatPindah('berpindah aplikasi/tab');
      };
      s.blur = () => setTimeout(() => { if (!document.hasFocus() && document.visibilityState === 'visible') catatPindah('meninggalkan jendela ujian'); }, 300);
      s.layar = () => { if (!document.fullscreenElement) { catatPindah('keluar dari layar penuh'); bannerLayar(); } };
      s.kirimAkhir = () => kirimBeacon();
      document.addEventListener('visibilitychange', s.pantau);
      window.addEventListener('blur', s.blur);
      document.addEventListener('fullscreenchange', s.layar);
      window.addEventListener('pagehide', s.kirimAkhir);
      window.addEventListener('online', s.online = () => { if (s.kotor) kirim(); });
      document.addEventListener('contextmenu', s.ctx = (e) => e.preventDefault());
      document.addEventListener('copy', s.ctx);
    }
  }
  function lepasCbt() {
    const s = CBT.s;
    if (!s) return;
    clearInterval(s.tik); clearInterval(s.sinkron);
    document.removeEventListener('visibilitychange', s.pantau); window.removeEventListener('blur', s.blur);
    document.removeEventListener('fullscreenchange', s.layar); window.removeEventListener('pagehide', s.kirimAkhir);
    window.removeEventListener('online', s.online); document.removeEventListener('contextmenu', s.ctx); document.removeEventListener('copy', s.ctx);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { });
  }
  function terapFont() { $('#cbt-tubuh').style.setProperty('--fs', CBT.s.font + 'px'); $$('[data-font]').forEach((b) => b.classList.toggle('aktif', +b.dataset.font === CBT.s.font)); }

  function catatDurasi() { const s = CBT.s, id = s.soal[s.idx] && s.soal[s.idx].id; if (!id) return; s.d[id] = Math.round((s.d[id] || 0) + (Date.now() - s.tMasuk) / 1000); s.tMasuk = Date.now(); }
  function pindah(i) {
    const s = CBT.s;
    if (i < 0 || i >= s.soal.length) return;
    catatDurasi();
    tampilSoal(i);
    if (!s.preview) { simpanLokal(); kirimNanti(); }
  }
  function tampilSoal(i) {
    const s = CBT.s, q = s.soal[i];
    s.idx = i; s.tMasuk = Date.now();
    $('#cbt-no').textContent = i + 1;
    $('#cbt-jenis').textContent = BENTUK_LABEL[q.b] || q.b;
    const tubuh = $('#cbt-tubuh'), st = q.s && s.stim[q.s];
    tubuh.classList.toggle('tanpa-stim', !st);
    if (st) {
      const box = $('#cbt-stim');
      if (box.dataset.id !== q.s) { box.dataset.id = q.s; box.innerHTML = (st.j ? '<h2>' + esc(st.j) + '</h2>' : '') + '<div class="isi-soal cbt-teks"></div>'; isiKonten(box.querySelector('.isi-soal'), st.c); box.scrollTop = 0; }
    }
    const tanya = $('#cbt-tanya');
    tanya.innerHTML = '<div class="isi-soal cbt-teks teks-soal"></div>' + jawabHtml(q, s.j[q.id]);
    isiKonten(tanya.querySelector('.teks-soal'), q.t);
    $$('.isi-opsi', tanya).forEach((x) => isiKonten(x, x.dataset.t));
    tanya.scrollTop = 0;
    $('#cbt-ragu').checked = !!s.rg[q.id];
    $('[data-cbt=prev]').disabled = i === 0;
    const kanan = $('.cbt-kaki .kanan');
    kanan.innerHTML = i === s.soal.length - 1
      ? '<button class="btn selesai-btn" data-cbt="selesai">' + ik('cek') + (s.preview ? 'Tutup pratinjau' : 'Selesai') + '</button>'
      : '<button class="btn berikut" data-cbt="next"><span class="label-panjang">Soal berikutnya</span>' + ik('kanan') + '</button>';
    terapFont();
  }
  function jawabHtml(q, v) {
    const nama = 'j_' + q.id;
    if (q.b === 'PG' || q.b === 'PGK_MCMA') {
      const multi = q.b === 'PGK_MCMA', pilih = [].concat(v || []);
      return (multi ? '<div class="petunjuk-bentuk">' + ik('info') + 'Jawaban benar lebih dari satu. Centang semua yang benar.</div>' : '') +
        '<div class="pilihan">' + (q.o || []).map((o, i) => '<label><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + nama + '" value="' + esc(o.k) + '"' + (pilih.indexOf(o.k) >= 0 ? ' checked' : '') + '>' +
          '<span class="hrf">' + HURUF[i] + '</span><div class="isi-soal isi-opsi" data-t="' + esc(o.t) + '"></div></label>').join('') + '</div>';
    }
    if (q.b === 'PGK_KATEGORI') {
      const kol = (q.o && q.o.kolom) || ['Benar', 'Salah'], arr = Array.isArray(v) ? v : [];
      return '<div class="petunjuk-bentuk">' + ik('info') + 'Pilih ' + esc(kol[0]) + ' atau ' + esc(kol[1]) + ' untuk setiap pernyataan.</div>' +
        '<div style="overflow-x:auto"><table class="tabel-kategori"><thead><tr><th>Pernyataan</th>' + kol.map((k) => '<th>' + esc(k) + '</th>').join('') + '</tr></thead><tbody>' +
        ((q.o && q.o.pernyataan) || []).map((p, i) => '<tr><td><div class="isi-soal isi-opsi" data-t="' + esc(p.t) + '"></div></td>' +
          kol.map((k) => '<td class="pil"><input type="radio" name="' + nama + '_' + i + '" data-kat="' + i + '" value="' + esc(k) + '"' + (arr[i] === k ? ' checked' : '') + ' aria-label="' + esc(k) + '"></td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    if (q.b === 'ISIAN') return field('Jawaban', '<input class="inp" type="text" name="' + nama + '" value="' + esc(v || '') + '" autocomplete="off" style="max-width:420px;font-size:18px">');
    if (q.b === 'URAIAN') return field('Jawaban uraian', '<textarea class="inp" name="' + nama + '" rows="8">' + esc(v || '') + '</textarea>');
    if (q.b === 'JODOH') {
      const o = q.o || {}, cur = v || {};
      return '<div class="petunjuk-bentuk">' + ik('info') + 'Pasangkan setiap pernyataan kiri dengan pilihan yang tepat.</div>' +
        (o.kiri || []).map((k) => '<div class="jodoh-baris"><div class="isi-soal isi-opsi" data-t="' + esc(k.t) + '"></div><select class="inp" data-jodoh="' + esc(k.id) + '"><option value="">— pilih —</option>' +
          (o.kanan || []).map((r) => '<option value="' + esc(r.id) + '"' + (cur[k.id] === r.id ? ' selected' : '') + '>' + esc(String(r.t).replace(/<[^>]+>/g, '')) + '</option>').join('') + '</select></div>').join('');
    }
    return '';
  }
  function tangkap(t) {
    const s = CBT.s, q = s.soal[s.idx];
    if (!q) return;
    if (q.b === 'PG') s.j[q.id] = t.value;
    else if (q.b === 'PGK_MCMA') s.j[q.id] = $$('#cbt-tanya input[type=checkbox]:checked').map((x) => x.value);
    else if (q.b === 'PGK_KATEGORI') { const arr = Array.isArray(s.j[q.id]) ? s.j[q.id].slice() : []; arr[+t.dataset.kat] = t.value; for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = null; s.j[q.id] = arr; }
    else if (q.b === 'JODOH') { const m = Object.assign({}, s.j[q.id]); m[t.dataset.jodoh] = t.value; s.j[q.id] = m; }
    else s.j[q.id] = t.value;
    ubah();
  }
  function ubah() { const s = CBT.s; if (s.preview) return; s.kotor = true; simpanLokal(); kirimNanti(); }
  function simpanLokal() { const s = CBT.s; Store.set('cbt:' + s.sid, { j: s.j, rg: s.rg, d: s.d, pt: s.pt, idx: s.idx, t: Date.now() }); infoSimpan('lokal'); }
  const kirimNanti = debounce(() => { if (CBT.s && CBT.s.kotor) kirim(); }, 2500);
  function infoSimpan(st) {
    const el = $('#cbt-simpan');
    if (!el) return;
    el.classList.toggle('gagal', st === 'gagal');
    el.innerHTML = st === 'server' ? ik('cek') + 'Tersinkron ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : st === 'gagal' ? ik('awas') + 'Offline — jawaban aman di perangkat' : ik('cek') + 'Tersimpan di perangkat';
  }
  function muatan(paksa) { const s = CBT.s; return { sid: s.sid, jaw: s.j, rg: s.rg, dur: s.d, pt: s.pt, perangkat: App.perangkat(), paksa: !!paksa }; }
  async function kirim(paksa) {
    const s = CBT.s;
    if (!s || s.preview || s.kirim || s.selesai) return;
    s.kirim = true; s.kotor = false;
    const r = await api('to.simpan', muatan(paksa), { coba: 1 });
    s.kirim = false;
    if (!r.success) {
      s.kotor = true;
      infoSimpan('gagal');
      if (r.code === 'PERANGKAT' || r.code === 'SESI') { lepasCbt(); toast(r.message, 'err', 9000); go('#/siswa'); }
      return;
    }
    infoSimpan('server');
    if (r.data.selesai) return tampilHasil(r.data.hasil, r.data.alasan);
    if (typeof r.data.sisa === 'number') s.akhir = performance.now() + r.data.sisa * 1000;
  }
  function kirimBeacon() {
    const s = CBT.s;
    if (!s || s.preview || s.selesai || !navigator.sendBeacon || !konfigOk()) return;
    catatDurasi(); simpanLokal();
    try { navigator.sendBeacon(CFG.GAS_URL, JSON.stringify({ action: 'to.simpan', token: App.token, data: muatan(true) })); } catch (e) { }
  }
  function tikWaktu() {
    const s = CBT.s;
    if (!s || s.selesai) return;
    const sisa = Math.max(0, Math.round((s.akhir - performance.now()) / 1000));
    const w = $('#cbt-waktu');
    if (!w) return;
    w.querySelector('b').textContent = fmt.jam(sisa);
    w.classList.toggle('genting', sisa <= 300);
    if (sisa <= 300 && !s.peringat[300]) { s.peringat[300] = 1; toast('Sisa waktu 5 menit. Periksa kembali jawabanmu.', 'warn', 6000); }
    if (sisa <= 60 && !s.peringat[60]) { s.peringat[60] = 1; toast('Sisa waktu 1 menit.', 'warn'); }
    if (sisa <= 0) kumpulkan('waktu habis');
  }
  function catatPindah(alasan) {
    const s = CBT.s;
    if (!s || s.selesai || s.preview || Date.now() - s.ptAkhir < 1500) return;
    s.ptAkhir = Date.now();
    s.pt++;
    s.kotor = true;
    simpanLokal();
    kirim(true);
    toast('Tercatat ' + alasan + ' (' + s.pt + '×). ' + (s.pt >= s.batas ? 'Pengawas menerima laporan ini.' : 'Batas ' + s.batas + '×.'), 'err', 6000);
  }
  function bannerLayar() {
    if ($('.peringatan-layar') || !document.documentElement.requestFullscreen) return;
    const b = document.createElement('div');
    b.className = 'peringatan-layar';
    b.innerHTML = ik('layar') + '<span>Kamu keluar dari layar penuh.</span><button class="btn kecil">Kembali ke layar penuh</button>';
    b.querySelector('button').onclick = () => { layarPenuh(); b.remove(); };
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 12000);
  }
  function hitung() {
    const s = CBT.s;
    const terisi = (id) => { const v = s.j[id]; if (v == null || v === '') return false; if (Array.isArray(v)) return v.some((x) => x != null && x !== ''); if (typeof v === 'object') return Object.values(v).some(Boolean); return String(v).trim() !== ''; };
    const r = { d: 0, r: 0, k: 0, raguNo: [], kosongNo: [] };
    s.soal.forEach((q, i) => { if (s.rg[q.id]) { r.r++; r.raguNo.push(i + 1); } if (terisi(q.id)) r.d++; else { r.k++; r.kosongNo.push(i + 1); } });
    r.terisi = terisi;
    return r;
  }
  function panelSoal() {
    const s = CBT.s, h = hitung();
    const lapis = document.createElement('div');
    lapis.className = 'lapis';
    lapis.style.justifyContent = 'flex-end'; lapis.style.padding = '0';
    lapis.innerHTML = '<aside class="panel-soal" role="dialog" aria-label="Daftar soal"><div class="kepala"><h3>Daftar soal</h3><button class="btn kecil ikon" data-tutup style="background:transparent;color:#fff;border-color:rgba(255,255,255,.4)">' + ik('x') + '</button></div>' +
      '<div class="isi"><div class="ringkas-jawab"><div class="d"><b>' + h.d + '</b>Dijawab</div><div class="r"><b>' + h.r + '</b>Ragu-ragu</div><div class="k"><b>' + h.k + '</b>Belum dijawab</div></div>' +
      '<div class="legenda" style="margin-bottom:12px"><span style="--c:#28A745">Dijawab</span><span style="--c:#FFC107">Ragu-ragu</span><span style="--c:#fff;outline:1px solid #CBD5E1">Kosong</span><span style="--c:#2563EB">Sedang dibuka</span></div>' +
      '<div class="grid-nomor">' + s.soal.map((q, i) => '<button data-no="' + i + '" class="' + (s.rg[q.id] ? 'ragu' : h.terisi(q.id) ? 'dijawab' : '') + (i === s.idx ? ' aktif' : '') + '">' + (i + 1) +
        '<small>' + ringkasJawab(q, s.j[q.id]) + '</small></button>').join('') + '</div>' +
      (s.preview ? '' : '<p class="kecil muted" style="margin-top:16px">Ketuk nomor untuk membuka soal.</p>') + '</div>' +
      '<div style="padding:14px 18px;border-top:1px solid var(--line);display:grid;gap:8px">' + (h.raguNo.length ? '<button class="btn ragu" data-ke="' + (h.raguNo[0] - 1) + '">Ke soal ragu (No. ' + h.raguNo[0] + ')</button>' : '') +
      '<button class="btn utama" data-tutup>Lanjut mengerjakan</button>' + (s.preview ? '' : '<button class="btn" data-akhiri>' + ik('cek') + 'Kumpulkan & selesai</button>') + '</div></aside>';
    document.body.appendChild(lapis);
    lapis.addEventListener('click', (e) => {
      const n = e.target.closest('[data-no]'), k = e.target.closest('[data-ke]');
      if (n) { lapis.remove(); pindah(+n.dataset.no); return; }
      if (k) { lapis.remove(); pindah(+k.dataset.ke); return; }
      if (e.target.closest('[data-akhiri]')) { lapis.remove(); konfirmasiSelesai(); return; }
      if (e.target === lapis || e.target.closest('[data-tutup]')) lapis.remove();
    });
  }
  function ringkasJawab(q, v) {
    if (v == null || v === '') return '–';
    if (q.b === 'PG') { const i = (q.o || []).findIndex((o) => o.k === v); return i >= 0 ? HURUF[i] : '•'; }
    if (q.b === 'PGK_MCMA') return [].concat(v).map((k) => HURUF[(q.o || []).findIndex((o) => o.k === k)]).filter(Boolean).join(',') || '–';
    return '✓';
  }
  function konfirmasiSelesai() {
    const s = CBT.s, h = hitung();
    const m = modal({ judul: 'Kumpulkan lembar ujian', ukuran: 'lg', isi:
      '<p class="muted" style="margin-top:0">' + esc(s.paket.nama) + '</p><div class="ringkas-jawab"><div class="d"><b>' + h.d + '</b>Sudah dijawab</div><div class="r"><b>' + h.r + '</b>Ragu-ragu' +
      (h.raguNo.length ? '<br><span class="mono">No. ' + h.raguNo.slice(0, 8).join(', ') + '</span>' : '') + '</div><div class="k"><b>' + h.k + '</b>Kosong' + (h.kosongNo.length ? '<br><span class="mono">No. ' + h.kosongNo.slice(0, 8).join(', ') + '</span>' : '') + '</div></div>' +
      (h.r || h.k ? '<div class="alert warn">' + ik('awas') + '<div>Masih ada ' + (h.r ? h.r + ' soal ragu-ragu' : '') + (h.r && h.k ? ' dan ' : '') + (h.k ? h.k + ' soal kosong' : '') + '. Jawaban terakhirmu tetap dinilai.</div></div>' : '') +
      '<label class="cek" style="padding:12px;background:var(--surface-2);border-radius:8px"><input type="checkbox" id="yakin"><span>Saya yakin dan siap mengakhiri ujian. Lembar jawaban <b>tidak dapat dibuka lagi</b> setelah dikumpulkan.</span></label>',
      tombol: [{ label: ik('kiri') + 'Periksa lagi' }, { label: ik('cek') + 'Kumpulkan sekarang', kelas: 'bahaya', aksi: (el) => { if (!$('#yakin', el).checked) { toast('Centang pernyataan terlebih dahulu.', 'warn'); return false; } return true; } }] });
    m.hasil.then((v) => { if (v) kumpulkan('dikumpulkan siswa'); });
  }
  async function kumpulkan(alasan) {
    const s = CBT.s;
    if (!s || s.selesai || s.mengumpul) return;
    s.mengumpul = true;
    catatDurasi(); simpanLokal();
    const tunggu = modal({ judul: 'Mengumpulkan…', tutup: false, isi: '<div class="memuat">Mengirim jawaban ke server. Jangan tutup halaman ini.</div>' });
    for (let i = 0; i < 6; i++) {
      const r = await api('to.selesai', { sid: s.sid, jaw: s.j, rg: s.rg, dur: s.d, pt: s.pt, alasan }, { coba: 1 });
      if (r.success) { tunggu.tutup(); return tampilHasil(r.data.hasil); }
      if (!r.offline) { tunggu.tutup(); toast(r.message, 'err', 8000); s.mengumpul = false; return; }
      tunggu.el.querySelector('.modal-isi').innerHTML = '<div class="alert warn">' + ik('awas') + '<div>Koneksi terputus. Jawaban aman di perangkat. Mencoba lagi (' + (i + 1) + '/6)…</div></div>';
      await sleep(4000);
    }
    tunggu.tutup();
    s.mengumpul = false;
    toast('Belum berhasil mengirim. Sambungkan internet lalu tekan Selesai lagi. Jawabanmu tetap aman.', 'err', 10000);
  }
  function tampilHasil(hasil, alasan) {
    const s = CBT.s;
    s.selesai = true;
    lepasCbt();
    Store.del('cbt:' + s.sid);
    App.data.ujian = null;
    App.data.hasil = App.data.hasil || {};
    App.data.hasil[s.sid] = hasil;
    basi('sboot');
    if (alasan) toast(alasan, 'warn', 9000);
    go('#/siswa/hasil/' + s.sid);
    Router.buang('ujian');
  }
  function tutupPratinjau() { lepasCbt(); Router.buang('ujian'); document.body.className = 'mode-admin'; if (CBT.s && CBT.s.kembali) go(CBT.s.kembali); CBT.s = null; }
  CBT.pratinjau = function (data, kembali) { CBT.mulai(Object.assign({ sid: 'pratinjau', sisa: 0 }, data), { preview: true }); CBT.s.kembali = kembali; };

  // ------------------------------------------------------------ HASIL
  Siswa.hasil = async function (sid) {
    document.body.className = 'mode-siswa';
    kerangka();
    const isi = $('#s-isi');
    let h = App.data.hasil && App.data.hasil[sid];
    let b = App.boot && App.boot.riwayat ? App.boot : await boot(false);
    let r = (b.riwayat || []).find((x) => x.sid === sid);
    if (!r) { b = await boot(true) || b; r = (b.riwayat || []).find((x) => x.sid === sid); }
    if (!h && r) h = { nilai: r.nilai, benar: r.benar, salah: r.salah, kosong: r.kosong, jumlah: r.jumlah, dikuasai: (r.komp || []).filter((k) => k.kuasai), belajar: (r.komp || []).filter((k) => !k.kuasai) };
    if (!h) { isi.innerHTML = '<div class="kartu kosong"><strong>Hasil belum tersedia</strong>Hasil sedang diproses. <a href="#/siswa">Kembali ke beranda</a></div>'; return; }
    if (h.tersembunyi || b.tampilNilai === false) {
      isi.innerHTML = '<section class="kartu hasil-besar"><div style="color:var(--ok)">' + ik('cek') + '</div><h1 style="color:var(--navy-3)">Jawaban terkumpul</h1><p class="muted">Terima kasih. Nilai akan diumumkan oleh guru.</p><a class="btn utama" href="#/siswa">Kembali ke beranda</a></section>';
      return;
    }
    isi.innerHTML = '<section class="kartu hasil-besar"><p class="muted" style="margin:0 0 8px">' + esc(r ? r.nama : 'Hasil try out') + '</p><div class="skor">' + fmt.angka(h.nilai) + '<small> / 100</small></div>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">' + lencana(h.benar + ' benar', 'ok') + lencana(h.salah + ' salah', 'bad') + lencana(h.kosong + ' kosong', 'polos') +
      (h.durasi ? lencana('Durasi ' + fmt.durasi(h.durasi), 'info') : '') + (h.perluDinilai ? lencana(h.perluDinilai + ' uraian dinilai guru', 'warn') : '') + '</div></section>' +
      '<section class="kisi k2" style="margin-top:16px">' + kompKartu(h.dikuasai || [], h.belajar || []) + '</section>' +
      '<div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap"><a class="btn utama" href="#/siswa">' + ik('kiri') + 'Kembali ke beranda</a>' +
      (r && r.pembahasan ? '<a class="btn" href="#/siswa/pembahasan/' + esc(sid) + '">Lihat pembahasan</a>' : '') + '</div>';
  };

  // ------------------------------------------------------------ PEMBAHASAN
  Siswa.pembahasan = async function (sid) {
    document.body.className = 'mode-siswa';
    kerangka();
    const isi = $('#s-isi');
    isi.innerHTML = '<div class="memuat">Memuat pembahasan…</div>';
    const r = await api('to.pembahasan', { sid });
    if (!r.success) { isi.innerHTML = '<div class="kartu kosong"><strong>Pembahasan belum tersedia</strong>' + esc(r.message) + '<br><a href="#/siswa">Kembali</a></div>'; return; }
    const d = r.data;
    isi.innerHTML = '<div class="sapa" style="margin-bottom:16px"><div><h1>Pembahasan</h1><p>' + esc(d.paket.nama) + '</p></div><a class="btn" href="#/siswa">' + ik('kiri') + 'Beranda</a></div>' +
      d.soal.map((q, i) => {
        const st = d.stim[q.s];
        const tandai = { benar: lencana('Benar', 'ok'), salah: lencana('Salah', 'bad'), sebagian: lencana('Sebagian benar', 'warn'), kosong: lencana('Tidak dijawab', 'polos'), manual: lencana('Dinilai guru', 'info') }[q.st] || '';
        return '<article class="kartu" style="margin-bottom:14px"><div class="kartu-kepala"><h3>Soal ' + (i + 1) + '</h3>' + tandai + '</div>' +
          (st ? '<details style="margin-bottom:10px"><summary class="kecil" style="cursor:pointer">Bacaan: ' + esc(st.j || 'stimulus') + '</summary>' + htmlKonten(st.c) + '</details>' : '') +
          htmlKonten(q.t) + kunciSiswa(q) + (q.bahas ? '<div style="margin-top:12px;padding:14px;border-radius:10px;background:var(--surface-3)"><b class="kecil">Pembahasan</b>' + htmlKonten(q.bahas) + '</div>' : '<p class="kecil muted">Pembahasan soal ini belum tersedia.</p>') + '</article>';
      }).join('');
    hidrasi(isi);
  };
  function kunciSiswa(q) {
    const huruf = (k) => { const i = (q.o || []).findIndex((o) => o.k === k); return i >= 0 ? HURUF[i] : k; };
    const tampil = (v) => v == null || v === '' ? '—' : q.b === 'PG' ? huruf(v) : q.b === 'PGK_MCMA' ? [].concat(v).map(huruf).join(', ') : Array.isArray(v) ? v.map((x) => x || '—').join(', ') : typeof v === 'object' ? Object.keys(v).map((k) => k + '→' + v[k]).join(', ') : String(v);
    let opsiHtml = '';
    if (Array.isArray(q.o)) opsiHtml = '<ol type="A" style="margin:8px 0 0">' + q.o.map((o) => '<li>' + htmlKonten(o.t) + '</li>').join('') + '</ol>';
    if (q.o && q.o.pernyataan) opsiHtml = '<ol style="margin:8px 0 0">' + q.o.pernyataan.map((p) => '<li>' + htmlKonten(p.t) + '</li>').join('') + '</ol>';
    return opsiHtml + '<div class="baris dua kecil" style="margin-top:10px"><div><span class="muted">Jawabanmu:</span> <b>' + esc(tampil(q.jw)) + '</b></div>' +
      (q.k != null ? '<div><span class="muted">Kunci:</span> <b>' + esc(tampil(q.k)) + '</b></div>' : '') + '</div>';
  }

  // ------------------------------------------------------------ RUTE
  function wajibSiswa() { if (!App.token) Auth.pulih(); if (!App.token) { go('#/masuk'); return false; } if (App.role !== 'siswa') { go('#/admin/dashboard'); return false; } return true; }
  Router.tambah(/^ujian\/([\w-]+)$/, (m) => { if (wajibSiswa()) CBT.buka(m[0]); });
  Router.tambah(/^siswa(?:\/(konfirmasi|hasil|pembahasan)\/([\w-]+))?$/, (m) => {
    if (!wajibSiswa()) return;
    if (CBT.s && !CBT.s.selesai && !CBT.s.preview && document.body.classList.contains('mode-ujian')) { go('#/ujian/' + CBT.s.sid); return; }
    Router.buang('ujian');
    if (m[0] === 'konfirmasi') Siswa.konfirmasi(m[1]);
    else if (m[0] === 'hasil') Siswa.hasil(m[1]);
    else if (m[0] === 'pembahasan') Siswa.pembahasan(m[1]);
    else Siswa.beranda();
  });
})();
