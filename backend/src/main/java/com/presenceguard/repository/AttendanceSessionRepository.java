package com.presenceguard.repository;

import com.presenceguard.entity.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {
    Optional<AttendanceSession> findBySessionCode(String sessionCode);
    List<AttendanceSession> findByCourseIdAndActiveTrue(Long courseId);
    List<AttendanceSession> findByTeacherIdOrderByStartTimeDesc(Long teacherId);
    List<AttendanceSession> findByActiveTrue();
}
