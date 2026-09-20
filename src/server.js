import express from 'express';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openZip, inspect, applyEdits, saveZip } from './ooxml.js';
import { buildTemplateEdits } from './template.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/config', (_req, res) => {
  let user = 'Kullanıcı';
  try { user = os.userInfo().username; } catch { /* yoksay */ }
  res.json({ defaultName: user, hostname: os.hostname() });
});

app.post('/api/inspect', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya gönderilmedi' });
    const zip = await openZip(req.file.buffer);
    if (!zip) {
      return res.json({
        fileName: req.file.originalname, size: req.file.size, supported: false, fileType: null,
        reason: 'Dosya ZIP tabanlı bir Office belgesi (docx/xlsx/pptx) değil.',
      });
    }
    res.json(await inspect(zip, req.file.originalname, req.file.size));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'İnceleme başarısız: ' + err.message });
  }
});

app.post('/api/apply', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya gönderilmedi' });
    const zip = await openZip(req.file.buffer);
    if (!zip) return res.status(400).json({ error: 'Desteklenmeyen dosya' });

    const userEdits = JSON.parse(req.body.edits || '{}');
    await applyEdits(zip, userEdits);

    let notes = [];
    if (req.body.template === '1') {
      const insp = await inspect(zip, req.file.originalname, req.file.size);
      const t = buildTemplateEdits(insp, {
        name: req.body.name || 'Kullanıcı',
        freshDates: req.body.freshDates === '1',
      });
      await applyEdits(zip, t.edits);
      notes = t.notes;
    }

    const buf = await saveZip(zip);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Notes', encodeURIComponent(JSON.stringify(notes)));
    res.setHeader('Access-Control-Expose-Headers', 'X-Notes');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Uygulama başarısız: ' + err.message });
  }
});

// multer / genel hata yakalayıcı
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Hata' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  Metadata Aracı çalışıyor:');
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log('');
  console.log('  Durdurmak için Ctrl+C');
});
