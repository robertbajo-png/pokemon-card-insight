import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Gallery from "@/pages/Gallery";
import Collection from "@/pages/Collection";
import SetDetail from "@/pages/SetDetail";
import CardDetail from "@/pages/CardDetail";
import { scannedCardSchema } from "@/lib/cardAnalysis";
import {
  catalogueNavigationState,
  catalogueReturn,
} from "@/lib/catalogueNavigation";
import type { PokemonCard } from "@/services/pokemonTcgApi";

const mocks = vi.hoisted(() => ({
  collection: null as unknown,
  getAllSets: vi.fn(),
  getSetById: vi.fn(),
  getCardsBySet: vi.fn(),
  getCardById: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@/components/Navigation", () => ({ default: () => <nav /> }));
vi.mock("@/components/CollectionSyncStatus", () => ({ default: () => null }));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ currency: "SEK", setCurrency: vi.fn() }),
}));
vi.mock("@/hooks/useScannedCards", () => ({
  useScannedCards: () => mocks.collection,
}));
vi.mock("@/services/pokemonTcgApi", () => ({
  getAllSets: mocks.getAllSets,
  getSetById: mocks.getSetById,
  getCardsBySet: mocks.getCardsBySet,
  getCardById: mocks.getCardById,
}));

const base = {
  id: "base1",
  name: "Base",
  series: "Base",
  total: 102,
  printedTotal: 102,
  releaseDate: "1999/01/09",
  images: { logo: "", symbol: "" },
};
const catalogue: PokemonCard[] = [
  {
    id: "base1-58",
    name: "Pikachu",
    number: "58",
    set: base,
    images: { small: "", large: "" },
  },
  {
    id: "base1-1",
    name: "Alakazam",
    number: "1",
    set: base,
    images: { small: "", large: "" },
  },
];
const pikachu = scannedCardSchema.parse({
  id: "card-pikachu",
  name: "Pikachu",
  number: "58",
  set: "Base Set",
  setId: "base1",
  catalogId: "base1-58",
  scannedAt: "2026-09-17T00:00:00.000Z",
  quantity: 2,
});
const alakazam = scannedCardSchema.parse({
  ...pikachu,
  id: "card-alakazam",
  name: "Alakazam",
  number: "1",
  quantity: 1,
  catalogId: "base1-1",
});

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">
        {location.pathname + location.search}
      </output>
      <button onClick={() => navigate(-1)}>Webbläsarens tillbaka</button>
    </>
  );
}
function renderAt(
  initialEntries: ComponentProps<typeof MemoryRouter>["initialEntries"],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/set/:setId" element={<SetDetail />} />
        <Route path="/card/:id" element={<CardDetail />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAllSets.mockResolvedValue([]);
  mocks.getSetById.mockResolvedValue(base);
  mocks.getCardsBySet.mockResolvedValue({
    data: catalogue,
    totalCount: catalogue.length,
  });
  mocks.getCardById.mockImplementation(async (id: string) =>
    catalogue.find((card) => card.id === id),
  );
  mocks.collection = {
    cards: [pikachu, alakazam],
    owner: "guest",
    isLoading: false,
    error: null,
    conflicts: [],
    addCard: mocks.add,
    updateCard: mocks.update,
    removeCard: mocks.remove,
    clearCards: mocks.clear,
  };
});
afterEach(() => {
  cleanup();
  expect(mocks.add).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.clear).not.toHaveBeenCalled();
});

describe("searching the complete set library", () => {
  it.each([
    ["pokemon go", "Pokémon GO"],
    ["PR-XY", "XY Promos"],
    ["HS—Unleashed", "Unleashed"],
    ["sv4pt5", "Paldean Fates"],
  ])(
    "finds %s using diacritics, source names, codes or canonical IDs",
    async (query, name) => {
      const view = renderAt([`/gallery?q=${encodeURIComponent(query)}`]);
      expect(
        await view.findByRole("button", { name: `Öppna ${name}` }),
      ).toBeTruthy();
    },
  );

  it("writes search text to the URL even when the literal search is 'all'", () => {
    const view = renderAt(["/gallery?serie=Original+Series"]);
    fireEvent.change(view.getByLabelText("Sök efter set..."), {
      target: { value: "all" },
    });
    const params = new URLSearchParams(
      view.getByTestId("location").textContent!.split("?")[1],
    );
    expect(params.get("q")).toBe("all");
    expect(params.get("serie")).toBe("Original Series");
  });
});

