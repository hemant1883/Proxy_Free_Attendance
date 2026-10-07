package com.presenceguard.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Log;
import android.widget.Toast;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.nio.charset.StandardCharsets;

@CapacitorPlugin(
    name = "NativeBleAdvertiser",
    permissions = {
        @Permission(
            alias = "bluetoothAdvertise",
            strings = {
                "android.permission.BLUETOOTH_ADVERTISE",
                "android.permission.BLUETOOTH_CONNECT"
            }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class NativeBleAdvertiserPlugin extends Plugin {
    private static final String TAG = "NativeBleAdvertiser";
    public static final String PRESENCEGUARD_UUID_STR = "0000feaa-0000-1000-8000-00805f9b34fb";
    public static final int PRESENCEGUARD_MANUFACTURER_ID = 0x1337;

    private BluetoothLeAdvertiser advertiser;
    private AdvertiseCallback advertiseCallback;
    private boolean isAdvertising = false;
    private String currentCourseCode = null;
    private String originalBluetoothName = null;

    private void showToast(final String message, final int duration) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                Context ctx = getContext();
                if (ctx != null) {
                    Toast.makeText(ctx, message, duration).show();
                }
            } catch (Exception ignored) {}
        });
    }

    @PluginMethod
    public void startBroadcast(PluginCall call) {
        Context ctx = getContext();

        // Check runtime permissions on Android 12+ (API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            boolean hasAdvertise = ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED;
            boolean hasConnect = ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;

            if (!hasAdvertise || !hasConnect) {
                requestPermissionForAlias("bluetoothAdvertise", call, "startBroadcastPermissionCallback");
                return;
            }
        } else {
            boolean hasLocation = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            if (!hasLocation) {
                requestPermissionForAlias("location", call, "startBroadcastPermissionCallback");
                return;
            }
        }

        executeStartBroadcast(call);
    }

    @PermissionCallback
    public void startBroadcastPermissionCallback(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            boolean hasAdvertise = ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED;
            boolean hasConnect = ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
            if (hasAdvertise && hasConnect) {
                executeStartBroadcast(call);
            } else {
                showToast("Nearby Devices permission required for BLE Broadcast", Toast.LENGTH_LONG);
                call.reject("Nearby devices (Bluetooth Advertise/Connect) permission denied. Please allow Nearby Devices permission in App Info settings.");
            }
        } else {
            boolean hasLocation = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            if (hasLocation) {
                executeStartBroadcast(call);
            } else {
                showToast("Location permission required for BLE Broadcast", Toast.LENGTH_LONG);
                call.reject("Location permission denied. Please allow Location permission for Bluetooth advertising.");
            }
        }
    }

    private void executeStartBroadcast(PluginCall call) {
        String courseCode = call.getString("courseCode", "CS301");
        this.currentCourseCode = courseCode;

        Context context = getContext();
        BluetoothManager bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager == null) {
            call.reject("Bluetooth Service unavailable on device");
            return;
        }

        BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            showToast("Please enable Bluetooth first", Toast.LENGTH_SHORT);
            call.reject("Bluetooth is turned off. Please enable Bluetooth on your device.");
            return;
        }

        advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (advertiser == null) {
            showToast("Hardware does not support BLE Advertising", Toast.LENGTH_LONG);
            call.reject("Hardware does not support BLE Peripheral / Advertising mode (BluetoothLeAdvertiser is null)");
            return;
        }

        // Set local device name to PG_<courseCode> so all nearby scanners see the beacon name directly!
        try {
            if (originalBluetoothName == null) {
                originalBluetoothName = bluetoothAdapter.getName();
            }
            bluetoothAdapter.setName("PG_" + courseCode);
            Log.i(TAG, "Temporary Bluetooth device name set to: PG_" + courseCode);
        } catch (SecurityException se) {
            Log.w(TAG, "Could not set Bluetooth adapter name: " + se.getMessage());
        }

        // Stop any previous active broadcast cleanly
        if (isAdvertising && advertiseCallback != null) {
            try {
                advertiser.stopAdvertising(advertiseCallback);
            } catch (Exception ignored) {}
            isAdvertising = false;
        }

        // Low latency (100ms interval) + High Tx Power for maximum presence accuracy
        // Non-connectable beacon mode: zero connection contention, guaranteed continuous broadcasting
        AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(0)
                .build();

        // Primary packet:
        // Tx Power (3 bytes) + Manufacturer Data 0x1337 "PG_<courseCode>" (12 bytes) + Flags (3 bytes) = 18 bytes.
        // STRICTLY <= 31 bytes on all Android devices, preventing ADVERTISE_FAILED_DATA_TOO_LARGE.
        AdvertiseData primaryData = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(true)
                .addManufacturerData(PRESENCEGUARD_MANUFACTURER_ID, ("PG_" + courseCode).getBytes(StandardCharsets.UTF_8))
                .build();

        // Scan response packet:
        // Includes Device Name "PG_<courseCode>" (10 bytes <= 31 bytes).
        // Scanners requesting active scans will instantly receive the device name.
        AdvertiseData scanResponse = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .setIncludeTxPowerLevel(false)
                .build();

        advertiseCallback = new AdvertiseCallback() {
            @Override
            public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                super.onStartSuccess(settingsInEffect);
                isAdvertising = true;
                Log.i(TAG, "Native BLE Beacon advertising active for course: " + courseCode);
                showToast("PresenceGuard Beacon ACTIVE: PG_" + courseCode, Toast.LENGTH_SHORT);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("courseCode", courseCode);
                ret.put("beaconName", "PG_" + courseCode);
                call.resolve(ret);
            }

            @Override
            public void onStartFailure(int errorCode) {
                super.onStartFailure(errorCode);
                isAdvertising = false;
                String errorReason;
                switch (errorCode) {
                    case ADVERTISE_FAILED_DATA_TOO_LARGE:
                        errorReason = "Data too large (payload exceeded 31 bytes)";
                        break;
                    case ADVERTISE_FAILED_TOO_MANY_ADVERTISERS:
                        errorReason = "Too many advertisers running on device";
                        break;
                    case ADVERTISE_FAILED_ALREADY_STARTED:
                        errorReason = "Advertising already started";
                        break;
                    case ADVERTISE_FAILED_INTERNAL_ERROR:
                        errorReason = "Internal Bluetooth stack error";
                        break;
                    case ADVERTISE_FAILED_FEATURE_UNSUPPORTED:
                        errorReason = "BLE advertising unsupported by hardware";
                        break;
                    default:
                        errorReason = "Error code: " + errorCode;
                        break;
                }
                Log.e(TAG, "Native BLE advertising failed: " + errorReason);
                showToast("BLE Broadcast Failed: " + errorReason, Toast.LENGTH_LONG);
                call.reject("BLE Advertising failed: " + errorReason);
            }
        };

        try {
            advertiser.startAdvertising(settings, primaryData, scanResponse, advertiseCallback);
        } catch (SecurityException se) {
            showToast("Bluetooth permission denied: " + se.getMessage(), Toast.LENGTH_LONG);
            call.reject("Bluetooth permission denied: " + se.getMessage());
        } catch (Exception e) {
            showToast("BLE start error: " + e.getMessage(), Toast.LENGTH_LONG);
            call.reject("Exception starting BLE advertising: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopBroadcast(PluginCall call) {
        if (advertiser != null && advertiseCallback != null && isAdvertising) {
            try {
                advertiser.stopAdvertising(advertiseCallback);
                Log.i(TAG, "Native BLE Beacon advertising stopped");
            } catch (Exception e) {
                Log.w(TAG, "Error stopping BLE advertising: " + e.getMessage());
            }
            advertiseCallback = null;
            isAdvertising = false;
            currentCourseCode = null;
            showToast("PresenceGuard Beacon Stopped", Toast.LENGTH_SHORT);
        }

        // Restore original device name
        if (originalBluetoothName != null) {
            try {
                Context context = getContext();
                BluetoothManager bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
                if (bluetoothManager != null) {
                    BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();
                    if (bluetoothAdapter != null && bluetoothAdapter.isEnabled()) {
                        bluetoothAdapter.setName(originalBluetoothName);
                        Log.i(TAG, "Restored original Bluetooth device name: " + originalBluetoothName);
                    }
                }
            } catch (SecurityException ignored) {}
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void isAdvertising(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isAdvertising", isAdvertising);
        ret.put("courseCode", currentCourseCode);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            boolean hasAdvertise = ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED;
            boolean hasConnect = ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
            ret.put("granted", hasAdvertise && hasConnect);
            ret.put("hasAdvertise", hasAdvertise);
            ret.put("hasConnect", hasConnect);
        } else {
            boolean hasLocation = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            ret.put("granted", hasLocation);
            ret.put("hasLocation", hasLocation);
        }
        call.resolve(ret);
    }
}
