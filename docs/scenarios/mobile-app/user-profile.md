# Test Scenario: User Profile — Profile Screen View & Network Stats

## Operation Overview
- **Module ID**: user-profile
- **UI Entry**: MainTabs → Profile
- **Primary files**: `ProfileScreen.tsx`, `dashboardService` (fetchNetworkSummary / fetchSEProfile)
- **Handler / function**: `loadAllData` on focus / pull-to-refresh
- **API / data ops**: network counts + SE profile for `user.id`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Loading spinner until first load finishes
2. Header name from `seData.first_name/last_name` else `user.name` else “Sales Executive”
3. Subtitle: employeeId else `+91 user.mobile` else “No Contact Added”
4. Avatar from `documents.profilePhoto` or person icon
5. Stat boxes navigate Dashboard tabs: Distributors(0), Dealers(1), Farmers(2), FPOs(3)
6. Complete profile sections show personal / work / financial / assets / docs; empty → N/A or Missing
7. Version footer: Field Commander v1.0.5
8. Pending location sync widget polls `getPendingCount` every 5s

## Test Cases

### Success Scenarios
#### APP-TC-001: Load profile and network counts
- **Based On**: `ProfileScreen.tsx`
- **Preconditions**: logged-in `user.id`
- **Expected UI behavior**: Header + 2×2 stat counts after load

#### APP-TC-002: Pull-to-refresh reloads profile
- **Expected UI behavior**: RefreshControl; counts/profile refreshed

#### APP-TC-003: Tap Distributor/Dealer/Farmer/FPO stat navigates Dashboard tab
- **Expected UI behavior**: `navigate('Dashboard', { screen: 'DashboardMain', params: { activeTab: 0|1|2|3 } })`

#### APP-TC-004: Show synced tracking widget when pending is 0
- **Expected UI behavior**: Green “All tracking data synced to cloud”

#### APP-TC-005: Show pending locations waiting to sync
- **Condition**: `getPendingCount() > 0`
- **Expected UI behavior**: Amber “{n} locations waiting to sync…”

### Business Logic Failure / Branch Scenarios
#### APP-TC-006: loadAllData no-ops without user id
- **Expected UI behavior**: Early return; no fetch

#### APP-TC-007: Profile load error logged without user alert
- **Condition**: fetch throws
- **Expected UI behavior**: console.error; loading cleared

---

# Test Scenario: User Profile — Incomplete vs Complete Profile UI

## Operation Overview
- **Module ID**: user-profile
- **UI Entry**: ProfileScreen incomplete / complete branches
- **Primary files**: `ProfileScreen.tsx`, `draftStore.seDraft`
- **Handler / function**: `isProfileComplete = user?.isProfileComplete || seData?.is_profile_complete`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Incomplete + no draft → Profile Incomplete card + Complete Profile Now → SEOnboardingScreen
2. Incomplete + seDraft → Profile In Progress + % `((step-1)/6)*100` + “Step {{current}} of 6” + Resume Onboarding
3. Complete → Edit chip → SEOnboardingScreen with `{ editData: values }`; detail cards + DocRow View File / Missing
4. PDF/raw docs: download + Android Intent / iOS share; images → modal viewer
5. Doc open failure → Alert Error / Could not load the document

## Test Cases

### Success Scenarios
#### APP-TC-008: Incomplete profile prompts Complete Profile Now
- **Preconditions**: `!isProfileComplete`; no seDraft
- **Expected UI behavior**: Incomplete copy; navigate SEOnboardingScreen

#### APP-TC-009: Resume onboarding from draft
- **Preconditions**: seDraft present; incomplete
- **Expected UI behavior**: Progress %; Resume Onboarding → SEOnboardingScreen

#### APP-TC-010: Complete profile shows Edit and detail sections
- **Preconditions**: isProfileComplete
- **Expected UI behavior**: Edit visible; Personal/Work/Financial/Assets/Documents cards

#### APP-TC-011: Edit opens onboarding with editData
- **Expected UI behavior**: `navigate('SEOnboardingScreen', { editData: values })`

#### APP-TC-012: View image document in modal
- **Expected UI behavior**: Full-screen image viewer; close dismisses

#### APP-TC-013: View PDF / raw upload document
- **Expected UI behavior**: Opening… then platform PDF viewer/share

