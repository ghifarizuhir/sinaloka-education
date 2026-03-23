import type { LucideIcon } from "lucide-react";
import {
  Users,
  CalendarCheck,
  CreditCard,
  MessageCircle,
  Receipt,
  Wallet,
  Phone,
  Zap,
  GraduationCap,
} from "lucide-react";

export const WHATSAPP_NUMBER = "6285121094946";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Halo%2C%20saya%20tertarik%20dengan%20Sinaloka%20untuk%20bimbel%20saya`;

export const NAV_LINKS = [
  { href: "#demo", label: "Demo" },
  { href: "#fitur", label: "Fitur" },
  { href: "#harga", label: "Harga" },
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
    desc: "Data enrollment, profil, dan progress — rapi di satu tempat. Tinggal klik.",
  },
  {
    icon: CalendarCheck,
    title: "Jadwal & Absensi",
    desc: "Atur jadwal, catat kehadiran real-time, WA reminder otomatis. Nggak ada yang terlewat.",
  },
  {
    icon: CreditCard,
    title: "Pembayaran Online",
    desc: "Orang tua bayar via QRIS & Virtual Account langsung dari HP. Otomatis tercatat.",
    highlighted: true,
  },
  {
    icon: MessageCircle,
    title: "Portal Orang Tua",
    desc: "Orang tua pantau kehadiran, jadwal, dan bayar langsung dari HP. Mereka tenang, Anda tenang.",
  },
  {
    icon: Receipt,
    title: "Invoice & Slip Gaji",
    desc: "Invoice PDF otomatis untuk orang tua, slip gaji PDF untuk tutor. Tanpa bikin manual.",
  },
  {
    icon: Wallet,
    title: "Catat Pengeluaran",
    desc: "Kelola pengeluaran bimbel. Tahu untung-rugi tanpa spreadsheet.",
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

export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Apakah data bimbel saya aman?",
    a: "Data disimpan di cloud server yang reliable dan selalu di-backup. Setiap bimbel datanya terisolasi — nggak ada bimbel lain yang bisa akses data Anda. Akses dibatasi dengan login dan role-based permission.",
  },
  {
    q: "Berapa lama proses setup?",
    a: "Setup dasar bisa selesai kurang dari 15 menit. Kalau Anda punya data di spreadsheet, tim kami bantu import — biasanya selesai dalam 1 hari kerja.",
  },
  {
    q: "Tutor dan orang tua perlu download app?",
    a: "Nggak perlu. Sinaloka bisa diakses langsung dari browser HP. Cukup buka link, login, selesai.",
  },
  {
    q: "Bisa untuk bimbel multi-cabang?",
    a: "Belum — fitur multi-cabang sedang kami kembangkan untuk paket Business. Untuk saat ini, Sinaloka optimal untuk bimbel single-location.",
  },
  {
    q: "Kalau nggak cocok gimana?",
    a: "Coba dulu gratis 2 bulan — tanpa kartu kredit, tanpa komitmen. Kalau nggak cocok, tinggal berhenti. Tanpa kontrak.",
  },
];

export const FOOTER_LINKS = {
  produk: [
    { label: "Fitur", href: "#fitur" },
    { label: "Harga", href: "#harga" },
    { label: "FAQ", href: "#faq" },
  ],
  kontak: [
    { label: "WhatsApp", href: WHATSAPP_URL },
  ],
  legal: [
    { label: "Kebijakan Privasi", href: "/privacy" },
    { label: "Syarat & Ketentuan", href: "/terms" },
  ],
} as const;

export const SOCIAL_LINKS = [
  { label: "WhatsApp", href: WHATSAPP_URL, external: true },
] as const;
