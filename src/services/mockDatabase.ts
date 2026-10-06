import { 
  User, Student, Teacher, Course, Enrollment, TeacherCourse, 
  AttendanceSession, AttendanceRecord 
} from '../types';

interface DatabaseState {
  users: User[];
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  enrollments: Enrollment[];
  teacherCourses: TeacherCourse[];
  sessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
}

const STORAGE_KEY = 'presenceguard_db_v1';

const INITIAL_DATA: DatabaseState = {
  users: [
    { id: 1, name: 'System Administrator', email: 'admin@college.com', role: 'ADMIN' },
    { id: 2, name: 'Prof. Rajesh Sharma', email: 'teacher@college.com', role: 'TEACHER' },
    { id: 3, name: 'Hemant Singh', email: 'student@college.com', role: 'STUDENT' },
    { id: 4, name: 'Priya Sharma', email: 'priya@college.com', role: 'STUDENT' },
    { id: 5, name: 'Rahul Verma', email: 'rahul@college.com', role: 'STUDENT' },
    { id: 6, name: 'Sneha Patel', email: 'sneha@college.com', role: 'STUDENT' },
    { id: 7, name: 'Dr. Anita Desai', email: 'anita@college.com', role: 'TEACHER' },
    { id: 8, name: 'Dr. Vikram Malhotra', email: 'teacher.bsc@college.com', role: 'TEACHER' },
    { id: 9, name: 'Om', email: 'om@college.com', role: 'STUDENT' }
  ],
  students: [
    { id: 1, userId: 3, name: 'Hemant Singh', email: 'student@college.com', rollNumber: '21CSE101', department: 'Computer Science', semester: 6 },
    { id: 2, userId: 4, name: 'Priya Sharma', email: 'priya@college.com', rollNumber: '21CSE102', department: 'Computer Science', semester: 6 },
    { id: 3, userId: 5, name: 'Rahul Verma', email: 'rahul@college.com', rollNumber: '21CSE103', department: 'Computer Science', semester: 6 },
    { id: 4, userId: 6, name: 'Sneha Patel', email: 'sneha@college.com', rollNumber: '21CSE104', department: 'Computer Science', semester: 6 },
    { id: 5, userId: 9, name: 'Om', email: 'om@college.com', rollNumber: '21BSC101', department: 'B.Sc. Computer Science', semester: 6 }
  ],
  teachers: [
    { id: 1, userId: 2, name: 'Prof. Rajesh Sharma', email: 'teacher@college.com', employeeId: 'EMP-CSE-104', department: 'Computer Science' },
    { id: 2, userId: 7, name: 'Dr. Anita Desai', email: 'anita@college.com', employeeId: 'EMP-CSE-201', department: 'Computer Science' },
    { id: 3, userId: 8, name: 'Dr. Vikram Malhotra', email: 'teacher.bsc@college.com', employeeId: 'EMP-BSC-201', department: 'B.Sc. Computer Science' }
  ],
  courses: [
    { id: 1, courseCode: 'CS301', courseName: 'Java Programming', semester: 6 },
    { id: 2, courseCode: 'CS302', courseName: 'Database Management Systems', semester: 6 },
    { id: 3, courseCode: 'CS303', courseName: 'Computer Networks', semester: 6 },
    { id: 4, courseCode: 'BSC101', courseName: 'B.Sc. Computer Science', semester: 6 }
  ],
  enrollments: [
    { id: 1, studentId: 1, courseId: 1 },
    { id: 2, studentId: 1, courseId: 2 },
    { id: 3, studentId: 2, courseId: 1 },
    { id: 4, studentId: 2, courseId: 3 },
    { id: 5, studentId: 3, courseId: 1 },
    { id: 6, studentId: 4, courseId: 1 },
    { id: 7, studentId: 5, courseId: 4 }
  ],
  teacherCourses: [
    { id: 1, teacherId: 1, courseId: 1 },
    { id: 2, teacherId: 1, courseId: 2 },
    { id: 3, teacherId: 2, courseId: 3 },
    { id: 4, teacherId: 3, courseId: 4 }
  ],
  sessions: [
    {
      id: 1,
      courseId: 1,
      teacherId: 1,
      courseName: 'Java Programming',
      courseCode: 'CS301',
      teacherName: 'Prof. Rajesh Sharma',
      sessionCode: 'SESS-CS301-4921',
      startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      endTime: null,
      active: true,
      rssiThreshold: -70
    }
  ],
  attendanceRecords: [
    {
      id: 1,
      attendanceSessionId: 1,
      studentId: 2,
      studentName: 'Priya Sharma',
      rollNumber: '21CSE102',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      rssi: -54,
      status: 'PRESENT'
    },
    {
      id: 2,
      attendanceSessionId: 1,
      studentId: 3,
      studentName: 'Rahul Verma',
      rollNumber: '21CSE103',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      rssi: -62,
      status: 'PRESENT'
    }
  ]
};

