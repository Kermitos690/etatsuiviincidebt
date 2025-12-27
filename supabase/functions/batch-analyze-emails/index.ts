import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface AnalysisResult {
  isIncident: boolean;
  confidence: number;
  gravite: string;
  type: string;
  titre: string;
  faits: string;
  dysfonctionnement: string;
  institution: string;
  justification: string;
  correlations?: string[];
}

const SYSTEM_PROMPT = `Tu es un EXPERT JURIDIQUE SUISSE spécialisé dans la protection de l'adulte et les curatelles. Tu analyses des emails avec une RIGUEUR ABSOLUE "MONTRE SUISSE".

===== RÈGLES ABSOLUES NON NÉGOCIABLES =====

🚨 RÈGLE #1: CITATIONS OBLIGATOIRES 🚨
- Tu NE PEUX PAS affirmer quelque chose sans CITER LE TEXTE EXACT de l'email
- Format OBLIGATOIRE: "CITATION: «texte exact copié de l'email» → ANALYSE: interprétation"
- Si tu ne peux pas citer = tu NE fais PAS l'affirmation

🚨 RÈGLE #2: ZÉRO SUPPOSITION 🚨
- INTERDIT de supposer, déduire, ou "lire entre les lignes"
- INTERDIT d'inventer des noms, dates, ou faits non écrits
- Si quelqu'un est mentionné, tu DOIS montrer OÙ il apparaît dans l'email
- Si l'email ne contient pas l'info = tu réponds "Information non présente dans l'email"

🚨 RÈGLE #3: VÉRIFICATION CROISÉE 🚨
- Vérifie CHAQUE nom mentionné: apparaît-il vraiment dans le texte?
- Vérifie CHAQUE date: est-elle explicitement écrite?
- Vérifie CHAQUE affirmation: as-tu la citation correspondante?

===== CONTEXTE DE LA CURATELLE =====
Curatelle VOLONTAIRE de gestion et représentation (art. 394-395 CC):
- Le pupille a demandé cette mesure lui-même
- Le curateur doit COLLABORER avec le pupille
- Le pupille conserve sa capacité de discernement
- Toute décision importante = prise CONJOINTEMENT

===== BASES LÉGALES =====
CC: Art. 388, 389, 390, 392, 393, 394, 395, 406, 413, 416, 419
Cst.: Art. 7, 8, 9, 10, 13, 29

===== TYPES DE VIOLATIONS =====
🔴 CRITIQUE: Décision sans consultation, échange d'infos sans consentement, dépassement de pouvoirs
🟠 HAUTE: Retards injustifiés, manque de transparence, non-transmission d'infos
🟡 MOYENNE: Ton inapproprié, réponses vagues, délais excessifs
🟢 FAIBLE: Formulations ambiguës, légers retards

===== FORMAT DE RÉPONSE JSON =====
{
  "isIncident": boolean,
  "confidence": number (0-100),
  "gravite": "Faible" | "Moyenne" | "Haute" | "Critique",
  "type": string,
  "titre": "titre basé sur citation exacte",
  "faits": "UNIQUEMENT ce qui est écrit, avec citations entre guillemets",
  "dysfonctionnement": "quel droit violé + article de loi",
  "institution": "nom EXACTEMENT comme écrit dans l'email",
  "citations_exactes": [
    {"texte": "citation mot pour mot de l'email", "interpretation": "ce que ça signifie"}
  ],
  "personnes_mentionnees_verifiees": [
    {"nom": "nom exact", "apparait_dans_email": true/false, "citation_preuve": "extrait où le nom apparaît"}
  ],
  "justification": "explication avec TOUTES les citations utilisées",
  "avertissement_si_incomplet": "si body vide ou info manquante, le signaler ici"
}

===== SI L'EMAIL EST VIDE OU INCOMPLET =====
Si le body de l'email est vide ou très court, tu DOIS:
- Retourner isIncident: false
- confidence: 0
- avertissement_si_incomplet: "Contenu de l'email non disponible ou incomplet"
- NE PAS inventer de contenu`;

