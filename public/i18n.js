/* Client-side translations. Default language: English. */
window.I18N = (() => {
  const DEFAULT = 'en';
  const LANGS = { en: 'English', tr: 'Türkçe' };

  const dict = {
    en: {
      'app.title': 'Document Metadata Tool',
      'app.subtitle': 'View, edit and clean every piece of metadata in Word, Excel and PowerPoint files.',
      'top.userName': 'User name',
      'top.userName.ph': 'Name shown in the document',
      'top.language': 'Language',

      'dz.title': 'Drag a document here or',
      'dz.browse': 'browse',
      'dz.sub': '.docx, .xlsx and .pptx are supported. Files never leave your computer; everything runs on the local server.',

      'act.freshDates': 'Refresh dates too',
      'act.template': '✦ Apply personal computer template',
      'act.template.title': 'Remove AI / tool traces and make the document look like an ordinary Office user wrote it',
      'act.save': 'Save & download',
      'act.reset': 'Revert to original',
      'act.new': 'Another file',

      'card.core': 'Core properties',
      'card.app': 'App properties',
      'card.custom': 'Custom properties',
      'card.authors': 'Authors',
      'card.authors.sub': 'comments, tracked changes, people',
      'card.other': 'Other',
      'card.addField': '+ Add field…',
      'card.addProp': '+ Add property',

      'flags.found': '{n} suspicious marker{s} found',
      'flags.hint': 'The template button clears all of them automatically; you can also edit each field below.',
      'flags.clean': 'No suspicious markers found.',
      'flags.cleanHint': ' You can still review every field below.',
      'flag.ai': 'AI trace',
      'flag.tool': 'Tool trace',

      'row.remove': 'Remove field',
      'row.undo': 'Undo',
      'row.removedSuffix': ' (will be removed)',
      'row.newSuffix': ' (new)',
      'row.now': 'Now',
      'row.complex': 'Complex field: display only. Use the trash icon to remove it.',
      'row.custom': 'Custom property',
      'row.name': 'Name',
      'row.value': 'Value',
      'row.newName': 'New name',
      'row.useUserName': 'Use user name',
      'row.places': '{n} occurrence{s} · {parts}',

      'empty.core': 'core.xml is missing. It will be created when you add a field.',
      'empty.app': 'app.xml is missing. It will be created when you add a field.',
      'empty.custom': 'No custom properties.',
      'empty.authors': 'No comments, tracked changes or people records found.',

      'other.thumb': 'Thumbnail',
      'other.thumbRemove': 'Remove thumbnail ({path})',
      'other.thumbNone': 'No thumbnail',
      'other.stats': 'Statistics computed from document content',
      'other.statsLine': '{words} words · {chars} characters (no spaces) · {charsWithSpaces} characters (with spaces) · {paragraphs} paragraphs · ~{pages} pages · ~{lines} lines',
      'other.scan': 'Content scan ({n} matches)',
      'other.scanHint': 'AI / tool keywords found in document text and XML parts. Informational only; content is not modified.',
      'other.scanShow': 'Show matches',
      'other.parts': 'Package parts ({n})',
      'other.partsHint': 'On save every part date is set to 1980-01-01, exactly like Word does.',
      'other.partsCount': '{n} package parts',

      'notice.template': 'Template applied. Review the result, then click "Save & download".',
      'toast.needName': 'Enter a user name first.',
      'toast.template': 'Template applied',
      'toast.saved': 'File downloaded',
      'err.inspect': 'Inspection error',
      'err.apply': 'Apply error',
      'err.unsupported': 'This file type is not supported.',
    },
    tr: {
      'app.title': 'Belge Metadata Aracı',
      'app.subtitle': 'Word, Excel ve PowerPoint belgelerinin tüm metadata\'sını görüntüle, düzenle, temizle.',
      'top.userName': 'Kullanıcı adı',
      'top.userName.ph': 'Belgede görünecek ad',
      'top.language': 'Dil',

      'dz.title': 'Belgeyi buraya sürükleyin veya',
      'dz.browse': 'seçin',
      'dz.sub': '.docx, .xlsx ve .pptx desteklenir. Dosya bilgisayarınızdan çıkmaz; yerel sunucuda işlenir.',

      'act.freshDates': 'Tarihleri de yenile',
      'act.template': '✦ Kişisel bilgisayar şablonunu uygula',
      'act.template.title': 'Yapay zeka / araç izlerini temizle, sıradan bir Office kullanıcısı gibi göster',
      'act.save': 'Kaydet ve indir',
      'act.reset': 'Orijinale dön',
      'act.new': 'Başka dosya',

      'card.core': 'Temel özellikler',
      'card.app': 'Uygulama özellikleri',
      'card.custom': 'Özel özellikler',
      'card.authors': 'Yazarlar',
      'card.authors.sub': 'yorumlar, değişiklik izleme, kişiler',
      'card.other': 'Diğer',
      'card.addField': '+ Alan ekle…',
      'card.addProp': '+ Özellik ekle',

      'flags.found': '{n} şüpheli işaret bulundu',
      'flags.hint': 'Şablon butonu bunların hepsini otomatik temizler; dilerseniz aşağıdan tek tek de düzenleyebilirsiniz.',
      'flags.clean': 'Şüpheli işaret bulunmadı.',
      'flags.cleanHint': ' Yine de tüm alanları aşağıdan gözden geçirebilirsiniz.',
      'flag.ai': 'AI izi',
      'flag.tool': 'Araç izi',

      'row.remove': 'Alanı kaldır',
      'row.undo': 'Geri al',
      'row.removedSuffix': ' (kaldırılacak)',
      'row.newSuffix': ' (yeni)',
      'row.now': 'Şimdi',
      'row.complex': 'Karmaşık alan: yalnızca görüntülenir. Kaldırmak için çöp kutusunu kullanın.',
      'row.custom': 'Özel özellik',
      'row.name': 'Ad',
      'row.value': 'Değer',
      'row.newName': 'Yeni ad',
      'row.useUserName': 'Kullanıcı adı yap',
      'row.places': '{n} yerde · {parts}',

      'empty.core': 'core.xml yok. Alan eklediğinizde oluşturulur.',
      'empty.app': 'app.xml yok. Alan eklediğinizde oluşturulur.',
      'empty.custom': 'Özel özellik yok.',
      'empty.authors': 'Yorum, değişiklik izleme veya kişi kaydı bulunmadı.',

      'other.thumb': 'Küçük resim',
      'other.thumbRemove': 'Küçük resmi kaldır ({path})',
      'other.thumbNone': 'Küçük resim yok',
      'other.stats': 'Belge içeriğinden hesaplanan istatistik',
      'other.statsLine': '{words} sözcük · {chars} karakter (boşluksuz) · {charsWithSpaces} karakter (boşluklu) · {paragraphs} paragraf · ~{pages} sayfa · ~{lines} satır',
      'other.scan': 'İçerik taraması ({n} eşleşme)',
      'other.scanHint': 'Belge metni ve XML parçalarında geçen AI / araç anahtar sözcükleri. Bilgi amaçlı; içerik değiştirilmez.',
      'other.scanShow': 'Eşleşmeleri göster',
      'other.parts': 'Paket parçaları ({n})',
      'other.partsHint': 'Kaydederken tüm parça tarihleri Word gibi 1980-01-01 yapılır.',
      'other.partsCount': '{n} paket parçası',

      'notice.template': 'Şablon uygulandı. Sonucu gözden geçirin, ardından "Kaydet ve indir".',
      'toast.needName': 'Önce kullanıcı adını girin.',
      'toast.template': 'Şablon uygulandı',
      'toast.saved': 'Dosya indirildi',
      'err.inspect': 'İnceleme hatası',
      'err.apply': 'Uygulama hatası',
      'err.unsupported': 'Bu dosya türü desteklenmiyor.',
    },
  };

  const labels = {
    en: {
      core: {
        'dc:title': 'Title', 'dc:subject': 'Subject', 'dc:creator': 'Author (creator)',
        'cp:keywords': 'Tags / keywords', 'dc:description': 'Description / comments',
        'cp:lastModifiedBy': 'Last modified by', 'cp:revision': 'Revision number',
        'cp:lastPrinted': 'Last printed', 'dcterms:created': 'Created',
        'dcterms:modified': 'Last modified', 'cp:category': 'Category',
        'cp:contentStatus': 'Content status', 'dc:identifier': 'Identifier',
        'dc:language': 'Language', 'cp:version': 'Version', 'cp:contentType': 'Content type',
      },
      app: {
        Template: 'Template', TotalTime: 'Total editing time (min)', Pages: 'Pages',
        Words: 'Words', Characters: 'Characters (no spaces)', PresentationFormat: 'Presentation format',
        Application: 'Application', DocSecurity: 'Document security', Lines: 'Lines',
        Paragraphs: 'Paragraphs', Slides: 'Slides', Notes: 'Notes',
        HiddenSlides: 'Hidden slides', MMClips: 'Multimedia clips', ScaleCrop: 'Scale crop thumbnail',
        HeadingPairs: 'Heading pairs', TitlesOfParts: 'Titles of parts', Company: 'Company',
        LinksUpToDate: 'Links up to date', CharactersWithSpaces: 'Characters (with spaces)',
        SharedDoc: 'Shared document', HyperlinksChanged: 'Hyperlinks changed',
        AppVersion: 'Application version', Manager: 'Manager', HyperlinkBase: 'Hyperlink base', HLinks: 'Hyperlinks',
      },
    },
    tr: {
      core: {
        'dc:title': 'Başlık', 'dc:subject': 'Konu', 'dc:creator': 'Yazar (oluşturan)',
        'cp:keywords': 'Etiketler', 'dc:description': 'Açıklama / Yorumlar',
        'cp:lastModifiedBy': 'Son değiştiren', 'cp:revision': 'Revizyon numarası',
        'cp:lastPrinted': 'Son yazdırma', 'dcterms:created': 'Oluşturma tarihi',
        'dcterms:modified': 'Son değiştirme tarihi', 'cp:category': 'Kategori',
        'cp:contentStatus': 'İçerik durumu', 'dc:identifier': 'Tanımlayıcı',
        'dc:language': 'Dil', 'cp:version': 'Sürüm', 'cp:contentType': 'İçerik türü',
      },
      app: {
        Template: 'Şablon', TotalTime: 'Toplam düzenleme süresi (dk)', Pages: 'Sayfa sayısı',
        Words: 'Sözcük sayısı', Characters: 'Karakter (boşluksuz)', PresentationFormat: 'Sunu biçimi',
        Application: 'Uygulama', DocSecurity: 'Belge güvenliği', Lines: 'Satır sayısı',
        Paragraphs: 'Paragraf sayısı', Slides: 'Slayt sayısı', Notes: 'Not sayısı',
        HiddenSlides: 'Gizli slayt', MMClips: 'Multimedya klip', ScaleCrop: 'Küçük resim ölçekle',
        HeadingPairs: 'Başlık çiftleri', TitlesOfParts: 'Bölüm başlıkları', Company: 'Şirket',
        LinksUpToDate: 'Bağlantılar güncel', CharactersWithSpaces: 'Karakter (boşluklu)',
        SharedDoc: 'Paylaşılan belge', HyperlinksChanged: 'Köprüler değişti',
        AppVersion: 'Uygulama sürümü', Manager: 'Yönetici', HyperlinkBase: 'Köprü tabanı', HLinks: 'Köprüler',
      },
    },
  };

  let lang = DEFAULT;
  try {
    const saved = localStorage.getItem('mdr-lang');
    if (saved && dict[saved]) lang = saved;
  } catch { /* ignore */ }

  function t(key, params = {}) {
    let s = dict[lang][key] ?? dict[DEFAULT][key] ?? key;
    if (params.n !== undefined && params.s === undefined) params = { ...params, s: lang === 'en' && params.n !== 1 ? 's' : '' };
    for (const [k, v] of Object.entries(params)) s = s.split('{' + k + '}').join(String(v));
    return s;
  }

  function label(group, key) {
    return labels[lang][group][key] || labels[DEFAULT][group][key] || key;
  }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = t('app.title');
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const node of document.querySelectorAll('[data-i18n-ph]')) node.placeholder = t(node.dataset.i18nPh);
    for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
  }

  function setLang(l) {
    if (!dict[l]) return;
    lang = l;
    try { localStorage.setItem('mdr-lang', l); } catch { /* ignore */ }
    applyStatic();
  }

  return { t, label, applyStatic, setLang, get lang() { return lang; }, LANGS };
})();
