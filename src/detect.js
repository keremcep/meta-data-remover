// Şüpheli (yapay zeka / otomatik üretici) işaret tespiti

const AI_PATTERNS = [
  [/chat\s?gpt/i, 'ai'],
  [/open\s?ai/i, 'ai'],
  [/\bgpt[-\s]?[0-9o]/i, 'ai'],
  [/\bgpt\b/i, 'ai'],
  [/\bclaude\b/i, 'ai'],
  [/anthropic/i, 'ai'],
  [/\bgemini\b/i, 'ai'],
  [/\bbard\b/i, 'ai'],
  [/copilot/i, 'ai'],
  [/\bllama\b/i, 'ai'],
  [/mistral/i, 'ai'],
  [/deepseek/i, 'ai'],
  [/perplexity/i, 'ai'],
  [/\bgrok\b/i, 'ai'],
  [/\bqwen\b/i, 'ai'],
  [/\bsonnet\b/i, 'ai'],
  [/\bopus\b/i, 'ai'],
  [/yapay\s?zek[aâ]/i, 'ai'],
  [/\bAI\b/, 'ai'],
  [/\bLLM\b/, 'ai'],
  [/language\s+model/i, 'ai'],
  [/\bassistant\b/i, 'ai'],
  [/\basistan/i, 'ai'],
  [/\bbot\b/i, 'ai'],
  // Otomatik belge üretici kütüphaneler / farklı ofis yazılımları
  [/python-docx/i, 'tool'],
  [/python-pptx/i, 'tool'],
  [/openpyxl/i, 'tool'],
  [/xlsxwriter/i, 'tool'],
  [/docx4j/i, 'tool'],
  [/docxtemplater/i, 'tool'],
  [/officegen/i, 'tool'],
  [/\bdocx\b.*\b(js|npm|node)\b/i, 'tool'],
  [/\bpandoc\b/i, 'tool'],
  [/aspose/i, 'tool'],
  [/open\s?xml\s?sdk/i, 'tool'],
  [/apache\s+poi/i, 'tool'],
  [/\bpoi\b/i, 'tool'],
  [/libreoffice/i, 'tool'],
  [/openoffice/i, 'tool'],
  [/google\s+(docs|sheets|slides)/i, 'tool'],
  [/\bwps\b/i, 'tool'],
  [/onlyoffice/i, 'tool'],
  [/node\.?js/i, 'tool'],
  [/\bnpm\b/i, 'tool'],
  [/phpword/i, 'tool'],
  [/\bsheetjs\b/i, 'tool'],
  [/\bexceljs\b/i, 'tool'],
  [/\bpptxgenjs\b/i, 'tool'],
  [/\bgotenberg\b/i, 'tool'],
  [/\bunoconv\b/i, 'tool'],
  [/\bpython\b/i, 'tool'],
  [/\bjava\b/i, 'tool'],
];

// Bilinen üretici varsayılan değerleri (ör. python-docx şablonu)
const KNOWN_DEFAULTS = [
  '2013-12-23T23:15:00Z',
  '2013-12-23T23:15:00.000Z',
  '1601-01-01T00:00:00Z',
];

const OFFICE_APPS = [
  /^Microsoft (Office )?Word$/i,
  /^Microsoft Macintosh Word$/i,
  /^Microsoft (Office )?Excel$/i,
  /^Microsoft Macintosh Excel$/i,
  /^Microsoft (Office )?PowerPoint$/i,
  /^Microsoft Macintosh PowerPoint$/i,
];

/**
 * Bir metin değerini inceler; şüpheli ise {kind, match} döner, değilse null.
 */
export function flagValue(value, key = '') {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;

  if (KNOWN_DEFAULTS.includes(s)) {
    return { kind: 'tool', match: s, reason: 'Bilinen üretici varsayılan değeri' };
  }

  if (key === 'Application' && !OFFICE_APPS.some((r) => r.test(s))) {
    return { kind: 'tool', match: s, reason: 'Microsoft Office dışı uygulama' };
  }

  for (const [re, kind] of AI_PATTERNS) {
    const m = s.match(re);
    if (m) {
      return { kind, match: m[0], reason: kind === 'ai' ? 'Yapay zeka işareti' : 'Otomatik üretici / araç izi' };
    }
  }
  return null;
}

/**
 * Ham metin içinde tüm eşleşmeleri bul (içerik taraması için).
 */
export function scanText(text, limit = 30) {
  const hits = [];
  for (const [re, kind] of AI_PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    while ((m = g.exec(text)) && hits.length < limit) {
      const start = Math.max(0, m.index - 40);
      const end = Math.min(text.length, m.index + m[0].length + 40);
      hits.push({
        kind,
        match: m[0],
        snippet: text.slice(start, end).replace(/\s+/g, ' '),
      });
      if (g.lastIndex === m.index) g.lastIndex++;
    }
    if (hits.length >= limit) break;
  }
  return hits;
}
