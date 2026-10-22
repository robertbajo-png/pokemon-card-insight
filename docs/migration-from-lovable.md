# Independent hosting: Sites and owner-managed Supabase

The frontend keeps the existing React/Vite UI. Sites serves the built `dist/`
directory. The Supabase project belongs to the repository owner and provides
Auth, PostgreSQL/PostgREST and the four Edge Functions. No Lovable editor,
preview broker, AI gateway, secret or build credit is required by this source.
Source preparation is not proof that the live backend has been migrated.

The Sites identity is recorded in `.openai/hosting.json`; reuse that Site instead
of creating another one. The generated hostname is not proof of publication.
Keep the new Site private until its backend and account migration are verified.

## Preserve the existing backend first

1. In the original project, open More → Database → Manage → Settings → Export
   project data. Export the database and download the completed `.backup` from
   its private storage bucket. It contains account password hashes as well as
   database structure and data. Keep it outside both Git repositories and the
   public `dist/` directory; the ignore rules are additional protection.
2. Inventory and download any pre-existing Storage objects separately. The
   database archive does not contain their file bytes. Edge Function code is
   already in `supabase/functions/`. Reconfigure Auth providers, redirect URLs,
   mail delivery and secrets at the destination; they are not in the export.
3. Create a dedicated Supabase project in the owner's account. Review the
   archive with `pg_restore --list` and restore the application schema/data and
   Auth data using Supabase's documented migration process. Preserve account
   UUIDs because collections are owned by those IDs. Never overwrite an
   unrelated project or restore with a blanket `--clean` command.
4. Compare table definitions, RLS policies, RPC privileges, user counts, collection
   counts and stored files at source and destination. Test sign-in using an
   existing account. Imported password hashes preserve passwords; sessions must
   be established again against the new project.

The existing backend received both `20261022090000_ai_usage_quotas.sql` and
`20261022130000_cloud_collection.sql` manually. A database export already
contains their objects. Do not run them a second time against a restored schema.
For a genuinely empty destination without restored application objects, apply
both migrations in timestamp order. Reconcile migration history before any
later automated `db push`.

## Configure and deploy the new backend

Set the server-only variables from `supabase/functions/.env.example` in the new
project's Edge Function secrets. The default direct provider is Google's
OpenAI-compatible Gemini API. `AI_BASE_URL` and the three `AI_MODEL_*` values
can point at another compatible provider. The provider key is separate from
ChatGPT subscription access and is never a frontend environment variable.

The provider is checked before quota is reserved. Missing configuration returns
503. Calls require HTTPS, refuse provider redirects and use the provider's key
instead of forwarding the visitor's Supabase bearer token. Auth verification
and database-enforced quota limits remain in place.

Deploy explicitly to the intended project with an authenticated Supabase CLI or
the connected Supabase management integration:

```sh
supabase functions deploy analyze-pokemon-card --project-ref YOUR_PROJECT_REF
supabase functions deploy generate-set-cards --project-ref YOUR_PROJECT_REF
supabase functions deploy translate --project-ref YOUR_PROJECT_REF
supabase functions deploy pokemon-proxy --project-ref YOUR_PROJECT_REF
```

Keep the JWT settings from `supabase/config.toml`. Its `project_id` is a local
project name, not a production destination. The production project reference is
selected explicitly during linking/deployment.

## Publish the frontend after the backend is verified

1. Configure the two public `VITE_SUPABASE_*` values for the new backend. Build
   with those values; Vite embeds them in `dist/`. Runtime-only changes cannot
   change a previously compiled static bundle. No checked-in `.env` selects
   the old backend by accident.
2. Set Supabase Auth's Site URL and allowed redirect URLs to the actual Sites
   origin. Test email confirmation and password recovery on that origin.
3. Run the repository's lint, typecheck, test and production/PWA build commands.
   Publish that exact source state using the Sites source/version workflow.
4. Test deep links, catalogue browsing, camera/upload, sign-in and refresh, an
   authenticated AI request, a rejected unauthenticated request, and the
   two-session collection checks in `deployment.md`.
5. Data in browser storage is scoped to the old origin. Export local-only cards
   from the old app and import them at the new origin. Cloud records follow the
   preserved account IDs. Moving the hostname alone cannot move localStorage
   or IndexedDB data between origins.

Switch links/domains only after these checks. Keep the old backend available
until user data is verified. Do not remove its database, revoke its keys or
disconnect the repository as a substitute for completing the migration.

References:
- [Lovable database export](https://docs.lovable.dev/features/database-backups)
- [Supabase Auth migration](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects)
- [Gemini OpenAI-compatible API](https://ai.google.dev/gemini-api/docs/openai)
