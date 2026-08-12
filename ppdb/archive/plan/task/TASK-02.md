> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# TASK-02: Frontend Project Setup (Router, Layout, Auth)

## Info
| Item | Value |
|------|-------|
| Phase | Phase 1 â€” Foundation |
| Priority | ðŸ”´ Critical |
| Estimasi | 2-3 hari |
| Dependencies | â€” |

## Deskripsi
Setup project frontend React + TypeScript + Vite + TailwindCSS secara menyeluruh. Meliputi instalasi dependensi, konfigurasi folder structure, pembuatan layout components (AdminLayout, PublicLayout, ApplicantLayout), setup routing dengan role-based guards, dan konfigurasi API service layer menggunakan axios dengan interceptor untuk token management.

## Scope

### Frontend (UI)

#### 1. Instalasi Dependensi
```bash
# Core
npm install react-router-dom axios zustand

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# UI Components
npm install @headlessui/react @heroicons/react
npm install clsx tailwind-merge
npm install react-hot-toast

# Dev
npm install -D @types/react-router-dom
```

#### 2. Folder Structure
```
src/
â”œâ”€â”€ assets/                  # Static assets (images, fonts)
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ ui/                  # Reusable UI components
â”‚   â”‚   â”œâ”€â”€ Button.tsx
â”‚   â”‚   â”œâ”€â”€ Input.tsx
â”‚   â”‚   â”œâ”€â”€ Select.tsx
â”‚   â”‚   â”œâ”€â”€ Modal.tsx
â”‚   â”‚   â”œâ”€â”€ Table.tsx
â”‚   â”‚   â”œâ”€â”€ Card.tsx
â”‚   â”‚   â”œâ”€â”€ Badge.tsx
â”‚   â”‚   â”œâ”€â”€ Alert.tsx
â”‚   â”‚   â”œâ”€â”€ Spinner.tsx
â”‚   â”‚   â”œâ”€â”€ Pagination.tsx
â”‚   â”‚   â”œâ”€â”€ ConfirmDialog.tsx
â”‚   â”‚   â””â”€â”€ index.ts         # Barrel export
â”‚   â”œâ”€â”€ forms/               # Reusable form components
â”‚   â”‚   â”œâ”€â”€ FormField.tsx
â”‚   â”‚   â”œâ”€â”€ FormSelect.tsx
â”‚   â”‚   â”œâ”€â”€ FormDatePicker.tsx
â”‚   â”‚   â””â”€â”€ FormTextarea.tsx
â”‚   â””â”€â”€ shared/              # Shared composite components
â”‚       â”œâ”€â”€ DataTable.tsx
â”‚       â”œâ”€â”€ SearchFilter.tsx
â”‚       â”œâ”€â”€ StatusBadge.tsx
â”‚       â””â”€â”€ EmptyState.tsx
â”œâ”€â”€ hooks/
â”‚   â”œâ”€â”€ useAuth.ts
â”‚   â”œâ”€â”€ useDebounce.ts
â”‚   â”œâ”€â”€ usePagination.ts
â”‚   â”œâ”€â”€ useModal.ts
â”‚   â””â”€â”€ useMediaQuery.ts
â”œâ”€â”€ layouts/
â”‚   â”œâ”€â”€ AdminLayout.tsx       # Sidebar + header + content area
â”‚   â”œâ”€â”€ PublicLayout.tsx      # Navbar + footer
â”‚   â”œâ”€â”€ ApplicantLayout.tsx   # Simplified sidebar for applicants
â”‚   â””â”€â”€ components/
â”‚       â”œâ”€â”€ Sidebar.tsx
â”‚       â”œâ”€â”€ AdminHeader.tsx
â”‚       â”œâ”€â”€ PublicNavbar.tsx
â”‚       â”œâ”€â”€ PublicFooter.tsx
â”‚       â”œâ”€â”€ ApplicantSidebar.tsx
â”‚       â””â”€â”€ UserMenu.tsx
â”œâ”€â”€ pages/
â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”œâ”€â”€ LoginPage.tsx
â”‚   â”‚   â”œâ”€â”€ RegisterPage.tsx
â”‚   â”‚   â””â”€â”€ ForgotPasswordPage.tsx
â”‚   â”œâ”€â”€ admin/                # Admin pages (TASK-07+)
â”‚   â”œâ”€â”€ applicant/            # Applicant dashboard pages
â”‚   â”œâ”€â”€ public/               # Public pages (TASK-10)
â”‚   â””â”€â”€ errors/
â”‚       â”œâ”€â”€ NotFoundPage.tsx
â”‚       â”œâ”€â”€ ForbiddenPage.tsx
â”‚       â””â”€â”€ ServerErrorPage.tsx
â”œâ”€â”€ routes/
â”‚   â”œâ”€â”€ index.tsx             # Main route configuration
â”‚   â”œâ”€â”€ AdminRoutes.tsx       # Admin route group
â”‚   â”œâ”€â”€ ApplicantRoutes.tsx   # Applicant route group
â”‚   â”œâ”€â”€ PublicRoutes.tsx      # Public route group
â”‚   â””â”€â”€ guards/
â”‚       â”œâ”€â”€ ProtectedRoute.tsx
â”‚       â”œâ”€â”€ RoleGuard.tsx
â”‚       â””â”€â”€ GuestRoute.tsx
â”œâ”€â”€ services/
â”‚   â”œâ”€â”€ api.ts                # Axios instance + interceptors
â”‚   â”œâ”€â”€ auth.service.ts       # Auth API calls
â”‚   â””â”€â”€ index.ts
â”œâ”€â”€ stores/
â”‚   â”œâ”€â”€ authStore.ts          # Zustand auth store
â”‚   â”œâ”€â”€ uiStore.ts            # Sidebar state, theme, etc.
â”‚   â””â”€â”€ index.ts
â”œâ”€â”€ types/
â”‚   â”œâ”€â”€ auth.types.ts
â”‚   â”œâ”€â”€ api.types.ts          # API response wrapper types
â”‚   â”œâ”€â”€ common.types.ts       # Shared types
â”‚   â””â”€â”€ index.ts
â”œâ”€â”€ utils/
â”‚   â”œâ”€â”€ cn.ts                 # clsx + tailwind-merge helper
â”‚   â”œâ”€â”€ format.ts             # Date, currency formatters
â”‚   â”œâ”€â”€ constants.ts          # App-wide constants
â”‚   â””â”€â”€ validators.ts         # Common zod schemas
â”œâ”€â”€ App.tsx
â”œâ”€â”€ main.tsx
â””â”€â”€ index.css                 # Tailwind directives
```

