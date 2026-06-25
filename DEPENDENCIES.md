# Dependencies

Dukaan Desk has no application dependencies.

It is a static web app built with plain HTML, CSS, and JavaScript.

## Required Files

Only these files are required to run the app:

```text
index.html
styles.css
app.js
```

The remaining files are documentation and setup guides:

```text
README.md
USER_GUIDE.md
DEPENDENCIES.md
GOOGLE_DRIVE_SETUP.md
GOOGLE_DRIVE_SETUP.html
```

## What Is Not Required

No package installation is needed.

- No `package.json`
- No `node_modules`
- No npm install step
- No framework
- No bundler
- No backend server
- No external CDN library
- No database service

## Browser APIs Used

The app uses built-in browser APIs:

| API | Used For | Required |
| --- | --- | --- |
| `localStorage` | Main browser data storage | Yes |
| `JSON.parse` / `JSON.stringify` | Backup, restore, and file storage | Yes |
| `Blob` | Creating downloadable backup and CSV files | Yes |
| `URL.createObjectURL` | Downloading generated files | Yes |
| `FileReader` | Reading imported backup JSON files | Yes |
| `window.print()` | Printing invoice previews | Yes |
| `Intl.NumberFormat` | Currency formatting | Yes |
| `Intl.DateTimeFormat` | Date formatting | Yes |
| `structuredClone()` | Cloning default app state | Yes |
| `crypto.randomUUID()` | Creating unique record IDs | Preferred, with fallback |
| File System Access API | Save/open/auto-save a selected `.json` data file | Optional |
| `IndexedDB` | Remembering the selected drive file handle | Optional |

## Browser Support

| Browser | App Support | Drive Auto-Save |
| --- | --- | --- |
| Google Chrome | Full | Full |
| Microsoft Edge | Full | Full |
| Brave | Full | Full |
| Firefox | Full | Not available |
| Safari | Full | Not available |

Firefox and Safari do not support the File System Access API used for drive auto-save. In those browsers, use Download Backup and Restore Backup instead.

## Optional Developer Tools

These tools are optional and only useful for local testing:

### Python local server

```bash
python -m http.server 8080
```

### Node local server

```bash
npx serve .
```

Neither Python nor Node.js is required for normal use.

## Data Format

The app stores shop data as JSON with this top-level shape:

```json
{
  "settings": {
    "shopName": "",
    "phone": "",
    "address": "",
    "taxId": ""
  },
  "lastInvoiceSeq": 0,
  "products": [],
  "invoices": [],
  "ledger": [],
  "movements": []
}
```

`lastInvoiceSeq` is used to keep invoice numbers from repeating after backup/restore.

## Security And Privacy

- Data stays on the user's device.
- No data is sent to a server by this app.
- User-entered values rendered into tables are escaped before insertion into HTML.
- Drive file access requires explicit browser permission.
- Phone and GSTIN fields include basic Indian-format validation.

## Maintenance Notes

Because there is no build pipeline, the source files are also the production files. To modify the app, edit `index.html`, `styles.css`, or `app.js`, then refresh the browser.
