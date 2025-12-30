import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader2, AlertTriangle, Lock, FileText, Scale } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIncidentStore } from '@/stores/incidentStore';
import { canModifyIncident } from '@/mappers/incidents';
import { toast } from 'sonner';

// Reusable locked field wrapper with tooltip
function LockedFieldWrapper({ 
  children, 
  isLocked, 
  label 
}: { 
  children: React.ReactNode; 
  isLocked: boolean; 
  label: string;
}) {
  if (!isLocked) return <>{children}</>;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-center">
          <p className="text-xs">Champ verrouillé – contenu figé à des fins probatoires</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Locked textarea with integrated lock icon
function LockedTextarea({ 
  isLocked, 
  ...props 
}: { 
  isLocked: boolean; 
} & React.ComponentProps<typeof Textarea>) {
  if (!isLocked) return <Textarea {...props} />;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Textarea {...props} disabled className="pr-10" />
            <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-center">
          <p className="text-xs">Champ verrouillé – contenu figé à des fins probatoires</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function EditIncident() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncident, loadFromSupabase, isLoading, config } = useIncidentStore();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modificationReason, setModificationReason] = useState('');
  
  const [formData, setFormData] = useState({
    titre: '',
    dateIncident: '',
    institution: '',
    type: '',
    gravite: '',
    statut: '',
    priorite: 'moyen' as 'critique' | 'eleve' | 'moyen' | 'faible',
    faits: '',
    dysfonctionnement: '',
    analysisNotes: ''
  });

  useEffect(() => {
    const load = async () => {
      await loadFromSupabase();
      setHasLoaded(true);
    };
    load();
  }, [loadFromSupabase]);

  const incident = incidents.find(i => i.id === id);

  useEffect(() => {
    if (incident) {
      setFormData({
        titre: incident.titre,
        dateIncident: incident.dateIncident,
        institution: incident.institution,
        type: incident.type,
        gravite: incident.gravite,
        statut: incident.statut,
        priorite: incident.priorite as 'critique' | 'eleve' | 'moyen' | 'faible',
        faits: incident.faits,
        dysfonctionnement: incident.dysfonctionnement,
        analysisNotes: incident.analysisNotes || ''
      });
    }
  }, [incident]);

  // Check if incident can be modified
  const modifyCheck = incident ? canModifyIncident(incident) : { canModify: true };
  const isLocked = !modifyCheck.canModify;

  if (isLoading || !hasLoaded) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!incident) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Incident non trouvé</h2>
            <p className="text-sm text-muted-foreground mb-4">ID: {id}</p>
            <Button variant="outline" asChild>
              <Link to="/incidents">Retour à la liste</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modifyCheck.canModify) {
      toast.error(modifyCheck.reason);
      return;
    }

    setSaving(true);
    try {
      const result = await updateIncident(incident.id, formData, modificationReason || undefined);
      if (result.success) {
        toast.success('Incident modifié avec succès');
        navigate(`/incidents/${incident.id}`);
      } else {
        toast.error(result.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="mb-4 md:mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-4">Modifier Incident #{incident.numero}</h1>

        {/* Institutional lock banner - discrete, professional tone */}
        {isLocked && (
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground/90">
                  Incident juridiquement verrouillé
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Cet incident a été transmis à une autorité. Son contenu est figé afin de préserver l'intégrité probatoire.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titre">Titre</Label>
                <LockedFieldWrapper isLocked={isLocked} label="Titre">
                  <Input
                    id="titre"
                    value={formData.titre}
                    onChange={(e) => setFormData(prev => ({ ...prev, titre: e.target.value }))}
                    required
                    disabled={isLocked}
                    className={isLocked ? 'pr-10' : ''}
                  />
                </LockedFieldWrapper>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateIncident">Date de l'incident</Label>
                  <LockedFieldWrapper isLocked={isLocked} label="Date">
                    <Input
                      id="dateIncident"
                      type="date"
                      value={formData.dateIncident}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateIncident: e.target.value }))}
                      required
                      disabled={isLocked}
                      className={isLocked ? 'pr-10' : ''}
                    />
                  </LockedFieldWrapper>
                </div>

                <div>
                  <Label htmlFor="institution">Institution</Label>
                  <Select
                    value={formData.institution}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, institution: value }))}
                    disabled={isLocked}
                  >
                    <SelectTrigger className={isLocked ? 'opacity-60' : ''}>
                      <SelectValue placeholder="Sélectionner" />
                      {isLocked && <Lock className="h-4 w-4 text-muted-foreground/60 ml-auto" />}
                    </SelectTrigger>
                    <SelectContent>
                      {config.institutions.map((inst) => (
                        <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    disabled={isLocked}
                  >
                    <SelectTrigger className={isLocked ? 'opacity-60' : ''}>
                      <SelectValue placeholder="Sélectionner" />
                      {isLocked && <Lock className="h-4 w-4 text-muted-foreground/60 ml-auto" />}
                    </SelectTrigger>
                    <SelectContent>
                      {config.types.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gravite">Gravité</Label>
                  <Select
                    value={formData.gravite}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gravite: value }))}
                    disabled={isLocked}
                  >
                    <SelectTrigger className={isLocked ? 'opacity-60' : ''}>
                      <SelectValue placeholder="Sélectionner" />
                      {isLocked && <Lock className="h-4 w-4 text-muted-foreground/60 ml-auto" />}
                    </SelectTrigger>
                    <SelectContent>
                      {config.gravites.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="statut">Statut</Label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value }))}
                    disabled={isLocked}
                  >
                    <SelectTrigger className={isLocked ? 'opacity-60' : ''}>
                      <SelectValue placeholder="Sélectionner" />
                      {isLocked && <Lock className="h-4 w-4 text-muted-foreground/60 ml-auto" />}
                    </SelectTrigger>
                    <SelectContent>
                      {config.statuts.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priorite">Priorité</Label>
                  <Select
                    value={formData.priorite}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priorite: value as 'critique' | 'eleve' | 'moyen' | 'faible' }))}
                    disabled={isLocked}
                  >
                    <SelectTrigger className={isLocked ? 'opacity-60' : ''}>
                      <SelectValue placeholder="Sélectionner" />
                      {isLocked && <Lock className="h-4 w-4 text-muted-foreground/60 ml-auto" />}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critique">Critique</SelectItem>
                      <SelectItem value="eleve">Élevée</SelectItem>
                      <SelectItem value="moyen">Moyenne</SelectItem>
                      <SelectItem value="faible">Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FACTS Section - Neutral, documentary styling */}
          <Card className="mb-6 border-slate-200 dark:border-slate-700/60">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700/40">
              <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <FileText className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                FAITS CONSTATÉS (éléments probatoires)
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Éléments factuels, objectifs et vérifiables : dates, actions, documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label htmlFor="faits" className="text-slate-600 dark:text-slate-300">Description factuelle</Label>
                <LockedTextarea
                  id="faits"
                  value={formData.faits}
                  onChange={(e) => setFormData(prev => ({ ...prev, faits: e.target.value }))}
                  rows={4}
                  isLocked={isLocked}
                  placeholder="Décrire les faits de manière objective: dates, actions, documents reçus/envoyés..."
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* ANALYSIS Section - Distinct styling with subtle accent */}
          <Card className="mb-6 border-violet-200/60 dark:border-violet-800/40">
            <CardHeader className="bg-violet-50/40 dark:bg-violet-900/20 border-b border-violet-200/60 dark:border-violet-800/40">
              <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                <Scale className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                ANALYSE & QUALIFICATION JURIDIQUE
              </CardTitle>
              <CardDescription className="text-violet-600/70 dark:text-violet-400/70">
                Interprétation juridique distincte des faits bruts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label htmlFor="dysfonctionnement" className="text-violet-700 dark:text-violet-300">
                  Qualification du dysfonctionnement (analyse juridique)
                </Label>
                <LockedTextarea
                  id="dysfonctionnement"
                  value={formData.dysfonctionnement}
                  onChange={(e) => setFormData(prev => ({ ...prev, dysfonctionnement: e.target.value }))}
                  rows={4}
                  isLocked={isLocked}
                  placeholder="Qualification juridique du dysfonctionnement..."
                  className="border-violet-200/60 dark:border-violet-800/40"
                />
              </div>

              <div>
                <Label htmlFor="analysisNotes" className="text-violet-600/80 dark:text-violet-400/80">
                  Notes d'analyse (assistance – non probatoire)
                </Label>
                <LockedTextarea
                  id="analysisNotes"
                  value={formData.analysisNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, analysisNotes: e.target.value }))}
                  rows={3}
                  isLocked={isLocked}
                  placeholder="Notes d'analyse générées par l'IA..."
                  className="text-muted-foreground border-violet-200/40 dark:border-violet-800/30 bg-violet-50/20 dark:bg-violet-900/10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ces notes constituent une assistance analytique et ne font pas partie du dossier probatoire.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Modification reason for audit trail */}
          {!isLocked && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Motif de modification (optionnel)</CardTitle>
                <CardDescription>
                  Ce motif sera enregistré dans l'historique des modifications pour traçabilité.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  rows={2}
                  placeholder="Ex: Correction suite à nouvelle information, rectification d'erreur de saisie..."
                />
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Annuler
            </Button>
            {isLocked ? (
              <Button 
                type="button" 
                disabled 
                className="bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
              >
                <Lock className="h-4 w-4 mr-2" />
                Verrouillé juridiquement
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
