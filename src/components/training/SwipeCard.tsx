import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSwipeGesture, SwipeDirection } from '@/hooks/useSwipeGesture';
import { 
  Mail, 
  Calendar, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  ArrowUp, 
  ArrowDown,
  Sparkles,
  Loader2,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/config/appConfig';

interface Email {
  id: string;
  subject: string;
  sender: string;
  recipient?: string;
  body: string;
  received_at: string;
}

interface SwipeCardProps {
  email1: Email;
  email2: Email;
  aiPrediction?: string;
  aiConfidence?: number;
  keywordsOverlap?: string[];
  actorsOverlap?: string[];
  onSwipe: (direction: SwipeDirection) => void;
  onEnrich: () => void;
  isEnriching?: boolean;
  disabled?: boolean;
}

export function SwipeCard({
  email1,
  email2,
  aiPrediction,
  aiConfidence,
  keywordsOverlap = [],
  actorsOverlap = [],
  onSwipe,
  onEnrich,
  isEnriching = false,
  disabled = false,
}: SwipeCardProps) {
  const { isDragging, direction, offset, rotation, handlers } = useSwipeGesture({
    onSwipe,
    threshold: 80,
    disabled,
  });

  const getDirectionColor = () => {
    switch (direction) {
      case 'right': return 'border-green-500 shadow-green-500/30';
      case 'left': return 'border-red-500 shadow-red-500/30';
      case 'up': return 'border-blue-500 shadow-blue-500/30';
      case 'down': return 'border-gray-500 shadow-gray-500/30';
      default: return 'border-border';
    }
  };

  const getDirectionIcon = () => {
    switch (direction) {
      case 'right': return <ArrowRight className="h-12 w-12 text-green-500" />;
      case 'left': return <ArrowLeft className="h-12 w-12 text-red-500" />;
      case 'up': return <ArrowUp className="h-12 w-12 text-blue-500" />;
      case 'down': return <ArrowDown className="h-12 w-12 text-gray-500" />;
      default: return null;
    }
  };

  const getDirectionLabel = () => {
    switch (direction) {
      case 'right': return '✅ Corroboration';
      case 'left': return '❌ Pas de lien';
      case 'up': return '🔍 Analyser avec IA';
      case 'down': return '🗑️ Non pertinent';
      default: return null;
    }
  };

  const confidenceColor = aiConfidence 
    ? aiConfidence >= 0.7 
      ? 'text-green-500' 
      : aiConfidence >= 0.4 
        ? 'text-yellow-500' 
        : 'text-red-500'
    : 'text-muted-foreground';

  const truncateBody = (body: string, maxLength = 200) => {
    if (body.length <= maxLength) return body;
    return body.substring(0, maxLength) + '...';
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Direction indicator overlay */}
      {isDragging && direction && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className={cn(
            "flex flex-col items-center gap-2 p-6 rounded-2xl glass-card animate-pulse",
            direction === 'right' && 'bg-green-500/20',
            direction === 'left' && 'bg-red-500/20',
            direction === 'up' && 'bg-blue-500/20',
            direction === 'down' && 'bg-gray-500/20',
          )}>
            {getDirectionIcon()}
            <span className="text-lg font-semibold">{getDirectionLabel()}</span>
          </div>
        </div>
      )}

      {/* Main card */}
      <Card 
        className={cn(
          "cursor-grab active:cursor-grabbing transition-all duration-200 select-none",
          "border-2 shadow-lg",
          isDragging ? getDirectionColor() : 'border-border',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{
          transform: isDragging 
            ? `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)` 
            : 'none',
        }}
        {...handlers}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Comparaison d'emails
            </CardTitle>
            <div className="flex items-center gap-2">
              {aiPrediction && (
                <Badge variant={aiPrediction === 'corroboration' ? 'default' : 'secondary'}>
                  IA: {aiPrediction === 'corroboration' ? 'Liés' : aiPrediction === 'contradiction' ? 'Contradiction' : 'Non liés'}
                </Badge>
              )}
              {aiConfidence !== undefined && (
                <span className={cn("text-sm font-medium", confidenceColor)}>
                  {Math.round(aiConfidence * 100)}%
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Two emails side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email 1 */}
            <div className="p-4 rounded-xl bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-4 w-4" />
                <span className="font-semibold text-sm">Email 1</span>
              </div>
              <h4 className="font-medium text-sm line-clamp-2">{email1.subject || 'Sans sujet'}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate">{email1.sender}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(email1.received_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-4">
                {truncateBody(email1.body)}
              </p>
            </div>

            {/* Email 2 */}
            <div className="p-4 rounded-xl bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-4 w-4" />
                <span className="font-semibold text-sm">Email 2</span>
              </div>
              <h4 className="font-medium text-sm line-clamp-2">{email2.subject || 'Sans sujet'}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate">{email2.sender}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(email2.received_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-4">
                {truncateBody(email2.body)}
              </p>
            </div>
          </div>

          {/* Common elements */}
          {(keywordsOverlap.length > 0 || actorsOverlap.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {actorsOverlap.map((actor, i) => (
                <Badge key={`actor-${i}`} variant="outline" className="text-xs">
                  👤 {actor}
                </Badge>
              ))}
              {keywordsOverlap.map((kw, i) => (
                <Badge key={`kw-${i}`} variant="secondary" className="text-xs">
                  🔑 {kw}
                </Badge>
              ))}
            </div>
          )}

          {/* Enrich button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEnrich();
              }}
              disabled={isEnriching || disabled}
              className="gap-2"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Analyser avec IA
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="grid grid-cols-4 gap-2 text-xs text-center text-muted-foreground pt-4 border-t">
            <div className="flex flex-col items-center gap-1">
              <ArrowLeft className="h-4 w-4 text-red-500" />
              <span>Non lié</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ArrowDown className="h-4 w-4 text-gray-500" />
              <span>Spam</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ArrowUp className="h-4 w-4 text-blue-500" />
              <span>Analyser</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-4 w-4 text-green-500" />
              <span>Corrobore</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
