import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await verifyAuth(req);
    if (authResult.error || !authResult.user) {
      return new Response(JSON.stringify({ error: authResult.error || 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authResult.user.id;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { limit = 50, regenerate = false } = await req.json().catch(() => ({}));

    console.log(`Generating training pairs for user ${userId}, limit: ${limit}, regenerate: ${regenerate}`);

    // Si regenerate, marquer les anciennes paires comme traitées
    if (regenerate) {
      await supabase
        .from('swipe_training_pairs')
        .update({ is_processed: true })
        .eq('user_id', userId)
        .eq('is_processed', false);
    }

    // Récupérer les emails avec leurs faits extraits
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select(`
        id,
        subject,
        sender,
        recipient,
        body,
        received_at,
        gmail_thread_id,
        ai_analysis,
        email_facts (
          mentioned_persons,
          mentioned_institutions,
          key_phrases,
          sender_name,
          urgency_level
        )
      `)
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(200);

    if (emailsError) {
      console.error('Error fetching emails:', emailsError);
      throw emailsError;
    }

    if (!emails || emails.length < 2) {
      return new Response(JSON.stringify({ 
        success: true, 
        pairs_generated: 0,
        message: 'Pas assez d\'emails pour générer des paires'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${emails.length} emails to analyze`);

    // Récupérer les paires existantes pour éviter les doublons
    const { data: existingPairs } = await supabase
      .from('swipe_training_pairs')
      .select('email_1_id, email_2_id')
      .eq('user_id', userId);

    const existingSet = new Set(
      (existingPairs || []).map(p => `${p.email_1_id}-${p.email_2_id}`)
    );

    const pairsToInsert: any[] = [];

    // Fonction pour calculer le score de similarité entre deux emails
    const calculateSimilarity = (email1: any, email2: any): { score: number; type: string; keywords: string[]; actors: string[] } => {
      let score = 0;
      let type = 'ai_suggested';
      const keywords: string[] = [];
      const actors: string[] = [];

      // Même thread Gmail
      if (email1.gmail_thread_id && email1.gmail_thread_id === email2.gmail_thread_id) {
        score += 50;
        type = 'same_thread';
      }

      // Même expéditeur
      if (email1.sender === email2.sender) {
        score += 20;
        if (type === 'ai_suggested') type = 'same_sender';
      }

      // Analyser les faits extraits
      const facts1 = email1.email_facts?.[0] || {};
      const facts2 = email2.email_facts?.[0] || {};

      // Personnes mentionnées en commun
      const persons1 = new Set(facts1.mentioned_persons || []);
      const persons2 = new Set(facts2.mentioned_persons || []);
      const commonPersons = [...persons1].filter(p => persons2.has(p)) as string[];
      if (commonPersons.length > 0) {
        score += commonPersons.length * 10;
        actors.push(...commonPersons);
      }

      // Institutions mentionnées en commun
      const inst1 = new Set(facts1.mentioned_institutions || []);
      const inst2 = new Set(facts2.mentioned_institutions || []);
      const commonInst = [...inst1].filter(i => inst2.has(i)) as string[];
      if (commonInst.length > 0) {
        score += commonInst.length * 15;
        actors.push(...commonInst);
        if (type === 'ai_suggested') type = 'cross_reference';
      }

      // Mots-clés en commun
      const kw1 = new Set((facts1.key_phrases || []).map((k: string) => k.toLowerCase()));
      const kw2 = new Set((facts2.key_phrases || []).map((k: string) => k.toLowerCase()));
      const commonKw = [...kw1].filter(k => kw2.has(k)) as string[];
      if (commonKw.length > 0) {
        score += commonKw.length * 5;
        keywords.push(...commonKw);
      }

      // Mots-clés suisses dans le sujet
      const swissKeywords = ['apea', 'curatelle', 'tutelle', 'protection', 'mesures', 'décision', 'audience', 'mandat'];
      const subject1 = (email1.subject || '').toLowerCase();
      const subject2 = (email2.subject || '').toLowerCase();
      
      swissKeywords.forEach(kw => {
        if (subject1.includes(kw) && subject2.includes(kw)) {
          score += 8;
          if (!keywords.includes(kw)) keywords.push(kw);
        }
      });

      // Proximité temporelle (emails proches dans le temps)
      const date1 = new Date(email1.received_at);
      const date2 = new Date(email2.received_at);
      const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        score += 10;
      } else if (daysDiff < 30) {
        score += 5;
      }

      return { score, type, keywords, actors };
    };

    // Générer les paires
    for (let i = 0; i < emails.length && pairsToInsert.length < limit; i++) {
      for (let j = i + 1; j < emails.length && pairsToInsert.length < limit; j++) {
        const email1 = emails[i];
        const email2 = emails[j];

        // Éviter les doublons
        const pairKey1 = `${email1.id}-${email2.id}`;
        const pairKey2 = `${email2.id}-${email1.id}`;
        if (existingSet.has(pairKey1) || existingSet.has(pairKey2)) {
          continue;
        }

        const { score, type, keywords, actors } = calculateSimilarity(email1, email2);

        // Ne garder que les paires avec un score minimum
        if (score >= 15) {
          // Calculer la prédiction IA basée sur le score
          let aiPrediction = 'unrelated';
          let aiConfidence = 0.3;

          if (score >= 50) {
            aiPrediction = 'corroboration';
            aiConfidence = Math.min(0.95, 0.5 + (score - 50) / 100);
          } else if (score >= 30) {
            aiPrediction = 'corroboration';
            aiConfidence = 0.4 + (score - 30) / 50;
          }

          // Prioriser les paires où l'IA est incertaine (40-70% de confiance)
          let priorityScore = score;
          if (aiConfidence >= 0.4 && aiConfidence <= 0.7) {
            priorityScore += 20; // Boost pour les cas incertains
          }

          pairsToInsert.push({
            user_id: userId,
            email_1_id: email1.id,
            email_2_id: email2.id,
            pair_type: type,
            ai_prediction: aiPrediction,
            ai_confidence: aiConfidence,
            keywords_overlap: keywords.slice(0, 10),
            actors_overlap: actors.slice(0, 10),
            priority_score: priorityScore,
            context_summary: `${email1.subject || 'Sans sujet'} ↔ ${email2.subject || 'Sans sujet'}`,
          });

          existingSet.add(pairKey1);
        }
      }
    }

    // Trier par priorité et insérer
    pairsToInsert.sort((a, b) => b.priority_score - a.priority_score);
    const toInsert = pairsToInsert.slice(0, limit);

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('swipe_training_pairs')
        .insert(toInsert);

      if (insertError) {
        console.error('Error inserting pairs:', insertError);
        throw insertError;
      }
    }

    console.log(`Generated ${toInsert.length} training pairs`);

    return new Response(JSON.stringify({
      success: true,
      pairs_generated: toInsert.length,
      total_emails_analyzed: emails.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-training-pairs:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
