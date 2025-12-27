import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// ===============================================================
// PROMPT MAÎTRE - ANALYSE CROISÉE DE SITUATIONS (PDFs)
// ===============================================================
const SITUATION_ANALYSIS_PROMPT = `Tu es un auditeur juridique ULTRA-RIGOUREUX spécialisé dans l'analyse croisée de documents de protection de l'adulte en Suisse.

🔒 RÈGLES ABSOLUES - VIOLATION = ÉCHEC DE L'ANALYSE 🔒

1. **CITATION OU SILENCE**
   - Chaque affirmation DOIT être accompagnée d'une citation EXACTE
   - Format OBLIGATOIRE: "FAIT: [citation exacte entre guillemets]" → ANALYSE: [interprétation]
   - ⛔ INTERDIT: Affirmer QUOI QUE CE SOIT sans citation source
   - Si tu n'as pas de citation → tu NE DIS RIEN sur ce sujet

2. **ANALYSE CROISÉE INTER-DOCUMENTS**
   - Compare les affirmations entre TOUS les documents
   - Détecte les contradictions entre documents différents
   - Identifie les chronologies incohérentes
   - Repère les personnes mentionnées dans plusieurs documents

3. **PERSONNES = CITATIONS OBLIGATOIRES**
   - Chaque personne mentionnée = citation du document source
   - Format: "Dans [Document X, page Y]: '[citation exacte]'"

4. **CHRONOLOGIE CONSOLIDÉE**
   - Fusionne les événements de tous les documents
   - Format: [DATE] - [ÉVÉNEMENT] - Source: [Document X, page Y]

5. **NIVEAUX DE CERTITUDE**
   - "CERTAIN" = Citation directe explicite
   - "PROBABLE" = Déduction de 2+ documents convergents
   - "POSSIBLE" = Interprétation d'un seul document - À VÉRIFIER

================================================================================
BASES LÉGALES SUISSES (Protection de l'adulte)
================================================================================

- Art. 388 CC: But = BIEN-ÊTRE du pupille
- Art. 389 CC: SUBSIDIARITÉ et PROPORTIONNALITÉ
- Art. 390-396 CC: Types de curatelle
- Art. 404-406 CC: Devoirs du curateur - COLLABORATION
- Art. 416 CC: Actes requérant consentement autorité
- Art. 419 CC: DROIT D'ÊTRE ENTENDU
- Art. 450 CC: Recours (30 jours)
- Art. 29 Cst.: Droit d'être entendu
- Art. 35 PA: Motivation des décisions
- LVPAE (Vaud): Procédure, audition, surveillance
- Directives COPMA: Standards de qualité

================================================================================
VIOLATIONS À DÉTECTER (INTER-DOCUMENTS)
================================================================================

1. CONTRADICTIONS ENTRE DOCUMENTS
   - Affirmations opposées sur les mêmes faits
   - Dates incohérentes
   - Versions différentes d'un même événement

2. OMISSIONS SUSPECTES
   - Document A mentionne un fait absent de B
   - Information cruciale manquante

3. VIOLATIONS LÉGALES
   - Non-respect des délais
   - Absence de consultation
   - Décisions sans base légale

4. PATTERNS DE COMPORTEMENT
   - Même acteur problématique dans plusieurs documents
   - Récurrence de dysfonctionnements

================================================================================
FORMAT JSON STRICT
================================================================================

{
  "analysis_metadata": {
    "date": "YYYY-MM-DD",
    "documents_analyzed": 0,
    "total_pages": 0,
    "confidence_overall": "CERTAIN/PROBABLE/MIXTE"
  },
  "summary": "Résumé ULTRA-FACTUEL consolidé (max 500 mots)",
  "chronological_summary": "Récit chronologique des événements clés",
  "participants": [
    {
      "name": "Nom EXACT",
      "role": "Rôle si EXPLICITEMENT mentionné",
      "institution": "Institution si mentionnée",
      "documents_mentioned": ["Liste des documents où apparaît"],
      "first_mention": {
        "citation": "Citation exacte",
        "source": "Document X, page Y"
      },
      "actions": ["Liste des actions documentées"],
      "trust_indicators": {
        "positive": ["Actions positives documentées"],
        "negative": ["Actions négatives documentées"]
      }
    }
  ],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "Description factuelle",
      "source": "Document X, page Y",
      "citation": "Citation EXACTE",
      "actors_involved": ["Noms"],
      "importance": "critique/haute/moyenne/faible"
    }
  ],
  "contradictions": [
    {
      "type": "fait/date/version/omission",
      "description": "Nature de la contradiction",
      "document_1": {
        "source": "Document A, page X",
        "citation": "Citation exacte",
        "date": "YYYY-MM-DD"
      },
      "document_2": {
        "source": "Document B, page Y",
        "citation": "Citation contradictoire",
        "date": "YYYY-MM-DD"
      },
      "severity": "critique/élevée/moyenne",
      "analysis": "Explication de l'incohérence"
    }
  ],
  "violations_detected": [
    {
      "type": "délai/procédure/droits/gestion/abus",
      "description": "Description factuelle",
      "severity": "critique/élevée/moyenne/faible",
      "confidence": "CERTAIN/PROBABLE/POSSIBLE",
      "citations": [
        {
          "text": "Citation EXACTE",
          "source": "Document X, page Y"
        }
      ],
      "legal_references": [
        {
          "article": "Art. XXX CC/PA/Cst.",
          "law": "Nom de la loi",
          "description": "Violation constatée"
        }
      ],
      "actors_responsible": ["Noms"],
      "evidence_strength": "fort/moyen/faible"
    }
  ],
  "unanswered_questions": [
    {
      "question": "Question sans réponse dans les documents",
      "source": "Document X, page Y",
      "citation": "Citation mentionnant la question",
      "importance": "critique/haute/moyenne"
    }
  ],
  "deadline_violations": [
    {
      "deadline": "Date limite",
      "context": "Contexte du délai",
      "source": "Document X, page Y",
      "citation": "Citation prouvant le dépassement",
      "days_exceeded": 0
    }
  ],
  "recommendations": [
    {
      "priority": "critique/haute/moyenne/faible",
      "action": "Action recommandée",
      "legal_basis": "Base légale",
      "evidence": ["Citations justifiant"]
    }
  ],
  "jp_actions": [
    {
      "action": "Action à entreprendre avec la Justice de Paix",
      "urgency": "immédiate/court_terme/moyen_terme",
      "legal_basis": "Base légale",
      "documents_to_attach": ["Documents pertinents à joindre"]
    }
  ],
  "problem_score": 0
}`;

