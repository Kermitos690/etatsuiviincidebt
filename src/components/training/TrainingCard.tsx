 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Brain, ExternalLink, Mail } from 'lucide-react';
 import { Link } from 'react-router-dom';
 import { ConfidenceIndicator } from './ConfidenceIndicator';
 import { format } from 'date-fns';
 import { fr } from 'date-fns/locale';
 
 interface TrainingCardProps {
   id: string;
   situationSummary: string;
   violationType: string | null;
   confidence: number;
   reasoning?: string | null;
   legalRefs?: any[];
   emailId?: string | null;
   createdAt: string;
   children?: React.ReactNode;
 }
 
 export function TrainingCard({
   id,
   situationSummary,
   violationType,
   confidence,
   reasoning,
   legalRefs,
   emailId,
   createdAt,
   children,
 }: TrainingCardProps) {
   return (
     <Card className="mb-4">
       <CardHeader>
         <div className="flex items-start justify-between">
           <CardTitle className="text-base flex items-center gap-2">
             <Brain className="h-5 w-5" />
             Situation analysée
           </CardTitle>
           <div className="flex items-center gap-2">
             {emailId && (
               <Button variant="ghost" size="sm" asChild>
                 <Link to={`/emails?id=${emailId}`}>
                   <Mail className="h-4 w-4 mr-1" />
                   Source
                 </Link>
               </Button>
             )}
             <span className="text-xs text-muted-foreground">
               {format(new Date(createdAt), 'd MMM yyyy', { locale: fr })}
             </span>
           </div>
         </div>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="p-4 rounded-lg bg-muted/50 border">
           <p className="text-sm whitespace-pre-wrap">{situationSummary}</p>
         </div>
 
         <div className="grid grid-cols-2 gap-4">
           <div>
             <p className="text-xs text-muted-foreground mb-1">Type détecté</p>
             <Badge variant="outline">
               {violationType || 'Non déterminé'}
             </Badge>
           </div>
           <div>
             <p className="text-xs text-muted-foreground mb-1">Confiance IA</p>
             <ConfidenceIndicator confidence={Math.round(confidence * 100)} size="sm" />
           </div>
         </div>
 
         {reasoning && (
           <div>
             <p className="text-xs text-muted-foreground mb-1">Raisonnement IA</p>
             <p className="text-sm text-muted-foreground italic">{reasoning}</p>
           </div>
         )}
 
         {legalRefs && legalRefs.length > 0 && (
           <div>
             <p className="text-xs text-muted-foreground mb-1">Références légales</p>
             <div className="flex flex-wrap gap-1">
               {legalRefs.map((ref: any, i: number) => (
                 <Badge key={i} variant="outline" className="text-xs">
                   {typeof ref === 'string' ? ref : ref.article || ref.code}
                 </Badge>
               ))}
             </div>
           </div>
         )}
 
         {children}
       </CardContent>
     </Card>
   );
 }