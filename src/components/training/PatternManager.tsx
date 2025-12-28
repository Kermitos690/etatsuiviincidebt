import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Tag, 
  Scale, 
  TrendingUp,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface DetectionPattern {
  id: string;
  category: string;
  pattern_name: string;
  description: string | null;
  keywords: string[];
  regex_patterns: string[];
  example_citations: string[];
  severity: string;
  legal_articles: string[];
  counter_arguments: string[];
  is_active: boolean;
  detection_count: number;
  accuracy_score: number;
  user_id: string | null;
}

const CATEGORIES = [
  { value: 'excuse_temporelle', label: 'Excuse temporelle', color: 'bg-yellow-500' },
  { value: 'evitement', label: 'Évitement', color: 'bg-orange-500' },
  { value: 'retard', label: 'Retard', color: 'bg-red-500' },
  { value: 'contradiction', label: 'Contradiction', color: 'bg-purple-500' },
  { value: 'minimisation', label: 'Minimisation', color: 'bg-blue-500' },
  { value: 'rupture', label: 'Rupture', color: 'bg-pink-500' },
  { value: 'non_reponse', label: 'Non-réponse', color: 'bg-amber-500' },
  { value: 'decision_unilaterale', label: 'Décision unilatérale', color: 'bg-red-600' },
  { value: 'intimidation', label: 'Intimidation', color: 'bg-rose-500' },
  { value: 'confidentialite', label: 'Confidentialité', color: 'bg-indigo-500' },
  { value: 'manipulation', label: 'Manipulation', color: 'bg-fuchsia-500' },
  { value: 'obstruction', label: 'Obstruction', color: 'bg-slate-500' },
];

