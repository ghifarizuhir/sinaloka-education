import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap, BookOpen, ArrowLeft, CheckCircle, AlertCircle,
  Loader2, ChevronRight, CalendarCheck, Bell,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRegisterPage } from './useRegisterPage';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { TealBrandBackground } from '@/src/components/BrandDecorations';
import { SinalokaLogo } from '@/src/components/SinalokaLogo';
import { Button } from '@/src/components/UI';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Card } from '@/src/components/ui/card';
import { cn } from '@/src/lib/utils';

const FEATURE_ICONS = [CalendarCheck, BookOpen, Bell];
const FEATURE_KEYS = ['welcome.feature1', 'welcome.feature2', 'welcome.feature3'] as const;

function FormField({
  id, label, required, error, hint, children,
}: {
  id: string; label: string; required?: boolean; error?: string; hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { institution } = useInstitution();
  const { t } = useTranslation();
  const {
    pageState, regInfo, selectedRole, submitError, isSubmitting,
    studentForm, setStudentForm, tutorForm, setTutorForm, fieldErrors,
    handleSubmit, selectRole, goBackToRoleSelect,
  } = useRegisterPage();

  // ── No-slug guard (not on subdomain) ──────────────────────────────────
  if (pageState === 'no-slug') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Halaman Tidak Tersedia</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Halaman ini hanya tersedia dari subdomain institusi.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4" />
            Kembali
          </Button>
        </motion.div>
      </div>
    );
  }

  const isStudent = selectedRole === 'student';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ════════════════════════════════════════════
          BRAND SHOWCASE PANEL  (desktop only)
         ════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden select-none">
        <TealBrandBackground />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {institution ? (
            <>
              {institution.logo_url ? (
                <img
                  src={institution.logo_url}
                  alt={institution.name}
                  className="w-20 h-20 rounded-2xl mb-6 shadow-2xl object-cover ring-2 ring-white/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl text-white text-3xl font-bold ring-2 ring-white/20 bg-white/20 backdrop-blur-sm">
                  {institution.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight text-center">
                {institution.name}
              </h2>
              <p className="text-teal-100/60 text-base text-center max-w-sm leading-relaxed mt-1 mb-10">
                Portal Registrasi
              </p>

              <div className="space-y-4 w-full max-w-xs">
                {FEATURE_KEYS.map((key, i) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <motion.div
                      key={key}
                      className="flex items-center gap-3.5"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-amber-300/90" />
                      </div>
                      <span className="text-sm text-white/80">{t(key)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <SinalokaLogo size={88} className="mb-7 shadow-2xl" />
              <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
                Sinaloka
              </h2>
              <p className="text-teal-100/70 text-lg text-center max-w-md leading-relaxed mb-12">
                {t('login.tagline')}
              </p>
              <div className="space-y-4 w-full max-w-xs">
                {FEATURE_KEYS.map((key, i) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <motion.div
                      key={key}
                      className="flex items-center gap-3.5"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-amber-300/90" />
                      </div>
                      <span className="text-sm text-white/80">{t(key)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p className="absolute bottom-5 left-0 right-0 text-center text-[11px] text-white/20 tracking-wide">
          {t('login.poweredBy')}
        </p>
      </div>

      {/* ════════════════════════════════════════════
          REGISTRATION FORM PANEL
         ════════════════════════════════════════════ */}
      <div className="w-full lg:w-[48%] flex flex-col bg-zinc-50 dark:bg-zinc-950 relative min-h-screen lg:min-h-0 lg:overflow-y-auto">
        {/* Soft ambient blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-primary/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full p-4 sm:p-8 py-8 sm:py-12">
          <motion.div
            className="relative w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* ── Branding header ── */}
            <div className="flex flex-col items-center mb-8 lg:mb-7">
              {/* Mobile: shows full branding since brand panel is hidden */}
              <div className="lg:hidden flex flex-col items-center">
                {institution ? (
                  <>
                    {institution.logo_url ? (
                      <img
                        src={institution.logo_url}
                        alt={institution.name}
                        className="w-14 h-14 rounded-xl mb-4 shadow-lg object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg text-white text-xl font-bold bg-[#0f766e]">
                        {institution.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {institution.name}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Portal Registrasi
                    </p>
                  </>
                ) : (
                  <>
                    <SinalokaLogo size={56} className="mb-4 shadow-lg" />
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      Daftar
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Buat akun baru
                    </p>
                  </>
                )}
              </div>

              {/* Desktop: text-only header (logo lives in brand panel) */}
              <div className="hidden lg:flex lg:flex-col lg:items-center">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {institution ? institution.name : 'Daftar'}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Portal Registrasi
                </p>
              </div>
            </div>

            {/* ── Loading ── */}
            {pageState === 'loading' && (
              <Card className="px-8 py-8">
                <div className="space-y-5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="w-24 h-3 rounded bg-muted animate-pulse" />
                      <div className="w-full h-10 rounded-lg bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Error ── */}
            {pageState === 'error' && (
              <Card className="px-8 py-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Institusi Tidak Ditemukan</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Tautan pendaftaran ini tidak valid atau sudah tidak aktif.
                  </p>
                  <Link to="/welcome" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    <ArrowLeft className="size-4" />
                    Kembali
                  </Link>
                </div>
              </Card>
            )}

            {/* ── Closed ── */}
            {pageState === 'closed' && (
              <Card className="px-8 py-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Pendaftaran Ditutup</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Pendaftaran sedang ditutup sementara. Hubungi pihak{' '}
                    {regInfo?.name ?? 'institusi'} untuk informasi lebih lanjut.
                  </p>
                  <Link to="/welcome" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    <ArrowLeft className="size-4" />
                    Kembali
                  </Link>
                </div>
              </Card>
            )}

            {/* ── Success ── */}
            {pageState === 'success' && (
              <Card className="px-8 py-8">
                <div className="text-center">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">Pendaftaran Berhasil!</h2>
                  <p className="text-muted-foreground leading-relaxed mb-8">
                    Terima kasih telah mendaftar di{' '}
                    <strong className="text-foreground">{regInfo?.name}</strong>. Admin akan meninjau data Anda dan menghubungi segera.
                  </p>
                  <Button onClick={() => navigate('/login')}>
                    Masuk
                  </Button>
                </div>
              </Card>
            )}

            {/* ── Role Select ── */}
            {pageState === 'role-select' && regInfo && (
              <div>
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-bold text-foreground mb-1">Pilih jenis pendaftaran</h2>
                  <p className="text-sm text-muted-foreground">Silakan pilih peran Anda untuk melanjutkan.</p>
                </div>

                <div className="space-y-3">
                  {regInfo.student_enabled && (
                    <Card
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => selectRole('student')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectRole('student');
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#0f766e]/10 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-6 h-6 text-[#0f766e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">Daftar sebagai Murid</div>
                          <div className="text-sm text-muted-foreground">Bergabung sebagai siswa di institusi ini</div>
                        </div>
                        <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  )}

                  {regInfo.tutor_enabled && (
                    <Card
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => selectRole('tutor')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectRole('tutor');
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#0f766e]/10 flex items-center justify-center shrink-0">
                          <BookOpen className="w-6 h-6 text-[#0f766e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">Daftar sebagai Tutor</div>
                          <div className="text-sm text-muted-foreground">Bergabung sebagai pengajar di institusi ini</div>
                        </div>
                        <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <Link to="/welcome" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-4" />
                    Kembali
                  </Link>
                </div>
              </div>
            )}

            {/* ── Registration Form ── */}
            {pageState === 'form' && (
              <Card className="px-6 sm:px-8 py-8">
                {/* Form header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                      'bg-[#0f766e]/10 text-[#0f766e]',
                    )}>
                      {isStudent ? <GraduationCap className="size-3.5" /> : <BookOpen className="size-3.5" />}
                      {isStudent ? 'Registrasi Murid' : 'Registrasi Tutor'}
                    </span>

                    {regInfo?.student_enabled && regInfo?.tutor_enabled && (
                      <button
                        type="button"
                        onClick={goBackToRoleSelect}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <ArrowLeft className="size-3" />
                        Ganti peran
                      </button>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {isStudent ? 'Formulir Pendaftaran Murid' : 'Formulir Pendaftaran Tutor'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Lengkapi data berikut. Kolom bertanda <span className="text-destructive">*</span> wajib diisi.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate>
                  <div className="space-y-4">
                    {isStudent ? (
                      <>
                        <FormField id="name" label="Nama Lengkap" required error={fieldErrors.name}>
                          <Input id="name" placeholder="Nama lengkap siswa" value={studentForm.name}
                            onChange={(e) => setStudentForm((f) => ({ ...f, name: e.target.value }))} />
                        </FormField>
                        <FormField id="grade" label="Kelas / Jenjang" required error={fieldErrors.grade}>
                          <Input id="grade" placeholder="Contoh: Kelas 10 SMA" value={studentForm.grade}
                            onChange={(e) => setStudentForm((f) => ({ ...f, grade: e.target.value }))} />
                        </FormField>

                        <div className="border-t border-border pt-4 mt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Data Orang Tua / Wali</p>
                          <div className="space-y-4">
                            <FormField id="parent_name" label="Nama Orang Tua / Wali" required error={fieldErrors.parent_name}>
                              <Input id="parent_name" placeholder="Nama lengkap" value={studentForm.parent_name}
                                onChange={(e) => setStudentForm((f) => ({ ...f, parent_name: e.target.value }))} />
                            </FormField>
                            <FormField id="parent_phone" label="No. HP Orang Tua" required error={fieldErrors.parent_phone}>
                              <Input id="parent_phone" type="tel" placeholder="08123456789" value={studentForm.parent_phone}
                                onChange={(e) => setStudentForm((f) => ({ ...f, parent_phone: e.target.value }))} />
                            </FormField>
                            <FormField id="parent_email" label="Email Orang Tua" error={fieldErrors.parent_email}>
                              <Input id="parent_email" type="email" placeholder="email@contoh.com (opsional)" value={studentForm.parent_email}
                                onChange={(e) => setStudentForm((f) => ({ ...f, parent_email: e.target.value }))} />
                            </FormField>
                          </div>
                        </div>

                        <div className="border-t border-border pt-4 mt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Kontak Siswa</p>
                          <div className="space-y-4">
                            <FormField id="email" label="Email Siswa" required error={fieldErrors.email}>
                              <Input id="email" type="email" placeholder="email@contoh.com" value={studentForm.email}
                                onChange={(e) => setStudentForm((f) => ({ ...f, email: e.target.value }))} />
                            </FormField>
                            <FormField id="phone" label="No. HP Siswa" error={fieldErrors.phone}>
                              <Input id="phone" type="tel" placeholder="08123456789 (opsional)" value={studentForm.phone}
                                onChange={(e) => setStudentForm((f) => ({ ...f, phone: e.target.value }))} />
                            </FormField>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <FormField id="name" label="Nama Lengkap" required error={fieldErrors.name}>
                          <Input id="name" placeholder="Nama lengkap" value={tutorForm.name}
                            onChange={(e) => setTutorForm((f) => ({ ...f, name: e.target.value }))} />
                        </FormField>
                        <FormField id="email" label="Email" required error={fieldErrors.email}>
                          <Input id="email" type="email" placeholder="email@contoh.com" value={tutorForm.email}
                            onChange={(e) => setTutorForm((f) => ({ ...f, email: e.target.value }))} />
                        </FormField>
                        <FormField id="phone" label="No. HP" error={fieldErrors.phone}>
                          <Input id="phone" type="tel" placeholder="08123456789 (opsional)" value={tutorForm.phone}
                            onChange={(e) => setTutorForm((f) => ({ ...f, phone: e.target.value }))} />
                        </FormField>
                        <FormField id="subject_names" label="Mata Pelajaran" required error={fieldErrors.subject_names} hint="Pisahkan dengan koma">
                          <Input id="subject_names" placeholder="Matematika, Fisika, Kimia" value={tutorForm.subject_names}
                            onChange={(e) => setTutorForm((f) => ({ ...f, subject_names: e.target.value }))} />
                        </FormField>
                        <FormField id="experience_years" label="Pengalaman Mengajar (tahun)" error={fieldErrors.experience_years}>
                          <Input id="experience_years" type="number" placeholder="Contoh: 3 (opsional)" value={tutorForm.experience_years}
                            onChange={(e) => setTutorForm((f) => ({ ...f, experience_years: e.target.value }))} />
                        </FormField>
                      </>
                    )}
                  </div>

                  {/* Error alert */}
                  {submitError && (
                    <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{submitError}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="mt-6">
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          Kirim Pendaftaran
                          <ChevronRight className="size-4" />
                        </>
                      )}
                    </Button>
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Dengan mendaftar, Anda menyetujui bahwa data yang dimasukkan adalah benar.
                    </p>
                  </div>
                </form>
              </Card>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-6">
              {t('login.copyright', { year: new Date().getFullYear() })}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
