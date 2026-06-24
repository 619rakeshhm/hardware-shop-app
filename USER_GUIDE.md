# Hardware Shop Manager - User Guide

## 1. What This App Does

Hardware Shop Manager helps you run daily shop work:

- Create customer bills
- Track cash, UPI, card, and credit sales
- Manage stock items
- Record stock in and stock out
- Track customer credit
- Track supplier debit/payable
- Record expenses and income
- Calculate GST on bills
- Print bills
- Export CSV reports
- Save and restore data

## 2. How To Open The App

1. Open the `hardware-shop-app` folder.
2. Double-click `index.html`.
3. The app opens in your browser.

Recommended browsers:

- Google Chrome
- Microsoft Edge

## 3. First-Time Setup

Open **Settings**.

Enter:

- Shop name
- Phone number
- Address
- GST or tax ID, if needed

Click **Save Details**.

These details will appear on the bill preview and printed bill.

## 4. Saving Data To A Drive

Open **Settings > Data**.

Use **Set Auto-Save** or **Save To Drive** to choose where your shop data file should be saved. The app can save to any drive that you select in the browser save window, such as:

- Laptop drive
- `C:` drive
- `D:` drive
- `E:` drive
- External hard disk
- USB drive

After selecting the data file once, the app will auto-save shop changes to that selected file while it remains open and connected. This includes:

- Bills
- Stock items
- Stock in/out movements
- Credit and debit ledger entries
- Expenses
- Shop settings

The app also keeps a browser local copy as a fallback, but the selected drive file is the safer copy for moving or protecting your data.

Use **Open Data File** on another laptop to load the same data file.

Use **Download Backup** regularly as an extra safety backup.

The top bar shows the drive auto-save status:

- **Drive auto-save on** means changes are being saved to your selected drive file.
- **Drive auto-save off** means no drive file is connected.
- If it says reconnect is needed, click **Set Auto-Save** and allow access.

Important: browsers do not allow any app to secretly save to a drive without your permission. The app cannot automatically choose `C:`, `D:`, a USB drive, or any other drive by itself. You must choose the file once. After you choose it and allow access, the app can auto-save to that selected file.

## 5. Adding Stock Items

Open **Stock**.

In **Add / Update Item**, enter:

- Item name
- Category
- Unit
- Sale rate
- GST %
- Purchase rate
- Minimum stock

Click **Save Item**.

Examples:

- Cement Bag, unit `bag`
- PVC Pipe, unit `pcs`
- Steel Nails, unit `kg`
- Wire, unit `meter`

## 6. Adding Stock Quantity

Open **Stock**.

In **Stock In / Out**:

1. Select the item.
2. Choose **Stock In**.
3. Enter quantity.
4. Add reason, such as `Purchase` or `Opening stock`.
5. Click **Save Movement**.

Use **Stock Out** for damaged, missing, returned, or adjustment stock.

## 7. Creating A Bill

Open **Billing**.

1. Enter customer name.
2. Enter customer mobile, optional.
3. Select payment mode.
4. Select GST type: **CGST + SGST** for local sales or **IGST** for interstate sales.
5. Select item.
6. Enter quantity.
7. Check or change rate.
8. Check or change GST %.
9. Select rate type:
   - **GST Extra** means GST is added on top of the rate.
   - **GST Included** means the rate already includes GST.
10. Click **Add Item**.
11. Add more items if needed.
12. Enter discount if any.
13. Enter paid amount.
14. Click **Save Bill**.

If full payment is received, balance will be zero.

If payment is pending, choose **Credit** or enter a lower paid amount. The pending amount will appear in customer credit.

## 8. GST Calculation

The app calculates GST for each bill item.

For **GST Extra**:

- Taxable amount = quantity x rate
- GST = taxable amount x GST %
- Bill amount = taxable amount + GST

For **GST Included**:

