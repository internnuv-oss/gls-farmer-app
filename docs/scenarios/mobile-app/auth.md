# Test Scenario: Auth — Login

## Operation Overview
- **Module ID**: auth
- **UI Entry**: Unauthenticated stack screen `Login` (`AppNavigator` when `user` is null)
- **Primary files**: `Frontend/src/modules/auth/screens/LoginScreen.tsx`, `Frontend/src/modules/auth/hooks.ts`, `Frontend/src/modules/auth/schema.ts`, `Frontend/src/modules/auth/services/authService.ts`, `Frontend/src/navigation/AppNavigator.tsx`
- **Handler / function**: `useLoginForm` → `submit` → `loginUser`
- **API / data ops**: `supabase.auth.signInWithPassword({ email: \`${mobile}@gmail.com\`, password })`; on `SIGNED_IN`, `useAuthStore.setState({ user })` + `useShiftStore.getState().hydrateShifts()`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. **mobile** - Must match `/^\d{10}$/` (Source: `schema.ts` `loginSchema`)
   - Implementation: `z.string().regex(/^\d{10}$/, "Must be exactly 10 digits")`
2. **password** - Minimum length 6 (Source: `schema.ts` `loginSchema`)
   - Implementation: `z.string().min(6, "Password is required")`
3. **mobile UI cap** - Input `maxLength={10}`, `prefix="+91"`, `keyboardType="phone-pad"` (Source: `LoginScreen.tsx`)

### Business Logic Found in Code
1. **Synthetic auth email** (Source: `authService.ts` `loginUser`)
   - Implementation: `email: \`${values.mobile}@gmail.com\``
2. **Friendly error mapping** (Source: `hooks.ts` `getFriendlyErrorMessage`)
   - Maps substrings (case-insensitive): invalid credentials / network / rate limit / not confirmed|verified / fallback unexpected
3. **Login success does not navigate in screen callback** (Source: `LoginScreen.tsx`)
   - Implementation: `useLoginForm(() => {}, (err) => showAlert(...))` — empty `onSuccess`
4. **Session → local user + MainTabs** (Source: `AppNavigator.tsx` `onAuthStateChange`)
   - On `SIGNED_IN`: hydrate user from `session.user` + metadata; call `hydrateShifts()`
5. **Loading / anti double-submit** (Source: `hooks.ts` + `LoginScreen.tsx`)
   - `loading` true during submit; Button receives `loading={loading}`

### Error / Edge Paths Handled in UI
1. **Login API error** — UI shows alert title `Login Failed`, message = friendly mapped string
2. **Unexpected throw in submit** — same friendly mapper via `catch`
3. **Zod field errors** — inline via `error={error?.message}` on Input

### Permissions / Visibility
1. **Unauthenticated only** — Login mounted when `useAuthStore.user` is null and device is online (`AppNavigator.tsx`)
2. **Register link from Login** — commented out in `LoginScreen.tsx` (not rendered)

## Test Cases

### Success Scenarios
#### APP-TC-001: Successful login with valid mobile and password
- **Code Path**: LoginScreen → `useLoginForm.submit` → `loginUser` → `supabase.auth.signInWithPassword` → `onAuthStateChange(SIGNED_IN)` → auth store user + MainTabs
- **Based On**: `LoginScreen.tsx`, `hooks.ts`, `authService.ts`, `AppNavigator.tsx`
- **Preconditions**: `user` is null; network connected; account exists for `{mobile}@gmail.com`
- **User steps**: Enter 10-digit mobile + password (≥6 chars); press Login
- **Input**: e.g. mobile `9876543210`, password `secret1`
- **Expected UI behavior**: Login button shows loading then clears; no success alert from LoginScreen; navigator switches to authenticated stack (`MainTabs`)
- **Expected API / local call**: `signInWithPassword({ email: "9876543210@gmail.com", password: "secret1" })`; store user fields from metadata (`first_name`/`last_name`/`name`, `real_email`, `dob`, `mobile`, `is_profile_complete`); `hydrateShifts()`

