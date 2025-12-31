import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth } from "../_shared/auth.ts";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { getGmailTokens, encryptGmailTokens, isEncryptionConfigured } from "../_shared/encryption.ts";

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

// All Gmail labels to sync
const ALL_GMAIL_LABELS = [
  'INBOX',
  'SENT',
  'SPAM',
  'TRASH',
  'DRAFT',
  'IMPORTANT',
  'STARRED',
  'CATEGORY_PERSONAL',
  'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_UPDATES',
  'CATEGORY_FORUMS',
];

async function refreshAccessToken(supabase: any, config: any, refreshToken: string): Promise<string | null> {
  if (!refreshToken) {
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
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error("Token refresh failed:", tokenData);
    return null;
  }

  const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  
  // Store tokens encrypted if encryption is configured
  if (isEncryptionConfigured()) {
    try {
      const encrypted = await encryptGmailTokens(tokenData.access_token, refreshToken);
      await supabase
        .from("gmail_config")
        .update({ 
          access_token_enc: encrypted.accessTokenEnc,
          refresh_token_enc: encrypted.refreshTokenEnc,
          token_nonce: encrypted.nonce,
          token_key_version: encrypted.keyVersion,
          access_token: null, // Clear plaintext
          refresh_token: null, // Clear plaintext
          token_expiry: tokenExpiry
        })
        .eq("id", config.id);
      console.log("Token refreshed and stored encrypted");
    } catch (encError) {
      console.error("Encryption failed, storing plaintext:", encError);
      await supabase
        .from("gmail_config")
        .update({ 
          access_token: tokenData.access_token,
          token_expiry: tokenExpiry
        })
        .eq("id", config.id);
    }
  } else {
    // Fallback to plaintext storage
    await supabase
      .from("gmail_config")
      .update({ 
        access_token: tokenData.access_token,
        token_expiry: tokenExpiry
      })
      .eq("id", config.id);
    console.log("Token refreshed (plaintext - encryption not configured)");
  }

  return tokenData.access_token;
}

