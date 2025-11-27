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

Använd officiella källor:
- Stäm av namn, set, nummer och sällsynthet mot den officiella Pokemon-webbplatsen (pokemon.com) och Bulbapedia för att säkerställa att detaljerna är korrekta.
- Om uppgifterna inte kan bekräftas av dessa källor ska du rapportera värdet som "Unknown" istället för att gissa.

KRITISKT VIKTIGT - FOKUSERA PÅ SET-IDENTIFIERING:
1. Börja med att zooma in på NEDRE HÖGRA HÖRNET för att identifiera set-symbolen och kortnumret (format "X/Y").
2. Matcha symbolen mot kända set. Kontrollera även kortnumret mot rimliga totalsidor (t.ex. Base Set 102, Jungle 64, Fossil 62, Team Rocket 82, Base Set 2 130, Gym Heroes 132, Gym Challenge 132, Neo Genesis 111, Neo Discovery 75).
3. Om du ser en siffra "2" över ett set (Base Set 2) eller Team Rocket "R"-symbolen, välj det specifika setet och inte originalsetet.
4. För moderna set: identifiera tydliga loggor (t.ex. Evolving Skies, Celebrations, Crown Zenith) och validera att kortnumret faller inom setets storlek.
5. Om symbolen är oklar: jämför även typsnitt/placering av kortnumret och kortets layout (ramfärg, holo-mönster) med kända set och välj endast ett set som passar både symbol och nummer.
6. Var hellre försiktig än gissande: välj "Unknown" om du inte säkert kan matcha symbol + nummer till ett set.

Kort checklista för klassiska set-symboler:
- Base Set (1999): Ingen symbol eller "1st Edition"-stämpel
- Jungle: Löv-symbol
- Fossil: Fossil-spiral
- Team Rocket: R-symbol
- Base Set 2: Nummer 2 över en stjärna
- Gym Heroes/Challenge: Gym badge-liknande symboler
- Neo-serien: Neo-text-symboler

Svara ENDAST med giltig JSON i detta exakta format (utan extra text):
{
  "name": "kortets namn",
  "type": "typ (Fire, Water, Lightning, Grass, Psychic, Fighting, Darkness, Metal, Dragon, Fairy, Colorless)",
  "rarity": "sällsynthet (Common, Uncommon, Rare, Rare Holo, Ultra Rare, Secret Rare)",
  "set": "exakt set-namn baserat på symbol i nedre högra hörnet (eller 'Unknown' om du inte är säker)",
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

      userPrompt = `Analysera detta Pokemon-kort från bilden. Identifiera setet genom att först läsa av symbolen och sedan dubbelkolla att kortnumret passar inom setets storlek. Om symbol och nummer inte stämmer, rapportera setet som "Unknown" istället för att gissa.`;

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
