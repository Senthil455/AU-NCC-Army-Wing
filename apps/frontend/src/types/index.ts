export type Role = 'SUPER_ADMIN' | 'OFFICER_ANO_CTO' | 'LEADER_SUO' | 'CADET';

export interface User {
  id: string;
  name: string;
  email: string;
  regdNo: string | null;
  role: Role;
}

export interface Cadet {
  id: string;
  name: string;
  regdNo: string;
  nccRegimentalNo?: string | null;
  rank: string;
  department: string;
  year: number;
  batch: string;
  platoon: string;
  bloodGroup?: string | null;
  phone?: string | null;
  email?: string | null;
  certificate: 'NONE' | 'A' | 'B' | 'C';
  attendancePct: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'URGENT' | 'GENERAL';
  createdAt: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  type: string;
  platoon?: string | null;
  location?: string | null;
}
