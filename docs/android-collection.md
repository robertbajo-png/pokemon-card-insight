# Local Android collection — ANDROID-02

The Android app has one private collection per installation. Robert's and
Leonard's phones do not share a database, account or background sync. The Windows
app and its existing IndexedDB/PostgreSQL data remain separate and unchanged.

## Storage boundary

`src/platform/collection.ts` defines the collection contract independently of
React, Supabase and the browser's storage. The Android adapter calls the local
`CardLensCollection` Capacitor plugin. The plugin serializes database work on a
worker thread and stores records in Room/SQLite in the app's private directory.
No collection data are sent over the network. The native build still rejects
web account/backend imports and outbound service connections.

The ordinary browser preview does not have Room. It shows an unavailable-storage
message rather than silently saving into browser storage or a temporary fake
collection. UI tests inject their own disposable test repository; that is not a
production storage fallback.

## Records and edits

Each owned entry has a stable ID, name, optional set/catalogue identity, printed
number, language, variant, condition, quantity, storage location and notes.
Creation/update timestamps are UTC epoch milliseconds; an integer revision is
used to detect stale edits. Separate entries are never automatically merged just
because their names or printed numbers match. New entries use UUIDs; legacy
`card-<UUID>` identities can be preserved by the later reviewed importer.

The basic form accepts manual details. Set and printed number are not a verified
catalogue match. Full offline card lists and catalogue-linked registration belong
to ANDROID-03. The form does not infer an edition or create a catalogue identity.
There are no photographs, camera calls or AI calls in this task.

Create retries reuse the same ID: identical input returns the original entry;
different input with that ID is rejected. Updates/deletes require the revision
that was read. A stale revision is rejected without overwriting a newer record.
Validation also runs natively, before writes. Failed saves retain the form and
do not report success or clear the user's input. Removal requires confirmation.
Switching between the set library and collection preserves an open draft during
that app session. Durable recovery of unfinished drafts belongs to ANDROID-04.

## Schema and data preservation

Room's initial schema is version 1 and its generated schema is versioned in Git.
Future schema changes require explicit non-destructive migrations and migration
tests. There is no destructive migration or downgrade fallback. A database that
cannot be opened remains in place and is reported as unavailable; it must not
be presented as a new empty collection.

Opaque set/catalogue IDs, Japanese text and notes are preserved. Human-readable
single-line fields are trimmed and bounded; quantity is an integer from 1 to
9,999. There is no automatic desktop import, database reset or data clearing.

Android backup is disabled in this preview. Full export/restore is ANDROID-05.
Uninstalling or clearing app storage removes this local collection. An APK is
not a collection backup. Use disposable sample records for preview testing until
backup/recovery and real-phone acceptance have been verified.

The existing release signing identity and app ID are preserved. Preview 2 has
versionCode 2 and versionName `0.1.0-preview.2`, so a compatible signed update
can retain app storage. Never uninstall or clear data to bypass a signature or
migration failure. Portable external signing-key recovery is still unverified;
see [the Android build guide](android-build.md).

## Verification

Run `npm run android:verify` on Windows for a Debug APK, Room JVM tests and
Android lint. `npm run android:apk:release` produces the signed delivery APK.
The CI Android job also runs the Room tests and uploads their HTML report.

The storage tests use disposable Room databases with Robolectric, including disk
close/reopen, separate database isolation, validation, revision conflicts,
idempotent create and refusing unsupported schema versions without deleting
existing data. These are not physical-phone or camera tests. React tests cover
editing and save/retry/error paths through the platform boundary.

`CollectionBridgeTest` additionally exercises the real packaged WebView,
Capacitor JSON bridge and Room on a disposable emulator. It refuses physical
devices and requires the explicit instrumentation argument
`cardlensDisposableEmulator=true`. Assemble `:app:assembleDebugAndroidTest`, then
install the Debug APK and its `app-debug-androidTest.apk` only onto the selected
disposable emulator with `adb -s SERIAL install -r ...`. Invoke its runner with
that same explicit serial:

```powershell
& $adb -s SERIAL shell am instrument -w -e class com.robertbajo.cardlens.CollectionBridgeTest -e cardlensDisposableEmulator true com.robertbajo.cardlens.test/androidx.test.runner.AndroidJUnitRunner
```

The test creates/removes only its own synthetic UUID, checks restart and stale
edits, and verifies the rendered collection. Its screenshot is captured only
after checking that the collection contains exactly the test's own record.
Never run preview instrumentation against an existing personal collection or
silently select another device. An emulator result remains separate from
Robert's and Leonard's physical-phone acceptance.

Record the actual results, code version and remaining physical-device checks in
[PCI-ROADMAP-2026-11](roadmap.md). See the official [Room setup and releases](https://developer.android.com/jetpack/androidx/releases/room),
[Room migrations](https://developer.android.com/training/data-storage/room/migrating-db-versions)
and [Robolectric setup](https://robolectric.org/getting-started/) for the native
storage/toolchain background.
