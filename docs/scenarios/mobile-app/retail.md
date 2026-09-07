# Test Scenario: Retail — Hub Entry & Permissions

## Operation Overview
- **Module ID**: retail
- **UI Entry**: My Reports → My Inventory / Retail Invoicing
- **Primary files**: `ReportsHubScreen.tsx`, `usePermissions.ts`
- **Handler / function**: `navigate('InventoryScreen' | 'RetailInvoicingScreen')`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Both retail cards render when `mobile_retail.can_view`
2. Restricted Area if neither travel nor retail `can_view`
3. Inventory / invoice screens themselves do not re-check `can_edit` for FAB/list (hub gate only in provided sources)

### Permissions / Visibility
1. `getModulePerm('mobile_retail').can_view` gates hub cards

## Test Cases

### Success Scenarios
#### APP-TC-001: Open My Inventory from hub
- **Based On**: `ReportsHubScreen.tsx`
- **Preconditions**: `mobile_retail.can_view`
- **Expected UI behavior**: Navigate InventoryScreen

#### APP-TC-002: Open Retail Invoicing from hub
- **Preconditions**: `mobile_retail.can_view`
- **Expected UI behavior**: Navigate RetailInvoicingScreen

### Business Logic Failure / Branch Scenarios
#### APP-TC-003: Hide retail cards without can_view
- **Condition**: `retailAccess.can_view === false`
- **Expected UI behavior**: My Inventory and Retail Invoicing cards not rendered

---

# Test Scenario: Retail — Live Inventory

## Operation Overview
- **Module ID**: retail
- **UI Entry**: `InventoryScreen`
- **Primary files**: `InventoryScreen.tsx`, `FilterModal` (entityType Inventory)
- **Handler / function**: focus fetch; search/sort memo
- **API / data ops**: `executive_inventory.select(...).eq('se_id').gt('balance_qty', 0).order('updated_at', desc)`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Loading: Syncing stock ledger…
2. Search by item name or batch_number (case-insensitive)
3. Sort: name_asc (default) | qty_desc | qty_asc via FilterModal
4. Row: name, Batch, MRP/uom, balance_qty UNITS
5. Empty: No Stock Available (+ warehouse contact copy) or No matches found; Go Back
6. Fetch errors only `console.error` — list set to `data || []`

## Test Cases

### Success Scenarios
#### APP-TC-004: Load positive-balance inventory for SE
- **Expected UI behavior**: FlatList of stock rows after load
- **Expected API / local call**: query filtered `balance_qty > 0` for `user.id`

#### APP-TC-005: Search by product name or batch
- **Input**: searchQuery matching name or batch_number
- **Expected UI behavior**: Filtered list

#### APP-TC-006: Clear search query
- **Expected UI behavior**: Cancel clears query; full list restored

#### APP-TC-007: Sort A-Z / qty high-low / qty low-high
- **Expected UI behavior**: Order matches filters.sortBy; filter chip highlighted when not name_asc

### Business Logic Failure / Branch Scenarios
#### APP-TC-008: Empty stock ledger
- **Condition**: no rows / all filtered out without search
- **Expected UI behavior**: No Stock Available; Go Back

#### APP-TC-009: Search with no matches
- **Expected UI behavior**: No matches found / Try adjusting your search

#### APP-TC-010: Fetch error leaves empty inventory
- **Condition**: supabase error
- **Expected UI behavior**: inventory `[]`; error logged (no user alert)

---

# Test Scenario: Retail — Order History

## Operation Overview
- **Module ID**: retail
- **UI Entry**: `RetailInvoicingScreen`
- **Primary files**: `RetailInvoicingScreen.tsx`, `FilterModal` (entityType Invoices)
- **Handler / function**: fetchOrders; handleSharePDF; handleDownloadPDF
- **API / data ops**: `retail_orders.select('*').eq('se_id').order('created_at', desc)`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Search invoice_no / farmer_name / farmer_mobile
2. Filter paymentMode CASH/UPI; sort date_desc | date_asc | amount_desc
3. Card: invoice_no, date, total, payment badge, farmer +91 mobile
4. Download/Share PDF disabled (opacity 0.5) without `pdf_url`
5. Android download: SAF directory permission → Success alert; iOS share Save Invoice
6. Download failure → Alert Error / Failed to download the invoice
7. FAB + empty Create Invoice → NewInvoiceScreen; filtered empty → Clear Filters
8. Share PDF: download to cache then Sharing.shareAsync (errors console only)

## Test Cases

