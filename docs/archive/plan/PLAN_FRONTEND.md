# Implementation Plan — Frontend PPDB Rebuild (Periods & Waves)

> **Goal:** Build the Admin UI for managing PPDB Periods and Waves, ensuring complete consistency with the existing design system, color palette, and permission system (`useCan`).

## Phase 1 — Cleanup & Service Update
1. Update `src/services/index.ts` `ppdbService`:
   - Keep: `getPeriods`, `getAllPeriods`, `getPeriod`, `createPeriod`, `updatePeriod`, `deletePeriod`.
   - Add: `activatePeriod`, `deactivatePeriod`.
   - Keep: `getWaves`, `getAllWaves`, `getWave`, `createWave`, `updateWave`, `deleteWave`.
   - Add: `activateWave`, `deactivateWave`.
   - Delete legacy PPDB services: `getLevels`, `getCategories`, `getFlows`, `getWaveConfigs`, etc.

## Phase 2 — Admin UI: Periods & Waves Management
1. **Create `src/pages/admin/ppdb/PeriodsPage.tsx`**:
   - Title: **Periode PPDB**.
   - Design: Use `glass-card`, `Card`, `Badge` components to match `AdminDashboardPage.tsx`.
   - **Table**: Display periods (Name, Start Date, End Date, Status). Status uses badges (`active` = green/success, `inactive` = gray/neutral).
   - **Actions (Gated by `useCan('ppdb', 'crud')`)**:
     - **Add**: Dialog form to create a new period (Name, Start Date, End Date).
     - **Edit**: Dialog form to edit existing period (Name, Start Date, End Date).
     - **Delete**: Confirmation dialog before deletion.
     - **Activate/Deactivate**: Button/Menu item to toggle period status.
   - **Sub-level (Waves)**: Provide a button "Lihat Gelombang" (View Waves) for each period that opens a dialog to manage waves for that period.

2. **Waves Management UI (dialog in `PeriodsPage`)**:
   - List waves for the selected `period_id`.
   - **Table/List**: Name, Wave Number, Start Date, End Date, Status.
   - **Actions (Gated by `useCan('ppdb', 'crud')`)**:
     - **Add**: Form.
     - **Edit**: Form.
     - **Delete**: Confirmation.
     - **Activate/Deactivate**: Button to toggle wave status.

## Phase 3 — Routing & Navigation Update
1. **Update `App.tsx`**:
   - Add route `<Route path="periods" element={<PeriodsPage />} />` under `/admin`.
2. **Update `AdminLayout.tsx`**:
   - Add "Periode PPDB" to `navItems` linking to `/admin/periods` with an appropriate Lucide icon (e.g., `CalendarDays`).

## Aesthetics & Rules
- **Colors**: Strictly follow `tailwind.config.js` (`glass-card`, `text-foreground`, `emerald-primary`, `rose-danger`).
- **Icons**: Use `lucide-react` (e.g., `Plus`, `Edit`, `Trash2`, `CheckCircle`, `XCircle`).
- **Permissions**: Wrap any mutation actions in `<Can module="ppdb" level="crud">` or conditionally render based on `useCan('ppdb', 'crud')`.
- **Modals/Toast**: Re-use `@/components/ui/Dialog` and the `useToast` hook for success/error alerts.