### Validation Failure Scenarios
#### APP-TC-002: Login mobile not exactly 10 digits
- **Validation Rule**: `mobile` regex `/^\d{10}$/` → `"Must be exactly 10 digits"`
- **Input**: mobile `98765` (or any non-10-digit value); any password
- **Expected UI behavior**: Inline error under mobile; no `loginUser` call

#### APP-TC-003: Login password shorter than 6 characters
- **Validation Rule**: `password` `min(6)` → `"Password is required"`
- **Input**: mobile `9876543210`; password `12345`
- **Expected UI behavior**: Inline error under password; no `loginUser` call

### Business Logic Failure / Branch Scenarios
#### APP-TC-004: Invalid login credentials
- **Condition**: `error.message` includes `"invalid login credentials"` (case-insensitive)
- **Expected UI behavior**: Alert title `Login Failed`, message `The mobile number or password you entered is incorrect.`

#### APP-TC-005: Login network failure message
- **Condition**: error message includes `"network request failed"` OR `"failed to fetch"`
- **Expected UI behavior**: Alert `Login Failed` / `Network error. Please check your internet connection and try again.`

#### APP-TC-006: Login rate limit message
- **Condition**: error message includes `"too many requests"` OR `"rate limit"`
- **Expected UI behavior**: Alert `Login Failed` / `Too many failed attempts. Please wait a few minutes and try again.`

#### APP-TC-007: Account pending activation / not verified
- **Condition**: error message includes `"email not confirmed"` OR `"not verified"`
- **Expected UI behavior**: Alert `Login Failed` / `Your account is pending activation. Please contact your manager.`

#### APP-TC-008: Unexpected login error fallback
- **Condition**: any other error / throw message not matching mapped substrings
- **Expected UI behavior**: Alert `Login Failed` / `An unexpected error occurred while logging in. Please try again.`

#### APP-TC-009: Login button loading while request in flight
- **Condition**: `submit` sets `loading` true until `finally`
- **Expected UI behavior**: Login Button `loading` prop true (disabled while loading per Button usage)

---

# Test Scenario: Auth — Register

## Operation Overview
- **Module ID**: auth
- **UI Entry**: Unauthenticated stack screen `Register` (`AppNavigator`); also reachable via “Already have an account? → Login” reverse link from Register itself. Login→Register CTA is commented out on LoginScreen.
- **Primary files**: `Frontend/src/modules/auth/screens/RegisterScreen.tsx`, `Frontend/src/modules/auth/hooks.ts`, `Frontend/src/modules/auth/schema.ts`, `Frontend/src/modules/auth/services/authService.ts`
- **Handler / function**: `useRegisterForm` → `submit` → `registerUser`
- **API / data ops**: `supabase.auth.signUp({ email: \`${mobile}@gmail.com\`, password, options.data: {...} })`
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. **firstName** - `min(2)` → `"First Name is required"` (Source: `schema.ts`)
2. **lastName** - `min(2)` → `"Last Name is required"` (Source: `schema.ts`)
3. **email** - `z.string().email("Invalid email address")` (Source: `schema.ts`); UI lowercases on change (`RegisterScreen.tsx`)
4. **mobile** - `/^\d{10}$/` → `"Must be exactly 10 digits"`; UI `maxLength={10}`, `prefix="+91"`
5. **dob** - required `min(1)` → `"Date of Birth is required"`; refine age ≥ 18 → `"You must be at least 18 years old to register"` via `calculateAge` on `DD-MM-YYYY`
6. **dob picker max** - `maximumDate` = today − 18 years (`RegisterScreen.tsx` `maxDobDate`)
7. **password** - `min(6)` → `"Password must be at least 6 characters"`
8. **confirmPassword** - must equal `password` → `"Passwords don't match"` (path `confirmPassword`)

### Business Logic Found in Code
1. **Synthetic auth email** — `email: \`${values.mobile}@gmail.com\`` (`authService.ts`)
2. **Metadata on signUp** — `first_name`, `last_name`, `name` (`first + last` trimmed), `real_email`, `mobile`, `dob`, `role: 'SE'`
3. **Success UI ignores hook message string** — hook passes `"Account created successfully! Please login with your new credentials."` but screen always shows fixed Success alert copy
4. **Email normalize on type** — `field.onChange(val.toLowerCase())`
5. **Loading** during register submit

