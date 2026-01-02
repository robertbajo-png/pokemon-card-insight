import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { setId, setName, totalCards } = await req.json();
    
    console.log(`Generating cards for set: ${setName} (${setId}), total: ${totalCards}`);
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const cardsToGenerate = Math.min(totalCards, 60);
    
    // Generate card data using Lovable AI
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

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 8192,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.choices?.[0]?.message?.content;
    
    if (!textContent) {
      console.error('No content in AI response:', aiResponse);
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

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
      console.error('Failed to parse AI response:', textContent.substring(0, 500));
      throw new Error('Failed to parse card data from AI');
    }

    // Format cards to match expected structure
    const formattedCards = cards.map((card: any, index: number) => ({
      id: card.id || `${setId}-${index + 1}`,
      name: card.name,
      number: String(card.number || index + 1),
      rarity: card.rarity || 'Common',
      types: card.types || [],
      supertype: card.supertype || 'Pokémon',
      hp: card.hp || '60',
      set: {
        id: setId,
        name: setName
      },
      images: {
        small: `https://images.pokemontcg.io/${setId}/${card.number || index + 1}.png`,
        large: `https://images.pokemontcg.io/${setId}/${card.number || index + 1}_hires.png`
      }
    }));

    console.log(`Generated ${formattedCards.length} cards for ${setName}`);

    return new Response(
      JSON.stringify({ data: formattedCards, totalCount: formattedCards.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating cards:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
