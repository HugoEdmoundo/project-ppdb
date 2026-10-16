import json
import re
from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from src.core.database import execute_raw
from src.core.dependencies import get_current_user

router = APIRouter()

# Kamus konsep semantik untuk ekspansi query pencarian (Indonesian & pesantren domain)
SEMANTIC_ONTOLOGY: dict[str, list[str]] = {
    "santri": [
        "applicant",
        "pendaftar",
        "siswa",
        "murid",
        "anak",
        "peserta",
        "biodata",
        "calon",
    ],
    "pendaftar": [
        "applicant",
        "santri",
        "siswa",
        "calon",
        "registrasi",
        "biodata",
        "peserta",
    ],
    "dokumen": [
        "berkas",
        "ijazah",
        "kk",
        "akta",
        "nisn",
        "foto",
        "rapor",
        "upload",
        "lampiran",
    ],
    "bayar": [
        "pembayaran",
        "keuangan",
        "biaya",
        "tagihan",
        "dp",
        "spp",
        "qris",
        "transaksi",
        "lunas",
        "kuitansi",
        "invoice",
    ],
    "tahfidz": [
        "hafalan",
        "quran",
        "juz",
        "surah",
        "tajwid",
        "simakan",
        "setoran",
        "penguji",
        "tahsin",
    ],
    "wawancara": [
        "interview",
        "pewawancara",
        "wali",
        "orang tua",
        "bk",
        "tanya jawab",
        "psikotes",
    ],
    "tiu": [
        "ujian",
        "tes",
        "seb",
        "skor",
        "nilai",
        "akademik",
        "google form",
        "potensi",
    ],
    "lulus": ["kelulusan", "hasil", "loa", "skd", "diterima", "pengumuman", "lolos"],
    "periode": [
        "gelombang",
        "kuota",
        "tahun ajaran",
        "jadwal",
        "buka",
        "tutup",
        "wave",
    ],
    "pengguna": [
        "user",
        "akun",
        "petugas",
        "admin",
        "panitia",
        "operator",
        "password",
        "superadmin",
    ],
    "role": ["peran", "hak akses", "izin", "kewenangan", "permission", "otorisasi"],
    "whatsapp": ["wa", "pesan", "chat", "broadcast", "notifikasi", "nomor"],
    "berita": ["artikel", "kabar", "post", "blog", "warta", "publikasi", "liputan"],
    "guru": [
        "ustadz",
        "ustadzah",
        "pengajar",
        "asatidz",
        "staff",
        "dewan guru",
        "kyai",
    ],
    "fasilitas": [
        "gedung",
        "asrama",
        "sarana",
        "masjid",
        "kelas",
        "lapangan",
        "laboratorium",
    ],
    "program": ["unggulan", "kurikulum", "kegiatan", "ekstrakurikuler", "tahsin"],
    "prestasi": ["juara", "piala", "lomba", "kejuaraan", "penghargaan", "medali"],
    "galeri": ["foto", "album", "dokumentasi", "kegiatan", "video"],
    "testimoni": ["ulasan", "review", "kata mereka", "alumni", "wali santri"],
    "arsip": ["dossier", "tahun lalu", "data lama", "zip", "rekap", "riwayat"],
}

STATUS_SEMANTICS: dict[str, str] = {
    "lulus": "passed",
    "diterima": "passed",
    "lolos": "passed",
    "gagal": "failed",
    "tidak lulus": "failed",
    "ditolak": "failed",
    "lunas": "paid",
    "belum bayar": "pending",
    "tertunda": "pending",
    "terverifikasi": "document_approved",
    "dokumen disetujui": "document_approved",
    "dokumen ditolak": "document_rejected",
}


def _expand_tokens(query: str) -> list[str]:
    """Tokenize query and expand with related semantic synonyms."""
    clean = re.sub(r"[^\w\s-]", " ", query.lower())
    tokens = [t.strip() for t in clean.split() if len(t.strip()) >= 2]
    expanded = list(tokens)

    for token in tokens:
        for concept, syns in SEMANTIC_ONTOLOGY.items():
            if token == concept or token in syns:
                expanded.extend([concept] + syns[:4])

    return list(dict.fromkeys(expanded))


