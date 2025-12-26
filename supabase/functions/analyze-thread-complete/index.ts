import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// PROMPT MAÎTRE ULTRA-STRICT pour l'analyse factuelle
const MASTER_ANALYSIS_PROMPT = `Tu es un auditeur juridique ULTRA-RIGOUREUX spécialisé dans les dossiers de protection de l'adulte en Suisse.

🔒 RÈGLES ABSOLUES - VIOLATION = ÉCHEC DE L'ANALYSE 🔒

1. **CITATION OU SILENCE**
   - Chaque affirmation DOIT être accompagnée d'une citation EXACTE
   - Format OBLIGATOIRE: "FAIT: [citation exacte entre guillemets]" → ANALYSE: [interprétation]
   - ⛔ INTERDIT: Affirmer QUOI QUE CE SOIT sans citation source
   - Si tu n'as pas de citation → tu NE DIS RIEN sur ce sujet

2. **ZÉRO SUPPOSITION**
   - ❌ INTERDIT: "Il semble que...", "On peut supposer...", "Cela suggère...", "Probablement..."
   - ❌ INTERDIT: "Il est possible que...", "On pourrait penser..."
   - ✅ AUTORISÉ: "Le texte indique EXPLICITEMENT: '[citation]'"
   - ✅ AUTORISÉ: "Aucune information disponible sur ce point"

3. **PERSONNES = CITATIONS OBLIGATOIRES**
   - ❌ INTERDIT: "Dr. Martin a refusé le traitement"
   - ✅ AUTORISÉ: "Dans l'email du 15/01, il est écrit: 'Dr. Martin nous informe que le traitement ne sera pas administré.'"

4. **CHRONOLOGIE VÉRIFIABLE**
   - Chaque événement = date + source email
   - Format: [DATE] - [ÉVÉNEMENT] - Source: Email du [JJ/MM/AAAA] de [EXPÉDITEUR]

5. **NIVEAUX DE CERTITUDE (obligatoire pour chaque problème)**
   - "CERTAIN" = Citation directe explicite prouvant le fait
   - "PROBABLE" = Déduction logique de 2+ citations convergentes
   - "POSSIBLE" = Interprétation d'une seule citation - À VÉRIFIER

6. **BASES LÉGALES SUISSES UNIQUEMENT**
   Référence aux articles pertinents:
   
   PROTECTION DE L'ADULTE (CC 360-456):
   - Art. 388 CC: But des mesures (assistance, représentation, protection)
   - Art. 390 CC: Conditions de la curatelle
   - Art. 398 CC: Diligence du curateur
   - Art. 404 CC: Collaboration avec la personne concernée
   - Art. 406 CC: Information et rapport
   - Art. 413 CC: Révocation du curateur
   - Art. 415 CC: Surveillance de l'autorité
   - Art. 417 CC: Conflits d'intérêts
   - Art. 419-420 CC: Responsabilité
   - Art. 450 CC: Recours
   
   PROCÉDURE ADMINISTRATIVE (PA):
   - Art. 26 PA: Droit de consulter les pièces
   - Art. 29 PA: Droit d'être entendu
   - Art. 35 PA: Motivation des décisions
   - Art. 46a PA: Déni de justice / retard
   
   CONSTITUTION (Cst.):
   - Art. 7 Cst.: Dignité humaine
   - Art. 8 Cst.: Égalité
   - Art. 9 Cst.: Protection contre l'arbitraire
   - Art. 10 Cst.: Liberté personnelle
   - Art. 29 Cst.: Garanties de procédure
   
   PROTECTION DES DONNÉES (LPD):
   - Art. 6 LPD: Principes de traitement
   - Art. 25 LPD: Droit d'accès

7. **DÉTECTION DES INCOHÉRENCES**
   Pour CHAQUE personne mentionnée:
   - Compare ses affirmations dans les différents emails
   - Signale TOUTE contradiction avec: [CONTRADICTION DÉTECTÉE]
   - Format: "Email 1 dit: '[citation1]' MAIS Email 2 dit: '[citation2]'"

8. **DÉTECTION DES TRAHISONS**
   Recherche activement:
   - CC/BCC suspects (communications cachées)
   - Références à des conversations non documentées
   - Promesses non tenues (avec dates)
   - Actions contre les intérêts du pupille

FORMAT JSON STRICT:
{
  "analysis_metadata": {
    "date": "YYYY-MM-DD",
    "emails_analyzed": 0,
    "confidence_overall": "CERTAIN/PROBABLE/MIXTE"
  },
  "summary": "Résumé ULTRA-FACTUEL (max 300 mots) - UNIQUEMENT des faits cités",
  "participants": [
    {
      "name": "Nom EXACT tel qu'il apparaît",
      "role": "Rôle si EXPLICITEMENT mentionné, sinon 'Non spécifié'",
      "institution": "Institution si mentionnée",
      "first_mention": {
        "citation": "Citation exacte de la première apparition",
        "source": "Email du JJ/MM/AAAA de Expéditeur"
      },
      "consistency_score": 100,
      "contradictions_detected": []
    }
  ],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "Description factuelle de l'événement",
      "source": "Email du JJ/MM/AAAA de Expéditeur",
      "citation": "Citation EXACTE prouvant cet événement",
      "actors_involved": ["Liste des personnes impliquées"]
    }
  ],
  "issues": [
    {
      "type": "délai/refus/non-réponse/violation_droits/conflit_intérêt/abus/autre",
      "description": "Description FACTUELLE du problème",
      "severity": "critique/élevée/moyenne/faible",
      "confidence": "CERTAIN/PROBABLE/POSSIBLE",
      "citations": [
        {
          "text": "Citation EXACTE",
          "source": "Email du JJ/MM/AAAA de Expéditeur",
          "email_id": "ID si disponible"
        }
      ],
      "legal_violations": [
        {
          "article": "Art. XXX CC/PA/Cst./LPD",
          "description": "Description de la violation",
          "evidence": "Citation prouvant la violation"
        }
      ],
      "actors_responsible": ["Noms des personnes/institutions responsables"],
      "recommended_action": "Action recommandée"
    }
  ],
  "contradictions": [
    {
      "actor": "Nom de la personne",
      "statement_1": {
        "content": "Première affirmation",
        "source": "Email du JJ/MM/AAAA",
        "date": "YYYY-MM-DD"
      },
      "statement_2": {
        "content": "Affirmation contradictoire",
        "source": "Email du JJ/MM/AAAA",
        "date": "YYYY-MM-DD"
      },
      "analysis": "Nature de la contradiction",
      "severity": "critique/élevée/moyenne"
    }
  ],
  "hidden_communications": [
    {
      "type": "cc_suspect/référence_conversation/exclusion",
      "description": "Description du comportement",
      "evidence": "Citation prouvant ce comportement",
      "source": "Email du JJ/MM/AAAA",
      "actors_involved": ["Noms"]
    }
  ],
  "promises_tracking": [
    {
      "promise": "Ce qui a été promis",
      "promised_by": "Nom de la personne",
      "promise_date": "YYYY-MM-DD",
      "promise_source": "Email du JJ/MM/AAAA",
      "promise_citation": "Citation exacte de la promesse",
      "status": "tenue/brisée/en_attente",
      "resolution_evidence": "Citation prouvant si la promesse a été tenue ou non"
    }
  ],
  "unanswered_questions": [
    {
      "question": "Question restée sans réponse",
      "asked_by": "Qui a posé la question",
      "asked_date": "YYYY-MM-DD",
      "asked_source": "Email du JJ/MM/AAAA",
      "days_without_response": 0
    }
  ],
  "recommendations": [
    {
      "priority": "critique/haute/moyenne/faible",
      "action": "Action recommandée",
      "legal_basis": "Base légale justifiant cette action",
      "evidence": "Citations justifiant cette recommandation"
    }
  ]
}`;

