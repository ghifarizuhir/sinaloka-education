import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { GraduationCap, BookOpen, ArrowLeft, CheckCircle, AlertCircle, Loader2, ChevronRight } from "lucide-react";
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
type PageState = "loading" | "error" | "closed" | "role-select" | "form" | "success";

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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#333]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border px-4 py-2.5 text-sm text-[#111] placeholder:text-[#BBB]",
          "focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors",
          error ? "border-red-400 bg-red-50" : "border-[#E5E5E5] bg-white"
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#E5E5E5] animate-pulse" />
          <div className="w-48 h-6 rounded-lg bg-[#E5E5E5] animate-pulse" />
          <div className="w-32 h-4 rounded-lg bg-[#E5E5E5] animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4 shadow-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="w-24 h-3 rounded bg-[#E5E5E5] animate-pulse" />
              <div className="w-full h-10 rounded-lg bg-[#E5E5E5] animate-pulse" />
            </div>
          ))}
          <div className="w-full h-12 rounded-lg bg-[#E5E5E5] animate-pulse mt-2" />
        </div>
      </div>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ institution }: { institution: InstitutionInfo | null }) {
  if (!institution) return null;

  return (
    <div className="flex flex-col items-center gap-3 text-center mb-8">
      {institution.logo_url ? (
        <img
          src={institution.logo_url}
          alt={institution.name}
          className="w-16 h-16 rounded-2xl object-cover border border-[#E5E5E5] shadow-sm"
        />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-accent-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-2xl font-extrabold">
            {institution.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold text-[#111]">{institution.name}</h1>
        <p className="text-sm text-[#999] mt-0.5">Formulir Pendaftaran</p>
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

  // Student form state
  const [studentForm, setStudentForm] = useState<StudentFormData>({
    name: "",
    grade: "",
    parent_name: "",
    parent_phone: "",
    email: "",
    phone: "",
    parent_email: "",
  });

  // Tutor form state
  const [tutorForm, setTutorForm] = useState<TutorFormData>({
    name: "",
    email: "",
    phone: "",
    subject_names: "",
    experience_years: "",
  });

  // Field errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch institution info on mount
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

        // If only one role is enabled, skip role-select and go straight to form
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
      .catch((err) => {
        if (err.response?.status === 404) {
          setPageState("error");
        } else {
          setPageState("error");
        }
      });
  }, [slug]);

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateStudent(): boolean {
    const errors: Record<string, string> = {};
    if (!studentForm.name.trim()) errors.name = "Nama wajib diisi";
    if (!studentForm.grade.trim()) errors.grade = "Kelas wajib diisi";
    if (!studentForm.parent_name.trim()) errors.parent_name = "Nama orang tua wajib diisi";
    if (!studentForm.parent_phone.trim()) errors.parent_phone = "No. HP orang tua wajib diisi";
    if (studentForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.email)) {
      errors.email = "Format email tidak valid";
    }
    if (studentForm.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.parent_email)) {
      errors.parent_email = "Format email tidak valid";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateTutor(): boolean {
    const errors: Record<string, string> = {};
    if (!tutorForm.name.trim()) errors.name = "Nama wajib diisi";
    if (!tutorForm.email.trim()) errors.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutorForm.email)) {
      errors.email = "Format email tidak valid";
    }
    if (!tutorForm.subject_names.trim()) errors.subject_names = "Mata pelajaran wajib diisi";
    if (
      tutorForm.experience_years &&
      (isNaN(Number(tutorForm.experience_years)) || Number(tutorForm.experience_years) < 0)
    ) {
      errors.experience_years = "Masukkan angka yang valid";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const isValid = selectedRole === "student" ? validateStudent() : validateTutor();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      if (selectedRole === "student") {
        const payload = {
          name: studentForm.name.trim(),
          grade: studentForm.grade.trim(),
          parent_name: studentForm.parent_name.trim(),
          parent_phone: studentForm.parent_phone.trim(),
          ...(studentForm.email.trim() && { email: studentForm.email.trim() }),
          ...(studentForm.phone.trim() && { phone: studentForm.phone.trim() }),
          ...(studentForm.parent_email.trim() && { parent_email: studentForm.parent_email.trim() }),
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
      const axiosErr = err as { response?: { status: number; data?: { message?: string } } };
      const status = axiosErr.response?.status;
      if (status === 409) {
        setSubmitError("Data dengan email atau nomor HP ini sudah terdaftar.");
      } else if (status === 429) {
        setSubmitError("Terlalu banyak percobaan. Coba lagi beberapa saat.");
      } else if (status === 400) {
        const msg = axiosErr.response?.data?.message;
        setSubmitError(typeof msg === "string" ? msg : "Data yang dimasukkan tidak valid.");
      } else {
        setSubmitError("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render states ────────────────────────────────────────────────────────────

  if (pageState === "loading") return <LoadingSkeleton />;

  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-[#111] mb-2">Institusi Tidak Ditemukan</h1>
          <p className="text-sm text-[#666] mb-8 leading-relaxed">
            Tautan pendaftaran ini tidak valid atau sudah tidak aktif.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
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
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          {institution && <PageHeader institution={institution} />}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-[#111] mb-2">Pendaftaran Ditutup</h2>
            <p className="text-sm text-[#666] leading-relaxed">
              Pendaftaran sedang ditutup sementara. Hubungi pihak institusi untuk informasi lebih
              lanjut.
            </p>
          </div>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#999] hover:text-accent-600 transition-colors"
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
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm text-center"
        >
          {institution && <PageHeader institution={institution} />}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-8 shadow-sm">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle className="w-9 h-9 text-emerald-500" />
            </motion.div>
            <h2 className="text-xl font-bold text-[#111] mb-3">Pendaftaran Berhasil!</h2>
            <p className="text-sm text-[#666] leading-relaxed">
              Terima kasih telah mendaftar. Admin akan meninjau data Anda dan menghubungi Anda
              segera.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (pageState === "role-select" && institution) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <PageHeader institution={institution} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {institution?.student_enabled && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => {
                  setSelectedRole("student");
                  setPageState("form");
                }}
                className="group bg-white border-2 border-[#E5E5E5] hover:border-accent-500 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-md cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-50 group-hover:bg-accent-100 flex items-center justify-center mb-4 transition-colors">
                  <GraduationCap className="w-6 h-6 text-accent-600" />
                </div>
                <div className="font-semibold text-[#111] mb-1">Daftar sebagai Murid</div>
                <div className="text-xs text-[#999] leading-relaxed">
                  Bergabung sebagai siswa di institusi ini
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Pilih <ChevronRight size={14} />
                </div>
              </motion.button>
            )}

            {institution?.tutor_enabled && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => {
                  setSelectedRole("tutor");
                  setPageState("form");
                }}
                className="group bg-white border-2 border-[#E5E5E5] hover:border-accent-500 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-md cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-50 group-hover:bg-accent-100 flex items-center justify-center mb-4 transition-colors">
                  <BookOpen className="w-6 h-6 text-accent-600" />
                </div>
                <div className="font-semibold text-[#111] mb-1">Daftar sebagai Tutor</div>
                <div className="text-xs text-[#999] leading-relaxed">
                  Bergabung sebagai pengajar di institusi ini
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Pilih <ChevronRight size={14} />
                </div>
              </motion.button>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-accent-600 transition-colors"
            >
              <ArrowLeft size={14} />
              Kembali ke Beranda
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────────

  const isStudent = selectedRole === "student";

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md mx-auto"
      >
        {institution && <PageHeader institution={institution} />}

        {/* Role badge + back */}
        <div className="flex items-center justify-between mb-5">
          <div className="inline-flex items-center gap-2 bg-accent-50 border border-accent-100 text-accent-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            {isStudent ? (
              <GraduationCap size={13} />
            ) : (
              <BookOpen size={13} />
            )}
            {isStudent ? "Pendaftaran Murid" : "Pendaftaran Tutor"}
          </div>

          {/* Show back to role-select only if both roles were enabled */}
          {institution?.student_enabled && institution?.tutor_enabled && (
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

        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-4">
              {/* ── Student fields ─────────────────────────── */}
              <AnimatePresence mode="wait">
                {isStudent ? (
                  <motion.div
                    key="student-fields"
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
                      onChange={(v) => setStudentForm((f) => ({ ...f, name: v }))}
                      error={fieldErrors.name}
                    />
                    <InputField
                      id="grade"
                      label="Kelas / Jenjang"
                      required
                      placeholder="Contoh: Kelas 10 SMA"
                      value={studentForm.grade}
                      onChange={(v) => setStudentForm((f) => ({ ...f, grade: v }))}
                      error={fieldErrors.grade}
                    />

                    <div className="border-t border-[#F0F0F0] pt-4">
                      <p className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-3">
                        Data Orang Tua / Wali
                      </p>
                      <div className="space-y-4">
                        <InputField
                          id="parent_name"
                          label="Nama Orang Tua / Wali"
                          required
                          placeholder="Nama lengkap orang tua"
                          value={studentForm.parent_name}
                          onChange={(v) => setStudentForm((f) => ({ ...f, parent_name: v }))}
                          error={fieldErrors.parent_name}
                        />
                        <InputField
                          id="parent_phone"
                          label="No. HP Orang Tua"
                          required
                          type="tel"
                          placeholder="Contoh: 08123456789"
                          value={studentForm.parent_phone}
                          onChange={(v) => setStudentForm((f) => ({ ...f, parent_phone: v }))}
                          error={fieldErrors.parent_phone}
                        />
                        <InputField
                          id="parent_email"
                          label="Email Orang Tua"
                          type="email"
                          placeholder="email@contoh.com (opsional)"
                          value={studentForm.parent_email}
                          onChange={(v) => setStudentForm((f) => ({ ...f, parent_email: v }))}
                          error={fieldErrors.parent_email}
                        />
                      </div>
                    </div>

                    <div className="border-t border-[#F0F0F0] pt-4">
                      <p className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-3">
                        Kontak Siswa (Opsional)
                      </p>
                      <div className="space-y-4">
                        <InputField
                          id="email"
                          label="Email Siswa"
                          type="email"
                          placeholder="email@contoh.com"
                          value={studentForm.email}
                          onChange={(v) => setStudentForm((f) => ({ ...f, email: v }))}
                          error={fieldErrors.email}
                        />
                        <InputField
                          id="phone"
                          label="No. HP Siswa"
                          type="tel"
                          placeholder="Contoh: 08123456789"
                          value={studentForm.phone}
                          onChange={(v) => setStudentForm((f) => ({ ...f, phone: v }))}
                          error={fieldErrors.phone}
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* ── Tutor fields ──────────────────────────── */
                  <motion.div
                    key="tutor-fields"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <InputField
                      id="name"
                      label="Nama Lengkap"
                      required
                      placeholder="Nama lengkap tutor"
                      value={tutorForm.name}
                      onChange={(v) => setTutorForm((f) => ({ ...f, name: v }))}
                      error={fieldErrors.name}
                    />
                    <InputField
                      id="email"
                      label="Email"
                      required
                      type="email"
                      placeholder="email@contoh.com"
                      value={tutorForm.email}
                      onChange={(v) => setTutorForm((f) => ({ ...f, email: v }))}
                      error={fieldErrors.email}
                    />
                    <InputField
                      id="phone"
                      label="No. HP"
                      type="tel"
                      placeholder="Contoh: 08123456789 (opsional)"
                      value={tutorForm.phone}
                      onChange={(v) => setTutorForm((f) => ({ ...f, phone: v }))}
                      error={fieldErrors.phone}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="subject_names" className="text-sm font-medium text-[#333]">
                        Mata Pelajaran <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="subject_names"
                        type="text"
                        placeholder="Contoh: Matematika, Fisika, Kimia"
                        value={tutorForm.subject_names}
                        onChange={(e) =>
                          setTutorForm((f) => ({ ...f, subject_names: e.target.value }))
                        }
                        className={cn(
                          "w-full rounded-lg border px-4 py-2.5 text-sm text-[#111] placeholder:text-[#BBB]",
                          "focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors",
                          fieldErrors.subject_names
                            ? "border-red-400 bg-red-50"
                            : "border-[#E5E5E5] bg-white"
                        )}
                      />
                      {fieldErrors.subject_names ? (
                        <p className="text-xs text-red-500">{fieldErrors.subject_names}</p>
                      ) : (
                        <p className="text-xs text-[#BBB]">
                          Pisahkan beberapa mata pelajaran dengan koma
                        </p>
                      )}
                    </div>
                    <InputField
                      id="experience_years"
                      label="Pengalaman Mengajar (tahun)"
                      type="number"
                      placeholder="Contoh: 3 (opsional)"
                      value={tutorForm.experience_years}
                      onChange={(v) => setTutorForm((f) => ({ ...f, experience_years: v }))}
                      error={fieldErrors.experience_years}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Error alert ─────────────────────────────── */}
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mx-6 mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit button ────────────────────────────── */}
            <div className="px-6 pb-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all",
                  isSubmitting
                    ? "bg-accent-400 cursor-not-allowed"
                    : "bg-accent-600 hover:bg-accent-700 active:scale-[0.98]"
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
              <p className="mt-3 text-center text-xs text-[#BBB] leading-relaxed">
                Dengan mendaftar, Anda menyetujui bahwa data yang dimasukkan adalah benar.
              </p>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#999] hover:text-accent-600 transition-colors"
          >
            <ArrowLeft size={14} />
            Kembali ke Beranda
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
