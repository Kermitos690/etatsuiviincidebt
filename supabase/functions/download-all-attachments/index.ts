import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth } from "../_shared/auth.ts";
import { getCorsHeaders, log } from "../_shared/core.ts";
import { getGmailTokens, encryptGmailTokens, isEncryptionConfigured } from "../_shared/encryption.ts";

interface AttachmentInfo {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface GmailPart {
  partId?: string;
  mimeType: string;
  filename?: string;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailPart[];
}

function findAttachments(parts: GmailPart[]): AttachmentInfo[] {
  const attachments: AttachmentInfo[] = [];
  
  for (const part of parts) {
    if (part.body?.attachmentId && part.filename) {
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

async function refreshAccessToken(
  supabase: any, 
  config: any, 
  refreshToken: string
): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  
  if (!clientId || !clientSecret || !refreshToken) {
    log('error', 'Missing credentials for token refresh');
    return null;
  }
  
  if (!isEncryptionConfigured()) {
    log('error', 'Encryption key missing - cannot store refreshed token');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      log('error', 'Token refresh failed', { status: response.status });
      return null;
    }
    
    const data = await response.json();
    const tokenExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();

    const encrypted = await encryptGmailTokens(data.access_token, refreshToken);
    await supabase
      .from("gmail_config")
      .update({ 
        access_token_enc: encrypted.accessTokenEnc,
        refresh_token_enc: encrypted.refreshTokenEnc,
        token_nonce: encrypted.nonce,
        token_key_version: encrypted.keyVersion,
        token_expiry: tokenExpiry
      })
      .eq("id", config.id);

    log('info', 'Token refreshed and stored encrypted');
    return data.access_token;
  } catch (err) {
    log('error', 'Token refresh exception', { error: String(err) });
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      log('error', 'Auth error', { error: authError });
      return new Response(JSON.stringify({ 
        success: false, 
        code: 'UNAUTHORIZED', 
        error: authError || 'Non autorisé' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log('info', `User ${user.email} executing download-all-attachments`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 20 } = await req.json().catch(() => ({}));

    log('info', 'Starting bulk attachment download...');

    // Get Gmail config - scoped to authenticated user
    const { data: gmailConfig, error: configError } = await supabase
      .from('gmail_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (configError || !gmailConfig) {
      log('warn', 'Gmail not configured for user');
      return new Response(JSON.stringify({
        success: false,
        code: 'GMAIL_NOT_CONFIGURED',
        error: 'Gmail non configuré. Connecte ton compte Gmail d\'abord.',
        action: 'connect_gmail'
      }), {
        status: 200, // Return 200 to avoid frontend crash
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tokens using encryption-aware helper
    const tokens = await getGmailTokens({
      access_token: null,
      refresh_token: null,
      access_token_enc: gmailConfig.access_token_enc,
      refresh_token_enc: gmailConfig.refresh_token_enc,
      token_nonce: gmailConfig.token_nonce,
      token_key_version: gmailConfig.token_key_version,
    });

    log('info', 'Tokens retrieved', { 
      wasEncrypted: tokens.wasEncrypted, 
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken
    });

    if (!tokens.accessToken && !tokens.refreshToken) {
      log('warn', 'No access token available for user', { userId: user.id });
      return new Response(JSON.stringify({
        success: false,
        code: 'GMAIL_RECONNECT_REQUIRED',
        error: 'Session Gmail expirée. Reconnexion nécessaire.',
        action: 'reconnect_gmail'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh token if needed
    let accessToken = tokens.accessToken;
    const tokenExpiry = gmailConfig.token_expiry ? new Date(gmailConfig.token_expiry) : null;
    
    if (!accessToken || !tokenExpiry || tokenExpiry < new Date()) {
      if (!tokens.refreshToken) {
        log('warn', 'Token expired and no refresh token');
        return new Response(JSON.stringify({
          success: false,
          code: 'TOKEN_REFRESH_FAILED',
          error: 'Impossible de rafraîchir le token. Reconnexion Gmail nécessaire.',
          action: 'reconnect_gmail'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const newToken = await refreshAccessToken(supabase, gmailConfig, tokens.refreshToken);
      if (newToken) {
        accessToken = newToken;
      } else {
        log('warn', 'Failed to refresh access token');
        return new Response(JSON.stringify({
          success: false,
          code: 'TOKEN_REFRESH_FAILED',
          error: 'Échec du rafraîchissement du token. Reconnexion Gmail nécessaire.',
          action: 'reconnect_gmail'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get emails with gmail_message_id that don't have attachments yet
    const { data: existingAttachments } = await supabase
      .from('email_attachments')
      .select('email_id');
    
    const emailsWithAttachments = new Set(existingAttachments?.map(a => a.email_id) || []);

    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('id, gmail_message_id, subject')
      .eq('user_id', user.id)
      .not('gmail_message_id', 'is', null)
      .limit(batchSize * 5);

    if (emailsError) throw emailsError;

    const emailsToProcess = (emails || []).filter(e => !emailsWithAttachments.has(e.id)).slice(0, batchSize);

    log('info', `Processing ${emailsToProcess.length} emails for attachments`);

    const results = {
      emailsProcessed: 0,
      attachmentsFound: 0,
      attachmentsDownloaded: 0,
      errors: [] as string[],
    };

    for (const email of emailsToProcess) {
      if (!email.gmail_message_id) continue;

      try {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.gmail_message_id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!msgResponse.ok) {
          results.errors.push(`Failed to fetch message ${email.gmail_message_id}`);
          continue;
        }

        const message = await msgResponse.json();
        const attachments = message.payload?.parts ? findAttachments(message.payload.parts) : [];

        results.emailsProcessed++;
        results.attachmentsFound += attachments.length;

        for (const attachment of attachments) {
          try {
            const attachmentResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.gmail_message_id}/attachments/${attachment.attachmentId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!attachmentResponse.ok) {
              log('error', `Failed to download attachment ${attachment.filename}`);
              continue;
            }

            const attachmentData = await attachmentResponse.json();
            
            const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const timestamp = Date.now();
            const safeFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `${email.id}/${timestamp}_${safeFilename}`;

            const { error: uploadError } = await supabase.storage
              .from('email-attachments')
              .upload(storagePath, bytes, {
                contentType: attachment.mimeType,
                upsert: true,
              });

            if (uploadError) {
              log('error', `Upload error for ${attachment.filename}`, { error: uploadError });
              continue;
            }

            const { error: dbError } = await supabase
              .from('email_attachments')
              .insert({
                email_id: email.id,
                filename: attachment.filename,
                mime_type: attachment.mimeType,
                size_bytes: attachment.size,
                storage_path: storagePath,
                gmail_attachment_id: attachment.attachmentId,
              });

            if (dbError) {
              log('error', `DB error for ${attachment.filename}`, { error: dbError });
            } else {
              results.attachmentsDownloaded++;
              log('info', `Downloaded: ${attachment.filename}`);
            }
          } catch (attachError) {
            log('error', `Error processing attachment ${attachment.filename}`, { error: String(attachError) });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        log('error', `Error processing email ${email.id}`, { error: String(error) });
        results.errors.push(`${email.subject}: ${error}`);
      }
    }

    log('info', 'Bulk download completed', { results });

    return new Response(JSON.stringify({
      success: true,
      downloaded: results.attachmentsDownloaded,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log('error', 'Bulk download error', { error: String(error) });
    return new Response(JSON.stringify({
      success: false,
      code: 'INTERNAL_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200, // Return 200 to prevent frontend crash
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
