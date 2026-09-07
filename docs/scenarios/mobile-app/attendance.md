# Test Scenario: Attendance — Widget Visibility & Punch-In Prompt

## Operation Overview
- **Module ID**: attendance
- **UI Entry**: Dashboard header `ActiveShiftWidget` (also used wherever widget mounted with optional `canEditAttendance`)
- **Primary files**: `ActiveShiftWidget.tsx`, `usePermissions.ts` (`mobile_travel_activity`)
- **Handler / function**: `isAllowedToEdit`; auto-open PunchIn on login stamp
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Widget returns `null` if `!isAllowedToEdit` (`canEditAttendance` prop OR `mobile_travel_activity.can_edit`)
2. States: ON DUTY + Punch Out | SHIFT COMPLETED badge | Punch In button
3. `hasPunchedToday` if today’s history has `status === 'COMPLETED'` OR any `punch-out` event
4. Auto-open PunchIn once per distinct `loginTimestamp` when inactive and not punched today
5. Completed badge alert: Shift Already Completed / after midnight

### Permissions / Visibility
1. No `can_edit` → widget hidden (cannot punch from UI)

## Test Cases

### Success Scenarios
#### APP-TC-001: Show Punch In when allowed and not active / not completed today
- **Based On**: `ActiveShiftWidget.tsx`
- **Preconditions**: `mobile_travel_activity.can_edit` (or prop true); `!isActive`; `!hasPunchedToday`
- **Expected UI behavior**: Punch In button visible

#### APP-TC-002: Auto-open Punch In on new loginTimestamp
- **Condition**: loginTimestamp changes and not active / not punched today
- **Expected UI behavior**: PunchInModal opens once for that stamp

#### APP-TC-003: Show ON DUTY + Punch Out when shift active
- **Expected UI behavior**: From {startTime}; Punch Out button

### Business Logic Failure / Branch Scenarios
#### APP-TC-004: Hide widget without travel edit permission
- **Condition**: `isAllowedToEdit === false`
- **Expected UI behavior**: Widget renders null

#### APP-TC-005: SHIFT COMPLETED blocks new punch-in UI
- **Condition**: `hasPunchedToday`
- **Expected UI behavior**: Badge; tap → alert cannot punch until after midnight

---

# Test Scenario: Attendance — Punch In Flow

## Operation Overview
- **Module ID**: attendance
- **UI Entry**: `PunchInModal` from widget
- **Primary files**: `PunchInModal.tsx`, `ActiveShiftWidget.tsx`, `shiftStore.startShift`
- **Handler / function**: `handleFinalConfirm` → Cloudinary odo (optional) → `startShift`
- **API / data ops**: `shifts.insert` ACTIVE; optional `shift_locations` start point; `startBackgroundTracking`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Step1 Next disabled while Locating/Fetching or location denied
2. Step2 Confirm requires `selectedRouteId`, personal Yes/No; if Yes → startKm; if No → transitMode
3. Future date/time rejected: Invalid Selection
4. Background location must be “Allow all the time” or Background Tracking Required alert
5. Camera permission for optional odo photo

### Business Logic Found in Code
1. Step1: live clock, editable date/time (max today), location + reverse geocode
2. Android battery exemption alert once per session
3. Step2: mandatory route (or Others → routeId null); personal vehicle → type + KM + optional odo; else Public Transport / Sharing / No Travelling
4. Friendly errors: unique_shift_per_day / network / timeout → Cannot Punch In
5. Store also throws if `shiftHistory` already has same `dateStr`
6. Starts background GPS tracking for shift id

## Test Cases

### Success Scenarios
#### APP-TC-006: Punch in with personal vehicle and route
- **User steps**: Location OK → Punch In → select route → Yes → vehicle + start KM → Confirm
- **Expected UI behavior**: Modal closes; widget ON DUTY
- **Expected API / local call**: `shifts.insert` status ACTIVE; startBackgroundTracking; optional odo Cloudinary URL

