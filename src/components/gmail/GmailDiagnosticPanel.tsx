import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { Bug, ChevronDown, Copy, ExternalLink, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticResult {
  success: boolean;
  redirectUri: string;
  supabaseUrl: string;
  secrets: {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GMAIL_TOKEN_ENCRYPTION_KEY: string;
  };
  allSecretsOk: boolean;
  instructions: {
    step1: string;
    step2: string;
    step3_origins: string;
    step4_redirect: string;
    step5_test_users: string;
  };
  googleCloudLinks: {
    credentials: string;
    consentScreen: string;
  };
}

export function GmailDiagnosticPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isPreviewEnv = useMemo(
    () => /lovableproject\.com|preview--/i.test(currentOrigin),
    [currentOrigin]
  );

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'diagnose' },
      });

      if (fnError) throw fnError;
      setResult(data);
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError(err instanceof Error ? err.message : 'Erreur de diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  const googleSignInRedirectUri = useMemo(() => {
    if (!result?.supabaseUrl) return null;
    return `${result.supabaseUrl.replace(/\/$/, '')}/auth/v1/callback`;
  }, [result?.supabaseUrl]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Diagnostiquer la connexion Gmail
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4">
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Diagnostic de configuration</span>
              <Button size="sm" onClick={runDiagnostic} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Vérifier
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {isPreviewEnv && (
              <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Tu es en environnement de prévisualisation</p>
                    <p>
                      Ajoute <strong>cette</strong> origine dans Google Cloud. Si tu utilises aussi l’URL publique
                      (lovable.app), ajoute-la également.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Current Origin */}
            <div className="space-y-2">
              <p className="font-medium text-muted-foreground">Origine actuelle (à ajouter dans Google Cloud)</p>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <code className="flex-1 text-xs break-all">{currentOrigin}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(currentOrigin, 'Origine')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {result && (
              <>
                {/* Redirect URI (Gmail OAuth via backend function) */}
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground">URI de redirection OAuth (Gmail)</p>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <code className="flex-1 text-xs break-all">{result.redirectUri}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(result.redirectUri, 'Redirect URI Gmail')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Important : l’URI doit être <strong>complète</strong> et inclure <code>/functions/v1/gmail-oauth</code>
                    (pas seulement le domaine).
                  </p>
                </div>

                {/* Redirect URI (Google Sign-In) */}
                {googleSignInRedirectUri && (
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground">URI de redirection (Google Sign-In)</p>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <code className="flex-1 text-xs break-all">{googleSignInRedirectUri}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(googleSignInRedirectUri, 'Redirect URI Google Sign-In')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requis uniquement si tu utilises le bouton « Google Sign-In » (Plan B).
                    </p>
                  </div>
                )}

                {/* Secrets Status */}
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground">État des secrets backend</p>
                  <div className="grid gap-2">
                    {Object.entries(result.secrets).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <code className="text-xs">{key}</code>
                        <Badge variant={value.includes('✅') ? 'default' : 'destructive'} className="text-xs">
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {result.allSecretsOk ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Tous les secrets sont configurés
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <XCircle className="h-4 w-4" />
                      Des secrets sont manquants
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="font-medium">Checklist (copier/coller exact) :</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                    <li>{result.instructions.step1}</li>
                    <li>{result.instructions.step2}</li>
                    <li>
                      <strong>Origines JavaScript autorisées :</strong> ajouter{' '}
                      <code className="bg-muted px-1 rounded">{currentOrigin}</code>
                    </li>
                    <li>
                      <strong>URI de redirection (Gmail) :</strong> ajouter{' '}
                      <code className="bg-muted px-1 rounded">{result.redirectUri}</code>
                    </li>
                    {googleSignInRedirectUri ? (
                      <li>
                        <strong>URI de redirection (Google Sign-In) :</strong> ajouter{' '}
                        <code className="bg-muted px-1 rounded">{googleSignInRedirectUri}</code>
                      </li>
                    ) : null}
                    <li>{result.instructions.step5_test_users}</li>
                  </ol>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={result.googleCloudLinks.credentials} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Identifiants OAuth
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={result.googleCloudLinks.consentScreen} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Écran de consentement
                    </a>
                  </Button>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 rounded-lg text-destructive text-xs">Erreur: {error}</div>
            )}

            {!result && !error && !loading && (
              <p className="text-xs text-muted-foreground">
                Clique sur « Vérifier » puis copie-colle exactement les URI ci-dessus.
              </p>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
