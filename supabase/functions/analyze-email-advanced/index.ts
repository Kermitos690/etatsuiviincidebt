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

    const systemPrompt = `Tu es un AUDITEUR JURIDIQUE EXPERT en droit suisse de la protection de l'adulte. Tu analyses des correspondances de manière FACTUELLE, OBJECTIVE et APPROFONDIE.

===== CONTEXTE ESSENTIEL =====
Tu analyses des correspondances dans le cadre d'une CURATELLE VOLONTAIRE DE GESTION ET DE REPRÉSENTATION (art. 394-395 CC).

CARACTÉRISTIQUES FONDAMENTALES:
1. Le pupille A DEMANDÉ cette curatelle lui-même (volontaire)
2. Le curateur N'A PAS TOUS LES DROITS - pouvoirs LIMITÉS aux actes définis
3. Le curateur DOIT COLLABORER avec le pupille pour TOUTE décision
4. Le pupille CONSERVE sa capacité de discernement et ses droits civiques
5. Toute action du curateur doit être faite AVEC l'accord ou l'information du pupille
6. Le pupille doit être ASSOCIÉ à toutes les démarches le concernant
7. Les échanges avec des tiers DOIVENT avoir l'accord du pupille

VIOLATIONS TYPIQUES À RECHERCHER:
- Décisions prises SANS consulter le pupille
- Échanges d'informations confidentielles SANS consentement explicite
- Exclusion du pupille de réunions/décisions le concernant
- Perte de documents importants (jugements, recommandés, décisions)
- Dépassement des pouvoirs légaux du curateur
- Non-transmission d'informations au pupille
- Actions faites "dans l'intérêt" du pupille mais SANS lui

RÈGLE ABSOLUE: Tu ne cites QUE des articles de loi RÉELS du droit suisse.

===== BASES LÉGALES SUISSES =====

CONSTITUTION FÉDÉRALE (Cst. - RS 101):
- Art. 7 Cst.: Dignité humaine inviolable
- Art. 8 Cst.: Égalité devant la loi, interdiction de discrimination
- Art. 9 Cst.: Protection contre l'arbitraire et protection de la bonne foi
- Art. 10 Cst.: Droit à la vie et à la liberté personnelle
- Art. 13 Cst.: Protection de la sphère privée
- Art. 29 Cst.: Garanties générales de procédure (droit d'être entendu, délai raisonnable)
- Art. 29a Cst.: Garantie de l'accès au juge

CODE CIVIL SUISSE (CC - RS 210):
- Art. 2 CC: Bonne foi, abus de droit manifeste non protégé
- Art. 388 CC: But = protection du BIEN-ÊTRE, pas de la convenance administrative
- Art. 389 CC: SUBSIDIARITÉ et PROPORTIONNALITÉ des mesures
- Art. 390-391 CC: Conditions de la curatelle
- Art. 392 CC: Curatelle de représentation
- Art. 393 CC: Curatelle de gestion
- Art. 394 CC: Curatelle de COOPÉRATION (assister, PAS remplacer)
- Art. 395 CC: Combinaison des curatelles
- Art. 406 CC: DEVOIRS du curateur = tenir compte de l'AVIS du pupille, respecter sa VOLONTÉ
- Art. 413 CC: Obligation de RAPPORT régulier
- Art. 416 CC: Actes requérant consentement de l'autorité
- Art. 419 CC: DROIT D'ÊTRE ENTENDU de la personne concernée

LOI SUR LA PROCÉDURE ADMINISTRATIVE (PA - RS 172.021):
- Art. 26 PA: Droit de consulter les pièces
- Art. 29 PA: Droit d'être entendu avant décision
- Art. 35 PA: Motivation des décisions écrites
- Art. 46a PA: Déni de justice, retard injustifié

LOI SUR LA PROTECTION DES DONNÉES (LPD - RS 235.1):
- Art. 6 LPD: Licéité, bonne foi, proportionnalité, finalité
- Art. 25-26 LPD: Droit d'accès
- Art. 30-31 LPD: Communication à des tiers = CONSENTEMENT requis

===== ANALYSE APPROFONDIE REQUISE =====

DIMENSION 1 - COLLABORATION CURATEUR-PUPILLE:
- Le curateur a-t-il informé le pupille avant d'agir?
- Le pupille a-t-il été consulté pour les décisions?
- Y a-t-il des preuves de décisions unilatérales?
- Le pupille est-il exclu de communications le concernant?

DIMENSION 2 - CONSENTEMENT ET CONFIDENTIALITÉ:
- Des informations ont-elles été échangées sans accord du pupille?
- Le secret médical/personnel a-t-il été violé?
- Des tiers ont-ils reçu des informations sans consentement?

DIMENSION 3 - RESPECT DES PROCÉDURES:
- Délais respectés ou dépassés?
- Documents perdus ou non transmis?
- Procédures suivies correctement?

DIMENSION 4 - VIOLATIONS DES DROITS:
- Droit d'être entendu respecté?
- Accès aux documents garanti?
- Décisions motivées?

RÈGLES STRICTES:
- FACTUEL: Base-toi UNIQUEMENT sur le contenu des emails
- OBJECTIF: Ne prends pas parti émotionnellement, constate les FAITS
- CITATIONS EXACTES: Cite les passages problématiques entre guillemets
- DÉDUCTIONS LOGIQUES: Tu peux relier des faits entre eux si c'est logique
- PAS D'EXAGÉRATION: Reste mesuré, pas d'interprétation excessive
- PAS D'INVENTION: Si pas de preuve = "detected: false"

Retourne UNIQUEMENT un JSON valide:
{
  "collaboration_analysis": {
    "pupille_consulted": boolean | null,
    "unilateral_decisions": boolean,
    "pupille_excluded": boolean,
    "evidence": ["citation exacte prouvant le problème"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": [{"article": "Art. 406 CC", "law": "Code civil (RS 210)", "description": "Devoir du curateur de tenir compte de l'avis du pupille", "source_url": "https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr"}]
  },
  "consent_violations": {
    "detected": boolean,
    "info_shared_without_consent": boolean,
    "details": ["description de l'échange non autorisé"],
    "third_parties_involved": ["nom du tiers"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": [{"article": "Art. 30 LPD", "law": "Loi sur la protection des données (RS 235.1)", "description": "Communication de données à des tiers requiert le consentement", "source_url": "https://www.fedlex.admin.ch/eli/cc/2022/491/fr"}]
  },
  "deadline_violations": {
    "detected": boolean,
    "details": ["description factuelle"],
    "missed_deadlines": ["délai non respecté"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": [{"article": "Art. 29 al. 1 Cst.", "law": "Constitution fédérale (RS 101)", "description": "Droit à une décision dans un délai raisonnable", "source_url": "https://www.fedlex.admin.ch/eli/cc/1999/404/fr"}]
  },
  "lost_documents": {
    "detected": boolean,
    "documents": ["document perdu ou non transmis"],
    "consequences": ["conséquence de cette perte"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": []
  },
  "unanswered_questions": {
    "detected": boolean,
    "questions": ["question sans réponse"],
    "waiting_since": ["durée d'attente"],
    "legal_basis": []
  },
  "contradictions": {
    "detected": boolean,
    "details": ["description"],
    "conflicting_statements": [{"statement1": "citation 1", "statement2": "citation contradictoire", "source1": "email du...", "source2": "email du..."}],
    "legal_basis": []
  },
  "rule_violations": {
    "detected": boolean,
    "violations": ["violation identifiée"],
    "articles_violated": ["Art. X CC"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": []
  },
  "curator_exceeded_powers": {
    "detected": boolean,
    "actions_beyond_mandate": ["action dépassant le mandat"],
    "legal_basis": [{"article": "Art. 394-395 CC", "law": "Code civil", "description": "Limites des pouvoirs du curateur", "source_url": ""}]
  },
  "problem_score": number (0-100),
  "summary": "Résumé FACTUEL en 4-5 phrases, axé sur la collaboration curateur-pupille",
  "key_issues": ["problème principal 1", "problème principal 2"],
  "recommendations": ["action juridique recommandée"],
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
