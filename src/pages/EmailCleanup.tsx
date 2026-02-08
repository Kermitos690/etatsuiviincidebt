import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { CleanupStats } from '@/components/cleanup/CleanupStats';
import { FilterCleanupPanel } from '@/components/cleanup/FilterCleanupPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Trash2, 
  Globe, 
  User, 
  ArrowLeft, 
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Mail,
  Filter,
  Zap
} from 'lucide-react';

type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

interface DomainGroup {
  domain: string;
  senderEmail?: string;
  emailCount: number;
  examples: Array<{
    id: string;
    subject: string;
    sender: string;
    received_at: string;
  }>;
  isRelevant: boolean;
  matchedKeywords: string[];
}

// Generic email domains that should be grouped by sender
const GENERIC_DOMAINS = [
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
  'protonmail.com', 'live.com', 'msn.com', 'aol.com', 'me.com'
];

interface EmailRow {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
}

export default function EmailCleanup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [gmailConfig, setGmailConfig] = useState<{ domains: string[]; keywords: string[] } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [groupMode, setGroupMode] = useState<'domain' | 'sender'>('domain');
  const [cleanupMode, setCleanupMode] = useState<'swipe' | 'auto'>('auto');
  const [deleting, setDeleting] = useState(false);
  
  // Session stats
  const [stats, setStats] = useState({
    deleted: 0,
    kept: 0,
    blacklisted: 0,
    skipped: 0,
  });

  // Fetch emails and config
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch gmail config for relevance check
        const { data: config } = await supabase
          .from('gmail_config')
          .select('domains, keywords')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setGmailConfig(config);

        // Fetch all emails
        const { data: emailData, error } = await supabase
          .from('emails')
          .select('id, subject, sender, received_at')
          .eq('user_id', user.id)
          .order('received_at', { ascending: false });

        if (error) throw error;
        setEmails(emailData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erreur lors du chargement des emails');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Extract domain from email address
  const extractDomain = (email: string): string => {
    const match = email.match(/@([^>]+)/);
    return match ? match[1].toLowerCase().trim() : email.toLowerCase();
  };

  // Extract full email address
  const extractEmail = (sender: string): string => {
    const match = sender.match(/<([^>]+)>/);
    return match ? match[1].toLowerCase() : sender.toLowerCase();
  };

  // Check if email is relevant based on filters
  const isEmailRelevant = (email: EmailRow): { relevant: boolean; matchedKeywords: string[] } => {
    if (!gmailConfig) return { relevant: true, matchedKeywords: [] };
    
    const domains = gmailConfig.domains || [];
    const keywords = gmailConfig.keywords || [];
    const matchedKeywords: string[] = [];

    const hasDomains = domains.length > 0;
    const hasKeywords = keywords.length > 0;

    if (!hasDomains && !hasKeywords) {
      return { relevant: true, matchedKeywords: [] };
    }
    
    const senderDomain = extractDomain(email.sender);
    const domainMatch = hasDomains && domains.some(d => 
      senderDomain.includes(d.toLowerCase().trim())
    );

    const subjectLower = (email.subject || '').toLowerCase();
    const keywordMatch = hasKeywords && keywords.some(k => {
      const matches = subjectLower.includes(k.toLowerCase().trim());
      if (matches) matchedKeywords.push(k);
      return matches;
    });

    // OR logic: relevant if domain OR keyword matches
    return { 
      relevant: domainMatch || keywordMatch,
      matchedKeywords 
    };
  };

  // Group emails by domain or sender
  const groups = useMemo((): DomainGroup[] => {
    const groupMap = new Map<string, DomainGroup>();

    for (const email of emails) {
      const domain = extractDomain(email.sender);
      const senderEmail = extractEmail(email.sender);
      const isGeneric = GENERIC_DOMAINS.includes(domain);
      
      // Use sender email for generic domains, otherwise use domain
      const groupKey = (groupMode === 'sender' || isGeneric) ? senderEmail : domain;
      
      const existing = groupMap.get(groupKey);
      const { relevant, matchedKeywords } = isEmailRelevant(email);

      if (existing) {
        existing.emailCount++;
        if (existing.examples.length < 5) {
          existing.examples.push({
            id: email.id,
            subject: email.subject,
            sender: email.sender,
            received_at: email.received_at,
          });
        }
        // Merge matched keywords
        matchedKeywords.forEach(kw => {
          if (!existing.matchedKeywords.includes(kw)) {
            existing.matchedKeywords.push(kw);
          }
        });
      } else {
        groupMap.set(groupKey, {
          domain,
          senderEmail: (groupMode === 'sender' || isGeneric) ? senderEmail : undefined,
          emailCount: 1,
          examples: [{
            id: email.id,
            subject: email.subject,
            sender: email.sender,
            received_at: email.received_at,
          }],
          isRelevant: relevant,
          matchedKeywords,
        });
      }
    }

    // Sort: irrelevant first (they need cleanup), then by email count
    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.isRelevant !== b.isRelevant) {
        return a.isRelevant ? 1 : -1;
      }
      return b.emailCount - a.emailCount;
    });
  }, [emails, groupMode, gmailConfig]);

  const currentGroup = groups[currentIndex];
  const remainingGroups = groups.length - currentIndex;

  // Helper to get email IDs for current group
  const getGroupEmailIds = (): string[] => {
    if (!currentGroup) return [];
    return emails
      .filter(e => {
        const domain = extractDomain(e.sender);
        const senderEmail = extractEmail(e.sender);
        if (currentGroup.senderEmail) {
          return senderEmail === currentGroup.senderEmail;
        }
        return domain === currentGroup.domain;
      })
      .map(e => e.id);
  };

  // Batch delete helper (max 200 per batch to avoid timeout)
  const batchDelete = async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
    const BATCH_SIZE = 200;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('emails').delete().in('id', batch);
      if (error) {
        console.error('[batchDelete] Error:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  };

  // Handle swipe actions
  const handleSwipe = async (direction: SwipeDirection) => {
    if (!currentGroup || deleting) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Session expirée, veuillez vous reconnecter');
      return;
    }

    const groupId = currentGroup.senderEmail || currentGroup.domain;
    const emailIds = getGroupEmailIds();

    console.log({ action: 'swipe', direction, groupId, emailCount: emailIds.length });

    setDeleting(true);

    try {
      switch (direction) {
        case 'left': {
          // Delete all emails from this domain/sender
          if (emailIds.length > 0) {
            const result = await batchDelete(emailIds);
            if (!result.success) {
              throw new Error(result.error || 'Erreur de suppression');
            }
            setEmails(prev => prev.filter(e => !emailIds.includes(e.id)));
            setStats(prev => ({ ...prev, deleted: prev.deleted + emailIds.length }));
            toast.success(`${emailIds.length} emails supprimés`);
          }
          break;
        }

        case 'right': {
          // Keep (whitelist domain)
          if (gmailConfig && !gmailConfig.domains.includes(currentGroup.domain)) {
            const updatedDomains = [...gmailConfig.domains, currentGroup.domain];
            const { error } = await supabase
              .from('gmail_config')
              .update({ domains: updatedDomains })
              .eq('user_id', user.id);
            
            if (error) {
              console.error('[whitelist] RLS error:', error);
              throw new Error('Droits insuffisants (RLS)');
            }
            setGmailConfig(prev => prev ? { ...prev, domains: updatedDomains } : null);
          }
          setStats(prev => ({ ...prev, kept: prev.kept + currentGroup.emailCount }));
          toast.success(`${currentGroup.domain} ajouté à la whitelist`);
          break;
        }

        case 'down': {
          // Delete + Blacklist
          const { error: blacklistError } = await supabase.from('email_blacklist').insert({
            user_id: user.id,
            domain: currentGroup.senderEmail ? null : currentGroup.domain,
            sender_email: currentGroup.senderEmail || null,
            reason: 'Nettoyage manuel - hors périmètre',
          });

          if (blacklistError) {
            console.error('[blacklist] RLS error:', blacklistError);
            throw new Error('Droits insuffisants (RLS)');
          }

          if (emailIds.length > 0) {
            const result = await batchDelete(emailIds);
            if (!result.success) {
              throw new Error(result.error || 'Erreur de suppression');
            }
            setEmails(prev => prev.filter(e => !emailIds.includes(e.id)));
          }

          setStats(prev => ({ ...prev, blacklisted: prev.blacklisted + emailIds.length }));
          toast.success(`${emailIds.length} emails supprimés et source blacklistée`);
          break;
        }

        case 'up': {
          // Skip / View details
          setStats(prev => ({ ...prev, skipped: prev.skipped + currentGroup.emailCount }));
          break;
        }
      }

      // Move to next group
      if (currentIndex < groups.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        toast.info('Nettoyage terminé !');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de l\'action';
      console.error('[handleSwipe] Error:', { direction, groupId, error });
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full max-w-xl mx-auto" />
        </div>
      </AppLayout>
    );
  }

  const totalIrrelevant = groups.filter(g => !g.isRelevant).length;

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        <PageHeader
          title="Nettoyage Emails"
          description="Supprimez en masse les emails hors périmètre groupés par domaine ou expéditeur"
        />

        {/* Mode toggle - Auto vs Swipe */}
        <div className="flex justify-center">
          <Tabs value={cleanupMode} onValueChange={(v) => setCleanupMode(v as 'swipe' | 'auto')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="auto" className="gap-2">
                <Zap className="h-4 w-4" />
                Nettoyage automatique
              </TabsTrigger>
              <TabsTrigger value="swipe" className="gap-2">
                <Globe className="h-4 w-4" />
                Par swipe
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {cleanupMode === 'auto' ? (
          /* Automatic cleanup panel */
          <div className="max-w-2xl mx-auto">
            <FilterCleanupPanel gmailConfig={gmailConfig} />
          </div>
        ) : (
          /* Swipe mode */
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{emails.length}</p>
                    <p className="text-xs text-muted-foreground">Emails total</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{groups.length}</p>
                    <p className="text-xs text-muted-foreground">Groupes</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalIrrelevant}</p>
                    <p className="text-xs text-muted-foreground">Hors périmètre</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{groups.length - totalIrrelevant}</p>
                    <p className="text-xs text-muted-foreground">Pertinents</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Group mode toggle */}
            <div className="flex justify-center">
              <Tabs value={groupMode} onValueChange={(v) => { setGroupMode(v as 'domain' | 'sender'); setCurrentIndex(0); }}>
                <TabsList>
                  <TabsTrigger value="domain" className="gap-2">
                    <Globe className="h-4 w-4" />
                    Par domaine
                  </TabsTrigger>
                  <TabsTrigger value="sender" className="gap-2">
                    <User className="h-4 w-4" />
                    Par expéditeur
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Swipe area */}
            <div className="flex flex-col items-center gap-6">
              {currentGroup ? (
                <>
                  {/* Simple domain/sender card instead of deleted DomainSwipeCard */}
                  <Card className="w-full max-w-xl p-6">
                    <div className="text-center mb-4">
                      <Badge variant="outline" className="mb-2">
                        {currentIndex + 1} / {groups.length}
                      </Badge>
                      <h3 className="text-lg font-semibold">
                        {currentGroup.senderEmail || currentGroup.domain}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {currentGroup.emailCount} email(s)
                      </p>
                      <Badge variant={currentGroup.isRelevant ? "default" : "destructive"} className="mt-2">
                        {currentGroup.isRelevant ? "Pertinent" : "Hors périmètre"}
                      </Badge>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      <Button variant="destructive" size="sm" onClick={() => handleSwipe('left')} disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSwipe('up')} disabled={deleting}>
                        Ignorer
                      </Button>
                      <Button variant="default" size="sm" onClick={() => handleSwipe('right')} disabled={deleting}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Garder
                      </Button>
                    </div>
                  </Card>
                  
                  {deleting && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Suppression en cours...</span>
                    </div>
                  )}
                </>
              ) : (
                <Card className="w-full max-w-xl text-center p-8">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nettoyage terminé !</h3>
                  <p className="text-muted-foreground mb-4">
                    Tous les groupes d'emails ont été traités.
                  </p>
                  <Button onClick={() => navigate('/emails')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour aux emails
                  </Button>
                </Card>
              )}

              <CleanupStats
                deleted={stats.deleted}
                kept={stats.kept}
                blacklisted={stats.blacklisted}
                skipped={stats.skipped}
                remaining={remainingGroups}
                className="w-full max-w-xl"
              />
            </div>

            {/* Current filters info */}
            {gmailConfig && (
              <Card className="glass-card max-w-xl mx-auto">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtres actifs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">Domaines :</span>
                    {gmailConfig.domains.length > 0 ? (
                      gmailConfig.domains.map((d, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Aucun</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">Mots-clés :</span>
                    {gmailConfig.keywords.length > 0 ? (
                      gmailConfig.keywords.map((k, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Aucun</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}