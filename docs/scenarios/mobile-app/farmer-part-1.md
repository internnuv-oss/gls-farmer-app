# Test Scenario: Farmer Part-1 — List & Entry Points

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: Dashboard `Farmers` tab + FAB `Add Farmer`; farmer cards open `FarmerHub` (not EntityProfile directly); drafts resume via hub/card
- **Primary files**: `DashboardScreen.tsx`, `EntityCard.tsx`, `usePermissions.ts`, `dashboardService.ts` (`fetchMyFarmers`)
- **Handler / function**: `loadData` → `fetchMyFarmers` / `fetchMyDrafts`; navigate `FarmerOnboarding` / `FarmerHub`
- **API / data ops**: `farmers` by `se_id`; drafts `entity_type === 'farmer'`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. **Tab access** — `hasFarmerTabAccess = farmerPerm.can_view || farmerOnboardPerm.can_view` (`mobile_farmer` / `mobile_farmer_onboard`)
2. **Add access** — `hasFarmerAddAccess = farmerPerm.can_edit || farmerOnboardPerm.can_edit`
3. Merge drafts + submitted; hide draft if `mobile` already submitted
4. **Search** — name/city/state/village/fatherName/mobile
5. **Filters** — `farmerStage` (Submitted / FSPP / Farm Card) + other farmer filters in Dashboard
6. Farmer EntityCard press → `FarmerHub`; draft resume → `FarmerOnboarding` with draft params
7. Empty copy: `"Connect with farmers and manage their profiles efficiently here."`

### Permissions / Visibility
1. SE hardcodes `mobile_farmer` view+edit (and other modules); tab/add also honor `mobile_farmer_onboard`
2. Empty/FAB Add Farmer requires `hasFarmerAddAccess`

## Test Cases

### Success Scenarios
#### APP-TC-001: List submitted farmers for current SE
- **Code Path**: Dashboard → `fetchMyFarmers(user.id)` when `hasFarmerTabAccess`
- **Based On**: `DashboardScreen.tsx`
- **Expected API / local call**: `from('farmers').select(...).eq('se_id', userId)...`

#### APP-TC-002: List farmer drafts merged into Farmers tab
- **Expected UI behavior**: Incomplete draft cards; resume path available

#### APP-TC-003: Open Add Farmer from FAB
- **Preconditions**: `hasFarmerAddAccess`
- **Expected UI behavior**: `navigation.navigate("FarmerOnboarding")`

#### APP-TC-004: Open FarmerHub from farmer card
- **Code Path**: EntityCard → `FarmerHub` `{ entity }`
- **Expected UI behavior**: Hub shows profile/visit/FSPP actions

#### APP-TC-005: Resume farmer draft
- **Code Path**: EntityCard/Hub → `FarmerOnboarding` `{ draftId, draftData, initialStep }`
- **Expected UI behavior**: Wizard at `initialStep` with draft values

### Business Logic Failure / Branch Scenarios
#### APP-TC-006: Hide Farmers tab without view permissions
- **Condition**: `!farmerPerm.can_view && !farmerOnboardPerm.can_view`
- **Expected UI behavior**: No Farmers tab; no farmer fetch

#### APP-TC-007: Hide Add Farmer without edit permissions
- **Condition**: `!hasFarmerAddAccess`
- **Expected UI behavior**: No FAB farmer action; empty Add undefined

#### APP-TC-008: Search / farmerStage filter
- **Expected UI behavior**: Client-side filter by query and stage flags (Submitted/FSPP/Farm Card)

#### APP-TC-009: Delete farmer draft
- **Expected UI behavior**: Confirm → `deleteDraft` → reload

#### APP-TC-010: Hide draft when mobile already submitted
- **Expected UI behavior**: Draft excluded from `activeDrafts`

---

# Test Scenario: Farmer Part-1 — Onboarding Create / Submit

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: `FarmerOnboarding` (5 steps)
- **Primary files**: `FarmerOnboardingScreen.tsx`, `hooks.ts`, `schema.ts`, `saveFarmerOnboarding`, steps
- **Handler / function**: `useFarmerOnboarding` → `submit`
- **API / data ops**: PDF → Cloudinary → `farmers.insert|update` status SUBMITTED; delete draft; shift log
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. **fullName / fatherName** min2; **mobile** `/^\d{10}$/`; **state/city/taluka/village** min2
2. **pincode** optional empty or 6 digits
3. **totalLand** required; **majorCrops / soilType / waterSource** arrays min1
4. **Other crops** — if major crop in Other Cereals/Pulses/Oilseeds → `otherCrops` required (zod + step gate)
5. **Others soil/water/equipment** — step gate requires other* text when Others selected
6. **Land math** — if land units match, irr+rain ≤ total else `"Exceeds Total Land"`
7. **pastCrops** — otherCropName / otherInputUsed when Other/Others selected
8. **agreementAccepted** true; signatures min5
9. **validationStatus** steps 1–4; **isNextEnabled** always true
10. Dealers loaded for Step3 linkage: submitted dealers for SE

