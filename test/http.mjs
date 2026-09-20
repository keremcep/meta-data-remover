// Çalışan sunucuya karşı HTTP testi: node test/http.mjs  (sunucu 3000 portunda olmalı)
import { readFileSync, writeFileSync } from 'node:fs';

const base = process.env.BASE || 'http://localhost:3000';
const buf = readFileSync(new URL('./out/fake-ai.docx', import.meta.url));
const file = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

const cfg = await (await fetch(base + '/api/config')).json();
console.log('config:', cfg);

let fd = new FormData();
fd.append('file', file, 'fake-ai.docx');
const insp = await (await fetch(base + '/api/inspect', { method: 'POST', body: fd })).json();
console.log('inspect: type=%s flags=%d authors=%s', insp.fileType, insp.flags.length, insp.authors.map((a) => a.name).join('|'));

fd = new FormData();
fd.append('file', file, 'fake-ai.docx');
fd.append('edits', JSON.stringify({ core: { 'dc:subject': 'HTTP testi' } }));
fd.append('template', '1');
fd.append('name', 'Kerem Test');
const r = await fetch(base + '/api/apply', { method: 'POST', body: fd });
console.log('apply status:', r.status, 'content-type:', r.headers.get('content-type'));
const notes = JSON.parse(decodeURIComponent(r.headers.get('x-notes') || '[]'));
console.log('notes:', notes.length, '->', notes[0]);
const out = Buffer.from(await r.arrayBuffer());
writeFileSync(new URL('./out/via-http.docx', import.meta.url), out);

fd = new FormData();
fd.append('file', new Blob([out]), 'via-http.docx');
const insp2 = await (await fetch(base + '/api/inspect', { method: 'POST', body: fd })).json();
const core = Object.fromEntries(insp2.core.items.map((i) => [i.key, i.value]));
console.log('after: flags=%d creator=%s subject=%s app=%s', insp2.flags.length, core['dc:creator'], core['dc:subject'],
  insp2.app.items.find((i) => i.key === 'Application')?.value);
if (insp2.flags.length !== 0 || core['dc:creator'] !== 'Kerem Test' || core['dc:subject'] !== 'HTTP testi') {
  console.error('HTTP TESTİ BAŞARISIZ');
  process.exit(1);
}
// desteklenmeyen dosya
fd = new FormData();
fd.append('file', new Blob([Buffer.from('merhaba')]), 'a.txt');
const bad = await (await fetch(base + '/api/inspect', { method: 'POST', body: fd })).json();
console.log('unsupported:', bad.supported, bad.reason);
console.log('HTTP TESTİ GEÇTİ');