describe("returning from a card without losing the current view", () => {
  it("restores collection search and duplicate filtering after opening a saved card", async () => {
    const view = renderAt(["/collection?q=Pikachu&filter=duplicates"]);
    expect(
      (view.getByLabelText("Sök i samlingen") as HTMLInputElement).value,
    ).toBe("Pikachu");
    expect((view.getByLabelText("Visa kort") as HTMLSelectElement).value).toBe(
      "duplicates",
    );
    fireEvent.click(view.getByRole("link", { name: "Pikachu", exact: true }));
    expect(await view.findByRole("heading", { name: "Pikachu" })).toBeTruthy();
    const back = view.getByRole("link", { name: "Tillbaka till samlingen" });
    expect(back.getAttribute("href")).toBe(
      "/collection?q=Pikachu&filter=duplicates",
    );
    fireEvent.click(back);
    expect(
      ((await view.findByLabelText("Sök i samlingen")) as HTMLInputElement)
        .value,
    ).toBe("Pikachu");
    expect((view.getByLabelText("Visa kort") as HTMLSelectElement).value).toBe(
      "duplicates",
    );
    expect(
      view.queryByRole("link", { name: "Alakazam", exact: true }),
    ).toBeNull();
  });

  it("keeps the collection filters in the recovery link when a saved card is no longer available", () => {
    const view = renderAt([
      {
        pathname: "/card/card-missing",
        state: catalogueNavigationState({
          pathname: "/collection",
          search: "?q=Pikachu&filter=duplicates",
        }),
      },
    ]);
    expect(
      view.getByRole("heading", { name: "Här var det tomt." }),
    ).toBeTruthy();
    expect(
      view.getByRole("link", { name: "Öppna samlingen" }).getAttribute("href"),
    ).toBe("/collection?q=Pikachu&filter=duplicates");
  });

  it("keeps checklist filters through browser back, card back and the nested gallery return", async () => {
    mocks.collection = { ...(mocks.collection as object), cards: [pikachu] };
    const view = renderAt(["/gallery?q=base&serie=Original+Series"]);
    fireEvent.click(
      view.getByRole("button", { name: "Öppna Base Set", exact: true }),
    );
    fireEvent.click(
      await view.findByRole("button", { name: "Saknade", exact: true }),
    );
    fireEvent.change(view.getByLabelText("Sök i checklistan"), {
      target: { value: "Alakazam" },
    });
    const checklistUrl = view.getByTestId("location").textContent!;
    expect(new URLSearchParams(checklistUrl.split("?")[1]).get("filter")).toBe(
      "missing",
    );

    fireEvent.click(view.getByRole("link", { name: "Visa Alakazam #1" }));
    await view.findByRole("heading", { name: "Alakazam" });
    fireEvent.click(
      view.getByRole("button", { name: "Webbläsarens tillbaka" }),
    );
    expect(
      ((await view.findByLabelText("Sök i checklistan")) as HTMLInputElement)
        .value,
    ).toBe("Alakazam");
    expect(
      view
        .getByRole("button", { name: "Saknade", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(view.getByRole("link", { name: "Visa Alakazam #1" }));
    await view.findByRole("heading", { name: "Alakazam" });
    const setLink = view.getByRole("link", { name: "Visa setet" });
    expect(setLink.getAttribute("href")).toContain("filter=missing");
    fireEvent.click(setLink);
    expect(
      ((await view.findByLabelText("Sök i checklistan")) as HTMLInputElement)
        .value,
    ).toBe("Alakazam");
    fireEvent.click(view.getByRole("link", { name: "Visa Alakazam #1" }));
    await view.findByRole("heading", { name: "Alakazam" });
    fireEvent.click(
      view.getByRole("link", { name: "Tillbaka till checklistan" }),
    );
    await view.findByLabelText("Sök i checklistan");
    fireEvent.click(
      view.getByRole("link", { name: "Tillbaka till galleriet" }),
    );
    await waitFor(() =>
      expect(view.getByTestId("location").textContent).toBe(
        "/gallery?q=base&serie=Original+Series",
      ),
    );
    expect(
      (view.getByLabelText("Sök efter set...") as HTMLInputElement).value,
    ).toBe("base");
  });
});

describe("bounded internal return context", () => {
  it.each([
    "https://example.test/collection",
    "//example.test/collection",
    "javascript:alert(1)",
    "/login",
    "/set/base1/../../collection",
    "/set/%2Fexample.test",
  ])("rejects an arbitrary return target %s", (to) => {
    expect(catalogueReturn({ catalogueReturn: { to } }, "/collection").to).toBe(
      "/collection",
    );
  });

  it("carries only supported view filters and the existing nested gallery context", () => {
    const state = catalogueNavigationState({
      pathname: "/set/base1",
      search: "?q=Pikachu&filter=missing&redirect=https://example.test",
      state: {
        gallerySearch: "q=pokemon+go&mina=1&next=https://example.test",
        unrelated: "ignored",
      },
    });
    expect(catalogueReturn(state, "/gallery")).toEqual({
      to: "/set/base1?q=Pikachu&filter=missing",
      label: "Tillbaka till checklistan",
      state: { gallerySearch: "q=pokemon+go&mina=1" },
    });
  });
});