### Error / Edge Paths Handled in UI
1. **API error** — Alert title `Registration Failed`, message = raw `error.message`, button `Try Again` (`style: "destructive"`)
2. **Success** — Alert title `Success`, message `Account created successfully! Welcome to Field Commander.`, button `Let's Start`
3. **Zod errors** — inline under fields

### Permissions / Visibility
1. Register screen available in unauthenticated stack when online and `user` is null
2. Footer link navigates to `Login`

## Test Cases

### Success Scenarios
#### APP-TC-010: Successful registration with valid SE form data
- **Code Path**: RegisterScreen → `useRegisterForm.submit` → `registerUser` → `supabase.auth.signUp`
- **Based On**: `RegisterScreen.tsx`, `hooks.ts`, `schema.ts`, `authService.ts`
- **Preconditions**: Unauthenticated; online
- **User steps**: Fill all required fields with valid values; press Register
- **Input**: firstName/lastName ≥2 chars; valid email; 10-digit mobile; DOB age ≥18 (`DD-MM-YYYY`); password ≥6; confirmPassword matches
- **Expected UI behavior**: Button loading then Success alert: `Account created successfully! Welcome to Field Commander.` with `Let's Start`. (If provider emits `SIGNED_IN`, AppNavigator may also hydrate user / switch to MainTabs — driven by auth listener, not Register success callback navigation.)
- **Expected API / local call**: `signUp` with `email: "{mobile}@gmail.com"`, `password`, metadata `{ first_name, last_name, name, real_email, mobile, dob, role: 'SE' }`

#### APP-TC-011: Navigate from Register to Login
- **Code Path**: RegisterScreen → `navigation.navigate("Login")`
- **Based On**: `RegisterScreen.tsx`
- **User steps**: Tap `Login` in “Already have an account?” footer
- **Expected UI behavior**: Navigates to Login screen

### Validation Failure Scenarios
#### APP-TC-012: First name shorter than 2 characters
- **Validation Rule**: `firstName.min(2)` → `"First Name is required"`
- **Input**: firstName `A` (or empty)
- **Expected UI behavior**: Inline error; no `registerUser` call

#### APP-TC-013: Last name shorter than 2 characters
- **Validation Rule**: `lastName.min(2)` → `"Last Name is required"`
- **Input**: lastName `P` (or empty)
- **Expected UI behavior**: Inline error; no `registerUser` call

#### APP-TC-014: Invalid email format
- **Validation Rule**: `email` email format → `"Invalid email address"`
- **Input**: email `not-an-email`
- **Expected UI behavior**: Inline error; no `registerUser` call

#### APP-TC-015: Email lowercased as user types
- **Validation Rule**: UI transform only (not a blocking validation)
- **Input**: type `Ramesh@GLS.COM`
- **Expected UI behavior**: Field value becomes `ramesh@gls.com` via `toLowerCase()`

#### APP-TC-016: Register mobile not exactly 10 digits
- **Validation Rule**: `/^\d{10}$/` → `"Must be exactly 10 digits"`
- **Input**: mobile `987654321` (9 digits) or with letters
- **Expected UI behavior**: Inline error; no `registerUser` call

#### APP-TC-017: Date of Birth empty
- **Validation Rule**: `dob.min(1)` → `"Date of Birth is required"`
- **Input**: dob `""` (default)
- **Expected UI behavior**: Inline error; no `registerUser` call

#### APP-TC-018: Registrant under 18 years old
- **Validation Rule**: `calculateAge(dob) >= 18` → `"You must be at least 18 years old to register"`
- **Input**: DOB string whose computed age is &lt; 18 (picker also caps `maximumDate` at today−18)
- **Expected UI behavior**: Inline DOB error if underage value submitted; picker prevents selecting dates after maxDobDate

