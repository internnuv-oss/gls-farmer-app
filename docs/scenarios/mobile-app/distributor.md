# Test Scenario: Distributor — List & Entry Points

## Operation Overview
- **Module ID**: distributor
- **UI Entry**: Dashboard tab `Distributors` + FAB `Add Distributor` + empty-state action; draft resume / view profile via `EntityCard`; edit via `EntityProfileScreen`
- **Primary files**: `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx`, `Frontend/src/modules/dashboard/services/dashboardService.ts` (`fetchMyDistributors`), `Frontend/src/core/usePermissions.ts`, `Frontend/src/design-system/components/EntityCard.tsx`
- **Handler / function**: `loadData` → `fetchMyDistributors` / `fetchMyDrafts`; navigate `DistributorOnboarding`
- **API / data ops**: `supabase.from('distributors').select(...).eq('se_id', userId)`; drafts `entity_type === 'distributor'`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. None on list fetch (search/filter are client-side)

### Business Logic Found in Code
1. **Tab / fetch gated** by `distPerm = getModulePerm('mobile_distributor').can_view`
2. **Merge drafts + submitted**; hide draft if `contactMobile` already in submitted `contact_mobile` set
3. **Search** — name/city/state/contactPerson/mobile
4. **Filters** — completionStatus, distributorBand (band includes), distributorStatus (proposedStatus), distributorColdChain; sort by score or updatedAt
5. **Resume draft** — `DistributorOnboarding` `{ draftId, draftData, initialStep }`
6. **View / edit** — EntityProfile → `DistributorOnboarding` `{ editData: raw }`
7. **Delete draft** — shared Dashboard confirm → `deleteDraft(entityId)`
8. Empty copy: `"Onboard distributors to streamline your agricultural supply chain."`

### Error / Edge Paths Handled in UI
1. Delete draft alert: `Delete Draft` / incomplete profile confirm
2. Empty-state Add hidden when `!distPerm.can_edit`

### Permissions / Visibility
1. **`mobile_distributor.can_view`** — tab + list fetch
2. **`mobile_distributor.can_edit`** — FAB + empty Add Distributor
3. SE hardcodes view+edit true; TH/Super Admin via `isSuperAdmin`

## Test Cases

### Success Scenarios
#### APP-TC-001: List submitted distributors for current SE
- **Code Path**: Dashboard → `fetchMyDistributors(user.id)` → EntityCard
- **Based On**: `DashboardScreen.tsx`, `dashboardService.ts`
- **Preconditions**: Authenticated; `distPerm.can_view === true`
- **Expected UI behavior**: Distributors for `se_id = user.id`, ordered by `updated_at` desc
- **Expected API / local call**: `from('distributors').select('*').eq('se_id', userId).order(...).range(...)`

#### APP-TC-002: List distributor drafts merged into tab
- **Code Path**: `fetchMyDrafts` → `entity_type === 'distributor'` → `processedDistributors`
- **Based On**: `DashboardScreen.tsx`
- **Preconditions**: Draft exists; mobile not already submitted
- **Expected UI behavior**: Incomplete card; CTA `Resume Onboarding`

#### APP-TC-003: Open Add Distributor from FAB
- **Code Path**: FAB → `navigation.navigate("DistributorOnboarding")`
- **Preconditions**: `distPerm.can_edit === true`
- **Expected UI behavior**: Opens 10-step create wizard

#### APP-TC-004: Resume distributor draft from EntityCard
- **Code Path**: EntityCard → `DistributorOnboarding` with draft params
- **Based On**: `EntityCard.tsx`, `hooks.ts` (`normalizedDraft`, `initialStep`)
- **Expected UI behavior**: Form hydrated (incl. product string→array repair); step = `initialStep`

#### APP-TC-005: View profile then Edit distributor
- **Code Path**: EntityProfile → `handleEdit` → `DistributorOnboarding` `{ editData }`
- **Based On**: `EntityProfileScreen.tsx`, `hooks.ts`
- **Expected UI behavior**: Header `Edit Distributor`; `mapDistributorDbToForm`; `isLocked` if `status === 'SUBMITTED'`

### Business Logic Failure / Branch Scenarios
#### APP-TC-006: Hide Distributors tab without view permission
- **Condition**: `distPerm.can_view === false`
- **Expected UI behavior**: Tab omitted; `fetchMyDistributors` not called

