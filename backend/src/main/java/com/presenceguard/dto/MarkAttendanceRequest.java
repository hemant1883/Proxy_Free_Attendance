package com.presenceguard.dto;

import jakarta.validation.constraints.NotNull;

public class MarkAttendanceRequest {

    @NotNull(message = "Session ID is required")
    private Long sessionId;

    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "RSSI measurement is required")
    private Integer rssi;

    public MarkAttendanceRequest() {}

    public MarkAttendanceRequest(Long sessionId, Long studentId, Integer rssi) {
        this.sessionId = sessionId;
        this.studentId = studentId;
        this.rssi = rssi;
    }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public Integer getRssi() { return rssi; }
    public void setRssi(Integer rssi) { this.rssi = rssi; }
}
