# Test Scenario: Dealer — List & Entry Points

## Operation Overview
- **Module ID**: dealer
- **UI Entry**: Dashboard tab `Dealers` + FAB `Add Dealer` + empty-state action; draft resume / view profile via `EntityCard`; edit via `EntityProfileScreen`
- **Primary files**: `Frontend/src/modules/dashboard/screens/DashboardScreen.tsx`, `Frontend/src/modules/dashboard/services/dashboardService.ts`, `Frontend/src/core/usePermissions.ts`, `Frontend/src/design-system/components/EntityCard.tsx` (used by Dashboard)
- **Handler / function**: `loadData` → `fetchMyDealers` / `fetchMyDrafts`; FAB/empty `navigation.navigate("DealerOnboarding")`
- **API / data ops**: `supabase.from('dealers').select(...).eq('se_id', userId)`; `supabase.from('drafts').select(...).eq('se_id', userId)`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. None on list fetch itself (search/filter are client-side string/array matches)

### Business Logic Found in Code
1. **Dealer tab visibility** — `dealerPerm.can_view` gates tab + `fetchMyDealers` (`DashboardScreen.tsx`)
2. **Merge drafts + submitted** — dealer drafts from `entity_type === 'dealer'` prepended; drafts whose `contactMobile` already exists on a submitted dealer are hidden (`processedDealers`)
3. **Search** — filters by name/city/state/contact person/mobile (case-insensitive / includes)
4. **Filters** — `completionStatus` (Incomplete/Completed), `category`, `proposedStatus`, `firmType`, `linkedStatus`, `willingDemoFarmers`; sort by score or `updatedAt`
5. **Draft resume** — `EntityCard` navigates `DealerOnboarding` with `{ draftId, draftData, initialStep }`
6. **View profile** — completed → `EntityProfile` with `{ entity }`
7. **Delete draft** — confirm alert then `deleteDraft(entityId)` → `drafts.delete().eq('entity_id')`
8. **Local→DB draft migration** — on dashboard load, upserts current user’s local `draftStore` drafts then `clearDrafts()`

### Error / Edge Paths Handled in UI
1. **Delete draft confirm** — title `Delete Draft`, message `Are you sure you want to delete this incomplete profile?`, buttons Cancel / Delete
2. **Empty dealers** — EmptyState description `Start building your network by onboarding your first dealer.`; Add action only if `dealerPerm.can_edit`

### Permissions / Visibility
1. **`mobile_dealer.can_view`** — Dealers tab + list fetch
2. **`mobile_dealer.can_edit`** — FAB “Add Dealer”, empty-state Add action
3. SE role hardcodes `mobile_dealer` view+edit true; TH/Super Admin get all via `isSuperAdmin`

## Test Cases

### Success Scenarios
#### APP-TC-001: List submitted dealers for current SE
- **Code Path**: Dashboard → `fetchMyDealers(user.id)` → EntityCard list
- **Based On**: `DashboardScreen.tsx`, `dashboardService.ts`
- **Preconditions**: Authenticated; `dealerPerm.can_view === true`
- **User steps**: Open Dashboard Dealers tab
- **Expected UI behavior**: Shows dealers with `se_id = user.id`, ordered by `updated_at` desc (paginated)
- **Expected API / local call**: `from('dealers').select('*').eq('se_id', userId).order('updated_at').range(...)`

#### APP-TC-002: List dealer drafts merged into Dealers tab
- **Code Path**: `fetchMyDrafts` → map `entity_type === 'dealer'` → `processedDealers`
- **Based On**: `DashboardScreen.tsx`
- **Preconditions**: DB draft exists for SE; no submitted dealer with same `contactMobile`
- **Expected UI behavior**: Draft card shows as Incomplete; CTA `Resume Onboarding`

#### APP-TC-003: Open Add Dealer from FAB
- **Code Path**: FAB → `navigation.navigate("DealerOnboarding")`
- **Based On**: `DashboardScreen.tsx`
- **Preconditions**: `dealerPerm.can_edit === true`
- **Expected UI behavior**: Opens dealer wizard (create mode)

#### APP-TC-004: Resume dealer draft from EntityCard
- **Code Path**: EntityCard → `DealerOnboarding` with `draftId`, `draftData`, `initialStep`
- **Based On**: `EntityCard.tsx` (via Dashboard), `hooks.ts` route params
- **Expected UI behavior**: Wizard opens at `initialStep` with draft form values; `draftIdRef` set

#### APP-TC-005: View submitted dealer profile then Edit
- **Code Path**: EntityCard → EntityProfile → `handleEdit` → `DealerOnboarding` `{ editData: raw }`
- **Based On**: `EntityProfileScreen.tsx`, `hooks.ts`
- **Expected UI behavior**: Edit header `Edit Dealer Profile`; form mapped via `mapDealerDbToForm`; `isLocked` true if `editData.status === 'SUBMITTED'`

### Business Logic Failure / Branch Scenarios
#### APP-TC-006: Hide Dealers tab when no view permission
- **Condition**: `dealerPerm.can_view === false`
- **Expected UI behavior**: Dealers tab not included in `tabPages`; `fetchMyDealers` not called

#### APP-TC-007: Hide Add Dealer FAB when no edit permission
- **Condition**: `dealerPerm.can_edit === false`
- **Expected UI behavior**: FAB action `dealer` not added; empty-state `actionLabel` undefined for Dealers

#### APP-TC-008: Search filters dealer list client-side
- **Condition**: `searchQuery` non-empty
- **Expected UI behavior**: Only dealers matching name/city/state/contact person/mobile remain

#### APP-TC-009: Delete dealer draft
- **Condition**: User confirms Delete on draft card
- **Expected UI behavior**: Alert then `deleteDraft(entityId)`; list reloads via `loadData(0, true)`

#### APP-TC-010: Hide draft if same mobile already submitted
- **Condition**: Draft `contactMobile` ∈ submitted dealers’ `contact_mobile` set
- **Expected UI behavior**: That draft excluded from `activeDrafts` / `processedDealers`

---

# Test Scenario: Dealer — Onboarding Create / Submit

## Operation Overview
- **Module ID**: dealer
- **UI Entry**: `DealerOnboarding` stack screen (9-step wizard)
- **Primary files**: `DealerOnboardingScreen.tsx`, `hooks.ts`, `schema.ts`, `onboardingService.ts` (`saveDealerOnboarding`), `cloudinaryService.ts`, step components
- **Handler / function**: `useDealerOnboarding` → `submit`
- **API / data ops**: Print PDF → Cloudinary upload → `dealers.insert` (or update) status `SUBMITTED`; delete draft row; shift activity log
- **Layer**: APP

## Code Analysis

### Validations Found in Code
*(Zod `dealerOnboardingSchema` + `validationStatus` step gates used on submit)*

