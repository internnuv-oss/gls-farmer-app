# Test Scenario: Farmer Part 2 — Hub Entry Gates

## Operation Overview
- **Module ID**: farmer-part-2
- **UI Entry**: FarmerHubScreen → Farm Cards / Farm Diaries
- **Primary files**: `FarmerHubScreen.tsx`
- **Handler / function**: `canAccessFarmCards`; `checkFarmCards`
- **API / data ops**: `farm_cards.select('id').eq('farmer_id').limit(1)`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Farm Cards tile only if `!isDraft` AND `fspp_details.statusLabel` AND `mobile_farmer.can_view`
2. `canAccessFarmCards` = FSPP category A/B **OR** `fspp_approval_status`/`approvalStatus` === `APPROVED`
3. Locked: Not Approved when `!canAccessFarmCards`; navigate only when allowed
4. Farm Diaries tile only if `!isDraft` AND `hasFarmCard` AND `farmerPerm.can_view`
5. Refresh reloads farmer row + rechecks farm cards

## Test Cases

### Success Scenarios
#### APP-TC-001: Open Farm Cards when Category A/B or Approved
- **Based On**: `FarmerHubScreen.tsx`
- **Preconditions**: not draft; FSPP statusLabel; can_view; canAccessFarmCards
- **Expected UI behavior**: Navigate FarmCardsListScreen

#### APP-TC-002: Open Farm Diaries when farmer has a farm card
- **Preconditions**: hasFarmCard; can_view; not draft
- **Expected UI behavior**: Navigate FarmDiaryHubScreen

#### APP-TC-003: Refresh hub updates farmer + hasFarmCard
- **Expected API / local call**: farmers select + farm_cards limit 1

### Business Logic Failure / Branch Scenarios
#### APP-TC-004: Farm Cards locked when not A/B and not Approved
- **Expected UI behavior**: Disabled; Locked: Not Approved; no navigate

#### APP-TC-005: Hide Farm Diaries when no farm_cards row
- **Condition**: hasFarmCard false
- **Expected UI behavior**: Diaries tile not rendered

#### APP-TC-006: Hide Farm Cards / Diaries for draft farmer
- **Condition**: isDraft
- **Expected UI behavior**: Tiles not shown

#### APP-TC-007: Hide Farm Cards without FSPP statusLabel or can_view
- **Expected UI behavior**: Farm Cards pressable not rendered

---

# Test Scenario: Farm Card — List & Routing

## Operation Overview
- **Module ID**: farmer-part-2
- **UI Entry**: FarmCardsListScreen
- **Primary files**: `FarmCardsListScreen.tsx`
- **API / data ops**: `farm_cards.select('*').eq('farmer_id').order(created_at desc)`
- **Layer**: APP

## Code Analysis
1. Loading: Checking Farm Records…
2. Zero cards → `replace` FarmCardOnboardingScreen
3. DRAFT card → onboarding with `draftCard`; else FarmCardDetailsScreen
4. Add Another Farm Card → new onboarding without draft
5. Pull-to-refresh reloads list

## Test Cases

### Success Scenarios
#### APP-TC-008: List existing farm cards
- **Expected UI behavior**: Cards with status, areas, field/plot; Back to Hub

#### APP-TC-009: Open DRAFT card for resume
- **Expected UI behavior**: FarmCardOnboardingScreen with draftCard param

#### APP-TC-010: Open SUBMITTED card details
- **Expected UI behavior**: FarmCardDetailsScreen read-only

#### APP-TC-011: Add Another Farm Card
- **Expected UI behavior**: Navigate onboarding without draftCard

#### APP-TC-012: Auto-route to onboarding when zero cards
- **Expected UI behavior**: navigation.replace FarmCardOnboardingScreen

#### APP-TC-013: Pull-to-refresh farm cards list
- **Expected UI behavior**: List updated from DB

---

# Test Scenario: Farm Card — Onboarding Wizard (Create / Draft / Submit)

