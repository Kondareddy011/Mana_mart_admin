/**
 * Mana Grocery Hub — Vijayawada Admin Portal
 * Standalone Client Logic & Real-Time API Bridge
 */

const API_BASE = window.API_BASE_URL || localStorage.getItem('mana_admin_api_url') || 'http://127.0.0.1:8008/api';

// Application State
const state = {
  activeTab: 'dashboard',
  isAdmin: false,
  adminUser: { 
    name: 'V. Krishna Rao', 
    email: 'admin@groceryhub.in', 
    phone: '+91 98480 22338',
    role: 'Regional Operations Director',
    hubId: 'MGH-OPS-2026'
  },
  stats: null,
  demand: [],
  packingSlips: [],
  orders: [],
  products: [],
  batches: [],
  apartments: [],
  currentBatch: null,
  checklistState: {}, // orderId-itemId: boolean
  isOnline: false
};

// Fallback seed data in case backend server is warming up
const fallbackSeed = {
  stats: {
    total_orders: 0,
    gross_merchandise_value: 0.00,
    total_community_savings: 0.00,
    total_weight_kg: 0.0,
    orders_pending_payment: 0,
    orders_confirmed: 0,
    orders_packed: 0,
    orders_delivered: 0,
    active_apartments_count: 5,
    current_batch_name: "November 2026 Sourcing Batch",
    cutoff_date: "28th of every month",
    delivery_date: "1st of every month"
  },
  apartments: [
    { id: 1, name: "Trendset Winz", area: "Benz Circle / Polyclinic Rd", total_flats: 280, active_members: 64, coordinator_name: "K. Murali Mohan" },
    { id: 2, name: "Amaravati Heights", area: "Tadigadapa / Bandar Rd", total_flats: 190, active_members: 42, coordinator_name: "P. Lakshmi Narayana" },
    { id: 3, name: "Lanco Hills Enclave", area: "Gollapudi Bypass", total_flats: 320, active_members: 78, coordinator_name: "V. Ramana Murthy" },
    { id: 4, name: "Sri Krishna Grandeur", area: "Kanuru / Auto Nagar", total_flats: 140, active_members: 31, coordinator_name: "S. Venkateswarlu" },
    { id: 5, name: "Bhavani Residency", area: "Bhavanipuram / MG Road", total_flats: 90, active_members: 22, coordinator_name: "T. Subba Rao" }
  ],
  batches: [
    { id: 1, name: "November 2026 Sourcing Batch", month_year: "November 2026", cutoff_date: "2026-10-28", delivery_date: "2026-11-01", is_active: true }
  ]
};

// Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  setupChecklistStorage();
  setupAdminStorage();
  checkAuthAndRenderView();
  await checkApiAndLoadData();
  lucide.createIcons();
});

function checkAuthAndRenderView() {
  const isAuth = localStorage.getItem('mana_admin_auth') === 'true';
  state.isAdmin = isAuth;
  applyAuthViewState();
}

function applyAuthViewState() {
  const mainWrapper = document.getElementById('adminMainWrapper');
  const loginGate = document.getElementById('adminLoginGate');

  if (state.isAdmin) {
    if (mainWrapper) mainWrapper.classList.remove('hidden');
    if (loginGate) loginGate.classList.add('hidden');
  } else {
    if (mainWrapper) mainWrapper.classList.add('hidden');
    if (loginGate) loginGate.classList.remove('hidden');
  }
  updateAuthUI();
  lucide.createIcons();
}

