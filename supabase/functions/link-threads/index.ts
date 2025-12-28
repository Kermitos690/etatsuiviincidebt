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

    // Récupérer les emails récents
    const { data: emails, error: emailsError } = await supabase
      .from("emails")
      .select("id, subject, sender, received_at, gmail_thread_id, body")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(50);

    if (emailsError) throw emailsError;

    if (!emails || emails.length < 2) {
      return new Response(JSON.stringify({ suggested: 0, message: "Pas assez d'emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Grouper par thread existant
    const threadGroups: Record<string, typeof emails> = {};
    const orphans: typeof emails = [];

    emails.forEach(email => {
      if (email.gmail_thread_id) {
        if (!threadGroups[email.gmail_thread_id]) {
          threadGroups[email.gmail_thread_id] = [];
        }
        threadGroups[email.gmail_thread_id].push(email);
      } else {
        orphans.push(email);
      }
    });

    // Analyser les orphelins pour suggérer des liaisons
    const systemPrompt = `Tu es un assistant qui analyse des emails pour détecter des liaisons possibles entre conversations.

Analyse ces emails et identifie lesquels pourraient faire partie de la même conversation, même s'ils ont des thread_id différents ou n'ont pas de thread_id.

Critères de liaison:
1. Même sujet ou sujet similaire (Re:, Fwd:, variations)
2. Mêmes participants
3. Références croisées dans le contenu
4. Continuité thématique
5. Réponses à des questions posées dans d'autres emails

Retourne un JSON avec:
{
  "suggested_links": [
    {
      "email_ids": ["id1", "id2"],
      "reason": "Raison de la liaison",
      "link_type": "continuation" | "related" | "followup" | "split",
      "confidence": 0.0-1.0
    }
  ]
}

Ne suggère que des liaisons avec confidence >= 0.7`;

    const emailSummaries = emails.map(e => ({
      id: e.id,
      subject: e.subject,
      sender: e.sender,
      date: e.received_at,
      thread_id: e.gmail_thread_id,
      preview: e.body?.slice(0, 200)
    }));

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
          { role: "user", content: `Analyse ces emails:\n\n${JSON.stringify(emailSummaries, null, 2)}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ suggested: 0, message: "Aucune liaison détectée" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    let suggestedCount = 0;

    // Créer les liaisons suggérées
    for (const link of analysis.suggested_links || []) {
      if (link.confidence < 0.7 || !link.email_ids || link.email_ids.length < 2) continue;

      const primaryEmail = emails.find(e => e.id === link.email_ids[0]);
      
      const { error: insertError } = await supabase
        .from("email_thread_links")
        .insert({
          user_id: user.id,
          primary_thread_id: primaryEmail?.gmail_thread_id || link.email_ids[0],
          linked_email_ids: link.email_ids,
          link_reason: link.reason,
          link_type: link.link_type || "related",
          ai_suggested: true,
          user_confirmed: false
        });

      if (!insertError) suggestedCount++;
    }

    console.log(`Suggested ${suggestedCount} thread links for user ${user.id}`);

    return new Response(JSON.stringify({ 
      suggested: suggestedCount,
      total_analyzed: emails.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Link threads error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
