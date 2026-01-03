import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IngestionRequest {
  fetch_mode: 'full' | 'incremental';
  jurisdiction_scope: 'CH' | 'VD' | 'ALL';
  source_urls?: string[];
  domain_filter?: string[];
}

interface LegalUnit {
  cite_key: string;
  unit_type: 'article' | 'paragraph' | 'letter';
  article_number?: string;
  paragraph_number?: string;
  letter?: string;
  title?: string;
  content_text: string;
  order_index: number;
}

// Compute SHA-256 hash for content integrity
async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Parse legal text into units (articles, paragraphs, letters)
function parseTextToUnits(rawText: string, instrumentUid: string): LegalUnit[] {
  const units: LegalUnit[] = [];
  
  // Article pattern: Art. X, Article X, art. X
  const articlePattern = /(?:Art(?:icle)?\.?\s*)(\d+[a-z]?(?:bis|ter|quater)?)\s*(?:[-–—]\s*([^\n]+))?\n([\s\S]*?)(?=(?:Art(?:icle)?\.?\s*\d)|$)/gi;
  
  let match;
  let orderIndex = 0;
  
  while ((match = articlePattern.exec(rawText)) !== null) {
    const articleNum = match[1].trim();
    const articleTitle = match[2]?.trim() || undefined;
    let articleContent = match[3]?.trim() || '';
    
    // Main article unit
    const mainUnit: LegalUnit = {
      cite_key: `art. ${articleNum}`,
      unit_type: 'article',
      article_number: articleNum,
      title: articleTitle,
      content_text: articleContent,
      order_index: orderIndex++,
    };
    units.push(mainUnit);
    
    // Parse paragraphs (alinéas): 1. or ¹ or al. 1
    const paragraphPattern = /(?:^|\n)\s*(?:(\d+)[.\)°]|(?:al\.\s*)(\d+))\s+([^\n]+(?:\n(?!\s*(?:\d+[.\)°]|al\.\s*\d+|[a-z]\)))[^\n]+)*)/gi;
    let pMatch;
    
    while ((pMatch = paragraphPattern.exec(articleContent)) !== null) {
      const paraNum = pMatch[1] || pMatch[2];
      const paraContent = pMatch[3]?.trim() || '';
      
      if (paraContent.length > 10) {
        units.push({
          cite_key: `art. ${articleNum} al. ${paraNum}`,
          unit_type: 'paragraph',
          article_number: articleNum,
          paragraph_number: paraNum,
          content_text: paraContent,
          order_index: orderIndex++,
        });
        
        // Parse letters (lettres): a), b), let. a
        const letterPattern = /([a-z])\)\s+([^;]+)/gi;
        let lMatch;
        
        while ((lMatch = letterPattern.exec(paraContent)) !== null) {
          const letter = lMatch[1];
          const letterContent = lMatch[2]?.trim() || '';
          
          if (letterContent.length > 5) {
            units.push({
              cite_key: `art. ${articleNum} al. ${paraNum} let. ${letter}`,
              unit_type: 'letter',
              article_number: articleNum,
              paragraph_number: paraNum,
              letter: letter,
              content_text: letterContent,
              order_index: orderIndex++,
            });
          }
        }
      }
    }
  }
  
  return units;
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'en', 'à', 'au', 'aux', 'pour', 'par', 'sur', 'dans', 'est', 'sont', 'être', 'avoir', 'qui', 'que', 'ce', 'cette', 'ces', 'il', 'elle', 'ils', 'elles', 'son', 'sa', 'ses', 'leur', 'leurs', 'tout', 'tous', 'toute', 'toutes', 'avec', 'sans', 'peut', 'peuvent', 'doit', 'doivent', 'fait', 'font', 'dont', 'cas', 'selon', 'ainsi', 'donc', 'mais', 'comme', 'même', 'plus', 'moins', 'autre', 'autres']);
  
  const words = text.toLowerCase()
    .replace(/[^\wàâäéèêëïîôùûüçœæ\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  const freq: Record<string, number> = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: IngestionRequest = await req.json();
    const { fetch_mode, jurisdiction_scope, source_urls, domain_filter } = body;

    console.log(`Starting ${fetch_mode} ingestion for ${jurisdiction_scope}`);

    // Create ingestion run
    const { data: run, error: runError } = await supabase
      .from('ingestion_runs')
      .insert({
        run_type: fetch_mode,
        jurisdiction_scope,
        status: 'running',
      })
      .select()
      .single();

    if (runError) throw runError;

    // Get sources from catalog
    let sourcesQuery = supabase
      .from('source_catalog')
      .select('*')
      .eq('is_active', true);

    if (jurisdiction_scope !== 'ALL') {
      sourcesQuery = sourcesQuery.eq('jurisdiction', jurisdiction_scope);
    }
    if (domain_filter?.length) {
      sourcesQuery = sourcesQuery.overlaps('domain_tags', domain_filter);
    }

    const { data: sources, error: sourcesError } = await sourcesQuery;
    if (sourcesError) throw sourcesError;

    const allSources = source_urls?.length 
      ? source_urls.map(url => ({ source_url: url, source_type: 'html', authority: 'manual', jurisdiction: jurisdiction_scope, domain_tags: [] }))
      : sources || [];

    console.log(`Found ${allSources.length} sources to process`);

    let itemsTotal = 0;
    let itemsSuccess = 0;
    let itemsFailed = 0;
    const errors: Array<{ source: string; error: string }> = [];

    for (const source of allSources) {
      itemsTotal++;
      
      try {
        // Create ingestion item
        const { data: item } = await supabase
          .from('ingestion_items')
          .insert({
            run_id: run.id,
            source_url: source.source_url,
            status: 'processing',
          })
          .select()
          .single();

        const startTime = Date.now();

        // Fetch content (simplified - in production use Firecrawl/scraper)
        let rawContent = '';
        try {
          const response = await fetch(source.source_url, {
            headers: { 'User-Agent': 'LegalKB-Bot/1.0' },
          });
          rawContent = await response.text();
        } catch (fetchError) {
          throw new Error(`Fetch failed: ${fetchError}`);
        }

        const contentHash = await computeHash(rawContent);

        // Check if already ingested (incremental mode)
        if (fetch_mode === 'incremental') {
          const { data: existing } = await supabase
            .from('ingestion_items')
            .select('raw_content_hash')
            .eq('source_url', source.source_url)
            .eq('status', 'success')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (existing?.raw_content_hash === contentHash) {
            await supabase
              .from('ingestion_items')
              .update({ status: 'skipped', raw_content_hash: contentHash })
              .eq('id', item!.id);
            continue;
          }
        }

        // Extract text from HTML (basic - improve with proper parser)
        const textContent = rawContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '\n')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\n\s*\n/g, '\n')
          .trim();

        // Generate instrument UID from URL
        const urlParts = new URL(source.source_url);
        const pathSegments = urlParts.pathname.split('/').filter(Boolean);
        const instrumentUid = pathSegments.slice(-2).join('_').replace(/\.[^.]+$/, '') || 
          `manual_${Date.now()}`;

        // Check/create instrument
        let instrument;
        const { data: existingInstrument } = await supabase
          .from('legal_instruments')
          .select('*')
          .eq('instrument_uid', instrumentUid)
          .single();

        if (existingInstrument) {
          instrument = existingInstrument;
        } else {
          // Extract title from first line or meta
          const titleMatch = textContent.match(/^(.+?)(?:\n|$)/);
          const title = titleMatch?.[1]?.substring(0, 200) || instrumentUid;

          const { data: newInstrument, error: instrError } = await supabase
            .from('legal_instruments')
            .insert({
              instrument_uid: instrumentUid,
              title,
              jurisdiction: source.jurisdiction || 'CH',
              domain_tags: source.domain_tags || [],
              authority: source.authority,
              current_status: 'in_force',
            })
            .select()
            .single();

          if (instrError) throw instrError;
          instrument = newInstrument;
        }

        // Create version
        const { data: existingVersions } = await supabase
          .from('legal_versions')
          .select('version_number')
          .eq('instrument_id', instrument.id)
          .order('version_number', { ascending: false })
          .limit(1);

        const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;
        const sourceHash = await computeHash(source.source_url + contentHash);

        const { data: version, error: versionError } = await supabase
          .from('legal_versions')
          .insert({
            instrument_id: instrument.id,
            version_number: nextVersion,
            status: 'in_force',
            valid_from: new Date().toISOString().split('T')[0],
            consolidated_at: new Date().toISOString(),
            source_set_hash: sourceHash,
          })
          .select()
          .single();

        if (versionError) throw versionError;

        // Create source record
        await supabase.from('legal_sources').insert({
          version_id: version.id,
          source_url: source.source_url,
          source_type: source.source_type || 'official',
          authority: source.authority,
          is_primary: true,
          checksum: contentHash,
        });

        // Parse and create units
        const units = parseTextToUnits(textContent, instrumentUid);
        let unitsCreated = 0;

        for (const unit of units) {
          const unitHash = await computeHash(unit.content_text);
          const keywords = extractKeywords(unit.content_text);

          const { error: unitError } = await supabase
            .from('legal_units')
            .insert({
              version_id: version.id,
              instrument_id: instrument.id,
              cite_key: unit.cite_key,
              unit_type: unit.unit_type,
              article_number: unit.article_number,
              paragraph_number: unit.paragraph_number,
              letter: unit.letter,
              title: unit.title,
              content_text: unit.content_text,
              hash_sha256: unitHash,
              keywords,
              order_index: unit.order_index,
              is_key_unit: unit.unit_type === 'article',
            });

          if (!unitError) unitsCreated++;
        }

        const processingTime = Date.now() - startTime;

        await supabase
          .from('ingestion_items')
          .update({
            status: 'success',
            instrument_uid: instrumentUid,
            raw_content_hash: contentHash,
            units_created: unitsCreated,
            processing_time_ms: processingTime,
          })
          .eq('id', item!.id);

        await supabase
          .from('ingestion_items')
          .update({ instrument_uid: instrumentUid })
          .eq('id', item!.id);

        itemsSuccess++;
        console.log(`Processed ${source.source_url}: ${unitsCreated} units`);

      } catch (error: unknown) {
        itemsFailed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ source: source.source_url, error: message });
        console.error(`Failed to process ${source.source_url}:`, message);

        await supabase.from('ingestion_errors').insert({
          run_id: run.id,
          error_type: 'processing',
          error_message: message,
          source_url: source.source_url,
          recoverable: true,
        });
      }
    }

    // Update run status
    await supabase
      .from('ingestion_runs')
      .update({
        status: itemsFailed > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        items_total: itemsTotal,
        items_success: itemsSuccess,
        items_failed: itemsFailed,
        error_summary: errors,
      })
      .eq('id', run.id);

    return new Response(JSON.stringify({
      success: true,
      run_id: run.id,
      stats: {
        total: itemsTotal,
        success: itemsSuccess,
        failed: itemsFailed,
        skipped: itemsTotal - itemsSuccess - itemsFailed,
      },
      errors: errors.slice(0, 10),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Ingestion error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
