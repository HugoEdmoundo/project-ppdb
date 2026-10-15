<div align="center">
  <h1>🌐 Company Profile</h1>
  <p><strong>Website Publik & Pusat Informasi Ar-Rahman</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Aplikasi **Company Profile** (website publik) dan **Portal Informasi** utama untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Didesain untuk memberikan performa SEO terbaik, pengalaman navigasi yang mulus, dan integrasi pendaftaran santri baru.

## 🗺️ Halaman Utama

- 🏠 `/` — Beranda Utama
- 📰 `/about`, `/news`, `/news/[slug]` — Profil & berita pesantren
- 🏆 `/programs`, `/programs/[slug]` — Program unggulan
- 📸 `/facilities`, `/achievements`, `/gallery`, `/staff`, `/contact` — Informasi publik lainnya
- 🎓 `/ppdb` — Halaman informasi PPDB interaktif dengan 3D Hero
- 🚪 `/auth/login` — Portal login terpusat (Pendaftar, Admin, & Superadmin)
- ⚙️ `/admin/overview`, `/admin/dashboard` — CRUD dashboard konten web (Berita, Galeri, Fasilitas, Pengaturan, dll.)

## 🛠️ Stack Teknologi

- **Framework:** Next.js 16 (App Router) + Turbopack
- **Bahasa:** TypeScript
- **Styling & UI:** Tailwind CSS v4, framer-motion, Three.js, lucide-react
- **Koneksi API:** Terhubung dengan [`apps/api`](../api/README.md) (FastAPI) via HTTP-only Cookies (`credentials: 'include'`)

## 📦 Menjalankan secara Lokal

Aplikasi ini merupakan bagian dari pnpm workspace.

```bash
# Pastikan Anda berada di root project
pnpm install

# Menjalankan development server (port 3000)
pnpm --filter companyprofile dev

# Linter
pnpm --filter companyprofile lint

# Build production
pnpm --filter companyprofile build
```

> **Perhatian Jaringan (Docker):**
> Pastikan variabel environment (`NEXT_PUBLIC_API_URL`) diarahkan ke host yang benar jika mengakses dari browser Windows ke WSL (misalnya `http://<ip-wsl>:8080`). Baca panduan Docker di root repository.

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
