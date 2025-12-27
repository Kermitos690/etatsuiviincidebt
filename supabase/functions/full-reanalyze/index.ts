import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ReanalyzeProgress {
  step: string;
  stepNumber: number;
  totalSteps: number;
  current: number;
  total: number;
  errors: string[];
  stats: {
    emailsSynced: number;
    emailsAnalyzed: number;
    factsExtracted: number;
    threadsAnalyzed: number;
    incidentsCreated: number;
  };
}

// Verify JWT and get user
async function verifyAuth(req: Request): Promise<{ user: any; supabase: any } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    console.error("No authorization header");
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.error("Auth error:", error?.message);
    return null;
  }

  return { user, supabase };
}

const ANALYSIS_PROMPT = `Tu es un EXPERT JURIDIQUE SUISSE spécialisé dans la protection de l'adulte et les curatelles.

CONTEXTE: Curatelle VOLONTAIRE de gestion et représentation (art. 394-395 CC).

RÈGLES:
- CITATIONS OBLIGATOIRES entre guillemets
- ZÉRO supposition - uniquement ce qui est écrit
- Si l'email est vide/incomplet: isIncident=false, confidence=0

RÉPONDRE EN JSON:
{
  "isIncident": boolean,
  "confidence": 0-100,
  "gravite": "Faible"|"Moyenne"|"Haute"|"Critique",
  "type": string,
  "titre": string,
  "faits": string,
  "dysfonctionnement": string,
  "institution": string,
  "score": 0-100
}`;

