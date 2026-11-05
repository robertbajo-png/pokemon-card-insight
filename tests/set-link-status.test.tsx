import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Collection from "@/pages/Collection";
import ScannedCardDetail from "@/components/ScannedCardDetail";
import SetLinkStatus from "@/components/SetLinkStatus";
import { scannedCardSchema, type ScannedCard } from "@/lib/cardAnalysis";
import { resolveSetId, setLinkStatus, setProgress } from "@/lib/collection";
import { pokemonSets } from "@/data/pokemonSets";
import type { PokemonCard } from "@/services/pokemonTcgApi";

const mocks = vi.hoisted(() => ({
  cards: [] as ScannedCard[],
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@/components/Navigation", () => ({ default: () => <nav /> }));
vi.mock("@/components/CollectionSyncStatus", () => ({ default: () => null }));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ currency: "SEK" }),
}));
vi.mock("@/hooks/useScannedCards", () => ({
  useScannedCards: () => ({
    cards: mocks.cards,
    owner: "guest",
    isLoading: false,
    error: null,
    conflicts: [],
    addCard: mocks.add,
    updateCard: mocks.update,
    removeCard: mocks.remove,
    clearCards: mocks.clear,
  }),
}));

const card = (input: Partial<ScannedCard> = {}) =>
  scannedCardSchema.parse({
    id: "card-fixture",
    name: "Pikachu",
    number: "58",
    set: "Base Set",
    scannedAt: "2026-09-17T00:00:00.000Z",
    ...input,
  });
const conflict = card({
  id: "card-conflict",
  number: "18",
  set: "Paldean Fates",
  setId: "sv5",
  setCode: "PAF",
  catalogId: "sv5-18",
});
const custom = card({
  id: "card-custom",
  name: "Eevee",
  set: "Family Custom Set",
  setCode: "FAMILY",
});
const linked = card({
  id: "card-linked",
  name: "Alakazam",
  number: "1",
  setId: "base1",
  setCode: "BS",
});

function SavedCardRoute() {
  const { id } = useParams();
  return <ScannedCardDetail id={id!} />;
}
function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname + location.search}
    </output>
  );
}
function renderCollection(url = "/collection") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/collection" element={<Collection />} />
        <Route path="/card/:id" element={<SavedCardRoute />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cards = [conflict, custom, linked];
  mocks.update.mockImplementation(
    async (id: string, changes: Partial<ScannedCard>) => {
      mocks.cards = mocks.cards.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      );
    },
  );
});
afterEach(() => {
  cleanup();
  expect(mocks.add).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.clear).not.toHaveBeenCalled();
});

describe("set linking without guessing user intent", () => {
  it.each([
    [
      "recognized name/code conflict",
      { set: "Base Set", setCode: "B2" },
      "unlinked",
    ],
    [
      "canonical ID with the wrong catalogue prefix",
      { setId: "base1", setCode: "BS", catalogId: "sv5-58" },
      "unlinked",
    ],
    [
      "ID outside the pinned catalogue",
      { set: "Family Custom Set", setId: "future42" },
      "unlinked",
    ],
    [
      "a code shared by main set and gallery",
      { set: "Unknown", setCode: "BRS" },
      "unlinked",
    ],
    ["the schema's unknown placeholder", { set: "Unknown" }, "unlinked"],
    [
      "unknown custom labels without asserted IDs",
      { set: "Family Custom Set", setCode: "FAMILY" },
      "outside-catalogue",
    ],
    [
      "an older supported display alias",
      { set: "EX FireRed & LeafGreen", setCode: "RG" },
      "linked",
    ],
    [
      "a supported legacy set ID",
      { set: "Legendary Collection", setId: "lc1", setCode: "LC" },
      "linked",
    ],
  ] as const)("classifies %s", (_name, input, expected) => {
    expect(setLinkStatus(card(input))).toBe(expected);
  });

  it("presents an unknown custom set neutrally and leaves supported aliases unmarked", () => {
    const review = vi.fn();
    const view = render(
      <SetLinkStatus card={custom} onReview={review} showDescription />,
    );
    expect(view.getByText("Utanför katalogen")).toBeTruthy();
    expect(view.queryByRole("button")).toBeNull();
    expect(view.getByText(/Kortet är sparat i din samling/)).toBeTruthy();
    view.rerender(
      <SetLinkStatus
        card={card({ set: "Base" })}
        onReview={review}
        showDescription
      />,
    );
    expect(view.container.textContent).toBe("");
    expect(review).not.toHaveBeenCalled();
  });
});

