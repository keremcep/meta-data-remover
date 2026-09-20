/* Belge Metadata Aracı - istemci */
(() => {
  'use strict';

  const CORE_KEYS = [
    'dc:title', 'dc:subject', 'dc:creator', 'cp:keywords', 'dc:description',
    'cp:lastModifiedBy', 'cp:revision', 'cp:lastPrinted', 'dcterms:created',
    'dcterms:modified', 'cp:category', 'cp:contentStatus', 'dc:identifier',
    'dc:language', 'cp:version', 'cp:contentType',
  ];
  const CORE_LABELS = {
    'dc:title': 'Başlık', 'dc:subject': 'Konu', 'dc:creator': 'Yazar (oluşturan)',
    'cp:keywords': 'Etiketler', 'dc:description': 'Açıklama / Yorumlar',
    'cp:lastModifiedBy': 'Son değiştiren', 'cp:revision': 'Revizyon numarası',
    'cp:lastPrinted': 'Son yazdırma', 'dcterms:created': 'Oluşturma tarihi',
    'dcterms:modified': 'Son değiştirme tarihi', 'cp:category': 'Kategori',
    'cp:contentStatus': 'İçerik durumu', 'dc:identifier': 'Tanımlayıcı',
    'dc:language': 'Dil', 'cp:version': 'Sürüm', 'cp:contentType': 'İçerik türü',
  };
  const APP_KEYS = [
    'Template', 'TotalTime', 'Pages', 'Words', 'Characters', 'PresentationFormat',
    'Application', 'DocSecurity', 'Lines', 'Paragraphs', 'Slides', 'Notes',
    'HiddenSlides', 'MMClips', 'ScaleCrop', 'HeadingPairs', 'TitlesOfParts',
    'Company', 'LinksUpToDate', 'CharactersWithSpaces', 'SharedDoc',
    'HyperlinksChanged', 'AppVersion', 'Manager', 'HyperlinkBase', 'HLinks',
  ];
  const APP_LABELS = {
    Template: 'Şablon', TotalTime: 'Toplam düzenleme süresi (dk)', Pages: 'Sayfa sayısı',
    Words: 'Sözcük sayısı', Characters: 'Karakter (boşluksuz)', PresentationFormat: 'Sunu biçimi',
    Application: 'Uygulama', DocSecurity: 'Belge güvenliği', Lines: 'Satır sayısı',
    Paragraphs: 'Paragraf sayısı', Slides: 'Slayt sayısı', Notes: 'Not sayısı',
    HiddenSlides: 'Gizli slayt', MMClips: 'Multimedya klip', ScaleCrop: 'Küçük resim ölçekle',
    HeadingPairs: 'Başlık çiftleri', TitlesOfParts: 'Bölüm başlıkları', Company: 'Şirket',
    LinksUpToDate: 'Bağlantılar güncel', CharactersWithSpaces: 'Karakter (boşluklu)',
    SharedDoc: 'Paylaşılan belge', HyperlinksChanged: 'Köprüler değişti',
    AppVersion: 'Uygulama sürümü', Manager: 'Yönetici', HyperlinkBase: 'Köprü tabanı', HLinks: 'Köprüler',
  };
  const COMPLEX = new Set(['HeadingPairs', 'TitlesOfParts', 'HLinks']);
  const CUSTOM_TYPES = ['lpwstr', 'i4', 'r8', 'bool', 'filetime'];

  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children) if (c !== null && c !== undefined) n.append(c);
    return n;
  };

  const state = { file: null, original: null, insp: null, customDirty: false };

  // ---------- yardımcılar ----------
  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }
  function toast(msg, kind = 'info') {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast ' + kind;
    clearTimeout(toast._h);
    toast._h = setTimeout(() => t.classList.add('hidden'), 3500);
  }
  function busy(on) {
    document.body.classList.toggle('busy', on);
    for (const b of document.querySelectorAll('.actions button')) b.disabled = on;
  }
  function flagBadge(flag) {
    if (!flag) return null;
    return el('span', { class: 'flag ' + flag.kind, title: flag.reason + ': "' + flag.match + '"' },
      flag.kind === 'ai' ? 'AI izi' : 'Araç izi');
  }
  function localToIso(v) {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d) ? v : d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  function isoToLocal(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  // ---------- API ----------
  async function apiInspect(file) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const r = await fetch('/api/inspect', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'İnceleme hatası');
    return j;
  }
  async function apiApply(file, edits, opts = {}) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('edits', JSON.stringify(edits));
    if (opts.template) {
      fd.append('template', '1');
      fd.append('name', $('userName').value || '');
      fd.append('freshDates', $('freshDates').checked ? '1' : '0');
    }
    const r = await fetch('/api/apply', { method: 'POST', body: fd });
    if (!r.ok) {
      let msg = 'Uygulama hatası';
      try { msg = (await r.json()).error || msg; } catch { /* yoksay */ }
      throw new Error(msg);
    }
    const blob = await r.blob();
    let notes = [];
    try { notes = JSON.parse(decodeURIComponent(r.headers.get('X-Notes') || '[]')); } catch { /* yoksay */ }
    return { file: new File([blob], file.name, { type: file.type }), notes };
  }

  // ---------- satır oluşturucular ----------
  function propRow({ key, label, value, flag, isDate, complex, added, hint }) {
    const row = el('div', { class: 'row', 'data-key': key, 'data-original': added ? '' : value, 'data-added': added ? '1' : '' });
    if (added) row.classList.add('added');
    const head = el('div', { class: 'row-head' },
      el('span', { class: 'row-label', text: label || key }),
      el('code', { class: 'row-key', text: key }),
      flagBadge(flag),
    );
    let control;
    if (complex) {
      control = el('textarea', { class: 'input mono', readonly: true, rows: 2 }, value);
      control.title = 'Karmaşık alan: yalnızca görüntülenir. Kaldırmak için çöp kutusunu kullanın.';
    } else if (isDate) {
      const wrap = el('div', { class: 'date-wrap' });
      const dt = el('input', { class: 'input', type: 'datetime-local', step: '1', value: isoToLocal(value) });
      const iso = el('input', { class: 'input mono iso', type: 'text', value: value, placeholder: 'YYYY-MM-DDTHH:MM:SSZ' });
      dt.addEventListener('input', () => { if (dt.value) iso.value = localToIso(dt.value); });
      iso.addEventListener('input', () => { dt.value = isoToLocal(iso.value); });
      const nowBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Şimdi', onclick: () => {
        const n = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        iso.value = n; dt.value = isoToLocal(n);
      } });
      wrap.append(dt, iso, nowBtn);
      control = wrap;
      row.dataset.date = '1';
    } else {
      control = el('input', { class: 'input', type: 'text', value: value ?? '' });
    }
    const del = el('button', { class: 'icon-btn', type: 'button', title: 'Alanı kaldır', text: '🗑' });
    del.addEventListener('click', () => {
      if (row.dataset.added) { row.remove(); refreshAddSelects(); return; }
      row.classList.toggle('removed');
      del.textContent = row.classList.contains('removed') ? '↺' : '🗑';
      del.title = row.classList.contains('removed') ? 'Geri al' : 'Alanı kaldır';
    });
    row.append(head, el('div', { class: 'row-ctl' }, control, del));
    if (hint) row.append(el('div', { class: 'row-hint', text: hint }));
    return row;
  }

  function rowValue(row) {
    if (row.dataset.date) return row.querySelector('input.iso').value.trim();
    const inp = row.querySelector('input.input, textarea.input');
    return inp ? inp.value : '';
  }

  function customRow(p = { name: '', type: 'lpwstr', value: '' }, flag = null) {
    const row = el('div', { class: 'row custom' });
    const name = el('input', { class: 'input', type: 'text', placeholder: 'Ad', value: p.name });
    const type = el('select', { class: 'input select' });
    for (const t of CUSTOM_TYPES) type.append(el('option', { value: t, text: t, selected: t === p.type }));
    if (!CUSTOM_TYPES.includes(p.type)) type.append(el('option', { value: p.type, text: p.type, selected: true }));
    const value = el('input', { class: 'input', type: 'text', placeholder: 'Değer', value: p.value });
    const del = el('button', { class: 'icon-btn', type: 'button', title: 'Kaldır', text: '🗑', onclick: () => { row.remove(); state.customDirty = true; } });
    for (const i of [name, type, value]) i.addEventListener('input', () => { state.customDirty = true; });
    row.append(
      el('div', { class: 'row-head' }, el('span', { class: 'row-label', text: 'Özel özellik' }), flagBadge(flag)),
      el('div', { class: 'row-ctl custom-grid' }, name, type, value, del),
    );
    return row;
  }

  function authorRow(a) {
    const row = el('div', { class: 'row', 'data-author': a.name });
    row.append(
      el('div', { class: 'row-head' },
        el('span', { class: 'row-label', text: a.name }),
        el('span', { class: 'muted small', text: `${a.count} yerde · ${a.parts.map((p) => p.replace(/^.*\//, '')).join(', ')}` }),
        flagBadge(a.flag),
      ),
      el('div', { class: 'row-ctl' },
        el('span', { class: 'arrow', text: '→' }),
        el('input', { class: 'input', type: 'text', value: a.name, placeholder: 'Yeni ad' }),
        el('button', { class: 'btn btn-sm', type: 'button', text: 'Kullanıcı adı yap', onclick: (e) => {
          e.currentTarget.parentElement.querySelector('input').value = $('userName').value;
        } }),
      ),
    );
    return row;
  }

  // ---------- render ----------
  function refreshAddSelects() {
    const fill = (sel, keys, labels, rowsEl) => {
      const present = new Set([...rowsEl.querySelectorAll('.row')].map((r) => r.dataset.key));
      sel.innerHTML = '';
      sel.append(el('option', { value: '', text: '+ Alan ekle…' }));
      for (const k of keys) if (!present.has(k)) sel.append(el('option', { value: k, text: (labels[k] || k) + '  (' + k + ')' }));
    };
    fill($('coreAdd'), CORE_KEYS, CORE_LABELS, $('coreRows'));
    fill($('appAdd'), APP_KEYS.filter((k) => !COMPLEX.has(k)), APP_LABELS, $('appRows'));
  }

  function render(insp) {
    state.insp = insp;
    state.customDirty = false;
    $('workspace').classList.remove('hidden');
    $('dropzone').classList.add('compact');

    $('fileBadge').textContent = (insp.fileType || 'dosya').toUpperCase();
    $('fileName').textContent = insp.fileName;
    $('fileMeta').textContent = `${fmtSize(insp.size)} · ${insp.entries ? insp.entries.length + ' paket parçası' : ''}`;

    const notice = $('notice');
    if (!insp.supported) {
      notice.className = 'notice error';
      notice.textContent = insp.reason || 'Bu dosya türü desteklenmiyor.';
      for (const id of ['coreRows', 'appRows', 'customRows', 'authorRows', 'otherRows']) $(id).innerHTML = '';
      return;
    }
    notice.classList.add('hidden');

    // Şüpheli işaretler
    const fb = $('flagsBanner');
    fb.innerHTML = '';
    if (insp.flags.length) {
      fb.classList.remove('hidden');
      fb.append(el('strong', { text: `${insp.flags.length} şüpheli işaret bulundu` }));
      const ul = el('ul');
      for (const f of insp.flags) {
        ul.append(el('li', {}, el('b', { text: f.where + ' · ' + f.key + ': ' }), el('span', { text: `"${f.match}" (${f.reason})` })));
      }
      fb.append(ul, el('p', { class: 'small', text: 'Şablon butonu bunların hepsini otomatik temizler; dilerseniz aşağıdan tek tek de düzenleyebilirsiniz.' }));
    } else {
      fb.classList.remove('hidden');
      fb.className = 'flags clean';
      fb.append(el('strong', { text: 'Şüpheli işaret bulunmadı.' }), el('span', { class: 'small', text: ' Yine de tüm alanları aşağıdan gözden geçirebilirsiniz.' }));
    }
    if (insp.flags.length) fb.className = 'flags';

    // Core
    const cr = $('coreRows');
    cr.innerHTML = '';
    if (!insp.core.exists) cr.append(el('p', { class: 'muted', text: 'core.xml yok. Alan eklediğinizde oluşturulur.' }));
    for (const it of insp.core.items) cr.append(propRow({ key: it.key, label: CORE_LABELS[it.key], value: it.value, flag: it.flag, isDate: it.isDate }));

    // App
    const ar = $('appRows');
    ar.innerHTML = '';
    if (!insp.app.exists) ar.append(el('p', { class: 'muted', text: 'app.xml yok. Alan eklediğinizde oluşturulur.' }));
    for (const it of insp.app.items) ar.append(propRow({ key: it.key, label: APP_LABELS[it.key], value: it.value, flag: it.flag, complex: it.complex }));

    // Custom
    const cu = $('customRows');
    cu.innerHTML = '';
    if (!insp.custom.items.length) cu.append(el('p', { class: 'muted empty', text: 'Özel özellik yok.' }));
    for (const p of insp.custom.items) cu.append(customRow(p, p.flag));

    // Authors
    const au = $('authorRows');
    au.innerHTML = '';
    if (!insp.authors.length) au.append(el('p', { class: 'muted', text: 'Yorum, değişiklik izleme veya kişi kaydı bulunmadı.' }));
    for (const a of insp.authors) au.append(authorRow(a));

    // Other
    const ot = $('otherRows');
    ot.innerHTML = '';
    const thumb = el('label', { class: 'check' },
      el('input', { id: 'removeThumb', type: 'checkbox', disabled: !insp.thumbnail }),
      el('span', { text: insp.thumbnail ? `Küçük resmi kaldır (${insp.thumbnail})` : 'Küçük resim yok' }));
    ot.append(el('div', { class: 'row' }, el('div', { class: 'row-head' }, el('span', { class: 'row-label', text: 'Küçük resim' })), thumb));

    if (insp.stats) {
      const s = insp.stats;
      ot.append(el('div', { class: 'row' },
        el('div', { class: 'row-head' }, el('span', { class: 'row-label', text: 'Belge içeriğinden hesaplanan istatistik' })),
        el('div', { class: 'muted small', text: `${s.words} sözcük · ${s.chars} karakter (boşluksuz) · ${s.charsWithSpaces} karakter (boşluklu) · ${s.paragraphs} paragraf · ~${s.pages} sayfa · ~${s.lines} satır` }),
      ));
    }

    const scanRow = el('div', { class: 'row' });
    scanRow.append(el('div', { class: 'row-head' }, el('span', { class: 'row-label', text: `İçerik taraması (${insp.scan.length} eşleşme)` }),
      el('span', { class: 'muted small', text: 'Belge metni ve XML parçalarında geçen AI / araç anahtar sözcükleri. Bilgi amaçlı; metin içeriği değiştirilmez.' })));
    if (insp.scan.length) {
      const det = el('details', {}, el('summary', { text: 'Eşleşmeleri göster' }));
      const ul = el('ul', { class: 'scan' });
      for (const h of insp.scan) ul.append(el('li', {}, el('code', { text: h.part }), ' ', flagBadge(h), ' ', el('span', { class: 'snippet', text: '…' + h.snippet + '…' })));
      det.append(ul);
      scanRow.append(det);
    }
    ot.append(scanRow);

    const entries = el('details', {}, el('summary', { text: `Paket parçaları (${insp.entries.length})` }));
    const ul = el('ul', { class: 'entries mono small' });
    for (const e of insp.entries) ul.append(el('li', { text: `${e.path}  ${e.date ? '· ' + e.date.slice(0, 10) : ''}` }));
    entries.append(ul, el('p', { class: 'muted small', text: 'Kaydederken tüm parça tarihleri Word gibi 1980-01-01 yapılır.' }));
    ot.append(el('div', { class: 'row' }, entries));

    refreshAddSelects();
  }

  // ---------- düzenlemeleri topla ----------
  function collectEdits() {
    const edits = { core: {}, app: {}, authors: {} };
    const gather = (rowsEl, target) => {
      for (const row of rowsEl.querySelectorAll('.row[data-key]')) {
        const key = row.dataset.key;
        if (row.classList.contains('removed')) { target[key] = null; continue; }
        if (row.querySelector('textarea[readonly]')) continue; // karmaşık alan
        const v = rowValue(row);
        if (row.dataset.added || v !== row.dataset.original) target[key] = v;
      }
    };
    gather($('coreRows'), edits.core);
    gather($('appRows'), edits.app);

    if (state.customDirty) {
      edits.custom = [...$('customRows').querySelectorAll('.row.custom')].map((r) => {
        const inputs = r.querySelectorAll('input');
        return { name: inputs[0].value.trim(), type: r.querySelector('select').value, value: inputs[1].value };
      }).filter((p) => p.name);
    }

    for (const row of $('authorRows').querySelectorAll('.row[data-author]')) {
      const nv = row.querySelector('input').value.trim();
      if (nv && nv !== row.dataset.author) edits.authors[row.dataset.author] = nv;
    }
    const rt = $('removeThumb');
    if (rt && rt.checked) edits.removeThumbnail = true;
    return edits;
  }

  // ---------- olaylar ----------
  async function loadFile(file, { keepOriginal = false } = {}) {
    busy(true);
    try {
      const insp = await apiInspect(file);
      state.file = file;
      if (!keepOriginal) state.original = file;
      render(insp);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      busy(false);
    }
  }

  function download(file) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function showNotes(notes, title) {
    const n = $('notice');
    n.className = 'notice ok';
    n.innerHTML = '';
    n.append(el('strong', { text: title }));
    if (notes.length) {
      const ul = el('ul');
      for (const t of notes) ul.append(el('li', { text: t }));
      n.append(ul);
    }
  }

  $('btnTemplate').addEventListener('click', async () => {
    if (!state.file) return;
    if (!$('userName').value.trim()) { toast('Önce kullanıcı adını girin.', 'error'); $('userName').focus(); return; }
    busy(true);
    try {
      const { file, notes } = await apiApply(state.file, collectEdits(), { template: true });
      const insp = await apiInspect(file);
      state.file = file;
      render(insp);
      showNotes(notes, 'Şablon uygulandı. Sonucu gözden geçirin, ardından "Kaydet ve indir".');
      toast('Şablon uygulandı');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      busy(false);
    }
  });

  $('btnSave').addEventListener('click', async () => {
    if (!state.file) return;
    busy(true);
    try {
      const { file } = await apiApply(state.file, collectEdits());
      const insp = await apiInspect(file);
      state.file = file;
      render(insp);
      download(file);
      toast('Dosya indirildi');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      busy(false);
    }
  });

  $('btnReset').addEventListener('click', () => {
    if (state.original) loadFile(state.original);
  });
  $('btnNew').addEventListener('click', () => {
    state.file = state.original = state.insp = null;
    $('workspace').classList.add('hidden');
    $('dropzone').classList.remove('compact');
    $('fileInput').value = '';
  });

  $('coreAdd').addEventListener('change', (e) => {
    const k = e.target.value;
    if (!k) return;
    const isDate = k.startsWith('dcterms:') || k === 'cp:lastPrinted';
    $('coreRows').querySelector('p.muted')?.remove();
    $('coreRows').append(propRow({ key: k, label: CORE_LABELS[k], value: isDate ? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') : '', isDate, added: true }));
    refreshAddSelects();
  });
  $('appAdd').addEventListener('change', (e) => {
    const k = e.target.value;
    if (!k) return;
    $('appRows').querySelector('p.muted')?.remove();
    $('appRows').append(propRow({ key: k, label: APP_LABELS[k], value: '', added: true }));
    refreshAddSelects();
  });
  $('customAdd').addEventListener('click', () => {
    $('customRows').querySelector('p.empty')?.remove();
    $('customRows').append(customRow());
    state.customDirty = true;
  });

  // Sürükle-bırak
  const dz = $('dropzone');
  $('browseBtn').addEventListener('click', (e) => { e.stopPropagation(); $('fileInput').click(); });
  dz.addEventListener('click', () => $('fileInput').click());
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') $('fileInput').click(); });
  $('fileInput').addEventListener('change', (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); });

  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
  window.addEventListener('dragleave', (e) => { e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('dragging');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  // Kullanıcı adı: yerel depodan / sunucudan
  (async () => {
    try {
      const saved = localStorage.getItem('mdr-username');
      const cfg = await (await fetch('/api/config')).json();
      $('userName').value = saved || cfg.defaultName || '';
      $('userName').placeholder = cfg.defaultName || 'Ad';
    } catch { /* yoksay */ }
  })();
  $('userName').addEventListener('input', () => {
    try { localStorage.setItem('mdr-username', $('userName').value); } catch { /* yoksay */ }
  });
})();
