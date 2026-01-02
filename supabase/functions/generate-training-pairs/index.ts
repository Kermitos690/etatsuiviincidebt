import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Email {
  id: string;
  sender: string;
  subject: string;
  body: string;
  received_at: string;
  gmail_thread_id: string | null;
  ai_analysis: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user context
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { maxPairs = 20 } = await req.json().catch(() => ({}));

    console.log(`Generating training pairs for user ${user.id}, max: ${maxPairs}`);

    // Fetch recent emails with analysis
    const { data: emails, error: emailsError } = await supabase
      .from("emails")
      .select("id, sender, subject, body, received_at, gmail_thread_id, ai_analysis")
      .eq("user_id", user.id)
      .eq("processed", true)
      .not("ai_analysis", "is", null)
      .order("received_at", { ascending: false })
      .limit(100);

    if (emailsError) {
      console.error("Error fetching emails:", emailsError);
      throw emailsError;
    }

    if (!emails || emails.length < 2) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Not enough emails to generate pairs",
        generated: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing pairs to avoid duplicates
    const { data: existingPairs } = await supabase
      .from("swipe_training_pairs")
      .select("email_1_id, email_2_id")
      .eq("user_id", user.id);

    const existingPairSet = new Set(
      (existingPairs || []).map(p => 
        [p.email_1_id, p.email_2_id].sort().join("-")
      )
    );

    // Helper to extract keywords from text
    const extractKeywords = (text: string): string[] => {
      if (!text) return [];
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 4);
      return [...new Set(words)].slice(0, 20);
    };

    // Helper to extract actors (senders)
    const extractActors = (emails: Email[]): Map<string, Email[]> => {
      const actorMap = new Map<string, Email[]>();
      for (const email of emails) {
        const sender = email.sender?.toLowerCase().split("<")[0].trim() || "unknown";
        if (!actorMap.has(sender)) {
          actorMap.set(sender, []);
        }
        actorMap.get(sender)!.push(email);
      }
      return actorMap;
    };

    // Generate pairs based on different criteria
    const pairsToInsert: any[] = [];
    const actorMap = extractActors(emails as Email[]);

    // Strategy 1: Same sender, different emails
    for (const [sender, senderEmails] of actorMap) {
      if (senderEmails.length >= 2 && pairsToInsert.length < maxPairs) {
        for (let i = 0; i < Math.min(senderEmails.length - 1, 3); i++) {
          const e1 = senderEmails[i];
          const e2 = senderEmails[i + 1];
          const pairKey = [e1.id, e2.id].sort().join("-");
          
          if (!existingPairSet.has(pairKey) && pairsToInsert.length < maxPairs) {
            const keywords1 = extractKeywords(e1.subject + " " + e1.body);
            const keywords2 = extractKeywords(e2.subject + " " + e2.body);
            const overlap = keywords1.filter(k => keywords2.includes(k));
            
            pairsToInsert.push({
              user_id: user.id,
              email_1_id: e1.id,
              email_2_id: e2.id,
              pair_type: "same_sender",
              context_summary: `Emails de ${sender}`,
              keywords_overlap: overlap.slice(0, 10),
              actors_overlap: [sender],
              priority_score: 70 + overlap.length,
              is_processed: false,
            });
            existingPairSet.add(pairKey);
          }
        }
      }
    }

    // Strategy 2: Same thread
    const threadMap = new Map<string, Email[]>();
    for (const email of emails as Email[]) {
      if (email.gmail_thread_id) {
        if (!threadMap.has(email.gmail_thread_id)) {
          threadMap.set(email.gmail_thread_id, []);
        }
        threadMap.get(email.gmail_thread_id)!.push(email);
      }
    }

    for (const [threadId, threadEmails] of threadMap) {
      if (threadEmails.length >= 2 && pairsToInsert.length < maxPairs) {
        // First and last in thread
        const e1 = threadEmails[0];
        const e2 = threadEmails[threadEmails.length - 1];
        const pairKey = [e1.id, e2.id].sort().join("-");
        
        if (!existingPairSet.has(pairKey) && e1.id !== e2.id) {
          pairsToInsert.push({
            user_id: user.id,
            email_1_id: e1.id,
            email_2_id: e2.id,
            pair_type: "same_thread",
            context_summary: `Thread: ${e1.subject?.substring(0, 50)}...`,
            keywords_overlap: [],
            actors_overlap: [...new Set(threadEmails.map(e => e.sender?.split("<")[0].trim()))],
            priority_score: 80,
            is_processed: false,
          });
          existingPairSet.add(pairKey);
        }
      }
    }

    // Strategy 3: Random pairs with keyword overlap
    const shuffledEmails = [...emails as Email[]].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffledEmails.length - 1 && pairsToInsert.length < maxPairs; i++) {
      const e1 = shuffledEmails[i];
      const e2 = shuffledEmails[i + 1];
      const pairKey = [e1.id, e2.id].sort().join("-");
      
      if (!existingPairSet.has(pairKey)) {
        const keywords1 = extractKeywords(e1.subject + " " + e1.body);
        const keywords2 = extractKeywords(e2.subject + " " + e2.body);
        const overlap = keywords1.filter(k => keywords2.includes(k));
        
        // Only add if there's some overlap
        if (overlap.length >= 2) {
          pairsToInsert.push({
            user_id: user.id,
            email_1_id: e1.id,
            email_2_id: e2.id,
            pair_type: "keyword_overlap",
            context_summary: `Mots-clés communs: ${overlap.slice(0, 3).join(", ")}`,
            keywords_overlap: overlap.slice(0, 10),
            actors_overlap: [],
            priority_score: 50 + overlap.length * 5,
            is_processed: false,
          });
          existingPairSet.add(pairKey);
        }
      }
    }

    // Insert pairs
    if (pairsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("swipe_training_pairs")
        .insert(pairsToInsert);

      if (insertError) {
        console.error("Error inserting pairs:", insertError);
        throw insertError;
      }
    }

    console.log(`Generated ${pairsToInsert.length} training pairs`);

    return new Response(JSON.stringify({ 
      success: true, 
      generated: pairsToInsert.length,
      breakdown: {
        same_sender: pairsToInsert.filter(p => p.pair_type === "same_sender").length,
        same_thread: pairsToInsert.filter(p => p.pair_type === "same_thread").length,
        keyword_overlap: pairsToInsert.filter(p => p.pair_type === "keyword_overlap").length,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error generating training pairs:", error);
    const message = error instanceof Error ? error.message : "Failed to generate training pairs";
    return new Response(JSON.stringify({ 
      error: message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
