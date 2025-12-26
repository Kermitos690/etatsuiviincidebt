import { CalendarDays } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface ChartDataPoint {
  name: string;
  total: number;
  transmisJP: number;
  critiques: number;
}

interface ChartEvolutionProps {
  data: ChartDataPoint[];
}

export function ChartEvolution({ data }: ChartEvolutionProps) {
  return (
    <div className="glass-card p-4 md:p-6 lg:col-span-2 animate-scale-in" style={{ animationDelay: '150ms' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-glow-sm">
          <CalendarDays className="h-4 w-4 text-white" />
        </div>
        <h3 className="font-semibold">Évolution sur 6 mois</h3>
      </div>
      <div className="h-56 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
  );
}