class MockDatabase {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    if (typeof window === 'undefined') return INITIAL_DATA;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        let modified = false;

        // Ensure BSC101 course exists
        if (!parsed.courses?.some((c: any) => c.courseCode === 'BSC101')) {
          parsed.courses = parsed.courses || [];
          parsed.courses.push({ id: 4, courseCode: 'BSC101', courseName: 'B.Sc. Computer Science', semester: 6 });
          modified = true;
        }

        // Ensure Dr. Vikram Malhotra exists
        if (!parsed.users?.some((u: any) => u.email === 'teacher.bsc@college.com')) {
          parsed.users = parsed.users || [];
          parsed.teachers = parsed.teachers || [];
          parsed.teacherCourses = parsed.teacherCourses || [];
          parsed.users.push({ id: 8, name: 'Dr. Vikram Malhotra', email: 'teacher.bsc@college.com', role: 'TEACHER' });
          parsed.teachers.push({ id: 3, userId: 8, name: 'Dr. Vikram Malhotra', email: 'teacher.bsc@college.com', employeeId: 'EMP-BSC-201', department: 'B.Sc. Computer Science' });
          parsed.teacherCourses.push({ id: 4, teacherId: 3, courseId: 4 });
          modified = true;
        }

        // Ensure Om student exists
        if (!parsed.users?.some((u: any) => u.email === 'om@college.com')) {
          parsed.users = parsed.users || [];
          parsed.students = parsed.students || [];
          parsed.enrollments = parsed.enrollments || [];
          parsed.users.push({ id: 9, name: 'Om', email: 'om@college.com', role: 'STUDENT' });
          parsed.students.push({ id: 5, userId: 9, name: 'Om', email: 'om@college.com', rollNumber: '21BSC101', department: 'B.Sc. Computer Science', semester: 6 });
          parsed.enrollments.push({ id: 7, studentId: 5, courseId: 4 });
          modified = true;
        }

