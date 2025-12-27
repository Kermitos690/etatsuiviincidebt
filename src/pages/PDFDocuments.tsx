import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Upload, Loader2, RefreshCw, Columns2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout';
import { 
  PDFUploader, PDFCard, PDFDetail, PDFDocument, PDFFolder,
  PDFSearchFilters, filterDocuments, PDFFilters, PDFCompareView,
  SituationParticipant, SituationTimelineEvent, SituationViolation, SituationRecommendation
} from '@/components/pdf';
import { SituationManager } from '@/components/pdf/SituationManager';
import { SituationDetail } from '@/components/pdf/SituationDetail';

export default function PDFDocuments() {
  const isMobile = useIsMobile();
  const [folders, setFolders] = useState<PDFFolder[]>([]);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<PDFFolder | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzingSituation, setIsAnalyzingSituation] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());
  const [showUploader, setShowUploader] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [activeTab, setActiveTab] = useState<'situations' | 'documents'>('situations');
  
  // Filters
  const [filters, setFilters] = useState<PDFFilters>({
    search: '',
    tags: [],
    documentType: null,
    severity: null,
    dateFrom: null,
    dateTo: null,
    hasIncident: null,
    hasAnalysis: null,
  });

  // Extract all unique tags and document types
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    documents.forEach(doc => doc.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [documents]);

  const documentTypes = useMemo(() => {
    const types = new Set<string>();
    documents.forEach(doc => {
      if (doc.document_type) types.add(doc.document_type);
    });
    return Array.from(types).sort();
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return filterDocuments(documents, filters);
  }, [documents, filters]);

  // Helper pour convertir les JSON en types typés
  const parseFolderData = (folder: any): PDFFolder => {
    return {
      ...folder,
      participants: Array.isArray(folder.participants) ? folder.participants as SituationParticipant[] : [],
      timeline: Array.isArray(folder.timeline) ? folder.timeline as SituationTimelineEvent[] : [],
      violations_detected: Array.isArray(folder.violations_detected) ? folder.violations_detected as SituationViolation[] : [],
      recommendations: Array.isArray(folder.recommendations) ? folder.recommendations as SituationRecommendation[] : [],
    };
  };

  const fetchFolders = useCallback(async () => {
    const { data, error } = await supabase
      .from('pdf_folders')
      .select('*')
      .order('priority', { ascending: false })
      .order('problem_score', { ascending: false })
      .order('name');
    
    if (!error && data) {
      // Count documents per folder
      const { data: docCounts } = await supabase
        .from('pdf_documents')
        .select('folder_id');
      
      const countMap = new Map<string, number>();
      docCounts?.forEach(d => {
        if (d.folder_id) {
          countMap.set(d.folder_id, (countMap.get(d.folder_id) || 0) + 1);
        }
      });
      
      const foldersWithCount = data.map(folder => parseFolderData({
        ...folder,
        documentsCount: countMap.get(folder.id) || 0,
      }));
      
      setFolders(foldersWithCount);
    }
  }, []);

  // Analyser une situation complète
  const handleAnalyzeSituation = useCallback(async (folderId: string) => {
    setIsAnalyzingSituation(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('analyze-situation', {
        body: { folderId },
      });

      if (error) throw new Error(error.message);

      toast.success(`Analyse terminée - Score: ${data.analysis?.problem_score || 0}/100`);
      fetchFolders();
    } catch (error) {
      console.error('Error analyzing situation:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzingSituation(false);
    }
  }, [fetchFolders]);

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

    if (docs && docs.length > 0) {
      const docIds = docs.map(d => d.id);
      const { data: analyses } = await supabase
        .from('pdf_analyses')
        .select('*')
        .in('document_id', docIds);

      const docsWithAnalyses = docs.map(doc => ({
        ...doc,
        tags: doc.tags || [],
        analysis: analyses?.find(a => a.document_id === doc.id) || null,
      })) as unknown as PDFDocument[];

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

  // Quand on sélectionne un dossier, charger ses détails
  useEffect(() => {
    if (selectedFolderId) {
      const folder = folders.find(f => f.id === selectedFolderId);
      setSelectedFolder(folder || null);
    } else {
      setSelectedFolder(null);
    }
  }, [selectedFolderId, folders]);

  const handleExtractText = async (doc: PDFDocument) => {
    setExtractingIds(prev => new Set(prev).add(doc.id));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { error } = await supabase.functions.invoke('extract-pdf-text', {
        body: { documentId: doc.id },
      });

      if (error) throw new Error(error.message);

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

      const { error } = await supabase.functions.invoke('analyze-pdf', {
        body: { documentId: doc.id },
      });

      if (error) throw new Error(error.message);

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
      fetchFolders(); // Refresh folder counts
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

  const handleCompareSelect = (doc: PDFDocument) => {
    if (!compareMode) {
      setSelectedDocument(doc);
      return;
    }

    if (compareIds[0] === doc.id) {
      setCompareIds([null, compareIds[1]]);
    } else if (compareIds[1] === doc.id) {
      setCompareIds([compareIds[0], null]);
    } else if (!compareIds[0]) {
      setCompareIds([doc.id, compareIds[1]]);
    } else if (!compareIds[1]) {
      setCompareIds([compareIds[0], doc.id]);
    } else {
      setCompareIds([compareIds[1], doc.id]);
    }
  };

  const toggleCompareMode = () => {
    if (compareMode) {
      setCompareMode(false);
      setCompareIds([null, null]);
    } else {
      setCompareMode(true);
      setSelectedDocument(null);
    }
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedDocument(null);
    if (folderId) {
      setActiveTab('documents');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row h-full min-h-0 gap-4 p-4">
        {/* Sidebar - Actions */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Gestion Situations
            </h2>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="situations" className="flex-1">Situations</TabsTrigger>
                <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
              </TabsList>
            </Tabs>
          </Card>
          
          <Button className="w-full gap-2" onClick={() => setShowUploader(!showUploader)}>
            <Upload className="h-4 w-4" />
            {showUploader ? 'Masquer upload' : 'Importer des PDFs'}
          </Button>

          {activeTab === 'documents' && (
            <Button 
              variant={compareMode ? "secondary" : "outline"} 
              className="w-full gap-2" 
              onClick={toggleCompareMode}
            >
              <Columns2 className="h-4 w-4" />
              {compareMode ? 'Quitter comparaison' : 'Comparer'}
            </Button>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0 overflow-y-auto">
          {/* Upload zone */}
          {showUploader && (
            <Card className="p-4">
              <PDFUploader
                folders={folders}
                onUploadComplete={() => { 
                  fetchDocuments(); 
                  fetchFolders();
                  setShowUploader(false); 
                }}
                onCreateFolder={() => {}}
              />
            </Card>
          )}

          {activeTab === 'situations' && (
            <SituationManager
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleSelectFolder}
              onFoldersChange={fetchFolders}
              onAnalyzeSituation={handleAnalyzeSituation}
              isAnalyzing={isAnalyzingSituation}
            />
          )}

          {activeTab === 'documents' && (
            <>
              {/* Breadcrumb si dossier sélectionné */}
              {selectedFolderId && selectedFolder && (
                <div className="flex items-center gap-2 text-sm">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSelectFolder(null)}
                  >
                    ← Toutes les situations
                  </Button>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium">{selectedFolder.name}</span>
                  <span className="text-muted-foreground">
                    ({filteredDocuments.length} documents)
                  </span>
                </div>
              )}

              {/* Search & Filters */}
              <div>
                <PDFSearchFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  allTags={allTags}
                  documentTypes={documentTypes}
                />
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {filteredDocuments.length} document(s)
                  {filteredDocuments.length !== documents.length && (
                    <span className="text-muted-foreground"> sur {documents.length}</span>
                  )}
                </h3>
                <Button variant="ghost" size="sm" onClick={fetchDocuments}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {documents.length === 0 ? 'Aucun document dans cette situation' : 'Aucun résultat'}
                  </p>
                  {documents.length === 0 && (
                    <Button className="mt-4" onClick={() => setShowUploader(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importer
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-3 pb-4">
                  {filteredDocuments.map(doc => (
                    <PDFCard
                      key={doc.id}
                      document={doc}
                      isSelected={
                        compareMode 
                          ? compareIds.includes(doc.id)
                          : selectedDocument?.id === doc.id
                      }
                      onSelect={() => handleCompareSelect(doc)}
                      onAnalyze={() => handleAnalyze(doc)}
                      onDelete={() => handleDelete(doc)}
                      onDownload={() => handleDownload(doc)}
                      isAnalyzing={analyzingIds.has(doc.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel - Desktop only */}
        {!isMobile && activeTab === 'situations' && selectedFolder && (
          <Card className="w-[500px] flex-shrink-0 overflow-y-auto max-h-full animate-slide-in-right">
            <SituationDetail
              folder={selectedFolder}
              onClose={() => setSelectedFolderId(null)}
              onAnalyze={() => handleAnalyzeSituation(selectedFolder.id)}
              isAnalyzing={isAnalyzingSituation}
            />
          </Card>
        )}

        {!isMobile && activeTab === 'documents' && selectedDocument && !compareMode && (
          <Card className="w-96 flex-shrink-0 overflow-y-auto max-h-full animate-slide-in-right">
            <PDFDetail
              document={selectedDocument}
              onClose={() => setSelectedDocument(null)}
              onAnalyze={() => handleAnalyze(selectedDocument)}
              onExtractText={() => handleExtractText(selectedDocument)}
              onDelete={() => handleDelete(selectedDocument)}
              onDownload={() => handleDownload(selectedDocument)}
              onCreateIncident={() => toast.info('Utilisez le panneau de liaison')}
              isAnalyzing={analyzingIds.has(selectedDocument.id)}
              isExtracting={extractingIds.has(selectedDocument.id)}
            />
          </Card>
        )}

        {!isMobile && compareMode && compareIds[0] && compareIds[1] && (
          <Card className="w-[500px] flex-shrink-0 overflow-y-auto max-h-full animate-slide-in-right">
            <PDFCompareView
              documents={documents}
              selectedIds={compareIds as [string, string]}
              onClose={() => setCompareIds([null, null])}
              onDocumentSelect={(pos, id) => {
                const newIds = [...compareIds] as [string | null, string | null];
                newIds[pos] = id;
                setCompareIds(newIds);
              }}
            />
          </Card>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && activeTab === 'situations' && selectedFolder && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-2xl shadow-2xl max-h-[70vh] overflow-auto animate-slide-in-right">
          <div className="p-1 flex justify-center">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <SituationDetail
            folder={selectedFolder}
            onClose={() => setSelectedFolderId(null)}
            onAnalyze={() => handleAnalyzeSituation(selectedFolder.id)}
            isAnalyzing={isAnalyzingSituation}
          />
        </div>
      )}

      {isMobile && activeTab === 'documents' && selectedDocument && !compareMode && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-2xl shadow-2xl max-h-[70vh] overflow-auto animate-slide-in-right">
          <div className="p-1 flex justify-center">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <PDFDetail
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onAnalyze={() => handleAnalyze(selectedDocument)}
            onExtractText={() => handleExtractText(selectedDocument)}
            onDelete={() => handleDelete(selectedDocument)}
            onDownload={() => handleDownload(selectedDocument)}
            onCreateIncident={() => toast.info('Utilisez le panneau de liaison')}
            isAnalyzing={analyzingIds.has(selectedDocument.id)}
            isExtracting={extractingIds.has(selectedDocument.id)}
          />
        </div>
      )}
    </AppLayout>
  );
}
