import { afterEach, expect, it, vi } from "vitest";
import cardData from "@/data/japanese-cards.json";

afterEach(() => {
  vi.doUnmock("@/data/japanese-cards.json");
  vi.resetModules();
});

it("cancels a stalled chunk wait promptly without discarding the shared import for another caller", async () => {
  vi.resetModules();
  let finish!: (value: { default: typeof cardData }) => void;
  vi.doMock(
    "@/data/japanese-cards.json",
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { getJapaneseCardsBySet } = await import(
    "@/services/japaneseCatalogue"
  );
  const controller = new AbortController();
  const canceled = getJapaneseCardsBySet("jp-sv2a", controller.signal);
  const stillWaiting = getJapaneseCardsBySet("jp-sv2a");
  const rejected = expect(canceled).rejects.toMatchObject({
    name: "AbortError",
  });
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  controller.abort();
  await rejected;
  finish({ default: cardData });
  expect(await stillWaiting).toHaveLength(210);
  expect(await getJapaneseCardsBySet("jp-sv2a")).toHaveLength(210);
});
