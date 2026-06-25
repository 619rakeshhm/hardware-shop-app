# Dukaan Desk

A browser-based business app for hardware shops. Handles daily billing, stock management, GST calculation, customer credit, supplier debit, expenses, reports, and data backup — all without a server or internet connection.

## Features

### Billing
- Create itemised bills with multiple products
- GST calculation per item — **GST Extra** or **GST Included**
- Supports **CGST + SGST** (local) and **IGST** (interstate)
- Track paid amount and balance due
- Payment modes: Cash, UPI, Card, Credit, Mixed
- **Void a saved bill** — reverses stock and ledger entries automatically
- Print bills or draft previews

### Stock
- Stock register with category, unit, sale rate, purchase rate, and GST %
- Stock In / Out movements with reason tracking
- Low-stock alerts on the dashboard
- Stock value calculation

### Credit / Debit Ledger
- Customer receivables — auto-created when a bill has an unpaid balance
- Supplier payables and payments
- Expense and other income entries
- Party balance summary
- Paginated ledger view — loads 50 entries at a time with "Load more"

### Reports
- Total sales, collection, expenses, supplier payable
- **Date range filter** — filter all report totals by From / To date
- Business summary bar chart
- Voided bills excluded from totals

### Data & Backup
- Saves to browser localStorage automatically
- Optional drive auto-save to a chosen `.json` file (Chrome / Edge)
- Download JSON backup and restore from backup
- CSV export for Excel / accounting (stock, bills, bill items, ledger, movements, settings)

## Files

The app is fully static — no server needed:

```
index.html
styles.css
app.js
README.md
USER_GUIDE.md
DEPENDENCIES.md
```

## How To Run

1. Download or unzip the project folder.
2. Open the folder.
3. Double-click `index.html`.
4. Use **Chrome** or **Edge** for best support (required for drive auto-save).

## Data Storage

Data is saved in two ways:

1. **Browser localStorage** — automatic, always on, local to this browser.
2. **Drive file** — click **Set Auto-Save** or **Settings > Data > Save To Drive**, choose a `.json` file on any drive (USB, external disk, `C:`, `D:`). After permission is given, the app auto-saves all changes to that file.

Browsers cannot write to a drive silently. You must choose the file once. After that, Chrome/Edge auto-saves while the app is open and connected.

## Backup and Restore

| Action | Use For |
|--------|---------|
| Download Backup | Full JSON export — use for restore |
| Restore Backup | Import a JSON backup file |
| Open Data File | Load a drive data file on another laptop |
| Download All CSV | Readable tables for Excel / accounting |

## GST Support

- GST % per stock item, overridable per bill line
- GST Extra (added on top) and GST Included (backed out)
- CGST + SGST split for local, IGST for interstate
- Full GST breakdown on printed invoices and CSV exports

## Moving to Another Laptop

**On the old laptop:**
1. Go to **Settings > Data**.
2. Click **Download Backup** (or use Save To Drive).
3. Copy the `.json` file and the app folder to the new machine.

**On the new laptop:**
1. Open `index.html`.
2. Go to **Settings > Data**.
3. Click **Open Data File** or **Restore Backup**.
4. Select your `.json` file.
5. Click **Set Auto-Save** if the topbar shows "Drive auto-save off".

## Recommended Browsers

- Google Chrome ✓
- Microsoft Edge ✓
- Brave ✓

Safari and Firefox do not support the File System Access API required for drive auto-save. The app still works in those browsers — backup download is used instead.

## Changelog

### v2 — Bug fixes and improvements
- **Fixed:** Invoice numbers no longer reset or duplicate after a restore — a persistent counter (`lastInvoiceSeq`) is stored in state.
- **Fixed:** Stock oversell prevented — quantities already in the active bill are counted before allowing another add.
- **Fixed:** Printing a saved invoice now warns if an unsaved bill is open, instead of silently clearing it.
- **Fixed:** `switchView()` no longer crashes on unmatched view names.
- **Fixed:** Timezone bug — bills created after 6:30 PM IST no longer appear as the next day's date.
- **Fixed:** IDs now use `crypto.randomUUID()` for collision-safe unique identifiers.
- **New:** Void invoice — reverses stock and removes ledger entries, bill marked VOID.
- **New:** Reports date range filter — filter sales, collection, and expenses by From / To date.
- **New:** Ledger pagination — 50 entries shown at a time with a "Load more" button.
- **New:** Mobile hamburger menu — sidebar slides in on small screens.
- **New:** Phone and GSTIN validation in Settings and on billing.
- **Improved:** Actions now trigger targeted re-renders instead of re-rendering the full app on every change.