interface DocumentData {
  id: string;
  filename: string;
  extracted_text: string;
  page_count: number | null;
  created_at: string;
}

interface SituationAnalysis {
  analysis_metadata: any;
  summary: string;
  chronological_summary: string;
  participants: any[];
  timeline: any[];
  contradictions: any[];
  violations_detected: any[];
  unanswered_questions: any[];
  deadline_violations: any[];
  recommendations: any[];
  jp_actions: any[];
  problem_score: number;
}

async function analyzeSituationWithAI(documents: DocumentData[], folderName: string): Promise<SituationAnalysis | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  // Sort documents by creation date
  const sortedDocs = [...documents].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Build content from all documents
  const documentsContent = sortedDocs.map((doc, index) => {
    const text = doc.extracted_text || '[Texte non extrait]';
    const truncatedText = text.length > 15000 ? text.substring(0, 15000) + '...[tronqué]' : text;
    
    return `
═══════════════════════════════════════════════════════════════════════════════
DOCUMENT ${index + 1}: ${doc.filename}
Pages: ${doc.page_count || 'N/A'}
Date d'ajout: ${new Date(doc.created_at).toLocaleDateString('fr-CH')}
═══════════════════════════════════════════════════════════════════════════════

${truncatedText}

═══════════════════════════════════════════════════════════════════════════════`;
  }).join('\n\n');

  const userPrompt = `Analyse cette SITUATION juridique avec une RIGUEUR ABSOLUE.

SITUATION: "${folderName}"
NOMBRE DE DOCUMENTS: ${documents.length}

RAPPELS CRITIQUES:
1. Analyse CROISÉE entre TOUS les documents
2. Chaque affirmation = citation EXACTE avec source (Document X, page Y)
3. ZÉRO supposition - uniquement ce qui est EXPLICITE
4. Détecte les CONTRADICTIONS entre documents
5. Identifie les violations des bases légales suisses
6. Propose des ACTIONS concrètes pour la Justice de Paix

DOCUMENTS À ANALYSER:
${documentsContent}

Réponds UNIQUEMENT en JSON valide selon le format spécifié.
CHAQUE problème DOIT avoir au moins une citation exacte avec source.`;

  try {
    console.log(`Analyzing situation with ${documents.length} documents...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SITUATION_ANALYSIS_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requêtes atteinte, réessayez plus tard');
      }
      if (response.status === 402) {
        throw new Error('Crédits AI insuffisants');
      }
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return null;
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as SituationAnalysis;
    
    // Calculate problem score if not provided
    if (!parsed.problem_score) {
      const violationsScore = (parsed.violations_detected?.length || 0) * 15;
      const contradictionsScore = (parsed.contradictions?.length || 0) * 10;
      const deadlinesScore = (parsed.deadline_violations?.length || 0) * 12;
      const questionsScore = (parsed.unanswered_questions?.length || 0) * 5;
      
      parsed.problem_score = Math.min(100, violationsScore + contradictionsScore + deadlinesScore + questionsScore);
    }
    
    return parsed;
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return unauthorizedResponse(authError || 'Non autorisé');
    }

    console.log(`User ${user.email} executing analyze-situation`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { folderId } = await req.json();

    if (!folderId) {
      return new Response(
        JSON.stringify({ error: 'folderId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch folder details
    const { data: folder, error: folderError } = await supabase
      .from('pdf_folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (folderError || !folder) {
      console.error('Folder not found:', folderError);
      return new Response(
        JSON.stringify({ error: 'Situation non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all documents in this folder
    const { data: documents, error: docsError } = await supabase
      .from('pdf_documents')
      .select('id, filename, extracted_text, page_count, created_at')
      .eq('folder_id', folderId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des documents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun document dans cette situation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if documents have extracted text
    const docsWithText = documents.filter(d => d.extracted_text && d.extracted_text.length > 0);
    if (docsWithText.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun document avec texte extrait. Extrayez le texte des PDFs d\'abord.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing situation "${folder.name}" with ${docsWithText.length} documents...`);

    // Run AI analysis
    const analysis = await analyzeSituationWithAI(docsWithText as DocumentData[], folder.name);

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'analyse IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine severity based on problem score
    let severity = 'none';
    if (analysis.problem_score >= 70) severity = 'critical';
    else if (analysis.problem_score >= 50) severity = 'high';
    else if (analysis.problem_score >= 30) severity = 'medium';
    else if (analysis.problem_score > 0) severity = 'low';

    // Determine priority
    let priority = 'moyenne';
    if (analysis.problem_score >= 70) priority = 'critique';
    else if (analysis.problem_score >= 50) priority = 'haute';
    else if (analysis.problem_score >= 30) priority = 'moyenne';
    else priority = 'faible';

    // Save analysis to situation_analyses table
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('situation_analyses')
      .upsert({
        folder_id: folderId,
        user_id: user.id,
        analyzed_at: new Date().toISOString(),
        model: 'google/gemini-2.5-flash',
        prompt_version: 'v1',
        summary: analysis.summary,
        chronological_summary: analysis.chronological_summary,
        problem_score: analysis.problem_score,
        confidence_score: 0.8,
        severity,
        participants: analysis.participants,
        timeline: analysis.timeline,
        contradictions: analysis.contradictions,
        violations_detected: analysis.violations_detected,
        unanswered_questions: analysis.unanswered_questions,
        deadline_violations: analysis.deadline_violations,
        recommendations: analysis.recommendations,
        jp_actions: analysis.jp_actions,
        documents_analyzed: docsWithText.length,
        total_pages: docsWithText.reduce((sum, d) => sum + (d.page_count || 0), 0),
        analysis_json: analysis
      }, { onConflict: 'folder_id' })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
    }

    // Update folder with analysis summary
    const { error: updateError } = await supabase
      .from('pdf_folders')
      .update({
        situation_status: 'analysé',
        priority,
        problem_score: analysis.problem_score,
        last_analysis_at: new Date().toISOString(),
        summary: analysis.summary,
        participants: analysis.participants,
        timeline: analysis.timeline,
        violations_detected: analysis.violations_detected,
        recommendations: analysis.recommendations
      })
      .eq('id', folderId);

    if (updateError) {
      console.error('Error updating folder:', updateError);
    }

    console.log(`Situation analyzed successfully. Problem score: ${analysis.problem_score}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: savedAnalysis || analysis,
        folder: {
          ...folder,
          situation_status: 'analysé',
          priority,
          problem_score: analysis.problem_score
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('analyze-situation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
