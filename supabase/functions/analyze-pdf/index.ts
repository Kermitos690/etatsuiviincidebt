import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  summary: string;
  participants: Array<{
    name: string;
    role: string;
    email?: string;
    institution?: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    actor?: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
  }>;
  thread_analysis: {
    deadline_violations: {
      detected: boolean;
      details: string[];
      missed_deadlines: string[];
      severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    };
    unanswered_questions: {
      detected: boolean;
      questions: string[];
      waiting_since: string[];
    };
    repetitions: {
      detected: boolean;
      repeated_requests: string[];
      count: number;
    };
    contradictions: {
      detected: boolean;
      details: string[];
      conflicting_statements: Array<{ statement1: string; statement2: string }>;
    };
    rule_violations: {
      detected: boolean;
      violations: string[];
      rules_concerned: string[];
      legal_references: string[];
    };
    circumvention: {
      detected: boolean;
      details: string[];
      evasive_responses: string[];
    };
    problem_score: number;
  };
  ai_analysis: {
    isIncident: boolean;
    confidence: number;
    suggestedTitle: string;
    suggestedFacts: string;
    suggestedDysfunction: string;
    suggestedInstitution: string;
    suggestedType: string;
    suggestedGravity: string;
  };
  recommendations: string[];
  legal_references: Array<{
    article: string;
    law: string;
    description: string;
  }>;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { documentId, extractedText } = await req.json();

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'documentId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[analyze-pdf] Starting analysis for document ${documentId}`);

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      console.error('[analyze-pdf] Document not found:', docError);
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const textToAnalyze = extractedText || document.extracted_text;

    if (!textToAnalyze) {
      return new Response(JSON.stringify({ error: 'No text to analyze. Please extract text first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build AI prompt
    const systemPrompt = `Tu es un expert juridique français spécialisé dans l'analyse de correspondances administratives et de litiges.
Tu analyses des discussions (échanges de courriers, emails, etc.) fournies sous forme de PDF.

Ton objectif est de:
1. Identifier tous les participants et leurs rôles
2. Construire une timeline chronologique des événements
3. Détecter les violations de délais légaux (ex: délai de réponse de 2 mois de l'administration)
4. Repérer les questions restées sans réponse
5. Identifier les répétitions de demandes
6. Détecter les contradictions dans les déclarations
7. Identifier les violations de règles ou de lois
8. Repérer les tentatives de contournement ou réponses évasives
9. Évaluer si cela constitue un incident à signaler
10. Fournir des recommandations juridiques

IMPORTANT: Base ton analyse UNIQUEMENT sur le texte fourni. Ne fais pas d'hallucinations.`;

    const userPrompt = `Analyse cette discussion/correspondance et fournis un rapport détaillé:

---
${textToAnalyze.substring(0, 30000)}
---

Réponds en JSON avec exactement cette structure:
{
  "summary": "Résumé concis de la situation",
  "participants": [
    { "name": "Nom", "role": "Rôle", "email": "email si trouvé", "institution": "Institution si applicable" }
  ],
  "timeline": [
    { "date": "YYYY-MM-DD ou période", "event": "Description de l'événement", "actor": "Qui a agi", "importance": "low|medium|high|critical" }
  ],
  "thread_analysis": {
    "deadline_violations": {
      "detected": true/false,
      "details": ["Détail 1", "Détail 2"],
      "missed_deadlines": ["Délai 1 non respecté"],
      "severity": "none|low|medium|high|critical"
    },
    "unanswered_questions": {
      "detected": true/false,
      "questions": ["Question 1 sans réponse"],
      "waiting_since": ["Date ou période"]
    },
    "repetitions": {
      "detected": true/false,
      "repeated_requests": ["Demande répétée 1"],
      "count": 0
    },
    "contradictions": {
      "detected": true/false,
      "details": ["Description de la contradiction"],
      "conflicting_statements": [{ "statement1": "...", "statement2": "..." }]
    },
    "rule_violations": {
      "detected": true/false,
      "violations": ["Violation 1"],
      "rules_concerned": ["Règle ou loi violée"],
      "legal_references": ["Art. X du Code Y"]
    },
    "circumvention": {
      "detected": true/false,
      "details": ["Tentative de contournement"],
      "evasive_responses": ["Réponse évasive"]
    },
    "problem_score": 0-100
  },
  "ai_analysis": {
    "isIncident": true/false,
    "confidence": 0-1,
    "suggestedTitle": "Titre suggéré pour l'incident",
    "suggestedFacts": "Description des faits",
    "suggestedDysfunction": "Dysfonctionnement identifié",
    "suggestedInstitution": "Institution concernée",
    "suggestedType": "Type d'incident",
    "suggestedGravity": "faible|moyen|élevé|critique"
  },
  "recommendations": ["Recommandation 1", "Recommandation 2"],
  "legal_references": [
    { "article": "Article X", "law": "Code Y", "description": "Ce que dit cet article" }
  ],
  "severity": "none|low|medium|high|critical",
  "confidence_score": 0-1
}`;

    let analysis: AnalysisResult;

    if (lovableApiKey) {
      console.log('[analyze-pdf] Using Lovable AI Gateway');
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('[analyze-pdf] AI API error:', aiResponse.status, errorText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response as JSON');
      }
      
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      console.log('[analyze-pdf] No AI key, using basic analysis');
      
      // Basic analysis without AI
      analysis = {
        summary: `Document "${document.original_filename}" analysé. ${textToAnalyze.length} caractères extraits.`,
        participants: [],
        timeline: [],
        thread_analysis: {
          deadline_violations: { detected: false, details: [], missed_deadlines: [], severity: 'none' },
          unanswered_questions: { detected: false, questions: [], waiting_since: [] },
          repetitions: { detected: false, repeated_requests: [], count: 0 },
          contradictions: { detected: false, details: [], conflicting_statements: [] },
          rule_violations: { detected: false, violations: [], rules_concerned: [], legal_references: [] },
          circumvention: { detected: false, details: [], evasive_responses: [] },
          problem_score: 0,
        },
        ai_analysis: {
          isIncident: false,
          confidence: 0,
          suggestedTitle: '',
          suggestedFacts: '',
          suggestedDysfunction: '',
          suggestedInstitution: '',
          suggestedType: '',
          suggestedGravity: 'faible',
        },
        recommendations: ['Configurer la clé API Lovable AI pour une analyse complète'],
        legal_references: [],
        severity: 'none',
        confidence_score: 0,
      };
    }

    // Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('pdf_analyses')
      .upsert({
        document_id: documentId,
        user_id: user.id,
        analysis_type: 'full',
        ai_analysis: analysis.ai_analysis,
        thread_analysis: analysis.thread_analysis,
        timeline: analysis.timeline,
        participants: analysis.participants,
        problem_score: analysis.thread_analysis.problem_score,
        severity: analysis.severity,
        confidence_score: analysis.confidence_score,
        summary: analysis.summary,
        recommendations: analysis.recommendations,
        legal_references: analysis.legal_references,
        analyzed_at: new Date().toISOString(),
        model: 'google/gemini-2.5-flash',
      }, {
        onConflict: 'document_id',
      })
      .select()
      .single();

    if (saveError) {
      console.error('[analyze-pdf] Failed to save analysis:', saveError);
    }

    console.log(`[analyze-pdf] Analysis complete for document ${documentId}`);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      analysisId: savedAnalysis?.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-pdf] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