## Operation Overview
- **Module ID**: farmer-part-2
- **UI Entry**: FarmCardOnboardingScreen (6 steps)
- **Primary files**: `FarmCardOnboardingScreen.tsx`, `hooks.ts`, `schema.ts`, `farmCardService.ts`, `BoundaryCaptureModal.tsx`
- **Handler / function**: `submit` / `saveDraft` / `handleCameraUpload` / `handleBoundaryCapture`
- **API / data ops**: Cloudinary uploads; `farm_cards` insert/update; on SUBMITTED set `farmers.has_farm_card=true`; shift activity log
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Zod optional fields; soilPh 0–14 if present; cultivatedArea cannot exceed total when units match
2. Submit manual gate: nearly all non-optional keys non-empty; arrays non-empty / no blank strings; yieldHistory all string props filled; docs require soil_squeeze + lab_report (field_boundary optional for submit)
3. Conditional: soilTestDate only if soilTestStatus Yes; biologicalCropBarrier only if edgePlantationPresent Yes
4. Camera needs permission + GPS; video option max 15s for allowVideo tasks
5. Save Draft disabled when `!isDirty` or isSubmitting
6. Boundary modal: walk/draw; save disabled if path.length === 0; location permission for walk

### Business Logic Found in Code
1. Prefills from farmer.raw; merges draftCard.card_data over defaults
2. Language cycle en→hi→gu on header
3. Jump-back Return to Review from Step6
4. Draft/Submit upload file:// docs in parallel; DRAFT/SUBMITTED status; update if draftCard.id
5. Success Submit → Farm Card generated and secured → MainTabs; Draft Saved → goBack
6. Shift: incrementActivity + logShiftEvent Farm Card Generated / Saved Farm Card Draft

## Test Cases

### Success Scenarios
#### APP-TC-014: Prefill farmer identity and farm inheritance into form
- **Expected UI behavior**: Name/mobile/village/soil/water/cattle defaults from farmer.raw

#### APP-TC-015: Resume draft merges card_data
- **Preconditions**: draftCard in route
- **Expected UI behavior**: Form defaults = fallback + card_data

#### APP-TC-016: Navigate steps 1–6 with Next / back / jump-back
- **Expected UI behavior**: STEP n OF 6; Return to Review restores jumpBackTo

#### APP-TC-017: Capture soil_squeeze / lab_report with GPS stamp
- **Expected UI behavior**: documents + media_gps lat/lng/IST timestamp set

#### APP-TC-018: Capture optional field boundary polygon + snapshot
- **Expected UI behavior**: boundary_polygon + documents.field_boundary local URI

#### APP-TC-019: Save Draft when form dirty
- **Expected UI behavior**: Draft Saved alert; goBack
- **Expected API / local call**: saveFarmCard … status DRAFT; shift log Saved Farm Card Draft

#### APP-TC-020: Submit complete card
- **Expected UI behavior**: Success / Farm Card generated and secured; MainTabs
- **Expected API / local call**: SUBMITTED upsert; farmers.has_farm_card true; shift Farm Card Generated

#### APP-TC-021: Cycle onboarding language EN/HI/GU
- **Expected UI behavior**: Header chip updates; i18n.changeLanguage

### Validation Failure Scenarios
#### APP-TC-022: Submit blocked when mandatory fields/media missing
- **Expected UI behavior**: Incomplete Farm Card / must fill ALL mandatory… photographic evidence

#### APP-TC-023: Save Draft disabled when not dirty
- **Expected UI behavior**: Save Draft button disabled

#### APP-TC-024: soilPh outside 0–14 fails zod
- **Validation Rule**: pH must be between 0 and 14
- **Expected UI behavior**: Field/resolver error (onChange mode)

#### APP-TC-025: Cultivated area exceeds total (same unit)
- **Expected UI behavior**: Cannot exceed Total Area on cultivatedArea

#### APP-TC-026: Camera permission denied on media capture
- **Expected UI behavior**: Permission Denied + fallbackMessage

