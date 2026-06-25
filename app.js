const STORAGE_KEY = "hardware-shop-manager-v1";
const HANDLE_DB_NAME = "hardware-shop-manager-files";
const HANDLE_STORE_NAME = "handles";
const AUTO_SAVE_HANDLE_KEY = "auto-save-file";

const emptyState = {
  settings: {
    shopName: "My Shop",
    phone: "",
    address: "",
    taxId: ""
  },
  lastInvoiceSeq: 0,
  products: [
    { id: uid(), name: "Cement Bag", category: "Building", unit: "bag", saleRate: 420, purchaseRate: 380, gstRate: 28, stock: 25, minStock: 8 },
    { id: uid(), name: "PVC Pipe 1 inch", category: "Plumbing", unit: "pcs", saleRate: 150, purchaseRate: 112, gstRate: 18, stock: 60, minStock: 12 },
    { id: uid(), name: "Paint Brush 2 inch", category: "Paint", unit: "pcs", saleRate: 75, purchaseRate: 48, gstRate: 18, stock: 35, minStock: 10 },
    { id: uid(), name: "Steel Nails 1 kg", category: "Fasteners", unit: "kg", saleRate: 95, purchaseRate: 70, gstRate: 18, stock: 18, minStock: 6 }
  ],
  invoices: [],
  ledger: [],
  movements: []
};

let state = loadState();
let currentView = "dashboard";
let editingProductId = null;
let editingInvoiceId = null;
let billLines = [];
let dataFileHandle = null;
let pendingDriveSave = Promise.resolve();

const els = {};

const SIDEBAR_KEY = "hardware-shop-sidebar-collapsed";

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  setToday();
  hydrateSettings();
  applySidebarState();
  renderAll();
  initDriveAutoSave();
});

function applySidebarState() {
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === "1";
  const shell = document.querySelector(".app-shell");
  if (shell) shell.classList.toggle("sidebar-collapsed", collapsed);
  if (els.sidebarToggle) els.sidebarToggle.textContent = collapsed ? "»" : "« Collapse";
}

function toggleSidebar() {
  const shell = document.querySelector(".app-shell");
  const collapsed = shell.classList.toggle("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  if (els.sidebarToggle) {
    els.sidebarToggle.textContent = collapsed ? "»" : "« Collapse";
    els.sidebarToggle.setAttribute("aria-label", collapsed ? "Expand menu" : "Collapse menu");
  }
}

function bindElements() {
  document.querySelectorAll("[id]").forEach((el) => {
    els[el.id] = el;
  });
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewLink));
  });

  document.querySelector("[data-action='new-invoice']").addEventListener("click", () => switchView("billing"));
  els.autoSaveSetupButton.addEventListener("click", connectAutoSave);
  els.backupButton.addEventListener("click", downloadBackup);
  els.saveToDriveButton.addEventListener("click", saveToDrive);
  els.saveAgainButton.addEventListener("click", saveAgainToDrive);
  els.openDataFileButton.addEventListener("click", openDataFile);
  els.downloadBackupButton.addEventListener("click", downloadBackup);
  els.downloadAllCsvButton.addEventListener("click", downloadAllCsv);
  els.recalcBalancesButton.addEventListener("click", recalcBalances);
  els.restoreInput.addEventListener("change", restoreBackup);
  els.resetDataButton.addEventListener("click", resetDemoData);

  els.billItem.addEventListener("change", setRateFromSelectedProduct);
  els.addLineButton.addEventListener("click", addBillLine);
  els.customerName.addEventListener("input", renderBill);
  els.customerPhone.addEventListener("input", renderBill);
  els.customerAddress.addEventListener("input", renderBill);
  els.discountAmount.addEventListener("input", renderBill);
  els.paidAmount.addEventListener("input", renderBill);
  els.gstType.addEventListener("change", renderBill);
  els.paymentMode.addEventListener("change", syncPaidWithPaymentMode);
  els.clearBillButton.addEventListener("click", clearBill);
  els.saveBillButton.addEventListener("click", saveBill);
  els.printDraftButton.addEventListener("click", () => window.print());
  els.billSearch.addEventListener("input", renderInvoices);

  els.saveProductButton.addEventListener("click", saveProduct);
  els.resetProductButton.addEventListener("click", resetProductForm);
  els.stockSearch.addEventListener("input", renderStock);
  if (els.showArchivedToggle) els.showArchivedToggle.addEventListener("change", renderStock);
  els.saveMovementButton.addEventListener("click", saveMovement);
  els.exportStockButton.addEventListener("click", () => exportCsv("stock-register.csv", stockCsvRows()));

  els.saveLedgerButton.addEventListener("click", saveLedgerEntry);
  els.ledgerSearch.addEventListener("input", renderPartyBalances);
  els.exportLedgerButton.addEventListener("click", () => exportCsv("ledger.csv", ledgerCsvRows()));
  els.exportInvoicesButton.addEventListener("click", () => exportCsv("bills.csv", invoiceCsvRows()));

  els.saveSettingsButton.addEventListener("click", saveSettings);

  if (els.confirmReturnButton) els.confirmReturnButton.addEventListener("click", processReturn);
  if (els.cancelReturnButton) els.cancelReturnButton.addEventListener("click", closeReturnModal);
  if (els.sidebarToggle) els.sidebarToggle.addEventListener("click", toggleSidebar);

  if (els.menuToggle) {
    els.menuToggle.addEventListener("click", () => {
      document.querySelector(".sidebar").classList.toggle("sidebar-open");
    });
  }

  if (els.reportFrom) {
    els.reportFrom.addEventListener("change", renderReports);
    els.reportTo.addEventListener("change", renderReports);
  }

  if (els.ledgerLoadMore) {
    els.ledgerLoadMore.addEventListener("click", () => {
      ledgerPage += 1;
      renderLedger();
    });
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(emptyState);
  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(emptyState),
      ...parsed,
      settings: { ...emptyState.settings, ...(parsed.settings || {}) },
      lastInvoiceSeq: parsed.lastInvoiceSeq || parsed.invoices?.length || 0,
      products: parsed.products || [],
      invoices: parsed.invoices || [],
      ledger: parsed.ledger || [],
      movements: parsed.movements || []
    };
  } catch {
    return structuredClone(emptyState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueDriveAutoSave();
}

function persistLocalOnly() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(data) {
  const normalized = {
    ...structuredClone(emptyState),
    ...data,
    settings: { ...emptyState.settings, ...(data.settings || {}) },
    lastInvoiceSeq: data.lastInvoiceSeq || data.invoices?.length || 0,
    products: data.products || [],
    invoices: data.invoices || [],
    ledger: data.ledger || [],
    movements: data.movements || []
  };
  normalized.products = normalized.products.map((product) => ({
    ...product,
    gstRate: Number(product.gstRate ?? 18)
  }));
  normalized.invoices = normalized.invoices.map((invoice) => {
    const lines = (invoice.lines || []).map((line) => ({
      ...line,
      gstRate: Number(line.gstRate ?? 0),
      taxMode: line.taxMode || "exclusive"
    }));
    const totals = invoiceTotalsFromLines(lines, invoice.discount || 0, invoice.gstType || "local");
    return {
      ...invoice,
      gstType: invoice.gstType || "local",
      lines,
      taxableSubtotal: invoice.taxableSubtotal ?? totals.taxable,
      gstTotal: invoice.gstTotal ?? totals.gst,
      cgstTotal: invoice.cgstTotal ?? totals.cgst,
      sgstTotal: invoice.sgstTotal ?? totals.sgst,
      igstTotal: invoice.igstTotal ?? totals.igst
    };
  });
  return normalized;
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function setToday() {
  const formatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());
  els.todayLabel.textContent = formatted;
  els.previewDate.textContent = formatted;
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === view));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const navBtn = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navBtn) els.viewTitle.textContent = navBtn.textContent;
  renderAll();
}

