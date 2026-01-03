import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryRequest {
  action: 'search_instruments' | 'get_instrument' | 'get_unit' | 'resolve_status' | 'search_units';
  query?: string;
  instrument_uid?: string;
  cite_key?: string;
  date?: string;
  jurisdiction?: string;
  domain_tags?: string[];
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: QueryRequest = await req.json();
    const { action, query, instrument_uid, cite_key, date, jurisdiction, domain_tags, limit = 20 } = body;

    console.log(`Legal query: ${action}`, { query, instrument_uid, cite_key });

    let result: unknown;

    switch (action) {
      case 'search_instruments': {
        // Full-text search on instruments
        let dbQuery = supabase
          .from('legal_instruments')
          .select(`
            *,
            legal_versions(id, version_number, status, valid_from, valid_to),
            legal_units(count)
          `)
          .eq('current_status', 'in_force')
          .limit(limit);

        if (query) {
          // Search by title, abbreviation, or BLV reference
          dbQuery = dbQuery.or(`title.ilike.%${query}%,abbreviation.ilike.%${query}%,short_title.ilike.%${query}%,blv_or_rs_id.ilike.%${query}%`);
        }

        if (jurisdiction) {
          dbQuery = dbQuery.eq('jurisdiction', jurisdiction);
        }

        if (domain_tags?.length) {
          dbQuery = dbQuery.overlaps('domain_tags', domain_tags);
        }

        const { data, error } = await dbQuery;
        if (error) throw error;

        result = {
          instruments: data,
          count: data?.length || 0,
        };
        break;
      }

      case 'get_instrument': {
        if (!instrument_uid) throw new Error('instrument_uid required');

        // Get instrument with current version and sources
        const { data: instrument, error: instrError } = await supabase
          .from('legal_instruments')
          .select(`
            *,
            legal_versions(
              id, version_number, status, valid_from, valid_to, consolidated_at,
              legal_sources(id, source_url, source_type, authority, is_primary)
            )
          `)
          .eq('instrument_uid', instrument_uid)
          .single();

        if (instrError) throw instrError;

        // Get relations
        const { data: relations } = await supabase
          .from('legal_relations')
          .select(`
            id, relation_type, effective_date, note,
            to_instrument:to_instrument_id(instrument_uid, title, abbreviation, current_status)
          `)
          .eq('from_instrument_id', instrument.id);

        // Get unit count per type
        const { data: unitStats } = await supabase
          .from('legal_units')
          .select('unit_type')
          .eq('instrument_id', instrument.id);

        const unitCounts = unitStats?.reduce((acc, u) => {
          acc[u.unit_type] = (acc[u.unit_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        result = {
          instrument,
          relations,
          unit_counts: unitCounts,
        };
        break;
      }

      case 'get_unit': {
        if (!instrument_uid || !cite_key) throw new Error('instrument_uid and cite_key required');

        // Find instrument
        const { data: instrument } = await supabase
          .from('legal_instruments')
          .select('id')
          .eq('instrument_uid', instrument_uid)
          .single();

        if (!instrument) throw new Error(`Instrument ${instrument_uid} not found`);

        // Find version applicable at date
        let versionQuery = supabase
          .from('legal_versions')
          .select('id, version_number, status, valid_from, valid_to')
          .eq('instrument_id', instrument.id)
          .eq('status', 'in_force');

        if (date) {
          versionQuery = versionQuery
            .lte('valid_from', date)
            .or(`valid_to.is.null,valid_to.gte.${date}`);
        }

        const { data: versions } = await versionQuery.order('version_number', { ascending: false }).limit(1);
        const version = versions?.[0];

        if (!version) throw new Error(`No valid version found for ${instrument_uid} at ${date || 'now'}`);

        // Get unit by cite_key
        const normalizedCiteKey = cite_key.toLowerCase().replace(/\s+/g, ' ').trim();
        
        const { data: units, error: unitError } = await supabase
          .from('legal_units')
          .select(`
            *,
            legal_sources:legal_versions!inner(
              legal_sources(source_url, is_primary)
            )
          `)
          .eq('version_id', version.id)
          .ilike('cite_key', `%${normalizedCiteKey}%`);

        if (unitError) throw unitError;

        // Get primary source URL
        const { data: sources } = await supabase
          .from('legal_sources')
          .select('source_url')
          .eq('version_id', version.id)
          .eq('is_primary', true)
          .limit(1);

        result = {
          unit: units?.[0] || null,
          all_matches: units,
          version: {
            ...version,
            source_url: sources?.[0]?.source_url,
          },
          instrument_uid,
        };
        break;
      }

      case 'resolve_status': {
        if (!instrument_uid) throw new Error('instrument_uid required');

        const { data: instrument, error } = await supabase
          .from('legal_instruments')
          .select(`
            id, instrument_uid, title, abbreviation, current_status, 
            repealed_by_instrument_uid, entry_into_force, updated_at
          `)
          .eq('instrument_uid', instrument_uid)
          .single();

        if (error) throw error;

        let replacement = null;
        if (instrument.repealed_by_instrument_uid) {
          const { data: repl } = await supabase
            .from('legal_instruments')
            .select('instrument_uid, title, abbreviation, current_status')
            .eq('instrument_uid', instrument.repealed_by_instrument_uid)
            .single();
          replacement = repl;
        }

        // Check for relations that might indicate replacement
        const { data: relations } = await supabase
          .from('legal_relations')
          .select(`
            relation_type, effective_date,
            to_instrument:to_instrument_id(instrument_uid, title, abbreviation, current_status)
          `)
          .eq('from_instrument_id', instrument.id)
          .in('relation_type', ['repealed_by', 'superseded_by', 'replaced_by']);

        result = {
          instrument_uid: instrument.instrument_uid,
          title: instrument.title,
          abbreviation: instrument.abbreviation,
          status: instrument.current_status,
          in_force: instrument.current_status === 'in_force',
          replaced_by: replacement || relations?.[0]?.to_instrument || null,
          entry_into_force: instrument.entry_into_force,
          last_checked: instrument.updated_at,
        };
        break;
      }

      case 'search_units': {
        if (!query) throw new Error('query required for unit search');

        // Full-text search on units
        const { data: units, error } = await supabase
          .from('legal_units')
          .select(`
            id, cite_key, unit_type, title, content_text, hash_sha256, keywords,
            legal_instruments!inner(instrument_uid, title, abbreviation, jurisdiction, current_status),
            legal_versions!inner(version_number, status, valid_from)
          `)
          .textSearch('content_text', query, { type: 'websearch', config: 'french' })
          .eq('legal_instruments.current_status', 'in_force')
          .limit(limit);

        if (error) {
          // Fallback to ilike search if full-text fails
          const { data: fallbackUnits, error: fallbackError } = await supabase
            .from('legal_units')
            .select(`
              id, cite_key, unit_type, title, content_text, hash_sha256, keywords,
              legal_instruments!inner(instrument_uid, title, abbreviation, jurisdiction, current_status),
              legal_versions!inner(version_number, status, valid_from)
            `)
            .ilike('content_text', `%${query}%`)
            .eq('legal_instruments.current_status', 'in_force')
            .limit(limit);

          if (fallbackError) throw fallbackError;
          result = { units: fallbackUnits, count: fallbackUnits?.length || 0, search_type: 'fallback' };
        } else {
          result = { units, count: units?.length || 0, search_type: 'fulltext' };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const queryTime = Date.now() - startTime;
    console.log(`Query completed in ${queryTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      action,
      result,
      query_time_ms: queryTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Legal query error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: message,
      query_time_ms: Date.now() - startTime,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
