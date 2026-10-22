import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Collection from "@/pages/Collection";
import SetChecklist from "@/components/SetChecklist";
import CollectionCardEditor from "@/components/CollectionCardEditor";
import { scannedCardSchema } from "@/lib/cardAnalysis";
import type { PokemonCard } from "@/services/pokemonTcgApi";

const mocks = vi.hoisted(() => ({
  value: null as unknown,
  save: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@/components/Navigation", () => ({ default: () => <nav /> }));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ currency: "SEK" }),
}));
vi.mock("@/hooks/useScannedCards", () => ({
  useScannedCards: () => mocks.value,
}));
const card = scannedCardSchema.parse({
  id: "card-test",
  name: "Pikachu",
  set: "Base Set",
  number: "58",
  scannedAt: "2026-10-22T10:00:00.000Z",
  quantity: 2,
  notes: "Min favorit",
  location: "Pärm 1",
});
const value = () => ({
  cards: [card],
  owner: "guest",
  isLoading: false,
  error: null,
  syncStatus: "local",
  syncError: null,
  pending: 0,
  localCount: 0,
  conflicts: [],
  lastSynced: null,
  addCard: mocks.save,
  updateCard: mocks.update,
  removeCard: mocks.remove,
  clearCards: mocks.clear,
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.value = value();
  mocks.save.mockResolvedValue(card);
  mocks.update.mockResolvedValue(undefined);
});
afterEach(cleanup);

it("edits inventory fields and keeps the dialog open on failed persistence", async () => {
  const view = render(
    <MemoryRouter>
      <Collection />
    </MemoryRouter>,
  );
  fireEvent.click(view.getByRole("button", { name: "Redigera Pikachu" }));
  fireEvent.change(view.getByLabelText("Antal"), { target: { value: "4" } });
  fireEvent.change(view.getByLabelText("Förvaringsplats"), {
    target: { value: "Pärm 2, sida 8" },
  });
  mocks.update.mockRejectedValueOnce(new Error("Lagringen är full"));
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await view.findByText("Lagringen är full");
  expect(view.getByRole("dialog")).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
  expect(mocks.update).toHaveBeenLastCalledWith(
    card.id,
    expect.objectContaining({
      quantity: 4,
      location: "Pärm 2, sida 8",
      notes: "Min favorit",
    }),
    card,
  );
});
it("keeps the opened snapshot when a background sync updates the editor's parent props", async () => {
  const view = render(
    <CollectionCardEditor card={card} open onOpenChange={vi.fn()} />,
  );
  fireEvent.change(view.getByLabelText("Antal"), { target: { value: "4" } });
  view.rerender(
    <CollectionCardEditor
      card={{ ...card, quantity: 7, notes: "Från andra enheten" }}
      open
      onOpenChange={vi.fn()}
    />,
  );
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith(
      card.id,
      expect.objectContaining({ quantity: 4 }),
      card,
    ),
  );
});
it("supports adding a card without a paid scan", async () => {
  const view = render(
    <MemoryRouter>
      <Collection />
    </MemoryRouter>,
  );
  fireEvent.click(view.getByRole("button", { name: "Lägg till kort" }));
  fireEvent.change(view.getByLabelText("Kortnamn"), {
    target: { value: "Eevee" },
  });
  fireEvent.change(view.getByLabelText("Kortnummer"), {
    target: { value: "51" },
  });
  fireEvent.change(view.getByLabelText("Set", { exact: true }), {
    target: { value: "base2" },
  });
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Eevee",
        set: "Jungle",
        setId: "base2",
        number: "51",
        quantity: 1,
      }),
    ),
  );
});
it("asks before deleting all copies and leaves data untouched when cancelled", async () => {
  const view = render(
    <MemoryRouter>
      <Collection />
    </MemoryRouter>,
  );
  fireEvent.click(view.getByRole("button", { name: "Ta bort Pikachu" }));
  expect(view.getByRole("alertdialog")).toBeTruthy();
  expect(mocks.remove).not.toHaveBeenCalled();
  fireEvent.click(view.getByRole("button", { name: "Avbryt" }));
  expect(mocks.remove).not.toHaveBeenCalled();
  fireEvent.click(view.getByRole("button", { name: "Ta bort Pikachu" }));
  fireEvent.click(view.getByRole("button", { name: "Ta bort", exact: true }));
  await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(card.id));
});
it("filters missing and duplicate cards and saves a real catalogue ID when checking ownership", async () => {
  const catalog = [
    {
      id: "base1-58",
      name: "Pikachu",
      number: "58",
      set: { id: "base1", name: "Base Set", series: "Original" },
      images: {
        small: "https://example.test/pika.jpg",
        large: "https://example.test/pika.jpg",
      },
    },
    {
      id: "base1-1",
      name: "Alakazam",
      number: "1",
      set: { id: "base1", name: "Base Set", series: "Original" },
      images: {
        small: "https://example.test/ala.jpg",
        large: "https://example.test/ala.jpg",
      },
    },
  ] as PokemonCard[];
  const view = render(
    <MemoryRouter>
      <SetChecklist set={{ id: "base1", name: "Base Set" }} catalog={catalog} />
    </MemoryRouter>,
  );
  expect(view.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
  expect(view.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("2");
  fireEvent.click(view.getByRole("button", { name: "Saknade", exact: true }));
  expect(view.queryByRole("heading", { name: "Pikachu" })).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Lägg till Alakazam #1" }));
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogId: "base1-1",
        setId: "base1",
        number: "1",
      }),
    ),
  );
  fireEvent.click(view.getByRole("button", { name: "Dubbletter" }));
  expect(view.getByRole("heading", { name: "Pikachu" })).toBeTruthy();
  expect(view.queryByRole("heading", { name: "Alakazam" })).toBeNull();
});
