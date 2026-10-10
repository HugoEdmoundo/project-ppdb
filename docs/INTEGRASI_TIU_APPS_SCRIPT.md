# Integrasi Webhook Google Apps Script TIU (Google Form ke PPDB)

Dokumen ini memuat panduan integrasi penilaian Tes Intelegensia Umum (TIU) antara Google Form Quiz dan backend PPDB Pesantren Ar-Rahman melalui Google Apps Script.

Sistem PPDB Ar-Rahman mengintegrasikan Google Form dengan **Safe Exam Browser (SEB)** menggunakan metode **Pre-filled URL**. Peserta mengerjakan ujian langsung di Google Form melalui SEB, dan saat kuis di-submit, Apps Script akan otomatis mengirimkan skor ke backend PPDB secara real-time.

---

## 1. Persiapan Google Form

1. Buat Google Form untuk soal kuis TIU.
2. Buka menu **Settings (Setelan)** di Google Form, aktifkan **"Make this a quiz" (Jadikan kuis)**.
3. Tentukan bobot poin pada kunci jawaban untuk masing-masing soal (misal total skor maksimal 100).
4. Tambahkan 1 pertanyaan bertipe **Short Answer (Jawaban Singkat)** dengan judul:
   * **Judul:** `Token Ujian` (wajib mengandung kata `Token`).
   * **Setelan:** Aktifkan **Required (Wajib diisi)**.
5. Klik menu titik tiga (⋮) di kanan atas Google Form, lalu pilih **Get pre-filled link (Dapatkan link yang terisi sebelumnya)**.
6. Masukkan sembarang teks pada kolom pertanyaan `Token Ujian` (misalnya: `TEST_TOKEN`), lalu klik tombol **Get link (Dapatkan link)** di bagian bawah dan klik **Copy link (Salin link)**.
7. Di backoffice PPDB (menu **Pengaturan TIU**):
   * Ganti bagian `TEST_TOKEN` pada link tadi dengan `{token}`.
   * Contoh hasil link: `https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.123456789={token}`
   * Tempelkan URL tersebut ke kolom **Pre-filled URL Google Form**, atur **Durasi Ujian** (menit), dan masukkan **Webhook Secret** (minimal 16 karakter). Simpan pengaturan.

---

## 2. Pemasangan Google Apps Script

1. Buka kembali Google Form kuis Anda.
2. Klik menu titik tiga (⋮) di kanan atas Google Form, lalu pilih **Script editor (Editor skrip)**.
3. Hapus kode default di file `Code.gs`, lalu tempelkan skrip berikut:

```javascript
function onSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  if (responses.length === 0) return;

  var latestResponse = responses[responses.length - 1];
  var itemResponses = latestResponse.getItemResponses();

  // 1. Ekstrak token pendaftar dari jawaban pertanyaan "Token"
  var token = "";
  for (var i = 0; i < itemResponses.length; i++) {
    var item = itemResponses[i].getItem();
    var title = item.getTitle().toLowerCase();
    if (title.indexOf("token") !== -1) {
      token = String(itemResponses[i].getResponse()).trim();
      break;
    }
  }

  if (!token) {
    Logger.log("Token tidak ditemukan pada respon terbaru.");
    return;
  }

  // 2. Hitung total skor kuis
  var score = 0;
  var gradableResponses = latestResponse.getGradableItemResponses();
  for (var j = 0; j < gradableResponses.length; j++) {
    score += gradableResponses[j].getScore() || 0;
  }

  // 3. Konfigurasi Endpoint & Secret
  var props = PropertiesService.getScriptProperties();
  var apiUrl = props.getProperty("PPDB_API_BASE") || "https://api.ptdarrahman.sch.id";
  var secret = props.getProperty("TIU_WEBHOOK_SECRET") || "MASUKKAN_SECRET_DI_PROPERTIES";

  var endpoint = apiUrl.replace(/\/+$/, "") + "/ppdb/webhook/tiu";

  var payload = {
    token: token,
    score: score
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "X-TIU-Secret": secret
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();
    Logger.log("Status Webhook: " + statusCode + ", Respon: " + responseText);
  } catch (err) {
    Logger.log("Gagal mengirim webhook TIU: " + err);
  }
}
```

---

## 3. Konfigurasi Script Properties & Trigger

### A. Set Script Properties
1. Di halaman Apps Script, buka menu **Project Settings (Ikon Gerigi) → Script Properties (Properti skrip)**.
2. Tambahkan properti berikut:
   * `PPDB_API_BASE`: URL domain backend PPDB (contoh: `https://api.ptdarrahman.sch.id` atau URL IP backend Anda, tanpa slash di akhir).
   * `TIU_WEBHOOK_SECRET`: Secret yang sama persis dengan yang Anda simpan di halaman **Pengaturan TIU** backoffice PPDB.
3. Klik **Save script properties (Simpan properti skrip)**.

### B. Pasang Trigger Otomatis
1. Di bilah menu kiri Apps Script, klik menu **Triggers (Ikon Jam Weker)**.
2. Klik tombol **Add Trigger (Tambahkan Pemicu)** di pojok kanan bawah.
3. Atur konfigurasi pemicu:
   * **Choose which function to run:** `onSubmit`
   * **Choose which deployment should run:** `Head`
   * **Select event source:** `From form (Dari formulir)`
   * **Select event type:** `On form submit (Saat mengirimkan formulir)`
4. Klik **Save (Simpan)**. Berikan izin akses Google Account jika diminta.

---

## 4. Cara Kerja & Validasi di Backend PPDB

1. **Unduh SEB:** Saat pendaftar mengklik tombol **"Download Konfigurasi SEB"** di dashboard PPDB, sistem membuat attempt baru dengan token unik sekali pakai dan mencatat waktu mulai ujian.
2. **Kunci Layar:** File `.seb` otomatis membuka Google Form dengan token terisi pada kolom token pertanyaan. Layar terkunci dan URL bar tersembunyi.
3. **Pengiriman Webhook:** Ketika pendaftar mengklik tombol **Submit**, Apps Script langsung menembak `POST /ppdb/webhook/tiu`.
4. **Validasi Backend:**
   * Memeriksa header `X-TIU-Secret`.
   * Memvalidasi kepemilikan token attempt.
   * Memeriksa durasi: `waktu_submit <= waktu_mulai + durasi_menit + 5_menit_toleransi`.
5. **Hasil:** Skor tersimpan ke database, pemicu notifikasi WhatsApp `tiu_result_ready` terkirim ke pendaftar, dan jadwal Session 1:1 Tahfidz otomatis terbuka bagi pendaftar jalur TIU.
