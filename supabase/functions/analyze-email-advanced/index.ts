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
  recipient?: string;
  body: string;
  received_at: string;
  gmail_thread_id?: string;
  is_sent?: boolean;
  email_type?: string;
}

interface LegalReference {
  article: string;
  law: string;
  description: string;
  source_url?: string;
}

interface AdvancedAnalysis {
  // Ruptures de délai
  deadline_violations: {
    detected: boolean;
    details: string[];
    missed_deadlines: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
    legal_basis: LegalReference[];
  };
  // Questions sans réponse
  unanswered_questions: {
    detected: boolean;
    questions: string[];
    waiting_since: string[];
    legal_basis: LegalReference[];
  };
  // Répétitions
  repetitions: {
    detected: boolean;
    repeated_requests: string[];
    count: number;
    legal_basis: LegalReference[];
  };
  // Contradictions
  contradictions: {
    detected: boolean;
    details: string[];
    conflicting_statements: Array<{ statement1: string; statement2: string; source1?: string; source2?: string }>;
    legal_basis: LegalReference[];
  };
  // Violations des règles administratives
  rule_violations: {
    detected: boolean;
    violations: string[];
    rules_concerned: string[];
    legal_references: string[];
    legal_basis: LegalReference[];
  };
  // Contournements
  circumvention: {
    detected: boolean;
    details: string[];
    evasive_responses: string[];
    legal_basis: LegalReference[];
  };
  // Score global de problèmes
  problem_score: number;
  summary: string;
  recommendations: string[];
  confidence: "High" | "Medium" | "Low";
  // Toutes les références légales citées
  all_legal_references: LegalReference[];
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
        .select("id, subject, sender, recipient, body, received_at, gmail_thread_id, is_sent, email_type")
        .eq("gmail_thread_id", threadId)
        .order("received_at", { ascending: true });
      
