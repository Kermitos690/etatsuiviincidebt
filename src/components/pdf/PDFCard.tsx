import React, { memo } from 'react';
import { FileText, Brain, Loader2, AlertTriangle, CheckCircle, Clock, Trash2, Download, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PDFDocument } from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PDFCardProps {
  document: PDFDocument;
  isSelected: boolean;
  onSelect: () => void;
  onAnalyze: () => void;
  onDelete: () => void;
  onDownload: () => void;
  isAnalyzing?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case 'low': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    default: return 'bg-green-500/20 text-green-500 border-green-500/30';
  }
}

function getExtractionStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'extracting':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export const PDFCard = memo(function PDFCard({
  document,
  isSelected,
  onSelect,
  onAnalyze,
  onDelete,
  onDownload,
  isAnalyzing = false,
}: PDFCardProps) {
  const hasAnalysis = !!document.analysis;
  const problemScore = document.analysis?.problem_score || 0;
  const severity = document.analysis?.severity || 'none';

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "group p-4 cursor-pointer transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.01]",
        isSelected 
          ? "ring-2 ring-primary bg-primary/5" 
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300",
          hasAnalysis 
            ? getSeverityColor(severity)
            : "bg-primary/10 text-primary"
        )}>
          <FileText className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium truncate">{document.original_filename}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>{formatFileSize(document.file_size)}</span>
                <span>•</span>
                <span>{format(new Date(document.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                {document.page_count && (
                  <>
                    <span>•</span>
                    <span>{document.page_count} pages</span>
                  </>
                )}
              </div>
            </div>

            {/* Problem score badge */}
            {hasAnalysis && problemScore > 0 && (
              <Badge 
                variant="outline" 
                className={cn("flex-shrink-0", getSeverityColor(severity))}
              >
                Score: {problemScore}
              </Badge>
            )}
          </div>

          {/* Status & Analysis info */}
          <div className="flex items-center gap-3 mt-3">
            {/* Extraction status */}
            <div className="flex items-center gap-1.5 text-xs">
              {getExtractionStatusIcon(document.extraction_status)}
              <span className="text-muted-foreground">
                {document.extraction_status === 'completed' ? 'Texte extrait' :
                 document.extraction_status === 'extracting' ? 'Extraction...' :
                 document.extraction_status === 'error' ? 'Erreur extraction' :
                 'En attente'}
              </span>
            </div>

            {/* Analysis status */}
            {hasAnalysis && (
              <div className="flex items-center gap-1.5 text-xs">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Analysé</span>
              </div>
            )}

            {/* AI detection badge */}
            {document.analysis?.ai_analysis?.isIncident && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Incident détecté
              </Badge>
            )}
          </div>

          {/* Summary preview */}
          {document.analysis?.summary && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {document.analysis.summary}
            </p>
          )}
        </div>
      </div>

      {/* Actions - always visible */}
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          title="Télécharger"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          title="Voir les détails"
          className="bg-primary/10 hover:bg-primary/20 text-primary"
        >
          <Eye className="h-4 w-4 mr-1" />
          Voir
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
          disabled={isAnalyzing || document.extraction_status !== 'completed'}
          title={document.extraction_status !== 'completed' ? "Extrayez d'abord le texte" : "Analyser avec l'IA"}
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
});

export default PDFCard;
