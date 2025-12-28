import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncidentLegalSearchRequest {
  incidentType: string;
  faits: string;
  dysfonctionnement: string;
  institution?: string;
  keywords?: string[];
}

interface LegalSearchResult {
  title: string;
  reference_number: string;
  summary: string;
  source_url: string;
  source_name: string;
  source_type: 'jurisprudence' | 'legislation';
  date_decision?: string;
  legal_domain?: string;
  keywords?: string[];
  relevance_score?: number;
}

// Mapping des types d'incident vers des termes de recherche juridique
const incidentKeywordMapping: Record<string, string[]> = {
  'Délai non respecté': ['délai curatelle CC 406', 'obligation diligence curateur', 'responsabilité tardiveté', 'ATF délai protection adulte'],
  'Non-réponse': ['droit être entendu PA 26', 'obligation communication curateur', 'refus réponse autorité', 'ATF non-réponse administrative'],
  'Abus de pouvoir': ['responsabilité curateur CC 420', 'surveillance APEA', 'abus autorité tutelle', 'ATF excès pouvoir curatelle'],
  'Conflit d\'intérêts': ['conflit intérêts curateur CC 403', 'incompatibilité fonction curatelle', 'ATF conflit intérêts protection'],
  'Défaut d\'information': ['information personne protégée CC 406', 'devoir information curatelle', 'ATF défaut information'],
  'Gestion financière': ['gestion patrimoine curatelle CC 413', 'rapport gestion curateur', 'ATF gestion financière protection'],
  'Violation droit visite': ['droit visite famille CC 274', 'relations personnelles protection', 'ATF droit visite curatelle'],
  'Décision arbitraire': ['interdiction arbitraire Cst 9', 'motivation décision APEA', 'ATF décision arbitraire tutelle'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { incidentType, faits, dysfonctionnement, institution, keywords } = 
      await req.json() as IncidentLegalSearchRequest;

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!firecrawlApiKey || !lovableApiKey) {
      console.error('Missing API keys');
      return new Response(
        JSON.stringify({ success: false, error: 'Service non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construire les termes de recherche basés sur le type d'incident
    let searchTerms: string[] = [];
    
    // Ajouter les mots-clés pré-définis pour le type d'incident
    if (incidentType && incidentKeywordMapping[incidentType]) {
      searchTerms = [...incidentKeywordMapping[incidentType]];
    }
    
    // Ajouter les mots-clés personnalisés
    if (keywords && keywords.length > 0) {
      searchTerms.push(...keywords);
    }

    // Extraire les mots-clés pertinents du texte via AI
    const extractKeywordsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Tu es un expert en droit suisse de la protection de l'adulte. Analyse le texte et extrais les termes juridiques pertinents pour une recherche de jurisprudence et de législation.
            
Retourne un JSON avec:
- jurisprudence_queries: array de 3-5 requêtes pour chercher des ATF et arrêts pertinents
- legislation_queries: array de 2-3 requêtes pour chercher des articles de loi (CC, PA, LPD, etc.)
- key_legal_concepts: array des concepts juridiques identifiés

Format: {"jurisprudence_queries": [...], "legislation_queries": [...], "key_legal_concepts": [...]}`
          },
          {
            role: 'user',
            content: `Type d'incident: ${incidentType || 'Non spécifié'}
Institution: ${institution || 'Non spécifiée'}

Faits:
${faits || 'Non renseigné'}

Dysfonctionnement:
${dysfonctionnement || 'Non renseigné'}`
          }
        ],
      }),
    });

    let aiKeywords = { jurisprudence_queries: [], legislation_queries: [], key_legal_concepts: [] };
    
    if (extractKeywordsResponse.ok) {
      const aiData = await extractKeywordsResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      try {
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];
        aiKeywords = JSON.parse(jsonStr.trim());
      } catch (e) {
        console.error('Error parsing AI keywords:', e);
      }
    }

    const allResults: LegalSearchResult[] = [];

    // Sources à scraper
    const searchSources = [
      {
        name: 'Tribunal fédéral',
        baseUrl: 'https://www.bger.ch/ext/eurospider/live/fr/php/aza/http/index.php?lang=fr&type=simple_query&query_words=',
        type: 'jurisprudence' as const,
        queries: [...(aiKeywords.jurisprudence_queries || []), ...searchTerms.filter(t => t.includes('ATF'))],
      },
      {
        name: 'Fedlex',
        baseUrl: 'https://www.fedlex.admin.ch/fr/search?text=',
        type: 'legislation' as const,
        queries: [...(aiKeywords.legislation_queries || []), ...searchTerms.filter(t => !t.includes('ATF'))],
      },
    ];

    // Limiter à 2 requêtes par source pour éviter les timeouts
    for (const source of searchSources) {
      const queriesToRun = source.queries.slice(0, 2);
      
      for (const query of queriesToRun) {
        if (!query || query.trim().length < 3) continue;
        
        const searchUrl = `${source.baseUrl}${encodeURIComponent(query)}`;
        console.log(`Searching ${source.name}: ${query}`);

        try {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: searchUrl,
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

          if (markdown.length < 100) continue;

          // Extraire les résultats via AI
          const extractResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                  content: `Extrait les résultats juridiques pertinents. Pour chaque résultat:
- title: titre complet
- reference_number: numéro de référence (ATF, article de loi)
- summary: résumé concis de la pertinence pour le cas
- source_url: URL si disponible
- date_decision: date YYYY-MM-DD
- relevance_score: 0-1 selon pertinence pour: ${incidentType}

Retourne UNIQUEMENT: {"results": [...]}`
                },
                {
                  role: 'user',
                  content: `Requête: "${query}"
Source: ${source.name}

Contenu:
${markdown.substring(0, 12000)}`
                }
              ],
            }),
          });

          if (extractResponse.ok) {
            const extractData = await extractResponse.json();
            const content = extractData.choices?.[0]?.message?.content || '';
            
            try {
              let jsonStr = content;
              const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (jsonMatch) jsonStr = jsonMatch[1];
              
              const parsed = JSON.parse(jsonStr.trim());
              const results = parsed.results || [];
              
              for (const result of results.slice(0, 3)) {
                allResults.push({
                  title: result.title || 'Sans titre',
                  reference_number: result.reference_number || '',
                  summary: result.summary || '',
                  source_url: result.source_url || searchUrl,
                  source_name: source.name,
                  source_type: source.type,
                  date_decision: result.date_decision,
                  legal_domain: 'protection_adulte',
                  keywords: aiKeywords.key_legal_concepts || [],
                  relevance_score: result.relevance_score || 0.5,
                });
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        } catch (e) {
          console.error(`Error searching ${source.name}:`, e);
        }
      }
    }

    // Dédupliquer par reference_number
    const uniqueResults = allResults.reduce((acc, curr) => {
      if (!acc.find(r => r.reference_number === curr.reference_number)) {
        acc.push(curr);
      }
      return acc;
    }, [] as LegalSearchResult[]);

    // Trier par pertinence
    uniqueResults.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    console.log(`Found ${uniqueResults.length} unique legal results`);

    return new Response(
      JSON.stringify({
        success: true,
        incident_type: incidentType,
        key_concepts: aiKeywords.key_legal_concepts || [],
        results: {
          jurisprudence: uniqueResults.filter(r => r.source_type === 'jurisprudence').slice(0, 5),
          legislation: uniqueResults.filter(r => r.source_type === 'legislation').slice(0, 5),
        },
        total_results: uniqueResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-incident-legal-context:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
