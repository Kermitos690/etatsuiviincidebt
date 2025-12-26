import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { month, year } = await req.json();
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate date range
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const monthYear = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    console.log(`Generating report for ${monthYear}`);

    // 1. Get incidents for the month
    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("*")
      .gte("date_incident", startDate.toISOString().split('T')[0])
      .lte("date_incident", endDate.toISOString().split('T')[0]);

    if (incidentsError) throw incidentsError;

    // 2. Get emails for the month
    const { data: emails, error: emailsError } = await supabase
      .from("emails")
      .select("*, thread_analysis")
      .gte("received_at", startDate.toISOString())
      .lte("received_at", endDate.toISOString());

    if (emailsError) throw emailsError;

    // 3. Get alerts for the month
    const { data: alerts, error: alertsError } = await supabase
      .from("audit_alerts")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (alertsError) throw alertsError;

    // 4. Get recurrence tracking
    const { data: recurrences } = await supabase
      .from("recurrence_tracking")
      .select("*")
      .order("occurrence_count", { ascending: false });

    // Calculate statistics
    const incidentsCount = incidents?.length || 0;
    const emailsCount = emails?.length || 0;
    const cumulativeScore = incidents?.reduce((acc, i) => acc + (i.score || 0), 0) || 0;
    
    // Count violations from email analyses
    let violationsCount = 0;
    const allLegalReferences: any[] = [];
    const keyIssues: string[] = [];

    for (const email of emails || []) {
      const analysis = email.thread_analysis as any;
      if (analysis) {
        if (analysis.deadline_violations?.detected) violationsCount++;
        if (analysis.rule_violations?.detected) violationsCount++;
        if (analysis.contradictions?.detected) violationsCount++;
        
        if (analysis.all_legal_references) {
          allLegalReferences.push(...analysis.all_legal_references);
        }
        
        if (analysis.problem_score >= 50 && analysis.summary) {
          keyIssues.push(analysis.summary);
        }
      }
    }

    // Severity breakdown
    const severityBreakdown: Record<string, number> = {
      Critique: 0,
      Grave: 0,
      Modéré: 0,
      Mineur: 0
    };
    
    for (const incident of incidents || []) {
      if (severityBreakdown[incident.gravite] !== undefined) {
        severityBreakdown[incident.gravite]++;
      }
    }

    // Institution breakdown
    const institutionBreakdown: Record<string, number> = {};
    for (const incident of incidents || []) {
      institutionBreakdown[incident.institution] = (institutionBreakdown[incident.institution] || 0) + 1;
    }

    // Deduplicate legal references
    const uniqueLegalRefs = Array.from(new Map(
      allLegalReferences.map(ref => [ref.article, ref])
    ).values());

    // Generate AI summary
    let summary = "";
    let recommendations: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const summaryPrompt = `Tu es un auditeur juridique suisse. Génère un rapport mensuel exécutif basé sur ces données:

Période: ${new Date(startDate).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })}

Statistiques:
- Incidents: ${incidentsCount}
- Emails analysés: ${emailsCount}
- Violations détectées: ${violationsCount}
- Score cumulé: ${cumulativeScore}

Répartition par gravité: ${JSON.stringify(severityBreakdown)}
Répartition par institution: ${JSON.stringify(institutionBreakdown)}

Récidives détectées: ${recurrences?.filter(r => r.occurrence_count >= 3).map(r => `${r.institution}: ${r.violation_type} (${r.occurrence_count}x)`).join(', ') || 'Aucune'}

Références légales citées: ${uniqueLegalRefs.slice(0, 10).map(r => r.article).join(', ')}

Alertes critiques: ${alerts?.filter(a => a.severity === 'critical').length || 0}

Génère un résumé exécutif de 5-8 phrases maximum, factuel et objectif, suivi de 3-5 recommandations concrètes.

Retourne un JSON: { "summary": "...", "recommendations": ["..."] }`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: summaryPrompt }],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            summary = parsed.summary || "";
            recommendations = parsed.recommendations || [];
          }
        }
      } catch (aiError) {
        console.error("AI summary error:", aiError);
      }
    }

    // Save report to database
    const reportData = {
      month_year: monthYear,
      incidents_count: incidentsCount,
      emails_count: emailsCount,
      violations_count: violationsCount,
      cumulative_score: cumulativeScore,
      severity_breakdown: severityBreakdown,
      institution_breakdown: institutionBreakdown,
      legal_references: uniqueLegalRefs,
      summary,
      key_issues: keyIssues.slice(0, 10),
      recommendations,
    };

    const { data: savedReport, error: saveError } = await supabase
      .from("monthly_reports")
      .upsert(reportData, { onConflict: "month_year" })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving report:", saveError);
    }

    console.log(`Report generated for ${monthYear}:`, {
      incidents: incidentsCount,
      emails: emailsCount,
      violations: violationsCount,
      score: cumulativeScore
    });

    return new Response(JSON.stringify({
      success: true,
      report: {
        ...reportData,
        id: savedReport?.id,
        alerts: {
          total: alerts?.length || 0,
          critical: alerts?.filter(a => a.severity === 'critical').length || 0,
          warning: alerts?.filter(a => a.severity === 'warning').length || 0,
        },
        recurrences: recurrences?.filter(r => r.occurrence_count >= 3) || [],
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Monthly report generation error:", error);
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
