import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (req.method === "GET" && url.searchParams.has("code")) {
      const code = url.searchParams.get("code")!;
      console.log("Received OAuth callback with code");

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
      console.log("User email:", userEmail);

      // Calculate token expiry
      const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Store tokens in gmail_config table
      const { error: upsertError } = await supabase
        .from("gmail_config")
        .upsert({
          user_email: userEmail,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expiry: tokenExpiry,
        }, { onConflict: "user_email" });

      if (upsertError) {
        console.error("Failed to store tokens:", upsertError);
        throw new Error("Failed to store OAuth tokens");
      }

      console.log("Tokens stored successfully for:", userEmail);

      // Return HTML that sends message to parent window
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Gmail Connected</title></head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'gmail-oauth-callback',
              success: true,
              email: '${userEmail}'
            }, '*');
            window.close();
          </script>
          <p>Connexion réussie! Cette fenêtre va se fermer...</p>
        </body>
        </html>
      `;
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Handle POST requests for actions
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
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

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent`;

      console.log("Generated auth URL with redirect:", REDIRECT_URI);
      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-config") {
      // Get the stored configuration
      const { data: configData, error: configError } = await supabase
        .from("gmail_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (configError) {
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

      const { data: existingConfig } = await supabase
        .from("gmail_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existingConfig) {
        const { error } = await supabase
          .from("gmail_config")
          .update({ 
            domains: domains || [],
            keywords: keywords || [],
            sync_enabled: syncEnabled || false
          })
          .eq("id", existingConfig.id);

        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "refresh-token") {
      // Get stored config
      const { data: config, error: configError } = await supabase
        .from("gmail_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (configError || !config?.refresh_token) {
        throw new Error("No refresh token available");
      }

      // Refresh the token
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
        throw new Error(tokenData.error_description || "Token refresh failed");
      }

      // Update stored token
      const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      await supabase
        .from("gmail_config")
        .update({ 
          access_token: tokenData.access_token,
          token_expiry: tokenExpiry
        })
        .eq("id", config.id);

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
