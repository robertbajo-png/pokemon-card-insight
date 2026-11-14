# Android preview build — ANDROID-01

This guide covers the first packaged Android foundation preview. Its React UI
and set metadata are bundled in a Capacitor 8 Android app with the fixed app ID
**`com.robertbajo.cardlens`**. The phone does not load the Windows app or a Lovable
website. Build, installation and physical-phone acceptance are separate results;
see the current evidence in [PCI-ROADMAP-2026-11](roadmap.md).

## What this preview contains

- A separate packaged Android UI, built from `android.html` into `dist-android/`.
- Offline metadata for 176 international sets and five Japanese special sets.
- An Android project and reproducible build entry points.

The metadata counts describe the catalogue, not card lists already available in
this preview. Complete offline card lists, checklist ownership and manual card
registration belong to **ANDROID-03**. Local Room collection storage belongs to
**ANDROID-02**; native camera/image selection and permanent photos belong to
**ANDROID-04**. Full backup/restore follows in **ANDROID-05**. AI and its online
gateway belong to the later **SCAN** tasks. These functions must not be presented
as working in ANDROID-01. Do not put a real collection into this foundation preview.

The existing Windows app, its accounts and saved cards remain separate. This
preview does not import, migrate, reset or sync their data. No Supabase login,
Windows server, Tailscale connection, domain or provider key is needed to open
the packaged Android preview.

## Build prerequisites

