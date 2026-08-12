> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# PPDB Frontend Application

Sistem Frontend untuk Penerimaan Peserta Didik Baru (PPDB) Terintegrasi. Aplikasi ini dibangun dengan React, TypeScript, dan Vite.

## Fitur Utama

- **Dashboard Admin**: Ringkasan data pendaftar, dokumen, dan keuangan. 
  *(Catatan: Semua data yang ditampilkan secara default dikunci berdasarkan "Periode Aktif" yang saat ini sedang berlangsung).*
- **Manajemen Pendaftar**: Daftar seluruh pendaftar, difilter berdasarkan gelombang dan periode aktif.
- **Verifikasi Dokumen**: Antrean dokumen pendaftar yang siap di-review oleh admin.
- **Manajemen Pembayaran**: Daftar invoice dan transaksi pembayaran.

## Struktur Direktori

- `src/pages`: Berisi seluruh halaman aplikasi (Admin dan User).
- `src/components`: Komponen antarmuka yang dapat digunakan kembali (UI library).
- `src/services`: Modul untuk berkomunikasi dengan Backend API.
- `src/api`: Konfigurasi client axios untuk fetching data.

## Konsep "Periode Aktif"

Sistem ini mendukung pengelolaan multiple periode (misal: Tahun Ajaran 2026/2027, 2027/2028, dst).
- Hanya boleh ada **1 Periode Aktif** pada satu waktu.
- Seluruh tampilan daftar (Applicants, Invoices, Documents, Waves) pada dashboard Admin secara otomatis hanya akan menarik dan menampilkan data dari Periode yang sedang Aktif.
- Jika pengguna ingin melihat riwayat periode sebelumnya, mereka dapat memilih "Semua Periode" atau periode tertentu melalui filter dropdown di halaman tersebut.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

