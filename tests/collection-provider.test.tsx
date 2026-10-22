import { IDBFactory } from "fake-indexeddb";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  CollectionProvider,
  useCollection,
} from "@/contexts/CollectionContext";
import { saveScannedCard } from "@/services/scannedCardsStorage";

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as { id: string; is_anonymous?: boolean } | null,
    session: null as { access_token: string } | null,
    isLoading: false,
  },
  sync: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/services/collectionSync", () => ({
  syncCollection: (...args: unknown[]) => mocks.sync(...args),
}));
function Probe() {
  const { cards, importLocal, localCount, syncStatus } = useCollection();
  return (
    <>
      <p data-testid="cards">{cards.map((card) => card.name).join(",")}</p>
      <p>{syncStatus}</p>
      <p>Lokala: {localCount}</p>
      <button onClick={() => void importLocal()}>Flytta lokala</button>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("indexedDB", new IDBFactory());
  localStorage.clear();
  mocks.auth = { user: null, session: null, isLoading: false };
  mocks.sync.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("gates account switches immediately and never imports a shared browser's guest cards automatically", async () => {
  await saveScannedCard({ name: "Guest", set: "Base Set", number: "1" });
  await saveScannedCard(
    { name: "Alice", set: "Base Set", number: "2" },
    "alice",
  );
  await saveScannedCard({ name: "Bob", set: "Base Set", number: "3" }, "bob");
  mocks.auth = {
    user: { id: "alice" },
    session: { access_token: "alice-token" },
    isLoading: false,
  };
  const view = render(
    <CollectionProvider>
      <Probe />
    </CollectionProvider>,
  );
  await waitFor(() =>
    expect(view.getByTestId("cards").textContent).toBe("Alice"),
  );
  expect(view.getByText("Lokala: 1")).toBeTruthy();
  mocks.auth = {
    user: { id: "bob" },
    session: { access_token: "bob-token" },
    isLoading: false,
  };
  view.rerender(
    <CollectionProvider>
      <Probe />
    </CollectionProvider>,
  );
  expect(view.getByTestId("cards").textContent).not.toContain("Alice");
  await waitFor(() =>
    expect(view.getByTestId("cards").textContent).toBe("Bob"),
  );
  fireEvent.click(view.getByRole("button", { name: "Flytta lokala" }));
  await waitFor(() =>
    expect(view.getByTestId("cards").textContent).toContain("Guest"),
  );
  mocks.auth = { user: null, session: null, isLoading: false };
  view.rerender(
    <CollectionProvider>
      <Probe />
    </CollectionProvider>,
  );
  expect(view.getByTestId("cards").textContent).not.toContain("Bob");
  await waitFor(() => expect(view.getByText("local")).toBeTruthy());
});
it("waits for auth initialization and keeps anonymous Auth users local", async () => {
  mocks.auth = { user: null, session: null, isLoading: true };
  const view = render(
    <CollectionProvider>
      <Probe />
    </CollectionProvider>,
  );
  expect(mocks.sync).not.toHaveBeenCalled();
  mocks.auth = {
    user: { id: "anonymous", is_anonymous: true },
    session: { access_token: "anonymous-token" },
    isLoading: false,
  };
  view.rerender(
    <CollectionProvider>
      <Probe />
    </CollectionProvider>,
  );
  await waitFor(() => expect(view.getByText("local")).toBeTruthy());
  expect(mocks.sync).not.toHaveBeenCalled();
});
