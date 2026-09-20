# Meta Data Remover

**English** · [Türkçe](README.tr.md)

A local web tool that shows **every piece of metadata** inside Office documents (`.docx`, `.xlsx`, `.pptx`), lets you edit each field, and cleans the whole set with one click. Everything runs on your own machine; files are never sent anywhere.

![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)
![Languages: EN / TR](https://img.shields.io/badge/UI-EN%20%7C%20TR-6d3df5)

## Features

- **Drag-and-drop upload** with instant inspection
- **Complete metadata view**: core properties (`core.xml`), app properties (`app.xml`), custom properties (`custom.xml`), comment and tracked-change authors, thumbnail and package parts
- **Field-level editing**: change, remove or add any standard field; calendar and ISO input for dates
- **Suspicious marker detection**: traces of AI tools (ChatGPT, Claude, Gemini, Copilot…) and automatic document generators (python-docx, pandoc, LibreOffice…) are highlighted
- **"Personal computer" template**: one click strips all traces and rewrites the metadata so the document looks like it was produced by an ordinary Microsoft Office user
- **Author management**: bulk-rename comment and revision authors (initials and `people.xml` included)
- **Bilingual interface**: English by default, Turkish available from the language switcher; the choice is remembered in the browser
- **Safe output**: document content is never touched, only metadata parts are rewritten; zip entry dates are normalized the same way Word does

## Installation

Node.js 20 or newer is required.

```bash
git clone https://github.com/keremcep/meta-data-remover.git
cd meta-data-remover
npm install
npm start
```

Open the address printed in the console:

```
  ➜  http://localhost:3000
```

Use `PORT=4000 npm start` for a different port.

## Usage

1. Drag a document onto the page or click **browse**.
2. The summary box at the top lists every suspicious marker that was found.
3. Edit fields in the cards. The trash icon removes a field, **Add field** adds a missing standard one.
4. Click **Apply personal computer template** for automatic cleanup. The result is shown again so you can fine-tune it.
5. **Save & download** downloads the current version. **Revert to original** goes back to the uploaded file.

The **User name** box in the top bar is the name the template writes as the author. It defaults to your operating-system user name and is remembered in the browser. The **Language** selector switches the whole interface, including server-generated messages.

## What the template does

| Field | Action |
|---|---|
| Author, last modified by | Set to the user name |
| Title, subject, keywords, description, category, custom properties | Entries carrying AI / tool traces are removed, the rest are kept |
| Application, version, template | `Microsoft Office Word` (or Excel / PowerPoint), `16.0000`, `Normal.dotm` |
| Pages, words, characters, lines, paragraphs | Computed from the document body when missing |
| `HeadingPairs`, `TitlesOfParts` | Added with Word's standard structure when missing |
| Total editing time, revision | Plausible values assigned when absent |
| Created / modified dates | Known generator defaults are refreshed; modified is always after created. With **Refresh dates too** all dates are regenerated |
| Comment and revision authors | All renamed to the user name; initials updated, `people.xml` switched to a local-account presence |
| Last printed, manager, company | Removed or cleared |
| Zip entry dates | Set to `1980-01-01`, exactly like Word |

## API

The interface uses the endpoints below; they can be called from other tools as well. Every endpoint accepts an optional `lang` field (`en` or `tr`) for the texts it returns.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/config` | Default user name and host name |
| `POST` | `/api/inspect` | `multipart/form-data` with `file`; returns the metadata report (JSON) |
| `POST` | `/api/apply` | `file`, `edits` (JSON), optional `template=1`, `name`, `freshDates=1`; returns the modified file. The `X-Notes` header carries the list of actions performed |

`edits` format:

```json
{
  "core":   { "dc:creator": "Jane Doe", "cp:keywords": null },
  "app":    { "Company": "" },
  "custom": [ { "name": "Course", "type": "lpwstr", "value": "History" } ],
  "authors": { "Old Name": "New Name" },
  "removeThumbnail": true
}
```

A `null` value removes the field. When `custom` is omitted the custom properties are left untouched.

## Tests

```bash
npm test              # builds a fake AI-generated document, cleans it and verifies the result
node test/http.mjs    # exercises the HTTP endpoints against a running server
```

## Project layout

```
src/
  server.js    Express server and API
  ooxml.js     OOXML package reading / writing
  template.js  Template rules
  detect.js    Suspicious marker detection
  i18n.js      Server-side translations
public/
  index.html   Interface
  app.js       Client logic
  i18n.js      Client-side translations
  style.css    Styles
test/
  smoke.mjs    End-to-end module test
  http.mjs     HTTP test
```

## License

[MIT](LICENSE)
