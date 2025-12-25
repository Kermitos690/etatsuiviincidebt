import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshAccessToken(supabase: any, config: any): Promise<string | null> {
  if (!config.refresh_token) {
    console.log("No refresh token available");
    return null;
  }

  console.log("Refreshing access token...");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error("Token refresh failed:", tokenData);
    return null;
  }

  const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  await supabase
    .from("gmail_config")
    .update({ 
      access_token: tokenData.access_token,
      token_expiry: tokenExpiry
    })
    .eq("id", config.id);

  console.log("Token refreshed successfully");
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get stored Gmail config
    const { data: config, error: configError } = await supabase
      .from("gmail_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (configError || !config) {
      console.error("No Gmail config found");
      return new Response(JSON.stringify({ 
        error: "Gmail not configured. Please connect your Gmail account first." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if token is expired
    let accessToken = config.access_token;
    const tokenExpiry = new Date(config.token_expiry);
    const now = new Date();

    if (tokenExpiry <= now) {
      console.log("Token expired, refreshing...");
      accessToken = await refreshAccessToken(supabase, config);
      if (!accessToken) {
        return new Response(JSON.stringify({ 
          error: "Token expired and refresh failed. Please reconnect Gmail." 
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse request body for optional overrides
    let domains = config.domains || [];
    let keywords = config.keywords || [];
    let maxResults = 50;

    try {
      const body = await req.json();
      if (body.domains) domains = body.domains;
      if (body.keywords) keywords = body.keywords;
      if (body.maxResults) maxResults = body.maxResults;
    } catch {
      // No body or invalid JSON, use defaults from config
    }

    // Build Gmail search query
    const domainQuery = domains?.length 
      ? `from:(${domains.map((d: string) => `@${d}`).join(" OR ")})` 
      : "";
    const keywordQuery = keywords?.length 
      ? `(${keywords.join(" OR ")})` 
      : "";
    const query = [domainQuery, keywordQuery].filter(Boolean).join(" ");

    console.log("Gmail search query:", query);

    // Fetch emails from Gmail API
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listResponse.json();

    if (!listResponse.ok) {
      console.error("Gmail API error:", listData);
      if (listData.error?.code === 401) {
        // Try to refresh token
        accessToken = await refreshAccessToken(supabase, config);
        if (!accessToken) {
          return new Response(JSON.stringify({ 
            error: "Gmail authentication failed. Please reconnect." 
          }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Retry the request
        const retryResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          throw new Error("Gmail API request failed after token refresh");
        }
        Object.assign(listData, retryData);
      } else {
        throw new Error(listData.error?.message || "Gmail API error");
      }
    }

    if (!listData.messages || listData.messages.length === 0) {
      console.log("No messages found matching criteria");
      
      // Update last sync time
      await supabase
        .from("gmail_config")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", config.id);

      return new Response(JSON.stringify({ emailsProcessed: 0, emails: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${listData.messages.length} messages`);

    const emails = [];
    const processLimit = Math.min(listData.messages.length, 20);

    for (let i = 0; i < processLimit; i++) {
      const msg = listData.messages[i];
      
      try {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const msgData = await msgResponse.json();

        if (!msgResponse.ok) {
          console.error(`Failed to fetch message ${msg.id}:`, msgData);
          continue;
        }

        const headers = msgData.payload?.headers || [];
        const getHeader = (name: string) => 
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

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
          } else {
            // Try HTML part
            const htmlPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/html");
            if (htmlPart?.body?.data) {
              body = atob(htmlPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
              // Basic HTML stripping
              body = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            }
          }
        }

        // Store in database with gmail_message_id and gmail_thread_id
        const { data: emailData, error: insertError } = await supabase
          .from("emails")
          .upsert({
            subject,
            sender,
            body: body.substring(0, 10000),
            received_at: new Date(date).toISOString(),
            gmail_message_id: msg.id,
            gmail_thread_id: msgData.threadId,
          }, { onConflict: "gmail_message_id" })
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to store email ${msg.id}:`, insertError);
        } else {
          emails.push(emailData);
          console.log(`Stored email: ${subject}`);
        }
      } catch (msgError) {
        console.error(`Error processing message ${msg.id}:`, msgError);
      }
    }

    // Update last sync time
    await supabase
      .from("gmail_config")
      .update({ last_sync: new Date().toISOString() })
      .eq("id", config.id);

    console.log(`Successfully processed ${emails.length} emails`);

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
