import { memo } from 'react';
import { Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ChartByInstitutionProps {
  data: ChartDataPoint[];
}

function ChartByInstitutionComponent({ data }: ChartByInstitutionProps) {
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
          <BarChart data={data} layout="vertical">
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
