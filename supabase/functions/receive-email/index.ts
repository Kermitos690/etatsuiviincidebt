import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, sender, body, received_at } = await req.json();

    console.log('Received email:', { subject, sender, bodyLength: body?.length });

    if (!subject || !sender || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, sender, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Analyze the email with AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let aiAnalysis = null;
    
    if (LOVABLE_API_KEY) {
      console.log('Analyzing email with AI...');
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `Tu es un auditeur juridique expert. Analyse cet email et identifie s'il contient un incident à signaler.
              
Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "isIncident": boolean,
  "confidence": number (0-100),
  "suggestedTitle": "titre concis de l'incident",
  "suggestedFacts": "description factuelle des faits",
  "suggestedDysfunction": "dysfonctionnement identifié",
  "suggestedInstitution": "institution concernée",
  "suggestedType": "type de dysfonctionnement",
  "suggestedGravity": "Mineur|Modéré|Grave|Critique",
  "summary": "résumé en 2-3 phrases"
}`
            },
            {
              role: 'user',
              content: `Email de: ${sender}
Sujet: ${subject}

Contenu:
${body}`
            }
          ]
        })
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        if (content) {
          try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiAnalysis = JSON.parse(jsonMatch[0]);
              console.log('AI analysis:', aiAnalysis);
            }
          } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
          }
        }
      } else {
        console.error('AI API error:', await aiResponse.text());
      }
    }

    // Store the email
    const { data: email, error: insertError } = await supabase
      .from('emails')
      .insert({
        subject,
        sender,
        body,
        received_at: received_at || new Date().toISOString(),
        processed: !!aiAnalysis,
        ai_analysis: aiAnalysis
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Email stored successfully:', email.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: email.id,
        hasAnalysis: !!aiAnalysis,
        isIncident: aiAnalysis?.isIncident || false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing email:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
