// "Kişisel bilgisayar" şablonu: yapay zeka / araç izlerini temizleyip
// belgeyi sıradan bir Microsoft Office kullanıcısı yazmış gibi gösteren metadata seti üretir.
import { normalizeDate } from './ooxml.js';

const APP_NAME = { docx: 'Microsoft Office Word', xlsx: 'Microsoft Excel', pptx: 'Microsoft Office PowerPoint' };

const DEFAULT_HEADING_PAIRS =
  '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Title</vt:lpstr></vt:variant>' +
  '<vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>';
const DEFAULT_TITLES_OF_PARTS =
  '<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr></vt:lpstr></vt:vector></TitlesOfParts>';

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
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * @param {object} inspection  inspect() çıktısı
 * @param {object} opts        { name, now?, keepDates? }
 * @returns edits nesnesi (applyEdits ile uyumlu) ve yapılan değişikliklerin listesi
 */
export function buildTemplateEdits(inspection, opts) {
  const name = (opts.name || 'Kullanıcı').trim();
  const now = opts.now ? new Date(opts.now) : new Date();
  const type = inspection.fileType;
  const notes = [];
  const core = {};
  const app = {};
  const appRaw = {};

  // --- Temel özellikler ---
  core['dc:creator'] = name;
  core['cp:lastModifiedBy'] = name;
  notes.push(`Yazar ve son değiştiren: "${name}"`);

  for (const key of ['dc:title', 'dc:subject', 'dc:description', 'cp:keywords', 'cp:category', 'cp:contentStatus', 'dc:identifier', 'dc:language', 'cp:version', 'cp:contentType']) {
    const it = findCore(inspection, key);
    if (it && it.flag) {
      core[key] = null;
      notes.push(`${key} kaldırıldı (${it.flag.reason}: "${it.flag.match}")`);
    }
  }
  // Word'e ait olmayan bilinmeyen temel alanları da temizle
  for (const it of inspection.core.items) {
    if (it.flag && core[it.key] === undefined) {
      core[it.key] = null;
      notes.push(`${it.key} kaldırıldı (${it.flag.reason})`);
    }
  }

  const rev = findCore(inspection, 'cp:revision');
  const revNum = rev ? parseInt(rev.value, 10) : NaN;
  if (!rev || isNaN(revNum) || revNum < 2 || rev.flag) {
    core['cp:revision'] = String(rnd(2, 14));
    notes.push(`Revizyon numarası: ${core['cp:revision']}`);
  }

  core['cp:lastPrinted'] = null;

  // Tarihler
  const created = findCore(inspection, 'dcterms:created');
  let createdDate = created && !created.flag ? validDate(created.value) : null;
  if (createdDate && createdDate.getTime() > now.getTime()) createdDate = null;
  if (!createdDate || opts.freshDates) {
    createdDate = new Date(now.getTime() - rnd(1, 6) * 86400000 - rnd(1, 9) * 3600000 - rnd(0, 59) * 60000);
    core['dcterms:created'] = normalizeDate(createdDate.toISOString());
    notes.push(`Oluşturma tarihi: ${core['dcterms:created']}`);
  }
  let modifiedDate = new Date(now.getTime() - rnd(2, 40) * 60000);
  if (modifiedDate.getTime() <= createdDate.getTime()) modifiedDate = new Date(createdDate.getTime() + rnd(20, 180) * 60000);
  core['dcterms:modified'] = normalizeDate(modifiedDate.toISOString());
  notes.push(`Son değiştirme tarihi: ${core['dcterms:modified']}`);

  // --- Uygulama özellikleri ---
  app['Application'] = APP_NAME[type] || 'Microsoft Office Word';
  app['AppVersion'] = '16.0000';
  app['DocSecurity'] = '0';
  app['Company'] = '';
  app['Manager'] = null;
  app['ScaleCrop'] = 'false';
  app['LinksUpToDate'] = 'false';
  app['SharedDoc'] = 'false';
  app['HyperlinksChanged'] = 'false';
  notes.push(`Uygulama: ${app['Application']} 16.0000`);

  if (type === 'docx') {
    app['Template'] = 'Normal.dotm';
    const st = inspection.stats;
    const has = (k) => {
      const it = findApp(inspection, k);
      return it && /^\d+$/.test(it.value) && parseInt(it.value, 10) > 0;
    };
    if (st) {
      if (!has('Pages')) app['Pages'] = String(st.pages);
      if (!has('Words')) app['Words'] = String(st.words);
      if (!has('Characters')) app['Characters'] = String(st.chars);
      if (!has('CharactersWithSpaces')) app['CharactersWithSpaces'] = String(st.charsWithSpaces);
      if (!has('Lines')) app['Lines'] = String(st.lines);
      if (!has('Paragraphs')) app['Paragraphs'] = String(st.paragraphs);
      if (Object.keys(app).some((k) => ['Pages', 'Words', 'Characters'].includes(k))) {
        notes.push(`Belge istatistikleri hesaplandı (${st.words} sözcük, ${st.chars} karakter)`);
      }
    }
    if (!findApp(inspection, 'HeadingPairs')) appRaw['HeadingPairs'] = DEFAULT_HEADING_PAIRS;
    if (!findApp(inspection, 'TitlesOfParts')) appRaw['TitlesOfParts'] = DEFAULT_TITLES_OF_PARTS;
  }

  const tt = findApp(inspection, 'TotalTime');
  const ttNum = tt ? parseInt(tt.value, 10) : NaN;
  if (!tt || isNaN(ttNum) || ttNum <= 0) {
    app['TotalTime'] = String(rnd(14, 210));
    notes.push(`Toplam düzenleme süresi: ${app['TotalTime']} dk`);
  }

  // Şüpheli diğer uygulama alanlarını temizle
  for (const it of inspection.app.items) {
    if (it.flag && app[it.key] === undefined && !it.complex) {
      app[it.key] = null;
      notes.push(`${it.key} kaldırıldı (${it.flag.reason})`);
    }
  }

  // --- Özel özellikler: şüphelileri at ---
  let custom;
  if (inspection.custom.exists) {
    custom = inspection.custom.items
      .filter((p) => !p.flag)
      .map(({ name: n, type: t, value }) => ({ name: n, type: t, value }));
    const removed = inspection.custom.items.length - custom.length;
    if (removed) notes.push(`${removed} şüpheli özel özellik kaldırıldı`);
  }

  // --- Yazarlar (yorum / değişiklik izleme) ---
  const authors = {};
  for (const a of inspection.authors) {
    if (a.name !== name) authors[a.name] = name;
  }
  if (Object.keys(authors).length) notes.push(`${Object.keys(authors).length} yazar adı "${name}" olarak değiştirildi`);

  // Flag'li değerlerin hepsinin ele alındığını doğrula
  for (const f of inspection.flags) {
    if (f.where === 'Uygulama özelliği' && findApp(inspection, f.key)?.complex) {
      notes.push(`Uyarı: ${f.key} karmaşık alanı elle kontrol edilmeli ("${f.match}")`);
    }
  }

  return { edits: { core, app, appRaw, custom, authors }, notes };
}
