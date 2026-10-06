import { Capacitor } from '@capacitor/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { BLEDiscoveredDevice } from '../../types';
import { BLEBroadcastConfig, BLEScanOptions, BLEService, ATTENDANCE_RSSI_THRESHOLD } from './BLEService';
import { mockBLEService } from './MockBLEService';
import { NativeBleAdvertiser } from './NativeBleAdvertiser';

// Institutional PresenceGuard Service UUID for Classroom BLE Beacons
export const PRESENCEGUARD_SERVICE_UUID = '0000feaa-0000-1000-8000-00805f9b34fb';

class CapacitorBLEServiceImpl implements BLEService {
  private isInitialized = false;
  private isScanning = false;
  private activeBroadcast: BLEBroadcastConfig | null = null;
  private lastMeasuredRSSI: number = -55;

  private async ensureInitialized(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false; // Browser environment
    }

    if (!this.isInitialized) {
      try {
        await BleClient.initialize();
        this.isInitialized = true;
      } catch (err) {
        console.warn('[PresenceGuard BLE] Failed to initialize native BleClient:', err);
        return false;
      }
    }
    return true;
  }

  public async startBroadcast(config: BLEBroadcastConfig): Promise<boolean> {
    this.activeBroadcast = config;

    // Web fallback or mock mode
    if (!Capacitor.isNativePlatform()) {
      return mockBLEService.startBroadcast(config);
    }

    try {
      await this.ensureInitialized();
      await NativeBleAdvertiser.startBroadcast({
        courseCode: config.courseCode,
        sessionId: config.sessionId,
        teacherName: config.teacherName
      });
      console.log('[PresenceGuard BLE] Native Hardware BLE Advertising active for course:', config.courseCode);
    } catch (nativeErr) {
      console.warn('[PresenceGuard BLE] Native advertiser failed or not supported:', nativeErr);
    }

    return mockBLEService.startBroadcast(config);
  }

  public async stopBroadcast(): Promise<void> {
    this.activeBroadcast = null;
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeBleAdvertiser.stopBroadcast();
        console.log('[PresenceGuard BLE] Native Hardware BLE Advertising stopped');
      } catch (err) {
        console.warn('[PresenceGuard BLE] Native stopBroadcast error:', err);
      }
    }
    await mockBLEService.stopBroadcast();
  }

  public isBroadcasting(): boolean {
    return this.activeBroadcast !== null || mockBLEService.isBroadcasting();
  }

  public getActiveBroadcast(): BLEBroadcastConfig | null {
    return this.activeBroadcast || mockBLEService.getActiveBroadcast();
  }

  public async scanForTeacher(options?: BLEScanOptions): Promise<BLEDiscoveredDevice | null> {
    // If in web browser, seamlessly use calibrated simulation
    if (!Capacitor.isNativePlatform()) {
      return mockBLEService.scanForTeacher(options);
    }

    const initialized = await this.ensureInitialized();
    if (!initialized) {
      return mockBLEService.scanForTeacher(options);
    }

    this.isScanning = true;
    let foundDevice: BLEDiscoveredDevice | null = null;

    try {
      await new Promise<void>(async (resolve) => {
        const timeout = setTimeout(async () => {
          try {
            await BleClient.stopLEScan();
          } catch {}
          resolve();
        }, options?.timeoutMs || 3500);

        try {
          await BleClient.requestLEScan(
            {},
            (result: ScanResult) => {
              const deviceName = result.device.name || result.localName || '';
              const rssi = result.rssi ?? -60;

              const targetCode = options?.courseCode?.toUpperCase() || 'CS301';
              const isMatch = deviceName.toUpperCase().includes(targetCode) ||
                              deviceName.toUpperCase().includes('PG_') ||
                              (result.uuids && result.uuids.some(u => u.toLowerCase().includes('feaa')));

              if (isMatch && !foundDevice) {
                this.lastMeasuredRSSI = rssi;
                foundDevice = {
                  deviceId: result.device.deviceId,
                  deviceName: deviceName || `Teacher_Beacon_${targetCode}`,
                  courseCode: targetCode,
                  sessionId: options?.sessionId || 1,
                  teacherName: options?.teacherName || 'Classroom Faculty Beacon',
                  rssi: rssi, // Raw physical antenna RSSI in dBm directly from phone hardware!
                  timestamp: Date.now(),
                  isSimulated: false // Real physical hardware packet!
                };
                clearTimeout(timeout);
                BleClient.stopLEScan().catch(() => {});
                resolve();
              }
            }
          );
        } catch (scanErr) {
          console.warn('[PresenceGuard BLE] Native scan error, fallback to mock:', scanErr);
          resolve();
        }
      });
    } catch (err) {
      console.warn('[PresenceGuard BLE] Scan exception:', err);
    } finally {
      this.isScanning = false;
    }

    if (foundDevice) {
      return foundDevice;
    }

    // On physical mobile device: if the antenna did not detect any teacher beacon, return null
    if (Capacitor.isNativePlatform()) {
      return null;
    }

    return mockBLEService.scanForTeacher(options);
  }

  public async getRSSI(): Promise<number> {
    if (Capacitor.isNativePlatform() && this.lastMeasuredRSSI !== undefined) {
      return this.lastMeasuredRSSI;
    }
    return mockBLEService.getRSSI();
  }

  public stopScanning(): void {
    this.isScanning = false;
    if (Capacitor.isNativePlatform()) {
      BleClient.stopLEScan().catch(() => {});
    }
    mockBLEService.stopScanning();
  }

  public setSimulatedRSSI(rssi: number): void {
    mockBLEService.setSimulatedRSSI(rssi);
  }
}

export const capacitorBLEService = new CapacitorBLEServiceImpl();
