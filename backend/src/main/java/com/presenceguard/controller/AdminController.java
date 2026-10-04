package com.presenceguard.controller;

import com.presenceguard.dto.CreateCourseRequest;
import com.presenceguard.dto.CreateStudentRequest;
import com.presenceguard.dto.CreateTeacherRequest;
import com.presenceguard.dto.EnrollmentRequest;
import com.presenceguard.entity.*;
import com.presenceguard.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // --- Students ---
    @GetMapping("/students")
    public ResponseEntity<List<Student>> getStudents() {
        return ResponseEntity.ok(adminService.getAllStudents());
    }

    @PostMapping("/students")
    public ResponseEntity<Student> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        Student student = adminService.createStudent(request);
        return new ResponseEntity<>(student, HttpStatus.CREATED);
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<Student> updateStudent(@PathVariable Long id, @Valid @RequestBody CreateStudentRequest request) {
        Student student = adminService.updateStudent(id, request);
        return ResponseEntity.ok(student);
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<Map<String, String>> deleteStudent(@PathVariable Long id) {
        adminService.deleteStudent(id);
        return ResponseEntity.ok(Map.of("message", "Student deleted successfully"));
    }

    // --- Teachers ---
    @GetMapping("/teachers")
    public ResponseEntity<List<Teacher>> getTeachers() {
        return ResponseEntity.ok(adminService.getAllTeachers());
    }

    @PostMapping("/teachers")
    public ResponseEntity<Teacher> createTeacher(@Valid @RequestBody CreateTeacherRequest request) {
        Teacher teacher = adminService.createTeacher(request);
        return new ResponseEntity<>(teacher, HttpStatus.CREATED);
    }

    @DeleteMapping("/teachers/{id}")
    public ResponseEntity<Map<String, String>> deleteTeacher(@PathVariable Long id) {
        adminService.deleteTeacher(id);
        return ResponseEntity.ok(Map.of("message", "Teacher deleted successfully"));
    }

    // --- Courses ---
    @GetMapping("/courses")
    public ResponseEntity<List<Course>> getCourses() {
        return ResponseEntity.ok(adminService.getAllCourses());
    }

    @PostMapping("/courses")
    public ResponseEntity<Course> createCourse(@Valid @RequestBody CreateCourseRequest request) {
        Course course = adminService.createCourse(request);
        return new ResponseEntity<>(course, HttpStatus.CREATED);
    }

    // --- Enrollments ---
    @GetMapping("/enrollments")
    public ResponseEntity<List<Enrollment>> getEnrollments() {
        return ResponseEntity.ok(adminService.getAllEnrollments());
    }

    @PostMapping("/enrollments")
    public ResponseEntity<Enrollment> enrollStudent(@Valid @RequestBody EnrollmentRequest request) {
        Enrollment enrollment = adminService.enrollStudent(request.getStudentId(), request.getCourseId());
        return new ResponseEntity<>(enrollment, HttpStatus.CREATED);
    }

    @PostMapping("/teacher-courses")
    public ResponseEntity<TeacherCourse> assignTeacherToCourse(@RequestBody Map<String, Long> payload) {
        Long teacherId = payload.get("teacherId");
        Long courseId = payload.get("courseId");
        TeacherCourse tc = adminService.assignTeacherToCourse(teacherId, courseId);
        return new ResponseEntity<>(tc, HttpStatus.CREATED);
    }

    // --- Attendance Logs ---
    @GetMapping("/attendance")
    public ResponseEntity<List<AttendanceRecord>> getAllAttendance() {
        return ResponseEntity.ok(adminService.getAllAttendanceRecords());
    }
}