### Business Logic Found in Code
1. Steps: Personal → Farm → History → Signatures → Review
2. Submit: Missing Information → zod (Validation Error alert) → restrictions → PDF → `saveFarmerOnboarding` → activity → delete draft → success
3. Success: `Farmer Enrolled!` / `Farmer Updated!` (isEditing = `!!editData` only)
4. Profile photo upload camera → Cloudinary → `profilePhoto`

### Error / Edge Paths Handled in UI
1. Missing Information; Validation Error; Restricted Action; User session not found; Submission Failed; Photo upload failed; Permission Denied

## Test Cases

### Success Scenarios
#### APP-TC-011: Submit new farmer with all gates valid
- **Code Path**: Step5 Submit → PDF → `saveFarmerOnboarding` → success
- **Expected UI behavior**: `Farmer Enrolled!`; Share PDF / Add Another / Go Home
- **Expected API / local call**: farmers insert; `logShiftEvent(..., 'Enrolled Farmer', ...)`; delete draft

#### APP-TC-012: Share PDF from success
- **Expected UI behavior**: Share `{name}_Dossier.pdf` or alert Error on failure

#### APP-TC-013: Add Another Farmer
- **Expected UI behavior**: reset + step 1

#### APP-TC-014: Link optional dealer on history step
- **Based On**: dealers from `dealers` where `se_id` + `SUBMITTED`
- **Expected UI behavior**: Select dealerId options labeled shop (city)

### Validation Failure Scenarios
#### APP-TC-015: Full name / father name / mobile / location incomplete
- **Validation Rule**: Step1 gate
- **Expected UI behavior**: Missing Information Step 1

#### APP-TC-016: Invalid pincode when provided
- **Validation Rule**: length 6 or empty (gate + zod)
- **Expected UI behavior**: Step1 invalid / Validation Error

#### APP-TC-017: Farm details missing crops/soil/water/totalLand
- **Expected UI behavior**: Missing Information Step 2

#### APP-TC-018: Other major crop without otherCrops text
- **Validation Rule**: zod superRefine + step gate
- **Expected UI behavior**: Missing Information Step 2 / Validation Error

#### APP-TC-019: Irrigated + rainfed exceeds total when units match
- **Validation Rule**: `"Exceeds Total Land"` on irrigatedLand/rainFedLand
- **Expected UI behavior**: Validation Error on submit

#### APP-TC-020: Past crop Other without otherCropName
- **Expected UI behavior**: Missing Information Step 3

#### APP-TC-021: Agreement / signatures incomplete
- **Expected UI behavior**: Missing Information Step 4

### Business Logic Failure / Branch Scenarios
#### APP-TC-022: Zod fail after gates pass
- **Expected UI behavior**: Alert `Validation Error` with other/pincode guidance

#### APP-TC-023: Submit without user
- **Expected UI behavior**: `Error` / `User session not found.`

#### APP-TC-024: Submission failure
- **Expected UI behavior**: `Submission Failed` + message

#### APP-TC-025: Double-tap submit ignored
- **Condition**: `submitLockedRef`
- **Expected UI behavior**: Second submit no-op

---

# Test Scenario: Farmer Part-1 — Draft Save / Offline

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: Save Draft (hidden when `isEditing` = editData); autosave
- **Primary files**: `hooks.ts`, `draftStore.ts`
- **API / data ops**: `drafts.upsert` `entity_type: 'farmer'`; fallback `'FARMER'`

## Code Analysis
1. Needs dirty + fullName + mobile + user; block fetchedRecordId; skip editData/success
2. Manual → Saving… → `Saved Farmer Draft` → MainTabs
3. Offline local `_step`

## Test Cases

### Success Scenarios
#### APP-TC-026: Manual save farmer draft
- **Expected API / local call**: drafts upsert farmer; remove local on success

#### APP-TC-027: Autosave background/unmount
- **Expected UI behavior**: Silent upsert or local fallback

#### APP-TC-028: Offline draft type FARMER
- **Expected UI behavior**: addDraft/updateDraft `'FARMER'`

