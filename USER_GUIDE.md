# Dukaan Desk — User Guide

## 1. What This App Does

Dukaan Desk helps you run daily shop work:

- Create customer bills with GST
- Track cash, UPI, card, and credit sales
- Void a saved bill and reverse its stock
- Manage stock items and quantities
- Record stock in and stock out
- Track customer credit and supplier payable
- Record expenses and income
- Filter reports by date range
- Print bills
- Export CSV reports for Excel
- Save and restore shop data

---

## 2. How To Open The App

1. Open the `hardware-shop-app-main` folder.
2. Double-click `index.html`.
3. The app opens in your browser.

**Recommended browsers:** Google Chrome, Microsoft Edge.

---

## 3. First-Time Setup

Open **Settings**.

Enter:

- Shop name
- Phone number *(10-digit Indian mobile)*
- Address
- GST / Tax ID *(GSTIN format, optional)*

Click **Save Details**.

These details appear on the bill preview and printed bill.

> **Note:** The phone field validates for a valid 10-digit Indian mobile number (starting with 6–9). The GST / Tax ID field validates for a standard 15-character GSTIN. Leave either blank if not needed.

---

## 4. Saving Data To A Drive

Open **Settings > Data**.

Click **Set Auto-Save** or **Save To Drive** to choose a `.json` file on any drive — laptop drive, USB drive, external hard disk. After you choose and allow access, the app auto-saves all changes to that file while it is open.

Auto-saves include: bills, stock items, movements, ledger entries, and settings.

The topbar shows the save status:

- **Drive auto-save on** — changes are being saved to your selected file.
- **Drive auto-save off** — no drive file is connected.
- If reconnect is needed, click **Set Auto-Save** and allow access.

Use **Download Backup** regularly as an extra safety copy.

> Browsers cannot write to a drive without your permission. You must choose the file once. After that, Chrome or Edge can auto-save while the app is open.

---

## 5. Adding Stock Items

Open **Stock**.

In **Add / Update Item**, enter:

- Item name
- Category *(e.g. Building, Plumbing, Paint, Fasteners)*
- Unit *(e.g. pcs, kg, bag, meter)*
- Sale rate
- GST %
- Purchase rate
- Minimum stock *(triggers low-stock alert)*

Click **Save Item**.

To edit an item, click **Edit** in the stock table. The form fills with the item's current values. Make changes and click **Save Item**.

---

## 6. Adding Stock Quantity

Open **Stock > Stock In / Out**.

1. Select the item.
2. Choose **Stock In**.
3. Enter quantity.
4. Add a reason — e.g. `Purchase`, `Opening stock`.
5. Click **Save Movement**.

Use **Stock Out** for damaged, returned, missing, or adjustment quantities.

---

## 7. Creating A Bill

Open **Billing**.

1. Enter customer name *(leave blank for Cash customer)*.
2. Enter customer mobile *(optional — must be 10 digits if entered)*.
3. Select payment mode: Cash, UPI, Card, Credit, or Mixed.
4. Select GST type: **CGST + SGST** for local sales or **IGST** for interstate.
5. Select an item from the dropdown.
6. Enter quantity.
7. Check or change rate.
8. Check or change GST %.
9. Select rate type:
   - **GST Extra** — GST is added on top of the entered rate.
   - **GST Included** — the entered rate already includes GST.
10. Click **Add Item**.
11. Add more items as needed.
12. Enter discount if any.
13. Enter paid amount.
14. Click **Save Bill**.

> **Stock check:** The app checks available stock when you click Add Item. If you add the same item more than once, the already-queued quantity is counted — you cannot add more than what is physically in stock.

If full payment is received, the balance will be zero. If payment is pending, the unpaid amount auto-creates a credit entry for the customer.

---

## 8. Voiding a Saved Bill

If a bill was saved with an error, you can void it.

1. Open **Billing**.
2. Find the bill in **Saved Bills**.
3. Click **Void**.
4. Confirm the prompt.

Voiding a bill:

- Marks the bill as **VOID** with a strikethrough in the list.
- Returns all billed quantities back to stock.
- Removes the bill's credit and receipt ledger entries.
- Excludes the bill from all sales totals and reports.

> Voiding is permanent. If the sale actually happened, create a new corrected bill instead.

---

## 9. GST Calculation

For **GST Extra:**

```
Taxable amount = quantity × rate
GST            = taxable × GST %
Bill amount    = taxable + GST
```

For **GST Included:**

```
Bill amount    = quantity × rate
Taxable        = bill amount ÷ (1 + GST % / 100)
GST            = bill amount − taxable
```

