import { HttpError } from "./aiGuard.ts";

type Purpose = "analyze" | "generate" | "translate";

/** Server-only configuration for a directly billed, OpenAI-compatible provider. */
export function getAiProvider(purpose: Purpose) {
  const genericKey = Deno.env.get("AI_API_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const apiKey = genericKey || openAiKey;
  const useOpenAiDefaults = !genericKey && !!openAiKey;
  const base =
    Deno.env.get("AI_BASE_URL") ??
    (useOpenAiDefaults
      ? "https://api.openai.com/v1"
      : "https://generativelanguage.googleapis.com/v1beta/openai/");
  const model =
    Deno.env.get(`AI_MODEL_${purpose.toUpperCase()}`) ??
    (useOpenAiDefaults
      ? "gpt-5.4-mini-2026-03-17"
      : purpose === "analyze"
        ? "gemini-2.5-flash"
        : "gemini-2.5-flash-lite");
  if (!apiKey || !model.trim()) {
    throw new HttpError(503, "AI-tjänsten är inte konfigurerad.");
  }
  let url: URL;
  try {
    url = new URL(base);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (useOpenAiDefaults && url.origin !== "https://api.openai.com")
    ) {
      throw new Error();
    }
    url.pathname = `${url.pathname.replace(/\/$/, "")}/chat/completions`;
  } catch {
    throw new HttpError(
      503,
      "AI-tjänstens adress är inte korrekt konfigurerad.",
    );
  }
  return { url: url.toString(), apiKey, model };
}

/** Modern OpenAI models require max_completion_tokens instead of max_tokens. */
export function aiGenerationOptions(
  ai: ReturnType<typeof getAiProvider>,
  limit: number,
) {
  return new URL(ai.url).hostname === "api.openai.com"
    ? { max_completion_tokens: limit, store: false }
    : { max_tokens: limit };
}

/** Report actionable provider errors without logging credentials or response bodies. */
export async function logAiProviderError(response: Response) {
  const knownCodes = new Set([
    "insufficient_quota",
    "invalid_api_key",
    "model_not_found",
    "rate_limit_exceeded",
    "unsupported_parameter",
    "billing_hard_limit_reached",
  ]);
  let code = "provider_error";
  try {
    const body = await response.json();
    if (knownCodes.has(body?.error?.code)) code = body.error.code;
  } catch {
    /* Some compatible providers return a non-JSON error body. */
  }
  console.error("AI provider error:", response.status, code);
}