#### APP-TC-007: Hide Add Distributor without edit permission
- **Condition**: `distPerm.can_edit === false`
- **Expected UI behavior**: No FAB action; empty-state actionLabel undefined

#### APP-TC-008: Search filters distributor list
- **Condition**: non-empty `searchQuery`
- **Expected UI behavior**: Only matching name/city/state/contact/mobile remain

#### APP-TC-009: Delete distributor draft
- **Condition**: Confirm Delete on draft card
- **Expected UI behavior**: `deleteDraft(entityId)`; `loadData(0, true)`

#### APP-TC-010: Hide draft when same mobile already submitted
- **Condition**: Draft `contactMobile` ∈ completed phones set
- **Expected UI behavior**: Draft excluded from `activeDrafts`

---

# Test Scenario: Distributor — Onboarding Create / Submit

## Operation Overview
- **Module ID**: distributor
- **UI Entry**: `DistributorOnboarding` stack (10 steps)
- **Primary files**: `DistributorOnboardingScreen.tsx`, `hooks.ts`, `schema.ts`, `onboardingService.ts` (`saveDistributorOnboarding`), `cloudinaryService.ts` (via hooks), step components
- **Handler / function**: `useDistributorOnboarding` → `submit`
- **API / data ops**: PDF → Cloudinary → `distributors.insert|update` status `SUBMITTED`; delete draft; shift activity
- **Layer**: APP

## Code Analysis

### Validations Found in Code
*(Zod `distributorOnboardingSchema` + `validationStatus` gates on submit)*

1. **firmName / ownerName / contactPerson / contactDesignation** — each `min(2)` with required messages
2. **contactMobile** — `/^\d{10}$/` → `"Must be exactly 10 digits"`
3. **email** — optional; if non-empty must be email → `"Invalid email"`
4. **address** — `min(5)`; **state/city/taluka** — `min(2)`; **pincode** — `/^\d{6}$/`
5. **gstNumber / panNumber** — GST/PAN regex messages; **estYear** `min(4)`; **firmType** `min(1)`
6. **bankAccounts** — `min(1)`; accountName/bankNameBranch `min(2)`; accountNumber `9-18` digits; IFSC regex
7. **Scores** — each `z.number().min(1).max(10)` (defaults 5 in form)
8. **Step 3** — appliedTerritory `min(1)`; turnoverPotential; currentSuppliers `min(1)` each name `min(2)`; proposedStatus; demoFarmersCommitment; godownCapacity; coldChainFacility `Yes|No`
9. **Step 4 gate** — `documents.dealer_network_list` OR every `topDealers` entry has name≥2, address≥2, contact 10 digits
10. **glsCommitments** — gate length === 5 (`DISTRIBUTOR_GLS_COMMITMENTS`)
11. **Step 7 docs** — core: `gst_certificate`, `pan_card`, `cancelled_cheque`, `trade_licence`, `itr_declaration`, `authorisation_letter`; photos: `storage_exterior`, `storage_interior`; plus dynamic keys from `complianceChecklist`; plus `storageLocations['storage_exterior']`
12. **Annexures** — territories/suppliers/products/refs zod mins; step gate also requires growth vision text OR audio; security deposit >0 needs `paymentProofText` OR `documents.distributor_payment_proof`
13. **anxSupplierRefs** — name `min(2)`, contact `/^\d{10}$/`
14. **agreementAccepted** must true; **distributorSignature / seSignature** `min(10)`
15. **isNextEnabled** always `true` (Next never blocked by step validity)

### Business Logic Found in Code
1. **10 steps**: Basic → Scoring → Business → Dealers → Commitments → Regulatory → Documents → Annexures → Agreement → Review
2. **Weighted score** — `round(fin*1.5 + rep*1.5 + ops*1 + dealerNet*1.5 + team*1 + port*1 + exp*1.5 + growth*1)`; bands: ≥85 A+ Platinum; ≥65 A Strategic; ≥45 B Operational; else Grade C High Risk
3. **Submit** — missingSteps alert → RHF handleSubmit → checkRestrictions → PDF/Cloudinary → `saveDistributorOnboarding(..., 'SUBMITTED', raw, band, ...)` → activity → delete draft → success
4. **Success UI** — `Distributor Onboarded!` or `Profile Updated!`; Share PDF; Add Another Distributor (always shown); Go Home
5. **Step 2 & Step 6** not listed in `validationStatus` (scoring/regulatory checklist not gate names; checklist still drives Step7 docs)

