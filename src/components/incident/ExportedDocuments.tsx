import { FileText, Download, Trash2, Loader2, Clock, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIncidentExports, IncidentExport } from '@/hooks/useIncidentExports';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ExportedDocumentsProps {
  incidentId: string | undefined;
}

export function ExportedDocuments({ incidentId }: ExportedDocumentsProps) {
  const { exports, loading, downloadExport, deleteExport, refetch } = useIncidentExports(incidentId);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents générés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPdfPlus = (exp: IncidentExport) => {
    return exp.file_name.includes('_PLUS') || 
           exp.export_options?.includeEmails || 
           exp.export_options?.includeDeepAnalysis;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents générés ({exports.length})
          </CardTitle>
          {exports.length > 0 && (
            <Button variant="ghost" size="sm" onClick={refetch}>
              <Clock className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {exports.length === 0 ? (
          <div className="text-center py-6">
            <FileCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Aucun document généré pour cet incident.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cliquez sur "PDF" ou "PDF+" pour générer un rapport.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exports.map((exp) => (
              <div 
                key={exp.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{exp.file_name}</p>
                    {isPdfPlus(exp) && (
                      <Badge variant="secondary" className="text-xs">PDF+</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(exp.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}</span>
                    <span>•</span>
                    <span>{formatFileSize(exp.file_size_bytes)}</span>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => downloadExport(exp)}
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le fichier sera supprimé définitivement.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteExport(exp)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
