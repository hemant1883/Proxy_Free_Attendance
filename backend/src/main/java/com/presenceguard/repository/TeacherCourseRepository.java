package com.presenceguard.repository;

import com.presenceguard.entity.TeacherCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherCourseRepository extends JpaRepository<TeacherCourse, Long> {
    List<TeacherCourse> findByTeacherId(Long teacherId);
    List<TeacherCourse> findByCourseId(Long courseId);
    Optional<TeacherCourse> findByTeacherIdAndCourseId(Long teacherId, Long courseId);
    boolean existsByTeacherIdAndCourseId(Long teacherId, Long courseId);
}
