import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Student, Course, Enrollment } from '../../types';
import { UserCheck, Plus, Check, GraduationCap, BookOpen, AlertCircle } from 'lucide-react';

export const EnrollmentsManagement: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStudentId, setSelectedStudentId] = useState<number>(0);
  const [selectedCourseId, setSelectedCourseId] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [eRes, sRes, cRes] = await Promise.all([
        api.getEnrollments(),
        api.getStudents(),
        api.getCourses(),
      ]);
      setEnrollments(eRes);
      setStudents(sRes);
      setCourses(cRes);
      if (sRes.length > 0) setSelectedStudentId(sRes[0].id);
      if (cRes.length > 0) setSelectedCourseId(cRes[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId) return;
    setStatusMsg(null);
    try {
      await api.enrollStudent(Number(selectedStudentId), Number(selectedCourseId));
      setStatusMsg({ type: 'success', text: 'Student successfully enrolled in course!' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Enrollment failed' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Student Course Enrollments</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Map student cohorts into accredited courses to enable attendance session eligibility.
        </p>
      </div>

      {/* Enroll Form Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span>Enroll Student into Course</span>
        </h2>

        {statusMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 mb-4 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleEnroll} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rollNumber} - {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Course</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} - {c.courseName} (Sem {c.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Confirm Enrollment</span>
            </button>
          </div>
        </form>
      </div>

      {/* Enrollments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Active Enrollments ({enrollments.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course Code</th>
                <th className="py-3 px-4">Course Name</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading enrollments...</td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No student enrollments yet.</td>
                </tr>
              ) : (
                enrollments.map((en) => (
                  <tr key={en.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{en.rollNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                      <span>{en.studentName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-700 font-bold">{en.courseCode}</td>
                    <td className="py-3 px-4 text-slate-700">{en.courseName}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Eligible
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
