import axios, { AxiosResponse } from 'axios';
import { Capacitor } from '@capacitor/core';
import { mockDb } from './mockDatabase';
import {
  AuthResponse, Course, Student, Teacher, Enrollment,
  AttendanceSession, AttendanceRecord
} from '../types';

export const DEFAULT_CLOUD_BACKEND_URL = 'https://presenceguard-backend.onrender.com';
const API_URL_STORAGE_KEY = 'presenceguard_api_url';

export type ServerConnectionMode = 'CLOUD_LIVE' | 'CUSTOM_SERVER' | 'OFFLINE_LOCAL';

export function isExplicitOfflineMode(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(API_URL_STORAGE_KEY) === 'OFFLINE';
  } catch {
    return false;
  }
}

export function getConfiguredServerOrigin(): string {
  try {
    const custom = typeof localStorage !== 'undefined' ? localStorage.getItem(API_URL_STORAGE_KEY) : null;
    if (custom && custom.trim() && custom !== 'OFFLINE') {
      return custom.trim().replace(/\/$/, '');
    }
  } catch {}
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && String(envUrl).trim()) {
    return String(envUrl).trim().replace(/\/$/, '');
  }
  if (Capacitor.isNativePlatform()) {
    return DEFAULT_CLOUD_BACKEND_URL;
  }
  return '';
}

export function getServerConnectionMode(): ServerConnectionMode {
  if (isExplicitOfflineMode()) return 'OFFLINE_LOCAL';
  try {
    const custom = typeof localStorage !== 'undefined' ? localStorage.getItem(API_URL_STORAGE_KEY) : null;
    if (custom && custom.trim()) return 'CUSTOM_SERVER';
  } catch {}
  if (Capacitor.isNativePlatform() || (import.meta as any).env?.VITE_API_URL) {
    return 'CLOUD_LIVE';
  }
  // Browser without VITE_API_URL uses relative /api (Vercel rewrite or local mock fallback)
  return 'CLOUD_LIVE';
}

// Base API URL: Custom localStorage URL > VITE_API_URL > Native Capacitor Cloud URL > relative /api
export function getApiBaseUrl(): string {
  const origin = getConfiguredServerOrigin();
  return origin ? `${origin}/api` : '/api';
}

// Axios instance configured with 45s timeout to handle Render free-tier cold start wake-up cleanly
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

// Track whether the most recent API interaction reached a real Spring Boot backend vs local mockDb
let usingLocalMockFallback = isExplicitOfflineMode();
export function isUsingLocalMockFallback(): boolean {
  return usingLocalMockFallback || isExplicitOfflineMode();
}

// Helper to verify API response is not HTML string (Vite SPA fallback)
function isHtml(val: any): boolean {
  return typeof val === 'string' && (val.trim().startsWith('<!') || val.trim().startsWith('<html'));
}

