import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TableBorders,
  convertInchesToTwip,
  LevelFormat,
} from "docx";
import * as fs from "fs";
import * as path from "path";

const FONT = "Times New Roman";
const FONT_SIZE = 24; // 12pt

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT,
        size: 28, // 14pt
      }),
    ],
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT,
        size: 24, // 12pt
      }),
    ],
  });
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT,
        size: 24,
      }),
    ],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    indent: { firstLine: convertInchesToTwip(0.5) },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: FONT_SIZE,
      }),
    ],
  });
}

function bodyTextNoIndent(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: FONT_SIZE,
      }),
    ],
  });
}

function bulletItem(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 360 },
    indent: { left: convertInchesToTwip(0.75) },
    children: [
      new TextRun({
        text: `\u2022  ${text}`,
        font: FONT,
        size: FONT_SIZE,
      }),
    ],
  });
}

function numberedItem(num: number, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 360 },
    indent: { left: convertInchesToTwip(0.75) },
    children: [
      new TextRun({
        text: `${num}. ${text}`,
        font: FONT,
        size: FONT_SIZE,
      }),
    ],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: "",
        font: FONT,
        size: FONT_SIZE,
      }),
    ],
  });
}

// ============================================
// BAB 1 CONTENT
// ============================================

const coverPage: Paragraph[] = [
  emptyLine(),
  emptyLine(),
  emptyLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: "DOKUMENTASI TEKNIS",
        bold: true,
        font: FONT,
        size: 32,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "SISTEM PPDB TERINTEGRASI",
        bold: true,
        font: FONT,
        size: 36,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: "Pesantren / Sekolah",
        bold: true,
        font: FONT,
        size: 28,
      }),
    ],
  }),
  emptyLine(),
  emptyLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: "Versi 1.0",
        font: FONT,
        size: 24,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: "Juli 2026",
        font: FONT,
        size: 24,
      }),
    ],
  }),
  emptyLine(),
  emptyLine(),
  emptyLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: "Disusun oleh:",
        font: FONT,
        size: 22,
        italics: true,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: "Tim Pengembang Sistem",
        bold: true,
        font: FONT,
        size: 24,
      }),
    ],
  }),
  emptyLine(),
  emptyLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "ptdarrahman.sch.id",
        font: FONT,
        size: 22,
        italics: true,
        color: "666666",
      }),
    ],
  }),
  // Page break
  new Paragraph({ children: [], pageBreakBefore: false, pageBreakAfter: true }),
];

// ============ BAB 1 ============

const bab1Title: Paragraph[] = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 300 },
    children: [
      new TextRun({
        text: "BAB 1",
        bold: true,
        font: FONT,
        size: 32,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: "PENDAHULUAN",
        bold: true,
        font: FONT,
        size: 32,
      }),
    ],
  }),
];

