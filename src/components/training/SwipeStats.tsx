import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, Target, Trophy, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeStatsProps {
  totalSwipes: number;
  currentStreak: number;
  maxStreak: number;
  correctPredictions: number;
  badges: Array<{ id: string; name: string; icon: string; earned_at: string }>;
  remainingPairs: number;
}

export function SwipeStats({
  totalSwipes,
  currentStreak,
  maxStreak,
  correctPredictions,
  badges,
  remainingPairs,
}: SwipeStatsProps) {
  const accuracy = totalSwipes > 0 ? Math.round((correctPredictions / totalSwipes) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Streak */}
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-2",
            currentStreak >= 10 ? "bg-orange-500/20" : "bg-muted"
          )}>
            <Flame className={cn(
              "h-6 w-6",
              currentStreak >= 10 ? "text-orange-500 animate-pulse" : "text-muted-foreground"
            )} />
          </div>
          <span className="text-2xl font-bold">{currentStreak}</span>
          <span className="text-xs text-muted-foreground">Streak</span>
        </CardContent>
      </Card>

      {/* Total swipes */}
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 bg-primary/20">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-bold">{totalSwipes}</span>
          <span className="text-xs text-muted-foreground">Validés</span>
        </CardContent>
      </Card>

      {/* Accuracy */}
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-2",
            accuracy >= 90 ? "bg-green-500/20" : "bg-muted"
          )}>
            <Target className={cn(
              "h-6 w-6",
              accuracy >= 90 ? "text-green-500" : "text-muted-foreground"
            )} />
          </div>
          <span className="text-2xl font-bold">{accuracy}%</span>
          <span className="text-xs text-muted-foreground">Précision</span>
        </CardContent>
      </Card>

      {/* Max streak */}
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 bg-yellow-500/20">
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <span className="text-2xl font-bold">{maxStreak}</span>
          <span className="text-xs text-muted-foreground">Record</span>
        </CardContent>
      </Card>

      {/* Remaining */}
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 bg-blue-500/20">
            <Star className="h-6 w-6 text-blue-500" />
          </div>
          <span className="text-2xl font-bold">{remainingPairs}</span>
          <span className="text-xs text-muted-foreground">Restants</span>
        </CardContent>
      </Card>

      {/* Badges */}
      {badges.length > 0 && (
        <Card className="glass-card col-span-2 md:col-span-5">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Badges débloqués
            </h4>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.id} variant="secondary" className="gap-1">
                  <span>{badge.icon}</span>
                  <span>{badge.name}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress to next milestone */}
      <Card className="glass-card col-span-2 md:col-span-5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Progression vers le prochain badge
            </span>
            <span className="text-sm font-medium">
              {totalSwipes < 10 ? `${totalSwipes}/10 (Débutant)` :
               totalSwipes < 50 ? `${totalSwipes}/50 (Analyste)` :
               totalSwipes < 200 ? `${totalSwipes}/200 (Expert)` :
               totalSwipes < 500 ? `${totalSwipes}/500 (Maître)` :
               '🎉 Tous débloqués!'}
            </span>
          </div>
          <Progress 
            value={
              totalSwipes < 10 ? (totalSwipes / 10) * 100 :
              totalSwipes < 50 ? ((totalSwipes - 10) / 40) * 100 :
              totalSwipes < 200 ? ((totalSwipes - 50) / 150) * 100 :
              totalSwipes < 500 ? ((totalSwipes - 200) / 300) * 100 :
              100
            } 
            className="h-2"
          />
        </CardContent>
      </Card>
    </div>
  );
}