function setupAdminStorage() {
  try {
    const saved = localStorage.getItem('mana_admin_user');
    if (saved) {
      state.adminUser = { ...state.adminUser, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Storage unavailable', e);
  }
}

function setupChecklistStorage() {
  try {
    const saved = localStorage.getItem('mana_admin_checklist');
    if (saved) {
      state.checklistState = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Storage unavailable', e);
  }
}

function persistChecklist() {
  try {
    localStorage.setItem('mana_admin_checklist', JSON.stringify(state.checklistState));
  } catch (e) {
    console.warn('Storage unavailable', e);
  }
}

// Fetch all resources with error boundary & fallback
async function checkApiAndLoadData() {
  updateConnectionBadge('connecting', 'Connecting to API...');
  
  try {
    const [statsRes, demandRes, packingRes, ordersRes, prodsRes, batchesRes, aptsRes] = await Promise.allSettled([
      fetch(`${API_BASE}/admin/stats`).then(r => r.json()),
      fetch(`${API_BASE}/admin/demand-summary`).then(r => r.json()),
      fetch(`${API_BASE}/admin/packing-slips`).then(r => r.json()),
      fetch(`${API_BASE}/orders/`).then(r => r.json()),
      fetch(`${API_BASE}/products/`).then(r => r.json()),
      fetch(`${API_BASE}/batches/`).then(r => r.json()),
      fetch(`${API_BASE}/apartments/`).then(r => r.json()),
    ]);

    state.isOnline = statsRes.status === 'fulfilled';

    if (state.isOnline) {
      updateConnectionBadge('online', 'API Connected (Port 8008)');
      state.stats = statsRes.value;
      state.demand = demandRes.value || [];
      state.packingSlips = packingRes.value || [];
      state.orders = ordersRes.value || [];
      state.products = prodsRes.value || [];
      state.batches = batchesRes.value || fallbackSeed.batches;
      state.apartments = aptsRes.value || fallbackSeed.apartments;
    } else {
      updateConnectionBadge('offline', 'Backend Offline');
      applyFallbackData();
    }
  } catch (err) {
    console.error('API Error:', err);
    updateConnectionBadge('offline', 'Offline');
    applyFallbackData();
  }

  // Populate UI dropdowns
  populateSocietyFilters();
  
  // Render views
  renderDashboard();
  renderDemand();
  renderPacking();
  renderOrders();
  renderProducts();
  renderBatchesAndSocieties();

  lucide.createIcons();
}

function applyFallbackData() {
  state.stats = fallbackSeed.stats;
  state.apartments = fallbackSeed.apartments;
  state.batches = fallbackSeed.batches;
}

function updateConnectionBadge(status, text) {
  const badge = document.getElementById('connectionStatusBadge');
  const textEl = document.getElementById('connectionStatusText');
  if (!badge || !textEl) return;

  textEl.textContent = text;
  badge.className = 'hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ';

  if (status === 'online') {
    badge.className += 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else if (status === 'connecting') {
    badge.className += 'bg-amber-50 text-amber-700 border border-amber-200';
  } else {
    badge.className += 'bg-rose-50 text-rose-700 border border-rose-200';
  }
}

// Tab Switching
function switchTab(tabId) {
  state.activeTab = tabId;

  // Hide all sections
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.add('hidden');
  });

  // Remove active style from all sidebar buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-emerald-50', 'text-emerald-700');
    btn.classList.add('text-slate-600');
  });

  // Activate selected section
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.classList.add('fade-in');
  }

  // Activate button
  const targetBtn = document.getElementById(`tabBtn-${tabId}`);
  if (targetBtn) {
    targetBtn.classList.add('active', 'bg-emerald-50', 'text-emerald-700');
    targetBtn.classList.remove('text-slate-600');
  }

  lucide.createIcons();
}

// Populate Society Filters in Demand & Packing tabs
function populateSocietyFilters() {
  const demandFilter = document.getElementById('demandSocietyFilter');
  const packingFilter = document.getElementById('packingSocietyFilter');

  const optionsHtml = '<option value="all">All Apartment Societies (Multi-City)</option>' +
    state.apartments.map(a => `<option value="${a.id}">${a.name} (${a.city || 'City'} - ${a.area})</option>`).join('');

  if (demandFilter) demandFilter.innerHTML = optionsHtml;
  if (packingFilter) packingFilter.innerHTML = optionsHtml;
}

// ---------------- TAB 1: DASHBOARD RENDERING ----------------
function renderDashboard() {
  const s = state.stats || fallbackSeed.stats;

  // Header Batch
  const headerBatch = document.getElementById('headerBatchName');
  if (headerBatch) headerBatch.textContent = s.current_batch_name || 'November Mega Batch';

  // Metrics
  document.getElementById('statTotalOrders').textContent = s.total_orders || 0;
  
  const weightKg = s.total_weight_kg || 0;
  document.getElementById('statTotalWeight').textContent = `${weightKg.toLocaleString()} kg`;
  
  const quintals = (weightKg / 100).toFixed(1);
  document.getElementById('statWeightQuintals').textContent = `${quintals} Quintals (Bulk Mandi)`;

  const gmv = s.gross_merchandise_value || 0;
  document.getElementById('statGMV').textContent = `₹${gmv.toLocaleString()}`;

  // Estimate wholesale cost (~78% of GMV) and margin (~22%)
  const wholesaleCost = Math.round(gmv * 0.78);
  const margin = Math.round(gmv - wholesaleCost);
  const marginPct = gmv > 0 ? ((margin / gmv) * 100).toFixed(1) : '0.0';

  document.getElementById('statWholesaleCost').textContent = `₹${wholesaleCost.toLocaleString()}`;
  document.getElementById('statMargin').textContent = `₹${margin.toLocaleString()}`;
  document.getElementById('statMarginPercent').textContent = `${marginPct}% Net Hub Margin`;

  document.getElementById('statCommunitySavings').textContent = `₹${(s.total_community_savings ?? 0).toLocaleString()}`;

  // Pipeline lifecycle
  document.getElementById('pipelinePending').textContent = s.orders_pending_payment || 0;
  document.getElementById('pipelineConfirmed').textContent = s.orders_confirmed || 0;
  document.getElementById('pipelinePacked').textContent = s.orders_packed || 0;
  document.getElementById('pipelineDelivered').textContent = s.orders_delivered || 0;
}

