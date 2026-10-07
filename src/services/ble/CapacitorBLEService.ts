import { Capacitor } from '@capacitor/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { BLEDiscoveredDevice } from '../../types';
import { BLEBroadcastConfig, BLEScanOptions, BLEService } from './BLEService';
import { mockBLEService } from './MockBLEService';
import { NativeBleAdvertiser } from './NativeBleAdvertiser';

// Institutional PresenceGuard Service UUID for Classroom BLE Beacons
export const PRESENCEGUARD_SERVICE_UUID = '0000feaa-0000-1000-8000-00805f9b34fb';

// Utility to convert hex strings returned by Android BleClient into ASCII text
function hexToAscii(hex: string): string {
  try {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (!isNaN(code) && code >= 32 && code <= 126) {
        str += String.fromCharCode(code);
      }
    }
    return str;
  } catch {
    return '';
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
        throw new Error('Location (GPS) is turned OFF on this phone. Android strictly requires Location to be ON for Bluetooth Low Energy scanning. Please enable Location in your quick settings and retry.');
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
        }, options?.timeoutMs || 5000);

        try {
          await BleClient.requestLEScan(
            {
              allowDuplicates: true
            },
            (result: ScanResult) => {
              const deviceName = result.device?.name || result.localName || '';
              const rssi = result.rssi ?? -60;

              // A. Check Service UUIDs (PresenceGuard UUID: feaa)
              const hasPresenceGuardUuid = Array.isArray(result.uuids) && result.uuids.some((u: string) => 
                u.toLowerCase().includes('feaa') || u.toLowerCase() === PRESENCEGUARD_SERVICE_UUID.toLowerCase()
              );

              // B. Decode Service Data (Android returns hex string e.g. "4353333031" for "CS301")
              let serviceDataMatch = false;
              let serviceDataDecoded = '';
              if (result.serviceData) {
                for (const [uuid, data] of Object.entries(result.serviceData)) {
                  if (uuid.toLowerCase().includes('feaa')) {
                    const hexStr = typeof data === 'string' ? data : '';
                    const asciiStr = hexToAscii(hexStr);
                    serviceDataDecoded = asciiStr;
                    if (hexStr.toUpperCase().includes(targetCode) || 
                        asciiStr.toUpperCase().includes(targetCode)) {
                      serviceDataMatch = true;
                    }
                  }
                }
              }

              // C. Decode Manufacturer Data (Company ID 0x1337 contains "PG_<courseCode>")
              let manufacturerMatch = false;
              let manufacturerDecoded = '';
              if (result.manufacturerData) {
                for (const [, data] of Object.entries(result.manufacturerData)) {
                  const hexStr = typeof data === 'string' ? data : '';
                  const asciiStr = hexToAscii(hexStr);
                  manufacturerDecoded = asciiStr;
                  if (asciiStr.toUpperCase().includes(targetCode) || 
                      asciiStr.toUpperCase().includes('PG_') ||
                      hexStr.toUpperCase().includes(targetCode)) {
                    manufacturerMatch = true;
                  }
                }
              }

              // D. Check advertised device name or local name
              const nameMatch = deviceName.toUpperCase().includes(targetCode) || 
                                deviceName.toUpperCase().includes('PG_');

              // E. Check raw advertisement hex bytes if present
              let rawMatch = false;
              if (result.rawAdvertisement) {
                const asciiHex = Array.from(targetCode).map(c => c.charCodeAt(0).toString(16)).join('');
                if (result.rawAdvertisement.toLowerCase().includes(asciiHex.toLowerCase()) ||
                    result.rawAdvertisement.toLowerCase().includes('feaa')) {
                  rawMatch = true;
                }
              }

              // Match verification:
              // If PresenceGuard Service UUID is present, it is our classroom beacon!
              const decodedInfo = serviceDataDecoded || manufacturerDecoded;
              const matchesCourse = !decodedInfo || decodedInfo.toUpperCase().includes(targetCode) || !options?.courseCode;

              const isMatch = (hasPresenceGuardUuid && matchesCourse) ||
                              serviceDataMatch ||
                              manufacturerMatch ||
                              nameMatch ||
                              (hasPresenceGuardUuid && rawMatch) ||
                              hasPresenceGuardUuid;

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
          reject(scanErr);
        }
      });
    } catch (err: any) {
      console.warn('[PresenceGuard BLE] Scan exception:', err);
      if (err?.message?.includes('Location (GPS)')) {
        throw err;
      }
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
