# Test Scenario: Expenses — Hub Entry & Hydration

## Operation Overview
- **Module ID**: expenses
- **UI Entry**: My Reports → Expense Report card
- **Primary files**: `ReportsHubScreen.tsx`, `usePermissions.ts`, `expenseStore.ts`
- **Handler / function**: `navigate('ExpenseReportScreen')`; `hydrateExpenses` on focus/refresh
- **API / data ops**: `expenses.select('*').eq('se_id', userId).order('date', desc)`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Expense Report card shown when `mobile_travel_activity.can_view`
2. Focus + pull-to-refresh call `hydrateExpenses` (with permission refresh on pull)
3. Restricted Area if neither travel nor retail `can_view`

### Permissions / Visibility
1. `getModulePerm('mobile_travel_activity').can_view` gates hub card

## Test Cases

### Success Scenarios
#### APP-TC-001: Open Expense Report from hub
- **Based On**: `ReportsHubScreen.tsx`
- **Preconditions**: `mobile_travel_activity.can_view`
- **Expected UI behavior**: Navigate to ExpenseReportScreen

#### APP-TC-002: Hydrate expenses on hub focus
- **Expected API / local call**: `hydrateExpenses` → select by se_id ordered by date desc; store `expenses` updated

#### APP-TC-003: Pull-to-refresh reloads expenses
- **Expected API / local call**: `refreshPermissions` then `hydrateExpenses` (and shifts)

### Business Logic Failure / Branch Scenarios
#### APP-TC-004: Hide Expense Report without can_view
- **Condition**: `travelActivityAccess.can_view === false`
- **Expected UI behavior**: Expense Report card not rendered

#### APP-TC-005: hydrateExpenses no-ops without user id
- **Condition**: `authStore.user?.id` missing
- **Expected UI behavior**: Store unchanged; no query

---

# Test Scenario: Expenses — Report List, Filters & Totals

## Operation Overview
- **Module ID**: expenses
- **UI Entry**: `ExpenseReportScreen`
- **Primary files**: `ExpenseReportScreen.tsx`
- **Handler / function**: date range filter; status filter; price sort; section group totals
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Date pickers `maximumDate={new Date()}` (no future)
2. End picker `minimumDate={startDate}`
3. End date outside start’s calendar month → alert Invalid Selection; end not applied
4. Start month/year change auto-clamps end to last day of that month (or today if later)

### Business Logic Found in Code
1. Filter expenses to start–end inclusive (day-normalized)
2. Status chips: All | Pending | Approved | Queried | Rejected
3. Sort: High→Low / Low→High / default date desc
4. Grand total for processed list; daily section totals
5. Row shows category icon, amount, remarks, date, status colors; Admin Note if `admin_comments`
6. Empty: No expenses / No matching… + Add Expense Today CTA (always wired; not `can_edit`-gated)
7. Bottom Add New Expense only if `expensePerm.can_edit`

### Permissions / Visibility
1. `mobile_travel_activity.can_edit` → bottom Add button

## Test Cases

### Success Scenarios
#### APP-TC-006: List expenses in selected date range
- **Expected UI behavior**: SectionList grouped by locale date string; daily Total: ₹…

#### APP-TC-007: Show grand total for selection range
- **Expected UI behavior**: Banner Total for Selection Range: ₹{sum of processed}

#### APP-TC-008: Filter by status Pending / Approved / Queried / Rejected
- **Expected UI behavior**: Only matching status rows; grand total recalculates

#### APP-TC-009: Sort ₹ High to Low / Low to High
- **Expected UI behavior**: Order by amount; toggle off returns date desc fallback

#### APP-TC-010: Display admin note when present
- **Preconditions**: expense has `admin_comments`
- **Expected UI behavior**: Admin Note block with comment text

#### APP-TC-011: Status badge colors for Approved / Rejected / Queried / Pending
- **Expected UI behavior**: Distinct bg/text colors per `getStatusColor`

