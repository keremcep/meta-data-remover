// OOXML (docx / xlsx / pptx) metadata okuma ve yazma
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { flagValue, scanText } from './detect.js';

export const NS = {
  cp: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  dcmitype: 'http://purl.org/dc/dcmitype/',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  ep: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
  vt: 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
  cust: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  w15: 'http://schemas.microsoft.com/office/word/2012/wordml',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
};

const NS_TO_PREFIX = Object.fromEntries(Object.entries(NS).map(([p, u]) => [u, p]));

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

// Word'ün core.xml içinde yazdığı sıra
export const CORE_KEYS = [
  'dc:title', 'dc:subject', 'dc:creator', 'cp:keywords', 'dc:description',
  'cp:lastModifiedBy', 'cp:revision', 'cp:lastPrinted', 'dcterms:created',
  'dcterms:modified', 'cp:category', 'cp:contentStatus', 'dc:identifier',
  'dc:language', 'cp:version', 'cp:contentType',
];

// Word'ün app.xml içinde yazdığı sıra
export const APP_KEYS = [
  'Template', 'TotalTime', 'Pages', 'Words', 'Characters', 'PresentationFormat',
  'Application', 'DocSecurity', 'Lines', 'Paragraphs', 'Slides', 'Notes',
  'HiddenSlides', 'MMClips', 'ScaleCrop', 'HeadingPairs', 'TitlesOfParts',
  'Company', 'LinksUpToDate', 'CharactersWithSpaces', 'SharedDoc',
  'HyperlinksChanged', 'AppVersion', 'Manager', 'HyperlinkBase', 'HLinks',
];

const APP_COMPLEX = new Set(['HeadingPairs', 'TitlesOfParts', 'HLinks']);

const CONTENT_TYPES = {
  core: 'application/vnd.openxmlformats-package.core-properties+xml',
  app: 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
  custom: 'application/vnd.openxmlformats-officedocument.custom-properties+xml',
};
const REL_TYPES = {
  core: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
  app: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties',
  custom: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties',
  thumbnail: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail',
};

const EMPTY_CORE = XML_DECL +
  '<cp:coreProperties xmlns:cp="' + NS.cp + '" xmlns:dc="' + NS.dc + '" xmlns:dcterms="' + NS.dcterms +
  '" xmlns:dcmitype="' + NS.dcmitype + '" xmlns:xsi="' + NS.xsi + '"></cp:coreProperties>';
const EMPTY_APP = XML_DECL +
  '<Properties xmlns="' + NS.ep + '" xmlns:vt="' + NS.vt + '"></Properties>';
const EMPTY_CUSTOM = XML_DECL +
  '<Properties xmlns="' + NS.cust + '" xmlns:vt="' + NS.vt + '"></Properties>';

// ---------- yardımcılar ----------

function parseXml(str) {
  return new DOMParser({ onError: () => {} }).parseFromString(str, 'application/xml');
}

function serialize(doc) {
  let s = new XMLSerializer().serializeToString(doc);
  if (!s.startsWith('<?xml')) s = XML_DECL + s;
  return s;
}

function elementChildren(node) {
  const out = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes[i];
    if (c.nodeType === 1) out.push(c);
  }
  return out;
}

function canonicalKey(el) {
  const p = NS_TO_PREFIX[el.namespaceURI];
  if (p === 'ep' || p === 'cust') return el.localName;
  if (p) return p + ':' + el.localName;
  return el.nodeName;
}

function setText(doc, el, value) {
  while (el.firstChild) el.removeChild(el.firstChild);
  el.appendChild(doc.createTextNode(String(value)));
}

function innerXml(el) {
  const ser = new XMLSerializer();
  return elementChildren(el).map((c) => ser.serializeToString(c)).join('');
}

function ensureNs(root, prefix, uri) {
  if (root.getAttribute('xmlns:' + prefix) !== uri) root.setAttribute('xmlns:' + prefix, uri);
}

function findByKey(root, key, defaultNs) {
  const [pfx, local] = key.includes(':') ? key.split(':') : [null, key];
  const uri = pfx ? NS[pfx] : defaultNs;
  const list = root.getElementsByTagNameNS(uri, local);
  return list.length ? list[0] : null;
}

