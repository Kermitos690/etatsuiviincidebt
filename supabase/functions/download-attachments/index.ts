import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders, log } from "../_shared/core.ts";
import { getGmailTokens, encryptGmailTokens } from "../_shared/encryption.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

interface AttachmentInfo {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return unauthorizedResponse("Authentification requise");
    }

    const { emailId, messageId } = await req.json();
    
    console.log(`[User ${user.id}] Downloading attachments for email ${emailId}, message ${messageId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Gmail config scoped to the authenticated user
    const { data: gmailConfig, error: configError } = await supabase
      .from("gmail_config")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching Gmail config:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la récupération de la configuration Gmail" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!gmailConfig) {
      return new Response(
        JSON.stringify({ success: false, error: "Gmail non configuré pour cet utilisateur" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt tokens using the encryption module
    const tokens = await getGmailTokens({
      access_token: null, // Plaintext columns removed
      refresh_token: null,
      access_token_enc: gmailConfig.access_token_enc,
      refresh_token_enc: gmailConfig.refresh_token_enc,
      token_nonce: gmailConfig.token_nonce,
      token_key_version: gmailConfig.token_key_version,
    });

    if (!tokens.accessToken) {
      throw new Error("Tokens Gmail non disponibles ou décryptage échoué");
    }

    let accessToken = tokens.accessToken;
    const refreshToken = tokens.refreshToken;
    const tokenExpiry = new Date(gmailConfig.token_expiry);
    
    // Refresh token if needed
    if (tokenExpiry <= new Date()) {
      console.log("Token expired, refreshing...");
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      
      if (!refreshToken) {
        throw new Error("Refresh token non disponible pour le renouvellement");
      }
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.access_token) {
        accessToken = tokenData.access_token;
        
        // Re-encrypt the new access token
        const encrypted = await encryptGmailTokens(accessToken, refreshToken);
        
        await supabase
          .from("gmail_config")
          .update({
            access_token_enc: encrypted.accessTokenEnc,
            refresh_token_enc: encrypted.refreshTokenEnc,
            token_nonce: encrypted.nonce,
            token_key_version: encrypted.keyVersion,
            token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          })
          .eq("id", gmailConfig.id);
          
        console.log("Token refreshed and re-encrypted successfully");
      } else {
        throw new Error("Échec du renouvellement du token");
      }
    }

    // Get message details with attachments
    const messageResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!messageResponse.ok) {
      throw new Error(`Failed to fetch message: ${messageResponse.status}`);
    }

    const messageData = await messageResponse.json();
    const attachments: AttachmentInfo[] = [];

    // Find attachments in the message parts
    const findAttachments = (parts: any[]) => {
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
          findAttachments(part.parts);
        }
      }
    };

    if (messageData.payload?.parts) {
      findAttachments(messageData.payload.parts);
    }

    console.log(`Found ${attachments.length} attachments`);

    const downloadedAttachments = [];

    for (const attachment of attachments) {
      try {
        // Download attachment data
        const attachmentResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachment.attachmentId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!attachmentResponse.ok) {
          console.error(`Failed to download attachment: ${attachment.filename}`);
          continue;
        }

        const attachmentData = await attachmentResponse.json();
        
        // Decode base64url to binary
        const base64Data = attachmentData.data
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Generate storage path
        const timestamp = Date.now();
        const sanitizedFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${emailId}/${timestamp}_${sanitizedFilename}`;

        // Upload to Supabase Storage
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

        // Save attachment metadata
        const { data: savedAttachment, error: saveError } = await supabase
          .from("email_attachments")
          .insert({
            email_id: emailId,
            filename: attachment.filename,
            mime_type: attachment.mimeType,
            size_bytes: attachment.size,
            storage_path: storagePath,
            gmail_attachment_id: attachment.attachmentId,
          })
          .select()
          .single();

        if (saveError) {
          console.error(`Failed to save metadata for ${attachment.filename}:`, saveError);
          continue;
        }

        downloadedAttachments.push(savedAttachment);
        console.log(`Successfully downloaded: ${attachment.filename}`);
      } catch (error) {
        console.error(`Error processing attachment ${attachment.filename}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        downloaded: downloadedAttachments.length,
        attachments: downloadedAttachments,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Download attachments error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
