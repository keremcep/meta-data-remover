// Server-side translations. Default language is English.
export const DEFAULT_LANG = 'en';
export const LANGS = ['en', 'tr'];

const dict = {
  en: {
    'reason.knownDefault': 'Known generator default value',
    'reason.nonOffice': 'Non-Microsoft Office application',
    'reason.ai': 'AI marker',
    'reason.tool': 'Generator / tool trace',

    'where.core': 'Core property',
    'where.app': 'App property',
    'where.custom': 'Custom property',
    'where.authors': 'Author (comments / revisions)',

    'error.noFile': 'No file was uploaded',
    'error.notOffice': 'The file is not a ZIP-based Office document (docx / xlsx / pptx).',
    'error.unsupported': 'Unsupported file',
    'error.inspect': 'Inspection failed: {msg}',
    'error.apply': 'Apply failed: {msg}',
    'defaultUser': 'User',

    'note.author': 'Author and last modified by: "{name}"',
    'note.removed': '{key} removed ({reason}: "{match}")',
    'note.removedShort': '{key} removed ({reason})',
    'note.revision': 'Revision number: {value}',
    'note.created': 'Created date: {value}',
    'note.modified': 'Last modified date: {value}',
    'note.application': 'Application: {app} 16.0000',
    'note.stats': 'Document statistics computed ({words} words, {chars} characters)',
    'note.totalTime': 'Total editing time: {value} min',
    'note.customRemoved': '{n} suspicious custom propert{plural} removed',
    'note.authorsRenamed': '{n} author name{plural} changed to "{name}"',
    'note.complexWarn': 'Warning: complex field {key} should be checked manually ("{match}")',
  },
  tr: {
    'reason.knownDefault': 'Bilinen üretici varsayılan değeri',
    'reason.nonOffice': 'Microsoft Office dışı uygulama',
    'reason.ai': 'Yapay zeka işareti',
    'reason.tool': 'Otomatik üretici / araç izi',

    'where.core': 'Temel özellik',
    'where.app': 'Uygulama özelliği',
    'where.custom': 'Özel özellik',
    'where.authors': 'Yazar (yorum / değişiklik)',

    'error.noFile': 'Dosya gönderilmedi',
    'error.notOffice': 'Dosya ZIP tabanlı bir Office belgesi (docx / xlsx / pptx) değil.',
    'error.unsupported': 'Desteklenmeyen dosya',
    'error.inspect': 'İnceleme başarısız: {msg}',
    'error.apply': 'Uygulama başarısız: {msg}',
    'defaultUser': 'Kullanıcı',

    'note.author': 'Yazar ve son değiştiren: "{name}"',
    'note.removed': '{key} kaldırıldı ({reason}: "{match}")',
    'note.removedShort': '{key} kaldırıldı ({reason})',
    'note.revision': 'Revizyon numarası: {value}',
    'note.created': 'Oluşturma tarihi: {value}',
    'note.modified': 'Son değiştirme tarihi: {value}',
    'note.application': 'Uygulama: {app} 16.0000',
    'note.stats': 'Belge istatistikleri hesaplandı ({words} sözcük, {chars} karakter)',
    'note.totalTime': 'Toplam düzenleme süresi: {value} dk',
    'note.customRemoved': '{n} şüpheli özel özellik kaldırıldı',
    'note.authorsRenamed': '{n} yazar adı "{name}" olarak değiştirildi',
    'note.complexWarn': 'Uyarı: {key} karmaşık alanı elle kontrol edilmeli ("{match}")',
  },
};

export function normalizeLang(lang) {
  return LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

export function t(lang, key, params = {}) {
  const l = normalizeLang(lang);
  let s = dict[l][key] ?? dict[DEFAULT_LANG][key] ?? key;
  if (params.n !== undefined && params.plural === undefined) {
    params = { ...params, plural: l === 'en' ? (params.n === 1 ? (key.includes('custom') ? 'y' : '') : (key.includes('custom') ? 'ies' : 's')) : '' };
  }
  for (const [k, v] of Object.entries(params)) s = s.split('{' + k + '}').join(String(v));
  return s;
}
