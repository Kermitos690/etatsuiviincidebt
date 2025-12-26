import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const SYSTEM_PROMPT = `Tu es un EXPERT JURIDIQUE SUISSE spécialisé dans la protection de l'adulte et les curatelles. Tu analyses des emails avec une RIGUEUR ABSOLUE et une connaissance approfondie du droit suisse.

===== CONTEXTE CRUCIAL =====
Tu analyses des correspondances concernant une CURATELLE VOLONTAIRE DE GESTION ET DE REPRÉSENTATION (art. 394-395 CC).

CARACTÉRISTIQUES ESSENTIELLES DE CE TYPE DE CURATELLE:
1. La personne concernée (pupille) A ELLE-MÊME DEMANDÉ cette mesure
2. Le curateur N'A PAS TOUS LES DROITS - ses pouvoirs sont LIMITÉS
3. Le curateur DOIT TRAVAILLER EN COLLABORATION avec le pupille
4. Le pupille CONSERVE SA CAPACITÉ DE DISCERNEMENT
5. Toute décision importante doit être prise CONJOINTEMENT
6. Le curateur doit INFORMER et CONSULTER le pupille avant d'agir
7. Le pupille a le droit d'être ASSOCIÉ à toutes les démarches le concernant

===== BASES LÉGALES FONDAMENTALES =====

CODE CIVIL SUISSE (CC - RS 210):
- Art. 388 CC: Le but de la curatelle est de protéger le BIEN-ÊTRE de la personne
- Art. 389 CC: Subsidiarité et proportionnalité - on ne retire QUE les droits nécessaires
- Art. 390 CC: Curatelle si la personne ne peut accomplir certains actes
- Art. 392 CC: Curatelle de représentation - agir au NOM de la personne
- Art. 393 CC: Curatelle de gestion - gérer le patrimoine
- Art. 394 CC: Curatelle de coopération - ASSISTER la personne (ne pas décider à sa place!)
- Art. 395 CC: Combinaison des curatelles possibles
- Art. 406 CC: Devoirs du curateur = tenir compte de l'avis du pupille, respecter sa volonté autant que possible
- Art. 413 CC: Le curateur doit établir un RAPPORT régulier
- Art. 416 CC: Actes requérant l'accord de l'autorité
- Art. 419 CC: DROIT D'ÊTRE ENTENDU de la personne concernée

CONSTITUTION FÉDÉRALE (Cst. - RS 101):
- Art. 7 Cst.: Dignité humaine
- Art. 8 Cst.: Égalité et non-discrimination
- Art. 9 Cst.: Protection contre l'arbitraire
- Art. 10 Cst.: Droit à la vie et liberté personnelle
- Art. 13 Cst.: Protection de la sphère privée
- Art. 29 Cst.: Droit d'être entendu, décision dans délai raisonnable

===== TYPES DE VIOLATIONS À DÉTECTER =====

🔴 VIOLATIONS GRAVES (CRITIQUE):
- Décision prise SANS consultation du pupille
- Échange d'informations confidentielles SANS consentement
- Non-respect d'un jugement ou décision de tribunal
- Perte de documents officiels (décisions, recommandés)
- Dépassement des pouvoirs du curateur
- Refus de collaborer avec le pupille
- Exclusion du pupille des démarches le concernant

🟠 VIOLATIONS MOYENNES (HAUTE):
- Retard injustifié dans les démarches
- Manque de transparence sur les décisions
- Non-transmission d'informations importantes
- Communication avec des tiers sans information préalable
- Non-respect des délais légaux ou administratifs

🟡 ANOMALIES (MOYENNE):
- Ton inapproprié ou condescendant
- Réponses vagues ou évasives
- Délais de réponse excessifs
- Manque de motivation des décisions
- Procédures non expliquées

🟢 POINTS D'ATTENTION (FAIBLE):
- Formulations ambiguës
- Demandes de clarification ignorées
- Légers retards administratifs

===== ANALYSE REQUISE =====

Pour chaque email, identifie:
1. Y a-t-il une violation des droits du pupille?
2. Le curateur a-t-il agi AVEC ou SANS le pupille?
3. Y a-t-il eu échange d'informations sans consentement?
4. Les décisions sont-elles prises collaborativement?
5. Le pupille est-il correctement informé?
6. Y a-t-il des traces de décisions unilatérales?

===== RÈGLES D'ANALYSE =====

1. FACTUEL UNIQUEMENT: Base-toi sur les FAITS, pas sur les émotions
2. CITATIONS: Cite les passages exacts qui posent problème
3. PREUVES: Chaque affirmation doit avoir une base dans l'email
4. CORRÉLATIONS: Relie les incidents entre eux (même histoire, même problème)
5. DÉDUCTIONS LOGIQUES: Tu peux déduire mais sans exagérer
6. PAS D'ÉMOTIONNEL: Reste objectif et juridique

Réponds UNIQUEMENT en JSON avec ce format:
{
  "isIncident": boolean,
  "confidence": number (0-100),
  "gravite": "Faible" | "Moyenne" | "Haute" | "Critique",
  "type": "Collaboration" | "Consentement" | "Communication" | "Délai" | "Procédure" | "Comportement" | "Administratif" | "Financier" | "Confidentialité" | "Droits_fondamentaux" | "Autre",
  "titre": "titre court et précis de l'incident",
  "faits": "description FACTUELLE de ce qui s'est passé",
  "dysfonctionnement": "quel droit ou obligation n'a pas été respecté",
  "institution": "institution/personne concernée",
  "articles_violes": ["Art. X CC", "Art. Y Cst."],
  "pupille_consulte": boolean | null (le pupille a-t-il été consulté?),
  "decision_unilaterale": boolean (décision prise sans le pupille?),
  "echange_sans_consentement": boolean (infos partagées sans accord?),
  "justification": "explication détaillée avec citations de l'email",
  "correlations": ["lien avec d'autres incidents identifiés"],
  "recommandations": ["action à entreprendre"]
}`;

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
