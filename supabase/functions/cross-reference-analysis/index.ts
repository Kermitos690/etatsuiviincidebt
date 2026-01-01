import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type CorroborationSuggestion = {
  thread_id: string;
  corroboration_type: string;
  supporting_evidence: any[];
  contradicting_evidence: any[];
  final_confidence?: number;
  notes?: string;
};

function safeExtractJson(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}

function tryParseJson(text: string): any {
  const raw = safeExtractJson(text) ?? text;

  // Try strict first
  try {
    return JSON.parse(raw);
  } catch {
    // Common repairs: trailing commas + smart quotes
    const repaired = raw
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, "$1");

    return JSON.parse(repaired);
  }
}

async function callAI(prompt: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant d'audit ultra-factuel. Réponds UNIQUEMENT en JSON valide, sans texte autour.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI error ${res.status}: ${t.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty content");
  return String(content);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || "Non autorisé");
    }

    const { domains, keywords } = await req.json().catch(() => ({} as any));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1) Load thread analyses - increased limit for comprehensive cross-referencing
    const { data: threadAnalyses, error: taErr } = await supabase
      .from("thread_analyses")
      .select("id, thread_id, chronological_summary, detected_issues, citations, participants, timeline, severity")
      .eq("user_id", user.id)
      .order("analyzed_at", { ascending: false })
      .limit(100);

    if (taErr) throw taErr;

    const allTA = (threadAnalyses || []).filter((t: any) => t.thread_id);

    // 2) Apply optional domain/keyword filter at thread level (based on emails)
    let filteredTA = allTA;
    const hasDomains = Array.isArray(domains) && domains.length > 0;
    const hasKeywords = Array.isArray(keywords) && keywords.length > 0;

    if (hasDomains || hasKeywords) {
      const threadIds = allTA.map((t: any) => t.thread_id);
      const { data: emails, error: eErr } = await supabase
        .from("emails")
        .select("gmail_thread_id, sender, recipient, subject, body")
        .eq("user_id", user.id)
        .in("gmail_thread_id", threadIds)
        .limit(5000);

      if (eErr) throw eErr;

      const dList = (hasDomains ? domains : []).map((d: string) => d.toLowerCase());
      const kList = (hasKeywords ? keywords : []).map((k: string) => k.toLowerCase());

      const okThreads = new Set<string>();
      for (const em of emails || []) {
        const sender = (em.sender || "").toLowerCase();
        const recipient = (em.recipient || "").toLowerCase();
        const subject = (em.subject || "").toLowerCase();
        const body = (em.body || "").toLowerCase();

        const domainOk = !hasDomains || dList.some((d: string) => sender.includes(d) || recipient.includes(d));
        const keywordOk = !hasKeywords || kList.some((k: string) => subject.includes(k) || body.includes(k));

        if (domainOk && keywordOk && em.gmail_thread_id) okThreads.add(em.gmail_thread_id);
      }

      filteredTA = allTA.filter((t: any) => okThreads.has(t.thread_id));
    }

    // 3) Attachment analyses (joined to emails for user scoping + thread mapping)
    const { data: attachments, error: aErr } = await supabase
      .from("email_attachments")
      .select(
        "id, email_id, filename, mime_type, extracted_text, ai_analysis, emails!inner(gmail_thread_id, user_id, subject, sender, recipient, received_at)"
      )
      .eq("emails.user_id", user.id)
      .not("emails.gmail_thread_id", "is", null)
      .limit(500);

    if (aErr) throw aErr;

    console.log(
      `Cross-referencing ${filteredTA.length} thread analyses with ${(attachments || []).length} attachment analyses`
    );

    // 4) AI corroboration suggestion (best effort, never crash)
    const results = {
      processed: filteredTA.length,
      corroborations: 0,
      incidents: 0,
      patterns: 0,
      errors: [] as string[],
    };

    if (filteredTA.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taPayload = filteredTA.map((t: any) => ({
      id: t.id,
      thread_id: t.thread_id,
      severity: t.severity,
      chronological_summary: t.chronological_summary,
      issues: t.detected_issues,
      citations: t.citations,
    }));

    const attPayload = (attachments || []).map((a: any) => ({
      id: a.id,
      filename: a.filename,
      thread_id: a.emails?.gmail_thread_id,
      email_subject: a.emails?.subject,
      extracted_text: (a.extracted_text || "").slice(0, 4000),
      ai_analysis: a.ai_analysis,
    }));

    const prompt = `Objectif: créer des corroborations croisant (1) les analyses de threads et (2) les pièces jointes analysées.

Contraintes:
- Réponds UNIQUEMENT en JSON valide.
- Si incertain, retourne une liste vide.

Format attendu:
{
  "corroborations": [
    {
      "thread_id": "...",
      "corroboration_type": "supporting|contradicting|mixed",
      "supporting_evidence": [],
      "contradicting_evidence": [],
      "final_confidence": 0.0,
      "notes": "..."
    }
  ]
}

THREAD_ANALYSES:
${JSON.stringify(taPayload)}

ATTACHMENTS:
${JSON.stringify(attPayload)}
`;

    let suggestions: CorroborationSuggestion[] = [];
    try {
      const aiText = await callAI(prompt);
      const parsed = tryParseJson(aiText);
      suggestions = Array.isArray(parsed?.corroborations) ? parsed.corroborations : [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Advanced corroboration error:", e);
      results.errors.push(msg);
      suggestions = [];
    }

    // 5) Persist corroborations (best-effort)
    if (suggestions.length > 0) {
      const byThreadId = new Map<string, string>();
      for (const t of filteredTA) byThreadId.set(t.thread_id, t.id);

      const rows = suggestions
        .filter((s) => !!s.thread_id && byThreadId.has(s.thread_id))
        .slice(0, 200)
        .map((s) => ({
          user_id: user.id,
          corroboration_type: s.corroboration_type || "mixed",
          supporting_evidence: s.supporting_evidence || [],
          contradicting_evidence: s.contradicting_evidence || [],
          final_confidence: typeof s.final_confidence === "number" ? s.final_confidence : null,
          notes: s.notes || null,
          thread_analysis_ids: [byThreadId.get(s.thread_id)!],
        }));

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("corroborations").insert(rows);
        if (insErr) {
          results.errors.push(`Insert corroborations failed: ${insErr.message}`);
        } else {
          results.corroborations = rows.length;
        }
      }
    }

    console.log("Advanced cross-reference analysis completed:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("cross-reference-analysis error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
