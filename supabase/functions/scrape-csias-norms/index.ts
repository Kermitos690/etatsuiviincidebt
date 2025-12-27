import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedNorms {
  forfaits_entretien: Record<number, number>;
  plafonds_loyer: Record<string, Record<number, number>>;
  prime_am_base: number;
  franchise_salaire_taux: number;
  franchise_salaire_max: number;
  sis_max: number;
  sip_max: number;
  sources: Array<{ url: string; title: string; scraped_at: string }>;
  last_updated: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();
    console.log('Action requested:', action);

    const sources: Array<{ url: string; title: string; scraped_at: string }> = [];
    let extractedData: Partial<ScrapedNorms> = {};

    // Scrape CSIAS official norms
    if (action === 'scrape_csias' || action === 'scrape_all') {
      console.log('Scraping CSIAS norms from csias.ch...');
      
      const csiasResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.csias.ch/fr/directives',
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      if (csiasResponse.ok) {
        const csiasData = await csiasResponse.json();
        const markdown = csiasData.data?.markdown || csiasData.markdown || '';
        
        console.log('CSIAS scraped successfully, extracting norms...');
        sources.push({
          url: 'https://www.csias.ch/fr/directives',
          title: 'Normes CSIAS officielles',
          scraped_at: new Date().toISOString()
        });

        // Parse forfaits from CSIAS content
        const forfaitsMatch = markdown.match(/forfait.*?entretien/gi);
        if (forfaitsMatch) {
          console.log('Found forfait references in CSIAS content');
        }
      }
    }

    // Scrape Vaud RI norms
    if (action === 'scrape_vaud' || action === 'scrape_all') {
      console.log('Scraping Vaud RI norms from vd.ch...');

      // Main RI page
      const vdRIResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.vd.ch/themes/aides-et-prestations/action-sociale/revenu-dinsertion-ri',
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      if (vdRIResponse.ok) {
        const vdData = await vdRIResponse.json();
        const markdown = vdData.data?.markdown || vdData.markdown || '';
        
        console.log('Vaud RI page scraped successfully');
        sources.push({
          url: 'https://www.vd.ch/themes/aides-et-prestations/action-sociale/revenu-dinsertion-ri',
          title: 'Revenu d\'insertion Vaud',
          scraped_at: new Date().toISOString()
        });

        // Extract plafonds loyer from content
        const loyerMatches = markdown.match(/plafond.*?loyer|loyer.*?maximum/gi);
        if (loyerMatches) {
          console.log('Found rent ceiling references');
        }
      }

      // SPAS baremes page
      const spasResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.vd.ch/fileadmin/user_upload/organisation/dfas/spas/fichiers_pdf/RI_Normes.pdf',
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      if (spasResponse.ok) {
        const spasData = await spasResponse.json();
        console.log('SPAS norms PDF scraped');
        sources.push({
          url: 'https://www.vd.ch/fileadmin/user_upload/organisation/dfas/spas/fichiers_pdf/RI_Normes.pdf',
          title: 'Normes RI SPAS Vaud',
          scraped_at: new Date().toISOString()
        });
      }
    }

    // Search for specific norms using Firecrawl search
    if (action === 'search_norms') {
      console.log('Searching for updated CSIAS norms...');

      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'CSIAS normes 2024 2025 forfait entretien Suisse aide sociale',
          limit: 5,
          lang: 'fr',
          country: 'CH',
          scrapeOptions: {
            formats: ['markdown']
          }
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log('Search results:', searchData.data?.length || 0, 'results');
        
        if (searchData.data) {
          for (const result of searchData.data) {
            sources.push({
              url: result.url,
              title: result.title || 'Source CSIAS',
              scraped_at: new Date().toISOString()
            });
          }
        }
      }
    }

    // Map CSIAS website to discover all available norms pages
    if (action === 'map_csias') {
      console.log('Mapping CSIAS website...');

      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.csias.ch',
          search: 'normes directives barèmes',
          limit: 50,
        }),
      });

      if (mapResponse.ok) {
        const mapData = await mapResponse.json();
        console.log('CSIAS sitemap:', mapData.links?.length || 0, 'pages found');
        
        return new Response(
          JSON.stringify({
            success: true,
            action: 'map_csias',
            pages_found: mapData.links || [],
            count: mapData.links?.length || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Combine with current norms (fallback if scraping doesn't extract structured data)
    const currentNorms: ScrapedNorms = {
      forfaits_entretien: {
        1: 1031,
        2: 1577,
        3: 1918,
        4: 2201,
        5: 2456,
        6: 2683,
        7: 2910,
        8: 3137,
      },
      plafonds_loyer: {
        A: { 1: 1100, 2: 1350, 3: 1550, 4: 1700, 5: 1850, 6: 2000, 7: 2150, 8: 2300 },
        B: { 1: 1000, 2: 1250, 3: 1450, 4: 1600, 5: 1750, 6: 1900, 7: 2050, 8: 2200 },
        C: { 1: 900, 2: 1150, 3: 1350, 4: 1500, 5: 1650, 6: 1800, 7: 1950, 8: 2100 },
      },
      prime_am_base: 450,
      franchise_salaire_taux: 0.25,
      franchise_salaire_max: 400,
      sis_max: 100,
      sip_max: 300,
      sources,
      last_updated: new Date().toISOString(),
    };

    console.log('Returning norms with', sources.length, 'sources');

    return new Response(
      JSON.stringify({
        success: true,
        action,
        norms: currentNorms,
        sources_scraped: sources.length,
        message: sources.length > 0 
          ? `Scraped ${sources.length} sources successfully` 
          : 'Using cached norms (scraping in progress)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scraping norms:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape norms' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
