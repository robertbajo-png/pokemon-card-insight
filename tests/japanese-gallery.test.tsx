import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Gallery from "@/pages/Gallery";
import SetDetail from "@/pages/SetDetail";
import CardDetail from "@/pages/CardDetail";
import { scannedCardSchema } from "@/lib/cardAnalysis";
import {
  catalogueNavigationState,
  catalogueReturn,
} from "@/lib/catalogueNavigation";

const fixtures = vi.hoisted(() => {
  const makeSet = (
    id: string,
    name: string,
    series: string,
    setCode: string,
    releaseDate: string,
  ) => ({
    id,
    name,
    canonicalName: name,
    series,
    setCode,
    releaseDate,
    totalCards: 100,
    aliases: [name],
    codeAliases: [setCode],
    logo: "",
  });
  const international = [
    makeSet("base1", "Base Set", "Original Series", "BS", "1999-01-09"),
    makeSet("sv3pt5", "151", "Scarlet & Violet Series", "MEW", "2023-09-22"),
    makeSet(
      "swsh45",
      "Shining Fates",
      "Sword & Shield Series",
      "SHF",
      "2021-02-19",
    ),
  ];
  const japanese = [
    {
      ...makeSet(
        "jp-s4a",
        "Shiny Star V (Japan)",
        "Japanese Special Sets",
        "S4a",
        "2020-11-20",
      ),
      region: "jp" as const,
      language: "ja" as const,
      nativeName: "シャイニースターV",
    },
    {
      ...makeSet(
        "jp-sv2a",
        "Pokémon Card 151 (Japan)",
        "Scarlet & Violet Series",
        "SV2a",
        "2023-06-16",
      ),
      region: "jp" as const,
      language: "ja" as const,
      nativeName: "ポケモンカード151",
      logo: "https://example.test/japanese-151.png",
    },
  ];
  return { international, japanese, all: [...international, ...japanese] };
});
const mocks = vi.hoisted(() => ({
  collection: null as unknown,
  getAllSets: vi.fn(),
  getSetById: vi.fn(),
  getCardsBySet: vi.fn(),
  getCardById: vi.fn(),
  addCard: vi.fn(),
  updateCard: vi.fn(),
  removeCard: vi.fn(),
  clearCards: vi.fn(),
}));
vi.mock("@/data/pokemonSets", () => ({
  pokemonSets: fixtures.all,
  internationalPokemonSets: fixtures.international,
  japanesePokemonSets: fixtures.japanese,
  legacySetMappings: [],
}));
vi.mock("@/components/Navigation", () => ({ default: () => <nav /> }));
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

const japaneseSet = fixtures.japanese[1];
const remoteSet = {
  ...japaneseSet,
  total: 1,
  printedTotal: 1,
  images: { logo: "", symbol: "" },
};
const japaneseCard = {
  id: "jp-sv2a-001",
  name: "フシギダネ",
  number: "001",
  set: remoteSet,
  language: "ja",
  images: { small: "", large: "" },
};
const collection = () => ({
  owner: "guest",
  isLoading: false,
  error: null,
  conflicts: [],
  cards: [
    scannedCardSchema.parse({
      id: "card-fixture-base",
      name: "Alakazam",
      set: "Base Set",
      setId: "base1",
      catalogId: "base1-1",
      number: "1",
      scannedAt: "2026-11-08T10:00:00.000Z",
    }),
    scannedCardSchema.parse({
      id: "card-fixture-japanese",
      name: japaneseCard.name,
      set: japaneseSet.name,
      setId: japaneseSet.id,
      catalogId: japaneseCard.id,
      number: japaneseCard.number,
      language: "ja",
      scannedAt: "2026-11-08T10:00:00.000Z",
    }),
  ],
  addCard: mocks.addCard,
  updateCard: mocks.updateCard,
  removeCard: mocks.removeCard,
  clearCards: mocks.clearCards,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.collection = collection();
  mocks.getAllSets.mockResolvedValue([]);
  mocks.getSetById.mockResolvedValue(remoteSet);
  mocks.getCardsBySet.mockResolvedValue({
    data: [japaneseCard],
    totalCount: 1,
  });
  mocks.getCardById.mockResolvedValue(japaneseCard);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network request in Japanese Gallery test.");
    }),
  );
});
afterEach(() => {
  cleanup();
  expect(fetch).not.toHaveBeenCalled();
  for (const mutation of [
    mocks.addCard,
    mocks.updateCard,
    mocks.removeCard,
    mocks.clearCards,
  ])
    expect(mutation).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{location.pathname + location.search}</div>
  );
}
function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/set/:setId" element={<SetDetail />} />
        <Route path="/card/:id" element={<CardDetail />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}
function params(view: ReturnType<typeof render>) {
  return new URLSearchParams(
    view.getByTestId("location").textContent!.split("?")[1] ?? "",
  );
}
function japanSwitch(view: ReturnType<typeof render>) {
  return view.getByRole("switch", { name: "Visa japanska specialset" });
}

