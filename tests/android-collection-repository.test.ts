import { Capacitor } from "@capacitor/core";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  collectionCardFieldsSchema,
  CollectionRepositoryError,
  type CollectionCard,
  type CollectionCardFields,
} from "@/platform/collection";
import {
  createAndroidCollectionRepository,
  type CardLensCollectionPlugin,
} from "@/android/storage/collectionRepository";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
    isPluginAvailable: vi.fn(() => false),
  },
  registerPlugin: vi.fn(() => ({})),
}));

vi.mock("@/integrations/supabase/client", () => {
  throw new Error("Android collection must not initialize a web backend.");
});
vi.mock("@/services/scannedCardsStorage", () => {
  throw new Error(
    "Android collection must not initialize web collection storage.",
  );
});

const id = "9d098bc8-80f1-47ad-8f70-241ed500735b";
const anotherId = "aa2711b9-b24d-489a-88ab-548fb0b6e9e3";
const fields: CollectionCardFields = {
  name: "ピカチュウ",
  setId: "jp-sv2a",
  setName: "Pokémon Card 151 (Japan)",
  cardNumber: "025",
  catalogueCardId: "jp-sv2a-025",
  language: "ja",
  variant: "Master Ball",
  condition: "near_mint",
  quantity: 2,
  location: "Pärm 1",
  notes: "\nBehåll originalrader\r\n\tFavorit\n",
};

const card = (patch: Partial<CollectionCard> = {}): CollectionCard => ({
  ...fields,
  id,
  createdAt: 1794700000000,
  updatedAt: 1794700000000,
  revision: 1,
  ...patch,
});

function fixture() {
  const plugin = {
    listCards: vi.fn().mockResolvedValue({ cards: [card()] }),
    createCard: vi.fn().mockResolvedValue({ card: card() }),
    updateCard: vi
      .fn()
      .mockResolvedValue({
        card: card({ revision: 2, updatedAt: 1794700001000 }),
      }),
    deleteCard: vi.fn().mockResolvedValue({}),
  } satisfies CardLensCollectionPlugin;
  return {
    plugin,
    repository: createAndroidCollectionRepository({
      plugin,
      isAvailable: () => true,
    }),
  };
}

