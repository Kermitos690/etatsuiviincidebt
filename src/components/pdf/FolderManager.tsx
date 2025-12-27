import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, Edit2, Trash2, ChevronRight, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PDFFolder } from './types';

interface FolderManagerProps {
  folders: PDFFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onFoldersChange: () => void;
}

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function FolderManager({ 
  folders, 
  selectedFolderId, 
  onSelectFolder,
  onFoldersChange 
}: FolderManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<PDFFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderColor, setFolderColor] = useState('#3b82f6');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Nom du dossier requis');
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
        });

      if (error) throw error;

      toast.success('Dossier créé');
      setIsCreateDialogOpen(false);
      resetForm();
      onFoldersChange();
    } catch (error) {
      console.error('Error creating folder:', error);
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
        })
        .eq('id', editingFolder.id);

      if (error) throw error;

      toast.success('Dossier modifié');
      setIsEditDialogOpen(false);
      resetForm();
      onFoldersChange();
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!editingFolder) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('pdf_folders')
        .delete()
        .eq('id', editingFolder.id);

      if (error) throw error;

      toast.success('Dossier supprimé');
      setIsDeleteDialogOpen(false);
      if (selectedFolderId === editingFolder.id) {
        onSelectFolder(null);
      }
      resetForm();
      onFoldersChange();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFolderName('');
    setFolderDescription('');
    setFolderColor('#3b82f6');
    setEditingFolder(null);
  };

  const openEditDialog = (folder: PDFFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || '');
    setFolderColor(folder.color);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (folder: PDFFolder) => {
    setEditingFolder(folder);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-2">
      {/* All Documents */}
      <Card
        onClick={() => onSelectFolder(null)}
        className={cn(
          "p-3 cursor-pointer transition-all duration-200",
          "hover:bg-muted/50",
          selectedFolderId === null && "ring-2 ring-primary bg-primary/5"
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
            "h-4 w-4 transition-transform",
            selectedFolderId === null && "rotate-90"
          )} />
        </div>
      </Card>

      {/* Folders list */}
      {folders.map(folder => (
        <Card
          key={folder.id}
          onClick={() => onSelectFolder(folder.id)}
          className={cn(
            "p-3 cursor-pointer transition-all duration-200 group",
            "hover:bg-muted/50",
            selectedFolderId === folder.id && "ring-2 ring-primary bg-primary/5"
          )}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${folder.color}20` }}
            >
              <Folder className="h-4 w-4" style={{ color: folder.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{folder.name}</p>
              {folder.documentsCount !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {folder.documentsCount} document(s)
                </p>
              )}
            </div>
            
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
                onClick={(e) => { e.stopPropagation(); openDeleteDialog(folder); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              selectedFolderId === folder.id && "rotate-90"
            )} />
          </div>
        </Card>
      ))}

      {/* Create folder button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <FolderPlus className="h-4 w-4" />
        Nouveau dossier
      </Button>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un dossier</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Mon dossier"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                placeholder="Description du dossier..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color}
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
            <DialogTitle>Modifier le dossier</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
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
            <AlertDialogTitle>Supprimer le dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier "{editingFolder?.name}" sera supprimé. Les documents qu'il contient ne seront pas supprimés.
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
