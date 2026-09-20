# Meta Data Remover

Office belgelerinin (`.docx`, `.xlsx`, `.pptx`) içindeki **tüm metadata'yı** yerel bir web arayüzünde görüntüleyen, düzenleyen ve tek tıkla temizleyen araç. Tamamen bilgisayarınızda çalışır; dosyalar hiçbir sunucuya gönderilmez.

![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

## Özellikler

- **Sürükle-bırak yükleme** ve anında inceleme
- **Eksiksiz metadata görünümü**: temel özellikler (`core.xml`), uygulama özellikleri (`app.xml`), özel özellikler (`custom.xml`), yorum / değişiklik izleme yazarları, küçük resim ve paket parçaları
- **Alan bazlı düzenleme**: her değeri değiştirin, silin veya eksik standart alanları ekleyin; tarihler için takvim ve ISO girişi
- **Şüpheli işaret tespiti**: yapay zeka araçlarına (ChatGPT, Claude, Gemini, Copilot…) ve otomatik belge üreticilere (python-docx, pandoc, LibreOffice…) ait izler vurgulanır
- **"Kişisel bilgisayar" şablonu**: tek tıkla tüm izleri temizler ve belgeyi sıradan bir Microsoft Office kullanıcısı oluşturmuş gibi tutarlı metadata ile yeniden yazar
- **Yazar yönetimi**: yorum ve değişiklik izleme yazarlarını toplu yeniden adlandırma (baş harfler ve `people.xml` dahil)
- **Güvenli çıktı**: belge içeriğine dokunulmaz, yalnızca metadata parçaları yeniden yazılır; zip parça tarihleri Word ile aynı şekilde normalize edilir

## Kurulum

Node.js 20 veya üzeri gerekir.

```bash
git clone https://github.com/keremcep/meta-data-remover.git
cd meta-data-remover
npm install
npm start
```

Konsolda görünen adresi tarayıcıda açın:

```
  ➜  http://localhost:3000
```

Farklı bir port için `PORT=4000 npm start` kullanın.

## Kullanım

1. Belgeyi sayfaya sürükleyin veya **seçin** bağlantısıyla dosya seçin.
2. Üstteki özet kutusu bulunan şüpheli işaretleri listeler.
3. Kartlardaki alanları düzenleyin. Çöp kutusu alanı kaldırır, **Alan ekle** eksik standart alanları ekler.
4. **Kişisel bilgisayar şablonunu uygula** ile otomatik temizlik yapın. Sonuç ekrana gelir; gerekirse elle düzeltin.
5. **Kaydet ve indir** güncel dosyayı indirir. **Orijinale dön** yüklenen dosyaya geri döner.

Sağ üstteki **Kullanıcı adı**, şablonun yazar olarak kullandığı addır. Varsayılan olarak işletim sistemi kullanıcı adınız gelir ve tarayıcıda hatırlanır.

## Şablon ne yapar?

| Alan | İşlem |
|---|---|
| Yazar, son değiştiren | Kullanıcı adı yazılır |
| Başlık, konu, etiket, açıklama, kategori, özel özellikler | AI / araç izi taşıyanlar kaldırılır, diğerleri korunur |
| Uygulama, sürüm, şablon | `Microsoft Office Word` (veya Excel / PowerPoint), `16.0000`, `Normal.dotm` |
| Sayfa, sözcük, karakter, satır, paragraf | Eksikse belge içeriğinden hesaplanır |
| `HeadingPairs`, `TitlesOfParts` | Eksikse Word'ün standart yapısıyla eklenir |
| Toplam düzenleme süresi, revizyon | Yoksa makul değerler atanır |
| Oluşturma / değiştirme tarihi | Bilinen üretici varsayılanları yenilenir; değiştirme her zaman oluşturmadan sonradır. "Tarihleri de yenile" seçiliyse tümü yenilenir |
| Yorum ve değişiklik yazarları | Hepsi kullanıcı adına çevrilir; baş harfler güncellenir, `people.xml` yerel hesap görünümüne getirilir |
| Son yazdırma, yönetici, şirket | Kaldırılır veya boşaltılır |
| Zip parça tarihleri | Word gibi `1980-01-01` yapılır |

## API

Arayüz aşağıdaki uç noktaları kullanır; başka araçlardan da çağrılabilir.

| Yöntem | Yol | Açıklama |
|---|---|---|
| `GET` | `/api/config` | Varsayılan kullanıcı adı ve makine adı |
| `POST` | `/api/inspect` | `multipart/form-data` içinde `file`; metadata raporu döner (JSON) |
| `POST` | `/api/apply` | `file`, `edits` (JSON), isteğe bağlı `template=1`, `name`, `freshDates=1`; düzenlenmiş dosya döner. `X-Notes` başlığında yapılan işlemlerin listesi bulunur |

`edits` biçimi:

```json
{
  "core":   { "dc:creator": "Ad Soyad", "cp:keywords": null },
  "app":    { "Company": "" },
  "custom": [ { "name": "Ders", "type": "lpwstr", "value": "Tarih" } ],
  "authors": { "Eski Ad": "Yeni Ad" },
  "removeThumbnail": true
}
```

`null` değer alanı kaldırır. `custom` gönderilmezse özel özellikler olduğu gibi kalır.

## Test

```bash
node test/smoke.mjs   # sahte AI izli belge üretir, temizler ve doğrular
node test/http.mjs    # sunucu çalışırken HTTP uç noktalarını test eder
```

## Proje yapısı

```
src/
  server.js    Express sunucusu ve API
  ooxml.js     OOXML paketini okuma / yazma
  template.js  Şablon kuralları
  detect.js    Şüpheli işaret tespiti
public/
  index.html   Arayüz
  app.js       İstemci mantığı
  style.css    Stil
test/
  smoke.mjs    Uçtan uca modül testi
  http.mjs     HTTP testi
```

## Lisans

[MIT](LICENSE)
