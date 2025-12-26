import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Définition des badges
const BADGES = [
  { id: 'beginner', name: 'Débutant', icon: '🥉', condition: (stats: any) => stats.total_swipes >= 10 },
  { id: 'analyst', name: 'Analyste', icon: '🥈', condition: (stats: any) => stats.total_swipes >= 50 },
  { id: 'expert', name: 'Expert', icon: '🥇', condition: (stats: any) => stats.total_swipes >= 200 },
  { id: 'master', name: 'Maître', icon: '💎', condition: (stats: any) => stats.total_swipes >= 500 },
  { id: 'on_fire', name: 'En feu', icon: '🔥', condition: (stats: any) => stats.current_streak >= 20 },
  { id: 'accurate', name: 'Précis', icon: '🎯', condition: (stats: any) => 
    stats.total_swipes >= 20 && (stats.correct_predictions / stats.total_swipes) >= 0.9 
  },
  { id: 'speed_demon', name: 'Rapide', icon: '⚡', condition: (stats: any) => stats.total_swipes >= 30 },
  { id: 'streak_10', name: 'Série de 10', icon: '📈', condition: (stats: any) => stats.max_streak >= 10 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, action, is_correct } = await req.json();

    if (!user_id || !action) {
      throw new Error('Missing required parameters: user_id, action');
    }

    console.log(`Updating stats for user ${user_id}, action: ${action}`);

    // Récupérer ou créer les stats de l'utilisateur
    let { data: stats, error: fetchError } = await supabase
      .from('swipe_training_stats')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!stats) {
      // Créer les stats pour le nouvel utilisateur
      const { data: newStats, error: insertError } = await supabase
        .from('swipe_training_stats')
        .insert({
          user_id,
          total_swipes: 0,
          current_streak: 0,
          max_streak: 0,
          correct_predictions: 0,
          badges: [],
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      stats = newStats;
    }

    // Mettre à jour les stats en fonction de l'action
    const updates: any = {
      last_active_at: new Date().toISOString(),
    };

    if (action === 'swipe') {
      updates.total_swipes = (stats.total_swipes || 0) + 1;
      
      if (is_correct !== undefined) {
        if (is_correct) {
          updates.current_streak = (stats.current_streak || 0) + 1;
          updates.correct_predictions = (stats.correct_predictions || 0) + 1;
          
          if (updates.current_streak > (stats.max_streak || 0)) {
            updates.max_streak = updates.current_streak;
          }
        } else {
          updates.current_streak = 0;
        }
      } else {
        // Si pas de comparaison avec l'IA, on maintient le streak
        updates.current_streak = (stats.current_streak || 0) + 1;
        if (updates.current_streak > (stats.max_streak || 0)) {
          updates.max_streak = updates.current_streak;
        }
      }
    } else if (action === 'reset_streak') {
      updates.current_streak = 0;
    }

    // Vérifier les nouveaux badges
    const currentBadges = stats.badges || [];
    const currentBadgeIds = new Set(currentBadges.map((b: any) => b.id));
    const newBadges: any[] = [];

    const statsForCheck = { ...stats, ...updates };
    
    for (const badge of BADGES) {
      if (!currentBadgeIds.has(badge.id) && badge.condition(statsForCheck)) {
        newBadges.push({
          id: badge.id,
          name: badge.name,
          icon: badge.icon,
          earned_at: new Date().toISOString(),
        });
      }
    }

    if (newBadges.length > 0) {
      updates.badges = [...currentBadges, ...newBadges];
    }

    // Appliquer les mises à jour
    const { data: updatedStats, error: updateError } = await supabase
      .from('swipe_training_stats')
      .update(updates)
      .eq('user_id', user_id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`Stats updated for user ${user_id}:`, {
      total_swipes: updatedStats.total_swipes,
      current_streak: updatedStats.current_streak,
      new_badges: newBadges.length,
    });

    return new Response(JSON.stringify({
      success: true,
      stats: updatedStats,
      new_badges: newBadges,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-training-stats:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
