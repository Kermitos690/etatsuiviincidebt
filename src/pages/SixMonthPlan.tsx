import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Target, 
  CheckCircle2, 
  Clock, 
  Flame,
  Trophy,
  Mail,
  Brain,
  Scale,
  FileText,
  Users,
  AlertTriangle,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface Task {
  id: string;
  label: string;
  completed: boolean;
}

interface Month {
  id: number;
  title: string;
  objective: string;
  icon: React.ElementType;
  tasks: Task[];
}

interface DailyTask {
  id: string;
  label: string;
  frequency: 'daily' | 'weekly';
  lastCompleted: string | null;
}

const STORAGE_KEY = 'six-month-plan-progress';

const initialMonths: Month[] = [
  {
    id: 1,
    title: 'Fondation',
    objective: 'Alimenter la base de données',
    icon: Mail,
    tasks: [
      { id: '1-1', label: 'Configurer Gmail sync avec tous les mots-clés pertinents', completed: false },
      { id: '1-2', label: 'Importer TOUS les emails historiques', completed: false },
      { id: '1-3', label: 'Lancer l\'analyse initiale sur tout le corpus', completed: false },
      { id: '1-4', label: 'Faire 10 min de Swipe Training quotidien pendant 2 semaines', completed: false },
    ]
  },
  {
    id: 2,
    title: 'Correction & Calibration',
    objective: 'Affiner la détection IA',
    icon: Brain,
    tasks: [
      { id: '2-1', label: 'Valider/rejeter les 50 premiers incidents détectés', completed: false },
      { id: '2-2', label: 'Corriger les scores de confiance des acteurs principaux', completed: false },
      { id: '2-3', label: 'Identifier et documenter les faux positifs récurrents', completed: false },
      { id: '2-4', label: 'Vérifier les nouvelles détections chaque semaine', completed: false },
    ]
  },
  {
    id: 3,
    title: 'Enrichissement juridique',
    objective: 'Solidifier les références légales',
    icon: Scale,
    tasks: [
      { id: '3-1', label: 'Vérifier les articles de loi cités pour chaque incident validé', completed: false },
      { id: '3-2', label: 'Ajouter manuellement les références légales manquantes', completed: false },
      { id: '3-3', label: 'Lancer des analyses multi-passes sur les threads complexes', completed: false },
      { id: '3-4', label: 'Documenter les patterns de violations récurrentes', completed: false },
    ]
  },
  {
    id: 4,
    title: 'Corroboration',
    objective: 'Croiser les preuves',
    icon: Users,
    tasks: [
      { id: '4-1', label: 'Lier incidents + emails + pièces jointes dans le Centre de Contrôle', completed: false },
      { id: '4-2', label: 'Analyser les pièces jointes importantes (PDFs, documents officiels)', completed: false },
      { id: '4-3', label: 'Identifier les contradictions entre acteurs', completed: false },
      { id: '4-4', label: 'Créer des chaînes de preuves solides pour chaque incident majeur', completed: false },
    ]
  },
  {
    id: 5,
    title: 'Consolidation',
    objective: 'Préparer le rapport final',
    icon: FileText,
    tasks: [
      { id: '5-1', label: 'Exporter les incidents par institution', completed: false },
      { id: '5-2', label: 'Vérifier la timeline chronologique complète', completed: false },
      { id: '5-3', label: 'Identifier les violations systémiques (récurrence > 3)', completed: false },
      { id: '5-4', label: 'Préparer les citations directes des emails', completed: false },
    ]
  },
  {
    id: 6,
    title: 'Finalisation',
    objective: 'Document final tranchant',
    icon: Trophy,
    tasks: [
      { id: '6-1', label: 'Générer le rapport mensuel cumulatif', completed: false },
      { id: '6-2', label: 'Exporter en PDF avec toutes les preuves', completed: false },
      { id: '6-3', label: 'Vérifier que chaque affirmation a une citation source', completed: false },
      { id: '6-4', label: 'Révision finale du score de gravité global', completed: false },
    ]
  }
];

const initialDailyTasks: DailyTask[] = [
  { id: 'daily-1', label: 'Synchroniser les nouveaux emails', frequency: 'daily', lastCompleted: null },
  { id: 'daily-2', label: '5 swipes de training IA', frequency: 'daily', lastCompleted: null },
  { id: 'daily-3', label: 'Valider 1-2 incidents détectés', frequency: 'daily', lastCompleted: null },
  { id: 'weekly-1', label: 'Vérifier les nouvelles analyses multi-passes', frequency: 'weekly', lastCompleted: null },
  { id: 'weekly-2', label: 'Revoir les scores de confiance des acteurs', frequency: 'weekly', lastCompleted: null },
];

