import { z } from "zod";
import { scannedCardSchema } from "@/lib/cardAnalysis";
import {
  acknowledgeUpload,
  mergeCloudCards,
  readStoredCards,
  type RemoteCard,
  type StoredCard,
} from "./scannedCardsStorage";
import { withTimeout } from "@/utils/withTimeout";

const remoteSchema = z
  .object({
    id: z.string(),
    card: scannedCardSchema,
    revision: z.number().int().positive(),
    deleted: z.boolean(),
    mutation_id: z.string().uuid(),
  })
  .refine((row) => row.id === row.card.id);
export interface SyncIdentity {
  owner: string;
  token: string;
}
export class CollectionConflict extends Error {}

async function request(
  identity: SyncIdentity,
  path: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<unknown> {
  const { response, data } = await withTimeout(
    async (timeoutSignal) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${path}`,
        {
          method: body ? "POST" : "GET",
          signal: timeoutSignal,
          // Capture the token for this sync, rather than allowing a later account switch to change its owner.
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${identity.token}`,
            "Content-Type": "application/json",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      return { response, data: await response.json() };
    },
    signal,
    20000,
  );
  if (!response.ok) {
    if (data?.message === "COLLECTION_CONFLICT") throw new CollectionConflict();
    if (response.status === 401 || response.status === 403)
      throw new Error(
        "Logga in igen för att synka. Ändringarna finns kvar på enheten.",
      );
    if (["PGRST202", "PGRST205", "42P01", "42883"].includes(data?.code)) {
      throw new Error(
        "Molnsparning är inte aktiverad ännu. Dina ändringar sparas på enheten tills tjänsten är uppdaterad.",
      );
    }
    throw new Error(
      "Kunde inte synka med molnet. Dina ändringar finns kvar på enheten.",
    );
  }
  return data;
}

async function pushCard(
  identity: SyncIdentity,
  row: StoredCard,
  signal: AbortSignal,
): Promise<RemoteCard> {
  const result = await request(identity, "rpc/write_collection_card", signal, {
    p_id: row.card.id,
    p_card: row.card,
    p_expected_revision: row.revision,
    p_deleted: row.deleted,
    p_mutation_id: row.mutationId,
  });
  return remoteSchema.parse(
    Array.isArray(result) ? result[0] : result,
  ) as RemoteCard;
}

export async function syncCollection(
  identity: SyncIdentity,
  signal: AbortSignal,
): Promise<void> {
  const pending = (await readStoredCards(identity.owner)).filter(
    (row) => row.mutationId && !row.conflict,
  );
  for (const row of pending) {
    signal.throwIfAborted();
    try {
      const remote = await pushCard(identity, row, signal);
      await acknowledgeUpload(identity.owner, row, remote);
    } catch (error) {
      if (!(error instanceof CollectionConflict)) throw error;
      // Pull below records both copies, for an explicit user decision.
    }
  }
  // Pull lightweight revisions first. Photos travel only for new or changed cards.
  const local = new Map(
    (await readStoredCards(identity.owner)).map((row) => [
      row.card.id,
      row.revision,
    ]),
  );
  let after: string | undefined;
  for (;;) {
    signal.throwIfAborted();
    const query = new URLSearchParams({
      select: "id,revision",
      user_id: `eq.${identity.owner}`,
      order: "id.asc",
      limit: "100",
    });
    if (after) query.set("id", `gt.${after}`);
    const rows = z
      .object({ id: z.string(), revision: z.number().int().positive() })
      .array()
      .parse(await request(identity, `collection_cards?${query}`, signal));
    const changed = rows.filter(
      (row) => !local.has(row.id) || row.revision > local.get(row.id)!,
    );
    for (let index = 0; index < changed.length; index += 10) {
      const ids = changed
        .slice(index, index + 10)
        .map((row) => JSON.stringify(row.id))
        .join(",");
      const details = new URLSearchParams({
        select: "id,card,revision,deleted,mutation_id",
        user_id: `eq.${identity.owner}`,
        id: `in.(${ids})`,
      });
      const cards = remoteSchema
        .array()
        .parse(
          await request(identity, `collection_cards?${details}`, signal),
        ) as RemoteCard[];
      await mergeCloudCards(identity.owner, cards);
    }
    if (rows.length < 100) break;
    after = rows[rows.length - 1].id;
  }
}
