import { useEffect, useState, type FormEvent } from 'react';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { registrationService } from '@/src/services/registration.service';

type Role = 'student' | 'tutor';
type PageState = 'loading' | 'error' | 'closed' | 'no-slug' | 'role-select' | 'form' | 'success';

interface InstitutionInfo {
  name: string;
  logo_url: string | null;
  slug: string;
  student_enabled: boolean;
  tutor_enabled: boolean;
}

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

const INITIAL_STUDENT_FORM: StudentFormData = {
  name: '', grade: '', parent_name: '', parent_phone: '',
  email: '', phone: '', parent_email: '',
};

const INITIAL_TUTOR_FORM: TutorFormData = {
  name: '', email: '', phone: '', subject_names: '', experience_years: '',
};

export function useRegisterPage() {
  const { slug } = useInstitution();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [regInfo, setRegInfo] = useState<InstitutionInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentForm, setStudentForm] = useState<StudentFormData>(INITIAL_STUDENT_FORM);
  const [tutorForm, setTutorForm] = useState<TutorFormData>(INITIAL_TUTOR_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) {
      setPageState('no-slug');
      return;
    }

    registrationService.getRegistrationInfo(slug)
      .then((res) => {
        const info: InstitutionInfo = {
          name: res.institution.name,
          logo_url: res.institution.logo_url,
          slug: res.institution.slug,
          student_enabled: res.registration.student_enabled,
          tutor_enabled: res.registration.tutor_enabled,
        };
        setRegInfo(info);

        if (!info.student_enabled && !info.tutor_enabled) {
          setPageState('closed');
        } else if (info.student_enabled && !info.tutor_enabled) {
          setSelectedRole('student');
          setPageState('form');
        } else if (!info.student_enabled && info.tutor_enabled) {
          setSelectedRole('tutor');
          setPageState('form');
        } else {
          setPageState('role-select');
        }
      })
      .catch(() => {
        setPageState('error');
      });
  }, [slug]);

  function validateStudent(): boolean {
    const errors: Record<string, string> = {};
    if (!studentForm.name.trim()) errors.name = 'Nama wajib diisi';
    if (!studentForm.grade.trim()) errors.grade = 'Kelas wajib diisi';
    if (!studentForm.parent_name.trim()) errors.parent_name = 'Nama orang tua wajib diisi';
    if (!studentForm.parent_phone.trim()) errors.parent_phone = 'No. HP orang tua wajib diisi';
    if (!studentForm.email.trim()) errors.email = 'Email siswa wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.email)) errors.email = 'Format email tidak valid';
    if (studentForm.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.parent_email))
      errors.parent_email = 'Format email tidak valid';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateTutor(): boolean {
    const errors: Record<string, string> = {};
    if (!tutorForm.name.trim()) errors.name = 'Nama wajib diisi';
    if (!tutorForm.email.trim()) errors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutorForm.email)) errors.email = 'Format email tidak valid';
    if (!tutorForm.subject_names.trim()) errors.subject_names = 'Mata pelajaran wajib diisi';
    if (tutorForm.experience_years && (isNaN(Number(tutorForm.experience_years)) || Number(tutorForm.experience_years) < 0))
      errors.experience_years = 'Masukkan angka yang valid';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const isValid = selectedRole === 'student' ? validateStudent() : validateTutor();
    if (!isValid || !slug) return;

    setIsSubmitting(true);

    try {
      if (selectedRole === 'student') {
        const payload = {
          name: studentForm.name.trim(),
          grade: studentForm.grade.trim(),
          parent_name: studentForm.parent_name.trim(),
          parent_phone: studentForm.parent_phone.trim(),
          email: studentForm.email.trim(),
          ...(studentForm.phone.trim() && { phone: studentForm.phone.trim() }),
          ...(studentForm.parent_email.trim() && { parent_email: studentForm.parent_email.trim() }),
        };
        await registrationService.submitStudentRegistration(slug, payload);
      } else {
        const subjectList = tutorForm.subject_names.split(',').map((s) => s.trim()).filter(Boolean);
        const payload = {
          name: tutorForm.name.trim(),
          email: tutorForm.email.trim(),
          ...(tutorForm.phone.trim() && { phone: tutorForm.phone.trim() }),
          subject_names: subjectList,
          ...(tutorForm.experience_years.trim() && { experience_years: Number(tutorForm.experience_years) }),
        };
        await registrationService.submitTutorRegistration(slug, payload);
      }
      setPageState('success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data?: { message?: string } } };
      const status = axiosErr.response?.status;
      if (status === 409) {
        setSubmitError('Data dengan email ini sudah terdaftar.');
      } else if (status === 429) {
        setSubmitError('Terlalu banyak percobaan. Coba lagi beberapa saat.');
      } else if (status === 403) {
        setSubmitError('Pendaftaran saat ini tidak tersedia.');
      } else if (status === 400) {
        const msg = axiosErr.response?.data?.message;
        setSubmitError(typeof msg === 'string' ? msg : 'Data yang dimasukkan tidak valid.');
      } else {
        setSubmitError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectRole(role: Role) {
    setSelectedRole(role);
    setFieldErrors({});
    setSubmitError(null);
    setPageState('form');
  }

  function goBackToRoleSelect() {
    setSelectedRole(null);
    setFieldErrors({});
    setSubmitError(null);
    setPageState('role-select');
  }

  return {
    pageState,
    regInfo,
    selectedRole,
    submitError,
    isSubmitting,
    studentForm,
    setStudentForm,
    tutorForm,
    setTutorForm,
    fieldErrors,
    handleSubmit,
    selectRole,
    goBackToRoleSelect,
  };
}
