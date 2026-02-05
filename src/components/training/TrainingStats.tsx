 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { CheckCircle, Clock, XCircle, Target } from 'lucide-react';
 
 interface TrainingStatsProps {
   userId?: string;
   compact?: boolean;
 }
 
 export function TrainingStats({ userId, compact = false }: TrainingStatsProps) {
   const { data: stats } = useQuery({
     queryKey: ['training-stats', userId],
     queryFn: async () => {
       const { data: pending } = await supabase
         .from('ai_situation_training')
         .select('id', { count: 'exact', head: true })
         .eq('validation_status', 'pending');
       
       const { data: validated } = await supabase
         .from('ai_situation_training')
         .select('id', { count: 'exact', head: true })
         .eq('validation_status', 'validated');
       
       const { data: corrected } = await supabase
         .from('ai_situation_training')
         .select('id', { count: 'exact', head: true })
         .eq('validation_status', 'corrected');
       
       const { data: rejected } = await supabase
         .from('ai_situation_training')
         .select('id', { count: 'exact', head: true })
         .eq('validation_status', 'rejected');
 
       const { data: todayProcessed } = await supabase
         .from('ai_situation_training')
         .select('id', { count: 'exact', head: true })
         .neq('validation_status', 'pending')
         .gte('updated_at', new Date().toISOString().split('T')[0]);
 
       return {
         pending: pending?.length || 0,
         validated: validated?.length || 0,
         corrected: corrected?.length || 0,
         rejected: rejected?.length || 0,
         todayProcessed: todayProcessed?.length || 0,
       };
     },
     staleTime: 30000,
   });
 
   if (compact) {
     return (
       <div className="flex items-center gap-3 text-sm">
         <Badge variant="secondary" className="gap-1">
           <Clock className="h-3 w-3" />
           {stats?.pending || 0} en attente
         </Badge>
         <Badge variant="outline" className="gap-1">
           <Target className="h-3 w-3" />
           {stats?.todayProcessed || 0} aujourd'hui
         </Badge>
       </div>
     );
   }
 
   return (
     <Card>
       <CardContent className="py-4">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="text-center">
             <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
               <Clock className="h-4 w-4" />
               <span className="text-xs">En attente</span>
             </div>
             <p className="text-2xl font-bold">{stats?.pending || 0}</p>
           </div>
           <div className="text-center">
             <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
               <CheckCircle className="h-4 w-4" />
               <span className="text-xs">Validés</span>
             </div>
             <p className="text-2xl font-bold text-green-600">{stats?.validated || 0}</p>
           </div>
           <div className="text-center">
             <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
               <Target className="h-4 w-4" />
               <span className="text-xs">Corrigés</span>
             </div>
             <p className="text-2xl font-bold text-yellow-600">{stats?.corrected || 0}</p>
           </div>
           <div className="text-center">
             <div className="flex items-center justify-center gap-1 text-destructive mb-1">
               <XCircle className="h-4 w-4" />
               <span className="text-xs">Rejetés</span>
             </div>
             <p className="text-2xl font-bold text-destructive">{stats?.rejected || 0}</p>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }