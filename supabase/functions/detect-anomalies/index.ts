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
  body: string;
  received_at: string;
  gmail_thread_id?: string;
  ai_analysis?: {
    sentiment?: number;
    urgency?: string;
  };
}

interface EmailDetail {
  id: string;
  sender: string;
  subject: string;
  date: string;
  body_excerpt: string;
}

interface AnomalyDetection {
  anomaly_type: string;
  severity: string;
  title: string;
  description: string;
  related_email_ids: string[];
  pattern_data: {
    emails_details?: EmailDetail[];
    sender?: string;
    senders?: string[];
    [key: string]: unknown;
  };
  baseline_data: Record<string, unknown>;
  deviation_score: number;
  confidence: number;
  time_window_start: string;
  time_window_end: string;
  ai_explanation: string;
  ai_recommendations: string[];
  legal_violations?: string[];
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

// Helper to create email detail summary
function createEmailDetail(email: EmailData): EmailDetail {
  return {
    id: email.id,
    sender: email.sender || 'Inconnu',
    subject: email.subject || '(Sans sujet)',
    date: email.received_at,
    body_excerpt: (email.body || '').substring(0, 200).replace(/\s+/g, ' ').trim() + (email.body?.length > 200 ? '...' : '')
  };
}

async function detectAllAnomalies(supabase: any, userId: string, corsHeaders: Record<string, string>) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch recent emails with body
  const { data: emails, error: emailsError } = await supabase
    .from('emails')
    .select('id, sender, recipient, subject, received_at, ai_analysis, body, gmail_thread_id')
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

  // Fetch legal references for context
  const { data: legalRefs } = await supabase
    .from('legal_references')
    .select('code_name, article_number, article_text, keywords')
    .eq('user_id', userId)
    .eq('is_verified', true)
    .limit(50);

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

  // 5. Detect conversation mismatches (threads that might need merging/separating)
  const conversationAnomalies = detectConversationMismatches(emails, sevenDaysAgo);
  anomalies.push(...conversationAnomalies);