#### APP-TC-027: GPS denied on media capture
- **Expected UI behavior**: GPS Required / GPS is strictly required

#### APP-TC-028: Boundary save disabled with empty path
- **Expected UI behavior**: Capture/save controls disabled when path.length === 0

#### APP-TC-029: Boundary walk without location permission
- **Expected UI behavior**: Permission Denied / Location is required to plot boundary

### Business Logic Failure / Branch Scenarios
#### APP-TC-030: Submit/draft save failure
- **Expected UI behavior**: Error / e.message or Failed to upload… / Failed to save draft

#### APP-TC-031: Capture failed / boundary snapshot failed
- **Expected UI behavior**: Capture failed. / Failed to capture boundary snapshot / map snapshot Error

#### APP-TC-032: Boundary search location not found
- **Expected UI behavior**: Not Found / Could not find that location on the map

#### APP-TC-033: Update existing draft by cardId
- **Preconditions**: draftCard.id present
- **Expected API / local call**: farm_cards.update eq id (not insert)

---

# Test Scenario: Farm Diary — Hub, Village List & Setup

## Operation Overview
- **Module ID**: farmer-part-2
- **UI Entry**: FarmDiaryHubScreen / VillageFarmDiariesScreen / FarmDiarySetupScreen
- **Primary files**: hub, setup, `farmDiaryStore`, `VillageFarmDiariesScreen.tsx`
- **Layer**: APP

## Code Analysis
1. Hub loads diaries + farm_cards; accordion per card; Add New Diary Here with preselectedFarmCardId
2. Empty cards message: Create a Farm Card first…
3. Setup steps 1–4 gates: Step1 farm card + farm_name + plot_area + land_status + map; sowing date if is_sowing_done; Step2 soil_type; Step3 water_source + irrigation_method
4. createDiary / updateDiary; success goBack; create logs shift activity
5. Village list enriches farmers with farm cards; card → FarmDiaryHubScreen

## Test Cases

### Success Scenarios
#### APP-TC-034: Expand farm card and open diary dashboard
- **Expected UI behavior**: Navigate FarmDiaryDashboardScreen

#### APP-TC-035: Add New Diary Here for selected card
- **Expected UI behavior**: FarmDiarySetupScreen with preselectedFarmCardId

#### APP-TC-036: Create farm diary after completing setup steps
- **Expected UI behavior**: goBack on createDiary id; shift Farm Diary Created

#### APP-TC-037: Edit diary from profile
- **Expected UI behavior**: Setup isEditMode + existingDiary; updateDiary then goBack

#### APP-TC-038: Village Farm Diaries list farmers with cards
- **Expected UI behavior**: Title Farm Diaries in {village}; open hub via entity card

### Validation Failure Scenarios
#### APP-TC-039: Setup Step1 incomplete / missing polygon
- **Expected UI behavior**: Incomplete Form / fill all mandatory… diary area plotted

#### APP-TC-040: Sowing done without sowing date
- **Expected UI behavior**: Please select a Sowing Date since sowing is done

#### APP-TC-041: Step2 without soil type
- **Expected UI behavior**: Please select Soil Type

#### APP-TC-042: Step3 without water/irrigation
- **Expected UI behavior**: Please select Water Source and Irrigation Method

#### APP-TC-043: Save without selected farm card
- **Expected UI behavior**: Error / Please select a Farm Card in Step 1

### Business Logic Failure / Branch Scenarios
#### APP-TC-044: Hub with no farm cards
- **Expected UI behavior**: No Farm Cards found. Create a Farm Card first…

#### APP-TC-045: Expanded card with zero diaries
- **Expected UI behavior**: No farm diaries found for this farm

#### APP-TC-046: createDiary / updateDiary failure alerts
- **Expected UI behavior**: Failed to create/update farm diary; update 0 rows → Warning Update did not affect any rows