beforeEach(() => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
  vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("marshals complete snapshots to Room and preserves edition IDs, numbers, language and notes", async () => {
  const { plugin, repository } = fixture();
  expect(await repository.list()).toEqual([card()]);
  expect(await repository.create({ id, fields })).toEqual(card());
  expect(plugin.createCard).toHaveBeenCalledWith({ id, fields });
  expect(await repository.update({ id, expectedRevision: 1, fields })).toEqual(
    card({ revision: 2, updatedAt: 1794700001000 }),
  );
  expect(plugin.updateCard).toHaveBeenCalledWith({
    id,
    expectedRevision: 1,
    fields,
  });
  await expect(
    repository.remove({ id, expectedRevision: 2 }),
  ).resolves.toBeUndefined();
  expect(plugin.deleteCard).toHaveBeenCalledWith({ id, expectedRevision: 2 });
});

it("normalizes human labels while preserving opaque identifiers and multiline notes exactly", async () => {
  const { plugin, repository } = fixture();
  const supplied = {
    ...fields,
    name: "\u00a0ピカチュウ\ufeff",
    setName: " 151 ",
    cardNumber: " 025 ",
    variant: " Master Ball ",
    location: " Pärm 1 ",
    setId: " jp-sv2a ",
    catalogueCardId: " jp-sv2a-025 ",
  };
  const normalized = {
    ...fields,
    setName: "151",
    setId: supplied.setId,
    catalogueCardId: supplied.catalogueCardId,
  };
  plugin.createCard.mockResolvedValue({ card: card(normalized) });
  await expect(repository.create({ id, fields: supplied })).resolves.toEqual(
    card(normalized),
  );
  expect(plugin.createCard).toHaveBeenCalledWith({ id, fields: normalized });
  expect(supplied.name).toBe("\u00a0ピカチュウ\ufeff");
  expect(supplied.notes).toBe(fields.notes);
});

it("keeps failed-save input and its caller-assigned ID intact for a safe retry", async () => {
  const { plugin, repository } = fixture();
  const input = Object.freeze({ id, fields: Object.freeze({ ...fields }) });
  plugin.createCard.mockRejectedValueOnce({
    code: "STORAGE_UNAVAILABLE",
    message: "SQLITE error: private row",
  });
  await expect(repository.create(input)).rejects.toMatchObject({
    code: "STORAGE_UNAVAILABLE",
  });
  expect(input).toEqual({ id, fields });
  await expect(repository.create(input)).resolves.toEqual(card());
  expect(plugin.createCard.mock.calls.map(([value]) => value)).toEqual([
    input,
    input,
  ]);
  expect(plugin.createCard.mock.calls[0][0].fields).not.toBe(input.fields);
});

it("does not invent successful edits or update a cached list after a failed CAS save", async () => {
  const { plugin, repository } = fixture();
  plugin.updateCard.mockRejectedValue({
    code: "CONFLICT",
    message: "private SQL",
  });
  const edited = { ...fields, notes: "Mitt osparade utkast", quantity: 3 };
  await expect(
    repository.update({ id, expectedRevision: 1, fields: edited }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(edited.notes).toBe("Mitt osparade utkast");
  expect(await repository.list()).toEqual([card()]);
  expect(plugin.listCards).toHaveBeenCalledTimes(1);
});

it.each([id.toUpperCase(), `card-${id}`, `card-${id.toUpperCase()}`])(
  "preserves a supported existing record identity %s",
  async (existingId) => {
    const { plugin, repository } = fixture();
    plugin.createCard.mockResolvedValue({ card: card({ id: existingId }) });
    await expect(
      repository.create({ id: existingId, fields }),
    ).resolves.toMatchObject({ id: existingId });
    expect(plugin.createCard).toHaveBeenCalledWith({ id: existingId, fields });
  },
);

it.each([
  { name: " \u00a0\ufeff " },
  { name: "x".repeat(121) },
  { setId: " \t " },
  { setId: "a".repeat(129) },
  { setId: undefined },
  { setName: "x".repeat(121) },
  { cardNumber: "x".repeat(41) },
  { catalogueCardId: "x".repeat(161) },
  { catalogueCardId: "jp-\u0000id" },
  { catalogueCardId: undefined },
  { variant: "x".repeat(81) },
  { location: "x".repeat(121) },
  { quantity: 0 },
  { quantity: 1.5 },
  { quantity: 10000 },
  { language: "zz" },
  { condition: "perfect" },
  { notes: "x".repeat(2001) },
  { notes: "hidden\u007fcontrol" },
  { setName: undefined },
  { unexpected: "not a collection field" },
])("rejects invalid input before any native mutation: %j", async (patch) => {
  const { plugin, repository } = fixture();
  await expect(
    repository.create({
      id,
      fields: { ...fields, ...patch } as CollectionCardFields,
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(plugin.createCard).not.toHaveBeenCalled();
});

it("validates nullable catalogue identities and scalar boundaries without assigning editions", () => {
  const manual = {
    ...fields,
    setId: null,
    catalogueCardId: null,
    quantity: 9999,
    notes: "x".repeat(2000),
  };
  expect(collectionCardFieldsSchema.parse(manual)).toEqual(manual);
});

it("accepts an idempotent create reply without inventing a new identity or resetting its stored revision", async () => {
  const { plugin, repository } = fixture();
  plugin.createCard.mockResolvedValue({ card: card({ revision: 3 }) });
  await expect(repository.create({ id, fields })).resolves.toEqual(
    card({ revision: 3 }),
  );
  expect(plugin.createCard).toHaveBeenCalledWith({ id, fields });
});

it.each([
  "not-a-uuid",
  ` ${id}`,
  `CARD-${id}`,
  "card-other",
  "../card",
  `${id}\n`,
  `${id}\r\n`,
  `${id}\u2028`,
  `card-${id}\n`,
])("rejects malformed record identity %s", async (invalidId) => {
  const { plugin, repository } = fixture();
  await expect(
    repository.create({ id: invalidId, fields }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(plugin.createCard).not.toHaveBeenCalled();
});

it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid CAS revision %s before update or deletion",
  async (expectedRevision) => {
    const { plugin, repository } = fixture();
    await expect(
      repository.update({ id, expectedRevision, fields }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      repository.remove({ id, expectedRevision }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(plugin.updateCard).not.toHaveBeenCalled();
    expect(plugin.deleteCard).not.toHaveBeenCalled();
  },
);

it.each([
  "VALIDATION",
  "CONFLICT",
  "NOT_FOUND",
  "STORAGE_UNAVAILABLE",
  "SQLITE_BUSY",
  undefined,
])(
  "maps native error %s to a safe Swedish error without leaking diagnostics",
  async (code) => {
    const { plugin, repository } = fixture();
    plugin.listCards.mockRejectedValue({
      code,
      message: "SELECT private card FROM cards; SQLITE_BUSY",
    });
    const error = await repository.list().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(CollectionRepositoryError);
    expect((error as CollectionRepositoryError).code).toBe(
      ["VALIDATION", "CONFLICT", "NOT_FOUND", "STORAGE_UNAVAILABLE"].includes(
        code,
      )
        ? code
        : "STORAGE_UNAVAILABLE",
    );
    expect((error as Error).message).not.toMatch(/SELECT|private|SQLITE/);
  },
);

it.each([
  undefined,
  {},
  { cards: "not an array" },
  { cards: [card({ quantity: 0 })] },
  { cards: [card({ revision: 0 })] },
  { cards: [card({ updatedAt: 1 })] },
  { cards: [card({ createdAt: Number.NaN })] },
  { cards: [card({ name: " noncanonical " })] },
  { cards: [card(), card()] },
  { cards: [{ ...card(), privateField: "unexpected" }] },
])(
  "rejects malformed native list data instead of presenting an empty or altered collection",
  async (response) => {
    const { plugin, repository } = fixture();
    plugin.listCards.mockResolvedValue(response);
    await expect(repository.list()).rejects.toMatchObject({
      code: "STORAGE_UNAVAILABLE",
    });
  },
);

it("rejects a mutation response for another card, mismatched fields or a non-advancing revision", async () => {
  const { plugin, repository } = fixture();
  plugin.createCard.mockResolvedValue({ card: card({ id: anotherId }) });
  await expect(repository.create({ id, fields })).rejects.toMatchObject({
    code: "STORAGE_UNAVAILABLE",
  });
  plugin.createCard.mockResolvedValue({
    card: card({ catalogueCardId: "sv3pt5-25" }),
  });
  await expect(repository.create({ id, fields })).rejects.toMatchObject({
    code: "STORAGE_UNAVAILABLE",
  });
  plugin.updateCard.mockResolvedValue({ card: card() });
  await expect(
    repository.update({ id, expectedRevision: 1, fields }),
  ).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
  plugin.deleteCard.mockResolvedValue(undefined);
  await expect(
    repository.remove({ id, expectedRevision: 1 }),
  ).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
});

it("returns independent validated snapshots without sharing mutable native objects", async () => {
  const { plugin, repository } = fixture();
  const saved = card();
  plugin.listCards.mockResolvedValue({ cards: [saved] });
  const result = await repository.list();
  result[0].notes = "changed in the UI";
  expect(saved.notes).toBe(fields.notes);
  expect((await repository.list())[0].notes).toBe(fields.notes);
});

it.each(["ios", "web"])(
  "does not enable Android persistence for a %s runtime even if a plugin is present",
  async (platform) => {
    const { plugin } = fixture();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    const repository = createAndroidCollectionRepository({ plugin });
    await expect(repository.list()).rejects.toMatchObject({
      code: "STORAGE_UNAVAILABLE",
    });
    expect(plugin.listCards).not.toHaveBeenCalled();
  },
);

it("requires the actual registered Android plugin before using native persistence", async () => {
  const { plugin } = fixture();
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
  const repository = createAndroidCollectionRepository({ plugin });
  await expect(repository.list()).rejects.toMatchObject({
    code: "STORAGE_UNAVAILABLE",
  });
  expect(plugin.listCards).not.toHaveBeenCalled();
  vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
  await expect(repository.list()).resolves.toEqual([card()]);
  expect(Capacitor.isPluginAvailable).toHaveBeenCalledWith(
    "CardLensCollection",
  );
});

it("fails closed outside Android with no native, network or web-storage side effects", async () => {
  const { plugin } = fixture();
  const repository = createAndroidCollectionRepository({ plugin });
  const fetch = vi.fn();
  const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
  const readStorage = vi.spyOn(Storage.prototype, "getItem");
  const writeStorage = vi.spyOn(Storage.prototype, "setItem");
  const openIndexedDb = vi.fn();
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("indexedDB", { open: openIndexedDb });
  const unavailable = {
    code: "STORAGE_UNAVAILABLE",
    message: expect.stringContaining("Androidappen"),
  };
  await expect(repository.list()).rejects.toMatchObject(unavailable);
  await expect(repository.create({ id, fields })).rejects.toMatchObject(
    unavailable,
  );
  await expect(
    repository.update({ id, expectedRevision: 1, fields }),
  ).rejects.toMatchObject(unavailable);
  await expect(
    repository.remove({ id, expectedRevision: 1 }),
  ).rejects.toMatchObject(unavailable);
  for (const method of Object.values(plugin))
    expect(method).not.toHaveBeenCalled();
  for (const method of [fetch, xhr, readStorage, writeStorage, openIndexedDb])
    expect(method).not.toHaveBeenCalled();
});
