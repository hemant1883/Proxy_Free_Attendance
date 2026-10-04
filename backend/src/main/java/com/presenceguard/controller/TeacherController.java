package com.presenceguard.controller;

import com.presenceguard.dto.SessionDetailsResponse;
import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.entity.Course;
import com.presenceguard.entity.Student;
import com.presenceguard.service.AttendanceService;
import com.presenceguard.service.TeacherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public ResponseEntity<List<Course>> getAssignedCourses(@RequestParam(defaultValue = "1") Long teacherId) {
        return ResponseEntity.ok(teacherService.getAssignedCourses(teacherId));
    }

    @GetMapping("/courses/{courseId}/students")
    public ResponseEntity<List<Student>> getCourseStudents(@PathVariable Long courseId) {
        return ResponseEntity.ok(teacherService.getEnrolledStudents(courseId));
    }

    @PostMapping("/attendance/start/{courseId}")
    public ResponseEntity<AttendanceSession> startAttendance(
            @PathVariable Long courseId,
            @RequestBody(required = false) Map<String, Object> payload) {

        Long teacherId = payload != null && payload.containsKey("teacherId")
                ? Long.valueOf(payload.get("teacherId").toString())
                : 1L;

        Integer threshold = payload != null && payload.containsKey("rssiThreshold")
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