def _extract_content_field(content_raw: Any, field: str, default: str = "") -> str:
    """Extract a field from a JSON string or dict safely."""
    if not content_raw:
        return default
    if isinstance(content_raw, dict):
        return str(content_raw.get(field, default) or default)
    if isinstance(content_raw, str):
        try:
            data = json.loads(content_raw)
            if isinstance(data, dict):
                return str(data.get(field, default) or default)
        except Exception:
            pass
    return default


@router.get("/semantic")
@router.get("")
def semantic_search(
    request: Request,
    q: str = Query("", min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    user: dict[str, Any] | None = Depends(get_current_user),
):
    """Semantic Search Engine across DB entities.

    Automatically resolves permissions based on the active user:
    - Superadmin: can search across all entities (Users, Roles, Applicants, CMS, Logs).
    - PPDB Admin: can search Applicants, Waves, Periods, Selection.
    - CMS Admin: can search News, Facilities, Staff, Programs, Achievements.
    """
    clean_q = q.strip()
    if not clean_q:
        return {"query": q, "results": []}

    is_super = False
    has_ppdb = False
    has_cp = False

    if user:
        is_super = bool(
            user.get("user_type") == "superadmin" or user.get("is_superadmin")
        )
        perms = user.get("permissions") or {}
        has_ppdb = is_super or perms.get("ppdb") in ("read", "crud", "dashboard")
        has_cp = is_super or perms.get("companyprofile") in (
            "read",
            "crud",
            "dashboard",
        )
    else:
        # Default fallback for internal / public preview
        has_cp = True

    expanded_terms = _expand_tokens(clean_q)
    like_term = f"%{clean_q}%"
    results: list[dict[str, Any]] = []

    # 1. Pendaftar (PPDB Applicants)
    if has_ppdb:
        # Check if query matches specific status semantics
        target_status = None
        for k, v in STATUS_SEMANTICS.items():
            if k in clean_q.lower():
                target_status = v
                break

        app_sql = """
            SELECT id, full_name, registration_number, phone, status, payment_status,
                   registration_path, nisn, created_at
            FROM ppdb_applicants
            WHERE full_name LIKE :term
               OR registration_number LIKE :term
               OR phone LIKE :term
               OR nisn LIKE :term
               OR registration_path LIKE :term
        """
        params: dict[str, Any] = {"term": like_term}

        if target_status:
            app_sql += " OR status = :status OR payment_status = :status"
            params["status"] = target_status

        app_sql += " ORDER BY created_at DESC LIMIT 12"

        try:
            applicants = execute_raw(app_sql, params) or []
            for a in applicants:
                reg_no = a.get("registration_number") or a.get("id", "")[:8]
                name = a.get("full_name") or "Tanpa Nama"
                status = a.get("status", "pending")
                path = a.get("registration_path", "reguler")
                nisn = a.get("nisn")

                # Score calculation
                score = 0.75
                lower_q = clean_q.lower()
                if lower_q == (reg_no or "").lower():
                    score = 0.99
                elif lower_q in name.lower():
                    score = 0.94
                elif nisn and lower_q in nisn.lower():
                    score = 0.92
                elif any(t in name.lower() for t in expanded_terms):
                    score = 0.85

                results.append(
                    {
                        "id": f"applicant-{a['id']}",
                        "title": name,
                        "subtitle": f"No. Reg: {reg_no} • Jalur {path.capitalize()} • Status: {status}",
                        "category": "Pendaftar",
                        "icon": "user-check",
                        "badge": status,
                        "url": f"/admin/data-pendaftar?q={reg_no}"
                        if not is_super
                        else f"/applicants?q={reg_no}",
                        "score": round(score, 2),
                    }
                )
        except Exception:
            pass

    # 2. Pengguna & Petugas (Users) - Superadmin only
    if is_super:
        user_sql = """
            SELECT id, username, email, full_name, user_type, is_active
            FROM users
            WHERE full_name LIKE :term
               OR username LIKE :term
               OR email LIKE :term
               OR user_type LIKE :term
            ORDER BY created_at DESC LIMIT 8
        """
        try:
            users_list = execute_raw(user_sql, {"term": like_term}) or []
            for u in users_list:
                uname = u.get("username") or ""
                fname = u.get("full_name") or uname
                utype = u.get("user_type") or "user"
                email = u.get("email") or ""

                score = 0.70
                if clean_q.lower() == uname.lower() or clean_q.lower() == email.lower():
                    score = 0.98
                elif clean_q.lower() in fname.lower():
                    score = 0.92

                results.append(
                    {
                        "id": f"user-{u['id']}",
                        "title": fname,
                        "subtitle": f"@{uname} • {email} • Tipe: {utype}",
                        "category": "Pengguna",
                        "icon": "users",
                        "badge": utype,
                        "url": "/users",
                        "score": round(score, 2),
                    }
                )
        except Exception:
            pass

    # 3. Roles & Hak Akses - Superadmin only
    if is_super:
        role_sql = """
            SELECT id, name, description
            FROM roles
            WHERE name LIKE :term OR description LIKE :term
            LIMIT 5
        """
        try:
            roles = execute_raw(role_sql, {"term": like_term}) or []
            for r in roles:
                rname = r.get("name") or ""
                desc = r.get("description") or "Role sistem"
                score = 0.90 if clean_q.lower() in rname.lower() else 0.75
                results.append(
                    {
                        "id": f"role-{r['id']}",
                        "title": f"Role: {rname}",
                        "subtitle": desc,
                        "category": "Hak Akses",
                        "icon": "shield",
                        "badge": "Role",
                        "url": "/roles",
                        "score": round(score, 2),
                    }
                )
        except Exception:
            pass

    # 4. Berita & Artikel (Company Profile News)
    if has_cp:
        news_sql = """
            SELECT id, slug, category, content, date
            FROM news_articles
            WHERE slug LIKE :term OR category LIKE :term OR content LIKE :term
            LIMIT 8
        """
        try:
            news_items = execute_raw(news_sql, {"term": like_term}) or []
            for n in news_items:
                title = _extract_content_field(
                    n.get("content"), "title", n.get("slug", "Artikel")
                )
                category = n.get("category") or "Berita"
                score = 0.92 if clean_q.lower() in title.lower() else 0.78
                results.append(
                    {
                        "id": f"news-{n['id']}",
                        "title": title,
                        "subtitle": f"Kategori: {category} • Artikel CMS",
                        "category": "Konten CMS",
                        "icon": "newspaper",
                        "badge": category,
                        "url": "/admin/dashboard?tab=news",
                        "score": round(score, 2),
                    }
                )
        except Exception:
            pass

    # 5. Fasilitas & Sarana (Company Profile Facilities)
    if has_cp:
        fac_sql = """
            SELECT id, category, content
            FROM facilities
            WHERE category LIKE :term OR content LIKE :term
            LIMIT 6
        """
        try:
            facs = execute_raw(fac_sql, {"term": like_term}) or []
            for f in facs:
                name = _extract_content_field(
                    f.get("content"), "title", f.get("category", "Fasilitas")
                )
                desc = _extract_content_field(
                    f.get("content"), "description", "Sarana pesantren"
                )
                score = 0.88 if clean_q.lower() in name.lower() else 0.75
                results.append(
                    {
                        "id": f"fac-{f['id']}",
                        "title": name,
                        "subtitle": desc[:80] + ("..." if len(desc) > 80 else ""),
                        "category": "Fasilitas",
                        "icon": "building",
                        "badge": f.get("category", "Fasilitas"),
                        "url": "/admin/dashboard?tab=facilities",
                        "score": round(score, 2),
                    }
                )
        except Exception:
            pass

    # 6. Staff & Pengajar (Company Profile Staff)
    if has_cp:
        staff_sql = """
            SELECT id, role, content
            FROM staff
            WHERE role LIKE :term OR content LIKE :term
            LIMIT 6
        """
        try:
            staffs = execute_raw(staff_sql, {"term": like_term}) or []
            for s in staffs:
                name = _extract_content_field(
                    s.get("content"), "name", "Ustadz / Pengajar"
                )
                role = s.get("role") or _extract_content_field(
                    s.get("content"), "role", "Pengajar"
                )
                score = 0.90 if clean_q.lower() in name.lower() else 0.75
                results.append(
                    {
                        "id": f"staff-{s['id']}",
                        "title": name,
                        "subtitle": f"Jabatan / Peran: {role}",
                        "category": "Pengajar",
                        "icon": "graduation-cap",
                        "badge": role,
                        "url": "/admin/dashboard?tab=staff",
                        "score": round(score, 2),
                    }
                )
        except Exception:
            pass

    # 7. Program Unggulan (Company Profile Programs)
    if has_cp:
        prog_sql = """
            SELECT id, slug, content
            FROM programs
            WHERE slug LIKE :term OR content LIKE :term
            LIMIT 6
        """
        try:
            progs = execute_raw(prog_sql, {"term": like_term}) or []
            for p in progs:
                title = _extract_content_field(
                    p.get("content"), "title", p.get("slug", "Program")
                )
                desc = _extract_content_field(
                    p.get("content"), "description", "Program pendidikan"
                )
                score = 0.88 if clean_q.lower() in title.lower() else 0.75
                results.append(
                    {
                        "id": f"prog-{p['id']}",
                        "title": title,
                        "subtitle": desc[:80] + ("..." if len(desc) > 80 else ""),
                        "category": "Program",
                        "icon": "book-open",
                        "badge": "Pendidikan",
                        "url": "/admin/dashboard?tab=programs",
                        "score": round(score, 2),
                    }
                )
        except Exception:
            pass

    # 8. Prestasi Santri (Company Profile Achievements)
    if has_cp:
        ach_sql = """
            SELECT id, category, content
            FROM achievements
            WHERE category LIKE :term OR content LIKE :term
            LIMIT 6
        """
        try:
            achs = execute_raw(ach_sql, {"term": like_term}) or []
            for a in achs:
                title = _extract_content_field(
                    a.get("content"), "title", "Prestasi Santri"
                )
                cat = a.get("category", "Prestasi")
                results.append(
                    {
                        "id": f"ach-{a['id']}",
                        "title": title,
                        "subtitle": f"Kategori: {cat} • Penghargaan / Prestasi",
                        "category": "Prestasi",
                        "icon": "trophy",
                        "badge": cat,
                        "url": "/admin/dashboard?tab=achievements",
                        "score": 0.82,
                    }
                )
        except Exception:
            pass

    # 9. Gelombang & Periode (PPDB Waves & Periods)
    if has_ppdb:
        wave_sql = """
            SELECT id, name, status, 'Gelombang' as kind
            FROM ppdb_waves
            WHERE name LIKE :term
            UNION
            SELECT id, name, status, 'Periode' as kind
            FROM ppdb_periods
            WHERE name LIKE :term
            LIMIT 6
        """
        try:
            waves = execute_raw(wave_sql, {"term": like_term}) or []
            for w in waves:
                wname = w.get("name") or ""
                kind = w.get("kind", "Gelombang")
                status = w.get("status", "inactive")
                score = 0.90 if clean_q.lower() in wname.lower() else 0.78
                results.append(
                    {
                        "id": f"wave-{w['id']}",
                        "title": f"{kind}: {wname}",
                        "subtitle": f"Status: {status} • Pengaturan PPDB",
                        "category": "Periode PPDB",
                        "icon": "calendar-days",
                        "badge": status,
                        "url": "/admin/periods",
                        "score": round(score, 2),
                    }
                )
        except Exception:
            pass

    # Sort by semantic relevance score descending
    results.sort(key=lambda r: r.get("score", 0), reverse=True)

    return {
        "query": q,
        "total": len(results),
        "results": results[:limit],
    }
