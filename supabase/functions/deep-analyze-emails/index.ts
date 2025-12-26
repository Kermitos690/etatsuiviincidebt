import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Différentes perspectives d'analyse
const ANALYSIS_PERSPECTIVES = [
  {
    name: "collaboration",
    prompt: `Tu es un expert en droit de la protection de l'adulte. Analyse cet email UNIQUEMENT sous l'angle de la COLLABORATION curateur-pupille.

CONTEXTE: Curatelle VOLONTAIRE de gestion et représentation. Le curateur N'A PAS tous les droits, il DOIT collaborer.

RECHERCHE SPÉCIFIQUE:
- Le pupille a-t-il été consulté avant une action?
- Y a-t-il des décisions prises SANS le pupille?
- Le pupille est-il exclu de discussions le concernant?
- Le curateur agit-il unilatéralement?

Réponds UNIQUEMENT en JSON:
{
  "incident_detected": boolean,
  "type": "collaboration",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "evidence": ["citation exacte du texte prouvant le problème"],
  "description": "description factuelle",
  "articles_violes": ["Art. 406 CC", "Art. 394 CC"],
  "confidence": 0-100
}`
  },
  {
    name: "consentement",
    prompt: `Tu es un expert en protection des données. Analyse cet email UNIQUEMENT sous l'angle du CONSENTEMENT et de la confidentialité.

CONTEXTE: Curatelle VOLONTAIRE. Le pupille conserve ses droits, y compris sur ses données personnelles.

RECHERCHE SPÉCIFIQUE:
- Des informations personnelles ont-elles été partagées avec des tiers?
- Y a-t-il eu échange d'infos SANS l'accord explicite du pupille?
- Le secret médical ou professionnel a-t-il été violé?
- Des documents confidentiels ont-ils été transmis sans consentement?

Réponds UNIQUEMENT en JSON:
{
  "incident_detected": boolean,
  "type": "consentement",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "evidence": ["citation exacte"],
  "description": "description factuelle",
  "articles_violes": ["Art. 30 LPD", "Art. 13 Cst."],
  "third_parties_involved": ["nom du tiers"],
  "confidence": 0-100
}`
  },
  {
    name: "documents",
    prompt: `Tu es un expert en procédure administrative. Analyse cet email pour détecter des DOCUMENTS PERDUS ou non transmis.

CONTEXTE: Dans une curatelle, tous les documents doivent être transmis au pupille.

RECHERCHE SPÉCIFIQUE:
- Mention de courrier recommandé perdu ou non reçu?
- Décision de tribunal/autorité non transmise?
- Documents officiels disparus ou non retrouvés?
- Références à des pièces manquantes?

Réponds UNIQUEMENT en JSON:
{
  "incident_detected": boolean,
  "type": "document_perdu",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "evidence": ["citation exacte"],
  "documents_mentioned": ["type de document"],
  "description": "description factuelle",
  "articles_violes": ["Art. 26 PA", "Art. 29 Cst."],
  "confidence": 0-100
}`
  },
  {
    name: "delais",
    prompt: `Tu es un expert en procédure administrative. Analyse cet email pour détecter des DÉLAIS non respectés.

CONTEXTE: Les administrations ont des délais légaux à respecter.

RECHERCHE SPÉCIFIQUE:
- Délais de réponse dépassés?
- Promesses non tenues dans les temps?
- Retards administratifs répétés?
- Questions restées sans réponse pendant longtemps?

Réponds UNIQUEMENT en JSON:
{
  "incident_detected": boolean,
  "type": "delai",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "evidence": ["citation exacte"],
  "delays_found": ["délai non respecté"],
  "description": "description factuelle",
  "articles_violes": ["Art. 29 Cst.", "Art. 46a PA"],
  "confidence": 0-100
}`
  },
  {
    name: "comportement",
    prompt: `Tu es un psychologue expert. Analyse cet email pour détecter des COMPORTEMENTS inappropriés.

CONTEXTE: Le curateur doit respecter la dignité du pupille.

RECHERCHE SPÉCIFIQUE:
- Ton condescendant ou irrespectueux?
- Intimidation ou pression psychologique?
- Infantilisation du pupille?
- Manque de considération pour l'avis du pupille?
- Mensonges ou tromperies?

Réponds UNIQUEMENT en JSON:
{
  "incident_detected": boolean,
  "type": "comportement",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "evidence": ["citation exacte"],
  "behavior_type": "condescendant" | "intimidation" | "mensonge" | "autre",
  "description": "description factuelle",
  "articles_violes": ["Art. 7 Cst."],
  "confidence": 0-100
}`
  }
];

