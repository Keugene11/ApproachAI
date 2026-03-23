import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "live.wingmate.app",
  appName: "Wingmate",
  webDir: "out",
  server: {
    url: "https://wingmate.live",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "Wingmate",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: false,
      splashImmersive: false,
      backgroundColor: "#1a1a1a",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "DARK",
    },
  },
};

export default config;
