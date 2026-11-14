# Pokemon Card Lens

Scan and identify Pokémon cards, manage a collection, and track which catalogue
numbers are missing from each set. Collections support manual entry, editing,
JSON backups, account-scoped offline storage, cloud sync and conflict resolution.

The source runs independently of Lovable. The installed Windows option uses
Docker for the app, PostgreSQL, Auth and its function handlers on this PC, following the
WineSnap local-hosting arrangement. AI calls use an explicitly configured provider.

## Development roadmap

The approved [six-month roadmap](docs/roadmap.md), **PCI-ROADMAP-2026-11**, is
the persistent project reference. Read its current task status before continuing
development and update it after verified changes. Repository instructions are in
[AGENTS.md](AGENTS.md).

The next product is a standalone Android app with a separate local collection
on each phone, an offline catalogue and an optional online AI gateway. Google
Play comes later. The current Windows app remains available; the roadmap does
not mean an Android release or cloud gateway has already been delivered.

## Scan and review

Choose a photo, run the analysis, then select **Kontrollera och spara**. Check
the proposed name, set and number, and enter quantity, language, condition and
storage location before saving. The photo and analysis stay with the card.
A failed save keeps the review form open so you can retry without a new AI call.
Once saved, open the collection or choose the next card. Switching accounts
clears the scanner workspace and cancels its pending analysis.

## Missing-card list

Open a set's checklist and choose **Lista att ta med** to view every missing
catalogue card, independently of the current search or ownership filter. Copy
the list to a note or download a UTF-8 text file for your next card swap. Each
catalogue printing has its own row, including cards that share a printed number.
The list reflects the current collection and contains no photos or personal
notes. Creating it does not change the collection or call AI.

## Japanese special sets

Enable **Visa japanska specialset** in the set library to include the verified
Japanese special-set catalogue. Japanese editions have distinct set/card IDs,
their own checklists and Japanese card names. New catalogue additions use the
Japanese language; existing saved cards are not remapped.

The bundled TCGdex snapshot currently includes five complete special-set lists
(1,033 cards). Some sources have no card images; the app labels these honestly.
See [Japanese catalogue provenance and refresh](docs/japanese-catalogue.md).
Browsing, checklists and missing-card exports do not require AI calls.

## Local Windows app

Open **http://127.0.0.1:5220/** after installation. The local confirmation-email
inbox is **http://127.0.0.1:5225/**. Run `scripts/run-local-windows.ps1` in
PowerShell 7 to install/build, or use `-Action Status`, `Stop`, `Resume`, `Restart`
and `Verify`. See [local hosting](docs/local-windows-hosting.md) for startup,
account import, backups and real-backend acceptance tests.
Optional phone camera access uses an explicitly enabled, email-protected HTTPS
link; see [mobile access](docs/mobile-access.md).

## Android foundation preview — ANDROID-01

The first Android preview packages a separate UI and offline **set metadata** in
a Capacitor 8 app, ID `com.robertbajo.cardlens`. It opens without the Windows PC
or Lovable. Complete offline card lists, Room collection storage, native camera,
backup/restore and AI are later roadmap tasks; they are not working features of
this foundation preview.

```powershell
npm ci
npm run android:apk
```

The Windows build script produces
`artifacts/android/cardlens-0.1.0-preview.1-debug.apk`; it does not install or
publish it. `npm run build:android` checks only the separate `dist-android/` web
assets. See [Android build and installation](docs/android-build.md) for toolchain
requirements, selected-device installation, debug/release signing and data
preservation. `npm run android:apk:release` builds with a permanent local signing
identity kept outside Git; portable external key recovery is not yet verified.
APK/report pairs remain under `artifacts/android/`. Neither build command
installs on a phone or publishes to Google Play. Building an APK does not verify
a physical phone or AI scan.

## Development

Use Node.js 22 and npm 10.9.9. `package-lock.json` is the supported lockfile.

```sh
npm ci
cp .env.example .env.local
# Set the public URL and public key of the intended Supabase project.
npm run dev
```

Never put a service-role key or AI provider key in a `VITE_*` variable. Server
secret names and direct AI model settings are in `supabase/functions/.env.example`.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The tests include local PostgreSQL/RLS, offline storage, cloud conflict and UI
checks. They do not spend AI credits or modify a production database.

## Deployment and migration

- [Deployment and release checks](docs/deployment.md)
- [Move from Lovable to Sites and your own Supabase](docs/migration-from-lovable.md)
- The earlier, unpublished Sites project ID remains in `.openai/hosting.json` for
  a possible future cloud deployment; local hosting does not publish to it.
- Preserve users and their UUIDs before changing the backend, and export any
  browser-local cards before changing the app's hostname.

Source preparation and passing tests do not prove a production migration or
deployment has completed. The old app remains available until the new backend,
sign-in and two-session cloud sync are verified.
