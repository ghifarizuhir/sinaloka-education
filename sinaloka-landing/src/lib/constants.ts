import type { LucideIcon } from "lucide-react";
import {
  Users,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Shield,
  MessageCircle,
  Phone,
  Zap,
  GraduationCap,
} from "lucide-react";

export const WHATSAPP_NUMBER = "62895358468523";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Halo%2C%20saya%20tertarik%20dengan%20Sinaloka%20untuk%20bimbel%20saya`;

export const NAV_LINKS = [
  { href: "#features", label: "Fitur" },
  { href: "#results", label: "Hasil" },
  { href: "#pricing", label: "Harga" },
  { href: "#faq", label: "FAQ" },
] as const;

export const PAIN_POINTS = [
  { text: "Data siswa tercecer di spreadsheet", icon: "📋" },
  { text: "Jadwal bentrok karena koordinasi manual", icon: "📅" },
  { text: "Orang tua komplain — nggak tahu progress anak", icon: "😤" },
  { text: "Gaji tutor salah hitung tiap bulan", icon: "💸" },
  { text: "Pembayaran siswa susah dilacak", icon: "🔍" },
  { text: "Waktu habis buat admin, bukan mengajar", icon: "⏰" },
] as const;

export interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  highlighted?: boolean;
}

export const FEATURES: Feature[] = [
  {
    icon: Users,
    title: "Siswa & Tutor",
    desc: "Semua data rapi di satu tempat. Enrollment, profil, progress — tinggal klik.",
  },
  {
    icon: CalendarCheck,
    title: "Jadwal & Absensi",
    desc: "Atur jadwal, kirim reminder otomatis, catat kehadiran real-time. Nggak ada yang terlewat.",
  },
  {
    icon: CreditCard,
    title: "Pembayaran & Gaji",
    desc: "Tagihan otomatis, terima bayaran online, hitung gaji tutor tanpa Excel. Transparan.",
    highlighted: true,
  },
  {
    icon: MessageCircle,
    title: "Portal Orang Tua",
    desc: "Orang tua pantau kehadiran, jadwal, dan pembayaran langsung dari HP. Mereka tenang, Anda tenang.",
  },
  {
    icon: BarChart3,
    title: "Laporan & Analitik",
    desc: "Dashboard visual: pendapatan, kehadiran, growth siswa. Keputusan berdasarkan data, bukan feeling.",
  },
  {
    icon: Shield,
    title: "Aman & Multi-Cabang",
    desc: "Data tiap cabang terisolasi. Mau expand? Tinggal tambah — kelola dari satu akun.",
  },
];

export interface Step {
  num: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export const STEPS: Step[] = [
  {
    num: "01",
    title: "Chat kami via WhatsApp",
    desc: "Ceritakan kebutuhan bimbel Anda. Kami bantu setup dari awal — gratis.",
    icon: Phone,
  },
  {
    num: "02",
    title: "Kami setup-kan untuk Anda",
    desc: "Tim kami input data, atur jadwal, dan pastikan semuanya siap pakai. Anda tinggal jalan.",
    icon: Zap,
  },
  {
    num: "03",
    title: "Bimbel jalan, Anda fokus mengajar",
    desc: "Absensi otomatis, pembayaran terlacak, orang tua bisa pantau sendiri. Semua beres.",
    icon: GraduationCap,
  },
];

export interface Metric {
  number: string;
  unit: string;
  label: string;
  note: string;
}

export const METRICS: Metric[] = [
  {
    number: "3 jam",
    unit: "/hari",
    label: "Waktu admin yang terhemat",
    note: "Rata-rata dari data pengguna aktif",
  },
  {
    number: "85%",
    unit: "",
    label: "Lebih sedikit kesalahan tagihan",
    note: "Dibanding proses manual",
  },
  {
    number: "2x",
    unit: "",
    label: "Lebih cepat follow-up orang tua",
    note: "Dengan portal orang tua real-time",
  },
  {
    number: "10",
    unit: "menit",
    label: "Setup sampai siap pakai",
    note: "Dibantu langsung oleh tim kami",
  },
];

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    desc: "Untuk bimbel kecil yang baru mulai go digital",
    features: [
      "Hingga 30 siswa",
      "Hingga 5 tutor",
      "Jadwal & absensi",
      "Portal orang tua",
      "Email support",
    ],
    cta: "Mulai Gratis",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "Rp 150rb",
    period: "/bulan",
    desc: "Bimbel yang berkembang dan butuh fitur lebih",
    features: [
      "Hingga 200 siswa",
      "Hingga 20 tutor",
      "WhatsApp notifikasi",
      "Laporan & analitik lanjutan",
      "Semua fitur Starter",
      "Priority support",
    ],
    cta: "Chat untuk Demo",
    highlighted: true,
  },
  {
    name: "Business",
    price: "Rp 500rb",
    period: "/bulan",
    desc: "Jaringan bimbel besar dengan multi-cabang",
    features: [
      "Siswa unlimited",
      "Tutor unlimited",
      "Multi-cabang",
      "Semua fitur Growth",
      "Dedicated support",
      "Onboarding & training",
    ],
    cta: "Hubungi Kami",
    highlighted: false,
  },
];

export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Apakah data bimbel saya aman?",
    a: "Sangat aman. Kami pakai enkripsi dan server tersertifikasi. Data setiap lembaga terisolasi — nggak ada yang bisa akses data Anda kecuali Anda sendiri.",
  },
  {
    q: "Berapa lama proses setup?",
    a: "10 menit untuk setup dasar. Kalau Anda punya data di spreadsheet, tim kami bantu import — biasanya selesai dalam 1 hari.",
  },
  {
    q: "Tutor dan orang tua perlu download app?",
    a: "Nggak perlu. Sinaloka bisa diakses langsung dari browser HP. Cukup buka link, login, selesai.",
  },
  {
    q: "Bisa untuk bimbel multi-cabang?",
    a: "Bisa! Paket Business mendukung multi-cabang. Semua dimonitor dari satu dashboard.",
  },
  {
    q: "Bagaimana kalau saya nggak puas?",
    a: "Mulai aja gratis tanpa kartu kredit. Untuk paket berbayar, ada jaminan uang kembali 30 hari — no questions asked.",
  },
];

export const FOOTER_LINKS = {
  produk: [
    { label: "Fitur", href: "#features" },
    { label: "Harga", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
  perusahaan: [
    { label: "Tentang Kami", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Kontak", href: WHATSAPP_URL },
  ],
  legal: [
    { label: "Kebijakan Privasi", href: "#" },
    { label: "Syarat & Ketentuan", href: "#" },
  ],
} as const;

export const SOCIAL_LINKS = [
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "WhatsApp", href: WHATSAPP_URL, external: true },
] as const;
