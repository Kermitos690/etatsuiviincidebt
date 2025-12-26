import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
};

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

function extractEmailAddress(fullAddress: string): string {
  const match = fullAddress.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : fullAddress.toLowerCase();
}

function determineEmailType(
  labels: string[],
  subject: string,
  senderEmail: string,
  userEmail: string
): { is_sent: boolean; email_type: string } {
  const isSent = labels.includes("SENT");
  const subjectLower = subject.toLowerCase();
  const userIsSender = extractEmailAddress(senderEmail) === userEmail.toLowerCase();
  
  if (isSent || userIsSender) {
    if (subjectLower.startsWith("re:") || subjectLower.startsWith("rép:")) {
      return { is_sent: true, email_type: "replied" };
    } else if (subjectLower.startsWith("fwd:") || subjectLower.startsWith("tr:") || subjectLower.startsWith("fw:")) {
      return { is_sent: true, email_type: "forwarded" };
    } else {
      return { is_sent: true, email_type: "sent" };
    }
  } else {
    return { is_sent: false, email_type: "received" };
  }
}

// Check for attachments in message parts
function findAttachments(parts: any[]): any[] {
  const attachments: any[] = [];
  for (const part of parts) {
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
      });
    }
    if (part.parts) {
      attachments.push(...findAttachments(part.parts));
    }
  }
  return attachments;
}

