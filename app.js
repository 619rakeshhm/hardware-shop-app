const STORAGE_KEY = "hardware-shop-manager-v1";
const HANDLE_DB_NAME = "hardware-shop-manager-files";
const HANDLE_STORE_NAME = "handles";
const AUTO_SAVE_HANDLE_KEY = "auto-save-file";

const emptyState = {
  settings: {
    shopName: "My Hardware Shop",
    phone: "",
    address: "",
    taxId: ""
  },
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
let billLines = [];
let dataFileHandle = null;
let pendingDriveSave = Promise.resolve();

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  setToday();
  hydrateSettings();
  renderAll();
  initDriveAutoSave();
});

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
  els.restoreInput.addEventListener("change", restoreBackup);
  els.resetDataButton.addEventListener("click", resetDemoData);

  els.billItem.addEventListener("change", setRateFromSelectedProduct);
  els.addLineButton.addEventListener("click", addBillLine);
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
  els.saveMovementButton.addEventListener("click", saveMovement);
  els.exportStockButton.addEventListener("click", () => exportCsv("stock-register.csv", stockCsvRows()));

  els.saveLedgerButton.addEventListener("click", saveLedgerEntry);
  els.ledgerSearch.addEventListener("input", renderPartyBalances);
  els.exportLedgerButton.addEventListener("click", () => exportCsv("ledger.csv", ledgerCsvRows()));
  els.exportInvoicesButton.addEventListener("click", () => exportCsv("bills.csv", invoiceCsvRows()));

  els.saveSettingsButton.addEventListener("click", saveSettings);
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
  els.viewTitle.textContent = document.querySelector(`.nav-item[data-view="${view}"]`).textContent;
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
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function renderSettings() {
  const { shopName, phone, address, taxId } = state.settings;
  els.shopNameMini.textContent = shopName || "My Hardware Shop";
  els.shopPhoneMini.textContent = phone || "Add shop phone";
  els.shopNamePreview.textContent = shopName || "My Hardware Shop";
  els.shopAddressPreview.textContent = address || "Shop address";
  els.shopPhonePreview.textContent = [phone, taxId].filter(Boolean).join(" | ") || "Phone";
}

function hydrateSettings() {
  els.shopNameInput.value = state.settings.shopName || "";
  els.shopPhoneInput.value = state.settings.phone || "";
  els.shopAddressInput.value = state.settings.address || "";
  els.shopTaxInput.value = state.settings.taxId || "";
}

function saveSettings() {
  state.settings = {
    shopName: els.shopNameInput.value.trim() || "My Hardware Shop",
    phone: els.shopPhoneInput.value.trim(),
    address: els.shopAddressInput.value.trim(),
    taxId: els.shopTaxInput.value.trim()
  };
  persist();
  renderSettings();
  toast("Shop details saved");
}

function renderProductOptions() {
  const options = state.products
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => `<option value="${product.id}">${escapeHtml(product.name)} (${product.stock} ${escapeHtml(product.unit)})</option>`)
    .join("");
  els.billItem.innerHTML = options || "<option value=''>No items</option>";
  els.movementProduct.innerHTML = options || "<option value=''>No items</option>";
  setRateFromSelectedProduct();
}

function setRateFromSelectedProduct() {
  const product = findProduct(els.billItem.value);
  if (product && !els.billRate.value) {
    els.billRate.value = product.saleRate;
  }
  if (product) {
    els.billGstRate.value = product.gstRate ?? 18;
  }
}

function findProduct(id) {
  return state.products.find((product) => product.id === id);
}

function addBillLine() {
  const product = findProduct(els.billItem.value);
  const qty = numberValue(els.billQty);
  const rate = numberValue(els.billRate);
  const gstRate = numberValue(els.billGstRate);
  const taxMode = els.gstMode.value;
  if (!product) return toast("Add a stock item first");
  if (qty <= 0 || rate < 0 || gstRate < 0) return toast("Enter valid quantity, rate, and GST");
  if (qty > product.stock) return toast(`Only ${product.stock} ${product.unit} available`);

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
  syncPaidWithPaymentMode();
  renderBill();
}

