import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegalContextRequest {
  legalReferences: Array<{
    code: string;
    article: string;
  }>;
  factsSummary: string;
  dysfunction?: string;
  incidentType?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { legalReferences, factsSummary, dysfunction, incidentType } = await req.json() as LegalContextRequest;

    if (!legalReferences || legalReferences.length === 0) {
      return new Response(JSON.stringify({ explanations: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${legalReferences.length} legal references for context explanation`);

    // Fetch articles from legal_articles table
    const articlePromises = legalReferences.map(async (ref) => {
      const { data: articles, error } = await supabaseClient
        .from('legal_articles')
        .select('*')
        .eq('code_name', ref.code)
        .eq('article_number', ref.article)
        .eq('is_current', true)
        .limit(1);

      if (error) {
        console.error(`Error fetching article ${ref.code} ${ref.article}:`, error);
        return null;
      }

      return articles?.[0] || null;
    });

    const articles = await Promise.all(articlePromises);
    const validArticles = articles.filter(Boolean);

    if (validArticles.length === 0) {
      // If no articles found in DB, return basic explanations
      const basicExplanations = legalReferences.map(ref => ({
        code: ref.code,
        article: ref.article,
        title: null,
        text: 'Article non trouvé dans la base de référence',
        contextExplanation: null,
        verified: false,
      }));

      return new Response(JSON.stringify({ explanations: basicExplanations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build context for AI
    const legalContext = validArticles.map(art => 
      `${art.code_name} art. ${art.article_number}${art.article_title ? ` (${art.article_title})` : ''}: ${art.article_text}`
    ).join('\n\n');

    const caseContext = `
FAITS DU CAS:
${factsSummary}

${dysfunction ? `DYSFONCTIONNEMENT IDENTIFIÉ:\n${dysfunction}` : ''}

${incidentType ? `TYPE D'INCIDENT: ${incidentType}` : ''}
`;

    // Call Lovable AI for contextual explanations
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      // Return articles without AI explanations
      const explanationsWithoutAI = validArticles.map(art => ({
        code: art.code_name,
        article: art.article_number,
        title: art.article_title,
        text: art.article_text,
        contextExplanation: null,
        verified: true,
      }));

      return new Response(JSON.stringify({ explanations: explanationsWithoutAI }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es un juriste suisse spécialisé en droit de la protection de l'adulte.
Ta tâche est d'expliquer comment chaque article de loi s'applique au cas concret présenté.

RÈGLES STRICTES:
1. Explique UNIQUEMENT comment l'article s'applique aux faits donnés
2. Sois factuel et précis - pas de suppositions
3. Utilise un langage juridique mais accessible
4. Maximum 3-4 phrases par explication
5. Si l'article ne s'applique pas clairement, indique-le
6. Ne cite pas le texte de l'article - explique seulement son application

FORMAT DE RÉPONSE (JSON strict):
{
  "explanations": [
    {
      "code": "CC",
      "article": "406",
      "explanation": "En l'espèce, le retard de X semaines dans la transmission des documents constitue un manquement à l'obligation de diligence du curateur prévue par cet article."
    }
  ]
}`;

    const userPrompt = `
ARTICLES DE LOI À ANALYSER:
${legalContext}

${caseContext}

Génère une explication contextuelle pour chaque article, montrant comment il s'applique à ce cas précis.`;

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
      console.error('AI API error:', await aiResponse.text());
      // Return articles without AI explanations
      const explanationsWithoutAI = validArticles.map(art => ({
        code: art.code_name,
        article: art.article_number,
        title: art.article_title,
        text: art.article_text,
        contextExplanation: null,
        verified: true,
      }));

      return new Response(JSON.stringify({ explanations: explanationsWithoutAI }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let aiExplanations: Array<{ code: string; article: string; explanation: string }> = [];
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiExplanations = parsed.explanations || [];
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }

    // Merge AI explanations with article data
    const finalExplanations = validArticles.map(art => {
      const aiExp = aiExplanations.find(
        exp => exp.code === art.code_name && exp.article === art.article_number
      );

      return {
        code: art.code_name,
        article: art.article_number,
        title: art.article_title,
        text: art.article_text,
        contextExplanation: aiExp?.explanation || null,
        verified: true,
        keywords: art.keywords,
      };
    });

    console.log(`Generated ${finalExplanations.length} legal explanations`);

    return new Response(JSON.stringify({ explanations: finalExplanations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in explain-legal-context:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      explanations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
