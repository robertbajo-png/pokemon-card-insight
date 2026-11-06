import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SetChecklist from "@/components/SetChecklist";
import { scannedCardSchema, type ScannedCard } from "@/lib/cardAnalysis";
import type { PokemonCard } from "@/services/pokemonTcgApi";

const mocks = vi.hoisted(() => ({
  collection: null as unknown,
  addCard: vi.fn(),
  copy: vi.fn(),
  createUrl: vi.fn(),
  revokeUrl: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/useScannedCards", () => ({
  useScannedCards: () => mocks.collection,
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

const set = { id: "cel25c", name: "Celebrations: Classic Collection" };
const catalog: PokemonCard[] = [
  { id: "cel25c-15_A", name: "Venusaur", number: "15" },
  { id: "cel25c-15_B", name: "Rocket's Zapdos", number: "15" },
  { id: "cel25c-73_A", name: "Imposter Professor Oak", number: "73" },
  { id: "cel25c-4_A", name: "Charizard", number: "4" },
].map((card) => ({
  ...card,
  set: { ...set, series: "Sword & Shield" },
  images: {
    small: "https://example.test/card.png",
    large: "https://example.test/card.png",
  },
}));

function owned(card: PokemonCard): ScannedCard {
  return scannedCardSchema.parse({
    id: `card-owned-${card.id}`,
    catalogId: card.id,
    setId: set.id,
    set: set.name,
    name: card.name,
    number: card.number,
    quantity: 1,
    notes: "PRIVAT TESTANTECKNING",
    location: "PRIVAT TESTPLATS",
    scannedAt: "2026-11-06T10:00:00.000Z",
  });
}

const state = (overrides: Record<string, unknown> = {}) => ({
  owner: "test-owner-a",
  cards: [owned(catalog[3])],
  isLoading: false,
  error: null,
  addCard: mocks.addCard,
  ...overrides,
});
const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);
let downloaded: { href: string; filename: string } | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  downloaded = undefined;
  mocks.collection = state();
  mocks.copy.mockResolvedValue(undefined);
  mocks.createUrl.mockReturnValue("blob:missing-cards-test");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: mocks.copy },
  });
  const NativeURL = URL;
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = mocks.createUrl;
      static revokeObjectURL = mocks.revokeUrl;
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloaded = {
      href: this.getAttribute("href") ?? "",
      filename: this.download,
    };
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network request in missing-cards UI test.");
    }),
  );
});

afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  expect(mocks.addCard).not.toHaveBeenCalled();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalClipboard)
    Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

function checklist(entry = "/set/cel25c", cards = catalog) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <SetChecklist set={set} catalog={cards} />
    </MemoryRouter>
  );
}

function openList(view: ReturnType<typeof render>) {
  fireEvent.click(view.getByRole("button", { name: "Lista att ta med" }));
  return view.getByRole("dialog", { name: "Saknade kort" });
}

async function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

it("lists every missing card even when the checklist shows only an owned search result", async () => {
  const view = render(checklist("/set/cel25c?filter=owned&q=Charizard"));
  expect(view.getByRole("link", { name: "Visa Charizard #4" })).toBeTruthy();
  expect(view.queryByRole("link", { name: "Visa Venusaur #15" })).toBeNull();
  const dialog = openList(view);
  for (const card of catalog.slice(0, 3))
    expect(within(dialog).getByText(card.name, { exact: false })).toBeTruthy();
  expect(within(dialog).queryByText("Charizard", { exact: false })).toBeNull();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Kopiera lista" }),
  );
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledOnce());
  const text = mocks.copy.mock.calls[0][0] as string;
  expect(text).toContain(set.name);
  for (const card of catalog.slice(0, 3)) expect(text).toContain(card.name);
  expect(
    text.split("\n").filter((line) => line.startsWith("#15 ")),
  ).toHaveLength(2);
  expect(text).not.toContain("Charizard");
  expect(text).not.toContain("PRIVAT TEST");
  await waitFor(() =>
    expect(within(dialog).getByRole("status").textContent).toMatch(/kopier/i),
  );
});

it("keeps reprints with the same printed number distinct and marks ownership by catalogue ID", async () => {
  mocks.collection = state({ cards: [owned(catalog[0]), owned(catalog[3])] });
  const view = render(checklist());
  const dialog = openList(view);
  expect(within(dialog).queryByText("Venusaur", { exact: false })).toBeNull();
  expect(
    within(dialog).getByText("Rocket's Zapdos", { exact: false }),
  ).toBeTruthy();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Kopiera lista" }),
  );
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledOnce());
  const text = mocks.copy.mock.calls[0][0] as string;
  expect(text).toContain(catalog[1].name);
  expect(text).not.toContain(catalog[0].name);
});

it("reports clipboard failure without claiming success and permits a retry", async () => {
  mocks.copy.mockRejectedValueOnce(new Error("Clipboard denied"));
  const view = render(checklist());
  const dialog = openList(view);
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Kopiera lista" }),
  );
  expect((await within(dialog).findByRole("alert")).textContent).toMatch(
    /kopier|urklipp/i,
  );
  expect(within(dialog).queryByRole("status")?.textContent ?? "").not.toMatch(
    /kopierad|kopierade|kopierat/i,
  );
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Kopiera lista" }),
  );
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(within(dialog).getByRole("status").textContent).toMatch(/kopier/i),
  );
});