#### APP-TC-007: Punch in with No Travelling transit
- **Input**: isPersonal false; transitMode `No Travelling`
- **Expected UI behavior**: Shift starts with transit_mode set

#### APP-TC-008: Select Others route stores null assigned_route_id
- **Expected API / local call**: `assigned_route_id: null`

### Validation Failure Scenarios
#### APP-TC-009: Cannot proceed Step1 without location permission
- **Expected UI behavior**: Punch In disabled; location denied string; may show Background Tracking Required

#### APP-TC-010: Confirm disabled until route + transit fields complete
- **Expected UI behavior**: Confirm button disabled

#### APP-TC-011: Reject future punch-in timestamp
- **Expected UI behavior**: Alert Invalid Selection / cannot select future

### Business Logic Failure / Branch Scenarios
#### APP-TC-012: Duplicate same-day punch-in
- **Condition**: unique constraint or store existingShift for date
- **Expected UI behavior**: Cannot Punch In friendly already-logged-today message

#### APP-TC-013: Network failure on punch-in
- **Expected UI behavior**: Cannot Punch In / network connection issue

#### APP-TC-014: Camera permission denied for odo photo
- **Expected UI behavior**: Permission Denied + fallbackMessage

---

# Test Scenario: Attendance — Punch Out Flow

## Operation Overview
- **Module ID**: attendance
- **UI Entry**: Punch Out on widget → `PunchOutModal`
- **Primary files**: `PunchOutModal.tsx`, `ActiveShiftWidget.tsx`, `shiftStore.endShift`
- **Handler / function**: `initiatePunchOut` / `handleConfirm` → `endShift`
- **API / data ops**: stop tracking; sync locations; `shifts.update` COMPLETED; clear last synced location
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Widget wall: if `activitiesLogged === 0` AND `transitMode !== 'No Travelling'` → Cannot Punch Out (must log activity)
2. Personal vehicle: endKm required; endKm ≥ startKm
3. Punch out time not earlier than punch in (submit check + picker auto-adjust)
4. Cross-day punch-out (`isDayChanged`) disables Submit until date/time adjusted
5. No Travelling + 0 activities → mandatory comment; button disabled if empty
6. Location Locating/Fetching/denied disables button
7. Pending SQLite points synced before close (`Syncing offline points...`)

### Business Logic Found in Code
1. Success alert Shift Ended after confirm
2. Allowance: personal & manual distance &lt; 40 → Approved; non-personal → Approved; else Pending
3. Optional end odo photo

## Test Cases

### Success Scenarios
#### APP-TC-015: Punch out after activities logged
- **Preconditions**: isActive; activitiesLogged ≥ 1 (or No Travelling with comment)
- **Expected UI behavior**: Shift Ended alert; widget returns to Punch In / Completed
- **Expected API / local call**: status COMPLETED; stopBackgroundTracking; syncLocationsToSupabase

#### APP-TC-016: Punch out No Travelling with work summary
- **Preconditions**: activitiesLogged 0; transitMode No Travelling; comment non-empty
- **Expected UI behavior**: Comment included in punch-out description

#### APP-TC-017: Sync pending points during punch out
- **Condition**: `getPendingCount() > 0`
- **Expected UI behavior**: Button shows Syncing offline points… then Closing Shift…

### Validation Failure Scenarios
#### APP-TC-018: Block punch-out modal when 0 activities and travelling
- **Expected UI behavior**: Alert Cannot Punch Out / must log at least one activity

#### APP-TC-019: Ending KM missing or less than start
- **Expected UI behavior**: Inline error Ending KM required / cannot be less than Starting KM

#### APP-TC-020: Cross-day punch-out disables submit
- **Condition**: `isDayChanged(startTime, customTime)`
- **Expected UI behavior**: Red attention banner; Punch Out disabled until corrected

#### APP-TC-021: Empty comment when No Travelling and 0 activities
- **Expected UI behavior**: Punch Out disabled

### Business Logic Failure / Branch Scenarios
#### APP-TC-022: Punch out API failure
- **Expected UI behavior**: Alert Error / Failed to punch out