function insertOrdered(root, el, key, order) {
  const idx = order.indexOf(key);
  if (idx === -1) { root.appendChild(el); return; }
  for (const sib of elementChildren(root)) {
    const i = order.indexOf(canonicalKey(sib));
    if (i > idx) { root.insertBefore(el, sib); return; }
  }
  root.appendChild(el);
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

export function detectType(zip) {
  if (zip.file('word/document.xml')) return 'docx';
  if (zip.file('xl/workbook.xml')) return 'xlsx';
  if (zip.file('ppt/presentation.xml')) return 'pptx';
  return null;
}

export async function openZip(buffer) {
  try {
    return await JSZip.loadAsync(buffer);
  } catch {
    return null;
  }
}

// ---------- okuma ----------

async function readCore(zip) {
  const f = zip.file('docProps/core.xml');
  if (!f) return { exists: false, items: [] };
  const doc = parseXml(await f.async('string'));
  const items = elementChildren(doc.documentElement).map((el) => {
    const key = canonicalKey(el);
    const value = el.textContent ?? '';
    return {
      key, value, flag: flagValue(value, key),
      isDate: key.startsWith('dcterms:') || key === 'cp:lastPrinted',
    };
  });
  return { exists: true, items };
}

async function readApp(zip) {
  const f = zip.file('docProps/app.xml');
  if (!f) return { exists: false, items: [] };
  const doc = parseXml(await f.async('string'));
  const items = elementChildren(doc.documentElement).map((el) => {
    const key = canonicalKey(el);
    const complex = APP_COMPLEX.has(key) || elementChildren(el).length > 0;
    const value = complex ? innerXml(el) : (el.textContent ?? '');
    return { key, value, complex, flag: flagValue(value, key) };
  });
  return { exists: true, items };
}

async function readCustom(zip) {
  const f = zip.file('docProps/custom.xml');
  if (!f) return { exists: false, items: [] };
  const doc = parseXml(await f.async('string'));
  const items = [];
  for (const prop of elementChildren(doc.documentElement)) {
    if (prop.localName !== 'property') continue;
    const name = prop.getAttribute('name') || '';
    const valEl = elementChildren(prop)[0];
    const type = valEl ? valEl.localName : 'lpwstr';
    const value = valEl ? (valEl.textContent ?? '') : '';
    items.push({ name, type, value, flag: flagValue(name) || flagValue(value) });
  }
  return { exists: true, items };
}

// Yazar bilgisi taşıyan konumlar (tür bazlı)
function authorSpecs(type) {
  if (type === 'docx') {
    return {
      parts: /^word\/.*\.xml$/,
      attrs: [
        { ns: NS.w, local: 'author' },
        { ns: NS.w15, local: 'author' },
      ],
      elements: [],
    };
  }
  if (type === 'xlsx') {
    return {
      parts: /^xl\/.*\.xml$/,
      attrs: [
        { ns: null, local: 'displayName', parent: 'person' },
        { ns: null, local: 'userName', parent: 'person' },
      ],
      elements: [{ local: 'author', parent: 'authors' }],
    };
  }
  return {
    parts: /^ppt\/.*\.xml$/,
    attrs: [
      { ns: null, local: 'name', parent: 'cmAuthor' },
      { ns: null, local: 'name', parent: 'author' },
      { ns: null, local: 'userId', parent: 'author' },
    ],
    elements: [],
  };
}

function attrMatches(spec, attr, el) {
  if (attr.localName !== spec.local) return false;
  if (spec.ns && attr.namespaceURI !== spec.ns) return false;
  if (spec.parent && el.localName !== spec.parent) return false;
  return true;
}

function walk(node, fn) {
  const stack = [node];
  while (stack.length) {
    const n = stack.pop();
    if (n.nodeType === 1) {
      fn(n);
      for (let i = n.childNodes.length - 1; i >= 0; i--) stack.push(n.childNodes[i]);
    }
  }
}

const AUTHOR_HINT = /author|person|displayName|userName|cmAuthor/i;

async function readAuthors(zip, type) {
  const spec = authorSpecs(type);
  const map = new Map();
  const add = (name, part) => {
    if (!name) return;
    const e = map.get(name) || { name, count: 0, parts: new Set(), flag: flagValue(name) };
    e.count++;
    e.parts.add(part);
    map.set(name, e);
  };
  for (const path of Object.keys(zip.files)) {
    if (!spec.parts.test(path)) continue;
    const raw = await zip.file(path).async('string');
    if (!AUTHOR_HINT.test(raw)) continue;
    const doc = parseXml(raw);
    walk(doc.documentElement, (el) => {
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        if (spec.attrs.some((s) => attrMatches(s, a, el))) add(a.value, path);
      }
      for (const s of spec.elements) {
        if (el.localName === s.local && (!s.parent || (el.parentNode && el.parentNode.localName === s.parent))) {
          add(el.textContent, path);
        }
      }
    });
  }
  return [...map.values()].map((e) => ({ ...e, parts: [...e.parts] }));
}

