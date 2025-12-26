import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

interface GmailMessage {
  id: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: GmailPart[];
    mimeType?: string;
  };
}

interface GmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

function base64UrlDecode(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;
    const binaryString = atob(paddedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    console.error('Base64 decode error:', e);
    return '';
  }
}

function extractBodyFromParts(parts: GmailPart[], preferHtml = false): string {
  let textBody = '';
  let htmlBody = '';
  
  for (const part of parts) {
    if (part.parts) {
      // Nested multipart - recurse
      const nestedBody = extractBodyFromParts(part.parts, preferHtml);
      if (nestedBody) {
        if (part.mimeType?.includes('html')) {
          htmlBody = nestedBody;
        } else {
          textBody = nestedBody;
        }
      }
    }
    
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textBody = base64UrlDecode(part.body.data);
    }
    
    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody = base64UrlDecode(part.body.data);
    }
  }
  
  // Prefer text/plain, fall back to HTML (strip tags)
  if (textBody) return textBody;
  if (htmlBody) {
    return htmlBody
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  return '';
}

function extractFullBody(message: GmailMessage): string {
  const payload = message.payload;
  
  // Case 1: Simple message with body directly
  if (payload.body?.data) {
    return base64UrlDecode(payload.body.data);
  }
  
  // Case 2: Multipart message
  if (payload.parts) {
    return extractBodyFromParts(payload.parts);
  }
  
  return '';
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth credentials');
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
      console.error('Token refresh failed:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
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

    console.log(`User ${user.email} executing resync-email-bodies`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 50, forceAll = false } = await req.json().catch(() => ({}));

    // Get Gmail config
    const { data: gmailConfig, error: configError } = await supabase
      .from('gmail_config')
      .select('*')
      .single();

    if (configError || !gmailConfig) {
      throw new Error('Gmail config not found');
    }

    // Refresh token if needed
    let accessToken = gmailConfig.access_token;
    const tokenExpiry = gmailConfig.token_expiry ? new Date(gmailConfig.token_expiry) : null;
    
    if (!tokenExpiry || tokenExpiry < new Date()) {
      console.log('Refreshing access token...');
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

    // Get emails with empty bodies
    let query = supabase
      .from('emails')
      .select('id, gmail_message_id, subject')
      .not('gmail_message_id', 'is', null);
    
    if (!forceAll) {
      query = query.or('body.is.null,body.eq.');
    }
    
    const { data: emails, error: emailsError } = await query.limit(batchSize);

    if (emailsError) throw emailsError;

    console.log(`Found ${emails?.length || 0} emails to resync`);

    const results = {
      total: emails?.length || 0,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const email of emails || []) {
      if (!email.gmail_message_id) continue;

      try {
        // Fetch full message from Gmail
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.gmail_message_id}?format=full`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch message ${email.gmail_message_id}:`, errorText);
          results.failed++;
          results.errors.push(`${email.subject}: ${response.status}`);
          continue;
        }

        const message: GmailMessage = await response.json();
        const body = extractFullBody(message);

        if (body && body.length > 0) {
          const { error: updateError } = await supabase
            .from('emails')
            .update({ body, processed: false }) // Mark as unprocessed for re-analysis
            .eq('id', email.id);

          if (updateError) {
            console.error(`Failed to update email ${email.id}:`, updateError);
            results.failed++;
          } else {
            console.log(`Resynced email: ${email.subject} (${body.length} chars)`);
            results.success++;
          }
        } else {
          console.log(`No body found for email: ${email.subject}`);
          results.failed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        results.failed++;
        results.errors.push(`${email.subject}: ${error}`);
      }
    }

    console.log('Resync completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Resync error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
