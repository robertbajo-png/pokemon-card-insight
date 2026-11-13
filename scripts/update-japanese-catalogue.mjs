import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = "https://api.tcgdex.net/v2/ja";
const metadataPath = fileURLToPath(
  new URL("../src/data/japanese-catalogue.json", import.meta.url),
);
const cardsPath = fileURLToPath(
  new URL("../src/data/japanese-cards.json", import.meta.url),
);
// English display/search labels are editorial aliases, never catalogue identities.
const candidates = [
  { sourceId: "SV2a", serie: "SV", name: "Pokémon Card 151" },
  { sourceId: "SV8a", serie: "SV", name: "Terastal Festival ex" },
  { sourceId: "SV4a", serie: "SV", name: "Shiny Treasure ex" },
  { sourceId: "S8b", serie: "S", name: "VMAX Climax" },
  { sourceId: "S4a", serie: "S", name: "Shiny Star V" },
  { sourceId: "S6a", serie: "S", name: "Eevee Heroes" },
  { sourceId: "SM12a", serie: "SM", name: "TAG TEAM GX Tag All Stars" },
  { sourceId: "SM11b", serie: "SM", name: "Dream League" },
];
const bySourceId = new Map(
  candidates.map((candidate) => [candidate.sourceId, candidate]),
);
const maxResponseBytes = 1024 * 1024;
const canonicalJson = (value) =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
const digest = (value) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");
const isHash = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const isCount = (value, minimum = 0) =>
  Number.isSafeInteger(value) && value >= minimum && value <= 1000;
