import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  XCircle, 
  Archive, 
  Mail, 
  Calendar, 
  Building2, 
  AlertTriangle,
  ChevronDown,
  Scale,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Suggestion {
  id: string;
  suggested_title: string;
  suggested_facts: string | null;
  suggested_dysfunction: string | null;
  suggested_institution: string | null;
  suggested_type: string | null;
  suggested_gravity: string | null;
  confidence: number | null;
  ai_analysis: Record<string, unknown> | null;
  legal_mentions: Record<string, unknown>[] | null;
  status: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_incident_id: string | null;
  created_at: string;
  emails?: {
    id: string;
    subject: string;
    sender: string;
    received_at: string;
    body: string;
  } | null;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApprove?: () => void;
  onReject?: (reason?: string) => void;
  onLowImportance?: () => void;
  isProcessing?: boolean;
  readonly?: boolean;
}

const gravityColors: Record<string, string> = {
  'Critique': 'bg-destructive text-destructive-foreground',
  'Grave': 'bg-orange-500 text-white',
  'Modéré': 'bg-yellow-500 text-black',
  'Mineur': 'bg-green-500 text-white',
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  'pending': { label: 'En attente', color: 'bg-blue-500/10 text-blue-600', icon: Sparkles },
  'approved': { label: 'Validé', color: 'bg-green-500/10 text-green-600', icon: CheckCircle },
  'rejected': { label: 'Rejeté', color: 'bg-red-500/10 text-red-600', icon: XCircle },
  'low_importance': { label: 'Peu important', color: 'bg-muted text-muted-foreground', icon: Archive },
};

export function SuggestionCard({ 
  suggestion, 
  onApprove, 
  onReject, 
  onLowImportance,
  isProcessing,
  readonly = false
}: SuggestionCardProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);

  const confidence = suggestion.confidence || 0;
  const statusInfo = statusConfig[suggestion.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;
  const legalMentionsCount = Array.isArray(suggestion.legal_mentions) ? suggestion.legal_mentions.length : 0;

  const handleReject = () => {
    onReject?.(rejectionReason || undefined);
    setShowRejectDialog(false);
    setRejectionReason('');
  };

  return (
    <>
      <Card className={cn(
        "relative overflow-hidden transition-all duration-200",
        suggestion.status === 'pending' && "border-primary/30 shadow-md hover:shadow-lg",
        suggestion.status === 'approved' && "border-green-500/30",
        suggestion.status === 'rejected' && "border-red-500/20 opacity-75",
        suggestion.status === 'low_importance' && "border-muted opacity-60"
      )}>
        {/* Confidence indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-1">
          <Progress value={confidence} className="h-1 rounded-none" />
        </div>

        <CardHeader className="pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("text-xs", statusInfo.color)}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {confidence}% confiance
                </Badge>
                {suggestion.suggested_gravity && (
                  <Badge className={cn("text-xs", gravityColors[suggestion.suggested_gravity] || 'bg-muted')}>
                    {suggestion.suggested_gravity}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-foreground leading-tight line-clamp-2">
                {suggestion.suggested_title}
              </h3>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
            {suggestion.suggested_institution && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {suggestion.suggested_institution}
              </span>
            )}
            {suggestion.suggested_type && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {suggestion.suggested_type}
              </span>
            )}
            {legalMentionsCount > 0 && (
              <span className="flex items-center gap-1 text-primary">
                <Scale className="h-3 w-3" />
                {legalMentionsCount} ref. légales
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
        </CardHeader>

        <CardContent className="py-0">
          {/* Facts preview */}
          {suggestion.suggested_facts && (
            <div className="mb-3">
              <p className="text-sm text-foreground/80 line-clamp-3">
                {suggestion.suggested_facts}
              </p>
            </div>
          )}

          {/* Source email collapsible */}
          {suggestion.emails && (
            <Collapsible open={isEmailExpanded} onOpenChange={setIsEmailExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t border-border/50">
                  <Mail className="h-3 w-3" />
                  <span className="truncate flex-1 text-left">
                    {suggestion.emails.subject}
                  </span>
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform",
                    isEmailExpanded && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{suggestion.emails.sender}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(suggestion.emails.received_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-foreground/70 line-clamp-5 whitespace-pre-wrap">
                    {suggestion.emails.body.slice(0, 500)}...
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Rejection reason if applicable */}
          {suggestion.status === 'rejected' && suggestion.rejection_reason && (
            <div className="bg-red-500/10 rounded-lg p-3 text-xs mt-3">
              <span className="font-medium text-red-600">Raison du rejet:</span>
              <p className="text-foreground/70 mt-1">{suggestion.rejection_reason}</p>
            </div>
          )}

          {/* Link to created incident */}
          {suggestion.status === 'approved' && suggestion.created_incident_id && (
            <Link 
              to={`/incidents/${suggestion.created_incident_id}`}
              className="flex items-center gap-2 text-xs text-primary hover:underline mt-3"
            >
              <ExternalLink className="h-3 w-3" />
              Voir l'incident créé
            </Link>
          )}
        </CardContent>

        {/* Actions for pending suggestions */}
        {!readonly && suggestion.status === 'pending' && (
          <CardFooter className="pt-4 pb-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejeter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLowImportance}
              disabled={isProcessing}
              className="flex-1"
            >
              <Archive className="h-4 w-4 mr-1" />
              Peu important
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Valider
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Rejection dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter cette suggestion</DialogTitle>
            <DialogDescription>
              Vous pouvez optionnellement indiquer une raison pour le rejet.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Raison du rejet (optionnel)..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isProcessing}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
