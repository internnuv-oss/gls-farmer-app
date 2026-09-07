# Mobile App Scenario Generation — Prompt Snippets

Use with Agent mode. Rule is reusable; only **Target** + **Sources** change per module.

## One-liner shape

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: <module-id>
- Output path: scenarios/app/<module-id>.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/<...screens...>
@Frontend/src/modules/<...hooks/schema/services...>
(and any other files this module imports for create/edit/list/permission/validation)

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/<module-id>.md
```

Output: `scenarios/app/<module-id>.md` with `APP-TC-*` cases. Layer tag: `APP`.

---

## Module IDs (aligned with `docs/business-rules/` when present)

Generate in this order (highest shared value / dependency first):

| # | Module ID | Business-rule file | Permission hint (not a TC source) |
|---|-----------|--------------------|-----------------------------------|
| 1 | `auth` | `auth.md` | — |
| 2 | `dealer` | `dealer.md` | `mobile_dealer` |
| 3 | `distributor` | `distributor.md` | `mobile_distributor` |
| 4 | `fpo` | `fpo.md` | `mobile_fpo` |
| 5 | `farmer-part-1` | `farmer-part-1.md` | `mobile_farmer`, `mobile_farmer_onboard` |
| 6 | `dashboard` | `dashboard.md` | tab/FAB gates via `mobile_*` |
| 7 | `attendance` | `attendance.md` | `mobile_travel_activity` |
| 8 | `expenses` | `expenses.md` | `mobile_travel_activity` |
| 9 | `retail` | `retail.md` | `mobile_retail` |
| 10 | `user-profile` | `user-profile.md` | — (includes SE onboarding) |
| 11 | `farmer-part-2` | `farmer-part-2.md` | FarmCard + FarmDiary (mobile-heavy) |

---

## Example prompts by module

### 1) auth

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: auth
- Output path: scenarios/app/auth.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/auth/screens/LoginScreen.tsx
@Frontend/src/modules/auth/screens/RegisterScreen.tsx
@Frontend/src/modules/auth/hooks.ts
@Frontend/src/modules/auth/schema.ts
@Frontend/src/modules/auth/services/authService.ts
@Frontend/src/store/authStore.ts
@Frontend/src/navigation/AppNavigator.tsx

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/auth.md
```

### 2) dealer

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: dealer
- Output path: scenarios/app/dealer.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/onboarding/dealer/screens/DealerOnboardingScreen.tsx
@Frontend/src/modules/onboarding/dealer/hooks.ts
@Frontend/src/modules/onboarding/dealer/schema.ts
@Frontend/src/modules/onboarding/dealer/screens/steps/
@Frontend/src/modules/onboarding/services/onboardingService.ts
@Frontend/src/modules/onboarding/services/cloudinaryService.ts
@Frontend/src/store/draftStore.ts
@Frontend/src/modules/dashboard/screens/DashboardScreen.tsx
@Frontend/src/modules/dashboard/screens/EntityProfileScreen.tsx
@Frontend/src/modules/dashboard/screens/TempDealersListScreen.tsx
@Frontend/src/modules/dashboard/services/dashboardService.ts
@Frontend/src/core/usePermissions.ts

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/dealer.md
```

### 3) distributor

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: distributor
- Output path: scenarios/app/distributor.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/onboarding/distributor/screens/DistributorOnboardingScreen.tsx
@Frontend/src/modules/onboarding/distributor/hooks.ts
@Frontend/src/modules/onboarding/distributor/schema.ts
@Frontend/src/modules/onboarding/distributor/screens/steps/
@Frontend/src/modules/onboarding/services/onboardingService.ts
@Frontend/src/store/draftStore.ts
@Frontend/src/modules/dashboard/screens/DashboardScreen.tsx
@Frontend/src/modules/dashboard/screens/EntityProfileScreen.tsx
@Frontend/src/core/usePermissions.ts

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/distributor.md
```

