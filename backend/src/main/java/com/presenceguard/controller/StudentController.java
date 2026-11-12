package com.presenceguard.controller;

import com.presenceguard.dto.AttendanceResponse;
import com.presenceguard.dto.MarkAttendanceRequest;
import com.presenceguard.entity.AttendanceRecord;
import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.entity.Course;
import com.presenceguard.service.AttendanceService;
import com.presenceguard.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
@CrossOrigin(origins = "*")
public class StudentController {

    private final StudentService studentService;
    private final AttendanceService attendanceService;

    public StudentController(StudentService studentService, AttendanceService attendanceService) {
        this.studentService = studentService;
        this.attendanceService = attendanceService;
    }

    @GetMapping("/courses")
    public ResponseEntity<List<Course>> getEnrolledCourses(
            @RequestParam(required = false) Long studentId,
            Authentication authentication) {
        Long resolvedId = studentService.resolveStudentId(studentId, authentication != null ? authentication.getName() : null);
        return ResponseEntity.ok(studentService.getEnrolledCourses(resolvedId));
    }

    @GetMapping("/attendance/active")
    public ResponseEntity<List<AttendanceSession>> getActiveSessions(
            @RequestParam(required = false) Long studentId,
            Authentication authentication) {
        Long resolvedId = studentService.resolveStudentId(studentId, authentication != null ? authentication.getName() : null);
        return ResponseEntity.ok(studentService.getActiveAttendanceSessions(resolvedId));
    }

    @PostMapping("/attendance/mark")
    public ResponseEntity<AttendanceResponse> markAttendance(@Valid @RequestBody MarkAttendanceRequest request) {
        AttendanceResponse response = attendanceService.markAttendance(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/attendance/history")
    public ResponseEntity<List<AttendanceRecord>> getAttendanceHistory(
            @RequestParam(required = false) Long studentId,
            Authentication authentication) {
        Long resolvedId = studentService.resolveStudentId(studentId, authentication != null ? authentication.getName() : null);
        return ResponseEntity.ok(studentService.getAttendanceHistory(resolvedId));
    }
}
