import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { syncCollection } from "@/services/collectionSync";
import {
  acknowledgeUpload,
  readScannedCards,
  readStoredCards,
  saveScannedCard,
  updateScannedCard,
  type RemoteCard,
} from "@/services/scannedCardsStorage";

const identity = {
  owner: "11111111-1111-4111-8111-111111111111",
  token: "captured-user-token",
};
const input = { name: "Pikachu", number: "58", set: "Base Set" };
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

it("retains offline edits, then uploads them with the captured token and acknowledges only committed writes", async () => {
  const card = await saveScannedCard(input, identity.owner);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  await expect(
    syncCollection(identity, new AbortController().signal),
  ).rejects.toThrow();
  expect((await readStoredCards(identity.owner))[0].mutationId).toBeTruthy();
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    expect(options.headers).toMatchObject({
      Authorization: "Bearer captured-user-token",
    });
    if (url.includes("rpc/")) {
      const body = JSON.parse(String(options.body));
      return json([
        {
          id: card.id,
          card: body.p_card,
          revision: 1,
          deleted: false,
          mutation_id: body.p_mutation_id,
        },
      ]);
    }
    return json([{ id: card.id, revision: 1 }]);
  });
  vi.stubGlobal("fetch", fetchMock);
  await syncCollection(identity, new AbortController().signal);
  expect((await readStoredCards(identity.owner))[0].mutationId).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("pulls another device's changes, records conflicts, and never sends cached photos again for unchanged rows", async () => {
  const card = await saveScannedCard(input, identity.owner),
    sent = (await readStoredCards(identity.owner))[0];
  await acknowledgeUpload(identity.owner, sent, {
    id: card.id,
    card,
    revision: 1,
    deleted: false,
    mutation_id: sent.mutationId!,
  });
  await updateScannedCard(card.id, { quantity: 2 }, identity.owner);
  const cloud: RemoteCard = {
    id: card.id,
    card: { ...card, quantity: 5 },
    revision: 2,
    deleted: false,
    mutation_id: crypto.randomUUID(),
  };
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("rpc/"))
      return json({ message: "COLLECTION_CONFLICT" }, 400);
    if (new URL(url).searchParams.get("select") === "id,revision")
      return json([{ id: card.id, revision: 2 }]);
    return json([cloud]);
  });
  vi.stubGlobal("fetch", fetchMock);
  await syncCollection(identity, new AbortController().signal);
  expect(
    (await readStoredCards(identity.owner))[0].conflict?.card.quantity,
  ).toBe(5);
  expect((await readScannedCards(identity.owner))[0].quantity).toBe(2);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
it("fetches more than one page without downloading full card data for known revisions", async () => {
  const card = await saveScannedCard(input, "guest");
  const cloud: RemoteCard[] = Array.from({ length: 101 }, (_, i) => ({
    id: `card-${String(i).padStart(3, "0")}`,
    card: { ...card, id: `card-${String(i).padStart(3, "0")}` },
    revision: 1,
    deleted: false,
    mutation_id: crypto.randomUUID(),
  }));
  const fetchMock = vi.fn(async (url: string) => {
    const query = new URL(url).searchParams;
    if (query.get("select") === "id,revision") {
      return json(
        (query.has("id") ? cloud.slice(100) : cloud.slice(0, 100)).map(
          (row) => ({ id: row.id, revision: 1 }),
        ),
      );
    }
    const ids = query.get("id")!;
    return json(cloud.filter((row) => ids.includes(JSON.stringify(row.id))));
  });
  vi.stubGlobal("fetch", fetchMock);
  await syncCollection(identity, new AbortController().signal);
  expect(await readScannedCards(identity.owner)).toHaveLength(101);
  fetchMock.mockClear();
  await syncCollection(identity, new AbortController().signal);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(
    fetchMock.mock.calls.every(
      ([url]) => new URL(url).searchParams.get("select") === "id,revision",
    ),
  ).toBe(true);
});
it("reports a missing migration while retaining local changes for a later retry", async () => {
  await saveScannedCard(input, identity.owner);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(json({ code: "PGRST202" }, 404)),
  );
  await expect(
    syncCollection(identity, new AbortController().signal),
  ).rejects.toThrow("Molnsparning är inte aktiverad");
  expect((await readScannedCards(identity.owner))[0].name).toBe("Pikachu");
  expect((await readStoredCards(identity.owner))[0].mutationId).toBeTruthy();
});
