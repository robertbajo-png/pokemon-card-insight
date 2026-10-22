// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
const card = {
  id: "card-pikachu",
  name: "Pikachu",
  set: "Base Set",
  number: "58",
  scannedAt: "2026-10-22T10:00:00.000Z",
  quantity: 1,
};
const mutation = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values('${alice}'),('${bob}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    grant usage on schema auth to authenticated, anon; grant execute on all functions in schema auth to authenticated, anon;`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261022130000_cloud_collection.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
afterAll(() => db.close());

async function asUser<T>(id: string, run: () => Promise<T>, anonymous = false) {
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)",
    [id, JSON.stringify({ is_anonymous: anonymous })],
  );
  await db.exec("set role authenticated");
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}
async function write(
  quantity: number,
  revision: number,
  n: number,
  deleted = false,
) {
  const result = await db.query<{
    revision: number;
    deleted: boolean;
    card: typeof card;
  }>(
    "select * from public.write_collection_card($1,$2::jsonb,$3,$4,$5::uuid)",
    [
      card.id,
      JSON.stringify({ ...card, quantity }),
      revision,
      deleted,
      mutation(n),
    ],
  );
  return result.rows[0];
}

it("creates, updates and idempotently retries a write without adding copies twice", async () => {
  await asUser(alice, async () => {
    expect((await write(1, 0, 1)).revision).toBe(1);
    expect((await write(1, 0, 1)).revision).toBe(1);
    expect((await write(3, 1, 2)).revision).toBe(2);
    expect((await write(3, 1, 2)).card.quantity).toBe(3);
  });
});
it("rejects stale edits instead of silently replacing another device's changes", async () => {
  await asUser(alice, () =>
    expect(write(7, 1, 3)).rejects.toThrow("COLLECTION_CONFLICT"),
  );
});
it("isolates both reads and writes between two authenticated users", async () => {
  await asUser(bob, async () => {
    expect(
      (await db.query("select * from public.collection_cards")).rows,
    ).toEqual([]);
    await write(8, 0, 4);
    const rows = (
      await db.query<{ user_id: string; card: typeof card }>(
        "select * from public.collection_cards",
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(bob);
    expect(rows[0].card.quantity).toBe(8);
  });
  await asUser(alice, async () => {
    const rows = (
      await db.query<{ card: typeof card }>(
        "select * from public.collection_cards",
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].card.quantity).toBe(3);
  });
});
it("denies direct updates, inserts and deletes that bypass revision handling", async () => {
  await asUser(alice, async () => {
    await expect(
      db.exec("update public.collection_cards set revision=999"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec("delete from public.collection_cards"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query(
        "insert into public.collection_cards(user_id,id,card,mutation_id) values($1,$2,$3,$4)",
        [alice, "card-illegal", JSON.stringify(card), mutation(5)],
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
it("keeps deletions as versioned tombstones and rejects stale resurrections", async () => {
  await asUser(alice, async () => {
    const deleted = await write(3, 2, 6, true);
    expect(deleted.deleted).toBe(true);
    expect(deleted.revision).toBe(3);
    await expect(write(1, 2, 7)).rejects.toThrow("COLLECTION_CONFLICT");
  });
});
it("requires a real signed-in user and denies both public and anonymous Auth access", async () => {
  await db.exec("set role anon");
  try {
    await expect(
      db.exec("select * from public.collection_cards"),
    ).rejects.toThrow(/permission denied/);
    await expect(write(1, 0, 8)).rejects.toThrow(/permission denied/);
  } finally {
    await db.exec("reset role");
  }
  await asUser(
    bob,
    async () => {
      expect(
        (await db.query("select * from public.collection_cards")).rows,
      ).toEqual([]);
      await expect(write(1, 1, 9)).rejects.toThrow("AUTH_REQUIRED");
    },
    true,
  );
});
it("enforces valid quantities and matching record IDs in PostgreSQL", async () => {
  await asUser(bob, async () => {
    await expect(write(0, 1, 10)).rejects.toThrow(/check constraint/);
    await expect(write(1.5, 1, 11)).rejects.toThrow(/check constraint/);
    await expect(write(10000, 1, 12)).rejects.toThrow(/check constraint/);
    await expect(
      db.query(
        "select * from public.write_collection_card($1,$2::jsonb,0,false,$3::uuid)",
        ["card-other", JSON.stringify(card), mutation(13)],
      ),
    ).rejects.toThrow(/check constraint/);
  });
});
it("accepts only one of two concurrent edits at the same revision", async () => {
  await asUser(bob, async () => {
    const results = await Promise.allSettled([
      write(4, 1, 14),
      write(6, 1, 15),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason.message).toContain("COLLECTION_CONFLICT");
  });
});
