import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";
import { encryptGmailTokens, isEncryptionConfigured, getGmailTokens } from "../_shared/encryption.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use project URL for redirect
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/gmail-oauth`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Handle OAuth callback (GET request with code parameter)
    // Note: OAuth callbacks cannot have auth headers, so we use state parameter for security
    if (req.method === "GET" && url.searchParams.has("code")) {
      const code = url.searchParams.get("code")!;
      const state = url.searchParams.get("state");
      
      console.log("Received OAuth callback with code");

      // Validate state parameter to prevent CSRF attacks
      if (!state) {
        console.error("OAuth callback missing state parameter - potential CSRF attack");
        return new Response("Invalid OAuth request: missing state", { 
          status: 400,
          headers: { "Content-Type": "text/plain" }
        });
      }

      // Decode and validate state (contains user_id and timestamp)
      let stateData: { user_id: string; timestamp: number };
      try {
        stateData = JSON.parse(atob(state));
        
        // Check state is not too old (15 minutes max)
        const stateAge = Date.now() - stateData.timestamp;
        if (stateAge > 15 * 60 * 1000) {
          throw new Error("State expired");
        }
        
        if (!stateData.user_id) {
          throw new Error("Invalid state: missing user_id");
        }
      } catch (e) {
        console.error("Invalid OAuth state:", e);
        return new Response("Invalid OAuth request: corrupted state", { 
          status: 400,
          headers: { "Content-Type": "text/plain" }
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log("Token exchange response status:", tokenResponse.status);

      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", tokenData);
        throw new Error(tokenData.error_description || "Token exchange failed");
      }

      // Get user email from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoResponse.json();
      const userEmail = userInfo.email;
      console.log("Gmail connected for user:", stateData.user_id, "email:", userEmail);

      // Calculate token expiry
      const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Store tokens - encrypted if encryption is configured, otherwise plaintext
      let upsertData: any = {
        user_id: stateData.user_id,
        user_email: userEmail,
        token_expiry: tokenExpiry,
      };

      if (isEncryptionConfigured()) {
        try {
          const encrypted = await encryptGmailTokens(
            tokenData.access_token,
            tokenData.refresh_token || null
          );
          upsertData = {
            ...upsertData,
            access_token_enc: encrypted.accessTokenEnc,
            refresh_token_enc: encrypted.refreshTokenEnc,
            token_nonce: encrypted.nonce,
            token_key_version: encrypted.keyVersion,
            access_token: null, // Clear plaintext
            refresh_token: null, // Clear plaintext
          };
          console.log("Tokens will be stored encrypted (key version", encrypted.keyVersion, ")");
        } catch (encError) {
          console.error("Encryption failed, falling back to plaintext:", encError);
          upsertData = {
            ...upsertData,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
          };
        }
      } else {
        // Fallback to plaintext storage
        upsertData = {
          ...upsertData,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
        };
        console.log("Encryption not configured - storing tokens in plaintext");
      }

      const { error: upsertError } = await supabase
        .from("gmail_config")
        .upsert(upsertData, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Failed to store tokens:", upsertError);
        throw new Error("Failed to store OAuth tokens");
      }

      console.log("Tokens stored successfully for user:", stateData.user_id);

      // Get the app URL for redirect
      const appUrl = Deno.env.get("SITE_URL") || "https://68b94080-8702-44ad-92ac-e956f60a1e94.lovableproject.com";
      const redirectUrl = `${appUrl}/gmail-config?connected=true&email=${encodeURIComponent(userEmail)}`;
      
      // Return HTML that handles both mobile and desktop
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <title>Gmail Connected</title>
</head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'gmail-oauth-callback',
        success: true,
        email: '${userEmail}'
      }, '*');
      window.close();
    } else {
      window.location.replace('${redirectUrl}');
    }
  </script>
  <p>Connexion réussie! <a href="${redirectUrl}">Cliquez ici si vous n'êtes pas redirigé</a></p>
</body>
</html>`;
      return new Response(html, {
        headers: { 
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
      });
    }

    // Handle POST requests for actions - REQUIRE AUTHENTICATION
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user authentication for all POST actions
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error("Authentication failed for gmail-oauth POST:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    if (!body) {
      return new Response(JSON.stringify({ error: "Request body is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = JSON.parse(body);

    if (action === "get-auth-url") {
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" ");

      // Generate state parameter with user ID and timestamp for CSRF protection
      const state = btoa(JSON.stringify({
        user_id: user.id,
        timestamp: Date.now()
      }));

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(state)}`;

      console.log("Generated auth URL for user:", user.id);
      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-config") {
      // Get the stored configuration FOR THIS USER ONLY
      const { data: configData, error: configError } = await supabase
        .from("gmail_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (configError) {
        console.error("Failed to fetch config for user:", user.id, configError);
        throw new Error("Failed to fetch config");
      }

      return new Response(JSON.stringify({ 
        config: configData,
        connected: !!configData?.access_token
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-config") {
      const parsedBody = JSON.parse(body);
      const { domains, keywords, syncEnabled } = parsedBody;

      // Update only the current user's config
      const { data: existingConfig } = await supabase
        .from("gmail_config")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingConfig) {
        const { error } = await supabase
          .from("gmail_config")
          .update({ 
            domains: domains || [],
            keywords: keywords || [],
            sync_enabled: syncEnabled || false
          })
          .eq("id", existingConfig.id)
          .eq("user_id", user.id); // Extra safety check

        if (error) throw error;
      } else {
        return new Response(JSON.stringify({ error: "No Gmail config found for this user" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Config updated for user:", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "refresh-token") {
      // Get stored config FOR THIS USER ONLY
      const { data: config, error: configError } = await supabase
        .from("gmail_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (configError || !config) {
        throw new Error("No Gmail config available");
      }

      // Get refresh token (decrypted if encrypted)
      const tokens = await getGmailTokens(config);
      if (!tokens.refreshToken) {
        throw new Error("No refresh token available");
      }

      // Refresh the token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: tokens.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || "Token refresh failed");
      }

      // Update stored token - encrypted if encryption is configured
      const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      if (isEncryptionConfigured()) {
        try {
          const encrypted = await encryptGmailTokens(tokenData.access_token, tokens.refreshToken);
          await supabase
            .from("gmail_config")
            .update({ 
              access_token_enc: encrypted.accessTokenEnc,
              refresh_token_enc: encrypted.refreshTokenEnc,
              token_nonce: encrypted.nonce,
              token_key_version: encrypted.keyVersion,
              access_token: null,
              refresh_token: null,
              token_expiry: tokenExpiry
            })
            .eq("id", config.id)
            .eq("user_id", user.id);
          console.log("Token refreshed and stored encrypted");
        } catch (encError) {
          console.error("Encryption failed, storing plaintext:", encError);
          await supabase
            .from("gmail_config")
            .update({ 
              access_token: tokenData.access_token,
              token_expiry: tokenExpiry
            })
            .eq("id", config.id)
            .eq("user_id", user.id);
        }
      } else {
        await supabase
          .from("gmail_config")
          .update({ 
            access_token: tokenData.access_token,
            token_expiry: tokenExpiry
          })
          .eq("id", config.id)
          .eq("user_id", user.id);
      }

      console.log("Token refreshed for user:", user.id);
      return new Response(JSON.stringify({ 
        success: true,
        access_token: tokenData.access_token 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gmail OAuth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});