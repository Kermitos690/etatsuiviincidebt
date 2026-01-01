import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsHeaders, log } from "../_shared/core.ts";

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

    const systemPrompt = `Tu es un AUDITEUR JURIDIQUE analysant un fil de discussion email dans le contexte d'une CURATELLE VOLONTAIRE DE GESTION ET DE REPRÉSENTATION (droit suisse).

===== CONTEXTE ESSENTIEL =====
- Le pupille a DEMANDÉ lui-même cette curatelle
- Le curateur N'A PAS TOUS LES DROITS, il doit COLLABORER avec le pupille
- Toute décision doit être prise AVEC le pupille, pas à sa place
- Les échanges avec tiers nécessitent le CONSENTEMENT du pupille

===== ANALYSE DU THREAD =====

Tu dois identifier:

1. QUESTIONS SANS RÉPONSE:
   - Questions du pupille ignorées
   - Demandes d'information non satisfaites
   - Délais de réponse excessifs

2. RUPTURES DE THREAD:
   - Changement soudain de sujet pour éviter une question
   - Nouveau mail sans répondre aux points précédents
   - Ignorance délibérée de certains sujets

3. CONTOURNEMENTS:
   - Réponses vagues à des questions précises
   - Réponses à côté du sujet
   - Évitement de responsabilité

4. EXCLUSION DU PUPILLE:
   - Discussions avec des tiers sans informer le pupille
   - Décisions communiquées après coup
   - Informations cachées ou retenues

5. ÉCHANGES SANS CONSENTEMENT:
   - Informations personnelles partagées avec des tiers
   - Communications faites "dans l'intérêt" du pupille mais sans son accord
   - Violation de la confidentialité

RÈGLES:
- FACTUEL: Chaque affirmation = preuve dans les emails
- Si pas de preuve = "Non déterminable" ou false
- Cite les passages problématiques

Retourne UNIQUEMENT un JSON valide:
{
  "has_unanswered_questions": boolean,
  "unanswered_questions": ["question exacte sans réponse"],
  "days_waiting": [number],
  "thread_break_detected": boolean,
  "break_reason": "description si détectée",
  "circumvention_detected": boolean,
  "circumvention_details": "citation exacte si détecté",
  "pupille_excluded": boolean,
  "exclusion_evidence": ["preuve d'exclusion"],
  "consent_issues": boolean,
  "unauthorized_sharing": ["information partagée sans accord"],
  "unilateral_decisions": ["décision prise sans le pupille"],
  "confidence": "High" | "Medium" | "Low",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "summary": "résumé en 2-3 phrases"
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