### Error / Edge Paths Handled in UI
1. `Missing Information` + bullet list of invalid step names
2. `Restricted Action` + authorized-fields message
3. `Error` / `User session not found.`
4. `Submission Failed` / `e.message` or default
5. Double-tap blocked by `submitLockedRef`
6. No dedicated zod `onInvalid` alert (unlike dealer) — invalid zod simply skips success callback

### Permissions / Visibility
1. Wizard requires `user.id` on save; locked UI on Steps 1/5/6/9 when `isLocked`

## Test Cases

### Success Scenarios
#### APP-TC-011: Submit new distributor with all gates valid
- **Code Path**: Step10 Submit → PDF → Cloudinary → `saveDistributorOnboarding` insert → success
- **Based On**: `hooks.ts`, `onboardingService.ts`, `DistributorOnboardingScreen.tsx`
- **Preconditions**: Auth user; all `validationStatus` valid; zod passes; not illegal locked edits
- **User steps**: Complete wizard; tap `Submit Profile`
- **Expected UI behavior**: Processing/Saving alerts then `Distributor Onboarded!`
- **Expected API / local call**: `distributors.insert` with `status: "SUBMITTED"`, `total_score`, `band`, `pdf_url`, mapped payload; delete draft; `logShiftEvent(..., 'Onboarded Distributor', ...)`

#### APP-TC-012: Weighted score band Grade A+ when raw ≥ 85
- **Code Path**: `scoreData` memo
- **Based On**: `hooks.ts`
- **Input**: Scores that compute to ≥85 under weights
- **Expected UI behavior**: Band `Grade A+ (Platinum)` in scoring UI / PDF / DB `band`

#### APP-TC-013: Share PDF from success screen
- **Code Path**: `generatePDF` → print → share `{firmName}_Dossier.pdf`
- **Expected UI behavior**: Share sheet; failure → `Error` / `Could not generate or share the PDF file.`

#### APP-TC-014: Add Another Distributor after success
- **Code Path**: secondary success action
- **Expected UI behavior**: `setShowSuccess(false)`; `form.reset()`; `setStep(1)`

### Validation Failure Scenarios
#### APP-TC-015: Firm name too short
- **Validation Rule**: `firmName.min(2)` → `"Firm Name is required"`
- **Input**: `A`
- **Expected UI behavior**: Step1 invalid / submit Missing Information or zod blocks callback

#### APP-TC-016: Contact mobile not 10 digits
- **Validation Rule**: `/^\d{10}$/`
- **Input**: `98765`
- **Expected UI behavior**: Step1 gate fails

#### APP-TC-017: Invalid optional email when provided
- **Validation Rule**: email format or empty
- **Input**: `not-an-email`
- **Expected UI behavior**: `"Invalid email"` via zod (step1 gate does not check email)

#### APP-TC-018: Pincode not 6 digits
- **Validation Rule**: `/^\d{6}$/` → `"Must be exactly 6 digits"`
- **Input**: `3900`
- **Expected UI behavior**: Step1 invalid

#### APP-TC-019: Invalid GST or PAN
- **Validation Rule**: GST/PAN regex
- **Input**: invalid strings
- **Expected UI behavior**: Step1 invalid

#### APP-TC-020: Invalid bank account / IFSC
- **Validation Rule**: accountNumber 9–18 digits; IFSC format
- **Expected UI behavior**: Step1 banks invalid

#### APP-TC-021: Business scope incomplete
- **Validation Rule**: Step3 gate (territory, turnover, suppliers≥2 chars, status, demo commitment, godown, cold chain)
- **Expected UI behavior**: Missing Information includes `Step 3: Business Scope & Infra`

#### APP-TC-022: Dealer network missing list and invalid manuals
- **Validation Rule**: Step4 `hasUploadedList || hasValidManualDealers`
- **Input**: no `dealer_network_list`; incomplete topDealers
- **Expected UI behavior**: Missing Information `Step 4: Dealer Network (List or Manual Add)`

