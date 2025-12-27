import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text similarity using Jaccard index
function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Generate body signature (first 100 chars normalized)
function generateBodySignature(body: string): string {
  return body
    .replace(/<[^>]+>/g, '') // Remove HTML
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100)
    .toLowerCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('INTERNAL_CRON_SECRET');
    
    const authHeader = req.headers.get('Authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting email template detection...');

    // Get users with sync enabled
    const { data: usersWithSync, error: usersError } = await supabase
      .rpc('get_users_with_gmail_sync');

    if (usersError) throw usersError;

    const results = {
      users_processed: 0,
      templates_detected: 0,
      suspicious_patterns: 0
    };

    for (const { user_id } of usersWithSync || []) {
      try {
        // Get recent emails
        const { data: emails, error: emailsError } = await supabase
          .from('emails')
          .select('id, sender, subject, body, received_at')
          .eq('user_id', user_id)
          .gte('received_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('received_at', { ascending: false })
          .limit(500);

        if (emailsError || !emails) continue;

        // Group by sender
        const bySender: Record<string, typeof emails> = {};
        for (const email of emails) {
          const sender = email.sender?.toLowerCase() || 'unknown';
          if (!bySender[sender]) bySender[sender] = [];
          bySender[sender].push(email);
        }

        // Detect templates per sender
        for (const [sender, senderEmails] of Object.entries(bySender)) {
          if (senderEmails.length < 3) continue;

          // Check for similar bodies
          const signatures: Record<string, string[]> = {};
          for (const email of senderEmails) {
            const sig = generateBodySignature(email.body || '');
            if (!signatures[sig]) signatures[sig] = [];
            signatures[sig].push(email.id);
          }

          // Find templates (3+ similar emails)
          for (const [signature, emailIds] of Object.entries(signatures)) {
            if (emailIds.length >= 3) {
              // Check if template already exists
              const { data: existing } = await supabase
                .from('email_templates')
                .select('id, occurrence_count')
                .eq('user_id', user_id)
                .eq('sender_pattern', sender)
                .eq('body_signature', signature)
                .single();

              if (existing) {
                // Update count
                await supabase
                  .from('email_templates')
                  .update({
                    occurrence_count: emailIds.length,
                    last_seen_at: new Date().toISOString(),
                    example_email_ids: emailIds.slice(0, 5)
                  })
                  .eq('id', existing.id);
              } else {
                // Check for suspicious patterns
                const isSuspicious = 
                  signature.includes('urgent') ||
                  signature.includes('immédiat') ||
                  signature.includes('dernier délai') ||
                  sender.includes('noreply') ||
                  emailIds.length >= 10;

                await supabase.from('email_templates').insert({
                  user_id,
                  sender_pattern: sender,
                  body_signature: signature,
                  occurrence_count: emailIds.length,
                  example_email_ids: emailIds.slice(0, 5),
                  first_seen_at: senderEmails[senderEmails.length - 1].received_at,
                  last_seen_at: senderEmails[0].received_at,
                  is_suspicious: isSuspicious
                });

                results.templates_detected++;
                if (isSuspicious) results.suspicious_patterns++;

                // Create alert for suspicious patterns
                if (isSuspicious) {
                  await supabase.from('proactive_alerts').insert({
                    user_id,
                    alert_type: 'suspicious_template',
                    priority: emailIds.length >= 10 ? 'high' : 'medium',
                    title: `Modèle d'email répétitif détecté`,
                    description: `${emailIds.length} emails similaires de ${sender} détectés. Ce pattern pourrait nécessiter une attention particulière.`,
                    metadata: { 
                      sender, 
                      count: emailIds.length,
                      signature: signature.substring(0, 50) 
                    }
                  });
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

    console.log('Template detection completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Template detection error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