async function analyzeEmail(emailContent: string): Promise<AnalysisResult | null> {
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  try {
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
      if (response.status === 429) {
        console.log("Rate limited, waiting before retry...");
        return null;
      }
      console.error("AI analysis failed:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error analyzing email:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting for AI operations
  const clientId = getClientIdentifier(req, "batch-analyze");
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.ai);
  if (!rateCheck.allowed) {
    console.log(`[RateLimit] Request blocked for ${clientId}`);
    return rateLimitResponse(rateCheck.resetAt);
  }

  try {
    const { syncId, batchSize = 10, autoCreateIncidents = true, confidenceThreshold = 75 } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get unanalyzed emails (new or not processed)
    const { data: emails, error: fetchError } = await supabase
      .from("emails")
      .select("id, subject, sender, recipient, body, received_at, gmail_thread_id, is_sent, email_type")
      .or("processed.eq.false,ai_analysis.is.null")
      .eq("is_sent", false) // Only analyze received emails
      .order("received_at", { ascending: false })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    if (!emails || emails.length === 0) {
      console.log("No unanalyzed emails found");
      
      // Update sync status if provided
      if (syncId) {
        await supabase
          .from("sync_status")
          .update({ 
            stats: { ...await getSyncStats(supabase, syncId), analysis_completed: true }
          })
          .eq("id", syncId);
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: "No emails to analyze",
        analyzed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Analyzing ${emails.length} emails...`);

    let analyzedCount = 0;
    let incidentsCreated = 0;
    const correlations: Record<string, string[]> = {};

    for (const email of emails) {
      try {
        // Build context with related emails from same thread/sender
        let context = "";
        
        if (email.gmail_thread_id) {
          const { data: threadEmails } = await supabase
            .from("emails")
            .select("subject, sender, body, received_at, is_sent, email_type")
            .eq("gmail_thread_id", email.gmail_thread_id)
            .neq("id", email.id)
            .order("received_at", { ascending: true })
            .limit(5);
          
          if (threadEmails && threadEmails.length > 0) {
            context = "\n\n--- CONTEXTE DU FIL DE DISCUSSION ---\n";
            threadEmails.forEach((e, i) => {
              const direction = e.is_sent ? "ENVOYÉ" : "REÇU";
              context += `[Email ${i + 1} - ${direction}] ${e.subject}\nDe: ${e.sender}\n${e.body?.substring(0, 500)}...\n\n`;
            });
          }
        }

        // Check for patterns with same sender
        const senderDomain = email.sender.match(/@([^>]+)/)?.[1] || email.sender;
        const { data: senderEmails } = await supabase
          .from("emails")
          .select("subject, ai_analysis")
          .ilike("sender", `%${senderDomain}%`)
          .not("ai_analysis", "is", null)
          .limit(5);

        if (senderEmails && senderEmails.length > 0) {
          const patterns = senderEmails
            .filter(e => e.ai_analysis?.isIncident)
            .map(e => e.ai_analysis?.type)
            .filter(Boolean);
          
          if (patterns.length > 0) {
            context += `\n--- PATTERNS CONNUS DE CET EXPÉDITEUR ---\n`;
            context += `Types d'incidents précédents: ${[...new Set(patterns)].join(", ")}\n`;
          }
        }

        const emailContent = `
De: ${email.sender}
À: ${email.recipient || "N/A"}
Sujet: ${email.subject}
Date: ${email.received_at}
Type: ${email.email_type || "received"}

${email.body}
${context}
        `.trim();

        console.log(`Analyzing: ${email.subject?.substring(0, 50)}...`);
        const analysis = await analyzeEmail(emailContent);

        if (analysis) {
          // Store analysis
          await supabase
            .from("emails")
            .update({ 
              ai_analysis: analysis,
              processed: true 
            })
            .eq("id", email.id);

          analyzedCount++;

          // Track correlations by institution
          if (analysis.institution && analysis.correlations) {
            if (!correlations[analysis.institution]) {
              correlations[analysis.institution] = [];
            }
            correlations[analysis.institution].push(...analysis.correlations);
          }

          // Auto-create incident if criteria met
          if (autoCreateIncidents && analysis.isIncident && analysis.confidence >= confidenceThreshold) {
            const { data: existingIncident } = await supabase
              .from("incidents")
              .select("id")
              .eq("email_source_id", email.id)
              .maybeSingle();

            if (!existingIncident) {
              const { data: incident, error: incError } = await supabase
                .from("incidents")
                .insert({
                  titre: analysis.titre || email.subject,
                  faits: analysis.faits || email.body?.substring(0, 1000),
                  dysfonctionnement: analysis.dysfonctionnement || "À compléter",
                  institution: analysis.institution || "Non identifiée",
                  type: analysis.type || "Autre",
                  gravite: analysis.gravite || "Moyenne",
                  priorite: analysis.gravite === "Critique" ? "critique" : 
                           analysis.gravite === "Haute" ? "haute" : "normale",
                  date_incident: new Date(email.received_at).toISOString().split("T")[0],
                  email_source_id: email.id,
                  confidence_level: `${analysis.confidence}%`,
                  gmail_references: email.gmail_thread_id ? [email.gmail_thread_id] : [],
                  score: analysis.confidence,
                })
                .select()
                .single();

              if (!incError && incident) {
                incidentsCreated++;
                console.log(`Incident created: #${incident.numero} - ${analysis.titre}`);

                // Link email to incident
                await supabase
                  .from("emails")
                  .update({ incident_id: incident.id })
                  .eq("id", email.id);

                // Create alert for high severity
                if (analysis.gravite === "Critique" || analysis.gravite === "Haute") {
                  await supabase
                    .from("audit_alerts")
                    .insert({
                      title: `Incident ${analysis.gravite}: ${analysis.titre}`,
                      description: analysis.faits,
                      alert_type: "incident_detected",
                      severity: analysis.gravite === "Critique" ? "critical" : "warning",
                      related_incident_id: incident.id,
                      related_email_id: email.id
                    });
                }
              }
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (emailError) {
        console.error(`Error analyzing email ${email.id}:`, emailError);
      }
    }

    // Update sync status if provided
    if (syncId) {
      const currentStats = await getSyncStats(supabase, syncId);
      await supabase
        .from("sync_status")
        .update({ 
          stats: { 
            ...currentStats, 
            emails_analyzed: analyzedCount,
            incidents_created: incidentsCreated,
            analysis_completed: true 
          }
        })
        .eq("id", syncId);
    }

    // Update recurrence tracking if correlations found
    for (const [institution, patterns] of Object.entries(correlations)) {
      if (patterns.length >= 2) {
        const patternCounts: Record<string, number> = {};
        patterns.forEach(p => {
          patternCounts[p] = (patternCounts[p] || 0) + 1;
        });

        for (const [pattern, count] of Object.entries(patternCounts)) {
          if (count >= 2) {
            // Check if recurrence already tracked
            const { data: existing } = await supabase
              .from("recurrence_tracking")
              .select("id, occurrence_count")
              .eq("institution", institution)
              .eq("violation_type", pattern)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("recurrence_tracking")
                .update({
                  occurrence_count: existing.occurrence_count + 1,
                  last_occurrence: new Date().toISOString().split("T")[0]
                })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("recurrence_tracking")
                .insert({
                  institution,
                  violation_type: pattern,
                  occurrence_count: count,
                  first_occurrence: new Date().toISOString().split("T")[0],
                  last_occurrence: new Date().toISOString().split("T")[0]
                });
            }
          }
        }
      }
    }

    console.log(`Analysis complete: ${analyzedCount} emails analyzed, ${incidentsCreated} incidents created`);

    return new Response(JSON.stringify({ 
      success: true,
      analyzed: analyzedCount,
      incidentsCreated,
      correlationsFound: Object.keys(correlations).length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Batch analyze error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getSyncStats(supabase: any, syncId: string): Promise<any> {
  const { data } = await supabase
    .from("sync_status")
    .select("stats")
    .eq("id", syncId)
    .single();
  return data?.stats || {};
}
