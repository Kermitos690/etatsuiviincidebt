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
    const { emailId, autoCreate = true, confidenceThreshold = 70 } = await req.json();

    if (!emailId) {
      return new Response(JSON.stringify({ error: 'emailId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the email
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (emailError || !email) {
      return new Response(JSON.stringify({ error: 'Email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If already processed, return existing analysis
    if (email.processed && email.ai_analysis) {
      return new Response(JSON.stringify({ 
        success: true, 
        analysis: email.ai_analysis,
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call AI to analyze the email
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `Tu es un expert juridique suisse spécialisé dans l'analyse des emails liés à la curatelle. 
Analyse cet email et détermine s'il contient un incident administratif à signaler.

Retourne un JSON avec:
{
  "isIncident": boolean,
  "confidence": number (0-100),
  "suggestedTitle": "titre court de l'incident",
  "suggestedFacts": "description factuelle",
  "suggestedDysfunction": "dysfonctionnement identifié",
  "suggestedInstitution": "institution concernée",
  "suggestedType": "type d'incident",
  "suggestedGravity": "Mineur|Modéré|Grave|Critique",
  "summary": "résumé court"
}`;

    const userMessage = `Email de: ${email.sender}
Sujet: ${email.subject}
Date: ${email.received_at}
Contenu:
${email.body?.slice(0, 4000) || 'Corps vide'}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    // Parse AI response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { isIncident: false, confidence: 0 };
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      analysis = { isIncident: false, confidence: 0, summary: 'Analyse impossible' };
    }

    // Update email with analysis
    const { error: updateError } = await supabase
      .from('emails')
      .update({
        ai_analysis: analysis,
        processed: true
      })
      .eq('id', emailId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // Auto-create incident if conditions are met
    let incidentCreated = false;
    let incident = null;

    if (autoCreate && analysis.isIncident && analysis.confidence >= confidenceThreshold) {
      // Get next incident number
      const { data: lastIncident } = await supabase
        .from('incidents')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1)
        .single();

      const nextNumero = (lastIncident?.numero || 0) + 1;

      const { data: newIncident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          numero: nextNumero,
          date_incident: new Date().toISOString().split('T')[0],
          institution: analysis.suggestedInstitution || 'Non spécifié',
          type: analysis.suggestedType || 'Communication',
          gravite: analysis.suggestedGravity || 'Modéré',
          statut: 'Ouvert',
          titre: analysis.suggestedTitle || email.subject,
          faits: analysis.suggestedFacts || '',
          dysfonctionnement: analysis.suggestedDysfunction || '',
          score: Math.round(analysis.confidence / 10),
          priorite: analysis.suggestedGravity === 'Critique' ? 'critique' : 
                   analysis.suggestedGravity === 'Grave' ? 'eleve' : 'moyen',
          email_source_id: emailId,
          user_id: email.user_id
        })
        .select()
        .single();

      if (!incidentError && newIncident) {
        incidentCreated = true;
        incident = newIncident;

        // Link email to incident
        await supabase
          .from('emails')
          .update({ incident_id: newIncident.id })
          .eq('id', emailId);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      incidentCreated,
      incident
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
