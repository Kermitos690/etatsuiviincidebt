import React, { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PDFTagManagerProps {
  documentId: string;
  tags: string[];
  suggestedTags?: string[];
  onTagsChange: (tags: string[]) => void;
  compact?: boolean;
}

export function PDFTagManager({
  documentId,
  tags,
  suggestedTags = [],
  onTagsChange,
  compact = false,
}: PDFTagManagerProps) {
  const [newTag, setNewTag] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag || tags.includes(trimmedTag)) return;

    const newTags = [...tags, trimmedTag];
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('pdf_documents')
        .update({ tags: newTags })
        .eq('id', documentId);

      if (error) throw error;
      
      onTagsChange(newTags);
      setNewTag('');
      toast.success('Tag ajouté');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du tag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('pdf_documents')
        .update({ tags: newTags })
        .eq('id', documentId);

      if (error) throw error;
      
      onTagsChange(newTags);
      toast.success('Tag supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression du tag');
    } finally {
      setIsSaving(false);
    }
  };

  const availableSuggestions = suggestedTags.filter(t => !tags.includes(t));

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Tag className="h-3 w-3" />
            {tags.length > 0 ? `${tags.length} tags` : 'Ajouter tags'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nouveau tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
                className="h-8 text-sm"
              />
              <Button 
                size="sm" 
                className="h-8 px-2"
                onClick={() => handleAddTag(newTag)}
                disabled={!newTag.trim() || isSaving}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {availableSuggestions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Suggestions</p>
                <div className="flex flex-wrap gap-1">
                  {availableSuggestions.slice(0, 5).map(tag => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                      onClick={() => handleAddTag(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Tags</span>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ajouter un tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddTag(newTag);
            }
          }}
          className="flex-1"
        />
        <Button 
          size="icon"
          onClick={() => handleAddTag(newTag)}
          disabled={!newTag.trim() || isSaving}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}

      {availableSuggestions.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Suggestions basées sur l'analyse</p>
          <div className="flex flex-wrap gap-1.5">
            {availableSuggestions.map(tag => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleAddTag(tag)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PDFTagManager;
