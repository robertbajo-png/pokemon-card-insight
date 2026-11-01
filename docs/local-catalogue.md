# Local card catalogue

Windows hosting serves card data from a pinned public Pokémon TCG compatibility snapshot. It does not call the legacy card API for catalogue requests. No API key, new account, database table or paid AI request is needed.

The snapshot contains 176 English sets and 20,635 card records from revision `39a26a144c8b6ef6c2fb17b2c29d0bb7121e3a11`, dated 2026-09-17. Source: [Pokémon TCG Data](https://github.com/PokemonTCG/pokemon-tcg-data/tree/39a26a144c8b6ef6c2fb17b2c29d0bb7121e3a11). The upstream project describes these files as historical/compatibility data and [announces API retirement on 2027-03-01](https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/README.md).

## Installation and updates

`scripts/run-local-windows.ps1 -Action Start` runs `scripts/install-local-catalogue.ps1` before building the local images. The installer checks `.local-build/catalogue/index.json` and every card file. A verified existing copy is reused without network access. A missing or invalid copy is downloaded from the pinned source, extracted with path/size restrictions and validated before replacement. Only public catalogue data are installed; credentials and collection backups are excluded from the Docker context.

The functions image includes the snapshot at `/app/catalogue`. The process runs as the existing unprivileged user with a read-only filesystem. The reader verifies checksums and counts, bounds its in-memory cache and file concurrency, and respects cancellation. A corrupt or unavailable local file produces an error; it cannot silently become an empty or different set.

The snapshot is deliberately fixed. To update it, review a new upstream revision, update the pinned installer/reader metadata, rebuild the files, and regenerate `src/data/catalogue-sets.json` from the verified manifest's `revision`, `updatedAt` and `sets`. Review ID mappings and run the catalogue, identity and UI tests before rebuilding. The 26.7 MB raw card files are ignored build inputs rather than Git source.

## Meaning of the data

- `total` is the number of actual unique card IDs in a complete card file. `printedTotal` is preserved separately and may be unknown. They are not interchangeable.
- Cards receive their canonical set metadata when served. Different cards can legitimately share a printed number, including four Classic Collection cards numbered 15. Checklists count catalogue identities and match manual entries only when name and number identify one card.
- Existing saved IDs are interpreted using conservative legacy mappings. Conflicting identity evidence is not counted as ownership, merged into a known printing or silently rewritten by a notes/quantity edit. The user can explicitly correct the set in the editor. No stored collection migration is performed.
- Responses identify the snapshot revision/date. The UI displays this date and states that price data are absent. Existing AI estimates are unchanged.
- Card images remain hosted by the dataset's image providers and may require an internet connection. No guarantee about those external hosts is implied.

The deployed Supabase edge proxy remains available for the older non-local hosting mode. A future maintained provider can be added as an adapter with explicit ID compatibility rather than silently changing saved identities.