const isText = (value, limit = 200) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= limit &&
  ![...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
const canonicalSetId = (sourceId) => `jp-${sourceId.toLowerCase()}`;
const assetRoot = (candidate) =>
  `https://assets.tcgdex.net/ja/${candidate.serie}/${candidate.sourceId}`;

function normalizeAsset(value, expected) {
  if (value == null || value === "") return "";
  assert.equal(typeof value, "string", "Invalid image field");
  assert.ok(
    value === expected ||
      (/\.(?:webp|png|jpg)$/.test(value) &&
        value.replace(/\.(?:webp|png|jpg)$/, "") === expected),
    "Image is not the original Japanese TCGdex asset",
  );
  return `${expected}.webp`;
}

/** Validate a candidate before accepting any of its cards into the snapshot. */
export function normalizeJapaneseSet(raw, candidate) {
  assert.ok(
    candidate && bySourceId.has(candidate.sourceId),
    "Unknown candidate",
  );
  assert.equal(raw?.id, candidate.sourceId, "Wrong source set ID");
  assert.equal(raw?.serie?.id, candidate.serie, "Wrong source series");
  assert.ok(isText(raw.name), "Missing Japanese set name");
  assert.ok(isDate(raw.releaseDate), "Invalid release date");
  assert.ok(Array.isArray(raw.cards), "Missing card list");
  assert.ok(isCount(raw.cardCount?.total, 1), "Invalid advertised total");
  assert.ok(
    isCount(raw.cardCount?.official, 1) &&
      raw.cardCount.official <= raw.cardCount.total,
    "Invalid printed count",
  );
  assert.equal(
    raw.cards.length,
    raw.cardCount.total,
    "Returned card count differs from advertised total",
  );
  const seen = new Set();
  const numbers = new Set();
  const id = canonicalSetId(candidate.sourceId);
  const cards = raw.cards
    .map((card) => {
      assert.ok(
        typeof card.localId === "string" && /^\d{1,4}$/.test(card.localId),
        "Invalid local card number",
      );
      assert.equal(
        card.id,
        `${candidate.sourceId}-${card.localId}`,
        "Wrong source card ID",
      );
      assert.ok(!seen.has(card.id), "Duplicate source card ID");
      seen.add(card.id);
      const number = Number(card.localId);
      assert.ok(
        number >= 1 && number <= raw.cardCount.total && !numbers.has(number),
        "Card numbers are not a unique contiguous sequence",
      );
      numbers.add(number);
      assert.ok(isText(card.name), "Invalid card name");
      const base = `${assetRoot(candidate)}/${card.localId}`;
      assert.ok(
        card.image == null || card.image === "" || card.image === base,
        "Card image is not the original Japanese TCGdex asset",
      );
      return {
        id: `${id}-${card.localId}`,
        number: card.localId,
        name: card.name,
        image: card.image ? `${base}/high.webp` : "",
      };
    })
    .sort((a, b) => Number(a.number) - Number(b.number));
  assert.equal(
    numbers.size,
    raw.cardCount.total,
    "Incomplete local card numbering",
  );
  for (let number = 1; number <= raw.cardCount.total; number++) {
    assert.ok(numbers.has(number), "Missing local card number");
  }
  return {
    set: {
      id,
      sourceId: candidate.sourceId,
      name: candidate.name,
      nativeName: raw.name,
      series: "Japanska specialset",
      total: cards.length,
      printedTotal: raw.cardCount.official,
      releaseDate: raw.releaseDate,
      setCode: candidate.sourceId,
      logo: normalizeAsset(raw.logo, `${assetRoot(candidate)}/logo`),
      symbol: normalizeAsset(raw.symbol, `${assetRoot(candidate)}/symbol`),
    },
    cards,
  };
}

/** Offline integrity and identity checks; never makes an HTTP request. */
export function validateJapaneseCatalogue(metadata, cardMap) {
  assert.equal(metadata?.schemaVersion, 1, "Unsupported schema");
  assert.equal(metadata.source, source, "Wrong catalogue source/language");
  assert.ok(isDate(metadata.updatedAt), "Invalid capture date");
  assert.equal(
    metadata.revision,
    `tcgdex-ja-${metadata.updatedAt}`,
    "Invalid capture revision",
  );
  assert.ok(
    Array.isArray(metadata.sets) &&
      metadata.sets.length > 0 &&
      metadata.sets.length <= candidates.length,
    "Invalid set list",
  );
  assert.ok(
    cardMap && typeof cardMap === "object" && !Array.isArray(cardMap),
    "Invalid card map",
  );
  assert.equal(
    Object.keys(cardMap).length,
    metadata.sets.length,
    "Unexpected/missing card-map set",
  );
  const provenance = metadata.provenance;
  assert.ok(
    provenance && Number.isFinite(Date.parse(provenance.capturedAt)),
    "Missing capture provenance",
  );
  assert.equal(
    provenance.capturedAt.slice(0, 10),
    metadata.updatedAt,
    "Capture date mismatch",
  );
  assert.equal(
    provenance.metadataSha256,
    digest(metadata.sets),
    "Metadata digest mismatch",
  );
  assert.equal(
    provenance.cardsSha256,
    digest(cardMap),
    "Card-map digest mismatch",
  );
  assert.ok(
    Array.isArray(provenance.captures) &&
      provenance.captures.length === candidates.length,
    "Missing candidate capture records",
  );
  const captureIds = new Set();
  for (const capture of provenance.captures) {
    assert.ok(
      bySourceId.has(capture.sourceId) && !captureIds.has(capture.sourceId),
      "Unexpected/duplicate capture",
    );
    captureIds.add(capture.sourceId);
    assert.equal(
      capture.url,
      `${source}/sets/${capture.sourceId}`,
      "Invalid capture URL",
    );
    assert.ok(
      Number.isSafeInteger(capture.responseBytes) &&
        capture.responseBytes > 0 &&
        capture.responseBytes <= maxResponseBytes,
      "Invalid capture byte count",
    );
    assert.ok(isHash(capture.responseSha256), "Missing source response digest");
    assert.ok(
      isCount(capture.advertisedTotal) && isCount(capture.returnedCount),
      "Invalid source counts",
    );
    assert.ok(
      isCount(capture.missingImages) &&
        capture.missingImages <= capture.returnedCount,
      "Invalid missing-image count",
    );
    assert.ok(
      ["included", "excluded"].includes(capture.status),
      "Invalid capture status",
    );
    if (capture.status === "excluded")
      assert.ok(isText(capture.reason), "Missing exclusion explanation");
  }
  const setIds = new Set();
  let cardCount = 0;
  for (const set of metadata.sets) {
    const candidate = bySourceId.get(set.sourceId);
    assert.ok(candidate, "Unknown source set");
    assert.equal(
      set.id,
      canonicalSetId(set.sourceId),
      "Invalid Japanese set namespace",
    );
    assert.ok(!setIds.has(set.id), "Duplicate set ID");
    setIds.add(set.id);
    assert.ok(
      !Object.hasOwn(set, "cards"),
      "Card data must stay separate from eager metadata",
    );
    assert.equal(set.name, candidate.name, "Unexpected display alias");
    assert.ok(isText(set.nativeName), "Missing native set name");
    assert.equal(set.series, "Japanska specialset", "Invalid series");
    assert.equal(set.setCode, set.sourceId, "Invalid set code");
    assert.ok(isDate(set.releaseDate), "Invalid release date");
    assert.ok(
      isCount(set.total, 1) &&
        isCount(set.printedTotal, 1) &&
        set.printedTotal <= set.total,
      "Invalid totals",
    );
    for (const field of ["logo", "symbol"]) {
      assert.ok(
        set[field] === "" ||
          set[field] === `${assetRoot(candidate)}/${field}.webp`,
        "Invalid Japanese set image",
      );
    }
    const cards = cardMap[set.id];
    assert.ok(
      Array.isArray(cards) && cards.length === set.total,
      "Incomplete card list",
    );
    const seen = new Set();
    for (const [index, card] of cards.entries()) {
      assert.ok(
        typeof card.number === "string" &&
          /^\d{1,4}$/.test(card.number) &&
          Number(card.number) === index + 1,
        "Card numbers are not a unique contiguous ordered sequence",
      );
      assert.equal(
        card.id,
        `${set.id}-${card.number}`,
        "Invalid Japanese card namespace",
      );
      assert.ok(!seen.has(card.id), "Duplicate card ID");
      seen.add(card.id);
      assert.ok(isText(card.name), "Invalid card name");
      assert.ok(
        card.image === "" ||
          card.image === `${assetRoot(candidate)}/${card.number}/high.webp`,
        "Invalid Japanese card image",
      );
    }
    const capture = provenance.captures.find(
      (item) => item.sourceId === set.sourceId,
    );
    assert.equal(capture.status, "included", "Set is not an accepted capture");
    assert.equal(capture.advertisedTotal, set.total, "Source total mismatch");
    assert.equal(capture.returnedCount, set.total, "Source count mismatch");
    assert.equal(
      capture.missingImages,
      cards.filter((card) => !card.image).length,
      "Missing-image count mismatch",
    );
    assert.equal(
      capture.cardsSha256,
      digest(cards),
      "Per-set card digest mismatch",
    );
    cardCount += cards.length;
  }
  for (const capture of provenance.captures) {
    assert.equal(
      setIds.has(canonicalSetId(capture.sourceId)),
      capture.status === "included",
      "Capture/set mismatch",
    );
  }
  return {
    sets: setIds.size,
    cards: cardCount,
    excluded: provenance.captures
      .filter((capture) => capture.status === "excluded")
      .map(({ sourceId, reason }) => ({ sourceId, reason })),
  };
}

async function fetchSet(sourceId) {
  const url = `${source}/sets/${sourceId}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PokemonCardLens-JapaneseCatalogue/1.0",
    },
    signal: AbortSignal.timeout(20000),
  });
  assert.ok(
    response.ok,
    `Catalogue request failed for ${sourceId}: HTTP ${response.status}`,
  );
  assert.ok(
    Number(response.headers.get("content-length") || 0) <= maxResponseBytes,
    "Catalogue response exceeds limit",
  );
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    assert.ok(size <= maxResponseBytes, "Catalogue response exceeds limit");
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  return { url, bytes, raw: JSON.parse(bytes.toString("utf8")) };
}

async function refresh() {
  const capturedAt = new Date().toISOString();
  const updatedAt = capturedAt.slice(0, 10);
  const sets = [];
  const cardMap = {};
  const captures = [];
  for (const candidate of candidates) {
    // Network failures abort the refresh; incomplete data are explicitly excluded.
    const { url, bytes, raw } = await fetchSet(candidate.sourceId);
    const capture = {
      sourceId: candidate.sourceId,
      url,
      responseBytes: bytes.length,
      responseSha256: createHash("sha256").update(bytes).digest("hex"),
      advertisedTotal: raw.cardCount?.total ?? 0,
      returnedCount: Array.isArray(raw.cards) ? raw.cards.length : 0,
      missingImages: Array.isArray(raw.cards)
        ? raw.cards.filter((card) => !card.image).length
        : 0,
    };
    try {
      const normalized = normalizeJapaneseSet(raw, candidate);
      sets.push(normalized.set);
      cardMap[normalized.set.id] = normalized.cards;
      captures.push({
        ...capture,
        status: "included",
        cardsSha256: digest(normalized.cards),
      });
    } catch (error) {
      captures.push({
        ...capture,
        status: "excluded",
        reason: String(error.message).split("\n")[0],
      });
    }
  }
  const metadata = {
    schemaVersion: 1,
    revision: `tcgdex-ja-${updatedAt}`,
    updatedAt,
    source,
    provenance: {
      capturedAt,
      metadataSha256: digest(sets),
      cardsSha256: digest(cardMap),
      captures,
    },
    sets,
  };
  const result = validateJapaneseCatalogue(metadata, cardMap);
  const suffix = `.${randomUUID()}.tmp`;
  const temporaryMetadata = metadataPath + suffix;
  const temporaryCards = cardsPath + suffix;
  try {
    await writeFile(
      temporaryMetadata,
      JSON.stringify(metadata, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(temporaryCards, JSON.stringify(cardMap, null, 2) + "\n", {
      flag: "wx",
    });
    await rename(temporaryCards, cardsPath);
    await rename(temporaryMetadata, metadataPath);
  } finally {
    await rm(temporaryMetadata, { force: true });
    await rm(temporaryCards, { force: true });
  }
  console.log(JSON.stringify({ action: "refreshed", ...result }));
}

async function main() {
  assert.equal(
    process.argv.length,
    3,
    "Use --check (offline) or --refresh (public API capture)",
  );
  const action = process.argv[2];
  if (action === "--refresh") return refresh();
  assert.equal(action, "--check", "Use --check or --refresh");
  const [metadata, cards] = await Promise.all([
    readFile(metadataPath, "utf8"),
    readFile(cardsPath, "utf8"),
  ]);
  console.log(
    JSON.stringify({
      action: "checked-offline",
      ...validateJapaneseCatalogue(JSON.parse(metadata), JSON.parse(cards)),
    }),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
