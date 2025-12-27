import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailData {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  received_at: string;
  ai_analysis?: {
    sentiment?: number;
    urgency?: string;
  };
}

interface AnomalyDetection {
  anomaly_type: string;
  severity: string;
  title: string;
  description: string;
  related_email_ids: string[];
  pattern_data: Record<string, unknown>;
  baseline_data: Record<string, unknown>;
  deviation_score: number;
  confidence: number;
  time_window_start: string;
  time_window_end: string;
  ai_explanation: string;
  ai_recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action = 'detect-all' } = await req.json().catch(() => ({}));
    console.log(`[detect-anomalies] Action: ${action} for user ${user.id}`);

    switch (action) {
      case 'detect-all':
        return await detectAllAnomalies(supabase, user.id, corsHeaders);
      case 'update-baselines':
        return await updateBaselines(supabase, user.id, corsHeaders);
      case 'get-anomalies':
        return await getAnomalies(supabase, user.id, corsHeaders);
      case 'get-stats':
        return await getStats(supabase, user.id, corsHeaders);
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('[detect-anomalies] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function detectAllAnomalies(supabase: any, userId: string, corsHeaders: Record<string, string>) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch recent emails
  const { data: emails, error: emailsError } = await supabase
    .from('emails')
    .select('id, sender, recipient, subject, received_at, ai_analysis, body')
    .eq('user_id', userId)
    .gte('received_at', thirtyDaysAgo.toISOString())
    .order('received_at', { ascending: false })
    .limit(500);

  if (emailsError) {
    console.error('[detect-anomalies] Error fetching emails:', emailsError);
    throw emailsError;
  }

  if (!emails || emails.length < 10) {
    return new Response(JSON.stringify({ 
      message: 'Pas assez de données pour détecter des anomalies',
      anomalies_detected: 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Fetch actors
  const { data: actors } = await supabase
    .from('actor_trust_scores')
    .select('*')
    .eq('user_id', userId);

  // Fetch existing baselines
  const { data: baselines } = await supabase
    .from('behavior_baselines')
    .select('*')
    .eq('user_id', userId);

  const anomalies: AnomalyDetection[] = [];

  // 1. Detect frequency spikes
  const frequencyAnomalies = detectFrequencySpikes(emails, baselines || [], sevenDaysAgo);
  anomalies.push(...frequencyAnomalies);

  // 2. Detect timing anomalies
  const timingAnomalies = detectTimingAnomalies(emails, baselines || [], sevenDaysAgo);
  anomalies.push(...timingAnomalies);

  // 3. Detect sentiment shifts
  const sentimentAnomalies = detectSentimentShifts(emails, sevenDaysAgo);
  anomalies.push(...sentimentAnomalies);

  // 4. Detect behavior changes in actors
  const behaviorAnomalies = detectBehaviorChanges(emails, actors || [], sevenDaysAgo);
  anomalies.push(...behaviorAnomalies);

  // Use AI to analyze and enrich anomalies if we have enough
  let enrichedAnomalies = anomalies;
  if (anomalies.length > 0) {
    enrichedAnomalies = await enrichAnomaliesWithAI(anomalies, emails);
  }

  // Save anomalies to database
  let savedCount = 0;
  for (const anomaly of enrichedAnomalies) {
    const { error: insertError } = await supabase
      .from('anomaly_detections')
      .insert({
        user_id: userId,
        anomaly_type: anomaly.anomaly_type,
        severity: anomaly.severity,
        title: anomaly.title,
        description: anomaly.description,
        related_email_ids: anomaly.related_email_ids,
        pattern_data: anomaly.pattern_data,
        baseline_data: anomaly.baseline_data,
        deviation_score: anomaly.deviation_score,
        confidence: anomaly.confidence,
        time_window_start: anomaly.time_window_start,
        time_window_end: anomaly.time_window_end,
        ai_explanation: anomaly.ai_explanation,
        ai_recommendations: anomaly.ai_recommendations
      });

    if (!insertError) savedCount++;
  }

  console.log(`[detect-anomalies] Detected ${enrichedAnomalies.length} anomalies, saved ${savedCount}`);

  return new Response(JSON.stringify({
    success: true,
    anomalies_detected: enrichedAnomalies.length,
    anomalies_saved: savedCount,
    types: {
      frequency: enrichedAnomalies.filter(a => a.anomaly_type === 'frequency_spike').length,
      timing: enrichedAnomalies.filter(a => a.anomaly_type === 'timing_anomaly').length,
      sentiment: enrichedAnomalies.filter(a => a.anomaly_type === 'sentiment_shift').length,
      behavior: enrichedAnomalies.filter(a => a.anomaly_type === 'behavior_change').length
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function detectFrequencySpikes(emails: EmailData[], baselines: any[], recentWindow: Date): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  const senderCounts: Record<string, { total: number; recent: number; emails: string[] }> = {};

  const now = new Date();
  
  emails.forEach(email => {
    const sender = email.sender?.toLowerCase() || 'unknown';
    if (!senderCounts[sender]) {
      senderCounts[sender] = { total: 0, recent: 0, emails: [] };
    }
    senderCounts[sender].total++;
    senderCounts[sender].emails.push(email.id);
    
    if (new Date(email.received_at) >= recentWindow) {
      senderCounts[sender].recent++;
    }
  });

  // Detect senders with unusual frequency
  Object.entries(senderCounts).forEach(([sender, counts]) => {
    const expectedRecent = (counts.total / 30) * 7; // Expected in 7 days based on 30-day average
    const deviation = counts.recent > 0 ? (counts.recent - expectedRecent) / Math.max(expectedRecent, 1) : 0;
    
    if (counts.recent > 5 && deviation > 2) { // More than 2x expected and at least 5 emails
      anomalies.push({
        anomaly_type: 'frequency_spike',
        severity: deviation > 5 ? 'high' : deviation > 3 ? 'medium' : 'low',
        title: `Pic de fréquence: ${sender}`,
        description: `${counts.recent} emails reçus de ${sender} en 7 jours, contre ${expectedRecent.toFixed(1)} attendus`,
        related_email_ids: counts.emails.slice(0, 10),
        pattern_data: { sender, recent_count: counts.recent, total_count: counts.total },
        baseline_data: { expected_weekly: expectedRecent },
        deviation_score: Math.min(deviation * 20, 100),
        confidence: Math.min(70 + counts.recent * 2, 95),
        time_window_start: recentWindow.toISOString(),
        time_window_end: now.toISOString(),
        ai_explanation: '',
        ai_recommendations: []
      });
    }
  });

  return anomalies;
}

function detectTimingAnomalies(emails: EmailData[], baselines: any[], recentWindow: Date): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  const now = new Date();
  
  // Analyze emails sent at unusual hours (before 7am or after 10pm)
  const unusualHourEmails = emails.filter(email => {
    const date = new Date(email.received_at);
    if (date < recentWindow) return false;
    const hour = date.getHours();
    return hour < 7 || hour >= 22;
  });

  if (unusualHourEmails.length >= 3) {
    const senders = [...new Set(unusualHourEmails.map(e => e.sender))];
    
    anomalies.push({
      anomaly_type: 'timing_anomaly',
      severity: unusualHourEmails.length > 10 ? 'high' : 'medium',
      title: `Communications hors heures normales`,
      description: `${unusualHourEmails.length} emails reçus en dehors des heures normales (avant 7h ou après 22h)`,
      related_email_ids: unusualHourEmails.slice(0, 10).map(e => e.id),
      pattern_data: { 
        count: unusualHourEmails.length,
        senders,
        hours: unusualHourEmails.map(e => new Date(e.received_at).getHours())
      },
      baseline_data: { normal_hours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] },
      deviation_score: Math.min(unusualHourEmails.length * 10, 100),
      confidence: 75,
      time_window_start: recentWindow.toISOString(),
      time_window_end: now.toISOString(),
      ai_explanation: '',
      ai_recommendations: []
    });
  }

  // Detect weekend activity spikes
  const weekendEmails = emails.filter(email => {
    const date = new Date(email.received_at);
    if (date < recentWindow) return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  });

  if (weekendEmails.length >= 5) {
    anomalies.push({
      anomaly_type: 'timing_anomaly',
      severity: weekendEmails.length > 15 ? 'high' : 'medium',
      title: `Activité inhabituelle le week-end`,
      description: `${weekendEmails.length} emails reçus le week-end`,
      related_email_ids: weekendEmails.slice(0, 10).map(e => e.id),
      pattern_data: { count: weekendEmails.length },
      baseline_data: { expected_weekend_ratio: 0.1 },
      deviation_score: Math.min(weekendEmails.length * 5, 100),
      confidence: 70,
      time_window_start: recentWindow.toISOString(),
      time_window_end: now.toISOString(),
      ai_explanation: '',
      ai_recommendations: []
    });
  }

  return anomalies;
}

function detectSentimentShifts(emails: EmailData[], recentWindow: Date): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  const now = new Date();

  // Group emails by sender and analyze sentiment trends
  const senderSentiments: Record<string, { old: number[]; recent: number[]; emails: string[] }> = {};

  emails.forEach(email => {
    const sender = email.sender?.toLowerCase() || 'unknown';
    const sentiment = email.ai_analysis?.sentiment;
    if (typeof sentiment !== 'number') return;

    if (!senderSentiments[sender]) {
      senderSentiments[sender] = { old: [], recent: [], emails: [] };
    }

    if (new Date(email.received_at) >= recentWindow) {
      senderSentiments[sender].recent.push(sentiment);
      senderSentiments[sender].emails.push(email.id);
    } else {
      senderSentiments[sender].old.push(sentiment);
    }
  });

  Object.entries(senderSentiments).forEach(([sender, data]) => {
    if (data.old.length < 3 || data.recent.length < 2) return;

    const oldAvg = data.old.reduce((a, b) => a + b, 0) / data.old.length;
    const recentAvg = data.recent.reduce((a, b) => a + b, 0) / data.recent.length;
    const shift = recentAvg - oldAvg;

    // Significant negative shift
    if (shift < -0.3) {
      anomalies.push({
        anomaly_type: 'sentiment_shift',
        severity: shift < -0.5 ? 'high' : 'medium',
        title: `Changement de ton négatif: ${sender}`,
        description: `Le ton des communications de ${sender} est devenu plus négatif (${(shift * 100).toFixed(0)}% de baisse)`,
        related_email_ids: data.emails.slice(0, 10),
        pattern_data: { sender, recent_sentiment: recentAvg, shift },
        baseline_data: { old_sentiment: oldAvg },
        deviation_score: Math.abs(shift) * 100,
        confidence: Math.min(60 + data.recent.length * 5, 90),
        time_window_start: recentWindow.toISOString(),
        time_window_end: now.toISOString(),
        ai_explanation: '',
        ai_recommendations: []
      });
    }
  });

  return anomalies;
}

function detectBehaviorChanges(emails: EmailData[], actors: any[], recentWindow: Date): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  const now = new Date();

  // Analyze actors with concerning trust scores
  actors.forEach(actor => {
    if (actor.trust_score < 30 && (actor.contradictions_count > 2 || actor.promises_broken_count > 1)) {
      anomalies.push({
        anomaly_type: 'behavior_change',
        severity: actor.trust_score < 20 ? 'critical' : 'high',
        title: `Comportement préoccupant: ${actor.actor_name}`,
        description: `${actor.actor_name} présente un score de confiance de ${actor.trust_score}/100 avec ${actor.contradictions_count} contradictions et ${actor.promises_broken_count} promesses non tenues`,
        related_email_ids: [],
        pattern_data: {
          actor_name: actor.actor_name,
          trust_score: actor.trust_score,
          contradictions: actor.contradictions_count,
          broken_promises: actor.promises_broken_count,
          hidden_communications: actor.hidden_communications_count
        },
        baseline_data: { expected_trust_score: 50 },
        deviation_score: 100 - actor.trust_score,
        confidence: 85,
        time_window_start: recentWindow.toISOString(),
        time_window_end: now.toISOString(),
        ai_explanation: '',
        ai_recommendations: []
      });
    }
  });

  // Detect new senders with high volume
  const senderFirstSeen: Record<string, { first: Date; count: number; emails: string[] }> = {};
  
  emails.forEach(email => {
    const sender = email.sender?.toLowerCase() || 'unknown';
    const date = new Date(email.received_at);
    
    if (!senderFirstSeen[sender]) {
      senderFirstSeen[sender] = { first: date, count: 0, emails: [] };
    }
    
    if (date < senderFirstSeen[sender].first) {
      senderFirstSeen[sender].first = date;
    }
    senderFirstSeen[sender].count++;
    senderFirstSeen[sender].emails.push(email.id);
  });

  Object.entries(senderFirstSeen).forEach(([sender, data]) => {
    const daysSinceFirst = (now.getTime() - data.first.getTime()) / (24 * 60 * 60 * 1000);
    
    // New sender (less than 7 days) with high volume
    if (daysSinceFirst < 7 && data.count >= 5) {
      anomalies.push({
        anomaly_type: 'behavior_change',
        severity: data.count > 10 ? 'high' : 'medium',
        title: `Nouveau contact très actif: ${sender}`,
        description: `${sender} est un nouveau contact (${daysSinceFirst.toFixed(0)} jours) avec ${data.count} emails`,
        related_email_ids: data.emails.slice(0, 10),
        pattern_data: { sender, count: data.count, days_since_first: daysSinceFirst },
        baseline_data: { expected_new_sender_count: 2 },
        deviation_score: Math.min(data.count * 10, 100),
        confidence: 75,
        time_window_start: data.first.toISOString(),
        time_window_end: now.toISOString(),
        ai_explanation: '',
        ai_recommendations: []
      });
    }
  });

  return anomalies;
}

async function enrichAnomaliesWithAI(anomalies: AnomalyDetection[], emails: EmailData[]): Promise<AnomalyDetection[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.log('[detect-anomalies] No AI key, skipping enrichment');
    return anomalies;
  }

  try {
    const prompt = `Tu es un expert en analyse de comportements et détection d'anomalies dans les communications professionnelles.

Voici des anomalies détectées dans les emails d'un utilisateur:

${anomalies.slice(0, 5).map((a, i) => `
${i + 1}. Type: ${a.anomaly_type}
   Titre: ${a.title}
   Description: ${a.description}
   Score de déviation: ${a.deviation_score}%
   Données: ${JSON.stringify(a.pattern_data)}
`).join('\n')}

Pour chaque anomalie, fournis une analyse et des recommandations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert en analyse comportementale et détection d\'anomalies. Réponds en JSON.' },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_anomalies',
            description: 'Analyse les anomalies détectées et fournis des explications',
            parameters: {
              type: 'object',
              properties: {
                analyses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'number' },
                      explanation: { type: 'string' },
                      recommendations: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      adjusted_severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
                    },
                    required: ['index', 'explanation', 'recommendations']
                  }
                }
              },
              required: ['analyses']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_anomalies' } }
      })
    });

    if (!response.ok) {
      console.error('[detect-anomalies] AI enrichment failed:', response.status);
      return anomalies;
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      
      parsed.analyses?.forEach((analysis: any) => {
        const idx = analysis.index - 1;
        if (anomalies[idx]) {
          anomalies[idx].ai_explanation = analysis.explanation || '';
          anomalies[idx].ai_recommendations = analysis.recommendations || [];
          if (analysis.adjusted_severity) {
            anomalies[idx].severity = analysis.adjusted_severity;
          }
        }
      });
    }
  } catch (error) {
    console.error('[detect-anomalies] AI enrichment error:', error);
  }

  return anomalies;
}

async function updateBaselines(supabase: any, userId: string, corsHeaders: Record<string, string>) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { data: emails } = await supabase
    .from('emails')
    .select('sender, received_at, ai_analysis')
    .eq('user_id', userId)
    .gte('received_at', thirtyDaysAgo.toISOString());

  if (!emails || emails.length < 10) {
    return new Response(JSON.stringify({ 
      message: 'Pas assez de données pour calculer les baselines' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Calculate baselines per sender
  const senderStats: Record<string, any> = {};
  
  emails.forEach((email: any) => {
    const sender = email.sender?.toLowerCase() || 'unknown';
    if (!senderStats[sender]) {
      senderStats[sender] = {
        count: 0,
        sentiments: [],
        hours: [],
        days: []
      };
    }
    
    senderStats[sender].count++;
    
    const date = new Date(email.received_at);
    senderStats[sender].hours.push(date.getHours());
    senderStats[sender].days.push(date.getDay());
    
    if (typeof email.ai_analysis?.sentiment === 'number') {
      senderStats[sender].sentiments.push(email.ai_analysis.sentiment);
    }
  });

  let savedCount = 0;
  for (const [sender, stats] of Object.entries(senderStats) as [string, any][]) {
    if (stats.count < 3) continue;

    const avgSentiment = stats.sentiments.length > 0 
      ? stats.sentiments.reduce((a: number, b: number) => a + b, 0) / stats.sentiments.length 
      : 0;

    const { error } = await supabase
      .from('behavior_baselines')
      .upsert({
        user_id: userId,
        entity_type: 'sender',
        entity_id: sender,
        entity_label: sender,
        avg_emails_per_day: stats.count / 30,
        typical_sentiment: avgSentiment,
        typical_hours: [...new Set(stats.hours)],
        typical_days: [...new Set(stats.days)],
        sample_size: stats.count,
        calculated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,entity_type,entity_id'
      });

    if (!error) savedCount++;
  }

  return new Response(JSON.stringify({
    success: true,
    baselines_updated: savedCount
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getAnomalies(supabase: any, userId: string, corsHeaders: Record<string, string>) {
  const { data, error } = await supabase
    .from('anomaly_detections')
    .select('*')
    .eq('user_id', userId)
    .order('detected_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return new Response(JSON.stringify({ anomalies: data || [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getStats(supabase: any, userId: string, corsHeaders: Record<string, string>) {
  const { data: anomalies } = await supabase
    .from('anomaly_detections')
    .select('anomaly_type, severity, status')
    .eq('user_id', userId);

  const stats = {
    total: anomalies?.length || 0,
    by_severity: {
      critical: anomalies?.filter((a: any) => a.severity === 'critical').length || 0,
      high: anomalies?.filter((a: any) => a.severity === 'high').length || 0,
      medium: anomalies?.filter((a: any) => a.severity === 'medium').length || 0,
      low: anomalies?.filter((a: any) => a.severity === 'low').length || 0
    },
    by_type: {
      frequency_spike: anomalies?.filter((a: any) => a.anomaly_type === 'frequency_spike').length || 0,
      timing_anomaly: anomalies?.filter((a: any) => a.anomaly_type === 'timing_anomaly').length || 0,
      sentiment_shift: anomalies?.filter((a: any) => a.anomaly_type === 'sentiment_shift').length || 0,
      behavior_change: anomalies?.filter((a: any) => a.anomaly_type === 'behavior_change').length || 0
    },
    by_status: {
      new: anomalies?.filter((a: any) => a.status === 'new').length || 0,
      investigating: anomalies?.filter((a: any) => a.status === 'investigating').length || 0,
      confirmed: anomalies?.filter((a: any) => a.status === 'confirmed').length || 0,
      resolved: anomalies?.filter((a: any) => a.status === 'resolved').length || 0,
      false_positive: anomalies?.filter((a: any) => a.status === 'false_positive').length || 0
    }
  };

  return new Response(JSON.stringify({ stats }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