      if (error) throw error;
      emails = data || [];
    } else if (emailId) {
      // Get single email
      const { data, error } = await supabase
        .from("emails")
        .select("id, subject, sender, recipient, body, received_at, gmail_thread_id, is_sent, email_type")
        .eq("id", emailId)
        .single();
      
      if (error) throw error;
      if (data) emails = [data];
    }

    if (emails.length === 0) {
      throw new Error("No emails found to analyze");
    }

    console.log(`Analyzing ${emails.length} email(s)`);

    // Build conversation context with sent/received distinction
    const conversationContext = emails.map((email, index) => {
      const date = new Date(email.received_at).toLocaleDateString("fr-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      const direction = email.is_sent ? "ENVOYÉ" : "REÇU";
      const emailType = email.email_type || (email.is_sent ? "sent" : "received");
      const typeLabel = {
        received: "Email reçu",
        sent: "Email envoyé",
        replied: "Réponse envoyée",
        forwarded: "Email transféré"
      }[emailType] || "Email";
      
      return `=== EMAIL ${index + 1} [${direction}] ===
Type: ${typeLabel}
Date: ${date}
De: ${email.sender}
${email.recipient ? `À: ${email.recipient}` : ""}
Sujet: ${email.subject}
---
${email.body.substring(0, 5000)}
`;
    }).join("\n\n");

    // Count sent vs received for context
    const sentCount = emails.filter(e => e.is_sent).length;
    const receivedCount = emails.filter(e => !e.is_sent).length;

    const systemPrompt = `Tu es un auditeur juridique expert en droit suisse. Tu analyses des correspondances avec des organismes d'État (justice, protection de l'adulte, curatelles, administrations) de manière FACTUELLE et OBJECTIVE.

RÈGLE ABSOLUE: Tu ne cites QUE des articles de loi RÉELS du droit suisse. Tu ne JAMAIS inventer de références légales. Si tu n'es pas certain d'une référence, ne la cite pas.

===== BASES LÉGALES SUISSES À UTILISER =====

CONSTITUTION FÉDÉRALE (Cst. - RS 101):
- Art. 5 Cst.: Principes de l'activité de l'État régi par le droit (légalité, intérêt public, proportionnalité, bonne foi)
- Art. 8 Cst.: Égalité devant la loi, interdiction de la discrimination
- Art. 9 Cst.: Protection contre l'arbitraire et protection de la bonne foi
- Art. 29 Cst.: Garanties générales de procédure (droit d'être entendu, décision dans un délai raisonnable)
- Art. 29a Cst.: Garantie de l'accès au juge

LOI FÉDÉRALE SUR LA PROCÉDURE ADMINISTRATIVE (PA - RS 172.021):
- Art. 10 PA: Récusation
- Art. 26 PA: Droit de consulter les pièces (accès au dossier)
- Art. 27 PA: Pièces dont la consultation peut être refusée
- Art. 29 PA: Droit d'être entendu (parties peuvent s'exprimer avant décision)
- Art. 30 PA: L'autorité entend les parties avant de prendre une décision
- Art. 32 PA: L'autorité apprécie librement les preuves
- Art. 33 PA: L'autorité admet les preuves offertes par les parties
- Art. 35 PA: Motivation des décisions écrites
- Art. 46a PA: Déni de justice, retard injustifié à statuer
- Art. 48 PA: Qualité pour recourir
- Art. 50 PA: Délai de recours (30 jours en général)

CODE DES OBLIGATIONS (CO - RS 220):
- Art. 41 CO: Responsabilité pour acte illicite
- Art. 97 CO: Inexécution des obligations
- Art. 102 CO: Demeure du débiteur
- Art. 107 CO: Délai supplémentaire en cas de demeure

CODE CIVIL SUISSE (CC - RS 210):
- Art. 2 CC: Bonne foi, abus de droit
- Art. 360 ss CC: Mesures de protection de l'adulte (curatelle)
- Art. 388 CC: But des mesures (protection du bien-être)
- Art. 389 CC: Subsidiarité et proportionnalité des mesures
- Art. 390 CC: Conditions de la curatelle
- Art. 406 CC: Tâches du curateur
- Art. 416 CC: Actes requérant le consentement de l'autorité
- Art. 419 CC: Droit de la personne concernée d'être entendue

LOI FÉDÉRALE SUR LA PROTECTION DES DONNÉES (LPD - RS 235.1):
- Art. 6 LPD: Principes (licéité, bonne foi, proportionnalité, finalité)
- Art. 25 LPD: Droit d'accès
- Art. 26 LPD: Restrictions du droit d'accès
- Art. 32 LPD: Droit de rectification

LOIS DE PROCÉDURE ADMINISTRATIVE CANTONALES (exemples):
- Genève LPA-GE: délais, motivation des décisions
- Vaud LPA-VD: procédure de recours
- Autres cantons: lois similaires

===== INSTRUCTIONS D'ANALYSE =====

Tu reçois une conversation email complète incluant:
- Emails REÇUS (de l'administration/institution vers l'utilisateur)
- Emails ENVOYÉS (de l'utilisateur vers l'administration)
- Réponses et transferts

ANALYSE REQUISE:

1. RUPTURES DE DÉLAI:
   - Identifie les délais légaux ou promis non respectés
   - Compare avec art. 29 al. 1 Cst. (délai raisonnable)
   - Compare avec art. 46a PA (retard injustifié)
   - Cite les textes légaux EXACTS si pertinents

2. QUESTIONS SANS RÉPONSE:
   - Liste les questions posées (dans emails envoyés ET reçus) restées sans réponse
   - Vérifie si cela viole art. 29 Cst. (droit d'être entendu)

3. RÉPÉTITIONS:
   - Détecte si une même demande a dû être formulée plusieurs fois
   - Cela peut indiquer un déni de justice (art. 29 Cst.)

4. CONTRADICTIONS:
   - Compare les affirmations dans les emails REÇUS vs les réponses données
   - Compare les différentes réponses de l'administration entre elles
   - Cite les passages exacts en contradiction
   - Référence art. 9 Cst. (arbitraire) si applicable

5. VIOLATIONS DES RÈGLES:
   - Identifie les manquements aux règles de procédure
   - Cite UNIQUEMENT des articles de loi RÉELS
   - Art. 35 PA (motivation), art. 26 PA (accès dossier), etc.

6. CONTOURNEMENTS:
   - Détecte les réponses évasives ou hors-sujet
   - Identifie si des questions précises reçoivent des réponses vagues

RÈGLES STRICTES:
- FACTUEL: Base-toi UNIQUEMENT sur le contenu des emails
- OBJECTIF: Ne prends pas parti, constate les faits
- CITATIONS RÉELLES: Ne cite QUE des lois suisses existantes
- PAS D'INVENTION: Si tu n'as pas de preuve = "detected: false"
- SOURCE: Pour chaque référence légale, indique la source (fedlex.admin.ch, etc.)

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "deadline_violations": {
    "detected": boolean,
    "details": ["description factuelle de chaque violation"],
    "missed_deadlines": ["délai 1 non respecté", "délai 2"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": [{"article": "Art. 29 al. 1 Cst.", "law": "Constitution fédérale (RS 101)", "description": "Droit à une décision dans un délai raisonnable", "source_url": "https://www.fedlex.admin.ch/eli/cc/1999/404/fr"}]
  },
  "unanswered_questions": {
    "detected": boolean,
    "questions": ["question exacte sans réponse"],
    "waiting_since": ["date ou durée d'attente"],
    "legal_basis": [{"article": "...", "law": "...", "description": "...", "source_url": "..."}]
  },
  "repetitions": {
    "detected": boolean,
    "repeated_requests": ["demande répétée exacte"],
    "count": number,
    "legal_basis": []
  },
  "contradictions": {
    "detected": boolean,
    "details": ["description factuelle de la contradiction"],
    "conflicting_statements": [{"statement1": "citation exacte 1", "statement2": "citation exacte contradictoire", "source1": "email du JJ/MM/AAAA", "source2": "email du JJ/MM/AAAA"}],
    "legal_basis": []
  },
  "rule_violations": {
    "detected": boolean,
    "violations": ["description factuelle de la violation"],
    "rules_concerned": ["nom de la règle"],
    "legal_references": ["Art. X de la loi Y"],
    "legal_basis": [{"article": "...", "law": "...", "description": "...", "source_url": "..."}]
  },
  "circumvention": {
    "detected": boolean,
    "details": ["description factuelle"],
    "evasive_responses": ["citation exacte de la réponse évasive"],
    "legal_basis": []
  },
  "problem_score": number (0-100),
  "summary": "Résumé FACTUEL en 3-4 phrases, sans jugement de valeur",
  "recommendations": ["action concrète recommandée basée sur le droit"],
  "confidence": "High" | "Medium" | "Low",
  "all_legal_references": [{"article": "...", "law": "...", "description": "...", "source_url": "..."}]
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
          { role: "user", content: `Analyse cette correspondance (${receivedCount} email(s) reçu(s), ${sentCount} email(s) envoyé(s)):\n\n${conversationContext}` }
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
      confidence: analysis.confidence,
      legalReferencesCount: analysis.all_legal_references?.length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      emailsAnalyzed: emails.length,
      sentCount,
      receivedCount,
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
