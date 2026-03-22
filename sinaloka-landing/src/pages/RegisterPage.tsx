import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  BookOpen,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Users,
  Star,
  Shield,
} from "lucide-react";
import api from "../lib/api";
import { cn } from "../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstitutionInfo {
  name: string;
  logo_url?: string;
  slug: string;
  student_enabled: boolean;
  tutor_enabled: boolean;
}

interface ApiResponse {
  institution: { name: string; logo_url: string | null; slug: string };
  registration: { student_enabled: boolean; tutor_enabled: boolean };
}

type Role = "student" | "tutor";
type PageState =
  | "loading"
  | "error"
  | "closed"
  | "role-select"
  | "form"
  | "success";

interface StudentFormData {
  name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  email: string;
  phone: string;
  parent_email: string;
}

interface TutorFormData {
  name: string;
  email: string;
  phone: string;
  subject_names: string;
  experience_years: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InputField({
  label,
  required,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-semibold text-[#444]">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border px-4 py-2.5 text-sm text-[#111] placeholder:text-[#C0C0C0]",
          "focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all duration-200",
          error
            ? "border-red-300 bg-red-50/50"
            : "border-[#E0E0E0] bg-[#FAFAFA] hover:border-[#CCC]"
        )}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ─── Branded Left Panel ───────────────────────────────────────────────────────

function BrandPanel({ institution }: { institution: InstitutionInfo | null }) {
  return (
    <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative bg-accent-950 flex-col justify-between overflow-hidden">
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.07]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent-600/20 blur-[100px]" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] rounded-full bg-accent-400/15 blur-[80px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-12 py-14">
        {/* Institution branding */}
        <div className="flex items-center gap-4 mb-auto">
          {institution?.logo_url ? (
            <img
              src={institution.logo_url}
              alt={institution.name}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10"
            />
          ) : institution?.name ? (
            <div className="w-12 h-12 rounded-xl bg-accent-600 flex items-center justify-center ring-2 ring-white/10">
              <span className="text-white text-lg font-bold">
                {institution.name.charAt(0).toUpperCase()}
              </span>
            </div>
          ) : null}
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">
              {institution?.name ?? "Loading..."}
            </h2>
            <p className="text-accent-300/80 text-sm">Portal Registrasi</p>
          </div>
        </div>

        {/* Center hero text */}
        <div className="my-auto py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-[40px] xl:text-[46px] font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Mulai perjalanan
              <br />
              <span className="text-accent-400">belajar</span> Anda
              <br />
              bersama kami.
            </h1>
            <p className="text-accent-200/60 text-base leading-relaxed max-w-[360px]">
              Isi formulir di samping untuk mendaftar. Admin kami akan meninjau
              dan menghubungi Anda segera.
            </p>
          </motion.div>
        </div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-6"
        >
          <div className="flex items-center gap-2 text-accent-300/60">
            <Shield size={15} />
            <span className="text-xs font-medium">Data aman</span>
          </div>
          <div className="flex items-center gap-2 text-accent-300/60">
            <Star size={15} />
            <span className="text-xs font-medium">Gratis</span>
          </div>
          <div className="flex items-center gap-2 text-accent-300/60">
            <Users size={15} />
            <span className="text-xs font-medium">Review cepat</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Mobile Header (shown on small screens) ──────────────────────────────────

function MobileHeader({ institution }: { institution: InstitutionInfo | null }) {
  if (!institution) return null;

  return (
    <div className="lg:hidden bg-accent-950 px-6 py-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="mgrid"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="15" cy="15" r="0.8" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mgrid)" />
        </svg>
      </div>
      <div className="absolute top-[-50%] right-[-30%] w-[300px] h-[300px] rounded-full bg-accent-600/20 blur-[80px]" />

      <div className="relative z-10">
        {institution.logo_url ? (
          <img
            src={institution.logo_url}
            alt={institution.name}
            className="w-14 h-14 rounded-xl object-cover mx-auto mb-3 ring-2 ring-white/10"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-accent-600 flex items-center justify-center mx-auto mb-3 ring-2 ring-white/10">
            <span className="text-white text-xl font-bold">
              {institution.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h1 className="text-white font-bold text-lg">{institution.name}</h1>
        <p className="text-accent-300/70 text-sm mt-1">Portal Registrasi</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [institution, setInstitution] = useState<InstitutionInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [studentForm, setStudentForm] = useState<StudentFormData>({
    name: "",
    grade: "",
    parent_name: "",
    parent_phone: "",
    email: "",
    phone: "",
    parent_email: "",
  });

  const [tutorForm, setTutorForm] = useState<TutorFormData>({
    name: "",
    email: "",
    phone: "",
    subject_names: "",
    experience_years: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) {
      setPageState("error");
      return;
    }

    api
      .get<ApiResponse>(`/api/register/${slug}`)
      .then((res) => {
        const { institution: inst, registration: reg } = res.data;
        const data: InstitutionInfo = {
          name: inst.name,
          logo_url: inst.logo_url ?? undefined,
          slug: inst.slug,
          student_enabled: reg.student_enabled,
          tutor_enabled: reg.tutor_enabled,
        };
        setInstitution(data);

        if (!data.student_enabled && !data.tutor_enabled) {
          setPageState("closed");
          return;
        }

        if (data.student_enabled && !data.tutor_enabled) {
          setSelectedRole("student");
          setPageState("form");
        } else if (!data.student_enabled && data.tutor_enabled) {
          setSelectedRole("tutor");
          setPageState("form");
        } else {
          setPageState("role-select");
        }
      })
      .catch(() => {
        setPageState("error");
      });
  }, [slug]);

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateStudent(): boolean {
    const errors: Record<string, string> = {};
    if (!studentForm.name.trim()) errors.name = "Nama wajib diisi";
    if (!studentForm.grade.trim()) errors.grade = "Kelas wajib diisi";
    if (!studentForm.parent_name.trim())
      errors.parent_name = "Nama orang tua wajib diisi";
    if (!studentForm.parent_phone.trim())
      errors.parent_phone = "No. HP orang tua wajib diisi";
    if (!studentForm.email.trim()) errors.email = "Email siswa wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.email))
      errors.email = "Format email tidak valid";
    if (
      studentForm.parent_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.parent_email)
    )
      errors.parent_email = "Format email tidak valid";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateTutor(): boolean {
    const errors: Record<string, string> = {};
    if (!tutorForm.name.trim()) errors.name = "Nama wajib diisi";
    if (!tutorForm.email.trim()) errors.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutorForm.email))
      errors.email = "Format email tidak valid";
    if (!tutorForm.subject_names.trim())
      errors.subject_names = "Mata pelajaran wajib diisi";
    if (
      tutorForm.experience_years &&
      (isNaN(Number(tutorForm.experience_years)) ||
        Number(tutorForm.experience_years) < 0)
    )
      errors.experience_years = "Masukkan angka yang valid";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const isValid =
      selectedRole === "student" ? validateStudent() : validateTutor();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      if (selectedRole === "student") {
        const payload = {
          name: studentForm.name.trim(),
          grade: studentForm.grade.trim(),
          parent_name: studentForm.parent_name.trim(),
          parent_phone: studentForm.parent_phone.trim(),
          email: studentForm.email.trim(),
          ...(studentForm.phone.trim() && {
            phone: studentForm.phone.trim(),
          }),
          ...(studentForm.parent_email.trim() && {
            parent_email: studentForm.parent_email.trim(),
          }),
        };
        await api.post(`/api/register/${slug}/student`, payload);
      } else {
        const subjectList = tutorForm.subject_names
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const payload = {
          name: tutorForm.name.trim(),
          email: tutorForm.email.trim(),
          ...(tutorForm.phone.trim() && { phone: tutorForm.phone.trim() }),
          subject_names: subjectList,
          ...(tutorForm.experience_years.trim() && {
            experience_years: Number(tutorForm.experience_years),
          }),
        };
        await api.post(`/api/register/${slug}/tutor`, payload);
      }

      setPageState("success");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status: number; data?: { message?: string } };
      };
      const status = axiosErr.response?.status;
      if (status === 409) {
        setSubmitError("Data dengan email ini sudah terdaftar.");
      } else if (status === 429) {
        setSubmitError("Terlalu banyak percobaan. Coba lagi beberapa saat.");
      } else if (status === 400) {
        const msg = axiosErr.response?.data?.message;
        setSubmitError(
          typeof msg === "string" ? msg : "Data yang dimasukkan tidak valid."
        );
      } else {
        setSubmitError("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Full-page states (loading, error, closed, success) ─────────────────────

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex">
        <BrandPanel institution={null} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="w-24 h-3 rounded bg-[#E8E8E8] animate-pulse" />
                <div className="w-full h-11 rounded-xl bg-[#F0F0F0] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-[#111] mb-2">
            Institusi Tidak Ditemukan
          </h1>
          <p className="text-sm text-[#888] mb-8">
            Tautan pendaftaran ini tidak valid atau sudah tidak aktif.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
        </motion.div>
      </div>
    );
  }

  if (pageState === "closed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-[#111] mb-2">
            Pendaftaran Ditutup
          </h1>
          <p className="text-sm text-[#888] mb-8">
            Pendaftaran sedang ditutup sementara. Hubungi pihak{" "}
            {institution?.name ?? "institusi"} untuk informasi lebih lanjut.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
        </motion.div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen flex">
        <BrandPanel institution={institution} />
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
              className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[#111] mb-3">
              Pendaftaran Berhasil!
            </h2>
            <p className="text-[#888] leading-relaxed mb-8">
              Terima kasih telah mendaftar di{" "}
              <strong className="text-[#555]">{institution?.name}</strong>. Admin
              akan meninjau data Anda dan menghubungi segera.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              <ArrowLeft size={16} />
              Kembali ke Beranda
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Role select & Form (split layout) ──────────────────────────────────────

  const isStudent = selectedRole === "student";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left panel — desktop only */}
      <BrandPanel institution={institution} />

      {/* Mobile header */}
      <MobileHeader institution={institution} />

      {/* Right panel — form area */}
      <div className="flex-1 flex items-start lg:items-center justify-center py-10 px-6 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-[460px]">
          <AnimatePresence mode="wait">
            {pageState === "role-select" && institution ? (
              <motion.div
                key="role-select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#111] mb-2">
                    Pilih jenis pendaftaran
                  </h2>
                  <p className="text-sm text-[#888]">
                    Silakan pilih peran Anda untuk melanjutkan pendaftaran.
                  </p>
                </div>

                <div className="space-y-3">
                  {institution.student_enabled && (
                    <motion.button
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      onClick={() => {
                        setSelectedRole("student");
                        setPageState("form");
                      }}
                      className="group w-full flex items-center gap-5 bg-white border-2 border-[#EBEBEB] hover:border-accent-500 rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-lg hover:shadow-accent-500/5 cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-xl bg-accent-50 group-hover:bg-accent-100 flex items-center justify-center shrink-0 transition-colors">
                        <GraduationCap className="w-7 h-7 text-accent-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#111] text-base">
                          Daftar sebagai Murid
                        </div>
                        <div className="text-sm text-[#999] mt-0.5">
                          Bergabung sebagai siswa di institusi ini
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-[#CCC] group-hover:text-accent-500 transition-colors shrink-0"
                      />
                    </motion.button>
                  )}

                  {institution.tutor_enabled && (
                    <motion.button
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      onClick={() => {
                        setSelectedRole("tutor");
                        setPageState("form");
                      }}
                      className="group w-full flex items-center gap-5 bg-white border-2 border-[#EBEBEB] hover:border-accent-500 rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-lg hover:shadow-accent-500/5 cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-xl bg-accent-50 group-hover:bg-accent-100 flex items-center justify-center shrink-0 transition-colors">
                        <BookOpen className="w-7 h-7 text-accent-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#111] text-base">
                          Daftar sebagai Tutor
                        </div>
                        <div className="text-sm text-[#999] mt-0.5">
                          Bergabung sebagai pengajar di institusi ini
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-[#CCC] group-hover:text-accent-500 transition-colors shrink-0"
                      />
                    </motion.button>
                  )}
                </div>

                <div className="mt-8 text-center">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-accent-600 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Kembali ke Beranda
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Form header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center gap-2 bg-accent-50 text-accent-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      {isStudent ? (
                        <GraduationCap size={13} />
                      ) : (
                        <BookOpen size={13} />
                      )}
                      {isStudent
                        ? "Registrasi Murid"
                        : "Registrasi Tutor"}
                    </div>

                    {institution?.student_enabled &&
                      institution?.tutor_enabled && (
                        <button
                          onClick={() => {
                            setSelectedRole(null);
                            setFieldErrors({});
                            setSubmitError(null);
                            setPageState("role-select");
                          }}
                          className="text-xs text-[#999] hover:text-accent-600 flex items-center gap-1 transition-colors"
                        >
                          <ArrowLeft size={13} />
                          Ganti peran
                        </button>
                      )}
                  </div>
                  <h2 className="text-2xl font-bold text-[#111] mb-1">
                    {isStudent
                      ? "Formulir Pendaftaran Murid"
                      : "Formulir Pendaftaran Tutor"}
                  </h2>
                  <p className="text-sm text-[#888]">
                    Lengkapi data berikut. Kolom bertanda{" "}
                    <span className="text-red-400">*</span> wajib diisi.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate>
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {isStudent ? (
                        <motion.div
                          key="student"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <InputField
                            id="name"
                            label="Nama Lengkap"
                            required
                            placeholder="Nama lengkap siswa"
                            value={studentForm.name}
                            onChange={(v) =>
                              setStudentForm((f) => ({ ...f, name: v }))
                            }
                            error={fieldErrors.name}
                          />
                          <InputField
                            id="grade"
                            label="Kelas / Jenjang"
                            required
                            placeholder="Contoh: Kelas 10 SMA"
                            value={studentForm.grade}
                            onChange={(v) =>
                              setStudentForm((f) => ({ ...f, grade: v }))
                            }
                            error={fieldErrors.grade}
                          />

                          {/* Parent section */}
                          <div className="border-t border-[#F0F0F0] pt-5 mt-5">
                            <p className="text-xs font-bold text-[#AAA] uppercase tracking-wider mb-4">
                              Data Orang Tua / Wali
                            </p>
                            <div className="space-y-4">
                              <InputField
                                id="parent_name"
                                label="Nama Orang Tua / Wali"
                                required
                                placeholder="Nama lengkap"
                                value={studentForm.parent_name}
                                onChange={(v) =>
                                  setStudentForm((f) => ({
                                    ...f,
                                    parent_name: v,
                                  }))
                                }
                                error={fieldErrors.parent_name}
                              />
                              <InputField
                                id="parent_phone"
                                label="No. HP Orang Tua"
                                required
                                type="tel"
                                placeholder="08123456789"
                                value={studentForm.parent_phone}
                                onChange={(v) =>
                                  setStudentForm((f) => ({
                                    ...f,
                                    parent_phone: v,
                                  }))
                                }
                                error={fieldErrors.parent_phone}
                              />
                              <InputField
                                id="parent_email"
                                label="Email Orang Tua"
                                type="email"
                                placeholder="email@contoh.com (opsional)"
                                value={studentForm.parent_email}
                                onChange={(v) =>
                                  setStudentForm((f) => ({
                                    ...f,
                                    parent_email: v,
                                  }))
                                }
                                error={fieldErrors.parent_email}
                              />
                            </div>
                          </div>

                          {/* Student contact */}
                          <div className="border-t border-[#F0F0F0] pt-5 mt-5">
                            <p className="text-xs font-bold text-[#AAA] uppercase tracking-wider mb-4">
                              Kontak Siswa (Opsional)
                            </p>
                            <div className="space-y-4">
                              <InputField
                                id="email"
                                label="Email Siswa"
                                required
                                type="email"
                                placeholder="email@contoh.com"
                                value={studentForm.email}
                                onChange={(v) =>
                                  setStudentForm((f) => ({ ...f, email: v }))
                                }
                                error={fieldErrors.email}
                              />
                              <InputField
                                id="phone"
                                label="No. HP Siswa"
                                type="tel"
                                placeholder="08123456789"
                                value={studentForm.phone}
                                onChange={(v) =>
                                  setStudentForm((f) => ({ ...f, phone: v }))
                                }
                                error={fieldErrors.phone}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="tutor"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <InputField
                            id="name"
                            label="Nama Lengkap"
                            required
                            placeholder="Nama lengkap"
                            value={tutorForm.name}
                            onChange={(v) =>
                              setTutorForm((f) => ({ ...f, name: v }))
                            }
                            error={fieldErrors.name}
                          />
                          <InputField
                            id="email"
                            label="Email"
                            required
                            type="email"
                            placeholder="email@contoh.com"
                            value={tutorForm.email}
                            onChange={(v) =>
                              setTutorForm((f) => ({ ...f, email: v }))
                            }
                            error={fieldErrors.email}
                          />
                          <InputField
                            id="phone"
                            label="No. HP"
                            type="tel"
                            placeholder="08123456789 (opsional)"
                            value={tutorForm.phone}
                            onChange={(v) =>
                              setTutorForm((f) => ({ ...f, phone: v }))
                            }
                            error={fieldErrors.phone}
                          />
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor="subject_names"
                              className="text-[13px] font-semibold text-[#444]"
                            >
                              Mata Pelajaran{" "}
                              <span className="text-red-400">*</span>
                            </label>
                            <input
                              id="subject_names"
                              type="text"
                              placeholder="Matematika, Fisika, Kimia"
                              value={tutorForm.subject_names}
                              onChange={(e) =>
                                setTutorForm((f) => ({
                                  ...f,
                                  subject_names: e.target.value,
                                }))
                              }
                              className={cn(
                                "w-full rounded-xl border px-4 py-2.5 text-sm text-[#111] placeholder:text-[#C0C0C0]",
                                "focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all duration-200",
                                fieldErrors.subject_names
                                  ? "border-red-300 bg-red-50/50"
                                  : "border-[#E0E0E0] bg-[#FAFAFA] hover:border-[#CCC]"
                              )}
                            />
                            {fieldErrors.subject_names ? (
                              <p className="text-xs text-red-500 mt-0.5">
                                {fieldErrors.subject_names}
                              </p>
                            ) : (
                              <p className="text-xs text-[#BBB] mt-0.5">
                                Pisahkan dengan koma
                              </p>
                            )}
                          </div>
                          <InputField
                            id="experience_years"
                            label="Pengalaman Mengajar (tahun)"
                            type="number"
                            placeholder="Contoh: 3 (opsional)"
                            value={tutorForm.experience_years}
                            onChange={(v) =>
                              setTutorForm((f) => ({
                                ...f,
                                experience_years: v,
                              }))
                            }
                            error={fieldErrors.experience_years}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Error alert */}
                  <AnimatePresence>
                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4"
                      >
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700">{submitError}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit button */}
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200",
                        isSubmitting
                          ? "bg-accent-400 cursor-not-allowed"
                          : "bg-accent-600 hover:bg-accent-700 active:scale-[0.98] shadow-lg shadow-accent-600/20 hover:shadow-xl hover:shadow-accent-600/30"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          Kirim Pendaftaran
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                    <p className="mt-4 text-center text-xs text-[#BBB]">
                      Dengan mendaftar, Anda menyetujui bahwa data yang
                      dimasukkan adalah benar.
                    </p>
                  </div>
                </form>

                <div className="mt-8 text-center lg:hidden">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-accent-600 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Kembali ke Beranda
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
