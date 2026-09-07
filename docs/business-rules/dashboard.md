# Dashboard Business Rules

## 1. Scope

This specification covers the authenticated Field Commander dashboard, the current user's profile area, the four entity collections exposed from the dashboard, farmer route/village drill-down, entity cards and profiles, temporary dealer lookup, farmer follow-on actions, territory analytics, general-visit logging, shift status shown in the dashboard header, and navigation to onboarding and related modules.

The exact entity collections found in the original application are:

1. **Distributors** (`Distributors`, entity type `Distributor`)
2. **Dealers** (`Dealers`, entity type `Dealer`)
3. **Farmers** (`Farmers`, entity type `Farmer`)
4. **FPOs** (`FPOs`, entity type `FPO`, meaning Farmer Producer Organizations)

The dashboard is not an organization-wide directory. Normal collection queries are scoped to the authenticated user's identifier. Drafts and routes are also user-scoped. Temporary dealer lookup is location-scoped but, in the client code, is not user-scoped.

This document treats source technologies only as evidence. Version 2 requirements are behavioral and do not prescribe a framework, data store, API, navigation system, state mechanism, or synchronization design.

## 2. Dashboard Repository Evidence Map

### Screens and components

- `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx` — dashboard permissions, tab construction, paging, local search/filter/sort, route/village drill-down, analytics launch, refresh, pagination, draft migration, and add actions.
- `Frontend/src/modules/dashboard/screens/EntityProfileScreen.tsx` — read-only entity dossier, conditional entity sections, editing entry point, status/score presentation, phone/map/document/PDF actions, signatures, and missing-value fallbacks.
- `Frontend/src/modules/dashboard/screens/FarmerHubScreen.tsx` — farmer-specific workflow hub, draft resume, FSPP, Farm Card, Farm Diary, and General Visit eligibility.
- `Frontend/src/modules/dashboard/screens/ProfileScreen.tsx` — authenticated user identity, network counts, completion state, editable profile entry, language, logout, document display, and location-sync status.
- `Frontend/src/modules/dashboard/screens/TempDealersListScreen.tsx` — temporary dealer loading, count, list, empty state, and back behavior.
- `Frontend/src/modules/dashboard/screens/GeneralVisitScreen.tsx` — shift/date/comment prerequisites, duplicate-date prevention, persistence, activity logging, and feedback.
- `Frontend/src/design-system/components/EntityCard.tsx` — all four dashboard entity-card variants, draft actions, status/score/stage badges, press behavior, and field fallbacks.
- `Frontend/src/modules/dashboard/components/TempDealerCard.tsx` — temporary dealer fields and call/map/share actions.
- `Frontend/src/modules/dashboard/components/AnalyticsTable.tsx` — territory metrics, formulas, zero states, and PDF export.
- `Frontend/src/design-system/components/FilterModal.tsx` — exact sort/filter options, selection cardinality, apply/cancel/reset behavior, and active-filter badges.
- `Frontend/src/design-system/components/EmptyState.tsx` — conditional empty-state action.
- `Frontend/src/modules/shifts/components/ActiveShiftWidget.tsx` — dashboard attendance visibility and shift-state actions.

### Hooks and forms

- `Frontend/src/modules/dashboard/hooks.ts` — profile logout and language actions; currently redundant with direct screen logic.
- `Frontend/src/modules/onboarding/{dealer,distributor,farmer,fpo}/hooks.ts` — dashboard draft contracts, duplicate lookup, edit locks, submission state, draft deletion, and post-submit activity effects.
- `Frontend/src/modules/FSPP/hooks.ts`, `Frontend/src/modules/FarmCard/hooks.ts`, and Farm Diary hooks/screens — downstream farmer stages represented on cards and in filters.

### Schemas and validation

- `Frontend/src/modules/onboarding/{dealer,distributor,farmer,fpo,se}/schema.ts` — source entity field constraints; relevant when dashboard edit/resume opens onboarding.
- `Frontend/src/modules/FarmCard/schema.ts` — downstream eligibility data represented by farmer cards.
- The dashboard search, sort, and filter state has no independent validation schema.

### Services and APIs

- `Frontend/src/modules/dashboard/services/dashboardService.ts` — user-scoped entity, draft, route and profile reads; combined counts; temporary dealer lookup; draft deletion.
- `Frontend/src/modules/onboarding/services/onboardingService.ts` — creates/updates submitted dashboard entities and maps form fields into stored dashboard records.
- `Frontend/src/modules/FarmDiary/services/villageFarmDiaryService.ts` — consumes farmers passed from dashboard village navigation.
- `Frontend/src/modules/auth/services/authService.ts` — authentication metadata that supplies profile fallbacks.

### Stores and state

- `Frontend/src/store/authStore.ts` — persisted current-user identity and local logout state.
- `Frontend/src/store/draftStore.ts` — user-tagged fallback drafts and SE profile draft.
- `Frontend/src/store/shiftStore.ts` — attendance state, activity counters, dated visit events, and location capture.
- `Frontend/src/store/alertStore.ts` — global dashboard alerts and confirmations.

### Navigation

- `Frontend/src/navigation/AppNavigator.tsx` — authentication gate, initial dashboard route, dashboard stack, profile tab, related routes, global offline gate, and alert presentation.

### Core and shared utilities

- `Frontend/src/core/usePermissions.ts` — role/module permissions, cached permissions, refresh behavior, and elevated-role override.
- `Frontend/src/core/database.ts`, `locationTracker.ts`, and `locationUtils.ts` — pending location count and shift-location synchronization reflected in Profile.
- `Frontend/src/core/AutoLogoutProvider.tsx` — seven-day local session timeout.
- `Frontend/src/core/i18n.ts` and translation services — dashboard translation behavior and fallback risks.
- `Frontend/src/design-system/templates/Templates.tsx` — profile refresh and standard back/header behavior.

### Related modules

- Dealer, distributor, farmer, and FPO onboarding create/update the four dashboard entity types and their drafts.
- SE onboarding creates/updates the authenticated user's detailed profile.
- FSPP determines farmer qualification, score, stage, and Farm Card eligibility.
- Farm Card determines the third farmer stage and unlocks Farm Diary.
- Farm Diary receives village/farmer context from dashboard drill-down.
- Shifts gate General Visits and record dashboard-generated activity.
- Reports consume shift activity but do not alter dashboard entity counts.
- Retail reuses the shared filter modal but does not provide dashboard entities.

Repository-wide investigation indexed **328 frontend TypeScript/TSX files** and traced global references to dashboard symbols, routes, entity tables/fields, permissions, status values, search/filter/sort logic, profile sources, drafts, shifts, and downstream farmer workflows. The files above were inspected in depth because executable references led to them.

## 3. Dashboard Actors and Permissions

### DB-ACT-001 — Authenticated access gate

- Rule: Dashboard, profile, entity, onboarding, and related operational routes must be available only while a current authenticated user exists.
- Business purpose: Prevent unauthenticated access to operational and personal data.
- Trigger/condition: Application route resolution or authentication state change.
- Behavior/result: Authenticated users receive the main tabs; users without a session receive login/register routes.
- Actor/role: Any authenticated user.
- Affected workflow: Entire dashboard and all child routes.
- UX behavior: Session loss replaces operational navigation with authentication.
- Validation/error behavior: No dashboard-specific access-denied page is used for a missing session.
- Online/offline behavior: The original app blocks all navigation when connectivity is explicitly false.
- Enforcement requirement: Navigation access and data access must both enforce authentication.
- Dependencies: Current-user session.
- Original implementation evidence:
  - `Frontend/src/navigation/AppNavigator.tsx:96-194` — `AppNavigator`
- Confidence: High

### DB-ACT-002 — Module-specific view permissions

- Rule: Each entity tab must be shown and queried only when the user has view access to that entity module; Farmers is also available when the user has farmer-onboarding view access.
- Business purpose: Limit visibility and retrieval to assigned operational modules.
- Trigger/condition: Resolved module permissions.
- Behavior/result: Distributor, Dealer, Farmer, and FPO tabs are independently included or omitted; unauthorized collection queries return no client request.
- Actor/role: Users with assigned module permissions; elevated users receive all permissions; Sales Executives are granted the standard operational set in the original behavior.
- Affected workflow: Dashboard tabs, data loading, routes.
- UX behavior: Permission verification shows a spinner; no assigned entity modules shows “No Modules Assigned.”
- Validation/error behavior: Permission-fetch failure can resolve to no access without a dedicated error/retry message.
- Online/offline behavior: Cached permissions may appear first and are then refreshed; stale cached access can temporarily affect UI.
- Enforcement requirement: UI omission is not sufficient; record access must be authorized independently.
- Dependencies: Current user, role, module permission records/cache.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:42-53,162-183,546-576,620-660` — `DashboardScreen`
  - `Frontend/src/core/usePermissions.ts:15-106` — `usePermissions`
- Confidence: High

### DB-ACT-003 — Add/edit permission

- Rule: Add actions and empty-state onboarding actions must be visible only for entity types the user may edit; farmer add access is granted by either farmer edit or farmer-onboarding edit access.
- Business purpose: Prevent users from initiating unauthorized creation workflows.
- Trigger/condition: Per-module edit permission.
- Behavior/result: Floating add actions and empty-state buttons are omitted when edit access is absent.
- Actor/role: Authorized editors.
- Affected workflow: Dashboard creation entry points.
- UX behavior: Unauthorized actions are hidden, not disabled.
- Validation/error behavior: Child onboarding routes have no equivalent route-level permission guard in the navigator.
- Online/offline behavior: Based on cached/fresh permissions; the global offline gate blocks use.
- Enforcement requirement: Direct/deep navigation and persistence must recheck authorization.
- Dependencies: Entity module and farmer-onboarding permissions.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:52-53,578-589,798-800,1011-1055` — `fabActions`, `EmptyState`
- Confidence: High

### DB-ACT-004 — Entity ownership isolation

- Rule: Standard dashboard entities, drafts, routes, profile details, and counts must be limited to the authenticated user's authorized scope.
- Business purpose: Prevent one field user from seeing another user's assigned network.
- Trigger/condition: Every list, profile-summary, draft, and route retrieval.
- Behavior/result: Records are selected using the current user's identifier.
- Actor/role: Authenticated field user.
- Affected workflow: Dashboard, current-user profile, network counts.
- UX behavior: No cross-user selector is presented.
- Validation/error behavior: Missing user identity prevents loading.
- Online/offline behavior: Previously loaded in-memory data may remain until remount/logout; no dashboard cache contract is defined.
- Enforcement requirement: Server-side authorization must not rely solely on client filters.
- Dependencies: Authenticated identity and entity ownership/assignment.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/services/dashboardService.ts:13-118,144-172` — `fetchMy*`, `fetchSEProfile`, `fetchNetworkSummary`
- Confidence: High

### DB-ACT-005 — Attendance control permission

- Rule: Punch-in/out controls in the dashboard header must be hidden unless the user may edit travel/attendance activity.
- Business purpose: Restrict attendance mutation to authorized staff.
- Trigger/condition: Travel-activity edit permission.
- Behavior/result: No attendance widget is rendered without edit permission.
- Actor/role: Attendance-authorized user.
- Affected workflow: Dashboard header and General Visit prerequisites.
- UX behavior: Hidden rather than disabled.
- Validation/error behavior: General Visit visibility uses farmer edit permission, not travel permission, but submission still requires an active shift.
- Online/offline behavior: Shift actions require network in the original app.
- Enforcement requirement: Shift persistence must independently authorize mutation.
- Dependencies: Travel permission, shift state.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:45-50,641-643` — `DashboardScreen`
  - `Frontend/src/modules/shifts/components/ActiveShiftWidget.tsx:16-27,95-98` — `ActiveShiftWidget`
