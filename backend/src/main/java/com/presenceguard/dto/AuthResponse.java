package com.presenceguard.dto;

import com.presenceguard.entity.UserRole;

public class AuthResponse {

    private String token;
    private UserRole role;
    private String name;
    private String email;
    private Long id;
    private Long studentId;
    private Long teacherId;

    public AuthResponse() {}

    public AuthResponse(String token, UserRole role, String name, String email, Long id, Long studentId, Long teacherId) {
        this.token = token;
        this.role = role;
        this.name = name;
        this.email = email;
        this.id = id;
        this.studentId = studentId;
        this.teacherId = teacherId;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public Long getTeacherId() { return teacherId; }
    public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }
}