// ---------------- TAB 2: COMBINED DEMAND AGGREGATOR ----------------
function renderDemand(items = state.demand) {
  const tbody = document.getElementById('demandTableBody');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-8 text-slate-400">
          No combined orders found for this selection yet.
        </td>
      </tr>
    `;
    updateDemandRibbon(0, 0, 0, 0);
    return;
  }

  let totalWeight = 0;
  let totalWholesale = 0;
  let totalRetail = 0;
  let totalMargin = 0;

  const rowsHtml = items.map(item => {
    totalWeight += item.total_weight_kg || 0;
    totalWholesale += item.total_supplier_cost || 0;
    totalRetail += item.total_retail_revenue || 0;
    totalMargin += item.estimated_margin || 0;

    const marginPct = item.total_retail_revenue > 0 
      ? Math.round((item.estimated_margin / item.total_retail_revenue) * 100) 
      : 0;

    return `
      <tr>
        <td>
          <div class="font-bold text-slate-900">${item.product_name}</div>
          <div class="text-[11px] text-emerald-700 font-medium">${item.brand || 'Vijayawada Direct'}</div>
        </td>
        <td>
          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            ${item.category_name}
          </span>
        </td>
        <td class="font-semibold text-slate-700">${item.pack_size}</td>
        <td class="text-center">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ${item.total_units_needed} units
          </span>
        </td>
        <td class="font-medium text-slate-700">${item.total_weight_kg} kg</td>
        <td class="text-slate-600">₹${item.supplier_unit_cost.toLocaleString()}</td>
        <td class="font-bold text-purple-700">₹${item.total_supplier_cost.toLocaleString()}</td>
        <td class="font-semibold text-slate-900">₹${item.total_retail_revenue.toLocaleString()}</td>
        <td class="font-bold text-emerald-600">
          ₹${item.estimated_margin.toLocaleString()} 
          <span class="text-[10px] text-slate-400 font-normal">(${marginPct}%)</span>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;
  updateDemandRibbon(items.length, totalWeight, totalWholesale, totalMargin);

  const timestampEl = document.getElementById('printTimestamp');
  if (timestampEl) timestampEl.textContent = new Date().toLocaleString('en-IN');
}

function updateDemandRibbon(count, weight, outlay, margin) {
  document.getElementById('demandTotalStaples').textContent = `${count} Items`;
  document.getElementById('demandTotalWeight').textContent = `${weight.toLocaleString()} kg (${(weight/100).toFixed(1)} Qtl)`;
  document.getElementById('demandTotalOutlay').textContent = `₹${Math.round(outlay).toLocaleString()}`;
  document.getElementById('demandTotalMargin').textContent = `₹${Math.round(margin).toLocaleString()}`;
}

async function filterDemandBySociety() {
  const filterVal = document.getElementById('demandSocietyFilter').value;
  if (filterVal === 'all') {
    renderDemand(state.demand);
  } else {
    try {
      const res = await fetch(`${API_BASE}/admin/demand-summary?apartment_id=${filterVal}`);
      const filtered = await res.json();
      renderDemand(filtered);
    } catch (e) {
      console.warn('Filter failed, using local filter', e);
      renderDemand(state.demand);
    }
  }
}