- Confidence: High

## 4. Four Entity Tabs

The four tab definitions are conditional, so fewer than four tabs can be rendered. None is rendered disabled. The first visible permitted tab is initially active because state starts at index `0`. Tab state is in-memory, survives child-screen navigation while the dashboard remains mounted, and resets on remount. Refresh does not reset it. Search and filters are shared across all tabs and do not reset on tab change.

### DB-TAB-001 — Distributors tab

- Rule: Display label `Distributors`, internal key `Distributors`, entity type `Distributor`; include submitted distributor records plus non-duplicated distributor drafts.
- Business purpose: Manage the user's distributor network and incomplete distributor onboarding.
- Trigger/condition: Distributor view permission.
- Behavior/result: Loads up to 50 records per page, combines drafts, sorts newest by default, and opens profile/resume actions from cards.
- Actor/role: Distributor-authorized user.
- Affected workflow: Dashboard tab 0 when all tabs exist.
- UX behavior: Loading spinner; “No Distributors Yet” empty state; add action only with edit permission; tab hidden without view permission.
- Validation/error behavior: Fetch errors are logged only; empty UI can be shown after failure.
- Online/offline behavior: No functional offline list; draft fallback migration runs only when access is available.
- Enforcement requirement: Query and item access must enforce ownership and permission.
- Dependencies: Distributor records, distributor drafts, permissions.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:136-160,176-190,279-307,546-552` — `mappedDrafts`, `processedDistributors`, `tabPages`
- Confidence: High

### DB-TAB-002 — Dealers tab

- Rule: Display label `Dealers`, internal key `Dealers`, entity type `Dealer`; include submitted dealer records plus non-duplicated dealer drafts.
- Business purpose: Manage the user's dealer network and incomplete dealer onboarding.
- Trigger/condition: Dealer view permission.
- Behavior/result: Loads up to 50 records per page and exposes profile/resume, edit, phone, and map interactions.
- Actor/role: Dealer-authorized user.
- Affected workflow: Dashboard tab 1 only when Distributor precedes it; otherwise its index shifts.
- UX behavior: “No Dealers Yet” empty state; add action only with edit permission; hidden without view permission.
- Validation/error behavior: Fetch errors have no user-facing error state.
- Online/offline behavior: No offline list contract.
- Enforcement requirement: Permission and ownership must be checked beyond tab visibility.
- Dependencies: Dealer records/drafts and permissions.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:143-147,192-196,309-340,553-557` — `processedDealers`, `tabPages`
- Confidence: High

### DB-TAB-003 — Farmers tab

- Rule: Display label `Farmers`, internal key `Farmers`, entity type `Farmer`; access is granted by farmer view or farmer-onboarding view.
- Business purpose: Manage farmers and their progression through onboarding, FSPP, Farm Card, and Farm Diary.
- Trigger/condition: Farmer or farmer-onboarding view permission.
- Behavior/result: Default unsearched/unfiltered presentation is route cards, then village cards, then farmer profiles; search or any active filter replaces drill-down with a flat farmer list.
- Actor/role: Farmer-authorized or farmer-onboarding-authorized user.
- Affected workflow: Dashboard farmer tab and downstream farmer modules.
- UX behavior: “No Routes Assigned” in route mode; standard “No Farmers Yet/No Results Found” in flat mode; zero-count villages are visible but not navigable.
- Validation/error behavior: Route/farmer retrieval failures are not distinguished from empty results.
- Online/offline behavior: No offline list; local drafts can be migrated when online.
- Enforcement requirement: Farmer data and child actions require independent authorization.
- Dependencies: Farmers, drafts, routes, villages, FSPP, Farm Cards.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:52-53,148-153,198-202,342-489,558-562,733-979` — farmer processing and drill-down
- Confidence: High

### DB-TAB-004 — FPOs tab

- Rule: Display label `FPOs`, internal key `FPOs`, entity type `FPO`; include submitted FPO records plus non-duplicated FPO drafts.
- Business purpose: Manage the user's Farmer Producer Organizations and incomplete onboarding.
- Trigger/condition: FPO view permission.
- Behavior/result: Loads up to 50 records per page, combines drafts, and sorts newest first.
- Actor/role: FPO-authorized user.
- Affected workflow: Dashboard final visible tab.
- UX behavior: “No FPOs Yet” empty state; add action only with edit permission; hidden without view permission.
- Validation/error behavior: Fetch failure is console-only.
- Online/offline behavior: No offline list contract.
- Enforcement requirement: Query/item authorization is required.
- Dependencies: FPO records/drafts and permissions.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:154-158,204-207,492-542,563-567` — `processedFPOs`, `tabPages`
- Confidence: High

### DB-TAB-005 — Tab selection and persistence

- Rule: Users may select tabs by pressing labels or horizontal paging; an explicit route parameter may request a tab index once.
- Business purpose: Provide fast switching and profile-count shortcuts.
- Trigger/condition: Label press, swipe completion, or incoming `activeTab`.
- Behavior/result: Active index updates and the page scrolls; the route parameter is cleared; out-of-range state after permission changes resets to zero.
- Actor/role: Any dashboard-authorized user.
- Affected workflow: Dashboard tabs and Profile metric shortcuts.
- UX behavior: Active tab has a colored underline; no disabled tab state exists.
- Validation/error behavior: Incoming indexes are not mapped to entity identity or validated against dynamic permissions.
- Online/offline behavior: No persistence across remount; refresh preserves current state.
- Enforcement requirement: Navigation intent must target an entity identifier, not an unstable position.
- Dependencies: Dynamic `tabPages`.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:55-71,571-576,689-730` — `activeTab`
- Confidence: High

## 5. User Profile Rules

### DB-PRO-001 — Current-user identity composition

- Rule: The profile must identify the signed-in user using the detailed Sales Executive profile when available, with authentication metadata fallbacks.
- Business purpose: Show the user whose records and counts are being managed.
- Trigger/condition: Profile screen focus.
- Behavior/result: Detailed profile and network counts load in parallel. Name uses detailed first/last name, then authentication name, then “Sales Executive.” Secondary identity uses employee ID, otherwise `+91` plus authentication mobile, otherwise “No Contact Added.”
- Actor/role: Authenticated user.
- Affected workflow: Profile tab.
- UX behavior: Full-screen loading indicator on initial load; pull-to-refresh supported.
- Validation/error behavior: Load errors are console-only; stale/default data can be displayed.
- Online/offline behavior: Global offline gate prevents access.
- Enforcement requirement: Profile must be tied to the current identity and must not expose another user's data.
- Dependencies: Auth identity, detailed SE profile.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/ProfileScreen.tsx:19-67,85-100,185-201` — `ProfileScreen`
  - `Frontend/src/modules/dashboard/services/dashboardService.ts:110-118` — `fetchSEProfile`
- Confidence: High

### DB-PRO-002 — Profile completion and editing

- Rule: A complete profile shows detailed read-only sections and an Edit action; an incomplete profile shows completion guidance and a start/resume action.
- Business purpose: Encourage completion while separating display from editing.
- Trigger/condition: Completion is true in authentication metadata or the detailed profile record.
- Behavior/result: Complete users can open SE onboarding with current values. Incomplete users see “Profile In Progress” when a local SE draft exists, otherwise “Profile Incomplete.”
- Actor/role: Current authenticated user.
- Affected workflow: Profile and SE onboarding.
- UX behavior: Edit is hidden when incomplete. Draft progress is `round(((step - 1) / 6) × 100)%`, despite onboarding showing six data steps plus review in repository structure.
- Validation/error behavior: No consistency check reconciles two completion sources.
- Online/offline behavior: Local SE draft survives restarts; profile retrieval requires connectivity.
- Enforcement requirement: Only the user or an authorized administrator may edit the profile.
- Dependencies: Completion flags, SE draft, onboarding.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/ProfileScreen.tsx:85-95,172-182,227-313` — completion rendering
  - `Frontend/src/store/draftStore.ts:23-25,63-65` — `seDraft`
- Confidence: High

### DB-PRO-003 — Profile fields and missing values

- Rule: Complete profiles display personal, work-assignment, statutory/financial, assets/logistics, and document sections; absent scalar/list values display `N/A`, and absent required displayed documents show `Missing`.
- Business purpose: Give the current user a consolidated personnel record.
- Trigger/condition: Profile is complete.
- Behavior/result: Displays DOB, blood group, mobile, emergency contact, email, address, designation, manager, headquarters, territory, PAN, bank details, vehicle, license, assets, and three documents.
- Actor/role: Current user.
- Affected workflow: Profile.
- UX behavior: Profile image is shown when present, otherwise a person icon. Documents can be opened; opening shows progress.
- Validation/error behavior: Failed document opening shows “Could not load the document.”
- Online/offline behavior: Remote document viewing requires connectivity.
- Enforcement requirement: Sensitive identity and financial fields require authorized access and secure transport.
- Dependencies: SE profile nested data and media references.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/ProfileScreen.tsx:87-156,273-312` — `DataRow`, `DocRow`
- Confidence: High

### DB-PRO-004 — Network counts and shortcuts

- Rule: Profile displays combined submitted-plus-draft counts for Distributors, Dealers, Farmers, and FPOs; each metric acts as a dashboard shortcut.
- Business purpose: Summarize the user's workload and provide fast access.
- Trigger/condition: Profile focus/refresh.
- Behavior/result: Counts are independently aggregated from main records and drafts; null counts become zero.
- Actor/role: Current authenticated user.
- Affected workflow: Profile metrics and dashboard navigation.
- UX behavior: Four pressable statistic boxes always render, regardless of entity permissions.
- Validation/error behavior: Individual count query errors are not checked, so failed counts can appear as zero.
- Online/offline behavior: Not available through the global offline gate.
- Enforcement requirement: Counts must use the same authorization and entity semantics as lists.
- Dependencies: Entity and draft records.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/ProfileScreen.tsx:27,47-55,203-225` — metric boxes
  - `Frontend/src/modules/dashboard/services/dashboardService.ts:144-172` — `fetchNetworkSummary`
- Confidence: High

### DB-PRO-005 — Language, logout, and sync status

- Rule: Profile allows English, Gujarati, or Hindi selection; exposes logout; and reports whether shift-location samples remain pending synchronization.
- Business purpose: Personalize language, end access, and communicate tracking-data state.
- Trigger/condition: Profile interaction and five-second pending-count polling.
- Behavior/result: Language changes immediately. Pending count greater than zero shows warning styling and count; zero shows synced status. Logout removes the local current user.
- Actor/role: Current user.
- Affected workflow: Profile and application session.
- UX behavior: Selected language is highlighted; logout is a danger action; no logout confirmation is shown.
- Validation/error behavior: No user-facing language failure; local logout does not explicitly terminate the remote session in this handler.
- Online/offline behavior: Pending count is local; however Profile cannot be reached while globally offline.
- Enforcement requirement: Logout must terminate/invalidates the effective session, not only hide local UI.
- Dependencies: Translation state, authentication state, pending location queue.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/ProfileScreen.tsx:30-42,75,315-356` — language/logout/sync UI
  - `Frontend/src/store/authStore.ts:14-25` — `logout`