#### APP-TC-014: Missing document badge
- **Condition**: no url
- **Expected UI behavior**: Missing badge

### Business Logic Failure / Branch Scenarios
#### APP-TC-015: Document open failure
- **Expected UI behavior**: Error / Could not load the document

---

# Test Scenario: User Profile — Language & Logout

## Operation Overview
- **Module ID**: user-profile
- **UI Entry**: Profile preferences + Logout
- **Primary files**: `ProfileScreen.tsx`, `i18n.ts`, `authStore.ts`
- **Handler / function**: `i18n.changeLanguage`; `logout`
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. Language chips: en / gu / hi; active style when `i18n.language === lng`
2. Detector persists via AsyncStorage key `settings.lang` (`cacheUserLanguage`)
3. Fallback language `en`
4. Logout clears `user` and `loginTimestamp`

## Test Cases

### Success Scenarios
#### APP-TC-016: Switch language to ENG / ગુજરાતી / हिंदी
- **Expected UI behavior**: Active chip updates; UI strings retranslate

#### APP-TC-017: Persisted language restored on next launch
- **Expected API / local call**: AsyncStorage `settings.lang` read/write via detector

#### APP-TC-018: Logout clears session
- **Expected UI behavior**: `logout()` → user null (app auth gate handles redirect)

---

# Test Scenario: User Profile — SE Onboarding Wizard Navigation & Draft

## Operation Overview
- **Module ID**: user-profile
- **UI Entry**: SEOnboardingScreen (complete / resume / edit)
- **Primary files**: `SEOnboardingScreen.tsx`, `hooks.ts`, `draftStore.ts`
- **Handler / function**: `useSEOnboarding`; autoSave; saveAndExit
- **Layer**: APP

## Code Analysis

### Business Logic Found in Code
1. 7 steps: Personal → Org → Financial → Assets → Insurances → Documents → Review
2. `isEditing` if route `editData` has keys; starts step 1; **no** draft autosave; **no** Save & Exit
3. Else resume `seDraft.step/data` or step 1; autosave on step change, AppState background/inactive, unmount
4. Steps 1–6: `isNextEnabled === true` always (free Next)
5. Step 7 Complete disabled until presence gates for steps 1–6 fields (+ insurance partials + required docs)
6. Jump-back from Review sets `jumpBackTo=7`; Return to Review / Incomplete if `!isNextEnabled` on back
7. Success Feedback: Profile Complete! → Go to Profile
8. clearSEDraft on successful submit

## Test Cases

### Success Scenarios
#### APP-TC-019: Resume wizard at saved draft step
- **Preconditions**: seDraft.step/data; not editing
- **Expected UI behavior**: Opens at draft step with prior values

#### APP-TC-020: Autosave draft on step change (non-edit)
- **Expected API / local call**: `setSEDraft(step, form values)`

#### APP-TC-021: Save & Exit persists draft and opens Profile
- **Preconditions**: !isEditing
- **Expected UI behavior**: navigate MainTabs/Profile; draft kept

#### APP-TC-022: Edit mode hides Save & Exit and skips draft autosave
- **Preconditions**: editData present
- **Expected UI behavior**: No Save & Exit; autoSave early-returns

#### APP-TC-023: Next advances freely on steps 1–6
- **Expected UI behavior**: Next enabled regardless of incomplete fields until Review

#### APP-TC-024: Jump to step from Review Edit then Return to Review
- **Expected UI behavior**: setJumpBackTo(7); Return to Review label restores step 7

#### APP-TC-025: Success screen after submit
- **Expected UI behavior**: Profile Complete!; Go to Profile → MainTabs Profile

### Business Logic Failure / Branch Scenarios
#### APP-TC-026: Incomplete alert when returning to review with invalid gate
- **Condition**: jumpBackTo set and `!isNextEnabled`
- **Expected UI behavior**: Incomplete / Please fill all required fields correctly before returning to the review screen

#### APP-TC-027: Hardware back decrements step or exits step 1
- **Expected UI behavior**: step-1 when step>1; else default back

---

# Test Scenario: User Profile — SE Field Validations (Zod + Step7 Gate)

