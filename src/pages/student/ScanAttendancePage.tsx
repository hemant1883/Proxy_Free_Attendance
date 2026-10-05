import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { mockBLEService } from '../../services/ble/MockBLEService';
import { capacitorBLEService } from '../../services/ble/CapacitorBLEService';
import { AttendanceSession, BLEDiscoveredDevice } from '../../types';
import { RSSIIndicator, getRSSICategory } from '../../components/common/RSSIIndicator';
import { 
  Radio, Bluetooth, ShieldCheck, AlertTriangle, 
  CheckCircle2, Loader2, RefreshCw, Smartphone, 
  Sliders, ArrowRight, XCircle 
} from 'lucide-react';
import { BLESimulationModal } from '../../components/common/BLESimulationModal';

export const ScanAttendancePage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevice, setDiscoveredDevice] = useState<BLEDiscoveredDevice | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Submitting Attendance State
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
    rssi?: number;
    status?: string;
  } | null>(null);

  // Modal to change RSSI during testing
  const [showSimModal, setShowSimModal] = useState(false);

  const studentId = user?.studentId || 1;

  const fetchActiveSessions = async () => {
    try {
      const data = await api.getActiveStudentSessions(studentId);
      setActiveSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 4000);
    return () => clearInterval(interval);
  }, [studentId]);

  // Handle Scan for Teacher Beacon
  const handleScanForTeacher = async (session: AttendanceSession) => {
    setIsScanning(true);
    setScanError(null);
    setDiscoveredDevice(null);
    setSubmissionResult(null);

    try {
      // Calls BLEService.scanForTeacher() - Uses hardware BLE on Android, simulated on web
      const device = await capacitorBLEService.scanForTeacher({ courseCode: session.courseCode });

      if (!device) {
        setScanError(
          'No classroom BLE signal detected. Ensure your teacher has clicked "Start BLE Broadcast" on their dashboard.'
        );
      } else {
        setDiscoveredDevice(device);
      }
    } catch (err: any) {
      setScanError(err.message || 'Scanning failed.');
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Mark Attendance
  const handleMarkAttendance = async (session: AttendanceSession) => {
    if (!discoveredDevice) return;
    setSubmitting(true);
    setSubmissionResult(null);

    try {
      // POST /api/attendance/mark
      const response = await api.markAttendance(
        session.id,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Classroom Presence Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Detect the teacher's BLE broadcast and verify your spatial presence inside the lecture hall.
          </p>
        </div>
        <button
          onClick={() => setShowSimModal(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-xs font-semibold hover:bg-blue-100 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-600" />
          <span>Tune Simulated RSSI</span>
        </button>
      </div>

      {/* Active Sessions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Checking active sessions...</div>
        ) : activeSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
            <Radio className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Active Attendance Session</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no active attendance broadcasts for your enrolled courses. 
              Switch to the <span className="font-semibold text-blue-600">Teacher</span> portal in the top bar to start one.
            </p>
          </div>
        ) : (
          activeSessions.map((session) => {
            const hasDiscovered = discoveredDevice && discoveredDevice.sessionId === session.id;
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
                    Session Code: {session.sessionCode}
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

                  {/* Scanning Animation (Prompt Requirement: "Searching for classroom BLE signal...") */}
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
                      <button
                        onClick={() => handleScanForTeacher(session)}
                        className="mt-2 text-xs font-semibold text-rose-700 underline inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry Scan
                      </button>
                    </div>
                  )}

                  {/* Teacher Device Found (Prompt Requirements 8, 9, 10) */}
                  {hasDiscovered && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                      {/* Detection Banner */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Teacher Device Found
                            </span>
                          </div>
                          <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                            Simulated BLE Beacon
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                          {/* Device Name */}
                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">Device:</span>
                            <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                              {discoveredDevice.deviceId}
                            </div>
                          </div>

                          {/* RSSI Signal */}
                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">RSSI:</span>
                            <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                              {discoveredDevice.rssi} dBm
                            </div>
                          </div>

                          {/* Signal Strength Category */}
                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">Signal Strength:</span>
                            <div className="mt-0.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${cat.bgColor} ${cat.color} border ${cat.borderColor}`}>
                                {cat.label}
                              </span>
                            </div>
                          </div>

                          {/* Eligibility */}
                          <div>
                            <span className="text-[11px] text-slate-500 font-medium">Eligibility:</span>
                            <div className="mt-0.5">
                              {isEligible ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Eligible for Attendance
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Signal Too Weak
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Visual Signal Level Indicator */}
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

                      {/* Prompt RSSI Logic Banner */}
                      {isEligible ? (
                        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold">Inside Attendance Range:</span> Your measured RSSI ({discoveredDevice.rssi} dBm) satisfies the required threshold (≥ {session.rssiThreshold} dBm).
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                            <div>
                              <span className="font-bold">Signal Too Weak: Move Closer To Classroom.</span> Your signal ({discoveredDevice.rssi} dBm) is weaker than {session.rssiThreshold} dBm.
                            </div>
                          </div>
                          <button
                            onClick={() => setShowSimModal(true)}
                            className="shrink-0 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold"
                          >
                            Simulate Distance
                          </button>
                        </div>
                      )}

                      {/* Submission Result Feedback */}
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

                      {/* Action Button: Mark Attendance */}
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

      {/* Simulator Modal */}
      <BLESimulationModal
        isOpen={showSimModal}
        onClose={() => {
          setShowSimModal(false);
          // Refresh device if already scanned
          if (discoveredDevice) {
            capacitorBLEService.getRSSI().then(r => {
              setDiscoveredDevice(prev => prev ? { ...prev, rssi: r } : null);
            });
          }
        }}
      />
    </div>
  );
};