### 4) fpo

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: fpo
- Output path: scenarios/app/fpo.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/onboarding/fpo/screens/FPOOnboardingScreen.tsx
@Frontend/src/modules/onboarding/fpo/hooks.ts
@Frontend/src/modules/onboarding/fpo/schema.ts
@Frontend/src/modules/onboarding/fpo/screens/steps/
@Frontend/src/modules/onboarding/services/onboardingService.ts
@Frontend/src/store/draftStore.ts
@Frontend/src/modules/dashboard/screens/DashboardScreen.tsx
@Frontend/src/modules/dashboard/screens/EntityProfileScreen.tsx
@Frontend/src/core/usePermissions.ts

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/fpo.md
```

### 5) farmer-part-1

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: farmer-part-1
- Output path: scenarios/app/farmer-part-1.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/onboarding/farmer/screens/FarmerOnboardingScreen.tsx
@Frontend/src/modules/onboarding/farmer/hooks.ts
@Frontend/src/modules/onboarding/farmer/schema.ts
@Frontend/src/modules/onboarding/farmer/screens/steps/
@Frontend/src/modules/onboarding/services/onboardingService.ts
@Frontend/src/modules/FSPP/screens/FSPPEnrollmentScreen.tsx
@Frontend/src/modules/FSPP/screens/steps/
@Frontend/src/modules/dashboard/screens/FarmerHubScreen.tsx
@Frontend/src/modules/dashboard/screens/GeneralVisitScreen.tsx
@Frontend/src/modules/dashboard/screens/DashboardScreen.tsx
@Frontend/src/modules/dashboard/screens/EntityProfileScreen.tsx
@Frontend/src/store/draftStore.ts
@Frontend/src/core/usePermissions.ts

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/farmer-part-1.md
```

### 6) dashboard

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: dashboard
- Output path: scenarios/app/dashboard.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/dashboard/screens/DashboardScreen.tsx
@Frontend/src/modules/dashboard/hooks.ts
@Frontend/src/modules/dashboard/services/dashboardService.ts
@Frontend/src/modules/dashboard/components/
@Frontend/src/core/usePermissions.ts
@Frontend/src/navigation/AppNavigator.tsx

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/dashboard.md
```

### 7) attendance

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: attendance
- Output path: scenarios/app/attendance.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/shifts/components/ActiveShiftWidget.tsx
@Frontend/src/modules/shifts/components/PunchInModal.tsx
@Frontend/src/modules/shifts/components/PunchOutModal.tsx
@Frontend/src/store/shiftStore.ts
@Frontend/src/modules/reports/screens/TravelReportScreen.tsx
@Frontend/src/modules/reports/screens/ReportsHubScreen.tsx
@Frontend/src/core/OfflineSyncManager.tsx
@Frontend/src/core/locationUtils.ts
@Frontend/src/core/database.ts
@Frontend/src/core/usePermissions.ts

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/attendance.md
```

### 8) expenses

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: expenses
- Output path: scenarios/app/expenses.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/reports/screens/ExpenseReportScreen.tsx
@Frontend/src/modules/reports/screens/AddExpenseScreen.tsx
@Frontend/src/modules/reports/screens/ReportsHubScreen.tsx
@Frontend/src/store/expenseStore.ts
@Frontend/src/core/usePermissions.ts

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/expenses.md
```

### 9) retail

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: retail
- Output path: scenarios/app/retail.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/retail/screens/InventoryScreen.tsx
@Frontend/src/modules/retail/screens/RetailInvoicingScreen.tsx
@Frontend/src/modules/retail/screens/NewInvoiceScreen.tsx
@Frontend/src/modules/reports/screens/ReportsHubScreen.tsx
@Frontend/src/core/usePermissions.ts

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/retail.md
```

### 10) user-profile

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: user-profile
- Output path: scenarios/app/user-profile.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/dashboard/screens/ProfileScreen.tsx
@Frontend/src/modules/onboarding/se/screens/SEOnboardingScreen.tsx
@Frontend/src/modules/onboarding/se/hooks.ts
@Frontend/src/modules/onboarding/se/schema.ts
@Frontend/src/modules/onboarding/se/screens/steps/
@Frontend/src/store/draftStore.ts
@Frontend/src/store/authStore.ts
@Frontend/src/core/i18n.ts

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/user-profile.md
```

### 11) farmer-part-2 (FarmCard + FarmDiary)

```
Follow @docs/scenarios/session/app_scenarios_rule.mdc

## Target
- Module ID: farmer-part-2
- Output path: scenarios/app/farmer-part-2.md
- Overwrite if exists

## Sources (code only — primary)
@Frontend/src/modules/FarmCard/
@Frontend/src/modules/FarmDiary/
@Frontend/src/store/draftStore.ts
@Frontend/src/store/farmDiaryStore.ts
@Frontend/src/modules/dashboard/screens/FarmerHubScreen.tsx

## Optional cross-check only (do NOT invent TCs from docs)
@docs/business-rules/farmer-part-2.md
```

---

## Notes

- Do **not** generate scenario files until you paste a Target + Sources prompt.
- Chase imports the agent discovers (steps, services, stores) even if not listed above.
- Shared operation keys in **Backend/Web Mapping Hints** should match WEB/BACKEND style (`list_dealers`, `create_dealer_draft`, `submit_dealer`, `punch_in`, `add_expense`, …).