// Fetch all custom labels from Gmail
async function fetchCustomLabels(accessToken: string): Promise<string[]> {
  try {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const customLabels = (data.labels || [])
      .filter((label: any) => label.type === 'user')
      .map((label: any) => label.id);
    
    console.log(`Found ${customLabels.length} custom labels`);
    return customLabels;
  } catch (error) {
    console.error('Error fetching custom labels:', error);
    return [];
  }
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

// Determine primary Gmail label for storage
function getPrimaryLabel(labels: string[]): string {
  // Priority order for label storage
  const priorityLabels = ['SPAM', 'TRASH', 'DRAFT', 'SENT', 'INBOX'];
  for (const label of priorityLabels) {
    if (labels.includes(label)) return label;
  }
  // If none of the priority labels, check for custom label
  const customLabel = labels.find(l => !ALL_GMAIL_LABELS.includes(l) && !l.startsWith('CATEGORY_'));
  if (customLabel) return customLabel;
  return labels[0] || 'UNKNOWN';
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

      // Normalize MIME type (image/jpg is not standard, should be image/jpeg)
      let mimeType = attachment.mimeType;
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

      const { error: uploadError } = await supabase.storage
        .from("email-attachments")
        .upload(storagePath, binaryData, {
          contentType: mimeType,
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

// ===== Email Relevance Filtering =====
function normalize(v: string): string {
  return v.trim().toLowerCase();
}

function normalizeDomain(input: string): string {
  const d = normalize(input);
  const at = d.lastIndexOf("@");
  const domain = at >= 0 ? d.slice(at + 1) : d;
  return domain.replace(/^\.+|\.+$/g, "");
}

function emailHasDomain(
  email: { sender?: string | null; recipient?: string | null },
  domain: string
): boolean {
  const d = normalizeDomain(domain);
  if (!d) return false;
  const s = normalize(email.sender || "");
  const r = normalize(email.recipient || "");
  return s.includes(`@${d}`) || s.endsWith(d) || r.includes(`@${d}`) || r.endsWith(d);
}

function emailHasKeyword(
  email: { subject?: string | null; body?: string | null },
  keyword: string
): boolean {
  const k = normalize(keyword);
  if (!k) return false;
  const subject = normalize(email.subject || "");
  const body = normalize(email.body || "");
  return subject.includes(k) || body.includes(k);
}

interface EmailFilters {
  domains: string[];
  keywords: string[];
}

function isEmailRelevant(
  email: { sender?: string | null; recipient?: string | null; subject?: string | null; body?: string | null },
  filters: EmailFilters,
  enableLogging = false
): { relevant: boolean; reason: string; matchedDomain?: string; matchedKeyword?: string } {
  const domains = (filters.domains || []).map(normalizeDomain).filter(Boolean);
  const keywords = (filters.keywords || []).map(normalize).filter(Boolean);

  const hasDomains = domains.length > 0;
  const hasKeywords = keywords.length > 0;

  // No filters => treat everything as relevant (fallback)
  if (!hasDomains && !hasKeywords) {
    return { relevant: true, reason: "no_filters_configured" };
  }

  // Check domain match
  let domainMatch = false;
  let matchedDomain: string | undefined;
  if (hasDomains) {
    for (const d of domains) {
      if (emailHasDomain(email, d)) {
        domainMatch = true;
        matchedDomain = d;
        break;
      }
    }
  } else {
    domainMatch = true; // No domain filter = auto-pass
  }

  // Check keyword match
  let keywordMatch = false;
  let matchedKeyword: string | undefined;
  if (hasKeywords) {
    for (const k of keywords) {
      if (emailHasKeyword(email, k)) {
        keywordMatch = true;
        matchedKeyword = k;
        break;
      }
    }
  } else {
    keywordMatch = true; // No keyword filter = auto-pass
  }

  // Build reason for rejection
  if (!domainMatch && !keywordMatch) {
    const senderDomain = normalizeDomain(email.sender || "");
    return { 
      relevant: false, 
      reason: `no_domain_or_keyword_match (sender domain: ${senderDomain}, expected: ${domains.join(', ')})` 
    };
  }
  if (!domainMatch) {
    const senderDomain = normalizeDomain(email.sender || "");
    return { 
      relevant: false, 
      reason: `domain_mismatch (sender: ${senderDomain}, expected: ${domains.join(', ')})` 
    };
  }
  if (!keywordMatch) {
    return { 
      relevant: false, 
      reason: `keyword_mismatch (expected: ${keywords.join(', ')})` 
    };
  }

  // BOTH match
  return { 
    relevant: true, 
    reason: "matched", 
    matchedDomain, 
    matchedKeyword 
  };
}

// Check if email is blacklisted
async function isEmailBlacklisted(
  email: { sender?: string | null; recipient?: string | null },
  userId: string,
  supabase: any
): Promise<boolean> {
  const senderEmail = normalize(email.sender || "");
  const senderDomain = normalizeDomain(email.sender || "");
  
  // Check blacklist
  const { data: blacklist } = await supabase
    .from("email_blacklist")
    .select("domain, sender_email")
    .eq("user_id", userId);
  
  if (!blacklist || blacklist.length === 0) return false;
  
  for (const entry of blacklist) {
    if (entry.sender_email && senderEmail.includes(entry.sender_email.toLowerCase())) {
      return true;
    }
    if (entry.domain && senderDomain === entry.domain.toLowerCase()) {
      return true;
    }
  }
  
  return false;
}

// Background task for processing emails
async function processEmailsInBackground(
  syncId: string,
  userId: string,
  allMessages: any[],
  accessToken: string,
  config: any,
  supabase: any,
  filters: EmailFilters
) {
  console.log(`[Background] Starting processing of ${allMessages.length} emails for sync ${syncId}`);
  console.log(`[Background] Filters: ${filters.domains.length} domains, ${filters.keywords.length} keywords`);
  
  const stats = { 
    received: 0, sent: 0, replied: 0, forwarded: 0, attachments: 0, 
    spam: 0, trash: 0, drafts: 0, custom_folders: 0,
    skippedByFilter: 0,
    skippedByBlacklist: 0  // NEW: track blacklisted emails
  };
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
          const gmail_label = getPrimaryLabel(labels);

          // Find attachments
          const attachments = msgData.payload?.parts ? findAttachments(msgData.payload.parts) : [];

          // Extract body with improved parsing
          let body = "";
          if (msgData.payload?.body?.data) {
            body = atob(msgData.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          } else if (msgData.payload?.parts) {
            // Try to find text/plain first
            const findTextPart = (parts: any[]): string => {
              for (const part of parts) {
                if (part.mimeType === "text/plain" && part.body?.data) {
                  return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
                }
                if (part.parts) {
                  const nested = findTextPart(part.parts);
                  if (nested) return nested;
                }
              }
              return "";
            };
            
            body = findTextPart(msgData.payload.parts);
            
            // Fallback to HTML if no text/plain
            if (!body) {
              const findHtmlPart = (parts: any[]): string => {
                for (const part of parts) {
                  if (part.mimeType === "text/html" && part.body?.data) {
                    const html = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
                    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                  }
                  if (part.parts) {
                    const nested = findHtmlPart(part.parts);
                    if (nested) return nested;
                  }
                }
                return "";
              };
              body = findHtmlPart(msgData.payload.parts);
            }
          }

          // ===== FILTER CHECK: Skip irrelevant emails =====
          const emailForFilter = { sender, recipient, subject, body };
          const filterResult = isEmailRelevant(emailForFilter, filters, true);
          
          if (!filterResult.relevant) {
            console.log(`[Filter] REJECTED email ${msg.id}: ${filterResult.reason}`);
            console.log(`  -> Subject: ${subject.substring(0, 60)}...`);
            console.log(`  -> Sender: ${sender}`);
            return { success: true, skipped: true, skipReason: 'filter' };
          } else if (filterResult.matchedDomain || filterResult.matchedKeyword) {
            console.log(`[Filter] ACCEPTED email ${msg.id}: matched domain="${filterResult.matchedDomain || 'N/A'}", keyword="${filterResult.matchedKeyword || 'N/A'}"`);
          }

          // ===== BLACKLIST CHECK: Skip blacklisted emails =====
          if (await isEmailBlacklisted({ sender, recipient }, userId, supabase)) {
            console.log(`[Blacklist] Skipping email ${msg.id} - sender/domain is blacklisted`);
            return { success: true, skipped: true, skipReason: 'blacklist' };
          }

          // Check if email already exists (scoped to this user)
          const { data: existingEmail } = await supabase
            .from("emails")
            .select("id")
            .eq("gmail_message_id", msg.id)
            .eq("user_id", userId)
            .maybeSingle();

          const isNew = !existingEmail;

          // Upsert email with gmail_label - handle invalid dates
          let receivedAt: string;
          try {
            const parsedDate = new Date(date);
            receivedAt = isNaN(parsedDate.getTime())
              ? new Date().toISOString()
              : parsedDate.toISOString();
          } catch {
            receivedAt = new Date().toISOString();
          }

          const { data: savedEmail, error: insertError } = await supabase
            .from("emails")
            .upsert(
              {
                user_id: userId,
                subject,
                sender,
                recipient,
                body: body.substring(0, 10000),
                received_at: receivedAt,
                gmail_message_id: msg.id,
                gmail_thread_id: msgData.threadId,
                is_sent,
                email_type,
                gmail_label,
              },
              { onConflict: "gmail_message_id" }
            )
            .select("id")
            .single();

          if (insertError) {
            console.error(`Failed to store email ${msg.id}:`, insertError);
            return { success: false };
          }

          // Download attachments for new emails OR existing emails without attachments
          let downloadedAttachments = 0;
          let shouldDownloadAttachments = false;
          
          if (attachments.length > 0 && savedEmail) {
            if (isNew) {
              shouldDownloadAttachments = true;
            } else {
              // Check if existing email has attachments already
              const { data: existingAttachments } = await supabase
                .from("email_attachments")
                .select("id")
                .eq("email_id", savedEmail.id)
                .limit(1);
              
              if (!existingAttachments || existingAttachments.length === 0) {
                console.log(`[Attachments] Existing email ${msg.id} has no attachments stored, downloading...`);
                shouldDownloadAttachments = true;
              }
            }
          }
          
          if (shouldDownloadAttachments && savedEmail) {
            const downloaded = await downloadAttachments(
              savedEmail.id,
              msg.id,
              attachments,
              accessToken,
              supabase
            );
            downloadedAttachments = downloaded.length;
            console.log(`Downloaded ${downloadedAttachments} attachments for email ${msg.id}`);
            
            // Auto-analyze downloaded attachments
            if (downloadedAttachments > 0) {
              try {
                const { data: savedAttachments } = await supabase
                  .from("email_attachments")
                  .select("id, filename, analyzed_at")
                  .eq("email_id", savedEmail.id);
                
                for (const att of savedAttachments || []) {
                  if (!att.analyzed_at) {
                    console.log(`[Attachments] Triggering analysis for ${att.filename}`);
                    // Fire and forget - don't wait for analysis to complete
                    fetch(`${SUPABASE_URL}/functions/v1/analyze-attachment`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ attachmentId: att.id }),
                    }).catch(err => console.error(`Failed to trigger analysis for ${att.id}:`, err));
                  }
                }
              } catch (analysisError) {
                console.error(`Failed to trigger attachment analysis:`, analysisError);
              }
            }
          }

          return { success: true, email_type, isNew, attachmentsCount: downloadedAttachments, gmail_label };
        } catch (err) {
          console.error(`Error processing message ${msg.id}:`, err);
          return { success: false };
        }
      });

      const results = await Promise.all(batchPromises);
      
      for (const result of results) {
        if (result.success) {
          if (result.skipped) {
            if (result.skipReason === 'blacklist') {
              stats.skippedByBlacklist++;
            } else {
              stats.skippedByFilter++;
            }
            continue;
          }
          processedCount++;
          if (result.isNew) newEmailsCount++;
          if (result.attachmentsCount) attachmentsCount += result.attachmentsCount;
          
          // Track email types
          if (result.email_type === "received") stats.received++;
          else if (result.email_type === "sent") stats.sent++;
          else if (result.email_type === "replied") stats.replied++;
          else if (result.email_type === "forwarded") stats.forwarded++;
          
          // Track Gmail labels
          const label = result.gmail_label || '';
          if (label === 'SPAM') stats.spam++;
          else if (label === 'TRASH') stats.trash++;
          else if (label === 'DRAFT') stats.drafts++;
          else if (label && !ALL_GMAIL_LABELS.includes(label)) stats.custom_folders++;
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

    // Mark sync as completed
    await supabase
      .from("sync_status")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_emails: processedCount,
        new_emails: newEmailsCount,
        stats: { ...stats, sync_completed: true }
      })
      .eq("id", syncId);

    // Update gmail_config last_sync
    await supabase
      .from("gmail_config")
      .update({ last_sync: new Date().toISOString() })
      .eq("id", config.id);

    console.log(`[Background] Sync completed! ${processedCount} emails processed, ${newEmailsCount} new`);
    console.log(`[Background] Stats:`, stats);

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

  // Rate limiting for heavy operations
  const clientId = getClientIdentifier(req, "gmail-sync");
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.heavy);
  if (!rateCheck.allowed) {
    console.log(`[RateLimit] Request blocked for ${clientId}`);
    return rateLimitResponse(rateCheck.resetAt);
  }

  try {
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error("[Auth] gmail-sync unauthorized:", authError);
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get stored Gmail config for this user
    let configQuery = supabase.from("gmail_config").select("*").eq("user_id", user.id).maybeSingle();
    let { data: config, error: configError } = await configQuery;

    // Fallback (legacy rows) by email if user_id wasn't set
    if ((!config || configError) && user.email) {
      const fallback = await supabase
        .from("gmail_config")
        .select("*")
        .eq("user_email", user.email)
        .maybeSingle();
      config = fallback.data;
      configError = fallback.error;
    }

    if (configError || !config) {
      console.error("No Gmail config found for user", user.id, configError);
      return new Response(
        JSON.stringify({ error: "Gmail non configuré. Connecte ton compte Gmail d'abord." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get tokens (decrypted if encrypted, or plaintext for migration compatibility)
    const tokens = await getGmailTokens(config);
    let accessToken = tokens.accessToken;
    const refreshToken = tokens.refreshToken;
    
    if (!accessToken) {
      console.error("No access token available for user", user.id);
      return new Response(JSON.stringify({ 
        error: "Gmail non configuré. Connecte ton compte Gmail d'abord." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (tokens.wasEncrypted) {
      console.log(`Using encrypted tokens (key version ${tokens.keyVersion})`);
    } else {
      console.log("Using plaintext tokens (migration pending)");
    }

    // Check if token is expired
    const tokenExpiry = new Date(config.token_expiry);
    const now = new Date();

    if (tokenExpiry <= now) {
      console.log("Token expired, refreshing...");
      accessToken = await refreshAccessToken(supabase, config, refreshToken!);
      if (!accessToken) {
        return new Response(JSON.stringify({ 
          error: "Token expired and refresh failed. Please reconnect Gmail." 
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse request body for options
    let syncMode = 'filtered'; // DEFAULT TO FILTERED - 'filtered', 'all', 'label'
    let specificLabel = null;
    let afterDate = null;
    let requestDomains: string[] | null = null;
    let requestKeywords: string[] | null = null;
    let forceAll = false; // Explicit flag to override filters
    let countOnly = false; // NEW: Just count emails without downloading
    let syncLimit: number | null = null; // NEW: Optional limit on emails to fetch (null = unlimited)

    try {
      const body = await req.json();
      if (body.syncMode) syncMode = body.syncMode;
      if (body.label) specificLabel = body.label;
      if (body.afterDate) afterDate = body.afterDate;
      if (body.domains) requestDomains = body.domains;
      if (body.keywords) requestKeywords = body.keywords;
      if (body.forceAll === true) forceAll = true;
      if (body.countOnly === true) countOnly = true;
      if (typeof body.syncLimit === 'number' && body.syncLimit > 0) {
        syncLimit = body.syncLimit;
      }
    } catch {
      // No body or invalid JSON - use defaults
    }
    
    console.log(`📊 Sync config: syncLimit=${syncLimit ?? 'unlimited'}, countOnly=${countOnly}`);

    // Get filters from request or config
    const domains = requestDomains || config.domains || [];
    const keywords = requestKeywords || config.keywords || [];
    const hasFilters = domains.length > 0 || keywords.length > 0;
    
    // CRITICAL: Only use 'all' mode if explicitly forced AND no filters exist
    // If filters are configured, ALWAYS apply them unless forceAll is true
    if (syncMode === 'all' && hasFilters && !forceAll) {
      syncMode = 'filtered';
      console.log('⚠️ OVERRIDING all mode to filtered - filters are configured. Use forceAll:true to bypass.');
    }
    
    console.log(`📧 Sync mode: ${syncMode}, Filters: ${domains.length} domains, ${keywords.length} keywords, forceAll: ${forceAll}`);

    // Fetch custom labels if doing full sync
    let customLabels: string[] = [];
    if (syncMode === 'all') {
      customLabels = await fetchCustomLabels(accessToken);
    }

    // Build Gmail search query based on sync mode
    // CRITICAL: Filters are applied HERE at the API level, not after download
    let query = '';
    
    // Build domain filter query with CORRECT Gmail syntax
    const buildDomainQuery = (domainList: string[]): string => {
      if (domainList.length === 0) return '';
      // Gmail syntax: from:*@domain.fr OR to:*@domain.fr
      const domainQueries = domainList.map((d: string) => {
        const cleanDomain = d.trim().replace(/^@/, ''); // Remove leading @ if present
        return `from:*@${cleanDomain} OR to:*@${cleanDomain}`;
      });
      return `(${domainQueries.join(' OR ')})`;
    };
    
    // Build keyword filter query
    const buildKeywordQuery = (keywordList: string[]): string => {
      if (keywordList.length === 0) return '';
      // Search in subject and body
      const keywordQueries = keywordList.map((k: string) => `"${k.trim()}"`);
      return `(${keywordQueries.join(' OR ')})`;
    };
    
    if (syncMode === 'all') {
      // Full sync mode - NO filters applied at API level
      const allLabelsToSearch = [...ALL_GMAIL_LABELS, ...customLabels];
      query = allLabelsToSearch.map(l => `label:${l}`).join(' OR ');
      query = `(${query}) OR -label:*`;
      console.log('🔓 Full sync mode - fetching ALL emails (NO API-level filtering)');
    } else if (syncMode === 'label' && specificLabel) {
      // Label-specific sync with optional filters
      query = `label:${specificLabel}`;
      // Still apply domain/keyword filters even in label mode
      const domainQuery = buildDomainQuery(domains);
      const keywordQuery = buildKeywordQuery(keywords);
      if (domainQuery || keywordQuery) {
        query = `${query} ${[domainQuery, keywordQuery].filter(Boolean).join(' ')}`;
      }
      console.log(`📁 Label sync mode - ${specificLabel} with filters`);
    } else {
      // FILTERED mode - apply domain and keyword filters AT THE API LEVEL
      console.log(`🔍 Filtered mode - applying ${domains.length} domains and ${keywords.length} keywords AT API LEVEL`);
      
      const domainQuery = buildDomainQuery(domains);
      const keywordQuery = buildKeywordQuery(keywords);
      
      if (!domainQuery && !keywordQuery) {
        console.log('⚠️ No filters configured - this will fetch ALL emails! Consider adding domains/keywords.');
      }
      
      // Combine domain and keyword queries
      // If both exist, emails must match BOTH (domain AND keyword)
      query = [domainQuery, keywordQuery].filter(Boolean).join(' ');
      
      console.log(`📤 Gmail API query: ${query || '(empty - will fetch all)'}`);
    }

    if (afterDate) {
      query += ` after:${afterDate}`;
    }

    console.log("Gmail search query:", query || "(all emails)");

    // Fetch ALL message IDs with pagination
    let allMessages: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;
    const MAX_PAGES_HARD_LIMIT = 500; // Safety limit: 50,000 emails max
    let stoppedBecause: 'no_more_pages' | 'limit_reached' | 'error' | 'max_pages_reached' = 'no_more_pages';

    console.log(`📥 Starting Gmail fetch with syncLimit=${syncLimit ?? 'unlimited'}`);

    while (pageCount < MAX_PAGES_HARD_LIMIT) {
      // Check if we've reached the sync limit
      if (syncLimit !== null && allMessages.length >= syncLimit) {
        stoppedBecause = 'limit_reached';
        console.log(`🛑 Sync limit reached: ${allMessages.length} >= ${syncLimit}`);
        // Trim to exact limit
        allMessages = allMessages.slice(0, syncLimit);
        break;
      }

      const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100';
      const apiUrl = query 
        ? `${baseUrl}&q=${encodeURIComponent(query)}${pageToken ? `&pageToken=${pageToken}` : ''}`
        : `${baseUrl}${pageToken ? `&pageToken=${pageToken}` : ''}`;

      console.log(`📄 Fetching page ${pageCount + 1}... (current total: ${allMessages.length})`);
      
      const listResponse: Response = await fetch(apiUrl, { 
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      const listData: any = await listResponse.json();

      if (!listResponse.ok) {
        console.error("Gmail API error:", listData);
        if (listData.error?.code === 401) {
          accessToken = await refreshAccessToken(supabase, config, refreshToken!);
          if (!accessToken) {
            stoppedBecause = 'error';
            return new Response(JSON.stringify({ 
              error: "Gmail authentication failed. Please reconnect." 
            }), {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          continue;
        } else {
          stoppedBecause = 'error';
          throw new Error(listData.error?.message || "Gmail API error");
        }
      }

      if (listData.messages) {
        allMessages = allMessages.concat(listData.messages);
        console.log(`📄 Page ${pageCount + 1}: +${listData.messages.length} messages (total: ${allMessages.length})`);
      }

      pageToken = listData.nextPageToken || null;
      pageCount++;
      
      if (!pageToken) {
        stoppedBecause = 'no_more_pages';
        break;
      }
      
      if (pageCount >= MAX_PAGES_HARD_LIMIT) {
        stoppedBecause = 'max_pages_reached';
        console.log(`⚠️ Max pages limit reached (${MAX_PAGES_HARD_LIMIT})`);
        break;
      }
    }

    // Final trim if we overshot the limit
    if (syncLimit !== null && allMessages.length > syncLimit) {
      allMessages = allMessages.slice(0, syncLimit);
    }

    console.log(`📊 Gmail fetch complete:`);
    console.log(`   - totalFetched: ${allMessages.length}`);
    console.log(`   - pages: ${pageCount}`);
    console.log(`   - stoppedBecause: ${stoppedBecause}`);
    console.log(`   - syncLimit: ${syncLimit ?? 'unlimited'}`);

    // COUNT ONLY MODE: Return count without downloading
    if (countOnly) {
      console.log(`[Count Only] Found ${allMessages.length} emails matching filters`);
      return new Response(JSON.stringify({ 
        status: "count_complete",
        count: allMessages.length,
        query: query || "(all emails)",
        pagination: {
          totalFetched: allMessages.length,
          pages: pageCount,
          stoppedBecause,
          syncLimit: syncLimit ?? 'unlimited',
        },
        filters: {
          domains: domains.length,
          keywords: keywords.length,
          afterDate: afterDate || null,
          filtersAppliedAtApi: syncMode === 'filtered' && hasFilters,
        },
        message: allMessages.length === 0 
          ? "Aucun email ne correspond à vos filtres" 
          : `${allMessages.length} emails correspondent à vos filtres`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (allMessages.length === 0) {
      console.log("No messages found");
      
      await supabase
        .from("gmail_config")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", config.id);

      return new Response(JSON.stringify({ 
        status: "completed",
        emailsProcessed: 0, 
        stats: { received: 0, sent: 0, replied: 0, forwarded: 0, spam: 0, trash: 0 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${allMessages.length} total messages. Starting background processing...`);

    // Create sync status record with filtering stats
    const { data: syncStatus, error: syncError } = await supabase
      .from("sync_status")
      .insert({
        user_id: user.id,
        status: "processing",
        total_emails: allMessages.length,
        processed_emails: 0,
        new_emails: 0,
        stats: {
          received: 0,
          sent: 0,
          replied: 0,
          forwarded: 0,
          spam: 0,
          trash: 0,
          drafts: 0,
          custom_folders: 0,
          sync_mode: syncMode,
          // Pagination stats
          totalFetched: allMessages.length,
          pages: pageCount,
          stoppedBecause,
          syncLimit: syncLimit ?? 'unlimited',
          // API filtering stats
          api_emails_found: allMessages.length,
          domains_count: domains.length,
          keywords_count: keywords.length,
          filters_applied_at_api: syncMode === 'filtered' && hasFilters,
          skippedByFilter: 0,
          skippedByBlacklist: 0,
        },
      })
      .select()
      .single();

    if (syncError) {
      console.error("Failed to create sync status:", syncError);
      throw new Error("Failed to initialize sync");
    }

    // Start background processing with filters
    const filters: EmailFilters = { domains, keywords };
    EdgeRuntime.waitUntil(processEmailsInBackground(syncStatus.id, user.id, allMessages, accessToken, config, supabase, filters));

    // Return immediate response
    return new Response(JSON.stringify({ 
      status: "processing",
      syncId: syncStatus.id,
      totalEmails: allMessages.length,
      syncMode,
      customLabelsFound: customLabels.length,
      pagination: {
        totalFetched: allMessages.length,
        pages: pageCount,
        stoppedBecause,
        syncLimit: syncLimit ?? 'unlimited',
      },
      message: `Synchronisation exhaustive de ${allMessages.length} emails en arrière-plan (incluant spam, corbeille, dossiers personnalisés)...`
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
