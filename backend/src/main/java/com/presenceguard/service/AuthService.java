package com.presenceguard.service;

import com.presenceguard.dto.AuthResponse;
import com.presenceguard.dto.LoginRequest;
import com.presenceguard.entity.Student;
import com.presenceguard.entity.Teacher;
import com.presenceguard.entity.User;
import com.presenceguard.entity.UserRole;
import com.presenceguard.exception.BadRequestException;
import com.presenceguard.repository.StudentRepository;
import com.presenceguard.repository.TeacherRepository;
import com.presenceguard.repository.UserRepository;
import com.presenceguard.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtTokenProvider tokenProvider,
                       UserRepository userRepository,
                       StudentRepository studentRepository,
                       TeacherRepository teacherRepository) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("User profile not found"));

        Long studentId = null;
        Long teacherId = null;

        if (user.getRole() == UserRole.STUDENT) {
            studentId = studentRepository.findByUserId(user.getId())
                    .map(Student::getId)
                    .orElse(null);
        } else if (user.getRole() == UserRole.TEACHER) {
            teacherId = teacherRepository.findByUserId(user.getId())
                    .map(Teacher::getId)
                    .orElse(null);
        }

        return new AuthResponse(
                jwt,
                user.getRole(),
                user.getName(),
                user.getEmail(),
                user.getId(),
                studentId,
                teacherId
        );
    }
}
