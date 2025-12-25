import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Send, 
  TrendingUp 
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIncidentStore } from '@/stores/incidentStore';

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#64748b', '#a855f7'];

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

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <PageHeader 
          title="Dashboard" 
          description="Vue d'ensemble des incidents et statistiques"
        />

        {/* KPI Cards - Responsive grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl md:text-3xl font-bold">{kpis.total}</p>
                </div>
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground/50 hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Ouverts</p>
                  <p className="text-2xl md:text-3xl font-bold text-amber-600">{kpis.ouverts}</p>
                </div>
                <Clock className="h-6 w-6 md:h-8 md:w-8 text-amber-500/50 hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Non résolus</p>
                  <p className="text-2xl md:text-3xl font-bold text-orange-600">{kpis.nonResolus}</p>
                </div>
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-orange-500/50 hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Transmis JP</p>
                  <p className="text-2xl md:text-3xl font-bold text-purple-600">{kpis.transmisJP}</p>
                </div>
                <Send className="h-6 w-6 md:h-8 md:w-8 text-purple-500/50 hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Score moyen</p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-600">{kpis.scoreMoyen}</p>
                </div>
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-blue-500/50 hidden sm:block" />
              </div>
            </CardContent>
          </Card>
        </div>

        {incidents.length === 0 ? (
          <Card>
            <CardContent className="py-8 md:py-12 text-center">
              <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-base md:text-lg mb-2">Aucun incident enregistré</h3>
              <p className="text-sm text-muted-foreground">
                Commencez par créer votre premier incident.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Chart by Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base font-medium">Par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartByStatus.filter(d => d.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {chartByStatus.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart by Institution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base font-medium">Par institution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartByInstitution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart by Type */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base font-medium">Par type de dysfonctionnement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 md:h-64 overflow-x-auto">
                  <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                    <BarChart data={chartByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