1. **shopName** — `min(2)` → `"Shop Name is required"`
2. **firmType** — `min(1)` → `"Firm Type is required"`
3. **estYear** — `min(4)` → `"Year is required"` (step gate also requires `length === 4`)
4. **state/city/taluka/village** — each `min(2)` required messages
5. **address** — `min(5)` → `"Address is required"`
6. **landmark** — optional
7. **owners** — array `min(1)`; each `name.min(2)` → `"Contact Person name is required"`
8. **contactMobile** — `/^\d{10}$/` → `"Must be exactly 10 digits"`
9. **landlineNumber** — optional; if present must match `/^[0-9]{3,5}[- ]?[0-9]{6,8}$/` → `"Invalid landline format (e.g., 0265-123456)"`
10. **gstNumber** — GST regex → `"Invalid GST Format"`; UI uppercases
11. **panNumber** — PAN regex → `"Invalid PAN Format"`; UI uppercases
12. **bankAccounts** — `min(1)`; accountType/bankName/bankBranch/accountName `min(2)`; accountNumber `/^\d{9,18}$/`; bankIfsc `/^[A-Z]{4}0[A-Z0-9]{6}$/`
13. **Scores** — each `z.number().min(0).max(10)`; step gate requires all 8 scored as numbers 0–10
14. **Step 3 gates (validationStatus)** — distributor link Yes requires first distributor name + 10-digit contact; additional locations Yes requires ≥1 shop or godown with filled fields; demo farmers Yes requires file `demo_farmers_list` OR ≥1 manual farmer with name+contact+address; `proposedStatus` + `willingDemoFarmers` required
15. **glsCommitments** — step gate: length must equal `GLS_COMMITMENTS.length` (all 5)
16. **Step 6 docs** — required keys: `gst certificate / shop establishment license`, `pan card`, `cancelled cheque`, `shop_exterior`, `selfie_with_owner` + dynamic keys from `complianceChecklist`; plus `shopLocations['shop_exterior']`
17. **seTerritories** — `min(1)`; taluka/cultivableArea required; village & majorCrops arrays `min(1)`
18. **sePrincipalSuppliers / seChemicalProducts / seBioProducts / seOtherProducts** — each `min(1)`
19. **Credit refs** — if `seHasCreditReferences === 'Yes'`, refs need name ≥2 and contact length 10 (step gate)
20. **Security deposit** — if `parseInt(seSecurityDeposit) > 0`, need `sePaymentProofText` OR `documents.se_payment_proof` (zod superRefine + step gate)
21. **agreementAccepted** — must be `true` → `"You must accept the terms"`
22. **dealerSignature / seSignature** — `min(10)` required messages
23. **Next button** — `isNextEnabled` is always `true` (no per-step block on Next)

### Business Logic Found in Code
1. **9 steps** — Basic → Profiling → Business → Commitments → Compliance → Documents → Annexures → Agreement → Review
2. **Score band** — sum of 8 scores: `>60` Elite; `>=46` A-Category; `>=26` B-Category; else C-Category
3. **Submit flow** — `checkRestrictions` → `validationStatus` missing steps alert → zod `handleSubmit` → generate PDF → Cloudinary → `saveDealerOnboarding(..., "SUBMITTED", ...)` → increment activity → log shift event → delete draft → `showSuccess`
4. **Success UI** — `Profile Submitted!` / description onboarded; actions Share PDF, Add Another Dealer, Go Home
5. **Firm type owners/banks** — Proprietorship/Partnership allow multi owners; else clamp to first owner/bank (`Step1BasicInfo`)
6. **Cascading location** — `supabase.rpc('get_gujarat_location_tree')` when state selected
7. **Jump back from Review** — `setJumpBackTo` / Return to Review

### Error / Edge Paths Handled in UI
1. **Missing sections** — Alert `Missing Information` + listed step names
2. **Restricted edits** — Alert `Restricted Action` / `Cannot Save` with authorized-fields message
3. **Zod fail** — Alert `Strict Validation Failed` + flattened field messages
4. **No user** — Alert `Error` / `User session not found.`
5. **Submit exception** — Alert `Submission Failed` / `error.message` or connection retry text
6. **Double submit** — `submitLockedRef` ignores re-entry

### Permissions / Visibility
1. No extra permission check inside wizard beyond authenticated `user.id` for save
2. Locked fields when `isLocked` (submitted profile): Step1 locked block (shop/address/tax etc.), Step4/5/8 `pointerEvents="none"`; contact/owners/banks remain editable per `allowedEdits`

## Test Cases

### Success Scenarios
#### APP-TC-011: Submit new dealer with all step gates valid
- **Code Path**: Step9 Submit → `submit` → PDF → Cloudinary → `saveDealerOnboarding` insert → success screen
- **Based On**: `hooks.ts`, `onboardingService.ts`, `DealerOnboardingScreen.tsx`
- **Preconditions**: Authenticated user; not editing locked illegal fields; all `validationStatus` steps valid; zod passes
- **User steps**: Complete steps 1–8; Review; tap `Submit Profile`
- **Expected UI behavior**: Alerts `Processing` then `Saving`; then `Profile Submitted!` with Share PDF / Add Another / Go Home
- **Expected API / local call**: `dealers.insert` with `status: "SUBMITTED"`, `se_id`, mapped payload, `pdf_url`; delete `drafts` by `entity_id` if present; `logShiftEvent('activity', 'Onboarded Dealer', ...)`

#### APP-TC-012: Score band Elite when raw sum > 60
- **Code Path**: `scoreData` memo in hooks
- **Based On**: `hooks.ts`
- **Input**: Eight scores summing to 61+
- **Expected UI behavior**: Band `Elite` shown in Step2 / Review / PDF

#### APP-TC-013: Share PDF from success screen
- **Code Path**: `generatePDF` → `Print.printToFileAsync` → `Sharing.shareAsync`
- **Based On**: `hooks.ts`, success `FeedbackScreenTemplate`
- **Expected UI behavior**: Shares `{shopName}_Dossier.pdf`; on failure alert `Error` / `Could not generate or share the PDF file.`

#### APP-TC-014: Add Another Dealer after submit
- **Code Path**: success secondary action
- **Based On**: `DealerOnboardingScreen.tsx`
- **Expected UI behavior**: `setShowSuccess(false)`; `form.reset()`; `setStep(1)` (create flow only, not when `isEditing`)

### Validation Failure Scenarios
#### APP-TC-015: Shop name too short
- **Validation Rule**: `shopName.min(2)` → `"Shop Name is required"`
- **Input**: shopName `A`
- **Expected UI behavior**: On final zod submit → Strict Validation Failed listing shopName; or incomplete Step 1 in Missing Information via step gate

#### APP-TC-016: Contact mobile not 10 digits
- **Validation Rule**: `/^\d{10}$/` → `"Must be exactly 10 digits"`
- **Input**: `98765`
- **Expected UI behavior**: Step1 invalid / zod error; no successful submit

#### APP-TC-017: Invalid GST format
- **Validation Rule**: GST regex → `"Invalid GST Format"`
- **Input**: `INVALID`
- **Expected UI behavior**: Blocks Step1 validity / zod fail

#### APP-TC-018: Invalid PAN format
- **Validation Rule**: PAN regex → `"Invalid PAN Format"`
- **Input**: `ABC`
- **Expected UI behavior**: Blocks Step1 validity / zod fail

#### APP-TC-019: Invalid bank account number or IFSC
- **Validation Rule**: accountNumber `9-18 digits`; IFSC `^[A-Z]{4}0[A-Z0-9]{6}$`
- **Input**: accountNumber `123`; bankIfsc `BAD`
- **Expected UI behavior**: Step1 banks invalid; submit blocked

#### APP-TC-020: Optional landline invalid format
- **Validation Rule**: landline refine when non-empty
- **Input**: landline `12`
- **Expected UI behavior**: `"Invalid landline format (e.g., 0265-123456)"` / Step1 invalid

#### APP-TC-021: GLS commitments not all checked
- **Validation Rule**: `glsCommitments.length === GLS_COMMITMENTS.length` (5)
- **Input**: subset of commitments
- **Expected UI behavior**: Missing Information includes `Step 4: GLS Commitments (Must check all)`

#### APP-TC-022: Missing required documents or exterior GPS
- **Validation Rule**: Step6 `isStep6Valid` required docs + `shopLocations['shop_exterior']`
- **Input**: omit exterior photo/GPS or core docs
- **Expected UI behavior**: Missing Information includes `Step 6: Documents & Location (Check GPS & Required files)`

#### APP-TC-023: Security deposit without payment proof
- **Validation Rule**: zod superRefine + step7 `hasPaymentProof`
- **Input**: `seSecurityDeposit` = `"1000"`; empty `sePaymentProofText` and no `documents.se_payment_proof`
- **Expected UI behavior**: Missing Information Step 7 and/or Strict Validation `Payment proof (Text ID or Media) is required when Security Deposit is entered`

#### APP-TC-024: Agreement not accepted or missing signatures
- **Validation Rule**: `agreementAccepted === true`; signatures `min(10)`
- **Input**: unchecked agreement and/or empty signatures
- **Expected UI behavior**: Step 8 invalid in Missing Information / zod messages `"You must accept the terms"` / signature required