## Operation Overview
- **Module ID**: user-profile
- **UI Entry**: Complete on Step 7 / zod on submit
- **Primary files**: `schema.ts`, `hooks.ts` (`isNextEnabled`, `submit`)
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Zod: names min 2; DOB age ≥18; blood/marital enums; mobiles 10 digits; email; addresses min 10; pincodes 6 digits
2. Married → spouseName ≥2; spouseMobile 10–12 digits
3. employeeId uppercase alphanumeric; joiningDate not future; HQ/territory/area required
4. PAN / bank 9–18 digits / IFSC regex
5. Vehicle enum + number regex; DL format; dlExpiry required
6. Insurances optional empty row; partial row needs type+provider+insuranceId
7. Step7 gate requires profilePhoto, aadharCard, panCard, addressProof
8. Submit invalid → Validation Error / Please check all required fields…
9. sameAsPermanent copies permanent → current address/pincode

## Test Cases

### Validation Failure Scenarios
#### APP-TC-028: Reject DOB under 18
- **Validation Rule**: calculateAge(dob) >= 18
- **Expected UI behavior**: Zod “You must be at least 18 years old” (surfaced via Validation Error on submit)

#### APP-TC-029: Reject invalid mobile / emergency (not 10 digits)
- **Expected UI behavior**: Must be exactly 10 digits / Complete disabled on Review

#### APP-TC-030: Married requires spouse name and mobile
- **Expected UI behavior**: Custom zod issues; Step7 gate fails without spouse fields

#### APP-TC-031: Reject future joining date
- **Expected UI behavior**: Joining date cannot be in the future

#### APP-TC-032: Reject invalid PAN / IFSC / vehicle / DL formats
- **Expected UI behavior**: Matching zod messages; submit Validation Error path

#### APP-TC-033: Partial insurance row blocks Step7 Complete
- **Condition**: type/provider/id incompletely filled
- **Expected UI behavior**: Complete disabled (`isStep5Valid` false)

#### APP-TC-034: Missing required documents block Complete
- **Condition**: any of profilePhoto/aadhar/pan/addressProof missing
- **Expected UI behavior**: Complete disabled; Review shows Missing

#### APP-TC-035: empty insurance row allowed
- **Condition**: type/provider/insuranceId all empty
- **Expected UI behavior**: isStep5Valid true

### Success Scenarios
#### APP-TC-036: sameAsPermanent copies current address fields
- **Expected UI behavior**: currentAddress/currentPincode mirror permanent with validation

---

# Test Scenario: User Profile — Uploads & Submit Persistence

## Operation Overview
- **Module ID**: user-profile
- **UI Entry**: Steps 5–6 uploads; Step 7 Complete
- **Primary files**: `hooks.ts` handleUpload / submit
- **API / data ops**: Cloudinary; `sales_executive.upsert` with JSON detail blobs; `setUser({ isProfileComplete: true })`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. Camera/media permission before pick; denied → Permission Denied + fallbackMessage
2. Doc file > 5MB → File Too Large alert with size
3. Upload failure → Error / Upload failed

### Business Logic Found in Code
1. Images resized width 1024 / JPEG compress; docs as raw
2. Nested `insurances.N.documentUrl` and documents keys / educationalCertificates append
3. Upsert includes personal/organization/financial(+insurances)/assets/documents; `is_profile_complete: true`
4. No user id → Error / User session not found
5. DB error → Submission Failed / error.message

## Test Cases

### Success Scenarios
#### APP-TC-037: Upload required profile documents to Cloudinary
- **Expected UI behavior**: Document URLs set on form; uploading flags clear
- **Expected API / local call**: uploadFileToCloudinary

#### APP-TC-038: Upload insurance document via nested key
- **Expected API / local call**: setValue insurances[index].documentUrl

#### APP-TC-039: Submit complete profile upsert
- **Preconditions**: Step7 gates + zod pass; user.id present
- **Expected UI behavior**: Success feedback; draft cleared; auth isProfileComplete true
- **Expected API / local call**: sales_executive upsert profile_id

### Validation Failure Scenarios
#### APP-TC-040: Reject document over 5MB
- **Expected UI behavior**: File Too Large / …smaller than 5MB

#### APP-TC-041: Camera or media permission denied on upload
- **Expected UI behavior**: Permission Denied + fallbackMessage

### Business Logic Failure / Branch Scenarios
#### APP-TC-042: Upload failed
- **Expected UI behavior**: Error / Upload failed

