# Android TWA (Trusted Web Activity) — Build Guide

## What this is
Wraps the Fitness OS PWA as a native Android APK using Bubblewrap CLI.
The app renders the web app in Chrome — no code duplication.

## Prerequisites
- Java JDK 8+ installed (`java -version`)
- Android SDK (`ANDROID_HOME` set)
- Node.js 18+

## Steps

### 1. Update twa-manifest.json
Replace `YOUR_VERCEL_URL` with your actual deployed URL (e.g., `fitness-os.vercel.app`).
Change keystore passwords from `CHANGE_ME` to something secure.

### 2. Install Bubblewrap CLI
```bash
npm install -g @bubblewrap/cli
```

### 3. Initialize (first time only)
```bash
cd twa
bubblewrap init --manifest=twa-manifest.json
```
This generates `android/` directory and asks for JDK/SDK paths.

### 4. Build APK
```bash
bubblewrap build
```
Output: `app-release-signed.apk`

### 5. Get SHA-256 fingerprint for assetlinks.json
```bash
keytool -list -v -keystore fitness-os.keystore -alias fitness-os
```
Copy the SHA256 fingerprint and update `public/.well-known/assetlinks.json`.

### 6. Re-deploy to Vercel
Make sure `/.well-known/assetlinks.json` is accessible at your deployed URL.
Test: `https://YOUR_URL/.well-known/assetlinks.json`

### 7. Upload to Play Store
- Google Play Console → Create App → Upload APK
- Minimum Android API level: 21 (Android 5.0)

## Notes
- Updates to the web app automatically appear in the TWA without a new APK
- Only publish a new APK when you need to change app metadata or permissions
- The SHA-256 fingerprint in assetlinks.json MUST match the keystore used to sign the APK
