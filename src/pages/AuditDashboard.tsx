import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import { 
  AlertTriangle, 
  Bell,
  Calendar,
  CheckCircle2,
  Clock, 
  Download,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Scale,
  Shield,
  Target,
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';

interface MonthlyReport {
  id: string;
  month_year: string;
  incidents_count: number;
  emails_count: number;
  violations_count: number;
  cumulative_score: number;
  severity_breakdown: Record<string, number>;
  institution_breakdown: Record<string, number>;
  legal_references: any[];
  summary: string;
  key_issues: string[];
  recommendations: string[];
  created_at: string;
}

interface AuditAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  legal_reference: any;
  is_resolved: boolean;
  created_at: string;
}

interface Recurrence {
  id: string;
  institution: string;
  violation_type: string;
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
}

const COLORS = ['hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(45, 93%, 47%)', 'hsl(142, 76%, 36%)'];
const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

export default function AuditDashboard() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, alertsRes, recurrencesRes, incidentsRes, emailsRes] = await Promise.all([
        supabase.from('monthly_reports').select('*').order('month_year', { ascending: false }),
        supabase.from('audit_alerts').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('recurrence_tracking').select('*').order('occurrence_count', { ascending: false }),
        supabase.from('incidents').select('*').order('date_incident', { ascending: false }),
        supabase.from('emails').select('id, subject, sender, received_at, thread_analysis, email_type').order('received_at', { ascending: false })
      ]);

      if (reportsRes.data) setReports(reportsRes.data as MonthlyReport[]);
      if (alertsRes.data) setAlerts(alertsRes.data as AuditAlert[]);
      if (recurrencesRes.data) setRecurrences(recurrencesRes.data as Recurrence[]);
      if (incidentsRes.data) setIncidents(incidentsRes.data);
      if (emailsRes.data) setEmails(emailsRes.data);
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Erreur lors du chargement des données');
    }
    setLoading(false);
  };

  const runDailyAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-audit-analysis');
      if (error) throw error;
      toast.success(`Analyse terminée: ${data.emailsProcessed} emails traités`);
      await loadData();
    } catch (error) {
      console.error('Error running analysis:', error);
      toast.error('Erreur lors de l\'analyse');
    }
    setRunningAnalysis(false);
  };

  const generateMonthlyReport = async () => {
    setGenerating(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-report', {
        body: { month, year }
      });
      if (error) throw error;
      toast.success('Rapport mensuel généré avec succès');
      await loadData();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erreur lors de la génération du rapport');
    }
    setGenerating(false);
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await supabase.from('audit_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      await loadData();
      toast.success('Alerte résolue');
    } catch (error) {
      toast.error('Erreur lors de la résolution');
    }
  };

  // Calculate cumulative score over time
  const evolutionData = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(now) });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthIncidents = incidents.filter(i => {
        const date = parseISO(i.date_incident);
        return date >= monthStart && date <= monthEnd;
      });
      
      const monthEmails = emails.filter(e => {
        const date = parseISO(e.received_at);
        return date >= monthStart && date <= monthEnd;
      });

      const violationsFromEmails = monthEmails.filter(e => {
        const analysis = e.thread_analysis;
        return analysis && (
          analysis.deadline_violations?.detected ||
          analysis.rule_violations?.detected ||
          analysis.contradictions?.detected
        );
      }).length;
      
      return {
        name: format(month, 'MMM yy', { locale: fr }),
        incidents: monthIncidents.length,
        score: monthIncidents.reduce((acc, i) => acc + (i.score || 0), 0),
        violations: violationsFromEmails,
        critiques: monthIncidents.filter(i => i.gravite === 'Critique' || i.gravite === 'Grave').length
      };
    });
  }, [incidents, emails]);

  // Current month stats
  const currentStats = useMemo(() => {
    const thisMonth = format(new Date(), 'yyyy-MM');
    const monthStart = startOfMonth(new Date());
    const monthIncidents = incidents.filter(i => parseISO(i.date_incident) >= monthStart);
    const unresolvedAlerts = alerts.filter(a => !a.is_resolved);
    const criticalAlerts = unresolvedAlerts.filter(a => a.severity === 'critical');
    const totalScore = monthIncidents.reduce((acc, i) => acc + (i.score || 0), 0);
    const recidivists = recurrences.filter(r => r.occurrence_count >= 3);
    
    return {
      incidents: monthIncidents.length,
      alerts: unresolvedAlerts.length,
      critical: criticalAlerts.length,
      score: totalScore,
      recidives: recidivists.length
    };
  }, [incidents, alerts, recurrences]);

  const selectedReport = reports.find(r => r.month_year === selectedMonth);

  const exportReportPDF = async (report: MonthlyReport) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT D\'AUDIT MENSUEL', margin, 25);
    
    const [year, month] = report.month_year.split('-');
    const monthName = format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy', { locale: fr });
    doc.setFontSize(14);
    doc.text(monthName.toUpperCase(), margin, 35);

    y = 55;

    // KPIs
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('STATISTIQUES CLÉS', margin, y);
    y += 10;

    const kpis = [
      ['Incidents', report.incidents_count],
      ['Emails analysés', report.emails_count],
      ['Violations détectées', report.violations_count],
      ['Score cumulé', report.cumulative_score]
    ];

    const kpiWidth = (pageWidth - 2 * margin - 15) / 4;
    kpis.forEach((kpi, idx) => {
      const x = margin + idx * (kpiWidth + 5);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, kpiWidth, 25, 3, 3, 'F');
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(String(kpi[1]), x + kpiWidth / 2, y + 12, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(String(kpi[0]), x + kpiWidth / 2, y + 20, { align: 'center' });
    });
    y += 35;

    // Summary
    if (report.summary) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSUMÉ EXÉCUTIF', margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(report.summary, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 10;
    }

    // Key Issues
    if (report.key_issues && report.key_issues.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PROBLÈMES MAJEURS', margin, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      report.key_issues.slice(0, 5).forEach((issue, idx) => {
        const issueText = `${idx + 1}. ${issue}`;
        const lines = doc.splitTextToSize(issueText, pageWidth - 2 * margin - 10);
        doc.text(lines, margin + 5, y);
        y += lines.length * 4 + 3;
      });
      y += 5;
    }

    // Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMMANDATIONS', margin, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      report.recommendations.forEach((rec, idx) => {
        const recText = `• ${rec}`;
        const lines = doc.splitTextToSize(recText, pageWidth - 2 * margin - 10);
        doc.text(lines, margin + 5, y);
        y += lines.length * 4 + 3;
      });
      y += 5;
    }

    // Legal References
    if (report.legal_references && report.legal_references.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉFÉRENCES LÉGALES CITÉES', margin, y);
      y += 8;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      report.legal_references.slice(0, 15).forEach((ref: any) => {
        doc.text(`${ref.article} - ${ref.law}`, margin + 5, y);
        y += 4;
      });
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Rapport généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')} - Page ${i}/${totalPages}`, pageWidth / 2, 290, { align: 'center' });
    }

    doc.save(`rapport-audit-${report.month_year}.pdf`);
    toast.success('Rapport PDF exporté');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Tableau de Bord Audit" 
        description="Suivi complet pour constitution de dossier probatoire"
      />

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={runDailyAnalysis} 
            disabled={runningAnalysis}
            className="glow-button"
          >
            {runningAnalysis ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Analyser maintenant
          </Button>
          
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = subMonths(new Date(), i);
                  const value = format(date, 'yyyy-MM');
                  const label = format(date, 'MMMM yyyy', { locale: fr });
                  return <SelectItem key={value} value={value}>{label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Button onClick={generateMonthlyReport} disabled={generating} variant="secondary">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Générer rapport
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{currentStats.incidents}</p>
                  <p className="text-xs text-muted-foreground">Incidents ce mois</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{currentStats.score}</p>
                  <p className="text-xs text-muted-foreground">Score cumulé</p>
                </div>
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-red-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-500">{currentStats.critical}</p>
                  <p className="text-xs text-muted-foreground">Alertes critiques</p>
                </div>
                <Bell className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{currentStats.alerts}</p>
                  <p className="text-xs text-muted-foreground">Alertes actives</p>
                </div>
                <Shield className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{currentStats.recidives}</p>
                  <p className="text-xs text-muted-foreground">Récidives (3+)</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="glass-card">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="alerts">Alertes ({alerts.filter(a => !a.is_resolved).length})</TabsTrigger>
            <TabsTrigger value="recurrences">Récidives</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Evolution Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Évolution sur 6 mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(211, 100%, 50%)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        name="Score cumulé"
                        stroke="hsl(211, 100%, 50%)" 
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="violations" 
                        name="Violations"
                        stroke="hsl(0, 84%, 60%)" 
                        fillOpacity={1} 
                        fill="url(#colorViolations)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="incidents" 
                        name="Incidents"
                        stroke="hsl(280, 100%, 65%)" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(280, 100%, 65%)' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Selected Report Summary */}
            {selectedReport && (
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Rapport {format(new Date(selectedReport.month_year + '-01'), 'MMMM yyyy', { locale: fr })}</CardTitle>
                      <CardDescription>Généré le {format(parseISO(selectedReport.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</CardDescription>
                    </div>
                    <Button onClick={() => exportReportPDF(selectedReport)} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exporter PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedReport.summary && (
                    <div>
                      <h4 className="font-semibold mb-2">Résumé exécutif</h4>
                      <p className="text-sm text-muted-foreground">{selectedReport.summary}</p>
                    </div>
                  )}
                  
                  {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommandations</h4>
                      <ul className="space-y-1">
                        {selectedReport.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedReport.legal_references && selectedReport.legal_references.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Références légales ({selectedReport.legal_references.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedReport.legal_references.slice(0, 10).map((ref: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Scale className="h-3 w-3 mr-1" />
                            {ref.article}
                          </Badge>
                        ))}
                        {selectedReport.legal_references.length > 10 && (
                          <Badge variant="secondary">+{selectedReport.legal_references.length - 10} autres</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alertes d'audit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {alerts.filter(a => !a.is_resolved).map(alert => (
                      <div 
                        key={alert.id} 
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'critical' ? 'border-red-500/50 bg-red-500/5' :
                          alert.severity === 'warning' ? 'border-amber-500/50 bg-amber-500/5' :
                          'border-blue-500/50 bg-blue-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={SEVERITY_COLORS[alert.severity]}>
                                {alert.severity === 'critical' ? 'Critique' : 
                                 alert.severity === 'warning' ? 'Attention' : 'Info'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </span>
                            </div>
                            <h4 className="font-semibold">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                            {alert.legal_reference && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                <Scale className="h-3 w-3 mr-1" />
                                {alert.legal_reference.article}
                              </Badge>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {alerts.filter(a => !a.is_resolved).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        <p>Aucune alerte active</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recurrences">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Suivi des récidives
                </CardTitle>
                <CardDescription>
                  Institutions avec violations répétées (comportement systémique)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recurrences.filter(r => r.occurrence_count >= 2).map(rec => (
                    <div key={rec.id} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{rec.institution}</h4>
                        <Badge 
                          variant={rec.occurrence_count >= 5 ? 'destructive' : 
                                   rec.occurrence_count >= 3 ? 'default' : 'secondary'}
                        >
                          {rec.occurrence_count}x
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.violation_type}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Premier: {format(parseISO(rec.first_occurrence), 'dd/MM/yyyy', { locale: fr })}</span>
                        <span>Dernier: {format(parseISO(rec.last_occurrence), 'dd/MM/yyyy', { locale: fr })}</span>
                      </div>
                      <Progress 
                        value={Math.min(rec.occurrence_count * 20, 100)} 
                        className="mt-2 h-2"
                      />
                    </div>
                  ))}
                  {recurrences.filter(r => r.occurrence_count >= 2).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucune récidive détectée</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Historique des rapports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports.map(report => (
                    <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                      <div>
                        <h4 className="font-semibold">
                          {format(new Date(report.month_year + '-01'), 'MMMM yyyy', { locale: fr })}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{report.incidents_count} incidents</span>
                          <span>{report.violations_count} violations</span>
                          <span>Score: {report.cumulative_score}</span>
                        </div>
                      </div>
                      <Button onClick={() => exportReportPDF(report)} size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun rapport généré</p>
                      <Button onClick={generateMonthlyReport} className="mt-4" disabled={generating}>
                        Générer le premier rapport
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline des événements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="relative border-l-2 border-muted ml-4 space-y-6 py-4">
                    {incidents.slice(0, 30).map((incident, idx) => (
                      <div key={incident.id} className="relative pl-6">
                        <div className={`absolute -left-2 w-4 h-4 rounded-full ${
                          incident.gravite === 'Critique' ? 'bg-red-500' :
                          incident.gravite === 'Grave' ? 'bg-orange-500' :
                          incident.gravite === 'Modéré' ? 'bg-amber-500' :
                          'bg-green-500'
                        }`} />
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(incident.date_incident), 'dd MMMM yyyy', { locale: fr })}
                            <Badge variant="outline" className="text-xs">{incident.gravite}</Badge>
                          </div>
                          <h4 className="font-medium text-sm">{incident.titre}</h4>
                          <p className="text-xs text-muted-foreground">{incident.institution}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
