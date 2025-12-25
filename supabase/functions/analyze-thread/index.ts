import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Tu es un auditeur factuel analysant un thread d'emails. Tu dois:
1. Identifier les questions posées sans réponse
2. Détecter les ruptures de thread (nouveau mail lié sans répondre au précédent)
3. Repérer les contournements (réponse à côté, changement de sujet)

RÈGLE D'OR: Toute affirmation = preuve. Si pas de preuve = "Non déterminable".

Retourne UNIQUEMENT un JSON valide:
{
  "has_unanswered_questions": boolean,
  "unanswered_questions": ["question1", "question2"],
  "thread_break_detected": boolean,
  "break_reason": "raison si détectée",
  "circumvention_detected": boolean,
  "circumvention_details": "détails si détecté",
  "confidence": "High" | "Medium" | "Low"
}`;

    const threadContent = messages.map((m: any) => 
      `[${m.date}] De: ${m.sender}\nSujet: ${m.subject}\n${m.body}`
    ).join("\n\n---\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyse ce thread:\n\n${threadContent}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({
      threadId,
      analysis,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Thread analysis error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
