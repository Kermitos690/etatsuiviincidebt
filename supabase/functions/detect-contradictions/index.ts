import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keywords indicating promises or commitments
const PROMISE_KEYWORDS = [
  'je vous confirme', 'nous allons', 'sera fait', 'vous recevrez',
  'je m\'engage', 'nous nous engageons', 'promis', 'assuré',
  'dès que possible', 'dans les plus brefs délais', 'sous 48h',
  'cette semaine', 'demain', 'lundi prochain'
];

// Keywords indicating denial or contradiction
const DENIAL_KEYWORDS = [
  'jamais dit', 'pas prévu', 'impossible', 'ne peut pas',
  'pas concerné', 'pas notre responsabilité', 'erreur',
  'malentendu', 'vous n\'avez jamais', 'contrairement à'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('INTERNAL_CRON_SECRET');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const authHeader = req.headers.get('Authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting contradiction detection...');

    const { data: usersWithSync, error: usersError } = await supabase
      .rpc('get_users_with_gmail_sync');

    if (usersError) throw usersError;

    const results = {
      users_processed: 0,
      threads_analyzed: 0,
      contradictions_found: 0,
      broken_promises: 0
    };

    for (const { user_id } of usersWithSync || []) {
      try {
        // Get email threads
        const { data: threads, error: threadsError } = await supabase
          .from('emails')
          .select('gmail_thread_id')
          .eq('user_id', user_id)
          .not('gmail_thread_id', 'is', null)
          .gte('received_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (threadsError || !threads) continue;

        // Get unique thread IDs
        const uniqueThreads = [...new Set(threads.map(t => t.gmail_thread_id))];

        for (const threadId of uniqueThreads.slice(0, 50)) { // Limit to 50 threads
          const { data: threadEmails, error: threadError } = await supabase
            .from('emails')
            .select('id, sender, subject, body, received_at')
            .eq('user_id', user_id)
            .eq('gmail_thread_id', threadId)
            .order('received_at', { ascending: true });

          if (threadError || !threadEmails || threadEmails.length < 2) continue;

          results.threads_analyzed++;

          // Analyze thread for contradictions
          const promises: Array<{ email_id: string; text: string; sender: string; date: string }> = [];
          const denials: Array<{ email_id: string; text: string; sender: string; date: string }> = [];

          for (const email of threadEmails) {
            const bodyLower = (email.body || '').toLowerCase();
            
            for (const keyword of PROMISE_KEYWORDS) {
              if (bodyLower.includes(keyword)) {
                // Extract context around the keyword
                const idx = bodyLower.indexOf(keyword);
                const context = email.body?.substring(Math.max(0, idx - 50), Math.min(email.body.length, idx + 100));
                promises.push({
                  email_id: email.id,
                  text: context || keyword,
                  sender: email.sender || 'unknown',
                  date: email.received_at
                });
                break;
              }
            }

            for (const keyword of DENIAL_KEYWORDS) {
              if (bodyLower.includes(keyword)) {
                const idx = bodyLower.indexOf(keyword);
                const context = email.body?.substring(Math.max(0, idx - 50), Math.min(email.body.length, idx + 100));
                denials.push({
                  email_id: email.id,
                  text: context || keyword,
                  sender: email.sender || 'unknown',
                  date: email.received_at
                });
                break;
              }
            }
          }

          // Check for promise-then-denial pattern
          if (promises.length > 0 && denials.length > 0) {
            // Check if denial comes after promise from same sender
            for (const promise of promises) {
              for (const denial of denials) {
                if (
                  promise.sender === denial.sender &&
                  new Date(denial.date) > new Date(promise.date)
                ) {
                  // Potential contradiction found
                  const { data: existingAnomaly } = await supabase
                    .from('anomaly_detections')
                    .select('id')
                    .eq('user_id', user_id)
                    .eq('anomaly_type', 'contradiction')
                    .contains('related_email_ids', [promise.email_id, denial.email_id])
                    .single();

                  if (!existingAnomaly) {
                    await supabase.from('anomaly_detections').insert({
                      user_id,
                      anomaly_type: 'contradiction',
                      severity: 'medium',
                      status: 'new',
                      title: `Contradiction potentielle détectée`,
                      description: `Une promesse suivie d'un démenti a été détectée dans un échange avec ${promise.sender}`,
                      related_email_ids: [promise.email_id, denial.email_id],
                      pattern_data: {
                        promise: { text: promise.text, date: promise.date },
                        denial: { text: denial.text, date: denial.date },
                        sender: promise.sender,
                        thread_id: threadId
                      },
                      confidence: 0.7
                    });

                    // Create alert
                    await supabase.from('proactive_alerts').insert({
                      user_id,
                      alert_type: 'contradiction_detected',
                      priority: 'high',
                      title: `Contradiction détectée: ${promise.sender}`,
                      description: `Une promesse du ${new Date(promise.date).toLocaleDateString('fr-FR')} semble contredite par un message du ${new Date(denial.date).toLocaleDateString('fr-FR')}`,
                      entity_type: 'thread',
                      entity_id: threadId,
                      metadata: { promise_email: promise.email_id, denial_email: denial.email_id }
                    });

                    results.contradictions_found++;
                  }
                }
              }
            }
          }

          // Check for broken promises (promise without follow-up after deadline)
          for (const promise of promises) {
            // Check if promise mentions a deadline that has passed
            const promiseLower = promise.text.toLowerCase();
            let promisedDate: Date | null = null;

            if (promiseLower.includes('demain')) {
              promisedDate = new Date(new Date(promise.date).getTime() + 24 * 60 * 60 * 1000);
            } else if (promiseLower.includes('cette semaine')) {
              promisedDate = new Date(new Date(promise.date).getTime() + 7 * 24 * 60 * 60 * 1000);
            } else if (promiseLower.includes('sous 48h') || promiseLower.includes('48 heures')) {
              promisedDate = new Date(new Date(promise.date).getTime() + 2 * 24 * 60 * 60 * 1000);
            }

            if (promisedDate && promisedDate < new Date()) {
              // Check if there was a follow-up
              const followUps = threadEmails.filter(
                e => e.sender === promise.sender && 
                new Date(e.received_at) > new Date(promise.date) &&
                new Date(e.received_at) <= promisedDate!
              );

              if (followUps.length === 0) {
                const { data: existingAlert } = await supabase
                  .from('proactive_alerts')
                  .select('id')
                  .eq('user_id', user_id)
                  .eq('entity_id', promise.email_id)
                  .eq('alert_type', 'broken_promise')
                  .single();

                if (!existingAlert) {
                  await supabase.from('proactive_alerts').insert({
                    user_id,
                    alert_type: 'broken_promise',
                    priority: 'medium',
                    title: `Promesse non tenue: ${promise.sender}`,
                    description: `La promesse "${promise.text.substring(0, 50)}..." n'a pas eu de suite visible.`,
                    entity_type: 'email',
                    entity_id: promise.email_id,
                    metadata: { 
                      promise_date: promise.date,
                      expected_by: promisedDate.toISOString()
                    }
                  });
                  results.broken_promises++;
                }
              }
            }
          }
        }

        results.users_processed++;
      } catch (userError) {
        console.error(`Error for user ${user_id}:`, userError);
      }
    }

    console.log('Contradiction detection completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Contradiction detection error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