// Download and store attachments
async function downloadAttachments(
  emailId: string,
  messageId: string,
  attachments: any[],
  accessToken: string,
  supabase: any
) {
  const downloaded = [];
  
  for (const attachment of attachments) {
    try {
      const attachmentResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachment.attachmentId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!attachmentResponse.ok) {
        console.error(`Failed to download attachment: ${attachment.filename}`);
        continue;
      }

      const attachmentData = await attachmentResponse.json();
      const base64Data = attachmentData.data.replace(/-/g, "+").replace(/_/g, "/");
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const timestamp = Date.now();
      const sanitizedFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${emailId}/${timestamp}_${sanitizedFilename}`;

      const { error: uploadError } = await supabase.storage
        .from("email-attachments")
        .upload(storagePath, binaryData, {
          contentType: attachment.mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error(`Failed to upload ${attachment.filename}:`, uploadError);
        continue;
      }

      const { error: saveError } = await supabase
        .from("email_attachments")
        .insert({
          email_id: emailId,
          filename: attachment.filename,
          mime_type: attachment.mimeType,
          size_bytes: attachment.size,
          storage_path: storagePath,
          gmail_attachment_id: attachment.attachmentId,
        });

      if (!saveError) {
        downloaded.push(attachment.filename);
      }
    } catch (error) {
      console.error(`Error downloading ${attachment.filename}:`, error);
    }
  }
  
  return downloaded;
}

// Background task for processing emails
async function processEmailsInBackground(
  syncId: string,
  allMessages: any[],
  accessToken: string,
  config: any,
  supabase: any
) {
  console.log(`[Background] Starting processing of ${allMessages.length} emails for sync ${syncId}`);
  
  const stats = { received: 0, sent: 0, replied: 0, forwarded: 0, attachments: 0 };
  let processedCount = 0;
  let newEmailsCount = 0;
  let attachmentsCount = 0;
  const BATCH_SIZE = 10;
  const UPDATE_INTERVAL = 20;

  try {
    for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
      const batch = allMessages.slice(i, Math.min(i + BATCH_SIZE, allMessages.length));
      
      // Process batch in parallel
      const batchPromises = batch.map(async (msg) => {
        try {
          const msgResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (!msgResponse.ok) {
            console.error(`Failed to fetch message ${msg.id}`);
            return { success: false };
          }
          
          const msgData = await msgResponse.json();
          const headers = msgData.payload?.headers || [];
          const getHeader = (name: string) => 
            headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

          const subject = getHeader("Subject");
          const sender = getHeader("From");
          const recipient = getHeader("To");
          const date = getHeader("Date");
          const labels = msgData.labelIds || [];

          const { is_sent, email_type } = determineEmailType(labels, subject, sender, config.user_email);

          // Find attachments
          const attachments = msgData.payload?.parts ? findAttachments(msgData.payload.parts) : [];

          // Extract body
          let body = "";
          if (msgData.payload?.body?.data) {
            body = atob(msgData.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          } else if (msgData.payload?.parts) {
            const textPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/plain");
            if (textPart?.body?.data) {
              body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
            } else {
              const htmlPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/html");
              if (htmlPart?.body?.data) {
                body = atob(htmlPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
                body = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              }
            }
          }

          // Check if email already exists
          const { data: existingEmail } = await supabase
            .from("emails")
            .select("id")
            .eq("gmail_message_id", msg.id)
            .maybeSingle();

          const isNew = !existingEmail;

          // Upsert email
          const { data: savedEmail, error: insertError } = await supabase
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
            .select("id")
            .single();

          if (insertError) {
            console.error(`Failed to store email ${msg.id}:`, insertError);
            return { success: false };
          }

          // Download attachments for new emails
          let downloadedAttachments = 0;
          if (isNew && attachments.length > 0 && savedEmail) {
            const downloaded = await downloadAttachments(
              savedEmail.id,
              msg.id,
              attachments,
              accessToken,
              supabase
            );
            downloadedAttachments = downloaded.length;
            console.log(`Downloaded ${downloadedAttachments} attachments for email ${msg.id}`);
          }

          return { success: true, email_type, isNew, attachmentsCount: downloadedAttachments };
        } catch (err) {
          console.error(`Error processing message ${msg.id}:`, err);
          return { success: false };
        }
      });

      const results = await Promise.all(batchPromises);
      
      for (const result of results) {
        if (result.success) {
          processedCount++;
          if (result.isNew) newEmailsCount++;
          if (result.attachmentsCount) attachmentsCount += result.attachmentsCount;
          
          if (result.email_type === "received") stats.received++;
          else if (result.email_type === "sent") stats.sent++;
          else if (result.email_type === "replied") stats.replied++;
          else if (result.email_type === "forwarded") stats.forwarded++;
        }
      }
      
      stats.attachments = attachmentsCount;

      // Update status periodically
      if (processedCount % UPDATE_INTERVAL === 0 || i + BATCH_SIZE >= allMessages.length) {
        await supabase
          .from("sync_status")
          .update({
            processed_emails: processedCount,
            new_emails: newEmailsCount,
            stats,
            last_processed_id: batch[batch.length - 1]?.id
          })
          .eq("id", syncId);
        
        console.log(`[Background] Progress: ${processedCount}/${allMessages.length} emails`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Mark sync as completed, then start analysis
    await supabase
      .from("sync_status")
      .update({
        status: "analyzing",
        completed_at: new Date().toISOString(),
        processed_emails: processedCount,
        new_emails: newEmailsCount,
        stats: { ...stats, sync_completed: true, analysis_started: true }
      })
      .eq("id", syncId);

    // Update gmail_config last_sync
    await supabase
      .from("gmail_config")
      .update({ last_sync: new Date().toISOString() })
      .eq("id", config.id);

    console.log(`[Background] Sync completed! ${processedCount} emails processed, ${newEmailsCount} new`);
    console.log(`[Background] Stats:`, stats);

    // Trigger AI analysis for new emails
    if (newEmailsCount > 0) {
      console.log(`[Background] Starting AI analysis for ${newEmailsCount} new emails...`);
      
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        
        const analysisResponse = await fetch(`${SUPABASE_URL}/functions/v1/batch-analyze-emails`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            syncId,
            batchSize: Math.min(newEmailsCount, 20),
            autoCreateIncidents: true,
            confidenceThreshold: 75
          }),
        });

        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          console.log(`[Background] AI Analysis complete:`, analysisResult);
          
          await supabase
            .from("sync_status")
            .update({
              status: "completed",
              stats: { 
                ...stats, 
                sync_completed: true,
                analysis_completed: true,
                emails_analyzed: analysisResult.analyzed || 0,
                incidents_created: analysisResult.incidentsCreated || 0
              }
            })
            .eq("id", syncId);
        } else {
          console.error("[Background] AI Analysis failed:", await analysisResponse.text());
          await supabase
            .from("sync_status")
            .update({
              status: "completed",
              stats: { ...stats, sync_completed: true, analysis_error: true }
            })
            .eq("id", syncId);
        }
      } catch (analysisError) {
        console.error("[Background] AI Analysis error:", analysisError);
        await supabase
          .from("sync_status")
          .update({
            status: "completed",
            stats: { ...stats, sync_completed: true, analysis_error: true }
          })
          .eq("id", syncId);
      }
    } else {
      // No new emails to analyze
      await supabase
        .from("sync_status")
        .update({
          status: "completed",
          stats: { ...stats, sync_completed: true, analysis_completed: true, emails_analyzed: 0 }
        })
        .eq("id", syncId);
    }

  } catch (error) {
    console.error("[Background] Fatal error:", error);
    await supabase
      .from("sync_status")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message : "Unknown error",
        processed_emails: processedCount,
        stats
      })
      .eq("id", syncId);
  }
}

// Handle graceful shutdown
addEventListener('beforeunload', (ev) => {
  console.log('[Shutdown] Function shutting down:', (ev as any).detail?.reason);
});

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
      if (body.afterDate) afterDate = body.afterDate;
    } catch {
      // No body or invalid JSON
    }

    // Build Gmail search query
    const domainParts = domains?.length 
      ? domains.map((d: string) => `(@${d})`).join(" OR ")
      : "";
    const domainQuery = domainParts 
      ? `(from:(${domainParts}) OR to:(${domainParts}))` 
      : "";
    const keywordQuery = keywords?.length 
      ? `(${keywords.join(" OR ")})` 
      : "";
    const dateQuery = afterDate ? `after:${afterDate}` : "";
    
    const queryParts = [domainQuery, keywordQuery, dateQuery].filter(Boolean);
    const query = queryParts.join(" ");

    console.log("Gmail search query:", query);

    // Fetch ALL message IDs with pagination
    let allMessages: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;
    const maxPages = 100;

    while (pageCount < maxPages) {
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
          accessToken = await refreshAccessToken(supabase, config);
          if (!accessToken) {
            return new Response(JSON.stringify({ 
              error: "Gmail authentication failed. Please reconnect." 
            }), {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
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
      
      if (!pageToken) break;
    }

    if (allMessages.length === 0) {
      console.log("No messages found matching criteria");
      
      await supabase
        .from("gmail_config")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", config.id);

      return new Response(JSON.stringify({ 
        status: "completed",
        emailsProcessed: 0, 
        stats: { received: 0, sent: 0, replied: 0, forwarded: 0 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${allMessages.length} total messages. Starting background processing...`);

    // Create sync status record
    const { data: syncStatus, error: syncError } = await supabase
      .from("sync_status")
      .insert({
        status: "processing",
        total_emails: allMessages.length,
        processed_emails: 0,
        new_emails: 0,
        stats: { received: 0, sent: 0, replied: 0, forwarded: 0 }
      })
      .select()
      .single();

    if (syncError) {
      console.error("Failed to create sync status:", syncError);
      throw new Error("Failed to initialize sync");
    }

    // Start background processing
    EdgeRuntime.waitUntil(
      processEmailsInBackground(syncStatus.id, allMessages, accessToken, config, supabase)
    );

    // Return immediate response
    return new Response(JSON.stringify({ 
      status: "processing",
      syncId: syncStatus.id,
      totalEmails: allMessages.length,
      message: `Traitement de ${allMessages.length} emails en arrière-plan...`
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
