import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MonitoringResult {
  database: {
    totalEmails: number;
    totalIncidents: number;
    unresolvedAlerts: number;
    criticalAlerts: number;
    recentErrors: any[];
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    checks: {
      name: string;
      status: 'pass' | 'fail';
      message: string;
    }[];
  };
  metrics: {
    emailsLast24h: number;
    incidentsLast24h: number;
    analysesLast24h: number;
    avgResponseTime?: number;
  };
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_PAT = Deno.env.get("SUPABASE_PAT");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];

    console.log("Starting monitoring check...");

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Database stats
    const [
      emailsCount,
      incidentsCount,
      alertsData,
      emailsLast24h,
      incidentsLast24h,
      analysesLast24h,
      syncStatus
    ] = await Promise.all([
      supabase.from('emails').select('id', { count: 'exact', head: true }),
      supabase.from('incidents').select('id', { count: 'exact', head: true }),
      supabase.from('audit_alerts').select('*').eq('is_resolved', false),
      supabase.from('emails').select('id', { count: 'exact', head: true }).gte('received_at', yesterday.toISOString()),
      supabase.from('incidents').select('id', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()),
      supabase.from('thread_analyses').select('id', { count: 'exact', head: true }).gte('analyzed_at', yesterday.toISOString()),
      supabase.from('sync_status').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    const unresolvedAlerts = alertsData.data || [];
    const criticalAlerts = unresolvedAlerts.filter(a => 
      a.severity === 'critical' || a.severity === 'critique'
    );

    // Health checks
    const healthChecks: MonitoringResult['health']['checks'] = [];

    // Check 1: Database connectivity
    healthChecks.push({
      name: 'Database Connectivity',
      status: emailsCount.error ? 'fail' : 'pass',
      message: emailsCount.error ? `Error: ${emailsCount.error.message}` : 'Connected'
    });

    // Check 2: Recent sync status
    const recentSync = syncStatus.data?.[0];
    const syncOk = recentSync && recentSync.status !== 'error';
    healthChecks.push({
      name: 'Gmail Sync',
      status: syncOk ? 'pass' : 'fail',
      message: syncOk 
        ? `Last sync: ${recentSync?.completed_at || 'in progress'}` 
        : recentSync?.error_message || 'No recent sync'
    });

    // Check 3: Critical alerts
    healthChecks.push({
      name: 'Critical Alerts',
      status: criticalAlerts.length === 0 ? 'pass' : 'fail',
      message: criticalAlerts.length === 0 
        ? 'No critical alerts' 
        : `${criticalAlerts.length} critical alert(s) need attention`
    });

    // Check 4: Email processing backlog
    const { data: unprocessedEmails } = await supabase
      .from('emails')
      .select('id', { count: 'exact', head: true })
      .eq('processed', false);
    
    const backlogCount = unprocessedEmails || 0;
    healthChecks.push({
      name: 'Processing Backlog',
      status: (backlogCount as any) < 50 ? 'pass' : 'fail',
      message: `${backlogCount} emails pending processing`
    });

    // Determine overall health status
    const failedChecks = healthChecks.filter(c => c.status === 'fail');
    let overallStatus: MonitoringResult['health']['status'] = 'healthy';
    if (failedChecks.length > 0) overallStatus = 'warning';
    if (criticalAlerts.length > 0 || failedChecks.length > 2) overallStatus = 'critical';

    // Generate recommendations
    const recommendations: string[] = [];

    if (criticalAlerts.length > 0) {
      recommendations.push(`Résoudre les ${criticalAlerts.length} alerte(s) critique(s) en priorité`);
    }

    if ((backlogCount as any) > 20) {
      recommendations.push(`Lancer une analyse batch pour traiter les ${backlogCount} emails en attente`);
    }

    if ((emailsLast24h.count || 0) === 0) {
      recommendations.push('Vérifier la synchronisation Gmail - aucun email reçu en 24h');
    }

    if ((analysesLast24h.count || 0) === 0 && (emailsLast24h.count || 0) > 0) {
      recommendations.push('Lancer l\'audit quotidien pour analyser les nouveaux emails');
    }

    // Create alerts for critical issues
    if (overallStatus === 'critical' && criticalAlerts.length > 0) {
      // Check if we already have a monitoring alert
      const { data: existingMonitoringAlert } = await supabase
        .from('audit_alerts')
        .select('id')
        .eq('alert_type', 'monitoring')
        .eq('is_resolved', false)
        .limit(1);

      if (!existingMonitoringAlert || existingMonitoringAlert.length === 0) {
        await supabase.from('audit_alerts').insert({
          alert_type: 'monitoring',
          severity: 'critical',
          title: 'Problèmes critiques détectés par le monitoring',
          description: recommendations.join('; '),
        });
      }
    }

    const result: MonitoringResult = {
      database: {
        totalEmails: emailsCount.count || 0,
        totalIncidents: incidentsCount.count || 0,
        unresolvedAlerts: unresolvedAlerts.length,
        criticalAlerts: criticalAlerts.length,
        recentErrors: syncStatus.data?.filter(s => s.status === 'error').slice(0, 3) || []
      },
      health: {
        status: overallStatus,
        checks: healthChecks
      },
      metrics: {
        emailsLast24h: emailsLast24h.count || 0,
        incidentsLast24h: incidentsLast24h.count || 0,
        analysesLast24h: analysesLast24h.count || 0
      },
      recommendations
    };

    console.log("Monitoring check complete:", result.health.status);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Monitoring error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: message,
      health: { status: 'critical', checks: [] }
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
