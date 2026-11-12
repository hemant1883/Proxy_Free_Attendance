import { Capacitor } from '@capacitor/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { BLEDiscoveredDevice } from '../../types';
import { BLEBroadcastConfig, BLEScanOptions, BLEService } from './BLEService';
import { mockBLEService } from './MockBLEService';
import { NativeBleAdvertiser } from './NativeBleAdvertiser';

// Institutional PresenceGuard Service UUID for Classroom BLE Beacons
export const PRESENCEGUARD_SERVICE_UUID = '0000feaa-0000-1000-8000-00805f9b34fb';

export interface BLEScanDiagnostics {
  totalPacketsSeen: number;
  uniqueDevicesSeen: number;
  matchedBy?: string;
  lastError?: string;
}

const KNOWN_COURSES: Record<string, string> = {
  'CS301': 'Java Programming',
  'CS302': 'Database Management Systems',
  'CS303': 'Computer Networks',
  'CS304': 'Compiler Design',
};

// Utility to convert hex strings, DataView, ArrayBuffer, and Uint8Array into ASCII and Hex
function parseDataPayload(data: any): { ascii: string; hex: string } {
  if (!data) return { ascii: '', hex: '' };

  if (typeof data === 'string') {
    const cleanHex = data.replace(/\s+/g, '');
    let ascii = '';
    for (let i = 0; i + 1 < cleanHex.length; i += 2) {
      const code = parseInt(cleanHex.substring(i, i + 2), 16);
      if (!isNaN(code) && code >= 32 && code <= 126) {
        ascii += String.fromCharCode(code);
      }
    }
    return { ascii, hex: cleanHex.toUpperCase() };
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
  private lastDiagnostics: BLEScanDiagnostics = {
    totalPacketsSeen: 0,
    uniqueDevicesSeen: 0,
  };

  public getLastScanDiagnostics(): BLEScanDiagnostics {
    return this.lastDiagnostics;
  }

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
    let hasTeacherInPayload = false;
    const requestedCode = options?.courseCode?.trim().toUpperCase() || '';
    const seenAddresses = new Set<string>();
    let totalPackets = 0;

    this.lastDiagnostics = {
      totalPacketsSeen: 0,
      uniqueDevicesSeen: 0,
    };

    try {
      await new Promise<void>(async (resolve, reject) => {
        let finished = false;
        let graceTimer: ReturnType<typeof setTimeout> | null = null;
        let scanTimeout: ReturnType<typeof setTimeout> | null = null;

        const finishScan = () => {
          if (finished) return;
          finished = true;
          if (scanTimeout) clearTimeout(scanTimeout);
          if (graceTimer) clearTimeout(graceTimer);
          BleClient.stopLEScan().catch(() => {});
          resolve();
        };

        scanTimeout = setTimeout(finishScan, options?.timeoutMs || 10000);

        try {
          await BleClient.requestLEScan(
            {
              // Scan mode 2 = SCAN_MODE_LOW_LATENCY (100% duty cycle on Android for rapid discovery)
              scanMode: 2,
              allowDuplicates: true
            },
            (result: ScanResult) => {
              if (finished) return;

              totalPackets += 1;
              if (result.device?.deviceId) {
                seenAddresses.add(result.device.deviceId);
              }
              this.lastDiagnostics.totalPacketsSeen = totalPackets;
              this.lastDiagnostics.uniqueDevicesSeen = seenAddresses.size;

              const deviceName = result.device?.name || result.localName || '';
              const rssi = result.rssi ?? -60;

              // A. Check Service UUIDs (PresenceGuard UUID: feaa)
              const hasPresenceGuardUuid = Array.isArray(result.uuids) && result.uuids.some((u: string) =>
                u.toLowerCase().includes('feaa') || u.toLowerCase() === PRESENCEGUARD_SERVICE_UUID.toLowerCase()
              );

              let detectedSessionId: number | undefined = undefined;
              let detectedCourseCode: string | undefined = undefined;
              let detectedTeacherName: string | undefined = undefined;

              const parsePayloadData = (text: string) => {
                if (!text) return;
                // Format 1 (Scan Response): "sessionId#courseCode#teacherName" (e.g. "1#CS304#Prof. Alok Ver")
                if (text.includes('#')) {
                  const parts = text.split('#');
                  if (parts[0] && !isNaN(Number(parts[0]))) detectedSessionId = Number(parts[0]);
                  if (parts[1]) detectedCourseCode = parts[1].trim().toUpperCase();
                  if (parts[2] && parts[2].trim()) detectedTeacherName = parts[2].trim();
                }
                // Format 2 (Primary Manufacturer Data): "PG:sessionId:courseCode" (e.g. "PG:1:CS304")
                else {
                  const pgColonIdx = text.indexOf('PG:');
                  if (pgColonIdx !== -1) {
                    const sub = text.slice(pgColonIdx);
                    const parts = sub.split(':');
                    if (parts.length >= 3) {
                      if (!isNaN(Number(parts[1]))) detectedSessionId = Number(parts[1]);
                      if (parts[2]) detectedCourseCode = parts[2].trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                    } else if (parts.length === 2) {
                      detectedCourseCode = parts[1].trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                    }
                  } else if (text.includes('PG_')) {
                    const code = text.split('PG_')[1]?.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                    if (code) detectedCourseCode = code;
                  }
                }
              };

              // B. Decode Service Data
              let serviceDataMatch = false;
              if (result.serviceData) {
                for (const [uuid, data] of Object.entries(result.serviceData)) {
                  const parsed = parseDataPayload(data);
                  if (parsed.ascii) {
                    parsePayloadData(parsed.ascii);
                    if (
                      (requestedCode && parsed.ascii.toUpperCase().includes(requestedCode)) ||
                      parsed.ascii.toUpperCase().includes('PG') ||
                      parsed.ascii.includes('#')
                    ) {
                      serviceDataMatch = true;
                    }
                  }
                  if (uuid.toLowerCase().includes('feaa')) {
                    serviceDataMatch = true;
                  }
                }
              }

              // C. Decode Manufacturer Data (Company ID 0x1337 / 4919)
              let manufacturerMatch = false;
              if (result.manufacturerData) {
                for (const [id, data] of Object.entries(result.manufacturerData)) {
                  const parsed = parseDataPayload(data);
                  if (parsed.ascii) {
                    parsePayloadData(parsed.ascii);
                    if (
                      (requestedCode && parsed.ascii.toUpperCase().includes(requestedCode)) ||
                      parsed.ascii.toUpperCase().includes('PG:')
                    ) {
                      manufacturerMatch = true;
                    }
                  }
                  if (String(id) === '4919' || String(id).toLowerCase().includes('1337')) {
                    manufacturerMatch = true;
                  }
                }
              }

              // D. Check advertised device name or local name (e.g. "PG_CS304")
              const nameUpper = deviceName.toUpperCase();
              const nameMatch =
                (requestedCode.length > 0 && nameUpper.includes(`PG_${requestedCode}`)) ||
                nameUpper.startsWith('PG_');
              if (nameUpper.includes('PG')) {
                parsePayloadData(deviceName);
              }

              // E. Check raw advertisement hex/ASCII bytes if present
              let rawMatch = false;
              if (result.rawAdvertisement) {
                const rawParsed = parseDataPayload(result.rawAdvertisement);
                const rawHex = rawParsed.hex.toLowerCase();
                const targetHex = requestedCode
                  ? Array.from(requestedCode).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
                  : '';
                // 3713 = 0x1337 (little-endian), aafe = 0xFEAA (little-endian), 50473a = "PG:"
                if (
                  rawHex.includes('3713') ||
                  rawHex.includes('50473a') ||
                  rawHex.includes('aafe') ||
                  rawHex.includes('feaa') ||
                  (targetHex && rawHex.includes(targetHex))
                ) {
                  rawMatch = true;
                  if (rawParsed.ascii) {
                    parsePayloadData(rawParsed.ascii);
                  }
                }
              }

              const isMatch = hasPresenceGuardUuid || serviceDataMatch || manufacturerMatch || nameMatch || rawMatch;
              if (!isMatch) return;

              // If user asked for a specific courseCode and packet explicitly identifies a DIFFERENT courseCode, ignore if we can still find the right one
              if (
                requestedCode &&
                detectedCourseCode &&
                detectedCourseCode !== requestedCode &&
                options?.sessionId !== detectedSessionId
              ) {
                return;
              }

              const matchReason = [
                hasPresenceGuardUuid ? 'UUID:0xFEAA' : '',
                serviceDataMatch ? 'ServiceData' : '',
                manufacturerMatch ? 'Manufacturer:0x1337' : '',
                nameMatch ? 'DeviceName' : '',
                rawMatch ? 'RawAD' : '',
              ].filter(Boolean).join('+');

              const finalCourseCode = detectedCourseCode || requestedCode || 'COURSE';
              const finalSessionId = detectedSessionId || options?.sessionId || 1;
              const finalTeacherName = detectedTeacherName || foundDevice?.teacherName || options?.teacherName || 'Classroom Faculty';
              const finalCourseName =
                KNOWN_COURSES[finalCourseCode] ||
                (finalCourseCode === requestedCode ? options?.courseName : undefined) ||
                `${finalCourseCode} Lecture`;

              this.lastMeasuredRSSI = rssi;
              this.lastDiagnostics.matchedBy = matchReason;

              foundDevice = {
                deviceId: result.device.deviceId,
                deviceName: `Teacher Beacon [${finalCourseCode}]`,
                courseCode: finalCourseCode,
                courseName: finalCourseName,
                sessionId: finalSessionId,
                teacherName: finalTeacherName,
                rssi,
                timestamp: Date.now(),
                isSimulated: false
              };

              if (detectedTeacherName) {
                hasTeacherInPayload = true;
              }

              // If scan response with teacher name arrived, finish immediately; otherwise wait up to 800ms for scanResponse to merge
              if (hasTeacherInPayload) {
                finishScan();
              } else if (!graceTimer) {
                graceTimer = setTimeout(finishScan, 800);
              }
            }
          );
        } catch (scanErr: any) {
          this.lastDiagnostics.lastError = scanErr?.message || String(scanErr);
          console.warn('[PresenceGuard BLE] Native scan error:', scanErr);
          reject(scanErr);
        }
      });
    } catch (err: any) {
      this.lastDiagnostics.lastError = err?.message || String(err);
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