#### APP-TC-019: Register password shorter than 6 characters
- **Validation Rule**: `password.min(6)` → `"Password must be at least 6 characters"`
- **Input**: password `12345`
- **Expected UI behavior**: Inline error; no `registerUser` call

#### APP-TC-020: Confirm password does not match
- **Validation Rule**: refine `password === confirmPassword` → `"Passwords don't match"` on `confirmPassword`
- **Input**: password `secret1`; confirmPassword `secret2`
- **Expected UI behavior**: Inline error on confirm password; no `registerUser` call

### Business Logic Failure / Branch Scenarios
#### APP-TC-021: Registration API failure shows raw error
- **Condition**: `registerUser` returns `{ error }` with `error.message`
- **Expected UI behavior**: Alert title `Registration Failed`, message = raw `error.message`, button `Try Again` (destructive style)

#### APP-TC-022: Registration loading while request in flight
- **Condition**: `submit` sets `loading` true until `finally`
- **Expected UI behavior**: Register Button `loading` true (disabled while loading)

#### APP-TC-023: Hardcoded SE role and metadata payload on signUp
- **Condition**: Successful client validation then `registerUser(values)`
- **Expected UI behavior**: N/A (invisible); API metadata must include `role: 'SE'` and `name: \`${firstName} ${lastName}\`.trim()`, `real_email: values.email`, plus `first_name`, `last_name`, `mobile`, `dob`

---

# Test Scenario: Auth — Session Gate, Persistence & Offline

## Operation Overview
- **Module ID**: auth
- **UI Entry**: App root `AppNavigator` (global)
- **Primary files**: `Frontend/src/navigation/AppNavigator.tsx`, `Frontend/src/store/authStore.ts`
- **Handler / function**: `supabase.auth.onAuthStateChange`; `useAuthStore` persist/logout/`setUser`
- **API / data ops**: Auth state listener; AsyncStorage persist key `auth-storage`; NetInfo offline gate; `hydrateShifts` on sign-in
- **Layer**: APP

## Code Analysis

### Validations Found in Code
1. None additional beyond login/register forms

### Business Logic Found in Code
1. **Auth navigation gate** — `user` truthy → MainTabs + feature screens; else → Login + Register (`AppNavigator.tsx`)
2. **SIGNED_IN hydration** — builds local user from session id + metadata; does **not** call `setUser` (uses `useAuthStore.setState({ user })`, so `loginTimestamp` is not set by this path)
3. **SIGNED_OUT / !session** — calls `logout()` clearing `user` and `loginTimestamp`
4. **Persist** — Zustand persist `name: "auth-storage"` via AsyncStorage (`authStore.ts`)
5. **Offline gate** — if `isConnected === false`, replaces navigator with FeedbackScreenTemplate “No Internet Connection”
6. **Retry Connection** — `NetInfo.fetch()` then updates `isConnected`

### Error / Edge Paths Handled in UI
1. **Offline** — title `No Internet Connection`; description about offline / auto-resume; primary `Retry Connection`

### Permissions / Visibility
1. Route-level gate is presence of local `user` only (no role check in provided AppNavigator code)

## Test Cases

### Success Scenarios
#### APP-TC-024: Authenticated user sees MainTabs stack
- **Code Path**: `AppNavigator` reads `useAuthStore.user`
- **Based On**: `AppNavigator.tsx`
- **Preconditions**: `user` non-null; online
- **Expected UI behavior**: Stack shows `MainTabs` (and authenticated feature screens), not Login/Register

#### APP-TC-025: Unauthenticated user sees Login/Register stack
- **Code Path**: `AppNavigator` when `user` is null
- **Based On**: `AppNavigator.tsx`
- **Preconditions**: `user` null; online
- **Expected UI behavior**: Stack shows `Login` and `Register` only

#### APP-TC-026: SIGNED_IN hydrates local user from session metadata
- **Code Path**: `onAuthStateChange` → `SIGNED_IN`
- **Based On**: `AppNavigator.tsx`
- **Preconditions**: Session present with user_metadata
- **Expected UI behavior**: Local `user` populated with `id`, `name`, `firstName`, `lastName`, `email`←`real_email`, `dob`, `mobile`, `isProfileComplete`←`is_profile_complete || false`; shifts hydrated

