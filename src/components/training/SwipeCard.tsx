import { useState, useEffect } from 'react';
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
  Brain,
  CheckCircle2,
  XCircle,
  Search,
  Trash2
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
  const [exitAnimation, setExitAnimation] = useState<SwipeDirection>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSwipeWithAnimation = (direction: SwipeDirection) => {
    if (!direction) return;
    
    setExitAnimation(direction);
    setShowSuccess(direction === 'right');
    
    // Delay the actual swipe to let animation play
    setTimeout(() => {
      onSwipe(direction);
      setExitAnimation(null);
      setShowSuccess(false);
    }, 400);
  };

  const { isDragging, direction, offset, rotation, handlers } = useSwipeGesture({
    onSwipe: handleSwipeWithAnimation,
    threshold: 80,
    disabled: disabled || !!exitAnimation,
  });

  const getDirectionStyles = () => {
    if (exitAnimation) {
      switch (exitAnimation) {
        case 'right': return 'animate-swipe-out-right';
        case 'left': return 'animate-swipe-out-left';
        case 'up': return 'animate-swipe-out-up';
        case 'down': return 'animate-swipe-out-down';
      }
    }
    return '';
  };

  const getDirectionColor = () => {
    const dir = direction || exitAnimation;
    switch (dir) {
      case 'right': return 'border-green-500 shadow-[0_0_40px_-10px_hsl(142,76%,36%,0.5)]';
      case 'left': return 'border-red-500 shadow-[0_0_40px_-10px_hsl(0,84%,60%,0.5)]';
      case 'up': return 'border-blue-500 shadow-[0_0_40px_-10px_hsl(211,100%,50%,0.5)]';
      case 'down': return 'border-gray-500 shadow-[0_0_40px_-10px_hsl(0,0%,50%,0.5)]';
      default: return 'border-border';
    }
  };

  const getDirectionIcon = () => {
    const dir = direction || exitAnimation;
    switch (dir) {
      case 'right': return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case 'left': return <XCircle className="h-16 w-16 text-red-500" />;
      case 'up': return <Search className="h-16 w-16 text-blue-500" />;
      case 'down': return <Trash2 className="h-16 w-16 text-gray-500" />;
      default: return null;
    }
  };

  const getDirectionLabel = () => {
    const dir = direction || exitAnimation;
    switch (dir) {
      case 'right': return 'Corroboration confirmée';
      case 'left': return 'Pas de lien';
      case 'up': return 'Analyser avec IA';
      case 'down': return 'Non pertinent';
      default: return null;
    }
  };

  const getDirectionBgColor = () => {
    const dir = direction || exitAnimation;
    switch (dir) {
      case 'right': return 'bg-green-500/20 backdrop-blur-sm';
      case 'left': return 'bg-red-500/20 backdrop-blur-sm';
      case 'up': return 'bg-blue-500/20 backdrop-blur-sm';
      case 'down': return 'bg-gray-500/20 backdrop-blur-sm';
      default: return '';
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
    <div className="relative w-full max-w-4xl mx-auto perspective-1000">
      {/* Direction indicator overlay */}
      {(isDragging || exitAnimation) && (direction || exitAnimation) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className={cn(
            "flex flex-col items-center gap-3 p-8 rounded-3xl transition-all duration-200",
            getDirectionBgColor(),
            showSuccess && "animate-success-pulse"
          )}>
            <div className="animate-scale-in">
              {getDirectionIcon()}
            </div>
            <span className="text-lg font-semibold animate-slide-up">
              {getDirectionLabel()}
            </span>
          </div>
        </div>
      )}

      {/* Main card */}
      <Card 
        className={cn(
          "cursor-grab active:cursor-grabbing select-none",
          "border-2 shadow-lg transition-shadow duration-300",
          "hover:shadow-glow-sm",
          isDragging || exitAnimation ? getDirectionColor() : 'border-border',
          getDirectionStyles(),
          disabled && 'opacity-50 cursor-not-allowed',
          !exitAnimation && 'animate-card-enter'
        )}
        style={{
          transform: isDragging && !exitAnimation
            ? `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${1 + Math.abs(offset.x) * 0.0002})` 
            : undefined,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        {...handlers}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="relative">
                <Sparkles className="h-5 w-5 text-primary" />
                <div className="absolute inset-0 animate-pulse-glow rounded-full" />
              </div>
              Comparaison d'emails
            </CardTitle>
            <div className="flex items-center gap-2">
              {aiPrediction && (
                <Badge 
                  variant={aiPrediction === 'corroboration' ? 'default' : 'secondary'}
                  className="animate-scale-in"
                >
                  IA: {aiPrediction === 'corroboration' ? 'Liés' : aiPrediction === 'contradiction' ? 'Contradiction' : 'Non liés'}
                </Badge>
              )}
              {aiConfidence !== undefined && (
                <span className={cn(
                  "text-sm font-medium px-2 py-1 rounded-md bg-muted/50",
                  confidenceColor
                )}>
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
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2 hover:bg-muted/50 transition-colors duration-200 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-2 text-primary">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
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
              <p className="text-xs text-muted-foreground mt-2 line-clamp-4 leading-relaxed">
                {truncateBody(email1.body)}
              </p>
            </div>

            {/* Email 2 */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2 hover:bg-muted/50 transition-colors duration-200 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-2 text-primary">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
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
              <p className="text-xs text-muted-foreground mt-2 line-clamp-4 leading-relaxed">
                {truncateBody(email2.body)}
              </p>
            </div>
          </div>

          {/* Common elements */}
          {(keywordsOverlap.length > 0 || actorsOverlap.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 animate-slide-up" style={{ animationDelay: '300ms' }}>
              {actorsOverlap.map((actor, i) => (
                <Badge key={`actor-${i}`} variant="outline" className="text-xs gap-1 animate-scale-in" style={{ animationDelay: `${400 + i * 50}ms` }}>
                  <User className="h-3 w-3" />
                  {actor}
                </Badge>
              ))}
              {keywordsOverlap.map((kw, i) => (
                <Badge key={`kw-${i}`} variant="secondary" className="text-xs gap-1 animate-scale-in" style={{ animationDelay: `${400 + (actorsOverlap.length + i) * 50}ms` }}>
                  <Sparkles className="h-3 w-3" />
                  {kw}
                </Badge>
              ))}
            </div>
          )}

          {/* Enrich button */}
          <div className="flex justify-center pt-2 animate-slide-up" style={{ animationDelay: '400ms' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEnrich();
              }}
              disabled={isEnriching || disabled}
              className="gap-2 hover:shadow-glow-sm transition-all duration-300"
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
          <div className="grid grid-cols-4 gap-2 text-xs text-center text-muted-foreground pt-4 border-t animate-slide-up" style={{ animationDelay: '500ms' }}>
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer group" onClick={() => handleSwipeWithAnimation('left')}>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowLeft className="h-5 w-5 text-red-500" />
              </div>
              <span>Non lié</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-gray-500/10 transition-colors cursor-pointer group" onClick={() => handleSwipeWithAnimation('down')}>
              <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDown className="h-5 w-5 text-gray-500" />
              </div>
              <span>Spam</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-blue-500/10 transition-colors cursor-pointer group" onClick={() => handleSwipeWithAnimation('up')}>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUp className="h-5 w-5 text-blue-500" />
              </div>
              <span>Analyser</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-green-500/10 transition-colors cursor-pointer group" onClick={() => handleSwipeWithAnimation('right')}>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowRight className="h-5 w-5 text-green-500" />
              </div>
              <span>Corrobore</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
