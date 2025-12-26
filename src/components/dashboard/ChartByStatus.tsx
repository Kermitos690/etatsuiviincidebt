import { CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['hsl(211, 100%, 50%)', 'hsl(280, 100%, 65%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(330, 100%, 60%)'];

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ChartByStatusProps {
  data: ChartDataPoint[];
}

export function ChartByStatus({ data }: ChartByStatusProps) {
  const filteredData = data.filter(d => d.value > 0);

  return (
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
                <linearGradient key={index} id={`gradient-status-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={filteredData}
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
              {filteredData.map((_, index) => (
                <Cell key={index} fill={`url(#gradient-status-${index % COLORS.length})`} />
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
  );
}
