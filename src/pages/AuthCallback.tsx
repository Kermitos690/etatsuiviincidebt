import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallbackStatus = 
  | "loading" 
  | "gmail-config" 
  | "success" 
  | "error" 
  | "no-gmail-token";

/**
 * OAuth callback handler for Google Sign-In.
 * Stores Gmail tokens from the OAuth session and redirects to the app.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session - Supabase handles the OAuth code exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setErrorMessage(sessionError.message);
          setStatus("error");
          return;
        }

        if (!session) {
          console.error("No session found");
          setErrorMessage("Aucune session trouvée. Veuillez réessayer.");
          setStatus("error");
          return;
        }

        // Extract Gmail tokens from provider_token and provider_refresh_token
        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;

        if (!providerToken) {
          // User is authenticated but no Gmail token - this is OK, just continue
          console.log("No provider token - user authenticated without Gmail scope");
          setStatus("no-gmail-token");
          return;
        }

        setStatus("gmail-config");

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
          // Don't fail - user is authenticated, Gmail can be configured later
          setErrorMessage("Gmail non configuré - vous pourrez le configurer plus tard.");
        } else {
          console.log("Gmail tokens stored successfully");
        }

        setStatus("success");
      } catch (error) {
        console.error("Callback error:", error);
        setErrorMessage(error instanceof Error ? error.message : "Erreur inattendue");
        setStatus("error");
      }
    };

    handleCallback();
  }, []);

  // Auto-redirect countdown for success/no-gmail-token states
  useEffect(() => {
    if (status === "success" || status === "no-gmail-token") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/", { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, navigate]);

  const handleRetry = () => {
    navigate("/auth", { replace: true });
  };

  const handleContinue = () => {
    navigate("/", { replace: true });
  };

  const getStatusContent = () => {
    switch (status) {
      case "loading":
        return (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Connexion en cours...</p>
          </>
        );
      case "gmail-config":
        return (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Configuration Gmail...</p>
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
            <p className="text-green-600 font-medium">Connexion réussie !</p>
            {errorMessage && (
              <p className="text-yellow-600 text-sm">{errorMessage}</p>
            )}
            <p className="text-muted-foreground text-sm">
              Redirection dans {countdown}s...
            </p>
            <Button onClick={handleContinue} variant="outline" size="sm">
              Continuer maintenant
            </Button>
          </>
        );
      case "no-gmail-token":
        return (
          <>
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
            <p className="text-green-600 font-medium">Connexion réussie !</p>
            <p className="text-muted-foreground text-sm">
              Gmail non configuré - vous pourrez le configurer dans les paramètres.
            </p>
            <p className="text-muted-foreground text-sm">
              Redirection dans {countdown}s...
            </p>
            <Button onClick={handleContinue} variant="outline" size="sm">
              Continuer maintenant
            </Button>
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Erreur de connexion</p>
            {errorMessage && (
              <p className="text-muted-foreground text-sm max-w-xs text-center">
                {errorMessage}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="default" size="sm">
                Réessayer
              </Button>
              <Button onClick={handleContinue} variant="outline" size="sm">
                Continuer quand même
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center space-y-4">
        {getStatusContent()}
      </div>
    </main>
  );
}