### Success Scenarios
#### APP-TC-011: Load order history for SE
- **Expected UI behavior**: List of invoices newest first
- **Expected API / local call**: retail_orders by se_id

#### APP-TC-012: Search by invoice, name, or phone
- **Expected UI behavior**: Matching orders only

#### APP-TC-013: Filter by CASH / UPI payment mode
- **Expected UI behavior**: Only selected payment_mode(s); filter icon active

#### APP-TC-014: Sort newest / oldest / highest amount
- **Expected UI behavior**: Order matches filters.sortBy

#### APP-TC-015: Share PDF when pdf_url present
- **Expected UI behavior**: Share sheet; spinner while downloadingUrl set

#### APP-TC-016: Download PDF on Android with directory permission
- **Preconditions**: Platform Android; permissions.granted
- **Expected UI behavior**: Success / Invoice downloaded successfully!

#### APP-TC-017: Download PDF on iOS uses share sheet
- **Preconditions**: Platform iOS
- **Expected UI behavior**: Sharing with Save Invoice dialogTitle

#### APP-TC-018: FAB opens New Invoice
- **Expected UI behavior**: Navigate NewInvoiceScreen

### Business Logic Failure / Branch Scenarios
#### APP-TC-019: Empty history no filters
- **Expected UI behavior**: No Invoices Found; Create Invoice → NewInvoiceScreen

#### APP-TC-020: Empty after search/filter
- **Expected UI behavior**: No matches found; Clear Filters resets query + default sort

#### APP-TC-021: PDF actions disabled without pdf_url
- **Expected UI behavior**: Download/Share disabled; opacity 0.5

#### APP-TC-022: Download PDF failure
- **Expected UI behavior**: Alert Error / Failed to download the invoice

#### APP-TC-023: Android download when directory permission denied
- **Condition**: `permissions.granted` false
- **Expected UI behavior**: No Success alert; downloadingPdfId cleared

---

# Test Scenario: Retail — New Invoice (Create)

## Operation Overview
- **Module ID**: retail
- **UI Entry**: FAB / Create Invoice → `NewInvoiceScreen`
- **Primary files**: `NewInvoiceScreen.tsx`, Cloudinary upload, expo-print
- **Handler / function**: `handleSubmit`; cart helpers; farmer mobile lookup
- **API / data ops**: farmers lookup; executive_inventory; retail_orders insert; retail_order_items insert; update pdf_url
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Submit alerts if `!farmerName` → Please enter a valid farmer name
2. Cart empty → Cart is empty (button also disabled when cart.length === 0)
3. UPI without proofImage → UPI Payment screenshot is required
4. Mobile Input maxLength 10; auto-fetch farmer at length === 10
5. Qty cannot exceed `balance_qty` (add disabled / addToCart no-op at cap)

### Business Logic Found in Code
1. Load stock `balance_qty > 0` for SE
2. Farmer lookup `farmers.eq('mobile', mobile).maybeSingle` → fill full_name + details; else clear when length ≠ 10
3. Cart keyed by item_id + batch_number; MRP-only grandTotal (no tax)
4. Payment CASH (default) | UPI (QR + camera proof)
5. Insert order then line items; Print HTML → Cloudinary raw → update pdf_url
6. Success: Invoice {invoice_no} generated successfully! → goBack
7. Catch: Transaction Failed / e.message
8. Product search filters inventory; empty stock / no match copy in dropdown
9. No inventory balance decrement coded in this screen

## Test Cases

### Success Scenarios
#### APP-TC-024: Auto-fill farmer name from 10-digit mobile
- **Input**: mobile length 10 matching farmers row
- **Expected UI behavior**: Farmer Name set to full_name; searching spinner during fetch

#### APP-TC-025: Manual farmer name when not in DB
- **Condition**: 10-digit mobile with no farmer row
- **Expected UI behavior**: Name editable; user types name

#### APP-TC-026: Add product batch to cart and increase qty
- **Expected UI behavior**: Selected count badge; qty stepper; checkout section appears

#### APP-TC-027: Cap quantity at stock balance
- **Condition**: qtyInCart >= balance_qty
- **Expected UI behavior**: Add disabled (muted); addToCart does not increase further

#### APP-TC-028: Decrease qty and remove line at qty 1
- **Expected UI behavior**: qty−1 or line removed from cart

#### APP-TC-029: Generate bill with CASH payment
- **Input**: farmerName; cart ≥1; paymentMode CASH
- **Expected UI behavior**: Generating Invoice…; Success with invoice_no; goBack
- **Expected API / local call**: retail_orders insert (proof null); retail_order_items; pdf upload + update

