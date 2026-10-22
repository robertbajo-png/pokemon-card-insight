// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const user = "2f6aa68b-4517-4154-8e8e-81333db96424";
beforeAll(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(await readFile(new URL("../supabase/migrations/20261022090000_ai_usage_quotas.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await db.close(); });
it("admits only twenty analysis requests even when calls are submitted together", async () => {
  const results = await Promise.all(Array.from({ length: 25 }, () => db.query<{ allowed: boolean }>(
    "select public.consume_ai_quota($1::uuid, 'analyze') as allowed", [user])));
  expect(results.filter(result => result.rows[0].allowed)).toHaveLength(20);
});
it("keeps action quotas separate and rejects unsupported actions", async () => {
  const generate = await db.query<{ allowed: boolean }>("select public.consume_ai_quota($1::uuid, 'generate') as allowed", [user]);
  expect(generate.rows[0].allowed).toBe(true);
  const invalid = await db.query<{ allowed: boolean }>("select public.consume_ai_quota($1::uuid, 'bogus') as allowed", [user]);
  expect(invalid.rows[0].allowed).toBe(false);
});
it("enforces the project-wide daily cap", async () => {
  await db.exec("update public.ai_usage_windows set requests=1000 where action='global';");
  const result = await db.query<{ allowed: boolean }>("select public.consume_ai_quota($1::uuid, 'translate') as allowed", [user]);
  expect(result.rows[0].allowed).toBe(false);
});
it("does not grant public or authenticated callers permission to reset or consume quotas", async () => {
  await db.exec("set role authenticated;");
  try {
    await expect(db.query("select public.consume_ai_quota($1::uuid, 'analyze')", [user])).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.ai_usage_windows")).rejects.toThrow(/permission denied/);
  } finally { await db.exec("reset role;"); }
  const result = await db.query<{ service_allowed: boolean; anon_allowed: boolean }>(
    "select has_function_privilege('service_role','public.consume_ai_quota(uuid,text)','execute') as service_allowed, has_function_privilege('anon','public.consume_ai_quota(uuid,text)','execute') as anon_allowed");
  expect(result.rows[0]).toEqual({ service_allowed: true, anon_allowed: false });
});