// --- 1.1 LATAR BELAKANG ---
const section1_1: Paragraph[] = [
  heading2("1.1 Latar Belakang"),
  bodyText(
    "Penerimaan Peserta Didik Baru (PPDB) merupakan salah satu proses operasional paling kritis bagi setiap lembaga pendidikan, baik sekolah formal (SMP, SMA, SMK) maupun pesantren. Proses ini melibatkan rangkaian kegiatan yang kompleks, mulai dari pendaftaran calon siswa, verifikasi dokumen, pelaksanaan tes seleksi, pengumuman kelulusan, pembayaran biaya pendidikan, hingga registrasi ulang. Setiap tahapan membutuhkan koordinasi yang baik antara berbagai pihak, termasuk calon siswa, orang tua, admin sekolah, tim seleksi, penguji, dan bagian keuangan."
  ),
  bodyText(
    "Namun demikian, pada kenyataannya banyak sekolah dan pesantren di Indonesia yang masih menjalankan proses PPDB secara manual atau semi-manual. Kombinasi penggunaan Google Form untuk pendaftaran, WhatsApp untuk komunikasi, spreadsheet untuk rekap data, pembayaran manual, dan pencatatan dokumen secara terpisah masih menjadi praktik yang umum ditemui. Kondisi ini menimbulkan sejumlah permasalahan serius yang berdampak pada kualitas layanan dan efisiensi operasional."
  ),
  bodyText(
    "Permasalahan utama yang dihadapi meliputi: (1) data calon siswa tersebar di berbagai platform sehingga sulit diakses secara terpusat; (2) kesulitan dalam memantau status setiap peserta PPDB secara real-time; (3) risiko kehilangan atau kerusakan dokumen penting; (4) tingginya potensi kesalahan manusia (human error) dalam pemrosesan pembayaran dan rekap data; (5) kesulitan dalam menghasilkan laporan yang akurat dan tepat waktu; serta (6) tidak adanya jejak audit (audit trail) yang memadai untuk setiap aktivitas PPDB."
  ),
  bodyText(
    "Selain itu, sekolah dan pesantren seringkali memiliki kompleksitas tambahan dalam proses PPDB mereka. Banyak lembaga yang mengelola beberapa periode PPDB dalam setahun, menerapkan sistem gelombang pendaftaran, melayani berbagai jenjang pendidikan (SMP, SMA, SMK, Pesantren Tahfidz), serta menawarkan berbagai kategori pendaftaran seperti reguler, berprestasi, tahfidz, dan beasiswa. Tiap kombinasi kategori dan jenjang memiliki tahapan seleksi yang berbeda-beda, skema pembayaran yang fleksibel, serta kebutuhan administrasi yang khas."
  ),
  bodyText(
    "Dalam konteks transformasi digital yang semakin mendesak, diperlukan sebuah solusi sistem informasi terintegrasi yang mampu mengelola seluruh proses PPDB dalam satu platform terpusat. Sistem ini harus mampu mengakomodasi keragaman kebutuhan sekolah dan pesantren, sekaligus memberikan pengalaman yang mudah bagi calon siswa dan orang tua. Dengan adanya sistem terintegrasi, diharapkan seluruh proses PPDB dapat berjalan lebih efisien, transparan, dan akuntabel."
  ),
  bodyText(
    "Berdasarkan latar belakang permasalahan di atas, dikembangkanlah Sistem PPDB Terintegrasi Pesantren/Sekolah sebagai solusi digital end-to-end yang mencakup pendaftaran online, manajemen dokumen, seleksi dinamis, pembayaran terintegrasi, pengumuman, hingga registrasi ulang dalam satu ekosistem yang terpusat. Dokumentasi teknis ini disusun sebagai acuan bagi seluruh pemangku kepentingan dalam memahami, mengoperasikan, dan mengembangkan sistem lebih lanjut."
  ),
];

// --- 1.2 RUMUSAN MASALAH ---
const section1_2: Paragraph[] = [
  heading2("1.2 Rumusan Masalah"),
  bodyText(
    "Berdasarkan latar belakang yang telah diuraikan di atas, rumusan masalah dalam dokumentasi teknis ini adalah sebagai berikut:"
  ),
  numberedItem(
    1,
    "Bagaimana proses pendaftaran calon peserta didik baru dapat dilakukan secara online dan terintegrasi dalam satu platform?"
  ),
  numberedItem(
    2,
    "Bagaimana mekanisme pengelolaan dokumen pendaftaran (upload, verifikasi, approval, dan revisi) dapat dilakukan secara efisien dan terdokumentasi?"
  ),
  numberedItem(
    3,
    "Bagaimana sistem seleksi dinamis dapat dikonfigurasi untuk mengakomodasi berbagai jenis tes (akademik, hafalan, baca Al-Quran, psikotes, interview) dengan parameter penilaian yang berbeda-beda?"
  ),
  numberedItem(
    4,
    "Bagaimana mekanisme pembayaran (online dan manual), invoice otomatis, diskon, dan cicilan dapat dikelola dalam satu modul keuangan yang terintegrasi?"
  ),
  numberedItem(
    5,
    "Bagaimana sistem dapat menyediakan dashboard monitoring dan laporan yang akurat bagi seluruh pemangku kepentingan (superadmin, admin seleksi, penguji, finance)?"
  ),
  numberedItem(
    6,
    "Bagaimana sistem notifikasi (WhatsApp dan Email) dapat mendukung seluruh alur komunikasi PPDB dari pendaftaran hingga registrasi ulang?"
  ),
  numberedItem(
    7,
    "Bagaimana arsitektur dan desain basis data sistem dirancang untuk mendukung skalabilitas, keamanan data, dan audit trail yang komprehensif?"
  ),
];

