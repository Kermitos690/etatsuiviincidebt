import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize and truncate strings
const sanitizeString = (str: string | undefined, maxLength: number): string => {
  if (!str) return '';
  return str.substring(0, maxLength).trim();
};

// Email validation regex
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Handle different request types
    if (body.type === 'generate-response') {
      // Validate and sanitize inputs
      const emailSubject = sanitizeString(body.emailSubject, 500);
      const emailSender = sanitizeString(body.emailSender, 255);
      const emailBody = sanitizeString(body.emailBody, 10000);
      const analysis = body.analysis || {};
      
      // Validate sender email format if provided
      if (emailSender && !isValidEmail(emailSender)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email sender format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const systemPrompt = `Tu es un assistant juridique professionnel. Génère une réponse email appropriée et professionnelle.

CONTEXTE:
- Email de: ${emailSender}
- Sujet: ${emailSubject}
- L'analyse IA a identifié: ${analysis.isIncident ? 'un incident potentiel' : 'pas d\'incident'}
${analysis.isIncident ? `- Gravité suggérée: ${sanitizeString(analysis.suggestedGravity, 50)}
- Type: ${sanitizeString(analysis.suggestedType, 50)}
- Résumé: ${sanitizeString(analysis.summary, 500)}` : ''}

RÈGLES:
- Reste professionnel et courtois
- Accuse réception de l'email
- Si c'est un incident: indique que la demande est prise en compte et sera traitée
- Si ce n'est pas un incident: réponds de manière appropriée au contenu
- Ne mentionne PAS l'IA ou l'analyse automatique
- Termine par une formule de politesse
- Garde un ton formel mais humain
- Maximum 150 mots`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Email original:\n\n${emailBody}\n\nGénère une réponse appropriée.` }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Gateway error:', response.status, errorText);
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return new Response(JSON.stringify({ response: content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: analyze incident text
    const text = sanitizeString(body.text, 20000);
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Tu es un auditeur juridique factuel. Analyse le texte fourni et extrait UNIQUEMENT les informations présentes.

RÈGLES STRICTES:
- N'invente JAMAIS d'information
- Si une information n'est pas dans le texte, réponds "Non déterminable"
- Reste factuel et objectif
- Cite les éléments du texte

Retourne un JSON avec:
{
  "constats": ["liste des faits constatés dans le texte"],
  "dysfonctionnements": ["liste des dysfonctionnements identifiés"],
  "graviteSuggere": "Faible|Moyenne|Haute|Critique ou Non déterminable",
  "typeSuggere": "Transparence|Traçabilité|Communication|Représentation|Neutralité|Délais|Accès aux pièces|Autre ou Non déterminable",
  "confiance": 0.0-1.0,
  "resume": "résumé factuel en 2 phrases max"
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in analyze-incident:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      constats: [],
      dysfonctionnements: [],
      graviteSuggere: 'Non déterminable',
      typeSuggere: 'Non déterminable',
      confiance: 0,
      resume: 'Erreur lors de l\'analyse'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