async function scanParts(zip) {
  const hits = [];
  for (const path of Object.keys(zip.files)) {
    if (!/\.(xml|rels)$/i.test(path)) continue;
    if (path.startsWith('docProps/')) continue;
    const raw = await zip.file(path).async('string');
    // yalnızca okunabilir metin: etiketleri kaldır
    const text = raw.replace(/<[^>]+>/g, ' ');
    for (const h of scanText(text, 10)) hits.push({ part: path, ...h });
    if (hits.length > 60) break;
  }
  return hits;
}

async function docxStats(zip) {
  const f = zip.file('word/document.xml');
  if (!f) return null;
  const raw = await f.async('string');
  const paras = raw.split(/<\/w:p>/);
  let words = 0, chars = 0, charsWithSpaces = 0, paragraphs = 0;
  for (const p of paras) {
    let text = '';
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/g;
    let m;
    while ((m = re.exec(p))) text += m[1] !== undefined ? decodeEntities(m[1]) : ' ';
    const t = text.trim();
    if (!t) continue;
    paragraphs++;
    words += t.split(/\s+/).filter(Boolean).length;
    charsWithSpaces += t.length;
    chars += t.replace(/\s/g, '').length;
  }
  return {
    words, chars, charsWithSpaces, paragraphs,
    lines: Math.max(1, Math.ceil(charsWithSpaces / 130)),
    pages: Math.max(1, Math.ceil(words / 450)),
  };
}

export async function inspect(zip, fileName, size) {
  const type = detectType(zip);
  const [core, app, custom] = await Promise.all([readCore(zip), readApp(zip), readCustom(zip)]);
  const authors = type ? await readAuthors(zip, type) : [];
  const scan = await scanParts(zip);
  const thumbnail = Object.keys(zip.files).find((p) => /^docProps\/thumbnail\./i.test(p)) || null;
  const entries = Object.values(zip.files)
    .filter((f) => !f.dir)
    .map((f) => ({ path: f.name, date: f.date ? f.date.toISOString() : null }));
  const stats = type === 'docx' ? await docxStats(zip) : null;

  const flags = [];
  for (const it of core.items) if (it.flag) flags.push({ where: 'Temel özellik', key: it.key, value: it.value, ...it.flag });
  for (const it of app.items) if (it.flag) flags.push({ where: 'Uygulama özelliği', key: it.key, value: it.value, ...it.flag });
  for (const it of custom.items) if (it.flag) flags.push({ where: 'Özel özellik', key: it.name, value: it.value, ...it.flag });
  for (const a of authors) if (a.flag) flags.push({ where: 'Yazar (yorum/değişiklik)', key: a.name, value: a.parts.join(', '), ...a.flag });

  return {
    fileName, size, fileType: type, supported: !!type,
    core, app, custom, authors, scan, thumbnail, entries, stats, flags,
  };
}

// ---------- yazma ----------

async function ensurePart(zip, kind) {
  const path = 'docProps/' + kind + '.xml';
  if (zip.file(path)) return;
  const tpl = kind === 'core' ? EMPTY_CORE : kind === 'app' ? EMPTY_APP : EMPTY_CUSTOM;
  zip.file(path, tpl);
  await registerPart(zip, kind, path);
}

async function registerPart(zip, kind, path) {
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    const doc = parseXml(await ctFile.async('string'));
    const root = doc.documentElement;
    const overrides = root.getElementsByTagNameNS(NS.ct, 'Override');
    let found = false;
    for (let i = 0; i < overrides.length; i++) if (overrides[i].getAttribute('PartName') === '/' + path) found = true;
    if (!found) {
      const o = doc.createElementNS(NS.ct, 'Override');
      o.setAttribute('PartName', '/' + path);
      o.setAttribute('ContentType', CONTENT_TYPES[kind]);
      root.appendChild(o);
      zip.file('[Content_Types].xml', serialize(doc));
    }
  }
  const relFile = zip.file('_rels/.rels');
  if (relFile) {
    const doc = parseXml(await relFile.async('string'));
    const root = doc.documentElement;
    const rels = root.getElementsByTagNameNS(NS.rel, 'Relationship');
    let found = false;
    const ids = new Set();
    for (let i = 0; i < rels.length; i++) {
      ids.add(rels[i].getAttribute('Id'));
      if (rels[i].getAttribute('Type') === REL_TYPES[kind]) found = true;
    }
    if (!found) {
      let n = rels.length + 1;
      while (ids.has('rId' + n)) n++;
      const r = doc.createElementNS(NS.rel, 'Relationship');
      r.setAttribute('Id', 'rId' + n);
      r.setAttribute('Type', REL_TYPES[kind]);
      r.setAttribute('Target', path);
      root.appendChild(r);
      zip.file('_rels/.rels', serialize(doc));
    }
  }
}

