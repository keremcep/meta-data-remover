// Basit uçtan uca test: python-docx / ChatGPT izli bir docx üret, incele, şablon uygula, doğrula.
import JSZip from 'jszip';
import { writeFileSync, mkdirSync } from 'node:fs';
import { openZip, inspect, applyEdits, saveZip } from '../src/ooxml.js';
import { buildTemplateEdits } from '../src/template.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const W15 = 'http://schemas.microsoft.com/office/word/2012/wordml';

function makeFakeDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
<Override PartName="/word/people.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.people+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>
</Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
</Relationships>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}"><w:body>
<w:p><w:r><w:t>Bu belge ChatGPT tarafından hazırlanan bir taslaktır.</w:t></w:r></w:p>
<w:p><w:ins w:id="1" w:author="ChatGPT" w:date="2025-01-01T00:00:00Z"><w:r><w:t>Eklenen cümle burada &amp; devamı.</w:t></w:r></w:ins></w:p>
<w:p><w:r><w:t xml:space="preserve">Üçüncü paragraf, biraz daha uzun bir metin içeriyor ki sözcük sayısı anlamlı olsun.</w:t></w:r></w:p>
</w:body></w:document>`);
  zip.file('word/comments.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="${W}"><w:comment w:id="0" w:author="OpenAI Assistant" w:initials="OA" w:date="2025-01-01T00:00:00Z"><w:p><w:r><w:t>yorum</w:t></w:r></w:p></w:comment></w:comments>`);
  zip.file('word/people.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w15:people xmlns:w15="${W15}"><w15:person w15:author="OpenAI Assistant"><w15:presenceInfo w15:providerId="AD" w15:userId="S::bot@openai.com::123"/></w15:person></w15:people>`);
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Ödev</dc:title><dc:creator>python-docx</dc:creator><cp:lastModifiedBy>ChatGPT</cp:lastModifiedBy>
<cp:keywords>ai generated, gpt-4</cp:keywords><cp:revision>1</cp:revision>
<dcterms:created xsi:type="dcterms:W3CDTF">2013-12-23T23:15:00Z</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">2013-12-23T23:15:00Z</dcterms:modified>
</cp:coreProperties>`);
  zip.file('docProps/custom.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="Generator"><vt:lpwstr>OpenAI ChatGPT</vt:lpwstr></property>
<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="Ders"><vt:lpwstr>Tarih</vt:lpwstr></property>
</Properties>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

const fail = (m) => { console.error('HATA:', m); process.exitCode = 1; };
const assert = (c, m) => { if (!c) fail(m); else console.log('ok -', m); };

const buf = await makeFakeDocx();
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/fake-ai.docx', import.meta.url), buf);

let zip = await openZip(buf);
let insp = await inspect(zip, 'fake-ai.docx', buf.length);
console.log('Tür:', insp.fileType, '| Bayrak sayısı:', insp.flags.length);
for (const f of insp.flags) console.log('  •', f.where, f.key, '->', f.match);
assert(insp.fileType === 'docx', 'docx algılandı');
assert(insp.flags.length >= 6, 'şüpheli işaretler bulundu');
assert(insp.authors.map((a) => a.name).sort().join(',') === 'ChatGPT,OpenAI Assistant', 'yazarlar toplandı');
assert(!insp.app.exists, 'app.xml eksik olarak raporlandı');
assert(insp.stats && insp.stats.words > 10, 'istatistik hesaplandı: ' + JSON.stringify(insp.stats));

const { edits, notes } = buildTemplateEdits(insp, { name: 'Kerem' });
console.log('Şablon notları:'); for (const n of notes) console.log('  -', n);
await applyEdits(zip, edits);
const out = await saveZip(zip);
writeFileSync(new URL('./out/fake-ai.cleaned.docx', import.meta.url), out);

zip = await openZip(out);
insp = await inspect(zip, 'cleaned.docx', out.length);
const core = Object.fromEntries(insp.core.items.map((i) => [i.key, i.value]));
const app = Object.fromEntries(insp.app.items.map((i) => [i.key, i.value]));
console.log('core:', core);
console.log('app:', app);
assert(insp.flags.length === 0, 'temizlik sonrası bayrak kalmadı');
assert(core['dc:creator'] === 'Kerem' && core['cp:lastModifiedBy'] === 'Kerem', 'yazar değişti');
assert(core['dc:title'] === 'Ödev', 'masum başlık korundu');
assert(!('cp:keywords' in core), 'AI etiketleri kaldırıldı');
assert(core['dcterms:created'] !== '2013-12-23T23:15:00Z', 'üretici varsayılan tarihi değişti');
assert(new Date(core['dcterms:modified']) >= new Date(core['dcterms:created']), 'tarih sırası tutarlı');
assert(app.Application === 'Microsoft Office Word' && app.AppVersion === '16.0000' && app.Template === 'Normal.dotm', 'app.xml oluşturuldu');
assert(app.Words && Number(app.Words) > 10, 'Words yazıldı');
assert(insp.app.items.some((i) => i.key === 'HeadingPairs' && i.complex), 'HeadingPairs eklendi');
assert(insp.authors.length === 1 && insp.authors[0].name === 'Kerem', 'tüm yazarlar Kerem oldu');
assert(insp.custom.items.length === 1 && insp.custom.items[0].name === 'Ders', 'şüpheli özel özellik atıldı, masum kaldı');

const ct = await zip.file('[Content_Types].xml').async('string');
const rels = await zip.file('_rels/.rels').async('string');
assert(ct.includes('/docProps/app.xml'), 'app.xml Content_Types kaydı');
assert(rels.includes('extended-properties'), 'app.xml ilişki kaydı');
const people = await zip.file('word/people.xml').async('string');
assert(people.includes('w15:providerId="None"') && people.includes('w15:userId="Kerem"'), 'people.xml yerel hesap');
const comments = await zip.file('word/comments.xml').async('string');
assert(comments.includes('w:initials="K"'), 'baş harfler güncellendi');
assert(zip.files['word/document.xml'].date.getFullYear() === 1980, 'zip tarihleri 1980');
console.log(await zip.file('docProps/core.xml').async('string'));
console.log(await zip.file('docProps/app.xml').async('string'));

// Kullanıcı düzenlemesi: alan silme + özel liste boşaltma + author yeniden adlandırma
await applyEdits(zip, { core: { 'dc:title': null, 'dc:subject': 'Yeni Konu' }, custom: [], authors: { Kerem: 'Ayşe Yılmaz' } });
const out2 = await saveZip(zip);
zip = await openZip(out2);
insp = await inspect(zip, 'x.docx', out2.length);
const core2 = Object.fromEntries(insp.core.items.map((i) => [i.key, i.value]));
assert(!('dc:title' in core2) && core2['dc:subject'] === 'Yeni Konu', 'silme ve ekleme çalıştı');
assert(!zip.file('docProps/custom.xml') && !(await zip.file('[Content_Types].xml').async('string')).includes('custom.xml'), 'custom.xml tamamen kaldırıldı');
assert(insp.authors[0].name === 'Ayşe Yılmaz', 'yazar yeniden adlandırıldı');
assert((await zip.file('word/comments.xml').async('string')).includes('w:initials="AY"'), 'baş harfler AY');
console.log(process.exitCode ? 'BAŞARISIZ' : 'TÜM TESTLER GEÇTİ');