#### APP-TC-023: Auto-adjust future or pre-punch-in time on picker
- **Expected UI behavior**: Auto-Adjusted alerts; time clamped

---

# Test Scenario: Attendance — Shift Store Hydration & Activity Logging

## Operation Overview
- **Module ID**: attendance
- **UI Entry**: App login / Reports focus / Dashboard refresh call `hydrateShifts`
- **Primary files**: `shiftStore.ts`
- **API / data ops**: `shifts` select by se_id; update events / activities_logged
- **Layer**: APP

## Code Analysis
1. Hydrate restores ACTIVE shift into local isActive state
2. `logShiftEvent` / `incrementActivity` require activeShiftId (silent no-op if none)
3. `logActivityForDate` for historical date (DD-MM-YYYY → ISO) used by General Visit
4. Persist key `shift-storage-v6`

## Test Cases

### Success Scenarios
#### APP-TC-024: Hydrate restores active shift after relaunch
- **Expected UI behavior**: Widget shows ON DUTY if DB status ACTIVE

#### APP-TC-025: incrementActivity bumps activities_logged on active shift
- **Expected API / local call**: update activities_logged; local count +1

#### APP-TC-026: logShiftEvent appends timeline with GPS when possible
- **Expected UI behavior**: Event on shift; location embedded if fetch succeeds

### Business Logic Failure / Branch Scenarios
#### APP-TC-027: startShift blocked if history already has same date
- **Expected UI behavior**: Throws already completed for today (surfaced by PunchIn friendly mapper)

#### APP-TC-028: logShiftEvent no-op without activeShiftId
- **Expected UI behavior**: No DB update

---

# Test Scenario: Attendance — Reports Hub & Travel Report

## Operation Overview
- **Module ID**: attendance
- **UI Entry**: My Reports tab → Daily Travel Report
- **Primary files**: `ReportsHubScreen.tsx`, `TravelReportScreen.tsx`
- **Handler / function**: navigate TravelReportScreen; calendar/report views; share PDF
- **API / data ops**: hydrateShifts; `shift_locations` + pending SQLite merge; optional snapped route
- **Layer**: APP

## Code Analysis
1. Travel Report card if `mobile_travel_activity.can_view`
2. Restricted Area if no travel or retail view
3. Focus/refresh hydrates shifts
4. Calendar days with shifts; empty date → No travel data recorded
5. Report shows punch-in/out, distance, activities, map; Share Travel Report PDF
6. Expense card also gated by same travel view (expense details → expenses module)

## Test Cases

### Success Scenarios
#### APP-TC-029: Open Daily Travel Report from hub
- **Preconditions**: `mobile_travel_activity.can_view`
- **Expected UI behavior**: Navigate TravelReportScreen

#### APP-TC-030: View day with shift history
- **Expected UI behavior**: Report mode shows timeline / map / metrics from dailyShift

#### APP-TC-031: Merge pending SQLite points into route fetch
- **Expected UI behavior**: Local pending for shift_id included in path points

#### APP-TC-032: Share Travel Report PDF
- **Preconditions**: dailyShift exists
- **Expected UI behavior**: Share sheet; disabled when no dailyShift

### Business Logic Failure / Branch Scenarios
#### APP-TC-033: Hide Travel Report without can_view
- **Expected UI behavior**: Card not shown

#### APP-TC-034: Restricted Area when no report module access
- **Expected UI behavior**: Restricted Area fallback copy

#### APP-TC-035: Selected date with no shift
- **Expected UI behavior**: No travel data recorded for this date

---

# Test Scenario: Attendance — Offline Location Queue & Sync

## Operation Overview
- **Module ID**: attendance
- **UI Entry**: `OfflineSyncManager` (app-level); punch-out sync; silent online sync
- **Primary files**: `OfflineSyncManager.tsx`, `locationUtils.ts`, `database.ts`
- **Handler / function**: `checkQueue` / `syncLocationsToSupabase` / `getPendingCount`
- **API / data ops**: SQLite `pending_locations` → `shift_locations` insert; filter accuracy/speed/drift
- **Layer**: APP

