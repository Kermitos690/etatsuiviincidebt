import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Brain, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PDFUploader, PDFCard, FolderManager, PDFDetail, PDFDocument, PDFFolder } from '@/components/pdf';

export default function PDFDocuments() {
  const isMobile = useIsMobile();
  const [folders, setFolders] = useState<PDFFolder[]>([]);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());
  const [showUploader, setShowUploader] = useState(false);

  const fetchFolders = useCallback(async () => {
    const { data, error } = await supabase
      .from('pdf_folders')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setFolders(data);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('pdf_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (selectedFolderId) {
      query = query.eq('folder_id', selectedFolderId);
    }

    const { data: docs, error } = await query;

    if (error) {
      toast.error('Erreur lors du chargement');
      setIsLoading(false);
      return;
    }

    // Fetch analyses for documents
    if (docs && docs.length > 0) {
      const docIds = docs.map(d => d.id);
      const { data: analyses } = await supabase
        .from('pdf_analyses')
        .select('*')
        .in('document_id', docIds);

      const docsWithAnalyses = docs.map(doc => ({
        ...doc,
        analysis: analyses?.find(a => a.document_id === doc.id) || null,
      })) as PDFDocument[];

      setDocuments(docsWithAnalyses);
    } else {
      setDocuments([]);
    }
    
    setIsLoading(false);
  }, [selectedFolderId]);

  useEffect(() => {
    fetchFolders();
    fetchDocuments();
  }, [fetchFolders, fetchDocuments]);

  const handleExtractText = async (doc: PDFDocument) => {
    setExtractingIds(prev => new Set(prev).add(doc.id));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-pdf-text`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId: doc.id }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success('Texte extrait avec succès');
      fetchDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur extraction');
    } finally {
      setExtractingIds(prev => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const handleAnalyze = async (doc: PDFDocument) => {
    setAnalyzingIds(prev => new Set(prev).add(doc.id));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId: doc.id }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success('Analyse terminée');
      fetchDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur analyse');
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const handleDelete = async (doc: PDFDocument) => {
    if (!confirm('Supprimer ce document ?')) return;

    try {
      await supabase.storage.from('pdf-documents').remove([doc.storage_path]);
      await supabase.from('pdf_documents').delete().eq('id', doc.id);
      
      toast.success('Document supprimé');
      if (selectedDocument?.id === doc.id) setSelectedDocument(null);
      fetchDocuments();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownload = async (doc: PDFDocument) => {
    const { data } = await supabase.storage
      .from('pdf-documents')
      .createSignedUrl(doc.storage_path, 60);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Sidebar - Folders */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documents PDF
          </h2>
          <FolderManager
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onFoldersChange={fetchFolders}
          />
        </Card>
        
        <Button className="w-full gap-2" onClick={() => setShowUploader(!showUploader)}>
          <Upload className="h-4 w-4" />
          {showUploader ? 'Masquer upload' : 'Importer des PDFs'}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-w-0">
        {/* Upload zone */}
        {showUploader && (
          <Card className="p-4 lg:w-80 flex-shrink-0">
            <PDFUploader
              folders={folders}
              onUploadComplete={() => { fetchDocuments(); setShowUploader(false); }}
              onCreateFolder={() => {}}
            />
          </Card>
        )}

        {/* Documents list */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">{documents.length} document(s)</h3>
            <Button variant="ghost" size="sm" onClick={fetchDocuments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun document</p>
              <Button className="mt-4" onClick={() => setShowUploader(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <PDFCard
                  key={doc.id}
                  document={doc}
                  isSelected={selectedDocument?.id === doc.id}
                  onSelect={() => setSelectedDocument(doc)}
                  onAnalyze={() => handleAnalyze(doc)}
                  onDelete={() => handleDelete(doc)}
                  onDownload={() => handleDownload(doc)}
                  isAnalyzing={analyzingIds.has(doc.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedDocument && !isMobile && (
          <Card className="w-96 flex-shrink-0 overflow-hidden animate-slide-in-right">
            <PDFDetail
              document={selectedDocument}
              onClose={() => setSelectedDocument(null)}
              onAnalyze={() => handleAnalyze(selectedDocument)}
              onExtractText={() => handleExtractText(selectedDocument)}
              onDelete={() => handleDelete(selectedDocument)}
              onDownload={() => handleDownload(selectedDocument)}
              onCreateIncident={() => toast.info('Création incident à implémenter')}
              isAnalyzing={analyzingIds.has(selectedDocument.id)}
              isExtracting={extractingIds.has(selectedDocument.id)}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
