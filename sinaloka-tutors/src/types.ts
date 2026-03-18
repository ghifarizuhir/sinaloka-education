export type PayoutStatus = 'pending' | 'paid';

export interface Payout {
  id: string;
  amount: number;
  date: string;
  status: PayoutStatus;
  proofUrl?: string;
  description: string;
}

export type ClassStatus = 'upcoming' | 'completed' | 'cancelled' | 'rescheduled';

export interface Student {
  id: string;
  name: string;
  grade?: string;
  attendance?: 'P' | 'A' | 'L'; // Present, Absent, Late
  homeworkDone?: boolean;
  note?: string;
}

export interface ClassSchedule {
  id: string;
  subject: string;
  date: string; // ISO string
  startTime: string; // e.g., "14:00"
  endTime: string; // e.g., "15:30"
  status: ClassStatus;
  students: Student[];
  location: string;
  topicCovered?: string;
  sessionSummary?: string;
  notes?: string;
}

export interface TutorSubject {
  subject: {
    id: string;
    name: string;
  };
}

export interface TutorProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tutor_subjects: TutorSubject[];
  rating: number;
}
