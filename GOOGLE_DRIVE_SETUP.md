# Saving Your Data to Google Drive

This guide sets up **automatic Google Drive backup** for the Hardware Shop app.
No internet is needed while you work — the app saves instantly to a file on your
PC, and Google Drive syncs that file to the cloud in the background.

> **Works in:** Google Chrome, Microsoft Edge, or Brave.
> (Firefox and Safari can't auto-save to a drive — use **Download Backup** there.)

---

## One-time setup (about 5 minutes)

### Step 1 — Install Google Drive for Desktop
1. Go to **https://www.google.com/drive/download/**
2. Download and install **Google Drive for Desktop**.
3. Sign in with the Google account you want your shop data saved to.
4. After it finishes, you'll see a new drive in **File Explorer**, usually
   **`Google Drive (G:)`** with a folder called **`My Drive`**.

> Tip: If you don't see a `G:` drive, open the Drive icon in the system tray
> (bottom-right of the taskbar) → gear icon → **Preferences** → make sure
> "Stream files" or "Mirror files" is enabled.

### Step 2 — Make a folder for the shop data (optional but tidy)
1. Open **File Explorer → Google Drive (G:) → My Drive**.
2. Create a new folder named **`Hardware Shop`**.

### Step 3 — Point the app at a file in Google Drive
1. Open the app (`index.html`) in Chrome or Edge.
2. Go to **Settings → Data**.
3. Click **Save To Drive**.
4. In the file picker, navigate to **Google Drive (G:) → My Drive → Hardware Shop**.
5. Keep the suggested name (e.g. `hardware-shop-data-2026-06-25.json`) and click **Save**.
6. The status line should now read **"Selected: …json. Auto-save is on."** and the
   top bar pill should show **"Drive auto-save on"** (green).

✅ **That's it.** From now on, every bill, stock change, and ledger entry is saved
to that file automatically, and Google Drive uploads it to the cloud.

---

## Daily use

- Just use the app normally. **You don't need to click anything to save.**
- The green **"Drive auto-save on"** pill confirms it's connected.
- If you ever see **"Drive auto-save off"** or **"Auto-save paused"**:
  click **Set Auto-Save** (or **Save Again**) and re-select your file. This can
  happen after closing the browser for a while — it's normal.

---

## Opening your data on another PC

1. Install **Google Drive for Desktop** on the second PC and sign in with the
   **same Google account**. Wait for it to finish syncing.
2. Copy the app folder (the one with `index.html`) to the second PC and open it.
3. Go to **Settings → Data → Open Data File**.
4. Browse to **Google Drive (G:) → My Drive → Hardware Shop** and pick your
   `…data….json` file.
5. Click **Set Auto-Save** so changes on this PC also sync back.

> ⚠️ **Use one PC at a time.** If two PCs edit the same file simultaneously,
> Google may create a "conflicted copy". For a single shop counter this is rarely
> an issue — just avoid having it open and editing on two machines at once.

---

## Extra safety (recommended)

Once a week, click **Settings → Data → Download Backup** and keep that `.json`
somewhere (a USB stick or a second folder). This is a manual snapshot you can
**Restore Backup** from if anything ever goes wrong with the synced file.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| No `G:` / Google Drive folder appears | Open Drive tray icon → Preferences → enable file streaming; restart the PC |
| Pill says "Drive auto-save off" | Settings → Data → **Set Auto-Save**, pick your file again |
| "Auto-save paused. Click Set Auto-Save to reconnect." | Click **Set Auto-Save** and allow file access when the browser asks |
| File picker won't open / button does nothing | You're likely in Firefox/Safari — use Chrome or Edge, or use **Download Backup** instead |
| Data didn't appear on the second PC | Wait for Google Drive to finish syncing (tray icon stops spinning), then **Open Data File** |
| Want to confirm it's syncing | In File Explorer, the file should show a green check (synced) rather than a sync arrow |

---

## How it works (in one line)

The app saves to a normal file on your PC using your browser's secure file access.
That file happens to live inside the Google Drive folder, so Google Drive for
Desktop syncs every change up to the cloud automatically — giving you cloud backup
while the app stays fully offline-capable.
