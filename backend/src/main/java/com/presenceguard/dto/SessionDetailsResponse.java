package com.presenceguard.dto;

import com.presenceguard.entity.AttendanceSession;
import java.util.List;

public class SessionDetailsResponse {

    private AttendanceSession session;
    private long totalEnrolled;
    private long presentCount;
    private long remainingCount;
    private List<AttendanceResponse> records;

    public SessionDetailsResponse() {}

    public SessionDetailsResponse(AttendanceSession session, long totalEnrolled, long presentCount, 
                                  long remainingCount, List<AttendanceResponse> records) {
        this.session = session;
        this.totalEnrolled = totalEnrolled;
        this.presentCount = presentCount;
        this.remainingCount = remainingCount;
        this.records = records;
    }

    public AttendanceSession getSession() { return session; }
    public void setSession(AttendanceSession session) { this.session = session; }

    public long getTotalEnrolled() { return totalEnrolled; }
    public void setTotalEnrolled(long totalEnrolled) { this.totalEnrolled = totalEnrolled; }

    public long getPresentCount() { return presentCount; }
    public void setPresentCount(long presentCount) { this.presentCount = presentCount; }

    public long getRemainingCount() { return remainingCount; }
    public void setRemainingCount(long remainingCount) { this.remainingCount = remainingCount; }

    public List<AttendanceResponse> getRecords() { return records; }
    public void setRecords(List<AttendanceResponse> records) { this.records = records; }
}
