import { Zap } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PriorityData {
  name: string;
  value: number;
  fill: string;
}

interface ChartByPriorityProps {
  data: PriorityData[];
}

export function ChartByPriority({ data }: ChartByPriorityProps) {
  const filteredData = data.filter(d => d.value > 0);

  return (
    <div className="glass-card p-4 md:p-6 animate-scale-in" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-glow-sm">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <h3 className="font-semibold">Par priorité</h3>
      </div>
      <div className="h-56 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="75%"
              innerRadius="50%"
              stroke="none"
            >
              {filteredData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
