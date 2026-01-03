import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimBuilderRequest {
  email_id?: string;
  incident_id?: string;
  analysis_result?: {
    legal_references?: Array<{
      article: string;
      law: string;
      context: string;
    }>;
    assertions?: string[];
    deadlines?: Array<{ days: number; description: string }>;
  };
}

interface VerificationClaim {
  claim_text: string;
  claim_type: 'legal_assertion' | 'deadline_claim' | 'procedure_claim' | 'right_claim';
  expected_citations: Array<{ cite_key: string; instrument_uid: string }>;
  unit_ids: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ClaimBuilderRequest = await req.json();
    const { email_id, incident_id, analysis_result } = body;

    console.log('Building verification claims');

    if (!email_id && !incident_id) {
      throw new Error('email_id or incident_id required');
    }

    const claims: VerificationClaim[] = [];
    let userId: string | null = null;

    // Get user context
    if (email_id) {
      const { data: email } = await supabase
        .from('emails')
        .select('user_id')
        .eq('id', email_id)
        .single();
      userId = email?.user_id || null;
    } else if (incident_id) {
      const { data: incident } = await supabase
        .from('incidents')
        .select('user_id')
        .eq('id', incident_id)
        .single();
      userId = incident?.user_id || null;
    }

    // Get legal mentions for this email/incident
    let mentionsQuery = supabase
      .from('email_legal_mentions')
      .select(`
        *,
        legal_instruments(instrument_uid, title, abbreviation)
      `)
      .eq('resolved', true);

    if (email_id) {
      mentionsQuery = mentionsQuery.eq('email_id', email_id);
    }

    const { data: mentions } = await mentionsQuery;

    // Build claims from mentions
    for (const mention of mentions || []) {
      if (mention.instrument_id && mention.match_type === 'exact_citation') {
        // Get the unit
        const { data: units } = await supabase
          .from('legal_units')
          .select('id, cite_key, content_text')
          .eq('instrument_id', mention.instrument_id)
          .ilike('cite_key', `%${mention.match_text.match(/art\.?\s*\d+/i)?.[0] || ''}%`)
          .limit(1);

        if (units?.length) {
          claims.push({
            claim_text: `Référence à ${mention.match_text}: "${units[0].content_text.substring(0, 200)}..."`,
            claim_type: 'legal_assertion',
            expected_citations: [{
              cite_key: units[0].cite_key,
              instrument_uid: mention.legal_instruments?.instrument_uid || '',
            }],
            unit_ids: [units[0].id],
            risk_level: mention.confidence > 0.8 ? 'low' : 'medium',
          });
        }
      }
    }

    // Build claims from analysis result
    if (analysis_result?.legal_references) {
      for (const ref of analysis_result.legal_references) {
        // Try to resolve in DB
        const { data: instruments } = await supabase
          .from('legal_instruments')
          .select('id, instrument_uid')
          .or(`abbreviation.ilike.${ref.law},instrument_uid.ilike.%${ref.law}%`)
          .eq('current_status', 'in_force')
          .limit(1);

        if (instruments?.length) {
          const { data: units } = await supabase
            .from('legal_units')
            .select('id, cite_key')
            .eq('instrument_id', instruments[0].id)
            .ilike('cite_key', `%art. ${ref.article}%`)
            .limit(1);

          if (units?.length) {
            claims.push({
              claim_text: `${ref.context}`,
              claim_type: 'legal_assertion',
              expected_citations: [{
                cite_key: units[0].cite_key,
                instrument_uid: instruments[0].instrument_uid,
              }],
              unit_ids: [units[0].id],
              risk_level: 'medium',
            });
          } else {
            // Article not found in DB - CRITICAL: claim FORBIDDEN
            console.warn(`Article ${ref.article} ${ref.law} not in DB - claim blocked`);
          }
        }
      }
    }

    // Build claims from deadlines
    if (analysis_result?.deadlines) {
      for (const deadline of analysis_result.deadlines) {
        // Deadline claims need DB backing
        const { data: deadlineUnits } = await supabase
          .from('legal_units')
          .select('id, cite_key, instrument_id')
          .or(`content_text.ilike.%${deadline.days} jours%,content_text.ilike.%délai de ${deadline.days}%`)
          .limit(1);

        if (deadlineUnits?.length) {
          const { data: instr } = await supabase
            .from('legal_instruments')
            .select('instrument_uid')
            .eq('id', deadlineUnits[0].instrument_id)
            .single();

          claims.push({
            claim_text: `Délai de ${deadline.days} jours: ${deadline.description}`,
            claim_type: 'deadline_claim',
            expected_citations: [{
              cite_key: deadlineUnits[0].cite_key,
              instrument_uid: instr?.instrument_uid || '',
            }],
            unit_ids: [deadlineUnits[0].id],
            risk_level: 'high', // Deadlines are critical
          });
        } else {
          console.warn(`Deadline ${deadline.days} days not backed by DB - claim blocked`);
        }
      }
    }

    // GOLDEN RULE: Every claim MUST have at least one unit_id
    const validClaims = claims.filter(c => c.unit_ids.length > 0);
    const blockedClaims = claims.length - validClaims.length;

    if (blockedClaims > 0) {
      console.warn(`Blocked ${blockedClaims} claims without DB backing`);
    }

    // Store valid claims
    const storedClaims: string[] = [];
    for (const claim of validClaims) {
      const { data: stored, error } = await supabase
        .from('verification_claims')
        .insert({
          email_id,
          incident_id,
          user_id: userId,
          claim_text: claim.claim_text,
          claim_type: claim.claim_type,
          expected_citations: claim.expected_citations,
          unit_ids: claim.unit_ids,
          source_basis: 'db_only',
          risk_level: claim.risk_level,
          status: 'pending',
        })
        .select('id')
        .single();

      if (!error && stored) {
        storedClaims.push(stored.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      claims_built: validClaims.length,
      claims_blocked: blockedClaims,
      claim_ids: storedClaims,
      summary: {
        legal_assertions: validClaims.filter(c => c.claim_type === 'legal_assertion').length,
        deadline_claims: validClaims.filter(c => c.claim_type === 'deadline_claim').length,
        procedure_claims: validClaims.filter(c => c.claim_type === 'procedure_claim').length,
        right_claims: validClaims.filter(c => c.claim_type === 'right_claim').length,
      },
      // Enforce golden rule
      rule_enforced: 'CLAIMS_MUST_HAVE_DB_BACKING',
      blocked_reason: blockedClaims > 0 ? 'No unit_id found in DB for these claims' : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Claim builder error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