### Business Logic Failure / Branch Scenarios
#### APP-TC-029: Cannot save without name and mobile
- **Expected UI behavior**: Alert `Cannot Save`

#### APP-TC-030: Cannot draft completed fetched profile
- **Expected UI behavior**: Alert `Cannot Save Draft`

#### APP-TC-031: Hide Save Draft when opened via editData
- **Condition**: `isEditing === !!editData`
- **Expected UI behavior**: No Save Draft button (note: mobile-fetched without editData still shows button but save blocked)

---

# Test Scenario: Farmer Part-1 — Fetch by Mobile & Locked Edit

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: Step1 mobile create path; EntityProfile Edit → `{ editData }`
- **Primary files**: `hooks.ts`, `fetchProfileByMobile('farmer')`, `EntityProfileScreen.tsx`

## Code Analysis
1. Debounce 600ms; draft unlock vs DB lock if SUBMITTED
2. Alert Profile Found
3. allowedEdits: mobile, farm fields, livestock, dealer, signatures, photo (not name/father/address core identity when locked)
4. Update uses `editData?.id || fetchedRecordId`; event Updated Farmer
5. EntityProfile farmer → `FarmerOnboarding` editData

## Test Cases

### Success Scenarios
#### APP-TC-032: Auto-load farmer draft by mobile
- **Expected UI behavior**: Profile Found; unlock; step from draft

#### APP-TC-033: Auto-load submitted farmer locked
- **Expected UI behavior**: Profile Found; isLocked; locked steps non-interactive

#### APP-TC-034: Edit from EntityProfile Save Changes
- **Expected UI behavior**: `Farmer Updated!` on success

### Business Logic Failure / Branch Scenarios
#### APP-TC-035: Illegal dirty fields on locked profile
- **Expected UI behavior**: `Restricted Action` / only Mobile, Farm Details, Livestock, and Dealer Linkage…

---

# Test Scenario: Farmer Part-1 — Profile Photo Upload

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: Step1 photo
- **Primary files**: `hooks.ts` `handleUpload`

## Test Cases

### Success Scenarios
#### APP-TC-036: Capture profile photo
- **Code Path**: camera → resize 500 → Cloudinary → setValue profilePhoto
- **Expected UI behavior**: Photo URL stored

### Business Logic Failure / Branch Scenarios
#### APP-TC-037: Camera permission denied
- **Expected UI behavior**: `Permission Denied` + fallbackMessage

#### APP-TC-038: Photo upload failure
- **Expected UI behavior**: `Error` / `Photo upload failed.`

---

# Test Scenario: Farmer Part-1 — Farmer Hub

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: `FarmerHubScreen` from farmer card
- **Primary files**: `FarmerHubScreen.tsx`, `usePermissions.ts`
- **Handler / function**: navigation to onboarding/profile/visit/FSPP/farm cards/diaries
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Draft → Resume Onboarding; else Farmer Profile → EntityProfile
2. General Visit if `canEditBaseFarmer` (farmer or onboard edit)
3. FSPP card if `!isDraft && farmerPerm.can_view`
4. Farm Cards card if FSPP statusLabel exists + can_view; enabled if Category A/B OR approval APPROVED; else `Locked: Not Approved`
5. Farm Diaries if `hasFarmCard` (exists in farm_cards) + can_view
6. Pull-to-refresh reloads farmer row + farm card check

### Permissions / Visibility
1. FSPP/Farm Cards/Diaries gated by `mobile_farmer.can_view`
2. General Visit by edit on farmer or onboard module

## Test Cases

### Success Scenarios
#### APP-TC-039: Resume draft from hub
- **Expected UI behavior**: Navigate FarmerOnboarding with draft params

#### APP-TC-040: Open Farmer Profile from hub
- **Condition**: not draft
- **Expected UI behavior**: Navigate EntityProfile

#### APP-TC-041: Open General Visit when edit permission
- **Preconditions**: `canEditBaseFarmer`
- **Expected UI behavior**: Navigate GeneralVisit

#### APP-TC-042: Open FSPP Enrollment / View Assessment
- **Preconditions**: not draft; `farmerPerm.can_view`
- **Expected UI behavior**: Label Enrollment vs View Assessment based on statusLabel; navigate FSPPEnrollment

#### APP-TC-043: Open Farm Cards when Category A/B or approved
- **Condition**: `canAccessFarmCards`
- **Expected UI behavior**: Navigate FarmCardsListScreen

### Business Logic Failure / Branch Scenarios
#### APP-TC-044: Hide General Visit without edit permission
- **Condition**: `!canEditBaseFarmer`
- **Expected UI behavior**: Visit card not rendered

