package com.presenceguard.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_sessions")
public class AttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @Column(name = "session_code", nullable = false, unique = true, length = 64)
    private String sessionCode;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime = LocalDateTime.now();

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "rssi_threshold", nullable = false)
    private Integer rssiThreshold = -70;

    public AttendanceSession() {}

    public AttendanceSession(Course course, Teacher teacher, String sessionCode, Integer rssiThreshold) {
        this.course = course;
        this.teacher = teacher;
        this.sessionCode = sessionCode;
        this.rssiThreshold = (rssiThreshold != null) ? rssiThreshold : -70;
        this.active = true;
        this.startTime = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }

    public Teacher getTeacher() { return teacher; }
    public void setTeacher(Teacher teacher) { this.teacher = teacher; }

    public String getSessionCode() { return sessionCode; }
    public void setSessionCode(String sessionCode) { this.sessionCode = sessionCode; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Integer getRssiThreshold() { return rssiThreshold; }
    public void setRssiThreshold(Integer rssiThreshold) { this.rssiThreshold = rssiThreshold; }
}