it("defaults to international sets and adds Japanese sets through the URL-backed switch", () => {
  const view = renderAt("/gallery");
  expect(japanSwitch(view).getAttribute("aria-checked")).toBe("false");
  expect(
    view.getByText(`${fixtures.international.length} set`, { exact: true }),
  ).toBeTruthy();
  expect(
    view.queryByRole("button", { name: `Öppna ${japaneseSet.name}` }),
  ).toBeNull();
  fireEvent.click(japanSwitch(view));
  expect(params(view).get("japan")).toBe("1");
  expect(japanSwitch(view).getAttribute("aria-checked")).toBe("true");
  expect(
    view.getByText(`${fixtures.all.length} set`, { exact: true }),
  ).toBeTruthy();
  for (const set of fixtures.all)
    expect(
      view.getByRole("button", { name: `Öppna ${set.name}` }),
    ).toBeTruthy();
  expect(view.getAllByText("Japan", { exact: true })).toHaveLength(
    fixtures.japanese.length,
  );
  expect(
    view.getByText(fixtures.japanese[0].nativeName).getAttribute("lang"),
  ).toBe("ja");
  expect(
    view.getByText(
      `${fixtures.japanese.length} verifierade japanska specialset. Bilder saknas för vissa kort.`,
    ),
  ).toBeTruthy();
});

it("restores the Japanese scope from a direct library URL", () => {
  const view = renderAt("/gallery?japan=1");
  expect(japanSwitch(view).getAttribute("aria-checked")).toBe("true");
  expect(
    view.getByRole("button", { name: `Öppna ${japaneseSet.name}` }),
  ).toBeTruthy();
  expect(view.getByRole("button", { name: "Öppna Base Set" })).toBeTruthy();
});

it("puts the newly enabled Japanese sets first so the toggle reveals them immediately", () => {
  const view = renderAt("/gallery");
  fireEvent.click(japanSwitch(view));
  const cards = view.getAllByRole("button", { name: /^Öppna / });
  expect(
    cards
      .slice(0, fixtures.japanese.length)
      .map((button) => button.getAttribute("aria-label")),
  ).toEqual([
    `Öppna ${fixtures.japanese[1].name}`,
    `Öppna ${fixtures.japanese[0].name}`,
  ]);
  expect(view.getByText("Japanska set först")).toBeTruthy();
});

it.each([
  ["shiny star", "Shiny Star V (Japan)"],
  ["シャイニースター", "Shiny Star V (Japan)"],
  ["s4a", "Shiny Star V (Japan)"],
  ["jp-s4a", "Shiny Star V (Japan)"],
  ["pokemon card 151", "Pokémon Card 151 (Japan)"],
  ["ポケモンカード151", "Pokémon Card 151 (Japan)"],
])("searches %s within the included Japanese scope", (query, name) => {
  const view = renderAt(
    `/gallery?${new URLSearchParams({ japan: "1", q: query })}`,
  );
  expect(view.getByRole("button", { name: `Öppna ${name}` })).toBeTruthy();
  expect(view.getByText("1 set", { exact: true })).toBeTruthy();
});

it("counts owned sets only inside the active library scope", () => {
  const view = renderAt("/gallery?mina=1");
  let mine = view.getByRole("button", { name: /Mina set/ });
  expect(within(mine).getByText("1", { exact: true })).toBeTruthy();
  expect(view.getByRole("button", { name: "Öppna Base Set" })).toBeTruthy();
  fireEvent.click(japanSwitch(view));
  mine = view.getByRole("button", { name: /Mina set/ });
  expect(within(mine).getByText("2", { exact: true })).toBeTruthy();
  expect(mine.getAttribute("aria-pressed")).toBe("true");
  expect(params(view).get("mina")).toBe("1");
  expect(view.getByText("2 set", { exact: true })).toBeTruthy();
  expect(
    view.getByRole("button", { name: `Öppna ${japaneseSet.name}` }),
  ).toBeTruthy();
  fireEvent.click(japanSwitch(view));
  expect(params(view).get("mina")).toBe("1");
  expect(view.getByText("1 set", { exact: true })).toBeTruthy();
  expect(
    view.queryByRole("button", { name: `Öppna ${japaneseSet.name}` }),
  ).toBeNull();
});