async function analyzeEmailWithAI(emailContent: string): Promise<any | null> {
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
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: emailContent }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log("Rate limited, waiting...");
        await new Promise(r => setTimeout(r, 2000));
        return null;
      }
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error("AI error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await verifyAuth(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { user, supabase } = auth;
  const userId = user.id;

  console.log(`[full-reanalyze] Starting for user ${userId}`);

  try {
    const { forceReanalyze = true, syncGmail = true } = await req.json().catch(() => ({}));

    const progress: ReanalyzeProgress = {
      step: "Initialisation",
      stepNumber: 0,
      totalSteps: 5,
      current: 0,
      total: 0,
      errors: [],
      stats: {
        emailsSynced: 0,
        emailsAnalyzed: 0,
        factsExtracted: 0,
        threadsAnalyzed: 0,
        incidentsCreated: 0,
      },
    };

    // Create sync status record
    const { data: syncStatus, error: syncStatusError } = await supabase
      .from("sync_status")
      .insert({
        user_id: userId,
        status: "processing",
        started_at: new Date().toISOString(),
        stats: progress,
      })
      .select()
      .single();

    if (syncStatusError) {
      console.error("Failed to create sync status:", syncStatusError);
    }

    const syncId = syncStatus?.id;

    const updateProgress = async (updates: Partial<ReanalyzeProgress>) => {
      Object.assign(progress, updates);
      if (syncId) {
        await supabase
          .from("sync_status")
          .update({ stats: progress })
          .eq("id", syncId);
      }
      console.log(`[Progress] Step ${progress.stepNumber}/${progress.totalSteps}: ${progress.step} (${progress.current}/${progress.total})`);
    };

    // ===== STEP 1: Sync Gmail =====
    if (syncGmail) {
      await updateProgress({ step: "Synchronisation Gmail", stepNumber: 1 });

      // Get Gmail config
      const { data: gmailConfig } = await supabase
        .from("gmail_config")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (gmailConfig && gmailConfig.sync_enabled && gmailConfig.access_token) {
        console.log("[Step 1] Gmail config found, syncing...");
        
        try {
          // Call gmail-sync function
          const syncResponse = await fetch(`${SUPABASE_URL}/functions/v1/gmail-sync`, {
            method: "POST",
            headers: {
              "Authorization": req.headers.get("authorization") || "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ maxEmails: 100 }),
          });

          if (syncResponse.ok) {
            const syncResult = await syncResponse.json();
            progress.stats.emailsSynced = syncResult.new_emails || 0;
            console.log(`[Step 1] Synced ${progress.stats.emailsSynced} new emails`);
          } else {
            const errorText = await syncResponse.text();
            console.error("[Step 1] Gmail sync failed:", errorText);
            progress.errors.push(`Sync Gmail: ${errorText.substring(0, 100)}`);
          }
        } catch (e) {
          console.error("[Step 1] Gmail sync error:", e);
          progress.errors.push(`Sync Gmail: ${e instanceof Error ? e.message : "Erreur"}`);
        }
      } else {
        console.log("[Step 1] No Gmail config or sync disabled");
      }
    }

    // ===== STEP 2: Analyze Emails =====
    await updateProgress({ step: "Analyse des emails", stepNumber: 2 });

    // Get emails to analyze
    let emailsQuery = supabase
      .from("emails")
      .select("id, subject, sender, recipient, body, received_at, gmail_thread_id, is_sent")
      .eq("user_id", userId)
      .eq("is_sent", false);

    if (!forceReanalyze) {
      emailsQuery = emailsQuery.or("processed.eq.false,ai_analysis.is.null");
    }

    const { data: emails, error: emailsError } = await emailsQuery
      .order("received_at", { ascending: false })
      .limit(200);

    if (emailsError) {
      console.error("[Step 2] Error fetching emails:", emailsError);
      progress.errors.push(`Emails: ${emailsError.message}`);
    }

    const emailsToAnalyze = emails || [];
    await updateProgress({ total: emailsToAnalyze.length });

    console.log(`[Step 2] Found ${emailsToAnalyze.length} emails to analyze`);

    for (let i = 0; i < emailsToAnalyze.length; i++) {
      const email = emailsToAnalyze[i];
      await updateProgress({ current: i + 1 });

      try {
        const emailContent = `
De: ${email.sender}
À: ${email.recipient || "N/A"}
Sujet: ${email.subject}
Date: ${email.received_at}

${email.body || "(Contenu vide)"}
        `.trim();

        const analysis = await analyzeEmailWithAI(emailContent);

        if (analysis) {
          await supabase
            .from("emails")
            .update({
              ai_analysis: analysis,
              processed: true,
            })
            .eq("id", email.id);

          progress.stats.emailsAnalyzed++;

          // Create incident if needed
          if (analysis.isIncident && analysis.confidence >= 70) {
            const { data: existing } = await supabase
              .from("incidents")
              .select("id")
              .eq("email_source_id", email.id)
              .maybeSingle();

            if (!existing) {
              const { data: incident } = await supabase
                .from("incidents")
                .insert({
                  user_id: userId,
                  titre: analysis.titre || email.subject,
                  faits: analysis.faits || "",
                  dysfonctionnement: analysis.dysfonctionnement || "",
                  institution: analysis.institution || "Non identifiée",
                  type: analysis.type || "Autre",
                  gravite: analysis.gravite || "Moyenne",
                  priorite: analysis.gravite === "Critique" ? "critique" : 
                           analysis.gravite === "Haute" ? "haute" : "normale",
                  date_incident: new Date(email.received_at).toISOString().split("T")[0],
                  email_source_id: email.id,
                  confidence_level: `${analysis.confidence}%`,
                  score: analysis.score || analysis.confidence,
                })
                .select()
                .single();

              if (incident) {
                progress.stats.incidentsCreated++;
                await supabase
                  .from("emails")
                  .update({ incident_id: incident.id })
                  .eq("id", email.id);
              }
            }
          }
        }

        // Small delay to avoid rate limiting
        if ((i + 1) % 5 === 0) {
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (e) {
        console.error(`[Step 2] Error analyzing email ${email.id}:`, e);
      }
    }

    // ===== STEP 3: Extract Facts =====
    await updateProgress({ step: "Extraction des faits", stepNumber: 3, current: 0, total: 0 });

    const { data: emailsForFacts } = await supabase
      .from("emails")
      .select("id, subject, sender, body, received_at, ai_analysis")
      .eq("user_id", userId)
      .not("ai_analysis", "is", null)
      .limit(100);

    if (emailsForFacts && emailsForFacts.length > 0) {
      await updateProgress({ total: emailsForFacts.length });

      for (let i = 0; i < emailsForFacts.length; i++) {
        const email = emailsForFacts[i];
        await updateProgress({ current: i + 1 });

        // Check if facts already exist
        const { data: existingFact } = await supabase
          .from("email_facts")
          .select("id")
          .eq("email_id", email.id)
          .maybeSingle();

        if (!existingFact && email.ai_analysis) {
          const analysis = email.ai_analysis as any;
          
          // Extract basic facts from analysis
          const senderMatch = email.sender?.match(/([^<]+)?<?([^>]+)>?/);
          
          await supabase
            .from("email_facts")
            .insert({
              email_id: email.id,
              sender_name: senderMatch?.[1]?.trim() || null,
              sender_email: senderMatch?.[2]?.trim() || email.sender,
              sentiment: analysis.gravite === "Critique" ? "negative" : 
                        analysis.gravite === "Haute" ? "negative" :
                        analysis.isIncident ? "concerned" : "neutral",
              urgency_level: analysis.gravite === "Critique" ? "high" :
                            analysis.gravite === "Haute" ? "medium" : "low",
              mentioned_institutions: analysis.institution ? [analysis.institution] : [],
              key_phrases: analysis.titre ? [analysis.titre] : [],
            });

          progress.stats.factsExtracted++;
        }
      }
    }

    // ===== STEP 4: Analyze Threads =====
    await updateProgress({ step: "Analyse des threads", stepNumber: 4, current: 0, total: 0 });

    // Get unique thread IDs
    const { data: threadsData } = await supabase
      .from("emails")
      .select("gmail_thread_id")
      .eq("user_id", userId)
      .not("gmail_thread_id", "is", null);

    const uniqueThreadIds = [...new Set((threadsData || []).map((t: { gmail_thread_id: string | null }) => t.gmail_thread_id).filter(Boolean))] as string[];
    await updateProgress({ total: uniqueThreadIds.length });

    console.log(`[Step 4] Found ${uniqueThreadIds.length} unique threads`);

    for (let i = 0; i < uniqueThreadIds.length; i++) {
      const threadId = uniqueThreadIds[i];
      await updateProgress({ current: i + 1 });

      // Check if analysis exists
      const { data: existingAnalysis } = await supabase
        .from("thread_analyses")
        .select("id")
        .eq("thread_id", threadId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingAnalysis || forceReanalyze) {
        // Get thread emails
        const { data: threadEmails } = await supabase
          .from("emails")
          .select("id, subject, sender, body, received_at, ai_analysis")
          .eq("gmail_thread_id", threadId)
          .eq("user_id", userId)
          .order("received_at", { ascending: true });

        if (threadEmails && threadEmails.length >= 2) {
          // Simple thread analysis based on email analyses
          const hasIncident = threadEmails.some((e: any) => (e.ai_analysis as any)?.isIncident);
          const participants = [...new Set(threadEmails.map((e: any) => e.sender as string))];
          const emailIds = threadEmails.map((e: any) => e.id as string);

          if (existingAnalysis) {
            await supabase
              .from("thread_analyses")
              .update({
                email_ids: emailIds,
                emails_count: threadEmails.length,
                participants: { list: participants },
                severity: hasIncident ? "warning" : "info",
                analyzed_at: new Date().toISOString(),
              })
              .eq("id", existingAnalysis.id);
          } else {
            await supabase
              .from("thread_analyses")
              .insert({
                user_id: userId,
                thread_id: threadId,
                email_ids: emailIds,
                emails_count: threadEmails.length,
                participants: { list: participants },
                severity: hasIncident ? "warning" : "info",
              });
          }

          progress.stats.threadsAnalyzed++;
        }
      }
    }

    // ===== STEP 5: Finalize =====
    await updateProgress({ step: "Finalisation", stepNumber: 5, current: 1, total: 1 });

    // Update sync status
    if (syncId) {
      await supabase
        .from("sync_status")
        .update({
          status: progress.errors.length > 0 ? "completed_with_errors" : "completed",
          completed_at: new Date().toISOString(),
          stats: progress,
        })
        .eq("id", syncId);
    }

    console.log("[full-reanalyze] Complete:", progress.stats);

    return new Response(JSON.stringify({
      success: true,
      syncId,
      progress,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[full-reanalyze] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
