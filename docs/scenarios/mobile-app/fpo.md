# Test Scenario: FPO — List & Entry Points

## Operation Overview
- **Module ID**: fpo
- **UI Entry**: Dashboard tab `FPOs` + FAB `Add FPO` + empty-state action; draft resume / view via `EntityCard`; edit via `EntityProfileScreen`
- **Primary files**: `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx`, `dashboardService.ts` (`fetchMyFPOs`), `usePermissions.ts`, `EntityCard.tsx`
- **Handler / function**: `loadData` → `fetchMyFPOs` / `fetchMyDrafts`; navigate `FPOOnboarding`
- **API / data ops**: `supabase.from('fpos').select(...).eq('se_id', userId)`; drafts `entity_type === 'fpo'`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. None on list fetch (search/filter client-side)

### Business Logic Found in Code
1. Tab/fetch gated by `fpoPerm = getModulePerm('mobile_fpo').can_view`
2. Merge drafts + submitted; hide draft if mobile already on submitted FPO
3. **Search** — name/city/state/ceo/mobile
4. **Filters** — completionStatus; `fpoScale` from `total_members` (&lt;250 Small, 250–1000 Medium, else Large); `fpoBusiness` vs business_activities; `fpoPromotingAgency`; sort by `updatedAt` desc
5. Resume → `FPOOnboarding` `{ draftId, draftData, initialStep }`
6. Edit → EntityProfile → `FPOOnboarding` `{ editData: raw }`
7. Delete draft — shared Dashboard confirm → `deleteDraft`
8. Empty copy: `"Partner with Farmer Producer Organizations to scale your reach."`

### Error / Edge Paths Handled in UI
1. Delete Draft confirm alert
2. Empty Add hidden when `!fpoPerm.can_edit`

### Permissions / Visibility
1. **`mobile_fpo.can_view`** — tab + fetch
2. **`mobile_fpo.can_edit`** — FAB + empty Add FPO
3. SE hardcodes view+edit; TH/Super Admin via `isSuperAdmin`

## Test Cases

### Success Scenarios
#### APP-TC-001: List submitted FPOs for current SE
- **Code Path**: Dashboard → `fetchMyFPOs(user.id)` → EntityCard
- **Based On**: `DashboardScreen.tsx`, `dashboardService.ts`
- **Preconditions**: Auth; `fpoPerm.can_view === true`
- **Expected UI behavior**: FPOs for `se_id = user.id`
- **Expected API / local call**: `from('fpos').select(...).eq('se_id', userId).order(...).range(...)`

#### APP-TC-002: List FPO drafts merged into tab
- **Code Path**: drafts `entity_type === 'fpo'` → `processedFPOs`
- **Preconditions**: Draft mobile not on submitted set
- **Expected UI behavior**: Incomplete card; `Resume Onboarding`

#### APP-TC-003: Open Add FPO from FAB
- **Code Path**: FAB → `navigation.navigate("FPOOnboarding")`
- **Preconditions**: `fpoPerm.can_edit === true`
- **Expected UI behavior**: Opens 9-step create wizard

#### APP-TC-004: Resume FPO draft from EntityCard
- **Code Path**: EntityCard → `FPOOnboarding` with draft params
- **Expected UI behavior**: Form/step from draftData/`initialStep`

#### APP-TC-005: View profile then Edit FPO
- **Code Path**: EntityProfile → `FPOOnboarding` `{ editData }`
- **Expected UI behavior**: Header `Edit FPO`; `mapFPODbToForm`; lock if `status === 'SUBMITTED'`

### Business Logic Failure / Branch Scenarios
#### APP-TC-006: Hide FPOs tab without view permission
- **Condition**: `fpoPerm.can_view === false`
- **Expected UI behavior**: Tab omitted; no `fetchMyFPOs`

#### APP-TC-007: Hide Add FPO without edit permission
- **Condition**: `fpoPerm.can_edit === false`
- **Expected UI behavior**: No FAB; empty actionLabel undefined

#### APP-TC-008: Search filters FPO list
- **Condition**: non-empty `searchQuery`
- **Expected UI behavior**: Match name/city/state/ceo/mobile only

#### APP-TC-009: Filter by FPO member scale
- **Condition**: `filters.fpoScale` set
- **Expected UI behavior**: Buckets from parsed `total_members` / `totalMembers`

#### APP-TC-010: Delete FPO draft
- **Condition**: Confirm Delete
- **Expected UI behavior**: `deleteDraft(entityId)`; reload list