function removeBillLine(index) {
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
      <td><button class="mini-button danger" type="button" data-remove-line="${index}">Remove</button></td>
    </tr>
  `).join("") || emptyRow(6);

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
}

function saveBill() {
  if (!billLines.length) return toast("Add at least one item");
  const total = billTotal();
  const split = gstSplitTotals();
  const paid = Math.min(numberValue(els.paidAmount), total);
  const due = Math.max(0, total - paid);
  const now = new Date().toISOString();
  const invoice = {
    id: uid(),
    number: nextInvoiceNumber(),
    date: now,
    customerName: els.customerName.value.trim() || "Cash customer",
    customerPhone: els.customerPhone.value.trim(),
    paymentMode: els.paymentMode.value,
    gstType: els.gstType.value,
    lines: billLines.map((line) => ({ ...line })),
    taxableSubtotal: billTaxableSubtotal(),
    gstTotal: billGstTotal(),
    cgstTotal: split.cgst,
    sgstTotal: split.sgst,
    igstTotal: split.igst,
    subtotal: billSubtotal(),
    discount: numberValue(els.discountAmount),
    total,
    paid,
    due
  };

  for (const line of invoice.lines) {
    const product = findProduct(line.productId);
    if (!product || product.stock < line.qty) return toast(`${line.name} stock changed. Check quantity.`);
  }

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

  state.invoices.unshift(invoice);
  if (due > 0) {
    state.ledger.unshift({
      id: uid(),
      date: now,
      party: invoice.customerName,
      partyType: "customer",
      type: "credit",
      amount: due,
      note: `Bill ${invoice.number}`
    });
  }
  if (paid > 0) {
    state.ledger.unshift({
      id: uid(),
      date: now,
      party: invoice.customerName,
      partyType: "customer",
      type: "receipt",
      amount: paid,
      note: `Bill ${invoice.number}`
    });
  }

  persist();
  toast(`Bill ${invoice.number} saved`);
  clearBill();
  renderAll();
}

function nextInvoiceNumber() {
  const year = new Date().getFullYear().toString().slice(-2);
  const next = state.invoices.length + 1;
  return `B${year}-${String(next).padStart(4, "0")}`;
}

function clearBill() {
  billLines = [];
  els.customerName.value = "";
  els.customerPhone.value = "";
  els.paymentMode.value = "cash";
  els.gstType.value = "local";
  els.discountAmount.value = "0";
  els.paidAmount.value = "0";
  els.billQty.value = "1";
  els.billRate.value = "";
  setRateFromSelectedProduct();
  renderBill();
}

function renderInvoices() {
  const query = els.billSearch.value.toLowerCase();
  const invoices = state.invoices.filter((invoice) => {
    return `${invoice.number} ${invoice.customerName}`.toLowerCase().includes(query);
  });
  els.invoiceRows.innerHTML = invoices.map((invoice) => `
    <tr>
      <td>${invoice.number}</td>
      <td>${formatDate(invoice.date)}</td>
      <td>${escapeHtml(invoice.customerName)}</td>
      <td>${currency(invoice.total)}</td>
      <td>${currency(invoice.paid)}</td>
      <td class="${invoice.due > 0 ? "negative" : "positive"}">${currency(invoice.due)}</td>
      <td><button class="mini-button" type="button" data-print-invoice="${invoice.id}">Print</button></td>
    </tr>
  `).join("") || emptyRow(8);

  els.invoiceRows.querySelectorAll("[data-print-invoice]").forEach((button) => {
    button.addEventListener("click", () => printSavedInvoice(button.dataset.printInvoice));
  });
}

function printSavedInvoice(id) {
  const invoice = state.invoices.find((item) => item.id === id);
  if (!invoice) return;
  billLines = invoice.lines.map((line) => ({ ...line }));
  els.customerName.value = invoice.customerName;
  els.customerPhone.value = invoice.customerPhone || "";
  els.paymentMode.value = invoice.paymentMode;
  els.gstType.value = invoice.gstType || "local";
  els.discountAmount.value = invoice.discount;
  els.paidAmount.value = invoice.paid;
  renderBill();
  window.print();
}

function renderDashboard() {
  const today = todayKey();
  const todaysInvoices = state.invoices.filter((invoice) => todayKey(new Date(invoice.date)) === today);
  const todaySales = todaysInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const cashReceived = state.ledger
    .filter((entry) => todayKey(new Date(entry.date)) === today && ["receipt", "income"].includes(entry.type))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const customerCredit = customerReceivable();
  const stockValue = state.products.reduce((sum, product) => sum + product.stock * product.purchaseRate, 0);

  els.todaySales.textContent = currency(todaySales);
  els.cashReceived.textContent = currency(cashReceived);
  els.customerCredit.textContent = currency(customerCredit);
  els.stockValue.textContent = currency(stockValue);

  els.recentBills.innerHTML = state.invoices.slice(0, 6).map((invoice) => `
    <tr>
      <td>${invoice.number}</td>
      <td>${escapeHtml(invoice.customerName)}</td>
      <td>${currency(invoice.total)}</td>
      <td class="${invoice.due > 0 ? "negative" : "positive"}">${currency(invoice.due)}</td>
    </tr>
  `).join("") || emptyRow(4);

  const low = state.products.filter((product) => product.stock <= product.minStock);
  els.lowStockRows.innerHTML = low.map((product) => `
    <tr>
      <td>${escapeHtml(product.name)}</td>
      <td class="warning">${product.stock} ${escapeHtml(product.unit)}</td>
      <td>${product.minStock} ${escapeHtml(product.unit)}</td>
    </tr>
  `).join("") || emptyRow(3);
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
  renderAll();
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
  const products = state.products
    .filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  els.stockRows.innerHTML = products.map((product) => `
    <tr>
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.category)}</td>
      <td>${escapeHtml(product.unit)}</td>
      <td class="${product.stock <= product.minStock ? "warning" : ""}">${product.stock}</td>
      <td>${product.gstRate ?? 0}%</td>
      <td>${currency(product.saleRate)}</td>
      <td>${currency(product.stock * product.purchaseRate)}</td>
      <td><button class="mini-button" type="button" data-edit-product="${product.id}">Edit</button></td>
    </tr>
  `).join("") || emptyRow(7);

  els.stockRows.querySelectorAll("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => editProduct(button.dataset.editProduct));
  });
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
  renderAll();
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
  renderAll();
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

function renderLedger() {
  els.ledgerRows.innerHTML = state.ledger.slice(0, 120).map((entry) => `
    <tr>
      <td>${formatDate(entry.date)}</td>
      <td>${escapeHtml(entry.party)}</td>
      <td>${labelForType(entry.type)}</td>
      <td>${currency(entry.amount)}</td>
      <td>${escapeHtml(entry.note || "")}</td>
    </tr>
  `).join("") || emptyRow(5);
}

function renderReports() {
  const sales = state.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const collection = state.ledger.filter((entry) => entry.type === "receipt").reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = state.ledger.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const payable = supplierPayable();

  els.reportSales.textContent = currency(sales);
  els.reportCollection.textContent = currency(collection);
  els.reportExpenses.textContent = currency(expenses);
  els.supplierPayable.textContent = currency(payable);

  const values = [
    ["Sales", sales],
    ["Collection", collection],
    ["Expenses", expenses],
    ["Credit Due", customerReceivable()],
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
    income: "Income"
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
