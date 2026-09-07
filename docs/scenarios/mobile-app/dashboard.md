# Test Scenario: Dashboard — Shell, Permissions & Tabs

## Operation Overview
- **Module ID**: dashboard
- **UI Entry**: Authenticated `MainTabs` → `Dashboard` (`AppNavigator` → `DashboardStackNavigator` → `DashboardMain`)
- **Primary files**: `DashboardScreen.tsx`, `usePermissions.ts`, `AppNavigator.tsx`
- **Handler / function**: `getModulePerm`; `tabPages` / `fabActions` memos
- **API / data ops**: permissions from profiles/roles (via `usePermissions`); entity lists via `dashboardService`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. **Verifying Access** while `permsLoading`
2. **No Modules Assigned** when no view on distributor/dealer/farmer/fpo and no `hasFarmerTabAccess`
3. Tabs built only for modules with `can_view` (farmer via `mobile_farmer` OR `mobile_farmer_onboard`)
4. Header: company logo + `ActiveShiftWidget` with `canEditAttendance={travelPerm.can_edit}` (`mobile_travel_activity`)
5. Horizontal pager tabs; optional `route.params.activeTab` scrolls to index then clears param
6. Offline: AppNavigator replaces all UI with No Internet screen when disconnected (blocks Dashboard)

### Permissions / Visibility
| Perm key | Effect on Dashboard |
|----------|---------------------|
| `mobile_distributor.can_view` | Distributors tab + fetch |
| `mobile_dealer.can_view` | Dealers tab + fetch |
| `mobile_farmer` / `mobile_farmer_onboard` view | Farmers tab + farmers/routes fetch |
| `mobile_fpo.can_view` | FPOs tab + fetch |
| `*.can_edit` | FAB Add + empty-state Add (farmer uses either farmer or onboard edit) |
| `mobile_travel_activity.can_edit` | Passed to ActiveShiftWidget |

## Test Cases

### Success Scenarios
#### APP-TC-001: Authenticated user opens Dashboard tab
- **Code Path**: AppNavigator MainTabs → DashboardScreen
- **Based On**: `AppNavigator.tsx`, `DashboardScreen.tsx`
- **Preconditions**: `user` non-null; online
- **Expected UI behavior**: Dashboard stack mounts with logo + shift widget

#### APP-TC-002: Show module tabs based on view permissions
- **Code Path**: `tabPages` memo
- **Expected UI behavior**: Only permitted entity tabs appear (Distributors/Dealers/Farmers/FPOs)

#### APP-TC-003: Switch tabs via header or horizontal swipe
- **Expected UI behavior**: `activeTab` updates; pager scrolls; lists for that entity type shown

### Business Logic Failure / Branch Scenarios
#### APP-TC-004: Verifying Access while permissions loading
- **Condition**: `permsLoading === true`
- **Expected UI behavior**: Spinner + `Verifying Access...`; no tab UI yet

#### APP-TC-005: No Modules Assigned empty state
- **Condition**: `!hasAnyDashboardAccess` after perms load
- **Expected UI behavior**: Block icon; `No Modules Assigned`; contact administrator copy

#### APP-TC-006: Offline blocks Dashboard
- **Condition**: NetInfo `isConnected === false`
- **Expected UI behavior**: AppNavigator `No Internet Connection` feedback (Dashboard unmounted)

---

# Test Scenario: Dashboard — Data Load, Refresh, Pagination, Draft Migration

## Operation Overview
- **Module ID**: dashboard
- **UI Entry**: focus / pull-to-refresh / scroll end
- **Primary files**: `DashboardScreen.tsx`, `dashboardService.ts`, `draftStore.ts`
- **Handler / function**: `loadData`, `onRefresh`, migrate drafts effect
- **API / data ops**: `fetchMyDealers|Farmers|Distributors|FPOs|Drafts|Routes`; drafts upsert migration
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Focus load waits until `!permsLoading`
2. Parallel fetches gated by perms; page 0 also drafts (+ routes if farmer tab)
3. `PAGE_LIMIT = 50`; merge-by-id preserves scrolled pages; `hasMore` if any list length === limit
4. Refresh: `refreshPermissions` + `hydrateShifts` + `loadData(0, true)`
5. Local drafts for current user upserted to `drafts` then `clearDrafts`; UI may show `Syncing drafts...`
6. Delete draft: confirm alert → `deleteDraft(entityId)` → reload