#### APP-TC-011: Hide draft when same mobile already submitted
- **Condition**: Draft mobile ∈ completed phones
- **Expected UI behavior**: Draft excluded from activeDrafts

---

# Test Scenario: FPO — Onboarding Create / Submit

## Operation Overview
- **Module ID**: fpo
- **UI Entry**: `FPOOnboarding` stack (9 steps)
- **Primary files**: `FPOOnboardingScreen.tsx`, `hooks.ts`, `schema.ts`, `onboardingService.ts` (`saveFPOOnboarding`, `updateFPOPdfUrl`), step components
- **Handler / function**: `useFPOOnboarding` → `submit`
- **API / data ops**: `fpos.insert|update` status `SUBMITTED` → delete draft → optional PDF Cloudinary + `updateFPOPdfUrl`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
*(Zod `fpoOnboardingSchema` + lighter `validationStatus` gates)*

1. **fpoName / registrationNumber / incorporationYear / address / state / city / taluka / commandArea / ceoName / bodPresidentName / promotingAgency** — min lengths with required messages
2. **pincode** — `/^\d{6}$/`; **contactMobile** — `/^\d{10}$/`
3. **email** — optional or valid email
4. **gstNumber / panNumber** — optional or valid GST/PAN regex
5. **bankAccounts** — min 1; accountName/bankNameBranch min2; accountNumber 9–18 digits; IFSC regex
6. **10 scores** — each `min(1).max(10)` (defaults 5)
7. **allottedTerritories** — min1; district/taluka min1; villages min1
8. **expectedOfftake / partnershipTier / demoFarmersCommitment** required; warehouse/storage/machinery optional
9. **totalMembers / activeMembers**; **majorCrops** min1 with name min2 + acreage
10. **glsCommitments** — gate length === `FPO_GLS_COMMITMENTS.length` (5)
11. **Step7 gate (narrower than UI labels)** — requires `documents.incorporation_certificate`, `pan_card`, `board_resolution`, `storage_exterior` AND `storageLocations.storage_exterior` only
12. **agreementAccepted** true; **fpoSignature / seSignature** min10
13. **isNextEnabled** always `true`

### Business Logic Found in Code
1. **9 steps**: Basic → Profiling → Business → Network → Commitments → Regulatory → Documents → Agreement → Review
2. **Score** — sum of 10 scores; band: ≥75 `Green (Proceed)`; ≥60 `Yellow (Conditional)`; else `Red (Stop)`
3. **Submit order** — checkRestrictions → Missing Information → handleSubmit → `saveFPOOnboarding` → activity/log → delete draft → PDF best-effort → `setShowSuccess(true)`
4. **PDF failure does not fail submit** — caught, console only; success screen still shown
5. **Success UI always** title `FPO Onboarded!` / `"The FPO profile has been successfully saved."` (no separate Updated title)
6. Steps 2 & 6 not in `validationStatus` list

### Error / Edge Paths Handled in UI
1. `Restricted Action` + leadership/banks/scoring/scope/network message
2. `Missing Information` with `•` step names
3. `Error` / `User session not found.`
4. `Submission Failed` / `error.message`
5. No double-tap lock ref (unlike dealer/distributor)

### Permissions / Visibility
1. Locked Steps 1/5/6/7/8 when `isLocked`; wizard needs `user.id`

## Test Cases

### Success Scenarios
#### APP-TC-012: Submit new FPO with all gates valid
- **Code Path**: Step9 Submit → `saveFPOOnboarding` insert → success (+ optional PDF update)
- **Based On**: `hooks.ts`, `onboardingService.ts`, `FPOOnboardingScreen.tsx`
- **Preconditions**: Auth; validationStatus all valid; zod passes
- **Expected UI behavior**: `FPO Onboarded!` with Share PDF / Add Another / Go Home
- **Expected API / local call**: `fpos.insert` `status: "SUBMITTED"`, `total_score`, `band`; delete draft; `logShiftEvent(..., 'Onboarded FPO', ...)`; then may `updateFPOPdfUrl`

#### APP-TC-013: Score band Green when raw ≥ 75
- **Code Path**: `scoreData` memo
- **Input**: Ten scores summing ≥75
- **Expected UI behavior**: Band `Green (Proceed)`

#### APP-TC-014: Score band Yellow when 60 ≤ raw &lt; 75
- **Expected UI behavior**: Band `Yellow (Conditional)`

