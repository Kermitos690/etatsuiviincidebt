/**
 * Email Legal Badge Component
 * Displays legal verification status with DB-first / Perplexity badge
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Scale, Shield, AlertTriangle, CheckCircle, Database, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegalMention {
  id: string;
  match_type: string;
  match_text: string;
  confidence: number;
  resolved: boolean;
  instrument_id?: string;
  resolution_method?: string;
}

interface VerificationReport {
  id: string;
  verification_result: 'verified' | 'rejected' | 'partial' | 'unknown';
  verification_source: string;
  confidence_score: number;
  explanation?: string;
}

interface EmailLegalBadgeProps {
  mentions: LegalMention[];
  verificationReport?: VerificationReport;
  compact?: boolean;
  className?: string;
}

export function EmailLegalBadge({ 
  mentions, 
  verificationReport,
  compact = false,
  className 
}: EmailLegalBadgeProps) {
  const totalMentions = mentions.length;
  const resolvedMentions = mentions.filter(m => m.resolved).length;
  const exactCitations = mentions.filter(m => m.match_type === 'exact_citation').length;
  
  if (totalMentions === 0 && !verificationReport) {
    return null;
  }

  const getVerificationBadge = () => {
    if (!verificationReport) return null;

    const { verification_result, verification_source, confidence_score } = verificationReport;
    
    const configs = {
      verified: {
        icon: CheckCircle,
        label: 'Vérifié',
        variant: 'default' as const,
        className: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
      },
      rejected: {
        icon: AlertTriangle,
        label: 'Rejeté',
        variant: 'destructive' as const,
        className: 'bg-destructive/20 text-destructive border-destructive/30',
      },
      partial: {
        icon: Scale,
        label: 'Partiel',
        variant: 'secondary' as const,
        className: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
      },
      unknown: {
        icon: AlertTriangle,
        label: 'Inconnu',
        variant: 'outline' as const,
        className: '',
      },
    };

    const config = configs[verification_result] || configs.unknown;
    const Icon = config.icon;
    const SourceIcon = verification_source === 'perplexity' ? Globe : Database;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={cn('gap-1', config.className)}>
            <Icon className="h-3 w-3" />
            {!compact && config.label}
            <SourceIcon className="h-3 w-3 ml-0.5" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Vérification {verification_source}</p>
            <p className="text-sm text-muted-foreground">
              {verificationReport.explanation || `Confiance: ${Math.round(confidence_score * 100)}%`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Legal mentions summary */}
      {totalMentions > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                'gap-1',
                resolvedMentions === totalMentions 
                  ? 'border-emerald-500/30 text-emerald-600' 
                  : 'border-amber-500/30 text-amber-600'
              )}
            >
              <Scale className="h-3 w-3" />
              {!compact && (
                <span>
                  {exactCitations > 0 ? `${exactCitations} citation${exactCitations > 1 ? 's' : ''}` : `${totalMentions} ref.`}
                </span>
              )}
              {compact && totalMentions}
              {resolvedMentions === totalMentions ? (
                <Database className="h-3 w-3 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <div className="space-y-2">
              <p className="font-medium">Références légales détectées</p>
              <div className="text-sm space-y-1">
                <p>• {exactCitations} citation(s) exacte(s)</p>
                <p>• {resolvedMentions}/{totalMentions} résolue(s) en DB</p>
              </div>
              {mentions.slice(0, 3).map((m, i) => (
                <p key={i} className="text-xs text-muted-foreground truncate">
                  {m.match_text}
                </p>
              ))}
              {mentions.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{mentions.length - 3} autres...
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Verification badge */}
      {getVerificationBadge()}

      {/* DB-first indicator */}
      {resolvedMentions > 0 && !verificationReport && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Database className="h-3 w-3" />
              {!compact && 'DB-First'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Références résolues via la base légale locale (LKB)
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default EmailLegalBadge;