#### APP-TC-023: Not all 5 GLS commitments checked
- **Validation Rule**: `glsCommitments.length === 5`
- **Expected UI behavior**: Missing Information `Step 5: GLS Commitments (Must check all 5)`

#### APP-TC-024: Missing required documents or storage exterior GPS
- **Validation Rule**: Step7 docs + `storageLocations.storage_exterior`
- **Expected UI behavior**: Missing Information `Step 7: Documents (Check required docs & GPS)`

#### APP-TC-025: Annexures incomplete (territory/products/refs/vision/payment)
- **Validation Rule**: Step8 gate
- **Input**: e.g. no growth vision/audio; or deposit>0 without proof
- **Expected UI behavior**: Missing Information `Step 8: Annexures (Check missing dropdowns)`

#### APP-TC-026: Agreement / signatures incomplete
- **Validation Rule**: Step9 gate + zod refine/min
- **Expected UI behavior**: Missing Information Step 9; zod messages if reached

### Business Logic Failure / Branch Scenarios
#### APP-TC-027: Submit blocked by validationStatus
- **Condition**: Any listed step invalid
- **Expected UI behavior**: Alert `Missing Information` with `•`-joined names; no DB write

#### APP-TC-028: Submit without user session
- **Condition**: `!user?.id` inside valid submit
- **Expected UI behavior**: Alert `Error` / `User session not found.`

#### APP-TC-029: Submission failure
- **Condition**: throw during PDF/save
- **Expected UI behavior**: Alert `Submission Failed` with message; lock/loading cleared

#### APP-TC-030: Double-tap submit ignored
- **Condition**: `submitLockedRef.current === true`
- **Expected UI behavior**: Immediate return

#### APP-TC-031: Score defaults keep Step2 out of Missing Information list
- **Condition**: Defaults scores = 5 (within 1–10); Step2 not in `validationStatus`
- **Expected UI behavior**: Submit gate does not list a Step 2 item even if user never opened scoring UI

---

# Test Scenario: Distributor — Draft Save / Auto-Save / Offline

## Operation Overview
- **Module ID**: distributor
- **UI Entry**: Footer `Save Draft` (create only); AppState/unmount autosave
- **Primary files**: `hooks.ts`, `draftStore.ts`
- **Handler / function**: `saveAndExit` / `saveDraftToDB`
- **API / data ops**: `drafts.upsert` `entity_type: 'distributor'`; fallback `addDraft(..., 'DISTRIBUTOR')`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Manual save needs `firmName` + `contactMobile`
2. Auto-save needs dirty fields + firmName + contactMobile + user.id
3. Skip when `editData` or success; block DB draft when `fetchedRecordId`

### Business Logic Found in Code
1. UUID via `Crypto.randomUUID`; manual save appends `update_history`
2. On upsert success → `removeDraft` local
3. Offline → local draft with `_step`
4. After manual save → activity + `Saved Distributor Draft` + MainTabs
5. Save Draft hidden when `isEditing`

### Error / Edge Paths Handled in UI
1. `Cannot Save` missing firm/mobile
2. `Cannot Save Draft` for completed fetched profile
3. `Cannot Save` restricted edits
4. `Saving...` / Syncing draft…

## Test Cases

### Success Scenarios
#### APP-TC-032: Manual Save Draft upserts distributor draft
- **Code Path**: Save Draft → `saveDraftToDB(true)` → MainTabs
- **Based On**: `hooks.ts`
- **Preconditions**: Create mode; firmName + mobile; dirty; no fetchedRecordId
- **Expected API / local call**: `drafts.upsert({ entity_type: 'distributor', ... })`; event `Saved Distributor Draft`

#### APP-TC-033: Autosave on background/unmount
- **Condition**: AppState inactive/background or cleanup; not success
- **Expected UI behavior**: Silent upsert or local fallback

#### APP-TC-034: Offline fallback to draftStore type DISTRIBUTOR
- **Condition**: upsert throws
- **Expected UI behavior**: `addDraft`/`updateDraft` with `'DISTRIBUTOR'` and `_step`

### Business Logic Failure / Branch Scenarios
#### APP-TC-035: Cannot save draft without firm name and mobile
- **Condition**: Missing either on manual save
- **Expected UI behavior**: Alert `Cannot Save` / enter both Firm Name and Mobile Number

