import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailMessage {
  id: string;
  subject: string;
  sender: string;
  body: string;
  received_at: string;
  gmail_thread_id?: string;
}

interface AdvancedAnalysis {
  // Ruptures de délai
  deadline_violations: {
    detected: boolean;
    details: string[];
    missed_deadlines: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
  };
  // Questions sans réponse
  unanswered_questions: {
    detected: boolean;
    questions: string[];
    waiting_since: string[];
  };
  // Répétitions
  repetitions: {
    detected: boolean;
    repeated_requests: string[];
    count: number;
  };
  // Contradictions
  contradictions: {
    detected: boolean;
    details: string[];
    conflicting_statements: Array<{ statement1: string; statement2: string }>;
  };
  // Violations des règles administratives
  rule_violations: {
    detected: boolean;
    violations: string[];
    rules_concerned: string[];
    legal_references: string[];
  };
  // Contournements
  circumvention: {
    detected: boolean;
    details: string[];
    evasive_responses: string[];
  };
  // Score global de problèmes
  problem_score: number;
  summary: string;
  recommendations: string[];
  confidence: "High" | "Medium" | "Low";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId, threadId, analyzeThread = true } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch the email(s) to analyze
    let emails: EmailMessage[] = [];
    
    if (threadId && analyzeThread) {
      // Get all emails in the thread
      const { data, error } = await supabase
        .from("emails")
        .select("id, subject, sender, body, received_at, gmail_thread_id")
        .eq("gmail_thread_id", threadId)
        .order("received_at", { ascending: true });
      
      if (error) throw error;
      emails = data || [];
    } else if (emailId) {
      // Get single email
      const { data, error } = await supabase
        .from("emails")
        .select("id, subject, sender, body, received_at, gmail_thread_id")
        .eq("id", emailId)
        .single();
      
      if (error) throw error;
      if (data) emails = [data];
    }

    if (emails.length === 0) {
      throw new Error("No emails found to analyze");
    }

    console.log(`Analyzing ${emails.length} email(s)`);

    // Build conversation context
    const conversationContext = emails.map((email, index) => {
      const date = new Date(email.received_at).toLocaleDateString("fr-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      return `=== EMAIL ${index + 1} ===
Date: ${date}
De: ${email.sender}
Sujet: ${email.subject}
---
${email.body.substring(0, 5000)}
`;
    }).join("\n\n");

    const systemPrompt = `Tu es un auditeur juridique expert en droit administratif suisse. Tu analyses des correspondances avec des organismes d'État (justice, protection de l'adulte, curatelles, administrations).

CONTEXTE LÉGAL SUISSE:
- Les autorités doivent répondre dans des délais raisonnables (généralement 30 jours)
- Le droit d'être entendu est fondamental (art. 29 Cst.)
- L'accès au dossier est un droit (art. 29 al. 2 Cst.)
- Les décisions doivent être motivées
- La bonne foi et l'interdiction de l'arbitraire s'appliquent

ANALYSE REQUISE:
1. RUPTURES DE DÉLAI: Identifie les délais non respectés, demandes en attente depuis trop longtemps
2. QUESTIONS SANS RÉPONSE: Liste les questions posées qui n'ont pas reçu de réponse
3. RÉPÉTITIONS: Détecte si une même demande a dû être répétée plusieurs fois
4. CONTRADICTIONS: Repère les incohérences entre différentes réponses ou positions
5. VIOLATIONS DES RÈGLES: Identifie les manquements aux règles administratives
6. CONTOURNEMENTS: Détecte les réponses évasives ou hors-sujet

RÈGLE D'OR: Base-toi UNIQUEMENT sur le contenu des emails. Si tu n'as pas de preuve = marque comme non détecté.

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "deadline_violations": {
    "detected": boolean,
    "details": ["description de chaque violation de délai"],
    "missed_deadlines": ["délai 1 non respecté", "délai 2"],
    "severity": "none" | "low" | "medium" | "high" | "critical"
  },
  "unanswered_questions": {
    "detected": boolean,
    "questions": ["question 1 sans réponse", "question 2"],
    "waiting_since": ["date ou période d'attente"]
  },
  "repetitions": {
    "detected": boolean,
    "repeated_requests": ["demande répétée 1", "demande 2"],
    "count": number
  },
  "contradictions": {
    "detected": boolean,
    "details": ["description de la contradiction"],
    "conflicting_statements": [{"statement1": "affirmation 1", "statement2": "affirmation contradictoire"}]
  },
  "rule_violations": {
    "detected": boolean,
    "violations": ["violation 1", "violation 2"],
    "rules_concerned": ["règle ou article concerné"],
    "legal_references": ["art. X de la loi Y"]
  },
  "circumvention": {
    "detected": boolean,
    "details": ["description du contournement"],
    "evasive_responses": ["réponse évasive citée"]
  },
  "problem_score": number (0-100, où 100 = situation très problématique),
  "summary": "Résumé factuel de la situation en 3-4 phrases",
  "recommendations": ["recommandation 1", "recommandation 2"],
  "confidence": "High" | "Medium" | "Low"
}`;

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
          { role: "user", content: `Analyse cette correspondance:\n\n${conversationContext}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse AI response:", content);
      throw new Error("Could not parse AI response as JSON");
    }

    const analysis: AdvancedAnalysis = JSON.parse(jsonMatch[0]);

    // Store analysis in database for the primary email
    const primaryEmailId = emailId || emails[0]?.id;
    if (primaryEmailId) {
      const { error: updateError } = await supabase
        .from("emails")
        .update({
          thread_analysis: analysis,
          processed: true
        })
        .eq("id", primaryEmailId);
      
      if (updateError) {
        console.error("Error updating email with analysis:", updateError);
      }
    }

    console.log("Analysis complete:", {
      problemScore: analysis.problem_score,
      confidence: analysis.confidence
    });

    return new Response(JSON.stringify({
      success: true,
      emailsAnalyzed: emails.length,
      analysis
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Advanced email analysis error:", error);
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
