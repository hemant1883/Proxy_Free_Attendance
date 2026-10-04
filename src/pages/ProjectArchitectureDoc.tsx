import React from 'react';
import { 
  Shield, Database, Cpu, Radio, Layers, 
  Smartphone, Server, ArrowRight, CheckCircle2, Lock 
} from 'lucide-react';

export const ProjectArchitectureDoc: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Final Year B.Tech CSE Major Project</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              PresenceGuard: Multi-Factor Presence Verification System
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Phase 1 Engineering Specification: Bluetooth Low Energy Proximity Gating, Role-Based Access Control, and Backend RF Threshold Enforcement.
            </p>
          </div>
          <button
            onClick={onClose}
            className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Back to Application
          </button>
        </div>
      </div>

      {/* STEP 1: Complete System Architecture */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
          <Layers className="w-5 h-5 text-blue-600" />
          <span>STEP 1: Complete System Architecture</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The Phase 1 architecture decouples the presence measurement from transport logistics. 
          The application follows a clean 3-tier model where students and instructors verify physical classroom proximity before attendance records are committed to persistent storage.
        </p>
        
        {/* Architecture ASCII / Flow Diagram */}
        <div className="bg-slate-900 text-slate-200 p-5 rounded-xl font-mono text-[11px] sm:text-xs overflow-x-auto leading-relaxed border border-slate-800">
{`+-----------------------------------------------------------------------------------------+
|                                    PHASE 1 ARCHITECTURE                                 |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|   [ TEACHER DASHBOARD ]                         [ STUDENT CLIENT ]                      |
|            |                                             |                              |
|            | 1. Start Session                            | 2. Scan Beacon               |
|            v                                             v                              |
|   +-------------------+                         +-------------------+                   |
|   |  BLEService       |        BLE RF Beacon    |  BLEService       |                   |
|   |  (startBroadcast) | ===== [RSSI Gating] ==> |  (scanForTeacher) |                   |
|   +-------------------+                         +-------------------+                   |
|            |                                             |                              |
|            | REST API                                    | POST /api/attendance/mark    |
|            | (JWT Bearer)                                | { sessionId, studentId, rssi}|
|            v                                             v                              |
|   +-----------------------------------------------------------------+                   |
|   |                     SPRING BOOT 3.3.x BACKEND                    |                  |
|   |                                                                 |                   |
|   |   +-----------------------+           +---------------------+   |                   |
|   |   |   Security Filter     |           | AttendanceService   |   |                   |
|   |   |   (JWT Validation)    |           | Verification Rules: |   |                   |
|   |   +-----------------------+           | 1. Active Session?  |   |                   |
|   |              |                        | 2. Student Enrolled?|   |                   |
|   |              v                        | 3. Duplicate check? |   |                   |
|   |   +-----------------------+           | 4. RSSI >= -70 dBm? |   |                   |
|   |   | Spring Data JPA Repos |           +---------------------+   |                   |
|   +-----------------------------------------------------------------+                   |
|                                  |                                                      |
|                                  v                                                      |
|                        +-------------------+                                            |
|                        |   MySQL DATABASE  |                                            |
|                        +-------------------+                                            |
|                                                                                         |
|   FUTURE PHASE 2 EXTENSION:                                                             |
|   Android / Kotlin BLE Client (Central)  ==> Android / Kotlin Beacon (Peripheral)      |
+-----------------------------------------------------------------------------------------+`}
        </div>
      </section>

      {/* STEP 2: Database Schema Design */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
          <Database className="w-5 h-5 text-indigo-600" />
          <span>STEP 2: Relational Database Schema Design</span>
        </div>
        <p className="text-xs text-slate-600">
          Normalized relational tables modeled in JPA entities with foreign-key constraints and unique indices:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="font-bold text-blue-700 font-mono">users</span>
            <ul className="text-slate-600 space-y-0.5 text-[11px]">
              <li>• id (PK, BIGINT)</li>
              <li>• name (VARCHAR)</li>
              <li>• email (VARCHAR, UNIQUE)</li>
              <li>• password (BCrypt Hashed)</li>
              <li>• role (ADMIN|TEACHER|STUDENT)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="font-bold text-blue-700 font-mono">students &amp; teachers</span>
            <ul className="text-slate-600 space-y-0.5 text-[11px]">
              <li>• id (PK, BIGINT)</li>
              <li>• user_id (FK → users.id)</li>
              <li>• roll_number (UNIQUE)</li>
              <li>• employee_id (UNIQUE)</li>
              <li>• department (VARCHAR)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="font-bold text-blue-700 font-mono">attendance_sessions</span>
            <ul className="text-slate-600 space-y-0.5 text-[11px]">
              <li>• id (PK, BIGINT)</li>
              <li>• course_id (FK)</li>
              <li>• teacher_id (FK)</li>
              <li>• session_code (VARCHAR)</li>
              <li>• rssi_threshold (INT, -70)</li>
              <li>• active (BOOLEAN)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="font-bold text-blue-700 font-mono">attendance_records</span>
            <ul className="text-slate-600 space-y-0.5 text-[11px]">
              <li>• id (PK, BIGINT)</li>
              <li>• attendance_session_id (FK)</li>
              <li>• student_id (FK)</li>
              <li>• rssi (INT, dBm)</li>
              <li>• timestamp (DATETIME)</li>
              <li>• status (PRESENT|REJECTED)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* STEP 3 & 4: Backend Security & Verification Rules */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
          <Lock className="w-5 h-5 text-emerald-600" />
          <span>STEP 3 &amp; 4: Backend Attendance Verification Rules</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The Spring Boot backend enforces 5 mandatory server-side checks on <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">POST /api/attendance/mark</code>. Frontend RSSI checks are solely for user feedback; the server guarantees tamper-resistance:
        </p>

        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">1</span>
            <div>
              <span className="font-bold text-slate-800">Session Existence Check:</span>
              <p className="text-slate-500">Query <code className="font-mono">AttendanceSessionRepository.findById(sessionId)</code>. Returns 404 if missing.</p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">2</span>
            <div>
              <span className="font-bold text-slate-800">Session Active Gating:</span>
              <p className="text-slate-500">Ensure <code className="font-mono">session.isActive() == true</code>. Attendance attempts after teacher clicks "Stop Attendance" are rejected with 400.</p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">3</span>
            <div>
              <span className="font-bold text-slate-800">Student Course Enrollment Verification:</span>
              <p className="text-slate-500">Ensure student is enrolled in the designated course in <code className="font-mono">EnrollmentRepository</code>. Cross-course spoofing is blocked.</p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">4</span>
            <div>
              <span className="font-bold text-slate-800">Anti-Duplicate Attendance Guard:</span>
              <p className="text-slate-500">Queries <code className="font-mono">AttendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentId)</code>. Prevents duplicate submissions (HTTP 409 Conflict).</p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">5</span>
            <div>
              <span className="font-bold text-slate-800">RSSI Proximity Threshold Validation:</span>
              <p className="text-slate-500">Server verifies <code className="font-mono">rssi &gt;= session.getRssiThreshold()</code> (-70 dBm). If lower, logs record as <span className="font-mono text-rose-700 font-bold">REJECTED_WEAK_SIGNAL</span> and aborts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 5 & 6: BLE Abstraction & RSSI Simulation */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
          <Radio className="w-5 h-5 text-blue-600" />
          <span>STEP 5 &amp; 6: BLEService Abstraction &amp; RF Simulation Model</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Standard Web Bluetooth APIs in modern browsers do not support Peripheral Advertising (phone-to-phone beacons).
          To adhere strictly to professional architecture, PresenceGuard implements the <code className="font-mono font-bold text-slate-800">BLEService</code> interface:
        </p>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-800">
{`interface BLEService {
  startBroadcast(config: BLEBroadcastConfig): Promise<boolean>;
  stopBroadcast(): Promise<void>;
  isBroadcasting(): boolean;
  scanForTeacher(options?: BLEScanOptions): Promise<BLEDiscoveredDevice | null>;
  getRSSI(): Promise<number>;
  stopScanning(): void;
}`}
        </div>
        <p className="text-xs text-slate-600">
          In Phase 1, <code className="font-mono text-blue-700">MockBLEService</code> synchronizes teacher beacon broadcasts across browser contexts and provides the configured RSSI values:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-center">
            <div className="font-bold text-emerald-800">-40 dBm</div>
            <div className="text-[11px] text-emerald-600">Very Close (Podium)</div>
          </div>
          <div className="p-2.5 rounded-lg border border-teal-200 bg-teal-50 text-center">
            <div className="font-bold text-teal-800">-55 dBm</div>
            <div className="text-[11px] text-teal-600">Inside Classroom</div>
          </div>
          <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-center">
            <div className="font-bold text-amber-800">-65 dBm</div>
            <div className="text-[11px] text-amber-600">Back Row (Acceptable)</div>
          </div>
          <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-center">
            <div className="font-bold text-rose-800">-75 dBm</div>
            <div className="text-[11px] text-rose-600">Weak (Outside Hallway)</div>
          </div>
          <div className="p-2.5 rounded-lg border border-rose-300 bg-rose-100 text-center">
            <div className="font-bold text-rose-900">-85 dBm</div>
            <div className="text-[11px] text-rose-800">Reject (Far Away)</div>
          </div>
        </div>
      </section>

      {/* STEP 10: Phase 2 Android / Kotlin BLE Integration Roadmap */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
          <Smartphone className="w-5 h-5 text-teal-600" />
          <span>STEP 10: How Phase 2 Replaces MockBLEService with Native Android BLE</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Because the frontend is built entirely on the <code className="font-mono text-blue-700">BLEService</code> abstraction, Phase 2 upgrades to a native Android Kotlin client (or React Native / Capacitor wrapper) with <strong>zero modifications</strong> to UI components or the Spring Boot backend:
        </p>

        <div className="space-y-3 text-xs text-slate-700">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span>Teacher Mode: Native BLE Peripheral Advertising (Kotlin)</span>
            </h4>
            <p className="text-slate-600 text-[11px]">
              Uses <code className="font-mono text-blue-700">BluetoothLeAdvertiser</code> with standard Service UUID and custom Manufacturer Data carrying the Session Code:
            </p>
            <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono overflow-x-auto">
{`val advertiser = bluetoothAdapter.bluetoothLeAdvertiser
val settings = AdvertiseSettings.Builder()
    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
    .setConnectable(false)
    .build()

val data = AdvertiseData.Builder()
    .addServiceUuid(ParcelUuid(UUID.fromString("0000FEAA-0000-1000-8000-00805F9B34FB")))
    .addServiceData(ParcelUuid.fromString("..."), sessionCode.toByteArray())
    .build()

advertiser.startAdvertising(settings, data, advertiseCallback)`}
            </pre>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span>Student Mode: Native BLE Central Scanner (Kotlin)</span>
            </h4>
            <p className="text-slate-600 text-[11px]">
              Uses <code className="font-mono text-blue-700">BluetoothLeScanner</code> to capture hardware RSSI packets directly from the radio chip:
            </p>
            <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono overflow-x-auto">
{`val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
        val measuredRssi = result.rssi // e.g. -58 dBm direct from antenna
        val deviceName = result.device.name ?: "Teacher_Device"
        // Bridges directly to BLEService.scanForTeacher() Promise!
    }
}
scanner.startScan(listOf(scanFilter), scanSettings, scanCallback)`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
