import { Activity, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopIncident {
  name: string;
  score: number;
  gravite: string;
}

interface TopIncidentsTableProps {
  data: TopIncident[];
}

const getScoreColor = (score: number) => {
  if (score >= 70) return 'hsl(0, 84%, 60%)';
  if (score >= 50) return 'hsl(25, 95%, 53%)';
  return 'hsl(142, 76%, 36%)';
};

export function TopIncidentsTable({ data }: TopIncidentsTableProps) {
  return (
    <div className="glass-card p-4 md:p-6 animate-scale-in" style={{ animationDelay: '350ms' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 shadow-glow-sm">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <h3 className="font-semibold">Top 5 incidents par score</h3>
      </div>
      <div className="h-56 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-elevated)'
              }}
              formatter={(value: number) => [`Score: ${value}`, '']}
            />
            <Bar dataKey="score" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={getScoreColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
