import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, sender, body, received_at, autoProcess = true, confidenceThreshold = 70 } = await req.json();

    console.log('Received email:', { subject, sender, bodyLength: body?.length });

    if (!subject || !sender || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, sender, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Analyze the email with AI
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
              content: `Tu es un auditeur juridique expert en conformité et protection de l'adulte en Suisse.
              
Analyse cet email et identifie s'il contient un incident à signaler (non-respect des délais, erreur administrative, manquement, dysfonctionnement, comportement inapproprié).

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "isIncident": boolean,
  "confidence": number (0-100),
  "suggestedTitle": "titre concis de l'incident",
  "suggestedFacts": "description factuelle des faits",
  "suggestedDysfunction": "dysfonctionnement identifié",
  "suggestedInstitution": "institution concernée",
  "suggestedType": "Délai|Procédure|Communication|Comportement|Administratif|Financier|Autre",
  "suggestedGravity": "Mineur|Modéré|Grave|Critique",
  "summary": "résumé en 2-3 phrases",
  "justification": "pourquoi c'est ou n'est pas un incident"
}`
            },
            {
              role: 'user',
              content: `Email de: ${sender}\nSujet: ${subject}\n\nContenu:\n${body}`
            }
          ]
        })
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        if (content) {
          try {
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

    let createdIncident = null;

    // Auto-create incident if enabled and criteria met
    if (autoProcess && aiAnalysis?.isIncident && aiAnalysis.confidence >= confidenceThreshold) {
      console.log(`Auto-creating incident (confidence: ${aiAnalysis.confidence}%)`);

      const { data: incident, error: incError } = await supabase
        .from('incidents')
        .insert({
          titre: aiAnalysis.suggestedTitle || subject,
          faits: aiAnalysis.suggestedFacts || body.substring(0, 1000),
          dysfonctionnement: aiAnalysis.suggestedDysfunction || 'À compléter',
          institution: aiAnalysis.suggestedInstitution || 'Non identifiée',
          type: aiAnalysis.suggestedType || 'Autre',
          gravite: aiAnalysis.suggestedGravity || 'Modéré',
          priorite: aiAnalysis.suggestedGravity === 'Critique' ? 'critique' : 
                   aiAnalysis.suggestedGravity === 'Grave' ? 'haute' : 'normale',
          date_incident: new Date().toISOString().split('T')[0],
          email_source_id: email.id,
          confidence_level: `${aiAnalysis.confidence}%`,
          score: aiAnalysis.confidence,
        })
        .select()
        .single();

      if (incError) {
        console.error('Failed to create incident:', incError);
      } else {
        createdIncident = incident;
        console.log('Incident auto-created:', incident.numero);

        // Link email to incident
        await supabase
          .from('emails')
          .update({ incident_id: incident.id })
          .eq('id', email.id);

        // Sync to Google Sheets if configured
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/sheets-sync`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'sync-incident', incidentId: incident.id }),
          });
          console.log('Incident synced to Google Sheets');
        } catch (sheetError) {
          console.error('Sheets sync failed:', sheetError);
        }

        // Send notification if critical
        if (aiAnalysis.suggestedGravity === 'Critique' || aiAnalysis.suggestedGravity === 'Grave') {
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/notify-critical`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ incidentId: incident.id }),
            });
            console.log('Critical notification sent');
          } catch (notifyError) {
            console.error('Notification failed:', notifyError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: email.id,
        hasAnalysis: !!aiAnalysis,
        isIncident: aiAnalysis?.isIncident || false,
        incidentCreated: !!createdIncident,
        incidentId: createdIncident?.id,
        incidentNumero: createdIncident?.numero
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing email:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
