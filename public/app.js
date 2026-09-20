/* Document Metadata Tool - client */
(() => {
  'use strict';

  const { t, label } = window.I18N;

  const CORE_KEYS = [
    'dc:title', 'dc:subject', 'dc:creator', 'cp:keywords', 'dc:description',
    'cp:lastModifiedBy', 'cp:revision', 'cp:lastPrinted', 'dcterms:created',
    'dcterms:modified', 'cp:category', 'cp:contentStatus', 'dc:identifier',
    'dc:language', 'cp:version', 'cp:contentType',
  ];
  const APP_KEYS = [
    'Template', 'TotalTime', 'Pages', 'Words', 'Characters', 'PresentationFormat',
    'Application', 'DocSecurity', 'Lines', 'Paragraphs', 'Slides', 'Notes',
    'HiddenSlides', 'MMClips', 'ScaleCrop', 'HeadingPairs', 'TitlesOfParts',
    'Company', 'LinksUpToDate', 'CharactersWithSpaces', 'SharedDoc',
    'HyperlinksChanged', 'AppVersion', 'Manager', 'HyperlinkBase', 'HLinks',
  ];
  const COMPLEX = new Set(['HeadingPairs', 'TitlesOfParts', 'HLinks']);
  const CUSTOM_TYPES = ['lpwstr', 'i4', 'r8', 'bool', 'filetime'];

  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children) if (c !== null && c !== undefined) n.append(c);
    return n;
  };

  const state = { file: null, original: null, insp: null, customDirty: false, lastNotes: null };

  // ---------- helpers ----------
  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }
  function toast(msg, kind = 'info') {
    const node = $('toast');
    node.textContent = msg;
    node.className = 'toast ' + kind;
    clearTimeout(toast._h);
    toast._h = setTimeout(() => node.classList.add('hidden'), 3500);
  }
  function busy(on) {
    document.body.classList.toggle('busy', on);
    for (const b of document.querySelectorAll('.actions button')) b.disabled = on;
  }
  function flagBadge(flag) {
    if (!flag) return null;
    return el('span', { class: 'flag ' + flag.kind, title: (flag.reason || '') + ': "' + flag.match + '"' },
      flag.kind === 'ai' ? t('flag.ai') : t('flag.tool'));
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
    fd.append('lang', window.I18N.lang);
    const r = await fetch('/api/inspect', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || t('err.inspect'));
    return j;
  }
  async function apiApply(file, edits, opts = {}) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('edits', JSON.stringify(edits));
    fd.append('lang', window.I18N.lang);
    if (opts.template) {
      fd.append('template', '1');
      fd.append('name', $('userName').value || '');
      fd.append('freshDates', $('freshDates').checked ? '1' : '0');
    }
    const r = await fetch('/api/apply', { method: 'POST', body: fd });
    if (!r.ok) {
      let msg = t('err.apply');
      try { msg = (await r.json()).error || msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
    const blob = await r.blob();
    let notes = [];
    try { notes = JSON.parse(decodeURIComponent(r.headers.get('X-Notes') || '[]')); } catch { /* ignore */ }
    return { file: new File([blob], file.name, { type: file.type }), notes };
  }

  // ---------- row builders ----------
  function propRow({ key, labelText, value, flag, isDate, complex, added }) {
    const row = el('div', { class: 'row', 'data-key': key, 'data-original': added ? '' : value, 'data-added': added ? '1' : '' });
    if (added) row.classList.add('added');
    const head = el('div', { class: 'row-head' },
      el('span', { class: 'row-label', text: labelText || key, 'data-removed': t('row.removedSuffix'), 'data-new': t('row.newSuffix') }),
      el('code', { class: 'row-key', text: key }),
      flagBadge(flag),
    );
    let control;
    if (complex) {
      control = el('textarea', { class: 'input mono', readonly: true, rows: 2 }, value);
      control.title = t('row.complex');
    } else if (isDate) {
      const wrap = el('div', { class: 'date-wrap' });
      const dt = el('input', { class: 'input', type: 'datetime-local', step: '1', value: isoToLocal(value) });
      const iso = el('input', { class: 'input mono iso', type: 'text', value: value, placeholder: 'YYYY-MM-DDTHH:MM:SSZ' });
      dt.addEventListener('input', () => { if (dt.value) iso.value = localToIso(dt.value); });
      iso.addEventListener('input', () => { dt.value = isoToLocal(iso.value); });
      const nowBtn = el('button', { class: 'btn btn-sm', type: 'button', text: t('row.now'), onclick: () => {
        const n = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        iso.value = n; dt.value = isoToLocal(n);
      } });
      wrap.append(dt, iso, nowBtn);
      control = wrap;
      row.dataset.date = '1';
    } else {
      control = el('input', { class: 'input', type: 'text', value: value ?? '' });
    }
    const del = el('button', { class: 'icon-btn', type: 'button', title: t('row.remove'), text: '🗑' });
    del.addEventListener('click', () => {
      if (row.dataset.added) { row.remove(); refreshAddSelects(); return; }
      row.classList.toggle('removed');
      const removed = row.classList.contains('removed');
      del.textContent = removed ? '↺' : '🗑';
      del.title = removed ? t('row.undo') : t('row.remove');
    });
    row.append(head, el('div', { class: 'row-ctl' }, control, del));
    return row;
  }

  function rowValue(row) {
    if (row.dataset.date) return row.querySelector('input.iso').value.trim();
    const inp = row.querySelector('input.input, textarea.input');
    return inp ? inp.value : '';
  }

  function customRow(p = { name: '', type: 'lpwstr', value: '' }, flag = null) {
    const row = el('div', { class: 'row custom' });
    const name = el('input', { class: 'input', type: 'text', placeholder: t('row.name'), value: p.name });
    const type = el('select', { class: 'input select' });
    for (const ty of CUSTOM_TYPES) type.append(el('option', { value: ty, text: ty, selected: ty === p.type }));
    if (!CUSTOM_TYPES.includes(p.type)) type.append(el('option', { value: p.type, text: p.type, selected: true }));
    const value = el('input', { class: 'input', type: 'text', placeholder: t('row.value'), value: p.value });
    const del = el('button', { class: 'icon-btn', type: 'button', title: t('row.remove'), text: '🗑', onclick: () => { row.remove(); state.customDirty = true; } });
    for (const i of [name, type, value]) i.addEventListener('input', () => { state.customDirty = true; });
    row.append(
      el('div', { class: 'row-head' }, el('span', { class: 'row-label', text: t('row.custom') }), flagBadge(flag)),
      el('div', { class: 'row-ctl custom-grid' }, name, type, value, del),
    );
    return row;
  }

  function authorRow(a) {
    const row = el('div', { class: 'row', 'data-author': a.name });
    row.append(
      el('div', { class: 'row-head' },
        el('span', { class: 'row-label', text: a.name }),
        el('span', { class: 'muted small', text: t('row.places', { n: a.count, parts: a.parts.map((p) => p.replace(/^.*\//, '')).join(', ') }) }),
        flagBadge(a.flag),
      ),
      el('div', { class: 'row-ctl' },
        el('span', { class: 'arrow', text: '→' }),
        el('input', { class: 'input', type: 'text', value: a.name, placeholder: t('row.newName') }),
        el('button', { class: 'btn btn-sm', type: 'button', text: t('row.useUserName'), onclick: (e) => {
          e.currentTarget.parentElement.querySelector('input').value = $('userName').value;
        } }),
      ),
    );
    return row;
  }

  // ---------- render ----------
  function refreshAddSelects() {
    const fill = (sel, keys, group, rowsEl) => {
      const present = new Set([...rowsEl.querySelectorAll('.row')].map((r) => r.dataset.key));
      sel.innerHTML = '';
      sel.append(el('option', { value: '', text: t('card.addField') }));
      for (const k of keys) if (!present.has(k)) sel.append(el('option', { value: k, text: label(group, k) + '  (' + k + ')' }));
    };
    fill($('coreAdd'), CORE_KEYS, 'core', $('coreRows'));
    fill($('appAdd'), APP_KEYS.filter((k) => !COMPLEX.has(k)), 'app', $('appRows'));
  }

  function render(insp) {
    state.insp = insp;
    state.customDirty = false;
    $('workspace').classList.remove('hidden');
    $('dropzone').classList.add('compact');

    $('fileBadge').textContent = (insp.fileType || 'file').toUpperCase();
    $('fileName').textContent = insp.fileName;
    $('fileMeta').textContent = fmtSize(insp.size) + (insp.entries ? ' · ' + t('other.partsCount', { n: insp.entries.length }) : '');

    const notice = $('notice');
    notice.classList.add('hidden');
    if (!insp.supported) {
      notice.className = 'notice error';
      notice.textContent = insp.reason || t('err.unsupported');
      $('flagsBanner').classList.add('hidden');
      for (const id of ['coreRows', 'appRows', 'customRows', 'authorRows', 'otherRows']) $(id).innerHTML = '';
      return;
    }

    // Suspicious markers
    const fb = $('flagsBanner');
    fb.innerHTML = '';
    fb.classList.remove('hidden');
    if (insp.flags.length) {
      fb.className = 'flags';
      fb.append(el('strong', { text: t('flags.found', { n: insp.flags.length }) }));
      const ul = el('ul');
      for (const f of insp.flags) {
        ul.append(el('li', {}, el('b', { text: f.where + ' · ' + f.key + ': ' }), el('span', { text: `"${f.match}" (${f.reason})` })));
      }
      fb.append(ul, el('p', { class: 'small', text: t('flags.hint') }));
    } else {
      fb.className = 'flags clean';
      fb.append(el('strong', { text: t('flags.clean') }), el('span', { class: 'small', text: t('flags.cleanHint') }));
    }

    // Core
    const cr = $('coreRows');
    cr.innerHTML = '';
    if (!insp.core.exists) cr.append(el('p', { class: 'muted', text: t('empty.core') }));
    for (const it of insp.core.items) cr.append(propRow({ key: it.key, labelText: label('core', it.key), value: it.value, flag: it.flag, isDate: it.isDate }));

    // App
    const ar = $('appRows');
    ar.innerHTML = '';
    if (!insp.app.exists) ar.append(el('p', { class: 'muted', text: t('empty.app') }));
    for (const it of insp.app.items) ar.append(propRow({ key: it.key, labelText: label('app', it.key), value: it.value, flag: it.flag, complex: it.complex }));

    // Custom
    const cu = $('customRows');
    cu.innerHTML = '';
    if (!insp.custom.items.length) cu.append(el('p', { class: 'muted empty', text: t('empty.custom') }));
    for (const p of insp.custom.items) cu.append(customRow(p, p.flag));

    // Authors
    const au = $('authorRows');
    au.innerHTML = '';
    if (!insp.authors.length) au.append(el('p', { class: 'muted', text: t('empty.authors') }));
    for (const a of insp.authors) au.append(authorRow(a));

    // Other
    const ot = $('otherRows');
    ot.innerHTML = '';
    const thumb = el('label', { class: 'check' },
      el('input', { id: 'removeThumb', type: 'checkbox', disabled: !insp.thumbnail }),
      el('span', { text: insp.thumbnail ? t('other.thumbRemove', { path: insp.thumbnail }) : t('other.thumbNone') }));
    ot.append(el('div', { class: 'row' }, el('div', { class: 'row-head' }, el('span', { class: 'row-label', text: t('other.thumb') })), thumb));

    if (insp.stats) {
      ot.append(el('div', { class: 'row' },
        el('div', { class: 'row-head' }, el('span', { class: 'row-label', text: t('other.stats') })),
        el('div', { class: 'muted small', text: t('other.statsLine', insp.stats) }),
      ));
    }

    const scanRow = el('div', { class: 'row' });
    scanRow.append(el('div', { class: 'row-head' }, el('span', { class: 'row-label', text: t('other.scan', { n: insp.scan.length }) }),
      el('span', { class: 'muted small', text: t('other.scanHint') })));
    if (insp.scan.length) {
      const det = el('details', {}, el('summary', { text: t('other.scanShow') }));
      const ul = el('ul', { class: 'scan' });
      for (const h of insp.scan) ul.append(el('li', {}, el('code', { text: h.part }), ' ', flagBadge(h), ' ', el('span', { class: 'snippet', text: '…' + h.snippet + '…' })));
      det.append(ul);
      scanRow.append(det);
    }
    ot.append(scanRow);

    const entries = el('details', {}, el('summary', { text: t('other.parts', { n: insp.entries.length }) }));
    const ul = el('ul', { class: 'entries mono small' });
    for (const e of insp.entries) ul.append(el('li', { text: `${e.path}  ${e.date ? '· ' + e.date.slice(0, 10) : ''}` }));
    entries.append(ul, el('p', { class: 'muted small', text: t('other.partsHint') }));
    ot.append(el('div', { class: 'row' }, entries));

    refreshAddSelects();
  }

  // ---------- collect edits ----------
  function collectEdits() {
    const edits = { core: {}, app: {}, authors: {} };
    const gather = (rowsEl, target) => {
      for (const row of rowsEl.querySelectorAll('.row[data-key]')) {
        const key = row.dataset.key;
        if (row.classList.contains('removed')) { target[key] = null; continue; }
        if (row.querySelector('textarea[readonly]')) continue; // complex field
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

  // ---------- events ----------
  async function loadFile(file, { keepOriginal = false } = {}) {
    busy(true);
    try {
      const insp = await apiInspect(file);
      state.file = file;
      if (!keepOriginal) state.original = file;
      state.lastNotes = null;
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
      for (const txt of notes) ul.append(el('li', { text: txt }));
      n.append(ul);
    }
  }

  $('btnTemplate').addEventListener('click', async () => {
    if (!state.file) return;
    if (!$('userName').value.trim()) { toast(t('toast.needName'), 'error'); $('userName').focus(); return; }
    busy(true);
    try {
      const { file, notes } = await apiApply(state.file, collectEdits(), { template: true });
      const insp = await apiInspect(file);
      state.file = file;
      render(insp);
      state.lastNotes = notes;
      showNotes(notes, t('notice.template'));
      toast(t('toast.template'));
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
      toast(t('toast.saved'));
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
    $('coreRows').append(propRow({ key: k, labelText: label('core', k), value: isDate ? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') : '', isDate, added: true }));
    refreshAddSelects();
  });
  $('appAdd').addEventListener('change', (e) => {
    const k = e.target.value;
    if (!k) return;
    $('appRows').querySelector('p.muted')?.remove();
    $('appRows').append(propRow({ key: k, labelText: label('app', k), value: '', added: true }));
    refreshAddSelects();
  });
  $('customAdd').addEventListener('click', () => {
    $('customRows').querySelector('p.empty')?.remove();
    $('customRows').append(customRow());
    state.customDirty = true;
  });

  // Drag & drop
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

  // Language switcher
  const langSel = $('langSelect');
  for (const [code, name] of Object.entries(window.I18N.LANGS)) langSel.append(el('option', { value: code, text: name, selected: code === window.I18N.lang }));
  langSel.addEventListener('change', async () => {
    window.I18N.setLang(langSel.value);
    refreshAddSelects();
    if (state.file) {
      // Re-inspect so server-side texts (flag reasons, locations) come back in the new language
      busy(true);
      try {
        const insp = await apiInspect(state.file);
        render(insp);
        if (state.lastNotes) showNotes(state.lastNotes, t('notice.template'));
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        busy(false);
      }
    }
  });
  window.I18N.applyStatic();

  // User name: from local storage / server
  (async () => {
    try {
      const saved = localStorage.getItem('mdr-username');
      const cfg = await (await fetch('/api/config')).json();
      $('userName').value = saved || cfg.defaultName || '';
      if (cfg.defaultName) $('userName').placeholder = cfg.defaultName;
    } catch { /* ignore */ }
  })();
  $('userName').addEventListener('input', () => {
    try { localStorage.setItem('mdr-username', $('userName').value); } catch { /* ignore */ }
  });
})();
