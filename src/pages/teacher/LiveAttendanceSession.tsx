import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { capacitorBLEService } from '../../services/ble/CapacitorBLEService';
import { AttendanceSession, AttendanceRecord } from '../../types';
import { RSSIIndicator, getRSSICategory } from '../../components/common/RSSIIndicator';
import { 
  Radio, Square, Bluetooth, Users, ShieldCheck, 
  AlertTriangle, RefreshCw, CheckCircle2, Clock, Signal 
} from 'lucide-react';

interface LiveAttendanceSessionProps {
  sessionId?: number;
  onSessionEnded?: () => void;
}

export const LiveAttendanceSession: React.FC<LiveAttendanceSessionProps> = ({
  sessionId: initialSessionId,
  onSessionEnded
}) => {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(capacitorBLEService.isBroadcasting());
  const [isStartingBroadcast, setIsStartingBroadcast] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [deviceIdentifier, setDeviceIdentifier] = useState('Teacher_Device_001');

  // Find or fetch active session
  const fetchSession = async () => {
    try {
      let targetId = initialSessionId;
      if (!targetId) {
        // Fallback: fetch active sessions
        const activeList = await api.getActiveStudentSessions(1);
        if (Array.isArray(activeList) && activeList.length > 0) {
          targetId = activeList[0].id;
        }
      }

      if (targetId) {
        const data = await api.getSessionDetails(targetId);
        if (data && data.session) {
          setSession(data.session);
          setRecords(Array.isArray(data.records) ? data.records : []);
          setDeviceIdentifier(`PG_${data.session.courseCode || 'CS301'}`);
        }
      }
    } catch (err) {
      console.error('Error fetching live session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // Auto-refresh every 3 seconds
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [initialSessionId]);

  // Handle BLE Broadcast Toggle
  const handleToggleBroadcast = async () => {
    if (!session) return;
    setBroadcastError(null);

    if (isBroadcasting) {
      await capacitorBLEService.stopBroadcast();
      setIsBroadcasting(false);
    } else {
      setIsStartingBroadcast(true);
      try {
        await capacitorBLEService.startBroadcast({
          sessionId: session.id,
          courseCode: session.courseCode,
          courseName: session.courseName,
          teacherName: session.teacherName,
          teacherDeviceId: deviceIdentifier,
        });
        setIsBroadcasting(true);
      } catch (err: any) {
        const msg = err?.message || 'Failed to start BLE broadcast. Please ensure Bluetooth is enabled and nearby device permissions are allowed.';
        setBroadcastError(msg);
        alert(msg);
      } finally {
        setIsStartingBroadcast(false);
      }
    }
  };

  // Stop Attendance Session
  const handleStopSession = async () => {
    if (!session) return;
    if (confirm('Are you sure you want to end this attendance session?')) {
      await api.stopAttendanceSession(session.id);
      await capacitorBLEService.stopBroadcast();
      setIsBroadcasting(false);
      if (onSessionEnded) onSessionEnded();
      else fetchSession();
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400 text-xs">Loading attendance session...</div>;
  }

  if (!session) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <Radio className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="font-bold text-slate-800 text-base">No Active Attendance Session</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Navigate to "My Classes" and click "Start Attendance" on any assigned course to generate a session and broadcast the BLE beacon.
        </p>
      </div>
    );
  }

  const enrolledTotal = session.enrolledCount || 4;
  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const remainingCount = Math.max(0, enrolledTotal - presentCount);

  return (
    <div className="space-y-6">
      {/* Top Session Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Status ribbon */}
        <div className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between ${
          session.active ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              {session.active && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${session.active ? 'bg-white' : 'bg-slate-400'}`}></span>
            </span>
            <span className="tracking-wide uppercase">
              {session.active ? 'Attendance Session Active' : 'Attendance Session Ended'}
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-90">
            Started: {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {session.courseCode}
                </span>
                <span className="text-xs text-slate-500">
                  Session ID: <code className="font-mono font-bold text-slate-800">{session.sessionCode}</code>
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-1">
                {session.courseName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5 font-medium">
                <span>Instructor: {session.teacherName}</span>
                <span>•</span>
                <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  RSSI Threshold: {session.rssiThreshold} dBm
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {session.active && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleToggleBroadcast}
                  disabled={isStartingBroadcast}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                    isStartingBroadcast
                      ? 'bg-blue-400 text-white cursor-wait'
                      : isBroadcasting
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Bluetooth className={`w-4 h-4 ${isBroadcasting ? 'animate-pulse' : ''}`} />
                  <span>
                    {isStartingBroadcast
                      ? 'Initializing BLE Hardware...'
                      : isBroadcasting
                      ? 'Stop BLE Broadcast'
                      : 'Start BLE Broadcast'}
                  </span>
                </button>

                <button
                  onClick={handleStopSession}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-600" />
                  <span>Stop Attendance</span>
                </button>
              </div>
            )}
          </div>

          {/* Broadcast Error Banner */}
          {broadcastError && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">BLE Broadcast Error:</span> {broadcastError}
              </div>
            </div>
          )}

          {/* BLE Broadcast Active Display (Prompt requirement 7 & 8) */}
          <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isBroadcasting ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Radio className={`w-5 h-5 ${isBroadcasting ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>BLE Broadcast:</span>
                    {isStartingBroadcast ? (
                      <span className="text-blue-700 font-semibold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Starting Antenna...
                      </span>
                    ) : isBroadcasting ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active (Hardware Broadcaster)
                      </span>
                    ) : (
                      <span className="text-slate-500 font-normal">Inactive (Click "Start BLE Broadcast")</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Hardware Beacon Identifier: <span className="font-mono font-bold text-slate-900">{deviceIdentifier}</span>
                  </div>
                  {isBroadcasting && (
                    <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                      Broadcasting: Name = <strong>{deviceIdentifier}</strong> | MfgData = 0x1337 ({deviceIdentifier})
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-400">
                  Protocol: Bluetooth Low Energy (BLE Peripheral Mode)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Students</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">{enrolledTotal}</div>
          <div className="text-[11px] text-slate-500 mt-1">Enrolled in roster</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Present</div>
          <div className="text-3xl font-bold text-emerald-700 mt-1">{presentCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Verified with RSSI ≥ -70 dBm</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Remaining</div>
          <div className="text-3xl font-bold text-amber-700 mt-1">{remainingCount}</div>
          <div className="text-[11px] text-amber-600 mt-1">Pending verification</div>
        </div>
      </div>

      {/* Live Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Live Attendance Records
            </h2>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold animate-pulse">
              Auto-refreshing (3s)
            </span>
          </div>
          <button
            onClick={fetchSession}
            className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Poll Now</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">RSSI</th>
                <th className="py-3 px-4">Signal</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No student attendance submitted yet. Waiting for students to scan and mark attendance...
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const cat = getRSSICategory(r.rssi);
                  const isPresent = r.status === 'PRESENT';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.rollNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{r.studentName}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{r.rssi} dBm</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cat.bgColor} ${cat.color} border ${cat.borderColor}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
