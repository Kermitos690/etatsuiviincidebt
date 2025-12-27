import React, { memo } from 'react';
import { Brain, MessageSquare, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Email } from './types';

interface EmailActionsProps {
  email: Email | null;
  isProcessing: boolean;
  isAdvancedAnalyzing: boolean;
  onAnalyze: () => void;
  onAdvancedAnalyze: () => void;
  onCreateIncident: () => void;
  onGenerateResponse: () => void;
}

function EmailActionsInner({
  email,
  isProcessing,
  isAdvancedAnalyzing,
  onAnalyze,
  onAdvancedAnalyze,
  onCreateIncident,
  onGenerateResponse,
}: EmailActionsProps) {
  if (!email) return null;

  const canCreateIncident = email.ai_analysis?.isIncident && !email.incident_id;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-30 lg:hidden",
        "bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-border/50",
        "p-3 animate-slide-up"
      )}
    >
      <div className="flex items-center justify-around gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAnalyze}
          disabled={isProcessing}
          className="flex-1 flex-col h-auto py-2 gap-1"
        >
          <RefreshCw className={cn("h-5 w-5", isProcessing && "animate-spin")} />
          <span className="text-xs">Analyser</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onAdvancedAnalyze}
          disabled={isAdvancedAnalyzing}
          className="flex-1 flex-col h-auto py-2 gap-1"
        >
          <Zap className={cn("h-5 w-5", isAdvancedAnalyzing && "animate-spin")} />
          <span className="text-xs">Avancé</span>
        </Button>

        {canCreateIncident && (
          <Button
            onClick={onCreateIncident}
            size="sm"
            className="flex-1 flex-col h-auto py-2 gap-1 bg-destructive hover:bg-destructive/90"
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs">Incident</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerateResponse}
          disabled={!email.ai_analysis}
          className="flex-1 flex-col h-auto py-2 gap-1"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">Répondre</span>
        </Button>
      </div>
    </div>
  );
}

export const EmailActions = memo(EmailActionsInner);
export default EmailActions;
