import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Course, Student } from '../../types';
import { BookOpen, Users, Play, GraduationCap, ChevronRight } from 'lucide-react';

export const TeacherClasses: React.FC<{
  onStartAttendance: (courseId: number) => void;
}> = ({ onStartAttendance }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const teacherId = user?.teacherId || 1;

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const assigned = await api.getTeacherCourses(teacherId);
        const safeCourses = Array.isArray(assigned) ? assigned : [];
        setCourses(safeCourses);
        if (safeCourses.length > 0) {
          handleSelectCourse(safeCourses[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [teacherId]);

  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setLoadingStudents(true);
    try {
      const data = await api.getCourseStudents(course.id);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Assigned Classes &amp; Enrolled Rosters</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Select any course to view its enrolled student roster and trigger presence verification sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Your Courses ({courses.length})
          </div>
          <div className="space-y-2">
            {courses.map((c) => {
              const isSelected = selectedCourse?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectCourse(c)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                      {c.courseCode}
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{c.courseName}</h3>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {c.enrolledStudentsCount || 0} Students • Semester {c.semester}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Class Student Roster */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCourse ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header inside card */}
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {selectedCourse.courseCode}
                    </span>
                    <span className="text-xs text-slate-500">Semester {selectedCourse.semester}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">{selectedCourse.courseName}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total Enrolled: <span className="font-semibold text-slate-800">{students.length} students</span>
                  </p>
                </div>
                <button
                  onClick={() => onStartAttendance(selectedCourse.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Attendance Session</span>
                </button>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingStudents ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">Loading student roster...</td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">No students enrolled in this course yet.</td>
                      </tr>
                    ) : (
                      students.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">{st.rollNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                            <span>{st.name}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{st.email}</td>
                          <td className="py-3 px-4 text-slate-700">{st.department}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Enrolled
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Select a class on the left to view enrolled students.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