  // Use AI to analyze and enrich anomalies with email content and legal context
  let enrichedAnomalies = anomalies;
  if (anomalies.length > 0) {
    enrichedAnomalies = await enrichAnomaliesWithAI(anomalies, emails, legalRefs || []);
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
      behavior: enrichedAnomalies.filter(a => a.anomaly_type === 'behavior_change').length,
      conversation: enrichedAnomalies.filter(a => a.anomaly_type === 'conversation_mismatch').length
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function detectFrequencySpikes(emails: EmailData[], baselines: any[], recentWindow: Date): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  const senderData: Record<string, { total: number; recent: number; emails: EmailData[] }> = {};

  const now = new Date();
  
  emails.forEach(email => {
    const sender = email.sender?.toLowerCase() || 'unknown';
    if (!senderData[sender]) {
      senderData[sender] = { total: 0, recent: 0, emails: [] };
    }
    senderData[sender].total++;
    senderData[sender].emails.push(email);
    
    if (new Date(email.received_at) >= recentWindow) {
      senderData[sender].recent++;
    }
  });

  // Detect senders with unusual frequency
  Object.entries(senderData).forEach(([sender, counts]) => {
    const expectedRecent = (counts.total / 30) * 7;
    const deviation = counts.recent > 0 ? (counts.recent - expectedRecent) / Math.max(expectedRecent, 1) : 0;
    
    if (counts.recent > 5 && deviation > 2) {
      const recentEmails = counts.emails
        .filter(e => new Date(e.received_at) >= recentWindow)
        .slice(0, 10);
      
      anomalies.push({
        anomaly_type: 'frequency_spike',
        severity: deviation > 5 ? 'high' : deviation > 3 ? 'medium' : 'low',
        title: `Pic de fréquence: ${sender}`,
        description: `${counts.recent} emails reçus de ${sender} en 7 jours, contre ${expectedRecent.toFixed(1)} attendus`,
        related_email_ids: recentEmails.map(e => e.id),
        pattern_data: { 
          sender, 
          recent_count: counts.recent, 
          total_count: counts.total,
          emails_details: recentEmails.map(createEmailDetail)
        },
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
  
  // Analyze emails sent at unusual hours
  const unusualHourEmails = emails.filter(email => {
    const date = new Date(email.received_at);
    if (date < recentWindow) return false;
    const hour = date.getHours();
    return hour < 7 || hour >= 22;
  });

  if (unusualHourEmails.length >= 3) {
    const senders = [...new Set(unusualHourEmails.map(e => e.sender))];
    const topEmails = unusualHourEmails.slice(0, 10);
    
    anomalies.push({
      anomaly_type: 'timing_anomaly',
      severity: unusualHourEmails.length > 10 ? 'high' : 'medium',
      title: `Communications hors heures normales`,
      description: `${unusualHourEmails.length} emails reçus en dehors des heures normales (avant 7h ou après 22h) de: ${senders.slice(0, 3).join(', ')}${senders.length > 3 ? '...' : ''}`,
      related_email_ids: topEmails.map(e => e.id),
      pattern_data: { 
        count: unusualHourEmails.length,
        senders,
        hours: unusualHourEmails.map(e => new Date(e.received_at).getHours()),
        emails_details: topEmails.map(createEmailDetail)
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
    const senders = [...new Set(weekendEmails.map(e => e.sender))];
    const topEmails = weekendEmails.slice(0, 10);
    
    anomalies.push({
      anomaly_type: 'timing_anomaly',
      severity: weekendEmails.length > 15 ? 'high' : 'medium',
      title: `Activité inhabituelle le week-end`,
      description: `${weekendEmails.length} emails reçus le week-end de: ${senders.slice(0, 3).join(', ')}${senders.length > 3 ? '...' : ''}`,
      related_email_ids: topEmails.map(e => e.id),
      pattern_data: { 
        count: weekendEmails.length,
        senders,
        emails_details: topEmails.map(createEmailDetail)
      },
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

  const senderSentiments: Record<string, { old: number[]; recent: number[]; recentEmails: EmailData[] }> = {};

  emails.forEach(email => {
    const sender = email.sender?.toLowerCase() || 'unknown';
    const sentiment = email.ai_analysis?.sentiment;
    if (typeof sentiment !== 'number') return;

    if (!senderSentiments[sender]) {
      senderSentiments[sender] = { old: [], recent: [], recentEmails: [] };
    }

    if (new Date(email.received_at) >= recentWindow) {
      senderSentiments[sender].recent.push(sentiment);
      senderSentiments[sender].recentEmails.push(email);
    } else {
      senderSentiments[sender].old.push(sentiment);
    }
  });

  Object.entries(senderSentiments).forEach(([sender, data]) => {
    if (data.old.length < 3 || data.recent.length < 2) return;

    const oldAvg = data.old.reduce((a, b) => a + b, 0) / data.old.length;
    const recentAvg = data.recent.reduce((a, b) => a + b, 0) / data.recent.length;
    const shift = recentAvg - oldAvg;

    if (shift < -0.3) {
      const topEmails = data.recentEmails.slice(0, 10);
      
      anomalies.push({
        anomaly_type: 'sentiment_shift',
        severity: shift < -0.5 ? 'high' : 'medium',
        title: `Changement de ton négatif: ${sender}`,
        description: `Le ton des communications de ${sender} est devenu plus négatif (${(shift * 100).toFixed(0)}% de baisse)`,
        related_email_ids: topEmails.map(e => e.id),
        pattern_data: { 
          sender, 
          recent_sentiment: recentAvg, 
          shift,
          emails_details: topEmails.map(createEmailDetail)
        },
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
      // Find emails from this actor
      const actorEmails = emails.filter(e => 
        e.sender?.toLowerCase().includes(actor.actor_name?.toLowerCase()) ||
        e.sender?.toLowerCase().includes(actor.actor_email?.toLowerCase())
      ).slice(0, 10);

      anomalies.push({
        anomaly_type: 'behavior_change',
        severity: actor.trust_score < 20 ? 'critical' : 'high',
        title: `Comportement préoccupant: ${actor.actor_name}`,
        description: `${actor.actor_name} présente un score de confiance de ${actor.trust_score}/100 avec ${actor.contradictions_count} contradictions et ${actor.promises_broken_count} promesses non tenues`,
        related_email_ids: actorEmails.map(e => e.id),
        pattern_data: {
          actor_name: actor.actor_name,
          actor_email: actor.actor_email,
          actor_institution: actor.actor_institution,
          trust_score: actor.trust_score,
          contradictions: actor.contradictions_count,
          broken_promises: actor.promises_broken_count,
          hidden_communications: actor.hidden_communications_count,
          emails_details: actorEmails.map(createEmailDetail)
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
  const senderFirstSeen: Record<string, { first: Date; count: number; emails: EmailData[] }> = {};
  
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
    senderFirstSeen[sender].emails.push(email);
  });

  Object.entries(senderFirstSeen).forEach(([sender, data]) => {
    const daysSinceFirst = (now.getTime() - data.first.getTime()) / (24 * 60 * 60 * 1000);
    
    if (daysSinceFirst < 7 && data.count >= 5) {
      const topEmails = data.emails.slice(0, 10);
      
      anomalies.push({
        anomaly_type: 'behavior_change',
        severity: data.count > 10 ? 'high' : 'medium',
        title: `Nouveau contact très actif: ${sender}`,
        description: `${sender} est un nouveau contact (${daysSinceFirst.toFixed(0)} jours) avec ${data.count} emails`,
        related_email_ids: topEmails.map(e => e.id),
        pattern_data: { 
          sender, 
          count: data.count, 
          days_since_first: daysSinceFirst,
          emails_details: topEmails.map(createEmailDetail)
        },
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

function detectConversationMismatches(emails: EmailData[], recentWindow: Date): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  const now = new Date();
  
  // Group emails by similar subjects
  const subjectGroups: Record<string, EmailData[]> = {};
  
  emails.forEach(email => {
    if (new Date(email.received_at) < recentWindow) return;
    
    // Normalize subject for grouping
    const normalizedSubject = (email.subject || '')
      .toLowerCase()
      .replace(/^(re:|fwd:|tr:|fw:)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);
    
    if (normalizedSubject.length < 5) return;
    
    if (!subjectGroups[normalizedSubject]) {
      subjectGroups[normalizedSubject] = [];
    }
    subjectGroups[normalizedSubject].push(email);
  });

  // Find subjects with emails from different threads that might need merging
  Object.entries(subjectGroups).forEach(([subject, groupEmails]) => {
    if (groupEmails.length < 3) return;
    
    const threadIds = [...new Set(groupEmails.map(e => e.gmail_thread_id).filter(Boolean))];
    const senders = [...new Set(groupEmails.map(e => e.sender))];
    
    // Multiple threads with same subject = potential merge candidates
    if (threadIds.length > 1 && senders.length > 1) {
      const topEmails = groupEmails.slice(0, 10);
      
      anomalies.push({
        anomaly_type: 'conversation_mismatch',
        severity: groupEmails.length > 10 ? 'high' : 'medium',
        title: `Conversations potentiellement liées: "${subject.substring(0, 40)}..."`,
        description: `${groupEmails.length} emails avec un sujet similaire proviennent de ${threadIds.length} fils de discussion différents, impliquant ${senders.slice(0, 3).join(', ')}${senders.length > 3 ? '...' : ''}`,
        related_email_ids: topEmails.map(e => e.id),
        pattern_data: {
          subject,
          thread_count: threadIds.length,
          email_count: groupEmails.length,
          senders,
          emails_details: topEmails.map(createEmailDetail)
        },
        baseline_data: { expected_threads_per_subject: 1 },
        deviation_score: Math.min(threadIds.length * 25, 100),
        confidence: 70,
        time_window_start: recentWindow.toISOString(),
        time_window_end: now.toISOString(),
        ai_explanation: '',
        ai_recommendations: []
      });
    }
  });

  return anomalies;
}

async function enrichAnomaliesWithAI(
  anomalies: AnomalyDetection[], 
  emails: EmailData[],
  legalRefs: any[]
): Promise<AnomalyDetection[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.log('[detect-anomalies] No AI key, skipping enrichment');
    return anomalies;
  }

  try {
    // Build legal context
    const legalContext = legalRefs.length > 0 
      ? legalRefs.map(r => `${r.code_name} art. ${r.article_number}: ${r.article_text?.substring(0, 100) || ''}`).join('\n')
      : 'Références: CC (Code Civil), LPGA, directives COPMA, droits des personnes sous curatelle';

    // Build email context for each anomaly
    const anomaliesWithContext = anomalies.slice(0, 5).map((a, i) => {
      const emailDetails = a.pattern_data.emails_details || [];
      const emailContext = emailDetails.slice(0, 3).map((e: EmailDetail) => 
        `  - De: ${e.sender}\n    Sujet: ${e.subject}\n    Date: ${new Date(e.date).toLocaleDateString('fr-FR')}\n    Contenu: ${e.body_excerpt}`
      ).join('\n');

      return `
${i + 1}. Type: ${a.anomaly_type}
   Titre: ${a.title}
   Description: ${a.description}
   Score de déviation: ${a.deviation_score}%
   
   EMAILS CONCERNÉS:
${emailContext || '   (Aucun détail disponible)'}
`;
    }).join('\n');

    const prompt = `Tu es un expert juridique spécialisé en protection de l'adulte (curatelle) en Suisse.
Tu analyses des anomalies de communication pour aider un particulier en collaboration avec la Justice de Paix.

IMPORTANT: 
- Les recommandations doivent toujours suggérer une collaboration avec la JUSTICE DE PAIX (pas le SCP directement)
- Identifie les violations légales potentielles basées sur le droit suisse
- Propose des actions concrètes et réalisables

CONTEXTE LÉGAL:
${legalContext}

ANOMALIES DÉTECTÉES:
${anomaliesWithContext}

Pour chaque anomalie:
1. Explique ce que cela signifie concrètement (qui, quoi, pourquoi c'est préoccupant)
2. Identifie toute violation légale potentielle (CC, LPGA, directives COPMA)
3. Propose 2-3 actions concrètes en collaboration avec la Justice de Paix`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un expert juridique en protection de l\'adulte. Tu analyses des communications pour détecter des problèmes et proposer des solutions via la Justice de Paix. Réponds en JSON structuré.' 
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_anomalies',
            description: 'Analyse les anomalies avec contexte légal et recommandations Justice de Paix',
            parameters: {
              type: 'object',
              properties: {
                analyses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'number', description: 'Index de l\'anomalie (1-based)' },
                      explanation: { type: 'string', description: 'Explication détaillée avec noms des expéditeurs et contexte' },
                      legal_violations: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Violations légales potentielles identifiées (ex: CC art. 388, LPGA art. 22)'
                      },
                      recommendations: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Actions recommandées en collaboration avec la Justice de Paix'
                      },
                      adjusted_severity: { 
                        type: 'string', 
                        enum: ['low', 'medium', 'high', 'critical'],
                        description: 'Sévérité ajustée basée sur l\'analyse légale'
                      }
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
          anomalies[idx].legal_violations = analysis.legal_violations || [];
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
      behavior_change: anomalies?.filter((a: any) => a.anomaly_type === 'behavior_change').length || 0,
      conversation_mismatch: anomalies?.filter((a: any) => a.anomaly_type === 'conversation_mismatch').length || 0
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
