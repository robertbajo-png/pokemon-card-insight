import { useCallback, useEffect, useRef, useState } from "react";
import type { NewScannedCard, ScannedCard } from "@/lib/cardAnalysis";
import { deleteScannedCards, readScannedCards, saveScannedCard, SCANNED_CARDS_CHANGED } from "@/services/scannedCardsStorage";
export type { ScannedCard } from "@/lib/cardAnalysis";

export const useScannedCards = () => {
  const [cards, setCards] = useState<ScannedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const syncCards = async () => {
      const current = ++revision;
      try {
        const saved = await readScannedCards();
        if (active && current === revision) { setCards(saved); setError(null); }
      } catch (cause) {
        if (active && current === revision) setError(cause instanceof Error ? cause.message : "Kunde inte läsa samlingen.");
      } finally { if (active && current === revision) setIsLoading(false); }
    };
    void syncCards();
    window.addEventListener(SCANNED_CARDS_CHANGED, syncCards);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(SCANNED_CARDS_CHANGED);
      channel.current.onmessage = syncCards;
    }
    return () => {
      active = false;
      window.removeEventListener(SCANNED_CARDS_CHANGED, syncCards);
      channel.current?.close();
      channel.current = null;
    };
  }, []);
  const notify = useCallback(() => {
    window.dispatchEvent(new Event(SCANNED_CARDS_CHANGED));
    channel.current?.postMessage("changed");
  }, []);
  const addCard = useCallback(async (card: NewScannedCard) => {
    const saved = await saveScannedCard(card);
    notify();
    return saved;
  }, [notify]);
  const clearCards = useCallback(async () => {
    await deleteScannedCards();
    notify();
  }, [notify]);
  return { cards, addCard, clearCards, isLoading, error };
};
