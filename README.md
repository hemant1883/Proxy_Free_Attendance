# PresenceGuard: Multi-Factor Presence Verification Attendance System

> **Final Year B.Tech Computer Science & Engineering Major Project**  
> **Phase 1 Prototype:** Bluetooth Low Energy (BLE) Proximity Verification, Role-Based Access Control, and Server-Side RSSI Threshold Gating.

---

## 1. System Architecture

PresenceGuard is engineered around a decoupled architecture that isolates physical proximity measurement from transactional attendance logging:

```
+-----------------------------------------------------------------------------------------+
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
+-----------------------------------------------------------------------------------------+
```

---

## 2. Database Design & Entity Model

The relational database is normalized and enforces referential integrity:

1. **`users`**: Authentication credentials, BCrypt password hashes, and user roles (`ADMIN`, `TEACHER`, `STUDENT`).
2. **`students`**: Student academic attributes (`roll_number`, `department`, `semester`, linked 1:1 to `users`).
3. **`teachers`**: Faculty attributes (`employee_id`, `department`, linked 1:1 to `users`).
4. **`courses`**: Academic syllabus units (`course_code`, `course_name`, `semester`).
5. **`enrollments`**: Many-to-Many junction mapping students to courses.
6. **`teacher_courses`**: Many-to-Many junction assigning teachers to courses.
7. **`attendance_sessions`**: Lecture attendance windows initiated by faculty (`session_code`, `start_time`, `end_time`, `active`, `rssi_threshold` = -70 dBm).
8. **`attendance_records`**: Verified attendance submissions (`timestamp`, `rssi`, `status`: `PRESENT`, `REJECTED_WEAK_SIGNAL`, `ALREADY_MARKED`).

---

## 3. BLE Abstraction & RSSI Simulation

### Why an Abstraction Layer?
Standard desktop and mobile web browsers do not support phone-to-phone BLE peripheral advertising due to OS platform security restrictions. Rather than faking browser BLE support, PresenceGuard introduces the **`BLEService`** interface:

```typescript
export interface BLEService {
  startBroadcast(config: BLEBroadcastConfig): Promise<boolean>;
  stopBroadcast(): Promise<void>;
  isBroadcasting(): boolean;
  scanForTeacher(options?: BLEScanOptions): Promise<BLEDiscoveredDevice | null>;
  getRSSI(): Promise<number>;
  stopScanning(): void;
}
```

### Simulated RSSI Signal Categories
In development mode, `MockBLEService` generates calibrated RSSI values with realistic RF multipath jitter:

| Signal Level | RSSI Value | Classroom Equivalent | Attendance Result |
| :--- | :--- | :--- | :--- |
| **Excellent** | `≥ -50 dBm` | Podium / First Row (~1m) | **ELIGIBLE** (Present) |
| **Strong** | `-51 to -60 dBm` | Middle Row (~3-5m) | **ELIGIBLE** (Present) |
| **Acceptable** | `-61 to -70 dBm` | Back Row (~8-10m) | **ELIGIBLE** (Present) |
| **Weak (Hallway)** | `-71 to -80 dBm` | Outside Classroom Corridor | **REJECTED** (Weak Signal) |
| **Reject (Far)** | `< -80 dBm` | Canteen / Next Building | **REJECTED** (Weak Signal) |

---

## 4. Setup & Running Instructions

### Prerequisites
- **Java 21** or later
- **Maven 3.8+**
- **Node.js 18+** and **npm**
- **MySQL 8.0+**

### 1. Spring Boot Backend
```bash
cd backend

# Configure your MySQL password in src/main/resources/application.properties:
# spring.datasource.password=your_mysql_password

# Build and start the backend:
mvn spring-boot:run
```
The backend server runs on `http://localhost:8080`.

### 2. React Vite Frontend
```bash
# In the project root:
npm install
npm run dev
```
The frontend dev server runs on `http://localhost:3000`.

---

## 5. Seed Demo Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@college.com` | `admin123` | Institutional Administrator |
| **TEACHER** | `teacher@college.com` | `teacher123` | Prof. Rajesh Sharma (EMP-CSE-104) |
| **STUDENT** | `student@college.com` | `student123` | Hemant Singh (Roll No: 21CSE101) |

*A 1-click **Quick Role Switcher** is also available in the top navigation bar of the application.*

---

## 6. End-to-End Walk-Through

### Step 1: Start Attendance as Teacher
1. Log in as `teacher@college.com` (Prof. Rajesh Sharma).
2. Go to **My Classes** → **Java Programming (CS301)**.
3. Click **Start Attendance**.
4. Click **Start BLE Broadcast**.
5. Observe the status: `BLE Broadcast Active | Simulated Device: Teacher_Device_CS301`.

### Step 2: Scan and Mark Attendance as Student
1. Switch role to **Student** (`student@college.com`).
2. Go to **Scan & Mark Attendance**.
3. Under active sessions, click **Scan For Teacher**.
4. The scanner detects `Teacher_Device_CS301` with an RSSI of `-55 dBm` (**Strong**).
5. Click **Mark Attendance**.
6. The backend verifies the enrollment, checks that RSSI ≥ -70 dBm, and records **Present**.

### Step 3: Test Weak Signal Rejection
1. Click the **MockBLE Mode** badge or **Tune Simulated RSSI** in the header.
2. Select the **Weak (Outside Hallway) -75 dBm** preset.
3. Click **Re-measure** or **Scan For Teacher**.
4. Notice the status updates to: `Signal Too Weak: Move Closer To Classroom`.
5. Clicking **Mark Attendance** causes the server to reject the attempt and log `REJECTED_WEAK_SIGNAL`.

### Step 4: Live Teacher Monitoring
1. Switch back to the **Teacher** view.
2. Open **Live Session & BLE**.
3. Observe the live table polling in real time: Roll No `21CSE101`, Student `Hemant Singh`, RSSI `-55 dBm`, Status: `Present`.

---

## 7. Example API Requests

### 1. Authenticate (Login)
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@college.com",
    "password": "student123"
  }'
```

### 2. Mark Attendance (Proximity Submission)
```bash
curl -X POST http://localhost:8080/api/attendance/mark \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "studentId": 1,
    "rssi": -58
  }'
```

---

## 8. Phase 2 Roadmap: Android Native BLE Implementation

To transition from Phase 1 to Phase 2, replace `MockBLEService` with an Android Kotlin native module that implements the same `BLEService` contract:

1. **Teacher Mode (Beacon Advertiser)**:
   Uses `android.bluetooth.le.BluetoothLeAdvertiser` to broadcast the `sessionCode` in non-connectable advertising mode (`AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY`).
2. **Student Mode (Scanner)**:
   Uses `android.bluetooth.le.BluetoothLeScanner` with a `ScanFilter` on the institutional Service UUID. The raw hardware antenna RSSI is extracted from `ScanResult.getRssi()`.
3. **Zero Frontend/Backend Rewrites**:
   Because all UI components communicate strictly through `BLEService` and the backend expects standard `{ sessionId, studentId, rssi }` payloads, no code modifications are needed on the Spring Boot server or React views.
