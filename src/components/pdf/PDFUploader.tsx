import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, FolderPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PDFFolder } from './types';

interface PDFUploaderProps {
  folders: PDFFolder[];
  onUploadComplete: () => void;
  onCreateFolder?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export function PDFUploader({ folders, onUploadComplete, onCreateFolder }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File, index: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Update progress
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 10 } : f
      ));

      // Generate unique filename
      const timestamp = Date.now();
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${user.id}/${timestamp}_${safeFilename}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('pdf-documents')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 60 } : f
      ));

      // Create database record
      const { error: dbError } = await supabase
        .from('pdf_documents')
        .insert({
          user_id: user.id,
          folder_id: selectedFolderId === 'none' || !selectedFolderId ? null : selectedFolderId,
          filename: safeFilename,
          original_filename: file.name,
          storage_path: storagePath,
          file_size: file.size,
          document_type: 'discussion',
          extraction_status: 'pending',
        });

      if (dbError) throw dbError;

      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 100, status: 'completed' } : f
      ));

    } catch (error) {
      console.error('Upload error:', error);
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Erreur inconnue' } : f
      ));
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast.error('Veuillez sélectionner des fichiers PDF');
      return;
    }

    const newUploads: UploadingFile[] = pdfFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Upload files in parallel (max 3 at a time)
    const startIndex = uploadingFiles.length;
    const uploadPromises = pdfFiles.map((file, i) => uploadFile(file, startIndex + i));
    
    await Promise.all(uploadPromises);
    
    toast.success(`${pdfFiles.length} fichier(s) uploadé(s)`);
    onUploadComplete();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [selectedFolderId]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const completedCount = uploadingFiles.filter(f => f.status === 'completed').length;
  const inProgressCount = uploadingFiles.filter(f => f.status === 'uploading').length;

  return (
    <div className="space-y-4">
      {/* Folder selection */}
      <div className="flex items-center gap-3">
        <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
          <SelectTrigger className="w-[250px] glass-card">
            <SelectValue placeholder="Sélectionner un dossier (optionnel)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sans dossier</SelectItem>
            {folders.map(folder => (
              <SelectItem key={folder.id} value={folder.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: folder.color }}
                  />
                  {folder.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {onCreateFolder && (
          <Button variant="outline" size="sm" onClick={onCreateFolder} className="gap-2">
            <FolderPlus className="h-4 w-4" />
            Nouveau dossier
          </Button>
        )}
      </div>

      {/* Drop zone */}
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed transition-all duration-300 cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragging 
            ? "border-primary bg-primary/10 scale-[1.02]" 
            : "border-muted-foreground/20"
        )}
      >
        <label className="block p-8 cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={cn(
              "p-4 rounded-full transition-all duration-300",
              isDragging 
                ? "bg-primary text-primary-foreground scale-110" 
                : "bg-muted"
            )}>
              <Upload className="h-8 w-8" />
            </div>
            
            <div>
              <p className="text-lg font-medium">
                {isDragging ? "Déposez vos PDFs ici" : "Glissez-déposez vos PDFs"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ou cliquez pour sélectionner des fichiers
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>PDF uniquement • Upload multiple supporté</span>
            </div>
          </div>
        </label>
      </Card>

      {/* Upload progress */}
      {uploadingFiles.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              Uploads ({completedCount}/{uploadingFiles.length})
            </h4>
            {inProgressCount === 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setUploadingFiles([])}
              >
                Effacer la liste
              </Button>
            )}
          </div>
          
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {uploadingFiles.map((upload, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {upload.file.name}
                  </p>
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="h-1 mt-1" />
                  )}
                  {upload.status === 'error' && (
                    <p className="text-xs text-destructive">{upload.error}</p>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  {upload.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {upload.status === 'completed' && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {upload.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
