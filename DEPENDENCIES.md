# Dukaan Desk — Dependencies

## Runtime Dependencies

**None.**

This is a fully static web application. It runs directly in a browser using plain HTML, CSS, and JavaScript with no external libraries, frameworks, CDN links, or package manager.

Files required to run the app:

```
index.html
styles.css
app.js
```

No `node_modules`, no `package.json`, no build step.

## Browser APIs Used

The app uses standard browser APIs that are built into modern browsers — no installation needed:

| API | Used For | Required? |
|-----|----------|-----------|
| `localStorage` | Auto-saving shop data in the browser | Yes — core storage |
| `File System Access API` (`showSaveFilePicker`, `showOpenFilePicker`) | Drive auto-save to a user-chosen `.json` file | Optional — Chrome/Edge only |
| `IndexedDB` | Remembering the chosen drive file handle across sessions | Optional — used alongside File System Access |
| `crypto.randomUUID()` | Generating collision-safe unique IDs for records | Yes — falls back to `Math.random()` on very old browsers |
| `Intl.NumberFormat` | Formatting currency as Indian Rupees (₹) | Yes |
| `Intl.DateTimeFormat` | Formatting dates in the `en-IN` locale | Yes |
| `structuredClone()` | Deep-cloning state objects safely | Yes — supported in all modern browsers |
| `Blob` + `URL.createObjectURL` | Downloading backup and CSV files | Yes |
| `FileReader` | Reading backup JSON files during restore | Yes |
| `window.print()` | Printing the invoice preview | Yes |

## Recommended Browsers

| Browser | Drive Auto-Save | All Other Features |
|---------|-----------------|--------------------|
| Google Chrome | ✓ Full support | ✓ |
| Microsoft Edge | ✓ Full support | ✓ |
| Brave | ✓ Full support | ✓ |
| Firefox | ✗ Not supported — download backup is used instead | ✓ |
| Safari | ✗ Not supported — download backup is used instead | ✓ |

The File System Access API (`showSaveFilePicker` / `showOpenFilePicker`) is not available in Firefox or Safari. The app detects this automatically and falls back to the standard download backup method.

## Optional: Running From a Local Server

Opening `index.html` directly (via `file://`) works for most use. If you prefer a local server (for example, to avoid any browser security restrictions on `file://` URLs), you can use one of these with no installation of app dependencies:

**Python (built into most systems):**
```bash
cd hardware-shop-app-main
python3 -m http.server 8080
# Open http://localhost:8080
```

**Node.js (if installed):**
```bash
cd hardware-shop-app-main
npx serve .
# Open the URL shown in the terminal
```

Neither Python nor Node.js is required for normal shop use.

## Development Notes

There is no build pipeline, bundler, or transpiler. The source files are the production files. To modify the app:

1. Open `app.js` in any text editor.
2. Save the file.
3. Refresh the browser.

All logic is in `app.js`. All styles are in `styles.css`. The HTML structure is in `index.html`.

## Data Format

Shop data is stored as plain JSON. The schema includes:

```json
{
  "settings": { "shopName": "", "phone": "", "address": "", "taxId": "" },
  "lastInvoiceSeq": 0,
  "products": [],
  "invoices": [],
  "ledger": [],
  "movements": []
}
```

`lastInvoiceSeq` is a persistent counter used to generate unique, non-repeating invoice numbers regardless of deletions or restores.

Older backup files without `lastInvoiceSeq` are automatically migrated — the counter is seeded from the number of invoices in the backup.

## Security Notes

- All user input rendered into HTML is passed through `escapeHtml()` to prevent XSS.
- No data is sent to any server. All data stays on the user's device.
- Drive file access requires explicit user permission per browser session (File System Access API security model).
- GSTIN and phone number inputs are validated against standard Indian formats before saving.
