import React, { useState } from 'react';
import { 
  Folder, FolderPlus, Edit2, Trash2, ChevronRight, FileText, 
  AlertTriangle, CheckCircle, Clock, Archive, Play, BarChart3 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PDFFolder } from './types';

interface SituationManagerProps {
  folders: PDFFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onFoldersChange: () => void;
  onAnalyzeSituation: (folderId: string) => void;
  isAnalyzing?: boolean;
}

const FOLDER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const SITUATION_TYPES = [
  { value: 'curatelle', label: 'Curatelle' },
  { value: 'succession', label: 'Succession' },
  { value: 'litige', label: 'Litige' },
  { value: 'plainte', label: 'Plainte' },
  { value: 'recours', label: 'Recours' },
  { value: 'autre', label: 'Autre' },
];

const STATUS_CONFIG = {
  ouvert: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Ouvert' },
  en_cours: { icon: Play, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'En cours' },
  analysé: { icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Analysé' },
  résolu: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Résolu' },
  archivé: { icon: Archive, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Archivé' },
};

const PRIORITY_CONFIG = {
  faible: { color: 'bg-gray-500', label: 'Faible' },
  moyenne: { color: 'bg-blue-500', label: 'Moyenne' },
  haute: { color: 'bg-amber-500', label: 'Haute' },
  critique: { color: 'bg-red-500', label: 'Critique' },
};

export function SituationManager({ 
  folders, 
  selectedFolderId, 
  onSelectFolder,
  onFoldersChange,
  onAnalyzeSituation,
  isAnalyzing = false
}: SituationManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<PDFFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderColor, setFolderColor] = useState('#3b82f6');
  const [situationType, setSituationType] = useState('curatelle');
  const [institutionConcerned, setInstitutionConcerned] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Nom de la situation requis');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('pdf_folders')
        .insert({
          user_id: user.id,
          name: folderName.trim(),
          description: folderDescription.trim() || null,
          color: folderColor,
          situation_type: situationType,
          institution_concerned: institutionConcerned.trim() || null,
          situation_status: 'ouvert',
          priority: 'moyenne',
          problem_score: 0,
        });

      if (error) throw error;

      toast.success('Situation créée');
      setIsCreateDialogOpen(false);
      resetForm();
      onFoldersChange();
    } catch (error) {
      console.error('Error creating situation:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !folderName.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('pdf_folders')
        .update({
          name: folderName.trim(),
          description: folderDescription.trim() || null,
          color: folderColor,
          situation_type: situationType,
          institution_concerned: institutionConcerned.trim() || null,
        })
        .eq('id', editingFolder.id);

      if (error) throw error;

      toast.success('Situation modifiée');
      setIsEditDialogOpen(false);
      resetForm();
      onFoldersChange();
    } catch (error) {
      console.error('Error updating situation:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!editingFolder) return;

    setIsLoading(true);
    try {
      // 1. Orpheliner les documents PDF (mettre folder_id = null)
      const { error: docError } = await supabase
        .from('pdf_documents')
        .update({ folder_id: null })
        .eq('folder_id', editingFolder.id);

      if (docError) {
        console.error('Error orphaning documents:', docError);
      }

      // 2. Supprimer les analyses de situation liées
      const { error: analysisError } = await supabase
        .from('situation_analyses')
        .delete()
        .eq('folder_id', editingFolder.id);

      if (analysisError) {
        console.error('Error deleting situation analyses:', analysisError);
      }

      // 3. Supprimer les comparaisons de situations liées
      const { error: compError1 } = await supabase
        .from('situation_comparisons')
        .delete()
        .eq('folder_id_1', editingFolder.id);

      if (compError1) {
        console.error('Error deleting comparisons (folder_id_1):', compError1);
      }

      const { error: compError2 } = await supabase
        .from('situation_comparisons')
        .delete()
        .eq('folder_id_2', editingFolder.id);

      if (compError2) {
        console.error('Error deleting comparisons (folder_id_2):', compError2);
      }

      // 4. Supprimer le dossier
      const { error } = await supabase
        .from('pdf_folders')
        .delete()
        .eq('id', editingFolder.id);

      if (error) throw error;

      toast.success('Situation supprimée');
      setIsDeleteDialogOpen(false);
      if (selectedFolderId === editingFolder.id) {
        onSelectFolder(null);
      }
      resetForm();
      onFoldersChange();
    } catch (error) {
      console.error('Error deleting situation:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFolderName('');
    setFolderDescription('');
    setFolderColor('#3b82f6');
    setSituationType('curatelle');
    setInstitutionConcerned('');
    setEditingFolder(null);
  };

  const openEditDialog = (folder: PDFFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || '');
    setFolderColor(folder.color);
    setSituationType(folder.situation_type || 'curatelle');
    setInstitutionConcerned(folder.institution_concerned || '');
    setIsEditDialogOpen(true);
  };

  const getStatusConfig = (status?: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ouvert;
  };

  const getPriorityConfig = (priority?: string) => {
    return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.moyenne;
  };

  const getScoreColor = (score?: number) => {
    if (!score || score === 0) return 'text-muted-foreground';
    if (score >= 70) return 'text-red-500';
    if (score >= 50) return 'text-amber-500';
    if (score >= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-2">
      {/* All Documents */}
      <button
        type="button"
        onClick={() => onSelectFolder(null)}
        className={cn(
          "w-full p-3 rounded-lg border transition-all duration-200 text-left",
          "hover:bg-muted/50 active:scale-[0.98]",
          selectedFolderId === null 
            ? "ring-2 ring-primary bg-primary/5 border-primary/30" 
            : "bg-card border-border"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Tous les documents</p>
          </div>
          <ChevronRight className={cn(
            "h-4 w-4 transition-transform text-muted-foreground",
            selectedFolderId === null && "rotate-90 text-primary"
          )} />
        </div>
      </button>

      {/* Situations list */}
      {folders.map(folder => {
        const statusConfig = getStatusConfig(folder.situation_status);
        const priorityConfig = getPriorityConfig(folder.priority);
        const StatusIcon = statusConfig.icon;
        
        return (
          <button
            type="button"
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              "w-full p-3 rounded-lg border transition-all duration-200 text-left group",
              "hover:bg-muted/50 active:scale-[0.98]",
              selectedFolderId === folder.id 
                ? "ring-2 ring-primary bg-primary/5 border-primary/30" 
                : "bg-card border-border"
            )}
          >
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-lg shrink-0"
                style={{ backgroundColor: `${folder.color}20` }}
              >
                <Folder className="h-4 w-4" style={{ color: folder.color }} />
              </div>
              
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{folder.name}</p>
                  {folder.problem_score !== undefined && folder.problem_score > 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs shrink-0", getScoreColor(folder.problem_score))}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {folder.problem_score}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-xs", statusConfig.color, statusConfig.bg)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                  
                  {folder.priority && folder.priority !== 'moyenne' && (
                    <Badge className={cn("text-xs text-white", priorityConfig.color)}>
                      {priorityConfig.label}
                    </Badge>
                  )}
                  
                  {folder.documentsCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {folder.documentsCount} doc(s)
                    </span>
                  )}
                </div>

                {folder.problem_score !== undefined && folder.problem_score > 0 && (
                  <Progress 
                    value={folder.problem_score} 
                    className="h-1.5"
                  />
                )}

                {folder.institution_concerned && (
                  <p className="text-xs text-muted-foreground truncate">
                    {folder.institution_concerned}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); openEditDialog(folder); }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setIsDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                {folder.documentsCount && folder.documentsCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isAnalyzing}
                    onClick={(e) => { e.stopPropagation(); onAnalyzeSituation(folder.id); }}
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Analyser
                  </Button>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* Create situation button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <FolderPlus className="h-4 w-4" />
        Nouvelle situation
      </Button>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une situation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la situation *</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Ex: Dossier Curatelle Dupont"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={situationType} onValueChange={setSituationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SITUATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Institution concernée</Label>
                <Input
                  value={institutionConcerned}
                  onChange={(e) => setInstitutionConcerned(e.target.value)}
                  placeholder="Ex: Justice de Paix"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                placeholder="Description de la situation..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFolderColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      folderColor === color && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFolder} disabled={isLoading}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la situation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={situationType} onValueChange={setSituationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SITUATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Institution</Label>
                <Input
                  value={institutionConcerned}
                  onChange={(e) => setInstitutionConcerned(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFolderColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      folderColor === color && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditFolder} disabled={isLoading}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la situation ?</AlertDialogTitle>
            <AlertDialogDescription>
              La situation "{editingFolder?.name}" et son analyse seront supprimées. 
              Les documents qu'elle contient ne seront pas supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
