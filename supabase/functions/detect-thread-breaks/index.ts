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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Récupérer les emails groupés par thread
    const { data: emails, error: emailsError } = await supabase
      .from("emails")
      .select("id, subject, sender, received_at, gmail_thread_id, body, recipient")
      .eq("user_id", user.id)
      .not("gmail_thread_id", "is", null)
      .order("gmail_thread_id")
      .order("received_at", { ascending: true })
      .limit(200);

    if (emailsError) throw emailsError;

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ detected: 0, message: "Pas d'emails avec threads" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Grouper par thread
    const threads: Record<string, typeof emails> = {};
    emails.forEach(email => {
      if (email.gmail_thread_id) {
        if (!threads[email.gmail_thread_id]) {
          threads[email.gmail_thread_id] = [];
        }
        threads[email.gmail_thread_id].push(email);
      }
    });

    const systemPrompt = `Tu es un auditeur de conversations email. Analyse ce thread et détecte les RUPTURES de conversation.

Types de ruptures à détecter:

1. QUESTIONS SANS RÉPONSE (unanswered)
   - Question directe posée mais ignorée dans les réponses suivantes
   - Demande d'information restée sans suite

2. CHANGEMENT DE SUJET (topic_change)
   - L'interlocuteur change de sujet pour éviter de répondre
   - Digression volontaire

3. GAP TEMPOREL (temporal_gap)
   - Plus de 7 jours entre deux emails sans justification
   - Délai anormal de réponse

4. THREAD SPLIT (thread_split)
   - Nouveau thread créé au lieu de répondre
   - Conversation fragmentée intentionnellement

Pour chaque rupture détectée, retourne:
{
  "breaks": [
    {
      "email_id": "id de l'email après la rupture",
      "break_type": "unanswered" | "topic_change" | "temporal_gap" | "thread_split",
      "questions_unanswered": ["question exacte si applicable"],
      "days_gap": number,
      "notes": "description du problème"
    }
  ]
}

IMPORTANT: Ne retourne QUE les vraies ruptures problématiques, pas les fins normales de conversation.`;

    let detectedCount = 0;

    // Analyser chaque thread avec plus de 2 emails
    for (const [threadId, threadEmails] of Object.entries(threads)) {
      if (threadEmails.length < 2) continue;

      const threadContent = threadEmails.map(e => ({
        id: e.id,
        date: e.received_at,
        from: e.sender,
        to: e.recipient,
        subject: e.subject,
        body: e.body?.slice(0, 500)
      }));

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
              { role: "system", content: systemPrompt },
              { role: "user", content: `Thread ID: ${threadId}\n\nEmails:\n${JSON.stringify(threadContent, null, 2)}` }
            ],
          }),
        });

        if (!response.ok) {
          console.error(`AI error for thread ${threadId}`);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const analysis = JSON.parse(jsonMatch[0]);

        // Enregistrer les ruptures détectées
        for (const breakItem of analysis.breaks || []) {
          if (!breakItem.email_id) continue;

          // Vérifier si cette rupture existe déjà
          const { data: existing } = await supabase
            .from("thread_break_detections")
            .select("id")
            .eq("user_id", user.id)
            .eq("thread_id", threadId)
            .eq("email_id", breakItem.email_id)
            .eq("break_type", breakItem.break_type)
            .single();

          if (existing) continue;

          const { error: insertError } = await supabase
            .from("thread_break_detections")
            .insert({
              user_id: user.id,
              thread_id: threadId,
              email_id: breakItem.email_id,
              break_type: breakItem.break_type,
              questions_unanswered: breakItem.questions_unanswered || [],
              days_gap: breakItem.days_gap || 0,
              notes: breakItem.notes
            });

          if (!insertError) detectedCount++;
        }
      } catch (err) {
        console.error(`Error analyzing thread ${threadId}:`, err);
      }
    }

    console.log(`Detected ${detectedCount} thread breaks for user ${user.id}`);

    return new Response(JSON.stringify({ 
      detected: detectedCount,
      threads_analyzed: Object.keys(threads).length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Detect thread breaks error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
