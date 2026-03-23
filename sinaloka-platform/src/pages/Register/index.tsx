import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, BookOpen, ArrowLeft, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { useRegisterPage } from './useRegisterPage';
import { Button } from '@/src/components/UI';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Card } from '@/src/components/ui/card';
import { cn } from '@/src/lib/utils';

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
  const {
    pageState, regInfo, selectedRole, submitError, isSubmitting,
    studentForm, setStudentForm, tutorForm, setTutorForm, fieldErrors,
    handleSubmit, selectRole, goBackToRoleSelect,
  } = useRegisterPage();

  // ── No-slug guard (SuperAdmin mode) ─────────────────────────────────────
  if (pageState === 'no-slug') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
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
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="w-24 h-3 rounded bg-muted animate-pulse" />
              <div className="w-full h-10 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Institusi Tidak Ditemukan</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Tautan pendaftaran ini tidak valid atau sudah tidak aktif.
          </p>
          <Link to="/welcome" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  // ── Closed ──────────────────────────────────────────────────────────────
  if (pageState === 'closed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Pendaftaran Ditutup</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Pendaftaran sedang ditutup sementara. Hubungi pihak{' '}
            {regInfo?.name ?? 'institusi'} untuk informasi lebih lanjut.
          </p>
          <Link to="/welcome" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Pendaftaran Berhasil!</h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Terima kasih telah mendaftar di{' '}
            <strong className="text-foreground">{regInfo?.name}</strong>. Admin akan meninjau data Anda dan menghubungi segera.
          </p>
          <Button onClick={() => navigate('/login')}>
            Masuk
          </Button>
        </div>
      </div>
    );
  }

  // ── Role select & Form ──────────────────────────────────────────────────
  const isStudent = selectedRole === 'student';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Institution header */}
        {regInfo && (
          <div className="text-center mb-8">
            {regInfo.logo_url ? (
              <img src={regInfo.logo_url} alt={regInfo.name} className="w-14 h-14 rounded-xl object-cover mx-auto mb-3" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3 text-primary-foreground text-xl font-bold">
                {regInfo.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-lg font-bold text-foreground">{regInfo.name}</h1>
            <p className="text-sm text-muted-foreground">Portal Registrasi</p>
          </div>
        )}

        {pageState === 'role-select' && regInfo ? (
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
                  onKeyDown={(e) => e.key === 'Enter' && selectRole('student')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-6 h-6 text-primary" />
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
                  onKeyDown={(e) => e.key === 'Enter' && selectRole('tutor')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-primary" />
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
        ) : pageState === 'form' ? (
          <Card>
            {/* Form header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                  'bg-primary/10 text-primary',
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
        ) : null}
      </div>
    </div>
  );
}