describe("reviewing set links in the collection", () => {
  it("filters only cards needing review and can open/cancel the existing editor without writing", async () => {
    const before = JSON.stringify(mocks.cards);
    const view = renderCollection("/collection?q=Eevee");
    expect(
      view.getByRole("option", { name: "Kontrollera set (1)" }),
    ).toBeTruthy();
    fireEvent.click(
      view.getByRole("button", { name: "Visa kort att kontrollera" }),
    );
    expect(view.getByTestId("location").textContent).toBe(
      "/collection?filter=unlinked",
    );
    expect(view.getByRole("heading", { name: "Pikachu" })).toBeTruthy();
    expect(view.queryByRole("heading", { name: "Eevee" })).toBeNull();
    expect(view.queryByRole("heading", { name: "Alakazam" })).toBeNull();
    fireEvent.click(
      view.getByRole("button", { name: "Kontrollera set för Pikachu" }),
    );
    expect(view.getByRole("dialog")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(mocks.update).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.cards)).toBe(before);
  });

  it("explains the saved card's status and returns to the same review filter without writing", async () => {
    const view = renderCollection("/collection?filter=unlinked");
    fireEvent.click(view.getByRole("link", { name: "Pikachu", exact: true }));
    expect(view.getByText(/Kortet är sparat men räknas inte/)).toBeTruthy();
    fireEvent.click(
      view.getByRole("button", { name: "Kontrollera set för Pikachu" }),
    );
    fireEvent.click(view.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    fireEvent.click(
      view.getByRole("link", { name: "Tillbaka till samlingen" }),
    );
    expect(view.getByTestId("location").textContent).toBe(
      "/collection?filter=unlinked",
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ["Paldean Fates historical conflict", conflict, "sv4pt5"],
    [
      "correct Base ID but wrong catalogue prefix",
      card({
        id: "card-prefix",
        setId: "base1",
        setCode: "BS",
        catalogId: "sv5-58",
      }),
      "base1",
    ],
  ] as const)(
    "preserves evidence during inventory edits and counts an explicit fix for %s",
    async (_name, source, correctId) => {
      mocks.cards = [source];
      const view = renderCollection("/collection?filter=unlinked");
      fireEvent.click(
        view.getByRole("button", { name: "Kontrollera set för Pikachu" }),
      );
      fireEvent.change(view.getByLabelText("Antal"), {
        target: { value: "3" },
      });
      fireEvent.change(view.getByLabelText("Anteckningar"), {
        target: { value: "Kontrollera setet" },
      });
      fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
      await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
      expect(mocks.update).toHaveBeenCalledOnce();
      expect(mocks.cards[0]).toMatchObject({
        set: source.set,
        setId: source.setId,
        setCode: source.setCode,
        catalogId: source.catalogId,
        quantity: 3,
        notes: "Kontrollera setet",
      });
      expect(setLinkStatus(mocks.cards[0])).toBe("unlinked");

      fireEvent.click(
        view.getByRole("button", { name: "Kontrollera set för Pikachu" }),
      );
      fireEvent.change(view.getByLabelText("Set", { exact: true }), {
        target: { value: correctId },
      });
      fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
      await view.findByText("Inga kort behöver setkontroll.");
      expect(mocks.update).toHaveBeenCalledTimes(2);
      expect(mocks.cards[0].catalogId).toBeUndefined();
      expect(resolveSetId(mocks.cards[0])).toBe(correctId);
      expect(setLinkStatus(mocks.cards[0])).toBe("linked");
      expect(
        view.getByRole("option", { name: "Kontrollera set (0)" }),
      ).toBeTruthy();
      const canonical = pokemonSets.find((set) => set.id === correctId)!;
      const catalogue = [
        {
          id: `${correctId}-${source.number}`,
          name: source.name,
          number: source.number,
          set: {
            id: correctId,
            name: canonical.canonicalName,
            series: canonical.series,
          },
          images: { small: "", large: "" },
        },
      ] as PokemonCard[];
      expect(setProgress(mocks.cards, canonical, catalogue)).toMatchObject({
        ownedCount: 1,
        total: 1,
        missing: 0,
      });
    },
  );
});
