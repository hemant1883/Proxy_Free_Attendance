import { registerPlugin } from '@capacitor/core';

export interface NativeBleAdvertiserPlugin {
  startBroadcast(options: {
    courseCode: string;
    sessionId?: number;
    teacherName?: string;
  }): Promise<{ success: boolean; courseCode: string }>;
  stopBroadcast(): Promise<{ success: boolean }>;
  isAdvertising(): Promise<{ isAdvertising: boolean; courseCode?: string }>;
}

export const NativeBleAdvertiser = registerPlugin<NativeBleAdvertiserPlugin>('NativeBleAdvertiser');
