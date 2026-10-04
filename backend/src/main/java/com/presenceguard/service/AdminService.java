package com.presenceguard.service;

import com.presenceguard.dto.CreateCourseRequest;
import com.presenceguard.dto.CreateStudentRequest;
import com.presenceguard.dto.CreateTeacherRequest;
import com.presenceguard.entity.*;
import com.presenceguard.exception.BadRequestException;
import com.presenceguard.exception.ResourceNotFoundException;
import com.presenceguard.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(UserRepository userRepository,
                        StudentRepository studentRepository,
                        TeacherRepository teacherRepository,
                        CourseRepository courseRepository,
                        EnrollmentRepository enrollmentRepository,
                        TeacherCourseRepository teacherCourseRepository,
                        AttendanceRecordRepository attendanceRecordRepository,
                        PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // --- Students ---
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    @Transactional
    public Student createStudent(CreateStudentRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email is already registered: " + req.getEmail());
        }
        if (studentRepository.existsByRollNumber(req.getRollNumber())) {
            throw new BadRequestException("Roll number is already registered: " + req.getRollNumber());
        }

        User user = new User(
                req.getName(),
                req.getEmail(),
                passwordEncoder.encode(req.getPassword()),
                UserRole.STUDENT
        );
        User savedUser = userRepository.save(user);

        Student student = new Student(
                savedUser,
                req.getRollNumber(),
                req.getDepartment(),
                req.getSemester()
        );
        return studentRepository.save(student);
    }

    @Transactional
    public Student updateStudent(Long id, CreateStudentRequest req) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        student.getUser().setName(req.getName());
        student.getUser().setEmail(req.getEmail());
        student.setRollNumber(req.getRollNumber());
        student.setDepartment(req.getDepartment());
        student.setSemester(req.getSemester());

        return studentRepository.save(student);
    }

    @Transactional
    public void deleteStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));
        studentRepository.delete(student);
        userRepository.delete(student.getUser());
    }

    // --- Teachers ---
    public List<Teacher> getAllTeachers() {
        return teacherRepository.findAll();
    }

    @Transactional
    public Teacher createTeacher(CreateTeacherRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email is already registered: " + req.getEmail());
        }
        if (teacherRepository.existsByEmployeeId(req.getEmployeeId())) {
            throw new BadRequestException("Employee ID is already registered: " + req.getEmployeeId());
        }

        User user = new User(
                req.getName(),
                req.getEmail(),
                passwordEncoder.encode(req.getPassword()),
                UserRole.TEACHER
        );
        User savedUser = userRepository.save(user);

        Teacher teacher = new Teacher(
                savedUser,
                req.getEmployeeId(),
                req.getDepartment()
        );
        return teacherRepository.save(teacher);
    }

    @Transactional
    public void deleteTeacher(Long id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with ID: " + id));
        teacherRepository.delete(teacher);
        userRepository.delete(teacher.getUser());
    }

    // --- Courses ---
    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    public Course createCourse(CreateCourseRequest req) {
        if (courseRepository.existsByCourseCode(req.getCourseCode())) {
            throw new BadRequestException("Course code already exists: " + req.getCourseCode());
        }
        Course course = new Course(
                req.getCourseCode(),
                req.getCourseName(),
                req.getSemester()
        );
        return courseRepository.save(course);
    }

    // --- Enrollments & Assignments ---
    public List<Enrollment> getAllEnrollments() {
        return enrollmentRepository.findAll();
    }

    @Transactional
    public Enrollment enrollStudent(Long studentId, Long courseId) {
        if (enrollmentRepository.existsByStudentIdAndCourseId(studentId, courseId)) {
            throw new BadRequestException("Student is already enrolled in this course.");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with ID: " + courseId));

        Enrollment enrollment = new Enrollment(student, course);
        return enrollmentRepository.save(enrollment);
    }

    @Transactional
    public TeacherCourse assignTeacherToCourse(Long teacherId, Long courseId) {
        if (teacherCourseRepository.existsByTeacherIdAndCourseId(teacherId, courseId)) {
            throw new BadRequestException("Teacher is already assigned to this course.");
        }

        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with ID: " + teacherId));

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with ID: " + courseId));

        TeacherCourse tc = new TeacherCourse(teacher, course);
        return teacherCourseRepository.save(tc);
    }

    public List<AttendanceRecord> getAllAttendanceRecords() {
        return attendanceRecordRepository.findAll();
    }
}
