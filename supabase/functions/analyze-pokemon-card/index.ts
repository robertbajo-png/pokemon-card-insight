import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const requestData = await req.json();
    const { image, action, searchQuery, types, rarity, pageSize = 20 } = requestData;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'analyze' && image) {
      // Analyze uploaded card image
      systemPrompt = `Du är en expert på Pokemon-kort. Analysera bilden av Pokemon-kortet mycket noggrant.

KRITISKT VIKTIGT - FOKUSERA PÅ SET-IDENTIFIERING:
1. Titta noga i NEDRE HÖGRA HÖRNET av kortet - där finns set-symbolen och kortnumret
2. Set-symbolen är en liten ikon som identifierar vilket set kortet kommer från
3. Bredvid symbolen står det ofta ett nummer i formatet "X/Y" (t.ex. "4/102")
4. Använd set-symbolen och numret för att identifiera exakt vilket set detta är

Vanliga Pokemon-kort sets och deras symboler:
- Base Set (1999): Cirkel med 1 edition text eller ingen symbol
- Jungle: Dschungel-löv symbol
- Fossil: Fossil-symbol
- Team Rocket: R-symbol
- Gym Heroes/Challenge: Gym badge-symboler
- Neo sets: Neo-text symboler

Svara ENDAST med giltig JSON i detta exakta format (utan extra text):
{
  "name": "kortets namn",
  "type": "typ (Fire, Water, Lightning, Grass, Psychic, Fighting, Darkness, Metal, Dragon, Fairy, Colorless)",
  "rarity": "sällsynthet (Common, Uncommon, Rare, Rare Holo, Ultra Rare, Secret Rare)",
  "set": "exakt set-namn baserat på symbol i nedre högra hörnet",
  "setCode": "set-kod om synlig",
  "number": "kortnummer/totalt (från nedre högra hörnet)",
  "hp": "HP-värde",
  "attacks": [{"name": "attacknamn", "damage": "skada", "cost": ["energityp"]}],
  "weaknesses": [{"type": "typ", "value": "värde"}],
  "resistances": [{"type": "typ", "value": "värde"}],
  "retreatCost": antal,
  "estimatedValue": "prisintervall i SEK",
  "condition": "Near Mint/Lightly Played/Moderately Played/Heavily Played/Damaged",
  "description": "kortbeskrivning"
}`;

      userPrompt = `Analysera detta Pokemon-kort från bilden. Fokusera EXTRA NOGA på set-symbolen i NEDRE HÖGRA HÖRNET för att identifiera vilket set kortet kommer från. Titta på både symbolen och kortnumret för exakt set-identifiering.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: image } }
              ]
            }
          ],
        }),
      });

      if (!response.ok) {
        console.error('AI gateway error:', response.status, await response.text());
        throw new Error('AI gateway error');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (action === 'generate') {
      // Generate card data for gallery
      console.log('Generating cards with params:', { searchQuery, types, rarity, pageSize });
      
      systemPrompt = `Du är en expert på Pokemon-kort. Generera en lista med realistiska Pokemon-kort baserat på sökkriterierna.
Svara ENDAST med giltig JSON-array i detta exakta format (utan extra text):
[
  {
    "id": "unikt-id",
    "name": "Pokemon-namn",
    "images": {"small": "https://images.pokemontcg.io/base1/4.png", "large": "https://images.pokemontcg.io/base1/4_hires.png"},
    "types": ["Fire"],
    "rarity": "Rare Holo",
    "set": {"name": "Base Set", "series": "Base"},
    "number": "4",
    "hp": "120",
    "attacks": [{"name": "Fire Spin", "damage": "100", "cost": ["Fire", "Fire", "Fire", "Fire"]}],
    "weaknesses": [{"type": "Water", "value": "×2"}],
    "resistances": [{"type": "Fighting", "value": "-30"}],
    "retreatCost": ["Colorless", "Colorless", "Colorless"],
    "cardmarket": {"prices": {"averageSellPrice": 50}}
  }
]
Generera ${pageSize} olika kort. Använd riktiga Pokemon-namn och realistiska värden.`;

      let filters = [];
      if (searchQuery) filters.push(`sökning: "${searchQuery}"`);
      if (types && types.length > 0) filters.push(`typer: ${types.join(', ')}`);
      if (rarity) filters.push(`sällsynthet: ${rarity}`);
      
      userPrompt = filters.length > 0 
        ? `Generera Pokemon-kort med dessa filter: ${filters.join(', ')}`
        : 'Generera en blandning av populära Pokemon-kort';

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
      });

      if (!response.ok) {
        console.error('AI gateway error:', response.status, await response.text());
        throw new Error('AI gateway error');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      console.log('AI response received, extracting JSON...');
      
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Could not find JSON in AI response:', content);
        throw new Error('Could not parse AI response');
      }
      
      const cards = JSON.parse(jsonMatch[0]);
      console.log(`Successfully generated ${cards.length} cards`);
      
      return new Response(JSON.stringify({ data: cards, totalCount: cards.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action or missing parameters');

  } catch (error) {
    console.error('Error in analyze-pokemon-card function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
