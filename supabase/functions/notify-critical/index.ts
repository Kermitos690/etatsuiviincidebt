import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Email validation regex
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface NotifyCriticalRequest {
  alertEmail: string;
  incidentTitle: string;
  incidentType: string;
  incidentGravite: string;
  incidentScore: number;
  incidentFaits: string;
  incidentInstitution: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const body = await req.json();
    
    // Input validation
    const { 
      alertEmail, 
      incidentTitle, 
      incidentType, 
      incidentGravite, 
      incidentScore,
      incidentFaits,
      incidentInstitution
    }: NotifyCriticalRequest = body;

    // Validate required fields
    if (!alertEmail || !incidentTitle) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: alertEmail, incidentTitle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!isValidEmail(alertEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate string lengths to prevent abuse
    if (incidentTitle.length > 500) {
      return new Response(
        JSON.stringify({ error: 'incidentTitle exceeds maximum length of 500 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (incidentFaits && incidentFaits.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'incidentFaits exceeds maximum length of 10000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate score is a number between 0-100
    const score = typeof incidentScore === 'number' ? Math.min(100, Math.max(0, incidentScore)) : 0;

    console.log("Sending critical alert to:", alertEmail);
    console.log("Incident:", incidentTitle.substring(0, 50));

    // Escape all user inputs for HTML
    const safeTitle = escapeHtml(incidentTitle);
    const safeInstitution = escapeHtml(incidentInstitution || 'Non spécifiée');
    const safeType = escapeHtml(incidentType || 'Non spécifié');
    const safeGravite = escapeHtml(incidentGravite || 'Non spécifiée');
    const safeFaits = escapeHtml(incidentFaits || 'Aucun détail fourni');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%); border-radius: 16px; padding: 30px; border: 1px solid rgba(239, 68, 68, 0.3); }
          .header { text-align: center; margin-bottom: 30px; }
          .alert-badge { display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; }
          h1 { color: #fff; margin: 20px 0 10px; }
          .score { font-size: 48px; font-weight: bold; color: #ef4444; text-align: center; margin: 20px 0; }
          .details { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #a0a0a0; }
          .value { color: #fff; font-weight: 500; }
          .faits { background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; white-space: pre-wrap; word-break: break-word; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="alert-badge">🚨 ALERTE CRITIQUE</span>
            <h1>${safeTitle}</h1>
          </div>
          
          <div class="score">Score: ${score}/100</div>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Institution</span>
              <span class="value">${safeInstitution}</span>
            </div>
            <div class="detail-row">
              <span class="label">Type</span>
              <span class="value">${safeType}</span>
            </div>
            <div class="detail-row">
              <span class="label">Gravité</span>
              <span class="value">${safeGravite}</span>
            </div>
          </div>
          
          <div class="faits">
            <strong>Faits constatés:</strong><br/>
            ${safeFaits}
          </div>
          
          <div class="footer">
            Cet email a été envoyé automatiquement par le système de gestion des incidents.
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Alertes Incidents <onboarding@resend.dev>",
        to: [alertEmail],
        subject: `🚨 ALERTE CRITIQUE: ${safeTitle.substring(0, 100)} (Score: ${score})`,
        html: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Critical alert sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-critical function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