## Code Analysis
1. Threshold 50: online + count &gt; 50 → blocking Offline Data Detected modal (no Android back dismiss)
2. Online + 0 &lt; count ≤ 50 → silent `syncLocationsToSupabase`
3. Offline → hide modal
4. Sync filters accuracy &gt; 150m; spiderweb speed; anti-drift &lt; 20m
5. Manual Sync Now; errors for partial/failed sync
6. DB: insertLocation, getPendingLocations (limit 3000), deleteLocations, active_shift_id config

## Test Cases

### Success Scenarios
#### APP-TC-036: Silent sync when pending ≤ 50 and online
- **Expected UI behavior**: No modal; queue drained in background

#### APP-TC-037: Show Offline Data Detected when pending &gt; 50 and online
- **Expected UI behavior**: Modal with count; Sync Now

#### APP-TC-038: Sync Now clears queue
- **Expected UI behavior**: Syncing to Cloud…; modal closes if remaining 0

### Business Logic Failure / Branch Scenarios
#### APP-TC-039: Partial sync leaves remaining points
- **Expected UI behavior**: Some locations couldn't be synced…; queueCount updated

#### APP-TC-040: Sync failed unstable connection
- **Expected UI behavior**: Sync failed. Please ensure you have a stable connection.

#### APP-TC-041: Hide sync modal while offline
- **Condition**: `netInfo.isConnected !== true`
- **Expected UI behavior**: Modal not shown even if queue large

---

## Coverage Notes (provided sources only)
- **Covered**: widget perms, punch-in/out validations, one-shift-per-day, activity wall, store hydrate/logging, travel report entry/view/share, SQLite offline sync manager.
- **Not invented**: full expense report TCs (hub card only under same perm); locationTracker internals beyond start/stop called from store.
- Optional `docs/business-rules/attendance.md` cross-check only.

## Backend/Web Mapping Hints
- APP-TC-001 → show_punch_in
- APP-TC-002 → auto_prompt_punch_in
- APP-TC-003 → show_on_duty
- APP-TC-004 → hide_attendance_widget
- APP-TC-005 → shift_completed_lock
- APP-TC-006 → punch_in_personal
- APP-TC-007 → punch_in_no_travelling
- APP-TC-008 → punch_in_route_others
- APP-TC-009 → punch_in_location_required
- APP-TC-010 → punch_in_confirm_disabled
- APP-TC-011 → punch_in_reject_future_time
- APP-TC-012 → punch_in_duplicate_day
- APP-TC-013 → punch_in_network_error
- APP-TC-014 → punch_in_camera_denied
- APP-TC-015 → punch_out
- APP-TC-016 → punch_out_no_travel_comment
- APP-TC-017 → punch_out_sync_pending
- APP-TC-018 → punch_out_requires_activity
- APP-TC-019 → punch_out_validate_end_km
- APP-TC-020 → punch_out_cross_day_block
- APP-TC-021 → punch_out_comment_required
- APP-TC-022 → punch_out_failed
- APP-TC-023 → punch_out_time_auto_adjust
- APP-TC-024 → hydrate_active_shift
- APP-TC-025 → increment_activity
- APP-TC-026 → log_shift_event
- APP-TC-027 → start_shift_same_day_block
- APP-TC-028 → log_event_requires_active_shift
- APP-TC-029 → open_travel_report
- APP-TC-030 → view_daily_travel_report
- APP-TC-031 → merge_pending_locations_into_report
- APP-TC-032 → share_travel_report_pdf
- APP-TC-033 → hide_travel_report
- APP-TC-034 → reports_restricted_area
- APP-TC-035 → travel_report_empty_day
- APP-TC-036 → silent_location_sync
- APP-TC-037 → offline_sync_modal
- APP-TC-038 → manual_sync_now
- APP-TC-039 → sync_partial_failure
- APP-TC-040 → sync_failed
- APP-TC-041 → hide_sync_modal_offline