- Confidence: High

## 6. Entity-Card Rules

### DB-CARD-001 — Shared entity-card identity and fallback

- Rule: Every standard card displays entity name, available city/state, entity type, available type-specific details, draft/submission state, and score/stage information where applicable.
- Business purpose: Make records scannable without opening the dossier.
- Trigger/condition: Entity record or draft appears in the processed collection.
- Behavior/result: Empty type-specific blocks are omitted; if all are absent, “Profile details are incomplete” is displayed.
- Actor/role: User with tab view access.
- Affected workflow: All four tabs and farmer village profile lists.
- UX behavior: Draft cards have a draft badge and neutral stripe; submitted records show Approved when status is exactly `SUBMITTED`, otherwise Pending.
- Validation/error behavior: Missing names are normalized earlier for drafts but submitted null names can render blank.
- Online/offline behavior: Represents loaded in-memory data only; no stale marker.
- Enforcement requirement: Displayed state must derive consistently from authoritative lifecycle values.
- Dependencies: Mapped entity shape.
- Original implementation evidence:
  - `Frontend/src/design-system/components/EntityCard.tsx:22-94,112-160,203-267` — `EntityCard`
- Confidence: High

### DB-CARD-002 — Distributor card

- Rule: Distributor cards show contact person, phone, firm type, and turnover potential when present; submitted cards expose Edit Profile and View Profile, drafts expose delete and Resume Onboarding.
- Business purpose: Summarize distributor identity, capacity, and lifecycle actions.
- Trigger/condition: `item.type === "Distributor"`.
- Behavior/result: Phone is callable with `+91` display; turnover is formatted as currency plus `Cr`; card body itself is not pressable.
- Actor/role: User with distributor tab access.
- Affected workflow: Distributors tab.
- UX behavior: Orange distributor badge; score displayed for submitted records.
- Validation/error behavior: Actions are not conditionally hidden by edit permission.
- Online/offline behavior: Actions require reachable child data/routes.
- Enforcement requirement: Edit action must require edit permission.
- Dependencies: Distributor fields and onboarding/profile routes.
- Original implementation evidence:
  - `Frontend/src/design-system/components/EntityCard.tsx:49-60,163-199,308-331` — distributor branches
- Confidence: High

### DB-CARD-003 — Dealer card

- Rule: Dealer cards show contact/owner, phone, firm type, establishment year, and optional map action; submitted cards expose edit/view and drafts delete/resume.
- Business purpose: Summarize dealer identity and location.
- Trigger/condition: `item.type === "Dealer"`.
- Behavior/result: Map is shown only when exterior latitude and longitude are truthy; phone opens dialing.
- Actor/role: User with dealer tab access.
- Affected workflow: Dealers tab.
- UX behavior: Dealer badge, score/category, status.
- Validation/error behavior: Edit action is not permission-gated; external-link failures are not handled.
- Online/offline behavior: Map requires external connectivity/application.
- Enforcement requirement: Edit and profile access require authorization.
- Dependencies: Dealer location and profile fields.
- Original implementation evidence:
  - `Frontend/src/design-system/components/EntityCard.tsx:27,33,37-48,151-159,182-194,312-329` — dealer card
- Confidence: High

### DB-CARD-004 — Farmer card

- Rule: Farmer cards show phone, land, crops, water sources, submission status, optional FSPP score/category, and a three-stage progress indicator; pressing anywhere opens Farmer Hub.
- Business purpose: Show farmer progression and expose downstream workflows.
- Trigger/condition: `item.type === "Farmer"`.
- Behavior/result: Stage 1 is always complete for submitted farmers; Stage 2 is complete when FSPP details is a non-empty object; Stage 3 is complete when a farm-card flag is true or joined Farm Cards are non-empty.
- Actor/role: User with farmer tab access.
- Affected workflow: Farmers list and Farmer Hub.
- UX behavior: Draft farmer cards also open Farmer Hub; unlike other entities they do not show a bottom Resume/View action.
- Validation/error behavior: Score category displayed by card uses A for score ≥70, B for ≥50, else C; color thresholds use >60, ≥46, ≥26, creating inconsistent bands.
- Online/offline behavior: No offline/stale marker.
- Enforcement requirement: Follow-on actions must revalidate record state and permissions.
- Dependencies: Farmer, FSPP, Farm Card data.
- Original implementation evidence:
  - `Frontend/src/design-system/components/EntityCard.tsx:61-75,106-115,252-306` — farmer card
- Confidence: High

### DB-CARD-005 — FPO card

- Rule: FPO cards show CEO, phone, promoting agency, and total members when present; submitted cards expose edit/view and drafts delete/resume.
- Business purpose: Summarize FPO leadership and scale.
- Trigger/condition: `item.type === "FPO"`.
- Behavior/result: FPO records use the shared status and score presentation.
- Actor/role: User with FPO view access.
- Affected workflow: FPOs tab.
- UX behavior: Purple entity badge; no whole-card navigation.
- Validation/error behavior: Edit is not permission-gated; displayed total-members field differs from the filter's primary top-level source.
- Online/offline behavior: No offline/stale marker.
- Enforcement requirement: Edit must require authorization.
- Dependencies: FPO profile/onboarding.
- Original implementation evidence:
  - `Frontend/src/design-system/components/EntityCard.tsx:76-87,182-194,308-329` — FPO branch
- Confidence: High

### DB-CARD-006 — Draft deletion and duplicate suppression

- Rule: Draft cards may be deleted only after confirmation; drafts whose contact phone matches a completed record are omitted from each entity list.
- Business purpose: Remove abandoned work and reduce duplicate draft/submitted cards.
- Trigger/condition: Draft delete action or list processing.
- Behavior/result: Cancel preserves draft; Delete removes by draft entity identifier and refreshes. Suppression compares entity-specific phone fields.
- Actor/role: Tab viewer; no explicit edit permission is checked.
- Affected workflow: All four tabs.
- UX behavior: Delete icon replaces the submitted-record overflow menu.
- Validation/error behavior: Deletion failure is console-only. Missing phone values can suppress multiple drafts when a completed record also has an undefined phone.
- Online/offline behavior: Remote draft deletion requires connectivity; local fallback copy is not directly deleted by this action after migration logic.
- Enforcement requirement: Delete requires ownership/edit authorization and exact draft identity.
- Dependencies: Draft entity ID, completed-record phone.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:279-284,310-314,343-347,492-497,591-614` — suppression and `handleDeleteDraft`
  - `Frontend/src/design-system/components/EntityCard.tsx:163-168` — delete action
- Confidence: High

### DB-CARD-007 — Temporary dealer card

- Rule: Temporary dealer cards display imported dealer name, contact, mobile, village, and address/location; allow call only when mobile exists, and always expose map and share actions.
- Business purpose: Help field users contact prospect dealers in selected villages.
- Trigger/condition: Temporary dealer record matches selected villages.
- Behavior/result: Multiple phone values use the first comma-separated number for dialing; share constructs a formatted message; map searches by dealer name plus address.
- Actor/role: Any user who reaches the farmer route/village dealer list.
- Affected workflow: Temporary dealer list.
- UX behavior: Missing values fall back to Unknown Dealer, blank location, or N/A; Call is visibly disabled without mobile.
- Validation/error behavior: No error handling for unavailable dialer, map, or messaging application.
- Online/offline behavior: External actions depend on device application/network.
- Enforcement requirement: Imported field aliases must normalize consistently; sensitive contact sharing should follow authorization policy.
- Dependencies: Temporary dealer import fields.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/components/TempDealerCard.tsx:7-75` — `TempDealerCard`
- Confidence: High

## 7. Search Rules

### DB-SEA-001 — Shared immediate local search

- Rule: A single search query applies immediately, on every keystroke, to the currently rendered entity collection; matching is case-insensitive partial containment.
- Business purpose: Quickly locate visible loaded records by identity or location.
- Trigger/condition: Search text changes and contains non-whitespace.
- Behavior/result: No submit, debounce, or minimum length. The original query is lowercased but not trimmed before matching; the decision to search uses a trimmed check.
- Actor/role: Any dashboard user.
- Affected workflow: All four tabs.
- UX behavior: Placeholder is “Search by name, phone, or location...”; no clear icon; deleting all text restores unsearched results.
- Validation/error behavior: Search errors cannot occur independently because it is local.
- Online/offline behavior: Searches only records already loaded; global offline gate prevents dashboard use.
- Enforcement requirement: Search must not broaden authorization or imply complete server-wide results.
- Dependencies: Loaded pages, shared query.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:129-131,286-295,316-325,349-359,499-508,664-674` — search state and predicates
- Confidence: High

### DB-SEA-002 — Exact searched fields

- Rule: Distributor search covers name, city, state, contact person, and contact mobile; Dealer covers name, city, state, contact person, and contact mobile; Farmer covers name, city, state, village, father/husband name, and mobile; FPO covers name, city, state, CEO name, and contact mobile.
- Business purpose: Match the identifying fields used by field staff.
- Trigger/condition: Non-empty shared query.
- Behavior/result: Text fields are case-insensitive partial matches; phone fields use partial string matching.
- Actor/role: Current tab viewer.
- Affected workflow: Entity lists.
- UX behavior: No indication of which field matched.
- Validation/error behavior: Some draft/submitted aliases are supported, but not all profile display aliases are searched.
- Online/offline behavior: Limited to loaded pages and loaded drafts.
- Enforcement requirement: Field coverage and aliases must be explicit and testable.
- Dependencies: Entity mapping and raw fields.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:286-294,316-324,349-358,499-507` — `processed*`
- Confidence: High

### DB-SEA-003 — Search interaction with tabs, filters, counts, and navigation