        if (modified) {
          this.save(parsed);
        }
        return parsed;
      }
    } catch {
      // Fallback
    }
    this.save(INITIAL_DATA);
    return INITIAL_DATA;
  }

  private save(state: DatabaseState): void {
    this.state = state;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
    }
  }

  public resetToDefaults(): void {
    this.save(INITIAL_DATA);
  }

  // --- Auth & Users ---
  public getUserByEmail(email: string): User | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getStudentByUserId(userId: number): Student | undefined {
    return this.state.students.find(s => s.userId === userId);
  }

  public getTeacherByUserId(userId: number): Teacher | undefined {
    return this.state.teachers.find(t => t.userId === userId);
  }

  // --- Admin Queries ---
  public getStudents(): Student[] {
    return this.state.students;
  }

  public createStudent(data: { name: string; email: string; rollNumber: string; department: string; semester: number }): Student {
    const nextUserId = Math.max(0, ...this.state.users.map(u => u.id)) + 1;
    const nextStudentId = Math.max(0, ...this.state.students.map(s => s.id)) + 1;

    const newUser: User = {
      id: nextUserId,
      name: data.name,
      email: data.email,
      role: 'STUDENT'
    };

    const newStudent: Student = {
      id: nextStudentId,
      userId: nextUserId,
      name: data.name,
      email: data.email,
      rollNumber: data.rollNumber,
      department: data.department,
      semester: data.semester
    };

    this.save({
      ...this.state,
      users: [...this.state.users, newUser],
      students: [...this.state.students, newStudent]
    });

    return newStudent;
  }

  public updateStudent(id: number, data: Partial<Student>): Student | null {
    const student = this.state.students.find(s => s.id === id);
    if (!student) return null;

    const updatedStudent = { ...student, ...data };
    const updatedStudents = this.state.students.map(s => s.id === id ? updatedStudent : s);
    const updatedUsers = this.state.users.map(u => u.id === student.userId ? { ...u, name: data.name || u.name, email: data.email || u.email } : u);

    this.save({
      ...this.state,
      students: updatedStudents,
      users: updatedUsers
    });

    return updatedStudent;
  }

  public deleteStudent(id: number): boolean {
    const student = this.state.students.find(s => s.id === id);
    if (!student) return false;

    this.save({
      ...this.state,
      students: this.state.students.filter(s => s.id !== id),
      users: this.state.users.filter(u => u.id !== student.userId),
      enrollments: this.state.enrollments.filter(e => e.studentId !== id)
    });
    return true;
  }

  public getTeachers(): Teacher[] {
    return this.state.teachers;
  }

  public createTeacher(data: { name: string; email: string; employeeId: string; department: string }): Teacher {
    const nextUserId = Math.max(0, ...this.state.users.map(u => u.id)) + 1;
    const nextTeacherId = Math.max(0, ...this.state.teachers.map(t => t.id)) + 1;

    const newUser: User = {
      id: nextUserId,
      name: data.name,
      email: data.email,
      role: 'TEACHER'
    };

    const newTeacher: Teacher = {
      id: nextTeacherId,
      userId: nextUserId,
      name: data.name,
      email: data.email,
      employeeId: data.employeeId,
      department: data.department
    };

    this.save({
      ...this.state,
      users: [...this.state.users, newUser],
      teachers: [...this.state.teachers, newTeacher]
    });

    return newTeacher;
  }

  public deleteTeacher(id: number): boolean {
    const teacher = this.state.teachers.find(t => t.id === id);
    if (!teacher) return false;

    this.save({
      ...this.state,
      teachers: this.state.teachers.filter(t => t.id !== id),
      users: this.state.users.filter(u => u.id !== teacher.userId),
      teacherCourses: this.state.teacherCourses.filter(tc => tc.teacherId !== id)
    });
    return true;
  }

  public getCourses(): Course[] {
    return this.state.courses.map(course => {
      const enrolledCount = this.state.enrollments.filter(e => e.courseId === course.id).length;
      return {
        ...course,
        enrolledStudentsCount: enrolledCount
      };
    });
  }

  public createCourse(data: { courseCode: string; courseName: string; semester: number }): Course {
    const nextId = Math.max(0, ...this.state.courses.map(c => c.id)) + 1;
    const newCourse: Course = {
      id: nextId,
      courseCode: data.courseCode.toUpperCase(),
      courseName: data.courseName,
      semester: data.semester,
      enrolledStudentsCount: 0
    };

    this.save({
      ...this.state,
      courses: [...this.state.courses, newCourse]
    });

    return newCourse;
  }

  public getEnrollments(): Enrollment[] {
    return this.state.enrollments.map(en => {
      const student = this.state.students.find(s => s.id === en.studentId);
      const course = this.state.courses.find(c => c.id === en.courseId);
      return {
        ...en,
        studentName: student?.name || 'Unknown Student',
        rollNumber: student?.rollNumber || '',
        courseName: course?.courseName || 'Unknown Course',
        courseCode: course?.courseCode || ''
      };
    });
  }

  public enrollStudent(studentId: number, courseId: number): Enrollment {
    // Check if already enrolled
    const existing = this.state.enrollments.find(e => e.studentId === studentId && e.courseId === courseId);
    if (existing) {
      return existing;
    }

    const nextId = Math.max(0, ...this.state.enrollments.map(e => e.id)) + 1;
    const newEnrollment: Enrollment = {
      id: nextId,
      studentId,
      courseId
    };

    this.save({
      ...this.state,
      enrollments: [...this.state.enrollments, newEnrollment]
    });

    return newEnrollment;
  }

  public assignTeacherToCourse(teacherId: number, courseId: number): TeacherCourse {
    const existing = this.state.teacherCourses.find(tc => tc.teacherId === teacherId && tc.courseId === courseId);
    if (existing) return existing;

    const nextId = Math.max(0, ...this.state.teacherCourses.map(tc => tc.id)) + 1;
    const newTC: TeacherCourse = {
      id: nextId,
      teacherId,
      courseId
    };

    this.save({
      ...this.state,
      teacherCourses: [...this.state.teacherCourses, newTC]
    });

    return newTC;
  }

  public getTeacherCourses(teacherId: number): Course[] {
    const assignedIds = this.state.teacherCourses
      .filter(tc => tc.teacherId === teacherId)
      .map(tc => tc.courseId);

    return this.state.courses
      .filter(c => assignedIds.includes(c.id))
      .map(c => ({
        ...c,
        enrolledStudentsCount: this.state.enrollments.filter(e => e.courseId === c.id).length
      }));
  }

  public getCourseStudents(courseId: number): Student[] {
    const studentIds = this.state.enrollments
      .filter(e => e.courseId === courseId)
      .map(e => e.studentId);

    return this.state.students.filter(s => studentIds.includes(s.id));
  }

  // --- Attendance Sessions ---
  public startAttendanceSession(teacherId: number, courseId: number, threshold = -70): AttendanceSession {
    const course = this.state.courses.find(c => c.id === courseId);
    const teacher = this.state.teachers.find(t => t.id === teacherId);
    
    // Stop any existing active session for this course
    const updatedSessions = this.state.sessions.map(s => {
      if (s.courseId === courseId && s.active) {
        return { ...s, active: false, endTime: new Date().toISOString() };
      }
      return s;
    });

    const nextId = Math.max(0, ...this.state.sessions.map(s => s.id)) + 1;
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newSession: AttendanceSession = {
      id: nextId,
      courseId,
      teacherId,
      courseName: course?.courseName || 'Class',
      courseCode: course?.courseCode || 'COURSE',
      teacherName: teacher?.name || 'Teacher',
      sessionCode: `SESS-${course?.courseCode || 'CRS'}-${randomCode}`,
      startTime: new Date().toISOString(),
      endTime: null,
      active: true,
      rssiThreshold: threshold
    };

    this.save({
      ...this.state,
      sessions: [...updatedSessions, newSession]
    });

    return newSession;
  }

  public stopAttendanceSession(sessionId: number): AttendanceSession | null {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    const stopped: AttendanceSession = {
      ...session,
      active: false,
      endTime: new Date().toISOString()
    };

    this.save({
      ...this.state,
      sessions: this.state.sessions.map(s => s.id === sessionId ? stopped : s)
    });

    return stopped;
  }

  public getSessionById(sessionId: number): AttendanceSession | null {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    const enrolled = this.state.enrollments.filter(e => e.courseId === session.courseId).length;
    const present = this.state.attendanceRecords.filter(r => r.attendanceSessionId === sessionId && r.status === 'PRESENT').length;

    return {
      ...session,
      enrolledCount: enrolled,
      presentCount: present
    };
  }

  public getActiveSessionsForStudent(studentId: number): AttendanceSession[] {
    const enrolledCourseIds = this.state.enrollments
      .filter(e => e.studentId === studentId)
      .map(e => e.courseId);

    return this.state.sessions
      .filter(s => s.active && enrolledCourseIds.includes(s.courseId))
      .map(s => {
        const enrolled = this.state.enrollments.filter(e => e.courseId === s.courseId).length;
        const present = this.state.attendanceRecords.filter(r => r.attendanceSessionId === s.id && r.status === 'PRESENT').length;
        return {
          ...s,
          enrolledCount: enrolled,
          presentCount: present
        };
      });
  }

  public getSessionRecords(sessionId: number): AttendanceRecord[] {
    return this.state.attendanceRecords.filter(r => r.attendanceSessionId === sessionId);
  }

  public getStudentHistory(studentId: number): (AttendanceRecord & { courseName: string; courseCode: string; sessionCode: string })[] {
    return this.state.attendanceRecords
      .filter(r => r.studentId === studentId)
      .map(r => {
        const session = this.state.sessions.find(s => s.id === r.attendanceSessionId);
        return {
          ...r,
          courseName: session?.courseName || 'Unknown Course',
          courseCode: session?.courseCode || '---',
          sessionCode: session?.sessionCode || '---'
        };
      })
      .reverse();
  }

  public getAllAttendanceRecords(): (AttendanceRecord & { courseName: string; courseCode: string })[] {
    return this.state.attendanceRecords.map(r => {
      const session = this.state.sessions.find(s => s.id === r.attendanceSessionId);
      return {
        ...r,
        courseName: session?.courseName || 'Course',
        courseCode: session?.courseCode || ''
      };
    }).reverse();
  }

  // --- Mark Attendance (Backend Rule Verification Engine) ---
  public markAttendance(params: {
    sessionId: number;
    studentId: number;
    rssi: number;
  }): { success: boolean; message: string; record?: AttendanceRecord; status: string } {
    const session = this.state.sessions.find(s => s.id === params.sessionId);

    // 1. Session exists
    if (!session) {
      return { success: false, message: 'Attendance session not found.', status: 'ERROR_NOT_FOUND' };
    }

    // 2. Session is active
    if (!session.active) {
      return { success: false, message: 'This attendance session has already ended.', status: 'ERROR_SESSION_INACTIVE' };
    }

    // 3. Student is enrolled in the course
    const isEnrolled = this.state.enrollments.some(
      e => e.studentId === params.studentId && e.courseId === session.courseId
    );
    if (!isEnrolled) {
      return { success: false, message: 'Access denied: You are not enrolled in this course.', status: 'ERROR_NOT_ENROLLED' };
    }

    // 4. Student has not already marked attendance
    const alreadyMarked = this.state.attendanceRecords.find(
      r => r.attendanceSessionId === params.sessionId && r.studentId === params.studentId && r.status === 'PRESENT'
    );
    if (alreadyMarked) {
      return { success: false, message: 'Attendance has already been recorded for this session.', status: 'ALREADY_MARKED' };
    }

    const student = this.state.students.find(s => s.id === params.studentId);
    const nextRecordId = Math.max(0, ...this.state.attendanceRecords.map(r => r.id)) + 1;

    // 5. RSSI Check: RSSI >= session threshold (e.g. -70)
    if (params.rssi < session.rssiThreshold) {
      // Record rejected attempt in DB
      const rejectedRecord: AttendanceRecord = {
        id: nextRecordId,
        attendanceSessionId: params.sessionId,
        studentId: params.studentId,
        studentName: student?.name || 'Student',
        rollNumber: student?.rollNumber || '',
        timestamp: new Date().toISOString(),
        rssi: params.rssi,
        status: 'REJECTED_WEAK_SIGNAL'
      };

      this.save({
        ...this.state,
        attendanceRecords: [...this.state.attendanceRecords, rejectedRecord]
      });

      return {
        success: false,
        message: `Signal Too Weak: Move Closer To Classroom. Your RSSI (${params.rssi} dBm) is below the required threshold (${session.rssiThreshold} dBm).`,
        status: 'REJECTED_WEAK_SIGNAL',
        record: rejectedRecord
      };
    }

    // Pass all checks: Record PRESENT
    const newRecord: AttendanceRecord = {
      id: nextRecordId,
      attendanceSessionId: params.sessionId,
      studentId: params.studentId,
      studentName: student?.name || 'Student',
      rollNumber: student?.rollNumber || '',
      timestamp: new Date().toISOString(),
      rssi: params.rssi,
      status: 'PRESENT'
    };

    this.save({
      ...this.state,
      attendanceRecords: [...this.state.attendanceRecords, newRecord]
    });

    return {
      success: true,
      message: `Attendance marked successfully! RSSI: ${params.rssi} dBm (Inside classroom range).`,
      status: 'PRESENT',
      record: newRecord
    };
  }
}

export const mockDb = new MockDatabase();
