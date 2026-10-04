package com.presenceguard.config;

import com.presenceguard.entity.*;
import com.presenceguard.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

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

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return; // Seed data already exists
        }

        // 1. Admin User
        User adminUser = new User("System Administrator", "admin@college.com", passwordEncoder.encode("admin123"), UserRole.ADMIN);
        userRepository.save(adminUser);

        // 2. Teacher User & Profile
        User teacherUser = new User("Prof. Rajesh Sharma", "teacher@college.com", passwordEncoder.encode("teacher123"), UserRole.TEACHER);
        userRepository.save(teacherUser);
        Teacher teacher = new Teacher(teacherUser, "EMP-CSE-104", "Computer Science");
        teacherRepository.save(teacher);

        // 3. Student User & Profile
        User studentUser = new User("Hemant Singh", "student@college.com", passwordEncoder.encode("student123"), UserRole.STUDENT);
        userRepository.save(studentUser);
        Student student = new Student(studentUser, "21CSE101", "Computer Science", 6);
        studentRepository.save(student);

        // Additional sample students
        User studentUser2 = new User("Priya Sharma", "priya@college.com", passwordEncoder.encode("student123"), UserRole.STUDENT);
        userRepository.save(studentUser2);
        Student student2 = new Student(studentUser2, "21CSE102", "Computer Science", 6);
        studentRepository.save(student2);

        // 4. Sample Courses
        Course course1 = new Course("CS301", "Java Programming", 6);
        Course course2 = new Course("CS302", "Database Management Systems", 6);
        Course course3 = new Course("CS303", "Computer Networks", 6);
        courseRepository.save(course1);
        courseRepository.save(course2);
        courseRepository.save(course3);

        // 5. Assign Teacher to CS301 & CS302
        teacherCourseRepository.save(new TeacherCourse(teacher, course1));
        teacherCourseRepository.save(new TeacherCourse(teacher, course2));

        // 6. Enroll Students into CS301
        enrollmentRepository.save(new Enrollment(student, course1));
        enrollmentRepository.save(new Enrollment(student, course2));
        enrollmentRepository.save(new Enrollment(student2, course1));

        System.out.println(">>> [PresenceGuard] Phase 1 Database successfully seeded with demo accounts.");
    }
}
