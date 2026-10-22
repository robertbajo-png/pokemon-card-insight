// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardsBySet, searchCards } from "@/services/pokemonTcgApi";
import { withTimeout } from "@/utils/withTimeout";
import { handleRequest as proxy } from "../supabase/functions/pokemon-proxy/index";

afterEach(() => vi.unstubAllGlobals());
describe("card API", () => {
  it("encodes all filters as one proxy parameter, including literal percent and ampersand", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [], totalCount: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    await searchCards({ q: 'name:"A&B 50%"', page: 2, pageSize: 10, orderBy: "name" });
    const outer = new URL(fetchMock.mock.calls[0][0]);
    expect([...outer.searchParams.keys()]).toEqual(["path", "query"]);
    const inner = new URLSearchParams(outer.searchParams.get("query")!);
    expect(Object.fromEntries(inner)).toEqual({ page: "2", pageSize: "10", orderBy: "name", q: 'name:"A&B 50%"' });
  });
  it("loads a set beyond the first 250 cards", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: URL) => {
      const query = new URLSearchParams(url.searchParams.get("query")!);
      const page = Number(query.get("page"));
      return Response.json({ data: Array.from({ length: page === 1 ? 250 : 29 }, (_, i) => ({ id: `${page}-${i}` })), totalCount: 279 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await getCardsBySet("sv2");
    expect(result.data).toHaveLength(279);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not silently turn HTTP errors into an empty collection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "upstream" }, { status: 503 })));
    await expect(getCardsBySet("sv2")).rejects.toThrow("503");
  });
  it("rejects a stale proxy that ignores the requested set filter", async () => {
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({ data:[{ id:"base2-1",set:{ id:"base2" } }],totalCount:1 })));
    await expect(getCardsBySet("base1")).rejects.toThrow("fel set");
  });
  it("rejects repeated pages instead of inflating checklist completion", async () => {
    vi.stubGlobal("fetch",vi.fn().mockImplementation(async () => Response.json({ data:[{ id:"base1-1",set:{ id:"base1" } }],totalCount:2 })));
    await expect(getCardsBySet("base1")).rejects.toThrow("upprepade sidor");
  });
  it("aborts the fetch when a timeout expires", async () => {
    const aborted = vi.fn();
    vi.stubGlobal("fetch", vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => { aborted(); reject(options.signal.reason); });
    })));
    await expect(withTimeout(signal => getCardsBySet("sv2", signal), new AbortController().signal, 5)).rejects.toThrow();
    expect(aborted).toHaveBeenCalledOnce();
  });
  it("propagates navigation cancellation", async () => {
    const parent = new AbortController();
    const request = withTimeout(signal => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason));
    }), parent.signal);
    parent.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
  it("preserves percent characters and nested query values through the proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [], totalCount: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    const query = new URLSearchParams({ q: 'name:"50% & Pikachu"', pageSize: "10" });
    const outer = new URLSearchParams({ path: "/cards", query: query.toString() });
    const response = await proxy(new Request(`https://example.invalid?${outer}`));
    expect(response.status).toBe(200);
    const upstream = new URL(fetchMock.mock.calls[0][0]);
    expect(upstream.searchParams.get("q")).toBe('name:"50% & Pikachu"');
    expect(upstream.searchParams.get("pageSize")).toBe("10");
  });
  it("rejects proxy paths outside the card API routes", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await proxy(new Request("https://example.invalid?path=/../../elsewhere"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
