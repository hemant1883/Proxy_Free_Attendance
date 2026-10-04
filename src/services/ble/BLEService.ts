import { BLEDiscoveredDevice } from '../../types';

export interface BLEBroadcastConfig {
  sessionId: number;
  courseCode: string;
  courseName: string;
  teacherName: string;
  teacherDeviceId?: string;
  txPower?: number; // e.g. -59 dBm reference at 1m
}

export interface BLEScanOptions {
  courseCode?: string;
  timeoutMs?: number;
}

/**
 * BLEService Interface
 * 
 * Abstraction layer for Bluetooth Low Energy operations in PresenceGuard.
 * - In Phase 1 (Web Prototype): Implemented by MockBLEService (simulated radio, configurable RSSI).
 * - In Phase 2 (Android/Kotlin): Will be replaced by AndroidBleService using
 *   BluetoothLeScanner and BluetoothLeAdvertiser native APIs, with zero changes
 *   to UI and domain logic.
 */
export interface BLEService {
  /**
   * Start advertising as a BLE peripheral (Teacher classroom beacon).
   */
  startBroadcast(config: BLEBroadcastConfig): Promise<boolean>;

  /**
   * Stop advertising BLE beacon.
   */
  stopBroadcast(): Promise<void>;

  /**
   * Check if this device is actively broadcasting.
   */
  isBroadcasting(): boolean;

  /**
   * Get current active broadcast parameters if any.
   */
  getActiveBroadcast(): BLEBroadcastConfig | null;

  /**
   * Scan for teacher BLE beacons nearby (Student Central mode).
   */
  scanForTeacher(options?: BLEScanOptions): Promise<BLEDiscoveredDevice | null>;

  /**
   * Continuous RSSI monitoring for an active connection or found device.
   */
  getRSSI(): Promise<number>;

  /**
   * Stop any active background BLE scanning.
   */
  stopScanning(): void;

  /**
   * Set simulated RSSI preset or manual value (Dev mode only).
   */
  setSimulatedRSSI?(rssi: number): void;
}

export const ATTENDANCE_RSSI_THRESHOLD = -70; // dBm
