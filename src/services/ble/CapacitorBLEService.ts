import { Capacitor } from '@capacitor/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { BLEDiscoveredDevice } from '../../types';
import { BLEBroadcastConfig, BLEScanOptions, BLEService } from './BLEService';
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

    // Web fallback or mock mode in browser
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
      return true;
    } catch (nativeErr: any) {
      console.error('[PresenceGuard BLE] Native advertiser failed:', nativeErr);
      this.activeBroadcast = null;
      throw nativeErr;
    }
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
    return this.activeBroadcast !== null || (!Capacitor.isNativePlatform() && mockBLEService.isBroadcasting());
  }

  public getActiveBroadcast(): BLEBroadcastConfig | null {
    return this.activeBroadcast || (!Capacitor.isNativePlatform() ? mockBLEService.getActiveBroadcast() : null);
  }

  public async scanForTeacher(options?: BLEScanOptions): Promise<BLEDiscoveredDevice | null> {
    // If in web browser, use calibrated simulation
    if (!Capacitor.isNativePlatform()) {
      return mockBLEService.scanForTeacher(options);
    }

    const initialized = await this.ensureInitialized();
    if (!initialized) {
      console.warn('[PresenceGuard BLE] BleClient initialization failed on device.');
      return null;
    }

    // Verify Bluetooth hardware state and prompt user if turned off
    try {
      const isEnabled = await BleClient.isEnabled();
      if (!isEnabled) {
        await BleClient.requestEnable();
      }
    } catch (e) {
      console.warn('[PresenceGuard BLE] Could not request Bluetooth enable:', e);
    }

    this.isScanning = true;
    let foundDevice: BLEDiscoveredDevice | null = null;
    const targetCode = options?.courseCode?.toUpperCase() || 'CS301';

    try {
      await new Promise<void>(async (resolve) => {
        const timeout = setTimeout(async () => {
          try {
            await BleClient.stopLEScan();
          } catch {}
          resolve();
        }, options?.timeoutMs || 4500);

        try {
          await BleClient.requestLEScan(
            {
              allowDuplicates: true
            },
            (result: ScanResult) => {
              const deviceName = result.device?.name || result.localName || '';
              const rssi = result.rssi ?? -60;

              // 1. Check Service UUIDs (PresenceGuard UUID / feaa)
              const hasPresenceGuardUuid = Array.isArray(result.uuids) && result.uuids.some((u: string) => 
                u.toLowerCase().includes('feaa') || u.toLowerCase() === PRESENCEGUARD_SERVICE_UUID.toLowerCase()
              );

              // 2. Check Service Data for courseCode
              let serviceDataMatch = false;
              let hasAnyServiceData = false;
              if (result.serviceData) {
                for (const [uuid, data] of Object.entries(result.serviceData)) {
                  if (uuid.toLowerCase().includes('feaa')) {
                    hasAnyServiceData = true;
                    const dataStr = typeof data === 'string' ? data : '';
                    if (dataStr.toUpperCase().includes(targetCode)) {
                      serviceDataMatch = true;
                    }
                  }
                }
              }

              // 3. Check Manufacturer Data (Company ID 0x1337 contains "PG_<courseCode>")
              let manufacturerMatch = false;
              if (result.manufacturerData) {
                for (const [, data] of Object.entries(result.manufacturerData)) {
                  const dataStr = typeof data === 'string' ? data : '';
                  if (dataStr.toUpperCase().includes(targetCode) || dataStr.toUpperCase().includes('PG_')) {
                    manufacturerMatch = true;
                  }
                }
              }

              // 4. Check device name or local name
              const nameMatch = deviceName.toUpperCase().includes(targetCode) || 
                                deviceName.toUpperCase().includes('PG_');

              // 5. Check raw advertisement hex bytes if present
              let rawMatch = false;
              if (result.rawAdvertisement) {
                const asciiHex = Array.from(targetCode).map(c => c.charCodeAt(0).toString(16)).join('');
                if (result.rawAdvertisement.toLowerCase().includes(asciiHex.toLowerCase()) ||
                    result.rawAdvertisement.toLowerCase().includes('feaa')) {
                  rawMatch = true;
                }
              }

              const isMatch = (hasPresenceGuardUuid && (serviceDataMatch || !hasAnyServiceData || nameMatch)) ||
                              serviceDataMatch ||
                              manufacturerMatch ||
                              nameMatch ||
                              (hasPresenceGuardUuid && rawMatch);

              if (isMatch && !foundDevice) {
                this.lastMeasuredRSSI = rssi;
                foundDevice = {
                  deviceId: result.device.deviceId,
                  deviceName: deviceName || `Teacher_Beacon_${targetCode}`,
                  courseCode: targetCode,
                  sessionId: options?.sessionId || 1,
                  teacherName: options?.teacherName || 'Classroom Faculty Beacon',
                  rssi: rssi, // Raw physical antenna signal measured directly by the phone hardware!
                  timestamp: Date.now(),
                  isSimulated: false // Physical hardware packet!
                };
                clearTimeout(timeout);
                BleClient.stopLEScan().catch(() => {});
                resolve();
              }
            }
          );
        } catch (scanErr) {
          console.warn('[PresenceGuard BLE] Native scan error:', scanErr);
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

    // On physical mobile device: if the antenna did not detect any teacher beacon, return null (strict real antenna)
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
