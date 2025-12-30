import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const ANALYSIS_PROMPT = `Tu es un AUDITEUR JURIDIQUE spécialisé dans les dossiers de protection de l'adulte en Suisse.

Tu analyses un ÉVÉNEMENT soumis manuellement par un pupille sous curatelle.

CONTEXTE:
- Le pupille documente lui-même les faits qu'il observe
- Ces événements peuvent provenir de conversations, documents, captures d'écran
- L'objectif est de constituer un dossier factuel pour la Justice de Paix

RÈGLES ABSOLUES:
1. FACTUEL UNIQUEMENT - Extrais les faits vérifiables
2. ZÉRO SUPPOSITION - Si ce n'est pas explicite, ne l'affirme pas
3. CITATIONS EXACTES - Cite les passages importants entre guillemets
4. DÉTECTION DE PROBLÈMES - Identifie les dysfonctionnements potentiels

VIOLATIONS À DÉTECTER:
- Manquements aux devoirs du curateur (Art. 406-407 CC)
- Violations du droit d'être entendu (Art. 419 CC)
- Décisions sans consultation (Art. 404-405 CC)
- Délais excessifs (Art. 29 Cst.)
- Communications non autorisées (LPD)

PROMESSES ET ENGAGEMENTS:
- Identifie toute promesse ou engagement mentionné
- Note les dates promises
- Évalue si des engagements antérieurs semblent non tenus

FORMAT JSON:
{
  "summary": "Résumé factuel de l'événement (max 200 mots)",
  "key_facts": ["Liste des faits clés extraits"],
  "actors_mentioned": [
    {
      "name": "Nom",
      "role": "Rôle si mentionné",
      "actions": ["Actions attribuées à cette personne"]
    }
  ],
  "dates_mentioned": ["YYYY-MM-DD ou description"],
  "promises_or_commitments": [
    {
      "content": "Ce qui a été promis/engagé",
      "by_whom": "Par qui",
      "deadline": "Date limite si mentionnée",
      "status": "tenu/brisé/en_attente/inconnu"
    }
  ],
  "potential_issues": [
    {
      "type": "délai/refus/non-réponse/violation_droits/collaboration/confidentialité",
      "description": "Description du problème",
      "severity": "critique/élevée/moyenne/faible",
      "citation": "Citation exacte si disponible",
      "legal_basis": "Article de loi potentiellement violé"
    }
  ],
  "documents_referenced": ["Documents mentionnés (lettre TC, décision, etc.)"],
  "contradictions_with_previous": [
    {
      "current_statement": "Ce qui est dit maintenant",
      "contradicts": "Ce que cela contredit potentiellement"
    }
  ],
  "is_incident_worthy": boolean,
  "incident_recommendation": {
    "should_create": boolean,
    "suggested_title": "Titre suggéré si pertinent",
    "suggested_type": "Type d'incident",
    "suggested_gravity": "faible/moyenne/élevée/critique",
    "justification": "Pourquoi créer un incident"
  },
  "confidence": "High/Medium/Low",
  "probative_citations": [
    {
      "text": "Citation exacte probante",
      "relevance": "Pourquoi cette citation est importante"
    }
  ]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Non autorisé');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { eventId, content, title, eventDate, sourceType } = await req.json();

    if (!content && !eventId) {
      return new Response(JSON.stringify({ error: 'Contenu ou ID d\'événement requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let eventContent = content;
    let eventTitle = title;

    // Si eventId fourni, récupérer l'événement
    if (eventId) {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('user_id', user.id)
        .single();

      if (error || !event) {
        return new Response(JSON.stringify({ error: 'Événement non trouvé' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      eventContent = event.content || event.extracted_text || '';
      eventTitle = event.title;
    }

    if (!eventContent || eventContent.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Contenu insuffisant pour analyse' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer le contexte existant (événements et incidents précédents)
    const { data: previousEvents } = await supabase
      .from('events')
      .select('title, content, ai_analysis, event_date')
      .eq('user_id', user.id)
      .eq('is_analyzed', true)
      .order('event_date', { ascending: false })
      .limit(5);

    const { data: recentIncidents } = await supabase
      .from('incidents')
      .select('titre, faits, dysfonctionnement, institution')
      .eq('user_id', user.id)
      .order('date_incident', { ascending: false })
      .limit(5);

    let contextInfo = '';
    if (previousEvents && previousEvents.length > 0) {
      contextInfo += '\n\nCONTEXTE - ÉVÉNEMENTS PRÉCÉDENTS:\n';
      previousEvents.forEach(e => {
        const analysis = e.ai_analysis as any;
        if (analysis?.promises_or_commitments) {
          contextInfo += `- ${e.title}: ${JSON.stringify(analysis.promises_or_commitments)}\n`;
        }
      });
    }
    if (recentIncidents && recentIncidents.length > 0) {
      contextInfo += '\n\nINCIDENTS RÉCENTS:\n';
      recentIncidents.forEach(i => {
        contextInfo += `- ${i.titre} (${i.institution}): ${i.dysfonctionnement}\n`;
      });
    }

    const userPrompt = `Analyse cet événement documenté par le pupille.

