import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useAuth } from "./AuthContext";
import type { NewScannedCard, ScannedCard } from "@/lib/cardAnalysis";
import { syncCollection } from "@/services/collectionSync";
import {
  GUEST,
  SCANNED_CARDS_CHANGED,
  saveScannedCard,
  updateScannedCard,
  deleteScannedCard,
  deleteScannedCards,
  importLocalCollection,
  importBackup,
  readStoredCards,
  readScannedCards,
  resolveConflict,
  type StoredCard,
} from "@/services/scannedCardsStorage";

type SyncStatus =
  | "local"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "conflict";
interface CollectionState {
  owner: string;
  cards: ScannedCard[];
  isLoading: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  pending: number;
  localCount: number;
  conflicts: StoredCard[];
  lastSynced: string | null;
}
interface CollectionValue extends CollectionState {
  addCard: (card: NewScannedCard) => Promise<ScannedCard>;
  updateCard: (
    id: string,
    changes: Partial<NewScannedCard>,
    expected?: ScannedCard,
  ) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  clearCards: () => Promise<void>;
  importLocal: () => Promise<void>;
  importCards: (cards: ScannedCard[]) => Promise<void>;
  resolve: (id: string, choice: "local" | "cloud") => Promise<void>;
  syncNow: () => void;
}
const CollectionContext = createContext<CollectionValue | null>(null);
const initial = (owner: string): CollectionState => ({
  owner,
  cards: [],
  isLoading: true,
  error: null,
  syncStatus: owner === GUEST ? "local" : "syncing",
  syncError: null,
  pending: 0,
  localCount: 0,
  conflicts: [],
  lastSynced: null,
});

export function CollectionProvider({ children }: PropsWithChildren) {
  const { user, session, isLoading: authLoading } = useAuth();
  const owner = user && !user.is_anonymous ? user.id : GUEST;
  const token = session?.access_token;
  const [state, setState] = useState<CollectionState>(() => initial(owner));
  const channel = useRef<BroadcastChannel | null>(null);
  const notify = useCallback((remote = false) => {
    window.dispatchEvent(
      new CustomEvent(SCANNED_CARDS_CHANGED, { detail: { remote } }),
    );
    channel.current?.postMessage({ remote });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let active = true,
      reading = 0,
      busy = false,
      rerun = false;
    const controller = new AbortController();
    setState(initial(owner));
    const refresh = async () => {
      const revision = ++reading;
      try {
        const [rows, guest] = await Promise.all([
          readStoredCards(owner),
          owner === GUEST ? Promise.resolve([]) : readScannedCards(),
        ]);
        if (!active || revision !== reading) return;
        setState((current) => ({
          ...current,
          owner,
          isLoading: false,
          error: null,
          localCount: guest.length,
          cards: rows
            .filter((row) => !row.deleted)
            .map((row) => row.card)
            .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)),
          pending: rows.filter((row) => row.mutationId).length,
          conflicts: rows.filter((row) => row.conflict),
        }));
      } catch (cause) {
        if (active && revision === reading)
          setState((current) => ({
            ...current,
            owner,
            isLoading: false,
            error:
              cause instanceof Error
                ? cause.message
                : "Kunde inte läsa samlingen.",
          }));
      }
    };
    const run = async () => {
      if (!active || owner === GUEST || !token) return;
      if (busy) {
        rerun = true;
        return;
      }
      if (!navigator.onLine) {
        setState((current) => ({ ...current, syncStatus: "offline" }));
        return;
      }
      busy = true;
      setState((current) => ({
        ...current,
        syncStatus: "syncing",
        syncError: null,
      }));
      try {
        const perform = () =>
          syncCollection({ owner, token }, controller.signal);
        if (navigator.locks?.request)
          await navigator.locks.request(
            `collection-sync:${owner}`,
            { signal: controller.signal },
            perform,
          );
        else await perform();
        const rows = await readStoredCards(owner);
        if (active)
          setState((current) => ({
            ...current,
            syncStatus: rows.some((row) => row.conflict)
              ? "conflict"
              : rows.some((row) => row.mutationId)
                ? "offline"
                : "synced",
            lastSynced: new Date().toISOString(),
          }));
      } catch (cause) {
        if (active)
          setState((current) => ({
            ...current,
            syncStatus: navigator.onLine ? "error" : "offline",
            syncError:
              cause instanceof Error
                ? cause.message
                : "Kunde inte synka. Ändringarna finns kvar på enheten.",
          }));
      } finally {
        busy = false;
        if (active) {
          await refresh();
          notify(true);
        }
        if (active && rerun) {
          rerun = false;
          void run();
        }
      }
    };
    const changed = (event: Event) => {
      void refresh();
      if (!(event as CustomEvent).detail?.remote) void run();
    };
    const trigger = () => {
      void refresh();
      void run();
    };
    const offline = () =>
      setState((current) => ({
        ...current,
        syncStatus: owner === GUEST ? "local" : "offline",
      }));
    window.addEventListener(SCANNED_CARDS_CHANGED, changed);
    window.addEventListener("online", trigger);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", trigger);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(SCANNED_CARDS_CHANGED);
      channel.current.onmessage = (event) => {
        void refresh();
        if (!event.data?.remote) void run();
      };
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, 60000);
    void refresh().then(run);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener(SCANNED_CARDS_CHANGED, changed);
      window.removeEventListener("online", trigger);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", trigger);
      channel.current?.close();
      channel.current = null;
    };
  }, [owner, token, authLoading, notify]);

  const ready = () => {
    if (authLoading) throw new Error("Vänta tills inloggningen är klar.");
  };
  const addCard = async (card: NewScannedCard) => {
    ready();
    const saved = await saveScannedCard(card, owner);
    notify();
    return saved;
  };
  const updateCard = async (
    id: string,
    changes: Partial<NewScannedCard>,
    expected?: ScannedCard,
  ) => {
    ready();
    await updateScannedCard(id, changes, owner, expected);
    notify();
  };
  const removeCard = async (id: string) => {
    ready();
    await deleteScannedCard(id, owner);
    notify();
  };
  const clearCards = async () => {
    ready();
    await deleteScannedCards(owner);
    notify();
  };
  const importLocal = async () => {
    ready();
    await importLocalCollection(owner);
    notify();
  };
  const importCards = async (cards: ScannedCard[]) => {
    ready();
    await importBackup(cards, owner);
    notify();
  };
  const resolve = async (id: string, choice: "local" | "cloud") => {
    ready();
    await resolveConflict(owner, id, choice);
    notify();
  };
  // Gate immediately during account switches; never render the previous account's cards for a frame.
  const visible =
    state.owner === owner && !authLoading ? state : initial(owner);
  return (
    <CollectionContext.Provider
      value={{
        ...visible,
        addCard,
        updateCard,
        removeCard,
        clearCards,
        importLocal,
        importCards,
        resolve,
        syncNow: () => notify(),
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const context = useContext(CollectionContext);
  if (!context) throw new Error("CollectionProvider saknas.");
  return context;
}
