import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, getConfiguredServerOrigin, isExplicitOfflineMode } from '../../services/api';
import { capacitorBLEService, BLEScanDiagnostics } from '../../services/ble/CapacitorBLEService';
import { AttendanceSession, BLEDiscoveredDevice } from '../../types';
import { RSSIIndicator, getRSSICategory } from '../../components/common/RSSIIndicator';
import {
  Radio, Bluetooth, ShieldCheck, AlertTriangle,
  CheckCircle2, Loader2, RefreshCw, Cloud,
  ArrowRight, XCircle
} from 'lucide-react';

export const ScanAttendancePage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevice, setDiscoveredDevice] = useState<BLEDiscoveredDevice | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanDiagnostics, setScanDiagnostics] = useState<BLEScanDiagnostics | null>(null);

  // Submitting Attendance State
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
    rssi?: number;
    status?: string;
  } | null>(null);

  const studentId = user?.studentId || 1;

  const fetchActiveSessions = async () => {
    try {
      const data = await api.getActiveStudentSessions(user?.studentId);
      setActiveSessions(Array.isArray(data) ? data : []);
      setSyncError(null);
    } catch (err: any) {
      console.error(err);
      setSyncError(err?.message || 'Unable to sync active sessions from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 4000);
    return () => clearInterval(interval);
  }, [user?.studentId]);

  // Handle Scan for Teacher Beacon (either for a known session or open discovery when activeSessions is empty)
  const handleScanForTeacher = async (session?: AttendanceSession) => {
    setIsScanning(true);
    setScanError(null);
    setDiscoveredDevice(null);
    setSubmissionResult(null);
    setScanDiagnostics(null);

    try {
      const device = await capacitorBLEService.scanForTeacher(
        session
          ? {
              courseCode: session.courseCode,
              courseName: session.courseName,
              sessionId: session.id,
              teacherName: session.teacherName
            }
          : { timeoutMs: 10000 }
      );

      const diag = capacitorBLEService.getLastScanDiagnostics();
      setScanDiagnostics(diag);

      if (!device) {
        const packetInfo =
          diag.totalPacketsSeen > 0
            ? ` (Scanner detected ${diag.totalPacketsSeen} BLE packets from ${diag.uniqueDevicesSeen} nearby devices, none broadcasting PresenceGuard 0xFEAA — ensure Teacher started BLE Broadcast.)`
            : ' (Scanner saw 0 BLE packets — check that Bluetooth & Location GPS are ON and Nearby Devices permission is granted.)';
        setScanError(
          `No classroom BLE beacon detected. Keep devices within classroom range (<5m), confirm Teacher tapped "Start BLE Broadcast", and ensure Location (GPS) is ON.${packetInfo}`
        );
      } else {
        setDiscoveredDevice(device);
        // Refresh backend active sessions in case Teacher started the session right before the poll cycle
        fetchActiveSessions();
      }
    } catch (err: any) {
      setScanDiagnostics(capacitorBLEService.getLastScanDiagnostics());
      setScanError(err.message || 'Scanning failed. Please check Bluetooth & Location permissions.');
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Mark Attendance
  const handleMarkAttendance = async (session: AttendanceSession) => {
    if (!discoveredDevice) return;
    setSubmitting(true);
    setSubmissionResult(null);

    const targetSessionId = discoveredDevice.sessionId || session.id;

    try {
      const response = await api.markAttendance(
        targetSessionId,
        studentId,
        discoveredDevice.rssi
      );

      setSubmissionResult({
        success: true,
        message: response.message,
        rssi: discoveredDevice.rssi,
        status: response.status
      });
      fetchActiveSessions();
    } catch (err: any) {
      setSubmissionResult({
        success: false,
        message: err.message || 'Verification rejected by backend.',
        rssi: discoveredDevice.rssi,
        status: 'REJECTED'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // If BLE discovered a live beacon even when activeSessions list hadn't populated yet, construct a card session
  const displaySessions: AttendanceSession[] =
    activeSessions.length > 0
      ? activeSessions
      : discoveredDevice
      ? [
          {
            id: discoveredDevice.sessionId,
            courseId: 0,
            teacherId: 0,
            courseCode: discoveredDevice.courseCode || 'BLE',
            courseName: discoveredDevice.courseName || 'Classroom Lecture',
            teacherName: discoveredDevice.teacherName || 'Classroom Faculty',
            sessionCode: `SESSION-${discoveredDevice.sessionId}`,
            startTime: new Date().toISOString(),
            endTime: null,
            active: true,
            rssiThreshold: -70
          }
        ]
      : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Classroom Presence Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Detect the teacher's physical BLE broadcast and verify your spatial presence inside the lecture hall.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
          <Cloud className="w-3.5 h-3.5 text-blue-600" />
          <span>{isExplicitOfflineMode() ? 'Offline Local Mode' : `Server: ${getConfiguredServerOrigin() || 'Cloud Backend'}`}</span>
        </div>
      </div>

      {/* Sync Warning if server unreachable */}
      {syncError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{syncError}</span>
          </div>
          <button
            onClick={fetchActiveSessions}
            className="text-xs font-semibold text-amber-800 underline shrink-0"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Active Sessions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Checking active sessions on shared server...</div>
        ) : displaySessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center space-y-4">
            <Radio className="w-10 h-10 text-blue-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">No Active Session Listed Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your teacher may have just started broadcasting. You can still scan directly for any nearby classroom BLE beacon right now:
              </p>
            </div>

            {isScanning ? (
              <div className="py-4 space-y-3">
                <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-30"></span>
                  <div className="relative w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-700 animate-pulse">
                  Scanning nearby BLE beacons (2.4 GHz)...
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={() => handleScanForTeacher()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <Bluetooth className="w-4 h-4" />
                  <span>Scan For Live Classroom Beacon</span>
                </button>
                <button
                  onClick={fetchActiveSessions}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Sessions</span>
                </button>
              </div>
            )}

            {scanError && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>No Classroom Beacon Found</span>
                </div>
                <p className="text-slate-700">{scanError}</p>
              </div>
            )}
          </div>
        ) : (
          displaySessions.map((session) => {
            const hasDiscovered =
              discoveredDevice &&
              (discoveredDevice.sessionId === session.id ||
                discoveredDevice.courseCode === session.courseCode ||
                !discoveredDevice.courseCode);
            const rssiValue = discoveredDevice?.rssi ?? -55;
            const cat = getRSSICategory(rssiValue);
            const isEligible = rssiValue >= session.rssiThreshold;

            return (
              <div
                key={session.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Header ribbon */}
                <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                      {session.courseCode}
                    </span>
                    <span className="font-bold text-sm">{session.courseName}</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-mono">
                    Session #{session.id} ({session.sessionCode})
                  </span>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {/* Instructor & Rule info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-slate-500">Instructor:</span>{' '}
                      <span className="font-semibold text-slate-800">{session.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Required Proximity:</span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        RSSI ≥ {session.rssiThreshold} dBm
                      </span>
                    </div>
                  </div>

                  {/* SCAN ACTION or SCANNING ANIMATION */}
                  {!discoveredDevice && !isScanning && (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                        <Bluetooth className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-sm">Classroom BLE Beacon Ready</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Click below to scan for the professor's broadcast beacon and measure your spatial signal strength.
                        </p>
                      </div>
                      <button
                        onClick={() => handleScanForTeacher(session)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                      >
                        <Radio className="w-4 h-4" />
                        <span>Scan For Teacher</span>
                      </button>
                    </div>
                  )}

                  {/* Scanning Animation */}
                  {isScanning && (
                    <div className="text-center py-8 space-y-4">
                      <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-30"></span>
                        <div className="relative w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                          <Radio className="w-6 h-6 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm animate-pulse">
                          Searching for classroom BLE signal...
                        </h4>
                        <p className="text-xs text-slate-500">
                          Scanning peripheral advertising channels on 2.4 GHz ISM band...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Scan Error */}
                  {scanError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>No Classroom Beacon Found</span>
                      </div>
                      <p className="text-slate-600">{scanError}</p>
                      {scanDiagnostics && (
                        <div className="text-[11px] font-mono text-rose-700 bg-rose-100/70 px-2.5 py-1 rounded">
                          Diagnostics: packets={scanDiagnostics.totalPacketsSeen}, nearbyDevices={scanDiagnostics.uniqueDevicesSeen}
                        </div>
                      )}
                      <button
                        onClick={() => handleScanForTeacher(session)}
                        className="mt-2 text-xs font-semibold text-rose-700 underline inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry Scan
                      </button>
                    </div>
                  )}

                  {/* Teacher Device Found */}
                  {hasDiscovered && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Teacher Device Detected
                            </span>
                          </div>
                          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-semibold flex items-center gap-1">
                            <Bluetooth className="w-3 h-3 text-emerald-600" />
                            Hardware BLE Beacon
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                          <div className="sm:col-span-2 lg:col-span-1">
                            <span className="text-[11px] text-slate-500 font-medium">Broadcasting Course:</span>
                            <div className="font-bold text-slate-900 text-xs mt-0.5 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[11px]">
                                {discoveredDevice.courseCode}
                              </span>
                              <span className="truncate">{discoveredDevice.courseName || session.courseName}</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">Faculty Instructor:</span>
                            <div className="font-bold text-slate-900 text-xs mt-0.5 truncate">
                              {discoveredDevice.teacherName || session.teacherName}
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">Broadcast Session ID:</span>
                            <div className="font-mono font-bold text-blue-700 text-xs mt-0.5">
                              Session #{discoveredDevice.sessionId}
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">Measured Signal (RSSI):</span>
                            <div className="font-mono font-bold text-slate-900 text-xs mt-0.5 flex items-center gap-2">
                              <span>{discoveredDevice.rssi} dBm</span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cat.bgColor} ${cat.color} border ${cat.borderColor}`}>
                                {cat.label}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">Transmitter Hardware:</span>
                            <div className="font-mono text-slate-600 text-[11px] mt-0.5 truncate">
                              {discoveredDevice.deviceId}
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">Presence Verification:</span>
                            <div className="mt-0.5">
                              {isEligible ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Spatial Presence Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Signal Too Weak (&lt; {session.rssiThreshold} dBm)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                          <RSSIIndicator rssi={discoveredDevice.rssi} size="md" />
                          <button
                            onClick={() => handleScanForTeacher(session)}
                            className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Re-measure
                          </button>
                        </div>
                      </div>

                      {isEligible ? (
                        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold">Inside Attendance Range:</span> Your measured RSSI ({discoveredDevice.rssi} dBm) satisfies the required threshold (≥ {session.rssiThreshold} dBm).
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-bold">Signal Too Weak: Move Closer To Classroom.</span> Your measured signal ({discoveredDevice.rssi} dBm) is weaker than required {session.rssiThreshold} dBm.
                          </div>
                        </div>
                      )}

                      {submissionResult && (
                        <div
                          className={`p-4 rounded-xl border text-xs ${
                            submissionResult.success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold text-sm">
                            {submissionResult.success ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Attendance Confirmed!</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-rose-600" />
                                <span>Attendance Verification Failed</span>
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-xs">{submissionResult.message}</p>
                          {submissionResult.success && (
                            <div className="mt-3">
                              <button
                                onClick={() => onNavigate('student-history')}
                                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                              >
                                <span>View in Attendance History</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {!submissionResult?.success && (
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            onClick={() => handleMarkAttendance(session)}
                            disabled={submitting}
                            className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                              isEligible
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Verifying with Backend Server...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Mark Attendance</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
