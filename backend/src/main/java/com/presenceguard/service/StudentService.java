package com.presenceguard.service;

import com.presenceguard.entity.AttendanceRecord;
import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.entity.Course;
import com.presenceguard.entity.Enrollment;
import com.presenceguard.entity.Student;
import com.presenceguard.repository.AttendanceRecordRepository;
import com.presenceguard.repository.AttendanceSessionRepository;
import com.presenceguard.repository.EnrollmentRepository;
import com.presenceguard.repository.StudentRepository;
import com.presenceguard.repository.UserRepository;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StudentService {

    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public StudentService(EnrollmentRepository enrollmentRepository,
                          AttendanceSessionRepository attendanceSessionRepository,
                          AttendanceRecordRepository attendanceRecordRepository,
                          StudentRepository studentRepository,
                          UserRepository userRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.attendanceSessionRepository = attendanceSessionRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
    }

    public Long resolveStudentId(Long requestedStudentId, String authenticatedEmail) {
        if (authenticatedEmail != null) {
            Long authStudentId = userRepository.findByEmail(authenticatedEmail)
                    .flatMap(u -> studentRepository.findByUserId(u.getId()))
                    .map(Student::getId)
                    .orElse(null);
            if (authStudentId != null) {
                return authStudentId;
            }
        }
        if (requestedStudentId != null && requestedStudentId > 0 && studentRepository.existsById(requestedStudentId)) {
            return requestedStudentId;
        }
        return studentRepository.findAll().stream().findFirst().map(Student::getId).orElse(requestedStudentId);
    }

    @Transactional(readOnly = true)
    public List<Course> getEnrolledCourses(Long studentId) {
        return enrollmentRepository.findByStudentId(studentId)
                .stream()
                .map(e -> (Course) Hibernate.unproxy(e.getCourse()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttendanceSession> getActiveAttendanceSessions(Long studentId) {
        Set<Long> enrolledCourseIds = enrollmentRepository.findByStudentId(studentId)
                .stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toSet());

        return attendanceSessionRepository.findByActiveTrue()
                .stream()
                .filter(session -> enrolledCourseIds.contains(session.getCourse().getId()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getAttendanceHistory(Long studentId) {
        return attendanceRecordRepository.findByStudentIdOrderByTimestampDesc(studentId);
    }
}