### Validation Failure Scenarios
#### APP-TC-012: Reject end date in different calendar month
- **Validation Rule**: end month/year must match start
- **Expected UI behavior**: Alert Invalid Selection / Expense statements can only be loaded matching within the identical calendar month.

#### APP-TC-013: Changing start month clamps end into that month
- **Expected UI behavior**: End set to last day of start’s month or today if that day is future

### Business Logic Failure / Branch Scenarios
#### APP-TC-014: Empty list for filter configuration
- **Expected UI behavior**: EmptyState No expenses; description about no matching logs; Add Expense Today action navigates AddExpenseScreen

#### APP-TC-015: Hide bottom Add New Expense without can_edit
- **Condition**: `expensePerm.can_edit === false`
- **Expected UI behavior**: Bottom bar button not rendered

#### APP-TC-016: Add New Expense with can_edit
- **Preconditions**: `can_edit`
- **Expected UI behavior**: Navigate AddExpenseScreen

---

# Test Scenario: Expenses — Add / Log Expense

## Operation Overview
- **Module ID**: expenses
- **UI Entry**: Add New Expense / empty-state CTA → `AddExpenseScreen`
- **Primary files**: `AddExpenseScreen.tsx`, `expenseStore.addExpense`, `cloudinaryService`
- **Handler / function**: `handleSave` → optional Cloudinary upload → `addExpense`
- **API / data ops**: `expenses.insert` status Pending; optional `logShiftEvent` if active shift
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Submit disabled when `!amount` OR `remarks.trim() === ''` OR `isSaving`
2. Amount / Date / Category / Remarks marked required in UI (`*`); Category defaults `Food`
3. Date picker `maximumDate={new Date()}` — no future expense date
4. Receipt optional; camera-only capture via `requestCameraPermission` + `launchCameraAsync`

### Business Logic Found in Code
1. Categories: Food | Travelling | Misc
2. Save: upload receipt if present else `receipt_url: ''`; ISO date; remarks trimmed
3. Success alert Success / Expense logged successfully → `goBack`
4. Failure alert Error / Failed to save expense
5. Camera denied → Permission Denied + fallbackMessage; open failure → Failed to open camera
6. Store payload: se_id, shift_id (active or null), parseFloat(amount), status Pending
7. If `activeShiftId`: `logShiftEvent('expense', 'Logged Expense', category • ₹amount)`
8. Persist cache `expense-storage-v3`
9. `incrementActivity` imported but **not called** in this screen

### Error / Edge Paths Handled in UI
1. Save throw → Failed to save expense
2. Camera permission / launch errors as above

## Test Cases

### Success Scenarios
#### APP-TC-017: Submit expense with amount, remarks, default category
- **Code Path**: AddExpenseScreen → addExpense → supabase insert
- **Input**: amount set; remarks non-empty; category Food (default); date ≤ today
- **Expected UI behavior**: Success alert; navigate back
- **Expected API / local call**: insert Pending; prepend to local expenses

#### APP-TC-018: Submit with Travelling or Misc category
- **User steps**: Tap category chip → Submit
- **Expected API / local call**: payload.category matches selection

#### APP-TC-019: Submit with optional receipt photo
- **User steps**: Open Camera → capture → Submit
- **Expected API / local call**: Cloudinary upload then receipt_url URL in insert

#### APP-TC-020: Submit without receipt
- **Expected API / local call**: `receipt_url: ''`

#### APP-TC-021: Attach shift_id and timeline when shift active
- **Preconditions**: `activeShiftId` set
- **Expected API / local call**: insert includes shift_id; `logShiftEvent` expense

#### APP-TC-022: Insert with null shift_id when no active shift
- **Preconditions**: no activeShiftId
- **Expected API / local call**: `shift_id: null`; no logShiftEvent

#### APP-TC-023: Change expense date (not future)
- **Expected UI behavior**: Date of Expense shows selected locale date; ISO stored on save

#### APP-TC-024: Remove captured receipt before submit
- **User steps**: Capture then delete icon
- **Expected UI behavior**: Back to Open Camera tile; save without URL

### Validation Failure Scenarios
#### APP-TC-025: Submit disabled when amount empty
- **Validation Rule**: `disabled={!amount || ...}`
- **Expected UI behavior**: Submit Expense button disabled

#### APP-TC-026: Submit disabled when remarks blank/whitespace
- **Validation Rule**: `remarks.trim() === ''`
- **Expected UI behavior**: Button disabled

#### APP-TC-027: Future expense date blocked by picker
- **Validation Rule**: `maximumDate={new Date()}`
- **Expected UI behavior**: Cannot pick future date

### Business Logic Failure / Branch Scenarios
#### APP-TC-028: Save failure shows error alert
- **Condition**: addExpense / upload throws
- **Expected UI behavior**: Error / Failed to save expense; stays on screen; isSaving clears

#### APP-TC-029: Camera permission denied
- **Expected UI behavior**: Permission Denied + fallbackMessage; no image set

#### APP-TC-030: Camera launch failure
- **Expected UI behavior**: Error / Failed to open camera

#### APP-TC-031: addExpense no-ops without user id
- **Condition**: no auth user id
- **Expected UI behavior**: Early return (no insert); caller may still hit success path only if addExpense resolves without throw — store returns void without throw when !userId
- **Note**: UI still shows Success if addExpense returns without throwing; document store early-return behavior

#### APP-TC-032: Show Submitting… while save in flight
- **Expected UI behavior**: Button label Submitting…; disabled during isSaving

---

## Coverage Notes (provided sources only)
- **Covered**: hub card + hydrate, report range/month gate, status/sort/totals, admin notes, can_edit Add bar, add form validations, camera receipt, store insert + optional shift event.
- **Not invented**: edit/delete/approve expense (no UI); expense PDF share (not in these screens).
- **Code present but unused**: `AddExpenseScreen` imports `incrementActivity` but never calls it — no TC. `ExpenseReportScreen` reads `isActive` but does not gate Add — no shift-required TC.
- Optional `docs/business-rules/expenses.md` cross-check only.

## Backend/Web Mapping Hints
- APP-TC-001 → open_expense_report
- APP-TC-002 → hydrate_expenses
- APP-TC-003 → refresh_expenses
- APP-TC-004 → hide_expense_report
- APP-TC-005 → hydrate_expenses_requires_user
- APP-TC-006 → list_expenses
- APP-TC-007 → expense_range_grand_total
- APP-TC-008 → filter_expenses_by_status
- APP-TC-009 → sort_expenses_by_amount
- APP-TC-010 → show_expense_admin_note
- APP-TC-011 → expense_status_badge
- APP-TC-012 → expense_range_same_month
- APP-TC-013 → expense_start_clamps_end
- APP-TC-014 → expenses_empty_state
- APP-TC-015 → hide_add_expense
- APP-TC-016 → navigate_add_expense
- APP-TC-017 → add_expense
- APP-TC-018 → add_expense_category
- APP-TC-019 → add_expense_with_receipt
- APP-TC-020 → add_expense_without_receipt
- APP-TC-021 → add_expense_link_active_shift
- APP-TC-022 → add_expense_no_shift
- APP-TC-023 → add_expense_pick_date
- APP-TC-024 → remove_expense_receipt
- APP-TC-025 → add_expense_amount_required
- APP-TC-026 → add_expense_remarks_required
- APP-TC-027 → add_expense_reject_future_date
- APP-TC-028 → add_expense_failed
- APP-TC-029 → expense_camera_denied
- APP-TC-030 → expense_camera_failed
- APP-TC-031 → add_expense_requires_user
- APP-TC-032 → add_expense_submitting_state
