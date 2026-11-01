// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCatalogueHandler } from "../supabase/functions/_shared/catalogue";

type CatalogueRepository = Parameters<typeof createCatalogueHandler>[0];

const catalogueSource = {
  kind: "snapshot",
  revision: "fixture-revision",
  updatedAt: "2026-10-31T12:00:00.000Z",
};

function makeSet(id: string, name: string, releaseDate: string, total: number) {
  return {
    id,
    name,
    series: "Fixture series",
    total,
    printedTotal: total,
    releaseDate,
    images: {
      symbol: `https://images.example.invalid/${id}/symbol.png`,
      logo: `https://images.example.invalid/${id}/logo.png`,
    },
  };
}

function makeCard(
  id: string,
  name: string,
  number: string,
  types: string[] = ["Lightning"],
  rarity = "Common",
) {
  return {
    id,
    name,
    number,
    types,
    rarity,
    images: {
      small: `https://images.example.invalid/${id}.png`,
      large: `https://images.example.invalid/${id}-large.png`,
    },
  };
}

const fixtureSets = [
  makeSet("neo1", "Neo Genesis", "2000/12/16", 2),
  makeSet("base1", "Base", "1999/01/09", 6),
  makeSet("cel25c", "Celebrations Classic Collection", "2021/10/08", 1),
];

const fixtureCards = {
  base1: [
    makeCard("base1-3", "Charizard ex", "100", ["Fire"], "Rare Holo"),
    makeCard("base1-2", "Charizard", "10", ["Fire"], "Rare Holo"),
    makeCard("base1-5", "Pikachu", "11"),
    makeCard("base1-1", "Charmander", "1", ["Fire"]),
    makeCard("base1-6", "A&B 50%", "12", ["Colorless"], "Uncommon"),
    makeCard("base1-4", "Squirtle", "2", ["Water"]),
  ],
  neo1: [
    makeCard("neo1-1", "Pikachu", "1", ["Lightning"], "Rare"),
    makeCard("neo1-2", "Surfing Pikachu", "2", ["Water"], "Rare Holo"),
  ],
  cel25c: [
    makeCard("cel25c-2_A", "Pikachu", "2_A", ["Lightning"], "Rare Holo"),
  ],
};

function memoryRepository(
  sets = fixtureSets,
  cards: Record<string, ReturnType<typeof makeCard>[]> = fixtureCards,
) {
  const listSets = vi.fn(async (signal: AbortSignal) => {
    signal.throwIfAborted();
    return structuredClone(sets);
  });
  const readCards = vi.fn(async (setId: string, signal: AbortSignal) => {
    signal.throwIfAborted();
    return structuredClone(cards[setId] ?? []);
  });
  const repository = {
    revision: catalogueSource.revision,
    updatedAt: catalogueSource.updatedAt,
    listSets,
    readCards,
  } satisfies CatalogueRepository;
  return { repository, listSets, readCards };
}

function request(
  path = "/cards",
  query: Record<string, string> = {},
  init: RequestInit = {},
) {
  const outer = new URLSearchParams({
    path,
    query: new URLSearchParams(query).toString(),
  });
  return new Request(`https://catalogue.example.invalid?${outer}`, init);
}

function deferredSignal() {
  let resolve!: (signal: AbortSignal) => void;
  const started = new Promise<AbortSignal>((done) => {
    resolve = done;
  });
  const read = vi.fn((_setId: string, signal: AbortSignal) => {
    resolve(signal);
    return new Promise<ReturnType<typeof makeCard>[]>((_done, reject) => {
      if (signal.aborted) reject(signal.reason);
      else
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
    });
  });
  return { started, read };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Catalogue handler tests must not access the network.");
    }),
  );
});