// --- 1.3 BATASAN MASALAH ---
const section1_3: Paragraph[] = [
  heading2("1.3 Batasan Masalah"),
  bodyText(
    "Agar pengembangan sistem dapat terfokus dan terukur, dokumentasi teknis ini memiliki batasan-batasan sebagai berikut:"
  ),
  heading3("1.3.1 Ruang Lingkup Sistem (In Scope)"),
  bodyText("Sistem yang didokumentasikan dalam dokumen ini mencakup modul-modul berikut:"),
  bulletItem("PPDB Configuration \u2014 Manajemen periode, gelombang, jenjang, kategori, kuota, dan flow seleksi"),
  bulletItem("Applicant Management \u2014 Registrasi akun, login, profil peserta, dan status pendaftaran"),
  bulletItem("Document Management \u2014 Upload, review, approval, dan revisi dokumen"),
  bulletItem("Selection Management \u2014 Jenis tes dinamis, penjadwalan, penilaian, dan pengumuman kelulusan"),
  bulletItem("Payment Management \u2014 Invoice, pembayaran online/manual, diskon, dan cicilan"),
  bulletItem("MOU Management \u2014 Generate, upload, dan approval Memorandum of Understanding"),
  bulletItem("Acceptance Management \u2014 Surat penerimaan, registrasi ulang, dan MPLS"),
  bulletItem("Academic Calendar \u2014 Agenda dan kalender akademik"),
  bulletItem("Notification Center \u2014 Notifikasi WhatsApp dan Email dengan reminder otomatis"),
  bulletItem("Reporting \u2014 Export PDF, Export Excel, dan dashboard analitik"),

  heading3("1.3.2 Batasan Teknis"),
  bodyText(
    "Platform: Sistem dikembangkan sebagai web application responsive yang dapat diakses melalui browser pada perangkat desktop maupun mobile. Pengembangan menggunakan stack teknologi React 19 + TypeScript + Vite dengan Tailwind CSS untuk antarmuka."
  ),
  bodyText(
    "Versi 1.0 ini tidak mencakup pengembangan aplikasi mobile native (Android/iOS). Namun, desain responsive memastikan ketergunaan yang memadai pada perangkat seluler melalui browser."
  ),

  heading3("1.3.3 Out of Scope (Versi 1.0)"),
  bodyText("Fitur-fitur berikut tidak termasuk dalam cakupan pengembangan versi 1.0:"),
  bulletItem("Mobile Application Native (Android/iOS)"),
  bulletItem("E-signature tersertifikasi (tanda tangan digital legal)"),
  bulletItem("Integrasi dengan EMIS (Education Management Information System) Kementerian Agama"),
  bulletItem("Integrasi dengan Dapodik (Data Pokok Pendidikan) Kemendikbud"),
  bulletItem("Integrasi Virtual Account Bank (Mandiri/BCA)"),
  bulletItem("AI Interview Assessment (penilaian wawancara berbasis kecerdasan buatan)"),
  bodyText(
    "Fitur-fitur tersebut direncanakan untuk pengembangan pada fase-fase berikutnya (Phase 2\u20134) sebagaimana tercantum dalam roadmap produk."
  ),
];

// --- 1.4 TUJUAN & MANFAAT ---
const section1_4: Paragraph[] = [
  heading2("1.4 Tujuan dan Manfaat"),

  heading3("1.4.1 Tujuan Pengembangan"),
  bodyText(
    "Pengembangan Sistem PPDB Terintegrasi ini memiliki tujuan-tujuan strategis sebagai berikut:"
  ),
  numberedItem(
    1,
    "Menyediakan Proses PPDB End-to-End dalam Satu Platform \u2014 Mengintegrasikan seluruh rangkaian proses PPDB, mulai dari pendaftaran hingga registrasi ulang, dalam satu sistem terpusat sehingga tidak ada lagi fragmentasi data dan proses antar platform yang berbeda."
  ),
  numberedItem(
    2,
    "Mengurangi Pekerjaan Administratif Manual \u2014 Mengotomatiskan proses-proses yang sebelumnya dilakukan secara manual seperti pembuatan invoice, rekap data, pencatatan pembayaran, dan generasi dokumen. Target pengurangan pekerjaan administratif minimal 50%."
  ),
  numberedItem(
    3,
    "Mempermudah Monitoring Peserta oleh Seluruh Tim PPDB \u2014 Menyediakan dashboard komprehensif yang memungkinkan setiap pemangku kepentingan (superadmin, admin seleksi, penguji, finance) untuk memantau status dan progress setiap calon siswa secara real-time."
  ),
  numberedItem(
    4,
    "Meningkatkan Akurasi Pembayaran dan Pelaporan \u2014 Mengintegrasikan payment gateway untuk pembayaran online, serta menyediakan mekanisme validasi manual sebagai fallback. Sistem menghasilkan laporan keuangan yang akurat dan dapat diaudit."
  ),
  numberedItem(
    5,
    "Memberikan Pengalaman Pendaftaran yang Mudah \u2014 Merancang antarmuka yang intuitif dan ramah pengguna bagi calon siswa dan orang tua, sehingga proses pendaftaran dapat diselesaikan tanpa hambatan teknis yang berarti."
  ),

  heading3("1.4.2 Manfaat Sistem"),
  bodyText(
    "Secara lebih rinci, manfaat yang diharapkan dari implementasi sistem ini adalah sebagai berikut:"
  ),
  heading3("Manfaat Operasional:"),
  bulletItem("90% proses PPDB dilakukan melalui sistem (digitalisasi hampir menyeluruh)"),
  bulletItem("80% pembayaran dilakukan secara online melalui payment gateway"),
  bulletItem("Pengurangan pekerjaan administratif minimal 50% dibandingkan metode manual"),
  bulletItem("Waktu verifikasi dokumen turun minimal 40% melalui workflow digital"),
  heading3("Manfaat Pengguna:"),
  bulletItem("Completion rate formulir pendaftaran di atas 85%"),
  bulletItem("Payment success rate di atas 95%"),
  bulletItem("Dokumen valid pada upload pertama di atas 80% (panduan upload yang jelas)"),
  heading3("Manfaat Teknis:"),
  bulletItem("Uptime sistem di atas 99%"),
  bulletItem("Response time di bawah 2 detik"),
  bulletItem("Error rate di bawah 1%"),
  heading3("Manfaat Kelembagaan:"),
  bulletItem("Seluruh data PPDB terpusat dan mudah diakses"),
  bulletItem("Audit trail komprehensif untuk setiap aktivitas"),
  bulletItem("Laporan otomatis untuk pengambilan keputusan strategis"),
  bulletItem("Peningkatan kepercayaan orang tua melalui transparansi proses"),
];

