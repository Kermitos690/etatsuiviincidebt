import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, unauthorizedResponse, badRequestResponse, corsHeaders, isValidEmail, sanitizeHtml } from "../_shared/auth.ts";

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. AUTHENTICATION CHECK
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return unauthorizedResponse(authError || "Unauthorized");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { to, subject, html, replyTo }: SendEmailRequest = await req.json();

    // 2. INPUT VALIDATION
    if (!to || !isValidEmail(to)) {
      return badRequestResponse("Invalid recipient email address");
    }

    if (!subject || subject.trim().length === 0) {
      return badRequestResponse("Subject is required");
    }

    if (subject.length > 200) {
      return badRequestResponse("Subject must be less than 200 characters");
    }

    if (!html || html.trim().length === 0) {
      return badRequestResponse("Email body is required");
    }

    if (replyTo && !isValidEmail(replyTo)) {
      return badRequestResponse("Invalid reply-to email address");
    }

    // 3. SANITIZE HTML CONTENT
    const sanitizedHtml = sanitizeHtml(html);

    // 4. AUDIT LOG
    console.log(`Email send request by user ${user.email || user.id} to ${to}`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Incidents <onboarding@resend.dev>",
        to: [to],
        subject: subject.trim(),
        html: sanitizedHtml,
        reply_to: replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data.id);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
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
