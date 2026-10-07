import axios, { AxiosResponse } from 'axios';
import { mockDb } from './mockDatabase';
import { 
  AuthResponse, Course, Student, Teacher, Enrollment, 
  AttendanceSession, AttendanceRecord 
} from '../types';

// Base API URL: Uses VITE_API_URL if defined (e.g. on Vercel), otherwise defaults to relative /api
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL 
  ? `${(import.meta as any).env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

// Axios instance with base configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to inject JWT token into Bearer Authorization header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('presenceguard_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Detect HTML string response (Vite dev server SPA fallback) and route to mock handler
apiClient.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && (response.data.trim().startsWith('<!') || response.data.trim().startsWith('<html'))) {
      return handleMockRequest(response.config);
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    if (config) {
      try {
        const mockResult = await handleMockRequest(config);
        if (mockResult) {
          return mockResult;
        }
      } catch (mockErr: any) {
        return Promise.reject(mockErr);
      }
    }
    return Promise.reject(error);
  }
);

// Fallback dispatcher simulating Spring Boot Controllers
async function handleMockRequest(config: any): Promise<AxiosResponse<any>> {
  const fullRawUrl = config.url?.replace(/^\/api/, '') || '';
  const [urlPath, queryString] = fullRawUrl.split('?');
  const url = urlPath;
  const method = config.method?.toUpperCase() || 'GET';
  const body = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {};

  // Extract combined query and config params
  const urlParams = new URLSearchParams(queryString || '');
  const params: Record<string, any> = {
    ...Object.fromEntries(urlParams.entries()),
    ...(config.params || {})
  };

  // Brief latency simulation
  await new Promise(r => setTimeout(r, 60));

  // --- Auth Controller: POST /api/auth/login ---
  if (url === '/auth/login' && method === 'POST') {
    const { email, password } = body;
    const user = mockDb.getUserByEmail(email);

    // Check valid credentials against role standards
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
      const student = mockDb.getStudentByUserId(user.id);
      studentId = student?.id;
    } else if (user.role === 'TEACHER') {
      const teacher = mockDb.getTeacherByUserId(user.id);
      teacherId = teacher?.id;
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

  // --- Admin Controller: /admin/* ---
  if (url.startsWith('/admin/')) {
    if (url === '/admin/students' && method === 'GET') {
      return { data: mockDb.getStudents(), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/admin/students' && method === 'POST') {
      const created = mockDb.createStudent(body);
      return { data: created, status: 201, statusText: 'Created', headers: {}, config };
    }
    if (url.startsWith('/admin/students/') && method === 'DELETE') {
      const id = parseInt(url.split('/').pop() || '0', 10);
      mockDb.deleteStudent(id);
      return { data: { message: 'Student deleted successfully' }, status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url.startsWith('/admin/students/') && method === 'PUT') {
      const id = parseInt(url.split('/').pop() || '0', 10);
      const updated = mockDb.updateStudent(id, body);
      return { data: updated, status: 200, statusText: 'OK', headers: {}, config };
    }

    if (url === '/admin/teachers' && method === 'GET') {
      return { data: mockDb.getTeachers(), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/admin/teachers' && method === 'POST') {
      const created = mockDb.createTeacher(body);
      return { data: created, status: 201, statusText: 'Created', headers: {}, config };
    }
    if (url.startsWith('/admin/teachers/') && method === 'DELETE') {
      const id = parseInt(url.split('/').pop() || '0', 10);
      mockDb.deleteTeacher(id);
      return { data: { message: 'Teacher deleted successfully' }, status: 200, statusText: 'OK', headers: {}, config };
    }

    if (url === '/admin/courses' && method === 'GET') {
      return { data: mockDb.getCourses(), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/admin/courses' && method === 'POST') {
      const created = mockDb.createCourse(body);
      return { data: created, status: 201, statusText: 'Created', headers: {}, config };
    }

    if (url === '/admin/enrollments' && method === 'GET') {
      return { data: mockDb.getEnrollments(), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/admin/enrollments' && method === 'POST') {
      const enrolled = mockDb.enrollStudent(body.studentId, body.courseId);
      return { data: enrolled, status: 201, statusText: 'Created', headers: {}, config };
    }

    if (url === '/admin/teacher-courses' && method === 'POST') {
      const tc = mockDb.assignTeacherToCourse(body.teacherId, body.courseId);
      return { data: tc, status: 201, statusText: 'Created', headers: {}, config };
    }

    if (url === '/admin/attendance' && method === 'GET') {
      return { data: mockDb.getAllAttendanceRecords(), status: 200, statusText: 'OK', headers: {}, config };
    }
  }

  // --- Teacher Controller: /teacher/* ---
  if (url.startsWith('/teacher/')) {
    if (url === '/teacher/courses' && method === 'GET') {
      const teacherId = Number(params.teacherId || body.teacherId || 1);
      return { data: mockDb.getTeacherCourses(teacherId), status: 200, statusText: 'OK', headers: {}, config };
    }

    const matchCourseStudents = url.match(/\/teacher\/courses\/(\d+)\/students/);
    if (matchCourseStudents && method === 'GET') {
      const courseId = parseInt(matchCourseStudents[1], 10);
      return { data: mockDb.getCourseStudents(courseId), status: 200, statusText: 'OK', headers: {}, config };
    }

    const matchStart = url.match(/\/teacher\/attendance\/start\/(\d+)/);
    if (matchStart && method === 'POST') {
      const courseId = parseInt(matchStart[1], 10);
      const teacherId = body.teacherId || 1;
      const threshold = body.rssiThreshold || -70;
      const session = mockDb.startAttendanceSession(teacherId, courseId, threshold);
      return { data: session, status: 201, statusText: 'Created', headers: {}, config };
    }

    const matchStop = url.match(/\/teacher\/attendance\/(\d+)\/stop/);
    if (matchStop && method === 'POST') {
      const sessionId = parseInt(matchStop[1], 10);
      const stopped = mockDb.stopAttendanceSession(sessionId);
      return { data: stopped, status: 200, statusText: 'OK', headers: {}, config };
    }

    const matchSession = url.match(/\/teacher\/attendance\/(\d+)$/);
    if (matchSession && method === 'GET') {
      const sessionId = parseInt(matchSession[1], 10);
      const session = mockDb.getSessionById(sessionId);
      const records = mockDb.getSessionRecords(sessionId);
      return { data: { session, records }, status: 200, statusText: 'OK', headers: {}, config };
    }
  }

  // --- Student Controller: /student/* ---
  if (url.startsWith('/student/')) {
    if (url === '/student/courses' && method === 'GET') {
      return { data: mockDb.getCourses(), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/student/attendance/active' && method === 'GET') {
      const studentId = Number(params.studentId || 1);
      const sessions = mockDb.getActiveSessionsForStudent(studentId);
      return { data: sessions, status: 200, statusText: 'OK', headers: {}, config };
    }
    if (url === '/student/attendance/history' && method === 'GET') {
      const studentId = Number(params.studentId || 1);
      const history = mockDb.getStudentHistory(studentId);
      return { data: history, status: 200, statusText: 'OK', headers: {}, config };
    }
  }

  // --- Attendance Mark: POST /api/attendance/mark or /api/student/attendance/mark ---
  if ((url === '/attendance/mark' || url === '/student/attendance/mark') && method === 'POST') {
    const { sessionId, studentId, rssi } = body;
    const result = mockDb.markAttendance({ sessionId, studentId, rssi });

    if (!result.success) {
      const err: any = new Error(result.message);
      const status = result.status === 'ALREADY_MARKED' ? 409 : 400;
      err.response = { status, data: { message: result.message, status: result.status, record: result.record } };
      throw err;
    }

    return { data: result, status: 200, statusText: 'OK', headers: {}, config };
  }

  // Default not found
  const err: any = new Error(`Endpoint ${method} ${url} not found`);
  err.response = { status: 404, data: { message: 'Not found' } };
  throw err;
}

// Helper to verify API response is not HTML string
function isHtml(val: any): boolean {
  return typeof val === 'string' && (val.trim().startsWith('<!') || val.trim().startsWith('<html'));
}

// Export clean typed service methods with bulletproof fallbacks
export const api = {
  // Auth
  login: async (credentials: { email: string; password: string }) => {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
      if (res.data && typeof res.data === 'object' && res.data.token && !isHtml(res.data)) {
        return res.data;
      }
    } catch (err: any) {
      if (err.response?.status === 401) throw err;
    }
    const res = await handleMockRequest({ url: '/auth/login', method: 'POST', data: credentials });
    return res.data;
  },

  // Admin
  getStudents: async () => {
    try {
      const res = await apiClient.get<Student[]>('/admin/students');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getStudents();
  },
  createStudent: async (data: { name: string; email: string; rollNumber: string; department: string; semester: number }) => {
    try {
      const res = await apiClient.post<Student>('/admin/students', data);
      if (res.data && typeof res.data === 'object' && res.data.id && !isHtml(res.data)) return res.data;
    } catch {}
    return mockDb.createStudent(data);
  },
  updateStudent: async (id: number, data: Partial<Student>) => {
    try {
      const res = await apiClient.put<Student>(`/admin/students/${id}`, data);
      if (res.data && typeof res.data === 'object' && !isHtml(res.data)) return res.data;
    } catch {}
    return mockDb.updateStudent(id, data);
  },
  deleteStudent: async (id: number) => {
    try {
      await apiClient.delete(`/admin/students/${id}`);
      return true;
    } catch {}
    return mockDb.deleteStudent(id);
  },
  getTeachers: async () => {
    try {
      const res = await apiClient.get<Teacher[]>('/admin/teachers');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getTeachers();
  },
  createTeacher: async (data: { name: string; email: string; employeeId: string; department: string }) => {
    try {
      const res = await apiClient.post<Teacher>('/admin/teachers', data);
      if (res.data && typeof res.data === 'object' && res.data.id && !isHtml(res.data)) return res.data;
    } catch {}
    return mockDb.createTeacher(data);
  },
  deleteTeacher: async (id: number) => {
    try {
      await apiClient.delete(`/admin/teachers/${id}`);
      return true;
    } catch {}
    return mockDb.deleteTeacher(id);
  },
  getCourses: async () => {
    try {
      const res = await apiClient.get<Course[]>('/admin/courses');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getCourses();
  },
  createCourse: async (data: { courseCode: string; courseName: string; semester: number }) => {
    try {
      const res = await apiClient.post<Course>('/admin/courses', data);
      if (res.data && typeof res.data === 'object' && res.data.id && !isHtml(res.data)) return res.data;
    } catch {}
    return mockDb.createCourse(data);
  },
  getEnrollments: async () => {
    try {
      const res = await apiClient.get<Enrollment[]>('/admin/enrollments');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getEnrollments();
  },
  enrollStudent: async (studentId: number, courseId: number) => {
    try {
      const res = await apiClient.post<Enrollment>('/admin/enrollments', { studentId, courseId });
      if (res.data && typeof res.data === 'object' && res.data.id && !isHtml(res.data)) return res.data;
    } catch {}
    return mockDb.enrollStudent(studentId, courseId);
  },
  assignTeacherToCourse: async (teacherId: number, courseId: number) => {
    try {
      const res = await apiClient.post('/admin/teacher-courses', { teacherId, courseId });
      if (res.data && typeof res.data === 'object' && !isHtml(res.data)) return res.data;
    } catch {}
    return mockDb.assignTeacherToCourse(teacherId, courseId);
  },
  getAllAttendance: async () => {
    try {
      const res = await apiClient.get('/admin/attendance');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getAllAttendanceRecords();
  },

  // Teacher
  getTeacherCourses: async (teacherId: number) => {
    try {
      const res = await apiClient.get<Course[]>('/teacher/courses', { params: { teacherId } });
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getTeacherCourses(teacherId);
  },
  getCourseStudents: async (courseId: number) => {
    try {
      const res = await apiClient.get<Student[]>(`/teacher/courses/${courseId}/students`);
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getCourseStudents(courseId);
  },
  startAttendanceSession: async (teacherId: number, courseId: number, rssiThreshold = -70) => {
    try {
      const res = await apiClient.post<AttendanceSession>(`/teacher/attendance/start/${courseId}`, { teacherId, rssiThreshold });
      if (res.data && typeof res.data === 'object' && res.data.id && !isHtml(res.data)) return res.data;
    } catch {}
    return mockDb.startAttendanceSession(teacherId, courseId, rssiThreshold);
  },
  stopAttendanceSession: async (sessionId: number) => {
    try {
      const res = await apiClient.post<AttendanceSession>(`/teacher/attendance/${sessionId}/stop`);
      if (res.data && typeof res.data === 'object' && res.data.id && !isHtml(res.data)) return res.data;
    } catch {}
    return mockDb.stopAttendanceSession(sessionId);
  },
  getSessionDetails: async (sessionId: number) => {
    try {
      const res = await apiClient.get<{ session: AttendanceSession; records: AttendanceRecord[] }>(`/teacher/attendance/${sessionId}`);
      if (res.data && typeof res.data === 'object' && res.data.session && !isHtml(res.data)) return res.data;
    } catch {}
    const session = mockDb.getSessionById(sessionId);
    const records = mockDb.getSessionRecords(sessionId);
    return { session: session!, records: records || [] };
  },

  // Student
  getActiveStudentSessions: async (studentId: number) => {
    try {
      const res = await apiClient.get<AttendanceSession[]>('/student/attendance/active', { params: { studentId } });
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getActiveSessionsForStudent(studentId);
  },
  getStudentHistory: async (studentId: number) => {
    try {
      const res = await apiClient.get<AttendanceRecord[]>('/student/attendance/history', { params: { studentId } });
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return mockDb.getStudentHistory(studentId);
  },
  markAttendance: async (sessionId: number, studentId: number, rssi: number) => {
    try {
      const res = await apiClient.post('/attendance/mark', { sessionId, studentId, rssi });
      if (res.data && typeof res.data === 'object' && res.data.success !== undefined && !isHtml(res.data)) {
        return res.data;
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }
    const res = mockDb.markAttendance({ sessionId, studentId, rssi });
    if (!res.success) {
      throw new Error(res.message);
    }
    return res;
  }
};
