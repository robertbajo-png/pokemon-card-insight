import { supabase } from "@/integrations/supabase/client";

export async function invokeAi(name: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session || session.user.is_anonymous) throw new Error("Logga in för att använda AI-funktionerna.");
  const { data, error } = await supabase.functions.invoke(name, {
    body, signal, headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    const status = error.context instanceof Response ? error.context.status : undefined;
    if (status === 429) throw new Error("Din AI-kvot är förbrukad för tillfället. Försök igen senare.");
    if (status === 401 || status === 403) throw new Error("Logga in igen för att använda AI-funktionerna.");
    if (status === 503) throw new Error("AI-tjänsten är inte tillgänglig just nu. Försök igen senare.");
    throw new Error("AI-anropet misslyckades. Försök igen.");
  }
  return data;
}
