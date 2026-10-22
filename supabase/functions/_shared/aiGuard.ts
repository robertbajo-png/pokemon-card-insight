export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function errorResponse(error: unknown) {
  console.error("AI request failed:", error);
  const status = error instanceof HttpError ? error.status : 500;
  return new Response(JSON.stringify({ error: error instanceof HttpError ? error.message : "AI-tjänsten kunde inte slutföra anropet." }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json", ...(status === 429 ? { "Retry-After": "3600" } : {}) },
  });
}

function environment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(503, "AI-tjänsten är inte konfigurerad.");
  return value;
}

export async function requireUser(req: Request): Promise<string> {
  if (req.method !== "POST") throw new HttpError(405, "Endast POST stöds.");
  const authorization = req.headers.get("Authorization");
  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) throw new HttpError(401, "Logga in för att använda AI.");
  const response = await fetch(`${environment("SUPABASE_URL")}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: environment("SUPABASE_ANON_KEY") },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(response.status >= 500 ? 503 : 401, "Kunde inte verifiera inloggningen.");
  const user = await response.json();
  if (typeof user.id !== "string" || user.is_anonymous === true || user.role !== "authenticated") throw new HttpError(403, "Ett inloggat användarkonto krävs.");
  return user.id;
}

export async function consumeAiQuota(userId: string, action: "analyze" | "generate" | "translate") {
  const key = environment("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${environment("SUPABASE_URL")}/rest/v1/rpc/consume_ai_quota`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_user_id: userId, p_action: action }), signal: AbortSignal.timeout(10000),
  });
  // A missing migration or an unavailable quota store must never grant free access.
  if (!response.ok) throw new HttpError(503, "AI-kvoten kunde inte kontrolleras. Försök igen senare.");
  if (await response.json() !== true) throw new HttpError(429, "AI-kvoten är förbrukad. Försök igen senare.");
}

export async function readJsonBody(req: Request, maxBytes = 3000000): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new HttpError(415, "JSON krävs.");
  if (Number(req.headers.get("content-length")) > maxBytes) throw new HttpError(413, "Anropet är för stort.");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Anropet saknar innehåll.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new HttpError(413, "Anropet är för stort."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const result = JSON.parse(new TextDecoder().decode(bytes));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error();
    return result;
  } catch { throw new HttpError(400, "Ogiltig JSON."); }
}
