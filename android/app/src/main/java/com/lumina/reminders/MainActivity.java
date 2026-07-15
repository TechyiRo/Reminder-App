package com.lumina.reminders;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge layout natively so that the gradient background extends behind the status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        // Secure screen content by disabling screenshots and screen recordings (FLAG_SECURE)
        getWindow().setFlags(
            android.view.WindowManager.LayoutParams.FLAG_SECURE,
            android.view.WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
