import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM_PROMPT = `Tu es un expert en conformité et gestion des incidents dans le secteur des curatelles et protection de l'adulte en Suisse.

Analyse cet email et détermine:
1. S'il s'agit d'un incident potentiel (non-respect des délais, erreur administrative, manquement, dysfonctionnement, comportement inapproprié)
2. La gravité de l'incident (Faible, Moyenne, Haute, Critique)
3. Le type d'incident (Délai, Procédure, Communication, Comportement, Administratif, Financier, Autre)
4. Un score de confiance de 0 à 100

Réponds UNIQUEMENT en JSON avec ce format:
{
  "isIncident": boolean,
  "confidence": number (0-100),
  "gravite": "Faible" | "Moyenne" | "Haute" | "Critique",
  "type": string,
  "titre": string (titre court de l'incident),
  "faits": string (résumé factuel),
  "dysfonctionnement": string (problème identifié),
  "institution": string (institution concernée si identifiable),
  "justification": string (pourquoi c'est ou n'est pas un incident)
}`;

async function analyzeWithAI(emailContent: string): Promise<any> {
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: emailContent }
      ],
    }),
  });

  if (!response.ok) {
    console.error("AI analysis failed:", await response.text());
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) return null;

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse AI response as JSON");
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId, autoCreate = false, confidenceThreshold = 70 } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the email
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("*")
      .eq("id", emailId)
      .single();

    if (emailError || !email) {
      return new Response(JSON.stringify({ error: "Email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already processed
    if (email.processed && email.ai_analysis) {
      return new Response(JSON.stringify({ 
        message: "Email already processed",
        analysis: email.ai_analysis 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Analyze with AI
    const emailContent = `
De: ${email.sender}
Sujet: ${email.subject}
Date: ${email.received_at}

${email.body}
    `.trim();

    console.log("Analyzing email:", email.subject);
    const analysis = await analyzeWithAI(emailContent);

    if (!analysis) {
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Analysis result:", analysis);

    // Update email with analysis
    await supabase
      .from("emails")
      .update({ 
        ai_analysis: analysis,
        processed: true 
      })
      .eq("id", emailId);

    let createdIncident = null;

    // Auto-create incident if criteria met
    if (autoCreate && analysis.isIncident && analysis.confidence >= confidenceThreshold) {
      console.log(`Creating incident automatically (confidence: ${analysis.confidence}%)`);

      const { data: incident, error: incError } = await supabase
        .from("incidents")
        .insert({
          titre: analysis.titre || email.subject,
          faits: analysis.faits || email.body.substring(0, 1000),
          dysfonctionnement: analysis.dysfonctionnement || "À compléter",
          institution: analysis.institution || "Non identifiée",
          type: analysis.type || "Autre",
          gravite: analysis.gravite || "Moyenne",
          priorite: analysis.gravite === "Critique" ? "critique" : 
                   analysis.gravite === "Haute" ? "haute" : "normale",
          date_incident: new Date(email.received_at).toISOString().split("T")[0],
          email_source_id: emailId,
          confidence_level: `${analysis.confidence}%`,
          gmail_references: email.gmail_thread_id ? [email.gmail_thread_id] : [],
          score: analysis.confidence,
        })
        .select()
        .single();

      if (incError) {
        console.error("Failed to create incident:", incError);
      } else {
        createdIncident = incident;
        console.log("Incident created:", incident.numero);

        // Link email to incident
        await supabase
          .from("emails")
          .update({ incident_id: incident.id })
          .eq("id", emailId);

        // Sync to Google Sheets if configured
        try {
          const sheetsResponse = await fetch(`${SUPABASE_URL}/functions/v1/sheets-sync`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              action: "sync-incident",
              incidentId: incident.id 
            }),
          });
          
          if (sheetsResponse.ok) {
            console.log("Incident synced to Google Sheets");
          }
        } catch (sheetError) {
          console.error("Sheets sync failed:", sheetError);
          // Non-blocking error
        }

        // Send notification if critical
        if (analysis.gravite === "Critique" || analysis.gravite === "Haute") {
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/notify-critical`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ incidentId: incident.id }),
            });
            console.log("Critical notification sent");
          } catch (notifyError) {
            console.error("Notification failed:", notifyError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      analysis,
      incidentCreated: !!createdIncident,
      incident: createdIncident
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto-process error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
