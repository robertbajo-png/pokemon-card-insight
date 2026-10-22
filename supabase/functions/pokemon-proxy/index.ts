import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handleRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/cards';
    const queryParams = url.searchParams.get('query') || '';
    
    if (!/^\/(cards|sets)(\/[a-zA-Z0-9-]+)?$/.test(path)) {
      return new Response(JSON.stringify({ error: "Invalid path" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const apiUrl = `https://api.pokemontcg.io/v2${path}${queryParams ? '?' + queryParams : ''}`;
    console.log('Proxying request to:', apiUrl);
    
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
    
    // Check if the response is OK
    if (!response.ok) {
      console.error(`API returned ${response.status}: ${response.statusText}`);
      return new Response(
        JSON.stringify({ 
          error: `Pokemon TCG API error: ${response.status} ${response.statusText}`,
          data: []
        }), 
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('API returned non-JSON response:', contentType);
      const text = await response.text();
      console.error('Response body:', text.substring(0, 200));
      return new Response(
        JSON.stringify({ 
          error: 'API returned non-JSON response',
          data: []
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in pokemon-proxy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        data: []
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

serve(handleRequest);
