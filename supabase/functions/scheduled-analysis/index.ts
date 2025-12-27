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
    const cronSecret = Deno.env.get('INTERNAL_CRON_SECRET');
    
    // Verify cron secret if provided
    const authHeader = req.headers.get('Authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('Unauthorized cron request');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled analysis...');

    // Get all users with Gmail sync enabled
    const { data: usersWithSync, error: usersError } = await supabase
      .rpc('get_users_with_gmail_sync');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    const results = {
      users_processed: 0,
      emails_analyzed: 0,
      incidents_created: 0,
      alerts_generated: 0,
      errors: [] as string[]
    };

    for (const { user_id } of usersWithSync || []) {
      try {
        console.log(`Processing user: ${user_id}`);

        // 1. Check for unprocessed emails
        const { data: unprocessedEmails, error: emailsError } = await supabase
          .from('emails')
          .select('id, subject, sender, received_at')
          .eq('user_id', user_id)
          .eq('processed', false)
          .order('received_at', { ascending: false })
          .limit(50);

        if (emailsError) {
          results.errors.push(`User ${user_id}: ${emailsError.message}`);
          continue;
        }

        // 2. Trigger batch analysis for unprocessed emails
        if (unprocessedEmails && unprocessedEmails.length > 0) {
          console.log(`Found ${unprocessedEmails.length} unprocessed emails for user ${user_id}`);
          
          const { error: analyzeError } = await supabase.functions.invoke('batch-analyze-emails', {
            body: { 
              userId: user_id, 
              emailIds: unprocessedEmails.map(e => e.id),
              autoCreateIncidents: true
            }
          });

          if (analyzeError) {
            results.errors.push(`Batch analyze for ${user_id}: ${analyzeError.message}`);
          } else {
            results.emails_analyzed += unprocessedEmails.length;
          }
        }

        // 3. Check for legal deadlines approaching
        const { data: upcomingDeadlines, error: deadlinesError } = await supabase
          .from('legal_deadlines')
          .select('*')
          .eq('user_id', user_id)
          .eq('status', 'pending')
          .lte('deadline_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
          .gte('deadline_date', new Date().toISOString());

        if (!deadlinesError && upcomingDeadlines && upcomingDeadlines.length > 0) {
          for (const deadline of upcomingDeadlines) {
            const daysLeft = Math.ceil((new Date(deadline.deadline_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            
            // Check if alert already exists
            const { data: existingAlert } = await supabase
              .from('proactive_alerts')
              .select('id')
              .eq('user_id', user_id)
              .eq('entity_type', 'deadline')
              .eq('entity_id', deadline.id)
              .eq('is_dismissed', false)
              .single();

            if (!existingAlert) {
              await supabase.from('proactive_alerts').insert({
                user_id,
                alert_type: 'deadline_approaching',
                priority: daysLeft <= 2 ? 'critical' : daysLeft <= 5 ? 'high' : 'medium',
                title: `Échéance dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
                description: `${deadline.deadline_type}: ${deadline.notes || 'Délai légal à respecter'}`,
                entity_type: 'deadline',
                entity_id: deadline.id,
                due_date: deadline.deadline_date,
                metadata: { days_left: daysLeft }
              });
              results.alerts_generated++;
            }
          }
        }

        // 4. Detect email pattern anomalies
        const { data: recentEmails, error: recentError } = await supabase
          .from('emails')
          .select('sender, subject, body, received_at')
          .eq('user_id', user_id)
          .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('received_at', { ascending: false });

        if (!recentError && recentEmails && recentEmails.length >= 3) {
          // Detect repetitive patterns
          const senderCounts: Record<string, number> = {};
          const subjectPatterns: Record<string, string[]> = {};

          for (const email of recentEmails) {
            const sender = email.sender?.toLowerCase() || 'unknown';
            senderCounts[sender] = (senderCounts[sender] || 0) + 1;
            
            // Extract subject pattern (first 30 chars)
            const subjectKey = email.subject?.substring(0, 30).toLowerCase() || '';
            if (!subjectPatterns[subjectKey]) subjectPatterns[subjectKey] = [];
            subjectPatterns[subjectKey].push(email.subject);
          }

          // Alert for high-frequency senders
          for (const [sender, count] of Object.entries(senderCounts)) {
            if (count >= 5) {
              const { data: existingAlert } = await supabase
                .from('proactive_alerts')
                .select('id')
                .eq('user_id', user_id)
                .eq('alert_type', 'pattern_detected')
                .ilike('title', `%${sender}%`)
                .eq('is_dismissed', false)
                .single();

              if (!existingAlert) {
                await supabase.from('proactive_alerts').insert({
                  user_id,
                  alert_type: 'pattern_detected',
                  priority: count >= 10 ? 'high' : 'medium',
                  title: `Expéditeur fréquent détecté: ${sender}`,
                  description: `${count} emails reçus cette semaine de ${sender}. Vérifiez s'il s'agit d'un comportement normal.`,
                  metadata: { sender, count, period: '7_days' }
                });
                results.alerts_generated++;
              }
            }
          }
        }

        results.users_processed++;
      } catch (userError) {
        console.error(`Error processing user ${user_id}:`, userError);
        results.errors.push(`User ${user_id}: ${String(userError)}`);
      }
    }

    console.log('Scheduled analysis completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scheduled analysis error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
