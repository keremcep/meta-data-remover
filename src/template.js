// "Personal computer" template: strips AI / generator traces and produces a
// consistent metadata set that looks like an ordinary Microsoft Office user wrote the document.
import { normalizeDate } from './ooxml.js';
import { t, DEFAULT_LANG } from './i18n.js';

const APP_NAME = { docx: 'Microsoft Office Word', xlsx: 'Microsoft Excel', pptx: 'Microsoft Office PowerPoint' };

const DEFAULT_HEADING_PAIRS =
  '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Title</vt:lpstr></vt:variant>' +
  '<vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>';
const DEFAULT_TITLES_OF_PARTS =
  '<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr></vt:lpstr></vt:vector></TitlesOfParts>';

const CLEANABLE_CORE = [
  'dc:title', 'dc:subject', 'dc:description', 'cp:keywords', 'cp:category',
  'cp:contentStatus', 'dc:identifier', 'dc:language', 'cp:version', 'cp:contentType',
];

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function findCore(inspection, key) {
  return inspection.core.items.find((i) => i.key === key);
}
function findApp(inspection, key) {
  return inspection.app.items.find((i) => i.key === key);
}
function validDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * @param {object} inspection  output of inspect()
 * @param {object} opts        { name, lang?, now?, freshDates? }
 * @returns {{ edits: object, notes: string[] }}  edits are compatible with applyEdits()
 */
export function buildTemplateEdits(inspection, opts) {
  const lang = opts.lang || DEFAULT_LANG;
  const tr = (key, params) => t(lang, key, params);
  const reason = (flag) => t(lang, flag.reasonKey);
  const name = (opts.name || tr('defaultUser')).trim();
  const now = opts.now ? new Date(opts.now) : new Date();
  const type = inspection.fileType;
  const notes = [];
  const core = {};
  const app = {};
  const appRaw = {};

  // --- Core properties ---
  core['dc:creator'] = name;
  core['cp:lastModifiedBy'] = name;
  notes.push(tr('note.author', { name }));

  for (const key of CLEANABLE_CORE) {
    const it = findCore(inspection, key);
    if (it && it.flag) {
      core[key] = null;
      notes.push(tr('note.removed', { key, reason: reason(it.flag), match: it.flag.match }));
    }
  }
  // Any other flagged core field
  for (const it of inspection.core.items) {
    if (it.flag && core[it.key] === undefined) {
      core[it.key] = null;
      notes.push(tr('note.removedShort', { key: it.key, reason: reason(it.flag) }));
    }
  }

  const rev = findCore(inspection, 'cp:revision');
  const revNum = rev ? parseInt(rev.value, 10) : NaN;
  if (!rev || isNaN(revNum) || revNum < 2 || rev.flag) {
    core['cp:revision'] = String(rnd(2, 14));
    notes.push(tr('note.revision', { value: core['cp:revision'] }));
  }

  core['cp:lastPrinted'] = null;

  // Dates
  const created = findCore(inspection, 'dcterms:created');
  let createdDate = created && !created.flag ? validDate(created.value) : null;
  if (createdDate && createdDate.getTime() > now.getTime()) createdDate = null;
  if (!createdDate || opts.freshDates) {
    createdDate = new Date(now.getTime() - rnd(1, 6) * 86400000 - rnd(1, 9) * 3600000 - rnd(0, 59) * 60000);
    core['dcterms:created'] = normalizeDate(createdDate.toISOString());
    notes.push(tr('note.created', { value: core['dcterms:created'] }));
  }
  let modifiedDate = new Date(now.getTime() - rnd(2, 40) * 60000);
  if (modifiedDate.getTime() <= createdDate.getTime()) modifiedDate = new Date(createdDate.getTime() + rnd(20, 180) * 60000);
  core['dcterms:modified'] = normalizeDate(modifiedDate.toISOString());
  notes.push(tr('note.modified', { value: core['dcterms:modified'] }));

  // --- App properties ---
  app['Application'] = APP_NAME[type] || 'Microsoft Office Word';
  app['AppVersion'] = '16.0000';
  app['DocSecurity'] = '0';
  app['Company'] = '';
  app['Manager'] = null;
  app['ScaleCrop'] = 'false';
  app['LinksUpToDate'] = 'false';
  app['SharedDoc'] = 'false';
  app['HyperlinksChanged'] = 'false';
  notes.push(tr('note.application', { app: app['Application'] }));

  if (type === 'docx') {
    app['Template'] = 'Normal.dotm';
    const st = inspection.stats;
    const has = (k) => {
      const it = findApp(inspection, k);
      return it && /^\d+$/.test(it.value) && parseInt(it.value, 10) > 0;
    };
    if (st) {
      let computed = false;
      const put = (k, v) => { if (!has(k)) { app[k] = String(v); computed = true; } };
      put('Pages', st.pages);
      put('Words', st.words);
      put('Characters', st.chars);
      put('CharactersWithSpaces', st.charsWithSpaces);
      put('Lines', st.lines);
      put('Paragraphs', st.paragraphs);
      if (computed) notes.push(tr('note.stats', { words: st.words, chars: st.chars }));
    }
    if (!findApp(inspection, 'HeadingPairs')) appRaw['HeadingPairs'] = DEFAULT_HEADING_PAIRS;
    if (!findApp(inspection, 'TitlesOfParts')) appRaw['TitlesOfParts'] = DEFAULT_TITLES_OF_PARTS;
  }

  const tt = findApp(inspection, 'TotalTime');
  const ttNum = tt ? parseInt(tt.value, 10) : NaN;
  if (!tt || isNaN(ttNum) || ttNum <= 0) {
    app['TotalTime'] = String(rnd(14, 210));
    notes.push(tr('note.totalTime', { value: app['TotalTime'] }));
  }

  // Remove any other flagged simple app field
  for (const it of inspection.app.items) {
    if (it.flag && app[it.key] === undefined && !it.complex) {
      app[it.key] = null;
      notes.push(tr('note.removedShort', { key: it.key, reason: reason(it.flag) }));
    }
  }

  // --- Custom properties: drop flagged ones ---
  let custom;
  if (inspection.custom.exists) {
    custom = inspection.custom.items
      .filter((p) => !p.flag)
      .map(({ name: n, type: ty, value }) => ({ name: n, type: ty, value }));
    const removed = inspection.custom.items.length - custom.length;
    if (removed) notes.push(tr('note.customRemoved', { n: removed }));
  }

  // --- Authors (comments / tracked changes / people) ---
  const authors = {};
  for (const a of inspection.authors) {
    if (a.name !== name) authors[a.name] = name;
  }
  const renamed = Object.keys(authors).length;
  if (renamed) notes.push(tr('note.authorsRenamed', { n: renamed, name }));

  // Complex flagged app fields need a manual look
  for (const it of inspection.app.items) {
    if (it.flag && it.complex) notes.push(tr('note.complexWarn', { key: it.key, match: it.flag.match }));
  }

  return { edits: { core, app, appRaw, custom, authors }, notes };
}
