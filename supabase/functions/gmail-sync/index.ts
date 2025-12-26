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

// Extract email address from "Name <email@domain.com>" format
function extractEmailAddress(fullAddress: string): string {
  const match = fullAddress.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : fullAddress.toLowerCase();
}

// Determine email type based on labels and subject
function determineEmailType(
  labels: string[],
  subject: string,
  senderEmail: string,
  userEmail: string
): { is_sent: boolean; email_type: string } {
  const isSent = labels.includes("SENT");
  const isInbox = labels.includes("INBOX");
  const subjectLower = subject.toLowerCase();
  
  // Check if user is the sender
  const userIsSender = extractEmailAddress(senderEmail) === userEmail.toLowerCase();
  
  if (isSent || userIsSender) {
    // It's an outgoing email
    if (subjectLower.startsWith("re:") || subjectLower.startsWith("rép:")) {
      return { is_sent: true, email_type: "replied" };
    } else if (subjectLower.startsWith("fwd:") || subjectLower.startsWith("tr:") || subjectLower.startsWith("fw:")) {
      return { is_sent: true, email_type: "forwarded" };
    } else {
      return { is_sent: true, email_type: "sent" };
    }
  } else {
    // It's an incoming email
    return { is_sent: false, email_type: "received" };
  }
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
    let afterDate = null;

    try {
      const body = await req.json();
      if (body.domains) domains = body.domains;
      if (body.keywords) keywords = body.keywords;
      if (body.afterDate) afterDate = body.afterDate; // Format: YYYY/MM/DD
    } catch {
      // No body or invalid JSON, use defaults from config
    }

    // Build Gmail search query - fetch both sent and received emails
    // Query: (from:@domain OR to:@domain) to get both directions
    const domainParts = domains?.length 
      ? domains.map((d: string) => `(@${d})`).join(" OR ")
      : "";
    
    // For both sent and received: use from: OR to:
    const domainQuery = domainParts 
      ? `(from:(${domainParts}) OR to:(${domainParts}))` 
      : "";
    
    const keywordQuery = keywords?.length 
      ? `(${keywords.join(" OR ")})` 
      : "";
    
    // Add date filter if specified
    const dateQuery = afterDate ? `after:${afterDate}` : "";
    
    const queryParts = [domainQuery, keywordQuery, dateQuery].filter(Boolean);
    const query = queryParts.join(" ");

    console.log("Gmail search query:", query);
    console.log("User email:", config.user_email);

    // Fetch ALL emails with pagination - no limit
    let allMessages: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;
    const maxPages = 50; // Safety limit to prevent infinite loops

    let fetchNextPage = true;
    while (fetchNextPage && pageCount < maxPages) {
      const apiUrl: string = pageToken 
        ? `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(query)}&pageToken=${pageToken}`
        : `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(query)}`;

      console.log(`Fetching page ${pageCount + 1}...`);
      
      const listResponse: Response = await fetch(apiUrl, { 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      const listData: any = await listResponse.json();

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
          // Retry this page
          continue;
        } else {
          throw new Error(listData.error?.message || "Gmail API error");
        }
      }

      if (listData.messages) {
        allMessages = allMessages.concat(listData.messages);
        console.log(`Page ${pageCount + 1}: ${listData.messages.length} messages (total: ${allMessages.length})`);
      }

      pageToken = listData.nextPageToken || null;
      pageCount++;
      
      if (!pageToken) {
        fetchNextPage = false;
      }
    }

    if (allMessages.length === 0) {
      console.log("No messages found matching criteria");
      
      // Update last sync time
      await supabase
        .from("gmail_config")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", config.id);

      return new Response(JSON.stringify({ 
        emailsProcessed: 0, 
        emails: [],
        stats: { received: 0, sent: 0, replied: 0, forwarded: 0 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${allMessages.length} total messages across ${pageCount} pages`);

    const emails = [];
    const stats = { received: 0, sent: 0, replied: 0, forwarded: 0 };

    // Process ALL messages (no limit)
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      
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
        const recipient = getHeader("To");
        const date = getHeader("Date");
        const labels = msgData.labelIds || [];

        // Determine email type
        const { is_sent, email_type } = determineEmailType(labels, subject, sender, config.user_email);

        // Update stats
        if (email_type === "received") stats.received++;
        else if (email_type === "sent") stats.sent++;
        else if (email_type === "replied") stats.replied++;
        else if (email_type === "forwarded") stats.forwarded++;

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

        // Store in database with all fields including is_sent, recipient, email_type
        const { data: emailData, error: insertError } = await supabase
          .from("emails")
          .upsert({
            subject,
            sender,
            recipient,
            body: body.substring(0, 10000),
            received_at: new Date(date).toISOString(),
            gmail_message_id: msg.id,
            gmail_thread_id: msgData.threadId,
            is_sent,
            email_type,
          }, { onConflict: "gmail_message_id" })
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to store email ${msg.id}:`, insertError);
        } else {
          emails.push(emailData);
          if (i % 10 === 0) {
            console.log(`Progress: ${i + 1}/${allMessages.length} emails processed`);
          }
        }
      } catch (msgError) {
        console.error(`Error processing message ${msg.id}:`, msgError);
      }

      // Small delay every 10 emails to avoid rate limiting
      if (i > 0 && i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update last sync time
    await supabase
      .from("gmail_config")
      .update({ last_sync: new Date().toISOString() })
      .eq("id", config.id);

    console.log(`Successfully processed ${emails.length} emails`);
    console.log(`Stats: ${stats.received} received, ${stats.sent} sent, ${stats.replied} replied, ${stats.forwarded} forwarded`);

    return new Response(JSON.stringify({ 
      emailsProcessed: emails.length, 
      emails,
      stats,
      pages: pageCount
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
