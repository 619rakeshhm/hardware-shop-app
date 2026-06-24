# Hardware Shop Manager - Dependency List

## Required

No software dependencies are required for normal use.

This app is a static web application. It runs directly in a modern browser using these files:

- `index.html`
- `styles.css`
- `app.js`

## Recommended Browser

Use one of these browsers:

- Google Chrome
- Microsoft Edge
- Brave

For the best file-saving feature, use Chrome or Edge. The **Save To Drive**, **Open Data File**, and **Drive auto-save** features depend on browser support for choosing local files.

## Optional

If you want to run the app from a local web server instead of opening `index.html` directly, install one of these:

- Node.js
- Python

This is optional. For most shop use, double-clicking `index.html` is enough.

## Deployment On Another Laptop

1. Copy the full `hardware-shop-app` folder to the other laptop.
2. Open the folder.
3. Double-click `index.html`.
4. Use **Settings > Data > Open Data File** to load your saved shop data file.

## Important Data Note

Browser storage is local to the laptop and browser. To move data safely between laptops, use:

- **Settings > Data > Save To Drive**
- **Settings > Data > Open Data File**
- **Settings > Data > Download Backup**
- **Settings > Data > Restore Backup**
- **Settings > Data > Download All CSV**

JSON files are used for full backup and restore. CSV files are used for Excel/accounting reports.

## Drive Auto-Save Note

For security, a browser cannot secretly write to any drive by itself. You must choose the data file once using **Save To Drive** or **Set Auto-Save**.

After that, Chrome/Edge can auto-save your new bills, stock changes, ledger entries, and settings to the selected file while permission is active. If the app is reopened and permission is needed again, click **Set Auto-Save** and allow access.
