export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface Student {
  id: number;
  userId: number;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  semester: number;
}

export interface Teacher {
  id: number;
  userId: number;
  name: string;
  email: string;
  employeeId: string;
  department: string;
}

export interface Course {
  id: number;
  courseCode: string;
  courseName: string;
  semester: number;
  enrolledStudentsCount?: number;
}

export interface Enrollment {
  id: number;
  studentId: number;
  courseId: number;
  studentName?: string;
  rollNumber?: string;
  courseName?: string;
  courseCode?: string;
  enrolledAt?: string;
}

export interface TeacherCourse {
  id: number;
  teacherId: number;
  courseId: number;
  teacherName?: string;
  courseName?: string;
  courseCode?: string;
}

export interface AttendanceSession {
  id: number;
  courseId: number;
  teacherId: number;
  courseName: string;
  courseCode: string;
  teacherName: string;
  sessionCode: string;
  startTime: string;
  endTime?: string | null;
  active: boolean;
  rssiThreshold: number; // e.g. -70
  enrolledCount?: number;
  presentCount?: number;
}

export type AttendanceStatus = 'PRESENT' | 'REJECTED_WEAK_SIGNAL' | 'ALREADY_MARKED';

export interface AttendanceRecord {
  id: number;
  attendanceSessionId: number;
  studentId: number;
  studentName: string;
  rollNumber: string;
  timestamp: string;
  rssi: number;
  status: AttendanceStatus;
}

export interface AuthResponse {
  token: string;
  role: UserRole;
  name: string;
  email: string;
  id: number;
  studentId?: number;
  teacherId?: number;
}

export interface BLEDiscoveredDevice {
  deviceId: string;
  deviceName: string;
  courseCode: string;
  sessionId: number;
  teacherName: string;
  rssi: number;
  timestamp: number;
  isSimulated: boolean;
}