#### APP-TC-015: Score band Red when raw &lt; 60
- **Expected UI behavior**: Band `Red (Stop)`

#### APP-TC-016: Share PDF from success
- **Code Path**: `generatePDF` → `{fpoName}_Dossier.pdf`
- **Expected UI behavior**: Share sheet; failure → `Error` / could not generate or share PDF

#### APP-TC-017: Add Another FPO after success
- **Expected UI behavior**: reset form; step 1; hide success

#### APP-TC-018: Submit succeeds even if PDF upload fails
- **Condition**: PDF/Cloudinary/`updateFPOPdfUrl` throws after DB save
- **Expected UI behavior**: Still `setShowSuccess(true)`; PDF error only logged

### Validation Failure Scenarios
#### APP-TC-019: FPO name too short (zod)
- **Validation Rule**: `fpoName.min(2)` → `"FPO Name is required"`
- **Input**: `A`
- **Expected UI behavior**: Step1 gate / zod blocks success path

#### APP-TC-020: Contact mobile not 10 digits
- **Validation Rule**: `/^\d{10}$/`
- **Expected UI behavior**: Step1 invalid in Missing Information

#### APP-TC-021: Optional email invalid when provided
- **Validation Rule**: email or empty
- **Input**: `bad`
- **Expected UI behavior**: `"Invalid email"` via zod (not in Step1 gate)

#### APP-TC-022: Optional GST/PAN invalid when provided
- **Validation Rule**: optional or regex
- **Expected UI behavior**: Zod fail; empty string allowed

#### APP-TC-023: Invalid bank / IFSC
- **Validation Rule**: bank array + IFSC (step gate checks accountName/branch/number/IFSC)
- **Expected UI behavior**: Step1 Missing Information

#### APP-TC-024: Business infra incomplete
- **Validation Rule**: Step3 gate — territory[0].district, expectedOfftake, partnershipTier, demoFarmersCommitment
- **Expected UI behavior**: Missing Information Step 3

#### APP-TC-025: Member base / crops incomplete
- **Validation Rule**: Step4 — totalMembers, activeMembers, majorCrops[0].name
- **Expected UI behavior**: Missing Information Step 4

#### APP-TC-026: Not all GLS commitments checked
- **Validation Rule**: commitments length === 5
- **Expected UI behavior**: Missing Information Step 5

#### APP-TC-027: Missing Step7 gate documents or exterior GPS
- **Validation Rule**: incorporation_certificate, pan_card, board_resolution, storage_exterior + storageLocations.storage_exterior
- **Expected UI behavior**: Missing Information Step 7 (other UI * docs may still be optional for this gate)

#### APP-TC-028: Agreement / signatures incomplete
- **Validation Rule**: Step8 gate + zod
- **Expected UI behavior**: Missing Information Step 8

### Business Logic Failure / Branch Scenarios
#### APP-TC-029: Submit blocked by validationStatus
- **Condition**: Any listed step invalid
- **Expected UI behavior**: Alert `Missing Information`; no DB write

#### APP-TC-030: Submit without user session
- **Condition**: `!user?.id`
- **Expected UI behavior**: Alert `Error` / `User session not found.`

#### APP-TC-031: Submission API failure
- **Condition**: `saveFPOOnboarding` throws
- **Expected UI behavior**: Alert `Submission Failed` with `error.message`

#### APP-TC-032: Step1 gate does not require all zod Step1 fields
- **Condition**: e.g. missing registrationNumber/pincode but gate fields present
- **Expected UI behavior**: May pass Missing Information Step1 then fail silently at zod handleSubmit (no onInvalid alert coded)

---

# Test Scenario: FPO — Draft Save / Auto-Save / Offline

## Operation Overview
- **Module ID**: fpo
- **UI Entry**: Footer `Save Draft` (create only); AppState/unmount autosave
- **Primary files**: `hooks.ts`, `draftStore.ts`
- **Handler / function**: `saveAndExit` / `saveDraftToDB`
- **API / data ops**: `drafts.upsert` `entity_type: 'fpo'`; fallback `addDraft(..., 'FPO')`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Manual save needs `fpoName` + `contactMobile`
2. Dirty fields required; skip editData/success; block when `fetchedRecordId`

### Business Logic Found in Code
1. UUID draft id; manual history; remove local on DB success
2. Offline local `_step`; activity + `Saved FPO Draft` + MainTabs
3. Save Draft hidden when `isEditing`

