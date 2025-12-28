import { memo } from 'react';
import { Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { truncateLabel } from '@/utils/dashboardFilters';

interface ChartDataPoint {
  name: string;
  value: number;
  fullName?: string;
}

interface ChartByInstitutionProps {
  data: ChartDataPoint[];
}

function ChartByInstitutionComponent({ data }: ChartByInstitutionProps) {
  // Prepare data with truncated labels for display
  const chartData = data.map(item => ({
    ...item,
    fullName: item.name,
    name: truncateLabel(item.name, 18)
  }));

  return (
    <div className="glass-card p-4 md:p-6 animate-scale-in" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-secondary shadow-glow-sm">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <h3 className="font-semibold">Par institution</h3>
      </div>
      <div className="h-56 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(211, 100%, 50%)" />
                <stop offset="100%" stopColor="hsl(280, 100%, 65%)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={120} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-elevated)'
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} incident${value > 1 ? 's' : ''}`,
                props.payload.fullName || props.payload.name
              ]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullName || label;
                }
                return label;
              }}
            />
            <Bar dataKey="value" fill="url(#barGradient)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Custom comparison to prevent unnecessary re-renders
function areEqual(prevProps: ChartByInstitutionProps, nextProps: ChartByInstitutionProps): boolean {
  if (prevProps.data.length !== nextProps.data.length) return false;
  return prevProps.data.every((item, index) => 
    item.name === nextProps.data[index].name && 
    item.value === nextProps.data[index].value
  );
}

export const ChartByInstitution = memo(ChartByInstitutionComponent, areEqual);
