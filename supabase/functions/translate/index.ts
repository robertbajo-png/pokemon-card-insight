import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import {
  corsHeaders,
  HttpError,
  errorResponse,
  requireUser,
  consumeAiQuota,
  readJsonBody,
} from "../_shared/aiGuard.ts";
import { z } from "npm:zod@3.25.76";
import {
  getAiProvider,
  aiGenerationOptions,
  logAiProviderError,
} from "../_shared/aiProvider.ts";

export async function handleRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await requireUser(req);
    const input = z
      .object({
        text: z.string().trim().min(1).max(2000),
        targetLanguage: z.enum(["sv", "en", "de", "fr", "ja"]),
      })
      .safeParse(await readJsonBody(req, 16000));
    if (!input.success)
      throw new HttpError(400, "Ogiltig text eller målspråk.");
    const { text, targetLanguage } = input.data;
    const ai = getAiProvider("translate");
    await consumeAiQuota(userId, "translate");

    const languageNames: Record<string, string> = {
      sv: "Swedish",
      en: "English",
      de: "German",
      fr: "French",
      ja: "Japanese",
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    const response = await fetch(ai.url, {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      redirect: "error",
      headers: {
        Authorization: `Bearer ${ai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        ...aiGenerationOptions(ai, 2048),
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the given text to ${targetLangName}. Return ONLY the translated text, nothing else. Maintain the same tone and style.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await logAiProviderError(response);
      return new Response(JSON.stringify({ error: "Translation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content || text;

    return new Response(JSON.stringify({ translation: translatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

serve(handleRequest);