interface AnalysisResult {
  perspective: string;
  incident_detected: boolean;
  type: string;
  severity: string;
  evidence: string[];
  description: string;
  articles_violes: string[];
  confidence: number;
  extra?: Record<string, any>;
}

interface RecurrencePattern {
  pattern_type: string;
  institution: string;
  count: number;
  first_seen: string;
  last_seen: string;
  is_new: boolean;
  is_repeated: boolean;
  related_emails: string[];
}

async function analyzeWithPerspective(
  emailContent: string, 
  perspective: typeof ANALYSIS_PERSPECTIVES[0],
  context: string
): Promise<AnalysisResult | null> {
  if (!LOVABLE_API_KEY) return null;

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
          { role: "system", content: perspective.prompt },
          { role: "user", content: `${context}\n\nEMAIL À ANALYSER:\n${emailContent}` }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Analysis failed for ${perspective.name}:`, response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      perspective: perspective.name,
      incident_detected: parsed.incident_detected || false,
      type: parsed.type || perspective.name,
      severity: parsed.severity || "none",
      evidence: parsed.evidence || [],
      description: parsed.description || "",
      articles_violes: parsed.articles_violes || [],
      confidence: parsed.confidence || 0,
      extra: parsed
    };
  } catch (error) {
    console.error(`Error in ${perspective.name} analysis:`, error);
    return null;
  }
}

async function checkRecurrence(
  supabase: any,
  emailId: string,
  institution: string,
  incidentType: string,
  severity: string
): Promise<RecurrencePattern> {
  // Check for existing patterns
  const { data: existing } = await supabase
    .from("recurrence_tracking")
    .select("*")
    .eq("institution", institution)
    .eq("violation_type", incidentType)
    .maybeSingle();

  const now = new Date().toISOString().split("T")[0];

  if (existing) {
    // Update existing pattern
    const relatedIncidents = existing.related_incidents || [];
    if (!relatedIncidents.includes(emailId)) {
      relatedIncidents.push(emailId);
    }

    await supabase
      .from("recurrence_tracking")
      .update({
        occurrence_count: existing.occurrence_count + 1,
        last_occurrence: now,
        related_incidents: relatedIncidents,
        legal_implications: severity === "critical" || severity === "high" 
          ? "Récurrence aggravante - Art. 2 CC (abus de droit)" 
          : existing.legal_implications
      })
      .eq("id", existing.id);

    return {
      pattern_type: incidentType,
      institution,
      count: existing.occurrence_count + 1,
      first_seen: existing.first_occurrence,
      last_seen: now,
      is_new: false,
      is_repeated: true,
      related_emails: relatedIncidents
    };
  } else {
    // Create new pattern
    await supabase
      .from("recurrence_tracking")
      .insert({
        institution,
        violation_type: incidentType,
        occurrence_count: 1,
        first_occurrence: now,
        last_occurrence: now,
        related_incidents: [emailId]
      });

    return {
      pattern_type: incidentType,
      institution,
      count: 1,
      first_seen: now,
      last_seen: now,
      is_new: true,
      is_repeated: false,
      related_emails: [emailId]
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 10, minConfidence = 50 } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Starting deep multi-perspective analysis (batch: ${batchSize})`);

    // Get emails that need deep analysis
    const { data: emails, error: fetchError } = await supabase
      .from("emails")
      .select("id, subject, sender, recipient, body, received_at, gmail_thread_id, is_sent, ai_analysis")
      .eq("is_sent", false)
      .order("received_at", { ascending: false })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Aucun email à analyser",
        analyzed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Analyzing ${emails.length} emails with ${ANALYSIS_PERSPECTIVES.length} perspectives each`);

    let totalIncidents = 0;
    let newPatterns = 0;
    let repeatedPatterns = 0;
    const results: any[] = [];

    for (const email of emails) {
      console.log(`\n=== Analyzing: ${email.subject?.substring(0, 50)}... ===`);

      // Build context
      let context = "";
      if (email.gmail_thread_id) {
        const { data: threadEmails } = await supabase
          .from("emails")
          .select("subject, sender, body, received_at, is_sent")
          .eq("gmail_thread_id", email.gmail_thread_id)
          .neq("id", email.id)
          .order("received_at", { ascending: true })
          .limit(5);
        
        if (threadEmails && threadEmails.length > 0) {
          context = "CONTEXTE DU FIL DE DISCUSSION:\n" + threadEmails.map((e, i) => 
            `[${e.is_sent ? "ENVOYÉ" : "REÇU"}] ${e.subject}\n${e.body?.substring(0, 300)}...`
          ).join("\n\n");
        }
      }

      // Get sender history
      const senderDomain = email.sender.match(/@([^>]+)/)?.[1] || email.sender;
      const { data: previousIncidents } = await supabase
        .from("emails")
        .select("ai_analysis")
        .ilike("sender", `%${senderDomain}%`)
        .not("ai_analysis", "is", null)
        .limit(10);

      if (previousIncidents && previousIncidents.length > 0) {
        const patterns = previousIncidents
          .filter(e => (e.ai_analysis as any)?.incidents_detected?.length > 0)
          .map(e => (e.ai_analysis as any)?.incidents_detected?.map((i: any) => i.type))
          .flat()
          .filter(Boolean);
        
        if (patterns.length > 0) {
          const uniquePatterns = [...new Set(patterns)];
          context += `\n\nPATTERNS CONNUS DE CET EXPÉDITEUR:\n- ${uniquePatterns.join("\n- ")}`;
        }
      }

      const emailContent = `De: ${email.sender}
