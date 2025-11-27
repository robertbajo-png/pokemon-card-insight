import { useCallback, useEffect, useState } from "react";

export interface ScannedCard {
  id: string;
  name: string;
  type: string;
  rarity: string;
  set: string;
  number: string;
  condition?: string;
  estimatedValue?: string;
  image?: string;
  scannedAt: string;
}

const STORAGE_KEY = "pokemon_scanned_cards";

const readFromStorage = (): ScannedCard[] => {
  try {
    if (typeof localStorage === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to read scanned cards from storage", error);
    return [];
  }
};

const writeToStorage = (cards: ScannedCard[]) => {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (error) {
    console.error("Failed to save scanned cards", error);
  }
};

const generateId = () => `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useScannedCards = () => {
  const [cards, setCards] = useState<ScannedCard[]>(() => readFromStorage());

  useEffect(() => {
    const syncCards = () => setCards(readFromStorage());
    window.addEventListener("storage", syncCards);
    return () => window.removeEventListener("storage", syncCards);
  }, []);

  const addCard = useCallback((card: Omit<ScannedCard, "id" | "scannedAt">) => {
    const newCard: ScannedCard = {
      ...card,
      id: generateId(),
      scannedAt: new Date().toISOString(),
    };

    setCards((prev) => {
      const withoutDuplicate = prev.filter(
        (existing) =>
          existing.name !== card.name ||
          existing.set !== card.set ||
          existing.number !== card.number
      );

      const updated = [newCard, ...withoutDuplicate];
      writeToStorage(updated);
      return updated;
    });
  }, []);

  const clearCards = useCallback(() => {
    setCards([]);
    writeToStorage([]);
  }, []);

  return {
    cards,
    addCard,
    clearCards,
  };
};
