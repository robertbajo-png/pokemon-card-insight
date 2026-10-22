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
If the migration fails, the old copy stays available for retry. IndexedDB version
2 atomically moves the old `cards` object store into account-scoped collection
entries. Old local cards stay in the guest collection until the user explicitly
moves them into the signed-in account. Account switches never automatically
claim guest cards or render the previous account's collection.
New uploads are limited to JPEG, PNG or WebP files of at most 10 MB, resized to a
maximum dimension of 1600 pixels and compressed to JPEG with a 2 MB output cap.
Previously saved images are preserved as they are.

## Cloud collection release

Apply `supabase/migrations/20261022130000_cloud_collection.sql` before publishing
this frontend. It adds `collection_cards`, its owner-only SELECT policy and the
authenticated `write_collection_card` RPC. Anonymous Auth users cannot read or
write cloud collections. Direct client INSERT/UPDATE/DELETE permissions are
revoked; the RPC determines ownership from `auth.uid()`, never from a client
user ID, and enforces revisions and idempotent mutation IDs.

For Lovable Cloud, use the project's Database → Manage → SQL editor to apply the
new migration if the backend is not accessible through your Supabase CLI account.
Check whether earlier migrations have already been applied manually before
running them: the AI quota migration was applied during the PR #21 rollout.
GitHub code sync does not confirm that migrations or Edge Functions are deployed.
The Cloud collection feature uses the existing Auth/PostgREST endpoint and does
not require a new Edge Function, secret, API key or Storage bucket.

Signed-in changes commit locally first, then sync on edits, reconnect, focus,
manual retry and once per minute while visible. A revision-only pull avoids
redownloading unchanged photos. Initial pulls paginate and fetch changed records
in batches of ten. Cloud rows include the bounded card photo in JSON; the row
limit is 4 MB. This is suitable for an initial personal collection release;
large collections would benefit from moving photos to private object storage.
An oversized legacy photo fails to upload without deleting the local original.

Deleted cloud records remain versioned tombstones so an offline device cannot
silently restore deleted cards. Conflicting local and remote copies are retained
and shown for an explicit choice. Quantity updates are absolute values, not
server-side increments, so retrying a confirmed mutation does not count a copy
twice. Concurrent edits to the same record require conflict resolution.

Export includes photos and notes in a versioned JSON backup. Import validates the
whole file before writing, accepts up to 10,000 records and a 100 MB input file,
preserves active existing records, and can explicitly restore deleted records.
Repeated import is idempotent by record ID. Guest and account data remain separate.

Release verification:

1. Sign in as A, add a card, wait for “Samlingen är synkad”, then open a separate
   browser profile signed in as A. Verify card fields and photo, then edit quantity
   and confirm it arrives after “Synka nu” on the other device.
2. Disconnect the network, edit and delete cards, reload, reconnect and retry.
   Verify pending changes survive and no deleted card reappears.
3. Edit the same card offline on both devices. Sync both and verify both versions
   are displayed, then exercise each conflict-resolution choice.
4. Switch to account B and sign out. A's cards must not be displayed or uploaded
   to B. Guest cards must move only after the explicit import action.
5. Try cross-account reads and direct writes with user tokens; reads must be
   empty for other owners and direct writes must be denied. Never use service
   credentials in the browser for this check.
6. Verify manual entry, editing, deletion confirmation, backup round-trip, and
   that multiple copies/variants count as one catalogue number in a checklist.

If the new migration is missing, the frontend reports that cloud saving is not
enabled and retains queued changes locally. Publish only after the migration
has passed release checks. Keep the existing table and tombstones on rollback;
do not drop customer data. Any rollback frontend must understand IndexedDB v2.

Set completion uses the real card catalogue, including all returned pages. It
counts one place per normalized collector number; finish and language variants
share that place. It is not a variant-complete “master set” counter. If catalogue
fetching fails, show a retry state instead of AI-generated checklist entries.

## Marketplace

The auction form is explicitly a temporary preview. Publishing is disabled and
the page states that no listing is saved or published. A real marketplace still
needs a database, access rules, listing and bid workflows before it can launch.
