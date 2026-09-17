# Company Profile - PTDARRAHMAN

Main public website + admin dashboard for Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

## Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI/Animation**: `lucide-react`, `framer-motion`, `gsap`
- **Security**: `dompurify`
- **Fonts**: `Inter`, `DM_Sans`, `Playfair_Display`, `Amiri` via `next/font/google`
- **Build Tools**: ESLint 9

## Routes
- **Public (`app/(main)/`)**:
  - `/` — Home
  - `/about`, `/news`, `/news/[slug]`, `/programs`, `/programs/[slug]`
  - `/facilities`, `/achievements`, `/gallery`, `/staff`, `/contact`
  - `/ppdb` — PPDB landing page
- **Auth**:
  - `/auth` — Student/parent portal login
- **Admin (`app/admin/`)**:
  - `/admin/login` — Login page
  - `/admin/overview` — Dashboard overview page (stats + per-section links into `/admin/dashboard`).
  - `/admin/dashboard` — Main CRUD dashboard (10 tabs, supports deep-link `?tab=...`).
  - `/admin` — Redirects to `/admin/overview` if `admin_user` exists in localStorage, else `/admin/login`.

## Key Conventions
- **Route Group**: `app/(main)/` contains all public pages wrapped with Navbar and Footer.
- **Layout**: Root `app/layout.tsx` is minimal (sets up `html`, `body`, fonts, and `Providers`).
- **Error Pages**: Custom `error.tsx`, `not-found.tsx`, and `global-error.tsx`.
- **Path Alias**: All imports use the `@/...` path alias (e.g., `@/app/...`).

## Backend & API
- **Backend Architecture**: FastAPI monolithic backend (located in `../api/`). NOT Postgres/Hono.
- **API Client**: Handled centrally in `app/lib/api.ts` with fallback mechanisms (`fetchWithFallback`).
- **Public API**: Fetched via `GET /companyprofile/{table}`.
- **Admin CRUD**: Managed via `POST/PUT/DELETE /companyprofile/{table}[/{id}]`.
- **Auth Flow**: Login at `/companyprofile/auth/login`. Returns JWT tokens.
  - Keys in `localStorage`: `admin_token`, `admin_refresh`, `admin_user`.
  - Token refresh logic is built into the API client (`tryRefresh`).
- **Real-time**: `useSSE.ts` uses `EventSource` to subscribe to `/companyprofile/events` (Server-Side Events from FastAPI).

## Admin Dashboard
- **10 CRUD Tabs**: news, programs, facilities, staff, achievements, gallery, testimonials, social, contact, and settings.
- **File Uploads**: Files are uploaded via `/companyprofile/upload` (forwarded to Cloudinary by backend).

### ATURAN WAJIB: Access Control & Permissions
- Access levels for modules follow the hierarchy: `none` < `dashboard` < `read` < `crud`.
- Users with `user_type === 'superadmin'` or `permissions.companyprofile === 'crud'` can create, edit, and delete.
- User data (`admin_user`) is retrieved from `localStorage` (populated at login) or via `api.getMe()`.
- Buttons (Create/Edit/Delete), "Aksi" columns, and forms must check this permission before rendering or allowing edits. Forms should be read-only if the user lacks `crud` access.
- Backend enforces permissions; frontend hiding is just for UX.

## Hooks & Contexts
- `useFocusTrap(open, onClose?)` — Focus trap for modals (Escape key, `role=dialog`).
- `useSSE()` — Subscribe to real-time content changes.
- `useRealtimeData()` — Fetch initial data and sync updates via SSE.
- `useScrollAnimations()` & `useTiltEffect()` — UI interactions and animations.
- `Providers` (in `app/context/Providers.tsx`) — Pass-through wrapper (renders `{children}` with no contexts; kept as an extension point).

## Components
- `AdminConfirm` — Reusable confirmation dialog.
- `AdminToast` — Toast notifications for admin actions.
- `ProfileModal` / `ProfileDropdown` — Manage user profile (username, email, password, avatar).
- `CrossTabSync` — Syncs state (like auth logout) across browser tabs.
- `EmptyState` — Renders empty fallback UI for admin tables.

## Build & Deployment
- `npm run dev` — Local development (port 3000)
- `npm run lint` — ESLint 9 with `--cache`
- `npm run build` — Standard Next.js build