#### 3. Layout Components

**AdminLayout** (`layouts/AdminLayout.tsx`)
- Collapsible sidebar di kiri (240px expanded, 64px collapsed)
- Header bar di atas dengan: breadcrumb, notification bell, user menu dropdown
- Main content area dengan padding
- Sidebar navigation items:
  - Dashboard
  - Konfigurasi PPDB (submenu: Periode, Gelombang, Jenjang, Kategori, Flow Seleksi, Konfigurasi Gelombang)
  - Pendaftar (submenu: Daftar Pendaftar, Verifikasi Dokumen)
  - Seleksi (submenu: Jadwal Tes, Input Nilai, Kelulusan)
  - Keuangan (submenu: Pembayaran, Tagihan, Diskon)
  - MOU
  - Daftar Ulang
  - MPLS
  - Laporan
  - Pengaturan (submenu: Users, Roles, Template Notifikasi)
- Responsive: pada mobile, sidebar menjadi drawer overlay
- State sidebar (collapsed/expanded) disimpan di `uiStore`

**PublicLayout** (`layouts/PublicLayout.tsx`)
- Top navbar dengan: logo sekolah, nama sekolah, menu items (Home, Info PPDB, Jadwal, Kontak), tombol Login/Daftar
- Footer dengan: info sekolah, alamat, kontak, social media, copyright
- Full-width content area
- Responsive navbar â†’ hamburger menu di mobile

**ApplicantLayout** (`layouts/ApplicantLayout.tsx`)
- Simplified sidebar atau top tabs:
  - Dashboard
  - Data Pendaftaran
  - Dokumen
  - Pembayaran
  - Jadwal Tes
  - Hasil Seleksi
  - MOU
  - Daftar Ulang
  - MPLS
- Header dengan: welcome message, notification bell, user menu
- Progress indicator menunjukkan step saat ini

#### 4. Route Configuration

