/* =====================================================================
   admin-soal.js — Unggah & Ekstraksi, Antrean Review, Bank Soal,
   Editor Soal (dipakai bersama), Generator Pembahasan
   ===================================================================== */
(function () {
  'use strict';
  const HURUF = 'ABCDE';

  // ============================================================ EDITOR SOAL
  const Editor = window.SoalEditor = {};
  Editor.html = function (s, stim) {
    s = s || {}; stim = stim || null;
    const mapel = s.mapel || Admin.mapelSaya()[0] || '';
    return '<div class="e-form"><div class="baris">' +
      field('Mapel', '<select class="inp" data-e="mapel">' + opsi(Admin.mapelSaya(), mapel) + '</select>') +
      field('Bentuk soal', '<select class="inp" data-e="bentuk">' + opsi(Object.keys(BENTUK_LABEL).map((k) => ({ v: k, l: BENTUK_LABEL[k] })), s.bentuk || 'PG') + '</select>') +
      field('Kesulitan', '<select class="inp" data-e="kes">' + opsi(['mudah', 'sedang', 'sulit'], s.kes || 'sedang') + '</select>') + '</div>' +
      '<div class="baris dua">' + field('Kompetensi', '<select class="inp" data-e="idk"></select>') + field('Sub kompetensi', '<select class="inp" data-e="ids"></select>') + '</div>' +
      '<details class="kartu" style="padding:12px 14px;margin-bottom:14px"' + (stim ? ' open' : '') + '><summary style="cursor:pointer;font-weight:600">Stimulus (bacaan, tabel, grafik) ' + (stim ? '— ' + esc(stim.judul || stim.id) : '') + '</summary>' +
      '<div style="margin-top:12px"><div class="baris dua">' + field('Pakai stimulus', '<select class="inp" data-e="stimPilih"><option value="">Tanpa stimulus</option>' + (stim ? '<option value="' + esc(stim.id) + '" selected>' + esc(stim.id + ' — ' + (stim.judul || '')) + '</option>' : '') + '<option value="__baru">+ Stimulus baru</option></select>') +
      field('Tipe', '<select class="inp" data-e="stimTipe">' + opsi([{ v: 'utama', l: 'Untuk satu soal' }, { v: 'kelompok', l: 'Kelompok (dipakai beberapa soal)' }], stim ? stim.tipe : 'utama') + '</select>') + '</div>' +
      '<div data-e="stimArea"' + (stim ? '' : ' hidden') + '>' + field('Judul stimulus', '<input class="inp" data-e="stimJudul" value="' + esc(stim ? stim.judul : '') + '">') +
      field('Isi stimulus', '<textarea class="inp kode" rows="6" data-e="stimKonten" data-sisip>' + esc(stim ? stim.konten : '') + '</textarea>', 'HTML sederhana + LaTeX di antara $…$. Gambar: potong dari halaman asli atau unggah.') +
      '<div class="pratinjau isi-soal" data-e="stimPrev"></div></div></div></details>' +
      field('Teks soal', '<textarea class="inp kode" rows="5" data-e="teks" data-sisip>' + esc(s.teks || '') + '</textarea>', 'Rumus: $\\frac{3}{4}$, $x^{2}$, $\\sqrt{2}$, $90^{\\circ}$. Tabel: &lt;table&gt;…') +
      '<div class="pratinjau isi-soal" data-e="teksPrev" style="margin-bottom:14px"></div>' +
      '<div data-e="opsiArea"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px"><label class="btn kecil" style="cursor:pointer">' + ik('unggah') + 'Unggah gambar ke teks<input type="file" accept="image/*" data-e="unggahGbr" hidden></label></div>' +
      field('Catatan', '<input class="inp" data-e="catatan" value="' + esc(s.catatan || '') + '">') + '</div>';
  };
  Editor.pasang = function (root, s, stim) {
    s = s || {};
    const q = (k) => root.querySelector('[data-e="' + k + '"]');
    let bentuk = s.bentuk || 'PG', fokus = q('teks');
    const isiKomp = () => {
      const m = q('mapel').value, k = Admin.kompMapel(m);
      q('idk').innerHTML = opsi(k.map((x) => ({ v: x.id, l: x.kode + ' — ' + x.nama })), s.idk, k.length ? '— pilih —' : 'Belum ada kompetensi');
      isiSub();
    };
    const isiSub = () => { const sub = Admin.subKomp(q('idk').value); q('ids').innerHTML = opsi(sub.map((x) => ({ v: x.id, l: x.kode + ' — ' + x.nama })), s.ids, '— opsional —'); };
    isiKomp();
    q('mapel').onchange = () => { s.idk = ''; s.ids = ''; isiKomp(); muatStim(); };
    q('idk').onchange = () => { s.ids = ''; isiSub(); };
    const muatStim = async () => {
      const r = await api('stimulus.daftar', { mapel: q('mapel').value });
      if (!r.success) return;
      const sel = q('stimPilih'), cur = sel.value;
      sel.innerHTML = '<option value="">Tanpa stimulus</option>' + r.data.slice(-200).reverse().map((x) => '<option value="' + esc(x.id) + '"' + (x.id === cur ? ' selected' : '') + '>' + esc(x.id + ' — ' + (x.judul || x.ring.slice(0, 50))) + (x.dipakai ? ' (' + x.dipakai + ' soal)' : '') + '</option>').join('') + '<option value="__baru">+ Stimulus baru</option>';
      if (cur && !$$('option', sel).some((o) => o.value === cur) && stim) sel.insertAdjacentHTML('afterbegin', '<option value="' + esc(stim.id) + '" selected>' + esc(stim.id) + '</option>');
      sel.value = cur;
    };
    muatStim();
    q('stimPilih').onchange = () => {
      const v = q('stimPilih').value;
      q('stimArea').hidden = !v;
      if (v === '__baru') { q('stimJudul').value = ''; q('stimKonten').value = ''; root.dataset.stimUbah = '1'; }
      else if (v && (!stim || v !== stim.id)) { q('stimArea').hidden = true; root.dataset.stimUbah = ''; }
      prev();
    };
    q('stimKonten').addEventListener('input', () => { root.dataset.stimUbah = '1'; });
    q('stimJudul').addEventListener('input', () => { root.dataset.stimUbah = '1'; });
    q('bentuk').onchange = () => { const lama = Editor.kumpul(root, true); bentuk = q('bentuk').value; renderOpsi(Object.assign({}, lama, { bentuk })); prev(); };
    const renderOpsi = (x) => { q('opsiArea').innerHTML = opsiHtml(x.bentuk || bentuk, x); };
    renderOpsi(s);
    const prev = debounce(() => {
      isiKonten(q('teksPrev'), q('teks').value || '<span class="muted">Pratinjau teks soal</span>');
      if (!q('stimArea').hidden) isiKonten(q('stimPrev'), q('stimKonten').value);
    }, 250);
    root.addEventListener('input', (e) => { if (e.target.matches('[data-e=teks],[data-e=stimKonten]')) prev(); });
    root.addEventListener('focusin', (e) => { if (e.target.matches('[data-sisip], .o-teks')) fokus = e.target; });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-o]');
      if (!b) return;
      const x = Editor.kumpul(root, true);
      if (b.dataset.o === 'tambah' && Array.isArray(x.opsi) && x.opsi.length < 5) x.opsi.push({ k: HURUF[x.opsi.length], t: '' });
      if (b.dataset.o === 'hapus') { x.opsi.splice(+b.dataset.i, 1); x.opsi.forEach((o, i) => { o.k = HURUF[i]; }); x.kunci = null; }
      if (b.dataset.o === 'tambahP') x.opsi.pernyataan.push({ t: '' });
      if (b.dataset.o === 'hapusP') { x.opsi.pernyataan.splice(+b.dataset.i, 1); if (Array.isArray(x.kunci)) x.kunci.splice(+b.dataset.i, 1); }
      renderOpsi(x);
    });
    root.addEventListener('change', (e) => { if (e.target.matches('[data-e=jKiri],[data-e=jKanan]')) renderOpsi(Editor.kumpul(root, true)); });
    q('unggahGbr').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const g = await gambarKecil(f, 1200, 0.86);
      const r = await api('media.unggah', { b64: g.b64, mime: g.mime, nama: f.name, jenis: 'stimulus' });
      if (r.success) Editor.sisip(root, '<img data-drive="' + r.data.id + '">'); else toast(r.message, 'err');
      e.target.value = '';
    };
    root._fokus = () => fokus;
    prev();
  };
  Editor.sisip = function (root, html) {
    const t = (root._fokus && root._fokus()) || root.querySelector('[data-e=teks]');
    const p = t.selectionStart == null ? t.value.length : t.selectionStart;
    t.value = t.value.slice(0, p) + html + t.value.slice(p);
    t.dispatchEvent(new Event('input', { bubbles: true }));
    if (t.matches('[data-e=stimKonten]')) root.dataset.stimUbah = '1';
    toast('Gambar disisipkan.', 'ok');
  };
  function opsiHtml(b, x) {
    const k = x.kunci;
    if (b === 'PG' || b === 'PGK_MCMA') {
      const o = Array.isArray(x.opsi) && x.opsi.length ? x.opsi : HURUF.slice(0, 4).split('').map((h) => ({ k: h, t: '' }));
      const kun = [].concat(k || []);
      return '<div class="lbl" style="margin-bottom:8px">Pilihan jawaban — centang kunci' + (b === 'PGK_MCMA' ? ' (lebih dari satu)' : '') + '</div>' +
        o.map((op, i) => '<div class="opsi-ed" style="grid-template-columns:34px 1fr 40px 36px"><span class="huruf">' + HURUF[i] + '</span><textarea class="inp o-teks" rows="1" data-oi="' + i + '">' + esc(op.t) + '</textarea>' +
          '<label class="kunci-pil" title="Tandai sebagai kunci"><input type="' + (b === 'PG' ? 'radio' : 'checkbox') + '" name="e-kunci" value="' + HURUF[i] + '"' + (kun.indexOf(op.k) >= 0 ? ' checked' : '') + ' aria-label="Kunci ' + HURUF[i] + '"></label>' +
          '<button class="btn kecil ikon hantu" data-o="hapus" data-i="' + i + '" aria-label="Hapus opsi">' + ik('hapus') + '</button></div>').join('') +
        (o.length < 5 ? '<button class="btn kecil" data-o="tambah">' + ik('tambah') + 'Tambah opsi</button>' : '');
    }
    if (b === 'PGK_KATEGORI') {
      const o = x.opsi && x.opsi.pernyataan ? x.opsi : { kolom: ['Benar', 'Salah'], pernyataan: [{ t: '' }, { t: '' }, { t: '' }] };
      const kun = Array.isArray(k) ? k : [];
      return '<div class="baris dua">' + field('Label kolom 1', '<input class="inp" data-e="kol0" value="' + esc(o.kolom[0]) + '">') + field('Label kolom 2', '<input class="inp" data-e="kol1" value="' + esc(o.kolom[1]) + '">') + '</div>' +
        o.pernyataan.map((p, i) => '<div class="opsi-ed" style="grid-template-columns:34px 1fr 160px 36px"><span class="huruf">' + (i + 1) + '</span><textarea class="inp o-teks" rows="1" data-pi="' + i + '">' + esc(p.t) + '</textarea>' +
          '<select class="inp" data-pk="' + i + '">' + opsi(o.kolom, kun[i], '— kunci —') + '</select><button class="btn kecil ikon hantu" data-o="hapusP" data-i="' + i + '">' + ik('hapus') + '</button></div>').join('') +
        '<button class="btn kecil" data-o="tambahP">' + ik('tambah') + 'Tambah pernyataan</button>';
    }
    if (b === 'ISIAN') return field('Jawaban yang diterima', '<input class="inp" data-e="isian" value="' + esc([].concat(k || []).join('; ')) + '">', 'Pisahkan variasi jawaban dengan titik koma. Contoh: 12; 12,0; dua belas');
    if (b === 'URAIAN') return field('Rubrik penilaian', '<textarea class="inp" rows="4" data-e="rubrik">' + esc(k && k.rubrik || '') + '</textarea>', 'Uraian dinilai manual oleh guru di menu Hasil.');
    if (b === 'JODOH') {
      const o = x.opsi && x.opsi.kiri ? x.opsi : { kiri: [], kanan: [] }, kun = k || {};
      return '<div class="baris dua">' + field('Kolom kiri (satu per baris)', '<textarea class="inp" rows="4" data-e="jKiri">' + esc(o.kiri.map((z) => z.t).join('\n')) + '</textarea>') +
        field('Kolom kanan (satu per baris)', '<textarea class="inp" rows="4" data-e="jKanan">' + esc(o.kanan.map((z) => z.t).join('\n')) + '</textarea>') + '</div>' +
        o.kiri.map((z) => '<div class="jodoh-baris"><span>' + esc(z.t) + '</span><select class="inp" data-jk="' + esc(z.id) + '">' + opsi(o.kanan.map((r) => ({ v: r.id, l: r.t })), kun[z.id], '— pasangan —') + '</select></div>').join('');
    }
    return '';
  }
  /** Kumpulkan isi form → objek soal. longgar=true tidak memvalidasi (dipakai saat render ulang). */
  Editor.kumpul = function (root, longgar) {
    const q = (k) => root.querySelector('[data-e="' + k + '"]');
    const b = q('bentuk').value;
    const s = { bentuk: b, mapel: q('mapel').value, idk: q('idk').value, ids: q('ids').value, kes: q('kes').value, teks: q('teks').value, catatan: q('catatan').value };
    if (b === 'PG' || b === 'PGK_MCMA') {
      s.opsi = $$('[data-oi]', root).map((t, i) => ({ k: HURUF[i], t: t.value }));
      const c = $$('[name=e-kunci]:checked', root).map((x) => x.value);
      s.kunci = b === 'PG' ? (c[0] || null) : c;
    } else if (b === 'PGK_KATEGORI') {
      const kol = [q('kol0') ? q('kol0').value : 'Benar', q('kol1') ? q('kol1').value : 'Salah'];
      s.opsi = { kolom: kol, pernyataan: $$('[data-pi]', root).map((t) => ({ t: t.value })) };
      s.kunci = $$('[data-pk]', root).map((x) => x.value || null);
    } else if (b === 'ISIAN') { s.kunci = q('isian') ? q('isian').value.split(';').map((x) => x.trim()).filter(Boolean) : []; s.opsi = null; }
    else if (b === 'URAIAN') { s.kunci = { rubrik: q('rubrik') ? q('rubrik').value : '' }; s.opsi = null; }
    else if (b === 'JODOH') {
      const kiri = (q('jKiri') ? q('jKiri').value : '').split('\n').map((x) => x.trim()).filter(Boolean), kanan = (q('jKanan') ? q('jKanan').value : '').split('\n').map((x) => x.trim()).filter(Boolean);
      s.opsi = { kiri: kiri.map((t, i) => ({ id: 'L' + (i + 1), t })), kanan: kanan.map((t, i) => ({ id: 'R' + (i + 1), t })) };
      s.kunci = {};
      $$('[data-jk]', root).forEach((x) => { if (x.value) s.kunci[x.dataset.jk] = x.value; });
    }
    const sp = q('stimPilih').value;
    s.id_stimulus = sp && sp !== '__baru' ? sp : '';
    if (sp && root.dataset.stimUbah && !q('stimArea').hidden) s._stim = { id: sp === '__baru' ? '' : sp, judul: q('stimJudul').value, konten: q('stimKonten').value, tipe: q('stimTipe').value, jenis: 'teks' };
    return s;
  };
  /** Simpan soal dengan status tertentu. Kembalikan respons server. */
  Editor.simpan = async function (root, dasar, status) {
    const s = Object.assign(Editor.kumpul(root), { id: dasar && dasar.id, status });
    const stim = s._stim; delete s._stim;
    const r = await api('soal.simpan', { soal: s, stimulus: stim || null });
    toast(r.message, r.success ? (r.data && r.data.peringatan ? 'warn' : 'ok') : 'err', r.success ? 4000 : 8000);
    if (r.success) { Admin.soalBasi(); root.dataset.stimUbah = ''; }
    return r;
  };
  Editor.tombol = function (id) {
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:8px">' +
      (id ? '<button class="btn bahaya kecil" data-simpan="hapus">' + ik('hapus') + 'Hapus</button><span style="flex:1"></span>' : '') +
      '<button class="btn" data-simpan="draft">Simpan draft</button><button class="btn ragu" data-simpan="bermasalah">' + ik('bendera') + 'Tandai bermasalah</button>' +
      (Admin.sa() ? '<button class="btn" data-simpan="ditinjau">Tandai ditinjau</button><button class="btn sukses" data-simpan="disetujui">' + ik('cek') + 'Setujui</button>'
        : '<button class="btn utama" data-simpan="ditinjau">' + ik('cek') + 'Kirim untuk persetujuan</button>') + '</div>';
  };

  // ============================================================ UNGGAH & EKSTRAKSI
  Admin.daftar('unggah', {
    judul: 'Unggah & Ekstraksi', ikon: 'unggah', grup: 'Manajemen soal',
    render(el) {
      const set = Admin.b().set;
      el.innerHTML = Admin.kepala('Unggah dokumen & ekstraksi AI', 'PDF ketik, PDF scan, Word, atau foto soal dipecah per halaman, dibaca AI, lalu masuk antrean review.') +
        (Admin.b().ai.ada ? '' : '<div class="alert warn">' + ik('awas') + '<div>Kunci API Gemini belum diisi. ' + (Admin.sa() ? '<a href="#/admin/pengaturan">Isi di Pengaturan</a>.' : 'Minta Super Admin mengisinya.') + '</div></div>') +
        '<div class="kisi k2"><section class="kartu"><div class="kartu-kepala"><h2>1. Atur unggahan</h2></div>' +
        field('Mata pelajaran', '<select class="inp" id="u-mapel">' + opsi(Admin.mapelSaya(), Admin.mapelSaya()[0]) + '</select>') +
        field('Mode hasil ekstraksi', '<div class="radio-kartu"><label><input type="radio" name="u-mode" value="review"' + (set.MODE_EKSTRAK !== 'otomatis' ? ' checked' : '') + '><span><b>Review manual</b> · disarankan<br><span class="kecil muted">Semua soal ditinjau guru sebelum masuk bank soal.</span></span></label>' +
          '<label><input type="radio" name="u-mode" value="otomatis"' + (set.MODE_EKSTRAK === 'otomatis' ? ' checked' : '') + '><span><b>Otomatis penuh</b><br><span class="kecil muted">Soal tanpa masalah langsung disetujui; yang bermasalah tetap masuk antrean.</span></span></label></div>') +
        '<label class="zona" id="u-zona"><input type="file" id="u-file" accept=".pdf,.docx,.jpg,.jpeg,.png" multiple hidden>' + ik('unggah') + '<b>Tarik berkas ke sini atau pilih berkas</b><span class="kecil muted">PDF, DOCX, JPG/PNG (beberapa foto = beberapa halaman). Maks ±25 MB.</span></label>' +
        '<div id="u-berkas" class="kecil" style="margin:10px 0"></div>' +
        '<label class="cek" style="margin-bottom:8px"><input type="checkbox" id="u-asli" checked>Simpan berkas asli ke Google Drive</label>' +
        '<label class="cek" style="margin-bottom:14px"><input type="checkbox" id="u-cepat">Proses 2 halaman sekaligus (lebih cepat; soal yang terpotong antarhalaman dicek manual)</label>' +
        '<button class="btn utama lebar" id="u-mulai" disabled>' + ik('bahas') + 'Mulai ekstraksi</button></section>' +
        '<section class="kartu"><div class="kartu-kepala"><div><h2>2. Progres</h2><p id="u-info">Belum ada proses berjalan.</p></div><span id="u-job"></span></div>' +
        '<div id="u-bar"></div><div class="ubin" id="u-ubin" style="margin:12px 0"></div>' +
        '<div class="kisi k3" style="margin-bottom:12px"><div class="kartu stat" style="padding:10px 12px"><div class="lab">Butir terbaca</div><div class="ang" id="u-nsoal" style="font-size:22px">0</div></div>' +
        '<div class="kartu stat" style="padding:10px 12px"><div class="lab">Gambar dipotong</div><div class="ang" id="u-ngbr" style="font-size:22px">0</div></div><div class="kartu stat" style="padding:10px 12px"><div class="lab">Perlu dicek</div><div class="ang" id="u-nmasalah" style="font-size:22px;color:var(--warn)">0</div></div></div>' +
        '<div class="konsol" id="u-log" aria-live="polite"></div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" id="u-ulang" hidden>' + ik('segar') + 'Ulangi halaman gagal</button><a class="btn utama" href="#/admin/review" id="u-review" hidden>Buka antrean review ' + ik('kanan') + '</a></div></section></div>' +
        '<section class="kartu" style="margin-top:16px"><div class="kartu-kepala"><div><h2>Riwayat unggahan</h2><p>Job yang belum selesai bisa dilanjutkan dengan memilih berkas yang sama.</p></div><button class="btn kecil" id="u-segar">' + ik('segar') + '</button></div><div id="u-riwayat"><div class="memuat"></div></div></section>';
      const zona = $('#u-zona', el), inp = $('#u-file', el);
      const pilih = (files) => { el.berkas = Array.from(files); $('#u-berkas', el).innerHTML = el.berkas.map((f) => '<span class="lencana polos">' + esc(f.name) + ' · ' + fmt.angka(f.size / 1048576) + ' MB</span>').join(' '); $('#u-mulai', el).disabled = !el.berkas.length; };
      inp.onchange = () => pilih(inp.files);
      ['dragover', 'dragenter'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('seret'); }));
      ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('seret'); if (ev === 'drop') pilih(e.dataTransfer.files); }));
      $('#u-mulai', el).onclick = () => mulaiEkstraksi(el, null);
      $('#u-ulang', el).onclick = () => mulaiEkstraksi(el, el.job, true);
      $('#u-segar', el).onclick = () => riwayatJob(el, true);
      $('#u-riwayat', el).addEventListener('click', (e) => { const b = e.target.closest('[data-lanjut]'); if (b) { el.lanjutId = b.dataset.lanjut; toast('Pilih lagi berkas yang sama, lalu tekan Mulai ekstraksi untuk melanjutkan ' + b.dataset.lanjut + '.', 'info', 7000); inp.click(); } });
    },
    tampil(el) { return riwayatJob(el, false); }
  });
  function riwayatJob(el, paksa) {
    return swr('jobs', 'job.daftar', {}, (d) => {
      $('#u-riwayat', el).innerHTML = d.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Job</th><th>Berkas</th><th>Mapel</th><th class="angka">Halaman</th><th class="angka">Soal</th><th>Mode</th><th>Status</th><th></th></tr></thead><tbody>' +
        d.map((j) => '<tr><td class="chip-id">' + esc(j.id) + '</td><td>' + esc(j.nama) + '<div class="kecil muted">' + esc(j.pengunggah) + ' · ' + fmt.lalu(j.tgl) + '</div></td><td>' + esc(j.mapel) + '</td><td class="angka">' + j.selesai + '/' + (j.total || '?') + '</td>' +
          '<td class="angka">' + j.soal + (j.masalah ? ' <span style="color:var(--warn-ink)">(' + j.masalah + ')</span>' : '') + '</td><td>' + (j.mode === 'otomatis' ? 'Otomatis' : 'Review') + '</td><td>' + Admin.status(j.status) + '</td>' +
          '<td style="white-space:nowrap">' + (j.status !== 'selesai' ? '<button class="btn kecil" data-lanjut="' + esc(j.id) + '">Lanjutkan</button> ' : '') + '<a class="btn kecil" href="#/admin/review/' + esc(j.id) + '">Review</a></td></tr>').join('') + '</tbody></table></div>'
        : '<div class="kosong"><strong>Belum ada unggahan</strong>Riwayat job ekstraksi akan muncul di sini.</div>';
      el.jobs = d;
    }, { fresh: paksa ? 0 : 20000 });
  }
  function log(el, teks, kls) {
    const box = $('#u-log', el), w = new Date().toLocaleTimeString('id-ID', { hour12: false });
    box.insertAdjacentHTML('beforeend', '<div class="' + (kls || '') + '"><span class="w">[' + w + ']</span> ' + esc(teks) + '</div>');
    box.scrollTop = box.scrollHeight;
  }
  /** Ubah berkas menjadi daftar "pembuat halaman" → masing-masing menghasilkan kanvas JPEG ±1600 px. */
  async function siapkanHalaman(el, files, jobBaru) {
    const f = files[0];
    if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf' || /\.docx?$/i.test(f.name)) {
      let data;
      if (/\.docx?$/i.test(f.name)) {
        log(el, 'Mengonversi Word ke PDF di Google Drive…');
        if (!jobBaru.pdfB64) throw new Error('Konversi Word gagal.');
        const bin = atob(jobBaru.pdfB64); data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
      } else data = new Uint8Array(await f.arrayBuffer());
      const pdfjs = await Lib.pdf();
      const doc = await pdfjs.getDocument({ data }).promise;
      return Array.from({ length: doc.numPages }, (_, i) => async () => {
        const page = await doc.getPage(i + 1), vp0 = page.getViewport({ scale: 1 }), sk = Math.min(2.5, 1600 / vp0.width), vp = page.getViewport({ scale: sk });
        const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: vp }).promise;
        return c;
      });
    }
    return files.map((file) => async () => (await gambarKecil(file, 1600, 0.85)).canvas);
  }
  function potongKanvas(c, kotak, maks) {
    const [y0, x0, y1, x1] = kotak.map((v) => Math.max(0, Math.min(1000, v)) / 1000);
    const pad = 0.008, sx = Math.max(0, x0 - pad) * c.width, sy = Math.max(0, y0 - pad) * c.height;
    const sw = Math.min(c.width - sx, (x1 - x0 + pad * 2) * c.width), sh = Math.min(c.height - sy, (y1 - y0 + pad * 2) * c.height);
    if (sw < 10 || sh < 10) return null;
    const sc = Math.min(1, (maks || 1200) / sw), o = document.createElement('canvas');
    o.width = Math.round(sw * sc); o.height = Math.round(sh * sc);
    const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height);
    g.drawImage(c, sx, sy, sw, sh, 0, 0, o.width, o.height);
    return o.toDataURL('image/jpeg', 0.88).split(',')[1];
  }
  async function mulaiEkstraksi(el, jobLama, ulangGagal) {
    const files = el.berkas || [];
    if (!files.length) return toast('Pilih berkas terlebih dahulu.', 'warn');
    if (el.jalan) return toast('Ekstraksi sedang berjalan.', 'warn');
    el.jalan = true;
    const btn = $('#u-mulai', el); sibuk(btn, true, 'Memproses…');
    $('#u-log', el).innerHTML = ''; $('#u-review', el).hidden = true; $('#u-ulang', el).hidden = true;
    const stat = { soal: 0, gbr: 0, masalah: 0 };
    const angka = () => { $('#u-nsoal', el).textContent = stat.soal; $('#u-ngbr', el).textContent = stat.gbr; $('#u-nmasalah', el).textContent = stat.masalah; };
    try {
      const f = files[0], word = /\.docx?$/i.test(f.name);
      let job = jobLama, jobBaru = {};
      const lanjutId = !job && el.lanjutId;
      el.lanjutId = null;
      if (lanjutId) job = (el.jobs || []).find((j) => j.id === lanjutId);
      if (!job || word) {
        const kirimAsli = $('#u-asli', el).checked && f.size < 15e6;
        log(el, word ? 'Mengunggah dokumen Word untuk dikonversi…' : 'Membuat job ekstraksi…');
        const r = await api('job.buat', { nama_file: files.length > 1 ? files.length + ' gambar (' + f.name + ', …)' : f.name, mapel: $('#u-mapel', el).value,
          mode: (el.querySelector('[name=u-mode]:checked') || {}).value, jumlah_halaman: 0, mime: f.type, b64: (kirimAsli || word) ? await bacaB64(f) : '' });
        if (!r.success) throw new Error(r.message);
        jobBaru = r.data;
        if (!job) job = { id: r.data.id, hal: {} };
      }
      el.job = job;
      $('#u-job', el).innerHTML = '<span class="chip-id">' + esc(job.id) + '</span>';
      const halaman = await siapkanHalaman(el, files, jobBaru);
      const total = halaman.length, selesai = job.hal || {};
      const antre = [];
      for (let i = 1; i <= total; i++) if (!selesai[i] || selesai[i].s !== 'ok' || (ulangGagal && selesai[i].s === 'gagal')) antre.push(i);
      log(el, total + ' halaman; ' + antre.length + ' akan diproses.', 's');
      $('#u-ubin', el).innerHTML = Array.from({ length: total }, (_, i) => '<div id="ub-' + (i + 1) + '" class="' + (selesai[i + 1] && selesai[i + 1].s === 'ok' ? 'ok' : '') + '"><b>Hal ' + (i + 1) + '</b><span>' + (selesai[i + 1] && selesai[i + 1].s === 'ok' ? selesai[i + 1].n + ' soal' : 'menunggu') + '</span></div>').join('');
      const progres = () => { const ok = $$('#u-ubin .ok', el).length; $('#u-bar', el).innerHTML = bar(ok / total * 100, 'ok'); $('#u-info', el).textContent = ok + ' dari ' + total + ' halaman selesai'; };
      progres();
      let konteks = null, gagal = 0;
      const proses = async (h) => {
        const ub = $('#ub-' + h, el); ub.className = 'proses'; ub.querySelector('span').textContent = 'membaca…';
        const c = await halaman[h - 1]();
        const img = c.toDataURL('image/jpeg', 0.82).split(',')[1];
        log(el, 'Halaman ' + h + ': mengirim ' + Math.round(img.length * 0.75 / 1024) + ' KB ke AI…', 'w');
        const r = await api('job.halaman', { jobId: job.id, halaman: h, total, img, konteks: $('#u-cepat', el).checked ? null : konteks }, { coba: 1 });
        if (!r.success) { gagal++; ub.className = 'gagal'; ub.querySelector('span').textContent = 'gagal'; log(el, 'Halaman ' + h + ' gagal: ' + r.message, 'e'); return; }
        const d = r.data;
        konteks = d.konteks;
        const m = d.soal.filter((s) => s.masalah && s.masalah.length).length;
        stat.soal += d.soal.filter((s) => !s.gabung).length; stat.masalah += m;
        ub.className = 'ok'; ub.querySelector('span').textContent = d.soal.length + ' soal';
        log(el, 'Halaman ' + h + ': ' + d.soal.length + ' soal' + (d.digabung ? ' (1 digabung ke ' + d.digabung + ')' : '') + (m ? ', ' + m + ' perlu dicek' : '') + (d.stimulus ? ', ' + d.stimulus + ' stimulus' : '') + '.', 's');
        if (d.gambar.length) {
          const items = d.gambar.map((g) => ({ ref: g.ref, b64: potongKanvas(c, g.kotak) })).filter((x) => x.b64);
          const rg = await api('job.gambar', { jobId: job.id, halaman: h, items });
          if (rg.success) { stat.gbr += rg.data.dipasang; log(el, 'Halaman ' + h + ': ' + rg.data.dipasang + ' gambar dipotong & disimpan ke Drive.'); } else log(el, 'Gambar halaman ' + h + ': ' + rg.message, 'e');
        }
        angka(); progres();
      };
      if ($('#u-cepat', el).checked) {
        let i = 0;
        const pekerja = async () => { while (i < antre.length) await proses(antre[i++]); };
        await Promise.all([pekerja(), pekerja()]);
      } else for (const h of antre) await proses(h);
      const rs = await api('job.selesai', { jobId: job.id });
      if (rs.success) el.job = rs.data;
      log(el, gagal ? gagal + ' halaman gagal. Tekan "Ulangi halaman gagal".' : 'Selesai. Silakan tinjau hasilnya.', gagal ? 'e' : 's');
      $('#u-ulang', el).hidden = !gagal;
      $('#u-review', el).hidden = false;
      $('#u-review', el).href = '#/admin/review/' + job.id;
      Admin.soalBasi(); basi('jobs'); riwayatJob(el, true);
    } catch (e) {
      log(el, e.message, 'e'); toast(e.message, 'err');
    } finally { el.jalan = false; sibuk(btn, false); }
  }

  // ============================================================ ANTREAN REVIEW
  Admin.daftar('review', {
    judul: 'Antrean Review', ikon: 'review', grup: 'Manajemen soal',
    render(el) {
      el.innerHTML = Admin.kepala('Antrean review', 'Bandingkan hasil ekstraksi dengan halaman asli, perbaiki, lalu setujui.', '<button class="btn" data-r="segar">' + ik('segar') + 'Segarkan</button>') +
        '<div class="saring"><select class="inp" id="r-status">' + opsi([{ v: 'antre', l: 'Draft + bermasalah + ditinjau' }, { v: 'bermasalah', l: 'Bermasalah saja' }, { v: 'draft', l: 'Draft saja' }, { v: 'ditinjau', l: 'Ditinjau (menunggu persetujuan)' }], 'antre') + '</select>' +
        '<select class="inp" id="r-mapel">' + opsi(Admin.mapelSaya(), '', 'Semua mapel') + '</select><select class="inp" id="r-job"></select></div>' +
        '<div class="aksi-massal" id="r-massal" hidden><strong id="r-n"></strong>' + (Admin.sa() ? '<button class="btn kecil sukses" data-r="setujui">' + ik('cek') + 'Setujui</button>' : '') + '<button class="btn kecil" data-r="tinjau">Tandai ditinjau</button><button class="btn kecil bahaya" data-r="hapus">' + ik('hapus') + 'Hapus</button></div>' +
        '<div class="review"><div class="kartu review-daftar" id="r-daftar"></div><div id="r-editor"><div class="kartu kosong"><strong>Pilih soal di sebelah kiri</strong>Halaman asli tampil berdampingan dengan hasil ekstraksi.</div></div></div>';
      el.pilih = new Set();
      el.addEventListener('change', (e) => {
        if (e.target.matches('#r-status,#r-mapel,#r-job')) daftarReview(el);
        if (e.target.dataset.rid) { e.target.checked ? el.pilih.add(e.target.dataset.rid) : el.pilih.delete(e.target.dataset.rid); $('#r-massal', el).hidden = !el.pilih.size; $('#r-n', el).textContent = el.pilih.size + ' dipilih'; }
      });
      el.addEventListener('click', async (e) => {
        const it = e.target.closest('.item'), b = e.target.closest('[data-r]');
        if (it && !e.target.matches('input')) bukaReview(el, it.dataset.id);
        if (!b) return;
        if (b.dataset.r === 'segar') { await Admin.soal(true); daftarReview(el); }
        if (b.dataset.r === 'setujui' || b.dataset.r === 'tinjau') await statusMassal(el, b.dataset.r === 'setujui' ? 'disetujui' : 'ditinjau');
        if (b.dataset.r === 'hapus' && await konfirmasi('Hapus ' + el.pilih.size + ' soal?', { bahaya: true, ya: 'Hapus' })) { const r = await api('soal.hapus', { ids: Array.from(el.pilih) }); toast(r.message, r.success ? 'ok' : 'err'); el.pilih.clear(); await Admin.soal(true); daftarReview(el); }
      });
      Admin.on('soal', () => { if (el.classList.contains('tampil')) daftarReview(el); });
    },
    async tampil(el, param) {
      if (param) el.dataset.job = param;
      await Admin.soal(false);
      daftarReview(el);
    }
  });
  async function statusMassal(el, status) {
    const r = await api('soal.status', { ids: Array.from(el.pilih), status });
    toast(r.message + (r.data && r.data.gagal && r.data.gagal.length ? ' ' + r.data.gagal.slice(0, 3).join('; ') : ''), r.success ? 'ok' : 'err', 7000);
    el.pilih.clear(); $('#r-massal', el).hidden = true;
    await Admin.soal(true);
    daftarReview(el);
  }
  function daftarReview(el) {
    const semua = App.data.soal || [];
    const jobs = Array.from(new Set(semua.filter((s) => s.job).map((s) => s.job))).sort().reverse();
    const jsel = $('#r-job', el), jv = el.dataset.job || jsel.value;
    jsel.innerHTML = opsi(jobs, jv, 'Semua sumber');
    el.dataset.job = '';
    const st = $('#r-status', el).value, mp = $('#r-mapel', el).value, jb = jsel.value;
    const list = semua.filter((s) => (st === 'antre' ? ['draft', 'bermasalah', 'ditinjau'].indexOf(s.status) >= 0 : s.status === st) && (!mp || s.mapel === mp) && (!jb || s.job === jb));
    el.list = list;
    Admin.badge('review', semua.filter((s) => s.status !== 'disetujui').length);
    $('#r-daftar', el).innerHTML = list.length ? list.map((s) => '<div class="item' + (s.id === el.aktif ? ' aktif' : '') + '" data-id="' + esc(s.id) + '"><input type="checkbox" data-rid="' + esc(s.id) + '"' + (el.pilih.has(s.id) ? ' checked' : '') + '>' +
      '<div><div style="display:flex;justify-content:space-between;gap:6px;align-items:center"><span class="chip-id">' + esc(s.id) + '</span>' + Admin.status(s.status) + '</div>' +
      '<p class="ringkas">' + esc(s.ring || '(tanpa teks)') + '</p><div class="kecil muted" style="margin-top:4px">' + esc((BENTUK_LABEL[s.bentuk] || s.bentuk)) + (s.hal ? ' · hal ' + s.hal : '') + (s.yakin ? ' · yakin ' + s.yakin + '%' : '') + '</div>' +
      (s.cat ? '<div class="kecil" style="color:var(--warn-ink);margin-top:4px">' + esc(s.cat) + '</div>' : '') + '</div></div>').join('')
      : '<div class="kosong"><strong>Antrean kosong</strong>Tidak ada soal yang menunggu dengan filter ini.</div>';
  }
  async function bukaReview(el, id) {
    el.aktif = id;
    $$('#r-daftar .item', el).forEach((x) => x.classList.toggle('aktif', x.dataset.id === id));
    const box = $('#r-editor', el);
    box.innerHTML = '<div class="kartu"><div class="memuat">Memuat soal…</div></div>';
    const r = await api('soal.detail', { ids: [id] });
    if (!r.success || !r.data.soal.length) { box.innerHTML = '<div class="kartu kosong">' + esc(r.message || 'Soal tidak ditemukan.') + '</div>'; return; }
    const s = r.data.soal[0], stim = s.id_stimulus ? r.data.stimulus[s.id_stimulus] : null;
    const job = s.job && (await jobDetail(s.job));
    const imgId = job && s.hal && job.hal[s.hal] && job.hal[s.hal].img;
    box.innerHTML = '<div class="kartu"><div class="kartu-kepala"><div><span class="chip-id">' + esc(s.id) + '</span> ' + Admin.status(s.status) + '<p>' + esc(s.sumber) + (s.hal ? ' · halaman ' + s.hal : '') + (s.yakin ? ' · keyakinan AI ' + s.yakin + '%' : '') + '</p></div>' +
      '<div style="display:flex;gap:6px"><button class="btn kecil" data-nav="-1">' + ik('kiri') + '</button><button class="btn kecil" data-nav="1">' + ik('kanan') + '</button></div></div>' +
      (s.catatan ? '<div class="masalah">' + ik('awas') + ' ' + esc(s.catatan) + '</div>' : '') +
      '<div class="dua-panel"><div>' + (imgId ? '<div class="lbl" style="margin-bottom:6px">Halaman asli — seret untuk memotong gambar</div><div class="halaman-asli" id="r-hal"><div class="memuat">Memuat halaman…</div></div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn kecil" id="r-potong" disabled>' + ik('potong') + 'Sisipkan potongan</button><span class="kecil muted" id="r-pinfo">Kursor sisip mengikuti kotak teks yang terakhir diklik.</span></div>'
        : '<div class="kartu kosong" style="box-shadow:none"><strong>Tanpa halaman asli</strong>Soal ini dibuat manual atau halaman sumbernya tidak tersedia.</div>') + '</div>' +
      '<div id="r-form">' + Editor.html(s, stim) + Editor.tombol(s.id) + '</div></div></div>';
    const form = $('#r-form', box);
    Editor.pasang(form, s, stim);
    form.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-simpan]');
      if (!b) return;
      if (b.dataset.simpan === 'hapus') {
        if (!(await konfirmasi('Hapus soal ' + s.id + '?', { bahaya: true, ya: 'Hapus' }))) return;
        const rr = await api('soal.hapus', { ids: [s.id] }); toast(rr.message, rr.success ? 'ok' : 'err');
        if (rr.success) { await Admin.soal(true); lanjutReview(el, id); }
        return;
      }
      sibuk(b, true);
      const rr = await Editor.simpan(form, s, b.dataset.simpan);
      sibuk(b, false);
      if (rr.success) { await Admin.soal(true); lanjutReview(el, id); }
    });
    box.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => { const i = el.list.findIndex((x) => x.id === id) + (+b.dataset.nav); if (el.list[i]) bukaReview(el, el.list[i].id); }; });
    if (imgId) pasangPotong(box, imgId, form);
  }
  function lanjutReview(el, id) {
    daftarReview(el);
    const i = Math.max(0, (el.list || []).findIndex((x) => x.id === id));
    const nxt = el.list[i] && el.list[i].id !== id ? el.list[i] : el.list[i + 1] || el.list[0];
    if (nxt) bukaReview(el, nxt.id); else $('#r-editor', el).innerHTML = '<div class="kartu kosong"><strong>Antrean selesai</strong>Semua soal pada filter ini sudah ditangani.</div>';
  }
  const _job = {};
  async function jobDetail(id) {
    if (_job[id]) return _job[id];
    const r = await api('job.daftar', {});
    if (r.success) r.data.forEach((j) => { _job[j.id] = j; });
    return _job[id];
  }
  const _halCache = {};
  async function pasangPotong(box, imgId, form) {
    const wadah = $('#r-hal', box);
    let src = _halCache[imgId];
    if (!src) { const r = await api('media.ambil', { id: imgId }); if (!r.success) { wadah.innerHTML = '<div class="kosong">' + esc(r.message) + '</div>'; return; } src = _halCache[imgId] = 'data:' + r.data.mime + ';base64,' + r.data.b64; }
    wadah.innerHTML = '<img alt="Halaman asli" src="' + src + '"><div class="potong" hidden></div>';
    const img = wadah.querySelector('img'), kotak = wadah.querySelector('.potong');
    let a = null, sel = null;
    const titik = (e) => { const r = img.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return { x: Math.max(0, Math.min(r.width, t.clientX - r.left)), y: Math.max(0, Math.min(r.height, t.clientY - r.top + 0)), w: r.width, h: r.height }; };
    const mulai = (e) => { e.preventDefault(); a = titik(e); sel = null; kotak.hidden = false; gerak(e); };
    const gerak = (e) => {
      if (!a) return;
      const b = titik(e), x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
      Object.assign(kotak.style, { left: x + 'px', top: (y + wadah.scrollTop * 0) + 'px', width: w + 'px', height: h + 'px' });
      sel = { x: x / b.w, y: y / b.h, w: w / b.w, h: h / b.h };
    };
    const akhir = () => { a = null; $('#r-potong', box).disabled = !(sel && sel.w > 0.02 && sel.h > 0.02); };
    img.addEventListener('mousedown', mulai); img.addEventListener('touchstart', mulai, { passive: false });
    addEventListener('mousemove', gerak); addEventListener('touchmove', gerak, { passive: true });
    addEventListener('mouseup', akhir); addEventListener('touchend', akhir);
    $('#r-potong', box).onclick = async (e) => {
      const b = e.currentTarget, c = document.createElement('canvas'), iw = img.naturalWidth, ih = img.naturalHeight;
      const sw = sel.w * iw, sh = sel.h * ih, sc = Math.min(1, 1200 / sw);
      c.width = Math.round(sw * sc); c.height = Math.round(sh * sc);
      c.getContext('2d').drawImage(img, sel.x * iw, sel.y * ih, sw, sh, 0, 0, c.width, c.height);
      sibuk(b, true);
      const r = await api('media.unggah', { b64: c.toDataURL('image/jpeg', 0.88).split(',')[1], mime: 'image/jpeg', nama: 'potongan.jpg', jenis: 'stimulus' });
      sibuk(b, false);
      if (r.success) Editor.sisip(form, '<img data-drive="' + r.data.id + '">'); else toast(r.message, 'err');
    };
  }

  // ============================================================ BANK SOAL
  Admin.daftar('bank', {
    judul: 'Bank Soal', ikon: 'bank', grup: 'Manajemen soal',
    render(el) {
      el.innerHTML = Admin.kepala('Bank soal', 'Telusuri, saring, dan kelola seluruh butir soal.', '<button class="btn" data-b="ekspor">' + ik('unduh') + 'Ekspor Excel</button><button class="btn utama" data-b="baru">' + ik('tambah') + 'Buat soal manual</button>') +
        '<div class="kisi k4" id="b-stat" style="margin-bottom:16px"></div>' +
        '<div class="kartu" style="padding:14px"><div class="saring" style="margin-bottom:0"><input class="inp cari" id="b-cari" placeholder="Cari teks soal, ID (MAT-0012), sumber…">' +
        '<select class="inp" data-f="mapel">' + opsi(Admin.mapelSaya(), '', 'Semua mapel') + '</select><select class="inp" data-f="idk"></select>' +
        '<select class="inp" data-f="bentuk">' + opsi(Object.keys(BENTUK_LABEL).map((k) => ({ v: k, l: BENTUK_LABEL[k] })), '', 'Semua bentuk') + '</select>' +
        '<select class="inp" data-f="kes">' + opsi(['mudah', 'sedang', 'sulit'], '', 'Semua kesulitan') + '</select>' +
        '<select class="inp" data-f="status">' + opsi(['disetujui', 'ditinjau', 'draft', 'bermasalah'], '', 'Semua status') + '</select>' +
        '<select class="inp" data-f="bahas">' + opsi([{ v: 'ada', l: 'Ada pembahasan' }, { v: 'tidak', l: 'Belum ada pembahasan' }], '', 'Pembahasan: semua') + '</select></div></div>' +
        '<div class="aksi-massal" id="b-massal" hidden style="margin-top:12px"><strong id="b-n"></strong>' + (Admin.sa() ? '<button class="btn kecil sukses" data-b="setujui">' + ik('cek') + 'Setujui</button>' : '') +
        '<button class="btn kecil" data-b="tinjau">Tandai ditinjau</button><button class="btn kecil" data-b="bahas">' + ik('bahas') + 'Generate pembahasan</button>' +
        (Admin.sa() ? '<button class="btn kecil" data-b="paket">' + ik('paket') + 'Masukkan ke paket</button>' : '') + '<button class="btn kecil" data-b="eksporPilih">' + ik('unduh') + 'Ekspor terpilih</button><button class="btn kecil bahaya" data-b="hapus">' + ik('hapus') + 'Hapus</button></div>' +
        '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th class="cek-sel"><input type="checkbox" id="b-semua"></th><th>ID &amp; sumber</th><th>Teks soal</th><th>Bentuk</th><th>Kompetensi</th><th>Kesulitan</th><th>Status</th><th>Bahas</th></tr></thead><tbody id="b-isi"></tbody></table></div><div class="halaman-nav" id="b-hal"></div>';
      el.pilih = new Set(); el.hal = 0;
      const ulang = () => { el.hal = 0; tabelBank(el); };
      $('#b-cari', el).addEventListener('input', debounce(ulang, 250));
      el.addEventListener('change', (e) => {
        if (e.target.dataset.f) { if (e.target.dataset.f === 'mapel') isiKompF(el); ulang(); }
        if (e.target.id === 'b-semua') { $$('#b-isi [data-bid]', el).forEach((c) => { c.checked = e.target.checked; c.checked ? el.pilih.add(c.dataset.bid) : el.pilih.delete(c.dataset.bid); }); massalBank(el); }
        if (e.target.dataset.bid) { e.target.checked ? el.pilih.add(e.target.dataset.bid) : el.pilih.delete(e.target.dataset.bid); massalBank(el); }
      });
      el.addEventListener('click', (e) => aksiBank(el, e));
      Admin.on('soal', () => { if (el.classList.contains('tampil')) tabelBank(el); });
      isiKompF(el);
    },
    async tampil(el) { await Admin.soal(false); tabelBank(el); }
  });
  function isiKompF(el) { const m = $('[data-f=mapel]', el).value; $('[data-f=idk]', el).innerHTML = opsi(Admin.kompMapel(m).map((k) => ({ v: k.id, l: k.kode + ' — ' + k.nama })), '', 'Semua kompetensi'); }
  function saringBank(el) {
    const f = {};
    $$('[data-f]', el).forEach((x) => { f[x.dataset.f] = x.value; });
    const q = $('#b-cari', el).value.trim().toLowerCase();
    return (App.data.soal || []).filter((s) => (!f.mapel || s.mapel === f.mapel) && (!f.idk || s.idk === f.idk) && (!f.bentuk || s.bentuk === f.bentuk) && (!f.kes || s.kes === f.kes) &&
      (!f.status || s.status === f.status) && (!f.bahas || (f.bahas === 'ada' ? !!s.bahas : !s.bahas)) && (!q || (s.id + ' ' + s.ring + ' ' + s.sumber).toLowerCase().indexOf(q) >= 0));
  }
  function massalBank(el) { $('#b-massal', el).hidden = !el.pilih.size; $('#b-n', el).textContent = el.pilih.size + ' butir dipilih'; }
  function tabelBank(el) {
    const semua = App.data.soal || [], list = saringBank(el), per = 25;
    const st = (k) => semua.filter((s) => s.status === k).length;
    $('#b-stat', el).innerHTML = '<div class="kartu stat"><div class="lab">Total butir</div><div class="ang">' + semua.length + '</div></div><div class="kartu stat"><div class="lab">Disetujui</div><div class="ang" style="color:var(--ok)">' + st('disetujui') + '</div></div>' +
      '<div class="kartu stat"><div class="lab">Menunggu tinjauan</div><div class="ang">' + (st('draft') + st('ditinjau')) + '</div></div><div class="kartu stat ' + (st('bermasalah') ? 'waspada' : '') + '"><div class="lab">Bermasalah / duplikat</div><div class="ang" style="color:var(--warn)">' + st('bermasalah') + '</div></div>';
    el.hal = Math.min(el.hal, Math.max(0, Math.ceil(list.length / per) - 1));
    $('#b-isi', el).innerHTML = list.slice(el.hal * per, el.hal * per + per).map((s) => '<tr class="klik" data-buka="' + esc(s.id) + '"><td><input type="checkbox" data-bid="' + esc(s.id) + '"' + (el.pilih.has(s.id) ? ' checked' : '') + '></td>' +
      '<td><span class="chip-id">' + esc(s.id) + '</span><div class="kecil muted">' + esc(s.sumber || '—') + (s.hal ? ' · hal ' + s.hal : '') + '</div></td><td><div class="ringkas">' + esc(s.ring) + '</div>' + (s.stim ? '<span class="kecil muted">Stimulus ' + esc(s.stim) + '</span>' : '') + '</td>' +
      '<td>' + Admin.bentuk(s.bentuk) + '</td><td class="kecil">' + esc(Admin.namaKomp(s.idk)) + '</td><td>' + esc(s.kes || '—') + '</td><td>' + Admin.status(s.status) + '</td>' +
      '<td>' + (s.kb ? lencana('Kunci beda', 'bad') : s.bahas === 'disetujui' ? lencana('Ya', 'ok') : s.bahas ? lencana('Menunggu', 'warn') : '<span class="muted">—</span>') + '</td></tr>').join('') ||
      '<tr><td colspan="8"><div class="kosong"><strong>Tidak ada soal</strong>Ubah filter atau tambahkan soal baru.</div></td></tr>';
    const n = Math.ceil(list.length / per);
    $('#b-hal', el).innerHTML = '<span class="kecil muted" style="margin-right:auto">Menampilkan ' + Math.min(list.length, el.hal * per + 1) + '–' + Math.min(list.length, el.hal * per + per) + ' dari ' + list.length + '</span>' +
      (n > 1 ? '<button class="btn kecil" data-pg="' + (el.hal - 1) + '"' + (el.hal ? '' : ' disabled') + '>' + ik('kiri') + '</button><span class="kecil">' + (el.hal + 1) + ' / ' + n + '</span><button class="btn kecil" data-pg="' + (el.hal + 1) + '"' + (el.hal < n - 1 ? '' : ' disabled') + '>' + ik('kanan') + '</button>' : '');
  }
  async function aksiBank(el, e) {
    const pg = e.target.closest('[data-pg]');
    if (pg) { el.hal = +pg.dataset.pg; tabelBank(el); return; }
    const tr = e.target.closest('[data-buka]');
    if (tr && !e.target.matches('input')) return bukaSoal(tr.dataset.buka);
    const b = e.target.closest('[data-b]');
    if (!b) return;
    const ids = Array.from(el.pilih), a = b.dataset.b;
    if (a === 'baru') return bukaSoal(null);
    if (a === 'setujui' || a === 'tinjau') {
      const r = await api('soal.status', { ids, status: a === 'setujui' ? 'disetujui' : 'ditinjau' });
      toast(r.message + (r.data && r.data.gagal.length ? ' ' + r.data.gagal.slice(0, 3).join('; ') : ''), r.success ? 'ok' : 'err', 7000);
      el.pilih.clear(); massalBank(el); await Admin.soal(true);
    }
    if (a === 'hapus' && await konfirmasi('Hapus ' + ids.length + ' soal? Soal yang sudah dipakai paket tidak akan dihapus.', { bahaya: true, ya: 'Hapus' })) {
      const r = await api('soal.hapus', { ids }); toast(r.message, r.success ? 'ok' : 'err', 7000); el.pilih.clear(); massalBank(el); await Admin.soal(true);
    }
    if (a === 'bahas') { generateMassal(ids); }
    if (a === 'paket') masukPaket(ids);
    if (a === 'ekspor' || a === 'eksporPilih') {
      const list = a === 'ekspor' ? saringBank(el) : (App.data.soal || []).filter((s) => el.pilih.has(s.id));
      const X = await Lib.xlsx(), wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(list.map((s) => ({ ID: s.id, Mapel: s.mapel, Kompetensi: Admin.namaKomp(s.idk), Sub: Admin.namaSub(s.ids), Bentuk: BENTUK_LABEL[s.bentuk] || s.bentuk, Kesulitan: s.kes, Status: s.status, Pembahasan: s.bahas || '-', Sumber: s.sumber, Teks: s.ring }))), 'Bank soal');
      X.writeFile(wb, 'bank-soal-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    }
  }
  /** Laci detail/edit satu soal (null = soal baru). */
  async function bukaSoal(id) {
    const lapis = document.createElement('div');
    lapis.className = 'lapis'; lapis.style.justifyContent = 'flex-end'; lapis.style.padding = '0';
    lapis.innerHTML = '<aside class="laci"><div class="modal-kepala" style="border-bottom:1px solid var(--line);padding-bottom:12px"><h3>' + (id ? 'Soal ' + esc(id) : 'Soal baru') + '</h3><button class="btn hantu kecil ikon" data-x>' + ik('x') + '</button></div><div class="modal-isi" id="l-isi" style="flex:1"><div class="memuat"></div></div></aside>';
    document.body.appendChild(lapis);
    const tutup = () => lapis.remove();
    lapis.addEventListener('click', (e) => { if (e.target === lapis || e.target.closest('[data-x]')) tutup(); });
    let s = null, stim = null, bahas = null;
    if (id) {
      const r = await api('soal.detail', { ids: [id] });
      if (!r.success || !r.data.soal.length) { $('#l-isi', lapis).innerHTML = '<div class="kosong">' + esc(r.message || 'Tidak ditemukan') + '</div>'; return; }
      s = r.data.soal[0]; stim = s.id_stimulus ? r.data.stimulus[s.id_stimulus] : null; bahas = r.data.bahas[s.id];
    }
    const box = $('#l-isi', lapis);
    box.innerHTML = (s ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' + Admin.status(s.status) + Admin.bentuk(s.bentuk) + lencana(s.kes || 'sedang', 'polos') + (s.yakin ? lencana('Keyakinan AI ' + s.yakin + '%', 'info') : '') + '</div>' +
      (s.catatan ? '<div class="masalah">' + esc(s.catatan) + '</div>' : '') +
      (bahas ? '<details class="kartu" style="padding:12px 14px;margin-bottom:14px"><summary style="cursor:pointer;font-weight:600">Pembahasan · ' + esc(bahas.status) + '</summary>' + htmlKonten(bahas.isi) + '</details>' : '') : '') +
      '<div id="l-form">' + Editor.html(s || {}, stim) + Editor.tombol(s && s.id) + '</div>';
    hidrasi(box);
    const form = $('#l-form', box);
    Editor.pasang(form, s || {}, stim);
    form.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-simpan]');
      if (!b) return;
      if (b.dataset.simpan === 'hapus') {
        if (!(await konfirmasi('Hapus soal ini?', { bahaya: true, ya: 'Hapus' }))) return;
        const r = await api('soal.hapus', { ids: [s.id] }); toast(r.message, r.success ? 'ok' : 'err');
        if (r.success && r.data.dihapus) { tutup(); Admin.soal(true); }
        return;
      }
      sibuk(b, true);
      const r = await Editor.simpan(form, s, b.dataset.simpan);
      sibuk(b, false);
      if (r.success) { tutup(); Admin.soal(true); }
    });
  }
  async function masukPaket(ids) {
    const r = await api('paket.daftar', {});
    if (!r.success) return toast(r.message, 'err');
    const draf = r.data.filter((p) => !p.sesi.mulai && !p.sesi.selesai);
    if (!draf.length) return toast('Belum ada paket yang bisa diubah. Buat paket di menu Paket TO.', 'warn');
    modal({ judul: 'Masukkan ' + ids.length + ' soal ke paket', isi: field('Paket', '<select class="inp" id="mp-p">' + opsi(draf.map((p) => ({ v: p.id, l: p.id + ' — ' + p.nama + ' (' + p.jumlah + ' soal)' }))) + '</select>', 'Hanya soal berstatus disetujui yang diterima. Soal satu stimulus kelompok otomatis dikumpulkan.'),
      tombol: [{ label: 'Batal' }, { label: 'Tambahkan', kelas: 'utama', aksi: async (m) => {
        const pid = $('#mp-p', m).value, d = await api('paket.detail', { id: pid });
        if (!d.success) { toast(d.message, 'err'); return false; }
        const ada = d.data.items.map((x) => ({ id_soal: x.id, bobot: x.bobot }));
        const baru = ids.filter((x) => !ada.some((a) => a.id_soal === x)).map((x) => ({ id_soal: x, bobot: 1 }));
        const r2 = await api('paket.soal', { id: pid, items: ada.concat(baru) });
        toast(r2.message, r2.success ? 'ok' : 'err', 7000);
        if (r2.success) basi('paket');
        return r2.success ? true : false;
      } }] });
  }

  // ============================================================ PEMBAHASAN
  Admin.daftar('pembahasan', {
    judul: 'Pembahasan', ikon: 'bahas', grup: 'Manajemen soal',
    render(el) {
      el.innerHTML = Admin.kepala('Generator pembahasan', 'AI menyusun langkah penyelesaian sesuai kunci bank soal. Hanya pembahasan yang disetujui yang tampil ke siswa.', '<button class="btn utama" data-p="massal">' + ik('bahas') + 'Generate untuk halaman ini</button>') +
        '<div class="tab" id="pb-tab"></div><div class="saring"><select class="inp" id="pb-mapel">' + opsi(Admin.mapelSaya(), '', 'Semua mapel') + '</select><select class="inp" id="pb-komp"></select></div>' +
        '<div id="pb-isi"></div><div class="halaman-nav" id="pb-hal"></div>';
      el.tab = 'belum'; el.hal = 0;
      const isiK = () => { $('#pb-komp', el).innerHTML = opsi(Admin.kompMapel($('#pb-mapel', el).value).map((k) => ({ v: k.id, l: k.nama })), '', 'Semua kompetensi'); };
      isiK();
      el.addEventListener('change', (e) => { if (e.target.id === 'pb-mapel') isiK(); if (e.target.matches('#pb-mapel,#pb-komp')) { el.hal = 0; renderBahas(el); } });
      el.addEventListener('click', (e) => aksiBahas(el, e));
      Admin.on('soal', () => { if (el.classList.contains('tampil') && !el.sibuk) renderBahas(el); });
    },
    async tampil(el) { await Admin.soal(false); renderBahas(el); }
  });
  function daftarBahas(el) {
    const mp = $('#pb-mapel', el).value, kp = $('#pb-komp', el).value;
    const dasar = (App.data.soal || []).filter((s) => s.status !== 'bermasalah' && (!mp || s.mapel === mp) && (!kp || s.idk === kp));
    return {
      belum: dasar.filter((s) => !s.bahas), menunggu: dasar.filter((s) => s.bahas === 'menunggu' && !s.kb), kb: dasar.filter((s) => s.kb),
      disetujui: dasar.filter((s) => s.bahas === 'disetujui'), ditolak: dasar.filter((s) => s.bahas === 'ditolak')
    };
  }
  async function renderBahas(el) {
    const g = daftarBahas(el), lab = { belum: 'Belum ada', menunggu: 'Menunggu persetujuan', kb: 'Kunci berbeda', disetujui: 'Disetujui', ditolak: 'Ditolak' };
    Admin.badge('pembahasan', g.menunggu.length + g.kb.length);
    $('#pb-tab', el).innerHTML = Object.keys(lab).map((k) => '<button data-tab="' + k + '" class="' + (el.tab === k ? 'aktif' : '') + '">' + lab[k] + '<span class="hit">' + g[k].length + '</span></button>').join('');
    const list = g[el.tab], per = 8;
    el.hal = Math.min(el.hal, Math.max(0, Math.ceil(list.length / per) - 1));
    const halaman = list.slice(el.hal * per, el.hal * per + per);
    el.halaman = halaman.map((s) => s.id);
    const box = $('#pb-isi', el);
    if (!halaman.length) { box.innerHTML = '<div class="kartu kosong"><strong>Tidak ada soal di kelompok ini</strong>' + (el.tab === 'belum' ? 'Semua soal sudah memiliki pembahasan.' : '') + '</div>'; $('#pb-hal', el).innerHTML = ''; return; }
    box.innerHTML = '<div class="memuat">Memuat soal…</div>';
    const r = await api('soal.detail', { ids: el.halaman });
    if (!r.success) { box.innerHTML = '<div class="kartu kosong">' + esc(r.message) + '</div>'; return; }
    const det = {};
    r.data.soal.forEach((s) => { det[s.id] = s; });
    box.innerHTML = halaman.map((x) => {
      const s = det[x.id] || {}, b = r.data.bahas[x.id], st = s.id_stimulus && r.data.stimulus[s.id_stimulus];
      const kunci = s.bentuk === 'PG' ? s.kunci : Array.isArray(s.kunci) ? s.kunci.join(', ') : s.kunci && s.kunci.rubrik ? 'rubrik' : JSON.stringify(s.kunci || '');
      return '<article class="kartu" style="margin-bottom:14px" data-sid="' + esc(x.id) + '"><div class="kartu-kepala"><div><span class="chip-id">' + esc(x.id) + '</span> ' + Admin.bentuk(x.bentuk) + ' <span class="kecil muted">' + esc(Admin.namaKomp(x.idk)) + '</span></div>' +
        (b ? Admin.status(b.status) : '') + '</div><div class="dua-panel"><div>' + (st ? '<details style="margin-bottom:8px"><summary class="kecil" style="cursor:pointer">Stimulus: ' + esc(st.judul || st.id) + '</summary>' + htmlKonten(st.konten) + '</details>' : '') +
        htmlKonten(s.teks) + (Array.isArray(s.opsi) ? '<ol type="A" style="padding-left:22px">' + s.opsi.map((o) => '<li>' + htmlKonten(o.t) + '</li>').join('') + '</ol>' : '') +
        '<div class="kecil">Kunci bank soal: <b class="mono">' + esc(kunci) + '</b></div>' +
        (x.kb && b ? '<div class="alert bad" style="margin-top:10px">' + ik('awas') + '<div><b>Kunci berbeda.</b> Menurut AI: <span class="mono">' + esc(Array.isArray(b.kunci_ai) ? b.kunci_ai.join(', ') : b.kunci_ai) + '</span>. ' + esc(b.catatan || '') + '</div></div>' : '') + '</div>' +
        '<div><textarea class="inp kode" rows="8" data-isi placeholder="Pembahasan belum ada. Tekan Generate atau tulis sendiri.">' + esc(b ? b.isi : '') + '</textarea><div class="pratinjau isi-soal" data-prev style="margin-top:8px;max-height:260px;overflow:auto"></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;justify-content:flex-end"><button class="btn kecil" data-p="gen">' + ik('bahas') + (b ? 'Generate ulang' : 'Generate') + '</button>' +
        (x.kb ? '<button class="btn kecil" data-p="pertahankan">Pertahankan kunci bank</button><button class="btn kecil bahaya" data-p="kunciAi">Pakai kunci AI</button>' : '') +
        '<button class="btn kecil" data-p="tolak">Tolak</button><button class="btn kecil" data-p="simpan">Simpan</button><button class="btn kecil sukses" data-p="setujui">' + ik('cek') + 'Setujui</button></div></div></div></article>';
    }).join('');
    hidrasi(box);
    $$('[data-isi]', box).forEach((t) => { const p = t.parentElement.querySelector('[data-prev]'); isiKonten(p, t.value); t.addEventListener('input', debounce(() => isiKonten(p, t.value), 300)); });
    const n = Math.ceil(list.length / per);
    $('#pb-hal', el).innerHTML = n > 1 ? '<button class="btn kecil" data-pg="' + (el.hal - 1) + '"' + (el.hal ? '' : ' disabled') + '>' + ik('kiri') + '</button><span class="kecil">' + (el.hal + 1) + ' / ' + n + '</span><button class="btn kecil" data-pg="' + (el.hal + 1) + '"' + (el.hal < n - 1 ? '' : ' disabled') + '>' + ik('kanan') + '</button>' : '';
  }
  async function aksiBahas(el, e) {
    const t = e.target.closest('[data-tab]'), pg = e.target.closest('[data-pg]');
    if (t) { el.tab = t.dataset.tab; el.hal = 0; return renderBahas(el); }
    if (pg) { el.hal = +pg.dataset.pg; return renderBahas(el); }
    const b = e.target.closest('[data-p]');
    if (!b) return;
    if (b.dataset.p === 'massal') return generateMassal(el.halaman || [], () => renderBahas(el));
    const kartu = b.closest('[data-sid]'), id = kartu.dataset.sid, isi = $('[data-isi]', kartu);
    el.sibuk = true;
    sibuk(b, true);
    let r;
    if (b.dataset.p === 'gen') {
      r = await api('bahas.generate', { id });
      if (r.success) { isi.value = r.data.isi; isiKonten(kartu.querySelector('[data-prev]'), r.data.isi); if (r.data.kunciBeda) toast('AI menemukan kunci berbeda: ' + JSON.stringify(r.data.kunciAi) + '. Periksa sebelum menyetujui.', 'warn', 9000); else toast('Pembahasan dibuat. Periksa lalu setujui.', 'ok'); }
      else toast(r.message, 'err', 8000);
    } else {
      const st = { simpan: 'menunggu', setujui: 'disetujui', tolak: 'ditolak', pertahankan: 'menunggu', kunciAi: 'menunggu' }[b.dataset.p];
      r = await api('bahas.simpan', { id_soal: id, isi: isi.value, status: st, pertahankanKunci: b.dataset.p === 'pertahankan', pakaiKunciAi: b.dataset.p === 'kunciAi' });
      toast(r.message, r.success ? 'ok' : 'err');
    }
    sibuk(b, false);
    el.sibuk = false;
    if (r.success) { basi('soal', 'dash'); await Admin.soal(true); if (b.dataset.p !== 'gen' && b.dataset.p !== 'simpan') renderBahas(el); }
  }
  /** Generate berurutan dengan progres; tiap soal 1 panggilan (aman dari batas 6 menit). */
  async function generateMassal(ids, selesai) {
    if (!ids.length) return toast('Tidak ada soal untuk dibuatkan pembahasan.', 'warn');
    let batal = false, ok = 0, beda = 0;
    const m = modal({ judul: 'Generate pembahasan', tutup: false, isi: '<p id="gm-info">Menyiapkan…</p><div id="gm-bar">' + bar(0) + '</div><div class="konsol" id="gm-log" style="height:160px;margin-top:12px"></div>', tombol: [{ label: 'Hentikan', aksi: () => { batal = true; return false; } }] });
    const lg = (t, k) => { const b = $('#gm-log', m.el); b.insertAdjacentHTML('beforeend', '<div class="' + (k || '') + '">' + esc(t) + '</div>'); b.scrollTop = b.scrollHeight; };
    for (let i = 0; i < ids.length && !batal; i++) {
      $('#gm-info', m.el).textContent = 'Soal ' + (i + 1) + ' dari ' + ids.length + ' (' + ids[i] + ')';
      const r = await api('bahas.generate', { id: ids[i] });
      if (r.success) { ok++; if (r.data.kunciBeda) { beda++; lg(ids[i] + ': selesai — kunci AI berbeda!', 'e'); } else lg(ids[i] + ': selesai', 's'); } else lg(ids[i] + ': ' + r.message, 'e');
      $('#gm-bar', m.el).innerHTML = bar((i + 1) / ids.length * 100, 'ok');
    }
    m.tutup();
    toast(ok + ' pembahasan dibuat' + (beda ? ', ' + beda + ' kunci berbeda perlu dicek' : '') + '. Setujui di menu Pembahasan.', beda ? 'warn' : 'ok', 8000);
    basi('soal', 'dash'); await Admin.soal(true);
    if (selesai) selesai();
  }
})();
