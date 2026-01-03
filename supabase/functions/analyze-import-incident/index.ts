import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders, log } from "../_shared/core.ts";
import { verifyAuth, unauthorizedResponse, createServiceClient } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Authentication required');
    }

    const { content } = await req.json();

    if (!content || content.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: 'Contenu insuffisant pour analyse (minimum 50 caractères)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Récupérer les incidents existants pour détecter les liens - use authenticated user
    const { data } = await supabase
      .from('incidents')
      .select('id, numero, titre, faits, dysfonctionnement, institution, type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const existingIncidents = data || [];

    // Appeler l'IA pour analyser le contenu
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configuré');
    }

    const systemPrompt = `Tu es un expert en analyse juridique et détection de dysfonctionnements administratifs suisses.
Tu dois analyser le contenu fourni (texte d'emails, échanges, documents) et:

1. IDENTIFIER les faits clés et problèmes potentiels
2. DÉTECTER les engagements/promesses faites
3. ÉVALUER si le contenu révèle un dysfonctionnement administratif justifiant un incident
4. CHERCHER des liens avec les incidents existants (par mots-clés, institution, type)

Tu travailles dans le contexte du droit suisse (Protection de l'adulte, LPGA, LPC, etc).

Incidents existants pour comparaison:
${existingIncidents.slice(0, 20).map(i => `#${i.numero}: ${i.titre} (${i.institution}, ${i.type})`).join('\n')}

Réponds en JSON avec cette structure exacte:
{
  "summary": "Résumé en 2-3 phrases",
  "keyFacts": ["Fait 1", "Fait 2", ...],
  "potentialIssues": ["Problème 1", "Problème 2", ...],
  "promises": ["Engagement 1", ...],
  "severity": "critique|haute|moyenne|faible",
  "incidentRecommendation": {
    "shouldCreate": true/false,
    "titre": "Titre de l'incident suggéré",
    "type": "Délai non respecté|Non-réponse|Décision contestable|Procédure non suivie|Autre",
    "gravite": "Critique|Haute|Moyenne|Faible",
    "faits": "Description factuelle détaillée",
    "dysfonctionnement": "Nature du dysfonctionnement",
    "institution": "Nom de l'institution concernée"
  },
  "relatedIncidents": [
    {"id": "uuid", "numero": 1, "titre": "...", "similarity": 0.8}
  ]
}

Si aucun dysfonctionnement n'est détecté, mets shouldCreate à false.`;

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
          { role: 'user', content: `Analyse ce contenu:\n\n${content.substring(0, 15000)}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices?.[0]?.message?.content || '';

    // Parser la réponse JSON
    let analysis;
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Response:', aiResponse);
      // Réponse par défaut si parsing échoue
      analysis = {
        summary: 'Analyse du contenu importé',
        keyFacts: [],
        potentialIssues: [],
        promises: [],
        severity: 'faible',
        incidentRecommendation: null,
        relatedIncidents: [],
      };
    }

    // Enrichir les incidents liés avec les vraies données
    if (analysis.relatedIncidents && analysis.relatedIncidents.length > 0) {
      analysis.relatedIncidents = analysis.relatedIncidents
        .filter((r: any) => existingIncidents.some(e => e.numero === r.numero))
        .map((r: any) => {
          const existing = existingIncidents.find(e => e.numero === r.numero);
          return existing ? { ...r, id: existing.id } : r;
        })
        .slice(0, 5);
    }

    console.log('Analysis complete for import-incident');

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-import-incident:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'analyse';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