const SEVERITIES = [
  { value: 'low', label: 'Faible', color: 'bg-green-500' },
  { value: 'medium', label: 'Moyen', color: 'bg-yellow-500' },
  { value: 'high', label: 'Élevé', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critique', color: 'bg-red-500' },
];

export function PatternManager() {
  const [patterns, setPatterns] = useState<DetectionPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<DetectionPattern | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    category: 'excuse_temporelle',
    pattern_name: '',
    description: '',
    keywords: '',
    severity: 'medium',
    legal_articles: '',
    counter_arguments: '',
    example_citations: '',
    is_active: true
  });

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('detection_patterns')
        .select('*')
        .order('category', { ascending: true })
        .order('detection_count', { ascending: false });

      if (error) throw error;
      setPatterns(data || []);
    } catch (error) {
      console.error('Error fetching patterns:', error);
      toast.error('Erreur lors du chargement des patterns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      const patternData = {
        category: formData.category,
        pattern_name: formData.pattern_name,
        description: formData.description || null,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        severity: formData.severity,
        legal_articles: formData.legal_articles.split(',').map(a => a.trim()).filter(Boolean),
        counter_arguments: formData.counter_arguments.split('\n').filter(Boolean),
        example_citations: formData.example_citations.split('\n').filter(Boolean),
        is_active: formData.is_active,
        user_id: user.id
      };

      if (editingPattern) {
        const { error } = await supabase
          .from('detection_patterns')
          .update(patternData)
          .eq('id', editingPattern.id);

        if (error) throw error;
        toast.success('Pattern modifié');
      } else {
        const { error } = await supabase
          .from('detection_patterns')
          .insert(patternData);

        if (error) throw error;
        toast.success('Pattern créé');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPatterns();
    } catch (error) {
      console.error('Error saving pattern:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (pattern: DetectionPattern) => {
    setEditingPattern(pattern);
    setFormData({
      category: pattern.category,
      pattern_name: pattern.pattern_name,
      description: pattern.description || '',
      keywords: pattern.keywords.join(', '),
      severity: pattern.severity,
      legal_articles: pattern.legal_articles.join(', '),
      counter_arguments: pattern.counter_arguments.join('\n'),
      example_citations: pattern.example_citations.join('\n'),
      is_active: pattern.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (pattern: DetectionPattern) => {
    if (!confirm('Supprimer ce pattern ?')) return;
    
    try {
      const { error } = await supabase
        .from('detection_patterns')
        .delete()
        .eq('id', pattern.id);

      if (error) throw error;
      toast.success('Pattern supprimé');
      fetchPatterns();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleActive = async (pattern: DetectionPattern) => {
    try {
      const { error } = await supabase
        .from('detection_patterns')
        .update({ is_active: !pattern.is_active })
        .eq('id', pattern.id);

      if (error) throw error;
      fetchPatterns();
    } catch (error) {
      console.error('Error toggling pattern:', error);
    }
  };

  const resetForm = () => {
    setEditingPattern(null);
    setFormData({
      category: 'excuse_temporelle',
      pattern_name: '',
      description: '',
      keywords: '',
      severity: 'medium',
      legal_articles: '',
      counter_arguments: '',
      example_citations: '',
      is_active: true
    });
  };

  const filteredPatterns = patterns.filter(p => {
    const matchesSearch = p.pattern_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (category: string) => 
    CATEGORIES.find(c => c.value === category) || { label: category, color: 'bg-gray-500' };

  const getSeverityInfo = (severity: string) =>
    SEVERITIES.find(s => s.value === severity) || { label: severity, color: 'bg-gray-500' };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un pattern..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchPatterns}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau pattern
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPattern ? 'Modifier le pattern' : 'Créer un pattern'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(v) => setFormData({...formData, category: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sévérité</Label>
                    <Select 
                      value={formData.severity} 
                      onValueChange={(v) => setFormData({...formData, severity: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map(sev => (
                          <SelectItem key={sev.value} value={sev.value}>{sev.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nom du pattern *</Label>
                  <Input
                    value={formData.pattern_name}
                    onChange={(e) => setFormData({...formData, pattern_name: e.target.value})}
                    placeholder="Ex: Absence vacances"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Description du comportement à détecter..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mots-clés (séparés par virgule)</Label>
                  <Textarea
                    value={formData.keywords}
                    onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                    placeholder="vacances, congé, absent, indisponible"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Articles de loi (séparés par virgule)</Label>
                  <Input
                    value={formData.legal_articles}
                    onChange={(e) => setFormData({...formData, legal_articles: e.target.value})}
                    placeholder="Art. 406 CC, Art. 394 CC"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contre-arguments (un par ligne)</Label>
                  <Textarea
                    value={formData.counter_arguments}
                    onChange={(e) => setFormData({...formData, counter_arguments: e.target.value})}
                    placeholder="L'Art. 406 CC impose une continuité du service..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Exemples de citations (un par ligne)</Label>
                  <Textarea
                    value={formData.example_citations}
                    onChange={(e) => setFormData({...formData, example_citations: e.target.value})}
                    placeholder="Je n'ai pas pu agir car j'étais en vacances..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label>Pattern actif</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.pattern_name}>
                  {editingPattern ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{patterns.length}</div>
            <div className="text-sm text-muted-foreground">Patterns total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{patterns.filter(p => p.is_active).length}</div>
            <div className="text-sm text-muted-foreground">Actifs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{patterns.reduce((acc, p) => acc + p.detection_count, 0)}</div>
            <div className="text-sm text-muted-foreground">Détections</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {(patterns.reduce((acc, p) => acc + p.accuracy_score, 0) / patterns.length * 100 || 0).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Précision moy.</div>
          </CardContent>
        </Card>
      </div>

      {/* Patterns Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatterns.map(pattern => {
          const catInfo = getCategoryInfo(pattern.category);
          const sevInfo = getSeverityInfo(pattern.severity);
          
          return (
            <Card key={pattern.id} className={`relative ${!pattern.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge className={catInfo.color}>{catInfo.label}</Badge>
                    <CardTitle className="text-base">{pattern.pattern_name}</CardTitle>
                  </div>
                  <Badge variant="outline" className={sevInfo.color + ' text-white'}>
                    {sevInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pattern.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {pattern.description}
                  </p>
                )}

                {pattern.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pattern.keywords.slice(0, 4).map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {kw}
                      </Badge>
                    ))}
                    {pattern.keywords.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{pattern.keywords.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {pattern.legal_articles.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Scale className="h-3 w-3" />
                    {pattern.legal_articles.join(', ')}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {pattern.detection_count}
                    </span>
                    <span>{(pattern.accuracy_score * 100).toFixed(0)}%</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Switch 
                      checked={pattern.is_active}
                      onCheckedChange={() => toggleActive(pattern)}
                      className="scale-75"
                    />
                    {pattern.user_id && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(pattern)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(pattern)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {!pattern.user_id && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    Pattern système
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPatterns.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Aucun pattern trouvé</p>
        </div>
      )}
    </div>
  );
}