function renderAll() {
  renderSettings();
  renderProductOptions();
  renderBill();
  renderInvoices();
  renderDashboard();
  renderStock();
  renderPartyBalances();
  renderLedger();
  renderReports();
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function numberValue(el) {
  return Number(el.value || 0);
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function renderSettings() {
  const { shopName, phone, address, taxId } = state.settings;
  els.shopNameMini.textContent = shopName || "My Shop";
  els.shopPhoneMini.textContent = phone || "Add shop phone";
  els.shopNamePreview.textContent = shopName || "My Shop";
  els.shopAddressPreview.textContent = address || "Shop address";
  els.shopPhonePreview.textContent = [phone, taxId].filter(Boolean).join(" | ") || "Phone";
}

function hydrateSettings() {
  els.shopNameInput.value = state.settings.shopName || "";
  els.shopPhoneInput.value = state.settings.phone || "";
  els.shopAddressInput.value = state.settings.address || "";
  els.shopTaxInput.value = state.settings.taxId || "";
}

function validatePhone(value) {
  if (!value) return true;
  return /^[6-9]\d{9}$/.test(value.replace(/\s/g, ""));
}

function validateGstin(value) {
  if (!value) return true;
  return /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim().toUpperCase());
}

function saveSettings() {
  const phone = els.shopPhoneInput.value.trim();
  const taxId = els.shopTaxInput.value.trim();
  if (!validatePhone(phone)) return toast("Enter a valid 10-digit mobile number");
  if (!validateGstin(taxId)) return toast("Enter a valid 15-character GSTIN (or leave blank)");
  state.settings = {
    shopName: els.shopNameInput.value.trim() || "My Shop",
    phone,
    address: els.shopAddressInput.value.trim(),
    taxId
  };
  persist();
  renderSettings();
  toast("Shop details saved");
}

function renderProductOptions() {
  const options = activeProducts()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)} (${product.stock} ${escapeHtml(product.unit)})</option>`)
    .join("");
  els.billItem.innerHTML = options || "<option value=''>No items</option>";
  els.movementProduct.innerHTML = options || "<option value=''>No items</option>";
  setRateFromSelectedProduct();
}

function setRateFromSelectedProduct() {
  const product = findProduct(els.billItem.value);
  if (product) {
    els.billRate.value = product.saleRate;
    els.billGstRate.value = product.gstRate ?? 18;
  }
}

function findProduct(id) {
  return state.products.find((product) => product.id === id);
}

// Products visible in the active UI (register, billing/movement dropdowns).
// Archived products are kept in state for history but hidden here.
function activeProducts() {
  return state.products.filter((product) => !product.archived);
}

// A product is "used" if any saved bill line or stock movement references it.
function isProductUsed(id) {
  const inBill = state.invoices.some((invoice) => (invoice.lines || []).some((line) => line.productId === id));
  const inMovement = state.movements.some((movement) => movement.productId === id);
  return inBill || inMovement;
}

function deleteProduct(id) {
  const product = findProduct(id);
  if (!product) return;

  if (isProductUsed(id)) {
    const ok = confirm(
      `"${product.name}" is used in saved bills or stock movements, so it can't be permanently deleted.\n\n` +
      `Archive it instead? It will be hidden from billing and the stock register but kept for reports.`
    );
    if (!ok) return;
    product.archived = true;
    if (editingProductId === id) resetProductForm();
    persist();
    renderStock();
    renderProductOptions();
    renderDashboard();
    toast(`${product.name} archived`);
    return;
  }

  if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
  state.products = state.products.filter((item) => item.id !== id);
  if (editingProductId === id) resetProductForm();
  persist();
  renderStock();
  renderProductOptions();
  renderDashboard();
  toast(`${product.name} deleted`);
}

// Quantity of a product committed by the bill currently being edited.
function editingBillQty(productId) {
  if (!editingInvoiceId) return 0;
  const invoice = state.invoices.find((inv) => inv.id === editingInvoiceId);
  if (!invoice) return 0;
  return invoice.lines
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.qty, 0);
}

function addBillLine() {
  const product = findProduct(els.billItem.value);
  const qty = numberValue(els.billQty);
  const rate = numberValue(els.billRate);
  const gstRate = numberValue(els.billGstRate);
  const taxMode = els.gstMode.value;
  if (!product) return toast("Add a stock item first");
  if (qty <= 0 || rate < 0 || gstRate < 0) return toast("Enter valid quantity, rate, and GST");

  const queuedQty = billLines
    .filter((line) => line.productId === product.id)
    .reduce((sum, line) => sum + line.qty, 0);
  // When editing a saved bill, that bill's own quantity is still deducted from
  // stock until we re-save, so it counts as available again here.
  const available = product.stock + editingBillQty(product.id);
  if (qty + queuedQty > available) return toast(`Only ${available} ${product.unit} available (${queuedQty} already in bill)`);

  const existing = billLines.find((line) => {
    return line.productId === product.id && line.rate === rate && line.gstRate === gstRate && line.taxMode === taxMode;
  });
  if (existing) {
    existing.qty += qty;
  } else {
    billLines.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      qty,
      rate,
      gstRate,
      taxMode
    });
  }
  els.billQty.value = "1";
  els.billRate.value = product.saleRate;
  els.billGstRate.value = product.gstRate ?? gstRate;
  els.gstMode.value = "exclusive";
  renderProductOptions();
  syncPaidWithPaymentMode();
  renderBill();
}

function removeBillLine(index) {
  billLines.splice(index, 1);
  renderBill();
}

// Inline edit: load a line back into the entry fields and remove it from the
// list, so the user can change quantity/rate/GST and re-add it.
function editBillLine(index) {
  const line = billLines[index];
  if (!line) return;
  els.billItem.value = line.productId;
  els.billQty.value = line.qty;
  els.billRate.value = line.rate;
  els.billGstRate.value = line.gstRate;
  els.gstMode.value = line.taxMode || "exclusive";
  billLines.splice(index, 1);
  renderBill();
}

function billSubtotal() {
  return billLines.reduce((sum, line) => sum + lineTotals(line).gross, 0);
}

function billTaxableSubtotal() {
  return billLines.reduce((sum, line) => sum + lineTotals(line).taxable, 0);
}

function billGstTotal() {
  return billLines.reduce((sum, line) => sum + lineTotals(line).gst, 0);
}

function gstSplitTotals() {
  const gst = billGstTotal();
  if (els.gstType.value === "igst") {
    return { cgst: 0, sgst: 0, igst: gst };
  }
  return { cgst: gst / 2, sgst: gst / 2, igst: 0 };
}

function lineTotals(line) {
  const base = Number(line.qty || 0) * Number(line.rate || 0);
  const gstRate = Number(line.gstRate || 0);
  if (line.taxMode === "inclusive") {
    const taxable = gstRate > 0 ? base / (1 + gstRate / 100) : base;
    const gst = base - taxable;
    return { taxable, gst, gross: base };
  }
  const gst = base * (gstRate / 100);
  return { taxable: base, gst, gross: base + gst };
}

