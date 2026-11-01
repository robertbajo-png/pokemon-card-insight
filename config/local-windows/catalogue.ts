import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  CatalogueCard,
  CatalogueRepository,
  CatalogueSet,
} from "../../supabase/functions/_shared/catalogue.ts";

const revision = "39a26a144c8b6ef6c2fb17b2c29d0bb7121e3a11";
const updatedAt = "2026-09-17";
const setCount = 176;
const maxFileBytes = 4 * 1024 * 1024;
const maxDiskBytes = 40 * 1024 * 1024;
const maxCacheBytes = 8 * 1024 * 1024;

interface CardFile {
  path: string;
  bytes: number;
  sha256: string;
  cardCount: number;
}
interface CatalogueIndex {
  sets: CatalogueSet[];
  files: Record<string, CardFile>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}
function isCount(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 2000
  );
}
function isImage(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 300) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["images.pokemontcg.io", "images.scrydex.com"].includes(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function hasControlCharacters(value: string) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

async function assertDirectory(directory: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const status = await lstat(directory);
  signal.throwIfAborted();
  if (!status.isDirectory() || status.isSymbolicLink())
    throw new Error("Unsafe local catalogue directory.");
}

async function readBounded(path: string, limit: number, signal: AbortSignal) {
  signal.throwIfAborted();
  const entry = await lstat(path);
  if (!entry.isFile() || entry.isSymbolicLink())
    throw new Error("Unsafe local catalogue file.");
  const file = await open(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const status = await file.stat();
    signal.throwIfAborted();
    if (!status.isFile() || status.size < 2 || status.size > limit)
      throw new Error("Invalid local catalogue file size.");
    const bytes = await file.readFile({ signal });
    signal.throwIfAborted();
    if (bytes.length !== status.size || bytes.length > limit)
      throw new Error("Incomplete local catalogue file.");
    return bytes;
  } finally {
    await file.close();
  }
}

// The image owns this directory. No request can choose another directory or file.
export function createLocalCatalogue(directory: string): CatalogueRepository {
  const root = resolve(directory);
  let index: CatalogueIndex | undefined;
  let activeReads = 0;
  let cacheBytes = 0;
  const cache = new Map<string, { cards: CatalogueCard[]; bytes: number }>();

  async function readIndex(signal: AbortSignal): Promise<CatalogueIndex> {
    signal.throwIfAborted();
    if (index) return index;
    await assertDirectory(root, signal);
    await assertDirectory(join(root, "cards"), signal);
    const bytes = await readBounded(
      join(root, "index.json"),
      1024 * 1024,
      signal,
    );
    const value: unknown = JSON.parse(bytes.toString("utf8"));
    if (
      !isObject(value) ||
      value.schemaVersion !== 1 ||
      value.revision !== revision ||
      value.updatedAt !== updatedAt ||
      !Array.isArray(value.sets) ||
      value.sets.length !== setCount ||
      !isObject(value.files) ||
      Object.keys(value.files).length !== setCount
    ) {
      throw new Error("Invalid local catalogue manifest.");
    }
    const ids = new Set<string>();
    let diskBytes = 0;
    for (const set of value.sets) {
      signal.throwIfAborted();
      if (
        !isObject(set) ||
        !isText(set.id, 32) ||
        !/^[a-z0-9]+$/.test(set.id) ||
        ids.has(set.id) ||
        !isText(set.name, 200) ||
        !isText(set.series, 100) ||
        !isCount(set.total) ||
        (set.printedTotal != null && !isCount(set.printedTotal)) ||
        !isText(set.releaseDate, 20) ||
        !isObject(set.images) ||
        !isImage(set.images.logo) ||
        !isImage(set.images.symbol)
      ) {
        throw new Error("Invalid local catalogue set.");
      }
      const record = value.files[set.id];
      if (
        !isObject(record) ||
        record.path !== `cards/${set.id}.json` ||
        !Number.isSafeInteger(record.bytes) ||
        (record.bytes as number) < 2 ||
        (record.bytes as number) > maxFileBytes ||
        typeof record.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(record.sha256) ||
        record.cardCount !== set.total
      ) {
        throw new Error("Invalid local catalogue file record.");
      }
      diskBytes += record.bytes as number;
      if (diskBytes > maxDiskBytes)
        throw new Error("Local catalogue exceeds its size budget.");
      ids.add(set.id);
    }
    index = {
      sets: value.sets as CatalogueSet[],
      files: value.files as unknown as Record<string, CardFile>,
    };
    return index;
  }

  return {
    revision,
    updatedAt,
    async listSets(signal) {
      const manifest = await readIndex(signal);
      signal.throwIfAborted();
      return manifest.sets.slice();
    },
    async readCards(setId, signal) {
      signal.throwIfAborted();
      if (!/^[a-z0-9]{1,32}$/.test(setId))
        throw new Error("Invalid local catalogue set ID.");
      const manifest = await readIndex(signal);
      if (!Object.hasOwn(manifest.files, setId))
        throw new Error("Local catalogue set not found.");
      const record = manifest.files[setId];
      if (!record) throw new Error("Local catalogue set not found.");
      const cached = cache.get(setId);
      if (cached) {
        cache.delete(setId);
        cache.set(setId, cached);
        return cached.cards;
      }
      if (activeReads >= 4)
        throw new Error("Local catalogue is busy. Try again.");
      activeReads++;
      try {
        const bytes = await readBounded(
          join(root, record.path),
          maxFileBytes,
          signal,
        );
        if (
          bytes.length !== record.bytes ||
          createHash("sha256").update(bytes).digest("hex") !== record.sha256
        )
          throw new Error("Local catalogue checksum mismatch.");
        signal.throwIfAborted();
        const cards: unknown = JSON.parse(bytes.toString("utf8"));
        if (!Array.isArray(cards) || cards.length !== record.cardCount)
          throw new Error("Incomplete local card checklist.");
        const ids = new Set<string>();
        for (const card of cards) {
          signal.throwIfAborted();
          if (
            !isObject(card) ||
            !isText(card.id, 120) ||
            !card.id.startsWith(`${setId}-`) ||
            !/^[A-Za-z0-9_!?-]+$/.test(card.id) ||
            ids.has(card.id) ||
            !isText(card.number, 32) ||
            hasControlCharacters(card.number) ||
            !isText(card.name, 200) ||
            !isObject(card.images) ||
            !isImage(card.images.small) ||
            !isImage(card.images.large)
          ) {
            throw new Error("Invalid or duplicate local catalogue card.");
          }
          // Printed numbers are not unique in reprint sets; preserve source IDs.
          ids.add(card.id);
        }
        signal.throwIfAborted();
        const result = cards as CatalogueCard[];
        // Another request may have populated this set while this file was read.
        const previous = cache.get(setId);
        if (previous) {
          cacheBytes -= previous.bytes;
          cache.delete(setId);
        }
        cache.set(setId, { cards: result, bytes: bytes.length });
        cacheBytes += bytes.length;
        while (cache.size > 6 || cacheBytes > maxCacheBytes) {
          const oldest = cache.keys().next().value;
          if (oldest === undefined) break;
          cacheBytes -= cache.get(oldest)!.bytes;
          cache.delete(oldest);
        }
        return result;
      } finally {
        activeReads--;
      }
    },
  };
}

export const localCatalogue = createLocalCatalogue("/app/catalogue");