#### APP-TC-025: Linked distributor Yes without valid contact
- **Validation Rule**: Step3 `distValid`
- **Input**: `isLinkedToDistributor: 'Yes'` with empty/invalid first distributor
- **Expected UI behavior**: Missing Information Step 3

#### APP-TC-026: Willing demo farmers Yes without file or manual entry
- **Validation Rule**: `demoFarmersValid`
- **Input**: `willingDemoFarmers: 'Yes'` without `documents.demo_farmers_list` and without complete manual farmer
- **Expected UI behavior**: Missing Information Step 3

### Business Logic Failure / Branch Scenarios
#### APP-TC-027: Submit blocked by incomplete validationStatus sections
- **Condition**: Any of steps 1–4,6–8 marked invalid in `validationStatus`
- **Expected UI behavior**: Alert title `Missing Information` with joined section names; no DB write

#### APP-TC-028: Zod invalid after step gates pass
- **Condition**: `handleSubmit` onInvalid
- **Expected UI behavior**: Alert `Strict Validation Failed` with flattened `- path: message` lines

#### APP-TC-029: Submit without authenticated user
- **Condition**: `!user?.id` inside valid callback
- **Expected UI behavior**: Alert `Error` / `User session not found.`

#### APP-TC-030: Submission API/PDF failure
- **Condition**: throw in try block
- **Expected UI behavior**: Alert `Submission Failed` with `error.message` or default connection message; `isSubmitting` cleared; lock released

#### APP-TC-031: Double-tap submit ignored
- **Condition**: `submitLockedRef.current === true`
- **Expected UI behavior**: Second `submit` returns immediately

---

# Test Scenario: Dealer — Draft Save / Auto-Save / Offline Fallback

## Operation Overview
- **Module ID**: dealer
- **UI Entry**: Wizard footer `Save Draft` (create mode only); AppState background/unmount auto-save
- **Primary files**: `hooks.ts` (`saveDraftToDB`, `saveAndExit`), `draftStore.ts`
- **Handler / function**: `saveAndExit` / `saveDraftToDB`
- **API / data ops**: `drafts.upsert` onConflict `entity_id`; on failure `draftStore.addDraft/updateDraft` type `'DEALER'`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Manual save requires `shopName` and `contactMobile` (alert if missing)
2. Auto-save requires dirty fields, `shopName`, `contactMobile`, `user.id`
3. Skips save when `editData` or `showSuccess`
4. Skips DB draft when `fetchedRecordId` set (completed profile loaded by mobile)

### Business Logic Found in Code
1. **UUID** — `Crypto.randomUUID()` for new `draftIdRef`
2. **Manual save history** — appends `update_history` with `modified_fields` dirty keys
3. **On DB success** — `removeDraft` from local store
4. **Offline fallback** — local draft with `_step: step`
5. **After manual save** — increment activity, log `Saved Dealer Draft`, navigate `MainTabs`
6. **Save Draft button hidden** when `isEditing`

### Error / Edge Paths Handled in UI
1. **Cannot Save** — missing shop/mobile: `"Please enter both the Shop Name and Mobile Number to save a draft."`
2. **Cannot Save Draft** — fetched complete profile: message directing to Save Changes on last step
3. **Restricted** — `checkRestrictions` fail → `Cannot Save` + authorized edit message
4. **Saving...** — `"Syncing draft to database..."` then hideAlert

## Test Cases

### Success Scenarios
#### APP-TC-032: Manual Save Draft upserts to drafts table
- **Code Path**: Save Draft → `saveAndExit` → `saveDraftToDB(true)` → navigate MainTabs
- **Based On**: `hooks.ts`
- **Preconditions**: Create mode; shopName + contactMobile set; dirty fields; no `fetchedRecordId`
- **Expected UI behavior**: Saving alert; then MainTabs; shift event `Saved Dealer Draft`
- **Expected API / local call**: `from('drafts').upsert({ se_id, entity_type: 'dealer', entity_id, draft_data, current_step, update_history })`

#### APP-TC-033: Auto-save on background / unmount
- **Code Path**: AppState inactive/background or effect cleanup → `saveDraftToDB(false)`
- **Based On**: `hooks.ts`
- **Preconditions**: Dirty create draft; not success screen
- **Expected UI behavior**: Silent upsert or local fallback (no success navigation)