#### APP-TC-047: fetchDiaries failure
- **Expected UI behavior**: Error / Failed to fetch farm diaries

---

# Test Scenario: Farm Diary — Dashboard, Base Visit & Crop Observation

## Operation Overview
- **Module ID**: farmer-part-2
- **UI Entry**: FarmDiaryDashboardScreen → MandatoryBaseVisit → CropObservation
- **Primary files**: dashboard, MandatoryBaseVisitScreen, CropObservationScreen, farmDiaryStore
- **Layer**: APP

## Code Analysis
1. Start New Base Visit requires `shiftStore.isActive` else Shift Required alert
2. Base visit: soil moisture + soil health mandatory; fertilizers/pesticides lists if Yes; photos optional upload; Success then replace CropObservationScreen
3. Crop obs: crop+stage; ≥1 plant with data; every filled plant needs photo; saveCropObservation with upload/retry classification; rollback session on failure
4. Profile map if polygon length > 2; Calendar / HistoryLedger / VisitDetails navigation
5. Dynamic SOP params via fetchDynamicParameters (empty if no SOP)

## Test Cases

### Success Scenarios
#### APP-TC-048: Open Farm Diary Profile and Calendar
- **Expected UI behavior**: Navigate profile / calendar screens

#### APP-TC-049: Start base visit while shift active
- **Preconditions**: isActive
- **Expected UI behavior**: MandatoryBaseVisitScreen; visit # from getNextVisitNumber

#### APP-TC-050: Submit base visit then open crop observation
- **Expected UI behavior**: Success Base visit started…; replace CropObservationScreen with baseVisitId
- **Expected API / local call**: mandatory_base_visits insert; shift Farm Diary Base Visit

#### APP-TC-051: Save crop observation with plant photos
- **Expected UI behavior**: Success Crop observation saved; navigate dashboard; shift log best-effort

#### APP-TC-052: History ledger opens visit details
- **Expected UI behavior**: VisitDetailsScreen with visit + visitNumber

#### APP-TC-053: Profile shows polygon map when ≥3 points
- **Expected UI behavior**: Satellite map; expand modal

### Validation Failure Scenarios
#### APP-TC-054: Block base visit without active shift
- **Expected UI behavior**: Shift Required / must punch in…

#### APP-TC-055: Base visit missing soil moisture/health
- **Expected UI behavior**: Incomplete Form / Soil Moisture and Soil Health

#### APP-TC-056: Fertilizers Yes with empty list
- **Expected UI behavior**: add at least one fertilizer…

#### APP-TC-057: Pesticides Yes with empty list
- **Expected UI behavior**: add at least one pesticide…

#### APP-TC-058: Crop observation missing crop/stage
- **Expected UI behavior**: Please select Crop and Stage

#### APP-TC-059: No plant data
- **Expected UI behavior**: Validation Error / at least one plant

#### APP-TC-060: Plant details without photograph
- **Expected UI behavior**: Photograph Required / Capture the plant set photograph for Plant …

#### APP-TC-061: Missing baseVisitId on crop save
- **Expected UI behavior**: Missing Base Visit ID. Cannot save observation

#### APP-TC-062: Camera permission denied on crop/base photos
- **Expected UI behavior**: Permission needed / Denied messages as coded

### Business Logic Failure / Branch Scenarios
#### APP-TC-063: startBaseVisit failure
- **Expected UI behavior**: Error / Failed to start base visit

#### APP-TC-064: saveCropObservation failure with Retry
- **Expected UI behavior**: Failed to save… + classified message; Cancel/Retry; session rollback if created

#### APP-TC-065: Photo upload failure classification
- **Condition**: cloudinary/upload error
- **Expected UI behavior**: Photo upload failed — retry (within Error alert body)

---

