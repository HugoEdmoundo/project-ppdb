# Hero 3D PPDB — Globe Ar-Rahman

Catatan teknis untuk hero 3D di `/ppdb` (`apps/companyprofile`).
Komponen: `components/ui/orbit-delivery-hero.tsx` (single-file distribution dari 21st.dev, sudah dikustomisasi).
Dokumen ini **bukan** spesifikasi produk — ini catatan kondisi saat ini + isu terbuka yang perlu keputusan.

---

## 1. Copy Windows dan copy WSL sudah berbeda (JEBAKAN)

`AGENTS.md` menetapkan: repo Windows = sumber edit, repo ext4 WSL = sumber build/run (Docker).
Keduanya **tidak sinkron** saat ini:

| | Globe | Karakter | Celana |
|---|---|---|---|
| **WSL** (tayang di `:3000`) | GLB painterly | asli dari prompt | hitam panjang |
| **Windows** (sumber edit) | bola hijau prosedural + kubah/menaret | asli dari prompt | hitam panjang |

**Konsekuensi:** `sync-build.sh` berikutnya akan menimpa `:3000` dengan globe prosedural tanpa tanya.
Selama globe belum diputuskan, jangan sync `orbit-delivery-hero.tsx` dari Windows.

Pola yang dipakai sekarang: perubahan di-deploy dengan **menempelkan patch yang sama langsung ke copy WSL**,
sambil menerapkan patch identik ke copy Windows. Dua file boleh berbeda di bagian globe, selebihnya harus identik.

---

## 2. Globe: GLB painterly vs prosedural — belum diputuskan

| | GLB painterly | Prosedural (hijau + masjid) |
|---|---|---|
| Ukuran | 2,4 MB | ~0 |
| Tampilan | laut/darat/awan lukis, warna biru-merah | hijau emerald sesuai brand, kubah + 4 menaret + sabit + cincin emas |
| Heightmap | ada (kurir mendaki bukit) | `radii` semua `1.0` → kurir jalan di bola sempurna, tanpa bukit |
| Radius | 2.25 | 2.2 |
| Brand | tidak nyambung dengan emerald/gold | nyambung |
| Status | sudah tayang & terverifikasi | **belum pernah dilihat** |

Catatan: versi prosedural awalnya **rusak** — `SphereGeometry`, `TorusGeometry`, `Float32BufferAttribute`
dipakai tanpa import. Import sudah ditambahkan, tapi belum ada yang memutuskan dipakai atau dibuang.

---

## 3. Aset mati di `public/models/` — 3,9 MB

`public/models/`total **8,9 MB**; **3,9 MB (13 file) tidak dirujuk kode mana pun**.
Semua ikut terkirim ke production.

| File | Ukuran |
|---|---|
| `courier_clean.glb` | 2.811 KB |
| `tex_santri.webp` | 304 KB |
| `tex_2_green.webp` | 272 KB |
| `tex_2.webp`, `tex_2_original.webp` | 178 KB masing-masing |
| `tex_1.webp`, `tex_1_original.webp` | 86 KB masing-masing |
| `uv_parts_debug.png` | 37 KB |
| `leg_mask.png` / `sarung_mask.png` / `cap_mask.png` | 23 / 21 / 9 KB |
| `tex_0.webp`, `tex_0_original.webp` | 7 KB masing-masing |

Hanya `courier.glb` + `whimsical-world.glb` yang benar-benar dipakai (dimuat lewat `fetch`).
Terbukti sisa percobaan "santri" sebelumnya (mask UV + varian tekstur hijau/santri).
**Belum dihapus** — `courier_clean.glb` mungkin sengaja disimpan sebagai cadangan.

---

## 4. Heightmap 85 KB di-inline sebagai base64

`surface` (heightmap globe) di-inline sebagai data URI di dalam file JS.
Ukuran: **85 KB base64 dari total file 172 KB** — setengah ukuran file.

`usePlanetAsset` sudah memanggil `fetch(surface)`, jadi memindahkannya ke
`public/models/surface.json` akan memangkas bundle halaman `/ppdb` ~85 KB.
Tradeoff: satu file statis tambahan.

---

## 5. Rawatan: 172 KB hasil generate, semua kustomisasi dipatch di dalamnya

Semua kustomisasi (warna brand emerald/gold, `academicYear`, globe, aksoris wisudawan, tint baju & celana)
dipatch **di dalam** hasil generate dari 21st.dev.

Risiko: kalau ada yang me-regenerate komponen dari sumber aslinya, semua kustomisasi hilang diam-diam.
Ini sudah kejadian sekali — `createGraduationAccessories()` ("Santri Wisudawan": peci, toga emerald,
medali kelulusan) ada **hanya di copy WSL**, tidak terlihat di `git diff` Windows, dan membuat karakter
tampil berbeda dari desain aslinya. Fungsi itu sudah dihapus dari versi yang ter-deploy.

Perlu diputuskan: tetap menambal file generate ini, atau memindahkan bagian yang customizing
ke modul terpisah yang meng-import komponen asli.

---

## Se customizing warna karakter

Baju dan celana diwarnai lewat mask per-vertex yang diturunkan dari **skin weight**, bukan `material.color`
(body = satu skinned mesh dengan tekstur clay bake, jadi `material.color` akan mencelup kulit/topi/sepatu juga).

- Mask dihitung dari joint dominan per vertex, lalu disimpan sebagai vertex attribute dan di-*mix* ke
  `diffuseColor` lewat `onBeforeCompile`.
- Baju: `Spine`, `Spine01`, `Spine02`, `*Shoulder`, `*Arm`, `*ForeArm` → 1.984 vertex, Y 0.79–1.31.
- Celana: `Hips`, `*UpLeg`, `*Leg` → menutup celana pendek + kaki sampai mata kaki, sehingga terbaca
  sebagai celana panjang. Sepatu (`Foot`, `*Toe*`) tidak ikut.
- Propp: `shirtColor` (default `0x1E3A8A` navy) dan `pantsColor` (default hitam).
  Isi `null` untuk zone itu → kembali ke warna asli tekstur.

Verifikasi: uniform `uTint<zone>` aktif di program WebGL bisa dibaca langsung dari browser
(`gl.getProgramParameter(..., ACTIVE_UNIFORMS)`), nilainya cocok dengan hex yang diminta.
