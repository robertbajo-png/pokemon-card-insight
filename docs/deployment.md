# Deploying the review fixes

Use Node 22 and npm 10.9.9 (`packageManager` and `.nvmrc` record the versions).
Install with `npm ci`. The npm lockfile is the supported dependency lock; the
outdated Bun locks have been removed to avoid conflicting installations.

Run before release:

```sh
npm run lint
npm run typecheck
npm test
npm run build
deno check supabase/functions/analyze-pokemon-card/index.ts supabase/functions/generate-set-cards/index.ts supabase/functions/translate/index.ts supabase/functions/pokemon-proxy/index.ts
```

The tests use simulated AI and HTTP responses, fake IndexedDB and a local embedded
PostgreSQL engine. They do not spend AI credits or write to a deployed database.

## Apply the Supabase changes before releasing the frontend

1. Link the Supabase CLI to the intended project and review pending migrations.
2. Apply `supabase/migrations/20261022090000_ai_usage_quotas.sql` using the usual
   migration process (for example, `supabase db push` after reviewing the plan).
3. Ensure `LOVABLE_API_KEY` is set in Edge Function secrets. The platform supplies
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Never put
   the service-role or AI key in frontend environment variables.
4. Deploy all four functions so their implementation and `verify_jwt` settings
   match this change:

   ```sh
   supabase functions deploy analyze-pokemon-card
   supabase functions deploy generate-set-cards
   supabase functions deploy translate
   supabase functions deploy pokemon-proxy
   ```

5. Release the frontend using the existing Lovable/hosting workflow.
6. Confirm an unsigned AI request returns 401, a signed-in user's analysis works,
   quota exhaustion returns 429, and public browsing of card sets still works.

AI functions verify a real Supabase Auth user and reject anonymous Auth users.
The service-role-only SQL function atomically enforces per-user, per-hour limits
of 20 analyses, 5 generation requests, and 120 translation requests, plus a shared
project cap of 1,000 AI requests per UTC day. Attempts reserve quota before the
provider call, including attempts where the provider later fails. A missing or
unavailable quota store returns 503 and never falls back to unrestricted access.
Adjust these limits deliberately in a migration to fit the project's budget.
Fixed hourly/day windows can admit requests on both sides of a boundary; they
are request caps, not monetary spending limits at the AI provider.

Without the migration and function deployment, source changes alone do not
protect the existing deployed endpoints. Deploying only the new frontend against
the old server also retains the previous server-side exposure.

## Saved cards

The first collection read migrates `pokemon_scanned_cards` from localStorage to
IndexedDB. The old copy is removed only after the database transaction completes.
If the migration fails, the old copy stays available for retry. Scans remain
local to the browser profile; this change does not add account synchronization.
New uploads are limited to JPEG, PNG or WebP files of at most 10 MB, resized to a
maximum dimension of 1600 pixels and compressed to JPEG with a 2 MB output cap.
Previously saved images are preserved as they are.

## Marketplace

The auction form is explicitly a temporary preview. Publishing is disabled and
the page states that no listing is saved or published. A real marketplace still
needs a database, access rules, listing and bid workflows before it can launch.
