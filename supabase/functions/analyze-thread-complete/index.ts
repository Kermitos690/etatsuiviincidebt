import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Ultra-strict prompt for factual analysis
const ANALYSIS_SYSTEM_PROMPT = `Tu es un auditeur juridique ultra-rigoureux spécialisé dans l'analyse de correspondances institutionnelles.

RÈGLES ABSOLUES - À RESPECTER IMPÉRATIVEMENT:

1. **CITATION OBLIGATOIRE**: Chaque affirmation DOIT être accompagnée d'une citation EXACTE du texte source.
   Format: "FAIT: [citation exacte entre guillemets] → ANALYSE: [ton interprétation]"

2. **ZÉRO SUPPOSITION**: Tu ne peux affirmer QUE ce qui est EXPLICITEMENT écrit.
   - ❌ INTERDIT: "Il semble que...", "On peut supposer...", "Cela suggère..."
   - ✅ AUTORISÉ: "Le texte indique explicitement: '[citation]'"

3. **PERSONNES MENTIONNÉES**: Si tu mentionnes une personne, tu DOIS citer OÙ elle apparaît.
   - ❌ INTERDIT: "Dr. Martin a refusé le traitement"
   - ✅ AUTORISÉ: "Dans l'email du 15/01, il est écrit: 'Dr. Martin nous informe que...'"

4. **CHRONOLOGIE VÉRIFIABLE**: Chaque événement doit être lié à une date/email source.

5. **NIVEAU DE CONFIANCE**: Pour chaque problème détecté, indique:
   - "CERTAIN" = Citation directe explicite
   - "PROBABLE" = Déduction logique de plusieurs citations
   - "POSSIBLE" = Interprétation, À VÉRIFIER

6. **PAS D'INVENTION**: Si une information n'est pas dans les emails, tu NE L'INVENTES PAS.

FORMAT DE RÉPONSE (JSON strict):
{
  "summary": "Résumé factuel du thread (max 200 mots)",
  "participants": [
    {
      "name": "Nom tel qu'il apparaît",
      "role": "Rôle si mentionné",
      "first_mention": "Citation où la personne apparaît pour la première fois"
    }
  ],
  "timeline": [
    {
      "date": "Date au format YYYY-MM-DD",
      "event": "Description de l'événement",
      "source": "Email ID ou 'Email du JJ/MM/AAAA de [expéditeur]'",
      "citation": "Citation exacte qui prouve cet événement"
    }
  ],
  "issues": [
    {
      "type": "Type de problème (délai, refus, non-réponse, etc.)",
      "description": "Description factuelle",
      "severity": "critique/élevée/moyenne/faible",
      "confidence": "CERTAIN/PROBABLE/POSSIBLE",
      "citations": [
        {
          "text": "Citation exacte",
          "source": "Référence de l'email"
        }
      ],
      "legal_implications": "Référence légale si applicable"
    }
  ],
  "unanswered_questions": ["Questions restées sans réponse dans le thread"],
  "recommendations": ["Actions recommandées basées sur les faits"]
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
  summary: string;
  participants: { name: string; role: string; first_mention: string }[];
  timeline: { date: string; event: string; source: string; citation: string }[];
  issues: {
    type: string;
    description: string;
    severity: string;
    confidence: string;
    citations: { text: string; source: string }[];
    legal_implications: string;
  }[];
  unanswered_questions: string[];
  recommendations: string[];
}

async function analyzeThreadWithAI(emails: Email[]): Promise<ThreadAnalysis | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  // Sort emails chronologically
  const sortedEmails = [...emails].sort((a, b) => 
    new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
  );

  // Build the thread content
  const threadContent = sortedEmails.map((email, index) => {
    const date = new Date(email.received_at).toLocaleDateString('fr-FR');
    return `
=== EMAIL ${index + 1} ===
Date: ${date}
De: ${email.sender}
À: ${email.recipient || 'Non spécifié'}
Objet: ${email.subject}
---
${email.body}
===`;
  }).join('\n\n');

  const userPrompt = `Analyse ce thread email complet de manière ULTRA-FACTUELLE.
Rappel: CHAQUE affirmation doit avoir une citation EXACTE. Aucune supposition.

THREAD À ANALYSER:
${threadContent}

Réponds UNIQUEMENT en JSON valide selon le format spécifié.`;

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
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for factual accuracy
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

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
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

    console.log('Starting complete thread analysis (Pass 2)...');

    let threadsToAnalyze: string[] = [];

    if (threadId) {
      threadsToAnalyze = [threadId];
    } else {
      // Get threads that haven't been analyzed yet
      const { data: existingAnalyses } = await supabase
        .from('thread_analyses')
        .select('thread_id');
      
      const analyzedThreads = new Set(existingAnalyses?.map(a => a.thread_id) || []);

      // Get unique thread IDs from emails
      const { data: emails } = await supabase
        .from('emails')
        .select('gmail_thread_id')
        .not('gmail_thread_id', 'is', null)
        .not('body', 'is', null)
        .not('body', 'eq', '');

      const uniqueThreads = [...new Set(emails?.map(e => e.gmail_thread_id).filter(Boolean) || [])];
      threadsToAnalyze = uniqueThreads.filter(t => !analyzedThreads.has(t!)).slice(0, batchSize) as string[];
    }

    console.log(`Analyzing ${threadsToAnalyze.length} threads`);

    const results = {
      analyzed: 0,
      issuesFound: 0,
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

        const analysis = await analyzeThreadWithAI(threadEmails);

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

        const maxSeverity = analysis.issues.reduce((max, issue) => {
          const score = severityScores[issue.severity] || 0;
          return score > (severityScores[max] || 0) ? issue.severity : max;
        }, 'faible');

        const avgConfidence = analysis.issues.length > 0
          ? analysis.issues.filter(i => i.confidence === 'CERTAIN').length / analysis.issues.length
          : 0;

        // Store the analysis
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
            citations: analysis.issues.flatMap(i => i.citations),
          });

        if (insertError) {
          console.error(`Error storing analysis for thread ${currentThreadId}:`, insertError);
          results.errors.push(`Storage error for ${currentThreadId}`);
          continue;
        }

        results.analyzed++;
        results.issuesFound += analysis.issues.length;

        console.log(`Thread ${currentThreadId} analyzed: ${analysis.issues.length} issues found`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing thread ${currentThreadId}:`, error);
        results.errors.push(`${currentThreadId}: ${error}`);
      }
    }

    console.log('Thread analysis completed:', results);

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