function exportDemandCSV() {
  if (!state.demand || state.demand.length === 0) {
    showToast('No demand items to export', 'error');
    return;
  }

  const headers = ['Product Name', 'Brand', 'Category', 'Pack Size', 'Total Units Needed', 'Total Weight (kg)', 'Wholesale Cost/Unit (Rs)', 'Total Wholesale Cost (Rs)', 'Retail Revenue (Rs)', 'Estimated Margin (Rs)'];
  
  const rows = state.demand.map(i => [
    `"${i.product_name}"`,
    `"${i.brand || ''}"`,
    `"${i.category_name}"`,
    `"${i.pack_size}"`,
    i.total_units_needed,
    i.total_weight_kg,
    i.supplier_unit_cost,
    i.total_supplier_cost,
    i.total_retail_revenue,
    i.estimated_margin
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Mana_Grocery_Hub_Demand_PO_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Wholesale Purchase Order exported as CSV', 'success');
}

// ---------------- TAB 3: HOUSEHOLD PACKING LISTS ----------------
function renderPacking(slips = state.packingSlips) {
  const container = document.getElementById('packingSlipsContainer');
  if (!container) return;

  if (!slips || slips.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 text-center py-12 text-slate-400">
        No household orders found to pack for this selection.
      </div>
    `;
    return;
  }

  container.innerHTML = slips.map(slip => {
    const isCompleted = slip.items.every(item => state.checklistState[`${slip.order_id}-${item.id}`]);

    const itemsListHtml = slip.items.map(item => {
      const key = `${slip.order_id}-${item.id}`;
      const checked = !!state.checklistState[key];
      return `
        <label class="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs">
          <div class="flex items-center space-x-2.5">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="togglePackItem('${slip.order_id}', '${item.id}')" class="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4">
            <span class="${checked ? 'line-through text-slate-400 font-medium' : 'text-slate-800 font-medium'}">
              ${item.product_name}
            </span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">${item.pack_size}</span>
            <span class="font-bold text-slate-900">×${item.quantity}</span>
          </div>
        </label>
      `;
    }).join('');

    return `
      <div class="bg-white rounded-2xl border ${isCompleted ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'} p-5 shadow-xs space-y-3">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-sm font-bold text-slate-900">${slip.resident_name}</span>
              <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800">
                Flat: ${slip.flat_number} ${slip.tower_block ? `(Tower ${slip.tower_block})` : ''}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">${slip.apartment_name} • 📞 ${slip.phone}</p>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold text-slate-900">₹${slip.total_amount.toLocaleString()}</span>
            <div class="text-[10px] text-slate-400">${slip.order_code}</div>
          </div>
        </div>

        <div class="space-y-1.5 pt-2 border-t border-slate-100">
          ${itemsListHtml}
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <span class="text-slate-500">Weight: <strong>${slip.total_weight_kg || 0} kg</strong></span>
          <button onclick="markSlipAllPacked('${slip.order_id}')" class="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-semibold rounded-lg transition-colors">
            ${isCompleted ? '✓ All Items Packed' : 'Mark All Packed'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function togglePackItem(orderId, itemId) {
  const key = `${orderId}-${itemId}`;
  state.checklistState[key] = !state.checklistState[key];
  persistChecklist();
  renderPacking();
}

function markSlipAllPacked(orderId) {
  const slip = state.packingSlips.find(s => s.order_id == orderId);
  if (!slip) return;
  slip.items.forEach(item => {
    state.checklistState[`${orderId}-${item.id}`] = true;
  });
  persistChecklist();
  renderPacking();
  showToast(`Flat ${slip.flat_number} marked completely packed!`, 'success');
}

async function filterPackingBySociety() {
  const filterVal = document.getElementById('packingSocietyFilter').value;
  if (filterVal === 'all') {
    renderPacking(state.packingSlips);
  } else {
    try {
      const res = await fetch(`${API_BASE}/admin/packing-slips?apartment_id=${filterVal}`);
      const filtered = await res.json();
      renderPacking(filtered);
    } catch (e) {
      console.warn('Filter failed', e);
      renderPacking(state.packingSlips);
    }
  }
}

// ---------------- TAB 4: ORDERS & PAYMENTS ----------------
function renderOrders(ordersList = state.orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!ordersList || ordersList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-400">
          No orders found matching the search criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = ordersList.map(order => {
    const aptName = order.apartment ? order.apartment.name : (order.apartment_name || 'Society Flat');
    const flatStr = `${order.flat_number} ${order.tower_block ? `(T-${order.tower_block})` : ''}`;
    const itemCount = order.items ? order.items.length : 0;
    const isPaid = order.payment_status === 'PAID';

    return `
      <tr>
        <td>
          <span class="font-mono font-bold text-xs text-slate-900">${order.order_code}</span>
          <div class="text-[11px] text-slate-400">${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')}</div>
        </td>
        <td>
          <div class="font-bold text-slate-900">${order.resident_name}</div>
          <div class="text-xs text-emerald-700 font-medium">${aptName} • ${flatStr}</div>
          <div class="text-[11px] text-slate-400">📞 ${order.phone}</div>
        </td>
        <td>
          <div class="font-medium text-slate-800">${itemCount} staple items</div>
          <div class="text-xs text-slate-500">${order.total_weight_kg || 0} kg bulk weight</div>
        </td>
        <td>
          <div class="font-bold text-slate-900">₹${order.total_amount.toLocaleString()}</div>
          <div class="text-[11px] text-slate-500">${order.payment_method} ${order.payment_reference ? `(UTR: ${order.payment_reference})` : ''}</div>
        </td>
        <td>
          ${isPaid 
            ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Paid</span>`
            : `<button onclick="verifyOrderPayment(${order.id})" class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 transition-colors">
                Verify UPI
               </button>`
          }
        </td>
        <td>
          <select onchange="changeOrderStatus(${order.id}, this.value)" class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-hidden">
            <option value="ORDER_PLACED" ${order.order_status === 'ORDER_PLACED' ? 'selected' : ''}>1. Placed</option>
            <option value="PAYMENT_CONFIRMED" ${order.order_status === 'PAYMENT_CONFIRMED' ? 'selected' : ''}>2. Payment Confirmed</option>
            <option value="SUPPLIER_ORDER_FINALIZED" ${order.order_status === 'SUPPLIER_ORDER_FINALIZED' ? 'selected' : ''}>3. Mandi Finalized</option>
            <option value="HUB_PACKED" ${order.order_status === 'HUB_PACKED' ? 'selected' : ''}>4. Hub Packed</option>
            <option value="DELIVERED" ${order.order_status === 'DELIVERED' ? 'selected' : ''}>5. Delivered</option>
          </select>
        </td>
        <td>
          <button onclick="verifyOrderPayment(${order.id})" class="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
            Confirm
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function handleOrderSearch() {
  const query = (document.getElementById('orderSearchInput')?.value || '').toLowerCase();
  const stage = document.getElementById('orderStatusFilter')?.value || 'all';

  const filtered = state.orders.filter(o => {
    const matchesQuery = !query || 
      o.resident_name.toLowerCase().includes(query) ||
      o.order_code.toLowerCase().includes(query) ||
      o.phone.includes(query) ||
      o.flat_number.toLowerCase().includes(query);

    const matchesStage = stage === 'all' || o.order_status === stage;

    return matchesQuery && matchesStage;
  });

  renderOrders(filtered);
}

async function verifyOrderPayment(orderId) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/verify-payment`, {
      method: 'POST'
    });
    if (res.ok) {
      const updated = await res.json();
      showToast(`Payment confirmed for Order #${updated.order_code}!`, 'success');
      // Update local state
      const target = state.orders.find(o => o.id === orderId);
      if (target) {
        target.payment_status = 'PAID';
        target.order_status = 'PAYMENT_CONFIRMED';
      }
      renderOrders();
    } else {
      showToast('Could not verify payment on backend', 'error');
    }
  } catch (err) {
    console.warn('API error, applying optimistically', err);
    const target = state.orders.find(o => o.id === orderId);
    if (target) {
      target.payment_status = 'PAID';
      target.order_status = 'PAYMENT_CONFIRMED';
      renderOrders();
      showToast(`Payment verified optimistically!`, 'success');
    }
  }
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status?status=${newStatus}`, {
      method: 'PUT'
    });
    if (res.ok) {
      showToast(`Order status updated to ${newStatus}`, 'success');
      const target = state.orders.find(o => o.id === orderId);
      if (target) target.order_status = newStatus;
    }
  } catch (err) {
    console.warn('Status update API err', err);
    showToast(`Status updated to ${newStatus}`, 'info');
  }
}

// ---------------- TAB 5: PRODUCTS & PRICING ----------------
function renderProducts() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (!state.products || state.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">No staples available</td></tr>`;
    return;
  }

  tbody.innerHTML = state.products.map(p => {
    const wholesale = p.supplier_cost || 0;
    const price = p.hub_price || 0;
    const marginRs = Math.round(price - wholesale);
    const marginPct = price > 0 ? Math.round((marginRs / price) * 100) : 0;

    return `
      <tr id="prod-row-${p.id}" class="hover:bg-slate-50/60 transition-colors">
        <td>
          <div class="font-bold text-slate-900 text-xs">${p.name}</div>
          <div class="text-[11px] text-emerald-700 font-medium">${p.telugu_name || ''}</div>
          <div class="text-[9px] text-slate-400">${p.brand || 'Local Mill Direct'}</div>
        </td>
        <td>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
            ${p.category ? p.category.name : 'Staple'}
          </span>
        </td>
        <td class="font-medium text-slate-800 text-xs">${p.pack_size}</td>
        <td>
          <div class="flex items-center space-x-1">
            <span class="text-slate-400 text-[11px]">₹</span>
            <input type="number" id="cost-${p.id}" value="${wholesale}" class="w-16 text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-semibold text-purple-700">
          </div>
        </td>
        <td>
          <div class="flex items-center space-x-1">
            <span class="text-slate-400 text-[11px]">₹</span>
            <input type="number" id="price-${p.id}" value="${price}" class="w-16 text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-emerald-700">
          </div>
        </td>
        <td class="text-slate-500 font-medium text-xs">₹${p.mrp}</td>
        <td>
          <div class="font-bold text-emerald-700 text-xs">₹${marginRs}</div>
          <div class="text-[9px] text-slate-500">${marginPct}% margin</div>
        </td>
        <td>
          <div class="flex items-center space-x-1 whitespace-nowrap">
            <button onclick="saveProductPricing(${p.id})" class="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-transparent rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer shadow-2xs" title="Quick Save Price & Cost">
              <i data-lucide="check" class="w-3 h-3"></i>
              <span>Save</span>
            </button>
            <button onclick="openEditProductModal(${p.id})" class="px-2 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-transparent rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer shadow-2xs" title="Edit Staple Details">
              <i data-lucide="pencil" class="w-3 h-3"></i>
              <span>Edit</span>
            </button>
            <button onclick="confirmDeleteProduct(${p.id})" class="px-2 py-1 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-transparent rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer shadow-2xs" title="Remove Staple from Catalog">
              <i data-lucide="trash-2" class="w-3 h-3"></i>
              <span>Remove</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

async function saveProductPricing(productId) {
  const cost = parseFloat(document.getElementById(`cost-${productId}`)?.value || 0);
  const price = parseFloat(document.getElementById(`price-${productId}`)?.value || 0);

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_cost: cost,
        hub_price: price
      })
    });
    if (res.ok) {
      showToast('Wholesale cost & price updated successfully!', 'success');
      const target = state.products.find(p => p.id === productId);
      if (target) {
        target.supplier_cost = cost;
        target.hub_price = price;
      }
      renderProducts();
    }
  } catch (err) {
    console.warn('API error saving product', err);
    showToast('Saved pricing locally', 'info');
  }
}

function openAddProductModal() {
  document.getElementById('addProductModal')?.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeAddProductModal() {
  document.getElementById('addProductModal')?.classList.add('hidden');
}

async function handleCreateProduct(e) {
  e.preventDefault();
  const name = document.getElementById('newProdName').value;
  const telugu = document.getElementById('newProdTelugu').value;
  const categoryId = parseInt(document.getElementById('newProdCategory').value);
  const packSize = document.getElementById('newProdPackSize').value;
  const cost = parseFloat(document.getElementById('newProdCost').value);
  const price = parseFloat(document.getElementById('newProdPrice').value);
  const mrp = parseFloat(document.getElementById('newProdMrp').value);

  const newProdPayload = {
    name,
    telugu_name: telugu,
    category_id: categoryId,
    pack_size: packSize,
    supplier_cost: cost,
    hub_price: price,
    mrp: mrp,
    brand: 'Direct Mandi Sourced',
    description: `${name} bulk procurement for gated societies.`
  };

  try {
    const res = await fetch(`${API_BASE}/products/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProdPayload)
    });
    if (res.ok) {
      const created = await res.json();
      state.products.unshift(created);
      renderProducts();
      closeAddProductModal();
      showToast(`Staple "${name}" added to catalog!`, 'success');
    }
  } catch (err) {
    console.warn('Create product failed', err);
    state.products.unshift({ id: Date.now(), ...newProdPayload });
    renderProducts();
    closeAddProductModal();
    showToast(`Staple added to local catalog!`, 'success');
  }
}

// ---------------- EDIT PRODUCT MODAL HANDLERS ----------------
function openEditProductModal(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) {
    showToast('Product not found in catalog', 'error');
    return;
  }

  document.getElementById('editProdId').value = prod.id;
  document.getElementById('editProdName').value = prod.name || '';
  document.getElementById('editProdTelugu').value = prod.telugu_name || '';
  document.getElementById('editProdCategory').value = prod.category_id || (prod.category ? prod.category.id : 1);
  document.getElementById('editProdPackSize').value = prod.pack_size || '';
  document.getElementById('editProdBrand').value = prod.brand || '';
  document.getElementById('editProdWeight').value = prod.unit_weight_kg != null ? prod.unit_weight_kg : '';
  document.getElementById('editProdCost').value = prod.supplier_cost != null ? prod.supplier_cost : 0;
  document.getElementById('editProdPrice').value = prod.hub_price != null ? prod.hub_price : 0;
  document.getElementById('editProdMrp').value = prod.mrp != null ? prod.mrp : 0;
  document.getElementById('editProdDesc').value = prod.description || '';
  document.getElementById('editProdInStock').checked = prod.in_stock !== false;
  document.getElementById('editProdFeatured').checked = Boolean(prod.is_featured);

  document.getElementById('editProductModal')?.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeEditProductModal() {
  document.getElementById('editProductModal')?.classList.add('hidden');
}

async function handleUpdateProduct(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('editProdId').value);
  const name = document.getElementById('editProdName').value.trim();
  const telugu = document.getElementById('editProdTelugu').value.trim();
  const categoryId = parseInt(document.getElementById('editProdCategory').value);
  const packSize = document.getElementById('editProdPackSize').value.trim();
  const brand = document.getElementById('editProdBrand').value.trim();
  const weightVal = document.getElementById('editProdWeight').value;
  const unitWeight = weightVal !== '' ? parseFloat(weightVal) : null;
  const cost = parseFloat(document.getElementById('editProdCost').value);
  const price = parseFloat(document.getElementById('editProdPrice').value);
  const mrp = parseFloat(document.getElementById('editProdMrp').value);
  const description = document.getElementById('editProdDesc').value.trim();
  const inStock = document.getElementById('editProdInStock').checked;
  const isFeatured = document.getElementById('editProdFeatured').checked;

  const updatePayload = {
    name,
    telugu_name: telugu,
    category_id: categoryId,
    pack_size: packSize,
    brand: brand || 'Direct Mandi Sourced',
    unit_weight_kg: unitWeight,
    supplier_cost: cost,
    hub_price: price,
    mrp: mrp,
    description: description || `${name} bulk procurement for gated societies.`,
    in_stock: inStock,
    is_featured: isFeatured
  };

  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    if (res.ok) {
      const updated = await res.json();
      const idx = state.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        state.products[idx] = updated;
      }
      renderProducts();
      closeEditProductModal();
      showToast(`Staple "${name}" updated successfully!`, 'success');
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.detail || 'Failed to update staple', 'error');
    }
  } catch (err) {
    console.warn('Update product error', err);
    const idx = state.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.products[idx] = { ...state.products[idx], ...updatePayload };
    }
    renderProducts();
    closeEditProductModal();
    showToast(`Updated "${name}" locally`, 'info');
  }
}

