import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionRequest {
  email_id: string;
  subject: string;
  body: string;
  from: string;
  date: string;
}

interface LegalMention {
  match_type: 'exact_citation' | 'alias' | 'keyword' | 'domain_inference';
  match_text: string;
  match_position: number;
  confidence: number;
  instrument_uid?: string;
  cite_key?: string;
  resolved: boolean;
  candidates: Array<{ instrument_uid: string; title: string; score: number }>;
}

// Swiss legal citation patterns
const CITATION_PATTERNS = [
  // Art. 17 LEO, art. 17 de la LEO
  { pattern: /\b(?:art(?:icle)?\.?\s*)(\d+[a-z]?(?:\s*(?:bis|ter|quater))?)\s+(?:de\s+la\s+)?([A-Z]{2,10})\b/gi, type: 'exact_citation' as const },
  // LEO art. 17
  { pattern: /\b([A-Z]{2,10})\s+(?:art(?:icle)?\.?\s*)(\d+[a-z]?(?:\s*(?:bis|ter|quater))?)\b/gi, type: 'exact_citation' as const },
  // art. 17 al. 2 let. a
  { pattern: /\b(?:art(?:icle)?\.?\s*)(\d+[a-z]?)\s+(?:al(?:inéa)?\.?\s*)(\d+)(?:\s+(?:let(?:tre)?\.?\s*)([a-z]))?\b/gi, type: 'exact_citation' as const },
  // §17, § 17
  { pattern: /§\s*(\d+[a-z]?)/gi, type: 'exact_citation' as const },
  // Loi sur l'enseignement obligatoire
  { pattern: /\b(?:loi|ordonnance|règlement)\s+(?:sur|concernant|relative?s?\s+à)\s+([^,.;]+)/gi, type: 'alias' as const },
  // Code civil, Code pénal, etc.
  { pattern: /\b(Code\s+(?:civil|pénal|des?\s+obligations?|de\s+procédure\s+(?:civile|pénale)))\b/gi, type: 'alias' as const },
];

// Known abbreviation mappings
const ABBREVIATION_MAP: Record<string, string> = {
  'LEO': 'LEO',
  'RLEO': 'RLEO',
  'LPS': 'LPS',
  'LASV': 'LASV',
  'LAJE': 'LAJE',
  'LProMin': 'LProMin',
  'LSP': 'LSP',
  'LPFES': 'LPFES',
  'LATC': 'LATC',
  'RLAT': 'RLAT',
  'RLATC': 'RLATC',
  'LI': 'LI',
  'LICom': 'LICom',
  'LRou': 'LRou',
  'LMTP': 'LMTP',
  'LEAE': 'LEAE',
  'LPers': 'LPers-VD',
  'LC': 'LC',
  'LJPA': 'LJPA',
  'LEP': 'LEP',
  'LPol': 'LPol',
  'LCH': 'LCH',
  'LPrD': 'LPrD',
  'CC': 'CC',
  'CO': 'CO',
  'CPC': 'CPC',
  'CPP': 'CPP',
  'CP': 'CP',
  'Cst': 'Cst-VD',
  'Cst-VD': 'Cst-VD',
  'LAMal': 'LAMal',
  'LAI': 'LAI',
  'LAVS': 'LAVS',
  'LPD': 'LPD',
  'LAVI': 'LAVI',
};

