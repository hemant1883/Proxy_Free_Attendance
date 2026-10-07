package com.presenceguard.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
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
    // 16-bit SIG compatible UUID (Eddystone / Institutional Beacon space)
    public static final String PRESENCEGUARD_UUID_STR = "0000feaa-0000-1000-8000-00805f9b34fb";

    private BluetoothLeAdvertiser advertiser;
    private AdvertiseCallback advertiseCallback;
    private boolean isAdvertising = false;
    private String currentCourseCode = null;

    @PluginMethod
    public void startBroadcast(PluginCall call) {
        // Request runtime permissions on Android 12+ (API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getPermissionState("bluetoothAdvertise") != PermissionState.GRANTED) {
                requestPermissionForAlias("bluetoothAdvertise", call, "startBroadcastPermissionCallback");
                return;
            }
        } else {
            if (getPermissionState("location") != PermissionState.GRANTED) {
                requestPermissionForAlias("location", call, "startBroadcastPermissionCallback");
                return;
            }
        }
        executeStartBroadcast(call);
    }

    @PermissionCallback
    private void startBroadcastPermissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getPermissionState("bluetoothAdvertise") == PermissionState.GRANTED) {
                executeStartBroadcast(call);
            } else {
                call.reject("Nearby devices (Bluetooth Advertise) permission is required to broadcast classroom beacon.");
            }
        } else {
            executeStartBroadcast(call);
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
            call.reject("Bluetooth is turned off. Please enable Bluetooth on your device.");
            return;
        }

        advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (advertiser == null) {
            call.reject("Hardware does not support BLE Peripheral / Advertising mode (BluetoothLeAdvertiser is null)");
            return;
        }

        // Stop any previous active broadcast cleanly
        if (isAdvertising && advertiseCallback != null) {
            try {
                advertiser.stopAdvertising(advertiseCallback);
            } catch (Exception ignored) {}
            isAdvertising = false;
        }

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(0)
                .build();

        ParcelUuid serviceUuid = ParcelUuid.fromString(PRESENCEGUARD_UUID_STR);

        // Compact primary advertisement data:
        // 16-bit UUID (4 bytes) + 16-bit Service Data (9 bytes) = 13 bytes total payload.
        // Guaranteed to stay far below the 31-byte legacy BLE limit!
        AdvertiseData primaryData = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addServiceUuid(serviceUuid)
                .addServiceData(serviceUuid, courseCode.getBytes(StandardCharsets.UTF_8))
                .build();

        // Scan response carries manufacturer identifier: PG_<courseCode>
        AdvertiseData scanResponse = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addManufacturerData(0x1337, ("PG_" + courseCode).getBytes(StandardCharsets.UTF_8))
                .build();

        advertiseCallback = new AdvertiseCallback() {
            @Override
            public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                super.onStartSuccess(settingsInEffect);
                isAdvertising = true;
                Log.i(TAG, "Native BLE Beacon advertising active for course: " + courseCode);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("courseCode", courseCode);
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
                call.reject("BLE Advertising failed: " + errorReason);
            }
        };

        try {
            advertiser.startAdvertising(settings, primaryData, scanResponse, advertiseCallback);
        } catch (SecurityException se) {
            call.reject("Bluetooth permission denied: " + se.getMessage());
        } catch (Exception e) {
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
}