- Rule: Search text persists across tab switches and child navigation while the dashboard remains mounted; it combines with active filters using AND and is applied before sorting.
- Business purpose: Preserve user context while comparing entity collections.
- Trigger/condition: Tab switch, filter application, or return from child screen.
- Behavior/result: Shared query is reinterpreted against each tab's fields. Farmer search exits route/village drill-down into a flat list. Route/village and profile summary counts ignore search.
- Actor/role: Dashboard user.
- Affected workflow: All tabs, especially Farmers.
- UX behavior: No-results state says “No Results Found” and “Try adjusting your search criteria.”
- Validation/error behavior: No warning that only loaded pages are searched or that counts are unaffected.
- Online/offline behavior: No offline search access.
- Enforcement requirement: Version 2 must define whether search is global-complete or loaded-subset; original behavior is loaded-subset.
- Dependencies: Shared state, pagination, filters.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:279-542,733-734,1005-1009` — processed lists and empty state
- Confidence: High

## 8. Sorting Rules

### DB-SORT-001 — Default and persistence

- Rule: Default sort is newest updated/created record first; sort selection is shared across entity tabs and persists until dashboard remount or Reset is applied and then committed.
- Business purpose: Prioritize recent work.
- Trigger/condition: List processing or applied sort choice.
- Behavior/result: Missing/invalid timestamps compare as epoch zero and therefore normally appear last.
- Actor/role: Dashboard user.
- Affected workflow: All entity tabs.
- UX behavior: Active sort is indicated only inside the filter modal; filter button shows active styling for any deviation from all defaults.
- Validation/error behavior: No stable tie-breaker is defined.
- Online/offline behavior: Applies locally to loaded records.
- Enforcement requirement: Sort semantics must be consistent across pagination.
- Dependencies: `updatedAt` mapping and shared filter state.
- Original implementation evidence:
  - `Frontend/src/design-system/components/FilterModal.tsx:31-53,199-229` — sort choices
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:301-305,334-338,422-426,537-539` — sort comparators
- Confidence: High

### DB-SORT-002 — Entity-specific sort options

- Rule: Distributors and Dealers support Newest First, Highest Score, Lowest Score; Farmers support Newest First, Largest Land Holding, Smallest Land Holding; FPOs expose only Newest First.
- Business purpose: Prioritize entity-specific business attributes.
- Trigger/condition: Current entity type in filter modal.
- Behavior/result: Score and land are compared numerically; missing scores/land map to zero in most mapped records. FPO processing ignores non-latest sort values inherited from another tab.
- Actor/role: Dashboard user.
- Affected workflow: Four entity tabs.
- UX behavior: Choices are single-select radio controls.
- Validation/error behavior: Shared sort value can be invalid for the newly selected tab but remains active and highlighted only when its option exists.
- Online/offline behavior: Local sorting only.
- Enforcement requirement: Unsupported sort values should reset or be scoped per entity.
- Dependencies: Current tab and entity fields.
- Original implementation evidence:
  - `Frontend/src/design-system/components/FilterModal.tsx:210-220` — displayed options
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:301-305,334-338,422-426,537-539` — applied behavior
- Confidence: High

### DB-SORT-003 — Route and village ordering

- Rule: Farmer route cards sort alphabetically by route name, with the synthetic “Others” route appended last; villages retain their source order.
- Business purpose: Make assigned routes predictable while preserving configured village order.
- Trigger/condition: Unsearched/unfiltered Farmer route mode.
- Behavior/result: Route name comparison is locale-aware; “Others” is added only when at least one farmer has a non-empty village outside assigned route villages.
- Actor/role: Farmer tab viewer.
- Affected workflow: Farmer route/village drill-down.
- UX behavior: No sorting control is shown for route/village cards.
- Validation/error behavior: Duplicate village names are not deduplicated within configured route lists.
- Online/offline behavior: Uses loaded routes/farmers/drafts.
- Enforcement requirement: Route counts and ordering should use normalized village identity.
- Dependencies: Assigned routes and farmer village values.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:431-489` — `processedRoutes`, `processedVillages`
- Confidence: High

## 9. Filtering Rules

### DB-FIL-001 — Filter application model

- Rule: Filters are edited in a temporary modal state and affect the dashboard only when Apply Settings is pressed; dismiss/close cancels unapplied changes.
- Business purpose: Let users configure multiple criteria without repeatedly changing results.
- Trigger/condition: Open, change, Apply, outside press, close, or Reset.
- Behavior/result: Open copies current applied filters. Reset resets only the modal copy until Apply. Categories combine with AND; multiple selected values within a checkbox category combine with OR. Farmer Stage is single-select.
- Actor/role: Dashboard user.
- Affected workflow: All tabs.
- UX behavior: Each expanded category shows selected count; active filter button has highlighted color/border.
- Validation/error behavior: Filters unsupported by the active entity remain stored and can keep the button active even when they do not affect that tab.
- Online/offline behavior: Applied locally to loaded records.
- Enforcement requirement: Filter scope and reset behavior must be explicit per entity.
- Dependencies: Shared `FilterState`.
- Original implementation evidence:
  - `Frontend/src/design-system/components/FilterModal.tsx:152-175,176-197,465-467` — modal state/apply/reset
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:296-299,327-332,361-420,510-535,544` — logical combination
- Confidence: High

### DB-FIL-002 — Distributor filters

- Rule: Distributor filters are Completion Status, Score Grade/Band, Proposed Status, and Cold Chain Facility.
- Business purpose: Segment distributors by lifecycle, assessment, intended relationship, and capability.
- Trigger/condition: One or more distributor filter values applied.
- Behavior/result: Draft/completed uses draft flag; band uses substring match; status and cold-chain use exact membership. Categories combine with AND, selected values within each category with OR.
- Actor/role: Distributor tab viewer.
- Affected workflow: Distributors.
- UX behavior: Exact options: Submitted/Draft; Grade A+, Grade A, Grade B, Grade C; Authorised Distributor/Exclusive Focus Area; Yes/No.
- Validation/error behavior: Grade A substring also matches “Grade A+,” so selecting Grade A can include Grade A+ records.
- Online/offline behavior: Loaded-subset local filtering.
- Enforcement requirement: Grade matching must use exact normalized values if bands are exclusive.
- Dependencies: `band`, proposed status, cold-chain fields.
- Original implementation evidence:
  - `Frontend/src/design-system/components/FilterModal.tsx:238-248,316-348` — options
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:296-299` — predicates
- Confidence: High

### DB-FIL-003 — Dealer filters

- Rule: Dealer filters are Completion Status, Risk Category, Proposed Status, Firm Type, Distributor Linkage, and Demo Farmer Willingness.
- Business purpose: Segment dealers by lifecycle, score grouping, relationship, legal form, and field commitment.
- Trigger/condition: Applied dealer criteria.
- Behavior/result: Categories combine with AND and values within a category with OR. Linkage is “Linked” only when source value equals `Yes`; all other values become Unlinked. Willingness is “Yes” only for exact `Yes`; all other values become No.
- Actor/role: Dealer tab viewer.
- Affected workflow: Dealers.
- UX behavior: Risk options are Elite, A-Category, B-Category, C-Category; proposed status and firm type use exact labels.
- Validation/error behavior: Missing linkage/willingness is classified as negative rather than unknown. Risk category is read from stored category and not recalculated from score.
- Online/offline behavior: Loaded-subset local filtering.
- Enforcement requirement: Unknown values must not silently become No/Unlinked unless that is an approved business rule.
- Dependencies: Dealer category/status/link/commitment fields.
- Original implementation evidence:
  - `Frontend/src/design-system/components/FilterModal.tsx:238-248,262-314` — dealer options
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:327-332` — dealer predicates
- Confidence: High

### DB-FIL-004 — Farmer stage and route filters

- Rule: Farmer Stage is one of Submitted, FSPP, or Farm Card; Assigned Routes may select multiple routes.
- Business purpose: Locate farmers by progression and assignment.
- Trigger/condition: Stage or route filter applied.
- Behavior/result: Submitted matches any non-draft; FSPP matches presence of `statusLabel`; Farm Card matches joined Farm Cards. Multiple routes are OR'd by their normalized village sets. Stage is single-select in UI although executable predicate supports OR for multiple values.
- Actor/role: Farmer tab viewer.
- Affected workflow: Farmers flat list.
- UX behavior: Applying any filter replaces route drill-down with flat results.
- Validation/error behavior: A submitted farmer with FSPP/Farm Card belongs to multiple stages conceptually, but the UI permits only one stage criterion.
- Online/offline behavior: Uses loaded farmers, drafts, routes.
- Enforcement requirement: Stage definitions must be authoritative and named consistently.
- Dependencies: Draft flag, FSPP status, Farm Cards, route villages.
- Original implementation evidence:
  - `Frontend/src/design-system/components/FilterModal.tsx:350-371` — route/stage controls
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:361-398` — predicates
- Confidence: High

### DB-FIL-005 — Farmer land, crop, soil, and water filters

- Rule: Farm Scale values are Marginal `<2`, Small `2–5` inclusive, and Large `>5`; crop, soil, and water categories are multi-select.
- Business purpose: Segment farmers by production profile.
- Trigger/condition: Applied criteria.
- Behavior/result: Missing/non-numeric land becomes zero and is therefore Marginal. Crop/soil/water selections are OR within category; categories are AND. “Others” means any value outside the hardcoded predefined set.
- Actor/role: Farmer tab viewer.
- Affected workflow: Farmers.
- UX behavior: Crop options are Cotton, Groundnut, Sugarcane, Wheat, Bajra, Maize, Castor, Soybean; predefined soils Black/Sandy/Red/Loamy; water Canal/Borewell/Rain.
- Validation/error behavior: UI label says Large `>5`, matching code; missing land incorrectly classifies as Marginal. Alternate field aliases are only partially supported.
- Online/offline behavior: Loaded-subset local filtering.
- Enforcement requirement: Missing values should be distinguishable from zero.
- Dependencies: Farmer farm details.
- Original implementation evidence:
  - `Frontend/src/design-system/components/FilterModal.tsx:373-420` — options
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:400-420` — predicates
- Confidence: High

### DB-FIL-006 — FPO filters

- Rule: FPO filters are Completion Status, member scale, business activities, and promoting agency.
- Business purpose: Segment FPOs by lifecycle, size, operating model, and sponsor.
- Trigger/condition: Applied FPO criteria.
- Behavior/result: Scale is Small `<250`, Medium `250–1000` inclusive, Large `>1000`; missing/non-numeric members become zero and therefore Small. Activities are OR within the category; categories combine with AND.
- Actor/role: FPO tab viewer.
- Affected workflow: FPOs.
- UX behavior: Agencies: NABARD, SFAC, NCDC, State Govt, NGO / CSR, Independent.
- Validation/error behavior: Filter reads top-level total-member aliases while profile card displays nested member-base total, creating possible disagreement.
- Online/offline behavior: Loaded-subset local filtering.
- Enforcement requirement: A single canonical member-count definition is required.
- Dependencies: FPO members, activities, agency.
- Original implementation evidence:
  - `Frontend/src/design-system/components/FilterModal.tsx:424-461` — options
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:510-535` — predicates
- Confidence: High

## 10. Dashboard Metrics and Analytics Rules

### DB-MET-001 — Route and village counts

