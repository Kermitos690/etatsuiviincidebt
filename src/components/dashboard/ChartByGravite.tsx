import { AlertTriangle } from 'lucide-react';
import { RadialBarChart, RadialBar, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface ChartByGraviteProps {
  data: ChartDataPoint[];
}

export function ChartByGravite({ data }: ChartByGraviteProps) {
  return (
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
            data={data}
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
  );
}
