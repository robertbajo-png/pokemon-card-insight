import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Scanner from "@/pages/Scanner";
import Market from "@/pages/Market";
import CardDetail from "@/pages/CardDetail";
import { Routes, Route } from "react-router-dom";

const mocks = vi.hoisted(() => ({ save: vi.fn(), invoke: vi.fn(), success: vi.fn(), error: vi.fn(), cards: [], user: { id: "user" } as { id: string } | null }));
vi.mock("@/components/Navigation", () => ({ default: () => <nav /> }));
vi.mock("@/components/TranslatedText", () => ({ TranslatedText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ currency: "SEK", setCurrency: vi.fn() }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useScannedCards", () => ({ useScannedCards: () => ({ cards: mocks.cards, addCard: mocks.save, isLoading: false, error: null }) }));
vi.mock("@/services/aiFunctions", () => ({ invokeAi: mocks.invoke }));
vi.mock("@/utils/cardImage", () => ({ prepareCardImage: async () => "data:image/jpeg;base64,AA==" }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "user" }; mocks.cards = []; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function scan() {
  const view = render(<MemoryRouter><Scanner /></MemoryRouter>);
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(["x"], "card.jpg", { type: "image/jpeg" })] } });
  const button = await view.findByRole("button", { name: "Analysera kort" });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  return view;
}
it("awaits persistence and saves the grading prices", async () => {
  mocks.invoke.mockResolvedValue({ name: "Pikachu", number: "58", set: "Base Set", priceByGrade: { ungraded: "50-100 SEK", psa10: "500 SEK" } });
  mocks.save.mockResolvedValue({});
  await scan();
  await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Kort analyserat och sparat!"));
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ estimatedValue: "50-100 SEK", priceByGrade: { ungraded: "50-100 SEK", psa10: "500 SEK" } }));
});
it("shows the analysis but reports a failed save instead of claiming success", async () => {
  mocks.invoke.mockResolvedValue({ name: "Pikachu", number: "58" });
  mocks.save.mockRejectedValue(new Error("Lagringsutrymmet är fullt"));
  const view = await scan();
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Lagringsutrymmet är fullt"));
  expect(view.getByRole("heading", { name: "Pikachu" })).toBeTruthy();
  expect(mocks.success).not.toHaveBeenCalled();
});
it("does not enable AI analysis for signed-out users", () => {
  mocks.user = null;
  const view = render(<MemoryRouter><Scanner /></MemoryRouter>);
  expect((view.getByRole("button", { name: "Analysera kort" }) as HTMLButtonElement).disabled).toBe(true);
  expect(view.getByRole("link", { name: /Logga in/ })).toBeTruthy();
});
it("opens a local scanned card through the real detail route without fetching an API ID", async () => {
  mocks.cards = [{ id: "card-local", name: "Pikachu", set: "Base Set", number: "58", type: "lightning", rarity: "Common", attacks: [], priceByGrade: { ungraded: "50-100 SEK" } }];
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const view = render(<MemoryRouter initialEntries={["/card/card-local"]}><Routes><Route path="/card/:id" element={<CardDetail />} /></Routes></MemoryRouter>);
  expect(view.getByRole("heading", { name: "Pikachu" })).toBeTruthy();
  expect(view.getByText(/50-100 kr/)).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("labels the marketplace as a preview and prevents fake publishing", () => {
  const view = render(<MemoryRouter><Market /></MemoryRouter>);
  expect((view.getByRole("button", { name: "Publicering kommer snart" }) as HTMLButtonElement).disabled).toBe(true);
  expect(view.getByText(/Inga annonser publiceras eller sparas/)).toBeTruthy();
  expect(mocks.success).not.toHaveBeenCalled();
});
