# Local Windows hosting

This installation runs the production-built app at **http://127.0.0.1:5220/**.
It follows WineSnap's detached Docker and user-logon startup arrangement, with
an additional local PostgreSQL/Auth backend so no hosted Supabase project slot
or Lovable service is needed. It is not a Vite development server.

## Services and data

The isolated `pokemon-local` Compose project contains six services: the static
web/proxy, PostgreSQL, Supabase Auth, PostgREST, Node function server and Mailpit. Only
the app at port 5220 and the local email inbox at port 5225 are published, both
bound to `127.0.0.1`. Database and administration ports are not published. No
Internet tunnel, router forwarding or firewall change is installed.

Accounts and saved collections live in the named PostgreSQL volume. Guest cards
remain in the browser's IndexedDB until explicitly imported into an account.
The app calls its own `/backend/` routes. Only catalogue lookups and configured
AI inference need external providers. Old Lovable URLs are not used by this
Docker build, including when a checkout-root `.env` exists.

The startup launcher keeps encrypted backend credentials in the current Windows
user's `%LOCALAPPDATA%\PokemonCardHosting\backend.clixml`, protected with DPAPI
and owner/SYSTEM directory permissions. It generates a separate JWT secret and
database password for this installation; it never reads WineSnap credentials.
The local services receive their necessary backend secrets in their container
environment. The Windows/Docker owner controls those containers.

The four existing Edge handlers are bundled for Node using the same export and
environment contracts; they retain their auth, validation and quota checks. The
local adapter allows only these four routes and caps bodies at 3 MB. A minimal
PostgreSQL setup supplies the auth helpers and roles used by the existing RLS;
it is not the full Supabase platform with Studio, Storage and Realtime.

The frontend receives only the public anon key. The allowlisted Docker build
context excludes credentials, Git metadata, dependencies, exports and backups.
The app runs read-only with a non-root Nginx user. Services have bounded memory,
CPU, process counts and log rotation. Supabase component versions come from the
referenced official configuration; Node/Postgres use maintained major-version
images. No Docker socket is mounted into an application container.

## Start, stop and verify

Run these commands from the source checkout using PowerShell 7:

```powershell
./scripts/run-local-windows.ps1 -Action Start
./scripts/run-local-windows.ps1 -Action Status
./scripts/run-local-windows.ps1 -Action Verify
./scripts/run-local-windows.ps1 -Action Restart
./scripts/run-local-windows.ps1 -Action Stop
./scripts/run-local-windows.ps1 -Action Resume
```

Start builds the images and applies previously unapplied application migrations
to this installation only. Resume starts existing containers without rebuilding.
Stop retains the database volume. Commands verify the Docker Desktop Linux
engine and this project's labels before operating; no global prune/reset is used.

```powershell
./scripts/install-local-windows-startup.ps1
./scripts/install-local-windows-startup.ps1 -Remove
```

The per-user shortcut starts Docker Desktop if necessary after Windows sign-in,
then resumes the installed containers. Its control scripts are copied under
`%LOCALAPPDATA%\PokemonCardHosting\runtime`, so startup does not require an open
Codex chat. Reinstall the startup helper after changing launcher scripts.
Before-sign-in hosting and operation while the computer sleeps are not provided.

## Existing accounts and card data

`import-local-backup.ps1` accepts a PostgreSQL custom archive from the original
project and imports into an empty local account/collection destination. It
preserves users, password hashes, identities and supported stable MFA records,
plus the application rows. It does not import old sessions or refresh tokens,
replace Auth's migration history, overwrite existing local accounts, or replay
the source database's platform schemas. Imported users sign in again.

```powershell
./scripts/import-local-backup.ps1 -ArchivePath C:/private/path/project.backup
```

The importer records the archive hash and refuses to replay the same import.
Reports contain counts rather than emails, hashes or record contents. An older
archive is a snapshot, not evidence that later source changes have been copied.
The original project and its data remain available for a later reconciled cutover.

Browser data belongs to its origin. Cards saved locally at port 8080 or in the
old published app do not automatically appear at port 5220: use the collection's
Export and Import buttons to transfer a JSON backup, then choose whether to move
those guest cards into the signed-in account. The old copy stays available.

## Email, AI and backups

Email confirmation remains enabled. This local server delivers confirmation
messages to **http://127.0.0.1:5225/**, not to an external mailbox. Existing
confirmed accounts can sign in with their existing passwords. No real user's
password is changed by the installer or its acceptance test.

AI handlers are installed with authentication and atomic quotas. Provider
credentials are a separate, explicit configuration step. This initial hosting
configuration contains no provider key and returns 503 rather than contacting
Lovable, borrowing another app's key or pretending an analysis succeeded.
Local hosting by itself does not verify billable AI inference.

```powershell
./scripts/backup-local-windows.ps1
./scripts/check-local-windows.ps1 -RestartRoundTrip
```

Backups are written to the protected `PokemonCardHosting/backups` directory.
They contain account password hashes and private cards; keep them outside Git
and the web root. A local backup alone does not protect against losing the PC.
The acceptance test creates disposable users only in this local backend, checks
signup and local email confirmation, real Auth, owner isolation, revisions, photos, idempotency, deletion and restart
persistence, then removes its fixtures. It makes no billable AI call.

The installation on 25 October 2026 restored the 22 October source snapshot:
two existing accounts and zero server-side collection rows. Real signup/email
confirmation and separate Auth sessions passed the local acceptance test,
including a full service restart. The installed logon shortcut was launched
after stopping all six services and restored them successfully. A generated
database backup was readable by PostgreSQL's archive tool. No full Windows
reboot or existing user's password entry was performed during verification.

Supabase service versions/configuration were checked against the official
self-hosting template at `supabase/supabase` revision
`7e866ef83e89e35cdda45a6c98abd069d5fa1b2f` (MIT). This app retains its four existing
handlers behind a directory allowlist rather than exposing a general function
router. Reference: https://supabase.com/docs/guides/self-hosting/docker