TITRE: ${eventTitle || 'Non spécifié'}
DATE: ${eventDate || 'Non spécifiée'}
TYPE DE SOURCE: ${sourceType || 'Texte manuel'}

CONTENU:
${eventContent}
${contextInfo}

Réponds UNIQUEMENT en JSON valide.`;

    console.log(`Analyzing event for user ${user.email}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez plus tard' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erreur d\'analyse IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      return new Response(JSON.stringify({ error: 'Pas de réponse de l\'IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse AI response:', aiContent.substring(0, 500));
      return new Response(JSON.stringify({ error: 'Réponse IA invalide' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Si eventId, mettre à jour l'événement
    if (eventId) {
      await supabase
        .from('events')
        .update({
          ai_analysis: analysis,
          is_analyzed: true,
          analysis_date: new Date().toISOString(),
        })
        .eq('id', eventId);
    }

    // Si l'analyse recommande un incident, on peut le créer automatiquement
    let createdIncident = null;
    if (analysis.incident_recommendation?.should_create) {
      const rec = analysis.incident_recommendation;
      
      // Générer le prochain numéro d'incident
      const { data: lastIncident } = await supabase
        .from('incidents')
        .select('numero')
        .eq('user_id', user.id)
        .order('numero', { ascending: false })
        .limit(1)
        .single();

      const nextNumero = (lastIncident?.numero || 0) + 1;

      const gravityMap: Record<string, string> = {
        'critique': 'critique',
        'élevée': 'élevée',
        'moyenne': 'moyenne',
        'faible': 'faible',
      };

      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          user_id: user.id,
          numero: nextNumero,
          titre: rec.suggested_title || eventTitle || 'Événement analysé',
          faits: analysis.key_facts?.join('\n') || analysis.summary,
          dysfonctionnement: analysis.potential_issues?.map((i: any) => i.description).join('; ') || 'Dysfonctionnement détecté',
          institution: analysis.actors_mentioned?.[0]?.role || 'Non spécifiée',
          type: rec.suggested_type || 'incident',
          gravite: gravityMap[rec.suggested_gravity] || 'moyenne',
          date_incident: eventDate || new Date().toISOString(),
          statut: 'nouveau',
          score: analysis.potential_issues?.length * 20 || 50,
          priorite: rec.suggested_gravity === 'critique' ? 'urgente' : rec.suggested_gravity === 'élevée' ? 'haute' : 'normale',
          preuves: analysis.probative_citations?.map((c: any) => ({
            type: 'citation',
            label: c.relevance,
            url: '',
            content: c.text
          })) || [],
        })
        .select()
        .single();

      if (!incidentError && incident) {
        createdIncident = incident;
        
        // Lier l'événement à l'incident
        if (eventId) {
          await supabase
            .from('events')
            .update({ incident_id: incident.id })
            .eq('id', eventId);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      createdIncident,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Event analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
