import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, getCorsHeaders } from "../_shared/auth.ts";
import { encryptGmailTokens, isEncryptionConfigured, getGmailTokens } from "../_shared/encryption.ts";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use project URL for redirect
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/gmail-oauth`;

serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  const url = new URL(req.url);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Handle OAuth callback (GET request with code or error parameter)
    // Note: OAuth callbacks cannot have auth headers, so we use state parameter for security
    
    // Handle OAuth errors (user denied, access_denied, etc.)
    if (req.method === "GET" && url.searchParams.has("error")) {
      const errorCode = url.searchParams.get("error") || "unknown_error";
      const errorDescription = url.searchParams.get("error_description") || "Google a refusé l'accès";
      console.error("OAuth error callback:", errorCode, errorDescription);
      
      const appUrl = Deno.env.get("SITE_URL") || "https://68b94080-8702-44ad-92ac-e956f60a1e94.lovableproject.com";
      const redirectUrl = `${appUrl}/gmail-config?connected=false&error=${encodeURIComponent(errorCode)}&reason=${encodeURIComponent(errorDescription)}`;
      
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="2;url=${redirectUrl}">
  <title>Erreur de connexion Gmail</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .container { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
    .error { color: #dc2626; font-size: 1.25rem; margin-bottom: 1rem; }
    .details { color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; }
    .hint { background: #fef3c7; padding: 1rem; border-radius: 8px; font-size: 0.85rem; color: #92400e; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <p class="error">❌ Connexion refusée</p>
    <p class="details">${errorDescription}</p>
    <div class="hint">
      <strong>Causes possibles:</strong><br>
      • Vous avez annulé l'autorisation<br>
      • L'application n'est pas encore approuvée par Google<br>
      • Votre compte n'est pas dans les "Utilisateurs test"
    </div>
    <p style="margin-top: 1rem;"><a href="${redirectUrl}">Retourner à la configuration</a></p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'gmail-oauth-callback',
        success: false,
        error: '${errorCode}',
        errorDescription: '${errorDescription}'
      }, '*');
      window.close();
    }
  </script>
</body>
</html>`;
      return new Response(html, {
        headers: { 
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
      });
    }
    
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

      // Store tokens encrypted (required)
      if (!isEncryptionConfigured()) {
        console.error("Encryption key missing - cannot store Gmail tokens");
        throw new Error("Configuration serveur incomplète (clé de chiffrement manquante)");
      }

      const encrypted = await encryptGmailTokens(
        tokenData.access_token,
        tokenData.refresh_token || null
      );

      const upsertData: any = {
        user_id: stateData.user_id,
        user_email: userEmail,
        token_expiry: tokenExpiry,
        access_token_enc: encrypted.accessTokenEnc,
        refresh_token_enc: encrypted.refreshTokenEnc,
        token_nonce: encrypted.nonce,
        token_key_version: encrypted.keyVersion,
      };

      console.log("Tokens will be stored encrypted (key version", encrypted.keyVersion, ")");

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
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Verify user authentication for all POST actions
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error("Authentication failed for gmail-oauth POST:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    if (!body) {
      return new Response(JSON.stringify({ error: "Request body is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { action } = JSON.parse(body);

    if (action === "get-auth-url") {
      // Use openid + email + profile scopes for better Google compatibility
      const scopes = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
      ].join(" ");

      // Generate state parameter with user ID and timestamp for CSRF protection
      const state = btoa(
        JSON.stringify({
          user_id: user.id,
          timestamp: Date.now(),
        })
      );

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(state)}`;

      console.log("Generated auth URL for user:", user.id);
      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    
    // Diagnostic action - returns info to help debug OAuth issues
    if (action === "diagnose") {
      const diagnosticInfo = {
        redirect_uri: REDIRECT_URI,
        client_id_configured: !!GOOGLE_CLIENT_ID,
        client_id_prefix: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 20) + "..." : null,
        client_secret_configured: !!GOOGLE_CLIENT_SECRET,
        supabase_url: SUPABASE_URL,
        encryption_configured: isEncryptionConfigured(),
        instructions: [
          "1. Vérifiez que votre app OAuth est en mode 'Externe' (pas 'Interne')",
          "2. Si en mode 'Test', ajoutez votre email dans 'Utilisateurs test'",
          "3. Ajoutez l'origine JavaScript autorisée dans Google Cloud Console",
          "4. Vérifiez que l'URI de redirection est correct: " + REDIRECT_URI,
        ],
      };
      
      console.log("Diagnostic requested by user:", user.id);
      return new Response(JSON.stringify(diagnosticInfo), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "get-config") {
      // SECURITY: Never return OAuth tokens (plaintext or encrypted) to the client.
      // We only return non-sensitive configuration fields + a boolean connected flag.

      const { data: configDataRaw, error: configError } = await supabase
        .from("gmail_config")
        .select(
          "id,user_email,last_sync,sync_enabled,domains,keywords,token_expiry,access_token_enc,token_nonce,token_key_version"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (configError) {
        console.error("Failed to fetch config for user:", user.id, configError);
        return new Response(
          JSON.stringify({
            config: null,
            connected: false,
            success: false,
            code: "CONFIG_ERROR",
            error: "Failed to fetch config",
          }),
          {
            status: 200,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      const connected = !!(configDataRaw?.access_token_enc && configDataRaw?.token_nonce);

      const safeConfig = configDataRaw
        ? {
            id: configDataRaw.id,
            user_email: configDataRaw.user_email,
            last_sync: configDataRaw.last_sync,
            sync_enabled: configDataRaw.sync_enabled,
            domains: configDataRaw.domains,
            keywords: configDataRaw.keywords,
            token_expiry: configDataRaw.token_expiry,
          }
        : null;

      return new Response(
        JSON.stringify({
          config: safeConfig,
          connected,
        }),
        {
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
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
            sync_enabled: syncEnabled || false,
          })
          .eq("id", existingConfig.id)
          .eq("user_id", user.id); // Extra safety check

        if (error) throw error;
      } else {
        return new Response(JSON.stringify({ error: "No Gmail config found for this user" }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      console.log("Config updated for user:", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
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

      if (!isEncryptionConfigured()) {
        throw new Error("Configuration serveur incomplète (clé de chiffrement manquante)");
      }

      // SECURITY: If encryption is configured, never fall back to plaintext storage.
      const encrypted = await encryptGmailTokens(tokenData.access_token, tokens.refreshToken);

      const { error: updateError } = await supabase
        .from("gmail_config")
        .update({
          access_token_enc: encrypted.accessTokenEnc,
          refresh_token_enc: encrypted.refreshTokenEnc,
          token_nonce: encrypted.nonce,
          token_key_version: encrypted.keyVersion,
          token_expiry: tokenExpiry,
        })
        .eq("id", config.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      console.log("Token refreshed and stored encrypted");

      console.log("Token refreshed for user:", user.id);
      return new Response(
        JSON.stringify({
          success: true,
        }),
        {
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gmail OAuth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message, code: "INTERNAL_ERROR" }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});