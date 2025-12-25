import { useMemo, useCallback, useState, useEffect } from 'react';
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
  CalendarDays,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIncidentStore } from '@/stores/incidentStore';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

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
  const { incidents, config, loadFromSupabase } = useIncidentStore();
  const [exportingPdf, setExportingPdf] = useState(false);

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

  // Export Dashboard to PDF
  const exportDashboardPDF = useCallback(async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = 15;

      const addPageIfNeeded = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - 20) {
          doc.addPage();
          y = 20;
          return true;
        }
        return false;
      };

      const drawSection = (title: string) => {
        addPageIfNeeded(20);
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2, 'F');
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 4, y + 7);
        y += 15;
        doc.setTextColor(0, 0, 0);
      };

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFillColor(139, 92, 246);
      doc.rect(pageWidth - 60, 0, 60, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('TABLEAU DE BORD', margin, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Registre des Incidents', margin, 26);
      doc.setFontSize(9);
      doc.text(format(new Date(), "dd MMMM yyyy HH:mm", { locale: fr }), pageWidth - margin - 50, 22);
      y = 45;

      // KPIs
      drawSection('INDICATEURS CLÉS');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text('Total: ' + kpis.total, margin + 5, y);
      doc.text('Ouverts: ' + kpis.ouverts, margin + 50, y);
      doc.text('Non résolus: ' + kpis.nonResolus, margin + 100, y);
      y += 8;
      doc.text('Transmis JP: ' + kpis.transmisJP, margin + 5, y);
      doc.text('Score moyen: ' + kpis.scoreMoyen, margin + 50, y);
      y += 12;

      // Par statut
      drawSection('RÉPARTITION PAR STATUT');
      doc.setFontSize(9);
      chartByStatus.filter(d => d.value > 0).forEach((stat) => {
        const pct = incidents.length > 0 ? Math.round(stat.value / incidents.length * 100) : 0;
        doc.setFont('helvetica', 'normal');
        doc.text(stat.name + ': ' + stat.value + ' (' + pct + '%)', margin + 5, y);
        y += 7;
      });
      y += 5;

      // Par gravité
      drawSection('RÉPARTITION PAR GRAVITÉ');
      chartByGravite.forEach((g) => {
        const pct = incidents.length > 0 ? Math.round(g.value / incidents.length * 100) : 0;
        doc.text(g.name + ': ' + g.value + ' (' + pct + '%)', margin + 5, y);
        y += 7;
      });
      y += 5;

      // Par priorité
      drawSection('RÉPARTITION PAR PRIORITÉ');
      priorityStats.forEach((p) => {
        const pct = incidents.length > 0 ? Math.round(p.value / incidents.length * 100) : 0;
        doc.text(p.name + ': ' + p.value + ' (' + pct + '%)', margin + 5, y);
        y += 7;
      });
      y += 5;

      // Par institution
      addPageIfNeeded(50);
      drawSection('PAR INSTITUTION');
      chartByInstitution.forEach((inst) => {
        addPageIfNeeded(10);
        const pct = incidents.length > 0 ? Math.round(inst.value / incidents.length * 100) : 0;
        doc.text(inst.name + ': ' + inst.value + ' (' + pct + '%)', margin + 5, y);
        y += 7;
      });
      y += 5;

      // Par type
      addPageIfNeeded(50);
      drawSection('PAR TYPE DE DYSFONCTIONNEMENT');
      chartByType.forEach((type) => {
        addPageIfNeeded(10);
        const pct = incidents.length > 0 ? Math.round(type.value / incidents.length * 100) : 0;
        const name = type.name.length > 40 ? type.name.substring(0, 37) + '...' : type.name;
        doc.text(name + ': ' + type.value + ' (' + pct + '%)', margin + 5, y);
        y += 7;
      });
      y += 5;

      // Évolution 6 mois
      addPageIfNeeded(60);
      drawSection('ÉVOLUTION SUR 6 MOIS');
      doc.setFontSize(8);
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Mois', margin + 5, y + 5);
      doc.text('Total', margin + 45, y + 5);
      doc.text('Transmis JP', margin + 75, y + 5);
      doc.text('Critiques', margin + 115, y + 5);
      y += 9;
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      chartEvolution.forEach((m, idx) => {
        doc.setFillColor(idx % 2 === 0 ? 249 : 255, 250, 251);
        doc.rect(margin, y - 2, pageWidth - 2 * margin, 6, 'F');
        doc.text(m.name, margin + 5, y + 2);
        doc.text(String(m.total), margin + 45, y + 2);
        doc.text(String(m.transmisJP), margin + 75, y + 2);
        doc.text(String(m.critiques), margin + 115, y + 2);
        y += 6;
      });
      y += 8;

      // Top 5 incidents
      addPageIfNeeded(50);
      drawSection('TOP 5 INCIDENTS PAR SCORE');
      doc.setFontSize(9);
      topIncidents.forEach((inc, idx) => {
        addPageIfNeeded(10);
        doc.setFont('helvetica', 'bold');
        doc.text('#' + (idx + 1), margin + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(inc.name + ' - Score: ' + inc.score + ' (' + inc.gravite + ')', margin + 15, y);
        y += 8;
      });

      // Liste détaillée
      doc.addPage();
      y = 20;
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTE DÉTAILLÉE DES INCIDENTS', margin, 14);
      y = 30;

      incidents.slice(0, 25).forEach((inc, idx) => {
        addPageIfNeeded(18);
        doc.setFillColor(idx % 2 === 0 ? 249 : 255, 250, 251);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 14, 1, 1, 'FD');
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('#' + inc.numero, margin + 3, y + 5);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
        const titre = inc.titre.length > 55 ? inc.titre.substring(0, 52) + '...' : inc.titre;
        doc.text(titre, margin + 15, y + 5);
        doc.setFontSize(7);
        doc.text(inc.dateIncident + ' | ' + inc.institution + ' | ' + inc.gravite + ' | ' + inc.statut + ' | Score: ' + inc.score, margin + 3, y + 11);
        y += 16;
      });

      if (incidents.length > 25) {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text('... et ' + (incidents.length - 25) + ' autres incidents', margin, y + 5);
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(
          'Registre des Incidents - Page ' + i + '/' + pageCount,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      doc.save('dashboard_incidents_' + format(new Date(), 'yyyy-MM-dd_HHmm') + '.pdf');
      toast.success('Dashboard exporté en PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingPdf(false);
    }
  }, [kpis, chartByStatus, chartByGravite, priorityStats, chartByInstitution, chartByType, chartEvolution, topIncidents, incidents]);

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