### Error / Edge Paths Handled in UI
1. Load errors `console.error` only
2. Migration errors logged; `isMigrating` cleared
3. Delete draft confirm Cancel / Delete

## Test Cases

### Success Scenarios
#### APP-TC-007: Load entity lists for permitted modules
- **Expected API / local call**: e.g. dealers `eq('se_id')` only if `dealerPerm.can_view`; drafts always on page 0

#### APP-TC-008: Pull-to-refresh refreshes perms, shifts, and lists
- **Expected UI behavior**: RefreshControl; reloads data

#### APP-TC-009: Paginate when hasMore
- **Condition**: end reached and `hasMore`
- **Expected UI behavior**: `loadData(page + 1)`; merge new items

#### APP-TC-010: Migrate local drafts to DB
- **Preconditions**: local drafts for user
- **Expected UI behavior**: Possible `Syncing drafts...`; upsert then clear local; reload

#### APP-TC-011: Delete incomplete draft from EntityCard
- **Expected UI behavior**: Alert `Delete Draft` confirm → delete → `loadData(0, true)`

### Business Logic Failure / Branch Scenarios
#### APP-TC-012: Skip fetch for modules without view
- **Condition**: e.g. `!dealerPerm.can_view`
- **Expected UI behavior**: `Promise.resolve([])` for that entity; no dealers tab

---

# Test Scenario: Dashboard — Search, Filters & Empty States

## Operation Overview
- **Module ID**: dashboard
- **UI Entry**: Search TextInput + Filter button → `FilterModal`
- **Primary files**: `DashboardScreen.tsx`, `FilterModal` (design-system, used by Dashboard)
- **Handler / function**: `processed*` memos; `onApply` sets filters
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Shared search placeholder: name/phone/location
2. Filter button highlights when filters ≠ `defaultFilters`
3. FilterModal `entityType` = current tab key; routesList for farmer route filter
4. Per-entity filter fields (completion, bands, farmerStage, scale, crops, etc.) as coded in processed* memos
5. Empty: search → `No Results Found`; else `No {tab} Yet` + entity emptyMsg; Add action if edit perm
6. **Farmers + search/filter active** → flat EntityCard list (skips routes drill-down)

## Test Cases

### Success Scenarios
#### APP-TC-013: Search filters active tab list client-side
- **Expected UI behavior**: Only matching cards remain

#### APP-TC-014: Apply filters via FilterModal
- **Expected UI behavior**: Modal closes on apply; list refiltered; filter icon active styling

#### APP-TC-015: Empty state Add navigates to onboarding
- **Preconditions**: edit permission for that actionId
- **Expected UI behavior**: e.g. Add Dealer → `DealerOnboarding`

### Business Logic Failure / Branch Scenarios
#### APP-TC-016: Empty Add hidden without edit permission
- **Expected UI behavior**: `actionLabel` undefined

#### APP-TC-017: Farmer search/filter disables routes hierarchy
- **Condition**: Farmers tab and (`searchQuery` or `isFilterActive`)
- **Expected UI behavior**: Flat farmer cards list instead of routes → villages

---

# Test Scenario: Dashboard — FAB Add Actions

## Operation Overview
- **Module ID**: dashboard
- **UI Entry**: `FloatingActionMenu` when `fabActions.length > 0`
- **Primary files**: `DashboardScreen.tsx`
- **Handler / function**: `onActionPress`
- **Layer**: APP

## Code Analysis
1. FAB actions from edit perms (farmer via `hasFarmerAddAccess`)
2. Navigate FarmerOnboarding / DealerOnboarding / DistributorOnboarding / FPOOnboarding

## Test Cases

### Success Scenarios
#### APP-TC-018: FAB Add Dealer / Distributor / FPO / Farmer
- **Preconditions**: corresponding `can_edit` (or farmer add access)
- **Expected UI behavior**: Opens matching onboarding screen

