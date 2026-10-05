import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.presenceguard.app',
  appName: 'PresenceGuard',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Scanning for classroom presence beacon...',
        cancel: 'Cancel',
        availableDevices: 'Detected Class Beacons',
        noDeviceFound: 'No teacher beacon detected within range'
      }
    }
  }
};

export default config;
