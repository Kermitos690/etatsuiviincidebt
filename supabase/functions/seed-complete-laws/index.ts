import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LEGAL_DOMAINS } from "./data/domains.ts";
import { VAUD_LAWS } from "./data/vaud-laws.ts";
import { FEDERAL_LAWS } from "./data/federal-laws.ts";
import { VAUD_ARTICLES } from "./data/vaud-articles.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = { domains: 0, laws: 0, articles: 0, errors: [] as string[] };

    // 1. Insert domains
    console.log('Seeding legal domains...');
    for (const domain of LEGAL_DOMAINS) {
      const { error } = await supabase.from('legal_domains').upsert(domain, { onConflict: 'code' });
      if (error) results.errors.push(`Domain ${domain.code}: ${error.message}`);
      else results.domains++;
    }

    // 2. Insert Vaud laws
    console.log('Seeding Vaud cantonal laws...');
    for (const law of VAUD_LAWS) {
      const { error } = await supabase.from('legal_laws').upsert({
        ...law,
        canton: 'VD',
        scope: 'cantonal'
      }, { onConflict: 'code_name,canton' });
      if (error) results.errors.push(`Law ${law.code_name}: ${error.message}`);
      else results.laws++;
    }

    // 3. Insert Federal laws
    console.log('Seeding federal laws...');
    for (const law of FEDERAL_LAWS) {
      const { error } = await supabase.from('legal_laws').upsert({
        ...law,
        canton: 'CH',
        scope: 'federal'
      }, { onConflict: 'code_name,canton' });
      if (error) results.errors.push(`Law ${law.code_name}: ${error.message}`);
      else results.laws++;
    }

    // 4. Insert Vaud articles into legal_references
    console.log('Seeding key articles...');
    for (const article of VAUD_ARTICLES) {
      const { error } = await supabase.from('legal_references').upsert({
        code_name: article.code_name,
        article_number: article.article_number,
        article_text: article.article_text,
        alinea: article.alinea,
        lettre: article.lettre,
        keywords: article.keywords,
        is_key_article: article.is_key_article,
        canton: 'VD',
        scope: 'cantonal',
        is_verified: true
      }, { onConflict: 'code_name,article_number' });
      if (error) results.errors.push(`Article ${article.code_name} ${article.article_number}: ${error.message}`);
      else results.articles++;
    }

    console.log('Seed complete:', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Legal database seeded successfully',
      stats: {
        domains: results.domains,
        vaud_laws: VAUD_LAWS.length,
        federal_laws: FEDERAL_LAWS.length,
        articles: results.articles,
        errors: results.errors.length
      },
      errors: results.errors.slice(0, 10)
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seed error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