#### APP-TC-034: Offline draft fallback to draftStore
- **Condition**: drafts upsert throws
- **Expected UI behavior**: Console log; `addDraft`/`updateDraft` with type `'DEALER'` and data including `_step`

### Business Logic Failure / Branch Scenarios
#### APP-TC-035: Cannot save draft without shop name and mobile
- **Condition**: Missing `shopName` or `contactMobile` on manual save
- **Expected UI behavior**: Alert `Cannot Save` / please enter both Shop Name and Mobile Number

#### APP-TC-036: Cannot save draft for fetched completed profile
- **Condition**: `fetchedRecordId` set
- **Expected UI behavior**: Alert `Cannot Save Draft` / already complete → use Save Changes

#### APP-TC-037: No Save Draft button while editing
- **Condition**: `isEditing === true` (`editData` or `fetchedRecordId`)
- **Expected UI behavior**: Footer shows only Next/Save Changes; no Save Draft

---

# Test Scenario: Dealer — Fetch Existing by Mobile & Locked Edit

## Operation Overview
- **Module ID**: dealer
- **UI Entry**: Step1 `contactMobile` while creating (no editData/draftData)
- **Primary files**: `hooks.ts`, `onboardingService.ts` `fetchProfileByMobile`
- **Handler / function**: debounced `fetchExistingProfile` (600ms)
- **API / data ops**: `drafts` by `draft_data->>contactMobile` then `dealers` by `contact_mobile`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Runs only when mobile length === 10 and not editing/resuming draft route params
2. Draft hit → reset form, set draftIdRef, setStep, unlock
3. DB hit → `mapDealerDbToForm`, set `fetchedRecordId`, lock if `status === 'SUBMITTED'`
4. Alert `Profile Found` / `An existing profile was found and has been loaded.`
5. **Locked edits** — only `allowedEdits` dirty roots permitted; illegal → restriction error
6. **Update submit** — `saveDealerOnboarding` update by `editData.id || fetchedRecordId`; success title `Profile Updated!`; event `Updated Dealer Profile`

### Error / Edge Paths Handled in UI
1. Fetch errors logged to console only (no alert)

## Test Cases

### Success Scenarios
#### APP-TC-038: Auto-load existing draft by mobile
- **Code Path**: contactMobile 10 digits → `fetchProfileByMobile('dealer', mobile)` source draft
- **Based On**: `hooks.ts`, `onboardingService.ts`
- **Expected UI behavior**: Alert Profile Found; form reset to draft_data; step = current_step; unlocked

#### APP-TC-039: Auto-load submitted dealer by mobile (locked)
- **Code Path**: fetch source db with `status === 'SUBMITTED'`
- **Expected UI behavior**: Profile Found; mapped form; `isLocked true`; Step1 locked fields dimmed/non-interactive

#### APP-TC-040: Save Changes updates existing dealer
- **Code Path**: Step9 `Save Changes` with `existingId`
- **Based On**: `saveDealerOnboarding` update branch
- **Expected UI behavior**: `Profile Updated!`; dealers.update; may append `update_history` when dirtyKeys length > 0

### Business Logic Failure / Branch Scenarios
#### APP-TC-041: Illegal field edit on locked submitted profile
- **Condition**: dirty keys outside `allowedEdits` while `(editData || fetchedRecordId) && isLocked`
- **Expected UI behavior**: Alert `Restricted Action` (submit) or `Cannot Save` (draft) with message authorizing only Contact Person, Mobile, Banks, Scoring, Business Area, and Annexures

---

# Test Scenario: Dealer — Documents, GPS, Audio Upload

