package com.presenceguard.config;

import com.presenceguard.entity.*;
import com.presenceguard.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Configuration
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository,
                          StudentRepository studentRepository,
                          TeacherRepository teacherRepository,
                          CourseRepository courseRepository,
                          EnrollmentRepository enrollmentRepository,
                          TeacherCourseRepository teacherCourseRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private Course ensureCourse(String code, String name, int semester) {
        return courseRepository.findByCourseCode(code)
                .orElseGet(() -> courseRepository.save(new Course(code, name, semester)));
    }

    private User ensureUser(String name, String email, String rawPassword, UserRole role) {
        return userRepository.findByEmail(email).map(existing -> {
            if (!passwordEncoder.matches(rawPassword, existing.getPassword())) {
                existing.setPassword(passwordEncoder.encode(rawPassword));
                return userRepository.save(existing);
            }
            return existing;
        }).orElseGet(() -> userRepository.save(new User(name, email, passwordEncoder.encode(rawPassword), role)));
    }

    private Teacher ensureTeacher(User user, String employeeId, String department) {
        return teacherRepository.findByUserId(user.getId()).orElseGet(() -> {
            String safeEmpId = teacherRepository.existsByEmployeeId(employeeId)
                    ? employeeId + "-" + user.getId()
                    : employeeId;
            return teacherRepository.save(new Teacher(user, safeEmpId, department));
        });
    }

    private Student ensureStudent(User user, String rollNumber, String department, int semester) {
        return studentRepository.findByUserId(user.getId()).orElseGet(() -> {
            String safeRoll = studentRepository.existsByRollNumber(rollNumber)
                    ? rollNumber + "-" + user.getId()
                    : rollNumber;
            return studentRepository.save(new Student(user, safeRoll, department, semester));
        });
    }

    private void ensureTeacherCourse(Teacher teacher, Course course) {
        if (!teacherCourseRepository.existsByTeacherIdAndCourseId(teacher.getId(), course.getId())) {
            teacherCourseRepository.save(new TeacherCourse(teacher, course));
        }
    }

    private void ensureEnrollment(Student student, Course course) {
        if (!enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), course.getId())) {
            enrollmentRepository.save(new Enrollment(student, course));
        }
    }

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Ensure Core Courses
        Course cs301 = ensureCourse("CS301", "Java Programming", 6);
        Course cs302 = ensureCourse("CS302", "Database Management Systems", 6);
        Course cs303 = ensureCourse("CS303", "Computer Networks", 6);
        Course cs304 = ensureCourse("CS304", "Compiler Design", 6);

        // 2. Ensure Admin
        ensureUser("System Administrator", "admin@college.com", "admin123", UserRole.ADMIN);

        // 3. Ensure Teachers
        User cseTeacherUser = ensureUser("Prof. Rajesh Sharma", "teacher@college.com", "teacher123", UserRole.TEACHER);
        Teacher cseTeacher = ensureTeacher(cseTeacherUser, "EMP-CSE-104", "Computer Science");
        ensureTeacherCourse(cseTeacher, cs301);
        ensureTeacherCourse(cseTeacher, cs302);
        ensureTeacherCourse(cseTeacher, cs303);

        User bcaTeacherUser = ensureUser("Prof. Alok Verma", "teacher.bca@college.com", "teacher123", UserRole.TEACHER);
        Teacher bcaTeacher = ensureTeacher(bcaTeacherUser, "EMP-BCA-201", "BCA / Computer Applications");
        ensureTeacherCourse(bcaTeacher, cs304);

        // 4. Ensure Students & Enrollments across active demo courses
        User hemantUser = ensureUser("Hemant Singh", "student@college.com", "student123", UserRole.STUDENT);
        Student hemant = ensureStudent(hemantUser, "21CSE101", "Computer Science", 6);
        ensureEnrollment(hemant, cs301);
        ensureEnrollment(hemant, cs302);
        ensureEnrollment(hemant, cs303);
        ensureEnrollment(hemant, cs304);

        User omUser = ensureUser("Om Bijwe", "om@college.com", "student123", UserRole.STUDENT);
        Student om = ensureStudent(omUser, "21CSE105", "Computer Science", 6);
        ensureEnrollment(om, cs301);
        ensureEnrollment(om, cs302);
        ensureEnrollment(om, cs303);
        ensureEnrollment(om, cs304);

        User priyaUser = ensureUser("Priya Sharma", "priya@college.com", "student123", UserRole.STUDENT);
        Student priya = ensureStudent(priyaUser, "21CSE102", "Computer Science", 6);
        ensureEnrollment(priya, cs301);
        ensureEnrollment(priya, cs304);

        System.out.println(">>> [PresenceGuard] Database verified & seeded idempotently (Admin, Teachers, Students, Courses, Enrollments).");
    }
}