For local sales, GST splits into **CGST** and **SGST** (half each). For interstate sales, the full amount is shown as **IGST**.

---

## 10. Printing A Bill

**Draft (unsaved bill):** Click **Print Draft** in the Billing view.

**Saved bill:**
1. Go to **Billing**.
2. Find the bill in **Saved Bills**.
3. Click **Print**.

> If you have an unsaved bill in progress, the app will warn you before loading the saved bill for printing.

---

## 11. Customer Credit

When a bill is saved with an unpaid balance, the app automatically creates a credit entry for the customer.

To record payment received later:

1. Open **Credit / Debit**.
2. Enter party name (customer name).
3. Party type: **Customer**.
4. Entry type: **Payment received**.
5. Enter amount.
6. Click **Save Entry**.

The customer balance updates automatically.

---

## 12. Supplier Debit / Payable

Open **Credit / Debit**.

To record a supplier purchase on credit:

1. Enter supplier name.
2. Party type: **Supplier**.
3. Entry type: **Debit payable / purchase due**.
4. Enter amount.
5. Click **Save Entry**.

To record payment made to a supplier:

1. Enter supplier name.
2. Party type: **Supplier**.
3. Entry type: **Payment made**.
4. Enter amount.
5. Click **Save Entry**.

---

## 13. Expenses and Income

Open **Credit / Debit**.

Use **Expense** for: transport, rent, electricity, labour, tea, repair, etc.

Use **Other income** for income not from normal billing.

---

## 14. Ledger Entries

The ledger shows the last 50 entries by default. Click **Load more entries** to see older records. A count ("Showing 50 of 342 entries") tells you how many are loaded.

Use the search box to filter by party name. Use **Export CSV** to download the full ledger.

---

## 15. Dashboard

The Dashboard shows:

- Today's sales total
- Cash received today
- Total customer credit outstanding
- Total stock value
- Recent bills
- Low-stock items *(items at or below minimum stock)*

---

## 16. Reports

Open **Reports**.

Use the **From** and **To** date pickers to filter the report to a specific period — for example, a single month:

- From: `2026-06-01`
- To: `2026-06-30`

Leave both dates blank to see all-time totals.

The report shows:

- Total sales *(voided bills excluded)*
- Total collection
- Total expenses
- Supplier payable
- Business summary bar chart

Use **Export Bills CSV** to download filtered bill data.

---

## 17. CSV Export

The app exports these CSV files:

| File | Contents |
|------|----------|
| `stock-register.csv` | All stock items with rates and quantities |
| `bills.csv` | All invoices with GST breakdown |
| `bill-items.csv` | Individual line items from all bills |
| `ledger.csv` | All ledger entries |
| `stock-movements.csv` | All stock in/out movements |
| `settings.csv` | Shop settings snapshot |

Open **Settings > Data > Download All CSV** to download all files at once. The browser downloads them as separate files because CSV is a single-table format.

Use CSV for Excel or accounting review. Use JSON backup for full restore into the app.

---

## 18. Backup and Restore

Open **Settings > Data**.

| Button | Action |
|--------|--------|
| Save To Drive | Choose a drive file — auto-saves from here |
| Save Again | Re-save to the already chosen drive file |
| Open Data File | Load a previously saved drive file |
| Download Backup | Save a full JSON backup to Downloads |
| Restore Backup | Import a JSON backup file |
| Download All CSV | Download all tables as CSV |
| Reset Demo Data | Wipe all data and load sample items |

---

## 19. Moving To Another Laptop

**On the old laptop:**

1. Go to **Settings > Data**.
2. Click **Download Backup** or **Save To Drive**.
3. Copy the `.json` file and the `hardware-shop-app-main` folder to a USB drive or shared location.

**On the new laptop:**

1. Copy the `hardware-shop-app-main` folder.
2. Open `index.html`.
3. Go to **Settings > Data**.
4. Click **Open Data File** or **Restore Backup**.
5. Select your `.json` file.
6. Click **Set Auto-Save** if the topbar shows "Drive auto-save off".

---

## 20. Safety Advice

- Keep at least two copies of your data — one on the laptop, one on a USB drive or cloud folder.
- Do not clear browser history or site data unless you have a JSON backup file.
- At the end of every working day, confirm the topbar shows **Drive auto-save on**, or click **Download Backup**.
- After restoring from a backup, always click **Set Auto-Save** to reconnect drive auto-save.

---

## 21. Files In This App

```
index.html         — app structure
styles.css         — all styling
app.js             — all logic
README.md          — project overview and changelog
DEPENDENCIES.md    — browser API reference
USER_GUIDE.md      — this file
```

No database server. No internet connection required for normal use.
