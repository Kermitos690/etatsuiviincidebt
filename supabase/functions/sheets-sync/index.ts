import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Helper to get Google Sheets access token from service account
async function getServiceAccountToken(): Promise<string | null> {
  const serviceAccountJson = Deno.env.get("GOOGLE_SHEETS_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    console.log("No service account configured");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Create JWT for service account
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // Encode header and claim
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signatureInput = `${headerB64}.${claimB64}`;

    // Import private key
    const pemContent = serviceAccount.private_key
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\n/g, "");
    const binaryDer = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign the JWT
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      encoder.encode(signatureInput)
    );
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const jwt = `${signatureInput}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("Service account token exchange failed:", tokenData);
      return null;
    }

    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting service account token:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, spreadsheetId, sheetName, columnMapping, incidentId } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "get-service-account-email") {
      const serviceAccountJson = Deno.env.get("GOOGLE_SHEETS_SERVICE_ACCOUNT");
      if (!serviceAccountJson) {
        return new Response(JSON.stringify({ 
          error: "Service account not configured" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        return new Response(JSON.stringify({ 
          email: serviceAccount.client_email 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ 
          error: "Invalid service account JSON" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "get-config") {
      const { data: config, error } = await supabase
        .from("sheets_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify({ 
        config,
        connected: !!config?.spreadsheet_id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save-config") {
      const { data: existing } = await supabase
        .from("sheets_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      const configData = {
        spreadsheet_id: spreadsheetId,
        sheet_name: sheetName || "Incidents",
        column_mapping: columnMapping,
      };

      if (existing) {
        await supabase.from("sheets_config").update(configData).eq("id", existing.id);
      } else {
        await supabase.from("sheets_config").insert(configData);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "connect") {
      // Test connection to the spreadsheet
      const accessToken = await getServiceAccountToken();
      if (!accessToken) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "Service account not configured. Please add GOOGLE_SHEETS_SERVICE_ACCOUNT secret." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try to read the spreadsheet metadata
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Spreadsheet access error:", errorData);
        return new Response(JSON.stringify({ 
          success: false,
          error: `Cannot access spreadsheet: ${errorData.error?.message || "Unknown error"}. Make sure to share the spreadsheet with the service account email.` 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const spreadsheetData = await response.json();
      
      // Save config
      const { data: existing } = await supabase
        .from("sheets_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      const configData = {
        spreadsheet_id: spreadsheetId,
        sheet_name: sheetName || "Incidents",
      };

      if (existing) {
        await supabase.from("sheets_config").update(configData).eq("id", existing.id);
      } else {
        await supabase.from("sheets_config").insert(configData);
      }

      return new Response(JSON.stringify({ 
        success: true,
        title: spreadsheetData.properties?.title 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync" || action === "sync-incident") {
      const accessToken = await getServiceAccountToken();
      if (!accessToken) {
        return new Response(JSON.stringify({ 
          error: "Service account not configured" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get config
      const { data: config } = await supabase
        .from("sheets_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!config?.spreadsheet_id) {
        return new Response(JSON.stringify({ error: "Sheets not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mapping = columnMapping || config.column_mapping || {
        numero: "A", date_incident: "B", institution: "C", type: "D",
        titre: "E", gravite: "F", statut: "G", score: "H"
      };

      // Fetch incidents
      let incidentsQuery = supabase.from("incidents").select("*").order("numero", { ascending: true });
      if (incidentId) {
        incidentsQuery = incidentsQuery.eq("id", incidentId);
      }
      
      const { data: incidents, error: incError } = await incidentsQuery;
      if (incError) throw incError;

      if (!incidents || incidents.length === 0) {
        return new Response(JSON.stringify({ rowsUpdated: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prepare data for sheets - 15 columns (A to O) to match user's structure
      const values = incidents.map((inc: any) => {
        const row: string[] = new Array(15).fill("");
        const colIndex = (col: string) => col.charCodeAt(0) - 65;
        
        if (mapping.numero) row[colIndex(mapping.numero)] = String(inc.numero || "");
        if (mapping.date_creation) row[colIndex(mapping.date_creation)] = inc.date_creation ? new Date(inc.date_creation).toLocaleDateString('fr-FR') : "";
        if (mapping.date_incident) row[colIndex(mapping.date_incident)] = inc.date_incident || "";
        if (mapping.institution) row[colIndex(mapping.institution)] = inc.institution || "";
        if (mapping.type) row[colIndex(mapping.type)] = inc.type || "";
        if (mapping.gravite) row[colIndex(mapping.gravite)] = inc.gravite || "";
        if (mapping.statut) row[colIndex(mapping.statut)] = inc.statut || "";
        if (mapping.transmis_jp) row[colIndex(mapping.transmis_jp)] = inc.transmis_jp ? "Oui" : "Non";
        if (mapping.titre) row[colIndex(mapping.titre)] = inc.titre || "";
        if (mapping.faits) row[colIndex(mapping.faits)] = inc.faits || "";
        if (mapping.dysfonctionnement) row[colIndex(mapping.dysfonctionnement)] = inc.dysfonctionnement || "";
        if (mapping.preuves) row[colIndex(mapping.preuves)] = inc.preuves ? JSON.stringify(inc.preuves) : "";
        if (mapping.score) row[colIndex(mapping.score)] = String(inc.score || 0);
        if (mapping.confidence) row[colIndex(mapping.confidence)] = inc.confidence_level || "";
        
        return row;
      });

      // Write to Google Sheets - columns A to O
      const range = `${config.sheet_name || "INCIDENTS"}!A2:O${values.length + 1}`;
      const sheetsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheet_id}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values }),
        }
      );

      if (!sheetsResponse.ok) {
        const errorData = await sheetsResponse.json();
        console.error("Sheets write error:", errorData);
        throw new Error(errorData.error?.message || "Failed to write to Google Sheets");
      }

      const result = await sheetsResponse.json();
      console.log(`Updated ${result.updatedRows || values.length} rows in Google Sheets`);

      // Update last_sync
      await supabase
        .from("sheets_config")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", config.id);

      return new Response(JSON.stringify({ 
        success: true,
        rowsUpdated: result.updatedRows || values.length 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sheets sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
