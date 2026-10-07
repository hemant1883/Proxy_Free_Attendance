import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AttendanceRecord } from '../../types';
import { RSSIIndicator, getRSSICategory } from '../../components/common/RSSIIndicator';
import { Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

export const StudentAttendanceHistory: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const studentId = user?.studentId || 1;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getStudentHistory(studentId);
        setRecords(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [studentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Attendance Verification History</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive log of all proximity-verified and rejected attendance events for <span className="font-semibold text-slate-800">{user?.name}</span>.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Session Code</th>
                <th className="py-3 px-4">Signal Telemetry (RSSI)</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading attendance history...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No attendance attempts logged yet.</td>
                </tr>
              ) : (
                records.map((r) => {
                  const isPresent = r.status === 'PRESENT';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <span className="font-mono text-blue-700 font-bold">{r.courseCode}</span>
                        <span className="text-slate-500 ml-1.5 hidden sm:inline">- {r.courseName}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{r.sessionCode}</td>
                      <td className="py-3 px-4">
                        <RSSIIndicator rssi={r.rssi} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(r.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Rejected (Weak Signal)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