### Business Logic Failure / Branch Scenarios
#### APP-TC-019: FAB hidden when no edit actions
- **Condition**: `fabActions.length === 0`
- **Expected UI behavior**: FloatingActionMenu not rendered

---

# Test Scenario: Dashboard — Farmers Routes → Villages → Profiles

## Operation Overview
- **Module ID**: dashboard
- **UI Entry**: Farmers tab when no search/filter
- **Primary files**: `DashboardScreen.tsx`, `fetchMyRoutes`
- **Handler / function**: `farmerViewMode` state; `processedRoutes` / `processedVillages`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Modes: `routes` → `villages` → `profiles`
2. Route cards from `routes` + counts from stable farmers+drafts by village match; append `Others` unrouted
3. Village with count 0: not navigable (except unrouted filter keeps empty villages differently); shows “No profiles in this village yet”
4. Profiles list filtered by `selectedVillageName`
5. Dealers button → `TempDealersListScreen` with route/village villages
6. Farm Diary button on village profiles header → `VillageFarmDiariesScreen`
7. Empty routes: `No Routes Assigned`; optional Add Farmer Manually if `farmerPerm.can_edit`

## Test Cases

### Success Scenarios
#### APP-TC-020: Show assigned routes with profile counts
- **Expected UI behavior**: Route cards with villages count + Profiles count

#### APP-TC-021: Drill into route villages then farmer profiles
- **Expected UI behavior**: Back to Routes / Back to Villages; EntityCards for village

#### APP-TC-022: Others unrouted route appears when farmers outside routes
- **Expected UI behavior**: Card named `Others` with unrouted villages

#### APP-TC-023: Open Temp Dealers from route or village
- **Expected UI behavior**: Navigate TempDealersListScreen with title + villages array

#### APP-TC-024: Open Village Farm Diaries from profiles header
- **Expected UI behavior**: Navigate `VillageFarmDiariesScreen` with village context (as coded)

### Business Logic Failure / Branch Scenarios
#### APP-TC-025: Empty villages not openable
- **Condition**: `v.count === 0`
- **Expected UI behavior**: No chevron; info “No profiles in this village yet”; press ignored

#### APP-TC-026: No routes empty state
- **Expected UI behavior**: `No Routes Assigned`; Add Farmer Manually only if `farmerPerm.can_edit`

---

# Test Scenario: Dashboard — Territory Analytics Modal

## Operation Overview
- **Module ID**: dashboard
- **UI Entry**: Analysis button on routes or villages views
- **Primary files**: `DashboardScreen.tsx`, `AnalyticsTable.tsx`
- **Handler / function**: `setAnalyticsModalConfig`; `exportToPDF`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Modal pageSheet with AnalyticsTable columns per route/village
2. Metrics: villages, farmers, completed, drafts, FSPP count, avg score, land, crops, soils, bio stage, last visited
3. PDF share via Print + Sharing; failure alert `PDF Error` / Failed to generate or share PDF
4. Empty entities → `No data available to display.`

## Test Cases

### Success Scenarios
#### APP-TC-027: Open Routes Analysis modal
- **Expected UI behavior**: Modal title Analysis; table Routes Analysis metrics

#### APP-TC-028: Open Villages Analysis modal
- **Expected UI behavior**: Per-village columns for selected route

#### APP-TC-029: Export analytics PDF
- **Expected UI behavior**: Share analytics PDF; dialog title Save Analytics PDF

### Business Logic Failure / Branch Scenarios
#### APP-TC-030: Analytics PDF export failure
- **Expected UI behavior**: Alert `PDF Error` / Failed to generate or share PDF

#### APP-TC-031: Analytics empty entities
- **Expected UI behavior**: `No data available to display.`

---

# Test Scenario: Dashboard — Temp Dealers List & Card Actions

## Operation Overview
- **Module ID**: dashboard
- **UI Entry**: `TempDealersListScreen` from Farmers drill-down
- **Primary files**: `TempDealersListScreen.tsx`, `TempDealerCard.tsx`, `fetchTempDealersByVillages`
- **API / data ops**: `temp_dealers` select then client village filter
- **Layer**: APP

