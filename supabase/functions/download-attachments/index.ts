import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { emailId, messageId } = await req.json();
    
    console.log(`Downloading attachments for email ${emailId}, message ${messageId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Gmail config
    const { data: gmailConfig, error: configError } = await supabase
      .from("gmail_config")
      .select("*")
      .single();

    if (configError || !gmailConfig) {
      throw new Error("Gmail non configuré");
    }

    // Refresh token if needed
    let accessToken = gmailConfig.access_token;
    const tokenExpiry = new Date(gmailConfig.token_expiry);
    
    if (tokenExpiry <= new Date()) {
      console.log("Token expired, refreshing...");
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: gmailConfig.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.access_token) {
        accessToken = tokenData.access_token;
        await supabase
          .from("gmail_config")
          .update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          })
          .eq("id", gmailConfig.id);
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
