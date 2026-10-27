import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Scanner from "@/pages/Scanner";
import Market from "@/pages/Market";
import CardDetail from "@/pages/CardDetail";
import { Routes, Route } from "react-router-dom";
import { scannedCardSchema } from "@/lib/cardAnalysis";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  invoke: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  cards: [],
  user: { id: "user" } as { id: string } | null,
}));
vi.mock("@/components/Navigation", () => ({ default: () => <nav /> }));
vi.mock("@/components/TranslatedText", () => ({
  TranslatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ currency: "SEK", setCurrency: vi.fn() }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("@/hooks/useScannedCards", () => ({
  useScannedCards: () => ({
    cards: mocks.cards,
    addCard: mocks.save,
    isLoading: false,
    error: null,
  }),
}));
vi.mock("@/services/aiFunctions", () => ({ invokeAi: mocks.invoke }));
vi.mock("@/utils/cardImage", () => ({
  prepareCardImage: async () => "data:image/jpeg;base64,AA==",
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));
const savedFixture = (input: Record<string, unknown>) =>
  scannedCardSchema.parse({
    ...input,
    id: "card-scan-review",
    scannedAt: "2026-10-27T10:00:00.000Z",
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockReset();
  mocks.save
    .mockReset()
    .mockImplementation(async (input) => savedFixture(input));
  mocks.user = { id: "user" };
  mocks.cards = [];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function scan() {
  const view = render(
    <MemoryRouter>
      <Scanner />
    </MemoryRouter>,
  );
  fireEvent.change(view.container.querySelector('input[type="file"]')!, {
    target: { files: [new File(["x"], "card.jpg", { type: "image/jpeg" })] },
  });
  const button = await view.findByRole("button", { name: "Analysera kort" });
  await waitFor(() =>
    expect((button as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(button);
  return view;
}
it("reviews a scan before saving corrections, inventory fields, the photo and grading prices", async () => {
  mocks.invoke.mockResolvedValue({
    name: "Pikachu",
    number: "58",
    set: "Base Set",
    priceByGrade: { ungraded: "50-100 SEK", psa10: "500 SEK" },
  });
  const view = await scan();
  fireEvent.click(
    await view.findByRole("button", { name: "Kontrollera och spara" }),
  );
  expect(mocks.save).not.toHaveBeenCalled();
  expect(view.getByRole("dialog")).toBeTruthy();
  expect((view.getByLabelText("Kortnamn") as HTMLInputElement).value).toBe(
    "Pikachu",
  );
  expect(
    (view.getByLabelText("Set", { exact: true }) as HTMLSelectElement).value,
  ).toBe("base1");
  fireEvent.change(view.getByLabelText("Kortnummer"), {
    target: { value: "58/102" },
  });
  fireEvent.change(view.getByLabelText("Antal"), { target: { value: "3" } });
  fireEvent.change(view.getByLabelText("Språk"), { target: { value: "ja" } });
  fireEvent.change(view.getByLabelText("Förvaringsplats"), {
    target: { value: "Leonards pärm" },
  });
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await view.findByRole("status");
  expect(
    view.queryByRole("button", { name: "Kontrollera och spara" }),
  ).toBeNull();
  expect(mocks.save).toHaveBeenCalledOnce();
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      number: "58/102",
      quantity: 3,
      language: "ja",
      location: "Leonards pärm",
      setId: "base1",
      image: "data:image/jpeg;base64,AA==",
      estimatedValue: "50-100 SEK",
      priceByGrade: { ungraded: "50-100 SEK", psa10: "500 SEK" },
    }),
  );
  expect(mocks.invoke).toHaveBeenCalledOnce();
});
it("retains reviewed fields after a failed save and retries without another AI request", async () => {
  mocks.invoke.mockResolvedValue({
    name: "Pikachu",
    number: "58",
    set: "Base Set",
  });
  mocks.save.mockRejectedValueOnce(new Error("Lagringsutrymmet är fullt"));
  const view = await scan();
  fireEvent.click(
    await view.findByRole("button", { name: "Kontrollera och spara" }),
  );
  fireEvent.change(view.getByLabelText("Anteckningar"), {
    target: { value: "Från Leonard" },
  });
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  expect((await view.findByRole("alert")).textContent).toBe(
    "Lagringsutrymmet är fullt",
  );
  expect((view.getByLabelText("Kortnamn") as HTMLInputElement).value).toBe(
    "Pikachu",
  );
  expect(mocks.success).not.toHaveBeenCalled();
  expect(
    (view.getByLabelText("Anteckningar") as HTMLTextAreaElement).value,
  ).toBe("Från Leonard");
  fireEvent.click(view.getByRole("button", { name: "Spara kort" }));
  await view.findByRole("status");
  expect(mocks.save).toHaveBeenCalledTimes(2);
  expect(mocks.invoke).toHaveBeenCalledOnce();
});
it("can cancel review and choose the next card without adding anything to the collection", async () => {
  mocks.invoke.mockResolvedValue({
    name: "Pikachu",
    number: "58",
    set: "Base Set",
  });
  const view = await scan();
  fireEvent.click(
    await view.findByRole("button", { name: "Kontrollera och spara" }),
  );
  fireEvent.click(view.getByRole("button", { name: "Avbryt" }));
  await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
  expect(view.getByRole("heading", { name: "Pikachu" })).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Välj nästa kort" }));
  expect(view.queryByRole("heading", { name: "Pikachu" })).toBeNull();
  expect(
    (view.getByRole("button", { name: "Analysera kort" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.invoke).toHaveBeenCalledOnce();
});
it("keeps review open during persistence and prevents a double save", async () => {
  mocks.invoke.mockResolvedValue({
    name: "Pikachu",
    number: "58",
    set: "Base Set",
  });
  let finish!: (card: ReturnType<typeof savedFixture>) => void;
  mocks.save.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = await scan();
  fireEvent.click(
    await view.findByRole("button", { name: "Kontrollera och spara" }),
  );
  const button = view.getByRole("button", { name: "Spara kort" });
  fireEvent.click(button);
  fireEvent.click(button);
  fireEvent.keyDown(view.getByRole("dialog"), { key: "Escape" });
  expect(view.getByRole("dialog")).toBeTruthy();
  expect(mocks.save).toHaveBeenCalledOnce();
  await act(async () => finish(savedFixture(mocks.save.mock.calls[0][0])));
  await view.findByRole("status");
  expect(view.queryByRole("dialog")).toBeNull();
});
it("discards an in-flight scan on account switch instead of showing another account's photo or result", async () => {
  let finish!: (data: unknown) => void;
  mocks.invoke.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = await scan();
  const signal = mocks.invoke.mock.calls[0][2] as AbortSignal;
  mocks.user = { id: "other-user" };
  view.rerender(
    <MemoryRouter>
      <Scanner />
    </MemoryRouter>,
  );
  expect(signal.aborted).toBe(true);
  await act(async () =>
    finish({ name: "Pikachu", number: "58", set: "Base Set" }),
  );
  expect(view.queryByRole("heading", { name: "Pikachu" })).toBeNull();
  expect(view.queryByRole("img", { name: "Vald kortbild" })).toBeNull();
  expect(mocks.save).not.toHaveBeenCalled();
});
it("does not enable AI analysis for signed-out users", () => {
  mocks.user = null;
  const view = render(
    <MemoryRouter>
      <Scanner />
    </MemoryRouter>,
  );
  expect(
    (view.getByRole("button", { name: "Analysera kort" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(view.getByRole("link", { name: /Logga in/ })).toBeTruthy();
});
it("opens a local scanned card through the real detail route without fetching an API ID", async () => {
  mocks.cards = [
    {
      id: "card-local",
      name: "Pikachu",
      set: "Base Set",
      number: "58",
      type: "lightning",
      rarity: "Common",
      attacks: [],
      priceByGrade: { ungraded: "50-100 SEK" },
    },
  ];
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const view = render(
    <MemoryRouter initialEntries={["/card/card-local"]}>
      <Routes>
        <Route path="/card/:id" element={<CardDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(view.getByRole("heading", { name: "Pikachu" })).toBeTruthy();
  expect(view.getByText(/50-100 kr/)).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("labels the marketplace as a preview and prevents fake publishing", () => {
  const view = render(
    <MemoryRouter>
      <Market />
    </MemoryRouter>,
  );
  expect(
    (
      view.getByRole("button", {
        name: "Publicering kommer snart",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(view.getByText(/Inga annonser publiceras eller sparas/)).toBeTruthy();
  expect(mocks.success).not.toHaveBeenCalled();
});
