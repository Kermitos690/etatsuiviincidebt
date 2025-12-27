import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComparisonResult {
  overallAssessment: string;
  similarityScore: number;
  contradictions: Contradiction[];
  discrepancies: Discrepancy[];
  commonElements: CommonElement[];
  timeline: TimelineEvent[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface Contradiction {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  doc1Reference: string;
  doc2Reference: string;
  implications: string;
}

interface Discrepancy {
  field: string;
  doc1Value: string;
  doc2Value: string;
  significance: string;
}

interface CommonElement {
  type: string;
  content: string;
  confidence: number;
}

interface TimelineEvent {
  date: string;
  source: 'doc1' | 'doc2' | 'both';
  event: string;
  significance: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId1, documentId2 } = await req.json();

    if (!documentId1 || !documentId2) {
      return new Response(
        JSON.stringify({ error: 'Deux IDs de documents sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch both documents with their analyses
    const [doc1Result, doc2Result] = await Promise.all([
      supabase
        .from('pdf_documents')
        .select('*, pdf_analyses(*)')
        .eq('id', documentId1)
        .single(),
      supabase
        .from('pdf_documents')
        .select('*, pdf_analyses(*)')
        .eq('id', documentId2)
        .single()
    ]);

    if (doc1Result.error || doc2Result.error) {
      console.error('Error fetching documents:', doc1Result.error, doc2Result.error);
      return new Response(
        JSON.stringify({ error: 'Impossible de récupérer les documents' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const doc1 = doc1Result.data;
    const doc2 = doc2Result.data;

    // Get analyses
    const analysis1 = doc1.pdf_analyses?.[0] || null;
    const analysis2 = doc2.pdf_analyses?.[0] || null;

    // Prepare document content for AI comparison
    const doc1Content = {
      filename: doc1.original_filename,
      text: doc1.extracted_text?.substring(0, 15000) || '',
      summary: analysis1?.summary || '',
      participants: analysis1?.participants || [],
      timeline: analysis1?.timeline || [],
      legalReferences: analysis1?.legal_references || [],
      severity: analysis1?.severity || 'unknown',
      problemScore: analysis1?.problem_score || 0,
      threadAnalysis: analysis1?.thread_analysis || {},
    };

    const doc2Content = {
      filename: doc2.original_filename,
      text: doc2.extracted_text?.substring(0, 15000) || '',
      summary: analysis2?.summary || '',
      participants: analysis2?.participants || [],
      timeline: analysis2?.timeline || [],
      legalReferences: analysis2?.legal_references || [],
      severity: analysis2?.severity || 'unknown',
      problemScore: analysis2?.problem_score || 0,
      threadAnalysis: analysis2?.thread_analysis || {},
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      // Fallback: basic comparison without AI
      const basicComparison = performBasicComparison(doc1Content, doc2Content);
      return new Response(
        JSON.stringify(basicComparison),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI-powered deep comparison
    const systemPrompt = `Tu es un expert juridique spécialisé dans l'analyse comparative de documents administratifs et juridiques suisses, particulièrement dans le domaine de la protection de l'enfance (APEA/KESB).

Ta mission est de comparer deux documents PDF et de détecter:
1. Les CONTRADICTIONS: informations qui se contredisent entre les documents
2. Les DIVERGENCES: différences significatives dans les faits, dates, ou déclarations
3. Les INCOHÉRENCES TEMPORELLES: problèmes dans la chronologie des événements
4. Les ÉLÉMENTS COMMUNS: faits ou acteurs qui apparaissent dans les deux documents
5. Les RISQUES JURIDIQUES: implications légales des contradictions détectées

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "overallAssessment": "Résumé global de la comparaison",
  "similarityScore": 0.0-1.0,
  "riskLevel": "low|medium|high|critical",
  "contradictions": [
    {
      "type": "factuelle|temporelle|testimoniale|documentaire|légale",
      "description": "Description de la contradiction",
      "severity": "low|medium|high|critical",
      "doc1Reference": "Citation ou référence dans le document 1",
      "doc2Reference": "Citation ou référence dans le document 2",
      "implications": "Implications juridiques ou pratiques"
    }
  ],
  "discrepancies": [
    {
      "field": "Nom du champ (date, nom, fait...)",
      "doc1Value": "Valeur dans le document 1",
      "doc2Value": "Valeur dans le document 2",
      "significance": "Importance de cette divergence"
    }
  ],
  "commonElements": [
    {
      "type": "personne|institution|fait|date|décision",
      "content": "Description de l'élément commun",
      "confidence": 0.0-1.0
    }
  ],
  "timeline": [
    {
      "date": "YYYY-MM-DD ou description",
      "source": "doc1|doc2|both",
      "event": "Description de l'événement",
      "significance": "Importance pour l'analyse"
    }
  ],
  "recommendations": [
    "Recommandation 1",
    "Recommandation 2"
  ]
}`;

    const userPrompt = `Compare ces deux documents et détecte toutes les contradictions et incohérences:

=== DOCUMENT 1: ${doc1Content.filename} ===
Résumé: ${doc1Content.summary}
Sévérité: ${doc1Content.severity}
Score problème: ${doc1Content.problemScore}
Participants: ${JSON.stringify(doc1Content.participants)}
Chronologie: ${JSON.stringify(doc1Content.timeline)}
Références légales: ${JSON.stringify(doc1Content.legalReferences)}
Analyse thread: ${JSON.stringify(doc1Content.threadAnalysis)}

Contenu extrait:
${doc1Content.text}

=== DOCUMENT 2: ${doc2Content.filename} ===
Résumé: ${doc2Content.summary}
Sévérité: ${doc2Content.severity}
Score problème: ${doc2Content.problemScore}
Participants: ${JSON.stringify(doc2Content.participants)}
Chronologie: ${JSON.stringify(doc2Content.timeline)}
Références légales: ${JSON.stringify(doc2Content.legalReferences)}
Analyse thread: ${JSON.stringify(doc2Content.threadAnalysis)}

Contenu extrait:
${doc2Content.text}

Analyse ces documents en profondeur et retourne un JSON avec toutes les contradictions, divergences, et éléments communs détectés.`;

    console.log('Calling Lovable AI for comparison...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status);
      const basicComparison = performBasicComparison(doc1Content, doc2Content);
      return new Response(
        JSON.stringify(basicComparison),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    let comparisonResult: ComparisonResult;

    try {
      let content = aiData.choices?.[0]?.message?.content || '';
      
      // Extract JSON from markdown if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        content = jsonMatch[1].trim();
      }
      
      comparisonResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      const basicComparison = performBasicComparison(doc1Content, doc2Content);
      return new Response(
        JSON.stringify(basicComparison),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store comparison result
    await supabase.from('pdf_comparisons').insert({
      document_id_1: documentId1,
      document_id_2: documentId2,
      comparison_result: comparisonResult,
      similarity_score: comparisonResult.similarityScore,
      contradictions_count: comparisonResult.contradictions.length,
      risk_level: comparisonResult.riskLevel,
      user_id: doc1.user_id,
    });

    console.log('Comparison completed:', {
      contradictions: comparisonResult.contradictions.length,
      discrepancies: comparisonResult.discrepancies.length,
      riskLevel: comparisonResult.riskLevel,
    });

    return new Response(
      JSON.stringify(comparisonResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in compare-pdfs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la comparaison';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function performBasicComparison(doc1: any, doc2: any): ComparisonResult {
  const contradictions: Contradiction[] = [];
  const discrepancies: Discrepancy[] = [];
  const commonElements: CommonElement[] = [];
  
  // Compare severity
  if (doc1.severity !== doc2.severity && doc1.severity !== 'unknown' && doc2.severity !== 'unknown') {
    discrepancies.push({
      field: 'Sévérité',
      doc1Value: doc1.severity,
      doc2Value: doc2.severity,
      significance: 'Différence dans l\'évaluation de la gravité'
    });
  }

  // Compare problem scores
  const scoreDiff = Math.abs((doc1.problemScore || 0) - (doc2.problemScore || 0));
  if (scoreDiff > 30) {
    discrepancies.push({
      field: 'Score de problème',
      doc1Value: `${doc1.problemScore || 0}`,
      doc2Value: `${doc2.problemScore || 0}`,
      significance: 'Écart significatif dans les scores de problème'
    });
  }

  // Find common participants
  const participants1List: string[] = doc1.participants?.map((p: any) => String(p.name || p).toLowerCase()) || [];
  const participants2Set = new Set(doc2.participants?.map((p: any) => String(p.name || p).toLowerCase()) || []);
  
  participants1List.forEach((p: string) => {
    if (participants2Set.has(p)) {
      commonElements.push({
        type: 'personne',
        content: p,
        confidence: 0.9
      });
    }
  });

  // Calculate similarity based on common elements
  const allParticipants = new Set([...participants1List, ...participants2Set]);
  const totalParticipants = allParticipants.size;
  const similarityScore = totalParticipants > 0 
    ? commonElements.filter(e => e.type === 'personne').length / totalParticipants 
    : 0;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (contradictions.length > 3 || discrepancies.length > 5) {
    riskLevel = 'critical';
  } else if (contradictions.length > 1 || discrepancies.length > 3) {
    riskLevel = 'high';
  } else if (contradictions.length > 0 || discrepancies.length > 0) {
    riskLevel = 'medium';
  }

  return {
    overallAssessment: `Comparaison basique entre "${doc1.filename}" et "${doc2.filename}". ${discrepancies.length} divergences détectées. ${commonElements.length} éléments communs identifiés.`,
    similarityScore,
    riskLevel,
    contradictions,
    discrepancies,
    commonElements,
    timeline: [],
    recommendations: [
      'Effectuer une analyse plus approfondie avec l\'IA pour détecter des contradictions subtiles',
      'Vérifier manuellement les dates et les faits mentionnés',
      'Confirmer l\'identité des participants communs'
    ]
  };
}