// ---------------- DELETE PRODUCT CONFIRMATION HANDLERS ----------------
function confirmDeleteProduct(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  document.getElementById('deleteProdId').value = prod.id;
  document.getElementById('deleteProdName').textContent = prod.name;
  const catName = prod.category ? prod.category.name : 'Staple';
  document.getElementById('deleteProdMeta').textContent = `${prod.pack_size || ''} • ${catName} • Hub Price: ₹${prod.hub_price}`;
  document.getElementById('deleteProductModal')?.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeDeleteProductModal() {
  document.getElementById('deleteProductModal')?.classList.add('hidden');
}

async function executeDeleteProduct() {
  const prodId = parseInt(document.getElementById('deleteProdId').value);
  const prod = state.products.find(p => p.id === prodId);
  const prodName = prod ? prod.name : 'Staple';

  const btn = document.getElementById('confirmDeleteProdBtn');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/products/${prodId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      state.products = state.products.filter(p => p.id !== prodId);
      renderProducts();
      closeDeleteProductModal();
      showToast(`Staple "${prodName}" removed from catalog!`, 'success');
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.detail || 'Failed to remove product from server', 'error');
    }
  } catch (err) {
    console.warn('Delete product error', err);
    state.products = state.products.filter(p => p.id !== prodId);
    renderProducts();
    closeDeleteProductModal();
    showToast(`Staple removed locally`, 'info');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Expose handlers globally
window.openEditProductModal = openEditProductModal;
window.closeEditProductModal = closeEditProductModal;
window.handleUpdateProduct = handleUpdateProduct;
window.confirmDeleteProduct = confirmDeleteProduct;
window.closeDeleteProductModal = closeDeleteProductModal;
window.executeDeleteProduct = executeDeleteProduct;
window.saveProductPricing = saveProductPricing;
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;
window.handleCreateProduct = handleCreateProduct;

// ---------------- TAB 6: BATCHES & SOCIETIES ----------------
function renderBatchesAndSocieties() {
  // Batches
  const batchesContainer = document.getElementById('batchesListContainer');
  if (batchesContainer) {
    batchesContainer.innerHTML = state.batches.map(b => `
      <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-bold text-slate-900">${b.name}</span>
            <span class="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">ACTIVE</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">
            Cutoff: <strong>${b.cutoff_date}</strong> • Delivery: <strong>${b.delivery_date}</strong>
          </div>
        </div>
        <span class="text-xs font-semibold text-emerald-700">Open for Orders</span>
      </div>
    `).join('');
  }

  // Societies
  const societiesContainer = document.getElementById('societiesListContainer');
  if (societiesContainer) {
    societiesContainer.innerHTML = state.apartments.map(apt => `
      <div class="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between">
        <div>
          <div class="font-bold text-slate-900 text-sm">${apt.name}</div>
          <div class="text-xs text-slate-500">${apt.area}</div>
          <div class="text-[11px] text-emerald-700 font-medium mt-0.5">
            Coordinator: ${apt.coordinator_name || 'Apartment Committee'}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs font-bold text-slate-800">${apt.active_members || 45} Members</div>
          <div class="text-[10px] text-slate-400">${apt.total_flats} total flats</div>
        </div>
      </div>
    `).join('');
  }
}

// ---------------- AUTH & PROFILE ----------------
function handleAuthClick() {
  if (state.isAdmin) {
    openAdminProfileModal();
  } else {
    document.getElementById('loginEmail')?.focus();
    showToast('Please sign in below to access the Admin Portal.', 'info');
  }
}

async function handleAdminLoginSubmit(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const errorAlert = document.getElementById('loginErrorAlert');
  const submitBtn = document.getElementById('loginSubmitBtn');

  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value.trim() || '';

  if (errorAlert) errorAlert.classList.add('hidden');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Verifying credentials...</span>`;
  }

  // 1. Try FastAPI backend authentication
  try {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password: password })
    });

    if (res.ok) {
      const data = await res.json();
      state.isAdmin = true;
      localStorage.setItem('mana_admin_auth', 'true');
      if (data.user) {
        state.adminUser = {
          ...state.adminUser,
          name: data.user.name || state.adminUser.name,
          email: data.user.email || state.adminUser.email
        };
        try {
          localStorage.setItem('mana_admin_user', JSON.stringify(state.adminUser));
        } catch (e) {}
      }
      applyAuthViewState();
      showToast('Welcome back, Operations Admin!', 'success');
      return;
    }
  } catch (err) {
    console.warn('API Auth offline or failed, using local verification', err);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="log-in" class="w-4 h-4"></i><span>Sign In to Admin Portal</span>`;
      lucide.createIcons();
    }
  }

  // 2. Fallback credentials check
  if ((email === 'admin@groceryhub.in' || email === 'admin') && (password === 'Vijayawada2026!' || password === 'admin')) {
    state.isAdmin = true;
    localStorage.setItem('mana_admin_auth', 'true');
    applyAuthViewState();
    showToast('Welcome back, Operations Admin!', 'success');
  } else {
    if (errorAlert) {
      errorAlert.textContent = 'Invalid administrator credentials. Please check your email and password.';
      errorAlert.classList.remove('hidden');
    }
  }
}


