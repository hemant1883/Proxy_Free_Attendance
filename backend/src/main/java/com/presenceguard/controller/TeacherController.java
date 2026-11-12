package com.presenceguard.controller;

import com.presenceguard.dto.SessionDetailsResponse;
import com.presenceguard.entity.AttendanceRecord;
import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.entity.Course;
import com.presenceguard.entity.Student;
import com.presenceguard.service.AttendanceService;
import com.presenceguard.service.TeacherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
@CrossOrigin(origins = "*")
public class TeacherController {

    private final TeacherService teacherService;
    private final AttendanceService attendanceService;

    public TeacherController(TeacherService teacherService, AttendanceService attendanceService) {
        this.teacherService = teacherService;
        this.attendanceService = attendanceService;
    }

    @GetMapping("/courses")
    public ResponseEntity<List<Course>> getAssignedCourses(
            @RequestParam(required = false) Long teacherId,
            Authentication authentication) {
        Long resolvedId = teacherService.resolveTeacherId(teacherId, authentication != null ? authentication.getName() : null);
        return ResponseEntity.ok(teacherService.getAssignedCourses(resolvedId));
    }

    @GetMapping("/courses/{courseId}/students")
    public ResponseEntity<List<Student>> getCourseStudents(@PathVariable Long courseId) {
        return ResponseEntity.ok(teacherService.getEnrolledStudents(courseId));
    }

    @GetMapping("/attendance/active")
    public ResponseEntity<List<AttendanceSession>> getActiveSessions(
            @RequestParam(required = false) Long teacherId,
            Authentication authentication) {
        Long resolvedId = teacherService.resolveTeacherId(teacherId, authentication != null ? authentication.getName() : null);
        return ResponseEntity.ok(teacherService.getActiveSessions(resolvedId));
    }

    @GetMapping("/attendance/history")
    public ResponseEntity<List<AttendanceRecord>> getTeacherHistory(
            @RequestParam(required = false) Long teacherId,
            Authentication authentication) {
        Long resolvedId = teacherService.resolveTeacherId(teacherId, authentication != null ? authentication.getName() : null);
        return ResponseEntity.ok(teacherService.getTeacherHistory(resolvedId));
    }

    @PostMapping("/attendance/start/{courseId}")
    public ResponseEntity<AttendanceSession> startAttendance(
            @PathVariable Long courseId,
            @RequestBody(required = false) Map<String, Object> payload,
            Authentication authentication) {

        Long requestedId = payload != null && payload.get("teacherId") != null
                ? Long.valueOf(payload.get("teacherId").toString())
                : null;
        Long teacherId = teacherService.resolveTeacherId(requestedId, authentication != null ? authentication.getName() : null);

        Integer threshold = payload != null && payload.get("rssiThreshold") != null
                ? Integer.valueOf(payload.get("rssiThreshold").toString())
                : -70;

        AttendanceSession session = teacherService.startAttendanceSession(teacherId, courseId, threshold);
        return new ResponseEntity<>(session, HttpStatus.CREATED);
    }

    @PostMapping("/attendance/{sessionId}/stop")
    public ResponseEntity<AttendanceSession> stopAttendance(@PathVariable Long sessionId) {
        AttendanceSession session = teacherService.stopAttendanceSession(sessionId);
        return ResponseEntity.ok(session);
    }

    @GetMapping("/attendance/{sessionId}")
    public ResponseEntity<SessionDetailsResponse> getSessionDetails(@PathVariable Long sessionId) {
        SessionDetailsResponse details = attendanceService.getSessionLiveDetails(sessionId);
        return ResponseEntity.ok(details);
    }
}
