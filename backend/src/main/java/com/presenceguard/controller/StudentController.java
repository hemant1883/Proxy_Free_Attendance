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
    public ResponseEntity<List<Course>> getEnrolledCourses(@RequestParam(defaultValue = "1") Long studentId) {
        return ResponseEntity.ok(studentService.getEnrolledCourses(studentId));
    }

    @GetMapping("/attendance/active")
    public ResponseEntity<List<AttendanceSession>> getActiveSessions(@RequestParam(defaultValue = "1") Long studentId) {
        return ResponseEntity.ok(studentService.getActiveAttendanceSessions(studentId));
    }

    @PostMapping("/attendance/mark")
    public ResponseEntity<AttendanceResponse> markAttendance(@Valid @RequestBody MarkAttendanceRequest request) {
        AttendanceResponse response = attendanceService.markAttendance(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/attendance/history")
    public ResponseEntity<List<AttendanceRecord>> getAttendanceHistory(@RequestParam(defaultValue = "1") Long studentId) {
        return ResponseEntity.ok(studentService.getAttendanceHistory(studentId));
    }
}