// Inject dynamic baseURL and JWT Bearer Authorization header
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('presenceguard_token') : null;
  if (token && !token.startsWith('mock_jwt_token_') && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Route to mockDb ONLY in explicit offline mode or Vite SPA HTML fallback
apiClient.interceptors.response.use(
  (response) => {
    if (isHtml(response.data)) {
      usingLocalMockFallback = true;
      return handleMockRequest(response.config);
    }
    usingLocalMockFallback = false;
    return response;
  },
  async (error) => {
    const config = error.config;
    const hasHttpResponse = !!error.response && !isHtml(error.response.data);

    // If explicitly set to OFFLINE mode, serve mockDb
    if (isExplicitOfflineMode() && config) {
      usingLocalMockFallback = true;
      return handleMockRequest(config);
    }

    // Never silently swallow real HTTP server errors (400/401/403/404/409/500) into mockDb
    if (hasHttpResponse) {
      usingLocalMockFallback = false;
      return Promise.reject(error);
    }

    // In browser without explicit remote server (Vite local dev with no Java backend), allow mock fallback
    const hasExplicitRemote = !!getConfiguredServerOrigin();
    if (!hasExplicitRemote && config) {
      usingLocalMockFallback = true;
      return handleMockRequest(config);
    }

    return Promise.reject(error);
  }
);

// --- Normalizers: map nested Spring Boot JPA entities -> flat UI TypeScript types ---
function normalizeStudent(s: any): Student {
  if (!s) return s;
  return {
    id: s.id,
    userId: s.userId ?? s.user?.id ?? 0,
    name: s.name ?? s.user?.name ?? 'Student',
    email: s.email ?? s.user?.email ?? '',
    rollNumber: s.rollNumber ?? '',
    department: s.department ?? '',
    semester: s.semester ?? 6,
  };
}

function normalizeTeacher(t: any): Teacher {
  if (!t) return t;
  return {
    id: t.id,
    userId: t.userId ?? t.user?.id ?? 0,
    name: t.name ?? t.user?.name ?? 'Faculty',
    email: t.email ?? t.user?.email ?? '',
    employeeId: t.employeeId ?? '',
    department: t.department ?? '',
  };
}

function normalizeEnrollment(e: any): Enrollment {
  if (!e) return e;
  return {
    id: e.id,
    studentId: e.studentId ?? e.student?.id ?? 0,
    courseId: e.courseId ?? e.course?.id ?? 0,
    studentName: e.studentName ?? e.student?.user?.name ?? 'Student',
    rollNumber: e.rollNumber ?? e.student?.rollNumber ?? '',
    courseName: e.courseName ?? e.course?.courseName ?? '',
    courseCode: e.courseCode ?? e.course?.courseCode ?? '',
    enrolledAt: e.enrolledAt,
  };
}

function normalizeSession(s: any, enrolledCountOverride?: number, presentCountOverride?: number): AttendanceSession {
  if (!s) return s;
  return {
    id: s.id,
    courseId: s.courseId ?? s.course?.id ?? 0,
    teacherId: s.teacherId ?? s.teacher?.id ?? 0,
    courseName: s.courseName ?? s.course?.courseName ?? 'Course',
    courseCode: s.courseCode ?? s.course?.courseCode ?? 'COURSE',
    teacherName: s.teacherName ?? s.teacher?.user?.name ?? 'Faculty',
    sessionCode: s.sessionCode ?? `SESS-${s.id}`,
    startTime: s.startTime,
    endTime: s.endTime ?? null,
    active: Boolean(s.active),
    rssiThreshold: s.rssiThreshold ?? -70,
    enrolledCount: enrolledCountOverride ?? s.enrolledCount,
    presentCount: presentCountOverride ?? s.presentCount,
  };
}

function normalizeRecord(r: any): AttendanceRecord & { courseName?: string; courseCode?: string; sessionCode?: string } {
  if (!r) return r;
  return {
    id: r.id,
    attendanceSessionId: r.attendanceSessionId ?? r.sessionId ?? r.attendanceSession?.id ?? 0,
    studentId: r.studentId ?? r.student?.id ?? 0,
    studentName: r.studentName ?? r.student?.user?.name ?? 'Student',
    rollNumber: r.rollNumber ?? r.student?.rollNumber ?? '',
    timestamp: r.timestamp,
    rssi: r.rssi,
    status: r.status,
    courseCode: r.courseCode ?? r.attendanceSession?.course?.courseCode,
    courseName: r.courseName ?? r.attendanceSession?.course?.courseName,
    sessionCode: r.sessionCode ?? r.attendanceSession?.sessionCode,
  };
}

function extractApiError(err: any, fallbackMessage: string): Error {
  if (err?.response?.data?.message) {
    return new Error(err.response.data.message);
  }
  if (err?.code === 'ECONNABORTED' || err?.message?.toLowerCase().includes('timeout')) {
    return new Error('Server took too long to respond (Render cloud may be waking up). Please tap retry in a few seconds.');
  }
  if (!err?.response && getConfiguredServerOrigin()) {
    return new Error(`Cannot connect to server (${getConfiguredServerOrigin()}). Check internet connection and try again.`);
  }
  return new Error(err?.message || fallbackMessage);
}

// Fallback dispatcher simulating Spring Boot Controllers (used only in explicit Offline Mode or pure Vite static mode)
async function handleMockRequest(config: any): Promise<AxiosResponse<any>> {
  const fullRawUrl = config.url?.replace(/^\/api/, '') || '';
  const [urlPath, queryString] = fullRawUrl.split('?');
  const url = urlPath;
  const method = config.method?.toUpperCase() || 'GET';
  const body = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {};

  const urlParams = new URLSearchParams(queryString || '');
  const params: Record<string, any> = {
    ...Object.fromEntries(urlParams.entries()),
    ...(config.params || {})
  };

  await new Promise(r => setTimeout(r, 60));

  // --- Auth Controller ---
  if (url === '/auth/health' && method === 'GET') {
    return { data: { status: 'UP', mode: 'OFFLINE_LOCAL' }, status: 200, statusText: 'OK', headers: {}, config };
  }

  if (url === '/auth/login' && method === 'POST') {
    const { email, password } = body;
    const user = mockDb.getUserByEmail(email);

    const isValid = (user && (
      (user.role === 'ADMIN' && (password === 'admin123' || password === 'password')) ||
      (user.role === 'TEACHER' && (password === 'teacher123' || password === 'password')) ||
      (user.role === 'STUDENT' && (password === 'student123' || password === 'password')) ||
      password === 'password' || password === '123456'
    ));

    if (!user || !isValid) {
      const err: any = new Error('Invalid email or password.');
      err.response = { status: 401, data: { message: 'Invalid credentials. Please check your email and password.' } };
      throw err;
    }

    let studentId: number | undefined;
    let teacherId: number | undefined;

    if (user.role === 'STUDENT') {
      studentId = mockDb.getStudentByUserId(user.id)?.id;
    } else if (user.role === 'TEACHER') {
      teacherId = mockDb.getTeacherByUserId(user.id)?.id;
    }

    const payload: AuthResponse = {
      token: `mock_jwt_token_${user.id}_${Date.now()}`,
      role: user.role,
      name: user.name,
      email: user.email,
      id: user.id,
      studentId,
      teacherId
    };

    return { data: payload, status: 200, statusText: 'OK', headers: {}, config };
  }

  // --- Admin Controller ---
  if (url.startsWith('/admin/')) {
    if (url === '/admin/students' && method === 'GET') return { data: mockDb.getStudents(), status: 200, statusText: 'OK', headers: {}, config };
    if (url === '/admin/students' && method === 'POST') return { data: mockDb.createStudent(body), status: 201, statusText: 'Created', headers: {}, config };
    if (url.startsWith('/admin/students/') && method === 'DELETE') {
      mockDb.deleteStudent(parseInt(url.split('/').pop() || '0', 10));
      return { data: { message: 'Student deleted successfully' }, status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url.startsWith('/admin/students/') && method === 'PUT') {
      return { data: mockDb.updateStudent(parseInt(url.split('/').pop() || '0', 10), body), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/admin/teachers' && method === 'GET') return { data: mockDb.getTeachers(), status: 200, statusText: 'OK', headers: {}, config };
    if (url === '/admin/teachers' && method === 'POST') return { data: mockDb.createTeacher(body), status: 201, statusText: 'Created', headers: {}, config };
    if (url.startsWith('/admin/teachers/') && method === 'DELETE') {
      mockDb.deleteTeacher(parseInt(url.split('/').pop() || '0', 10));
      return { data: { message: 'Teacher deleted successfully' }, status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/admin/courses' && method === 'GET') return { data: mockDb.getCourses(), status: 200, statusText: 'OK', headers: {}, config };
    if (url === '/admin/courses' && method === 'POST') return { data: mockDb.createCourse(body), status: 201, statusText: 'Created', headers: {}, config };
    if (url === '/admin/enrollments' && method === 'GET') return { data: mockDb.getEnrollments(), status: 200, statusText: 'OK', headers: {}, config };
    if (url === '/admin/enrollments' && method === 'POST') return { data: mockDb.enrollStudent(body.studentId, body.courseId), status: 201, statusText: 'Created', headers: {}, config };
    if (url === '/admin/teacher-courses' && method === 'POST') return { data: mockDb.assignTeacherToCourse(body.teacherId, body.courseId), status: 201, statusText: 'Created', headers: {}, config };
    if (url === '/admin/attendance' && method === 'GET') return { data: mockDb.getAllAttendanceRecords(), status: 200, statusText: 'OK', headers: {}, config };
  }

  // --- Teacher Controller ---
  if (url.startsWith('/teacher/')) {
    if (url === '/teacher/courses' && method === 'GET') {
      const teacherId = Number(params.teacherId || body.teacherId || 1);
      return { data: mockDb.getTeacherCourses(teacherId), status: 200, statusText: 'OK', headers: {}, config };
    }
    const matchCourseStudents = url.match(/\/teacher\/courses\/(\d+)\/students/);
    if (matchCourseStudents && method === 'GET') {
      return { data: mockDb.getCourseStudents(parseInt(matchCourseStudents[1], 10)), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/teacher/attendance/active' && method === 'GET') {
      const teacherId = Number(params.teacherId || 0);
      const sessions = mockDb.getActiveSessionsForStudent(1).filter(s => !teacherId || s.teacherId === teacherId);
      return { data: sessions, status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/teacher/attendance/history' && method === 'GET') {
      return { data: mockDb.getAllAttendanceRecords(), status: 200, statusText: 'OK', headers: {}, config };
    }
    const matchStart = url.match(/\/teacher\/attendance\/start\/(\d+)/);
    if (matchStart && method === 'POST') {
      const courseId = parseInt(matchStart[1], 10);
      const session = mockDb.startAttendanceSession(body.teacherId || 1, courseId, body.rssiThreshold || -70);
      return { data: session, status: 201, statusText: 'Created', headers: {}, config };
    }
    const matchStop = url.match(/\/teacher\/attendance\/(\d+)\/stop/);
    if (matchStop && method === 'POST') {
      return { data: mockDb.stopAttendanceSession(parseInt(matchStop[1], 10)), status: 200, statusText: 'OK', headers: {}, config };
    }
    const matchSession = url.match(/\/teacher\/attendance\/(\d+)$/);
    if (matchSession && method === 'GET') {
      const sessionId = parseInt(matchSession[1], 10);
      return {
        data: { session: mockDb.getSessionById(sessionId), records: mockDb.getSessionRecords(sessionId) },
        status: 200, statusText: 'OK', headers: {}, config
      };
    }
  }

  // --- Student Controller ---
  if (url.startsWith('/student/')) {
    if (url === '/student/courses' && method === 'GET') return { data: mockDb.getCourses(), status: 200, statusText: 'OK', headers: {}, config };
    if (url === '/student/attendance/active' && method === 'GET') {
      return { data: mockDb.getActiveSessionsForStudent(Number(params.studentId || 1)), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/student/attendance/history' && method === 'GET') {
      return { data: mockDb.getStudentHistory(Number(params.studentId || 1)), status: 200, statusText: 'OK', headers: {}, config };
    }
  }

  if (url === '/attendance/active' && method === 'GET') {
    return { data: mockDb.getActiveSessionsForStudent(1), status: 200, statusText: 'OK', headers: {}, config };
  }

  // --- Attendance Mark ---
  if ((url === '/attendance/mark' || url === '/student/attendance/mark') && method === 'POST') {
    const { sessionId, studentId, rssi } = body;
    const result = mockDb.markAttendance({ sessionId, studentId, rssi });
    if (!result.success) {
      const err: any = new Error(result.message);
      err.response = {
        status: result.status === 'ALREADY_MARKED' ? 409 : 400,
        data: { message: result.message, status: result.status, record: result.record }
      };
      throw err;
    }
    return { data: result, status: 200, statusText: 'OK', headers: {}, config };
  }

  const err: any = new Error(`Endpoint ${method} ${url} not found`);
  err.response = { status: 404, data: { message: 'Not found' } };
  throw err;
}

// Wake up free-tier Render instance quietly on app mount
export function warmupBackend(): void {
  if (isExplicitOfflineMode() || !getConfiguredServerOrigin()) return;
  apiClient.get('/auth/health', { timeout: 45000 }).catch(() => {});
}

// Export clean typed service methods
export const api = {
  // Auth
  login: async (credentials: { email: string; password: string }) => {
    if (isExplicitOfflineMode()) {
      const res = await handleMockRequest({ url: '/auth/login', method: 'POST', data: credentials });
      return res.data;
    }
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
      if (res.data && typeof res.data === 'object' && res.data.token) {
        return res.data;
      }
      throw new Error('Unexpected login response from server.');
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403 || err?.response?.status === 500) {
        throw new Error(err?.response?.data?.message || 'Invalid credentials. Please check your email and password.');
      }
      throw extractApiError(err, 'Login failed. Please check server connection.');
    }
  },

  // Admin
  getStudents: async () => {
    const res = await apiClient.get<any[]>('/admin/students');
    return Array.isArray(res.data) ? res.data.map(normalizeStudent) : [];
  },
  createStudent: async (data: { name: string; email: string; password?: string; rollNumber: string; department: string; semester: number }) => {
    try {
      const res = await apiClient.post<any>('/admin/students', {
        ...data,
        password: data.password || 'student123',
      });
      return normalizeStudent(res.data);
    } catch (err: any) {
      throw extractApiError(err, 'Failed to create student');
    }
  },
  updateStudent: async (id: number, data: Partial<Student>) => {
    try {
      const res = await apiClient.put<any>(`/admin/students/${id}`, {
        ...data,
        password: 'student123',
      });
      return normalizeStudent(res.data);
    } catch (err: any) {
      throw extractApiError(err, 'Failed to update student');
    }
  },
  deleteStudent: async (id: number) => {
    await apiClient.delete(`/admin/students/${id}`);
    return true;
  },
  getTeachers: async () => {
    const res = await apiClient.get<any[]>('/admin/teachers');
    return Array.isArray(res.data) ? res.data.map(normalizeTeacher) : [];
  },
  createTeacher: async (data: { name: string; email: string; employeeId: string; department: string; password?: string }) => {
    try {
      const res = await apiClient.post<any>('/admin/teachers', {
        ...data,
        password: data.password || 'teacher123',
      });
      return normalizeTeacher(res.data);
    } catch (err: any) {
      throw extractApiError(err, 'Failed to create teacher');
    }
  },
  deleteTeacher: async (id: number) => {
    await apiClient.delete(`/admin/teachers/${id}`);
    return true;
  },
  getCourses: async () => {
    const res = await apiClient.get<Course[]>('/admin/courses');
    return Array.isArray(res.data) ? res.data : [];
  },
  createCourse: async (data: { courseCode: string; courseName: string; semester: number }) => {
    try {
      const res = await apiClient.post<Course>('/admin/courses', data);
      return res.data;
    } catch (err: any) {
      throw extractApiError(err, 'Failed to create course');
    }
  },
  getEnrollments: async () => {
    const res = await apiClient.get<any[]>('/admin/enrollments');
    return Array.isArray(res.data) ? res.data.map(normalizeEnrollment) : [];
  },
  enrollStudent: async (studentId: number, courseId: number) => {
    try {
      const res = await apiClient.post<any>('/admin/enrollments', { studentId, courseId });
      return normalizeEnrollment(res.data);
    } catch (err: any) {
      throw extractApiError(err, 'Failed to enroll student');
    }
  },
  assignTeacherToCourse: async (teacherId: number, courseId: number) => {
    try {
      const res = await apiClient.post('/admin/teacher-courses', { teacherId, courseId });
      return res.data;
    } catch (err: any) {
      throw extractApiError(err, 'Failed to assign teacher');
    }
  },
  getAllAttendance: async () => {
    const res = await apiClient.get<any[]>('/admin/attendance');
    return Array.isArray(res.data) ? res.data.map(normalizeRecord) : [];
  },

  // Teacher
  getTeacherCourses: async (teacherId?: number) => {
    const res = await apiClient.get<Course[]>('/teacher/courses', {
      params: teacherId ? { teacherId } : undefined
    });
    return Array.isArray(res.data) ? res.data : [];
  },
  getCourseStudents: async (courseId: number) => {
    const res = await apiClient.get<any[]>(`/teacher/courses/${courseId}/students`);
    return Array.isArray(res.data) ? res.data.map(normalizeStudent) : [];
  },
  getActiveTeacherSessions: async (teacherId?: number) => {
    const res = await apiClient.get<any[]>('/teacher/attendance/active', {
      params: teacherId ? { teacherId } : undefined
    });
    return Array.isArray(res.data) ? res.data.map((s) => normalizeSession(s)) : [];
  },
  getTeacherHistory: async (teacherId?: number) => {
    const res = await apiClient.get<any[]>('/teacher/attendance/history', {
      params: teacherId ? { teacherId } : undefined
    });
    return Array.isArray(res.data) ? res.data.map(normalizeRecord) : [];
  },
  startAttendanceSession: async (teacherId: number | undefined, courseId: number, rssiThreshold = -70) => {
    try {
      const res = await apiClient.post<any>(`/teacher/attendance/start/${courseId}`, {
        ...(teacherId ? { teacherId } : {}),
        rssiThreshold
      });
      return normalizeSession(res.data);
    } catch (err: any) {
      throw extractApiError(err, 'Failed to start attendance session');
    }
  },
  stopAttendanceSession: async (sessionId: number) => {
    try {
      const res = await apiClient.post<any>(`/teacher/attendance/${sessionId}/stop`);
      return normalizeSession(res.data);
    } catch (err: any) {
      throw extractApiError(err, 'Failed to stop attendance session');
    }
  },
  getSessionDetails: async (sessionId: number) => {
    const res = await apiClient.get<any>(`/teacher/attendance/${sessionId}`);
    const data = res.data;
    const session = normalizeSession(data?.session, data?.totalEnrolled, data?.presentCount);
    const records = Array.isArray(data?.records) ? data.records.map(normalizeRecord) : [];
    return { session, records };
  },

  // Student
  getStudentCourses: async (studentId?: number) => {
    const res = await apiClient.get<Course[]>('/student/courses', {
      params: studentId ? { studentId } : undefined
    });
    return Array.isArray(res.data) ? res.data : [];
  },
  getActiveStudentSessions: async (studentId?: number) => {
    const res = await apiClient.get<any[]>('/student/attendance/active', {
      params: studentId ? { studentId } : undefined
    });
    return Array.isArray(res.data) ? res.data.map((s) => normalizeSession(s)) : [];
  },
  getAllActiveSessions: async () => {
    const res = await apiClient.get<any[]>('/attendance/active');
    return Array.isArray(res.data) ? res.data.map((s) => normalizeSession(s)) : [];
  },
  getStudentHistory: async (studentId?: number) => {
    const res = await apiClient.get<any[]>('/student/attendance/history', {
      params: studentId ? { studentId } : undefined
    });
    return Array.isArray(res.data) ? res.data.map(normalizeRecord) : [];
  },
  markAttendance: async (sessionId: number, studentId: number, rssi: number) => {
    try {
      const res = await apiClient.post('/attendance/mark', { sessionId, studentId, rssi });
      return res.data;
    } catch (err: any) {
      throw extractApiError(err, 'Attendance verification failed.');
    }
  }
};
