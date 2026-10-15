# Superadmin Panel - PTDARRAHMAN

This document provides a technical overview of the Superadmin panel for the Pesantren Tahfidz Qur'an dan Digital Ar-Rahman system. It is meant to be read by AI agents and developers to quickly understand the directory structure, tech stack, and conventions.

## Tech Stack
- **Framework:** React 19 with Vite 8.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS v3.4.
- **Components:** `lucide-react` for icons, `sonner` for toast notifications, and Radix UI primitives (`@radix-ui/react-*`) combined with `class-variance-authority`, `clsx`, and `tailwind-merge` for UI components.
- **Routing:** `react-router-dom` v7.

## Routing (`src/App.tsx`)
The application is a Single Page Application (SPA) with the following routes:
- **Public Routes:**
  - `/auth/login`: Superadmin login page.
- **Protected Routes** (Requires Superadmin access):
  - `/` and `/dashboard`: Dashboard summary page showing user and role statistics.
  - `/users`, `/users/new`, `/users/:id`: User management CRUD operations.
  - `/roles`, `/roles/new`, `/roles/:id`: Role management CRUD. Includes assigning module and page permissions (`companyprofile` and `ppdb`).
  - `/applicants`: PPDB Applicants overview and credential resets.
  - `/activities`: User activity audit history log.
  - `/notifications`: View notification logs and send custom notifications.
  - `/whatsapp`: WhatsApp connection status and QR scanning.
  - `/profile`: Update current superadmin profile (including avatar, password).
  - `*`: 404 Not Found page.

## Authentication & Access Control
- **Token Management:** Handled in `src/api/client.ts`. Auth is **httpOnly-cookie based** (`credentials: 'include'`); only the authenticated user object is stored in `localStorage` under key `sa_user` (via `getStoredUser`/`setStoredUser`). There are **no** `sa_token`/`sa_refresh` keys in localStorage. Automatic token refresh is implemented on HTTP 401 errors using `/companyprofile/auth/refresh`.
- **Authorization Guard:** Checked by `src/components/ProtectedRoute.tsx`.
  - The panel is **STRICTLY** for superadmin users.
  - Access is granted **only** if `user.user_type === 'superadmin'` or `user.is_superadmin === true`. Any other user attempting to access protected routes will be forcibly redirected to `/auth/login`.
- **CRUD Operations Guarding:** Actions like creating or editing users/roles require `canCrud = currentUser?.user_type === 'superadmin'`.
- **System Roles (`is_system = true`):** Protected system roles (e.g., Superadmin, Pendaftar) have specific UI safeguards in `RoleFormPage` to prevent unauthorized modification or deletion.

## API Integration (`src/api/client.ts`)
- The `apiFetch` wrapper handles automatic token refresh logic (cookie-based; no manual token injection happens — every request sends `credentials: 'include'`).
- **Base URL:** Defined via the `VITE_API_URL` environment variable (defaults to `http://localhost:8000` or `http://localhost:8080`).
- **Endpoints Interacted With:**
  - **Auth:** `/companyprofile/auth/login`, `/companyprofile/auth/me`, `/companyprofile/auth/refresh`, `/companyprofile/auth/logout`.
  - **Users:** `/users` (CRUD).
  - **Roles & Permissions:** `/roles` (CRUD), `/modules`, `/users/:id/page-permissions`.
  - **Applicants:** `/ppdb/applicants`, `/ppdb/applicants/:id/password`.
  - **Notifications:** `/notifications/logs`, `/notifications/send`.
  - **General:** `/superadmin/dashboard`, `/companyprofile/settings`, `/companyprofile/upload`.

## Modules & Permissions
- Modules available for configuration in Role forms are defined in `src/types/index.ts` under `MODULE_LABELS` (`companyprofile` and `ppdb`).
- Access levels (`ACCESS_LEVELS`) include: `none` < `dashboard` < `read` < `crud`.
- Page-level permissions can be directly assigned to users via the `/users/:id/page-permissions` endpoint, managing specific UI capabilities per user based on assigned module roles.

## Product Rules (from root AGENTS.md + docs/REQUIREMENTS.md)
- **No education-level selection.** This system has no list of jenjang (`SMP`, `SMK`, ...) and no jenjang picker anywhere.
- **Health form replaces Medcheck.** Applicants self-fill the health identification form during registration (10 questions + attestation). It is stored as sensitive data viewable only in detailed admin dossiers.
- **Superadmin Boundary:** Superadmin manages user accounts, roles, permissions, WhatsApp connection, and platform activity logs. Day-to-day PPDB registration, document review, exam scoring, and stage payments are managed in the PPDB Backoffice (`apps/ppdb`), not in this panel.

## Development & Build Commands
- `npm run dev`: Start Vite development server (port `5173` on local Vite dev; mapped to port `5174` in Docker preview).
- `npm run build`: Compile TypeScript and build (`tsc -b && vite build`).
- `npm run preview`: Preview build locally.
