import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  claim_ids?: string[];
  email_id?: string;
  incident_id?: string;
}

interface Claim {
  id: string;
  claim_text: string;
  unit_ids: string[];
  expected_citations: Array<{ cite_key: string; instrument_uid: string }>;
}

interface VerificationResult {
  claim_id: string;
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;
  evidence_urls: string[];
  diff_summary?: string;
  severity: 'info' | 'warning' | 'error';
}

// GOLDEN RULE: Perplexity only AUDITS, never creates truth
const VERIFICATION_PROMPT = `Tu es un vérificateur juridique suisse. Tu dois UNIQUEMENT valider ou invalider des affirmations juridiques.

RÈGLES STRICTES:
1. Tu NE PEUX PAS inventer de nouvelles bases légales
2. Tu dois vérifier l'exactitude des articles cités par rapport aux sources officielles
3. Si tu trouves une divergence, tu dois la signaler avec preuve (URL officielle)
4. Si tu ne peux pas vérifier, verdict = "uncertain" (JAMAIS inventer)

Sources officielles UNIQUEMENT:
- fedlex.admin.ch (droit fédéral)
- rsv.vd.ch (droit vaudois)
- admin.ch (administration fédérale)
- vd.ch (canton de Vaud)

Format de réponse JSON:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": 0.0-1.0,
  "evidence_urls": ["url1", "url2"],
  "verification_notes": "explication courte",
  "diff_found": null | { "claimed": "...", "official": "...", "source": "url" }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!perplexityKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const body: VerificationRequest = await req.json();
    const { claim_ids, email_id, incident_id } = body;

    console.log('Starting verification audit');

    // Get claims to verify
    let claimsQuery = supabase
      .from('verification_claims')
      .select('*')
      .eq('status', 'pending');

    if (claim_ids?.length) {
      claimsQuery = claimsQuery.in('id', claim_ids);
    } else if (email_id) {
      claimsQuery = claimsQuery.eq('email_id', email_id);
    } else if (incident_id) {
      claimsQuery = claimsQuery.eq('incident_id', incident_id);
    }

    const { data: claims, error: claimsError } = await claimsQuery.limit(10);
    if (claimsError) throw claimsError;

    if (!claims?.length) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending claims to verify',
        verified: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Verifying ${claims.length} claims`);

    const results: VerificationResult[] = [];

    for (const claim of claims) {
      try {
        // Get DB content for comparison
        let dbContext = '';
        let dbHashes: string[] = [];
        let sourceUrls: string[] = [];

        if (claim.unit_ids?.length) {
          const { data: units } = await supabase
            .from('legal_units')
            .select(`
              cite_key, content_text, hash_sha256,
              legal_versions!inner(
                legal_sources(source_url, is_primary)
              )
            `)
            .in('id', claim.unit_ids);

          if (units?.length) {
            dbContext = units.map(u => `[${u.cite_key}]: ${u.content_text.substring(0, 500)}`).join('\n\n');
            dbHashes = units.map(u => u.hash_sha256);
            
            // Extract source URLs
            for (const unit of units) {
              const sources = (unit as unknown as { legal_versions: { legal_sources: Array<{ source_url: string; is_primary: boolean }> } }).legal_versions?.legal_sources;
              if (sources) {
                sourceUrls.push(...sources.filter(s => s.is_primary).map(s => s.source_url));
              }
            }
          }
        }

        // Build verification prompt
        const verificationQuery = `
AFFIRMATION À VÉRIFIER:
"${claim.claim_text}"

CONTENU DB (source de vérité interne):
${dbContext || 'Aucun contenu DB disponible'}

HASHES INTÉGRITÉ: ${dbHashes.join(', ') || 'N/A'}

TÂCHE:
1. Vérifie que l'affirmation correspond au contenu DB
2. Vérifie sur les sources officielles suisses que le contenu DB est exact
3. Signale toute divergence avec preuve URL

Réponds UNIQUEMENT en JSON valide.`;

        // Call Perplexity
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { role: 'system', content: VERIFICATION_PROMPT },
              { role: 'user', content: verificationQuery },
            ],
            search_domain_filter: [
              'fedlex.admin.ch',
              'rsv.vd.ch',
              'admin.ch',
              'vd.ch',
              'bger.ch',
            ],
            temperature: 0.1,
          }),
        });

        if (!perplexityResponse.ok) {
          throw new Error(`Perplexity error: ${perplexityResponse.status}`);
        }

        const perplexityData = await perplexityResponse.json();
        const content = perplexityData.choices?.[0]?.message?.content || '';
        const citations = perplexityData.citations || [];

        // Parse response
        let parsed: {
          verdict: string;
          confidence: number;
          evidence_urls?: string[];
          verification_notes?: string;
          diff_found?: { claimed: string; official: string; source: string } | null;
        };
        
        try {
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { verdict: 'uncertain', confidence: 0.3 };
        } catch {
          console.warn('Failed to parse Perplexity response, treating as uncertain');
          parsed = { verdict: 'uncertain', confidence: 0.3 };
        }

        // Combine evidence URLs
        const allEvidenceUrls = [
          ...sourceUrls,
          ...(parsed.evidence_urls || []),
          ...citations,
        ].filter(Boolean);

        // Determine severity
        let severity: 'info' | 'warning' | 'error' = 'info';
        if (parsed.verdict === 'false') {
          severity = 'error';
        } else if (parsed.verdict === 'uncertain') {
          severity = 'warning';
        }

        const result: VerificationResult = {
          claim_id: claim.id,
          verdict: parsed.verdict as 'true' | 'false' | 'uncertain',
          confidence: parsed.confidence || 0.5,
          evidence_urls: allEvidenceUrls,
          diff_summary: parsed.diff_found 
            ? `Divergence: "${parsed.diff_found.claimed}" vs "${parsed.diff_found.official}" (${parsed.diff_found.source})`
            : undefined,
          severity,
        };

        results.push(result);

        // Store verification report
        await supabase.from('verification_reports').insert({
          claim_id: claim.id,
          user_id: claim.user_id,
          verdict: result.verdict,
          confidence: result.confidence,
          evidence_urls: result.evidence_urls,
          diff_summary: result.diff_summary,
          severity: result.severity,
          perplexity_response: perplexityData,
        });

        // Update claim status
        await supabase
          .from('verification_claims')
          .update({ status: 'verified' })
          .eq('id', claim.id);

        // CRITICAL: If verdict is FALSE, block the claim
        if (result.verdict === 'false') {
          console.warn(`BLOCKING claim ${claim.id}: verification failed`);
          
          // Create alert
          await supabase.from('audit_alerts').insert({
            user_id: claim.user_id,
            alert_type: 'verification_failed',
            severity: 'critical',
            title: 'Incohérence juridique détectée',
            description: `Affirmation: "${claim.claim_text.substring(0, 100)}..." - ${result.diff_summary || 'Contenu non vérifié'}`,
            related_email_id: claim.email_id,
            related_incident_id: claim.incident_id,
          });
        }

      } catch (claimError: unknown) {
        console.error(`Error verifying claim ${claim.id}:`, claimError);
        
        // Mark as failed but don't throw
        results.push({
          claim_id: claim.id,
          verdict: 'uncertain',
          confidence: 0,
          evidence_urls: [],
          diff_summary: `Verification error: ${claimError instanceof Error ? claimError.message : 'Unknown'}`,
          severity: 'warning',
        });
      }
    }

    // Summary
    const verdictCounts = results.reduce((acc, r) => {
      acc[r.verdict] = (acc[r.verdict] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return new Response(JSON.stringify({
      success: true,
      verified: results.length,
      summary: {
        true: verdictCounts['true'] || 0,
        false: verdictCounts['false'] || 0,
        uncertain: verdictCounts['uncertain'] || 0,
      },
      results,
      // Enforce the golden rule
      rule_enforced: 'PERPLEXITY_AUDIT_ONLY',
      new_laws_discovered: 0, // Perplexity cannot add new laws directly
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Verification error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
