package com.presenceguard.service;

import com.presenceguard.dto.AttendanceResponse;
import com.presenceguard.dto.MarkAttendanceRequest;
import com.presenceguard.dto.SessionDetailsResponse;
import com.presenceguard.entity.AttendanceRecord;
import com.presenceguard.entity.AttendanceSession;
import com.presenceguard.entity.AttendanceStatus;
import com.presenceguard.entity.Student;
import com.presenceguard.exception.BadRequestException;
import com.presenceguard.exception.ResourceNotFoundException;
import com.presenceguard.repository.AttendanceRecordRepository;
import com.presenceguard.repository.AttendanceSessionRepository;
import com.presenceguard.repository.EnrollmentRepository;
import com.presenceguard.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AttendanceService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;

    public AttendanceService(AttendanceSessionRepository attendanceSessionRepository,
                             AttendanceRecordRepository attendanceRecordRepository,
                             StudentRepository studentRepository,
                             EnrollmentRepository enrollmentRepository) {
        this.attendanceSessionRepository = attendanceSessionRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    /**
     * Core Phase 1 Presence Verification Logic
     * Enforces the 5 server-authoritative presence checks.
     */
    @Transactional
    public AttendanceResponse markAttendance(MarkAttendanceRequest req) {
        // 1. Session exists check
        AttendanceSession session = attendanceSessionRepository.findById(req.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found with ID: " + req.getSessionId()));

        // 2. Session is active check
        if (!Boolean.TRUE.equals(session.getActive())) {
            throw new BadRequestException("Attendance session has ended or is not active.");
        }

        Student student = studentRepository.findById(req.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found with ID: " + req.getStudentId()));

        // 3. Student enrolled in course check
        boolean isEnrolled = enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), session.getCourse().getId());
        if (!isEnrolled) {
            throw new BadRequestException("Access Denied: Student is not enrolled in course " + session.getCourse().getCourseCode());
        }

        // 4. Duplicate attendance check
        boolean alreadyMarked = attendanceRecordRepository.existsByAttendanceSessionIdAndStudentIdAndStatus(
                session.getId(), student.getId(), AttendanceStatus.PRESENT);
        if (alreadyMarked) {
            throw new BadRequestException("Attendance has already been recorded for this session.");
        }

        // 5. RSSI Threshold validation: RSSI >= session threshold (e.g. -70 dBm)
        int threshold = session.getRssiThreshold() != null ? session.getRssiThreshold() : -70;

        if (req.getRssi() < threshold) {
            // Signal is too weak: persist rejection audit record in database
            AttendanceRecord rejectedRecord = new AttendanceRecord(
                    session,
                    student,
                    req.getRssi(),
                    AttendanceStatus.REJECTED_WEAK_SIGNAL
            );
            attendanceRecordRepository.save(rejectedRecord);

            throw new BadRequestException(String.format(
                    "Signal Too Weak: Move Closer To Classroom. Measured RSSI (%d dBm) is below threshold (%d dBm).",
                    req.getRssi(), threshold));
        }

        // All 5 verification checks passed: Record PRESENT
        AttendanceRecord record = new AttendanceRecord(
                session,
                student,
                req.getRssi(),
                AttendanceStatus.PRESENT
        );
        AttendanceRecord savedRecord = attendanceRecordRepository.save(record);

        return new AttendanceResponse(
                savedRecord.getId(),
                session.getId(),
                student.getId(),
                student.getUser().getName(),
                student.getRollNumber(),
                savedRecord.getRssi(),
                savedRecord.getStatus(),
                "Attendance verified and recorded successfully via BLE proximity gating.",
                savedRecord.getTimestamp()
        );
    }

    public SessionDetailsResponse getSessionLiveDetails(Long sessionId) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));

        long totalEnrolled = enrollmentRepository.countByCourseId(session.getCourse().getId());
        long presentCount = attendanceRecordRepository.countByAttendanceSessionIdAndStatus(sessionId, AttendanceStatus.PRESENT);
        long remaining = Math.max(0, totalEnrolled - presentCount);

        List<AttendanceResponse> records = attendanceRecordRepository.findByAttendanceSessionId(sessionId)
                .stream()
                .map(r -> new AttendanceResponse(
                        r.getId(),
                        r.getAttendanceSession().getId(),
                        r.getStudent().getId(),
                        r.getStudent().getUser().getName(),
                        r.getStudent().getRollNumber(),
                        r.getRssi(),
                        r.getStatus(),
                        "",
                        r.getTimestamp()
                ))
                .collect(Collectors.toList());

        return new SessionDetailsResponse(session, totalEnrolled, presentCount, remaining, records);
    }
}
