package com.approachai.twa;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LegacyGoogleAuth.class);
        super.onCreate(savedInstanceState);
        // Disable Android WebView overscroll. CSS overscroll-behavior:none doesn't
        // reach the native rubber-band effect that shifts fixed elements during
        // scroll, so disable it at the view level.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
        // Force dark (gray) system nav buttons regardless of device dark-mode
        // setting. Theme attr windowLightNavigationBar is unreliable across
        // OEMs / DayNight setups — this is the authoritative API.
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightNavigationBars(true);
            insetsController.setAppearanceLightStatusBars(true);
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