### Error / Edge Paths Handled in UI
1. `Cannot Save` / enter FPO Name and Mobile
2. `Cannot Save Draft` completed profile message
3. `Cannot Save` restricted
4. `Saving...` / Syncing draft…

## Test Cases

### Success Scenarios
#### APP-TC-033: Manual Save Draft upserts FPO draft
- **Expected API / local call**: `drafts.upsert({ entity_type: 'fpo', ... })`; event `Saved FPO Draft`

#### APP-TC-034: Autosave on background/unmount
- **Expected UI behavior**: Silent upsert or local fallback

#### APP-TC-035: Offline fallback type FPO
- **Condition**: upsert throws
- **Expected UI behavior**: `addDraft`/`updateDraft` with `'FPO'`

### Business Logic Failure / Branch Scenarios
#### APP-TC-036: Cannot save without FPO name and mobile
- **Expected UI behavior**: Alert `Cannot Save`

#### APP-TC-037: Cannot draft fetched completed profile
- **Expected UI behavior**: Alert `Cannot Save Draft`

#### APP-TC-038: No Save Draft while editing
- **Condition**: `isEditing`
- **Expected UI behavior**: Footer omits Save Draft

---

# Test Scenario: FPO — Fetch by Mobile & Locked Edit

## Operation Overview
- **Module ID**: fpo
- **UI Entry**: Step1 contactMobile create path
- **Primary files**: `hooks.ts`, `fetchProfileByMobile('fpo', ...)`
- **Handler / function**: debounce 600ms
- **API / data ops**: drafts by contactMobile then `fpos.contact_mobile`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Skip if editData/draftData or mobile ≠ 10 digits
2. Draft → reset/step/unlock; DB → mapFPODbToForm / fetchedRecordId / lock if SUBMITTED
3. Alert `Profile Found` / loaded message
4. **allowedEdits**: leadership, banks, scoring, scope, network, documents, signatures (not fpoName/registration/address/GST etc.)
5. Update id `editData?.id || fetchedRecordId`; event `Updated FPO`

## Test Cases

### Success Scenarios
#### APP-TC-039: Auto-load FPO draft by mobile
- **Expected UI behavior**: Profile Found; unlocked draft resume

#### APP-TC-040: Auto-load submitted FPO (locked)
- **Expected UI behavior**: Profile Found; `isLocked true`; locked steps non-interactive

#### APP-TC-041: Save Changes updates existing FPO
- **Expected UI behavior**: Success screen; `fpos.update`; may append update_history

### Business Logic Failure / Branch Scenarios
#### APP-TC-042: Illegal dirty fields on locked profile
- **Expected UI behavior**: `Restricted Action` / only Leadership, Banks, Scoring, Scope, Network, and Annexures…

---

# Test Scenario: FPO — Documents, GPS, Audio Upload

## Operation Overview
- **Module ID**: fpo
- **UI Entry**: Steps 2/7 uploads
- **Primary files**: `hooks.ts`, `Step7Documents.tsx`
- **Handler / function**: `handleUpload`, `handleAudioUpload`
- **API / data ops**: Cloudinary → `documents[key]` single URL; GPS → `storageLocations`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Permission Denied + fallbackMessage
2. Doc >5MB → File Too Large
3. GPS for `storage_exterior` / `storage_interior` → GPS Required storage message
4. Image resize 1024 / compress 0.6; docs set as single URL (not array)
5. Compliance checklist items → extra upload rows (not in Step7 gate)

### Error / Edge Paths Handled in UI
1. Upload fail → `Error` / check internet connection
2. Audio fail → `Audio upload failed.`

## Test Cases

### Success Scenarios
#### APP-TC-043: Upload incorporation certificate under 5MB
- **Expected UI behavior**: `documents.incorporation_certificate` set

#### APP-TC-044: Capture storage exterior with GPS
- **Expected UI behavior**: Doc URL + `storageLocations.storage_exterior` lat/lng

### Business Logic Failure / Branch Scenarios
#### APP-TC-045: Permission denied
- **Expected UI behavior**: Alert `Permission Denied`

#### APP-TC-046: Document > 5MB rejected
- **Expected UI behavior**: Alert `File Too Large`

#### APP-TC-047: Storage photo without GPS
- **Expected UI behavior**: Alert `GPS Required`; upload aborted

#### APP-TC-048: Audio upload failure
- **Expected UI behavior**: Alert `Error` / `Audio upload failed.`