it("downloads the current complete text list and revokes its temporary Blob URL", async () => {
  const view = render(checklist("/set/cel25c?filter=owned&q=Charizard"));
  const dialog = openList(view);
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Ladda ner textfil" }),
  );
  await waitFor(() => expect(mocks.createUrl).toHaveBeenCalledOnce());
  const blob = mocks.createUrl.mock.calls[0][0] as Blob;
  expect(blob.type).toMatch(/^text\/plain/i);
  const text = await blobText(blob);
  for (const card of catalog.slice(0, 3)) expect(text).toContain(card.name);
  expect(text).not.toContain("Charizard");
  expect(text).not.toContain("PRIVAT TEST");
  expect(downloaded).toMatchObject({ href: "blob:missing-cards-test" });
  expect(downloaded?.filename).toMatch(/\.txt$/i);
  await waitFor(
    () =>
      expect(mocks.revokeUrl).toHaveBeenCalledWith("blob:missing-cards-test"),
    { timeout: 2500 },
  );
});

it.each([
  ["loading", { isLoading: true }],
  ["failed ownership", { error: "Samlingen kunde inte läsas" }],
  ["complete collection", { cards: catalog.map(owned) }],
] as const)(
  "does not offer a usable takeaway action for %s",
  (_reason, overrides) => {
    mocks.collection = state(overrides);
    const view = render(checklist());
    const button = view.queryByRole("button", { name: "Lista att ta med" });
    expect(button === null || (button as HTMLButtonElement).disabled).toBe(
      true,
    );
    if (button) fireEvent.click(button);
    expect(view.queryByRole("dialog", { name: "Saknade kort" })).toBeNull();
    expect(mocks.copy).not.toHaveBeenCalled();
    expect(mocks.createUrl).not.toHaveBeenCalled();
  },
);

it("stops exposing an old owner's open list during loading and then uses the new collection", async () => {
  const view = render(checklist());
  openList(view);
  mocks.collection = state({ owner: "test-owner-b", isLoading: true });
  view.rerender(checklist());
  const staleDialog = view.queryByRole("dialog", { name: "Saknade kort" });
  if (staleDialog) {
    for (const card of catalog.slice(0, 3))
      expect(
        within(staleDialog).queryByText(card.name, { exact: false }),
      ).toBeNull();
    for (const label of ["Kopiera lista", "Ladda ner textfil"]) {
      const action = within(staleDialog).queryByRole("button", { name: label });
      expect(action === null || (action as HTMLButtonElement).disabled).toBe(
        true,
      );
    }
  }
  mocks.collection = state({
    owner: "test-owner-b",
    cards: [owned(catalog[1])],
  });
  view.rerender(checklist());
  const dialog =
    view.queryByRole("dialog", { name: "Saknade kort" }) ?? openList(view);
  expect(within(dialog).getByText("Charizard", { exact: false })).toBeTruthy();
  expect(within(dialog).getByText("Venusaur", { exact: false })).toBeTruthy();
  expect(
    within(dialog).queryByText("Rocket's Zapdos", { exact: false }),
  ).toBeNull();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Kopiera lista" }),
  );
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledOnce());
  expect(mocks.copy.mock.calls[0][0]).toContain(catalog[3].name);
  expect(mocks.copy.mock.calls[0][0]).not.toContain(catalog[1].name);
});

it("refreshes an already open list and copied snapshot after ownership changes", async () => {
  const view = render(checklist());
  openList(view);
  mocks.collection = state({ cards: [owned(catalog[0]), owned(catalog[3])] });
  view.rerender(checklist());
  const dialog = view.getByRole("dialog", { name: "Saknade kort" });
  expect(within(dialog).queryByText("Venusaur", { exact: false })).toBeNull();
  expect(
    within(dialog).getByText("Rocket's Zapdos", { exact: false }),
  ).toBeTruthy();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Kopiera lista" }),
  );
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledOnce());
  expect(mocks.copy.mock.calls[0][0]).not.toContain(catalog[0].name);
  expect(mocks.copy.mock.calls[0][0]).toContain(catalog[1].name);
});

it("ignores a delayed clipboard result after closing and reopening the list", async () => {
  let finishCopy!: () => void;
  mocks.copy.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishCopy = resolve;
      }),
  );
  const view = render(checklist());
  const first = openList(view);
  fireEvent.click(within(first).getByRole("button", { name: "Kopiera lista" }));
  expect(
    (
      within(first).getByRole("button", {
        name: "Kopiera lista",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(within(first).getByRole("button", { name: "Stäng" }));
  expect(view.queryByRole("dialog", { name: "Saknade kort" })).toBeNull();
  const reopened = openList(view);
  await act(async () => {
    finishCopy();
  });
  expect(within(reopened).getByRole("status").textContent).toBe("");
  expect(within(reopened).queryByRole("alert")).toBeNull();
  expect(
    (
      within(reopened).getByRole("button", {
        name: "Kopiera lista",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
  fireEvent.click(
    within(reopened).getByRole("button", { name: "Kopiera lista" }),
  );
  await waitFor(() =>
    expect(within(reopened).getByRole("status").textContent).toMatch(/kopier/i),
  );
});

it("makes export unavailable when the currently open list becomes complete", () => {
  const view = render(checklist());
  openList(view);
  mocks.collection = state({ cards: catalog.map(owned) });
  view.rerender(checklist());
  const dialog = view.queryByRole("dialog", { name: "Saknade kort" });
  if (dialog) {
    expect(within(dialog).getByText("Setet är komplett!")).toBeTruthy();
    for (const label of ["Kopiera lista", "Ladda ner textfil"]) {
      const button = within(dialog).queryByRole("button", { name: label });
      expect(button === null || (button as HTMLButtonElement).disabled).toBe(
        true,
      );
      if (button) fireEvent.click(button);
    }
  }
  expect(mocks.copy).not.toHaveBeenCalled();
  expect(mocks.createUrl).not.toHaveBeenCalled();
});
