import type { PaginationParams } from './common';

export type ScheduleDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Class {
  id: string;
  name: string;
  subject: string;
  capacity: number;
  fee: number;
  schedule_days: ScheduleDay[];
  schedule_start_time: string;
  schedule_end_time: string;
  room: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  tutor_id: string;
  tutor?: { id: string; name: string };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClassDto {
  tutor_id: string;
  name: string;
  subject: string;
  capacity: number;
  fee: number;
  schedule_days: ScheduleDay[];
  schedule_start_time: string;
  schedule_end_time: string;
  room?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

export type UpdateClassDto = Partial<CreateClassDto>;

export interface ClassQueryParams extends PaginationParams {
  subject?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}
