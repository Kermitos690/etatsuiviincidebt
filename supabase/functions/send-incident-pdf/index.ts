import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendIncidentPdfRequest {
  recipientEmail: string;
  incidentNumero: number;
  incidentTitre: string;
  incidentDate: string;
  pdfBase64: string;
  filename: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SendIncidentPdfRequest = await req.json();
    
    const { 
      recipientEmail, 
      incidentNumero, 
      incidentTitre, 
      incidentDate,
      pdfBase64, 
      filename 
    } = body;

    // Validation
    if (!recipientEmail || !pdfBase64 || !filename) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ ok: false, error: "Champs requis manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if RESEND_API_KEY is configured
    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ ok: false, error: "Service email non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";
    const incidentRef = `INC-${String(incidentNumero).padStart(4, '0')}`;

    console.log(`Sending PDF for ${incidentRef} to ${recipientEmail}`);

    // Send email with PDF attachment
    const emailResponse = await resend.emails.send({
      from: `Curatelle Track <${fromEmail}>`,
      to: [recipientEmail],
      subject: `[TRANSMIS JP] ${incidentRef} - ${incidentTitre}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #2d4a6f); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">
              📋 Transmission au Juge de Paix
            </h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e9ecef;">
            <h2 style="color: #1e3a5f; margin-top: 0;">
              ${incidentRef}: ${incidentTitre}
            </h2>
            
            <table style="width: 100%; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 140px;">Date de l'incident</td>
                <td style="padding: 8px 0; font-weight: bold;">${incidentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Date de transmission</td>
                <td style="padding: 8px 0; font-weight: bold;">${new Date().toLocaleDateString('fr-CH')}</td>
              </tr>
            </table>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 16px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Document juridique</strong><br>
                Ce dossier a été verrouillé afin de préserver l'intégrité probatoire.
              </p>
            </div>
            
            <p style="color: #495057; margin: 16px 0;">
              Veuillez trouver ci-joint le dossier complet de l'incident au format PDF.
            </p>
          </div>
          
          <div style="background: #e9ecef; padding: 16px; border-radius: 0 0 8px 8px; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              Document généré automatiquement par Curatelle Track<br>
              Conformément à la LPD et au Code civil suisse
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename,
          content: pdfBase64,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ ok: true, emailId: emailResponse?.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending incident PDF:", error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message || "Erreur lors de l'envoi" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
