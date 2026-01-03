/**
 * Legal Configuration Page
 * Allows users to configure their legal preferences for AI analysis
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Scale, MapPin, Bookmark, Eye, Save, Plus, X } from 'lucide-react';

interface LegalPreferences {
  id?: string;
  preferred_canton: string;
  preferred_scope: string;
  preferred_domains: string[];
  surveillance_topics: string[];
  auto_verify_legal: boolean;
}

const CANTONS = [
  { value: 'VD', label: 'Vaud' },
  { value: 'GE', label: 'Geneve' },
  { value: 'VS', label: 'Valais' },
  { value: 'NE', label: 'Neuchatel' },
  { value: 'FR', label: 'Fribourg' },
  { value: 'JU', label: 'Jura' },
  { value: 'BE', label: 'Berne' },
  { value: 'ZH', label: 'Zurich' },
  { value: 'CH', label: 'Federal (Suisse)' },
];

const DOMAINS = [
  { value: 'civil', label: 'Civil', description: 'Droit des personnes, famille, successions' },
  { value: 'penal', label: 'Penal', description: 'Infractions, sanctions, procedure penale' },
  { value: 'administratif', label: 'Administratif', description: 'Procedure administrative, autorites' },
  { value: 'social', label: 'Social', description: 'Protection, aide sociale, assurances' },
  { value: 'fiscal', label: 'Fiscal', description: 'Impots, taxes, contributions' },
];

const SUGGESTED_TOPICS = [
  'curatelle',
  'delais legaux',
  'droit d\'acces',
  'protection des donnees',
  'decisions administratives',
  'recours',
  'mesures provisionnelles',
  'devoir d\'information',
  'obligation de diligence',
  'conflits d\'interets',
];

export default function LegalConfig() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [preferences, setPreferences] = useState<LegalPreferences>({
    preferred_canton: 'VD',
    preferred_scope: 'all',
    preferred_domains: ['administratif', 'social'],
    surveillance_topics: [],
    auto_verify_legal: true,
  });

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_legal_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        toast.error('Erreur lors du chargement des preferences');
      }

      if (data) {
        setPreferences({
          id: data.id,
          preferred_canton: data.preferred_canton || 'VD',
          preferred_scope: data.preferred_scope || 'all',
          preferred_domains: data.preferred_domains || ['administratif', 'social'],
          surveillance_topics: data.surveillance_topics || [],
          auto_verify_legal: data.auto_verify_legal ?? true,
        });
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        preferred_canton: preferences.preferred_canton,
        preferred_scope: preferences.preferred_scope,
        preferred_domains: preferences.preferred_domains,
        surveillance_topics: preferences.surveillance_topics,
        auto_verify_legal: preferences.auto_verify_legal,
      };

      if (preferences.id) {
        const { error } = await supabase
          .from('user_legal_preferences')
          .update(payload)
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_legal_preferences')
          .insert(payload);

        if (error) throw error;
      }

      toast.success('Preferences enregistrees');
    } catch (e) {
      console.error('Failed to save preferences:', e);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const toggleDomain = (domain: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_domains: prev.preferred_domains.includes(domain)
        ? prev.preferred_domains.filter(d => d !== domain)
        : [...prev.preferred_domains, domain]
    }));
  };

  const addTopic = (topic: string) => {
    const trimmed = topic.trim().toLowerCase();
    if (trimmed && !preferences.surveillance_topics.includes(trimmed)) {
      setPreferences(prev => ({
        ...prev,
        surveillance_topics: [...prev.surveillance_topics, trimmed]
      }));
    }
    setNewTopic('');
  };

  const removeTopic = (topic: string) => {
    setPreferences(prev => ({
      ...prev,
      surveillance_topics: prev.surveillance_topics.filter(t => t !== topic)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Configuration juridique
          </h1>
          <p className="text-muted-foreground">
            Personnalisez les analyses IA selon votre contexte legal
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Canton Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Canton de reference
            </CardTitle>
            <CardDescription>
              Les analyses juridiques prioriseront les lois de ce canton
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={preferences.preferred_canton}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_canton: value }))}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Choisir un canton" />
              </SelectTrigger>
              <SelectContent>
                {CANTONS.map(canton => (
                  <SelectItem key={canton.value} value={canton.value}>
                    {canton.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Scope Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Perimetre des lois</CardTitle>
            <CardDescription>
              Quelles sources de droit consulter en priorite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={preferences.preferred_scope}
              onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_scope: value }))}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout (federal + cantonal)</SelectItem>
                <SelectItem value="federal">Federal uniquement</SelectItem>
                <SelectItem value="cantonal">Cantonal uniquement</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Domain Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Domaines juridiques
            </CardTitle>
            <CardDescription>
              Selectionnez les domaines pertinents pour vos analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DOMAINS.map(domain => (
                <div
                  key={domain.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    preferences.preferred_domains.includes(domain.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleDomain(domain.value)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{domain.label}</span>
                    <Switch
                      checked={preferences.preferred_domains.includes(domain.value)}
                      onCheckedChange={() => toggleDomain(domain.value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{domain.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Surveillance Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Sujets a surveiller
            </CardTitle>
            <CardDescription>
              L'IA signalera automatiquement ces themes dans vos emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current topics */}
            <div className="flex flex-wrap gap-2">
              {preferences.surveillance_topics.map(topic => (
                <Badge key={topic} variant="secondary" className="gap-1">
                  {topic}
                  <button onClick={() => removeTopic(topic)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {preferences.surveillance_topics.length === 0 && (
                <p className="text-muted-foreground text-sm">Aucun sujet configure</p>
              )}
            </div>

            {/* Add new topic */}
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un sujet..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTopic(newTopic)}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={() => addTopic(newTopic)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggested topics */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Suggestions :</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TOPICS.filter(t => !preferences.surveillance_topics.includes(t)).slice(0, 6).map(topic => (
                  <Badge
                    key={topic}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => addTopic(topic)}
                  >
                    + {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-verify */}
        <Card>
          <CardHeader>
            <CardTitle>Verification automatique</CardTitle>
            <CardDescription>
              Verifier automatiquement les bases legales citees via Perplexity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Verification anti-hallucination</p>
                <p className="text-sm text-muted-foreground">
                  Chaque reference legale sera verifiee contre des sources officielles
                </p>
              </div>
              <Switch
                checked={preferences.auto_verify_legal}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, auto_verify_legal: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={savePreferences} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}