interface Email {
  id: string;
  sender: string;
  recipient: string | null;
  subject: string;
  body: string;
  received_at: string;
}

interface ThreadAnalysis {
  analysis_metadata: any;
  summary: string;
  participants: any[];
  timeline: any[];
  issues: any[];
  contradictions: any[];
  hidden_communications: any[];
  promises_tracking: any[];
  unanswered_questions: any[];
  recommendations: any[];
}

async function analyzeThreadWithMasterPrompt(emails: Email[]): Promise<ThreadAnalysis | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  // Sort emails chronologically
  const sortedEmails = [...emails].sort((a, b) => 
    new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
  );

  // Build comprehensive thread content
  const threadContent = sortedEmails.map((email, index) => {
    const date = new Date(email.received_at).toLocaleDateString('fr-CH');
    const fullDate = new Date(email.received_at).toISOString().split('T')[0];
    return `
=== EMAIL ${index + 1} [ID: ${email.id}] ===
Date: ${date} (${fullDate})
De: ${email.sender}
À: ${email.recipient || 'Non spécifié'}
Objet: ${email.subject}
---
${email.body}
===`;
  }).join('\n\n');

  const userPrompt = `Analyse ce thread email avec une RIGUEUR ABSOLUE.

RAPPELS CRITIQUES:
1. CHAQUE affirmation = citation EXACTE obligatoire
2. ZÉRO supposition - uniquement ce qui est EXPLICITE
3. Compare les affirmations de chaque personne entre les emails
4. Détecte les promesses et vérifie si elles ont été tenues
5. Identifie les questions restées sans réponse

THREAD À ANALYSER (${sortedEmails.length} emails):
${threadContent}

Réponds UNIQUEMENT en JSON valide selon le format spécifié.
CHAQUE problème identifié DOIT avoir au moins une citation exacte.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: MASTER_ANALYSIS_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content.substring(0, 500));
      return null;
    }

    return JSON.parse(jsonMatch[0]) as ThreadAnalysis;
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { threadId, batchSize = 10 } = await req.json().catch(() => ({}));

    console.log('Starting complete thread analysis with MASTER prompt (Pass 2)...');

    let threadsToAnalyze: string[] = [];

    if (threadId) {
      threadsToAnalyze = [threadId];
    } else {
      // Get threads that haven't been analyzed yet
      const { data: existingAnalyses } = await supabase
        .from('thread_analyses')
        .select('thread_id');
      
      const analyzedThreads = new Set(existingAnalyses?.map(a => a.thread_id) || []);

      // Get unique thread IDs from emails with content
      const { data: emails } = await supabase
        .from('emails')
        .select('gmail_thread_id')
        .not('gmail_thread_id', 'is', null)
        .not('body', 'is', null)
        .not('body', 'eq', '');

      const uniqueThreads = [...new Set(emails?.map(e => e.gmail_thread_id).filter(Boolean) || [])];
      threadsToAnalyze = uniqueThreads.filter(t => !analyzedThreads.has(t!)).slice(0, batchSize) as string[];
    }

    console.log(`Analyzing ${threadsToAnalyze.length} threads with MASTER prompt`);

    const results = {
      analyzed: 0,
      issuesFound: 0,
      contradictionsFound: 0,
      promisesTracked: 0,
      errors: [] as string[],
    };

    for (const currentThreadId of threadsToAnalyze) {
      try {
        // Get all emails in this thread
        const { data: threadEmails, error: emailsError } = await supabase
          .from('emails')
          .select('id, sender, recipient, subject, body, received_at')
          .eq('gmail_thread_id', currentThreadId)
          .not('body', 'is', null)
          .not('body', 'eq', '')
          .order('received_at', { ascending: true });

        if (emailsError || !threadEmails || threadEmails.length === 0) {
          console.log(`No emails found for thread ${currentThreadId}`);
          continue;
        }

        console.log(`Analyzing thread ${currentThreadId} with ${threadEmails.length} emails`);

        const analysis = await analyzeThreadWithMasterPrompt(threadEmails);

        if (!analysis) {
          results.errors.push(`Failed to analyze thread ${currentThreadId}`);
          continue;
        }

        // Calculate severity and confidence
        const severityScores: Record<string, number> = {
          'critique': 4,
          'élevée': 3,
          'moyenne': 2,
          'faible': 1,
        };

        const maxSeverity = (analysis.issues || []).reduce((max: string, issue: any) => {
          const score = severityScores[issue.severity] || 0;
          return score > (severityScores[max] || 0) ? issue.severity : max;
        }, 'faible');

        const certainIssues = (analysis.issues || []).filter((i: any) => i.confidence === 'CERTAIN').length;
        const avgConfidence = analysis.issues?.length > 0
          ? certainIssues / analysis.issues.length
          : 0;

        // Store the analysis with enhanced data
        const { error: insertError } = await supabase
          .from('thread_analyses')
          .insert({
            thread_id: currentThreadId,
            email_ids: threadEmails.map(e => e.id),
            chronological_summary: analysis.summary,
            detected_issues: analysis.issues,
            participants: analysis.participants,
            timeline: analysis.timeline,
            severity: maxSeverity,
            confidence_score: avgConfidence,
            citations: (analysis.issues || []).flatMap((i: any) => i.citations || []),
          });

        if (insertError) {
          console.error(`Error storing analysis for thread ${currentThreadId}:`, insertError);
          results.errors.push(`Storage error for ${currentThreadId}`);
          continue;
        }

        results.analyzed++;
        results.issuesFound += (analysis.issues || []).length;
        results.contradictionsFound += (analysis.contradictions || []).length;
        results.promisesTracked += (analysis.promises_tracking || []).length;

        console.log(`Thread ${currentThreadId} analyzed: ${analysis.issues?.length || 0} issues, ${analysis.contradictions?.length || 0} contradictions`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing thread ${currentThreadId}:`, error);
        results.errors.push(`${currentThreadId}: ${error}`);
      }
    }

    console.log('Thread analysis with MASTER prompt completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Thread analysis error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
