 import { cn } from '@/lib/utils';
 import { Progress } from '@/components/ui/progress';
 import { Badge } from '@/components/ui/badge';
 import { getConfidenceLevel, getConfidenceColor } from '@/config/trainingConfig';
 
 interface ConfidenceIndicatorProps {
   confidence: number;
   showLabel?: boolean;
   showProgress?: boolean;
   size?: 'sm' | 'md' | 'lg';
   className?: string;
 }
 
 export function ConfidenceIndicator({
   confidence,
   showLabel = true,
   showProgress = false,
   size = 'md',
   className,
 }: ConfidenceIndicatorProps) {
   const level = getConfidenceLevel(confidence);
   const colorClasses = getConfidenceColor(confidence);
   
   const sizeClasses = {
     sm: 'text-xs',
     md: 'text-sm',
     lg: 'text-base',
   };
 
   const levelLabels = {
     high: 'Haute',
     medium: 'Moyenne',
     low: 'Faible',
   };
 
   return (
     <div className={cn('flex items-center gap-2', className)}>
       <Badge 
         variant="outline" 
         className={cn(colorClasses, sizeClasses[size])}
       >
         {confidence}%
         {showLabel && (
           <span className="ml-1 opacity-80">
             ({levelLabels[level]})
           </span>
         )}
       </Badge>
       {showProgress && (
         <Progress 
           value={confidence} 
           className={cn(
             'flex-1',
             size === 'sm' && 'h-1',
             size === 'md' && 'h-2',
             size === 'lg' && 'h-3',
           )}
         />
       )}
     </div>
   );
 }