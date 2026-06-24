# Hardware Shop Manager

A simple browser-based business app for a hardware shop. It helps with daily billing, stock management, GST calculation, customer credit, supplier debit, expenses, reports, and data backup.

## Features

- Create item bills/invoices
- Add multiple items to one bill
- GST calculation per item
- Supports **GST Extra** and **GST Included** rates
- Supports **CGST + SGST** and **IGST**
- Track paid amount and balance due
- Customer credit tracking
- Supplier debit/payable tracking
- Stock register with stock in/out movements
- Low-stock dashboard
- Expense and income ledger
- Printable bill preview
- CSV exports for Excel/accounting
- JSON backup and restore
- Optional drive auto-save to a selected file

## Files

The app is fully static and uses only these files:

- `index.html`
- `styles.css`
- `app.js`
- `USER_GUIDE.md`
- `DEPENDENCIES.md`

No database server is required.
No internet connection is required for normal use.

## How To Run

1. Download or clone this repository.
2. Open the project folder.
3. Double-click `index.html`.
4. Use Chrome or Edge for best support.

## Data Storage

The app saves data in JSON format.

It stores data in two ways:

1. **Browser local storage**
   - Automatic local fallback storage inside the browser.

2. **Selected drive file**
   - Use **Set Auto-Save** or **Settings > Data > Save To Drive**.
   - Choose a `.json` file on any drive, such as `C:`, `D:`, USB drive, or external hard disk.
   - After permission is given, the app auto-saves changes to that selected file while connected.

Important: browsers do not allow any app to silently write to a drive without user permission. You must choose the file once.

## Backup And Restore

Use:

- **Download Backup** to save a full JSON backup.
- **Restore Backup** to load a JSON backup.
- **Open Data File** to open a previously saved drive data file.

JSON is the best format for full restore into the app.

## CSV Export

Use **Settings > Data > Download All CSV** to export readable files for Excel or Google Sheets.

CSV exports include:

- Shop settings
- Stock register
- Bills
- Bill items
- Ledger
- Stock movements

CSV is useful for accounting review, but JSON should be used for full backup and restore.

## GST Support

The app supports:

- GST percentage per stock item
- GST percentage override while billing
- GST Extra
- GST Included
- CGST + SGST
- IGST
- Taxable amount
- GST amount
- GST columns in CSV exports

## Recommended Browser

Use one of these:

- Google Chrome
- Microsoft Edge
- Brave

Chrome or Edge is recommended for the drive auto-save feature.

## Moving To Another Laptop

1. Copy the full app folder to the new laptop.
2. Open `index.html` in Chrome or Edge.
3. Use **Settings > Data > Open Data File** or **Restore Backup**.
4. Select your saved `.json` file.
5. Click **Set Auto-Save** if the top bar says drive auto-save is off.

## Documentation

Read these files for more details:

- `USER_GUIDE.md`
- `DEPENDENCIES.md`
