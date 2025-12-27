import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSwipeGesture, SwipeDirection } from '@/hooks/useSwipeGesture';
import { 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  ArrowUp, 
  ArrowDown,
  Trash2,
  ShieldCheck,
  ShieldX,
  Eye,
  Globe,
  User,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/config/appConfig';

export interface DomainGroup {
  domain: string;
  senderEmail?: string;
  emailCount: number;
  examples: Array<{
    id: string;
    subject: string;
    sender: string;
    received_at: string;
  }>;
  isRelevant: boolean;
  matchedKeywords: string[];
}

interface DomainSwipeCardProps {
  group: DomainGroup;
  onSwipe: (direction: SwipeDirection) => void;
  disabled?: boolean;
  totalGroups: number;
  currentIndex: number;
}

export function DomainSwipeCard({
  group,
  onSwipe,
  disabled = false,
  totalGroups,
  currentIndex,
}: DomainSwipeCardProps) {
  const [exitAnimation, setExitAnimation] = useState<SwipeDirection>(null);

  const handleSwipeWithAnimation = (direction: SwipeDirection) => {
    if (!direction) return;
    
    setExitAnimation(direction);
    
    setTimeout(() => {
      onSwipe(direction);
      setExitAnimation(null);
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
      case 'down': return 'border-orange-500 shadow-[0_0_40px_-10px_hsl(25,95%,53%,0.5)]';
      default: return 'border-border';
    }
  };

  const getDirectionIcon = () => {
    const dir = direction || exitAnimation;
    switch (dir) {
      case 'right': return <ShieldCheck className="h-16 w-16 text-green-500" />;
      case 'left': return <Trash2 className="h-16 w-16 text-red-500" />;
      case 'up': return <Eye className="h-16 w-16 text-blue-500" />;
      case 'down': return <ShieldX className="h-16 w-16 text-orange-500" />;
      default: return null;
    }
  };

  const getDirectionLabel = () => {
    const dir = direction || exitAnimation;
    switch (dir) {
      case 'right': return 'Garder (Whitelist)';
      case 'left': return `Supprimer ${group.emailCount} emails`;
      case 'up': return 'Voir plus de détails';
      case 'down': return 'Supprimer + Blacklist';
      default: return null;
    }
  };

  const getDirectionBgColor = () => {
    const dir = direction || exitAnimation;
    switch (dir) {
      case 'right': return 'bg-green-500/20 backdrop-blur-sm';
      case 'left': return 'bg-red-500/20 backdrop-blur-sm';
      case 'up': return 'bg-blue-500/20 backdrop-blur-sm';
      case 'down': return 'bg-orange-500/20 backdrop-blur-sm';
      default: return '';
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto perspective-1000">
      {/* Progress indicator */}
      <div className="absolute -top-8 left-0 right-0 flex justify-center">
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {totalGroups}
        </span>
      </div>

      {/* Direction indicator overlay */}
      {(isDragging || exitAnimation) && (direction || exitAnimation) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className={cn(
            "flex flex-col items-center gap-3 p-8 rounded-3xl transition-all duration-200",
            getDirectionBgColor()
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
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {group.senderEmail ? (
                  <User className="h-5 w-5 text-primary" />
                ) : (
                  <Globe className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <span className="block">{group.senderEmail || group.domain}</span>
                {group.senderEmail && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {group.domain}
                  </span>
                )}
              </div>
            </CardTitle>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={group.isRelevant ? 'default' : 'destructive'}>
                {group.isRelevant ? 'Pertinent' : 'Hors périmètre'}
              </Badge>
              <span className="text-2xl font-bold text-primary">
                {group.emailCount}
              </span>
              <span className="text-xs text-muted-foreground">emails</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Keywords matched */}
          {group.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {group.matchedKeywords.map((kw, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {kw}
                </Badge>
              ))}
            </div>
          )}

          {/* Email examples */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground font-medium">Exemples :</span>
            {group.examples.slice(0, 3).map((example, i) => (
              <div 
                key={example.id} 
                className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1"
                style={{ animationDelay: `${100 + i * 50}ms` }}
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium line-clamp-1">
                    {example.subject || 'Sans sujet'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(example.received_at)}</span>
                </div>
              </div>
            ))}
            {group.emailCount > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{group.emailCount - 3} autres emails similaires
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="grid grid-cols-4 gap-2 text-xs text-center text-muted-foreground pt-4 border-t">
            <div 
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer group" 
              onClick={() => handleSwipeWithAnimation('left')}
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <span>Supprimer</span>
            </div>
            <div 
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-orange-500/10 transition-colors cursor-pointer group" 
              onClick={() => handleSwipeWithAnimation('down')}
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldX className="h-5 w-5 text-orange-500" />
              </div>
              <span>Blacklist</span>
            </div>
            <div 
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-blue-500/10 transition-colors cursor-pointer group" 
              onClick={() => handleSwipeWithAnimation('up')}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <span>Détails</span>
            </div>
            <div 
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-green-500/10 transition-colors cursor-pointer group" 
              onClick={() => handleSwipeWithAnimation('right')}
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <span>Garder</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}