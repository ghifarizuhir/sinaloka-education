import type { PaginationParams } from './common';

export type ScheduleDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface ClassScheduleItem {
  id?: string;
  day: ScheduleDay;
  start_time: string;
  end_time: string;
}

export interface Class {
  id: string;
  name: string;
  subject_id: string;
  subject: { id: string; name: string };
  capacity: number;
  fee: number;
  package_fee: number | null;
  tutor_fee: number;
  tutor_fee_mode: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY';
  tutor_fee_per_student: number | null;
  schedules: ClassScheduleItem[];
  room: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  tutor_id: string;
  enrolled_count?: number;
  tutor?: { id: string; name: string };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClassDto {
  tutor_id: string;
  name: string;
  subject_id: string;
  capacity: number;
  fee: number;
  package_fee?: number | null;
  tutor_fee: number;
  tutor_fee_mode?: 'FIXED_PER_SESSION' | 'PER_STUDENT_ATTENDANCE' | 'MONTHLY_SALARY';
  tutor_fee_per_student?: number | null;
  schedules: { day: ScheduleDay; start_time: string; end_time: string }[];
  room?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export type UpdateClassDto = Partial<CreateClassDto>;

export interface ClassQueryParams extends PaginationParams {
  subject?: string;
  tutor_id?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export interface ClassDetail extends Class {
  enrolled_count: number;
  enrollments: {
    id: string;
    status: string;
    student: { id: string; name: string; grade: string; status: string };
  }[];
  tutor?: { id: string; name: string; email?: string };
}
