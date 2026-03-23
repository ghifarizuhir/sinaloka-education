import api from '@/src/lib/api';
import type {
  AcademicYear,
  Semester,
  SemesterDetail,
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateSemesterDto,
  UpdateSemesterDto,
  RollOverDto,
  RollOverResult,
} from '@/src/types/academic-year';

export const academicYearService = {
  getAll: (params?: { status?: string }) =>
    api.get<AcademicYear[]>('/api/admin/academic-years', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<AcademicYear>(`/api/admin/academic-years/${id}`).then((r) => r.data),
  create: (data: CreateAcademicYearDto) =>
    api.post<AcademicYear>('/api/admin/academic-years', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateAcademicYearDto }) =>
    api.patch<AcademicYear>(`/api/admin/academic-years/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/academic-years/${id}`),
  getSemester: (id: string) =>
    api.get<SemesterDetail>(`/api/admin/semesters/${id}`).then((r) => r.data),
  createSemester: ({ yearId, data }: { yearId: string; data: CreateSemesterDto }) =>
    api.post<Semester>(`/api/admin/academic-years/${yearId}/semesters`, data).then((r) => r.data),
  updateSemester: ({ id, data }: { id: string; data: UpdateSemesterDto }) =>
    api.patch<Semester>(`/api/admin/semesters/${id}`, data).then((r) => r.data),
  removeSemester: (id: string) =>
    api.delete(`/api/admin/semesters/${id}`),
  archiveSemester: (id: string) =>
    api.patch(`/api/admin/semesters/${id}/archive`).then((r) => r.data),
  rollOver: ({ id, data }: { id: string; data: RollOverDto }) =>
    api.post<RollOverResult>(`/api/admin/semesters/${id}/roll-over`, data).then((r) => r.data),
};