#### APP-TC-045: Hide FSPP for drafts or without farmer view
- **Expected UI behavior**: FSPP card not shown

#### APP-TC-046: Farm Cards locked when not A/B and not approved
- **Expected UI behavior**: Disabled; subtitle `Locked: Not Approved`

#### APP-TC-047: Hide Farm Diaries without farm_cards row
- **Condition**: `!hasFarmCard`
- **Expected UI behavior**: Diaries card not shown

---

# Test Scenario: Farmer Part-1 — FSPP Enrollment

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: FarmerHub → `FSPPEnrollment`
- **Primary files**: `FSPPEnrollmentScreen.tsx`, `FSPP/hooks.ts`, `constants.ts`
- **Handler / function**: `useFSPPEnrollment` → `submit` / `calculateScore`
- **API / data ops**: `farmers.update({ fspp_details }).eq('id', raw.id)`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. **isSubmitEnabled** — all of committedLand, seasonalExpense, bioAwareness, glsKnowledge, mindsetA–D non-empty
2. Review lists missing fields if incomplete
3. No zod schema — option labels from constants

### Business Logic Found in Code
1. 4 steps: Land → Awareness → Mindset → Review
2. **Knockout** if totalLand acres &lt; 1 OR committed acres &lt; 1 → score 0 Disqualified / Hold Category C
3. Points: land size, committed ≥1 →15, expense/bio/GLS/mindset option points; ≥70 Cat A; ≥50 Cat B; else C
4. Bigha→acres `/ 2.5` for total and committed
5. **isCompleted** if statusLabel exists and ≠ `DRAFT` → form read-only; footer Close
6. Success: Assessment Complete + score/status; Return to Profile
7. Shift log `FSPP Enrollment`

### Error / Edge Paths Handled in UI
1. Submission Failed alert
2. KO banner on review/success

## Test Cases

### Success Scenarios
#### APP-TC-048: Submit FSPP assessment Category A
- **Preconditions**: acres ≥1 committed ≥1; points ≥70; all fields filled
- **Expected UI behavior**: Success with score; DB fspp_details updated; activity logged

#### APP-TC-049: Submit Category B (50–69)
- **Expected UI behavior**: status Category B (Qualified)

#### APP-TC-050: View completed assessment read-only
- **Condition**: `isCompleted`
- **Expected UI behavior**: pointerEvents none; Close button; no Submit

### Validation Failure Scenarios
#### APP-TC-051: Submit disabled when fields incomplete
- **Condition**: any required field empty
- **Expected UI behavior**: Submit Assessment disabled; review shows Incomplete Fields list

### Business Logic Failure / Branch Scenarios
#### APP-TC-052: Knockout when land or committed &lt; 1 acre
- **Expected UI behavior**: Review KO banner; score 0 Disqualified / Hold; still submittable if fields filled

#### APP-TC-053: FSPP submit API failure
- **Expected UI behavior**: Alert `Submission Failed` / message or enroll failure text

#### APP-TC-054: Next always enabled
- **Condition**: `isNextEnabled === true` (and completed override)
- **Expected UI behavior**: Can advance steps without per-step validation

---

# Test Scenario: Farmer Part-1 — General Visit

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: FarmerHub → `GeneralVisit`
- **Primary files**: `GeneralVisitScreen.tsx`
- **Handler / function**: `handleSubmit`
- **API / data ops**: append to `comments` on `farmers` or `drafts`; `logActivityForDate`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Must be punched in (`shiftStore.isActive`)
2. Comment compulsory (trim)
3. Date required; max today
4. One comment per date (normalized DD-MM-YYYY)
5. Shift row must exist for selected date for SE

### Business Logic Found in Code
1. Draft entity updates `drafts` by `entity_id`; else `farmers` by `id`
2. Duplicate date → Visit Already Exists alert
3. No shift for date → No Shift Found
4. Success → OK → goBack
5. Double submit guarded by `submittingRef`

## Test Cases

### Success Scenarios
#### APP-TC-055: Log general visit while punched in
- **Preconditions**: isActive; unique date; shift exists for date; comment non-empty
- **Expected UI behavior**: Success alert; comments appended; goBack on OK
- **Expected API / local call**: update comments array; `logActivityForDate`

### Business Logic Failure / Branch Scenarios
#### APP-TC-056: Block visit when not punched in
- **Expected UI behavior**: `Not Allowed` / only while punched in

#### APP-TC-057: Empty comment rejected
- **Expected UI behavior**: `Error` / Comment is compulsory

