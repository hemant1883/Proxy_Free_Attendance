package com.presenceguard.service;

import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.entity.Course;
import com.presenceguard.entity.Student;
import com.presenceguard.entity.Teacher;
import com.presenceguard.exception.BadRequestException;
import com.presenceguard.exception.ResourceNotFoundException;
import com.presenceguard.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;

    public TeacherService(TeacherRepository teacherRepository,
                          TeacherCourseRepository teacherCourseRepository,
                          CourseRepository courseRepository,
                          EnrollmentRepository enrollmentRepository,
                          AttendanceSessionRepository attendanceSessionRepository) {
        this.teacherRepository = teacherRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.attendanceSessionRepository = attendanceSessionRepository;
    }

    public List<Course> getAssignedCourses(Long teacherId) {
        return teacherCourseRepository.findByTeacherId(teacherId)
                .stream()
                .map(tc -> tc.getCourse())
                .collect(Collectors.toList());
    }

    public List<Student> getEnrolledStudents(Long courseId) {
        return enrollmentRepository.findByCourseId(courseId)
                .stream()
                .map(e -> e.getStudent())
                .collect(Collectors.toList());
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