#### APP-TC-036: Cannot draft fetched completed profile
- **Condition**: `fetchedRecordId` set
- **Expected UI behavior**: Alert `Cannot Save Draft` → use Save Changes

#### APP-TC-037: No Save Draft button while editing
- **Condition**: `isEditing`
- **Expected UI behavior**: Footer omits Save Draft

---

# Test Scenario: Distributor — Fetch by Mobile & Locked Edit

## Operation Overview
- **Module ID**: distributor
- **UI Entry**: Step1 contactMobile (create path)
- **Primary files**: `hooks.ts`, `fetchProfileByMobile('distributor', ...)`
- **Handler / function**: debounced fetch 600ms
- **API / data ops**: drafts by `draft_data->>contactMobile` then `distributors.contact_mobile`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Skips if editData/draftData or mobile length ≠ 10
2. Draft → reset, draftIdRef, step, unlock
3. DB → mapDistributorDbToForm, fetchedRecordId, lock if SUBMITTED
4. Alert `Profile Found` / loaded message
5. **allowedEdits** for locked: contact details, banks, scoring, scope, dealers, annexures, documents, signatures (not firmName/owner/address/GST/PAN etc.)
6. Update uses `editData?.id || fetchedRecordId`; event `Updated Distributor`; success `Profile Updated!`

## Test Cases

### Success Scenarios
#### APP-TC-038: Auto-load distributor draft by mobile
- **Expected UI behavior**: Profile Found; form/step from draft; unlocked

#### APP-TC-039: Auto-load submitted distributor (locked)
- **Expected UI behavior**: Profile Found; locked fields dimmed on Steps 1/5/6/9; `isLocked true`

#### APP-TC-040: Save Changes updates existing distributor
- **Code Path**: Step10 Save Changes → update branch of `saveDistributorOnboarding`
- **Expected UI behavior**: `Profile Updated!`; may append `update_history` when dirtyKeys present

### Business Logic Failure / Branch Scenarios
#### APP-TC-041: Illegal dirty fields on locked profile
- **Condition**: dirty root not in `allowedEdits` while locked edit/fetched
- **Expected UI behavior**: `Restricted Action` / only Contact Details, Banks, Scoring, Scope, Dealer Network, and Annexures…

---

# Test Scenario: Distributor — Documents, GPS, Audio Upload

## Operation Overview
- **Module ID**: distributor
- **UI Entry**: Steps 2/4/7/8 uploads
- **Primary files**: `hooks.ts` `handleUpload` / `handleAudioUpload`, `Step7Documents.tsx`
- **Handler / function**: `handleUpload`, `handleAudioUpload`
- **API / data ops**: Cloudinary; `documents` / `storageLocations`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Camera/media permission → `Permission Denied` + fallbackMessage
2. Doc >5MB → `File Too Large`
3. GPS required for `storage_exterior` / `storage_interior` → `GPS Required` / storage facility photos message
4. Image resize 1024 / compress 0.6; storage keys append array; others single URL

### Error / Edge Paths Handled in UI
1. Upload fail → `Error` / `Upload failed.`
2. Audio fail → `Audio upload failed.`
3. Cancel picker → no-op

## Test Cases

### Success Scenarios
#### APP-TC-042: Upload core document under 5MB
- **Expected UI behavior**: URL stored under documents key (e.g. `gst_certificate`)

#### APP-TC-043: Capture storage exterior with GPS
- **Expected UI behavior**: Photo array append + `storageLocations.storage_exterior` lat/lng set

### Business Logic Failure / Branch Scenarios
#### APP-TC-044: Permission denied
- **Expected UI behavior**: Alert `Permission Denied`

#### APP-TC-045: Document > 5MB rejected
- **Expected UI behavior**: Alert `File Too Large` with MB size

#### APP-TC-046: Storage photo without GPS permission
- **Expected UI behavior**: Alert `GPS Required`; upload aborted

#### APP-TC-047: Audio upload failure
- **Expected UI behavior**: Alert `Error` / `Audio upload failed.`

---

# Test Scenario: Distributor — Wizard Navigation & Regulatory Docs

