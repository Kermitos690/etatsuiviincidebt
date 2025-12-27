import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, isWithinInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(30, 70%, 50%)',
];

const SEVERITY_COLORS = {
  'Critique': 'hsl(0, 70%, 50%)',
  'Haute': 'hsl(30, 70%, 50%)',
  'Moyenne': 'hsl(45, 70%, 50%)',
  'Faible': 'hsl(120, 40%, 50%)',
};

export default function WeeklyDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewType, setViewType] = useState<'week' | 'month'>('week');

  const currentDate = useMemo(() => {
    const base = new Date();
    return viewType === 'week' ? addWeeks(base, -weekOffset) : addWeeks(base, -weekOffset * 4);
  }, [weekOffset, viewType]);

  const dateRange = useMemo(() => {
    if (viewType === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    // For month view, show 4 weeks
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const start = startOfWeek(subWeeks(currentDate, 3), { weekStartsOn: 1 });
    return { start, end };
  }, [currentDate, viewType]);

  // Fetch incidents
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['weekly-incidents', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all incidents for comparison
  const { data: allIncidents } = useQuery({
    queryKey: ['all-incidents-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, institution, gravite, statut, created_at')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!incidents) return null;

    const byInstitution: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    incidents.forEach(inc => {
      // By institution
      byInstitution[inc.institution] = (byInstitution[inc.institution] || 0) + 1;
      
      // By severity
      bySeverity[inc.gravite] = (bySeverity[inc.gravite] || 0) + 1;
      
      // By status
      byStatus[inc.statut] = (byStatus[inc.statut] || 0) + 1;
      
      // By day
      const day = format(parseISO(inc.created_at), 'EEE dd/MM', { locale: fr });
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return {
      total: incidents.length,
      byInstitution: Object.entries(byInstitution)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      bySeverity: Object.entries(bySeverity)
        .map(([name, value]) => ({ name, value })),
      byStatus: Object.entries(byStatus)
        .map(([name, value]) => ({ name, value })),
      byDay: Object.entries(byDay)
        .map(([name, value]) => ({ name, value })),
      criticalCount: bySeverity['Critique'] || 0,
      highCount: bySeverity['Haute'] || 0,
    };
  }, [incidents]);

  // Evolution data (weekly comparison)
  const evolutionData = useMemo(() => {
    if (!allIncidents) return [];

    const weeks: Record<string, { week: string; count: number; critical: number; high: number }> = {};
    
    // Get last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'dd/MM', { locale: fr });
      
      weeks[weekKey] = {
        week: `S${format(weekStart, 'w')}`,
        count: 0,
        critical: 0,
        high: 0,
      };

      allIncidents.forEach(inc => {
        const incDate = parseISO(inc.created_at);
        if (isWithinInterval(incDate, { start: weekStart, end: weekEnd })) {
          weeks[weekKey].count++;
          if (inc.gravite === 'Critique') weeks[weekKey].critical++;
          if (inc.gravite === 'Haute') weeks[weekKey].high++;
        }
      });
    }

    return Object.values(weeks);
  }, [allIncidents]);

  // Institution evolution over time
  const institutionEvolution = useMemo((): { data: Record<string, string | number>[]; institutions: string[] } => {
    if (!allIncidents) return { data: [], institutions: [] };

    const institutions = [...new Set(allIncidents.map(i => i.institution))].slice(0, 5);
    const weeks: Record<string, Record<string, string | number>> = {};

    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const weekKey = `S${format(weekStart, 'w')}`;
      
      weeks[weekKey] = { week: weekKey };
      institutions.forEach(inst => {
        weeks[weekKey][inst] = 0;
      });

      allIncidents.forEach(inc => {
        const incDate = parseISO(inc.created_at);
        if (isWithinInterval(incDate, { start: weekStart, end: weekEnd }) && institutions.includes(inc.institution)) {
          weeks[weekKey][inc.institution] = ((weeks[weekKey][inc.institution] as number) || 0) + 1;
        }
      });
    }

    return { data: Object.values(weeks), institutions };
  }, [allIncidents]);

  // Previous period comparison
  const comparison = useMemo(() => {
    if (!allIncidents) return null;

    const currentStart = dateRange.start;
    const currentEnd = dateRange.end;
    const periodLength = viewType === 'week' ? 7 : 28;
    const previousStart = subWeeks(currentStart, viewType === 'week' ? 1 : 4);
    const previousEnd = subWeeks(currentEnd, viewType === 'week' ? 1 : 4);

    const currentCount = allIncidents.filter(inc => {
      const d = parseISO(inc.created_at);
      return isWithinInterval(d, { start: currentStart, end: currentEnd });
    }).length;

    const previousCount = allIncidents.filter(inc => {
      const d = parseISO(inc.created_at);
      return isWithinInterval(d, { start: previousStart, end: previousEnd });
    }).length;

    const change = previousCount > 0 
      ? Math.round(((currentCount - previousCount) / previousCount) * 100)
      : currentCount > 0 ? 100 : 0;

    return { currentCount, previousCount, change };
  }, [allIncidents, dateRange, viewType]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    setWeekOffset(prev => direction === 'prev' ? prev + 1 : Math.max(0, prev - 1));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader 
            title="Dashboard Hebdomadaire" 
            description="Évolution des incidents par institution et période"
          />
          
          <div className="flex items-center gap-2">
            <Select value={viewType} onValueChange={(v: 'week' | 'month') => setViewType(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semaine</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigatePeriod('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-3 py-1 text-sm font-medium min-w-[180px] text-center">
                {format(dateRange.start, 'dd MMM', { locale: fr })} - {format(dateRange.end, 'dd MMM yyyy', { locale: fr })}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigatePeriod('next')}
                disabled={weekOffset === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total incidents</p>
                  <p className="text-3xl font-bold">{stats?.total || 0}</p>
                  {comparison && (
                    <div className={`flex items-center gap-1 text-xs mt-1 ${
                      comparison.change > 0 ? 'text-destructive' : 
                      comparison.change < 0 ? 'text-green-500' : 'text-muted-foreground'
                    }`}>
                      {comparison.change > 0 ? <TrendingUp className="h-3 w-3" /> : 
                       comparison.change < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                      {comparison.change > 0 ? '+' : ''}{comparison.change}% vs période précédente
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critiques</p>
                  <p className="text-3xl font-bold text-destructive">{stats?.criticalCount || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Haute priorité</p>
                  <p className="text-3xl font-bold text-orange-500">{stats?.highCount || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Institutions</p>
                  <p className="text-3xl font-bold">{stats?.byInstitution.length || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="evolution" className="space-y-4">
          <TabsList>
            <TabsTrigger value="evolution">Évolution</TabsTrigger>
            <TabsTrigger value="institutions">Par Institution</TabsTrigger>
            <TabsTrigger value="severity">Par Gravité</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
          </TabsList>

          {/* Evolution Tab */}
          <TabsContent value="evolution" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Évolution sur 8 semaines
                  </CardTitle>
                  <CardDescription>Nombre d'incidents par semaine</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolutionData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          name="Total"
                          stroke="hsl(var(--primary))" 
                          fill="url(#colorCount)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Incidents critiques et hauts
                  </CardTitle>
                  <CardDescription>Évolution des incidents graves</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="critical" 
                          name="Critiques"
                          stroke="hsl(0, 70%, 50%)" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(0, 70%, 50%)' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="high" 
                          name="Haute"
                          stroke="hsl(30, 70%, 50%)" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(30, 70%, 50%)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Institution evolution */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Évolution par institution (Top 5)
                </CardTitle>
                <CardDescription>Comparaison des principales institutions sur 8 semaines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={institutionEvolution.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      {institutionEvolution.institutions.map((inst, idx) => (
                        <Bar 
                          key={inst} 
                          dataKey={inst} 
                          fill={COLORS[idx % COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Institutions Tab */}
          <TabsContent value="institutions" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Répartition par institution</CardTitle>
                  <CardDescription>Période: {format(dateRange.start, 'dd/MM', { locale: fr })} - {format(dateRange.end, 'dd/MM/yyyy', { locale: fr })}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats?.byInstitution || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats?.byInstitution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Classement des institutions</CardTitle>
                  <CardDescription>Par nombre d'incidents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {stats?.byInstitution.map((inst, idx) => (
                      <div key={inst.name} className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{inst.name}</p>
                          <div className="w-full bg-muted rounded-full h-2 mt-1">
                            <div 
                              className="h-2 rounded-full transition-all"
                              style={{ 
                                width: `${(inst.value / (stats?.total || 1)) * 100}%`,
                                backgroundColor: COLORS[idx % COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {inst.value}
                        </Badge>
                      </div>
                    ))}
                    {(!stats?.byInstitution || stats.byInstitution.length === 0) && (
                      <p className="text-muted-foreground text-center py-8">
                        Aucun incident pour cette période
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Severity Tab */}
          <TabsContent value="severity" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Répartition par gravité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats?.bySeverity || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {stats?.bySeverity.map((entry) => (
                            <Cell 
                              key={`cell-${entry.name}`} 
                              fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || 'hsl(var(--muted))'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Par statut</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.byStatus || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Distribution journalière</CardTitle>
                <CardDescription>Incidents par jour de la période</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.byDay || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="value" name="Incidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent incidents list */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Incidents récents de la période</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {incidents?.slice(0, 20).map(inc => (
                    <div 
                      key={inc.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Badge 
                        variant={inc.gravite === 'Critique' ? 'destructive' : 
                                inc.gravite === 'Haute' ? 'default' : 'secondary'}
                      >
                        {inc.gravite}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{inc.titre}</p>
                        <p className="text-xs text-muted-foreground">
                          {inc.institution} • {format(parseISO(inc.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="outline">{inc.statut}</Badge>
                    </div>
                  ))}
                  {(!incidents || incidents.length === 0) && (
                    <p className="text-muted-foreground text-center py-8">
                      Aucun incident pour cette période
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