it("accepts a Japanese-only series only while Japan is included and resets it when excluded", () => {
  const view = renderAt(
    `/gallery?${new URLSearchParams({ serie: fixtures.japanese[0].series })}`,
  );
  expect(
    view.getByRole("combobox", { name: "Filtrera efter serie" }).textContent,
  ).toContain("Alla serier");
  expect(
    view.getByText(`${fixtures.international.length} set`, { exact: true }),
  ).toBeTruthy();
  fireEvent.click(japanSwitch(view));
  expect(
    view.getByRole("combobox", { name: "Filtrera efter serie" }).textContent,
  ).toContain(fixtures.japanese[0].series);
  expect(view.getByText("1 set", { exact: true })).toBeTruthy();
  fireEvent.click(japanSwitch(view));
  expect(params(view).has("serie")).toBe(false);
  expect(
    view.getByRole("combobox", { name: "Filtrera efter serie" }).textContent,
  ).toContain("Alla serier");
});

it("preserves search and owned filters when Japan is toggled and keeps Japan when filters are cleared", () => {
  const view = renderAt(
    `/gallery?${new URLSearchParams({ japan: "1", q: "151", serie: "Scarlet & Violet Series", mina: "1" })}`,
  );
  fireEvent.click(japanSwitch(view));
  expect(params(view).get("q")).toBe("151");
  expect(params(view).get("mina")).toBe("1");
  expect(params(view).get("serie")).toBe("Scarlet & Violet Series");
  fireEvent.click(japanSwitch(view));
  fireEvent.click(view.getByRole("button", { name: "Rensa filter" }));
  expect(params(view).get("japan")).toBe("1");
  for (const key of ["q", "serie", "mina"])
    expect(params(view).has(key)).toBe(false);
  expect(japanSwitch(view).getAttribute("aria-checked")).toBe("true");
  expect(
    view.getByText(`${fixtures.all.length} set`, { exact: true }),
  ).toBeTruthy();
});

it("keeps Japanese metadata and artwork when international decorative logos arrive", async () => {
  mocks.getAllSets.mockResolvedValue([
    {
      ...fixtures.international[0],
      images: {
        logo: "https://example.test/international-base.png",
        symbol: "",
      },
    },
  ]);
  const view = renderAt("/gallery?japan=1");
  await waitFor(() =>
    expect(
      view
        .getByRole("button", { name: "Öppna Base Set" })
        .querySelector("img")
        ?.getAttribute("src"),
    ).toBe("https://example.test/international-base.png"),
  );
  expect(
    view
      .getByRole("button", { name: `Öppna ${japaneseSet.name}` })
      .querySelector("img")
      ?.getAttribute("src"),
  ).toBe(japaneseSet.logo);
  expect(
    view.getByText(`${fixtures.all.length} set`, { exact: true }),
  ).toBeTruthy();
});

it("keeps Japan, search, series and ownership through a real set-card-back round trip", async () => {
  const view = renderAt(
    `/gallery?${new URLSearchParams({ japan: "1", q: "151", serie: japaneseSet.series, mina: "1" })}`,
  );
  fireEvent.click(
    view.getByRole("button", { name: `Öppna ${japaneseSet.name}` }),
  );
  await view.findByRole("heading", { name: japaneseSet.name });
  fireEvent.click(
    await view.findByRole("link", { name: `Visa ${japaneseCard.name} #001` }),
  );
  await view.findByRole("heading", { name: japaneseCard.name });
  fireEvent.click(
    view.getByRole("link", { name: "Tillbaka till checklistan" }),
  );
  await view.findByRole("heading", { name: japaneseSet.name });
  fireEvent.click(view.getByRole("link", { name: "Tillbaka till galleriet" }));
  await view.findByRole("heading", { name: "Alla set" });
  expect(japanSwitch(view).getAttribute("aria-checked")).toBe("true");
  expect(params(view).get("japan")).toBe("1");
  expect(params(view).get("q")).toBe("151");
  expect(params(view).get("serie")).toBe(japaneseSet.series);
  expect(params(view).get("mina")).toBe("1");
  expect(
    view.getByRole("button", { name: /Mina set/ }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    view.getByRole("button", { name: `Öppna ${japaneseSet.name}` }),
  ).toBeTruthy();
  expect(
    view.queryByRole("button", { name: "Öppna 151", exact: true }),
  ).toBeNull();
});

it("allowlists japan=1 only in Gallery return context and drops unrelated redirect parameters", () => {
  const state = catalogueNavigationState({
    pathname: "/set/jp-sv2a",
    search: "?filter=owned&japan=1",
    state: {
      gallerySearch: "japan=1&q=151&mina=1&redirect=https://example.test",
    },
  });
  const back = catalogueReturn(state, "/gallery");
  expect(back.to).toBe("/set/jp-sv2a?filter=owned");
  const gallery = new URLSearchParams(back.state?.gallerySearch);
  expect(gallery.get("japan")).toBe("1");
  expect(gallery.get("q")).toBe("151");
  expect(gallery.get("mina")).toBe("1");
  expect(gallery.has("redirect")).toBe(false);
  expect(
    catalogueReturn(
      {
        catalogueReturn: {
          to: "/gallery?japan=0&redirect=https://example.test",
        },
      },
      "/gallery",
    ).to,
  ).toBe("/gallery");
});
