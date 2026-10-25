/* =====================================================================
   admin-alat.js — Dokumen (Doc Engine) & Migrasi Data
   ===================================================================== */
(function () {
  'use strict';
  const SA = Admin.SA;

  // ============================================================ DOKUMEN
  Admin.daftar('dokumen', {
    judul: 'Dokumen', ikon: 'dok', grup: 'Administrasi', peran: SA,
    render(el) {
      el.innerHTML = Admin.kepala('Dokumen dari template', 'Rapor hasil TO, kartu peserta, dan rekap kelas dari template Google Docs/Sheets/Slides milik sekolah — lengkap dengan QR verifikasi.') +
        '<div class="tab"><button data-dt="buat" class="aktif">Buat dokumen</button><button data-dt="massal">Buat massal</button><button data-dt="template">Template</button><button data-dt="riwayat">Riwayat</button><button data-dt="pejabat">Penanda tangan</button></div><div id="d-isi"></div>';
      el.tab = 'buat';
      el.addEventListener('click', (e) => aksiDok(el, e));
    },
    async tampil(el, param) {
      if (param && param.indexOf('buat/') === 0) { el.tab = 'buat'; el.refSid = param.slice(5); }
      const r = await api('doc.template', {});
      if (!r.success) { $('#d-isi', el).innerHTML = '<div class="kartu kosong">' + esc(r.message) + '</div>'; return; }
      el.tpl = r.data;
      renderDok(el);
    }
  });
  function perluQr(t) { return t.bidang.some((b) => b.kunci === 'QR'); }
  const FORMAT = { docs: [{ v: 'pdf', l: 'PDF' }, { v: 'docx', l: 'Word (DOCX)' }], sheets: [{ v: 'pdf', l: 'PDF' }, { v: 'xlsx', l: 'Excel (XLSX)' }], slides: [{ v: 'pdf', l: 'PDF' }, { v: 'png', l: 'Gambar (PNG)' }] };
  function tampilPdf(b64, judul, nama, catatan) {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u], { type: 'application/pdf' }));
    const m = modal({ judul, ukuran: 'xl', isi: (catatan ? '<p class="kecil muted" style="margin-top:0">' + catatan + '</p>' : '') + '<iframe class="pratinjau-pdf" title="Pratinjau dokumen" src="' + url + '#toolbar=1"></iframe>' +
      '<p class="kecil muted">Pratinjau tidak tampil di peramban HP? Gunakan tombol unduh.</p>',
      tombol: [{ label: ik('unduh') + 'Unduh pratinjau', aksi: () => { unduhB64(b64, nama, 'application/pdf'); return false; } }, { label: 'Tutup', kelas: 'utama' }] });
    m.hasil.then(() => setTimeout(() => URL.revokeObjectURL(url), 1000));
  }
  async function qrContoh(t) { if (!perluQr(t)) return ''; try { return await buatQr(location.origin + location.pathname + '#/verifikasi/PRATINJAU'); } catch (e) { return ''; } }
  async function buatQr(url) { const qrcode = await Lib.qr(); const q = qrcode(0, 'M'); q.addData(url); q.make(); const c = document.createElement('canvas'), n = q.getModuleCount(), s = 6, m = 4; c.width = c.height = (n + m * 2) * s; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * s, (r + m) * s, s, s); return c.toDataURL('image/png').split(',')[1]; }
  async function renderDok(el) {
    $$('[data-dt]', el).forEach((b) => b.classList.toggle('aktif', b.dataset.dt === el.tab));
    const box = $('#d-isi', el), T = el.tpl, aktif = T.template.filter((t) => t.aktif);
    if (el.tab === 'template') {
      box.innerHTML = '<div class="saring"><span class="kecil muted" style="flex:1">Desain template di Google Docs/Sheets/Slides, tulis placeholder seperti <span class="mono">{{NAMA}}</span>, lalu tempel tautannya di sini. Master disalin ke folder aplikasi.</span><button class="btn utama" data-d="tambahTpl">' + ik('tambah') + 'Tambah template</button></div>' +
        (T.template.length ? '<div class="kisi k2">' + T.template.map((t) => '<article class="kartu"><div class="kartu-kepala"><div><span class="chip-id">' + esc(t.id) + '</span><h3 style="margin-top:4px">' + esc(t.nama) + '</h3><p>' + esc((T.sumber[t.sumber] || {}).label || t.sumber) + ' · ' + t.engine + ' → ' + t.keluaran.toUpperCase() + ' · v' + t.versi + '</p></div>' + (t.aktif ? lencana('Aktif', 'ok') : lencana('Nonaktif', 'polos')) + '</div>' +
          '<div class="kecil" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">' + t.bidang.map((b) => '<span class="lencana ' + (b.kategori === 'kustom' ? 'warn' : b.kategori === 'data' ? 'ok' : 'polos') + ' polos mono">' + esc(b.kunci) + '</span>').join('') + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn kecil utama" data-d="pratinjauTpl" data-id="' + esc(t.id) + '">' + ik('mata') + 'Pratinjau</button><button class="btn kecil" data-d="editTpl" data-id="' + esc(t.id) + '">' + ik('pensil') + 'Edit</button>' +
          '<button class="btn kecil" data-d="kolom" data-id="' + esc(t.id) + '">Atur kolom</button><button class="btn kecil" data-d="pindaiUlang" data-id="' + esc(t.id) + '">' + ik('segar') + 'Pindai ulang</button>' +
          '<a class="btn kecil" href="' + esc(t.url) + '" target="_blank" rel="noopener">Buka master</a><button class="btn kecil ikon hantu" data-d="hapusTpl" data-id="' + esc(t.id) + '" aria-label="Hapus template">' + ik('hapus') + '</button></div></article>').join('') + '</div>'
          : '<div class="kartu kosong"><strong>Belum ada template</strong>Contoh rapor: tulis <span class="mono">{{NAMA}}</span>, <span class="mono">{{NILAI}}</span>, tabel dengan baris <span class="mono">{{#KOMPETENSI}} {{KOMPETENSI.NAMA}} {{KOMPETENSI.PERSEN}}</span>, dan <span class="mono">{{QR}}</span>.</div>') +
        '<section class="kartu" style="margin-top:16px"><h3 style="margin:0 0 10px;font-size:16px">Placeholder yang tersedia</h3>' + Object.keys(T.sumber).map((k) => '<p class="kecil"><b>' + esc(T.sumber[k].label) + ':</b> ' + T.sumber[k].kunci.map((x) => '<span class="mono">{{' + esc(x) + '}}</span>').join(' ') +
          Object.keys(T.sumber[k].blok).map((bk) => ' · baris berulang <span class="mono">{{#' + bk + '}}</span> dengan ' + T.sumber[k].blok[bk].map((x) => '<span class="mono">{{' + bk + '.' + x + '}}</span>').join(' ')).join('') + '</p>').join('') +
        '<p class="kecil"><b>Umum:</b> ' + [].concat(T.umum.sistem, T.umum.institusi, T.umum.pejabat, T.umum.verifikasi).map((x) => '<span class="mono">{{' + esc(x) + '}}</span>').join(' ') + '. Pengubah: <span class="mono">{{NAMA|kapital}}</span>, <span class="mono">|judul</span>, <span class="mono">|terbilang</span>, <span class="mono">|tanggal</span>. Bersyarat: <span class="mono">{{?X}} … {{/X}}</span>. Selain itu = isian manual.</p></section>';
      return;
    }
    if (el.tab === 'buat') {
      box.innerHTML = aktif.length ? '<section class="kartu" style="max-width:860px">' + field('Template', '<select class="inp" id="db-tpl">' + opsi(aktif.map((t) => ({ v: t.id, l: t.nama + ' (' + t.keluaran.toUpperCase() + ')' })), el.tplPilih) + '</select>') + '<div id="db-form"></div><div id="db-format"></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn" data-d="pratinjau">' + ik('mata') + 'Pratinjau</button><button class="btn utama" data-d="generate">' + ik('dok') + 'Terbitkan & unduh</button></div></section>'
        : '<div class="kartu kosong"><strong>Belum ada template aktif</strong>Tambahkan di tab Template.</div>';
      if (aktif.length) { $('#db-tpl', box).onchange = () => { el.tplPilih = $('#db-tpl', box).value; formSumber(el); }; formSumber(el); }
      return;
    }
    if (el.tab === 'massal') {
      const ok = aktif.filter((t) => t.sumber !== 'manual');
      box.innerHTML = ok.length ? '<section class="kartu" style="max-width:860px"><p class="kecil muted" style="margin-top:0">Dokumen dibuat bertahap di server (±5 detik per dokumen). Biarkan halaman ini terbuka; bila tertutup, pemicu server tetap melanjutkan antrean.</p>' +
        '<div class="baris">' + field('Template', '<select class="inp" id="dm-tpl">' + opsi(ok.map((t) => ({ v: t.id, l: t.nama }))) + '</select>') + field('Paket TO', '<select class="inp" id="dm-paket"></select>') + field('Kelas', '<select class="inp" id="dm-kelas">' + opsi(Admin.b().kelas, '', 'Semua kelas') + '</select>') + '</div>' +
        '<button class="btn utama" data-d="massal">' + ik('dok') + 'Mulai membuat</button><div id="dm-prog" style="margin-top:16px"></div></section>' : '<div class="kartu kosong"><strong>Belum ada template untuk data TO</strong></div>';
      if (ok.length) { const r = await api('paket.daftar', {}); if (r.success) $('#dm-paket', box).innerHTML = opsi(r.data.map((p) => ({ v: p.id, l: p.id + ' — ' + p.nama })), '', '— tidak perlu —'); }
      return;
    }
    if (el.tab === 'riwayat') {
      box.innerHTML = '<div class="memuat"></div>';
      const r = await api('doc.dokumen', {});
      el.dok = r.success ? r.data : [];
      box.innerHTML = '<div class="saring"><input class="inp cari" id="dr-cari" placeholder="Cari nama, nomor, atau jenis dokumen…"><select class="inp" id="dr-status">' +
        opsi([{ v: 'TERBIT', l: 'Sah' }, { v: 'DIGANTI', l: 'Diganti (revisi)' }, { v: 'DITARIK', l: 'Ditarik' }], '', 'Semua status') + '</select><button class="btn utama" data-d="baru">' + ik('tambah') + 'Dokumen baru</button></div><div id="dr-isi"></div>';
      const engineDok = (x) => x.engine || ((T.template.find((t) => t.id === x.templateId) || {}).engine) || 'docs';
      const isiR = () => {
        const q = $('#dr-cari', box).value.toLowerCase(), st = $('#dr-status', box).value;
        const list = el.dok.filter((x) => (!st || x.status === st) && (!q || (x.id + ' ' + x.judul + ' ' + x.subjek).toLowerCase().indexOf(q) >= 0));
        $('#dr-isi', box).innerHTML = list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nomor</th><th>Dokumen</th><th>Atas nama</th><th>Terbit</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
          list.map((x) => {
            const fmts = x.gdoc ? (FORMAT[engineDok(x)] || FORMAT.docs).map((f) => f.v) : [x.format || 'pdf'];
            const st = { TERBIT: lencana('Sah', 'ok'), DIGANTI: lencana('Diganti', 'warn'), DITARIK: lencana('Ditarik', 'bad') }[x.status] || lencana(x.status, 'polos');
            return '<tr><td class="chip-id">' + esc(x.id) + '</td><td>' + esc(x.judul) + (x.catatan ? '<div class="kecil muted">' + esc(x.catatan) + '</div>' : '') + '</td><td>' + esc(x.subjek) + '</td><td class="kecil">' + fmt.tgl(x.terbit) + '<div class="muted">' + esc(x.oleh) + '</div></td>' +
              '<td>' + st + '</td><td><div style="display:flex;gap:6px;flex-wrap:wrap">' + fmts.map((f) => '<button class="btn kecil" data-d="unduh" data-id="' + esc(x.id) + '" data-fmt="' + f + '">' + ik('unduh') + f.toUpperCase() + '</button>').join('') +
              (x.status === 'TERBIT' ? '<button class="btn kecil" data-d="revisi" data-id="' + esc(x.id) + '">' + ik('pensil') + 'Edit</button>' : '') +
              '<a class="btn kecil" href="#/verifikasi/' + esc(x.kode) + '" target="_blank" rel="noopener">Verifikasi</a>' +
              (x.status === 'TERBIT' ? '<button class="btn kecil" data-d="tarik" data-id="' + esc(x.id) + '">Tarik</button>' : '') +
              '<button class="btn kecil ikon hantu" data-d="hapusDok" data-id="' + esc(x.id) + '" aria-label="Hapus dokumen">' + ik('hapus') + '</button></div></td></tr>';
          }).join('') + '</tbody></table></div>'
          : '<div class="kartu kosong"><strong>' + (el.dok.length ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen terbit') + '</strong>Tekan "Dokumen baru" untuk membuat dari template.</div>';
      };
      $('#dr-cari', box).addEventListener('input', debounce(isiR, 200));
      $('#dr-status', box).onchange = isiR;
      isiR();
      return;
    }
    if (el.tab === 'pejabat') {
      const r = await api('doc.pejabat', {});
      el.pejabat = r.success ? r.data : [];
      box.innerHTML = '<div class="saring"><span class="kecil muted" style="flex:1">Penanda tangan dipakai untuk <span class="mono">{{NAMA_PEJABAT}}</span>, <span class="mono">{{NIP}}</span>, <span class="mono">{{JABATAN}}</span>, dan gambar <span class="mono">{{TTD}}</span>.</span><button class="btn utama" data-d="pejabat">' + ik('tambah') + 'Penanda tangan</button></div>' +
        (el.pejabat.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>NIP</th><th>Jabatan</th><th>Spesimen TTD</th><th>Status</th><th></th></tr></thead><tbody>' + el.pejabat.map((p) => '<tr><td><b>' + esc(p.nama) + '</b></td><td class="mono">' + esc(p.nip) + '</td><td>' + esc(p.jabatan) + '</td><td>' + (p.spesimenId ? lencana('Ada', 'ok') : lencana('Belum', 'polos')) + '</td><td>' + (p.aktif ? lencana('Aktif', 'ok') : lencana('Nonaktif', 'polos')) + '</td><td><button class="btn kecil" data-d="pejabat" data-id="' + esc(p.id) + '">Ubah</button></td></tr>').join('') + '</tbody></table></div>'
          : '<div class="kartu kosong"><strong>Belum ada penanda tangan</strong>Tambahkan kepala sekolah atau wakil kurikulum.</div>');
    }
  }
  async function formSumber(el) {
    const box = $('#db-form', el), t = el.tpl.template.find((x) => x.id === $('#db-tpl', el).value);
    if (!t) return;
    const kustom = t.bidang.filter((b) => b.kategori === 'kustom');
    let html = '';
    const pk = await api('paket.daftar', {}), paket = pk.success ? pk.data : [];
    if (t.sumber === 'hasil_siswa' || t.sumber === 'rekap_kelas') html += '<div class="baris">' + field('Paket TO', '<select class="inp" id="db-paket">' + opsi(paket.filter((p) => p.sesi.selesai).map((p) => ({ v: p.id, l: p.id + ' — ' + p.nama })), el.refPaket) + '</select>') +
      (t.sumber === 'hasil_siswa' ? field('Siswa', '<select class="inp" id="db-sid"></select>') : field('Kelas', '<select class="inp" id="db-kelas">' + opsi(Admin.b().kelas, '', 'Semua kelas') + '</select>')) + '</div>';
    if (t.sumber === 'kartu_peserta') html += '<div class="baris">' + field('NIS siswa', '<input class="inp mono" id="db-nis">') + field('Paket (opsional)', '<select class="inp" id="db-pk2">' + opsi(paket.map((p) => ({ v: p.id, l: p.nama })), '', '— tanpa paket —') + '</select>') + '</div>';
    html += kustom.map((b) => field(b.label + (b.wajib ? ' *' : ''), b.tipe === 'area' ? '<textarea class="inp" data-kustom="' + esc(b.kunci) + '"></textarea>' : '<input class="inp" type="' + ({ tanggal: 'date', angka: 'number' }[b.tipe] || 'text') + '" data-kustom="' + esc(b.kunci) + '">', esc(b.bantu || ''))).join('');
    if (t.bidang.some((b) => b.kategori === 'pejabat')) { const pj = await api('doc.pejabat', {}); html += field('Penanda tangan', '<select class="inp" id="db-pj">' + opsi((pj.data || []).filter((p) => p.aktif).map((p) => ({ v: p.id, l: p.nama + ' — ' + p.jabatan }))) + '</select>'); }
    box.innerHTML = html || '<p class="kecil muted">Template ini tidak membutuhkan isian.</p>';
    $('#db-format', el).innerHTML = field('Format unduhan', '<select class="inp" id="db-fmt" style="max-width:260px">' + opsi(FORMAT[t.engine] || FORMAT.docs, t.keluaran) + '</select>', 'Format lain tetap bisa diunduh nanti dari tab Riwayat.');
    const ps = $('#db-paket', box), ss = $('#db-sid', box);
    if (ps && ss) {
      const isiS = async () => { const r = await api('hasil.rekap', { idPaket: ps.value }); ss.innerHTML = r.success ? opsi(r.data.rows.map((x) => ({ v: x.sid, l: x.nama + ' (' + x.kelas + ') — ' + fmt.angka(x.nilai) })), el.refSid) : ''; };
      ps.onchange = isiS;
      if (el.refSid) { const r = await api('hasil.siswa', { sid: el.refSid }); if (r.success) { ps.value = r.data.sesi.idPaket; } }
      if (ps.value) await isiS();
    }
  }
  async function aksiDok(el, e) {
    const t = e.target.closest('[data-dt]');
    if (t) { el.tab = t.dataset.dt; return renderDok(el); }
    const b = e.target.closest('[data-d]');
    if (!b) return;
    const a = b.dataset.d, T = el.tpl;
    const muatUlang = async () => { const r = await api('doc.template', {}); if (r.success) { el.tpl = r.data; renderDok(el); } };
    if (a === 'tambahTpl' || a === 'pindaiUlang') {
      const lama = a === 'pindaiUlang' ? T.template.find((x) => x.id === b.dataset.id) : null;
      modal({ judul: lama ? 'Pindai ulang ' + lama.nama : 'Tambah template', ukuran: 'lg', isi: field('Tautan Google Docs/Sheets/Slides', '<input class="inp" id="tp-url" value="' + esc(lama ? lama.url : '') + '" placeholder="https://docs.google.com/document/d/…">', 'Berkas harus milik atau dibagikan ke akun pemilik aplikasi. Master disalin ke folder Template_Dokumen.') +
        '<div class="baris">' + field('Nama template', '<input class="inp" id="tp-nama" value="' + esc(lama ? lama.nama : '') + '">') + field('Sumber data', '<select class="inp" id="tp-sumber">' + opsi(Object.keys(T.sumber).map((k) => ({ v: k, l: T.sumber[k].label })), lama ? lama.sumber : 'hasil_siswa') + '</select>') +
        field('Format keluaran', '<select class="inp" id="tp-out">' + opsi([{ v: 'pdf', l: 'PDF' }, { v: 'docx', l: 'Word (DOCX)' }, { v: 'xlsx', l: 'Excel (XLSX, template Sheets)' }, { v: 'png', l: 'Gambar PNG (template Slides)' }], lama ? lama.keluaran : 'pdf') + '</select>') + '</div>',
        tombol: [{ label: 'Batal' }, { label: 'Pindai template', kelas: 'utama', aksi: async (m) => {
          const r = await api('doc.pindai', { id: lama && lama.id, url: $('#tp-url', m).value, nama: $('#tp-nama', m).value, sumber: $('#tp-sumber', m).value, keluaran: $('#tp-out', m).value });
          toast(r.message, r.success ? 'ok' : 'err', 7000);
          if (r.success) await muatUlang();
          return r.success ? true : false;
        } }] });
    }
    if (a === 'kolom') {
      const tp = T.template.find((x) => x.id === b.dataset.id);
      modal({ judul: 'Atur kolom — ' + tp.nama, ukuran: 'xl', isi: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Placeholder</th><th>Asal nilai</th><th>Label di form</th><th>Tipe</th><th>Wajib</th></tr></thead><tbody>' +
        tp.bidang.map((x) => '<tr data-kol="' + esc(x.kunci) + '"><td class="mono">{{' + esc(x.kunci) + '}}</td><td>' + esc({ data: 'Data TO otomatis', sistem: 'Sistem', institusi: 'Pengaturan sekolah', pejabat: 'Penanda tangan', verifikasi: 'Verifikasi', kustom: 'Isian manual' }[x.kategori]) + '</td>' +
          '<td>' + (x.kategori === 'kustom' ? '<input class="inp" data-f="label" value="' + esc(x.label) + '">' : esc(x.label)) + '</td><td>' + (x.kategori === 'kustom' ? '<select class="inp" data-f="tipe">' + opsi(['teks', 'area', 'tanggal', 'angka'], x.tipe) + '</select>' : esc(x.tipe)) + '</td>' +
          '<td>' + (x.kategori === 'kustom' ? '<input type="checkbox" data-f="wajib"' + (x.wajib ? ' checked' : '') + '>' : '—') + '</td></tr>').join('') + '</tbody></table></div><label class="cek" style="margin-top:12px"><input type="checkbox" id="kl-aktif"' + (tp.aktif ? ' checked' : '') + '>Template aktif</label>',
        tombol: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'utama', aksi: async (m) => {
          const bidang = $$('[data-kol]', m).map((r) => ({ kunci: r.dataset.kol, label: ($('[data-f=label]', r) || {}).value, tipe: ($('[data-f=tipe]', r) || {}).value, wajib: ($('[data-f=wajib]', r) || {}).checked }));
          const r = await api('doc.simpanTemplate', { id: tp.id, bidang, aktif: $('#kl-aktif', m).checked });
          toast(r.message, r.success ? 'ok' : 'err'); if (r.success) await muatUlang(); return r.success ? true : false;
        } }] });
    }
    if (a === 'hapusTpl' && await konfirmasi('Hapus template dari daftar? Berkas master tetap di Drive.', { bahaya: true, ya: 'Hapus' })) { const r = await api('doc.hapusTemplate', { id: b.dataset.id }); toast(r.message, r.success ? 'ok' : 'err'); muatUlang(); }
    if (a === 'generate' || a === 'pratinjau') {
      const tp = T.template.find((x) => x.id === $('#db-tpl', el).value), ref = {};
      if ($('#db-sid', el)) ref.sid = $('#db-sid', el).value;
      if ($('#db-kelas', el)) { ref.idPaket = $('#db-paket', el).value; ref.kelas = $('#db-kelas', el).value; }
      if ($('#db-nis', el)) { ref.nis = $('#db-nis', el).value.trim(); ref.idPaket = $('#db-pk2', el).value; }
      const isian = {};
      $$('[data-kustom]', el).forEach((x) => { isian[x.dataset.kustom] = x.value; });
      const pejabatId = $('#db-pj', el) ? $('#db-pj', el).value : '', format = $('#db-fmt', el) ? $('#db-fmt', el).value : '';
      if (a === 'pratinjau') {
        sibuk(b, true, 'Menyusun…');
        const r = await api('doc.pratinjau', { templateId: tp.id, ref, isian, qr: await qrContoh(tp), pejabatId });
        sibuk(b, false);
        if (!r.success) return toast(r.message, 'err', 8000);
        return tampilPdf(r.data.b64, 'Pratinjau — ' + tp.nama, r.data.nama, 'Belum diterbitkan: tidak bernomor, QR berisi contoh, dan tidak tercatat di riwayat.');
      }
      sibuk(b, true, 'Menerbitkan…');
      let kode = '', qr = '';
      if (perluQr(tp)) { const s = await api('doc.siapkan', {}); if (s.success) { kode = s.data.kode; try { qr = await buatQr(s.data.url); } catch (er) { toast('QR gagal dibuat di peramban: ' + er.message, 'warn'); } } }
      const r = await api('doc.generate', { templateId: tp.id, ref, isian, kode, qr, pejabatId, format });
      sibuk(b, false);
      toast(r.message, r.success ? 'ok' : 'err', 8000);
      if (r.success && r.data.b64) unduhB64(r.data.b64, r.data.nama, r.data.mime);
    }
    if (a === 'baru') { el.tab = 'buat'; return renderDok(el); }
    if (a === 'pratinjauTpl') {
      const tp = T.template.find((x) => x.id === b.dataset.id);
      sibuk(b, true);
      const r = await api('doc.pratinjau', { templateId: tp.id, qr: await qrContoh(tp) });
      sibuk(b, false);
      if (!r.success) return toast(r.message, 'err', 8000);
      tampilPdf(r.data.b64, 'Pratinjau template — ' + tp.nama, r.data.nama, 'Diisi data contoh. Isian manual ditampilkan sebagai ‹label›.');
    }
    if (a === 'editTpl') {
      const tp = T.template.find((x) => x.id === b.dataset.id);
      modal({ judul: 'Edit template', isi: field('Nama template', '<input class="inp" id="et-nama" value="' + esc(tp.nama) + '">') +
        '<div class="baris dua">' + field('Sumber data', '<select class="inp" id="et-sumber">' + opsi(Object.keys(T.sumber).map((k) => ({ v: k, l: T.sumber[k].label })), tp.sumber) + '</select>') +
        field('Format bawaan', '<select class="inp" id="et-out">' + opsi(FORMAT[tp.engine] || FORMAT.docs, tp.keluaran) + '</select>') + '</div>' +
        '<label class="cek"><input type="checkbox" id="et-aktif"' + (tp.aktif ? ' checked' : '') + '>Template aktif (bisa dipakai membuat dokumen)</label>' +
        '<p class="kecil muted">Mengubah isi/tata letak dilakukan di master Google (tombol "Buka master"), lalu tekan "Pindai ulang".</p>',
        tombol: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'utama', aksi: async (m) => {
          const r = await api('doc.simpanTemplate', { id: tp.id, nama: $('#et-nama', m).value, sumber: $('#et-sumber', m).value, keluaran: $('#et-out', m).value, aktif: $('#et-aktif', m).checked });
          toast(r.message, r.success ? 'ok' : 'err'); if (r.success) await muatUlang(); return r.success ? true : false;
        } }] });
    }
    if (a === 'unduh') {
      sibuk(b, true);
      const r = await api('doc.unduh', { id: b.dataset.id, format: b.dataset.fmt });
      sibuk(b, false);
      if (r.success) unduhB64(r.data.b64, r.data.nama, r.data.mime); else toast(r.message, 'err', 8000);
    }
    if (a === 'hapusDok' && await konfirmasi('Hapus dokumen ' + b.dataset.id + '? Berkasnya dipindah ke Sampah Drive dan kode QR-nya tidak berlaku lagi.', { bahaya: true, ya: 'Hapus' })) {
      const r = await api('doc.hapus', { id: b.dataset.id }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) renderDok(el);
    }
    if (a === 'revisi') {
      const x = el.dok.find((d) => d.id === b.dataset.id), tp = T.template.find((t) => t.id === x.templateId);
      if (!tp) return toast('Template dokumen ini sudah dihapus, jadi tidak bisa diedit.', 'err');
      const kustom = tp.bidang.filter((f) => f.kategori === 'kustom');
      const pj = tp.bidang.some((f) => f.kategori === 'pejabat') ? await api('doc.pejabat', {}) : null;
      modal({ judul: 'Edit dokumen ' + x.id, ukuran: 'lg', isi: '<p class="kecil muted" style="margin-top:0">' + esc(x.judul) + ' — ' + esc(x.subjek) + '. Dokumen akan diterbitkan ulang dengan nomor & QR baru; dokumen lama berstatus <b>diganti</b>. Data hasil TO diambil ulang dari sistem.</p>' +
        (kustom.length ? kustom.map((f) => field(f.label, f.tipe === 'area' ? '<textarea class="inp" data-rv="' + esc(f.kunci) + '">' + esc(x.isian[f.kunci] || x.isian[f.kunci.toLowerCase()] || '') + '</textarea>' : '<input class="inp" data-rv="' + esc(f.kunci) + '" value="' + esc(x.isian[f.kunci] || x.isian[f.kunci.toLowerCase()] || '') + '">')).join('') : '<p class="kecil">Template ini tidak memiliki isian manual; data akan diperbarui dari sistem.</p>') +
        '<div class="baris dua">' + (pj && pj.success ? field('Penanda tangan', '<select class="inp" id="rv-pj">' + opsi(pj.data.filter((p) => p.aktif).map((p) => ({ v: p.id, l: p.nama + ' — ' + p.jabatan }))) + '</select>') : '') +
        field('Format unduhan', '<select class="inp" id="rv-fmt">' + opsi(FORMAT[tp.engine] || FORMAT.docs, x.format) + '</select>') + '</div>' + field('Alasan perubahan (opsional)', '<input class="inp" id="rv-alasan">'),
        tombol: [{ label: 'Batal' }, { label: 'Terbitkan revisi', kelas: 'utama', aksi: async (m) => {
          const isian = {};
          $$('[data-rv]', m).forEach((i) => { isian[i.dataset.rv] = i.value; });
          let kode = '', qr = '';
          if (perluQr(tp)) { const s = await api('doc.siapkan', {}); if (s.success) { kode = s.data.kode; try { qr = await buatQr(s.data.url); } catch (er) { } } }
          const r = await api('doc.revisi', { id: x.id, isian, kode, qr, pejabatId: $('#rv-pj', m) ? $('#rv-pj', m).value : '', format: $('#rv-fmt', m).value, alasan: $('#rv-alasan', m).value });
          toast(r.message, r.success ? 'ok' : 'err', 8000);
          if (!r.success) return false;
          if (r.data.b64) unduhB64(r.data.b64, r.data.nama, r.data.mime);
          renderDok(el);
        } }] });
    }
    if (a === 'massal') {
      const prog = $('#dm-prog', el);
      sibuk(b, true, 'Menyiapkan antrean…');
      const r = await api('doc.massal', { templateId: $('#dm-tpl', el).value, idPaket: $('#dm-paket', el).value, kelas: $('#dm-kelas', el).value });
      if (!r.success) { sibuk(b, false); return toast(r.message, 'err', 8000); }
      const job = r.data;
      if (job.perluQr) {
        prog.innerHTML = '<p class="kecil">Membuat ' + job.items.length + ' kode QR di peramban…</p>';
        for (let i = 0; i < job.items.length; i += 40) {
          const items = [];
          for (const it of job.items.slice(i, i + 40)) items.push({ baris: it.baris, qr: await buatQr(it.url) });
          await api('doc.massalQr', { jobId: job.jobId, items });
        }
      }
      let st = { total: job.total, SELESAI: 0, GAGAL: 0, MENUNGGU: job.total };
      while (st.MENUNGGU > 0) {
        prog.innerHTML = '<p class="kecil"><b>' + st.SELESAI + '</b> dari ' + st.total + ' selesai' + (st.GAGAL ? ', ' + st.GAGAL + ' gagal' : '') + '…</p>' + bar(st.SELESAI / st.total * 100, 'ok');
        const p = await api('doc.proses', { jobId: job.jobId });
        if (!p.success) { toast(p.message, 'err'); break; }
        st = p.data;
        if (!p.data.diproses && st.MENUNGGU) await sleep(5000);
      }
      sibuk(b, false);
      prog.innerHTML = '<div class="alert ' + (st.GAGAL ? 'warn' : 'ok') + '">' + ik(st.GAGAL ? 'awas' : 'cek') + '<div>' + st.SELESAI + ' dokumen selesai' + (st.GAGAL ? ', ' + st.GAGAL + ' gagal: ' + esc(st.galat.join(' | ')) : '') + '.</div></div><button class="btn utama" data-d="zip" data-job="' + esc(job.jobId) + '">' + ik('unduh') + 'Unduh ZIP</button>';
    }
    if (a === 'zip') { sibuk(b, true, 'Mengemas…'); const r = await api('doc.zip', { jobId: b.dataset.job }); sibuk(b, false); if (r.success) unduhB64(r.data.b64, r.data.nama, 'application/zip'); else toast(r.message, 'err'); }
    if (a === 'tarik') { const alasan = await tanya('Tarik dokumen', 'Alasan penarikan (tampil di halaman verifikasi)', ''); if (!alasan) return; const r = await api('doc.tarik', { id: b.dataset.id, alasan }); toast(r.message, r.success ? 'ok' : 'err'); renderDok(el); }
    if (a === 'pejabat') {
      const p = (el.pejabat || []).find((x) => x.id === b.dataset.id) || { aktif: true };
      modal({ judul: p.id ? 'Ubah penanda tangan' : 'Tambah penanda tangan', isi: '<div class="baris dua">' + field('Nama & gelar', '<input class="inp" id="pj-nama" value="' + esc(p.nama || '') + '">') + field('NIP', '<input class="inp mono" id="pj-nip" value="' + esc(p.nip || '') + '">') + '</div>' +
        field('Jabatan', '<input class="inp" id="pj-jab" value="' + esc(p.jabatan || '') + '" placeholder="Kepala Sekolah">') + field('Spesimen tanda tangan (PNG transparan)', '<input type="file" class="inp" id="pj-ttd" accept="image/png">', p.spesimenId ? 'Sudah ada. Pilih berkas baru untuk mengganti.' : 'Opsional.') +
        '<label class="cek"><input type="checkbox" id="pj-aktif"' + (p.aktif ? ' checked' : '') + '>Aktif</label>',
        tombol: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'utama', aksi: async (m) => {
          let spes = p.spesimenId || '';
          const f = $('#pj-ttd', m).files[0];
          if (f) { const r1 = await api('media.unggah', { b64: await bacaB64(f), mime: 'image/png', nama: 'spesimen.png', jenis: 'spesimen' }); if (!r1.success) { toast(r1.message, 'err'); return false; } spes = r1.data.id; }
          const r = await api('doc.simpanPejabat', { id: p.id, nama: $('#pj-nama', m).value, nip: $('#pj-nip', m).value, jabatan: $('#pj-jab', m).value, spesimenId: spes, aktif: $('#pj-aktif', m).checked });
          toast(r.message, r.success ? 'ok' : 'err'); if (r.success) renderDok(el); return r.success ? true : false;
        } }] });
    }
  }

  // ============================================================ MIGRASI DATA
  Admin.daftar('migrasi', {
    judul: 'Migrasi Data', ikon: 'migrasi', grup: 'Administrasi', peran: SA,
    render(el) {
      el.innerHTML = Admin.kepala('Migrasi data dari aplikasi lama', 'Spreadsheet sumber hanya DIBACA. Impor aman diulang: data yang sama tidak menjadi dobel, dan keputusan di aplikasi ini (soal disetujui, pengaturan yang sudah diubah) tidak ditimpa.') +
        '<div class="kisi k84"><section class="kartu"><div class="kartu-kepala"><h2>1. Sumber data</h2></div>' + field('URL atau ID spreadsheet aplikasi lama', '<input class="inp" id="mg-src" placeholder="https://docs.google.com/spreadsheets/d/…">', 'Harus milik akun Google yang sama dengan pemilik aplikasi ini agar file Drive lama tetap terbaca.') +
        '<button class="btn" data-mg="pindai">' + ik('cari') + 'Pindai sumber</button><div id="mg-sheet" style="margin-top:16px"></div></section>' +
        '<aside class="kartu"><h3 style="margin:0 0 10px;font-size:16px">Langkah pindah (cutover)</h3><ol class="kecil" style="padding-left:18px;margin:0"><li>Pindai lalu jalankan <b>Dry-run</b> untuk melihat angka.</li><li><b>Jalankan impor</b>. Sheet diproses berurutan: master dulu, lalu relasi.</li>' +
        '<li>Cek data siswa, bank soal, dan paket. Kata sandi tidak ikut pindah — <b>reset sandi massal</b> di menu Akun lalu bagikan kartu login.</li><li>Tepat sebelum pindah, jalankan impor <b>sekali lagi</b> (delta) untuk data baru di app lama.</li><li>Umumkan alamat baru; arsipkan deployment lama.</li></ol></aside></div>' +
        '<section class="kartu" style="margin-top:16px" id="mg-hasil" hidden><div class="kartu-kepala"><h2 id="mg-judul">Hasil</h2></div><div id="mg-tabel"></div><div id="mg-warn"></div></section>';
      el.addEventListener('click', (e) => aksiMigrasi(el, e));
    }
  });
  async function aksiMigrasi(el, e) {
    const b = e.target.closest('[data-mg]');
    if (!b) return;
    const src = $('#mg-src', el).value.trim();
    if (b.dataset.mg === 'pindai') {
      if (!src) return toast('Tempel URL spreadsheet lama.', 'warn');
      sibuk(b, true);
      const r = await api('migrasi.pindai', { source: src });
      sibuk(b, false);
      if (!r.success) return toast(r.message, 'err', 8000);
      el.sumber = r.data;
      $('#mg-sheet', el).innerHTML = '<p class="kecil">Sumber: <b>' + esc(r.data.source.nama) + '</b></p><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Data</th><th class="angka">Baris</th><th>Kolom cocok</th><th>Kolom tak ditemukan</th></tr></thead><tbody>' +
        r.data.sheets.map((s) => '<tr><td><input type="checkbox" data-mgs="' + s.nama + '"' + (s.ada && s.baris && s.nama !== 'Log' ? ' checked' : '') + (s.ada ? '' : ' disabled') + '></td><td><b>' + esc(s.nama) + '</b></td><td class="angka">' + (s.ada ? s.baris : '—') + '</td>' +
          '<td>' + (s.ada ? s.cocok : lencana('Tidak ada', 'polos')) + '</td><td class="kecil muted">' + (s.ada ? esc(s.hilang.join(', ')) : '') + '</td></tr>').join('') + '</tbody></table></div>' +
        '<label class="cek" style="margin-top:12px"><input type="checkbox" id="mg-timpa">Perbarui data yang sudah ada (nama, teks soal, dll). Status disetujui di aplikasi ini tetap dijaga.</label>' +
        '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn" data-mg="dry">' + ik('mata') + 'Dry-run (tanpa menulis)</button><button class="btn utama" data-mg="jalan">' + ik('migrasi') + 'Jalankan impor</button></div>';
    }
    if (b.dataset.mg === 'dry' || b.dataset.mg === 'jalan') {
      const sheets = el.sumber.urutan.filter((n) => { const c = $('[data-mgs="' + n + '"]', el); return c && c.checked; });
      if (!sheets.length) return toast('Pilih minimal satu data.', 'warn');
      const dry = b.dataset.mg === 'dry';
      if (!dry && !(await konfirmasi('Impor ' + sheets.length + ' jenis data ke aplikasi ini? Data sumber tidak diubah.', { ya: 'Jalankan impor' }))) return;
      sibuk(b, true);
      $('#mg-hasil', el).hidden = false;
      $('#mg-judul', el).textContent = dry ? 'Hasil dry-run (belum ada yang ditulis)' : 'Hasil impor';
      const rows = [], warn = [];
      for (const s of sheets) {
        $('#mg-tabel', el).innerHTML = '<div class="memuat">Memproses ' + esc(s) + '…</div>';
        const r = await api('migrasi.jalankan', { source: src, sheet: s, dryRun: dry, timpa: $('#mg-timpa', el).checked });
        if (!r.success) { warn.push(s + ': ' + r.message); continue; }
        rows.push(Object.assign({ sheet: s }, r.data.report));
        r.data.peringatan.forEach((w) => warn.push(s + ': ' + w));
      }
      sibuk(b, false);
      $('#mg-tabel', el).innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th class="angka">Di sumber</th><th class="angka">Ditambah</th><th class="angka">Diperbarui</th><th class="angka">Dilewati</th></tr></thead><tbody>' +
        rows.map((x) => '<tr><td><b>' + esc(x.sheet) + '</b></td><td class="angka">' + x.sumber + '</td><td class="angka" style="color:var(--ok)">' + x.ditambah + '</td><td class="angka">' + x.diperbarui + '</td><td class="angka muted">' + x.dilewati + '</td></tr>').join('') + '</tbody></table></div>';
      $('#mg-warn', el).innerHTML = warn.length ? '<div class="alert warn" style="margin-top:12px">' + ik('awas') + '<div>' + warn.map(esc).join('<br>') + '</div></div>' : '';
      if (!dry) { ['soal', 'dash', 'akun', 'paket', 'aboot'].forEach((k) => basi(k)); Admin.segarBoot(true); toast('Impor selesai.', 'ok'); }
    }
  }
})();
