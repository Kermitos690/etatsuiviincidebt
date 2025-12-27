import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Scale,
  BookOpen,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface LegalReference {
  id: string;
  code_name: string;
  article_number: string;
  article_text: string | null;
  domain: string | null;
  keywords: string[];
  is_verified: boolean;
  verified_at: string | null;
  source_url: string | null;
  notes: string | null;
  created_at: string;
}

const COMMON_CODES = [
  // Droit fédéral suisse - Assurances sociales
  'LAI (Assurance-invalidité)',
  'LAVS (Assurance vieillesse et survivants)',
  'LPC (Prestations complémentaires)',
  'LPP (Prévoyance professionnelle)',
  'LAMal (Assurance-maladie)',
  'LPGA (Partie générale assurances sociales)',
  'LAFam (Allocations familiales)',
  'LACI (Assurance-chômage)',
  // Droit fédéral suisse - Protection adulte et autres
  'Code Civil suisse (CC)',
  'Code des Obligations (CO)',
  'Code Pénal suisse (CP)',
  'LPD (Protection des données)',
  'Constitution fédérale (Cst.)',
  'Procédure administrative (PA)',
  'CPC (Procédure civile)',
  // Droit cantonal vaudois
  'LASV (Action sociale VD)',
  'RLASV (Règlement LASV)',
  'Normes RI (Revenu d\'insertion)',
  'Normes CSIAS',
  'CISP (Contrat insertion)',
  'LVPAE (Protection adulte VD)',
  'LPA-VD (Procédure administrative VD)',
  'LSP (Santé publique VD)',
  'LVLAFam (Allocations familiales VD)',
  'RAM (Administration mandats VD)',
  // Institutions
  'Previva LPP (Caisse de pension Paudex)',
  'CCAVS (Caisse compensation AVS VD)',
  'OCAI (Office AI Vaud)',
  // Standards
  'Directives COPMA/KOKES',
];

const DOMAINS = [
  // Assurances sociales
  'Assurance-invalidité (AI)',
  'Assurance vieillesse (AVS)',
  'Prestations complémentaires (PC)',
  'Prévoyance professionnelle (LPP)',
  'Assurance-maladie (LAMal)',
  'Assurance-chômage (AC)',
  'Allocations familiales',
  // Aide sociale
  'Revenu d\'insertion (RI)',
  'Minimum vital',
  'Aide sociale',
  'Insertion professionnelle',
  // Protection adulte
  'Protection de l\'adulte',
  'Curatelle',
  'Mandat pour cause d\'inaptitude',
  // Droits et procédures
  'Droits fondamentaux',
  'Procédure administrative',
  'Responsabilité civile',
  'Droit pénal',
  'Protection des données',
  // Autres
  'Subsidiarité des prestations',
  'Recours et voies de droit',
];

export function LegalReferenceManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRef, setNewRef] = useState({
    code_name: '',
    article_number: '',
    article_text: '',
    domain: '',
    keywords: '',
    source_url: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: references = [], isLoading } = useQuery({
    queryKey: ['legal-references'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_references')
        .select('*')
        .order('code_name', { ascending: true });
      
      if (error) throw error;
      return data as LegalReference[];
    }
  });

  const addMutation = useMutation({
    mutationFn: async (ref: typeof newRef) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('legal_references')
        .insert({
          user_id: user.id,
          code_name: ref.code_name,
          article_number: ref.article_number,
          article_text: ref.article_text || null,
          domain: ref.domain || null,
          keywords: ref.keywords ? ref.keywords.split(',').map(k => k.trim()) : [],
          source_url: ref.source_url || null,
          notes: ref.notes || null,
          is_verified: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-references'] });
      setIsAddDialogOpen(false);
      setNewRef({
        code_name: '',
        article_number: '',
        article_text: '',
        domain: '',
        keywords: '',
        source_url: '',
        notes: ''
      });
      toast({ title: 'Référence ajoutée', description: 'La référence légale a été enregistrée' });
    },
    onError: (err) => {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter la référence', variant: 'destructive' });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase
        .from('legal_references')
        .update({ 
          is_verified: verified, 
          verified_at: verified ? new Date().toISOString() : null 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-references'] });
      toast({ title: 'Statut mis à jour' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('legal_references')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-references'] });
      toast({ title: 'Référence supprimée' });
    }
  });

  const filteredRefs = references.filter(ref => {
    const matchesSearch = !searchTerm || 
      ref.code_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.article_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.article_text?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDomain = selectedDomain === 'all' || ref.domain === selectedDomain;
    
    return matchesSearch && matchesDomain;
  });

  const groupedByCode = filteredRefs.reduce((acc, ref) => {
    if (!acc[ref.code_name]) acc[ref.code_name] = [];
    acc[ref.code_name].push(ref);
    return acc;
  }, {} as Record<string, LegalReference[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Références Légales</h2>
          <Badge variant="secondary">{references.length}</Badge>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle Référence Légale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code</label>
                  <Select
                    value={newRef.code_name}
                    onValueChange={(v) => setNewRef(p => ({ ...p, code_name: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CODES.map(code => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Article</label>
                  <Input
                    value={newRef.article_number}
                    onChange={(e) => setNewRef(p => ({ ...p, article_number: e.target.value }))}
                    placeholder="ex: Article 1240"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Texte de l'article</label>
                <Textarea
                  value={newRef.article_text}
                  onChange={(e) => setNewRef(p => ({ ...p, article_text: e.target.value }))}
                  placeholder="Contenu de l'article..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Domaine</label>
                <Select
                  value={newRef.domain}
                  onValueChange={(v) => setNewRef(p => ({ ...p, domain: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map(domain => (
                      <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mots-clés (séparés par virgule)</label>
                <Input
                  value={newRef.keywords}
                  onChange={(e) => setNewRef(p => ({ ...p, keywords: e.target.value }))}
                  placeholder="responsabilité, faute, dommage"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Source URL</label>
                <Input
                  value={newRef.source_url}
                  onChange={(e) => setNewRef(p => ({ ...p, source_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={newRef.notes}
                  onChange={(e) => setNewRef(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes, contexte d'application..."
                  rows={2}
                />
              </div>

              <Button 
                onClick={() => addMutation.mutate(newRef)} 
                className="w-full"
                disabled={!newRef.code_name || !newRef.article_number}
              >
                Ajouter la référence
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9"
          />
        </div>
        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Domaine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les domaines</SelectItem>
            {DOMAINS.map(domain => (
              <SelectItem key={domain} value={domain}>{domain}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* References list */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {Object.entries(groupedByCode).map(([code, refs]) => (
            <Card key={code}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {code}
                  <Badge variant="outline" className="ml-auto">{refs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {refs.map(ref => (
                    <div 
                      key={ref.id} 
                      className="flex items-start gap-3 p-2 rounded border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{ref.article_number}</span>
                          {ref.is_verified ? (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Vérifié
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Non vérifié
                            </Badge>
                          )}
                          {ref.domain && (
                            <Badge variant="outline" className="text-xs">{ref.domain}</Badge>
                          )}
                        </div>
                        {ref.article_text && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {ref.article_text}
                          </p>
                        )}
                        {ref.keywords && ref.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ref.keywords.map((kw, i) => (
                              <span key={i} className="text-xs text-primary/70">#{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {ref.source_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={ref.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => verifyMutation.mutate({ id: ref.id, verified: !ref.is_verified })}
                        >
                          <CheckCircle className={`h-4 w-4 ${ref.is_verified ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(ref.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredRefs.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucune référence légale trouvée</p>
              <p className="text-sm mt-1">Commencez par en ajouter une</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
