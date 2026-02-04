import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";
import { encryptGmailTokens, isEncryptionConfigured, getGmailTokens } from "../_shared/encryption.ts";
import { getGoogleCredentials } from "../_shared/googleCredentials.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use project URL for redirect
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/gmail-oauth`;

serve(async (req) => {
  // Fully permissive CORS headers to avoid browser preflight issues
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, Accept",
    "Access-Control-Max-Age": "86400",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(req.url);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ===== ULTRA-VERBOSE LOGGING FOR ALL GET REQUESTS =====
    if (req.method === "GET") {
      const allParams = Object.fromEntries(url.searchParams.entries());
      console.log("======= GMAIL-OAUTH GET REQUEST =======");
      console.log("Full URL:", req.url);
      console.log("Search params:", JSON.stringify(allParams));
      console.log("Has 'code':", url.searchParams.has("code"));
      console.log("Has 'error':", url.searchParams.has("error"));
      console.log("Has 'state':", url.searchParams.has("state"));
      console.log("========================================");
    }

    // Handle OAuth ERROR callback (GET request with error parameter)
    // Google returns error=access_denied when user denies consent OR app is in "Testing" mode without test user.
    // NOTE: Google usually returns the `state` parameter even on error; we use it to redirect back to the right app URL.
    if (req.method === "GET" && url.searchParams.has("error")) {
      const error = url.searchParams.get("error") || "unknown_error";
      const errorDescription = url.searchParams.get("error_description") || "";
      const state = url.searchParams.get("state");

      console.error("🔴 OAuth callback received ERROR:", error);
      console.error("Error description:", errorDescription);
      console.error("State param:", state);

      // Determine user-friendly message based on error type
      let userMessage = "Erreur lors de la connexion Gmail";
      let suggestion = "";

      if (error === "access_denied") {
        userMessage = "Accès refusé par Google";
        suggestion =
          "Si l'app est 'En test', ajoutez votre email dans les 'Utilisateurs de test' dans Google Cloud Console";
      } else if (error === "invalid_client") {
        userMessage = "Client OAuth invalide";
        suggestion = "Vérifiez la configuration des identifiants dans Google Cloud Console";
      } else if (error === "redirect_uri_mismatch") {
        userMessage = "URI de redirection non autorisée";
        suggestion = "Ajoutez l'URI de redirection dans Google Cloud Console";
      }

      // Try to recover appUrl from `state` (best effort)
      let appUrlFromState: string | null = null;
      if (state) {
        try {
          const parsed = JSON.parse(atob(state));
          if (typeof parsed?.app_url === "string" && parsed.app_url.startsWith("http")) {
            appUrlFromState = parsed.app_url;
          }
        } catch (_e) {
          // ignore
        }
      }

      // Fallback to configured SITE_URL; last resort is a safe default
      const appUrl =
        appUrlFromState ||
        Deno.env.get("SITE_URL") ||
        "https://68b94080-8702-44ad-92ac-e956f60a1e94.lovableproject.com";

      const redirectUrl = `${appUrl}/gmail-config?oauth_error=${encodeURIComponent(error)}&error_message=${encodeURIComponent(userMessage)}&error_suggestion=${encodeURIComponent(suggestion)}&error_description=${encodeURIComponent(errorDescription)}`;

      // Return HTML that redirects back to app with error info
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <title>Erreur Gmail OAuth</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a1a2e; color: #eee; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    h1 { color: #ef4444; font-size: 1.5rem; }
    p { color: #aaa; margin: 1rem 0; }
    a { color: #60a5fa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️ ${userMessage}</h1>
    <p>${suggestion}</p>
    <p><a href="${redirectUrl}">Retour à l'application →</a></p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'gmail-oauth-callback',
        success: false,
        error: '${error}',
        errorMessage: '${userMessage.replace(/'/g, "\\'")}',
        errorSuggestion: '${suggestion.replace(/'/g, "\\'")}'
      }, '*');
      window.close();
    } else {
      window.location.replace('${redirectUrl}');
    }
  </script>
</body>
</html>`;
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Handle OAuth SUCCESS callback (GET request with code parameter)
    // Note: OAuth callbacks cannot have auth headers, so we use state parameter for security
    if (req.method === "GET" && url.searchParams.has("code")) {
      const code = url.searchParams.get("code")!;
      const state = url.searchParams.get("state");
      
      console.log("🟢 Received OAuth callback with code!");
      console.log("Code length:", code.length);
      console.log("State present:", !!state);

      // Validate state parameter to prevent CSRF attacks
      if (!state) {
        console.error("OAuth callback missing state parameter - potential CSRF attack");
        return new Response("Invalid OAuth request: missing state", { 
          status: 400,
          headers: { "Content-Type": "text/plain" }
        });
      }

      // Decode and validate state (contains user_id, timestamp, and optional app_url)
      type OAuthState = { user_id: string; timestamp: number; app_url?: string };
      let stateData: OAuthState;
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
          headers: { "Content-Type": "text/plain" },
        });
      }

      // Get validated credentials
      const { credentials: creds, error: credsError } = getGoogleCredentials();
      if (!creds) {
        console.error("Invalid Google credentials during token exchange:", credsError);
        throw new Error("Configuration serveur incomplète (identifiants Google invalides)");
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
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

      console.log("🔑 Attempting to upsert tokens for user:", stateData.user_id);
      
      const { error: upsertError } = await supabase
        .from("gmail_config")
        .upsert(upsertData, { onConflict: "user_id" });

      if (upsertError) {
        console.error("❌ Failed to store tokens:", upsertError);
        console.error("Upsert error details:", JSON.stringify(upsertError));
        throw new Error("Failed to store OAuth tokens");
      }

      console.log("✅ Tokens stored successfully for user:", stateData.user_id);
      console.log("User email:", userEmail);

      // Get the app URL for redirect (prefer the origin captured in state)
      const appUrlFromState =
        typeof stateData.app_url === "string" && stateData.app_url.startsWith("http")
          ? stateData.app_url
          : null;

      const appUrl =
        appUrlFromState ||
        Deno.env.get("SITE_URL") ||
        "https://68b94080-8702-44ad-92ac-e956f60a1e94.lovableproject.com";

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

    // Handle POST requests for actions
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
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

    // PUBLIC ACTION: diagnose - check configuration without authentication
    if (action === "diagnose") {
      const { credentials, clientIdValidation, clientSecretValidation } = getGoogleCredentials();
      const encryptionKeyConfigured = isEncryptionConfigured();
      
      const clientIdConfigured = clientIdValidation.isValid;
      const clientSecretConfigured = clientSecretValidation.isValid;
      
      const diagnosticResult = {
        success: true,
        redirectUri: REDIRECT_URI,
        supabaseUrl: SUPABASE_URL,
        secrets: {
          GOOGLE_CLIENT_ID: clientIdConfigured ? "✅ Configuré" : `❌ ${clientIdValidation.message || "Manquant"}`,
          GOOGLE_CLIENT_SECRET: clientSecretConfigured ? "✅ Configuré" : `❌ ${clientSecretValidation.message || "Manquant"}`,
          GMAIL_TOKEN_ENCRYPTION_KEY: encryptionKeyConfigured ? "✅ Configuré" : "❌ Manquant",
        },
        // NEW: Detailed validation hints for debugging
        validation: {
          clientIdLooksValid: clientIdConfigured,
          clientIdHint: clientIdValidation.hint,
          clientSecretLooksValid: clientSecretConfigured,
          clientSecretHint: clientSecretValidation.hint,
        },
        allSecretsOk: clientIdConfigured && clientSecretConfigured && encryptionKeyConfigured,
        instructions: {
          step1: "Aller dans Google Cloud Console → API & Services → Identifiants",
          step2: "Sélectionner ton Client OAuth 2.0 (type: Application Web)",
          step3_origins: "Ajouter l'origine JavaScript autorisée (voir 'requiredOrigin' ci-dessous)",
          step4_redirect: `Ajouter l'URI de redirection: ${REDIRECT_URI}`,
          step5_test_users: "Si l'app est 'En test', ajouter ton email dans 'Utilisateurs de test' (Écran de consentement OAuth)",
          fix_json_secret: clientIdValidation.hint === "looks_like_json" || clientSecretValidation.hint === "looks_like_json" 
            ? "⚠️ Il semble que tu as copié tout le fichier JSON. Copie uniquement la valeur client_id ou client_secret, pas tout le fichier." 
            : undefined,
        },
        googleCloudLinks: {
          credentials: "https://console.cloud.google.com/apis/credentials",
          consentScreen: "https://console.cloud.google.com/apis/credentials/consent",
        },
      };

      console.log("Diagnostic check performed - validation:", diagnosticResult.validation);
      
      return new Response(JSON.stringify(diagnosticResult), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // All other actions REQUIRE AUTHENTICATION
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error("Authentication failed for gmail-oauth POST:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "get-auth-url") {
      // Validate credentials BEFORE generating URL
      const { credentials: creds, error: credsError, clientIdValidation, clientSecretValidation } = getGoogleCredentials();
      
      if (!creds) {
        console.error("Invalid Google credentials for get-auth-url:", credsError);
        // Return structured error so frontend can display helpful message
        return new Response(JSON.stringify({ 
          success: false, 
          code: "CONFIG_ERROR",
          message: "Identifiants Google invalides",
          details: credsError,
          suggestion: clientIdValidation.hint === "looks_like_json" || clientSecretValidation.hint === "looks_like_json"
            ? "Il semble que tu as collé tout le fichier JSON. Copie uniquement la valeur client_id (ex: 1234567890-xxxx.apps.googleusercontent.com), pas tout le contenu du fichier."
            : "Vérifie que GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont correctement configurés dans les secrets.",
          validation: {
            clientIdHint: clientIdValidation.hint,
            clientSecretHint: clientSecretValidation.hint,
          }
        }), {
          status: 200, // Return 200 to avoid network errors, let frontend handle the error
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" ");

      // Generate state parameter with user ID + timestamp for CSRF protection,
      // and capture the app origin so the callback can redirect back reliably.
      const originHeader = req.headers.get("origin") ?? "";
      let appUrlForState = originHeader;

      if (!appUrlForState) {
        const referer = req.headers.get("referer");
        if (referer) {
          try {
            appUrlForState = new URL(referer).origin;
          } catch (_e) {
            // ignore
          }
        }
      }

      const state = btoa(
        JSON.stringify({
          user_id: user.id,
          timestamp: Date.now(),
          app_url: appUrlForState || undefined,
        })
      );

      // CRITICAL: Use encodeURIComponent for ALL parameters to prevent URL injection
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(creds.clientId)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(state)}`;

      console.log(
        "Generated auth URL for user:",
        user.id,
        "email:",
        user.email ?? "(unknown)",
        "app_origin:",
        appUrlForState || "(missing)"
      );
      return new Response(JSON.stringify({ success: true, url: authUrl }), {
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

      // Get validated credentials
      const { credentials: creds, error: credsError } = getGoogleCredentials();
      if (!creds) {
        console.error("Invalid Google credentials during token refresh:", credsError);
        throw new Error("Configuration serveur incomplète (identifiants Google invalides)");
      }

      // Refresh the token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
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

    // NEW ACTION: Store OAuth tokens from Google Sign-In callback
    if (action === "store-oauth-tokens") {
      const parsedBody = JSON.parse(body);
      const { accessToken, refreshToken } = parsedBody;

      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Missing access token" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Get user email from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userInfoResponse.ok) {
        console.error("Failed to get user info:", await userInfoResponse.text());
        return new Response(JSON.stringify({ error: "Failed to get user info from Google" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const userInfo = await userInfoResponse.json();
      const userEmail = userInfo.email;

      console.log("Storing Gmail tokens from Google Sign-In for user:", user.id, "email:", userEmail);

      // Encrypt and store tokens
      if (!isEncryptionConfigured()) {
        console.error("Encryption key missing - cannot store Gmail tokens");
        return new Response(JSON.stringify({ error: "Server configuration incomplete" }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const encrypted = await encryptGmailTokens(accessToken, refreshToken || null);

      // Calculate token expiry (Google tokens typically expire in 1 hour)
      const tokenExpiry = new Date(Date.now() + 3600 * 1000).toISOString();

      const upsertData: any = {
        user_id: user.id,
        user_email: userEmail,
        token_expiry: tokenExpiry,
        access_token_enc: encrypted.accessTokenEnc,
        refresh_token_enc: encrypted.refreshTokenEnc,
        token_nonce: encrypted.nonce,
        token_key_version: encrypted.keyVersion,
        sync_enabled: true, // Auto-enable sync when using unified flow
      };

      const { error: upsertError } = await supabase
        .from("gmail_config")
        .upsert(upsertData, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Failed to store Gmail tokens:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to store tokens" }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      console.log("Gmail tokens stored successfully from Google Sign-In for user:", user.id);

      return new Response(
        JSON.stringify({ success: true, email: userEmail }),
        { headers: { ...cors, "Content-Type": "application/json" } }
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