## Code Analysis
1. Loading spinner then count `Dealers Located`
2. Empty: No Dealers Found + Go Back
3. Card: Call (`tel:` first number), Map (maps URL), WhatsApp share text; Call disabled without mobile

## Test Cases

### Success Scenarios
#### APP-TC-032: List temp dealers for villages
- **Expected UI behavior**: Cards for matching villages

#### APP-TC-033: Call / Map / Share from TempDealerCard
- **Expected UI behavior**: Opens tel / maps / whatsapp://send with composed text

### Business Logic Failure / Branch Scenarios
#### APP-TC-034: No matching temp dealers
- **Expected UI behavior**: EmptyState No Dealers Found

#### APP-TC-035: Call disabled without mobile
- **Expected UI behavior**: Call pressable disabled / muted styling

#### APP-TC-036: Empty villages returns []
- **Condition**: `fetchTempDealersByVillages` empty input
- **Expected UI behavior**: No dealers listed

---

# Test Scenario: Dashboard — Merge Drafts into Entity Lists

## Operation Overview
- **Module ID**: dashboard
- **UI Entry**: Any entity tab list
- **Primary files**: `DashboardScreen.tsx` mappedDrafts + processed*

## Code Analysis
1. Drafts prepended; hidden when same mobile already submitted
2. Draft cards Incomplete; resume/delete via EntityCard patterns

## Test Cases

### Success Scenarios
#### APP-TC-037: Show incomplete drafts alongside submitted entities
- **Expected UI behavior**: Draft appears in matching tab with Incomplete styling

### Business Logic Failure / Branch Scenarios
#### APP-TC-038: Hide draft when mobile already completed
- **Expected UI behavior**: Draft omitted from processed list

---

## Coverage Notes (provided sources only)
- **Covered**: shell/perms/tabs, load/refresh/paginate, draft migrate/delete, search/filters/FAB, farmers route drill-down, analytics PDF, temp dealers cards, AppNavigator offline gate for dashboard access.
- **hooks.ts**: only `useProfileActions` (logout/language) — not used by DashboardScreen; no Profile TCs invented here (belongs to user-profile).
- **Not invented**: full onboarding/FSPP/FarmDiary/shift punch internals (entry widgets/navigation only).
- `syncLocationsToSupabase` imported but unused in DashboardScreen — no TC.
- Optional `docs/business-rules/dashboard.md` cross-check only.

## Backend/Web Mapping Hints
- APP-TC-001 → open_dashboard
- APP-TC-002 → dashboard_tabs_by_permission
- APP-TC-003 → switch_dashboard_tab
- APP-TC-004 → permissions_loading
- APP-TC-005 → no_modules_assigned
- APP-TC-006 → offline_gate
- APP-TC-007 → list_dashboard_entities
- APP-TC-008 → refresh_dashboard
- APP-TC-009 → paginate_dashboard
- APP-TC-010 → migrate_local_drafts
- APP-TC-011 → delete_draft
- APP-TC-012 → skip_fetch_without_view
- APP-TC-013 → search_dashboard
- APP-TC-014 → apply_filters
- APP-TC-015 → empty_add_onboarding
- APP-TC-016 → hide_add_without_edit
- APP-TC-017 → farmer_flat_list_on_search_filter
- APP-TC-018 → fab_add_entity
- APP-TC-019 → hide_fab
- APP-TC-020 → list_routes
- APP-TC-021 → drilldown_route_village_profiles
- APP-TC-022 → unrouted_others
- APP-TC-023 → open_temp_dealers
- APP-TC-024 → open_village_farm_diaries
- APP-TC-025 → village_zero_profiles
- APP-TC-026 → no_routes_assigned
- APP-TC-027 → routes_analytics
- APP-TC-028 → villages_analytics
- APP-TC-029 → export_analytics_pdf
- APP-TC-030 → analytics_pdf_error
- APP-TC-031 → analytics_empty
- APP-TC-032 → list_temp_dealers
- APP-TC-033 → temp_dealer_call_map_share
- APP-TC-034 → temp_dealers_empty
- APP-TC-035 → temp_dealer_call_disabled
- APP-TC-036 → temp_dealers_no_villages
- APP-TC-037 → list_merged_drafts
- APP-TC-038 → hide_duplicate_mobile_draft