#### APP-TC-049: Upload network failure message
- **Condition**: Cloudinary throw in handleUpload
- **Expected UI behavior**: Alert `Error` / `Upload failed. Please check your internet connection.`

---

# Test Scenario: FPO — Wizard Navigation & Regulatory

## Operation Overview
- **Module ID**: fpo
- **UI Entry**: Wizard chrome
- **Primary files**: `FPOOnboardingScreen.tsx`, `Step6Regulatory.tsx`, `Step7Documents.tsx`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Back / jumpBackTo / Return to Review / Next until step 9
2. Language en→hi→gu
3. Step6 `FPO_COMPLIANCE_ITEMS` → Selected Compliance upload section in Step7 (gate still only 4 keys + GPS)

## Test Cases

### Success Scenarios
#### APP-TC-050: Next advances through steps 1–9
- **Expected UI behavior**: Step 9 shows Submit/Save Changes

#### APP-TC-051: Jump back from Review then Return to Review
- **Expected UI behavior**: Footer `Return to Review` restores jump target

#### APP-TC-052: Regulatory checklist shows extra Step7 uploads
- **Condition**: Check compliance items
- **Expected UI behavior**: Selected Compliance Documents section renders; not required by Step7 gate unless also in the four gate keys

---

## Coverage Notes (provided sources only)
- **Covered**: list/search/filters/permissions, 9-step submit, Green/Yellow/Red bands, drafts, mobile fetch/lock/update, uploads/GPS, PDF after-save best-effort, wizard nav.
- **Not invented**: approve workflows; HTTP codes; inventing gate rules for UI-only required docs beyond coded Step7 gate.
- Optional `docs/business-rules/fpo.md` cross-check only.

## Backend/Web Mapping Hints
- APP-TC-001 → list_fpos
- APP-TC-002 → list_fpo_drafts
- APP-TC-003 → create_fpo_entry
- APP-TC-004 → resume_fpo_draft
- APP-TC-005 → view_fpo / edit_fpo
- APP-TC-006 → permission_mobile_fpo_view
- APP-TC-007 → permission_mobile_fpo_edit
- APP-TC-008 → search_fpos
- APP-TC-009 → filter_fpo_scale
- APP-TC-010 → delete_fpo_draft
- APP-TC-011 → hide_duplicate_mobile_draft
- APP-TC-012 → submit_fpo
- APP-TC-013 → fpo_score_band_green
- APP-TC-014 → fpo_score_band_yellow
- APP-TC-015 → fpo_score_band_red
- APP-TC-016 → share_fpo_pdf
- APP-TC-017 → create_another_fpo
- APP-TC-018 → submit_fpo_pdf_optional
- APP-TC-019 → validate_fpo_name
- APP-TC-020 → validate_contact_mobile
- APP-TC-021 → validate_email
- APP-TC-022 → validate_gst_pan_optional
- APP-TC-023 → validate_bank
- APP-TC-024 → validate_business_infra
- APP-TC-025 → validate_member_crops
- APP-TC-026 → validate_gls_commitments
- APP-TC-027 → validate_documents_gps
- APP-TC-028 → validate_agreement_signatures
- APP-TC-029 → submit_missing_steps
- APP-TC-030 → submit_no_user_session
- APP-TC-031 → submit_failed
- APP-TC-032 → step1_gate_vs_zod_gap
- APP-TC-033 → create_fpo_draft
- APP-TC-034 → autosave_fpo_draft
- APP-TC-035 → offline_fpo_draft
- APP-TC-036 → draft_requires_name_mobile
- APP-TC-037 → draft_blocked_completed_profile
- APP-TC-038 → hide_save_draft_when_editing
- APP-TC-039 → fetch_fpo_draft_by_mobile
- APP-TC-040 → fetch_fpo_by_mobile_lock
- APP-TC-041 → update_fpo
- APP-TC-042 → restricted_locked_edit
- APP-TC-043 → upload_fpo_document
- APP-TC-044 → capture_storage_exterior_gps
- APP-TC-045 → upload_permission_denied
- APP-TC-046 → upload_file_too_large
- APP-TC-047 → upload_gps_required
- APP-TC-048 → audio_upload_failed
- APP-TC-049 → upload_network_failed
- APP-TC-050 → wizard_next_step
- APP-TC-051 → wizard_jump_back_review
- APP-TC-052 → compliance_extra_uploads
