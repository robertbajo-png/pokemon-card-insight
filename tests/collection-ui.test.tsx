import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Collection from "@/pages/Collection";
import SetChecklist from "@/components/SetChecklist";
import CollectionCardEditor from "@/components/CollectionCardEditor";
import { scannedCardSchema } from "@/lib/cardAnalysis";
import { resolveSetId } from "@/lib/collection";
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

it("keeps a question-mark collector ID in the card route rather than the query string", () => {
  const special: PokemonCard = {
    id: "ex10-?",
    name: "Unown",
    number: "?",
    set: { id: "ex10", name: "Unseen Forces", series: "EX" },
    images: {
      small: "https://example.test/unown.png",
      large: "https://example.test/unown.png",
    },
  };
  const view = render(
    <MemoryRouter>
      <SetChecklist
        set={{ id: "ex10", name: "Unseen Forces" }}
        catalog={[special]}
      />
    </MemoryRouter>,
  );
  expect(
    view.getByRole("link", { name: "Visa Unown #?" }).getAttribute("href"),
  ).toBe("/card/ex10-%3F");
});

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
it("preserves conflicting saved set evidence until the user explicitly changes the set", async () => {
  const unresolved = scannedCardSchema.parse({
    ...card,
    setId: "sv5",
    set: "Paldean Fates",
    setCode: "TEF",
  });
  expect(resolveSetId(unresolved)).toBeUndefined();
  const view = render(
    <CollectionCardEditor card={unresolved} open onOpenChange={vi.fn()} />,
  );
  expect(
    (view.getByLabelText("Set", { exact: true }) as HTMLSelectElement).value,
  ).toBe("");
  fireEvent.change(view.getByLabelText("Antal"), { target: { value: "4" } });
  fireEvent.change(view.getByLabelText("Anteckningar"), {
    target: { value: "Kontrollera setet senare" },
  });
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
  const saved = mocks.update.mock.calls[0][1];
  expect(saved).toMatchObject({
    setId: unresolved.setId,
    set: unresolved.set,
    setCode: unresolved.setCode,
    quantity: 4,
    notes: "Kontrollera setet senare",
  });
  expect(resolveSetId(saved)).toBeUndefined();

  fireEvent.change(view.getByLabelText("Set", { exact: true }), {
    target: { value: "sv4pt5" },
  });
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
  const corrected = mocks.update.mock.calls[1][1];
  expect(corrected).toMatchObject({
    setId: "sv4pt5",
    set: "Paldean Fates",
    setCode: "PAF",
    quantity: 4,
    notes: "Kontrollera setet senare",
  });
  expect(resolveSetId(corrected)).toBe("sv4pt5");
});
it("clears a conflicting catalogue ID when an explicit canonical set correction keeps the same set name", async () => {
  const unresolved = scannedCardSchema.parse({
    ...card,
    set: "Paldean Fates",
    setId: "sv5",
    setCode: "PAF",
    catalogId: "sv5-1",
  });
  expect(resolveSetId(unresolved)).toBeUndefined();
  const view = render(
    <CollectionCardEditor card={unresolved} open onOpenChange={vi.fn()} />,
  );
  fireEvent.change(view.getByLabelText("Antal"), { target: { value: "4" } });
  fireEvent.change(view.getByLabelText("Anteckningar"), {
    target: { value: "Kontrollera katalogkopplingen" },
  });
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
  const unchangedIdentity = mocks.update.mock.calls[0][1];
  expect(unchangedIdentity).toMatchObject({
    set: unresolved.set,
    setId: unresolved.setId,
    setCode: unresolved.setCode,
    catalogId: unresolved.catalogId,
    quantity: 4,
    notes: "Kontrollera katalogkopplingen",
  });
  expect(resolveSetId(unchangedIdentity)).toBeUndefined();

  fireEvent.change(view.getByLabelText("Set", { exact: true }), {
    target: { value: "sv4pt5" },
  });
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
  const corrected = mocks.update.mock.calls[1][1];
  expect(corrected).toMatchObject({
    set: "Paldean Fates",
    setId: "sv4pt5",
    setCode: "PAF",
    quantity: 4,
    notes: "Kontrollera katalogkopplingen",
  });
  expect(corrected.catalogId).toBeUndefined();
  expect(resolveSetId(corrected)).toBe("sv4pt5");
});
it("preserves canonical source set labels and catalogue IDs when editing inventory fields", async () => {
  const canonical = scannedCardSchema.parse({
    ...card,
    set: "Base",
    setId: "base1",
    setCode: "BS",
    catalogId: "base1-58",
  });
  const view = render(
    <CollectionCardEditor card={canonical} open onOpenChange={vi.fn()} />,
  );
  fireEvent.change(view.getByLabelText("Antal"), { target: { value: "5" } });
  fireEvent.change(view.getByLabelText("Anteckningar"), {
    target: { value: "Nya pärmen" },
  });
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
  const saved = mocks.update.mock.calls[0][1];
  expect(saved).toMatchObject({
    set: "Base",
    setId: "base1",
    setCode: "BS",
    catalogId: "base1-58",
    quantity: 5,
    notes: "Nya pärmen",
  });
  expect(resolveSetId(saved)).toBe("base1");
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
