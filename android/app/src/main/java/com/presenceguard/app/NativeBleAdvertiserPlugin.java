package com.presenceguard.app;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.os.ParcelUuid;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@CapacitorPlugin(name = "NativeBleAdvertiser")
public class NativeBleAdvertiserPlugin extends Plugin {
    private static final String TAG = "NativeBleAdvertiser";
    public static final String PRESENCEGUARD_UUID_STR = "0000feaa-0000-1000-8000-00805f9b34fb";

    private BluetoothLeAdvertiser advertiser;
    private AdvertiseCallback advertiseCallback;
    private boolean isAdvertising = false;
    private String currentCourseCode = null;

    @PluginMethod
    public void startBroadcast(PluginCall call) {
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
            call.reject("Bluetooth is turned off. Please enable Bluetooth.");
            return;
        }

        if (!bluetoothAdapter.isMultipleAdvertisementSupported()) {
            call.reject("Hardware does not support BLE Peripheral Mode (Multiple Advertisement)");
            return;
        }

        advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (advertiser == null) {
            call.reject("Failed to obtain BluetoothLeAdvertiser from system");
            return;
        }

        // Stop any previous active broadcast
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

        ParcelUuid serviceUuid = new ParcelUuid(UUID.fromString(PRESENCEGUARD_UUID_STR));

        // Primary advertisement data (Compact to guarantee <31 bytes limit)
        AdvertiseData.Builder dataBuilder = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(true)
                .addServiceUuid(serviceUuid)
                .addServiceData(serviceUuid, courseCode.getBytes(StandardCharsets.UTF_8));

        // Scan response carries device name
        AdvertiseData scanResponse = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
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
                Log.e(TAG, "Native BLE advertising failed with code: " + errorCode);
                call.reject("BLE Advertising failed with error code: " + errorCode);
            }
        };

        try {
            advertiser.startAdvertising(settings, dataBuilder.build(), scanResponse, advertiseCallback);
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
