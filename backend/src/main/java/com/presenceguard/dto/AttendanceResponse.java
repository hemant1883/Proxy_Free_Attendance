package com.presenceguard.dto;

import com.presenceguard.entity.AttendanceStatus;
import java.time.LocalDateTime;

public class AttendanceResponse {

    private Long id;
    private Long sessionId;
    private Long studentId;
    private String studentName;
    private String rollNumber;
    private Integer rssi;
    private AttendanceStatus status;
    private String message;
    private LocalDateTime timestamp;

    public AttendanceResponse() {}

    public AttendanceResponse(Long id, Long sessionId, Long studentId, String studentName, 
                              String rollNumber, Integer rssi, AttendanceStatus status, 
                              String message, LocalDateTime timestamp) {
        this.id = id;
        this.sessionId = sessionId;
        this.studentId = studentId;
        this.studentName = studentName;
        this.rollNumber = rollNumber;
        this.rssi = rssi;
        this.status = status;
        this.message = message;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }

    public Integer getRssi() { return rssi; }
    public void setRssi(Integer rssi) { this.rssi = rssi; }

    public AttendanceStatus getStatus() { return status; }
    public void setStatus(AttendanceStatus status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
