import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend, RadialBarChart, RadialBar
} from 'recharts';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Send, 
  TrendingUp,
  Sparkles,
  Zap,
  Shield,
  Activity,
  CalendarDays
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIncidentStore } from '@/stores/incidentStore';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['hsl(211, 100%, 50%)', 'hsl(280, 100%, 65%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(330, 100%, 60%)'];
const GRAVITE_COLORS: Record<string, string> = {
  'Critique': 'hsl(0, 84%, 60%)',
  'Grave': 'hsl(25, 95%, 53%)',
  'Modéré': 'hsl(45, 93%, 47%)',
  'Mineur': 'hsl(142, 76%, 36%)'
};

const kpiConfig = [
  { key: 'total', label: 'Total', icon: AlertTriangle, gradient: 'from-azure-500 to-azure-600' },
  { key: 'ouverts', label: 'Ouverts', icon: Clock, gradient: 'from-amber-500 to-orange-500' },
  { key: 'nonResolus', label: 'Non résolus', icon: Shield, gradient: 'from-orange-500 to-red-500' },
  { key: 'transmisJP', label: 'Transmis JP', icon: Send, gradient: 'from-violet-500 to-purple-600' },
  { key: 'scoreMoyen', label: 'Score moyen', icon: Zap, gradient: 'from-emerald-500 to-teal-500' },
];