function invoiceTotalsFromLines(lines, discount = 0, gstType = "local") {
  const taxable = lines.reduce((sum, line) => sum + lineTotals(line).taxable, 0);
  const gst = lines.reduce((sum, line) => sum + lineTotals(line).gst, 0);
  const subtotal = lines.reduce((sum, line) => sum + lineTotals(line).gross, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  return {
    taxable,
    gst,
    subtotal,
    total,
    cgst: gstType === "igst" ? 0 : gst / 2,
    sgst: gstType === "igst" ? 0 : gst / 2,
    igst: gstType === "igst" ? gst : 0
  };
}

function billTotal() {
  return Math.max(0, billSubtotal() - numberValue(els.discountAmount));
}

function billBalance() {
  return Math.max(0, billTotal() - numberValue(els.paidAmount));
}

function syncPaidWithPaymentMode() {
  const total = billTotal();
  if (["cash", "upi", "card"].includes(els.paymentMode.value)) {
    els.paidAmount.value = total.toFixed(2);
  }
  if (els.paymentMode.value === "credit") {
    els.paidAmount.value = "0";
  }
  renderBill();
}

function renderBill() {
  els.billLines.innerHTML = billLines.map((line, index) => `
    <tr>
      <td>${escapeHtml(line.name)}</td>
      <td>${line.qty} ${escapeHtml(line.unit)}</td>
      <td>${currency(line.rate)}</td>
      <td>${Number(line.gstRate || 0)}%</td>
      <td>${currency(lineTotals(line).gross)}</td>
      <td style="display:flex;gap:4px;">
        <button class="mini-button" type="button" data-edit-line="${index}">Edit</button>
        <button class="mini-button danger" type="button" data-remove-line="${index}">Remove</button>
      </td>
    </tr>
  `).join("") || emptyRow(6);

  els.billLines.querySelectorAll("[data-edit-line]").forEach((button) => {
    button.addEventListener("click", () => editBillLine(Number(button.dataset.editLine)));
  });
  els.billLines.querySelectorAll("[data-remove-line]").forEach((button) => {
    button.addEventListener("click", () => removeBillLine(Number(button.dataset.removeLine)));
  });

  const subtotal = billSubtotal();
  const taxable = billTaxableSubtotal();
  const gst = billGstTotal();
  const split = gstSplitTotals();
  const discount = numberValue(els.discountAmount);
  const total = billTotal();
  const paid = Math.min(numberValue(els.paidAmount), total);
  const balance = Math.max(0, total - paid);

  els.billTotal.textContent = currency(total);
  els.billBalance.textContent = currency(balance);
  els.previewCustomer.textContent = els.customerName.value.trim() || "Cash customer";
  if (els.previewCustomerAddress) els.previewCustomerAddress.textContent = els.customerAddress.value.trim();
  if (els.previewCustomerPhone) els.previewCustomerPhone.textContent = els.customerPhone.value.trim();
  if (els.previewPayMode) {
    const mode = els.paymentMode.value;
    els.previewPayMode.textContent = `Payment: ${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
  }
  els.previewTaxable.textContent = currency(taxable);
  els.previewGst.textContent = currency(gst);
  els.previewCgstLabel.textContent = els.gstType.value === "igst" ? "IGST" : "CGST";
  els.previewSgstLabel.textContent = els.gstType.value === "igst" ? "CGST / SGST" : "SGST";
  els.previewCgst.textContent = currency(els.gstType.value === "igst" ? split.igst : split.cgst);
  els.previewSgst.textContent = currency(els.gstType.value === "igst" ? 0 : split.sgst);
  els.previewSubtotal.textContent = currency(subtotal);
  els.previewDiscount.textContent = currency(discount);
  els.previewTotal.textContent = currency(total);
  els.previewPaid.textContent = currency(paid);
  els.previewBalance.textContent = currency(balance);
  els.previewLines.innerHTML = billLines.map((line) => `
    <tr>
      <td>${escapeHtml(line.name)}</td>
      <td>${line.qty} ${escapeHtml(line.unit)}</td>
      <td>${currency(line.rate)}</td>
      <td>${Number(line.gstRate || 0)}%</td>
      <td>${currency(lineTotals(line).gross)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="empty-cell">No items added</td></tr>`;

  updateBillMode();
}

function saveBill() {
  if (!billLines.length) return toast("Add at least one item");
  const custPhone = els.customerPhone.value.trim();
  if (custPhone && !validatePhone(custPhone)) return toast("Enter a valid 10-digit customer mobile");

  // If editing, resolve the bill being edited (ignore if it vanished/voided).
  let editing = editingInvoiceId ? state.invoices.find((inv) => inv.id === editingInvoiceId) : null;
  if (editingInvoiceId && (!editing || editing.voided)) {
    editingInvoiceId = null;
    editing = null;
  }

  // Quantities the edited bill already holds become available again on update.
  const oldQtyByProduct = new Map();
  if (editing) {
    editing.lines.forEach((line) => {
      oldQtyByProduct.set(line.productId, (oldQtyByProduct.get(line.productId) || 0) + line.qty);
    });
  }

  // Validate stock for the new lines BEFORE mutating anything.
  const newQtyByProduct = new Map();
  billLines.forEach((line) => {
    newQtyByProduct.set(line.productId, (newQtyByProduct.get(line.productId) || 0) + line.qty);
  });
  for (const [productId, requiredQty] of newQtyByProduct) {
    const product = findProduct(productId);
    const available = (product ? product.stock : 0) + (oldQtyByProduct.get(productId) || 0);
    if (!product || available < requiredQty) {
      const name = product ? product.name : "Item";
      return toast(`${name} stock changed. Check quantity.`);
    }
  }

  const total = billTotal();
  const split = gstSplitTotals();
  const paid = Math.min(numberValue(els.paidAmount), total);
  const due = Math.max(0, total - paid);
  const now = new Date().toISOString();

  // Reverse the edited bill's stock, movements and ledger before re-applying.
  if (editing) {
    const billNote = `Bill ${editing.number}`;
    editing.lines.forEach((line) => {
      const product = findProduct(line.productId);
      if (product) product.stock = roundStock(product.stock + line.qty);
    });
    state.movements = state.movements.filter((movement) => movement.reason !== billNote);
    state.ledger = state.ledger.filter((entry) => entry.note !== billNote);
  }

  const number = editing ? editing.number : nextInvoiceNumber();
  const date = editing ? editing.date : now;
  const invoice = {
    id: editing ? editing.id : uid(),
    number,
    date,
    customerName: els.customerName.value.trim() || "Cash customer",
    customerPhone: els.customerPhone.value.trim(),
    customerAddress: els.customerAddress.value.trim(),
    paymentMode: els.paymentMode.value,
    gstType: els.gstType.value,
    // Snapshot the cost (purchase rate) at sale time so historical profit stays
    // accurate even if the product's purchase rate changes later. Existing lines
    // (when editing) keep their original snapshot.
    lines: billLines.map((line) => {
      const product = findProduct(line.productId);
      const purchaseRate = line.purchaseRate != null
        ? Number(line.purchaseRate)
        : (product ? Number(product.purchaseRate || 0) : 0);
      return { ...line, purchaseRate };
    }),
    taxableSubtotal: billTaxableSubtotal(),
    gstTotal: billGstTotal(),
    cgstTotal: split.cgst,
    sgstTotal: split.sgst,
    igstTotal: split.igst,
    subtotal: billSubtotal(),
    discount: numberValue(els.discountAmount),
    total,
    paid,
    due,
    voided: false
  };

  // Apply the new lines: deduct stock and log outward movements.
  invoice.lines.forEach((line) => {
    const product = findProduct(line.productId);
    product.stock = roundStock(product.stock - line.qty);
    state.movements.push({
      id: uid(),
      date: now,
      productId: product.id,
      productName: product.name,
      type: "out",
      qty: line.qty,
      reason: `Bill ${invoice.number}`
    });
  });

  if (editing) {
    const index = state.invoices.findIndex((inv) => inv.id === editing.id);
    state.invoices[index] = invoice;
  } else {
    state.invoices.unshift(invoice);
  }

  // Record the sale-on-account leg at the FULL total. The customer's running
  // balance is then credit(total) - receipt(paid) = due, so partial bills show
  // the real outstanding amount and fully-paid bills net to zero.
  if (total > 0) {
    state.ledger.unshift({
      id: uid(),
      date,
      party: invoice.customerName,
      partyType: "customer",
      type: "credit",
      amount: total,
      note: `Bill ${invoice.number}`
    });
  }
  if (paid > 0) {
    state.ledger.unshift({
      id: uid(),
      date,
      party: invoice.customerName,
      partyType: "customer",
      type: "receipt",
      amount: paid,
      note: `Bill ${invoice.number}`
    });
  }

  const wasEditing = !!editing;
  persist();
  toast(wasEditing ? `Bill ${invoice.number} updated` : `Bill ${invoice.number} saved`);
  editingInvoiceId = null;
  clearBill();
  renderAll();
}

function editInvoice(id) {
  const invoice = state.invoices.find((item) => item.id === id);
  if (!invoice || invoice.voided) return;
  if (billLines.length > 0 && editingInvoiceId !== id) {
    if (!confirm("Editing this bill will replace your current unsaved bill. Continue?")) return;
  }
  editingInvoiceId = id;
  billLines = invoice.lines.map((line) => ({ ...line }));
  els.customerName.value = invoice.customerName;
  els.customerPhone.value = invoice.customerPhone || "";
  els.customerAddress.value = invoice.customerAddress || "";
  els.paymentMode.value = invoice.paymentMode;
  els.gstType.value = invoice.gstType || "local";
  els.discountAmount.value = invoice.discount;
  els.paidAmount.value = invoice.paid;
  if (els.previewInvoiceNo) els.previewInvoiceNo.textContent = invoice.number;
  switchView("billing");
  toast(`Editing bill ${invoice.number}`);
}

function updateBillMode() {
  const invoice = editingInvoiceId ? state.invoices.find((inv) => inv.id === editingInvoiceId) : null;
  if (els.saveBillButton) els.saveBillButton.textContent = invoice ? "Update Bill" : "Save Bill";
  if (els.billEditNote) {
    els.billEditNote.style.display = invoice ? "inline-block" : "none";
    els.billEditNote.textContent = invoice ? `EDITING ${invoice.number} — Clear to cancel` : "";
  }
}

function nextInvoiceNumber() {
  const year = new Date().getFullYear().toString().slice(-2);
  state.lastInvoiceSeq = (state.lastInvoiceSeq || 0) + 1;
  return `B${year}-${String(state.lastInvoiceSeq).padStart(4, "0")}`;
}

function clearBill() {
  billLines = [];
  editingInvoiceId = null;
  els.customerName.value = "";
  els.customerPhone.value = "";
  els.customerAddress.value = "";
  if (els.previewInvoiceNo) els.previewInvoiceNo.textContent = "DRAFT";
  els.paymentMode.value = "cash";
  els.gstType.value = "local";
  els.discountAmount.value = "0";
  els.paidAmount.value = "0";
  els.billQty.value = "1";
  els.billRate.value = "";
  els.billGstRate.value = "18";
  els.gstMode.value = "exclusive";
  renderProductOptions();
  syncPaidWithPaymentMode();
  renderBill();
}

function renderInvoices() {
  const query = els.billSearch.value.toLowerCase();
  const invoices = state.invoices.filter((invoice) => {
    return `${invoice.number} ${invoice.customerName}`.toLowerCase().includes(query);
  });
  els.invoiceRows.innerHTML = invoices.map((invoice) => {
    const inactive = invoice.voided || invoice.returned;
    const badge = invoice.voided
      ? ' <span class="void-badge">VOID</span>'
      : invoice.returned
        ? ' <span class="void-badge return-badge">RETURN</span>'
        : "";
    const id = escapeHtml(invoice.id);
    const adjusted = invoice.hasReturn && !inactive ? ' <span class="muted-tag">part-return</span>' : "";
    return `
    <tr class="${inactive ? "voided-row" : ""}">
      <td>${escapeHtml(invoice.number)}${badge}${adjusted}</td>
      <td>${formatDate(invoice.date)}</td>
      <td>${escapeHtml(invoice.customerName)}</td>
      <td>${currency(invoice.total)}</td>
      <td>${currency(invoice.paid)}</td>
      <td class="${invoice.due > 0 && !inactive ? "negative" : "positive"}">${inactive ? "—" : currency(invoice.due)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="mini-button" type="button" data-print-invoice="${id}">Print</button>
        ${!inactive ? `<button class="mini-button" type="button" data-edit-invoice="${id}">Edit</button>` : ""}
        ${!inactive ? `<button class="mini-button" type="button" data-return-invoice="${id}">Return</button>` : ""}
        ${!inactive ? `<button class="mini-button danger" type="button" data-void-invoice="${id}">Void</button>` : ""}
      </td>
    </tr>`;
  }).join("") || emptyRow(7);

  els.invoiceRows.querySelectorAll("[data-print-invoice]").forEach((button) => {
    button.addEventListener("click", () => printSavedInvoice(button.dataset.printInvoice));
  });
  els.invoiceRows.querySelectorAll("[data-edit-invoice]").forEach((button) => {
    button.addEventListener("click", () => editInvoice(button.dataset.editInvoice));
  });
  els.invoiceRows.querySelectorAll("[data-return-invoice]").forEach((button) => {
    button.addEventListener("click", () => openReturnModal(button.dataset.returnInvoice));
  });
  els.invoiceRows.querySelectorAll("[data-void-invoice]").forEach((button) => {
    button.addEventListener("click", () => voidInvoice(button.dataset.voidInvoice));
  });
}

function voidInvoice(id) {
  const invoice = state.invoices.find((item) => item.id === id);
  if (!invoice || invoice.voided) return;
  if (!confirm(`Void bill ${invoice.number}? This will reverse stock and ledger entries.`)) return;

  invoice.voided = true;
  const now = new Date().toISOString();

  invoice.lines.forEach((line) => {
    const product = findProduct(line.productId);
    if (product) {
      product.stock = roundStock(product.stock + line.qty);
      state.movements.unshift({
        id: uid(),
        date: now,
        productId: product.id,
        productName: product.name,
        type: "in",
        qty: line.qty,
        reason: `Void ${invoice.number}`
      });
    }
  });

  const billNote = `Bill ${invoice.number}`;
  const refundNote = `Refund ${invoice.number}`;
  state.ledger = state.ledger.filter((entry) => entry.note !== billNote && entry.note !== refundNote);

  persist();
  renderInvoices();
  renderDashboard();
  renderStock();
  renderPartyBalances();
  renderLedger();
  renderReports();
  toast(`Bill ${invoice.number} voided`);
}

// Sales return / credit note. Opens a dialog to enter the quantity returned per
// line: stock goes back in, the sale is reduced (or fully reversed if every unit
// is returned), and the bill's ledger entries are rebuilt to match.
let returningInvoiceId = null;

function openReturnModal(id) {
  const invoice = state.invoices.find((item) => item.id === id);
  if (!invoice || invoice.voided || invoice.returned) return;
  returningInvoiceId = id;
  els.returnBillNo.textContent = invoice.number;
  els.returnLines.innerHTML = invoice.lines.map((line, index) => `
    <tr>
      <td>${escapeHtml(line.name)}</td>
      <td>${line.qty} ${escapeHtml(line.unit)}</td>
      <td><input type="number" min="0" max="${line.qty}" step="0.01" value="0" data-return-idx="${index}" style="width:90px;"></td>
    </tr>
  `).join("");
  els.returnModal.classList.add("open");
}

function closeReturnModal() {
  returningInvoiceId = null;
  els.returnModal.classList.remove("open");
}

function processReturn() {
  const invoice = state.invoices.find((item) => item.id === returningInvoiceId);
  if (!invoice) return closeReturnModal();

  const returnQty = invoice.lines.map(() => 0);
  let invalid = false;
  els.returnLines.querySelectorAll("[data-return-idx]").forEach((input) => {
    const idx = Number(input.dataset.returnIdx);
    const q = Number(input.value || 0);
    if (q < 0 || q > invoice.lines[idx].qty) invalid = true;
    returnQty[idx] = q;
  });
  if (invalid) return toast("Return quantity cannot exceed the sold quantity");
  if (!returnQty.some((q) => q > 0)) return toast("Enter a quantity to return");

  const now = new Date().toISOString();
  const billNote = `Bill ${invoice.number}`;
  const oldPaid = Number(invoice.paid || 0); // cash collected on the bill before this return

  invoice.lines.forEach((line, idx) => {
    const q = returnQty[idx];
    if (q <= 0) return;
    const product = findProduct(line.productId);
    if (product) {
      product.stock = roundStock(product.stock + q);
      state.movements.unshift({
        id: uid(),
        date: now,
        productId: product.id,
        productName: product.name,
        type: "in",
        qty: q,
        reason: `Return ${invoice.number}`
      });
    }
  });

  const fullReturn = invoice.lines.every((line, idx) => returnQty[idx] >= line.qty);
  let newPaid = 0;

  if (fullReturn) {
    invoice.returned = true;
    state.ledger = state.ledger.filter((entry) => entry.note !== billNote);
  } else {
    invoice.lines = invoice.lines
      .map((line, idx) => ({ ...line, qty: roundStock(line.qty - returnQty[idx]) }))
      .filter((line) => line.qty > 0);
    invoice.hasReturn = true;
    const totals = invoiceTotalsFromLines(invoice.lines, invoice.discount || 0, invoice.gstType || "local");
    invoice.taxableSubtotal = totals.taxable;
    invoice.gstTotal = totals.gst;
    invoice.cgstTotal = totals.cgst;
    invoice.sgstTotal = totals.sgst;
    invoice.igstTotal = totals.igst;
    invoice.subtotal = totals.subtotal;
    invoice.total = totals.total;
    newPaid = Math.min(oldPaid, totals.total);
    invoice.paid = newPaid;
    invoice.due = Math.max(0, totals.total - newPaid);
    state.ledger = state.ledger.filter((entry) => entry.note !== billNote);
    if (invoice.total > 0) {
      state.ledger.unshift({ id: uid(), date: invoice.date, party: invoice.customerName, partyType: "customer", type: "credit", amount: invoice.total, note: billNote });
    }
    if (newPaid > 0) {
      state.ledger.unshift({ id: uid(), date: invoice.date, party: invoice.customerName, partyType: "customer", type: "receipt", amount: newPaid, note: billNote });
    }
  }

  // Itemise the cash returned to the customer as an explicit Refund line.
  const refundAmount = roundStock(oldPaid - newPaid);
  if (refundAmount > 0) {
    state.ledger.unshift({
      id: uid(),
      date: now,
      party: invoice.customerName,
      partyType: "customer",
      type: "refund",
      amount: refundAmount,
      note: `Refund ${invoice.number}`
    });
  }

  persist();
  closeReturnModal();
  renderAll();
  toast(fullReturn ? `Bill ${invoice.number} fully returned` : `Return recorded for ${invoice.number}`);
}

function printSavedInvoice(id) {
  const invoice = state.invoices.find((item) => item.id === id);
  if (!invoice) return;
  if (billLines.length > 0) {
    if (!confirm("Printing will clear your current unsaved bill. Continue?")) return;
  }
  // Printing loads a scratch copy into the builder; it is not an edit session.
  editingInvoiceId = null;
  billLines = invoice.lines.map((line) => ({ ...line }));
  els.customerName.value = invoice.customerName;
  els.customerPhone.value = invoice.customerPhone || "";
  els.customerAddress.value = invoice.customerAddress || "";
  els.paymentMode.value = invoice.paymentMode;
  els.gstType.value = invoice.gstType || "local";
  els.discountAmount.value = invoice.discount;
  els.paidAmount.value = invoice.paid;
  if (els.previewInvoiceNo) els.previewInvoiceNo.textContent = invoice.number;
  renderBill();
  window.print();
}

function renderDashboard() {
  const today = todayKey();
  const todaysInvoices = state.invoices.filter((invoice) =>
    !invoice.voided && !invoice.returned && todayKey(new Date(invoice.date)) === today);
  const todaySales = todaysInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const cashReceived = state.ledger
    .filter((entry) => todayKey(new Date(entry.date)) === today && ["receipt", "income"].includes(entry.type))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const customerCredit = customerReceivable();
  const stockValue = activeProducts().reduce((sum, product) => sum + product.stock * product.purchaseRate, 0);

  // Today's profit: taxable sales − cost of goods (snapshot) − discounts.
  let todayProfit = 0;
  todaysInvoices.forEach((invoice) => {
    todayProfit -= Number(invoice.discount || 0);
    (invoice.lines || []).forEach((line) => {
      const totals = lineTotals(line);
      const product = findProduct(line.productId);
      const costRate = line.purchaseRate != null
        ? Number(line.purchaseRate)
        : (product ? Number(product.purchaseRate || 0) : 0);
      todayProfit += totals.taxable - Number(line.qty || 0) * costRate;
    });
  });

  els.todaySales.textContent = currency(todaySales);
  els.cashReceived.textContent = currency(cashReceived);
  els.customerCredit.textContent = currency(customerCredit);
  els.stockValue.textContent = currency(stockValue);
  if (els.todayProfit) els.todayProfit.textContent = currency(todayProfit);
  if (els.billCount) els.billCount.textContent = String(todaysInvoices.length);

  renderSalesChart();

  els.recentBills.innerHTML = state.invoices.slice(0, 6).map((invoice) => `
    <tr>
      <td>${escapeHtml(invoice.number)}</td>
      <td>${escapeHtml(invoice.customerName)}</td>
      <td>${currency(invoice.total)}</td>
      <td class="${invoice.due > 0 ? "negative" : "positive"}">${currency(invoice.due)}</td>
    </tr>
  `).join("") || emptyRow(4);

  const low = activeProducts().filter((product) => product.stock <= product.minStock);
  els.lowStockRows.innerHTML = low.map((product) => `
    <tr>
      <td>${escapeHtml(product.name)}</td>
      <td class="warning">${product.stock} ${escapeHtml(product.unit)}</td>
      <td>${product.minStock} ${escapeHtml(product.unit)}</td>
    </tr>
  `).join("") || emptyRow(3);
}

// Bar chart of net sales for each of the last 7 days (voided/returned excluded).
function renderSalesChart() {
  if (!els.salesChart) return;
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = todayKey(date);
    const label = new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date);
    const total = state.invoices
      .filter((inv) => !inv.voided && !inv.returned && todayKey(new Date(inv.date)) === key)
      .reduce((sum, inv) => sum + inv.total, 0);
    days.push([label, total]);
  }
  const max = Math.max(1, ...days.map((d) => d[1]));
  els.salesChart.innerHTML = days.map(([label, value]) => `
    <div class="bar-row">
      <strong>${label}</strong>
      <div class="bar-track"><div class="bar-fill" style="width: ${(value / max) * 100}%"></div></div>
      <span>${currency(value)}</span>
    </div>
  `).join("");
}

function saveProduct() {
  const name = els.productName.value.trim();
  if (!name) return toast("Enter item name");
  const payload = {
    name,
    category: els.productCategory.value.trim() || "General",
    unit: els.productUnit.value.trim() || "pcs",
    saleRate: numberValue(els.productSaleRate),
    purchaseRate: numberValue(els.productPurchaseRate),
    gstRate: numberValue(els.productGstRate),
    minStock: numberValue(els.productMinStock)
  };

  if (editingProductId) {
    const product = findProduct(editingProductId);
    Object.assign(product, payload);
  } else {
    state.products.push({ id: uid(), ...payload, stock: 0 });
  }

  persist();
  resetProductForm();
  renderStock();
  renderProductOptions();
  renderDashboard();
  toast("Item saved");
}

function editProduct(id) {
  const product = findProduct(id);
  if (!product) return;
  editingProductId = id;
  els.productName.value = product.name;
  els.productCategory.value = product.category;
  els.productUnit.value = product.unit;
  els.productSaleRate.value = product.saleRate;
  els.productGstRate.value = product.gstRate ?? 18;
  els.productPurchaseRate.value = product.purchaseRate;
  els.productMinStock.value = product.minStock;
  els.productName.focus();
}

function resetProductForm() {
  editingProductId = null;
  els.productName.value = "";
  els.productCategory.value = "";
  els.productUnit.value = "";
  els.productSaleRate.value = "";
  els.productGstRate.value = "18";
  els.productPurchaseRate.value = "";
  els.productMinStock.value = "5";
}

function renderStock() {
  const query = els.stockSearch.value.toLowerCase();
  const showArchived = !!(els.showArchivedToggle && els.showArchivedToggle.checked);
  const source = showArchived ? state.products : activeProducts();
  const products = source
    .filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  els.stockRows.innerHTML = products.map((product) => `
    <tr class="${product.archived ? "archived-row" : ""}">
      <td>${escapeHtml(product.name)}${product.archived ? ' <span class="void-badge archive-badge">ARCHIVED</span>' : ""}</td>
      <td>${escapeHtml(product.category)}</td>
      <td>${escapeHtml(product.unit)}</td>
      <td class="${product.stock <= product.minStock ? "warning" : ""}">${product.stock}</td>
      <td>${product.gstRate ?? 0}%</td>
      <td>${currency(product.saleRate)}</td>
      <td>${currency(product.stock * product.purchaseRate)}</td>
      <td style="display:flex;gap:4px;">
        ${product.archived
          ? `<button class="mini-button" type="button" data-restore-product="${escapeHtml(product.id)}">Restore</button>`
          : `<button class="mini-button" type="button" data-edit-product="${escapeHtml(product.id)}">Edit</button>
             <button class="mini-button danger" type="button" data-delete-product="${escapeHtml(product.id)}">Delete</button>`}
      </td>
    </tr>
  `).join("") || emptyRow(7);

  els.stockRows.querySelectorAll("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => editProduct(button.dataset.editProduct));
  });
  els.stockRows.querySelectorAll("[data-delete-product]").forEach((button) => {
    button.addEventListener("click", () => deleteProduct(button.dataset.deleteProduct));
  });
  els.stockRows.querySelectorAll("[data-restore-product]").forEach((button) => {
    button.addEventListener("click", () => restoreProduct(button.dataset.restoreProduct));
  });
}

function restoreProduct(id) {
  const product = findProduct(id);
  if (!product || !product.archived) return;
  product.archived = false;
  persist();
  renderStock();
  renderProductOptions();
  renderDashboard();
  toast(`${product.name} restored`);
}

function saveMovement() {
  const product = findProduct(els.movementProduct.value);
  const qty = numberValue(els.movementQty);
  if (!product) return toast("Select an item");
  if (qty <= 0) return toast("Enter valid quantity");
  if (els.movementType.value === "out" && product.stock < qty) return toast("Not enough stock");

  const signedQty = els.movementType.value === "in" ? qty : -qty;
  product.stock = roundStock(product.stock + signedQty);
  state.movements.unshift({
    id: uid(),
    date: new Date().toISOString(),
    productId: product.id,
    productName: product.name,
    type: els.movementType.value,
    qty,
    reason: els.movementReason.value.trim() || "Adjustment"
  });
  persist();
  els.movementQty.value = "1";
  els.movementReason.value = "";
  renderStock();
  renderProductOptions();
  renderDashboard();
  toast("Stock movement saved");
}

function saveLedgerEntry() {
  const party = els.ledgerParty.value.trim();
  const amount = numberValue(els.ledgerAmount);
  if (!party) return toast("Enter party name");
  if (amount <= 0) return toast("Enter valid amount");

  state.ledger.unshift({
    id: uid(),
    date: new Date().toISOString(),
    party,
    partyType: els.ledgerPartyType.value,
    type: els.ledgerType.value,
    amount,
    note: els.ledgerNote.value.trim()
  });
  persist();
  els.ledgerParty.value = "";
  els.ledgerAmount.value = "";
  els.ledgerNote.value = "";
  renderPartyBalances();
  renderLedger();
  renderReports();
  renderDashboard();
  toast("Ledger entry saved");
}

function entrySignedAmount(entry) {
  if (["credit", "debit", "expense"].includes(entry.type)) return entry.amount;
  if (["receipt", "payment", "income"].includes(entry.type)) return -entry.amount;
  return 0;
}

function partyBalances() {
  const map = new Map();
  state.ledger.forEach((entry) => {
    const key = `${entry.party.toLowerCase()}|${entry.partyType}`;
    const current = map.get(key) || { party: entry.party, partyType: entry.partyType, balance: 0 };
    current.balance += entrySignedAmount(entry);
    map.set(key, current);
  });
  return Array.from(map.values()).filter((row) => Math.abs(row.balance) > 0.009);
}

function renderPartyBalances() {
  const query = els.ledgerSearch.value.toLowerCase();
  const rows = partyBalances().filter((row) => row.party.toLowerCase().includes(query));
  els.partyBalanceRows.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.party)}</td>
      <td>${labelForType(row.partyType)}</td>
      <td class="${row.balance > 0 ? "negative" : "positive"}">${currency(Math.abs(row.balance))}</td>
    </tr>
  `).join("") || emptyRow(3);
}

let ledgerPage = 1;
const LEDGER_PAGE_SIZE = 50;

// Entries created by a bill (note "Bill <number>") are managed by that bill and
// must not be hand-edited; only manual entries get Edit/Delete actions.
function managedLedgerNotes() {
  const notes = new Set();
  state.invoices.forEach((invoice) => {
    notes.add(`Bill ${invoice.number}`);
    notes.add(`Refund ${invoice.number}`);
  });
  return notes;
}

function isBillLedgerEntry(entry) {
  return managedLedgerNotes().has(entry.note);
}

function renderLedger() {
  const visible = state.ledger.slice(0, ledgerPage * LEDGER_PAGE_SIZE);
  const hasMore = state.ledger.length > visible.length;
  const billNotes = managedLedgerNotes();
  els.ledgerRows.innerHTML = visible.map((entry) => {
    const id = escapeHtml(entry.id);
    const managed = billNotes.has(entry.note);
    return `
    <tr>
      <td>${formatDate(entry.date)}</td>
      <td>${escapeHtml(entry.party)}</td>
      <td>${labelForType(entry.type)}</td>
      <td>${currency(entry.amount)}</td>
      <td>${escapeHtml(entry.note || "")}</td>
      <td style="display:flex;gap:4px;">
        ${managed
          ? '<span class="muted-tag">From bill</span>'
          : `<button class="mini-button" type="button" data-edit-ledger="${id}">Edit</button>
             <button class="mini-button danger" type="button" data-delete-ledger="${id}">Delete</button>`}
      </td>
    </tr>`;
  }).join("") || emptyRow(6);

  els.ledgerRows.querySelectorAll("[data-edit-ledger]").forEach((button) => {
    button.addEventListener("click", () => editLedgerEntry(button.dataset.editLedger));
  });
  els.ledgerRows.querySelectorAll("[data-delete-ledger]").forEach((button) => {
    button.addEventListener("click", () => deleteLedgerEntry(button.dataset.deleteLedger));
  });

  if (els.ledgerLoadMore) {
    els.ledgerLoadMore.style.display = hasMore ? "block" : "none";
    els.ledgerCount.textContent = `Showing ${visible.length} of ${state.ledger.length} entries`;
  }
}

function deleteLedgerEntry(id) {
  const entry = state.ledger.find((item) => item.id === id);
  if (!entry || isBillLedgerEntry(entry)) return;
  if (!confirm(`Delete this ${labelForType(entry.type)} entry for ${entry.party}?`)) return;
  state.ledger = state.ledger.filter((item) => item.id !== id);
  persist();
  renderPartyBalances();
  renderLedger();
  renderReports();
  renderDashboard();
  toast("Ledger entry deleted");
}

// Load a manual entry into the form and remove it, so re-saving applies the edit.
function editLedgerEntry(id) {
  const entry = state.ledger.find((item) => item.id === id);
  if (!entry || isBillLedgerEntry(entry)) return;
  els.ledgerParty.value = entry.party;
  els.ledgerPartyType.value = entry.partyType;
  els.ledgerType.value = entry.type;
  els.ledgerAmount.value = entry.amount;
  els.ledgerNote.value = entry.note || "";
  state.ledger = state.ledger.filter((item) => item.id !== id);
  persist();
  renderPartyBalances();
  renderLedger();
  renderReports();
  renderDashboard();
  els.ledgerParty.focus();
  toast("Editing entry — change and Save");
}

function getReportDateRange() {
  const from = els.reportFrom ? els.reportFrom.value : "";
  const to = els.reportTo ? els.reportTo.value : "";
  return { from, to };
}

function inReportRange(isoDate) {
  const { from, to } = getReportDateRange();
  const key = todayKey(new Date(isoDate));
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

function renderReports() {
  const filteredInvoices = state.invoices.filter((inv) => !inv.voided && !inv.returned && inReportRange(inv.date));
  const filteredLedger = state.ledger.filter((e) => inReportRange(e.date));

  const sales = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const collection = filteredLedger.filter((entry) => entry.type === "receipt").reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = filteredLedger.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const payable = supplierPayable();

  els.reportSales.textContent = currency(sales);
  els.reportCollection.textContent = currency(collection);
  els.reportExpenses.textContent = currency(expenses);
  els.supplierPayable.textContent = currency(payable);

  const receivable = partyBalances()
    .filter((row) => row.partyType === "customer" && row.balance > 0)
    .reduce((sum, row) => sum + row.balance, 0);

  const values = [
    ["Sales", sales],
    ["Collection", collection],
    ["Expenses", expenses],
    ["Credit Due", receivable],
    ["Payable", payable]
  ];
  const max = Math.max(1, ...values.map((row) => row[1]));
  els.reportBars.innerHTML = values.map(([label, value]) => `
    <div class="bar-row">
      <strong>${label}</strong>
      <div class="bar-track"><div class="bar-fill" style="width: ${(value / max) * 100}%"></div></div>
      <span>${currency(value)}</span>
    </div>
  `).join("");

  renderProfit(filteredInvoices);
  renderGstSummary(filteredInvoices);
}

// Profit = taxable sales - cost of goods (current purchase rate) - discounts.
// GST is excluded because it is collected on the government's behalf.
function renderProfit(invoices) {
  if (!els.profitGross) return;
  let taxableSales = 0;
  let cogs = 0;
  let discounts = 0;
  const byItem = new Map();

  invoices.forEach((invoice) => {
    discounts += Number(invoice.discount || 0);
    (invoice.lines || []).forEach((line) => {
      const totals = lineTotals(line);
      const product = findProduct(line.productId);
      // Prefer the cost snapshotted at sale time; fall back to the product's
      // current purchase rate for bills saved before snapshots existed.
      const costRate = line.purchaseRate != null
        ? Number(line.purchaseRate)
        : (product ? Number(product.purchaseRate || 0) : 0);
      const cost = Number(line.qty || 0) * costRate;
      taxableSales += totals.taxable;
      cogs += cost;
      const row = byItem.get(line.name) || { name: line.name, qty: 0, sale: 0, cost: 0 };
      row.qty += Number(line.qty || 0);
      row.sale += totals.taxable;
      row.cost += cost;
      byItem.set(line.name, row);
    });
  });

  const grossProfit = taxableSales - cogs - discounts;
  const margin = taxableSales > 0 ? (grossProfit / taxableSales) * 100 : 0;

  els.profitSales.textContent = currency(taxableSales);
  els.profitCogs.textContent = currency(cogs);
  els.profitDiscounts.textContent = currency(discounts);
  els.profitGross.textContent = currency(grossProfit);
  els.profitMargin.textContent = `${margin.toFixed(1)}%`;

  const rows = Array.from(byItem.values()).sort((a, b) => (b.sale - b.cost) - (a.sale - a.cost));
  els.profitRows.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${roundStock(row.qty)}</td>
      <td>${currency(row.sale)}</td>
      <td>${currency(row.cost)}</td>
      <td class="${row.sale - row.cost >= 0 ? "positive" : "negative"}">${currency(row.sale - row.cost)}</td>
    </tr>
  `).join("") || emptyRow(5);
}

function renderGstSummary(invoices) {
  if (!els.gstSummaryRows) return;
  const bySlab = new Map();
  invoices.forEach((invoice) => {
    const isIgst = (invoice.gstType || "local") === "igst";
    (invoice.lines || []).forEach((line) => {
      const totals = lineTotals(line);
      const slab = Number(line.gstRate || 0);
      const row = bySlab.get(slab) || { slab, taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0 };
      row.taxable += totals.taxable;
      row.gst += totals.gst;
      if (isIgst) {
        row.igst += totals.gst;
      } else {
        row.cgst += totals.gst / 2;
        row.sgst += totals.gst / 2;
      }
      bySlab.set(slab, row);
    });
  });

  const rows = Array.from(bySlab.values()).sort((a, b) => a.slab - b.slab);
  const totals = rows.reduce((acc, row) => ({
    taxable: acc.taxable + row.taxable,
    cgst: acc.cgst + row.cgst,
    sgst: acc.sgst + row.sgst,
    igst: acc.igst + row.igst,
    gst: acc.gst + row.gst
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0 });

  els.gstSummaryRows.innerHTML = (rows.map((row) => `
    <tr>
      <td>${row.slab}%</td>
      <td>${currency(row.taxable)}</td>
      <td>${currency(row.cgst)}</td>
      <td>${currency(row.sgst)}</td>
      <td>${currency(row.igst)}</td>
      <td>${currency(row.gst)}</td>
    </tr>
  `).join("") + (rows.length ? `
    <tr class="gst-total-row">
      <td><strong>Total</strong></td>
      <td><strong>${currency(totals.taxable)}</strong></td>
      <td><strong>${currency(totals.cgst)}</strong></td>
      <td><strong>${currency(totals.sgst)}</strong></td>
      <td><strong>${currency(totals.igst)}</strong></td>
      <td><strong>${currency(totals.gst)}</strong></td>
    </tr>` : "")) || emptyRow(6);
}

function customerReceivable() {
  return partyBalances()
    .filter((row) => row.partyType === "customer" && row.balance > 0)
    .reduce((sum, row) => sum + row.balance, 0);
}

function supplierPayable() {
  return partyBalances()
    .filter((row) => row.partyType === "supplier" && row.balance > 0)
    .reduce((sum, row) => sum + row.balance, 0);
}

function labelForType(value) {
  const labels = {
    customer: "Customer",
    supplier: "Supplier",
    other: "Other",
    credit: "Credit",
    receipt: "Receipt",
    debit: "Debit",
    payment: "Payment",
    expense: "Expense",
    income: "Income",
    refund: "Refund"
  };
  return labels[value] || value;
}

function roundStock(value) {
  return Math.round(value * 1000) / 1000;
}

function emptyRow(colspan) {
  return `<tr><td colspan="${colspan}" class="empty-cell">No records yet</td></tr>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, `hardware-shop-backup-${todayKey()}.json`);
}

async function initDriveAutoSave() {
  if (!supportsDriveFiles()) {
    updateDataFileStatus("Drive auto-save needs Chrome or Edge. Use Download Backup in this browser.", "danger");
    return;
  }

  const handle = await getRememberedHandle();
  if (!handle) {
    updateDataFileStatus("No drive file selected. Click Save To Drive once.", "warning");
    return;
  }

  const permission = await queryHandlePermission(handle);
  if (permission === "granted") {
    await activateDataFileHandle(handle, { loadFromFile: true });
    return;
  }

  updateDataFileStatus(`Reconnect needed: ${handle.name}. Click Set Auto-Save.`, "warning");
}

async function connectAutoSave() {
  if (!supportsDriveFiles()) {
    downloadBackup();
    toast("Browser used download backup instead");
    return;
  }

  const remembered = await getRememberedHandle();
  if (remembered) {
    const permission = await requestHandlePermission(remembered);
    if (permission === "granted") {
      await activateDataFileHandle(remembered, { loadFromFile: true });
      toast("Drive auto-save connected");
      return;
    }
  }

  await saveToDrive();
}

async function saveToDrive() {
  if (!supportsDriveFiles()) {
    downloadBackup();
    toast("Browser used download backup instead");
    return;
  }

  try {
    dataFileHandle = await window.showSaveFilePicker({
      suggestedName: `hardware-shop-data-${todayKey()}.json`,
      types: [
        {
          description: "Hardware shop data",
          accept: { "application/json": [".json"] }
        }
      ]
    });
    await rememberHandle(dataFileHandle);
    await writeStateToHandle(dataFileHandle);
    updateDataFileStatus(`Selected: ${dataFileHandle.name}. Auto-save is on.`, "good");
    toast("Data saved to drive");
  } catch (error) {
    if (error.name !== "AbortError") toast("Could not save to drive");
  }
}

async function saveAgainToDrive() {
  if (!dataFileHandle) return saveToDrive();
  try {
    const permission = await requestHandlePermission(dataFileHandle);
    if (permission !== "granted") {
      updateDataFileStatus("Permission needed. Click Save Again and allow file access.", "warning");
      return;
    }
    await writeStateToHandle(dataFileHandle);
    updateDataFileStatus(`Selected: ${dataFileHandle.name}. Auto-save is on.`, "good");
    toast("Data saved again");
  } catch {
    dataFileHandle = null;
    forgetRememberedHandle();
    updateDataFileStatus("Select the data file again", "warning");
    toast("Please choose the drive file again");
  }
}

async function openDataFile() {
  if (!supportsDriveFiles()) {
    els.restoreInput.click();
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "Hardware shop data",
          accept: { "application/json": [".json"] }
        }
      ]
    });
    const file = await handle.getFile();
    const parsed = JSON.parse(await file.text());
    state = normalizeState(parsed);
    await activateDataFileHandle(handle, { loadFromFile: false });
    persistLocalOnly();
    toast("Data file opened");
  } catch (error) {
    if (error.name !== "AbortError") toast("Data file could not be opened");
  }
}

