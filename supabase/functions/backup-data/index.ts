import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackupOptions {
  format: 'json' | 'csv';
  tables?: string[];
  includeIncidents?: boolean;
  includeEmails?: boolean;
  includeAttachments?: boolean;
  includeAlerts?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const options: BackupOptions = {
      format: body.format || 'json',
      includeIncidents: body.includeIncidents !== false,
      includeEmails: body.includeEmails !== false,
      includeAttachments: body.includeAttachments || false,
      includeAlerts: body.includeAlerts || false,
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
    };

    console.log("Starting backup with options:", options);

    const backupData: Record<string, any[]> = {};
    const stats: Record<string, number> = {};

    // Backup Incidents
    if (options.includeIncidents) {
      let query = supabase.from('incidents').select('*').order('date_incident', { ascending: false });
      
      if (options.dateFrom) {
        query = query.gte('date_incident', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('date_incident', options.dateTo);
      }

      const { data: incidents, error } = await query;
      if (error) throw error;
      
      backupData.incidents = incidents || [];
      stats.incidents = incidents?.length || 0;
      console.log(`Backed up ${stats.incidents} incidents`);
    }

    // Backup Emails
    if (options.includeEmails) {
      let query = supabase.from('emails').select('*').order('received_at', { ascending: false });
      
      if (options.dateFrom) {
        query = query.gte('received_at', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('received_at', options.dateTo);
      }

      const { data: emails, error } = await query.limit(1000);
      if (error) throw error;
      
      backupData.emails = emails || [];
      stats.emails = emails?.length || 0;
      console.log(`Backed up ${stats.emails} emails`);
    }

    // Backup Email Attachments metadata (not the files)
    if (options.includeAttachments) {
      const { data: attachments, error } = await supabase
        .from('email_attachments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      
      backupData.email_attachments = attachments || [];
      stats.attachments = attachments?.length || 0;
      console.log(`Backed up ${stats.attachments} attachment records`);
    }

    // Backup Audit Alerts
    if (options.includeAlerts) {
      const { data: alerts, error } = await supabase
        .from('audit_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      
      backupData.audit_alerts = alerts || [];
      stats.alerts = alerts?.length || 0;
      console.log(`Backed up ${stats.alerts} audit alerts`);
    }

    // Backup Thread Analyses
    const { data: threadAnalyses, error: threadError } = await supabase
      .from('thread_analyses')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(200);
    
    if (!threadError) {
      backupData.thread_analyses = threadAnalyses || [];
      stats.thread_analyses = threadAnalyses?.length || 0;
    }

    // Backup Actor Trust Scores
    const { data: actorScores, error: actorError } = await supabase
      .from('actor_trust_scores')
      .select('*')
      .order('trust_score', { ascending: true });
    
    if (!actorError) {
      backupData.actor_trust_scores = actorScores || [];
      stats.actor_trust_scores = actorScores?.length || 0;
    }

    // Backup Corroborations
    const { data: corroborations, error: corrError } = await supabase
      .from('corroborations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!corrError) {
      backupData.corroborations = corroborations || [];
      stats.corroborations = corroborations?.length || 0;
    }

    // Generate output based on format
    let output: string;
    let contentType: string;
    let filename: string;

    const timestamp = new Date().toISOString().split('T')[0];

    if (options.format === 'csv') {
      // Generate CSV for incidents (main export)
      const incidents = backupData.incidents || [];
      if (incidents.length === 0) {
        output = "No data to export";
      } else {
        const headers = Object.keys(incidents[0]);
        const csvRows = [
          headers.join(','),
          ...incidents.map(row => 
            headers.map(header => {
              let value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') value = JSON.stringify(value);
              // Escape quotes and wrap in quotes if needed
              value = String(value).replace(/"/g, '""');
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value}"`;
              }
              return value;
            }).join(',')
          )
        ];
        output = csvRows.join('\n');
      }
      contentType = 'text/csv';
      filename = `backup-incidents-${timestamp}.csv`;
    } else {
      // JSON format with all data
      output = JSON.stringify({
        exportDate: new Date().toISOString(),
        stats,
        data: backupData
      }, null, 2);
      contentType = 'application/json';
      filename = `backup-full-${timestamp}.json`;
    }

    console.log("Backup completed. Stats:", stats);

    return new Response(output, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Backup error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