#### APP-TC-058: Duplicate visit date rejected
- **Expected UI behavior**: `Visit Already Exists for this Date`

#### APP-TC-059: No shift on selected date
- **Expected UI behavior**: `No Shift Found` / cannot log for date not punched in

#### APP-TC-060: Visit log API failure
- **Expected UI behavior**: `Error` / Failed to log visit: + message

---

# Test Scenario: Farmer Part-1 — Wizard Navigation

## Operation Overview
- **Module ID**: farmer-part-1
- **UI Entry**: FarmerOnboarding / FSPP wizards
- **Primary files**: screens

## Test Cases

### Success Scenarios
#### APP-TC-061: Farmer Next through steps 1–5 / jump back Review
- **Expected UI behavior**: Return to Review when jumpBackTo set

#### APP-TC-062: Language cycle en→hi→gu on farmer & FSPP headers
- **Expected UI behavior**: Language code updates

---

## Coverage Notes (provided sources only)
- **Covered**: farmer list/permissions, 5-step onboard+draft+lock, hub gates, FSPP scoring/KO, general visit, photo upload.
- **Hub-only stubs**: Farm Cards / Farm Diary navigation entry conditions only — full FarmCard/FarmDiary TCs belong in `farmer-part-2`.
- Optional `docs/business-rules/farmer-part-1.md` cross-check only.

## Backend/Web Mapping Hints
- APP-TC-001 → list_farmers
- APP-TC-002 → list_farmer_drafts
- APP-TC-003 → create_farmer_entry
- APP-TC-004 → open_farmer_hub
- APP-TC-005 → resume_farmer_draft
- APP-TC-006 → permission_farmer_view
- APP-TC-007 → permission_farmer_edit
- APP-TC-008 → search_filter_farmers
- APP-TC-009 → delete_farmer_draft
- APP-TC-010 → hide_duplicate_mobile_draft
- APP-TC-011 → submit_farmer
- APP-TC-012 → share_farmer_pdf
- APP-TC-013 → create_another_farmer
- APP-TC-014 → link_dealer_optional
- APP-TC-015 → validate_personal_details
- APP-TC-016 → validate_pincode
- APP-TC-017 → validate_farm_details
- APP-TC-018 → validate_other_crops
- APP-TC-019 → validate_land_math
- APP-TC-020 → validate_past_crops_other
- APP-TC-021 → validate_agreement_signatures
- APP-TC-022 → submit_zod_validation_error
- APP-TC-023 → submit_no_user_session
- APP-TC-024 → submit_failed
- APP-TC-025 → submit_double_tap_lock
- APP-TC-026 → create_farmer_draft
- APP-TC-027 → autosave_farmer_draft
- APP-TC-028 → offline_farmer_draft
- APP-TC-029 → draft_requires_name_mobile
- APP-TC-030 → draft_blocked_completed_profile
- APP-TC-031 → hide_save_draft_when_editing
- APP-TC-032 → fetch_farmer_draft_by_mobile
- APP-TC-033 → fetch_farmer_by_mobile_lock
- APP-TC-034 → update_farmer
- APP-TC-035 → restricted_locked_edit
- APP-TC-036 → upload_profile_photo
- APP-TC-037 → camera_permission_denied
- APP-TC-038 → photo_upload_failed
- APP-TC-039 → hub_resume_draft
- APP-TC-040 → hub_view_profile
- APP-TC-041 → hub_general_visit
- APP-TC-042 → hub_fspp_entry
- APP-TC-043 → hub_farm_cards_entry
- APP-TC-044 → hub_hide_visit_no_edit
- APP-TC-045 → hub_hide_fspp
- APP-TC-046 → hub_farm_cards_locked
- APP-TC-047 → hub_hide_farm_diary
- APP-TC-048 → submit_fspp_category_a
- APP-TC-049 → submit_fspp_category_b
- APP-TC-050 → view_completed_fspp
- APP-TC-051 → fspp_submit_disabled_incomplete
- APP-TC-052 → fspp_knockout
- APP-TC-053 → fspp_submit_failed
- APP-TC-054 → fspp_next_always_enabled
- APP-TC-055 → log_general_visit
- APP-TC-056 → visit_requires_punch_in
- APP-TC-057 → visit_comment_required
- APP-TC-058 → visit_duplicate_date
- APP-TC-059 → visit_requires_shift_for_date
- APP-TC-060 → visit_log_failed
- APP-TC-061 → farmer_wizard_navigation
- APP-TC-062 → language_cycle
