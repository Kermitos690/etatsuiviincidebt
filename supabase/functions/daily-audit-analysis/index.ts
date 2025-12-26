import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurrenceData {
  institution: string;
  violation_type: string;
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
  related_incidents: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting daily audit analysis...");

    // 1. Get all unprocessed emails from the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentEmails, error: emailsError } = await supabase
      .from("emails")
      .select("*")
      .eq("processed", false)
      .gte("received_at", yesterday.toISOString());

    if (emailsError) throw emailsError;

    console.log(`Found ${recentEmails?.length || 0} unprocessed emails`);

    // 2. Analyze each email thread
    const analysisResults = [];
    const threadsAnalyzed = new Set<string>();

    for (const email of recentEmails || []) {
      if (email.gmail_thread_id && threadsAnalyzed.has(email.gmail_thread_id)) {
        continue;
      }

      try {
        // Call the advanced analysis function
        const analysisResponse = await fetch(`${SUPABASE_URL}/functions/v1/analyze-email-advanced`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            emailId: email.id,
            threadId: email.gmail_thread_id,
            analyzeThread: true
          }),
        });

        if (analysisResponse.ok) {
          const result = await analysisResponse.json();
          analysisResults.push(result);
          
          if (email.gmail_thread_id) {
            threadsAnalyzed.add(email.gmail_thread_id);
          }

          // 3. Create alerts for critical issues
          if (result.analysis?.problem_score >= 70) {
            await supabase.from("audit_alerts").insert({
              alert_type: "critical_incident",
              severity: "critical",
              title: `Problème critique détecté: Score ${result.analysis.problem_score}`,
              description: result.analysis.summary || "Analyse approfondie requise",
              related_email_id: email.id,
              legal_reference: result.analysis.all_legal_references?.[0] || null,
            });
          }

          // 4. Check for deadline violations
          if (result.analysis?.deadline_violations?.detected) {
            await supabase.from("audit_alerts").insert({
              alert_type: "deadline_breach",
              severity: result.analysis.deadline_violations.severity === "critical" ? "critical" : "warning",
              title: "Violation de délai détectée",
              description: result.analysis.deadline_violations.details?.join("; ") || "Délai non respecté",
              related_email_id: email.id,
              legal_reference: result.analysis.deadline_violations.legal_basis?.[0] || null,
            });
          }
        }
      } catch (analysisError) {
        console.error(`Error analyzing email ${email.id}:`, analysisError);
      }
    }

    // 5. Update recurrence tracking based on incidents
    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .order("date_incident", { ascending: false });

    const recurrenceMap = new Map<string, RecurrenceData>();

    for (const incident of incidents || []) {
      const key = `${incident.institution}:${incident.type}`;
      
      if (recurrenceMap.has(key)) {
        const existing = recurrenceMap.get(key)!;
        existing.occurrence_count++;
        existing.related_incidents.push(incident.id);
        if (incident.date_incident < existing.first_occurrence) {
          existing.first_occurrence = incident.date_incident;
        }
        if (incident.date_incident > existing.last_occurrence) {
          existing.last_occurrence = incident.date_incident;
        }
      } else {
        recurrenceMap.set(key, {
          institution: incident.institution,
          violation_type: incident.type,
          occurrence_count: 1,
          first_occurrence: incident.date_incident,
          last_occurrence: incident.date_incident,
          related_incidents: [incident.id],
        });
      }
    }

    // Upsert recurrence tracking
    for (const [_, data] of recurrenceMap) {
      await supabase.from("recurrence_tracking").upsert({
        institution: data.institution,
        violation_type: data.violation_type,
        occurrence_count: data.occurrence_count,
        first_occurrence: data.first_occurrence,
        last_occurrence: data.last_occurrence,
        related_incidents: data.related_incidents,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "institution,violation_type",
      });

      // Create alert for recurring violations (3+ occurrences)
      if (data.occurrence_count >= 3) {
        const { data: existingAlert } = await supabase
          .from("audit_alerts")
          .select("id")
          .eq("alert_type", "recurring_violation")
          .eq("title", `Récidive: ${data.violation_type} par ${data.institution}`)
          .eq("is_resolved", false)
          .single();

        if (!existingAlert) {
          await supabase.from("audit_alerts").insert({
            alert_type: "recurring_violation",
            severity: data.occurrence_count >= 5 ? "critical" : "warning",
            title: `Récidive: ${data.violation_type} par ${data.institution}`,
            description: `${data.occurrence_count} occurrences détectées depuis le ${new Date(data.first_occurrence).toLocaleDateString("fr-CH")}`,
            legal_reference: {
              article: "Art. 2 CC",
              law: "Code civil suisse (RS 210)",
              description: "Abus de droit manifeste en cas de comportement répétitif",
              source_url: "https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr"
            },
          });
        }
      }
    }

    // 6. Generate daily summary using AI
    let dailySummary = null;
    if (LOVABLE_API_KEY && analysisResults.length > 0) {
      try {
        const summaryPrompt = `Tu es un assistant d'audit juridique. Génère un résumé exécutif de la journée basé sur ces analyses:

${JSON.stringify(analysisResults.map(r => ({
  score: r.analysis?.problem_score,
  summary: r.analysis?.summary,
  violations: r.analysis?.rule_violations?.violations,
  deadlines: r.analysis?.deadline_violations?.detected
})), null, 2)}

Retourne un JSON avec: { "summary": "...", "key_issues": ["..."], "recommendations": ["..."], "priority_actions": ["..."] }`;

        const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: summaryPrompt }
            ],
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const content = summaryData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            dailySummary = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (summaryError) {
        console.error("Error generating daily summary:", summaryError);
      }
    }

    const result = {
      success: true,
      date: new Date().toISOString(),
      emailsProcessed: analysisResults.length,
      threadsAnalyzed: threadsAnalyzed.size,
      recurrencesTracked: recurrenceMap.size,
      dailySummary,
    };

    console.log("Daily audit analysis complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Daily audit analysis error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
