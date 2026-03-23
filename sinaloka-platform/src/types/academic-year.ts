export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'ARCHIVED';
  semesters: Semester[];
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'ARCHIVED';
  _count?: { classes: number };
  created_at: string;
  updated_at: string;
}

export interface SemesterDetail extends Semester {
  academic_year: AcademicYear;
  classes: SemesterClass[];
}

export interface SemesterClass {
  id: string;
  name: string;
  subject: { id: string; name: string };
  tutor: { id: string; user: { name: string } };
  capacity: number;
  fee: number;
  status: 'ACTIVE' | 'ARCHIVED';
  _count: { enrollments: number };
}

export interface CreateAcademicYearDto {
  name: string;
  start_date: string;
  end_date: string;
}

export type UpdateAcademicYearDto = Partial<CreateAcademicYearDto>;

export interface CreateSemesterDto {
  name: string;
  start_date: string;
  end_date: string;
}

export type UpdateSemesterDto = Partial<CreateSemesterDto>;

export interface RollOverDto {
  source_semester_id: string;
  class_ids?: string[];
}

export interface RollOverResult {
  created_count: number;
  skipped_count: number;
}
