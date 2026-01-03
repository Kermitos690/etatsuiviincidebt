import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegalSearchResult {
  title: string;
  reference_number: string;
  summary: string;
  source_url: string;
  source_name: string;
  source_type: 'jurisprudence' | 'legislation';
  date_decision?: string;
  relevance_score?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { incidentType, institution, faits, dysfonctionnement, keywords } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: LegalSearchResult[] = [];

    // 1. First, check local legal_references table
    const searchTerms = [
      incidentType,
      ...(keywords || []),
      dysfonctionnement?.split(' ').slice(0, 5).join(' ')
    ].filter(Boolean);

    for (const term of searchTerms.slice(0, 3)) {
      const { data: localRefs } = await supabase
        .from('legal_references')
        .select('*')
        .or(`article_text.ilike.%${term}%,keywords.cs.{${term}}`)
        .limit(3);

      if (localRefs) {
        for (const ref of localRefs) {
          results.push({
            title: `${ref.code_name} - Art. ${ref.article_number}`,
            reference_number: ref.article_number,
            summary: ref.article_text?.substring(0, 300) || 'Texte non disponible',
            source_url: ref.source_url || `https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr#${ref.article_number}`,
            source_name: 'Base légale interne',
            source_type: 'legislation',
            relevance_score: 0.8
          });
        }
      }
    }

    // 2. Check legal_search_results cache
    const { data: cachedResults } = await supabase
      .from('legal_search_results')
      .select('*')
      .or(`search_query.ilike.%${incidentType}%,keywords.cs.{${incidentType}}`)
      .order('relevance_score', { ascending: false })
      .limit(5);

    if (cachedResults) {
      for (const cached of cachedResults) {
        if (!results.find(r => r.reference_number === cached.reference_number)) {
          results.push({
            title: cached.title,
            reference_number: cached.reference_number || '',
            summary: cached.summary || '',
            source_url: cached.source_url,
            source_name: cached.source_name,
            source_type: cached.source_type as 'jurisprudence' | 'legislation',
            date_decision: cached.date_decision || undefined,
            relevance_score: cached.relevance_score || 0.5
          });
        }
      }
    }

    // 3. Call legal-verify for additional context if we have few results
    if (results.length < 5) {
      try {
        const query = `${incidentType} ${dysfonctionnement?.substring(0, 100) || ''} droit suisse`;
        
        const { data: verifyResult } = await supabase.functions.invoke('legal-verify', {
          body: { 
            query,
            mode: 'search',
            limit: 5
          }
        });

        if (verifyResult?.references) {
          for (const ref of verifyResult.references) {
            if (!results.find(r => r.reference_number === ref.article_number)) {
              results.push({
                title: `${ref.code_name} - Art. ${ref.article_number}`,
                reference_number: ref.article_number,
                summary: ref.explanation || ref.article_text?.substring(0, 300) || '',
                source_url: ref.source_url || '',
                source_name: ref.code_name,
                source_type: 'legislation',
                relevance_score: ref.relevance_score || 0.6
              });
            }
          }
        }
      } catch (e) {
        console.log('legal-verify call failed, continuing with existing results:', e);
      }
    }

    // 4. Add default legal bases based on incident type
    const defaultBases = getDefaultLegalBases(incidentType, institution);
    for (const base of defaultBases) {
      if (!results.find(r => r.reference_number === base.reference_number)) {
        results.push(base);
      }
    }

    // Sort by relevance
    results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    console.log(`Legal search returned ${results.length} results for type: ${incidentType}`);

    return new Response(JSON.stringify({ 
      success: true, 
      results: results.slice(0, 10),
      totalFound: results.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Legal search error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      results: [] 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDefaultLegalBases(incidentType: string, institution: string): LegalSearchResult[] {
  const bases: LegalSearchResult[] = [];
  const type = incidentType?.toLowerCase() || '';
  const inst = institution?.toLowerCase() || '';

  // Protection de l'adulte
  if (type.includes('curatelle') || type.includes('protection') || inst.includes('apea') || inst.includes('curatelle')) {
    bases.push({
      title: 'Code civil suisse - Art. 388-456 (Protection de l\'adulte)',
      reference_number: 'CC 388-456',
      summary: 'Dispositions sur les mesures de protection de l\'adulte, mandat pour cause d\'inaptitude, curatelle.',
      source_url: 'https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr#part_2/tit_11',
      source_name: 'Fedlex',
      source_type: 'legislation',
      relevance_score: 0.9
    });
  }

  // Délais / Non-réponse
  if (type.includes('délai') || type.includes('retard') || type.includes('non-réponse')) {
    bases.push({
      title: 'LPJA - Art. 29 (Droit d\'être entendu)',
      reference_number: 'LPJA 29',
      summary: 'Droit à une décision dans un délai raisonnable. L\'autorité doit statuer sans retard injustifié.',
      source_url: 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/fr',
      source_name: 'Fedlex',
      source_type: 'legislation',
      relevance_score: 0.85
    });
  }

  // Refus / Blocage
  if (type.includes('refus') || type.includes('blocage') || type.includes('obstruction')) {
    bases.push({
      title: 'Constitution fédérale - Art. 29 (Garanties de procédure)',
      reference_number: 'Cst. 29',
      summary: 'Toute personne a droit à ce que sa cause soit traitée équitablement et jugée dans un délai raisonnable.',
      source_url: 'https://www.fedlex.admin.ch/eli/cc/1999/404/fr#art_29',
      source_name: 'Fedlex',
      source_type: 'legislation',
      relevance_score: 0.8
    });
  }

  // Financial / Assets
  if (type.includes('financ') || type.includes('patrimoine') || type.includes('compte')) {
    bases.push({
      title: 'Code civil suisse - Art. 413 (Gestion du patrimoine)',
      reference_number: 'CC 413',
      summary: 'Le curateur gère les biens avec diligence et représente la personne concernée dans les actes juridiques.',
      source_url: 'https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr#art_413',
      source_name: 'Fedlex',
      source_type: 'legislation',
      relevance_score: 0.85
    });
  }

  // General procedural rights
  bases.push({
    title: 'CPC - Art. 52 (Bonne foi)',
    reference_number: 'CPC 52',
    summary: 'Les parties et les tiers sont tenus de se conformer aux règles de la bonne foi.',
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2010/262/fr#art_52',
    source_name: 'Fedlex',
    source_type: 'legislation',
    relevance_score: 0.7
  });

  return bases;
}