Use the source checkout with Node.js **22 or newer**, npm **10.9.9**, PowerShell **7.2 or newer**,
JDK **21**, Android SDK platform **36**, build-tools **36.0.0**, and SDK Platform
Tools for optional device installation. Android Studio **2025.2.1 or newer** is
the Capacitor 8 baseline. Keep the repository's pinned dependencies, lockfile and
Gradle wrapper. See [Capacitor's Android 8 requirements](https://capacitorjs.com/docs/updating/8-0).

The APK builder resolves its toolchain in this order:

- JDK: explicit `-JavaHome`; otherwise Android Studio's standard
  `%ProgramFiles%/Android/Android Studio/jbr`; otherwise `JAVA_HOME`. A complete
  JDK 21 is required. Use `-JavaHome` to override an installed standard Studio JBR.
- SDK: explicit `-AndroidSdk`; otherwise `ANDROID_HOME`, then `ANDROID_SDK_ROOT`,
  then `%LOCALAPPDATA%/Android/Sdk`. The path is the SDK root, not `platform-tools`.

For nonstandard installations, pass the actual paths, for example:

```powershell
npm run android:apk -- -JavaHome 'C:/Tools/jdk-21' -AndroidSdk 'D:/Android/Sdk'
```

The script sets toolchain/cache paths only for its build process and restores
the previous environment afterwards. Its private caches and build lock live
under `%LOCALAPPDATA%/CardLensAndroid`. It refuses OneDrive-resolved build or
signing paths and dependency paths outside the checkout. Use this checkout's own
installed dependencies. Do not commit machine-specific SDK paths. Dependency,
SDK or Gradle downloads may need internet on the build computer; this differs
from running the installed preview offline. The project's minimum device SDK is
24, with compile/target SDK 36 (`android/variables.gradle`).

## Build the debug APK

From the repository root in PowerShell 7.2 or newer:

```powershell
npm ci
npm run android:apk
```

`android:apk` calls `scripts/build-android.ps1 -Configuration Debug`. It builds
the Android web assets, finalizes the packaged entry point, checks the assets,
syncs them into Capacitor and invokes the project's Gradle `assembleDebug` task.
It does not install the APK, publish it or start the Windows services.

To check only the Android web output, without building an APK:

```powershell
npm run build:android
```

This produces `dist-android/` and performs its entry/asset checks. It does not
install the app or prove the Android/Gradle build works. The regular `npm run
build` remains the separate web/PWA build; do not copy its `dist/` into Android.

The debug APK has two locations:

- Gradle output: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Delivery copy: `artifacts/android/cardlens-0.1.0-preview.1-debug.apk`.

The builder writes a matching report,
`artifacts/android/cardlens-0.1.0-preview.1-debug.json`, with source commit,
`sourceDirty`, version, build type, APK SHA256/size and signature-verification
result/public certificate fingerprint. A dirty source flag means the commit
alone does not identify all built changes; use a reviewed clean source state for
a reproducible handoff. These filenames are reused when rebuilding this version,
so retain the delivered APK/report pair when recording a test result.

`artifacts/android/` is ignored by Git. To check the delivered APK's hash:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath artifacts/android/cardlens-0.1.0-preview.1-debug.apk
```

An APK is an output of this build, not a binary that should be committed. See
[Android's command-line build guide](https://developer.android.com/build/building-cmdline)
for the distinction between assembling an APK and installing it.

## Optional installation on a selected test device

No phone installation is performed by the build commands. For a USB test,
unlock the intended phone, enable USB debugging and accept that computer's
debugging prompt. Use the SDK's `adb` and explicitly select the device, especially
when both Robert's and Leonard's phones are connected:

```powershell
$androidSdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
$adb = Join-Path $androidSdk 'platform-tools/adb.exe'
& $adb devices -l
# Replace DEVICE_SERIAL with the intended entry whose state is "device".
& $adb -s DEVICE_SERIAL install -r artifacts/android/cardlens-0.1.0-preview.1-debug.apk
```

Open Card Lens from the phone's app launcher. The `-r` option reinstalls while
retaining existing app data; it is not a backup or a guarantee that future schema
changes are safe. Android documents device authorization and installation in
[the adb guide](https://developer.android.com/tools/adb).
If the build used a custom `-AndroidSdk`, use that same SDK path in `$androidSdk`.

If installation reports incompatible signatures or a version conflict, stop and
check the installed package/version/certificate. Do not fix it by automatically
uninstalling, clearing storage or forcing a downgrade. Installing a new APK does
not restore cards from the desktop app or another phone.

### Removal is not an update or restore

Only remove an intentionally disposable preview after checking that no local
data need preserving. Android Settings → Apps → Card Lens → Uninstall removes
the app; normal uninstallation and Clear storage can remove its local data.
Do not use either as a routine troubleshooting step once collection storage is
introduced. Future collection data need a verified external backup before
destructive removal. Installing again is not collection restoration.

## Debug signing and the future family release

The debug APK is automatically signed with a development certificate. It is
for development/testing, not a Google Play or durable family release. Android
requires compatible signing identity for an in-place update; a release APK
signed with a different key cannot simply replace an installed debug APK.
See [Android app signing](https://developer.android.com/studio/publish/app-signing).

The separate release entry point is:

```powershell
npm run android:apk:release
```

It calls the same builder with `-Configuration Release`. On the first release
build, if neither signing file exists, the script creates a permanent local
PKCS12 keystore and a Windows DPAPI-protected password file in
`%LOCALAPPDATA%/CardLensAndroid/signing/`:

- `cardlens-release.p12` — the release signing identity.
- `cardlens-release.password.clixml` — its protected local password.

The directory and files allow access only to the current Windows owner and
SYSTEM. Subsequent builds reuse the pair. If just one file exists, the build
stops rather than creating a replacement identity; restore the original pair
through a deliberate recovery procedure. Do not delete either file to fix a
build error. The release build requires `apksigner` and verifies that the APK's
public certificate matches the preserved keystore before copying the artifact.

**A portable external signing-key backup has not been created or recovery-tested
as part of this preview.** The DPAPI file alone is not recovery material for a
new Windows installation or another Windows user. Portable recovery needs the
keystore plus its password held in a separately protected, recoverable form.
The builder does not export that password or make an external backup. Record
local signing, successful APK verification and external recovery verification as
separate results in the roadmap. A signing-key backup is also separate from a
future collection backup.

Its expected outputs are
`android/app/build/outputs/apk/release/app-release.apk` and
`artifacts/android/cardlens-0.1.0-preview.1-release.apk`. Keep signing keys,
passwords and external backups outside Git and the packaged assets. Never
substitute the debug key for the permanent release identity. Preserve the app ID
and release-signing identity before phones start holding real collections.
Both build reports leave physical-phone installation and external signing-backup
verification false; a successful build does not perform those checks. No phone
installation or Google Play publication is part of the build commands.

## Preview acceptance and evidence

For the actual candidate APK, record which of these checks were performed:

1. Android web build, asset checks and Gradle debug build complete successfully.
2. Package identity is `com.robertbajo.cardlens`; the app contains local assets
   rather than a remote `server.url` or a development/PWA loader.
3. A fresh installation opens its UI and set metadata in airplane mode, without
   the PC or Windows services. No login or AI activation is requested for this.
4. Missing storage, complete-card, camera and AI features are labelled as future
   steps, with no invented collection or checklist completion.
5. The existing Windows app and its saved data remain untouched.

Record source commit, APK hash, emulator or physical phone model/Android version,
and observed outcomes. A desktop mobile layout or emulator check does not prove
physical-phone acceptance. Camera and AI remain **not verified** in this preview;
do not infer them from a successful build. Update [the roadmap](roadmap.md) only
with results actually observed.
