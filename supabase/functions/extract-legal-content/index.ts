import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  url: string;
  source_type?: 'jurisprudence' | 'legislation' | 'doctrine';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, source_type = 'jurisprudence' } = await req.json() as ExtractRequest;

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracting content from: ${url}`);

    // Scrape the full page content
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    if (!markdown || markdown.length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content found at URL' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to structure the content
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en droit suisse. Analyse le document juridique fourni et extrais les informations structurées.

Extrais:
- title: titre complet du document
- reference_number: numéro de référence officiel (ATF, numéro d'arrêt, article de loi)
- summary: résumé en 2-3 paragraphes des points clés
- full_text: texte intégral nettoyé et formaté
- date_decision: date de décision/publication au format YYYY-MM-DD
- legal_domain: domaine (protection_adulte, droit_civil, procedure, droit_penal, etc.)
- court_or_source: tribunal ou source (Tribunal fédéral, Code civil, etc.)
- keywords: mots-clés pertinents (array de 5-10 termes)
- legal_references: références légales citées (array)
- parties: parties impliquées si applicable
- decision_type: type de décision (arrêt, ordonnance, article, etc.)

Réponds UNIQUEMENT avec un JSON valide.`
          },
          {
            role: 'user',
            content: `Type de document: ${source_type}
URL source: ${url}
Titre de la page: ${metadata.title || 'Non disponible'}

Contenu du document:
${markdown.substring(0, 30000)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI extraction error:', await aiResponse.text());
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to analyze content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let extractedData;
    try {
      let jsonStr = aiContent;
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback to basic extraction
      extractedData = {
        title: metadata.title || 'Document juridique',
        reference_number: null,
        summary: markdown.substring(0, 500),
        full_text: markdown,
        date_decision: null,
        legal_domain: null,
        court_or_source: null,
        keywords: [],
        legal_references: [],
      };
    }

    console.log(`Successfully extracted content from ${url}`);

    return new Response(
      JSON.stringify({
        success: true,
        source_url: url,
        source_type,
        ...extractedData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-legal-content:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
