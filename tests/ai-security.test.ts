// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleRequest as analyze } from "../supabase/functions/analyze-pokemon-card/index";
import { handleRequest as generate } from "../supabase/functions/generate-set-cards/index";
import { handleRequest as translate } from "../supabase/functions/translate/index";

const handlers = [analyze, generate, translate];
const bodies = [
  { action: "analyze", image: "data:image/jpeg;base64,AA==" },
  { setId: "base1", setName: "Base Set", totalCards: 10 },
  { text: "Hej", targetLanguage: "en" },
];
const user = { id: "2f6aa68b-4517-4154-8e8e-81333db96424", role: "authenticated", is_anonymous: false };
beforeEach(() => {
  vi.stubGlobal("Deno", { env: { get: (name: string) => ({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service", LOVABLE_API_KEY: "ai-test" })[name] } });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());
function request(body: unknown, auth?: string) {
  return new Request("https://example.invalid", { method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) }, body: JSON.stringify(body) });
}
describe.each(handlers.map((handler, index) => ({ handler, body: bodies[index], index })))('AI endpoint $index', ({ handler, body }) => {
  it("rejects anonymous requests without contacting the AI provider", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await handler(request(body))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects a public API key used as a bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message: "invalid" }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await handler(request(body, "Bearer anon"))).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects anonymous Auth users", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...user, is_anonymous: true }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await handler(request(body, "Bearer user-token"))).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("stops at an exhausted quota", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(user)).mockResolvedValueOnce(Response.json(false));
    vi.stubGlobal("fetch", fetchMock);
    expect((await handler(request(body, "Bearer user-token"))).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("fails closed when the quota migration is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(user)).mockResolvedValueOnce(Response.json({}, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await handler(request(body, "Bearer user-token"))).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("validates the request before consuming any AI credits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(user)); vi.stubGlobal("fetch", fetchMock);
    expect((await handler(request({}, "Bearer user-token"))).status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("allows a validated user only after the quota is granted", async () => {
    const content = handler === generate ? '[{"name":"Pikachu","number":"1"}]' : handler === analyze ? '{"name":"Pikachu"}' : "Hello";
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(user)).mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content } }] }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await handler(request(body, "Bearer user-token"))).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain("ai.gateway.lovable.dev");
  });
});
it("rejects oversized and malformed images before an AI call", async () => {
  const fetchMock = vi.fn().mockImplementation(async () => Response.json(user)); vi.stubGlobal("fetch", fetchMock);
  expect((await analyze(request({ action: "analyze", image: "https://example.com/a.jpg" }, "Bearer user-token"))).status).toBe(400);
  expect((await analyze(request({ action: "analyze", image: "x".repeat(3000001) }, "Bearer user-token"))).status).toBe(413);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
