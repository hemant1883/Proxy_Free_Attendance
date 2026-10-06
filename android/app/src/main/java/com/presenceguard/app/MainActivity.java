package com.presenceguard.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBleAdvertiserPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
