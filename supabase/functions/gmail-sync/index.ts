import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, domains, keywords, maxResults = 50 } = await req.json();
    
    if (!accessToken) {
      throw new Error("Access token required");
    }

    // Build Gmail search query
    const domainQuery = domains?.length 
      ? `from:(${domains.map((d: string) => `@${d}`).join(" OR ")})` 
      : "";
    const keywordQuery = keywords?.length 
      ? `(${keywords.join(" OR ")})` 
      : "";
    const query = [domainQuery, keywordQuery].filter(Boolean).join(" ");

    // Fetch emails from Gmail API
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listResponse.json();

    if (!listData.messages) {
      return new Response(JSON.stringify({ emailsProcessed: 0, emails: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const emails = [];
    for (const msg of listData.messages.slice(0, 20)) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgResponse.json();

      const headers = msgData.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      const subject = getHeader("Subject");
      const sender = getHeader("From");
      const date = getHeader("Date");

      // Extract body
      let body = "";
      if (msgData.payload?.body?.data) {
        body = atob(msgData.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      } else if (msgData.payload?.parts) {
        const textPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/plain");
        if (textPart?.body?.data) {
          body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        }
      }

      // Store in database
      const { data: emailData, error } = await supabase.from("emails").upsert({
        subject,
        sender,
        body: body.substring(0, 10000),
        received_at: new Date(date).toISOString(),
        gmail_message_id: msg.id,
        gmail_thread_id: msgData.threadId,
      }, { onConflict: "gmail_message_id" }).select().single();

      if (!error) {
        emails.push(emailData);
      }
    }

    return new Response(JSON.stringify({ 
      emailsProcessed: emails.length, 
      emails 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gmail sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