export default function Dashboard() {
  const { incidents, config } = useIncidentStore();

  const kpis = useMemo(() => {
    const total = incidents.length;
    const ouverts = incidents.filter(i => i.statut === 'Ouvert').length;
    const nonResolus = incidents.filter(i => !['Résolu', 'Classé'].includes(i.statut)).length;
    const transmisJP = incidents.filter(i => i.transmisJP).length;
    const scoreMoyen = total > 0 
      ? Math.round(incidents.reduce((acc, i) => acc + i.score, 0) / total * 10) / 10
      : 0;

    return { total, ouverts, nonResolus, transmisJP, scoreMoyen };
  }, [incidents]);

  const chartByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    config.statuts.forEach(s => counts[s] = 0);
    incidents.forEach(i => {
      counts[i.statut] = (counts[i.statut] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents, config.statuts]);

  const chartByInstitution = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => {
      counts[i.institution] = (counts[i.institution] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [incidents]);

  const chartByType = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [incidents]);

  // New chart: By Gravité (for radial bar)
  const chartByGravite = useMemo(() => {
    const counts: Record<string, number> = {};
    config.gravites.forEach(g => counts[g] = 0);
    incidents.forEach(i => {
      counts[i.gravite] = (counts[i.gravite] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value], index) => ({ 
        name, 
        value, 
        fill: GRAVITE_COLORS[name] || COLORS[index % COLORS.length]
      }))
      .filter(d => d.value > 0);
  }, [incidents, config.gravites]);

  // New chart: Evolution over last 6 months
  const chartEvolution = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(now) });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthIncidents = incidents.filter(i => {
        const date = parseISO(i.dateIncident);
        return date >= monthStart && date <= monthEnd;
      });
      
      return {
        name: format(month, 'MMM yy', { locale: fr }),
        total: monthIncidents.length,
        transmisJP: monthIncidents.filter(i => i.transmisJP).length,
        critiques: monthIncidents.filter(i => i.gravite === 'Critique' || i.gravite === 'Grave').length
      };
    });
  }, [incidents]);

  // New chart: Top 5 incidents by score
  const topIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(i => ({
        name: i.titre.length > 25 ? i.titre.substring(0, 22) + '...' : i.titre,
        score: i.score,
        gravite: i.gravite
      }));
  }, [incidents]);

  // Stats by priority
  const priorityStats = useMemo(() => {
    const stats = {
      critique: incidents.filter(i => i.priorite === 'critique').length,
      eleve: incidents.filter(i => i.priorite === 'eleve').length,
      moyen: incidents.filter(i => i.priorite === 'moyen').length,
      faible: incidents.filter(i => i.priorite === 'faible').length
    };
    return [
      { name: 'Critique', value: stats.critique, fill: 'hsl(0, 84%, 60%)' },
      { name: 'Élevée', value: stats.eleve, fill: 'hsl(25, 95%, 53%)' },
      { name: 'Moyenne', value: stats.moyen, fill: 'hsl(45, 93%, 47%)' },
      { name: 'Faible', value: stats.faible, fill: 'hsl(142, 76%, 36%)' }
    ];
  }, [incidents]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-secondary flex items-center justify-center animate-pulse-glow">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text animate-scale-in">
              Dashboard
            </h1>
            <p className="text-muted-foreground animate-slide-up" style={{ animationDelay: '100ms' }}>
              Vue d'ensemble des incidents et statistiques
            </p>
          </div>
        </div>

        {/* KPI Cards - Premium Glass Design */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-8 md:mb-10">
          {kpiConfig.map((kpi, index) => {
            const Icon = kpi.icon;
            const value = kpis[kpi.key as keyof typeof kpis];
            
            return (
              <div 
                key={kpi.key}
                className={cn(
                  "glass-card card-3d p-4 md:p-6 group cursor-pointer animate-scale-in",
                  index === 4 && "col-span-2 md:col-span-1"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "p-2.5 md:p-3 rounded-xl bg-gradient-to-br shadow-glow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow",
                    kpi.gradient
                  )}>
                    <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="h-4 w-4 text-primary animate-float" />
                  </div>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1 font-medium">
                  {kpi.label}
                </p>
                <p className="text-3xl md:text-4xl font-bold tracking-tight">
                  <span className="gradient-text">{value}</span>
                </p>
                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                     style={{ background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, transparent)` }} />
              </div>
            );
          })}
        </div>

        {incidents.length === 0 ? (
          <div className="glass-card p-8 md:p-16 text-center animate-scale-in">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-primary/10 flex items-center justify-center animate-float">
                <AlertTriangle className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-secondary flex items-center justify-center animate-pulse-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-semibold mb-3 gradient-text">
              Aucun incident enregistré
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Commencez par créer votre premier incident pour voir les statistiques apparaître ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Evolution over time */}
            <div className="glass-card p-4 md:p-6 lg:col-span-2 animate-scale-in" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-glow-sm">
                  <CalendarDays className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">Évolution sur 6 mois</h3>
              </div>
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartEvolution}>
                    <defs>
                      <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-elevated)'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="hsl(211, 100%, 50%)" strokeWidth={3} dot={{ fill: 'hsl(211, 100%, 50%)' }} name="Total" />
                    <Line type="monotone" dataKey="transmisJP" stroke="hsl(280, 100%, 65%)" strokeWidth={2} dot={{ fill: 'hsl(280, 100%, 65%)' }} name="Transmis JP" />
                    <Line type="monotone" dataKey="critiques" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ fill: 'hsl(0, 84%, 60%)' }} name="Critiques/Graves" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart by Status */}
            <div className="glass-card p-4 md:p-6 animate-scale-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-primary shadow-glow-sm">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">Par statut</h3>
              </div>
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {COLORS.map((color, index) => (
                        <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={chartByStatus.filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                      innerRadius="40%"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                      stroke="none"
                    >
                      {chartByStatus.map((_, index) => (
                        <Cell key={index} fill={`url(#gradient-${index % COLORS.length})`} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-elevated)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart by Gravité */}
            <div className="glass-card p-4 md:p-6 animate-scale-in" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-glow-sm">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">Par gravité</h3>
              </div>
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="20%" 
                    outerRadius="90%" 
                    barSize={20} 
                    data={chartByGravite}
                  >
                    <RadialBar
                      label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }}
                      background
                      dataKey="value"
                    />
                    <Legend 
                      iconSize={10} 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px'
                      }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart by Institution */}
            <div className="glass-card p-4 md:p-6 animate-scale-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-secondary shadow-glow-sm">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">Par institution</h3>
              </div>
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartByInstitution} layout="vertical">
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(211, 100%, 50%)" />
                        <stop offset="100%" stopColor="hsl(280, 100%, 65%)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-elevated)'
                      }}
                    />
                    <Bar dataKey="value" fill="url(#barGradient)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 incidents by score */}
            <div className="glass-card p-4 md:p-6 animate-scale-in" style={{ animationDelay: '350ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 shadow-glow-sm">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">Top 5 incidents (par score)</h3>
              </div>
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topIncidents} layout="vertical">
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
                        <stop offset="100%" stopColor="hsl(0, 84%, 60%)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px'
                      }}
                    />
                    <Bar dataKey="score" fill="url(#scoreGradient)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart by Type */}
            <div className="glass-card p-4 md:p-6 lg:col-span-2 animate-scale-in" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-glow-sm">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">Par type de dysfonctionnement</h3>
              </div>
              <div className="h-56 md:h-72 overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%" minWidth={400}>
                  <AreaChart data={chartByType}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(280, 100%, 65%)" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="hsl(280, 100%, 65%)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-elevated)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(280, 100%, 65%)" 
                      strokeWidth={3}
                      fill="url(#areaGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority distribution */}
            <div className="glass-card p-4 md:p-6 lg:col-span-2 animate-scale-in" style={{ animationDelay: '450ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-glow-sm">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">Distribution par priorité</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {priorityStats.map((stat, index) => (
                  <div 
                    key={stat.name} 
                    className="relative p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors"
                  >
                    <div 
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                      style={{ background: stat.fill }}
                    />
                    <p className="text-sm text-muted-foreground mb-1">{stat.name}</p>
                    <p className="text-2xl font-bold" style={{ color: stat.fill }}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {incidents.length > 0 ? `${Math.round(stat.value / incidents.length * 100)}%` : '0%'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
