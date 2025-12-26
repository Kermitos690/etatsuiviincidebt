import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pair_id, email_1, email_2 } = await req.json();

    if (!pair_id || !email_1 || !email_2) {
      throw new Error('Missing required parameters: pair_id, email_1, email_2');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Enriching context for pair ${pair_id}`);

    const prompt = `Tu es un expert en analyse juridique suisse spécialisé dans les dysfonctionnements administratifs, particulièrement dans le domaine de la protection de l'adulte (APEA, curatelle, tutelle).

Analyse ces deux emails et détermine s'ils sont liés (corroboration) ou non.

**EMAIL 1:**
De: ${email_1.sender}
À: ${email_1.recipient || 'Non spécifié'}
Sujet: ${email_1.subject}
Date: ${email_1.received_at}
---
${email_1.body?.substring(0, 2000) || 'Corps non disponible'}

**EMAIL 2:**
De: ${email_2.sender}
À: ${email_2.recipient || 'Non spécifié'}
Sujet: ${email_2.subject}
Date: ${email_2.received_at}
---
${email_2.body?.substring(0, 2000) || 'Corps non disponible'}

Réponds en JSON avec cette structure exacte:
{
  "relationship": "corroboration" | "contradiction" | "unrelated",
  "confidence": 0.0 à 1.0,
  "reasoning": "Explication courte de ton analyse",
  "common_themes": ["thème1", "thème2"],
  "common_actors": ["acteur1", "acteur2"],
  "legal_context": {
    "applicable_laws": ["Art. X CC", "Art. Y PA"],
    "potential_violations": ["violation possible 1"],
    "swiss_institutions_involved": ["APEA", "Tribunal"]
  },
  "timeline_connection": "Comment ces emails s'inscrivent dans une chronologie",
  "recommended_action": "suggest_merge" | "keep_separate" | "needs_review"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un assistant juridique suisse expert. Réponds uniquement en JSON valide.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parser la réponse JSON
    let enrichment;
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enrichment = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      enrichment = {
        relationship: 'unrelated',
        confidence: 0.3,
        reasoning: 'Analyse automatique non disponible',
        common_themes: [],
        common_actors: [],
        legal_context: {},
        timeline_connection: '',
        recommended_action: 'needs_review'
      };
    }

    // Mettre à jour la paire avec l'enrichissement
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('swipe_training_pairs')
      .update({
        ai_enrichment: enrichment,
        ai_prediction: enrichment.relationship,
        ai_confidence: enrichment.confidence,
      })
      .eq('id', pair_id);

    if (updateError) {
      console.error('Error updating pair:', updateError);
    }

    console.log(`Enrichment complete for pair ${pair_id}:`, enrichment.relationship, enrichment.confidence);

    return new Response(JSON.stringify({
      success: true,
      enrichment,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-enrich-context:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
