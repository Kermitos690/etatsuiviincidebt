import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CuratelleWatchSettings {
  curatelle_emails: string[];
  threshold_business_days: number;
  timezone: string;
  enabled: boolean;
}

interface CheckResult {
  user_id: string;
  last_contact_at: string | null;
  business_days_elapsed: number;
  threshold_exceeded: boolean;
  incident_created: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[check-curatelle-contact] Starting curatelle contact check...');

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Lire les paramètres curatelle_watch
    console.log('[check-curatelle-contact] Reading curatelle_watch settings...');
    const { data: settingsRow, error: settingsErr } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "curatelle_watch")
      .maybeSingle();

    if (settingsErr) {
      console.error('[check-curatelle-contact] Error reading settings:', settingsErr);
      throw new Error(`Failed to read settings: ${settingsErr.message}`);
    }

    if (!settingsRow?.value) {
      console.warn('[check-curatelle-contact] No curatelle_watch settings found');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Missing curatelle_watch settings in app_settings table",
          hint: "Insert a row with key='curatelle_watch' and value containing curatelle_emails, threshold_business_days, timezone, enabled"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = settingsRow.value as CuratelleWatchSettings;
    
    if (!settings.enabled) {
      console.log('[check-curatelle-contact] Curatelle watch is disabled');
      return new Response(
        JSON.stringify({ ok: true, message: "Curatelle watch is disabled", checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const curatelleEmails = (settings.curatelle_emails ?? [])
      .map(e => e.toLowerCase().trim())
      .filter(e => e.length > 0);
    
    const threshold = settings.threshold_business_days ?? 4;
    const timezone = settings.timezone ?? "Europe/Zurich";

    if (curatelleEmails.length === 0) {
      console.warn('[check-curatelle-contact] No curatelle emails configured');
      return new Response(
        JSON.stringify({ ok: false, error: "curatelle_emails is empty" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-curatelle-contact] Settings loaded: threshold=${threshold} days, emails=${curatelleEmails.join(', ')}, timezone=${timezone}`);

    // 2. Récupérer tous les utilisateurs avec Gmail sync activé
    const { data: usersData, error: usersErr } = await supabase
      .rpc("get_users_with_gmail_sync");

    if (usersErr) {
      console.error('[check-curatelle-contact] Error getting users:', usersErr);
      throw new Error(`Failed to get users: ${usersErr.message}`);
    }

    const users = usersData ?? [];
    console.log(`[check-curatelle-contact] Found ${users.length} users with Gmail sync enabled`);

    if (users.length === 0) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "No users with Gmail sync enabled",
          checked: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Pour chaque utilisateur, vérifier le dernier contact
    const results: CheckResult[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const user of users) {
      const userId = user.user_id;
      console.log(`[check-curatelle-contact] Checking user ${userId}...`);

      try {
        // Trouver le dernier contact avec la curatelle
        const { data: lastContactData, error: contactErr } = await supabase
          .rpc("get_last_curatelle_contact", {
            p_user_id: userId,
            p_curatelle_emails: curatelleEmails
          });

        if (contactErr) {
          console.error(`[check-curatelle-contact] Error getting contact for user ${userId}:`, contactErr);
          results.push({
            user_id: userId,
            last_contact_at: null,
            business_days_elapsed: 0,
            threshold_exceeded: false,
            incident_created: false,
            error: contactErr.message
          });
          continue;
        }

        const lastContact = lastContactData?.[0];
        const lastContactAt = lastContact?.last_contact_at as string | null;

        if (!lastContactAt) {
          // Aucun contact jamais trouvé
          console.log(`[check-curatelle-contact] No contact found for user ${userId}`);
          
          const dedupKey = `absence_curatelle:${userId}:never:${today}`;
          
          const { error: insertErr } = await supabase
            .from("incidents")
            .insert({
              user_id: userId,
              type: "Absence de contact",
              institution: "Curatelle",
              titre: "Aucun contact email avec la curatelle (historique vide)",
              faits: `Le système ne trouve aucun email échangé avec la curatelle (${curatelleEmails.join(', ')}). Date de vérification: ${today}.`,
              dysfonctionnement: "Rupture de communication avec la curatelle - aucun historique d'échange email détecté.",
              gravite: "Grave",
              priorite: "haute",
              statut: "Ouvert",
              date_incident: today,
              dedup_key: dedupKey
            });

          if (insertErr && !insertErr.message.includes('duplicate')) {
            console.error(`[check-curatelle-contact] Error creating incident for user ${userId}:`, insertErr);
          }

          results.push({
            user_id: userId,
            last_contact_at: null,
            business_days_elapsed: -1,
            threshold_exceeded: true,
            incident_created: !insertErr || insertErr.message.includes('duplicate')
          });
          continue;
        }

        // Calculer les jours ouvrables écoulés
        const lastDate = new Date(lastContactAt).toISOString().slice(0, 10);
        
        const { data: daysData, error: daysErr } = await supabase
          .rpc("business_days_between", { a: lastDate, b: today });

        if (daysErr) {
          console.error(`[check-curatelle-contact] Error calculating business days for user ${userId}:`, daysErr);
          results.push({
            user_id: userId,
            last_contact_at: lastContactAt,
            business_days_elapsed: 0,
            threshold_exceeded: false,
            incident_created: false,
            error: daysErr.message
          });
          continue;
        }

        const businessDaysElapsed = Number(daysData ?? 0);
        console.log(`[check-curatelle-contact] User ${userId}: last contact ${lastDate}, ${businessDaysElapsed} business days elapsed`);

        // Créer un incident si le seuil est dépassé
        if (businessDaysElapsed > threshold) {
          const dedupKey = `absence_curatelle:${userId}:${lastDate}:${today}`;
          const severity = businessDaysElapsed >= threshold + 3 ? "Grave" : "Moyenne";
          
          const titre = `Absence de contact curatelle > ${threshold} jours ouvrables`;
          const faits = `Aucun email détecté avec la curatelle (${curatelleEmails.join(', ')}) depuis le ${lastDate}. ` +
            `Délai écoulé: ${businessDaysElapsed} jours ouvrables (seuil configuré: ${threshold}). ` +
            `Date de détection: ${today}.`;
          const dysfonctionnement = `Rupture de communication avec la curatelle depuis plus de ${threshold} jours ouvrables. ` +
            `Cela peut constituer une violation des obligations de communication et de suivi du curateur.`;

          const { error: insertErr } = await supabase
            .from("incidents")
            .insert({
              user_id: userId,
              type: "Absence de contact",
              institution: "Curatelle",
              titre,
              faits,
              dysfonctionnement,
              gravite: severity,
              priorite: "haute",
              statut: "Ouvert",
              date_incident: lastDate,
              dedup_key: dedupKey
            });

          const incidentCreated = !insertErr || insertErr.message.includes('duplicate');
          
          if (insertErr && !insertErr.message.includes('duplicate')) {
            console.error(`[check-curatelle-contact] Error creating incident for user ${userId}:`, insertErr);
          } else if (!insertErr) {
            console.log(`[check-curatelle-contact] Created incident for user ${userId} (${businessDaysElapsed} days > ${threshold})`);
          } else {
            console.log(`[check-curatelle-contact] Incident already exists for user ${userId} (dedup_key: ${dedupKey})`);
          }

          results.push({
            user_id: userId,
            last_contact_at: lastContactAt,
            business_days_elapsed: businessDaysElapsed,
            threshold_exceeded: true,
            incident_created: incidentCreated
          });
        } else {
          console.log(`[check-curatelle-contact] User ${userId} OK: ${businessDaysElapsed} days <= ${threshold} threshold`);
          results.push({
            user_id: userId,
            last_contact_at: lastContactAt,
            business_days_elapsed: businessDaysElapsed,
            threshold_exceeded: false,
            incident_created: false
          });
        }
      } catch (userError) {
        console.error(`[check-curatelle-contact] Unexpected error for user ${userId}:`, userError);
        results.push({
          user_id: userId,
          last_contact_at: null,
          business_days_elapsed: 0,
          threshold_exceeded: false,
          incident_created: false,
          error: userError instanceof Error ? userError.message : "Unknown error"
        });
      }
    }

    const duration = Date.now() - startTime;
    const incidentsCreated = results.filter(r => r.incident_created && r.threshold_exceeded).length;
    const thresholdExceeded = results.filter(r => r.threshold_exceeded).length;

    console.log(`[check-curatelle-contact] Completed in ${duration}ms: checked ${results.length} users, ${thresholdExceeded} exceeded threshold, ${incidentsCreated} new incidents`);

    return new Response(
      JSON.stringify({
        ok: true,
        checked: results.length,
        threshold_exceeded_count: thresholdExceeded,
        incidents_created_count: incidentsCreated,
        threshold_business_days: threshold,
        curatelle_emails: curatelleEmails,
        duration_ms: duration,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-curatelle-contact] Fatal error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
