package com.presenceguard.service;

import com.presenceguard.entity.AttendanceRecord;
import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.entity.Course;
import com.presenceguard.entity.Student;
import com.presenceguard.entity.Teacher;
import com.presenceguard.entity.User;
import com.presenceguard.exception.BadRequestException;
import com.presenceguard.exception.ResourceNotFoundException;
import com.presenceguard.repository.*;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    public TeacherService(TeacherRepository teacherRepository,
                          UserRepository userRepository,
                          TeacherCourseRepository teacherCourseRepository,
                          CourseRepository courseRepository,
                          EnrollmentRepository enrollmentRepository,
                          AttendanceSessionRepository attendanceSessionRepository,
                          AttendanceRecordRepository attendanceRecordRepository) {
        this.teacherRepository = teacherRepository;
        this.userRepository = userRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.attendanceSessionRepository = attendanceSessionRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
    }

    public Long resolveTeacherId(Long requestedTeacherId, String authenticatedEmail) {
        if (authenticatedEmail != null) {
            Long authTeacherId = userRepository.findByEmail(authenticatedEmail)
                    .flatMap(u -> teacherRepository.findByUserId(u.getId()))
                    .map(Teacher::getId)
                    .orElse(null);
            if (authTeacherId != null) {
                return authTeacherId;
            }
        }
        if (requestedTeacherId != null && requestedTeacherId > 0 && teacherRepository.existsById(requestedTeacherId)) {
            return requestedTeacherId;
        }
        return teacherRepository.findAll().stream().findFirst().map(Teacher::getId).orElse(requestedTeacherId);
    }

    @Transactional(readOnly = true)
    public List<Course> getAssignedCourses(Long teacherId) {
        return teacherCourseRepository.findByTeacherId(teacherId)
                .stream()
                .map(tc -> (Course) Hibernate.unproxy(tc.getCourse()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Student> getEnrolledStudents(Long courseId) {
        return enrollmentRepository.findByCourseId(courseId)
                .stream()
                .map(e -> (Student) Hibernate.unproxy(e.getStudent()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttendanceSession> getActiveSessions(Long teacherId) {
        if (teacherId != null && teacherId > 0) {
            return attendanceSessionRepository.findByTeacherIdAndActiveTrueOrderByStartTimeDesc(teacherId);
        }
        return attendanceSessionRepository.findByActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getTeacherHistory(Long teacherId) {
        if (teacherId != null && teacherId > 0) {
            return attendanceRecordRepository.findByAttendanceSessionTeacherIdOrderByTimestampDesc(teacherId);
        }
        return attendanceRecordRepository.findAll();
    }

    @Transactional
    public AttendanceSession startAttendanceSession(Long teacherId, Long courseId, Integer threshold) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with ID: " + teacherId));

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with ID: " + courseId));

        // Stop any currently active session for this course
        List<AttendanceSession> activeSessions = attendanceSessionRepository.findByCourseIdAndActiveTrue(courseId);
        for (AttendanceSession s : activeSessions) {
            s.setActive(false);
            s.setEndTime(LocalDateTime.now());
            attendanceSessionRepository.save(s);
        }

        String randomCode = "SESS-" + course.getCourseCode() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        int rssiLimit = (threshold != null) ? threshold : -70;

        AttendanceSession newSession = new AttendanceSession(course, teacher, randomCode, rssiLimit);
        return attendanceSessionRepository.save(newSession);
    }

    @Transactional
    public AttendanceSession stopAttendanceSession(Long sessionId) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found with ID: " + sessionId));

        session.setActive(false);
        session.setEndTime(LocalDateTime.now());
        return attendanceSessionRepository.save(session);
    }

    public AttendanceSession getSessionById(Long sessionId) {
        return attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found with ID: " + sessionId));
    }
}