## Operation Overview
- **Module ID**: dealer
- **UI Entry**: Steps 2/3/6/7 upload tiles and camera capture
- **Primary files**: `hooks.ts` `handleUpload` / `handleAudioUpload`, `cloudinaryService.ts`, `Step6Documents.tsx`
- **Handler / function**: `handleUpload`, `handleAudioUpload`
- **API / data ops**: `uploadFileToCloudinary` → form `documents` / audio fields / `shopLocations`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Camera/media permission required; else alert `Permission Denied` + `perm.fallbackMessage`
2. Doc size > 5MB → `File Too Large` with size message
3. Shop photo keys `shop_interior|shop_exterior|shop_godown` require GPS; else `GPS Required` / `"GPS location is required when capturing shop photos."`
4. Images resized width 1024, compress 0.6 JPEG before upload
5. Shop photo keys append to array; other keys single URL

### Error / Edge Paths Handled in UI
1. Upload fail → `Error` / `Upload failed.` or `Audio upload failed.`
2. User cancels picker → no-op

## Test Cases

### Success Scenarios
#### APP-TC-042: Upload core document under 5MB
- **Code Path**: UploadTile → `handleUpload(key,'doc')` → Cloudinary raw → set documents[key]
- **Based On**: `hooks.ts`, `cloudinaryService.ts`
- **Expected UI behavior**: Loading then URL stored in `documents`

#### APP-TC-043: Capture shop exterior with GPS
- **Code Path**: camera upload for `shop_exterior` → location permission → Cloudinary image → append docs + set shopLocations
- **Expected UI behavior**: Photo listed with GPS lat/lng; Step6 validity can pass when required docs present

### Business Logic Failure / Branch Scenarios
#### APP-TC-044: Permission denied for camera/media
- **Condition**: `perm.granted === false`
- **Expected UI behavior**: Alert `Permission Denied` with fallback message; no upload

#### APP-TC-045: Document larger than 5MB rejected
- **Condition**: `asset.size / MB > 5`
- **Expected UI behavior**: Alert `File Too Large` / ask for file smaller than 5MB

#### APP-TC-046: Shop photo without GPS permission
- **Condition**: Location status not `granted` for GPS-required keys
- **Expected UI behavior**: Alert `GPS Required`; uploading cleared; no URL set

#### APP-TC-047: Audio upload failure
- **Condition**: Cloudinary throw in `handleAudioUpload`
- **Expected UI behavior**: Alert `Error` / `Audio upload failed.`

---

# Test Scenario: Dealer — Temp Dealers by Village

## Operation Overview
- **Module ID**: dealer
- **UI Entry**: Dashboard route/village UI → `TempDealersListScreen`
- **Primary files**: `TempDealersListScreen.tsx`, `dashboardService.ts` `fetchTempDealersByVillages`
- **Handler / function**: `loadDealers`
- **API / data ops**: `from('temp_dealers').select('*')` then client filter by village name variants
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Navigates with `title` and `villages` params from Dashboard
2. Empty villages → returns `[]`
3. Matches `village` / `Village` / `VILLAGE` case-insensitive trim
4. Empty UI: title `No Dealers Found`, description about no registered prospect dealers

## Test Cases

### Success Scenarios
#### APP-TC-048: List temp dealers for selected villages
- **Code Path**: TempDealersListScreen → `fetchTempDealersByVillages(villages)`
- **Based On**: `TempDealersListScreen.tsx`, `dashboardService.ts`
- **Expected UI behavior**: Header count `{n} Dealers Located`; cards rendered

### Business Logic Failure / Branch Scenarios
#### APP-TC-049: No matching temp dealers
- **Condition**: Filter yields empty array
- **Expected UI behavior**: Empty state `No Dealers Found` / prospect dealers message

#### APP-TC-050: Empty villages param returns no fetch results
- **Condition**: `villages` empty/undefined
- **Expected UI behavior**: Service returns `[]` without relying on matches

---

# Test Scenario: Dealer — Wizard Navigation & Language

## Operation Overview
- **Module ID**: dealer
- **UI Entry**: Wizard header/footer/back
- **Primary files**: `DealerOnboardingScreen.tsx`
- **Handler / function**: step setters, BackHandler, `cycleLanguage`
- **API / data ops**: none (except location RPC already covered)
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Hardware back / header back: if `jumpBackTo` → return to that step; else step-1 or `navigation.goBack()`
2. Next advances step or returns to Review when `jumpBackTo` set
3. Language cycles `en → hi → gu → en`
4. Step5 Compliance optional for submit gate; checked items force Step6 uploads via dynamic keys

