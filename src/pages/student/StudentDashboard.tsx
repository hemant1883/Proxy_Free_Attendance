import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Course, AttendanceSession, AttendanceRecord } from '../../types';
import { BookOpen, Radio, CheckCircle2, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { mockBLEService } from '../../services/ble/MockBLEService';

export const StudentDashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const studentId = user?.studentId || 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, sRes, hRes] = await Promise.all([
          api.getCourses(),
          api.getActiveStudentSessions(studentId),
          api.getStudentHistory(studentId)
        ]);
        setCourses(Array.isArray(cRes) ? cRes : []);
        setActiveSessions(Array.isArray(sRes) ? sRes : []);
        setHistory(Array.isArray(hRes) ? hRes : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  const presentCount = Array.isArray(history) ? history.filter(h => h.status === 'PRESENT').length : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Student Portal</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Welcome, <span className="font-semibold text-slate-800">{user?.name}</span> (Roll: 21CSE101). Check classroom proximity and verify your lecture presence.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Enrolled Courses</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : courses.length}</div>
            <span className="text-[11px] text-blue-600 font-medium">Semester 6 Curricula</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Class Sessions</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : activeSessions.length}</div>
            <span className={`text-[11px] font-medium ${activeSessions.length > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
              {activeSessions.length > 0 ? 'BLE Beacon Detected' : 'No sessions open'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${activeSessions.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            <Radio className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attended Lectures</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : presentCount}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Verified by BLE Gating</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Session Notification Card */}
      {activeSessions.length > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-blue-900">
                  Attendance Session Currently Open!
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-800">
                  Ready to scan
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {activeSessions[0].courseCode} - {activeSessions[0].courseName}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Instructor: <span className="font-semibold">{activeSessions[0].teacherName}</span> • Proximity threshold: -70 dBm
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('student-attendance')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0"
          >
            <span>Scan &amp; Mark Attendance</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-2">
          <Radio className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Active Attendance Session</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When your teacher begins an attendance broadcast in class, the session will appear here for you to scan and verify your location.
          </p>
        </div>
      )}

      {/* Recent Attendance Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Recent Attendance History
          </h2>
          <button
            onClick={() => onNavigate('student-history')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No previous attendance records recorded.
            </div>
          ) : (
            history.slice(0, 3).map((rec) => (
              <div key={rec.id} className="p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {(rec as any).courseCode || 'CS301'} - {(rec as any).courseName || 'Java Programming'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      RSSI: <span className="font-mono font-semibold">{rec.rssi} dBm</span> • {new Date(rec.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Present
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