afterEach(() => {
  if (vi.isFakeTimers()) {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("snapshot catalogue handler", () => {
  it("serves set metadata and release-date ordering without reading card files", async () => {
    const { repository, readCards } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/sets", { orderBy: "releaseDate" }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.map((set: { id: string }) => set.id)).toEqual([
      "base1",
      "neo1",
      "cel25c",
    ]);
    expect(body.data[0]).toEqual({ ...fixtureSets[1], catalogueSource });
    expect(body.catalogueSource).toEqual(catalogueSource);
    expect(readCards).not.toHaveBeenCalled();
  });

  it("serves an individual set without reading its cards", async () => {
    const { repository, readCards } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/sets/base1"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: fixtureSets[1],
      catalogueSource,
    });
    expect(readCards).not.toHaveBeenCalled();
  });

  it("accepts underscore card IDs, reads only their set and injects set metadata", async () => {
    const { repository, readCards } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/cards/cel25c-2_A"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      ...fixtureCards.cel25c[0],
      set: fixtureSets[2],
    });
    expect(body.catalogueSource).toEqual(catalogueSource);
    expect(body.data.cardmarket).toBeUndefined();
    expect(body.data.tcgplayer).toBeUndefined();
    expect(readCards.mock.calls.map(([setId]) => setId)).toEqual(["cel25c"]);
  });

  it.each([
    ["ex10-!", "/cards/ex10-!"],
    ["ex10-!", "/cards/ex10-%21"],
    ["ex10-?", "/cards/ex10-%3F"],
  ])(
    "reads special card %s through the outer query with path %s",
    async (id, path) => {
      const set = makeSet("ex10", "Unseen Forces", "2005/08/22", 2);
      const cards = [
        makeCard("ex10-!", "Unown !", "!", ["Psychic"], "Rare"),
        makeCard("ex10-?", "Unown ?", "?", ["Psychic"], "Rare"),
      ];
      const { repository, readCards } = memoryRepository([set], {
        ex10: cards,
      });
      const incoming = request(path);
      expect(new URL(incoming.url).searchParams.get("path")).toBe(path);
      const response = await createCatalogueHandler(repository)(incoming);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toMatchObject({
        ...cards.find((card) => card.id === id),
        set,
      });
      expect(body.catalogueSource).toEqual(catalogueSource);
      expect(readCards.mock.calls.map(([setId]) => setId)).toEqual(["ex10"]);
    },
  );

  it.each(["/sets/missing", "/cards/base1-missing", "/cards/missing-1"])(
    "returns a sourced 404 for missing resource %s",
    async (path) => {
      const { repository, readCards } = memoryRepository();
      const response = await createCatalogueHandler(repository)(request(path));
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ catalogueSource });
      expect(readCards.mock.calls.every(([setId]) => setId === "base1")).toBe(
        true,
      );
    },
  );

  it("combines set, wildcard name, type OR and quoted rarity with AND", async () => {
    const { repository, readCards } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/cards", {
        q: 'set.id:base1 name:*char* types:(Fire OR Water) rarity:"Rare Holo"',
        orderBy: "name",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.map((card: { name: string }) => card.name)).toEqual([
      "Charizard",
      "Charizard ex",
    ]);
    expect(body.totalCount).toBe(2);
    expect(
      body.data.every(
        (card: { set: { id: string } }) => card.set.id === "base1",
      ),
    ).toBe(true);
    expect(body.catalogueSource).toEqual(catalogueSource);
    expect(readCards.mock.calls.map(([setId]) => setId)).toEqual(["base1"]);
  });

  it("matches exact names and orders matches by descending set release date", async () => {
    const { repository } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/cards", {
        q: 'name:"Pikachu"',
        orderBy: "-set.releaseDate",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.map((card: { id: string }) => card.id)).toEqual([
      "cel25c-2_A",
      "neo1-1",
      "base1-5",
    ]);
    expect(body.totalCount).toBe(3);
  });

  it("preserves literal ampersands and percent signs in quoted names", async () => {
    const { repository } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/cards", { q: 'name:"A&B 50%"' }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.map((card: { id: string }) => card.id)).toEqual([
      "base1-6",
    ]);
    expect(body.totalCount).toBe(1);
  });

  it("handles a long nonmatching wildcard without exponential regular-expression expansion", async () => {
    const NativeRegExp = RegExp;
    // Fail immediately if a regression constructs the dangerous pattern, rather
    // than letting catastrophic backtracking freeze the test worker itself.
    vi.spyOn(globalThis, "RegExp").mockImplementation((pattern, flags) => {
      if (typeof pattern === "string" && /(?:\.\*){8}/.test(pattern)) {
        throw new Error("Unbounded wildcard expansion must not be executed.");
      }
      return new NativeRegExp(pattern, flags);
    });
    const { repository, readCards } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/cards", {
        q: `set.id:base1 name:${"*".repeat(100)}unmatched`,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [],
      totalCount: 0,
      catalogueSource,
    });
    expect(readCards.mock.calls.map(([setId]) => setId)).toEqual(["base1"]);
  });

  it("sorts collector numbers numerically before applying pagination", async () => {
    const { repository } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/cards", {
        q: "set.id:base1",
        orderBy: "number",
        page: "2",
        pageSize: "2",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.map((card: { number: string }) => card.number)).toEqual([
      "10",
      "11",
    ]);
    expect(body.totalCount).toBe(6);
  });

  it("keeps all 279 cards and a constant total across the 250-card boundary", async () => {
    const cards = Array.from({ length: 279 }, (_, index) =>
      makeCard(`big1-${index + 1}`, "Fixture", String(index + 1)),
    ).reverse();
    const { repository } = memoryRepository(
      [makeSet("big1", "Large set", "2020/01/01", 279)],
      { big1: cards },
    );
    const handler = createCatalogueHandler(repository);
    const pages = [];
    for (const page of ["1", "2", "3"]) {
      const response = await handler(
        request("/cards", {
          q: "set.id:big1",
          orderBy: "number",
          page,
          pageSize: "250",
        }),
      );
      expect(response.status).toBe(200);
      pages.push(await response.json());
    }
    expect(pages.map((page) => page.data.length)).toEqual([250, 29, 0]);
    expect(pages.map((page) => page.totalCount)).toEqual([279, 279, 279]);
    const result = pages.flatMap((page) => page.data);
    expect(result.map((card: { number: string }) => card.number)).toEqual(
      Array.from({ length: 279 }, (_, index) => String(index + 1)),
    );
    expect(new Set(result.map((card: { id: string }) => card.id)).size).toBe(
      279,
    );
  });

  it("returns an empty successful result for a valid filter with no matches", async () => {
    const { repository } = memoryRepository();
    const response = await createCatalogueHandler(repository)(
      request("/cards", { q: 'set.id:base1 name:"Missing Pokémon"' }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [],
      totalCount: 0,
      catalogueSource,
    });
  });

  it.each([
    "hp:100",
    "set.id:base1 hp:100",
    "set.id:base1 OR set.id:neo1",
    'name:"Pikachu" ignored-text',
    'name:"unterminated',
    "types:(Fire OR)",
  ])(
    "rejects unsupported or malformed query %s instead of dropping its filter",
    async (q) => {
      const { repository, readCards } = memoryRepository();
      const response = await createCatalogueHandler(repository)(
        request("/cards", { q }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ catalogueSource });
      expect(readCards).not.toHaveBeenCalled();
    },
  );

  it.each([
    { page: "0" },
    { page: "-1" },
    { page: "1.5" },
    { page: "invalid" },
    { pageSize: "0" },
    { pageSize: "251" },
    { pageSize: "1.5" },
    { orderBy: "unsupported" },
    { unsupported: "value" },
  ])(
    "rejects invalid query parameters %j before reading card data",
    async (query) => {
      const { repository, readCards } = memoryRepository();
      const response = await createCatalogueHandler(repository)(
        request("/cards", query),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ catalogueSource });
      expect(readCards).not.toHaveBeenCalled();
    },
  );

  it.each([
    "/../../elsewhere",
    "/cards/../sets",
    "/cards/%2e%2e",
    "/cards/base1%2f1",
    "/cards/ex10-%253F",
    "/cards/ex10-%252e%252e%252fbase1-1",
    "/cards/ex10-%2F..",
    "/cards/ex10-%",
    "/cards/base1-1/extra",
    "/cards/https://other.example.invalid",
    "/sets/base1?extra=1",
    "/other",
  ])(
    "rejects unsafe path %s before consulting the repository",
    async (path) => {
      const { repository, listSets, readCards } = memoryRepository();
      const response = await createCatalogueHandler(repository)(request(path));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ catalogueSource });
      expect(listSets).not.toHaveBeenCalled();
      expect(readCards).not.toHaveBeenCalled();
    },
  );

  it("rejects POST and handles OPTIONS without consulting the repository", async () => {
    const { repository, listSets, readCards } = memoryRepository();
    const handler = createCatalogueHandler(repository);
    const post = await handler(request("/cards", {}, { method: "POST" }));
    expect(post.status).toBe(405);
    expect(await post.json()).toMatchObject({ catalogueSource });
    const options = await handler(request("/cards", {}, { method: "OPTIONS" }));
    expect(options.status).toBe(200);
    expect(listSets).not.toHaveBeenCalled();
    expect(readCards).not.toHaveBeenCalled();
  });

  it("returns a sourced failure when the repository is unavailable", async () => {
    const { repository } = memoryRepository();
    repository.listSets.mockRejectedValueOnce(
      new Error("Fixture storage unavailable"),
    );
    const response = await createCatalogueHandler(repository)(request("/sets"));
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(await response.json()).toMatchObject({ catalogueSource });
  });

  it("propagates request cancellation to an in-flight repository read", async () => {
    const { repository } = memoryRepository();
    const { started, read } = deferredSignal();
    const controller = new AbortController();
    const pending = createCatalogueHandler({ ...repository, readCards: read })(
      request("/cards", { q: "set.id:base1" }, { signal: controller.signal }),
    );
    const signal = await started;
    controller.abort(new DOMException("Navigation changed", "AbortError"));
    const response = await pending;
    expect(signal.aborted).toBe(true);
    expect(response.ok).toBe(false);
    expect(await response.json()).toMatchObject({ catalogueSource });
    expect(read).toHaveBeenCalledOnce();
  });

  it("aborts repository work within the handler's nine-second total budget", async () => {
    vi.useFakeTimers();
    // Node's native AbortSignal.timeout does not use Vitest's fake global timers.
    vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
      const controller = new AbortController();
      setTimeout(
        () => controller.abort(new DOMException("Timed out", "TimeoutError")),
        milliseconds,
      );
      return controller.signal;
    });
    const { repository } = memoryRepository();
    const { started, read } = deferredSignal();
    const listSets = vi.fn(
      (_signal: AbortSignal) =>
        new Promise<typeof fixtureSets>((resolve) => {
          setTimeout(() => resolve(structuredClone(fixtureSets)), 6000);
        }),
    );
    const pending = createCatalogueHandler({
      ...repository,
      listSets,
      readCards: read,
    })(request("/cards", { q: "set.id:base1" }));
    await vi.advanceTimersByTimeAsync(6000);
    const signal = await started;
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(3000);
    const response = await pending;
    expect(signal.aborted).toBe(true);
    expect(response.ok).toBe(false);
    expect(await response.json()).toMatchObject({ catalogueSource });
    expect(read).toHaveBeenCalledOnce();
  });
});