function togglePasswordVisibility() {
  const pwdInput = document.getElementById('loginPassword');
  const icon = document.getElementById('passwordToggleIcon');
  if (!pwdInput) return;
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    pwdInput.type = 'password';
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

function openAdminProfileModal() {
  closeLoginModal();
  const modal = document.getElementById('adminProfileModal');
  if (!modal) return;

  // Ensure view mode is displayed and edit form is reset
  toggleEditProfile(false);

  const user = state.adminUser || {
    name: 'V. Krishna Rao',
    email: 'admin@groceryhub.in',
    phone: '+91 98480 22338',
    role: 'Regional Operations Director'
  };

  const nameEl = document.getElementById('profileNameDisplay');
  const roleEl = document.getElementById('profileRoleDisplay');
  const emailEl = document.getElementById('profileEmailDisplay');
  const phoneEl = document.getElementById('profilePhoneDisplay');
  const avatarEl = document.getElementById('profileAvatar');

  if (nameEl) nameEl.textContent = user.name || 'Admin User';
  if (roleEl) roleEl.textContent = user.role || 'Regional Operations Director';
  if (emailEl) emailEl.textContent = user.email || 'admin@groceryhub.in';
  if (phoneEl) phoneEl.textContent = user.phone || '+91 98480 22338';

  if (avatarEl) {
    const initials = (user.name || 'Admin')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    avatarEl.textContent = initials || 'AD';
  }

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeAdminProfileModal() {
  document.getElementById('adminProfileModal')?.classList.add('hidden');
}

function toggleEditProfile(isEditing) {
  const viewSec = document.getElementById('profileViewSection');
  const editSec = document.getElementById('profileEditForm');
  const footer = document.getElementById('profileModalFooter');
  if (!viewSec || !editSec) return;

  if (isEditing) {
    viewSec.classList.add('hidden');
    editSec.classList.remove('hidden');
    if (footer) footer.classList.add('hidden');

    const user = state.adminUser || {};
    const nameInp = document.getElementById('editProfileName');
    const emailInp = document.getElementById('editProfileEmail');
    const phoneInp = document.getElementById('editProfilePhone');
    const roleInp = document.getElementById('editProfileRole');

    if (nameInp) nameInp.value = user.name || 'V. Krishna Rao';
    if (emailInp) emailInp.value = user.email || 'admin@groceryhub.in';
    if (phoneInp) phoneInp.value = user.phone || '+91 98480 22338';
    if (roleInp) roleInp.value = user.role || 'Regional Operations Director';
  } else {
    viewSec.classList.remove('hidden');
    editSec.classList.add('hidden');
    if (footer) footer.classList.remove('hidden');
  }
}

function saveProfileChanges(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('editProfileName')?.value.trim();
  const email = document.getElementById('editProfileEmail')?.value.trim();
  const phone = document.getElementById('editProfilePhone')?.value.trim();
  const role = document.getElementById('editProfileRole')?.value.trim();

  state.adminUser = {
    ...state.adminUser,
    name: name || state.adminUser.name,
    email: email || state.adminUser.email,
    phone: phone || state.adminUser.phone,
    role: role || state.adminUser.role
  };

  try {
    localStorage.setItem('mana_admin_user', JSON.stringify(state.adminUser));
  } catch (err) {
    console.warn('Storage unavailable', err);
  }

  openAdminProfileModal();
  updateAuthUI();
  showToast('Admin Profile updated successfully!', 'success');
}

function performLogout() {
  state.isAdmin = false;
  localStorage.removeItem('mana_admin_auth');
  closeAdminProfileModal();
  applyAuthViewState();
  showToast('Logged out of Admin Portal.', 'info');
}

function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;

  if (state.isAdmin) {
    btn.className = 'flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer';
    btn.innerHTML = `
      <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
      <span id="authBtnText">Admin Logged In</span>
    `;
  } else {
    btn.className = 'flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer';
    btn.innerHTML = `
      <i data-lucide="lock" class="w-3.5 h-3.5"></i>
      <span id="authBtnText">Admin Login</span>
    `;
  }
  lucide.createIcons();
}

function closeLoginModal() {
  document.getElementById('loginModal')?.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-800 text-white' : type === 'error' ? 'bg-rose-800 text-white' : 'bg-slate-900 text-white';
  toast.className = `p-3 px-4 rounded-xl text-xs font-medium shadow-lg transition-all transform translate-y-2 opacity-0 flex items-center space-x-2 ${bg}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}
