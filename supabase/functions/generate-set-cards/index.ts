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
        setId: z.string().regex(/^[a-zA-Z0-9-]{1,50}$/),
        setName: z.string().trim().min(1).max(200),
        totalCards: z.number().int().min(1).max(1000),
      })
      .safeParse(await readJsonBody(req, 4096));
    if (!input.success) throw new HttpError(400, "Ogiltiga setparametrar.");
    const { setId, setName, totalCards } = input.data;
    const ai = getAiProvider("generate");
    await consumeAiQuota(userId, "generate");

    console.log(
      `Generating cards for set: ${setName} (${setId}), total: ${totalCards}`,
    );

    const cardsToGenerate = Math.min(totalCards, 60);

    // Generate card data using the configured provider
    const prompt = `Generate a JSON array of exactly ${cardsToGenerate} Pokemon cards from the "${setName}" Pokemon TCG set. 

For each card, provide:
- id: unique ID like "${setId}-1", "${setId}-2", etc.
- name: Pokemon or Trainer card name (use REAL Pokemon names that would be in this set)
- number: card number in the set (1, 2, 3, etc.)
- rarity: one of "Common", "Uncommon", "Rare", "Rare Holo", "Rare Ultra", "Secret Rare"
- types: array with one type like ["Fire"], ["Water"], ["Grass"], ["Electric"], ["Psychic"], ["Fighting"], ["Dark"], ["Steel"], ["Fairy"], ["Dragon"], ["Normal"] (empty for Trainer cards)
- supertype: "Pokémon" or "Trainer" or "Energy"
- hp: HP value as string like "70", "120", "250" (only for Pokemon)

Return ONLY valid JSON array, no markdown, no explanation. Example format:
[{"id":"${setId}-1","name":"Pikachu","number":"1","rarity":"Common","types":["Electric"],"supertype":"Pokémon","hp":"60"}]

Include a good mix of:
- Basic Pokemon (60%)
- Stage 1 and Stage 2 evolutions (25%)
- Trainer cards (10%)
- Energy cards (5%)

Use Pokemon that would realistically be in the ${setName} set based on the era/generation it represents.`;

    const response = await fetch(ai.url, {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [{ role: "user", content: prompt }],
        ...aiGenerationOptions(ai, 8192),
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      await logAiProviderError(response);
      throw new HttpError(
        response.status === 429 ? 429 : 503,
        "AI-tjänsten är inte tillgänglig just nu.",
      );
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.choices?.[0]?.message?.content;

    if (!textContent) {
      console.error("No content in AI response:", aiResponse);
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON from the response
    let cards;
    try {
      // Try to extract JSON from the response (in case it has markdown)
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cards = JSON.parse(jsonMatch[0]);
      } else {
        cards = JSON.parse(textContent);
      }
    } catch (parseError) {
      console.error(
        "Failed to parse AI response:",
        textContent.substring(0, 500),
      );
      throw new Error("Failed to parse card data from AI");
    }

    cards = z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          number: z
            .union([
              z.string().regex(/^[a-zA-Z0-9]{1,12}$/),
              z.number().int().positive(),
            ])
            .optional(),
          rarity: z.string().optional(),
          types: z.array(z.string()).optional(),
          supertype: z.string().optional(),
          hp: z.string().optional(),
        }),
      )
      .min(1)
      .max(cardsToGenerate)
      .parse(cards);
    // Format cards to match expected structure
    const formattedCards = cards.map(
      (
        card: {
          name: string;
          number?: string | number;
          rarity?: string;
          types?: string[];
          supertype?: string;
          hp?: string;
        },
        index: number,
      ) => ({
        id: `${setId}-${card.number || index + 1}`,
        name: card.name,
        number: String(card.number || index + 1),
        rarity: card.rarity || "Common",
        types: card.types || [],
        supertype: card.supertype || "Pokémon",
        hp: card.hp || "60",
        set: {
          id: setId,
          name: setName,
          series: "AI-genererat",
        },
        images: {
          small: `https://images.pokemontcg.io/${setId}/${card.number || index + 1}.png`,
          large: `https://images.pokemontcg.io/${setId}/${card.number || index + 1}_hires.png`,
        },
      }),
    );

    console.log(`Generated ${formattedCards.length} cards for ${setName}`);

    return new Response(
      JSON.stringify({
        data: formattedCards,
        totalCount: formattedCards.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

serve(handleRequest);