async function unregisterPart(zip, path, relType) {
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    const doc = parseXml(await ctFile.async('string'));
    const root = doc.documentElement;
    const overrides = root.getElementsByTagNameNS(NS.ct, 'Override');
    for (let i = overrides.length - 1; i >= 0; i--) {
      if (overrides[i].getAttribute('PartName') === '/' + path) root.removeChild(overrides[i]);
    }
    zip.file('[Content_Types].xml', serialize(doc));
  }
  const relFile = zip.file('_rels/.rels');
  if (relFile) {
    const doc = parseXml(await relFile.async('string'));
    const root = doc.documentElement;
    const rels = root.getElementsByTagNameNS(NS.rel, 'Relationship');
    for (let i = rels.length - 1; i >= 0; i--) {
      const t = (rels[i].getAttribute('Target') || '').replace(/^\//, '');
      if (t === path || rels[i].getAttribute('Type') === relType) root.removeChild(rels[i]);
    }
    zip.file('_rels/.rels', serialize(doc));
  }
}

export function normalizeDate(v) {
  const s = String(v).trim();
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function writeCore(zip, edits) {
  if (!edits || !Object.keys(edits).length) return;
  await ensurePart(zip, 'core');
  const doc = parseXml(await zip.file('docProps/core.xml').async('string'));
  const root = doc.documentElement;
  for (const [key, value] of Object.entries(edits)) {
    const [pfx, local] = key.split(':');
    if (!NS[pfx] || !local) continue;
    let el = findByKey(root, key, null);
    if (value === null || value === undefined) {
      if (el) root.removeChild(el);
      continue;
    }
    if (!el) {
      ensureNs(root, pfx, NS[pfx]);
      el = doc.createElementNS(NS[pfx], pfx + ':' + local);
      insertOrdered(root, el, key, CORE_KEYS);
    }
    if (pfx === 'dcterms') {
      ensureNs(root, 'xsi', NS.xsi);
      el.setAttributeNS(NS.xsi, 'xsi:type', 'dcterms:W3CDTF');
      setText(doc, el, normalizeDate(value));
    } else if (key === 'cp:lastPrinted') {
      setText(doc, el, normalizeDate(value));
    } else {
      setText(doc, el, value);
    }
  }
  zip.file('docProps/core.xml', serialize(doc));
}

async function writeApp(zip, edits, rawInserts = {}) {
  const hasEdits = edits && Object.keys(edits).length;
  const hasRaw = rawInserts && Object.keys(rawInserts).length;
  if (!hasEdits && !hasRaw) return;
  await ensurePart(zip, 'app');
  const doc = parseXml(await zip.file('docProps/app.xml').async('string'));
  const root = doc.documentElement;
  for (const [key, value] of Object.entries(edits || {})) {
    if (!/^[A-Za-z][\w.-]*$/.test(key)) continue;
    let el = findByKey(root, key, NS.ep);
    if (value === null || value === undefined) {
      if (el) root.removeChild(el);
      continue;
    }
    if (APP_COMPLEX.has(key)) continue; // karmaşık alanlar metin olarak düzenlenmez
    if (!el) {
      el = doc.createElementNS(NS.ep, key);
      insertOrdered(root, el, key, APP_KEYS);
    }
    setText(doc, el, value);
  }
  // Karmaşık alanlar için ham XML ekleme (yalnızca yoksa)
  for (const [key, xml] of Object.entries(rawInserts || {})) {
    if (findByKey(root, key, NS.ep)) continue;
    const frag = parseXml('<Properties xmlns="' + NS.ep + '" xmlns:vt="' + NS.vt + '">' + xml + '</Properties>');
    const el = elementChildren(frag.documentElement)[0];
    if (!el) continue;
    ensureNs(root, 'vt', NS.vt);
    const imported = doc.importNode(el, true);
    insertOrdered(root, imported, key, APP_KEYS);
  }
  zip.file('docProps/app.xml', serialize(doc));
}

async function writeCustom(zip, list) {
  if (!Array.isArray(list)) return;
  const path = 'docProps/custom.xml';
  const clean = list.filter((p) => p && p.name);
  if (!clean.length) {
    if (zip.file(path)) {
      zip.remove(path);
      await unregisterPart(zip, path, REL_TYPES.custom);
    }
    return;
  }
  await ensurePart(zip, 'custom');
  const doc = parseXml(EMPTY_CUSTOM);
  const root = doc.documentElement;
  let pid = 2;
  for (const p of clean) {
    const prop = doc.createElementNS(NS.cust, 'property');
    prop.setAttribute('fmtid', '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}');
    prop.setAttribute('pid', String(pid++));
    prop.setAttribute('name', p.name);
    const type = /^[a-z0-9]+$/i.test(p.type || '') ? p.type : 'lpwstr';
    const v = doc.createElementNS(NS.vt, 'vt:' + type);
    let val = p.value ?? '';
    if (type === 'filetime') val = normalizeDate(val);
    if (type === 'bool') val = /^(true|1|evet|yes)$/i.test(String(val)) ? 'true' : 'false';
    setText(doc, v, val);
    prop.appendChild(v);
    root.appendChild(prop);
  }
  zip.file(path, serialize(doc));
}

function initialsOf(name) {
  const ini = String(name).trim().split(/\s+/).map((w) => w[0] || '').join('').toUpperCase().slice(0, 3);
  return ini || 'K';
}

async function renameAuthors(zip, type, mapping) {
  if (!mapping || !Object.keys(mapping).length) return;
  const spec = authorSpecs(type);
  for (const path of Object.keys(zip.files)) {
    if (!spec.parts.test(path)) continue;
    const raw = await zip.file(path).async('string');
    if (!AUTHOR_HINT.test(raw)) continue;
    const doc = parseXml(raw);
    let changed = false;
    walk(doc.documentElement, (el) => {
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        if (spec.attrs.some((s) => attrMatches(s, a, el)) && mapping[a.value] !== undefined) {
          const newName = mapping[a.value];
          a.value = newName;
          changed = true;
          if (el.hasAttributeNS(NS.w, 'initials')) el.setAttributeNS(NS.w, 'w:initials', initialsOf(newName));
          if (el.hasAttribute('initials')) el.setAttribute('initials', initialsOf(newName));
          // Word people.xml: bulut hesabı yerine yerel hesap görünümü
          if (el.localName === 'person' && el.namespaceURI === NS.w15) {
            for (const child of elementChildren(el)) {
              if (child.localName === 'presenceInfo') {
                child.setAttributeNS(NS.w15, 'w15:providerId', 'None');
                child.setAttributeNS(NS.w15, 'w15:userId', newName);
              }
            }
          }
        }
      }
      for (const s of spec.elements) {
        if (el.localName === s.local && (!s.parent || (el.parentNode && el.parentNode.localName === s.parent))) {
          const cur = el.textContent;
          if (mapping[cur] !== undefined) { setText(doc, el, mapping[cur]); changed = true; }
        }
      }
    });
    if (changed) zip.file(path, serialize(doc));
  }
}

async function removeThumbnail(zip) {
  const path = Object.keys(zip.files).find((p) => /^docProps\/thumbnail\./i.test(p));
  if (!path) return;
  zip.remove(path);
  await unregisterPart(zip, path, REL_TYPES.thumbnail);
}

/**
 * edits: { core:{key:value|null}, app:{key:value|null}, appRaw:{key:xml}, custom:[...]|undefined,
 *          authors:{old:new}, removeThumbnail:bool }
 */
export async function applyEdits(zip, edits) {
  const type = detectType(zip);
  await writeCore(zip, edits.core);
  await writeApp(zip, edits.app, edits.appRaw || {});
  await writeCustom(zip, edits.custom);
  if (type) await renameAuthors(zip, type, edits.authors);
  if (edits.removeThumbnail) await removeThumbnail(zip);
}

export async function saveZip(zip) {
  // Word tüm zip girdilerini 1980-01-01 tarihiyle yazar; aynısını yap
  const epoch = new Date(Date.UTC(1980, 0, 1, 0, 0, 0)); // JSZip UTC bileşenlerini kullanır
  zip.forEach((_, file) => { file.date = epoch; });
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    platform: 'DOS',
  });
}