#### APP-TC-043: Submit without user session
- **Expected UI behavior**: Error / User session not found

#### APP-TC-044: Submission Failed on upsert error
- **Expected UI behavior**: Submission Failed / error.message

#### APP-TC-045: Zod onInvalid on Complete
- **Expected UI behavior**: Validation Error / Please check all required fields in the previous steps

---

# Test Scenario: User Profile — Review Document Preview

## Operation Overview
- **Module ID**: user-profile
- **UI Entry**: Step7Review View File / insurance doc
- **Primary files**: `Step7Review.tsx`
- **Layer**: APP

## Test Cases

### Success Scenarios
#### APP-TC-046: Review shows spouse block only when Married
- **Expected UI behavior**: Spouse line when maritalStatus === Married

#### APP-TC-047: Review View File for uploaded docs / insurance
- **Expected UI behavior**: Image modal or PDF open; Opening… while downloading

### Business Logic Failure / Branch Scenarios
#### APP-TC-048: Review document load failure
- **Expected UI behavior**: Error / Could not load the document

#### APP-TC-049: No insurances recorded empty state
- **Condition**: insurances length falsy
- **Expected UI behavior**: No insurances recorded

---

## Coverage Notes (provided sources only)
- **Covered**: Profile view/stats/docs/sync widget, incomplete/resume/edit, language+logout, 7-step SE wizard, draft autosave, zod+Step7 gates, uploads, upsert submit, review jump-back.
- **Not invented**: Per-step UI field controls in Step1–6 component files (not in source list) beyond hooks/schema gates; RBAC module keys (none on Profile).
- **Quirk noted**: Profile draft progress UI says “of 6” / divides by 6 while wizard has 7 steps — TCs assert coded copy, not corrected math.
- Optional business-rules doc not provided.

## Backend/Web Mapping Hints
- APP-TC-001 → view_se_profile
- APP-TC-002 → refresh_se_profile
- APP-TC-003 → navigate_network_stat
- APP-TC-004 → tracking_sync_idle
- APP-TC-005 → tracking_sync_pending
- APP-TC-006 → profile_requires_user
- APP-TC-007 → profile_load_error
- APP-TC-008 → prompt_complete_profile
- APP-TC-009 → resume_se_onboarding
- APP-TC-010 → view_complete_profile
- APP-TC-011 → edit_se_profile
- APP-TC-012 → view_profile_image_doc
- APP-TC-013 → view_profile_pdf_doc
- APP-TC-014 → profile_doc_missing
- APP-TC-015 → profile_doc_open_failed
- APP-TC-016 → change_language
- APP-TC-017 → persist_language
- APP-TC-018 → logout
- APP-TC-019 → resume_se_draft
- APP-TC-020 → autosave_se_draft
- APP-TC-021 → save_and_exit_se
- APP-TC-022 → edit_mode_no_draft
- APP-TC-023 → se_next_free_until_review
- APP-TC-024 → se_jump_back_review
- APP-TC-025 → se_profile_success
- APP-TC-026 → se_incomplete_return_review
- APP-TC-027 → se_hardware_back
- APP-TC-028 → se_validate_age_18
- APP-TC-029 → se_validate_mobile
- APP-TC-030 → se_validate_spouse_if_married
- APP-TC-031 → se_validate_joining_date
- APP-TC-032 → se_validate_pan_ifsc_vehicle_dl
- APP-TC-033 → se_partial_insurance_block
- APP-TC-034 → se_required_documents
- APP-TC-035 → se_empty_insurance_ok
- APP-TC-036 → se_same_as_permanent
- APP-TC-037 → se_upload_documents
- APP-TC-038 → se_upload_insurance_doc
- APP-TC-039 → submit_se_profile
- APP-TC-040 → se_doc_max_5mb
- APP-TC-041 → se_upload_permission_denied
- APP-TC-042 → se_upload_failed
- APP-TC-043 → se_submit_requires_user
- APP-TC-044 → se_submit_failed
- APP-TC-045 → se_submit_validation_error
- APP-TC-046 → se_review_spouse_if_married
- APP-TC-047 → se_review_view_file
- APP-TC-048 → se_review_doc_failed
- APP-TC-049 → se_review_no_insurances
