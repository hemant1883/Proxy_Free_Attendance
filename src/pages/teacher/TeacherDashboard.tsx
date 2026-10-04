import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Course, AttendanceSession } from '../../types';
import { BookOpen, Users, Radio, Clock, Play, ArrowRight, ShieldCheck } from 'lucide-react';
import { mockBLEService } from '../../services/ble/MockBLEService';

export const TeacherDashboard: React.FC<{ 
  onNavigate: (tab: string) => void;
  onSelectSession: (sessionId: number) => void;
}> = ({ onNavigate, onSelectSession }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);

  const teacherId = user?.teacherId || 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assignedCourses = await api.getTeacherCourses(teacherId);
        const safeCourses = Array.isArray(assignedCourses) ? assignedCourses : [];
        setCourses(safeCourses);

        // Check if there is an active session for any of the teacher's courses
        // Query active sessions from mockDb
        const allSessions = await api.getActiveStudentSessions(1); // will return active sessions
        if (Array.isArray(allSessions)) {
          const currentActive = allSessions.find(s => s.teacherId === teacherId && s.active);
          if (currentActive) {
            const details = await api.getSessionDetails(currentActive.id);
            if (details && details.session) {
              setActiveSession(details.session);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teacherId]);

  const handleStartAttendance = async (courseId: number) => {
    try {
      const session = await api.startAttendanceSession(teacherId, courseId, -70);
      onSelectSession(session.id);
      onNavigate('teacher-live');
    } catch (err: any) {
      alert(err.message || 'Failed to start session');
    }
  };

  const totalEnrolled = Array.isArray(courses)
    ? courses.reduce((acc, c) => acc + (c.enrolledStudentsCount || 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Faculty Teaching Portal</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Manage lecture sessions and live BLE presence verification.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned Classes</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : courses.length}</div>
            <span className="text-[11px] text-blue-600 font-medium">Semester Curricula</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Enrolled Students</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : totalEnrolled}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Across All Courses</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Session</span>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[140px]">
              {activeSession ? activeSession.courseCode : 'None Active'}
            </div>
            <span className={`text-[11px] font-medium ${activeSession ? 'text-emerald-600' : 'text-slate-400'}`}>
              {activeSession ? 'Beacon Broadcasting' : 'Ready to start'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${activeSession ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            <Radio className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Threshold Standard</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">-70 dBm</div>
            <span className="text-[11px] text-slate-500 font-medium">Classroom Perimeter</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Attendance Session Highlight banner (if active) */}
      {activeSession && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-800">
                  Live Attendance Session In Progress
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  Active
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {activeSession.courseCode} - {activeSession.courseName}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-mono">
                Session Code: {activeSession.sessionCode} | Threshold: {activeSession.rssiThreshold} dBm
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onSelectSession(activeSession.id);
              onNavigate('teacher-live');
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <span>Open Live Attendance Monitor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Assigned Classes List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            My Assigned Classes &amp; Modules
          </h2>
          <span className="text-xs text-slate-500">
            {courses.length} courses allocated
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {courses.map((course) => {
            const isThisSessionActive = activeSession?.courseId === course.id;
            return (
              <div key={course.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                      {course.courseCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Semester {course.semester}
                    </span>
                    {isThisSessionActive && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                        Session Live
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5">{course.courseName}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.enrolledStudentsCount || 0} Students Enrolled</span>
                    </span>
                    <span>•</span>
                    <span>Classroom Proximity Gating: -70 dBm</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isThisSessionActive ? (
                    <button
                      onClick={() => {
                        onSelectSession(activeSession!.id);
                        onNavigate('teacher-live');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                    >
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span>View Live Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartAttendance(course.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Attendance</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
