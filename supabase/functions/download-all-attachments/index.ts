import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

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

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) return null;
  
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
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return unauthorizedResponse(authError || 'Non autorisé');
    }

    console.log(`User ${user.email} executing download-all-attachments`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 20 } = await req.json().catch(() => ({}));

    console.log('Starting bulk attachment download...');

    // Get Gmail config - scoped to authenticated user
    const { data: gmailConfig, error: configError } = await supabase
      .from('gmail_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (configError || !gmailConfig) {
      throw new Error('Gmail config not found');
    }

    // Refresh token if needed
    let accessToken = gmailConfig.access_token;
    const tokenExpiry = gmailConfig.token_expiry ? new Date(gmailConfig.token_expiry) : null;
    
    if (!tokenExpiry || tokenExpiry < new Date()) {
      const newToken = await refreshAccessToken(gmailConfig.refresh_token);
      if (newToken) {
        accessToken = newToken;
        await supabase
          .from('gmail_config')
          .update({
            access_token: newToken,
            token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          })
          .eq('id', gmailConfig.id);
      } else {
        throw new Error('Failed to refresh access token');
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
      .not('gmail_message_id', 'is', null)
      .limit(batchSize * 5); // Get more to filter

    if (emailsError) throw emailsError;

    const emailsToProcess = (emails || []).filter(e => !emailsWithAttachments.has(e.id)).slice(0, batchSize);

    console.log(`Processing ${emailsToProcess.length} emails for attachments`);

    const results = {
      emailsProcessed: 0,
      attachmentsFound: 0,
      attachmentsDownloaded: 0,
      errors: [] as string[],
    };

    for (const email of emailsToProcess) {
      if (!email.gmail_message_id) continue;

      try {
        // Fetch message to get attachment info
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
            // Download attachment
            const attachmentResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.gmail_message_id}/attachments/${attachment.attachmentId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!attachmentResponse.ok) {
              console.error(`Failed to download attachment ${attachment.filename}`);
              continue;
            }

            const attachmentData = await attachmentResponse.json();
            
            // Decode base64
            const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Generate unique filename
            const timestamp = Date.now();
            const safeFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `${email.id}/${timestamp}_${safeFilename}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('email-attachments')
              .upload(storagePath, bytes, {
                contentType: attachment.mimeType,
                upsert: true,
              });

            if (uploadError) {
              console.error(`Upload error for ${attachment.filename}:`, uploadError);
              continue;
            }

            // Save to database
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
              console.error(`DB error for ${attachment.filename}:`, dbError);
            } else {
              results.attachmentsDownloaded++;
              console.log(`Downloaded: ${attachment.filename} for email ${email.subject}`);
            }
          } catch (attachError) {
            console.error(`Error processing attachment ${attachment.filename}:`, attachError);
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        results.errors.push(`${email.subject}: ${error}`);
      }
    }

    console.log('Bulk download completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bulk download error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