#### APP-TC-027: Persisted auth user restored from AsyncStorage
- **Code Path**: `useAuthStore` persist middleware
- **Based On**: `authStore.ts`
- **Preconditions**: Prior session wrote `auth-storage` with non-null `user`
- **Expected UI behavior**: After rehydrate, if `user` non-null and online, authenticated navigator mounts (no `getSession` bootstrap in provided files)

### Business Logic Failure / Branch Scenarios
#### APP-TC-028: SIGNED_OUT or missing session clears local auth
- **Condition**: `event === 'SIGNED_OUT' || !session`
- **Expected UI behavior**: `logout()` → `user`/`loginTimestamp` null → Login/Register stack when online

#### APP-TC-029: Offline replaces entire navigator with No Internet screen
- **Condition**: `NetInfo` reports `isConnected === false`
- **Expected UI behavior**: Feedback screen title `No Internet Connection`; description `It looks like you're offline. Please check your mobile data or Wi-Fi connection. The app will automatically resume when the connection is restored.`; button `Retry Connection`

#### APP-TC-030: Retry Connection re-fetches network state
- **Condition**: User taps `Retry Connection` on offline screen
- **Expected UI behavior**: `NetInfo.fetch()` updates `isConnected`; if connected, normal navigator returns

#### APP-TC-031: Store logout clears user and loginTimestamp only
- **Condition**: `useAuthStore.getState().logout()` (invoked from AppNavigator on sign-out path in provided code)
- **Expected UI behavior**: `user: null`, `loginTimestamp: null` (no `supabase.auth.signOut` in provided auth sources)

#### APP-TC-032: setUser sets loginTimestamp when user non-null
- **Condition**: `setUser(user)` with non-null user (`authStore.ts`)
- **Expected UI behavior**: State updates `user` and `loginTimestamp: Date.now()`; null user clears timestamp via `setUser` path (`loginTimestamp: user ? Date.now() : null`)

---

## Coverage Notes (provided sources only)
- **Covered**: Login, Register, auth schemas/hooks/service, authStore persist/logout/setUser, AppNavigator auth gate, auth-state listener, offline gate.
- **Not covered from these sources**: Profile-screen Logout button UX, AutoLogoutProvider 7-day timer, `usePermissions` role modules, forgot-password (absent), Login→Register link (commented out — no executable path).
- Optional doc `docs/business-rules/auth.md` used for cross-check naming only; no TCs invented from doc-only rules.

## Backend/Web Mapping Hints
- APP-TC-001 → login
- APP-TC-002 → login_validate_mobile
- APP-TC-003 → login_validate_password
- APP-TC-004 → login_invalid_credentials
- APP-TC-005 → login_network_error
- APP-TC-006 → login_rate_limit
- APP-TC-007 → login_pending_activation
- APP-TC-008 → login_unexpected_error
- APP-TC-009 → login_loading
- APP-TC-010 → register
- APP-TC-011 → navigate_register_to_login
- APP-TC-012 → register_validate_first_name
- APP-TC-013 → register_validate_last_name
- APP-TC-014 → register_validate_email
- APP-TC-015 → register_normalize_email
- APP-TC-016 → register_validate_mobile
- APP-TC-017 → register_validate_dob_required
- APP-TC-018 → register_validate_dob_age
- APP-TC-019 → register_validate_password
- APP-TC-020 → register_validate_confirm_password
- APP-TC-021 → register_api_error
- APP-TC-022 → register_loading
- APP-TC-023 → register_metadata_role_se
- APP-TC-024 → session_authenticated_shell
- APP-TC-025 → session_unauthenticated_shell
- APP-TC-026 → session_signed_in_hydrate
- APP-TC-027 → session_persist_restore
- APP-TC-028 → session_signed_out_logout
- APP-TC-029 → offline_gate
- APP-TC-030 → offline_retry
- APP-TC-031 → logout_local
- APP-TC-032 → set_user_login_timestamp