// Domain keywords for inference
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  'formation': ['école', 'élève', 'enseignement', 'scolarité', 'pédagogie', 'éducation', 'classe', 'professeur', 'directeur', 'établissement scolaire'],
  'social': ['aide sociale', 'RI', 'revenu d\'insertion', 'prestations', 'subside', 'allocation', 'PCFam', 'assistance'],
  'sante': ['hôpital', 'médecin', 'patient', 'soins', 'EMS', 'CHUV', 'santé', 'maladie', 'assurance-maladie'],
  'construction': ['permis de construire', 'construction', 'aménagement', 'zone', 'parcelle', 'bâtiment', 'urbanisme'],
  'justice': ['tribunal', 'procédure', 'recours', 'décision', 'délai', 'jugement', 'plainte', 'avocat'],
  'fiscalite': ['impôt', 'taxation', 'déclaration', 'fisc', 'contribuable', 'revenus', 'fortune'],
  'population': ['domicile', 'habitants', 'registre', 'permis', 'séjour', 'étranger'],
  'famille': ['curatelle', 'tutelle', 'protection', 'enfant', 'mineur', 'APEA', 'SPJ'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: DetectionRequest = await req.json();
    const { email_id, subject, body: emailBody, from, date } = body;

    console.log(`Detecting legal mentions in email ${email_id}`);

    const fullText = `${subject}\n\n${emailBody}`;
    const mentions: LegalMention[] = [];

    // 1. Extract exact citations
    for (const { pattern, type } of CITATION_PATTERNS) {
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        let abbreviation = '';
        let articleNum = '';
        let citeKey = '';

        if (type === 'exact_citation') {
          if (match[2] && /^[A-Z]/.test(match[2])) {
            // art. X LAW format
            articleNum = match[1];
            abbreviation = match[2];
          } else if (match[1] && /^[A-Z]/.test(match[1])) {
            // LAW art. X format
            abbreviation = match[1];
            articleNum = match[2];
          } else {
            articleNum = match[1];
          }
          citeKey = articleNum ? `art. ${articleNum}` : '';
        }

        // Normalize abbreviation
        const normalizedAbbr = ABBREVIATION_MAP[abbreviation] || abbreviation;

        // Try to resolve in DB
        let resolved = false;
        let instrumentUid = '';
        const candidates: Array<{ instrument_uid: string; title: string; score: number }> = [];

        if (normalizedAbbr) {
          // Search by abbreviation
          const { data: instruments } = await supabase
            .from('legal_instruments')
            .select('instrument_uid, title, abbreviation')
            .or(`abbreviation.ilike.${normalizedAbbr},instrument_uid.ilike.%${normalizedAbbr}%`)
            .eq('current_status', 'in_force')
            .limit(5);

          if (instruments?.length) {
            resolved = true;
            instrumentUid = instruments[0].instrument_uid;
            instruments.forEach((i, idx) => {
              candidates.push({
                instrument_uid: i.instrument_uid,
                title: i.title,
                score: 1 - (idx * 0.1),
              });
            });
          }
        }

        // Check if we have the specific unit
        let unitId = '';
        if (resolved && citeKey) {
          const { data: units } = await supabase
            .from('legal_units')
            .select('id, cite_key')
            .eq('instrument_id', instrumentUid)
            .ilike('cite_key', `%${citeKey}%`)
            .limit(1);

          if (units?.length) {
            unitId = units[0].id;
          }
        }

        mentions.push({
          match_type: type,
          match_text: match[0],
          match_position: match.index,
          confidence: resolved ? 0.95 : 0.5,
          instrument_uid: instrumentUid || undefined,
          cite_key: citeKey || undefined,
          resolved,
          candidates,
        });
      }
    }

    // 2. Domain inference from keywords
    const detectedDomains: string[] = [];
    const textLower = fullText.toLowerCase();

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      const matchedKeywords = keywords.filter(kw => textLower.includes(kw.toLowerCase()));
      if (matchedKeywords.length >= 2) {
        detectedDomains.push(domain);

        // Add domain inference mention
        mentions.push({
          match_type: 'domain_inference',
          match_text: `Domaine détecté: ${domain} (${matchedKeywords.join(', ')})`,
          match_position: 0,
          confidence: Math.min(0.3 + (matchedKeywords.length * 0.1), 0.7),
          resolved: false,
          candidates: [],
        });
      }
    }

    // 3. Search for relevant instruments by domain
    if (detectedDomains.length > 0) {
      const { data: domainInstruments } = await supabase
        .from('legal_instruments')
        .select('instrument_uid, title, abbreviation, domain_tags')
        .overlaps('domain_tags', detectedDomains)
        .eq('current_status', 'in_force')
        .limit(10);

      if (domainInstruments?.length) {
        for (const instr of domainInstruments) {
          // Check if not already mentioned
          const alreadyMentioned = mentions.some(m => m.instrument_uid === instr.instrument_uid);
          if (!alreadyMentioned) {
            mentions.push({
              match_type: 'domain_inference',
              match_text: `Loi potentiellement applicable: ${instr.abbreviation || instr.instrument_uid}`,
              match_position: 0,
              confidence: 0.4,
              instrument_uid: instr.instrument_uid,
              resolved: true,
              candidates: [{
                instrument_uid: instr.instrument_uid,
                title: instr.title,
                score: 0.4,
              }],
            });
          }
        }
      }
    }

    // 4. Store mentions in DB
    const { data: user } = await supabase
      .from('emails')
      .select('user_id')
      .eq('id', email_id)
      .single();

    for (const mention of mentions) {
      // Get instrument_id if we have uid
      let instrumentId = null;
      if (mention.instrument_uid) {
        const { data: instr } = await supabase
          .from('legal_instruments')
          .select('id')
          .eq('instrument_uid', mention.instrument_uid)
          .single();
        instrumentId = instr?.id;
      }

      await supabase.from('email_legal_mentions').insert({
        email_id,
        user_id: user?.user_id,
        match_type: mention.match_type,
        match_text: mention.match_text,
        match_position: mention.match_position,
        confidence: mention.confidence,
        instrument_id: instrumentId,
        resolved: mention.resolved,
        resolution_method: mention.resolved ? 'db_lookup' : null,
        candidate_instruments: mention.candidates,
      });
    }

    // 5. Summary
    const exactCitations = mentions.filter(m => m.match_type === 'exact_citation');
    const resolvedCount = mentions.filter(m => m.resolved).length;
    const unresolvedExact = exactCitations.filter(m => !m.resolved);

    return new Response(JSON.stringify({
      success: true,
      email_id,
      summary: {
        total_mentions: mentions.length,
        exact_citations: exactCitations.length,
        resolved: resolvedCount,
        unresolved: mentions.length - resolvedCount,
        detected_domains: detectedDomains,
      },
      mentions,
      warnings: unresolvedExact.length > 0 ? [
        `${unresolvedExact.length} citation(s) exacte(s) non résolue(s) en DB`,
      ] : [],
      // Rule: No AI call before DB resolution
      ai_call_allowed: false,
      db_first_enforced: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Detection error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
