import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  sourceType?: 'jurisprudence' | 'legislation' | 'all';
  domain?: string;
  limit?: number;
  yearFrom?: number;
  yearTo?: number;
}

interface SearchResult {
  title: string;
  reference_number: string;
  summary: string;
  source_url: string;
  source_name: string;
  source_type: 'jurisprudence' | 'legislation' | 'doctrine';
  date_decision?: string;
  legal_domain?: string;
  keywords?: string[];
  relevance_score?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sourceType = 'all', domain, limit = 10, yearFrom, yearTo } = await req.json() as SearchRequest;

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for: "${query}", type: ${sourceType}, domain: ${domain}`);

    const results: SearchResult[] = [];

    // Build search URLs based on source type
    const searchUrls: { url: string; name: string; type: 'jurisprudence' | 'legislation' }[] = [];

    if (sourceType === 'jurisprudence' || sourceType === 'all') {
      // Tribunal fédéral - bger.ch search with better parameters
      let bgerSearchUrl = `https://www.bger.ch/ext/eurospider/live/fr/php/aza/http/index.php?lang=fr&type=simple_query&query_words=${encodeURIComponent(query)}`;
      
      // Add year filters if provided
      if (yearFrom) {
        bgerSearchUrl += `&from_year=${yearFrom}`;
      }
      if (yearTo) {
        bgerSearchUrl += `&to_year=${yearTo}`;
      }
      
      searchUrls.push({ url: bgerSearchUrl, name: 'Tribunal fédéral (bger.ch)', type: 'jurisprudence' });
      
      // Also search entscheide.ch for additional ATF coverage
      const entscheideUrl = `https://entscheide.ch/search?q=${encodeURIComponent(query)}&type=bger`;
      searchUrls.push({ url: entscheideUrl, name: 'Entscheide.ch', type: 'jurisprudence' });
    }

    if (sourceType === 'legislation' || sourceType === 'all') {
      // Fedlex - Swiss federal law
      const fedlexSearchUrl = `https://www.fedlex.admin.ch/fr/search?text=${encodeURIComponent(query)}&showSubdocs=true`;
      searchUrls.push({ url: fedlexSearchUrl, name: 'Fedlex (fedlex.admin.ch)', type: 'legislation' });
    }

    // Scrape each source with Firecrawl
    for (const source of searchUrls) {
      try {
        console.log(`Scraping ${source.name}: ${source.url}`);

        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: source.url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        if (!scrapeResponse.ok) {
          console.error(`Firecrawl error for ${source.name}:`, await scrapeResponse.text());
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';

        if (!markdown || markdown.length < 100) {
          console.log(`No substantial content from ${source.name}`);
          continue;
        }

        // Use AI to extract structured results from the scraped content
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
                content: `Tu es un expert en droit suisse. Extrait les résultats de recherche juridique du contenu fourni.
Pour chaque résultat trouvé, extrais:
- title: titre complet de l'arrêt ou de l'article
- reference_number: numéro de référence (ex: ATF 142 III 617, CC 390, 5A_123/2024)
- summary: résumé en 1-2 phrases du contenu
- source_url: URL complète si disponible
- date_decision: date au format YYYY-MM-DD si disponible
- legal_domain: domaine juridique (protection_adulte, droit_civil, procedure, etc.)
- keywords: mots-clés pertinents (array)
- relevance_score: score de pertinence de 0 à 1 basé sur la requête "${query}"

Réponds UNIQUEMENT avec un JSON valide contenant un array "results".
Si aucun résultat pertinent, retourne {"results": []}.`
              },
              {
                role: 'user',
                content: `Requête de recherche: "${query}"
Source: ${source.name}
Type: ${source.type}

Contenu scrapé:
${markdown.substring(0, 15000)}`
              }
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error('AI extraction error:', await aiResponse.text());
          continue;
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '';

        // Parse AI response
        try {
          // Extract JSON from potential markdown code blocks
          let jsonStr = aiContent;
          const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1];
          }

          const parsed = JSON.parse(jsonStr.trim());
          const extractedResults = parsed.results || [];

          for (const result of extractedResults.slice(0, Math.ceil(limit / searchUrls.length))) {
            results.push({
              title: result.title || 'Sans titre',
              reference_number: result.reference_number || '',
              summary: result.summary || '',
              source_url: result.source_url || source.url,
              source_name: source.name,
              source_type: source.type,
              date_decision: result.date_decision,
              legal_domain: result.legal_domain || domain,
              keywords: result.keywords || [],
              relevance_score: result.relevance_score || 0.5,
            });
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          console.log('AI content was:', aiContent.substring(0, 500));
        }
      } catch (sourceError) {
        console.error(`Error processing ${source.name}:`, sourceError);
      }
    }

    // Sort by relevance
    results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    console.log(`Found ${results.length} results for query "${query}"`);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        results: results.slice(0, limit),
        sources_searched: searchUrls.map(s => s.name),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-legal-sources:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
