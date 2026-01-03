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
  verified_source?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { incidentType, institution, faits, dysfonctionnement, keywords, force_external = true } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: LegalSearchResult[] = [];
    let perplexityUsed = false;

    // === DB-FIRST: Query legal_units (LKB) ===
    console.log('DB-FIRST: Querying LKB for legal context...');
    
    // Search in legal_units first (new LKB schema)
    const searchTerms = [
      incidentType,
      ...(keywords || []),
      dysfonctionnement?.split(' ').slice(0, 5).join(' ')
    ].filter(Boolean);

    for (const term of searchTerms.slice(0, 3)) {
      const { data: lkbUnits } = await supabase
        .from('legal_units')
        .select(`
          id, cite_key, content_text, keywords,
          legal_instruments!inner(instrument_uid, short_title, title, jurisdiction)
        `)
        .or(`content_text.ilike.%${term}%,keywords.cs.{${term.toLowerCase()}}`)
        .limit(5);

      if (lkbUnits) {
        for (const unit of lkbUnits) {
          const inst = unit.legal_instruments as any;
          const shortTitle = inst?.short_title || inst?.instrument_uid;
          
          results.push({
            title: `${shortTitle} - ${unit.cite_key}`,
            reference_number: unit.cite_key,
            summary: unit.content_text?.substring(0, 300) || 'Texte non disponible',
            source_url: inst?.jurisdiction === 'CH' 
              ? `https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr`
              : `https://prestations.vd.ch/pub/blv/web`,
            source_name: 'Legal Knowledge Base (LKB)',
            source_type: 'legislation',
            relevance_score: 0.95,
            verified_source: true
          });
        }
      }
    }

    console.log(`LKB: Found ${results.length} legal units from database`);

    // Fallback: Check legacy legal_references table
    for (const term of searchTerms.slice(0, 3)) {
      const { data: localRefs } = await supabase
        .from('legal_references')
        .select('*')
        .or(`article_text.ilike.%${term}%,keywords.cs.{${term}}`)
        .limit(3);

      if (localRefs) {
        for (const ref of localRefs) {
          // Only add if not already in results
          if (!results.find(r => r.reference_number === ref.article_number)) {
            results.push({
              title: `${ref.code_name} - Art. ${ref.article_number}`,
              reference_number: ref.article_number,
              summary: ref.article_text?.substring(0, 300) || 'Texte non disponible',
              source_url: ref.source_url || `https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr#${ref.article_number}`,
              source_name: 'Base legale interne',
              source_type: 'legislation',
              relevance_score: 0.8,
              verified_source: true
            });
          }
        }
      }
    }

    // 2. Call legal-verify for additional verification
    try {
      const query = buildLegalQuery(incidentType, dysfonctionnement, faits, institution);
      
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('legal-verify', {
        body: { 
          query,
          mode: 'legal',
          force_external: force_external, // Force Perplexity call
          context: {
            incident_title: incidentType,
            category: incidentType,
            facts_summary: faits?.substring(0, 500),
            jurisdiction: 'CH',
            institutions: institution ? [institution] : [],
            topics: keywords || []
          },
          max_citations: 8
        }
      });

      if (verifyError) {
        console.error('legal-verify error:', verifyError);
      } else if (verifyResult) {
        perplexityUsed = verifyResult.source === 'external' || verifyResult.source === 'hybrid';
        
        // Add citations from legal-verify
        if (verifyResult.citations && Array.isArray(verifyResult.citations)) {
          for (const citation of verifyResult.citations) {
            const isOfficial = isOfficialSource(citation.url);
            results.push({
              title: citation.title || 'Reference juridique',
              reference_number: extractReferenceNumber(citation.title) || '',
              summary: '',
              source_url: citation.url,
              source_name: extractSourceName(citation.url),
              source_type: citation.url.includes('bger.ch') ? 'jurisprudence' : 'legislation',
              relevance_score: isOfficial ? 0.95 : 0.75,
              verified_source: isOfficial
            });
          }
        }

        // Add key points as additional context
        if (verifyResult.key_points && Array.isArray(verifyResult.key_points)) {
          // These are informational, not separate results
          console.log('Key legal points:', verifyResult.key_points.slice(0, 3));
        }
      }
    } catch (e) {
      console.error('legal-verify call failed:', e);
    }

    // 3. Check legal_search_results cache (only if Perplexity wasn't used)
    if (!perplexityUsed) {
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
              relevance_score: cached.relevance_score || 0.5,
              verified_source: false
            });
          }
        }
      }
    }

    // 4. Add default legal bases based on incident type
    const defaultBases = getDefaultLegalBases(incidentType, institution);
    for (const base of defaultBases) {
      if (!results.find(r => r.reference_number === base.reference_number)) {
        results.push(base);
      }
    }

    // Sort by relevance and verified status
    results.sort((a, b) => {
      // Prioritize verified sources
      if (a.verified_source && !b.verified_source) return -1;
      if (!a.verified_source && b.verified_source) return 1;
      return (b.relevance_score || 0) - (a.relevance_score || 0);
    });

    // Deduplicate by URL
    const uniqueResults = deduplicateResults(results);

    console.log(`Legal search returned ${uniqueResults.length} results for type: ${incidentType}, Perplexity used: ${perplexityUsed}`);

    return new Response(JSON.stringify({ 
      success: true, 
      results: uniqueResults.slice(0, 10),
      totalFound: uniqueResults.length,
      source: perplexityUsed ? 'perplexity_verified' : 'local_only'
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

function buildLegalQuery(incidentType: string, dysfonctionnement: string, faits: string, institution: string): string {
  const parts: string[] = [];
  
  if (incidentType) {
    parts.push(`Type d'incident: ${incidentType}`);
  }
  
  if (institution) {
    parts.push(`Institution: ${institution}`);
  }
  
  if (dysfonctionnement) {
    parts.push(`Dysfonctionnement: ${dysfonctionnement.substring(0, 200)}`);
  }
  
  if (faits) {
    parts.push(`Faits: ${faits.substring(0, 300)}`);
  }
  
  parts.push('Droit suisse applicable, articles de loi, jurisprudence ATF');
  
  return parts.join('. ');
}

function isOfficialSource(url: string): boolean {
  const officialDomains = [
    'fedlex.admin.ch',
    'admin.ch',
    'bger.ch',
    'vd.ch',
    'ge.ch',
    'edoeb.admin.ch',
    'ch.ch'
  ];
  
  try {
    const hostname = new URL(url).hostname;
    return officialDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

function extractReferenceNumber(title: string): string {
  if (!title) return '';
  
  // Extract article number from title like "CC art. 388" or "LPD 13"
  const match = title.match(/(?:art\.?\s*)?(\d+(?:\.\d+)?(?:\s*(?:al\.?\s*)?\d+)?)/i);
  return match ? match[1] : '';
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('fedlex')) return 'Fedlex';
    if (hostname.includes('bger')) return 'Tribunal federal';
    if (hostname.includes('admin.ch')) return 'Admin.ch';
    if (hostname.includes('vd.ch')) return 'Canton de Vaud';
    return hostname;
  } catch {
    return 'Source externe';
  }
}

function deduplicateResults(results: LegalSearchResult[]): LegalSearchResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = result.source_url || `${result.reference_number}:${result.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
      relevance_score: 0.9,
      verified_source: true
    });
  }

  // Délais / Non-réponse
  if (type.includes('delai') || type.includes('retard') || type.includes('non-reponse')) {
    bases.push({
      title: 'Constitution federale - Art. 29 (Garanties de procedure)',
      reference_number: 'Cst. 29',
      summary: 'Toute personne a droit a ce que sa cause soit traitee equitablement et jugee dans un delai raisonnable.',
      source_url: 'https://www.fedlex.admin.ch/eli/cc/1999/404/fr#art_29',
      source_name: 'Fedlex',
      source_type: 'legislation',
      relevance_score: 0.85,
      verified_source: true
    });
  }

  // Refus / Blocage
  if (type.includes('refus') || type.includes('blocage') || type.includes('obstruction')) {
    bases.push({
      title: 'Constitution federale - Art. 29 (Garanties de procedure)',
      reference_number: 'Cst. 29',
      summary: 'Toute personne a droit a ce que sa cause soit traitee equitablement et jugee dans un delai raisonnable.',
      source_url: 'https://www.fedlex.admin.ch/eli/cc/1999/404/fr#art_29',
      source_name: 'Fedlex',
      source_type: 'legislation',
      relevance_score: 0.8,
      verified_source: true
    });
  }

  // Financial / Assets
  if (type.includes('financ') || type.includes('patrimoine') || type.includes('compte')) {
    bases.push({
      title: 'Code civil suisse - Art. 413 (Gestion du patrimoine)',
      reference_number: 'CC 413',
      summary: 'Le curateur gere les biens avec diligence et represente la personne concernee dans les actes juridiques.',
      source_url: 'https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr#art_413',
      source_name: 'Fedlex',
      source_type: 'legislation',
      relevance_score: 0.85,
      verified_source: true
    });
  }

  return bases;
}