export default function SixMonthPlan() {
  const [months, setMonths] = useState<Month[]>(initialMonths);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(initialDailyTasks);
  const [startDate, setStartDate] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.months) setMonths(data.months);
        if (data.dailyTasks) setDailyTasks(data.dailyTasks);
        if (data.startDate) setStartDate(data.startDate);
      } catch (e) {
        console.error('Error loading progress:', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ months, dailyTasks, startDate }));
  }, [months, dailyTasks, startDate]);

  const toggleTask = (monthId: number, taskId: string) => {
    setMonths(prev => prev.map(month => {
      if (month.id === monthId) {
        return {
          ...month,
          tasks: month.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
      }
      return month;
    }));
  };

  const toggleDailyTask = (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setDailyTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, lastCompleted: task.lastCompleted === today ? null : today } : task
    ));
    toast.success('Tâche marquée comme complétée !');
  };

  const startPlan = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    toast.success('Plan de 6 mois démarré ! Bonne chance 💪');
  };

  const resetProgress = () => {
    setMonths(initialMonths);
    setDailyTasks(initialDailyTasks);
    setStartDate(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.info('Progression réinitialisée');
  };

  const calculateMonthProgress = (month: Month) => {
    const completed = month.tasks.filter(t => t.completed).length;
    return Math.round((completed / month.tasks.length) * 100);
  };

  const calculateOverallProgress = () => {
    const totalTasks = months.reduce((acc, m) => acc + m.tasks.length, 0);
    const completedTasks = months.reduce((acc, m) => acc + m.tasks.filter(t => t.completed).length, 0);
    return Math.round((completedTasks / totalTasks) * 100);
  };

  const getCurrentMonth = () => {
    if (!startDate) return 1;
    const start = new Date(startDate);
    const now = new Date();
    const diffMonths = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return Math.min(Math.max(diffMonths + 1, 1), 6);
  };

  const isDailyTaskCompletedToday = (task: DailyTask) => {
    const today = new Date().toISOString().split('T')[0];
    return task.lastCompleted === today;
  };

  const isWeeklyTaskCompletedThisWeek = (task: DailyTask) => {
    if (!task.lastCompleted) return false;
    const lastCompleted = new Date(task.lastCompleted);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return lastCompleted >= weekAgo;
  };

  const dailyProgress = () => {
    const dailyTasks_ = dailyTasks.filter(t => t.frequency === 'daily');
    const completed = dailyTasks_.filter(isDailyTaskCompletedToday).length;
    return Math.round((completed / dailyTasks_.length) * 100);
  };

  const overallProgress = calculateOverallProgress();
  const currentMonth = getCurrentMonth();

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
              <Target className="h-8 w-8" />
              Plan 6 Mois
            </h1>
            <p className="text-muted-foreground mt-1">
              Construisez un dossier juridique tranchant et pertinent
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!startDate ? (
              <Button onClick={startPlan} className="glow-button">
                <Flame className="h-4 w-4 mr-2" />
                Démarrer le plan
              </Button>
            ) : (
              <Badge variant="outline" className="px-4 py-2 text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Démarré le {new Date(startDate).toLocaleDateString('fr-FR')}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={resetProgress}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{overallProgress}%</h2>
                  <p className="text-muted-foreground">Progression globale</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{currentMonth}</p>
                  <p className="text-xs text-muted-foreground">Mois actuel</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-accent">{dailyProgress()}%</p>
                  <p className="text-xs text-muted-foreground">Tâches du jour</p>
                </div>
              </div>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </CardContent>
        </Card>

        <Tabs defaultValue="months" className="space-y-4">
          <TabsList className="glass-card">
            <TabsTrigger value="months">Par Mois</TabsTrigger>
            <TabsTrigger value="routine">Routine Quotidienne</TabsTrigger>
          </TabsList>

          <TabsContent value="months" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {months.map((month) => {
                const progress = calculateMonthProgress(month);
                const isCurrentMonth = month.id === currentMonth;
                const isPast = month.id < currentMonth;
                const isFuture = month.id > currentMonth;
                const Icon = month.icon;

                return (
                  <Card 
                    key={month.id} 
                    className={`glass-card transition-all duration-300 ${
                      isCurrentMonth ? 'ring-2 ring-primary shadow-glow' : ''
                    } ${isFuture ? 'opacity-60' : ''}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            progress === 100 
                              ? 'bg-green-500/20 text-green-500' 
                              : isCurrentMonth 
                                ? 'bg-primary/20 text-primary' 
                                : 'bg-muted text-muted-foreground'
                          }`}>
                            {progress === 100 ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              Mois {month.id}: {month.title}
                              {isCurrentMonth && (
                                <Badge variant="default" className="text-xs">Actuel</Badge>
                              )}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">{month.objective}</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {month.tasks.map((task) => (
                        <div 
                          key={task.id}
                          className={`flex items-start gap-3 p-2 rounded-lg transition-all cursor-pointer hover:bg-muted/50 ${
                            task.completed ? 'opacity-60' : ''
                          }`}
                          onClick={() => toggleTask(month.id, task.id)}
                        >
                          <Checkbox 
                            checked={task.completed}
                            className="mt-0.5"
                          />
                          <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.label}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="routine" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Daily Tasks */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Tâches Quotidiennes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">5-10 minutes par jour</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dailyTasks.filter(t => t.frequency === 'daily').map((task) => {
                    const isCompleted = isDailyTaskCompletedToday(task);
                    return (
                      <div 
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                          isCompleted 
                            ? 'bg-green-500/10 border border-green-500/30' 
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        onClick={() => toggleDailyTask(task.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isCompleted} />
                          <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
                            {task.label}
                          </span>
                        </div>
                        {isCompleted && (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Fait
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Weekly Tasks */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Tâches Hebdomadaires
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Une fois par semaine</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dailyTasks.filter(t => t.frequency === 'weekly').map((task) => {
                    const isCompleted = isWeeklyTaskCompletedThisWeek(task);
                    return (
                      <div 
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                          isCompleted 
                            ? 'bg-blue-500/10 border border-blue-500/30' 
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        onClick={() => toggleDailyTask(task.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isCompleted} />
                          <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
                            {task.label}
                          </span>
                        </div>
                        {isCompleted && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Fait
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Tips */}
            <Card className="glass-card border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">💡 Conseil du jour</h3>
                    <p className="text-sm text-muted-foreground">
                      La régularité est plus importante que l'intensité. 10 minutes par jour pendant 6 mois 
                      produiront un dossier bien plus solide qu'une semaine intensive suivie d'abandon. 
                      Chaque swipe, chaque validation, chaque correction améliore la précision de l'IA 
                      et renforce votre dossier.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
