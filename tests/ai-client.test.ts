// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { invokeAi } from "@/services/aiFunctions";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mocks.getSession }, functions: { invoke: mocks.invoke } } }));
beforeEach(() => { vi.clearAllMocks(); });
it("never sends an AI request with only a public key", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  await expect(invokeAi("analyze-pokemon-card", {})).rejects.toThrow("Logga in");
  expect(mocks.invoke).not.toHaveBeenCalled();
});
it("forwards the user token and abort signal", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "user-token", user: { is_anonymous: false } } } });
  mocks.invoke.mockResolvedValue({ data: { name: "Pikachu" }, error: null });
  const controller = new AbortController();
  expect(await invokeAi("analyze-pokemon-card", { action: "analyze" }, controller.signal)).toEqual({ name: "Pikachu" });
  expect(mocks.invoke).toHaveBeenCalledWith("analyze-pokemon-card", { body: { action: "analyze" }, signal: controller.signal, headers: { Authorization: "Bearer user-token" } });
});
it("explains quota exhaustion to the user", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "user-token", user: {} } } });
  mocks.invoke.mockResolvedValue({ error: { context: new Response(null, { status: 429 }) } });
  await expect(invokeAi("translate", {})).rejects.toThrow("AI-kvot");
});