## Test Cases

### Success Scenarios
#### APP-TC-051: Next advances through steps 1–9
- **Code Path**: footer Next with `isNextEnabled` always true
- **Expected UI behavior**: `setStep(step + 1)` until step 9 shows Submit/Save Changes

#### APP-TC-052: Jump back from Review then Return to Review
- **Code Path**: Step9Review `setJumpBackTo`/`setStep`; footer label `Return to Review`
- **Expected UI behavior**: Edit earlier step then return to jump target step

#### APP-TC-053: Compliance checklist creates required Step6 uploads
- **Condition**: User checks items in Step5 `COMPLIANCE_ITEMS`
- **Expected UI behavior**: Step6 shows matching upload tiles; keys included in `isStep6Valid` required set

---

## Coverage Notes (provided sources only)
- **Covered**: list/search/filter/permissions, create wizard validations & submit, draft save/resume/delete, mobile fetch + locked update, uploads/GPS, PDF share, temp dealers, wizard navigation.
- **Not invented**: backend approve/reject workflows, HTTP status codes, dealer delete from profile (service `deleteDealer` exists but no UI call in provided screens).
- Optional `docs/business-rules/dealer.md` used for cross-check naming only.

## Backend/Web Mapping Hints
- APP-TC-001 → list_dealers
- APP-TC-002 → list_dealer_drafts
- APP-TC-003 → create_dealer_entry
- APP-TC-004 → resume_dealer_draft
- APP-TC-005 → view_dealer / edit_dealer
- APP-TC-006 → permission_mobile_dealer_view
- APP-TC-007 → permission_mobile_dealer_edit
- APP-TC-008 → search_dealers
- APP-TC-009 → delete_dealer_draft
- APP-TC-010 → hide_duplicate_mobile_draft
- APP-TC-011 → submit_dealer
- APP-TC-012 → dealer_score_band
- APP-TC-013 → share_dealer_pdf
- APP-TC-014 → create_another_dealer
- APP-TC-015 → validate_shop_name
- APP-TC-016 → validate_contact_mobile
- APP-TC-017 → validate_gst
- APP-TC-018 → validate_pan
- APP-TC-019 → validate_bank
- APP-TC-020 → validate_landline
- APP-TC-021 → validate_gls_commitments
- APP-TC-022 → validate_documents_gps
- APP-TC-023 → validate_security_deposit_proof
- APP-TC-024 → validate_agreement_signatures
- APP-TC-025 → validate_distributor_link
- APP-TC-026 → validate_demo_farmers
- APP-TC-027 → submit_missing_steps
- APP-TC-028 → submit_zod_strict_fail
- APP-TC-029 → submit_no_user_session
- APP-TC-030 → submit_failed
- APP-TC-031 → submit_double_tap_lock
- APP-TC-032 → create_dealer_draft
- APP-TC-033 → autosave_dealer_draft
- APP-TC-034 → offline_dealer_draft
- APP-TC-035 → draft_requires_shop_mobile
- APP-TC-036 → draft_blocked_completed_profile
- APP-TC-037 → hide_save_draft_when_editing
- APP-TC-038 → fetch_dealer_draft_by_mobile
- APP-TC-039 → fetch_dealer_by_mobile_lock
- APP-TC-040 → update_dealer
- APP-TC-041 → restricted_locked_edit
- APP-TC-042 → upload_dealer_document
- APP-TC-043 → capture_shop_exterior_gps
- APP-TC-044 → upload_permission_denied
- APP-TC-045 → upload_file_too_large
- APP-TC-046 → upload_gps_required
- APP-TC-047 → audio_upload_failed
- APP-TC-048 → list_temp_dealers
- APP-TC-049 → temp_dealers_empty
- APP-TC-050 → temp_dealers_no_villages
- APP-TC-051 → wizard_next_step
- APP-TC-052 → wizard_jump_back_review
- APP-TC-053 → compliance_drives_document_uploads
