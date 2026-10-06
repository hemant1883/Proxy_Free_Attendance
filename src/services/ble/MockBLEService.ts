import { BLEDiscoveredDevice } from '../../types';
import { BLEBroadcastConfig, BLEScanOptions, BLEService, ATTENDANCE_RSSI_THRESHOLD } from './BLEService';

const BROADCAST_STORAGE_KEY = 'presenceguard_ble_broadcast';
const BROADCAST_CHANNEL_NAME = 'presenceguard_ble_channel';

export interface RSSIPreset {
  label: string;
  value: number;
  description: string;
  color: string;
}

export const RSSI_PRESETS: RSSIPreset[] = [
  { label: 'Very Close (Podium)', value: -40, description: 'Direct line-of-sight to teacher (~1m)', color: 'text-emerald-700' },
  { label: 'Inside Classroom (Middle)', value: -55, description: 'Standard desk seating (~3-5m)', color: 'text-emerald-600' },
  { label: 'Acceptable (Back Row)', value: -65, description: 'Back corner of lecture hall (~8-10m)', color: 'text-amber-600' },
  { label: 'Weak (Outside Hallway)', value: -75, description: 'Standing outside corridor, door closed', color: 'text-rose-600' },
  { label: 'Reject (Far Away)', value: -85, description: 'Opposite wing / canteen', color: 'text-rose-800' }
];

class MockBLEServiceImpl implements BLEService {
  private activeBroadcast: BLEBroadcastConfig | null = null;
  private channel: BroadcastChannel | null = null;
  private simulatedRSSI: number = -55; // Default: inside classroom
  private isScanning: boolean = false;
  private listeners: Set<(rssi: number) => void> = new Set();
  private jitterInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'BROADCAST_STARTED') {
            this.activeBroadcast = event.data.config;
          } else if (event.data?.type === 'BROADCAST_STOPPED') {
            this.activeBroadcast = null;
          }
        };
      } catch {
        // Fallback for older environments
      }

      // Check stored broadcast in localStorage on init
      const stored = localStorage.getItem(BROADCAST_STORAGE_KEY);
      if (stored) {
        try {
          this.activeBroadcast = JSON.parse(stored);
        } catch {
          this.activeBroadcast = null;
        }
      }

      // Read stored simulated RSSI if user adjusted it
      const savedRSSI = localStorage.getItem('presenceguard_sim_rssi');
      if (savedRSSI) {
        this.simulatedRSSI = parseInt(savedRSSI, 10);
      }

      this.startJitter();
    }
  }

  private startJitter() {
    // Add realistic RF multipath jitter (+/- 1 to 2 dBm) every 2.5 seconds
    if (typeof window === 'undefined') return;
    this.jitterInterval = setInterval(() => {
      if (this.listeners.size > 0) {
        const jitter = (Math.random() - 0.5) * 2; // -1 to +1
        const currentWithJitter = Math.round(this.simulatedRSSI + jitter);
        this.listeners.forEach(cb => cb(currentWithJitter));
      }
    }, 2500);
  }

  public async startBroadcast(config: BLEBroadcastConfig): Promise<boolean> {
    const enrichedConfig: BLEBroadcastConfig = {
      ...config,
      teacherDeviceId: config.teacherDeviceId || `Teacher_Device_${config.courseCode || '001'}`,
      txPower: -59
    };
    this.activeBroadcast = enrichedConfig;
    localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(enrichedConfig));
    
    if (this.channel) {
      this.channel.postMessage({ type: 'BROADCAST_STARTED', config: enrichedConfig });
    }
    
    // Simulate BLE peripheral initialization latency (350ms)
    await new Promise(r => setTimeout(r, 350));
    return true;
  }

  public async stopBroadcast(): Promise<void> {
    this.activeBroadcast = null;
    localStorage.removeItem(BROADCAST_STORAGE_KEY);
    
    if (this.channel) {
      this.channel.postMessage({ type: 'BROADCAST_STOPPED' });
    }
    await new Promise(r => setTimeout(r, 150));
  }

  public isBroadcasting(): boolean {
    return this.activeBroadcast !== null;
  }

  public getActiveBroadcast(): BLEBroadcastConfig | null {
    if (!this.activeBroadcast) {
      const stored = localStorage.getItem(BROADCAST_STORAGE_KEY);
      if (stored) {
        try {
          this.activeBroadcast = JSON.parse(stored);
        } catch {
          this.activeBroadcast = null;
        }
      }
    }
    return this.activeBroadcast;
  }

  public async scanForTeacher(options?: BLEScanOptions): Promise<BLEDiscoveredDevice | null> {
    this.isScanning = true;
    
    // Realistic BLE discovery latency (1.2 to 2.0s)
    const scanDelay = 1400;
    await new Promise(r => setTimeout(r, scanDelay));
    
    this.isScanning = false;
    const broadcast = this.getActiveBroadcast();

    if (!broadcast) {
      // If teacher is running in BlueStacks, emulator, or web browser on PC
      // (which have no physical Bluetooth radio transmitter), bridge with the active cloud session:
      if (options?.courseCode) {
        const currentRSSI = await this.getRSSI();
        return {
          deviceId: `Teacher_Device_${options.courseCode}`,
          deviceName: `Teacher_Beacon_${options.courseCode}`,
          courseCode: options.courseCode,
          sessionId: options.sessionId || 1,
          teacherName: options.teacherName || 'Classroom Faculty Beacon',
          rssi: currentRSSI,
          timestamp: Date.now(),
          isSimulated: true
        };
      }
      return null;
    }

    // Optional filter by courseCode if requested
    if (options?.courseCode && broadcast.courseCode && broadcast.courseCode !== options.courseCode) {
      return null;
    }

    const currentRSSI = await this.getRSSI();

    return {
      deviceId: broadcast.teacherDeviceId || 'Teacher_Device_001',
      deviceName: `${broadcast.teacherDeviceId || 'Teacher_Device_001'} (${broadcast.courseCode})`,
      courseCode: broadcast.courseCode,
      sessionId: broadcast.sessionId,
      teacherName: broadcast.teacherName,
      rssi: currentRSSI,
      timestamp: Date.now(),
      isSimulated: true
    };
  }

  public async getRSSI(): Promise<number> {
    // Return simulated value with slight instantaneous noise
    const jitter = Math.round((Math.random() - 0.5) * 2);
    return this.simulatedRSSI + jitter;
  }

  public stopScanning(): void {
    this.isScanning = false;
  }

  public setSimulatedRSSI(rssi: number): void {
    this.simulatedRSSI = rssi;
    localStorage.setItem('presenceguard_sim_rssi', rssi.toString());
    this.listeners.forEach(cb => cb(rssi));
  }

  public getSimulatedRSSIValue(): number {
    return this.simulatedRSSI;
  }

  public subscribeRSSI(callback: (rssi: number) => void): () => void {
    this.listeners.add(callback);
    callback(this.simulatedRSSI);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getThreshold(): number {
    return ATTENDANCE_RSSI_THRESHOLD;
  }
}

// Export singleton instance for the app
export const mockBLEService = new MockBLEServiceImpl();
export const bleService: BLEService = mockBLEService;