## Operation Overview
- **Module ID**: distributor
- **UI Entry**: Wizard chrome
- **Primary files**: `DistributorOnboardingScreen.tsx`, `Step6Regulatory.tsx`, `Step7Documents.tsx`
- **Handler / function**: step/back/jumpBackTo/language
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Hardware/header back: jumpBackTo → prior step → goBack
2. Footer: Return to Review if jumpBackTo; else Next until step 10 Submit/Save Changes
3. Language cycle en→hi→gu
4. Step6 `DISTRIBUTOR_COMPLIANCE_ITEMS` checkboxes → dynamic required uploads in Step7
5. Draft resume normalizes topDealer products string→array and territory arrays

## Test Cases

### Success Scenarios
#### APP-TC-048: Next advances through steps 1–10
- **Expected UI behavior**: `setStep(step + 1)`; step 10 shows Submit/Save Changes

#### APP-TC-049: Jump back from Review then Return to Review
- **Expected UI behavior**: Footer `Return to Review` restores `jumpBackTo` step

#### APP-TC-050: Regulatory checklist drives Step7 required uploads
- **Condition**: Check compliance items in Step6
- **Expected UI behavior**: Step7 shows matching tiles; keys included in `isStep7Valid`

#### APP-TC-051: Draft product string normalized on resume
- **Condition**: `draftData.topDealers[].products` is comma string
- **Expected UI behavior**: `normalizedDraft` converts to string array for TagsInput

---

## Coverage Notes (provided sources only)
- **Covered**: list/search/filter/permissions, 10-step submit gates, weighted scoring bands, drafts, mobile fetch/lock/update, uploads/GPS, wizard nav, compliance→docs.
- **Not invented**: approve workflows; HTTP codes; silent zod onInvalid (no Strict Validation Failed alert in distributor hooks).
- Optional `docs/business-rules/distributor.md` cross-check only.

## Backend/Web Mapping Hints
- APP-TC-001 → list_distributors
- APP-TC-002 → list_distributor_drafts
- APP-TC-003 → create_distributor_entry
- APP-TC-004 → resume_distributor_draft
- APP-TC-005 → view_distributor / edit_distributor
- APP-TC-006 → permission_mobile_distributor_view
- APP-TC-007 → permission_mobile_distributor_edit
- APP-TC-008 → search_distributors
- APP-TC-009 → delete_distributor_draft
- APP-TC-010 → hide_duplicate_mobile_draft
- APP-TC-011 → submit_distributor
- APP-TC-012 → distributor_score_band
- APP-TC-013 → share_distributor_pdf
- APP-TC-014 → create_another_distributor
- APP-TC-015 → validate_firm_name
- APP-TC-016 → validate_contact_mobile
- APP-TC-017 → validate_email
- APP-TC-018 → validate_pincode
- APP-TC-019 → validate_gst_pan
- APP-TC-020 → validate_bank
- APP-TC-021 → validate_business_scope
- APP-TC-022 → validate_dealer_network
- APP-TC-023 → validate_gls_commitments
- APP-TC-024 → validate_documents_gps
- APP-TC-025 → validate_annexures
- APP-TC-026 → validate_agreement_signatures
- APP-TC-027 → submit_missing_steps
- APP-TC-028 → submit_no_user_session
- APP-TC-029 → submit_failed
- APP-TC-030 → submit_double_tap_lock
- APP-TC-031 → scoring_not_in_step_gate_list
- APP-TC-032 → create_distributor_draft
- APP-TC-033 → autosave_distributor_draft
- APP-TC-034 → offline_distributor_draft
- APP-TC-035 → draft_requires_firm_mobile
- APP-TC-036 → draft_blocked_completed_profile
- APP-TC-037 → hide_save_draft_when_editing
- APP-TC-038 → fetch_distributor_draft_by_mobile
- APP-TC-039 → fetch_distributor_by_mobile_lock
- APP-TC-040 → update_distributor
- APP-TC-041 → restricted_locked_edit
- APP-TC-042 → upload_distributor_document
- APP-TC-043 → capture_storage_exterior_gps
- APP-TC-044 → upload_permission_denied
- APP-TC-045 → upload_file_too_large
- APP-TC-046 → upload_gps_required
- APP-TC-047 → audio_upload_failed
- APP-TC-048 → wizard_next_step
- APP-TC-049 → wizard_jump_back_review
- APP-TC-050 → compliance_drives_document_uploads
- APP-TC-051 → normalize_draft_dealer_products
