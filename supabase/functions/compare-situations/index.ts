import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { folderId1, folderId2 } = await req.json();

    if (!folderId1 || !folderId2) {
      return new Response(JSON.stringify({ error: 'Two folder IDs required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Comparing situations: ${folderId1} vs ${folderId2}`);

    // Get both folders with their analyses
    const [folder1Result, folder2Result] = await Promise.all([
      supabase
        .from('pdf_folders')
        .select('*, situation_analyses(*), pdf_documents(*)')
        .eq('id', folderId1)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('pdf_folders')
        .select('*, situation_analyses(*), pdf_documents(*)')
        .eq('id', folderId2)
        .eq('user_id', userId)
        .single()
    ]);

    if (folder1Result.error || folder2Result.error) {
      return new Response(JSON.stringify({ 
        error: 'Folder not found',
        details: folder1Result.error?.message || folder2Result.error?.message
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const folder1 = folder1Result.data;
    const folder2 = folder2Result.data;

    // Extract participants from both situations
    const participants1 = folder1.participants as any[] || [];
    const participants2 = folder2.participants as any[] || [];

    // Find shared actors
    const sharedActors: any[] = [];
    for (const p1 of participants1) {
      const match = participants2.find(
        p2 => 
          (p1.email && p2.email && p1.email.toLowerCase() === p2.email.toLowerCase()) ||
          (p1.name && p2.name && p1.name.toLowerCase() === p2.name.toLowerCase())
      );
      if (match) {
        sharedActors.push({
          name: p1.name || match.name,
          email: p1.email || match.email,
          roles: {
            situation1: p1.role,
            situation2: match.role
          }
        });
      }
    }

    // Compare violations
    const violations1 = folder1.violations_detected as any[] || [];
    const violations2 = folder2.violations_detected as any[] || [];

    const sharedPatterns: any[] = [];
    for (const v1 of violations1) {
      const similar = violations2.find(
        v2 => v1.type === v2.type || v1.legal_ref === v2.legal_ref
      );
      if (similar) {
        sharedPatterns.push({
          type: v1.type,
          legal_ref: v1.legal_ref,
          in_situation_1: v1,
          in_situation_2: similar
        });
      }
    }

    // Detect contradictions between situations
    const contradictions: any[] = [];
    
    // Check for contradicting statements about same actors
    for (const actor of sharedActors) {
      const role1 = actor.roles.situation1?.toLowerCase() || '';
      const role2 = actor.roles.situation2?.toLowerCase() || '';
      
      if (role1 && role2 && role1 !== role2) {
        // Different roles for same person
        if (
          (role1.includes('aidant') && role2.includes('opposant')) ||
          (role1.includes('opposant') && role2.includes('aidant'))
        ) {
          contradictions.push({
            type: 'role_contradiction',
            actor: actor.name,
            description: `Rôle contradictoire: "${role1}" dans situation 1 vs "${role2}" dans situation 2`,
            severity: 'high'
          });
        }
      }
    }

    // Calculate similarity score
    const actorSimilarity = sharedActors.length / Math.max(participants1.length, participants2.length, 1);
    const patternSimilarity = sharedPatterns.length / Math.max(violations1.length, violations2.length, 1);
    const similarityScore = (actorSimilarity * 0.5 + patternSimilarity * 0.5) * 100;

    // Risk assessment
    let riskAssessment = 'low';
    if (sharedPatterns.length >= 3 || contradictions.length >= 2) {
      riskAssessment = 'high';
    } else if (sharedPatterns.length >= 1 || sharedActors.length >= 2) {
      riskAssessment = 'medium';
    }

    // Prepare AI analysis if available
    let aiAnalysis = null;
    if (lovableApiKey) {
      try {
        const prompt = `Analyse comparative de deux situations juridiques:

SITUATION 1: ${folder1.name}
- Résumé: ${folder1.summary || 'Non disponible'}
- Institution: ${folder1.institution_concerned || 'Non spécifiée'}
- Violations: ${violations1.map((v: any) => v.type).join(', ') || 'Aucune'}

SITUATION 2: ${folder2.name}
- Résumé: ${folder2.summary || 'Non disponible'}
- Institution: ${folder2.institution_concerned || 'Non spécifiée'}
- Violations: ${violations2.map((v: any) => v.type).join(', ') || 'Aucune'}

ACTEURS COMMUNS: ${sharedActors.map(a => a.name).join(', ') || 'Aucun'}
PATTERNS COMMUNS: ${sharedPatterns.map(p => p.type).join(', ') || 'Aucun'}

Fournis une analyse JSON avec:
{
  "summary": "Résumé de 2-3 phrases de la comparaison",
  "connections": ["Liste des connexions significatives"],
  "risks": ["Risques identifiés par la comparaison"],
  "recommendations": ["Actions recommandées"],
  "legal_implications": "Implications juridiques de ces similitudes"
}`;

        const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiAnalysis = JSON.parse(jsonMatch[0]);
            }
          }
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    // Save comparison
    const { data: comparison, error: saveError } = await supabase
      .from('situation_comparisons')
      .upsert({
        user_id: userId,
        folder_id_1: folderId1,
        folder_id_2: folderId2,
        comparison_type: 'cross_analysis',
        similarity_score: Math.round(similarityScore),
        shared_actors: sharedActors,
        shared_patterns: sharedPatterns,
        contradictions,
        risk_assessment: riskAssessment,
        analyzed_at: new Date().toISOString()
      }, {
        onConflict: 'folder_id_1,folder_id_2'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      comparison: {
        id: comparison?.id,
        folder1: { id: folder1.id, name: folder1.name },
        folder2: { id: folder2.id, name: folder2.name },
        similarityScore: Math.round(similarityScore),
        sharedActors,
        sharedPatterns,
        contradictions,
        riskAssessment,
        aiAnalysis
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Comparison error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
