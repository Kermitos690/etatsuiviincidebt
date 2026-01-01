import React, { memo } from 'react';
import { Mail, AlertTriangle, Clock, Check, Building2, ChevronRight, Brain, Eye, Paperclip, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EmailThread } from './types';

interface EmailCardProps {
  thread: EmailThread;
  isSelected: boolean;
  isExpanded: boolean;
  isProcessing: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onAnalyze: () => void;
  onView: () => void;
  onDelete?: () => void;
  formatDate: (date: string) => string;
  animationDelay?: number;
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'from-emerald-400 to-emerald-600';
  if (confidence >= 60) return 'from-amber-400 to-orange-500';
  return 'from-red-400 to-red-600';
};

function EmailCardInner({
  thread,
  isSelected,
  isExpanded,
  isProcessing,
  onSelect,
  onToggle,
  onAnalyze,
  onView,
  onDelete,
  formatDate,
  animationDelay = 0,
}: EmailCardProps) {
  const hasAttachments = thread.emails.some(e => e.attachments && e.attachments.length > 0);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        "bg-card/80 backdrop-blur-sm border border-border/50",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
        "active:scale-[0.98] touch-manipulation",
        isSelected && "ring-2 ring-primary shadow-glow border-primary/50",
        thread.hasIncident && "border-l-4 border-l-destructive"
      )}
      style={{ 
        animationDelay: `${animationDelay}ms`,
        animation: 'scale-in 0.3s ease-out backwards'
      }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div
        className="relative p-4 cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-start gap-3">
          {/* Avatar / Thread indicator */}
          <div 
            className={cn(
              "relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
              "transition-all duration-300 group-hover:scale-105",
              thread.emails.length > 1
                ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg"
                : "bg-secondary/80"
            )}
          >
            {thread.emails.length > 1 ? (
              <span className="text-white font-bold">{thread.emails.length}</span>
            ) : (
              <Mail className="h-5 w-5 text-muted-foreground" />
            )}
            
            {/* Unread indicator */}
            {thread.hasUnprocessed && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse shadow-glow-sm" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {thread.hasIncident && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs px-2 py-0.5">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Incident</span>
                </Badge>
              )}
              {thread.hasUnprocessed && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5">
                  <Clock className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Nouveau</span>
                </Badge>
              )}
              {hasAttachments && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  <Paperclip className="h-3 w-3" />
                </Badge>
              )}
              {thread.avgConfidence > 0 && (
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r text-white",
                  getConfidenceColor(thread.avgConfidence)
                )}>
                  {thread.avgConfidence}%
                </span>
              )}
            </div>

            {/* Subject */}
            <h4 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {thread.subject}
            </h4>

            {/* Participants & Date */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground truncate flex-1">
                {thread.participants.slice(0, 2).map(p => p.split('@')[0]).join(', ')}
                {thread.participants.length > 2 && ` +${thread.participants.length - 2}`}
              </p>
              <span className="text-xs text-muted-foreground flex-shrink-0 font-medium">
                {formatDate(thread.latestDate)}
              </span>
            </div>

            {/* Institution badge */}
            {thread.institution && (
              <Badge variant="secondary" className="text-xs mt-1">
                <Building2 className="h-3 w-3 mr-1" />
                <span className="truncate max-w-[150px]">{thread.institution}</span>
              </Badge>
            )}
          </div>

          {/* Expand indicator for multi-email threads */}
          {thread.emails.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <ChevronRight
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90"
                )}
              />
            </button>
          )}
        </div>

        {/* Quick Actions - Mobile optimized with tooltips */}
        <TooltipProvider delayDuration={300}>
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze();
                  }}
                  disabled={isProcessing}
                  className="flex-1 h-9 text-xs hover:bg-primary/10 hover:text-primary"
                >
                  <Brain className={cn("h-4 w-4 mr-1.5", isProcessing && "animate-spin")} />
                  <span className="hidden xs:inline">Analyser</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Analyser avec l'IA</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                  className="flex-1 h-9 text-xs hover:bg-primary/10 hover:text-primary"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  <span className="hidden xs:inline">Détails</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Voir les détails</p>
              </TooltipContent>
            </Tooltip>
            
            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="h-9 text-xs hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Supprimer</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Expanded emails list */}
      {isExpanded && thread.emails.length > 1 && (
        <div className="border-t border-border/50 bg-secondary/20 animate-accordion-down">
          {thread.emails.map((email, idx) => (
            <div
              key={email.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className={cn(
                "p-3 pl-16 cursor-pointer transition-colors",
                "hover:bg-secondary/50 border-b border-border/30 last:border-b-0"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {email.incident_id ? (
                  <Badge className="bg-emerald-500/20 text-emerald-600 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Incident
                  </Badge>
                ) : email.ai_analysis?.isIncident ? (
                  <Badge className="bg-destructive/20 text-destructive text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Détecté
                  </Badge>
                ) : email.processed ? (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Analysé
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Attente
                  </Badge>
                )}
              </div>
              <p className="text-sm truncate">{email.sender.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(email.received_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const EmailCard = memo(EmailCardInner);
export default EmailCard;
