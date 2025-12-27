import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const WEBHOOK_SECRET = Deno.env.get('RECEIVE_EMAIL_WEBHOOK_SECRET');

// Email validation regex
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Sanitize and truncate strings
const sanitizeString = (str: string | undefined, maxLength: number): string => {
  if (!str) return '';
  return str.substring(0, maxLength).trim();
};

// Verify webhook secret
const verifyWebhookAuth = (req: Request): boolean => {
  if (!WEBHOOK_SECRET) {
    console.warn('[Auth] RECEIVE_EMAIL_WEBHOOK_SECRET not configured - rejecting request');
    return false;
  }
  
  const providedSecret = req.headers.get('x-webhook-secret');
  if (!providedSecret) {
    console.log('[Auth] Missing x-webhook-secret header');
    return false;
  }
  
  // Timing-safe comparison
  if (providedSecret.length !== WEBHOOK_SECRET.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < providedSecret.length; i++) {
    result |= providedSecret.charCodeAt(i) ^ WEBHOOK_SECRET.charCodeAt(i);
  }
  
  return result === 0;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify webhook authentication
  if (!verifyWebhookAuth(req)) {
    console.error('[Auth] Webhook authentication failed');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - invalid or missing webhook secret' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    
    // Extract and validate inputs
    const subject = sanitizeString(body.subject, 500);
    const sender = sanitizeString(body.sender, 255);
    const emailBody = sanitizeString(body.body, 50000);
    const received_at = body.received_at;
    const autoProcess = body.autoProcess !== false;
    const confidenceThreshold = typeof body.confidenceThreshold === 'number' 
      ? Math.min(100, Math.max(0, body.confidenceThreshold)) 
      : 70;

    console.log('Received email:', { subject: subject.substring(0, 50), sender, bodyLength: emailBody?.length });

    // Validate required fields
    if (!subject || !sender || !emailBody) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, sender, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate sender email format
    if (!isValidEmail(sender)) {
      return new Response(
        JSON.stringify({ error: 'Invalid sender email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Analyze the email with AI
    let aiAnalysis = null;
    
    if (LOVABLE_API_KEY) {
      console.log('Analyzing email with AI...');
      
      // Limit content sent to AI to prevent token exhaustion
      const truncatedBody = emailBody.substring(0, 10000);
      
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
              content: `Email de: ${sender}\nSujet: ${subject}\n\nContenu:\n${truncatedBody}`
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
              console.log('AI analysis:', { isIncident: aiAnalysis.isIncident, confidence: aiAnalysis.confidence });
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
        body: emailBody,
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

      // Sanitize AI suggestions before inserting
      const { data: incident, error: incError } = await supabase
        .from('incidents')
        .insert({
          titre: sanitizeString(aiAnalysis.suggestedTitle || subject, 500),
          faits: sanitizeString(aiAnalysis.suggestedFacts || emailBody, 5000),
          dysfonctionnement: sanitizeString(aiAnalysis.suggestedDysfunction || 'À compléter', 1000),
          institution: sanitizeString(aiAnalysis.suggestedInstitution || 'Non identifiée', 255),
          type: sanitizeString(aiAnalysis.suggestedType || 'Autre', 50),
          gravite: sanitizeString(aiAnalysis.suggestedGravity || 'Modéré', 20),
          priorite: aiAnalysis.suggestedGravity === 'Critique' ? 'critique' : 
                   aiAnalysis.suggestedGravity === 'Grave' ? 'haute' : 'normale',
          date_incident: new Date().toISOString().split('T')[0],
          email_source_id: email.id,
          confidence_level: `${Math.round(aiAnalysis.confidence)}%`,
          score: Math.round(aiAnalysis.confidence),
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
