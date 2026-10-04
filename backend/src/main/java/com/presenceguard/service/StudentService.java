package com.presenceguard.service;

import com.presenceguard.entity.AttendanceRecord;
import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.entity.Course;
import com.presenceguard.entity.Enrollment;
import com.presenceguard.repository.AttendanceRecordRepository;
import com.presenceguard.repository.AttendanceSessionRepository;
import com.presenceguard.repository.EnrollmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StudentService {

    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    public StudentService(EnrollmentRepository enrollmentRepository,
                          AttendanceSessionRepository attendanceSessionRepository,
                          AttendanceRecordRepository attendanceRecordRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.attendanceSessionRepository = attendanceSessionRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
    }

    public List<Course> getEnrolledCourses(Long studentId) {
        return enrollmentRepository.findByStudentId(studentId)
                .stream()
                .map(Enrollment::getCourse)
                .collect(Collectors.toList());
    }

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

    public List<AttendanceRecord> getAttendanceHistory(Long studentId) {
        return attendanceRecordRepository.findByStudentIdOrderByTimestampDesc(studentId);
    }
}