// --- 1.5 SISTEMATIKA PENULISAN ---
const section1_5: Paragraph[] = [
  heading2("1.5 Sistematika Penulisan dan Timeline Proyek"),

  heading3("1.5.1 Sistematika Penulisan Dokumentasi"),
  bodyText(
    "Dokumentasi teknis Sistem PPDB Terintegrasi ini disusun dengan sistematika sebagai berikut:"
  ),
  numberedItem(
    1,
    "Bab 1 \u2014 Pendahuluan \u2014 Membahas latar belakang, rumusan masalah, batasan masalah, tujuan dan manfaat, serta sistematika penulisan dokumentasi."
  ),
  numberedItem(
    2,
    "Bab 2 \u2014 Tinjauan Pustaka dan Analisis Kebutuhan \u2014 Membahas konsep dasar PPDB, studi literatur terkait sistem informasi penerimaan siswa, analisis kebutuhan fungsional dan non-fungsional, serta analisis karakteristik pengguna (user personas)."
  ),
  numberedItem(
    3,
    "Bab 3 \u2014 Perancangan Sistem \u2014 Membahas arsitektur sistem, desain basis data (ERD), diagram alir proses bisnis (business process flow), perancangan antarmuka (UI/UX), serta desain modul-modul sistem."
  ),
  numberedItem(
    4,
    "Bab 4 \u2014 Implementasi \u2014 Membahas lingkungan pengembangan, struktur kode, implementasi setiap modul (PPDB Configuration, Applicant Management, Document Management, Selection Management, Payment Management, MOU, Acceptance, Notification, Reporting), serta integrasi antar modul."
  ),
  numberedItem(
    5,
    "Bab 5 \u2014 Pengujian dan Evaluasi \u2014 Membahas strategi pengujian (unit test, integration test, UAT), hasil pengujian, evaluasi terhadap success metrics, serta identifikasi bug dan perbaikan."
  ),
  numberedItem(
    6,
    "Bab 6 \u2014 Penutup \u2014 Membahas kesimpulan, keterbatasan sistem, rekomendasi pengembangan selanjutnya (roadmap Phase 2\u20134), dan penutup."
  ),

  heading3("1.5.2 Timeline Proyek Pengembangan"),
  bodyText(
    "Proyek pengembangan Sistem PPDB Terintegrasi direncanakan dengan timeline sebagai berikut:"
  ),
  emptyLine(),

  // Timeline Table
  new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      // Header
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            shading: { fill: "2F5496" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "No",
                    bold: true,
                    font: FONT,
                    size: 20,
                    color: "FFFFFF",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "2F5496" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Tahapan Pengembangan",
                    bold: true,
                    font: FONT,
                    size: 20,
                    color: "FFFFFF",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: "2F5496" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Minggu Ke-",
                    bold: true,
                    font: FONT,
                    size: 20,
                    color: "FFFFFF",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: "2F5496" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Status",
                    bold: true,
                    font: FONT,
                    size: 20,
                    color: "FFFFFF",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "2F5496" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Deliverable",
                    bold: true,
                    font: FONT,
                    size: 20,
                    color: "FFFFFF",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Row 1
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Analisis Kebutuhan & Perancangan", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1 \u2013 3", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Selesai", font: FONT, size: 20, color: "2E7D32" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "PRD, ERD, UI/UX Design", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 2
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Setup Infrastruktur & Auth", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "4 \u2013 5", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Selesai", font: FONT, size: 20, color: "2E7D32" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Auth, Roles, Database Setup", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 3
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "PPDB Configuration Module", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "6 \u2013 8", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Dalam Proses", font: FONT, size: 20, color: "E65100" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Periode, Gelombang, Jenjang, Kategori, Flow Seleksi", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 4
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "4", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Applicant & Document Management", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "9 \u2013 12", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Direncanakan", font: FONT, size: 20, color: "1565C0" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Registrasi, Login, Profil, Upload & Verifikasi Dokumen", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 5
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Selection Management", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "13 \u2013 16", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Direncanakan", font: FONT, size: 20, color: "1565C0" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Tes Dinamis, Penjadwalan, Penilaian, Kelulusan", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 6
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "6", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Payment & Invoice Management", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "17 \u2013 20", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Direncanakan", font: FONT, size: 20, color: "1565C0" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Invoice, Payment Gateway, Diskon, Cicilan", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 7
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "7", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "MOU & Acceptance Management", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "21 \u2013 23", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Direncanakan", font: FONT, size: 20, color: "1565C0" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "MOU, Surat Penerimaan, Registrasi Ulang, MPLS", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 8
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Notification, Reporting & Dashboard", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "24 \u2013 26", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Direncanakan", font: FONT, size: 20, color: "1565C0" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "WhatsApp/Email Notif, Export PDF/Excel, Analytics Dashboard", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 9
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "9", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Pengujian & UAT", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "27 \u2013 29", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Direncanakan", font: FONT, size: 20, color: "1565C0" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Unit Test, Integration Test, UAT, Bug Fixing", font: FONT, size: 20 })] })],
          }),
        ],
      }),
      // Row 10
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "10", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Go-Live & Deployment", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "30", font: FONT, size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Direncanakan", font: FONT, size: 20, color: "1565C0" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Deployment, Monitoring, Backup, Go-Live", font: FONT, size: 20 })] })],
          }),
        ],
      }),
    ],
  }),
  emptyLine(),
  bodyText(
    "Catatan: Status \u201CSelesai\u201D menunjukkan tahapan yang telah dilaksanakan, \u201CDalam Proses\u201D menunjukkan tahapan yang sedang dikerjakan, dan \u201CDirencanakan\u201D menunjukkan tahapan yang akan datang. Timeline di atas bersifat estimasi dan dapat disesuaikan berdasarkan kompleksitas dan kapasitas tim pengembang."
  ),

  heading3("1.5.3 Roadmap Pengembangan Selanjutnya"),
  bodyText(
    "Setelah versi 1.0 Go-Live, pengembangan sistem akan dilanjutkan pada fase-fase berikutnya:"
  ),
  bulletItem("Phase 2: Mobile Application, Parent Portal, Student Portal, Virtual Account Integration"),
  bulletItem("Phase 3: AI Document Validation, AI Recommendation Scoring, AI Interview Assessment"),
  bulletItem("Phase 4: Integrasi Dapodik, Integrasi EMIS, Integrasi ERP Sekolah"),
];

// ============================================
// ASSEMBLE DOCUMENT
// ============================================

const doc = new Document({
  creator: "Tim Pengembang Sistem PPDB",
  title: "Dokumentasi Teknis - Sistem PPDB Terintegrasi - Bab 1 Pendahuluan",
  description: "Dokumentasi teknis Bab 1 Pendahuluan untuk Sistem PPDB Terintegrasi Pesantren/Sekolah",
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.25),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: [
        ...coverPage,
        ...bab1Title,
        ...section1_1,
        ...section1_2,
        ...section1_3,
        ...section1_4,
        ...section1_5,
      ],
    },
  ],
});

// Generate file
const outputPath = path.join(process.cwd(), "..", "docs", "PPDB-Bab1-Pendahuluan.docx");
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);
console.log(`Dokumen berhasil dibuat: ${outputPath}`);
