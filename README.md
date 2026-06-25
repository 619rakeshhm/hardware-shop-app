# Dukaan Desk - Hardware Shop App

Dukaan Desk is a fully offline, browser-based business app for small hardware shops. It handles daily billing, stock management, GST calculations, customer credit, supplier payables, expenses, reports, backup, restore, and CSV export without requiring a backend server.

## Highlights

- Runs directly from `index.html`
- No server, database, framework, or build step required
- Data is saved in the browser with `localStorage`
- Optional auto-save to a chosen `.json` file in Chrome, Edge, or Brave
- JSON backup/restore and CSV export for Excel/accounting
- Mobile-friendly sidebar and printable invoices

## Features

### Billing

- Create itemized bills with multiple stock items
- Supports Cash, UPI, Card, Credit, and Mixed payment modes
- GST per bill line with GST Extra or GST Included pricing
- Local GST split as CGST + SGST
- Interstate GST support as IGST
- Discount, paid amount, and balance due tracking
- Edit saved bills
- Print draft bills and saved invoices
- Void saved invoices and automatically reverse stock/ledger effects
- Process full or partial sales returns

### Stock

- Maintain products with category, unit, sale rate, purchase rate, GST rate, stock, and minimum stock
- Stock In/Out movement register with reasons
- Low-stock alerts on the dashboard
- Stock value calculation
- Archive products that are already used in bills or stock movements
- Restore archived products when needed

### Ledger

- Customer receivables are generated from bills
- Supplier payables and payments can be entered manually
- Expense and income entries
- Party balance summary
- Bill-generated ledger rows are protected from manual edits
- Ledger pagination with "Load more"
- Recalculate bill balances from saved invoices when needed

### Reports

- Dashboard metrics for today's sales, cash received, profit, credit, stock value, and bill count
- Last 7 days sales chart
- Date range report filters
- Sales, collections, expenses, supplier payable, and credit due summary
- Profit report with taxable sales, cost of goods, discounts, gross profit, and margin
- Item-wise profit table
- GST summary by slab with CGST, SGST, IGST, and total GST

### Backup And Export

- Download full JSON backup
- Restore from JSON backup
- Open an existing data file
- Save/auto-save to a selected drive file using the File System Access API
- Export CSV files for:
  - Settings
  - Stock register
  - Bills
  - Bill items
  - Ledger
  - Stock movements

## Project Files

```text
index.html
styles.css
app.js
README.md
USER_GUIDE.md
DEPENDENCIES.md
GOOGLE_DRIVE_SETUP.md
GOOGLE_DRIVE_SETUP.html
```

## How To Run

1. Download or clone this repository.
2. Open the project folder.
3. Double-click `index.html`.
4. Use Chrome, Edge, or Brave for the best experience.

No install command is needed.

## Optional Local Server

Opening `index.html` directly is enough for normal use. If you prefer a local server, run one of these from the project folder:

```bash
python -m http.server 8080
```

or:

```bash
npx serve .
```

Then open the URL shown in the terminal.

## Data Storage

The app stores data in two possible ways:

1. Browser `localStorage`: automatic and always available.
2. Optional drive file: select a `.json` file once using Save To Drive / Set Auto-Save.

The drive file option works only in browsers that support the File System Access API, mainly Chrome, Edge, and Brave. Firefox and Safari can still use normal download backup and restore.

## Recommended Browsers

| Browser | Core App | Drive Auto-Save |
| --- | --- | --- |
| Google Chrome | Supported | Supported |
| Microsoft Edge | Supported | Supported |
| Brave | Supported | Supported |
| Firefox | Supported | Not supported |
| Safari | Supported | Not supported |

## GitHub Repository

Repository:

```text
https://github.com/619rakeshhm/hardware-shop-app
```

## Notes

- This app is designed for local/offline shop use.
- Keep regular JSON backups, especially before restoring old data or changing laptops.
- For legal/accounting filing, verify GST and invoice requirements with your accountant.
