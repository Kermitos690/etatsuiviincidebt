import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * OAuth callback handler for Google Sign-In.
 * Stores Gmail tokens from the OAuth session and redirects to the app.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("Connexion en cours...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session - Supabase handles the OAuth code exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("Session error:", sessionError);
          setStatus("Erreur de connexion");
          setTimeout(() => navigate("/auth", { replace: true }), 2000);
          return;
        }

        // Extract Gmail tokens from provider_token and provider_refresh_token
        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;

        if (providerToken) {
          setStatus("Configuration Gmail...");

          // Store Gmail tokens via edge function
          const { error: storeError } = await supabase.functions.invoke("gmail-oauth", {
            body: {
              action: "store-oauth-tokens",
              accessToken: providerToken,
              refreshToken: providerRefreshToken,
            },
          });

          if (storeError) {
            console.error("Failed to store Gmail tokens:", storeError);
            // Continue anyway - user is authenticated
          } else {
            console.log("Gmail tokens stored successfully");
          }
        }

        setStatus("Redirection...");
        navigate("/", { replace: true });
      } catch (error) {
        console.error("Callback error:", error);
        setStatus("Erreur inattendue");
        setTimeout(() => navigate("/auth", { replace: true }), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </main>
  );
}
