# Company Profile - PTDARRAHMAN

Aplikasi **internal** — public website + admin dashboard untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

## Stack
- Next.js 16 + Turbopack, Tailwind CSS v4, TypeScript, lucide-react, framer-motion

## Routes
- `/` — Home
- `/about`, `/news`, `/news/[slug]` — Profil & berita
- `/programs`, `/programs/[slug]` — Program unggulan
- `/facilities`, `/achievements`, `/gallery`, `/staff`, `/contact`
- `/auth` — Portal siswa/orang tua
- `/admin/login`, `/admin/dashboard` — CRUD dashboard (9 tabs)

## Local Dev
```bash
npm run dev     # port 3000
npm run lint    # ESLint
npm run build   # Static build
```

## Deploy (Cloudflare Workers via OpenNext)
```bash
npm install
npm run deploy   # opennextjs-cloudflare build && deploy
```
Env vars (build time): set `NEXT_PUBLIC_API_URL` & `NEXT_PUBLIC_PORTAL_URL` in the Cloudflare Worker/CI build env. See `DEPLOY.md` at repo root.
