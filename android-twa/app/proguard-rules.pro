# AndroidBrowserHelper - keep TWA classes
-keep class com.google.androidbrowserhelper.** { *; }
-keep class android.support.customtabs.** { *; }
-keep class androidx.browser.** { *; }

# Keep the LauncherActivity
-keep class * extends com.google.androidbrowserhelper.trusted.LauncherActivity { *; }