async function activateDataFileHandle(handle, { loadFromFile }) {
  dataFileHandle = handle;
  await rememberHandle(handle);

  if (loadFromFile) {
    try {
      const file = await handle.getFile();
      const parsed = JSON.parse(await file.text());
      state = normalizeState(parsed);
      persistLocalOnly();
    } catch {
      updateDataFileStatus("Saved file could not be read. Choose the data file again.", "danger");
      return;
    }
  }

  hydrateSettings();
  clearBill();
  renderAll();
  updateDataFileStatus(`Selected: ${handle.name}. Auto-save is on.`, "good");
}

function supportsDriveFiles() {
  return "showSaveFilePicker" in window && "showOpenFilePicker" in window && "indexedDB" in window;
}

async function writeStateToHandle(handle) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(state, null, 2));
  await writable.close();
}

async function queryHandlePermission(handle) {
  if (!handle?.queryPermission) return "denied";
  try {
    return await handle.queryPermission({ mode: "readwrite" });
  } catch {
    return "denied";
  }
}

async function requestHandlePermission(handle) {
  if (!handle?.requestPermission) return "denied";
  try {
    return await handle.requestPermission({ mode: "readwrite" });
  } catch {
    return "denied";
  }
}

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(HANDLE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function rememberHandle(handle) {
  if (!supportsDriveFiles()) return;
  try {
    const db = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      tx.objectStore(HANDLE_STORE_NAME).put(handle, AUTO_SAVE_HANDLE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Auto-save still works for this open session even if the handle cannot be remembered.
  }
}

async function getRememberedHandle() {
  if (!supportsDriveFiles()) return null;
  try {
    const db = await openHandleDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readonly");
      const request = tx.objectStore(HANDLE_STORE_NAME).get(AUTO_SAVE_HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

async function forgetRememberedHandle() {
  if (!supportsDriveFiles()) return;
  try {
    const db = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      tx.objectStore(HANDLE_STORE_NAME).delete(AUTO_SAVE_HANDLE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // No action needed if the browser cannot clear the remembered handle.
  }
}

function queueDriveAutoSave() {
  if (!dataFileHandle) return;
  const handle = dataFileHandle;
  pendingDriveSave = pendingDriveSave
    .then(async () => {
      const permission = await queryHandlePermission(handle);
      if (permission !== "granted") throw new Error("File permission is not granted");
      await writeStateToHandle(handle);
    })
    .then(() => {
      if (dataFileHandle === handle) updateDataFileStatus(`Selected: ${handle.name}. Auto-saved.`, "good");
    })
    .catch(() => {
      if (dataFileHandle === handle) {
        dataFileHandle = null;
        updateDataFileStatus("Auto-save paused. Click Set Auto-Save to reconnect.", "warning");
      }
    });
}

function updateDataFileStatus(message, tone = dataFileHandle ? "good" : "warning") {
  if (els.dataFileStatus) els.dataFileStatus.textContent = message;
  if (els.saveAgainButton) els.saveAgainButton.disabled = !dataFileHandle;
  if (els.autoSaveStatus) {
    els.autoSaveStatus.textContent = dataFileHandle ? "Drive auto-save on" : "Drive auto-save off";
    els.autoSaveStatus.className = `autosave-pill ${tone}`;
  }
  if (els.autoSaveSetupButton) {
    els.autoSaveSetupButton.textContent = dataFileHandle ? "Reconnect Auto-Save" : "Set Auto-Save";
  }
}

function restoreBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = normalizeState(parsed);
      dataFileHandle = null;
      forgetRememberedHandle();
      persist();
      hydrateSettings();
      clearBill();
      renderAll();
      updateDataFileStatus("No drive file selected", "warning");
      toast("Backup restored");
    } catch {
      toast("Backup file could not be read");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

// One-time migration: rebuild the bill-derived ledger entries (the customer
// credit + receipt legs) from the saved invoices using the corrected logic
// — credit(total) + receipt(paid) = due. Manual ledger entries are preserved.
// Idempotent: safe to run more than once.
function rebuildBillLedger() {
  const billNotes = new Set(state.invoices.map((invoice) => `Bill ${invoice.number}`));
  const isBillDerived = (entry) =>
    billNotes.has(entry.note) &&
    entry.partyType === "customer" &&
    ["credit", "receipt"].includes(entry.type);

  const manual = state.ledger.filter((entry) => !isBillDerived(entry));
  const rebuilt = [];

  state.invoices.forEach((invoice) => {
    if (invoice.voided) return; // voided bills carry no ledger entries
    const note = `Bill ${invoice.number}`;
    const total = Number(invoice.total || 0);
    const paid = Number(invoice.paid || 0);
    if (total > 0) {
      rebuilt.push({ id: uid(), date: invoice.date, party: invoice.customerName, partyType: "customer", type: "credit", amount: total, note });
    }
    if (paid > 0) {
      rebuilt.push({ id: uid(), date: invoice.date, party: invoice.customerName, partyType: "customer", type: "receipt", amount: paid, note });
    }
  });

  state.ledger = [...manual, ...rebuilt].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function recalcBalances() {
  if (!confirm(
    "Recalculate customer balances from saved bills?\n\n" +
    "This rewrites bill-related ledger entries to the corrected amounts. " +
    "Your manual entries are kept. Download a backup first if you are unsure."
  )) return;
  rebuildBillLedger();
  persist();
  renderAll();
  toast("Balances recalculated");
}

function resetDemoData() {
  if (!confirm("Reset all saved data and load demo items?")) return;
  state = structuredClone(emptyState);
  billLines = [];
  dataFileHandle = null;
  forgetRememberedHandle();
  persist();
  hydrateSettings();
  renderAll();
  updateDataFileStatus("No drive file selected", "warning");
  toast("Demo data loaded");
}

function exportCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

function downloadAllCsv() {
  const date = todayKey();
  const files = [
    [`settings-${date}.csv`, settingsCsvRows()],
    [`stock-register-${date}.csv`, stockCsvRows()],
    [`bills-${date}.csv`, invoiceCsvRows()],
    [`bill-items-${date}.csv`, invoiceItemsCsvRows()],
    [`ledger-${date}.csv`, ledgerCsvRows()],
    [`stock-movements-${date}.csv`, movementCsvRows()]
  ];

  files.forEach(([filename, rows], index) => {
    setTimeout(() => exportCsv(filename, rows), index * 250);
  });
  toast("CSV downloads started");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function stockCsvRows() {
  return [
    ["Item", "Category", "Unit", "Qty", "GST %", "Sale Rate", "Purchase Rate", "Stock Value"],
    ...state.products.map((product) => [
      product.name,
      product.category,
      product.unit,
      product.stock,
      product.gstRate ?? 0,
      product.saleRate,
      product.purchaseRate,
      product.stock * product.purchaseRate
    ])
  ];
}

function settingsCsvRows() {
  return [
    ["Field", "Value"],
    ["Shop Name", state.settings.shopName || ""],
    ["Phone", state.settings.phone || ""],
    ["Address", state.settings.address || ""],
    ["GST / Tax ID", state.settings.taxId || ""],
    ["Export Date", new Date().toISOString()]
  ];
}

function ledgerCsvRows() {
  return [
    ["Date", "Party", "Party Type", "Entry Type", "Amount", "Note"],
    ...state.ledger.map((entry) => [
      formatDate(entry.date),
      entry.party,
      entry.partyType,
      entry.type,
      entry.amount,
      entry.note || ""
    ])
  ];
}

function invoiceCsvRows() {
  return [
    ["Bill No", "Date", "Customer", "Phone", "Taxable", "GST", "CGST", "SGST", "IGST", "Total", "Paid", "Due", "Payment Mode"],
    ...state.invoices.map((invoice) => [
      invoice.number,
      formatDate(invoice.date),
      invoice.customerName,
      invoice.customerPhone || "",
      invoice.taxableSubtotal || 0,
      invoice.gstTotal || 0,
      invoice.cgstTotal || 0,
      invoice.sgstTotal || 0,
      invoice.igstTotal || 0,
      invoice.total,
      invoice.paid,
      invoice.due,
      invoice.paymentMode
    ])
  ];
}

function invoiceItemsCsvRows() {
  return [
    ["Bill No", "Date", "Customer", "Product", "Qty", "Unit", "Rate", "Rate Type", "GST %", "Taxable", "GST", "Amount"],
    ...state.invoices.flatMap((invoice) => invoice.lines.map((line) => {
      const totals = lineTotals(line);
      return [
        invoice.number,
        formatDate(invoice.date),
        invoice.customerName,
        line.name,
        line.qty,
        line.unit,
        line.rate,
        line.taxMode || "exclusive",
        line.gstRate || 0,
        totals.taxable,
        totals.gst,
        totals.gross
      ];
    }))
  ];
}

function movementCsvRows() {
  return [
    ["Date", "Item", "Type", "Qty", "Reason"],
    ...state.movements.map((movement) => [
      formatDate(movement.date),
      movement.productName,
      movement.type,
      movement.qty,
      movement.reason || ""
    ])
  ];
}