- Rule: Route and village cards count submitted farmers plus farmer drafts by normalized village name, independent of active search/filters.
- Business purpose: Provide stable territory workload counts.
- Trigger/condition: Farmer route/village rendering.
- Behavior/result: A farmer counts in each route containing its village; unrouted farmers with non-empty villages form “Others.” Villages with zero farmers remain visible for normal routes but are omitted from “Others.”
- Actor/role: Farmer tab viewer.
- Affected workflow: Farmer drill-down.
- UX behavior: Route shows village count and profile count; village shows onboarded count or “No profiles in this village yet.”
- Validation/error behavior: A village assigned to multiple routes double-counts the same farmer across route analytics.
- Online/offline behavior: Counts cover only loaded pages plus all loaded drafts, so pagination can make them incomplete.
- Enforcement requirement: Metrics must declare scope and avoid duplicate assignment counting where required.
- Dependencies: Routes, villages, loaded farmers/drafts.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:431-489,761-895` — route/village metrics
- Confidence: High

### DB-MET-002 — Territory analytics formulas

- Rule: For each route/village analytics column calculate village count, farmer count, completed count, draft count, FSPP count, average FSPP score, total land, committed land, average land, crop distribution, top two soil distribution, biofertilizer/FSPP stage distribution, and most recent record timestamp.
- Business purpose: Compare territory composition and progression.
- Trigger/condition: Analysis action in route, village list, or village profile header.
- Behavior/result: Completed = neither draft flag; FSPP = non-empty FSPP object; average score is rounded over FSPP records with missing score treated as zero; total/committed/average land use numeric conversion; land outputs one decimal.
- Actor/role: Farmer tab viewer.
- Affected workflow: Analytics modal.
- UX behavior: Empty entity set shows “No data available to display”; entity with no farmers shows zero/emdash metrics.
- Validation/error behavior: “Last Visited” actually uses latest updated/created timestamp, not visit records. “Major Crops” lists all crops despite “top” naming.
- Online/offline behavior: Based on loaded records only.
- Enforcement requirement: Metric labels must match formulas and scope.
- Dependencies: Farmer/farm/FSPP data and timestamps.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/components/AnalyticsTable.tsx:20-125` — `computeMetrics`, `rows`
- Confidence: High

### DB-MET-003 — Distribution percentages

- Rule: Crop, soil, and stage percentages use occurrence count divided by total occurrences, rounded to the nearest integer.
- Business purpose: Show relative composition.
- Trigger/condition: Non-empty analytics data.
- Behavior/result: A multi-crop farmer contributes once to each listed crop and increases the denominator for each crop; soil behaves similarly. Every farmer contributes exactly one stage using biofertilizer value, else FSPP status label, else Unknown.
- Actor/role: Farmer analytics viewer.
- Affected workflow: Analytics table/PDF.
- UX behavior: Crop results are sorted descending and all shown; soil is sorted and limited to two; stages are sorted and all shown.
- Validation/error behavior: Ties rely on runtime sort stability; duplicate values within one farmer are counted repeatedly.
- Online/offline behavior: Local computation.
- Enforcement requirement: Occurrence-based rather than farmer-based percentage semantics must be preserved or explicitly changed.
- Dependencies: Arrays and stage fields.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/components/AnalyticsTable.tsx:48-100` — distribution maps
- Confidence: High

### DB-MET-004 — Analytics export

- Rule: Analytics can be generated as a landscape PDF and handed to the device's sharing/save capability.
- Business purpose: Produce a portable territory report.
- Trigger/condition: PDF action.
- Behavior/result: Export contains the same rows and columns as the displayed table and includes export date.
- Actor/role: Analytics viewer.
- Affected workflow: Analytics modal.
- UX behavior: PDF button always visible for non-empty entity columns; no in-progress indicator or duplicate-click guard.
- Validation/error behavior: Failure shows “PDF Error — Failed to generate or share PDF.”
- Online/offline behavior: Generation is local; device sharing availability is assumed.
- Enforcement requirement: Export must respect the same authorization and data scope as the screen.
- Dependencies: Analytics data, device document/share capability.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/components/AnalyticsTable.tsx:127-180,182-200` — `exportToPDF`
- Confidence: High

## 11. Conditional Rendering and Interaction Matrix

| Element | Screen/tab | Display condition | Hidden/replaced/disabled/read-only condition | Role/data/network dependency | Resulting user behavior | Evidence |
|---|---|---|---|---|---|---|
| Permission loader | Dashboard | Permissions unresolved | Replaced by dashboard or no-access state when resolved | User/permission source | Waits; cannot interact | `DashboardScreen.tsx:646-661` |
| No Modules Assigned | Dashboard | No permitted entity module | Replaced by normal dashboard when any module allowed | Permissions | Contact administrator message | `DashboardScreen.tsx:620,652-660` |
| Entity tab | Dashboard | Corresponding view permission; Farmer also onboarding-view | Hidden otherwise; never disabled | Permissions | Select/swipe permitted collections | `DashboardScreen.tsx:546-568` |
| Search/filter row | Dashboard | Any dashboard access | Hidden during permission/no-access state | Permissions | Search/filter all visible tabs | `DashboardScreen.tsx:661-687` |
| Add floating menu | Dashboard | At least one editable entity | Hidden when no editable entity | Edit permissions | Opens matching onboarding | `DashboardScreen.tsx:578-589,1045-1055` |
| Empty-state add | Entity list | Empty and entity edit allowed | Hidden without edit permission | Edit permission | Opens onboarding | `DashboardScreen.tsx:995-1036` |
| Farmer route mode | Farmers | No search and all filters default | Replaced by flat list when search/filter active | Routes/farmers | Drill down route→village→profiles | `DashboardScreen.tsx:733-980` |
| Route Analysis | Farmer routes | Route mode | Hidden in flat mode | Loaded route/farmer data | Opens analytics | `DashboardScreen.tsx:740-759` |
| Village card navigation | Farmer villages | Count > 0 | Press has no effect at zero; chevron hidden; opacity reduced | Farmer count | Opens profiles only when non-empty | `DashboardScreen.tsx:857-894` |
| Farm Diary village action | Village profiles | `farmerPerm.can_view` | Hidden otherwise | Permission | Opens village diaries with farmer list | `DashboardScreen.tsx:956-973` |
| Entity draft delete | Standard card | Draft | Replaces submitted overflow menu | Draft identity; no edit check | Confirmation then delete | `EntityCard.tsx:163-199` |
| Edit Profile | Standard submitted card/profile | Non-draft/menu opened | Not permission-gated; profile screen always shows menu | Entity data | Opens matching onboarding | `EntityCard.tsx:182-194`; `EntityProfileScreen.tsx:315-330` |
| Whole-card press | Standard card | Farmer only | No whole-card action for other entities | Entity type | Opens Farmer Hub | `EntityCard.tsx:106-115` |
| Map action | Dealer card/profile | GPS latitude/longitude present | Hidden/replaced with LOCATION label otherwise | GPS/external map | Opens map | `EntityCard.tsx:151-159`; `EntityProfileScreen.tsx:398-406` |
| FSPP banner | Entity profile | Farmer and FSPP status label exists | Hidden otherwise | FSPP data | Shows category/status/optional score | `EntityProfileScreen.tsx:363-372` |
| Score tile | Entity profile | Dealer/Distributor, or Farmer with score | Hidden for FPO and unscored farmer | Score data | Shows score with threshold color | `EntityProfileScreen.tsx:374-384` |
| Compliance/media | Entity profile | Dealer, Distributor, or FPO | Hidden for Farmer | Entity type/documents | Opens documents | `EntityProfileScreen.tsx:795-837` |
| PDF actions | Entity profile | PDF reference present | Generate button replaces Download/Share when absent | PDF reference/device/network | Download/share or edit to generate | `EntityProfileScreen.tsx:879-897` |
| Farmer Profile/Resume | Farmer Hub | Always | Label/action depends on draft | Draft state | Resume onboarding or open dossier | `FarmerHubScreen.tsx:112-155` |
| General Visit | Farmer Hub | Farmer or onboarding edit access | Hidden otherwise | Permission/active shift at submit | Opens visit form | `FarmerHubScreen.tsx:157-189` |
| FSPP card | Farmer Hub | Submitted and farmer view | Hidden for draft/no farmer view | State/permission | Enroll/view assessment | `FarmerHubScreen.tsx:191-226` |
| Farm Cards card | Farmer Hub | Submitted, FSPP status exists, farmer view | Hidden otherwise; disabled unless category A/B or approved | FSPP/approval | Opens cards only when eligible | `FarmerHubScreen.tsx:228-266` |
| Farm Diaries card | Farmer Hub | Submitted, at least one Farm Card, farmer view | Hidden otherwise | Farm Card/permission | Opens Farm Diary | `FarmerHubScreen.tsx:268-290` |
| Profile Edit | User Profile | Profile complete | Hidden when incomplete | Completion | Opens profile edit | `ProfileScreen.tsx:172-182` |
| Detailed user sections | User Profile | Profile complete | Replaced by completion card when incomplete | Completion/profile data | Read-only display | `ProfileScreen.tsx:227-313` |
| Attendance widget | Dashboard header | Travel edit permission | Hidden otherwise | Permission/shift | Punch in/out/status | `ActiveShiftWidget.tsx:95-141` |
| Submit Visit | General Visit | Always visible | Shows loading during submission; handler rejects invalid state | Shift/date/comment/network | Persists one visit/date | `GeneralVisitScreen.tsx:47-166,207-212` |
| Entire application | Global | Connectivity not explicitly false | Replaced by offline feedback when false | Network monitor | Retry connection only | `AppNavigator.tsx:96-154` |

## 12. Dashboard Workflow and Navigation Rules

### DB-NAV-001 — Initial and child routes

- Rule: After authentication, the initial main tab is Dashboard and its initial stack screen is DashboardMain; Dashboard child routes are Entity Profile, Farmer Hub, General Visit, Temporary Dealers, and Village Farm Diaries.
- Business purpose: Make network management the default operational workspace.
- Trigger/condition: Successful authenticated navigation.
- Behavior/result: Bottom tabs also expose My Reports and Profile; child screens hide native headers and provide their own back actions.
- Actor/role: Authenticated user.
- Affected workflow: Main navigation.
- UX behavior: Back returns within stack; no deep-link configuration is defined.
- Validation/error behavior: Route parameters are untyped and not checked for missing/unauthorized/deleted records.
- Online/offline behavior: Global offline state replaces navigation.
- Enforcement requirement: Every destination must validate record existence and authorization.
- Dependencies: Authentication and route parameters.
- Original implementation evidence:
  - `Frontend/src/navigation/AppNavigator.tsx:52-94,156-194` — navigators
- Confidence: High

### DB-NAV-002 — Add, resume, view, and edit destinations