- Bill amount = quantity x rate
- Taxable amount is calculated backwards from the GST-included rate
- GST is separated from the included amount

For local sales, GST is split into:

- CGST
- SGST

For interstate sales, GST is shown as:

- IGST

The invoice preview shows taxable amount, GST, CGST/SGST or IGST, discount, total, paid, and balance.

## 9. Printing A Bill

After adding items in **Billing**, click **Print Draft** to print the current bill preview.

For an already saved bill:

1. Go to **Billing**.
2. Find the bill in **Saved Bills**.
3. Click **Print**.

## 10. Customer Credit

When a bill is saved with unpaid balance, the app automatically creates a customer credit entry.

Open **Credit / Debit** to see customer balances.

To record payment received:

1. Enter party/customer name.
2. Choose party type **Customer**.
3. Choose entry type **Payment received**.
4. Enter amount.
5. Click **Save Entry**.

## 11. Supplier Debit / Payable

Open **Credit / Debit**.

To record supplier payable:

1. Enter supplier name.
2. Choose party type **Supplier**.
3. Choose entry type **Debit payable / purchase due**.
4. Enter amount.
5. Click **Save Entry**.

To record payment made to supplier:

1. Enter supplier name.
2. Choose party type **Supplier**.
3. Choose entry type **Payment made**.
4. Enter amount.
5. Click **Save Entry**.

## 12. Expenses And Income

Open **Credit / Debit**.

Use entry type **Expense** for:

- Transport
- Tea
- Rent
- Electricity
- Labour
- Repair

Use entry type **Other income** for income not coming from normal billing.

## 13. Dashboard

The **Dashboard** shows:

- Today sales
- Cash received
- Customer credit
- Stock value
- Recent bills
- Low stock items

Use it to quickly check the day’s business.

## 14. Reports

Open **Reports** to see:

- Total sales
- Total collection
- Total expenses
- Supplier payable
- Business summary bars

Use **Export Bills CSV** to download bill data for Excel.

## 15. CSV Export

The app can export:

- Stock register CSV
- Ledger CSV
- Bills CSV
- Bill items CSV
- Stock movements CSV
- Shop settings CSV

CSV files can be opened in Excel or Google Sheets.

For a complete CSV export, open **Settings > Data** and click **Download All CSV**. The browser will download separate CSV files because CSV is a table format and the shop data contains multiple tables.

Use CSV for Excel/accounting review. Use JSON backup for full restore into the app.

CSV exports include GST details such as GST %, taxable amount, GST amount, CGST, SGST, and IGST where applicable.

## 16. Backup And Restore

Open **Settings > Data**.

Use **Download Backup** to save a backup JSON file.

Use **Restore Backup** to import a backup JSON file.

Use **Download All CSV** if you want readable Excel files for stock, bills, bill items, ledger, stock movements, and shop settings.

Backup files are important before changing laptops, formatting Windows, or clearing browser data.

## 17. Moving To Another Laptop

On the old laptop:

1. Open the app.
2. Go to **Settings > Data**.
3. Click **Save To Drive** or **Download Backup**.
4. Copy the saved JSON file and the `hardware-shop-app` folder.

On the new laptop:

1. Copy the `hardware-shop-app` folder.
2. Open `index.html`.
3. Go to **Settings > Data**.
4. Click **Open Data File** or **Restore Backup**.
5. Select your saved JSON file.
6. Click **Set Auto-Save** if the top bar says drive auto-save is off.

## 18. Important Safety Advice

Keep at least two copies of your data:

- One on the laptop
- One on a USB drive, external drive, or cloud folder

Do not delete browser history or site data unless you have a backup file.

At the end of every working day, check that the top bar says **Drive auto-save on** or download a backup file.

## 19. Files In This App

The working app uses only these files:

- `index.html`
- `styles.css`
- `app.js`
- `DEPENDENCIES.md`
- `USER_GUIDE.md`

No database server is required.
No internet connection is required for normal use.
