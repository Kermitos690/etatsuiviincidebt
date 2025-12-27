import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  AlertTriangle,
  BookOpen,
  Scale,
  Target
} from 'lucide-react';

interface TrainingStats {
  situations: {
    total: number;
    pending: number;
    correct: number;
    incorrect: number;
    needsVerification: number;
    partiallyCorrect: number;
  };
  legalRefs: {
    total: number;
    verified: number;
  };
}

interface TrainingDashboardProps {
  stats: TrainingStats | null;
}

export function TrainingDashboard({ stats }: TrainingDashboardProps) {
  if (!stats) return null;

  const totalValidated = stats.situations.correct + stats.situations.incorrect + 
    stats.situations.partiallyCorrect + stats.situations.needsVerification;
  const validationProgress = stats.situations.total > 0 
    ? (totalValidated / stats.situations.total) * 100 
    : 0;

  const accuracyRate = totalValidated > 0
    ? ((stats.situations.correct + stats.situations.partiallyCorrect) / totalValidated) * 100
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progression</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(validationProgress)}%</div>
          <Progress value={validationProgress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {totalValidated} / {stats.situations.total} situations validées
          </p>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En attente</CardTitle>
          <HelpCircle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.situations.pending}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Situations à valider
          </p>
        </CardContent>
      </Card>

      {/* Accuracy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Précision IA</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{Math.round(accuracyRate)}%</div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">{stats.situations.correct} corrects</span>
            <span className="text-red-600">{stats.situations.incorrect} incorrects</span>
          </div>
        </CardContent>
      </Card>

      {/* Legal References */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Références Légales</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.legalRefs.total}</div>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="text-green-600">{stats.legalRefs.verified} vérifiées</span>
          </p>
        </CardContent>
      </Card>

      {/* Detailed breakdown */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Répartition des validations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <div className="text-sm font-medium">{stats.situations.correct}</div>
                <div className="text-xs text-muted-foreground">Corrects</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div>
                <div className="text-sm font-medium">{stats.situations.incorrect}</div>
                <div className="text-xs text-muted-foreground">Incorrects</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div>
                <div className="text-sm font-medium">{stats.situations.needsVerification}</div>
                <div className="text-xs text-muted-foreground">À vérifier</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <div>
                <div className="text-sm font-medium">{stats.situations.partiallyCorrect}</div>
                <div className="text-xs text-muted-foreground">Partiels</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div>
                <div className="text-sm font-medium">{stats.situations.pending}</div>
                <div className="text-xs text-muted-foreground">En attente</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
