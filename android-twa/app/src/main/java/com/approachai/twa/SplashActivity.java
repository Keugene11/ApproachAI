package com.approachai.twa;

import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;

/**
 * Shows branded splash while warming up Chrome in the background.
 * Once Chrome is ready (or after a short timeout), launches the TWA.
 * This prevents the Chrome logo flash on cold start.
 */
public class SplashActivity extends AppCompatActivity {

    private boolean launched = false;
    private CustomTabsServiceConnection connection;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Warm up Chrome in the background
        connection = new CustomTabsServiceConnection() {
            @Override
            public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
                client.warmup(0);
                launchTwa();
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {}
        };

        String chromePackage = CustomTabsClient.getPackageName(this, null);
        if (chromePackage != null) {
            CustomTabsClient.bindCustomTabsService(this, chromePackage, connection);
        }

        // Safety timeout — launch TWA after 800ms even if warmup hasn't completed
        getWindow().getDecorView().postDelayed(this::launchTwa, 800);
    }

    private synchronized void launchTwa() {
        if (launched) return;
        launched = true;

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
        overridePendingTransition(0, 0); // no animation — seamless transition
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (connection != null) {
            try { unbindService(connection); } catch (Exception ignored) {}
        }
    }
}