- Rule: Add opens the matching onboarding; drafts resume with draft ID/data/step; submitted non-farmer cards open Entity Profile; farmers first open Farmer Hub; edit passes stored raw entity data to matching onboarding.
- Business purpose: Preserve lifecycle context across dashboard actions.
- Trigger/condition: Card/menu/add interaction.
- Behavior/result: Distributor→Distributor Onboarding, Dealer→Dealer Onboarding, Farmer→Farmer Onboarding/Hub, FPO→FPO Onboarding.
- Actor/role: Viewer/editor as applicable, though original edit controls do not consistently enforce edit permission.
- Affected workflow: Dashboard to entity workflows.
- UX behavior: Draft action text is “Resume Onboarding”; submitted is “View Profile” or whole-card press for farmers.
- Validation/error behavior: Stale route data is passed by value; child screens may auto-fetch by phone but profile screen itself does not refresh.
- Online/offline behavior: Child operations are blocked globally offline.
- Enforcement requirement: Child workflows must reload authoritative state before mutation.
- Dependencies: Entity type, draft state, route definitions.
- Original implementation evidence:
  - `Frontend/src/design-system/components/EntityCard.tsx:106-110,182-194,308-329` — navigation
  - `Frontend/src/modules/dashboard/screens/FarmerHubScreen.tsx:112-124` — farmer primary action
- Confidence: High

### DB-NAV-003 — Farmer progression workflow

- Rule: Submitted farmers may proceed from Profile to FSPP; Farm Cards require FSPP status plus Category A/B or explicit approval; Farm Diary requires at least one Farm Card.
- Business purpose: Enforce staged farmer engagement.
- Trigger/condition: Farmer Hub state checks.
- Behavior/result: Ineligible Farm Cards are visible but disabled only when an FSPP status exists; before FSPP the entire Farm Cards action is hidden. Farm Diary is hidden until a card exists.
- Actor/role: Farmer-view user; General Visit additionally needs edit permission.
- Affected workflow: Farmer Hub.
- UX behavior: Locked Farm Cards says “Locked: Not Approved”; eligible via explicit approval outside A/B says “Approved.”
- Validation/error behavior: Farm Card existence check failure silently leaves Farm Diary hidden.
- Online/offline behavior: Eligibility checks require current data/network.
- Enforcement requirement: Downstream modules must enforce prerequisites independently.
- Dependencies: FSPP status/category/approval, Farm Card existence.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/FarmerHubScreen.tsx:34-47,71-83,191-290` — progression
- Confidence: High

### DB-NAV-004 — General Visit transition

- Rule: A General Visit may be submitted only while currently punched in, for a date with a shift, with a nonblank comment, and with no existing visit comment for the same normalized date on that farmer/draft.
- Business purpose: Tie visits to attendance and prevent duplicate daily visit notes.
- Trigger/condition: Submit Visit.
- Behavior/result: Date defaults to today, future dates are unavailable, format normalizes to `DD-MM-YYYY`, comment is trimmed, and a dated activity is appended to both entity comments and shift events.
- Actor/role: Farmer editor with active shift.
- Affected workflow: Farmer Hub → General Visit.
- UX behavior: Success alert returns to prior screen; validation alerts keep form open; duplicate submissions are guarded in memory.
- Validation/error behavior: Exact alerts cover inactive shift, blank comment, missing date, duplicate date, and missing shift; technical failure includes the underlying error message.
- Online/offline behavior: Requires live reads/updates; no queued visit behavior.
- Enforcement requirement: Duplicate-date and shift prerequisites require atomic server-side enforcement to prevent races.
- Dependencies: Farmer/draft, current user, shift, routes, location.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/GeneralVisitScreen.tsx:23-166,185-212` — `handleSubmit`
- Confidence: High

### DB-NAV-005 — Refresh and pagination

- Rule: Dashboard refresh must refresh permissions and shifts, then reload first-page entity data, drafts, and routes; reaching 50% from list end loads the next page when any entity type returned a full previous page.
- Business purpose: Reconcile permissions/attendance and progressively load network records.
- Trigger/condition: Pull-to-refresh, screen focus, or list end.
- Behavior/result: New records are merged by ID and all retained records sort by timestamp. First-page refresh does not clear older loaded pages.
- Actor/role: Dashboard user.
- Affected workflow: Lists and route counts.
- UX behavior: Pull indicator and footer spinner.
- Validation/error behavior: A failure in any parallel request fails the full batch; existing data remains with no error message.
- Online/offline behavior: Requires network.
- Enforcement requirement: Pagination must be per entity and must not create mixed, incomplete metric scope.
- Dependencies: Permission state and all collection services.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:162-260,987-994` — `loadData`, `onRefresh`
- Confidence: High

## 13. Dashboard Validation and Data Rules

### DB-DAT-001 — Dashboard entity contract

- Rule: Standard cards consume a normalized shape containing `id`, `name`, `type`, `city`, `state`, `score`, `raw`, `isDraft`, and `updatedAt`; drafts additionally carry `entityId` and `step`.
- Business purpose: Present heterogeneous entity records consistently.
- Trigger/condition: Data load.
- Behavior/result: Entity-specific source fields are transformed into the shared display contract; source record remains available as `raw`.
- Actor/role: Dashboard system.
- Affected workflow: Lists, cards, profiles, edit/resume.
- UX behavior: Draft fallback names are “Incomplete Distributor/Dealer/Farmer/FPO.”
- Validation/error behavior: There is no runtime contract validation before rendering/navigation.
- Online/offline behavior: Local drafts are transformed after migration into the same conceptual shape.
- Enforcement requirement: Version 2 requires an explicit validated contract and canonical field aliases.
- Dependencies: Entity/draft records.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:136-207` — mapping
- Confidence: High

### DB-DAT-002 — Draft lifecycle and migration

- Rule: Partial entity work must be restorable with entity type, owner, stable entity identifier, form data, current step, and update time; legacy local drafts are migrated once to the shared draft source and removed locally only after successful migration.
- Business purpose: Prevent loss of incomplete onboarding and avoid duplicate drafts.
- Trigger/condition: Dashboard mounted with authenticated user and local drafts.
- Behavior/result: Only unowned legacy drafts or drafts owned by current user migrate; records upsert by entity identifier; migration failure preserves local drafts and is console-only.
- Actor/role: Current user.
- Affected workflow: Dashboard drafts and onboarding resume.
- UX behavior: Empty lists may show “Syncing drafts...” during migration.
- Validation/error behavior: Draft type is lowercased; malformed draft shape has no validation.
- Online/offline behavior: Failed migration retains local fallback for later retry; no explicit retry schedule except dependency rerun/remount.
- Enforcement requirement: Ownership, idempotency, and conflict policy must be preserved.
- Dependencies: Current user, local drafts, remote drafts.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:85-122` — `migrateLocalDrafts`
  - `Frontend/src/store/draftStore.ts:7-70` — draft contract
- Confidence: High

### DB-DAT-003 — Submitted entity lifecycle

- Rule: Dashboard submitted entities originate from validated onboarding submissions, use status `SUBMITTED`, remove their corresponding draft after successful submission, and become editable through onboarding with authoritative data.
- Business purpose: Transition partial work into operational network records without duplicate draft cards.
- Trigger/condition: Successful entity submission.
- Behavior/result: Submission generates required dossier media before saving, persists the entity, logs shift activity when possible, removes draft, and shows success.
- Actor/role: Authorized entity editor.
- Affected workflow: Onboarding → dashboard.
- UX behavior: Dashboard reload on focus merges new/updated record.
- Validation/error behavior: Submission is blocked when required steps are invalid; errors show failure feedback.
- Online/offline behavior: Final submission requires network/media completion; drafts provide fallback, not queued final submission.
- Enforcement requirement: Final state transition and draft removal must be atomic/idempotent.
- Dependencies: Entity validation, current user, media reference, draft ID.
- Original implementation evidence:
  - `Frontend/src/modules/onboarding/{dealer,farmer}/hooks.ts` and corresponding distributor/FPO hooks — `submit`
  - `Frontend/src/modules/onboarding/services/onboardingService.ts` — `save*Onboarding`
- Confidence: High

### DB-DAT-004 — Entity profile status interpretation

- Rule: Entity Profile maps exact status `SUBMITTED` to “Approved” and every other status to “Draft”; cards map `SUBMITTED` to Approved and every other submitted-record status to Pending.
- Business purpose: Communicate lifecycle state.
- Trigger/condition: Profile/card rendering.
- Behavior/result: Two different fallback labels are used for the same non-`SUBMITTED` records.
- Actor/role: Entity viewer.
- Affected workflow: Cards and Entity Profile.
- UX behavior: Green submitted badge; neutral otherwise.
- Validation/error behavior: No explicit handling for rejected, archived, deleted, pending approval, or unknown statuses.
- Online/offline behavior: Uses passed snapshot.
- Enforcement requirement: Version 2 needs a canonical lifecycle vocabulary and transition policy.
- Dependencies: Entity `status`.
- Original implementation evidence:
  - `Frontend/src/design-system/components/EntityCard.tsx:243-249` — card status
  - `Frontend/src/modules/dashboard/screens/EntityProfileScreen.tsx:350-359` — profile status
- Confidence: High

### DB-DAT-005 — Entity dossier display

- Rule: Entity Profile is read-only and conditionally displays entity-specific identity, contact, location, banking, scoring, business scope, network, annexures, commitments, documents, signatures, and generated dossier actions.
- Business purpose: Consolidate submitted onboarding information.
- Trigger/condition: Entity type and field presence.
- Behavior/result: Dealer, Distributor, Farmer, and FPO receive distinct sections; missing scalar/list values generally show N/A; empty banks/documents/history show explicit text.
- Actor/role: Entity viewer.
- Affected workflow: Entity Profile.
- UX behavior: Phone numbers are callable; media/documents can be opened; farmer photo is shown when available.
- Validation/error behavior: Refresh only shows a 600 ms animation and does not refetch data.
- Online/offline behavior: Passed snapshot remains stale until navigation reload; documents require connectivity.
- Enforcement requirement: Sensitive fields and documents require authorization; refresh must actually reconcile data if offered.
- Dependencies: Raw entity payload and device capabilities.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/EntityProfileScreen.tsx:138-177,302-911` — `EntityProfileScreen`
- Confidence: High

## 14. Loading, Empty, Error, and Offline States

### DB-STATE-001 — Loading and empty states