À: ${email.recipient || "N/A"}
Sujet: ${email.subject}
Date: ${email.received_at}

${email.body}`;

      // Run all perspectives in parallel
      const perspectiveResults = await Promise.all(
        ANALYSIS_PERSPECTIVES.map(p => analyzeWithPerspective(emailContent, p, context))
      );

      // Collect incidents
      const incidentsDetected: AnalysisResult[] = perspectiveResults
        .filter((r): r is AnalysisResult => r !== null && r.incident_detected && r.confidence >= minConfidence);

      console.log(`Found ${incidentsDetected.length} incidents in this email`);

      // Track recurrence for each incident
      const recurrencePatterns: RecurrencePattern[] = [];
      for (const incident of incidentsDetected) {
        const institution = email.sender.match(/@([^>]+)/)?.[1] || email.sender;
        const pattern = await checkRecurrence(
          supabase,
          email.id,
          institution,
          incident.type,
          incident.severity
        );
        recurrencePatterns.push(pattern);

        if (pattern.is_new) newPatterns++;
        if (pattern.is_repeated) repeatedPatterns++;
      }

      // Build comprehensive analysis
      const deepAnalysis = {
        analyzed_at: new Date().toISOString(),
        perspectives_used: ANALYSIS_PERSPECTIVES.map(p => p.name),
        incidents_detected: incidentsDetected,
        total_incidents: incidentsDetected.length,
        max_severity: incidentsDetected.reduce((max, i) => {
          const severityOrder = { "none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4 };
          return (severityOrder[i.severity as keyof typeof severityOrder] || 0) > 
                 (severityOrder[max as keyof typeof severityOrder] || 0) ? i.severity : max;
        }, "none"),
        recurrence_patterns: recurrencePatterns,
        has_repeated_issues: recurrencePatterns.some(p => p.is_repeated),
        has_new_issues: recurrencePatterns.some(p => p.is_new),
        all_articles_violes: [...new Set(incidentsDetected.flatMap(i => i.articles_violes))],
        summary: incidentsDetected.length > 0 
          ? `${incidentsDetected.length} incident(s) détecté(s): ${incidentsDetected.map(i => i.type).join(", ")}`
          : "Aucun incident détecté",
        confidence_avg: incidentsDetected.length > 0 
          ? Math.round(incidentsDetected.reduce((sum, i) => sum + i.confidence, 0) / incidentsDetected.length)
          : 0
      };

      // Update email with deep analysis
      await supabase
        .from("emails")
        .update({ 
          ai_analysis: deepAnalysis,
          processed: true 
        })
        .eq("id", email.id);

      totalIncidents += incidentsDetected.length;

      // Create incidents for high-confidence detections
      for (const incident of incidentsDetected.filter(i => i.confidence >= 70 && 
           (i.severity === "high" || i.severity === "critical" || i.severity === "medium"))) {
        
        const { data: existingIncident } = await supabase
          .from("incidents")
          .select("id")
          .eq("email_source_id", email.id)
          .eq("type", incident.type)
          .maybeSingle();

        if (!existingIncident) {
          const { data: newIncident } = await supabase
            .from("incidents")
            .insert({
              titre: `[${incident.type.toUpperCase()}] ${email.subject?.substring(0, 80)}`,
              faits: incident.description,
              dysfonctionnement: incident.evidence.join("\n"),
              institution: email.sender.match(/@([^>]+)/)?.[1] || email.sender,
              type: incident.type,
              gravite: incident.severity === "critical" ? "Critique" : 
                       incident.severity === "high" ? "Haute" : "Moyenne",
              priorite: incident.severity === "critical" ? "critique" : 
                        incident.severity === "high" ? "haute" : "normale",
              date_incident: new Date(email.received_at).toISOString().split("T")[0],
              email_source_id: email.id,
              confidence_level: `${incident.confidence}%`,
              score: incident.confidence,
              preuves: {
                articles: incident.articles_violes,
                evidence: incident.evidence,
                recurrence: recurrencePatterns.find(p => p.pattern_type === incident.type)
              }
            })
            .select()
            .single();

          if (newIncident) {
            console.log(`Created incident: ${incident.type} - ${incident.severity}`);
            
            // Create alert for serious incidents
            if (incident.severity === "critical" || incident.severity === "high") {
              await supabase
                .from("audit_alerts")
                .insert({
                  title: `${incident.type}: ${email.subject?.substring(0, 50)}`,
                  description: incident.description,
                  alert_type: incident.type,
                  severity: incident.severity === "critical" ? "critical" : "warning",
                  related_incident_id: newIncident.id,
                  related_email_id: email.id,
                  legal_reference: { articles: incident.articles_violes }
                });
            }
          }
        }
      }

      results.push({
        emailId: email.id,
        subject: email.subject,
        incidentsFound: incidentsDetected.length,
        recurrence: recurrencePatterns
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n=== ANALYSIS COMPLETE ===`);
    console.log(`Emails analyzed: ${emails.length}`);
    console.log(`Total incidents: ${totalIncidents}`);
    console.log(`New patterns: ${newPatterns}`);
    console.log(`Repeated patterns: ${repeatedPatterns}`);

    return new Response(JSON.stringify({
      success: true,
      analyzed: emails.length,
      totalIncidents,
      newPatterns,
      repeatedPatterns,
      perspectivesUsed: ANALYSIS_PERSPECTIVES.map(p => p.name),
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Deep analysis error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});