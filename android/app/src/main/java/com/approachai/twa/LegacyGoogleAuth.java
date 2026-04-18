package com.approachai.twa;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

/**
 * Minimal Google sign-in using the legacy GoogleSignIn API. Bypasses
 * Credential Manager entirely, which is unreliable for fresh OAuth clients.
 */
@CapacitorPlugin(name = "LegacyGoogleAuth")
public class LegacyGoogleAuth extends Plugin {

    private static final int RC_SIGN_IN = 9001;
    private GoogleSignInClient client;

    @PluginMethod
    public void signIn(PluginCall call) {
        String webClientId = call.getString("webClientId");
        if (webClientId == null || webClientId.isEmpty()) {
            call.reject("webClientId is required");
            return;
        }

        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .build();

        client = GoogleSignIn.getClient(getActivity(), gso);

        // Force account picker every time so the user gets the chooser.
        client.signOut().addOnCompleteListener(t -> {
            saveCall(call);
            Intent intent = client.getSignInIntent();
            startActivityForResult(call, intent, "handleSignInResult");
        });
    }

    @com.getcapacitor.annotation.ActivityCallback
    private void handleSignInResult(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (call == null) return;
        try {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
            GoogleSignInAccount account = task.getResult(ApiException.class);
            if (account == null) {
                call.reject("No account returned");
                return;
            }
            String idToken = account.getIdToken();
            if (idToken == null || idToken.isEmpty()) {
                call.reject("No idToken in account result");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("idToken", idToken);
            ret.put("email", account.getEmail());
            ret.put("name", account.getDisplayName());
            call.resolve(ret);
        } catch (ApiException e) {
            call.reject("Sign-in failed: code=" + e.getStatusCode() + " " + e.getMessage());
        } catch (Exception e) {
            call.reject("Sign-in failed: " + e.getMessage());
        }
    }
}