```typescript
// routes/index.tsx
const routes = [
  // Public routes (no auth required)
  { path: '/', element: <PublicLayout />, children: [
    { index: true, element: <LandingPage /> },
    { path: 'info', element: <InfoPage /> },
    { path: 'register', element: <RegistrationPage /> },
  ]},

  // Auth routes (guest only)
  { path: '/auth', element: <GuestRoute />, children: [
    { path: 'login', element: <LoginPage /> },
    { path: 'register', element: <RegisterPage /> },
  ]},

  // Admin routes (superadmin, admin_ppdb, admin_keuangan)
  { path: '/admin', element: <ProtectedRoute><RoleGuard roles={['superadmin','admin_ppdb','admin_keuangan']}><AdminLayout /></RoleGuard></ProtectedRoute>, children: [
    { index: true, element: <AdminDashboard /> },
    { path: 'periods', element: <RoleGuard roles={['superadmin']}><PeriodListPage /></RoleGuard> },
    { path: 'waves', element: <RoleGuard roles={['superadmin']}><WaveListPage /></RoleGuard> },
    // ... more admin routes
  ]},

  // Applicant routes
  { path: '/applicant', element: <ProtectedRoute><RoleGuard roles={['applicant']}><ApplicantLayout /></RoleGuard></ProtectedRoute>, children: [
    { index: true, element: <ApplicantDashboard /> },
    { path: 'profile', element: <ApplicantProfilePage /> },
    // ... more applicant routes
  ]},

  // Error pages
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
];
```

#### 5. API Service Layer

**Axios Instance** (`services/api.ts`)
```typescript
// Fitur:
// - Base URL dari environment variable (VITE_API_URL)
// - Request interceptor: inject Authorization header dari authStore
// - Response interceptor: handle 401 â†’ attempt token refresh â†’ retry original request
// - Response interceptor: handle 403 â†’ redirect ke /403
// - Response interceptor: handle 500 â†’ show toast error
// - Queue mechanism untuk concurrent 401 requests saat refresh sedang berjalan
```

**API Response Types** (`types/api.types.ts`)
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiPaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
```

#### 6. UI Component Library (Base)

**Button** â€” variants: `primary`, `secondary`, `danger`, `ghost`, `outline`; sizes: `sm`, `md`, `lg`; loading state
**Input** â€” label, error message, helper text, prefix/suffix icons
**Select** â€” native select with styling, error message
**Modal** â€” overlay, header, body, footer, close button, sizes: `sm`, `md`, `lg`, `xl`
**Table** â€” sortable headers, loading skeleton, empty state
**Card** â€” header, body, footer sections
**Badge** â€” color variants for status display
**Alert** â€” info, success, warning, error variants
**Spinner** â€” loading indicator
**Pagination** â€” page numbers, prev/next, page size selector

## Acceptance Criteria
- [ ] Semua dependensi terinstall dan `npm run dev` berjalan tanpa error
- [ ] Folder structure sesuai spesifikasi di atas
- [ ] AdminLayout render dengan sidebar navigasi yang bisa di-collapse
- [ ] PublicLayout render dengan navbar dan footer
- [ ] ApplicantLayout render dengan sidebar/tabs
- [ ] Route configuration berjalan â€” navigasi antar halaman bekerja
- [ ] ProtectedRoute redirect ke `/auth/login` jika belum login
- [ ] GuestRoute redirect ke dashboard jika sudah login
- [ ] RoleGuard redirect ke `/403` jika role tidak sesuai
- [ ] Axios instance terkonfigurasi dengan interceptors (token injection, 401 refresh, error handling)
- [ ] Minimal 5 base UI components (Button, Input, Modal, Table, Card) sudah dibuat
- [ ] Semua layout responsive (mobile, tablet, desktop)
- [ ] TailwindCSS custom theme terkonfigurasi (colors, fonts sesuai branding sekolah)
- [ ] Dark mode support (optional, menggunakan Tailwind `dark:` classes)
- [ ] Error pages (404, 403, 500) sudah dibuat
- [ ] TypeScript strict mode â€” tidak ada `any` type

## Technical Notes
- Gunakan `createBrowserRouter` dari react-router-dom v6 untuk definisi routes
- Zustand store menggunakan `persist` middleware untuk auth state (simpan ke localStorage)
- `cn()` utility menggunakan `clsx` + `twMerge` untuk conditional class merging
- Axios interceptor harus handle race condition saat multiple requests mendapat 401 bersamaan â€” gunakan queue pattern
- Layout components menggunakan `<Outlet />` dari react-router untuk render child routes
- Sidebar navigation items didefinisikan sebagai array config agar mudah di-maintain
- Gunakan `React.lazy()` + `Suspense` untuk code splitting per route group (admin, applicant, public)
- Environment variables: `VITE_API_URL`, `VITE_APP_NAME`, `VITE_APP_VERSION`
- Tailwind config: extend colors dengan warna brand sekolah (primary, secondary)
- Semua icon menggunakan `@heroicons/react` (outline variant untuk sidebar, solid untuk badge/alert)

