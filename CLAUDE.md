# Wingmate

## App Store Submission Checklist (Guideline 2.1b Fix)

Apple rejected because subscriptions weren't linked to the app version. Steps to fix:

1. **App Store Connect** - go to your app's version page (left sidebar, under "iOS App")
2. Scroll to **"In-App Purchases and Subscriptions"** section
3. Click **"+"** and select both subscriptions (Monthly + Yearly)
4. **Build number already bumped to 3** - need to archive and upload a new binary
5. Open Xcode on a Mac → Product → Archive → Distribute App → App Store Connect
6. Wait ~15 min for processing
7. Back in App Store Connect, select the new build (3) on the version page
8. Hit **"Add for Review"** top right

## Notes
- iOS builds require a Mac with Xcode - cannot be done from Windows
- App uses RevenueCat for iOS IAP, Stripe for web/Android
- Bundle ID: `live.wingmate.app`
