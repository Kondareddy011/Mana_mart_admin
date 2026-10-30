# 🛡️ Mana Grocery Hub — Vijayawada Admin Portal

Standalone Operations & Wholesale Mandi Procurement Portal for **Mana Grocery Hub (Vijayawada)**.

---

## ⚡ 3 Ways to Run & Open the Admin Page

### Option 1: Direct in Browser (Zero Installation)
Simply double click `index.html` or open:
```powershell
start index.html
```
It immediately loads and connects to the backend API running at `http://127.0.0.1:8008`.

---

### Option 2: Run with Python HTTP Server (Port 3001)
From this `Admin` directory:
```powershell
python -m http.server 3001
```
Then visit: [http://localhost:3001](http://localhost:3001)

---

### Option 3: Run with Node / NPM (Port 3001)
From this `Admin` directory:
```powershell
npm start
```
Then visit: [http://localhost:3001](http://localhost:3001)

---

## 🌾 What this Admin Portal Manages

1. **📊 Dashboard Overview**:
   - Gross Merchandise Value (GMV) collected
   - Wholesale Mandi expenditure
   - Hub community margin (₹ & %)
   - Total bulk weight in Quintals and kg
   - Order pipeline stages (Pending, Confirmed, Packed, Delivered)

2. **🌾 Combined Demand Aggregator (Wholesale Procurement Sheet)**:
   - Sums exact bags (25kg Sona Masoori, 10kg bags), tins (5L Freedom Sunflower, Tenali Groundnut oil), and packets across all resident orders
   - Filter by Vijayawada society or all communities
   - **"Print PO"**: Generates clean printable purchase order for mill suppliers
   - **"Export CSV"**: Download procurement spreadsheet for mandi negotiation

3. **📦 Household Packing Lists**:
   - Flat-by-flat assembly slips grouped by apartment society (Trendset Winz, Amaravati Heights, etc.)
   - Interactive itemized checklist with checkboxes that persist locally
   - Print packing slips for hub volunteers

4. **🚚 Orders & Payment Verification**:
   - 5-stage status changer: `ORDER_PLACED` ➔ `PAYMENT_CONFIRMED` ➔ `SUPPLIER_ORDER_FINALIZED` ➔ `HUB_PACKED` ➔ `DELIVERED`
   - Instant "Verify UPI Payment" with UTR reference display

5. **🏷️ Products & Mandi Pricing**:
   - Live editable wholesale cost and selling price
   - Auto-calculated margin %
   - "+ Add Staple" modal for adding new Vijayawada staples

6. **🏢 Batches & Societies**:
   - Delivery batch cutoff & delivery date schedules
   - Registered apartment communities directory