- Rule: Permission verification, initial lists, pagination, user profile, temporary dealers, media opening, audio, download/share, refresh, and submission each expose a busy state.
- Business purpose: Prevent ambiguous waiting and duplicate interaction.
- Trigger/condition: Corresponding asynchronous operation.
- Behavior/result: Most use activity indicators; submission/download/share controls become disabled or loading; permission verification and initial profile loading replace the screen.
- Actor/role: Any user.
- Affected workflow: Dashboard and child screens.
- UX behavior: Standard list empty states distinguish no records from no search results, but do not distinguish filter-only no results unless search is also set.
- Validation/error behavior: Several catch blocks only log, causing failure to look like empty data.
- Online/offline behavior: Global offline screen preempts module states.
- Enforcement requirement: Loading, empty, and error must be mutually distinguishable.
- Dependencies: Async operations.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:646-660,783-803,993-1038` — states
  - `Frontend/src/modules/dashboard/screens/ProfileScreen.tsx:77-83` — profile loading
  - `Frontend/src/modules/dashboard/screens/TempDealersListScreen.tsx:48-68` — temporary dealers
- Confidence: High

### DB-STATE-002 — Error and retry behavior

- Rule: User-correctable validation and media/export failures receive alerts; dashboard/profile/list fetch failures do not currently receive a dedicated error state or retry action.
- Business purpose: Inform users when action is required.
- Trigger/condition: Validation failure, file failure, export failure, or retrieval failure.
- Behavior/result: Action failures show contextual alerts in General Visit and document/PDF workflows; collection failures log and finish loading.
- Actor/role: Any user.
- Affected workflow: All dashboard areas.
- UX behavior: Pull-to-refresh is the implicit retry for dashboard/profile; temporary dealer list has no retry control.
- Validation/error behavior: General Visit exposes raw technical error text after “Failed to log visit.”
- Online/offline behavior: Offline is handled globally, not per operation.
- Enforcement requirement: Technical details should not be exposed; recoverable data failures need retry and preserved state.
- Dependencies: Alert system and operation errors.
- Original implementation evidence:
  - `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx:234-240` — fetch catch
  - `Frontend/src/modules/dashboard/screens/ProfileScreen.tsx:47-60` — profile catch
  - `Frontend/src/modules/dashboard/screens/GeneralVisitScreen.tsx:149-164` — visit feedback
- Confidence: High

### DB-STATE-003 — Global offline behavior

- Rule: When connectivity is reported false, the entire authenticated application is replaced by a “No Internet Connection” screen with manual retry and automatic resume on reconnection.
- Business purpose: Avoid attempting unsupported online operations.
- Trigger/condition: Connectivity monitor reports disconnected.
- Behavior/result: Dashboard, local drafts, profile pending-sync widget, and cached permissions are inaccessible until connection returns.
- Actor/role: Any user.
- Affected workflow: Entire dashboard and related modules.
- UX behavior: Retry Connection rechecks network.
- Validation/error behavior: Network reachability is treated as internet/service availability; no degraded mode.
- Online/offline behavior: This is the effective original offline policy, despite local draft and location-queue capabilities.
- Enforcement requirement: Version 2 must explicitly decide and consistently enforce which read/draft operations remain available offline.
- Dependencies: Connectivity state.
- Original implementation evidence:
  - `Frontend/src/navigation/AppNavigator.tsx:96-154` — global network gate
- Confidence: High

### DB-STATE-004 — Pending location synchronization

- Rule: Location samples captured during shifts must remain queued until successfully synchronized; the user profile must report the pending count, and reconnection/app activation must retry synchronization.
- Business purpose: Preserve travel-history integrity through unstable connectivity.
- Trigger/condition: Application start/activation, connectivity change, profile display, or manual Sync Now.
- Behavior/result: A queue of 1–50 samples is synchronized silently while online; more than 50 shows a blocking synchronization modal. Manual sync closes the modal only when no samples remain and otherwise reports the remaining queue or an error.
- Actor/role: Authenticated user with shift tracking data.
- Affected workflow: Profile synchronization indicator and application-level shift tracking.
- UX behavior: Profile polls the count every five seconds; the modal shows progress, prevents hardware-back dismissal, and offers Sync Now.
- Validation/error behavior: Partial sync says some locations could not be synchronized; failure asks for a stable connection. The automatic small-queue path does not surface failures.
- Online/offline behavior: Samples remain queued offline; synchronization is attempted only when connectivity is explicitly true. The global offline gate prevents the user from viewing the queue while disconnected.
- Enforcement requirement: Successfully acknowledged samples must not be resent or deleted prematurely; retries must preserve ordering and avoid duplicates.
- Dependencies: Pending-location queue, connectivity, current shift.
- Original implementation evidence:
  - `Frontend/src/core/OfflineSyncManager.tsx:12-127` — `OfflineSyncManager`
  - `Frontend/App.tsx:24-52` — application activation and manager mounting
  - `Frontend/src/core/database.ts:41-65` — pending-location queue/count
- Confidence: High

## 15. Dashboard Rule Consistency Audit

| ID | Classification | Evidence | Impact |
|---|---|---|---|
| AUD-01 | Contradictory | Dynamic tabs in `DashboardScreen.tsx:546-568`; fixed profile indexes in `ProfileScreen.tsx:203-223` | A metric shortcut can open the wrong tab or an invalid index when any prior tab is hidden. |
| AUD-02 | Security / partially enforced | Add actions permission-gated in `DashboardScreen.tsx:578-589`; Edit actions unconditional in `EntityCard.tsx:182-194` and `EntityProfileScreen.tsx:315-330` | View-only users can enter edit workflows unless downstream persistence rejects them. |
| AUD-03 | Security / missing route guard | All authenticated users receive onboarding routes in `AppNavigator.tsx:159-188` | Direct navigation can bypass dashboard action visibility. |
| AUD-04 | Contradictory offline behavior | Cached permissions/drafts/location queue exist, but `AppNavigator.tsx:141-154` blocks the entire app offline | Offline-first evidence is unreachable in actual UI during disconnection. |
| AUD-05 | Partially enforced | General Visit duplicate check is read-then-write in `GeneralVisitScreen.tsx:74-133` | Concurrent clients/submissions can create duplicate same-date visits. |
| AUD-06 | Contradictory lifecycle labels | `EntityCard.tsx:243-247` uses Pending; `EntityProfileScreen.tsx:355-358` uses Draft for any non-SUBMITTED record | Same record can display different state. |
| AUD-07 | Contradictory score bands | Card color thresholds `EntityCard.tsx:15-20`; category thresholds `EntityCard.tsx:257-263`; filter labels `FilterModal.tsx:269-272` | Visual color, category text, and filter category can disagree. |
| AUD-08 | Label/formula mismatch | `AnalyticsTable.tsx:81-82,123-124` | “Last Visited” is latest record update/create date, not a visit date. |
| AUD-09 | Incomplete analytics | Pagination and loaded arrays in `DashboardScreen.tsx:162-233`; analytics uses `item.data` | Route/village counts and analytics may omit unloaded farmers while appearing complete. |
| AUD-10 | Filter defect | Distributor band uses `.includes` in `DashboardScreen.tsx:297` | “Grade A” may include “Grade A+.” |
| AUD-11 | Data ambiguity | FPO filter uses top-level members `DashboardScreen.tsx:517`; card/profile use nested member base `EntityCard.tsx:80`, `EntityProfileScreen.tsx:731-737` | Scale filter and displayed count can disagree. |
| AUD-12 | Missing-value misclassification | Farmer/FPO numeric parsing defaults to zero `DashboardScreen.tsx:402,517` | Unknown land/member count is treated as the smallest category. |
| AUD-13 | Error-as-empty | Collection catches log only `DashboardScreen.tsx:234-240`; temporary dealers `TempDealersListScreen.tsx:19-27` | Users may act on a false empty state and cannot distinguish service failure. |
| AUD-14 | Fake refresh | `EntityProfileScreen.tsx:174-177` only delays 600 ms | Refresh implies fresh data but never retrieves it. |
| AUD-15 | Logout gap | Profile calls local `logout` `ProfileScreen.tsx:327`; store only clears local fields `authStore.ts:19-20` | Remote session may remain valid and may restore via auth listener. |
| AUD-16 | Permission dependency defect | `tabPages` dependency lists `farmerPerm.can_view` but uses `hasFarmerTabAccess`; `fabActions` lists `farmerPerm.can_edit` but uses `hasFarmerAddAccess` in `DashboardScreen.tsx:546-589` | Farmer tab/action can fail to recompute when only onboarding permission changes. |
| AUD-17 | Duplicate suppression defect | Undefined phones enter sets/comparisons in `DashboardScreen.tsx:281-282,311-312,344-345,494-495` | Drafts with missing phone can be incorrectly hidden. |
| AUD-18 | Temporary-dealer isolation gap | `dashboardService.ts:180-194` retrieves all temporary dealers then filters locally | Client receives records outside requested villages and without user scope. |
| AUD-19 | Stale filters | One shared `FilterState` across tabs `DashboardScreen.tsx:129-132` | Hidden filters remain active; filter button can indicate a filter that has no effect on current tab. |
| AUD-20 | Translation inconsistency | Many labels use translation, while profile statuses, analytics rows/export, filter modal labels, and generated messages are hardcoded | Language switching produces mixed-language dashboard experiences. |
| AUD-21 | Permission inconsistency | General farmer add uses `hasFarmerAddAccess`, but “No Routes Assigned” uses only `farmerPerm.can_edit` in `DashboardScreen.tsx:52-53,798-800` | A user authorized only for farmer onboarding may add from the FAB/list empty state but not from the route empty state. |
| AUD-22 | Contradictory visit semantics | Submission requires a currently active shift `GeneralVisitScreen.tsx:52-55`; later code/comment uses dated logging intended to work after punch-out `GeneralVisitScreen.tsx:145-147` | Past-date visits with a valid completed shift are still rejected unless another shift is currently active. |
| AUD-23 | Inconsistent FSPP definition | Farmer filter requires `statusLabel` `DashboardScreen.tsx:372-375`; analytics counts any non-empty FSPP object `AnalyticsTable.tsx:34-37` | Dashboard filter and analytics can report different enrollment counts. |
| AUD-24 | Semantically mixed analytics | “Biofertilizer Stage” uses farm biofertilizer value, otherwise FSPP status, otherwise Unknown `AnalyticsTable.tsx:84-100,123` | One metric combines unrelated domains and cannot be interpreted consistently. |
| AUD-25 | Session timestamp drift | Auth listener writes `user` directly without updating `loginTimestamp` `AppNavigator.tsx:119-130`; normal `setUser` updates both `authStore.ts:19` | Session age and automatic punch-in behavior depend on which login path populated state. |
| AUD-26 | Design/loading inconsistency | Dashboard defines but does not use the shared dashboard template or available Skeleton loader; it uses custom layout and spinners | Shared loading/layout behavior is not consistently enforced and may violate the original design rules. |
| AUD-27 | Dead implementation paths | Unused dashboard exports/imports include `fetchOnboardedCount`, `getNetworkData`, `deleteDealer`, `useProfileActions`, `syncLocationsToSupabase`, and `incrementActivity` | Comments/names in these paths are not evidence of user-visible requirements and create maintenance ambiguity. |

## 16. Missing, Ambiguous, or Unenforced Dashboard Rules

1. **Missing — Approval authority and lifecycle:** No executable dashboard rule defines who approves/rejects entities, whether `SUBMITTED` means submitted or approved, or allowed transitions after submission.
2. **Missing — Delete authorization/retention:** Draft delete is offered to viewers without explicit edit/delete permission; submitted-record deletion/archival and retention are undefined.
3. **Ambiguous — Four-tab guarantee:** The UI defines four entity types but renders only permitted tabs. There is no requirement that all users see four tabs.
4. **Ambiguous — Profile metric permissions:** Counts and shortcuts always show all four entities even when dashboard permissions hide some entities.
5. **Missing — Complete search scope:** Search covers only loaded pages; no indication or requirement says whether all owned records must be searched.
6. **Missing — Pagination end per entity:** One shared `hasMore` remains true if any entity query returns a full page, causing unnecessary requests and uneven list completeness.
7. **Missing — Filter no-result messaging:** A filter-only empty result says “No [Entities] Yet,” not that filters excluded records.
8. **Partially enforced — Edit lock:** Onboarding hooks mark submitted records locked, but dashboard still exposes Edit Profile; exact behavior of “locked” versus “Save Changes” is inconsistent across workflows.
9. **Missing — Unauthorized/deleted record handling:** Entity Profile trusts route payload and does not refetch or handle missing/unauthorized records.
10. **Missing — Conflict resolution:** Draft upsert is last-write by entity ID; no multi-device conflict detection or merge rule is defined.
11. **Ambiguous — Draft uniqueness:** Phone-based display suppression is not a persistence uniqueness rule; duplicate profiles can still exist.
12. **Missing — Offline dashboard:** Local drafts, cached permissions, and pending locations exist, but no usable offline dashboard/read policy exists.
13. **Missing — External action fallback:** Dial, map, messaging, sharing, and native document opening do not consistently check availability or explain failure.
14. **Ambiguous — Date/time zone:** Route freshness, “Since,” shift date, last visited, and duplicate visit date use device conversions with no authoritative time-zone rule.
15. **Missing — Accessibility:** No repository evidence defines accessibility labels, focus order, text scaling behavior, or keyboard alternatives for dashboard controls.
16. **Unreachable/dead logic — Non-farmer draft Farmer branch:** Bottom action contains a Farmer resume branch inside `!isFarmer`, so that branch cannot execute (`EntityCard.tsx:308-318`).
17. **Unenforced — Error state:** Services throw errors but dashboard screens often swallow them without user-visible failure/retry.
18. **Ambiguous — General Visit current shift:** Entry is visible based on farmer edit permission even when not punched in; rejection occurs only on submit.
19. **Missing — Analytics freshness/scope disclosure:** Metrics do not identify loaded-page limits, as-of time, or whether drafts are included per row.
20. **Ambiguous — User profile role:** Profile displays fallback “Sales Executive” but does not display the authenticated authorization role from the profile record.
21. **Unverified — Draft General Visit storage:** The visit flow writes a `comments` field to draft records, but no repository-level schema or migration evidence confirms that this field is valid and retained through final submission.
22. **Ambiguous — Reconnection queue threshold:** More than 50 pending locations interrupts with a blocking modal while 1–50 sync silently; no business rationale defines why 50 is the threshold or whether the boundary should be inclusive.
23. **Unreachable or dead logic — Unused dashboard paths:** `fetchOnboardedCount`, `getNetworkData`, `deleteDealer`, `useProfileActions`, and several imports have no executable caller and therefore must not be treated as active rules.
24. **Partially enforced — Session age:** Authentication-state hydration and normal login update session timestamps differently; automatic logout is a seven-day wall-clock limit rather than an inactivity rule.

## 17. Original Implementation Evidence

Version 1 is a React Native/Expo application. It builds the dashboard with local component state and memoized transformations, obtains authentication and operational data from Supabase, persists selected auth/draft/shift state with Zustand and local storage, keeps location samples in SQLite, and uses React Navigation for authenticated route gating. An application-level synchronization manager silently drains up to 50 queued locations while online and presents a blocking manual-sync modal above that threshold.

The dashboard fetches four user-scoped entity tables in parallel, joins Farm Card IDs to farmers, retrieves all user drafts and assigned routes on first page, maps heterogeneous records to a shared card shape, and merges pages by record ID. Page size is 50. Search/filter/sort are client-side and therefore operate on the loaded subset.

Permissions are obtained from profile role and role-permission records, cached locally, and refreshed in the background. `TH` and `Super Admin` are treated as unrestricted; `SE` receives a hardcoded operational permission set. The dashboard conditionally constructs its tab array from these results.

Onboarding modules validate forms with Zod/React Hook Form, save drafts to Supabase with local Zustand fallback, generate/upload dossier PDFs through Cloudinary before final submission, write `SUBMITTED` entity records, delete drafts, and record shift activity. These are implementation facts, not requirements on version 2's stack.

The user profile combines Supabase authentication metadata with a `sales_executive` profile row. It polls a local SQLite pending-location count every five seconds. Profile document viewing uses Expo file, sharing, and native intent integrations.

The global navigator listens to network connectivity and replaces the entire app with an offline feedback screen. Consequently, cached permissions, drafts, and location status do not provide a usable offline dashboard in version 1.

## 18. Version-2 Dashboard Behavioral Requirements

### 18.1 Business behavior required in version 2

1. Authenticate users before dashboard access and isolate every entity, draft, route, profile, count, document, and export to the user's authorized scope.
2. Preserve the four exact entity concepts—Distributors, Dealers, Farmers, and FPOs—while showing only collections the user may view.
3. Separate view and edit authority. Add, edit, resume, delete, visit, and downstream actions must each be authorized at action and persistence time.
4. Preserve restorable drafts with owner, entity type, stable ID, current step, data, and update time; final submission must not leave a duplicate active draft.
5. Preserve farmer progression: submitted profile → FSPP → eligible Farm Card → Farm Diary, including explicit-approval eligibility.
6. Preserve route→village→farmer drill-down, temporary dealer lookup by selected villages, and General Visit's shift/date/comment/one-per-date rules.
7. Preserve exact search fields and case-insensitive partial matching unless a documented product decision changes them.
8. Preserve entity-specific filter and sort choices, with AND between categories and OR within multi-select categories.
9. Preserve network counts as submitted plus draft records, but ensure shortcuts resolve by entity identity rather than dynamic tab position.
10. Preserve analytics formulas while correcting or explicitly relabeling “Last Visited,” loaded-subset scope, and other audited mismatches.

### 18.2 UX behavior required in version 2

1. Distinguish permission verification, loading, empty, no-match, error, refreshing, and offline/degraded states.
2. Hide unauthorized tabs/actions; use disabled states with an explanation only where the original workflow intentionally exposes a locked prerequisite, such as Farm Cards.
3. Keep active tab, search, sort, and filters stable during child navigation; define whether they survive remount and scope settings per entity to avoid stale hidden criteria.
4. Show draft/resume, submitted/view, pending/approved, and progression states using one consistent lifecycle vocabulary.
5. Preserve callable phones, maps, documents, images, audio, PDF download/share/export, with capability checks and graceful fallback.
6. Preserve current-user profile fallbacks, avatar fallback, completion guidance, three language choices, logout, and location-sync status.
7. Make offered refresh actions retrieve current data; preserve existing content on refresh failure and provide retry.
8. Indicate when search/analytics cover a subset rather than the full authorized collection.
9. Do not expose raw technical errors to users.

### 18.3 Data, security, and integrity behavior required in version 2

1. Enforce ownership and permissions independently of hidden UI and route construction.
2. Validate route parameters and reload authoritative records before viewing/editing; handle missing, deleted, stale, or unauthorized records explicitly.
3. Enforce same-date General Visit uniqueness and append semantics atomically.
4. Define canonical lifecycle statuses, approval semantics, score/category thresholds, member-count fields, field aliases, and missing-value treatment.
5. Make final submission and draft retirement idempotent; prevent duplicate entity creation using an explicit business identity rule.
6. Define multi-device draft conflict behavior and synchronization retry states.
7. Ensure counts, lists, filters, and analytics use consistent complete scopes or visibly disclose differences.
8. Avoid retrieving unauthorized temporary-dealer records before location filtering.
9. Ensure logout invalidates the effective authenticated session and protects persisted sensitive state.
10. Define an explicit offline policy: what can be read, drafted, queued, retried, and synchronized, and how pending/failed/conflicted states appear.

## 19. Completeness Checklist

- [x] Every dashboard screen reviewed.
- [x] Every dashboard component and hook reviewed.
- [x] Dashboard service functions and consumers reviewed.
- [x] Auth, alert, draft, and shift stores traced.
- [x] Dashboard, profile, onboarding, farmer follow-on, report, retail, and Farm Diary routes searched globally.
- [x] Shared EntityCard, FilterModal, EmptyState, button/template, alert, and shift components traced.
- [x] All four exact entity tabs verified from executable source.
- [x] Every standard entity-card type and temporary dealer card verified.
- [x] Every dashboard search field and exact searched field verified.
- [x] Every displayed dashboard sort option and comparator verified.
- [x] Every displayed dashboard filter and combination rule verified.
- [x] Profile loading, completion, editing, fallback, refresh, document, language, sync, and logout behavior verified.
- [x] Permission-based conditional rendering and route-level gaps verified.
- [x] Loading, empty, no-result, error, offline, and retry behavior verified.
- [x] Navigation from dashboard actions and farmer progression traced.
- [x] Dashboard counts and analytics formulas verified.
- [x] Entity creation/update/draft flows in all four onboarding modules traced.
- [x] FSPP, Farm Card, Farm Diary, shift, location, and temporary dealer cross-module references traced.
- [x] Global references to dashboard symbols and service functions searched.
- [x] Every major conditional dashboard UI path included in the interaction matrix.

### Completion report

- **Total extracted rules:** 52 (`DB-ACT` 5, `DB-TAB` 5, `DB-PRO` 5, `DB-CARD` 7, `DB-SEA` 3, `DB-SORT` 3, `DB-FIL` 6, `DB-MET` 4, `DB-NAV` 5, `DB-DAT` 5, `DB-STATE` 4; some rules span tightly coupled sub-behaviors).
- **Files analyzed:** 328 frontend TypeScript/TSX files indexed/searched; 33 dashboard, navigation, store, core, application-root, design-system, onboarding, shift, FSPP, Farm Card, Farm Diary, auth, and service files inspected in depth.
- **Cross-module references found:** 12 workflow groups (authentication, permissions, four onboarding families, SE onboarding, shifts, FSPP, Farm Card, Farm Diary, reports, retail/shared filtering, location synchronization).
- **Contradictions/gaps found:** 27 audit findings.
- **Missing/ambiguous/unenforced rules found:** 24 classified issues.
- **Security-sensitive assumptions:** client-side ownership filters are backed by data-layer authorization; route entry does not grant edit rights; documents/exports inherit record authorization; temporary dealer contacts are authorized for the viewer; local logout invalidates effective access.
- **Unverified assumptions:** backend row policies and database constraints; exact production role-permission assignments; whether `SUBMITTED` is legally equivalent to approval; server uniqueness for phones/draft entity IDs/visit dates; canonical timezone; whether imported temporary dealer data may be globally visible; external deep-link configuration; behavior when native target applications are absent.