#### APP-TC-030: Generate bill with UPI and payment proof
- **Input**: UPI + camera proofImage
- **Expected API / local call**: payment_proof_url Cloudinary URL; payment_mode UPI

#### APP-TC-031: Grand total equals sum of MRP × qty
- **Expected UI behavior**: Checkout Grand Total and Generate Bill (₹…) match reduce formula

#### APP-TC-032: Search products by name or batch in picker
- **Expected UI behavior**: filteredInventory rows; No matching products found if none

### Validation Failure Scenarios
#### APP-TC-033: Submit blocked without farmer name
- **Validation Rule**: `!farmerName`
- **Expected UI behavior**: Error / Please enter a valid farmer name

#### APP-TC-034: Generate Bill disabled when cart empty
- **Validation Rule**: `disabled={cart.length === 0 || isSubmitting}`
- **Expected UI behavior**: Button disabled

#### APP-TC-035: UPI requires payment proof
- **Validation Rule**: paymentMode UPI && !proofImage
- **Expected UI behavior**: Error / UPI Payment screenshot is required

#### APP-TC-036: Mobile shorter than 10 clears farmer lookup
- **Condition**: mobile.length !== 10
- **Expected UI behavior**: farmerName and farmerDetails cleared

### Business Logic Failure / Branch Scenarios
#### APP-TC-037: No stock available to sell
- **Condition**: inventory.length === 0 with list open
- **Expected UI behavior**: No stock available to sell

#### APP-TC-038: Transaction failed surfaces error message
- **Condition**: insert/upload/print throws
- **Expected UI behavior**: Transaction Failed / e.message; isSubmitting cleared

#### APP-TC-039: Clear mobile below 10 digits after lookup
- **Expected UI behavior**: Name cleared until 10 digits again

#### APP-TC-040: Capture UPI proof via camera
- **Expected UI behavior**: Proof Attached state when not canceled

---

## Coverage Notes (provided sources only)
- **Covered**: hub `mobile_retail.can_view`, inventory fetch/search/sort, order history search/filter/PDF share-download, new invoice farmer/cart/payment/PDF pipeline.
- **Not invented**: stock transfer UI; inventory qty decrement after sale (not in NewInvoiceScreen); `mobile_retail.can_edit` gates (not used on these screens); tax/HSN (removed in PDF).
- Optional `docs/business-rules/retail.md` cross-check only.

## Backend/Web Mapping Hints
- APP-TC-001 → open_inventory
- APP-TC-002 → open_retail_invoicing
- APP-TC-003 → hide_retail_hub_cards
- APP-TC-004 → list_inventory
- APP-TC-005 → search_inventory
- APP-TC-006 → clear_inventory_search
- APP-TC-007 → sort_inventory
- APP-TC-008 → inventory_empty
- APP-TC-009 → inventory_search_no_match
- APP-TC-010 → inventory_fetch_error
- APP-TC-011 → list_retail_orders
- APP-TC-012 → search_retail_orders
- APP-TC-013 → filter_orders_payment_mode
- APP-TC-014 → sort_retail_orders
- APP-TC-015 → share_invoice_pdf
- APP-TC-016 → download_invoice_pdf_android
- APP-TC-017 → download_invoice_pdf_ios
- APP-TC-018 → navigate_new_invoice
- APP-TC-019 → retail_orders_empty
- APP-TC-020 → retail_orders_clear_filters
- APP-TC-021 → invoice_pdf_actions_disabled
- APP-TC-022 → download_invoice_failed
- APP-TC-023 → download_invoice_permission_denied
- APP-TC-024 → lookup_farmer_by_mobile
- APP-TC-025 → manual_farmer_name
- APP-TC-026 → add_to_cart
- APP-TC-027 → cart_qty_cap_stock
- APP-TC-028 → remove_from_cart
- APP-TC-029 → create_retail_invoice_cash
- APP-TC-030 → create_retail_invoice_upi
- APP-TC-031 → invoice_grand_total_mrp
- APP-TC-032 → search_invoice_products
- APP-TC-033 → invoice_farmer_name_required
- APP-TC-034 → invoice_cart_required
- APP-TC-035 → upi_proof_required
- APP-TC-036 → farmer_lookup_requires_10_digits
- APP-TC-037 → invoice_no_stock
- APP-TC-038 → create_invoice_failed
- APP-TC-039 → clear_farmer_on_short_mobile
- APP-TC-040 → capture_upi_proof
