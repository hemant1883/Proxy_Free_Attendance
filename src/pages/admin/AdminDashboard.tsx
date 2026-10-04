import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Student, Teacher, Course } from '../../types';
import { GraduationCap, Users, BookOpen, Clock, Plus, ShieldCheck, ArrowRight } from 'lucide-react';

export const AdminDashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stRes, tcRes, crRes, attRes] = await Promise.all([
          api.getStudents(),
          api.getTeachers(),
          api.getCourses(),
          api.getAllAttendance(),
        ]);
        setStudents(stRes);
        setTeachers(tcRes);
        setCourses(crRes);
        setAttendanceRecords(attRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalSessions = 1; // From mock/active database

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Administrator Console</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage institution departments, academic enrollments, faculty assignments, and attendance logs.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Students</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : students.length}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Enrolled in CSE</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Teachers</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : teachers.length}</div>
            <span className="text-[11px] text-slate-500 font-medium">Faculty Members</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Courses</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : courses.length}</div>
            <span className="text-[11px] text-slate-500 font-medium">Active Curricula</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today's Sessions</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{totalSessions}</div>
            <span className="text-[11px] text-blue-600 font-medium">BLE Verified Active</span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Actions & BLE Proximity Note */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 lg:col-span-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Administrative Shortcuts</h2>
          <div className="space-y-2">
            <button
              onClick={() => onNavigate('admin-students')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-colors text-xs font-medium text-slate-700"
            >
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Register New Student</span>
              </span>
              <Plus className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('admin-teachers')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-colors text-xs font-medium text-slate-700"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Register Faculty Member</span>
              </span>
              <Plus className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('admin-enrollments')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-colors text-xs font-medium text-slate-700"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Enroll Students to Courses</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Phase 1 Verification Protocol info card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Presence Verification Protocol (Phase 1)
              </h2>
              <span className="text-[11px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                RSSI Threshold: -70 dBm
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              In this phase, presence is confirmed through Bluetooth Low Energy proximity gating. 
              The student client measures the received signal strength indication (RSSI) of the classroom beacon:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="font-bold text-emerald-800">≥ -50 dBm</div>
                <div className="text-[11px] text-emerald-600">Excellent (Podium)</div>
              </div>
              <div className="p-2.5 rounded-lg border border-teal-200 bg-teal-50">
                <div className="font-bold text-teal-800">-51 to -60 dBm</div>
                <div className="text-[11px] text-teal-600">Strong (Inside Room)</div>
              </div>
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                <div className="font-bold text-amber-800">-61 to -70 dBm</div>
                <div className="text-[11px] text-amber-600">Acceptable (Back)</div>
              </div>
              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50">
                <div className="font-bold text-rose-800">&lt; -70 dBm</div>
                <div className="text-[11px] text-rose-600">Rejected (Hallway)</div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Enforced by: Spring Boot Backend validation engine</span>
            <button
              onClick={() => onNavigate('admin-attendance')}
              className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              <span>View System Attendance Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
