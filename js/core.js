/* =====================================================================
   core.js — fondasi: API ke GAS, cache perangkat (SWR), pengukur, UI,
   sanitasi konten soal, KaTeX, router hash, sesi.
   ===================================================================== */
(function () {
  'use strict';
  const V = '1.1.0';
  const CFG = window.APP_CONFIG || {};
  const LS = 'bsto:v1:';
  const App = window.App = { v: V, token: null, me: null, role: null, boot: null, data: {} };

  // ------------------------------------------------------------ util
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
  function debounce(fn, ms) { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }

  // ------------------------------------------------------------ penyimpanan perangkat
  const Store = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) {
      const s = JSON.stringify(v);
      try { localStorage.setItem(LS + k, s); }
      catch (e) {
        Object.keys(localStorage).filter((x) => x.indexOf(LS + 'u:') === 0 && x.indexOf(Store.ns()) < 0).forEach((x) => localStorage.removeItem(x));
        try { localStorage.setItem(LS + k, s); } catch (e2) { /* tetap jalan tanpa cache */ }
      }
    },
    del(k) { try { localStorage.removeItem(LS + k); } catch (e) { } },
    ns() { return 'u:' + (App.me ? (App.me.id || App.me.nis) : 'anon') + ':'; },
    u(k) { return Store.ns() + k; },
    hapusPengguna() { Object.keys(localStorage).filter((x) => x.indexOf(LS + Store.ns()) === 0).forEach((x) => localStorage.removeItem(x)); }
  };

  // ------------------------------------------------------------ pengukur (Perf.table() di console)
  const Perf = window.Perf = {
    rows: [],
    add(a, total, server, cached) { this.rows.push({ aksi: a, total: Math.round(total), server: server == null ? null : server, net: server == null ? null : Math.round(total - server), cache: !!cached }); if (this.rows.length > 200) this.rows.shift(); },
    table() { console.table(this.rows.slice(-30)); },
    summary() { const g = {}; this.rows.forEach((r) => { const x = g[r.aksi] || (g[r.aksi] = { n: 0, total: 0, server: 0 }); x.n++; x.total += r.total; x.server += r.server || 0; }); console.table(Object.keys(g).map((k) => ({ aksi: k, n: g[k].n, rata_total: Math.round(g[k].total / g[k].n), rata_server: Math.round(g[k].server / g[k].n) }))); }
  };

  // ------------------------------------------------------------ status jaringan
  const Net = {
    on: true,
    set(v) { if (this.on === v) return; this.on = v; $$('.status-net').forEach((el) => { el.classList.toggle('mati', !v); el.textContent = v ? 'Terhubung' : 'Terputus'; }); },
    ok() { this.set(true); }, gagal() { this.set(false); }
  };
  addEventListener('online', () => Net.ok());
  addEventListener('offline', () => Net.gagal());

  // ------------------------------------------------------------ API
  const BACA = /^(app\.info|siswa\.boot|admin\.boot|dash\.|soal\.(daftar|detail)|job\.daftar|stimulus\.daftar|paket\.(daftar|detail|otomatis|pratinjau)|monitor\.data|hasil\.(rekap|siswa|butir)|akun\.daftar|sistem\.status|migrasi\.pindai|doc\.(template|pejabat|dokumen|zip|unduh)|media\.ambil|to\.pembahasan|batch|paket\.nilaiPratinjau|sistem\.storage)$/;
  const LAMA = /^(job\.(halaman|buat)|bahas\.generate|doc\.(generate|proses|zip|massal|pratinjau|unduh|revisi)|migrasi\.|akun\.(imporSiswa|resetSandi)|hasil\.hitungButir|soal\.status|sistem\.(storage|backup|bersihkan))/;
  const _inflight = {};
  let _epoch = 0;
  function konfigOk() { return CFG.GAS_URL && !/GANTI|XXXX/.test(CFG.GAS_URL); }

  async function apiRun(action, data, opt, baca) {
    if (!konfigOk()) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL Web App (/exec).' };
    opt = opt || {};
    const body = { action, data: data || {}, token: App.token };
    if (!baca) body.rid = opt.rid || rid();
    const t0 = performance.now();
    const coba = opt.coba || 2;
    for (let i = 0; i < coba; i++) {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), opt.batas || (LAMA.test(action) ? 330000 : 60000));
      try {
        const res = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: ctl.signal });
        clearTimeout(to);
        const j = await res.json();
        Perf.add(action, performance.now() - t0, j.ms, j.cached);
        Net.ok();
        if (!j.success && j.code === 'AUTH' && App.token && !opt.diam) Auth.keluar('Sesi Anda berakhir. Silakan masuk lagi.');
        return j;
      } catch (e) {
        clearTimeout(to);
        if (i === coba - 1) {
          Net.gagal();
          return { success: false, offline: true, message: e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak terhubung ke server. Periksa koneksi internet.' };
        }
        await sleep(900 * (i + 1));
      }
    }
  }
  /** Baca: permintaan identik menumpang yang sedang berjalan. Tulis: menaikkan epoch agar baca berikutnya segar. */
  function api(action, data, opt) {
    if (!BACA.test(action)) { _epoch++; return apiRun(action, data, opt, false); }
    const k = _epoch + '|' + action + '|' + App.token + '|' + JSON.stringify(data || {});
    if (_inflight[k]) return _inflight[k];
    const p = apiRun(action, data, opt, true);
    _inflight[k] = p;
    p.finally(() => delete _inflight[k]);
    return p;
  }
  /** Penggabung otomatis: baca di tik yang sama → satu eksekusi GAS (batch). */
  const Batcher = {
    q: null,
    add(action, data) {
      return new Promise((res) => {
        if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); }
        this.q.push({ action, data: data || {}, res });
      });
    },
    async flush() {
      const q = this.q; this.q = null;
      if (q.length === 1) { q[0].res(await api(q[0].action, q[0].data)); return; }
      const calls = q.slice(0, 10).map((x, i) => ({ action: x.action, data: x.data, key: 'k' + i }));
      const r = await api('batch', { calls });
      q.slice(0, 10).forEach((x, i) => x.res(r.success ? r.data['k' + i] : r));
      q.slice(10).forEach(async (x) => x.res(await api(x.action, x.data)));
    }
  };
  const apiQ = (a, d) => (App.role && App.role !== 'siswa' ? Batcher.add(a, d) : api(a, d));

  /** Tampilkan cache perangkat seketika, segarkan di latar bila sudah basi; render ulang hanya bila data berubah. */
  async function swr(key, action, data, render, opt) {
    opt = opt || {};
    const fresh = opt.fresh == null ? 30000 : opt.fresh;
    const c = Store.get(Store.u(key), null);
    if (c && render) render(c.data, true);
    if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
    const res = await (opt.langsung ? api(action, data) : apiQ(action, data));
    if (res && res.success) {
      const h = hashStr(JSON.stringify(res.data));
      Store.set(Store.u(key), { t: Date.now(), h, data: res.data });
      if (render && (!c || c.h !== h)) render(res.data, false);
    } else if (!c && opt.onError) opt.onError(res);
    else if (res && !res.success && !res.offline) toast(res.message, 'err');
    return res;
  }
  const basi = (...keys) => keys.forEach((k) => { const c = Store.get(Store.u(k), null); if (c) { c.t = 0; Store.set(Store.u(k), c); } });

  // ------------------------------------------------------------ aktivitas & polling adaptif
  const Activity = {
    at: Date.now(), last: {},
    init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach((ev) => addEventListener(ev, () => { this.at = Date.now(); }, { passive: true })); },
    idle() { return Date.now() - this.at > 120000; },
    due(key, activeMs, idleMs) {
      if (document.visibilityState !== 'visible') return false;
      if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : activeMs) - 500) return false;
      this.last[key] = Date.now(); return true;
    }
  };
  Activity.init();
  function warmUp(scope) {
    if (!konfigOk()) return;
    const k = 'warm_' + scope, t = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - t < 240000) return;
    sessionStorage.setItem(k, String(Date.now()));
    fetch(CFG.GAS_URL + '?w=' + scope, { mode: 'no-cors' }).catch(() => { });
  }

  // ------------------------------------------------------------ ikon (SVG garis)
  const IKON = {
    dash: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', unggah: 'M12 16V4M7 9l5-5 5 5M4 20h16',
    review: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9', bank: 'M4 5c0-1 4-2 8-2s8 1 8 2-4 2-8 2-8-1-8-2zM4 5v14c0 1 4 2 8 2s8-1 8-2V5M4 12c0 1 4 2 8 2s8-1 8-2',
    bahas: 'M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z', komp: 'M4 6h16M4 12h10M4 18h6M17 15l2 2 3-4',
    paket: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8', monitor: 'M2 12h4l3-7 4 14 3-7h6', hasil: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    akun: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM3 21a9 9 0 0 1 18 0', dok: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
    migrasi: 'M4 7h13l-3-3M20 17H7l3 3', set: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    keluar: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', menu: 'M3 6h18M3 12h18M3 18h18', x: 'M18 6L6 18M6 6l12 12', cek: 'M20 6L9 17l-5-5',
    awas: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01', segar: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
    unduh: 'M12 4v12M7 11l5 5 5-5M4 20h16', tambah: 'M12 5v14M5 12h14', cari: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', jam: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    bendera: 'M4 22V4M4 4h13l-2 4 2 4H4', kiri: 'M15 18l-6-6 6-6', kanan: 'M9 18l6-6-6-6', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    mata: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', pensil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    hapus: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', gembok: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-4M12 8h.01',
    sekolah: 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5', potong: 'M6 3v12a3 3 0 0 0 3 3h12M3 6h12a3 3 0 0 1 3 3v12', bulan: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
    layar: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3', kunci: 'M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7z'
  };
  const ik = (n, cls) => '<svg class="ik ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (IKON[n] || '') + '"/></svg>';

  // ------------------------------------------------------------ UI
  function toast(msg, type, ms) {
    if (!msg) return;
    const box = $('#toast'), el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = ik(type === 'err' ? 'awas' : type === 'warn' ? 'info' : 'cek') + '<div>' + esc(msg) + '</div>';
    box.appendChild(el);
    setTimeout(() => el.remove(), ms || (type === 'err' ? 6000 : 3500));
  }
  /** modal({judul, isi, ukuran, tombol:[{label, kelas, nilai, aksi(el)}], tutup:true}) → {el, tutup, hasil:Promise} */
  function modal(o) {
    const lapis = document.createElement('div');
    lapis.className = 'lapis';
    lapis.innerHTML = '<div class="modal ' + (o.ukuran || '') + '" role="dialog" aria-modal="true"><div class="modal-kepala"><h3>' + esc(o.judul || '') + '</h3>' +
      (o.tutup === false ? '' : '<button class="btn hantu kecil ikon" data-x aria-label="Tutup">' + ik('x') + '</button>') + '</div><div class="modal-isi">' + (o.isi || '') + '</div>' +
      ((o.tombol || []).length ? '<div class="modal-kaki">' + o.tombol.map((t, i) => '<button class="btn ' + (t.kelas || '') + '" data-i="' + i + '">' + t.label + '</button>').join('') + '</div>' : '') + '</div>';
    document.body.appendChild(lapis);
    let selesai;
    const hasil = new Promise((r) => { selesai = r; });
    const tutup = (v) => { lapis.remove(); document.removeEventListener('keydown', kunciEsc); selesai(v); };
    const kunciEsc = (e) => { const atas = $$('.lapis').pop(); if (e.key === 'Escape' && o.tutup !== false && atas === lapis) tutup(null); };
    document.addEventListener('keydown', kunciEsc);
    lapis.addEventListener('click', async (e) => {
      if (e.target === lapis && o.tutup !== false && !o.lekat) return tutup(null);
      if (e.target.closest('[data-x]')) return tutup(null);
      const b = e.target.closest('.modal-kaki [data-i]');
      if (!b) return;
      const t = o.tombol[+b.dataset.i];
      if (t.aksi) {
        sibuk(b, true);
        let r;
        try { r = await t.aksi(lapis.querySelector('.modal')); } finally { sibuk(b, false); }
        if (r === false) return;
        tutup(r === undefined ? t.nilai : r);
      } else tutup(t.nilai);
    });
    const f = lapis.querySelector('input:not([type=checkbox]):not([type=radio]), textarea, select');
    if (f && o.fokus !== false) setTimeout(() => f.focus(), 30);
    return { el: lapis.querySelector('.modal'), tutup, hasil };
  }
  function konfirmasi(pesan, o) {
    o = o || {};
    return modal({ judul: o.judul || 'Konfirmasi', isi: '<p style="margin:0">' + pesan + '</p>', tombol: [{ label: o.batal || 'Batal', nilai: false }, { label: o.ya || 'Ya, lanjutkan', kelas: o.bahaya ? 'bahaya' : 'utama', nilai: true }] }).hasil.then((v) => !!v);
  }
  function tanya(judul, label, nilai, tipe) {
    return modal({ judul, isi: field(label, '<input class="inp" id="tanya-isi" type="' + (tipe || 'text') + '" value="' + esc(nilai || '') + '">'),
      tombol: [{ label: 'Batal', nilai: null }, { label: 'Simpan', kelas: 'utama', aksi: (m) => m.querySelector('#tanya-isi').value }] }).hasil;
  }
  function sibuk(btn, on, teks) {
    if (!btn) return;
    if (on) { btn.dataset.asli = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="putar"></span>' + (teks ? ' ' + esc(teks) : ''); }
    else { btn.disabled = false; if (btn.dataset.asli != null) btn.innerHTML = btn.dataset.asli; }
  }
  const field = (label, input, bantu) => '<div class="field"><label>' + esc(label) + '</label>' + input + (bantu ? '<div class="bantu">' + bantu + '</div>' : '') + '</div>';
  const opsi = (list, nilai, kosong) => (kosong != null ? '<option value="">' + esc(kosong) + '</option>' : '') +
    list.map((x) => { const v = typeof x === 'object' ? x.v : x, l = typeof x === 'object' ? x.l : x; return '<option value="' + esc(v) + '"' + (String(v) === String(nilai) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('');
  const lencana = (teks, jenis) => '<span class="lencana ' + (jenis || '') + '">' + esc(teks) + '</span>';
  const bar = (persen, kelas) => '<div class="bar"><i class="' + (kelas || '') + '" style="width:' + Math.max(0, Math.min(100, persen || 0)) + '%"></i></div>';

  // ------------------------------------------------------------ format
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const fmt = {
    tgl(v, jam) { if (!v) return '—'; const d = new Date(v); if (isNaN(d)) return String(v); const p = (n) => String(n).padStart(2, '0'); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() + (jam === false ? '' : ' ' + p(d.getHours()) + ':' + p(d.getMinutes())); },
    jam(detik) { detik = Math.max(0, Math.round(detik || 0)); const h = Math.floor(detik / 3600), m = Math.floor(detik % 3600 / 60), s = detik % 60, p = (n) => String(n).padStart(2, '0'); return (h ? p(h) + ':' : '') + p(m) + ':' + p(s); },
    durasi(detik) { detik = Math.round(detik || 0); if (detik < 60) return detik + ' dtk'; const m = Math.round(detik / 60); return m < 60 ? m + ' mnt' : Math.floor(m / 60) + ' j ' + (m % 60) + ' mnt'; },
    angka(n, d) { return Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: d == null ? 1 : d }); },
    lalu(v) { const s = (Date.now() - new Date(v).getTime()) / 1000; if (!v || isNaN(s)) return '—'; if (s < 60) return Math.round(s) + ' dtk lalu'; if (s < 3600) return Math.round(s / 60) + ' mnt lalu'; if (s < 86400) return Math.round(s / 3600) + ' jam lalu'; return fmt.tgl(v, false); },
    inputTgl(v) { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return ''; const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  };

  // ------------------------------------------------------------ berkas
  function bacaB64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Gagal membaca berkas')); r.readAsDataURL(file); }); }
  function unduhBlob(blob, nama) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  function unduhB64(b64, nama, mime) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); unduhBlob(new Blob([u], { type: mime || 'application/octet-stream' }), nama); }
  async function gambarKecil(file, maks, kualitas) {
    const url = URL.createObjectURL(file), img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; });
    const s = Math.min(1, (maks || 1600) / img.naturalWidth), c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return { canvas: c, b64: c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', kualitas || 0.85).split(',')[1], mime: file.type === 'image/png' ? 'image/png' : 'image/jpeg' };
  }

  // ------------------------------------------------------------ pustaka dimuat saat perlu (versi dipin)
  const _lib = {};
  function muatSkrip(src) { return _lib[src] || (_lib[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete _lib[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); })); }
  function muatCss(href) { if (_lib[href]) return _lib[href]; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); return (_lib[href] = Promise.resolve()); }
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  const Lib = {
    async katex() { muatCss(CDN + 'KaTeX/0.16.9/katex.min.css'); await muatSkrip(CDN + 'KaTeX/0.16.9/katex.min.js'); await muatSkrip(CDN + 'KaTeX/0.16.9/contrib/auto-render.min.js'); return window.renderMathInElement; },
    async pdf() { await muatSkrip(CDN + 'pdf.js/3.11.174/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN + 'pdf.js/3.11.174/pdf.worker.min.js'; return window.pdfjsLib; },
    async xlsx() { await muatSkrip(CDN + 'xlsx/0.18.5/xlsx.full.min.js'); return window.XLSX; },
    async qr() { await muatSkrip(CDN + 'qrcode-generator/1.4.4/qrcode.min.js'); return window.qrcode; }
  };
  let _katexSiap = null;
  function renderMath(el) {
    if (!el || !/\$|\\\(|\\\[/.test(el.textContent)) return;
    (_katexSiap || (_katexSiap = Lib.katex().catch(() => null))).then((rm) => {
      if (!rm) return;
      try { rm(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }], throwOnError: false, strict: 'ignore' }); } catch (e) { }
    });
  }

  // ------------------------------------------------------------ sanitasi konten soal (dari AI / guru)
  const TAG_OK = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, SUB: 1, SUP: 1, SPAN: 1, DIV: 1, TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TH: 1, TD: 1,
    UL: 1, OL: 1, LI: 1, IMG: 1, SMALL: 1, HR: 1, BLOCKQUOTE: 1, CAPTION: 1, COLGROUP: 1, COL: 1, H3: 1, H4: 1, CENTER: 1 };
  const urlDrive = (id, w) => 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 1200);
  function bersihkan(html) {
    const doc = new DOMParser().parseFromString('<div>' + String(html || '').replace(/\n/g, '<br>') + '</div>', 'text/html');
    const jalan = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1 || !TAG_OK[n.tagName]) {
          if (n.nodeType === 1 && !/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META)$/.test(n.tagName)) { jalan(n); n.replaceWith(...Array.from(n.childNodes)); } else n.remove();
          return;
        }
        Array.from(n.attributes).forEach((a) => {
          const nm = a.name.toLowerCase();
          const boleh = (n.tagName === 'IMG' && /^(data-drive|data-ref|alt|width)$/.test(nm)) || (/^(TD|TH)$/.test(n.tagName) && /^(colspan|rowspan)$/.test(nm)) ||
            (n.tagName === 'IMG' && nm === 'src' && /^(data:image\/(png|jpe?g|gif|webp);|https:\/\/(drive\.google\.com|lh3\.googleusercontent\.com)\/)/i.test(a.value));
          if (!boleh) n.removeAttribute(a.name);
        });
        if (n.tagName === 'IMG') {
          const id = n.getAttribute('data-drive');
          if (id && /^[\w-]{10,}$/.test(id)) { n.setAttribute('src', urlDrive(id)); n.setAttribute('loading', 'lazy'); n.setAttribute('referrerpolicy', 'no-referrer'); }
          else if (n.getAttribute('data-ref')) { n.replaceWith(Object.assign(document.createElement('span'), { className: 'lencana warn', textContent: 'gambar ' + n.getAttribute('data-ref') + ' belum dipotong' })); return; }
          if (!n.getAttribute('alt')) n.setAttribute('alt', 'Gambar soal');
        }
        jalan(n);
      });
    };
    jalan(doc.body.firstChild);
    return doc.body.firstChild.innerHTML;
  }
  function isiKonten(el, html) {
    el.innerHTML = bersihkan(html);
    $$('img[data-drive]', el).forEach((img) => { img.onerror = () => { img.onerror = null; img.src = 'https://lh3.googleusercontent.com/d/' + img.dataset.drive + '=w1200'; }; });
    renderMath(el);
    return el;
  }
  const htmlKonten = (html, cls) => '<div class="isi-soal ' + (cls || '') + '" data-konten="' + esc(html || '') + '"></div>';
  function hidrasi(root) { $$('[data-konten]', root).forEach((el) => { isiKonten(el, el.getAttribute('data-konten')); el.removeAttribute('data-konten'); }); }

  // ------------------------------------------------------------ sesi
  const Auth = {
    simpan(d, role) { App.token = d.token; App.me = d.me; App.role = role || d.me.role; Store.set('sesi', { token: d.token, me: d.me, role: App.role, t: Date.now() }); },
    pulih() { const s = Store.get('sesi', null); if (s && s.token) { App.token = s.token; App.me = s.me; App.role = s.role; return true; } return false; },
    keluar(pesan) {
      Store.del('sesi'); App.token = null; App.me = null; App.role = null; App.boot = null;
      document.body.className = ''; document.documentElement.classList.remove('gelap');
      location.hash = '#/masuk';
      if (pesan) setTimeout(() => toast(pesan, 'warn'), 50);
      Router.jalan();
    }
  };
  App.perangkat = function () { let d = Store.get('perangkat', ''); if (!d) { d = rid().slice(0, 18); Store.set('perangkat', d); } return d; };
  App.info = Store.get('info', null) || { NAMA_SEKOLAH: 'Sekolah', NAMA_APP: 'Bank Soal & Try Out Online', LOGO_ID: '' };
  App.logo = (cls) => App.info.LOGO_ID ? '<img src="' + urlDrive(App.info.LOGO_ID, 200) + '" alt="Logo ' + esc(App.info.NAMA_SEKOLAH) + '" referrerpolicy="no-referrer">' : ik('sekolah');
  App.setInfo = function (i) {
    if (!i) return;
    App.info = Object.assign({}, App.info, i);
    Store.set('info', App.info);
    document.title = App.info.NAMA_APP + ' — ' + App.info.NAMA_SEKOLAH;
    if (window.Publik && Publik.segarMerek) Publik.segarMerek();
  };

  // ------------------------------------------------------------ router hash (layar disimpan, tidak dibuang)
  const Router = {
    rute: [], layar: {},
    tambah(pola, fn) { this.rute.push({ pola, fn }); },
    jalan() {
      const h = location.hash.replace(/^#\/?/, '') || '';
      for (const r of this.rute) { const m = h.match(r.pola); if (m) { r.fn(m.slice(1).map((x) => x && decodeURIComponent(x))); return; } }
      if (this.bawaan) this.bawaan();
    },
    /** Tampilkan satu layar tingkat atas; dibuat sekali lalu disimpan. */
    tampil(nama, buat) {
      const app = $('#app');
      $$('#app > .layar').forEach((el) => { el.hidden = el.dataset.layar !== nama; });
      let el = $('#app > .layar[data-layar="' + nama + '"]');
      if (!el) { $$('#app > :not(.layar)').forEach((x) => x.remove()); el = document.createElement('div'); el.className = 'layar'; el.dataset.layar = nama; app.appendChild(el); buat(el); }
      return el;
    },
    buang(nama) { const el = $('#app > .layar[data-layar="' + nama + '"]'); if (el) el.remove(); }
  };
  const go = (h) => { if (location.hash === h) Router.jalan(); else location.hash = h; };
  addEventListener('hashchange', () => Router.jalan());

  /** Muat modul admin hanya setelah staf masuk (perangkat siswa tidak mengunduhnya). */
  let _admin = null;
  App.muatAdmin = function () {
    return _admin || (_admin = (async () => { for (const f of ['admin', 'admin-soal', 'admin-to', 'admin-alat']) await muatSkrip('js/' + f + '.js?v=' + V); })());
  };

  Object.assign(window, { $, $$, esc, sleep, debounce, Store, api, apiQ, swr, basi, Activity, warmUp, ik, toast, modal, konfirmasi, tanya, sibuk, field, opsi, lencana, bar, fmt,
    bacaB64, unduhB64, unduhBlob, gambarKecil, Lib, renderMath, bersihkan, isiKonten, htmlKonten, hidrasi, Auth, Router, go, Net, urlDrive, hashStr, konfigOk, CFG });

  document.addEventListener('DOMContentLoaded', () => {
    if (konfigOk()) {
      fetch(CFG.GAS_URL + '?action=info').then((r) => r.json()).then((j) => { if (j.success) { App.setInfo(j.data); const l = $('#app .publik-atas'); if (l && window.Publik) Publik.segarMerek(); } }).catch(() => { });
    }
    setTimeout(() => Router.jalan(), 0);
  });
})();
