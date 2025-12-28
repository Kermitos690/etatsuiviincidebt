import { useMemo, useEffect } from 'react';
import { TrendingUp, Sparkles, FileText, Loader2, Mail, AlertTriangle, Brain, Activity } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useIncidentStore } from '@/stores/incidentStore';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QuickActions, LoadingState } from '@/components/common';
import { getTutorialProps } from '@/hooks/useTutorialHighlight';

import {
  DashboardKPIs,
  ChartEvolution,
  ChartByStatus,
  ChartByGravite,
  ChartByInstitution,
  ChartByPriority,
  TopIncidentsTable,
  DashboardEmptyState
} from '@/components/dashboard';
import { useDashboardPDF } from '@/hooks/useDashboardPDF';

const GRAVITE_COLORS: Record<string, string> = {
  'Critique': 'hsl(0, 84%, 60%)',
  'Grave': 'hsl(25, 95%, 53%)',
  'Modéré': 'hsl(45, 93%, 47%)',
  'Mineur': 'hsl(142, 76%, 36%)'
};

const COLORS = ['hsl(211, 100%, 50%)', 'hsl(280, 100%, 65%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(330, 100%, 60%)'];

// Quick Actions configuration
const quickActions = [
  { to: '/emails', icon: Mail, label: 'Emails', description: 'Consulter la boîte de réception' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents', description: 'Voir tous les incidents' },
  { to: '/analysis-pipeline', icon: Brain, label: 'Analyse IA', description: 'Lancer une analyse' },
  { to: '/control-center', icon: Activity, label: 'Contrôle', description: 'Centre de contrôle' },
];

export default function Dashboard() {
  const { incidents, config, loadFromSupabase } = useIncidentStore();

  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

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

  const chartData = useMemo(() => ({
    chartByStatus,
    chartByGravite,
    chartByInstitution,
    chartEvolution,
    topIncidents
  }), [chartByStatus, chartByGravite, chartByInstitution, chartEvolution, topIncidents]);

  const { exportingPdf, exportDashboardPDF } = useDashboardPDF(kpis, chartData, incidents);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
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
          <Button 
            onClick={exportDashboardPDF} 
            disabled={exportingPdf || incidents.length === 0}
            className="animate-scale-in"
            style={{ animationDelay: '200ms' }}
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Exporter en PDF
          </Button>
        </div>

        <div {...getTutorialProps('dashboard-kpis')}>
          <DashboardKPIs kpis={kpis} />
        </div>

        {/* Quick Actions - Always visible */}
        <div className="mb-8" {...getTutorialProps('quick-actions')}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Actions Rapides
          </h2>
          <QuickActions actions={quickActions} columns={4} />
        </div>

        {incidents.length === 0 ? (
          <DashboardEmptyState />
        ) : (
          <div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8"
            {...getTutorialProps('dashboard-charts')}
          >
            <ChartEvolution data={chartEvolution} />
            <ChartByStatus data={chartByStatus} />
            <ChartByGravite data={chartByGravite} />
            <ChartByInstitution data={chartByInstitution} />
            <TopIncidentsTable data={topIncidents} />
            <ChartByPriority data={priorityStats} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
