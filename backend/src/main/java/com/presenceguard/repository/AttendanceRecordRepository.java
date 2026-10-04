package com.presenceguard.repository;

import com.presenceguard.entity.AttendanceRecord;
import com.presenceguard.entity.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByAttendanceSessionId(Long sessionId);
    List<AttendanceRecord> findByStudentIdOrderByTimestampDesc(Long studentId);
    Optional<AttendanceRecord> findByAttendanceSessionIdAndStudentId(Long sessionId, Long studentId);
    boolean existsByAttendanceSessionIdAndStudentIdAndStatus(Long sessionId, Long studentId, AttendanceStatus status);
    long countByAttendanceSessionIdAndStatus(Long sessionId, AttendanceStatus status);
}
