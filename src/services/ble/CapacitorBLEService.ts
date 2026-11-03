import { Capacitor } from '@capacitor/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { BLEDiscoveredDevice } from '../../types';
import { BLEBroadcastConfig, BLEScanOptions, BLEService } from './BLEService';
import { mockBLEService } from './MockBLEService';
import { NativeBleAdvertiser } from './NativeBleAdvertiser';

// Institutional PresenceGuard Service UUID for Classroom BLE Beacons
export const PRESENCEGUARD_SERVICE_UUID = '0000feaa-0000-1000-8000-00805f9b34fb';

// Utility to convert hex strings, DataView, ArrayBuffer, and Uint8Array into ASCII and Hex
function parseDataPayload(data: any): { ascii: string; hex: string } {
  if (!data) return { ascii: '', hex: '' };

  if (typeof data === 'string') {
    let ascii = '';
    for (let i = 0; i < data.length; i += 2) {
      const code = parseInt(data.substring(i, i + 2), 16);
      if (!isNaN(code) && code >= 32 && code <= 126) {
        ascii += String.fromCharCode(code);
      }
    }
    return { ascii, hex: data.toUpperCase() };
  }

  try {
    let bytes: Uint8Array;
    if (data instanceof DataView) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, (data as any).byteOffset || 0, (data as any).byteLength || data.buffer.byteLength);
    } else if (Array.isArray(data)) {
      bytes = new Uint8Array(data);
    } else {
      return { ascii: '', hex: '' };
    }

    let ascii = '';
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      hex += b.toString(16).padStart(2, '0');
      if (b >= 32 && b <= 126) {
        ascii += String.fromCharCode(b);
      }
    }
    return { ascii, hex: hex.toUpperCase() };
  } catch {
    return { ascii: '', hex: '' };
  }
}

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
      } catch (err: any) {
        console.error('[PresenceGuard BLE] Failed to initialize native BleClient:', err);
        throw new Error(
          'Bluetooth or Nearby Devices permission was denied. Please go to your phone Settings > Apps > PresenceGuard > Permissions, and allow "Nearby devices" / "Bluetooth" and "Location".'
        );
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

    await this.ensureInitialized();

    // 1. Verify Bluetooth hardware state and prompt user if turned off
    try {
      const isEnabled = await BleClient.isEnabled();
      if (!isEnabled) {
        await BleClient.requestEnable();
      }
    } catch (e) {
      console.warn('[PresenceGuard BLE] Could not request Bluetooth enable:', e);
    }

    // 2. Verify Android Location / GPS service state (Android OS strictly requires Location ON for BLE scans)
    try {
      const isLocationEnabled = await BleClient.isLocationEnabled();
      if (!isLocationEnabled) {
        try {
          await BleClient.openLocationSettings();
        } catch {}
        throw new Error('Location (GPS) is turned OFF on this phone. Android strictly requires Location to be ON for Bluetooth Low Energy scanning. Please turn ON Location in your quick settings and retry.');
      }
    } catch (locErr: any) {
      if (locErr.message?.includes('Location (GPS)')) {
        throw locErr;
      }
      console.warn('[PresenceGuard BLE] Location check note:', locErr);
    }

    this.isScanning = true;
    let foundDevice: BLEDiscoveredDevice | null = null;
    const targetCode = options?.courseCode?.toUpperCase() || 'CS301';

    try {
      await new Promise<void>(async (resolve, reject) => {
        const timeout = setTimeout(async () => {
          try {
            await BleClient.stopLEScan();
          } catch {}
          resolve();
        }, options?.timeoutMs || 10000);

        try {
          await BleClient.requestLEScan(
            {
              // Scan mode 2 = SCAN_MODE_LOW_LATENCY (100% duty cycle on Android for rapid discovery)
              scanMode: 2,
              allowDuplicates: true
            },
            (result: ScanResult) => {
              const deviceName = result.device?.name || result.localName || '';
              const rssi = result.rssi ?? -60;

              // A. Check Service UUIDs (PresenceGuard UUID: feaa)
              const hasPresenceGuardUuid = Array.isArray(result.uuids) && result.uuids.some((u: string) => 
                u.toLowerCase().includes('feaa') || u.toLowerCase() === PRESENCEGUARD_SERVICE_UUID.toLowerCase()
              );

              // B. Decode Service Data (Handles DataView, ArrayBuffer, hex string)
              let serviceDataMatch = false;
              let detectedCourseFromPayload = '';
              if (result.serviceData) {
                for (const [uuid, data] of Object.entries(result.serviceData)) {
                  const parsed = parseDataPayload(data);
                  if (parsed.ascii) {
                    if (parsed.ascii.includes('PG_')) {
                      detectedCourseFromPayload = parsed.ascii.split('PG_')[1]?.trim() || '';
                    }
                    if (parsed.ascii.toUpperCase().includes(targetCode) || 
                        parsed.ascii.toUpperCase().includes('PG_')) {
                      serviceDataMatch = true;
                    }
                  }
                  if (uuid.toLowerCase().includes('feaa')) {
                    serviceDataMatch = true;
                  }
                }
              }

              // C. Decode Manufacturer Data (Company ID 0x1337 / 4919 contains "PG_<courseCode>")
              let manufacturerMatch = false;
              if (result.manufacturerData) {
                for (const [id, data] of Object.entries(result.manufacturerData)) {
                  const parsed = parseDataPayload(data);
                  if (parsed.ascii) {
                    if (parsed.ascii.includes('PG_')) {
                      detectedCourseFromPayload = parsed.ascii.split('PG_')[1]?.trim() || '';
                    }
                    if (parsed.ascii.toUpperCase().includes(targetCode) || 
                        parsed.ascii.toUpperCase().includes('PG_')) {
                      manufacturerMatch = true;
                    }
                  }
                  if (String(id) === '4919' || String(id) === '0x1337' || String(id).toLowerCase().includes('1337')) {
                    manufacturerMatch = true;
                  }
                }
              }

              // D. Check advertised device name or local name (e.g. "PG_CS301")
              const nameMatch = deviceName.toUpperCase().includes(targetCode) || 
                                deviceName.toUpperCase().includes('PG_');
              if (deviceName.toUpperCase().includes('PG_')) {
                detectedCourseFromPayload = deviceName.split('PG_')[1]?.trim() || '';
              }

              // E. Check raw advertisement hex bytes if present
              let rawMatch = false;
              if (result.rawAdvertisement) {
                const rawStr = typeof result.rawAdvertisement === 'string' ? result.rawAdvertisement.toLowerCase() : '';
                const asciiHex = Array.from(targetCode).map(c => c.charCodeAt(0).toString(16)).join('');
                // 3713 is 0x1337 in little-endian, 5047 is PG, feaa is UUID
                if (rawStr.includes('3713') || rawStr.includes('50475f') || rawStr.includes('feaa') || (asciiHex && rawStr.includes(asciiHex))) {
                  rawMatch = true;
                }
              }

              // Any PresenceGuard signature confirms this is the teacher's classroom beacon
              const isMatch = hasPresenceGuardUuid || serviceDataMatch || manufacturerMatch || nameMatch || rawMatch;

              if (isMatch && !foundDevice) {
                const finalCourseCode = detectedCourseFromPayload || targetCode;
                this.lastMeasuredRSSI = rssi;
                foundDevice = {
                  deviceId: result.device.deviceId,
                  deviceName: deviceName || `Teacher_Beacon_${finalCourseCode}`,
                  courseCode: finalCourseCode,
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
          reject(scanErr);
        }
      });
    } catch (err: any) {
      console.warn('[PresenceGuard BLE] Scan exception:', err);
      throw err;
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
