export interface DashboardStats {
  total_students: number;
  active_tutors: number;
  total_revenue: number;
  attendance_rate: number;
  upcoming_sessions: number;
}

export interface ActivityItem {
  type: 'enrollment' | 'payment' | 'attendance';
  description: string;
  created_at: string;
}
