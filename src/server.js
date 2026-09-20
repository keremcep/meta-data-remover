import express from 'express';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openZip, inspect, applyEdits, saveZip } from './ooxml.js';
import { buildTemplateEdits } from './template.js';
import { t, normalizeLang } from './i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

app.use(express.static(path.join(__dirname, '..', 'public')));

const langOf = (req) => normalizeLang(req.body?.lang || req.query?.lang);

app.get('/api/config', (_req, res) => {
  let user = '';
  try { user = os.userInfo().username; } catch { /* ignore */ }
  res.json({ defaultName: user, hostname: os.hostname() });
});

app.post('/api/inspect', upload.single('file'), async (req, res) => {
  const lang = langOf(req);
  try {
    if (!req.file) return res.status(400).json({ error: t(lang, 'error.noFile') });
    const zip = await openZip(req.file.buffer);
    if (!zip) {
      return res.json({
        fileName: req.file.originalname, size: req.file.size, supported: false, fileType: null,
        reason: t(lang, 'error.notOffice'),
      });
    }
    res.json(await inspect(zip, req.file.originalname, req.file.size, lang));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: t(lang, 'error.inspect', { msg: err.message }) });
  }
});

app.post('/api/apply', upload.single('file'), async (req, res) => {
  const lang = langOf(req);
  try {
    if (!req.file) return res.status(400).json({ error: t(lang, 'error.noFile') });
    const zip = await openZip(req.file.buffer);
    if (!zip) return res.status(400).json({ error: t(lang, 'error.unsupported') });

    const userEdits = JSON.parse(req.body.edits || '{}');
    await applyEdits(zip, userEdits);

    let notes = [];
    if (req.body.template === '1') {
      const insp = await inspect(zip, req.file.originalname, req.file.size, lang);
      const result = buildTemplateEdits(insp, {
        name: req.body.name || t(lang, 'defaultUser'),
        lang,
        freshDates: req.body.freshDates === '1',
      });
      await applyEdits(zip, result.edits);
      notes = result.notes;
    }

    const buf = await saveZip(zip);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Notes', encodeURIComponent(JSON.stringify(notes)));
    res.setHeader('Access-Control-Expose-Headers', 'X-Notes');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: t(lang, 'error.apply', { msg: err.message }) });
  }
});

// multer / generic error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Error' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  Meta Data Remover is running:');
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop');
});
