package com.presenceguard.controller;

import com.presenceguard.dto.AttendanceResponse;
import com.presenceguard.dto.MarkAttendanceRequest;
import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.repository.AttendanceSessionRepository;
import com.presenceguard.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AttendanceSessionRepository attendanceSessionRepository;

    public AttendanceController(AttendanceService attendanceService,
                                AttendanceSessionRepository attendanceSessionRepository) {
        this.attendanceService = attendanceService;
        this.attendanceSessionRepository = attendanceSessionRepository;
    }

    @GetMapping("/active")
    public ResponseEntity<List<AttendanceSession>> getAllActiveSessions() {
        return ResponseEntity.ok(attendanceSessionRepository.findByActiveTrue());
    }

    @PostMapping("/mark")
    public ResponseEntity<AttendanceResponse> markAttendance(@Valid @RequestBody MarkAttendanceRequest request) {
        AttendanceResponse response = attendanceService.markAttendance(request);
        return ResponseEntity.ok(response);
    }
}
