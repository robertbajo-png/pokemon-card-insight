import { HttpError } from "./aiGuard.ts";

type Purpose = "analyze" | "generate" | "translate";

/** Server-only configuration for a directly billed, OpenAI-compatible provider. */
export function getAiProvider(purpose: Purpose) {
  const apiKey = Deno.env.get("AI_API_KEY");
  const base =
    Deno.env.get("AI_BASE_URL") ??
    "https://generativelanguage.googleapis.com/v1beta/openai/";
  const model =
    Deno.env.get(`AI_MODEL_${purpose.toUpperCase()}`) ??
    (purpose === "analyze" ? "gemini-2.5-flash" : "gemini-2.5-flash-lite");
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
      url.hash
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
