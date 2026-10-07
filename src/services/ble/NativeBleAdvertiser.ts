import { registerPlugin } from '@capacitor/core';

export interface NativeBleAdvertiserPlugin {
  startBroadcast(options: {
    courseCode: string;
    sessionId?: number;
    teacherName?: string;
  }): Promise<{ success: boolean; courseCode: string; beaconName?: string }>;
  stopBroadcast(): Promise<{ success: boolean }>;
  isAdvertising(): Promise<{ isAdvertising: boolean; courseCode?: string }>;
  checkPermissions(): Promise<{ granted: boolean; hasAdvertise?: boolean; hasConnect?: boolean; hasLocation?: boolean }>;
}

export const NativeBleAdvertiser = registerPlugin<NativeBleAdvertiserPlugin>('NativeBleAdvertiser');
