# Pokemon Card Lens

Scan and identify Pokémon cards, manage a collection, and track which catalogue
numbers are missing from each set. Collections support manual entry, editing,
JSON backups, account-scoped offline storage, cloud sync and conflict resolution.

The source runs independently of Lovable. The installed Windows option uses
Docker for the app, PostgreSQL, Auth and its function handlers on this PC, following the
WineSnap local-hosting arrangement. AI calls use an explicitly configured provider.

## Local Windows app

Open **http://127.0.0.1:5220/** after installation. The local confirmation-email
inbox is **http://127.0.0.1:5225/**. Run `scripts/run-local-windows.ps1` in
PowerShell 7 to install/build, or use `-Action Status`, `Stop`, `Resume`, `Restart`
and `Verify`. See [local hosting](docs/local-windows-hosting.md) for startup,
account import, backups and real-backend acceptance tests.

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
