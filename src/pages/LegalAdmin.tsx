/**
 * Legal Administration Dashboard
 * Manages the Legal Knowledge Base (LKB) - domains, instruments, units
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  ArrowLeft, Scale, Database, BookOpen, FileText, RefreshCw, 
  Search, CheckCircle, AlertTriangle, Loader2, Library
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LKBStats {
  domains: number;
  instruments: number;
  units: number;
  federalLaws: number;
  cantonalLaws: number;
  keyUnits: number;
}

interface LegalDomain {
  code: string;
  label_fr: string;
  description: string;
  icon?: string;
  instrument_count?: number;
}

interface LegalInstrument {
  id: string;
  instrument_uid: string;
  title: string;
  short_title: string | null;
  jurisdiction: string;
  current_status: string;
  domain_tags: string[] | null;
}

export default function LegalAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<LKBStats>({
    domains: 0,
    instruments: 0,
    units: 0,
    federalLaws: 0,
    cantonalLaws: 0,
    keyUnits: 0,
  });
  const [domains, setDomains] = useState<LegalDomain[]>([]);
  const [instruments, setInstruments] = useState<LegalInstrument[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  useEffect(() => {
    loadLKBData();
  }, []);

  const loadLKBData = async () => {
    setLoading(true);
    try {
      // Parallel fetch for performance
      const [domainsRes, instrumentsRes, unitsRes, federalRes, cantonalRes, keyUnitsRes] = await Promise.all([
        supabase.from('legal_domains').select('*'),
        supabase.from('legal_instruments').select('id, instrument_uid, title, short_title, jurisdiction, current_status, domain_tags'),
        supabase.from('legal_units').select('id', { count: 'exact', head: true }),
        supabase.from('legal_instruments').select('id', { count: 'exact', head: true }).eq('jurisdiction', 'CH'),
        supabase.from('legal_instruments').select('id', { count: 'exact', head: true }).eq('jurisdiction', 'VD'),
        supabase.from('legal_units').select('id', { count: 'exact', head: true }).eq('is_key_unit', true),
      ]);

      const domainsData = (domainsRes.data || []) as LegalDomain[];
      const instrumentsData = (instrumentsRes.data || []) as LegalInstrument[];

      // Count instruments per domain
      const domainCounts: Record<string, number> = {};
      for (const inst of instrumentsData) {
        for (const tag of inst.domain_tags || []) {
          domainCounts[tag] = (domainCounts[tag] || 0) + 1;
        }
      }

      const domainsWithCounts = domainsData.map(d => ({
        ...d,
        instrument_count: domainCounts[d.code] || 0
      }));

      setDomains(domainsWithCounts);
      setInstruments(instrumentsData);
      setStats({
        domains: domainsData.length,
        instruments: instrumentsData.length,
        units: unitsRes.count || 0,
        federalLaws: federalRes.count || 0,
        cantonalLaws: cantonalRes.count || 0,
        keyUnits: keyUnitsRes.count || 0,
      });
    } catch (e) {
      console.error('Failed to load LKB data:', e);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  const runSeed = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-complete-laws');
      
      if (error) throw error;
      
      toast.success(`Seed termine: ${data?.stats?.domains || 0} domaines, ${data?.stats?.articles || 0} articles`);
      await loadLKBData();
    } catch (e) {
      console.error('Seed error:', e);
      toast.error('Erreur lors du seed');
    } finally {
      setSeeding(false);
    }
  };

  const filteredInstruments = instruments.filter(inst => {
    const matchesSearch = !searchQuery || 
      inst.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.short_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.instrument_uid.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDomain = !selectedDomain || 
      inst.domain_tags?.includes(selectedDomain);
    
    return matchesSearch && matchesDomain;
  });

  const completenessPercent = Math.min(100, Math.round(
    (stats.units / 500) * 100 // Target: 500 units minimum
  ));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Library className="h-6 w-6" />
              Administration LKB
            </h1>
            <p className="text-muted-foreground">
              Legal Knowledge Base - Gestion des bases legales
            </p>
          </div>
        </div>
        <Button 
          onClick={runSeed} 
          disabled={seeding}
          variant="outline"
          className="gap-2"
        >
          {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {seeding ? 'Seed en cours...' : 'Lancer Seed'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{stats.domains}</span>
            </div>
            <p className="text-sm text-muted-foreground">Domaines</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats.instruments}</span>
            </div>
            <p className="text-sm text-muted-foreground">Lois</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.units}</span>
            </div>
            <p className="text-sm text-muted-foreground">Articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{stats.federalLaws}</span>
            </div>
            <p className="text-sm text-muted-foreground">Lois federales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{stats.cantonalLaws}</span>
            </div>
            <p className="text-sm text-muted-foreground">Lois VD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold">{stats.keyUnits}</span>
            </div>
            <p className="text-sm text-muted-foreground">Articles cles</p>
          </CardContent>
        </Card>
      </div>

      {/* Completeness indicator */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {completenessPercent >= 80 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            Completude de la base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completenessPercent} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {stats.units} articles indexes sur 500 recommandes ({completenessPercent}%)
          </p>
        </CardContent>
      </Card>

      {/* Main content */}
      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains">Domaines ({stats.domains})</TabsTrigger>
          <TabsTrigger value="instruments">Lois ({stats.instruments})</TabsTrigger>
        </TabsList>

        <TabsContent value="domains">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map(domain => (
              <Card 
                key={domain.code} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedDomain === domain.code ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedDomain(
                  selectedDomain === domain.code ? null : domain.code
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {domain.code}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {domain.instrument_count} lois
                    </span>
                  </div>
                  <CardTitle className="text-base">{domain.label_fr}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {domain.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="instruments">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher une loi..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {selectedDomain && (
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => setSelectedDomain(null)}
                  >
                    {selectedDomain} ×
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredInstruments.map(inst => (
                    <div 
                      key={inst.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={inst.jurisdiction === 'CH' ? 'default' : 'secondary'}>
                            {inst.jurisdiction}
                          </Badge>
                          <span className="font-mono text-sm text-muted-foreground">
                            {inst.instrument_uid}
                          </span>
                          <Badge 
                            variant={inst.current_status === 'in_force' ? 'outline' : 'destructive'}
                            className="text-xs"
                          >
                            {inst.current_status === 'in_force' ? 'En vigueur' : inst.current_status}
                          </Badge>
                        </div>
                        <p className="font-medium mt-1">
                          {inst.short_title || inst.title}
                        </p>
                        {inst.short_title && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {inst.title}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {(inst.domain_tags || []).slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredInstruments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune loi trouvee
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
