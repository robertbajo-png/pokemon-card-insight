# Japanese special-set catalogue

The app bundles a small, reviewed Japanese catalogue from the public [TCGdex Japanese API](https://api.tcgdex.net/v2/ja/sets). It uses genuine Japanese set IDs, card names, numbering and artwork. It does not reuse an English checklist, call a live provider while browsing, or require an API key.

`src/data/japanese-catalogue.json` contains metadata only. `src/data/japanese-cards.json` contains the basic card lists, keyed by canonical set ID, and can be loaded separately. IDs use `jp-<lowercase source set ID>` and `jp-<lowercase source set ID>-<original local ID>`; for example `jp-sv2a` and `jp-sv2a-001`. The source's padded `001` is retained. These IDs must remain distinct from English catalogue identities.

## Included capture

The 2026-11-08 capture includes five complete basic card lists (1,033 unique cards):

| Source set | Display/search alias      | Printed count | Actual cards | Card images |
| ---------- | ------------------------- | ------------: | -----------: | ----------- |
| SV2a       | Pokémon Card 151          |           165 |          210 | Available   |
| SV8a       | Terastal Festival ex      |           187 |          237 | Available   |
| S8b        | VMAX Climax               |           184 |          285 | Unavailable |
| SM12a      | TAG TEAM GX Tag All Stars |           173 |          226 | Unavailable |
| SM11b      | Dream League              |            49 |           75 | Unavailable |

`nativeName` and card names come directly from the Japanese response. English display names are editorial aliases/transliterations for searching; they do not identify an English edition or automatically link a saved card to Japan. `printedTotal` is the source's official printed count; `total` counts unique catalogue card IDs, including secret-numbered cards. Holo, reverse and other finish variants are not additional checklist entries.

The native product identities can also be checked against Pokémon's official pages for [Pokémon Card 151](https://www.pokemon-card.com/ex/sv2a/), [Terastal Festival ex](https://www.pokemon-card.com/ex/sv8a/), [VMAX Climax](https://www.pokemon-card.com/ex/s8b/) and [TAG TEAM GX Tag All Stars](https://www.pokemon-card.com/ex/sm12a/index.html); [the official Sun & Moon product list](https://www.pokemon-card.com/rules/regulation/sm.html) includes Dream League.

The candidate SV4a was rejected: it returned 320 cards but numbering ran to 360 with gaps. S4a and S6a advertised 190 and 69 cards but returned empty lists. Their response counts, hashes and exclusion explanations remain in `provenance.captures`; their metadata and checklists are not included. S8a and S12a are also outside this reviewed subset. This is a selection of verified special sets, not a complete Japanese catalogue.

Images use only URLs present in the Japanese response, normalized to `https://assets.tcgdex.net/ja/<series>/<set>/<local ID>/high.webp`. Replace `/high.webp` with `/low.webp` for thumbnails. An empty string means the source supplied no image; show an honest placeholder and never an English card. Set logos and symbols may likewise be empty. External images still require network access and can later become unavailable. See [TCGdex assets](https://tcgdex.dev/assets) and [missing-image guidance](https://tcgdex.dev/faq).

## Verify or refresh

```sh
node scripts/update-japanese-catalogue.mjs --check
node scripts/update-japanese-catalogue.mjs --refresh
```

`--check` is offline and fast. It checks metadata/card-map digests, per-set digests, source counts, namespaces, names, Japanese image paths and an exact contiguous sequence from 1 through each set's total. It also rejects duplicate IDs and card data accidentally added to the eager metadata file.

`--refresh` explicitly makes eight bounded set requests, with no per-card requests, authentication, AI, database access or service operations. Incomplete candidates are recorded and omitted. Network/HTTP failures abort the refresh. Both outputs are validated before replacement; review their diff and run `--check` before building. Refresh should not run concurrently with a build.

The revision is our dated API capture, **not** a claim that live API responses match an upstream Git commit. Provenance records capture time, exact response URL/byte count/SHA256, advertised/returned counts, missing images and digests of the normalized output. Raw response hashes are acquisition records; offline checks recompute the normalized digests. The checked-in files are the reproducible build input. An explicit refresh can change that input.

## Source and attribution

TCGdex's [set endpoint](https://tcgdex.dev/rest/set) and [set schema](https://tcgdex.dev/reference/set) describe the response. The primary database is [tcgdex/cards-database](https://github.com/tcgdex/cards-database); Japanese metadata and cards live under `data-asia/`, with language-specific fields. For example, [SV2a metadata](https://github.com/tcgdex/cards-database/blob/f1c916b074a107e7232dffdf86368f168262fa97/data-asia/SV/SV2a.ts) and [card 001](https://github.com/tcgdex/cards-database/blob/f1c916b074a107e7232dffdf86368f168262fa97/data-asia/SV/SV2a/001.ts) are immutable examples. Upstream image availability is maintained separately from that Git source.

The database is distributed under the MIT License, copyright (c) 2021 TCGdex. The app includes the [verbatim license](../public/licenses/TCGdex-MIT.txt), served at `/licenses/TCGdex-MIT.txt`. Card artwork remains the property of its respective rights holders; this snapshot contains image URLs rather than redistributed image files. TCGdex states that its database is not affiliated with Nintendo or The Pokémon Company.