## Coverage Notes (provided sources only)
- **Covered**: Hub gates, farm card list/draft/submit/media/boundary, diary hub/setup/edit, shift-gated base visit, crop observation validations/store retries, village diaries list entry.
- **Not invented**: Full per-field UI of every FarmCard step component beyond hooks/schema/submit gate; SOP calendar internals beyond navigation/error alert; VisitDetails field layout.
- **draftStore**: `FARM_CARD` appears on Draft type union but Farm Card drafts persist via `farm_cards` DRAFT status — no local draftStore TCs for farm cards.
- Optional `docs/business-rules/farmer-part-2.md` cross-check only.

## Backend/Web Mapping Hints
- APP-TC-001 → open_farm_cards
- APP-TC-002 → open_farm_diaries
- APP-TC-003 → refresh_farmer_hub
- APP-TC-004 → farm_cards_locked
- APP-TC-005 → hide_farm_diaries_no_card
- APP-TC-006 → hide_farm_modules_draft_farmer
- APP-TC-007 → hide_farm_cards_no_fspp
- APP-TC-008 → list_farm_cards
- APP-TC-009 → resume_farm_card_draft
- APP-TC-010 → view_farm_card_details
- APP-TC-011 → add_farm_card
- APP-TC-012 → auto_start_farm_card_onboarding
- APP-TC-013 → refresh_farm_cards
- APP-TC-014 → prefill_farm_card
- APP-TC-015 → merge_farm_card_draft_data
- APP-TC-016 → farm_card_wizard_nav
- APP-TC-017 → farm_card_capture_media_gps
- APP-TC-018 → farm_card_boundary_capture
- APP-TC-019 → save_farm_card_draft
- APP-TC-020 → submit_farm_card
- APP-TC-021 → farm_card_cycle_language
- APP-TC-022 → farm_card_submit_incomplete
- APP-TC-023 → farm_card_draft_requires_dirty
- APP-TC-024 → farm_card_validate_ph
- APP-TC-025 → farm_card_cultivated_lte_total
- APP-TC-026 → farm_card_camera_denied
- APP-TC-027 → farm_card_gps_required
- APP-TC-028 → boundary_requires_path
- APP-TC-029 → boundary_location_denied
- APP-TC-030 → farm_card_save_failed
- APP-TC-031 → farm_card_capture_failed
- APP-TC-032 → boundary_search_not_found
- APP-TC-033 → update_farm_card_draft
- APP-TC-034 → open_farm_diary_dashboard
- APP-TC-035 → add_farm_diary
- APP-TC-036 → create_farm_diary
- APP-TC-037 → update_farm_diary
- APP-TC-038 → list_village_farm_diaries
- APP-TC-039 → farm_diary_setup_step1_required
- APP-TC-040 → farm_diary_sowing_date_required
- APP-TC-041 → farm_diary_soil_type_required
- APP-TC-042 → farm_diary_water_irrigation_required
- APP-TC-043 → farm_diary_farm_card_required
- APP-TC-044 → farm_diary_hub_no_cards
- APP-TC-045 → farm_diary_hub_empty_for_card
- APP-TC-046 → farm_diary_persist_failed
- APP-TC-047 → fetch_farm_diaries_failed
- APP-TC-048 → open_farm_diary_profile_calendar
- APP-TC-049 → start_base_visit
- APP-TC-050 → submit_base_visit
- APP-TC-051 → save_crop_observation
- APP-TC-052 → open_visit_details
- APP-TC-053 → view_diary_polygon_map
- APP-TC-054 → base_visit_requires_shift
- APP-TC-055 → base_visit_soil_required
- APP-TC-056 → base_visit_fertilizer_list_required
- APP-TC-057 → base_visit_pesticide_list_required
- APP-TC-058 → crop_obs_crop_stage_required
- APP-TC-059 → crop_obs_plant_required
- APP-TC-060 → crop_obs_photo_required
- APP-TC-061 → crop_obs_requires_base_visit
- APP-TC-062 → farm_diary_camera_denied
- APP-TC-063 → start_base_visit_failed
- APP-TC-064 → save_crop_observation_retry
- APP-TC-065 → crop_obs_photo_upload_failed
