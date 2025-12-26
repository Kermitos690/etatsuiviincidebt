import { memo } from 'react';
import { Sparkles, AlertTriangle, Clock, CheckCircle, Send, Zap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(211, 100%, 50%)', 'hsl(280, 100%, 65%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(330, 100%, 60%)'];

const kpiConfig = [
  { key: 'total', label: 'Total', icon: AlertTriangle, gradient: 'from-azure-500 to-azure-600' },
  { key: 'ouverts', label: 'Ouverts', icon: Clock, gradient: 'from-amber-500 to-orange-500' },
  { key: 'nonResolus', label: 'Non résolus', icon: Shield, gradient: 'from-orange-500 to-red-500' },
  { key: 'transmisJP', label: 'Transmis JP', icon: Send, gradient: 'from-violet-500 to-purple-600' },
  { key: 'scoreMoyen', label: 'Score moyen', icon: Zap, gradient: 'from-emerald-500 to-teal-500' },
];

interface KPIs {
  total: number;
  ouverts: number;
  nonResolus: number;
  transmisJP: number;
  scoreMoyen: number;
}

interface DashboardKPIsProps {
  kpis: KPIs;
}

// Memoized KPI Card component
const KPICard = memo<{
  kpi: typeof kpiConfig[0];
  value: number;
  index: number;
}>(({ kpi, value, index }) => {
  const Icon = kpi.icon;
  
  return (
    <div 
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
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, transparent)` }} 
      />
    </div>
  );
});

KPICard.displayName = 'KPICard';

function DashboardKPIsComponent({ kpis }: DashboardKPIsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-8 md:mb-10">
      {kpiConfig.map((kpi, index) => (
        <KPICard 
          key={kpi.key}
          kpi={kpi}
          value={kpis[kpi.key as keyof KPIs]}
          index={index}
        />
      ))}
    </div>
  );
}

// Custom comparison to prevent unnecessary re-renders
function areEqual(prevProps: DashboardKPIsProps, nextProps: DashboardKPIsProps): boolean {
  return (
    prevProps.kpis.total === nextProps.kpis.total &&
    prevProps.kpis.ouverts === nextProps.kpis.ouverts &&
    prevProps.kpis.nonResolus === nextProps.kpis.nonResolus &&
    prevProps.kpis.transmisJP === nextProps.kpis.transmisJP &&
    prevProps.kpis.scoreMoyen === nextProps.kpis.scoreMoyen
  );
}

export const DashboardKPIs = memo(DashboardKPIsComponent, areEqual);
