import { registerPlugin } from "@capacitor/core";

export interface LegacyGoogleAuthPlugin {
  signIn(options: { webClientId: string }): Promise<{
    idToken: string;
    email?: string;
    name?: string;
  }>;
}

export const LegacyGoogleAuth = registerPlugin<LegacyGoogleAuthPlugin>("LegacyGoogleAuth");
