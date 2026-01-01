import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders, log } from "../_shared/core.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId, threadId, analyzeThread = false } = await req.json();

    if (!emailId) {
      return new Response(JSON.stringify({ error: 'emailId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the email(s)
    let emails = [];
    
    if (analyzeThread && threadId) {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('gmail_thread_id', threadId)
        .order('received_at', { ascending: true });
      
      if (!error && data) {
        emails = data;
      }
    }
    
    if (emails.length === 0) {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('id', emailId)
        .single();
      
      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Email not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      emails = [data];
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build conversation context
    const conversationContext = emails.map((e, i) => 
      `[Email ${i + 1} - ${e.received_at}]
De: ${e.sender}
À: ${e.recipient || 'Non spécifié'}
Sujet: ${e.subject}
---
${e.body?.slice(0, 2000) || 'Corps vide'}
---`
    ).join('\n\n');

    const systemPrompt = `Tu es un expert juridique suisse spécialisé dans l'analyse approfondie des communications liées à la curatelle et protection des adultes.

Analyse cette conversation/email et détecte:
1. Violations de délais légaux
2. Questions restées sans réponse
3. Demandes répétées ignorées
4. Contradictions entre emails
5. Violations de règles/procédures
6. Tactiques d'évitement ou de contournement

Retourne un JSON structuré:
{
  "deadline_violations": {
    "detected": boolean,
    "details": ["description"],
    "missed_deadlines": ["délai manqué"],
    "severity": "none|low|medium|high|critical"
  },
  "unanswered_questions": {
    "detected": boolean,
    "questions": ["question sans réponse"],
    "waiting_since": ["date"]
  },
  "repetitions": {
    "detected": boolean,
    "repeated_requests": ["demande répétée"],
    "count": number
  },
  "contradictions": {
    "detected": boolean,
    "details": ["description"],
    "conflicting_statements": [{"statement1": "", "statement2": "", "source1": "", "source2": ""}]
  },
  "rule_violations": {
    "detected": boolean,
    "violations": ["violation"],
    "rules_concerned": ["règle concernée"],
    "legal_references": ["art. X CC"]
  },
  "circumvention": {
    "detected": boolean,
    "details": ["description"],
    "evasive_responses": ["réponse évasive"]
  },
  "problem_score": number (0-100),
  "summary": "résumé en 2-3 phrases",
  "recommendations": ["action recommandée"],
  "confidence": "High|Medium|Low"
}`;

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
          { role: 'user', content: `Analyse cette conversation:\n\n${conversationContext}` }
        ],
        temperature: 0.2,
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
    
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { problem_score: 0 };
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      analysis = { 
        problem_score: 0, 
        summary: 'Analyse impossible',
        confidence: 'Low'
      };
    }

    // Update the primary email with thread analysis
    const { error: updateError } = await supabase
      .from('emails')
      .update({
        thread_analysis: analysis
      })
      .eq('id', emailId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // If analyzing thread, also save to thread_analyses table
    if (analyzeThread && threadId) {
      const { error: threadError } = await supabase
        .from('thread_analyses')
        .upsert({
          thread_id: threadId,
          user_id: emails[0]?.user_id,
          email_ids: emails.map(e => e.id),
          chronological_summary: analysis.summary,
          detected_issues: [
            ...(analysis.deadline_violations?.detected ? ['Violations de délais'] : []),
            ...(analysis.unanswered_questions?.detected ? ['Questions sans réponse'] : []),
            ...(analysis.repetitions?.detected ? ['Demandes répétées'] : []),
            ...(analysis.contradictions?.detected ? ['Contradictions'] : []),
            ...(analysis.rule_violations?.detected ? ['Violations de règles'] : []),
            ...(analysis.circumvention?.detected ? ['Contournement'] : []),
          ],
          citations: [],
          participants: {
            senders: [...new Set(emails.map(e => e.sender))],
            recipients: [...new Set(emails.filter(e => e.recipient).map(e => e.recipient))]
          },
          severity: analysis.problem_score > 70 ? 'critical' : 
                   analysis.problem_score > 50 ? 'high' :
                   analysis.problem_score > 30 ? 'medium' : 'low',
          confidence_score: analysis.confidence === 'High' ? 90 : 
                           analysis.confidence === 'Medium' ? 70 : 50,
          analyzed_at: new Date().toISOString()
        }, {
          onConflict: 'thread_id,user_id'
        });

      if (threadError) {
        console.error('Thread analysis save error:', threadError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      emailsAnalyzed: emails.length
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
