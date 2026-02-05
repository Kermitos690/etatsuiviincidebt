 import { useState } from 'react';
 import { Button } from '@/components/ui/button';
 import { Loader2, CheckCircle, XCircle, Save } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface ValidationButtonsProps {
   onValidate: () => void | Promise<void>;
   onCorrect: () => void | Promise<void>;
   onReject: () => void | Promise<void>;
   isLoading?: boolean;
   disabled?: boolean;
   correctDisabled?: boolean;
   size?: 'sm' | 'default' | 'lg';
   className?: string;
 }
 
 export function ValidationButtons({
   onValidate,
   onCorrect,
   onReject,
   isLoading = false,
   disabled = false,
   correctDisabled = false,
   size = 'default',
   className,
 }: ValidationButtonsProps) {
   const [activeAction, setActiveAction] = useState<string | null>(null);
 
   const handleAction = async (action: string, handler: () => void | Promise<void>) => {
     setActiveAction(action);
     try {
       await handler();
     } finally {
       setActiveAction(null);
     }
   };
 
   const isActionLoading = (action: string) => isLoading && activeAction === action;
 
   return (
     <div className={cn('flex flex-wrap gap-2', className)}>
       <Button
         variant="outline"
         size={size}
         onClick={() => handleAction('reject', onReject)}
         disabled={disabled || isLoading}
         className="text-destructive border-destructive hover:bg-destructive/10"
       >
         {isActionLoading('reject') ? (
           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
         ) : (
           <XCircle className="h-4 w-4 mr-2" />
         )}
         Rejeter
       </Button>
       <Button
         variant="outline"
         size={size}
         onClick={() => handleAction('correct', onCorrect)}
         disabled={disabled || isLoading || correctDisabled}
       >
         {isActionLoading('correct') ? (
           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
         ) : (
           <Save className="h-4 w-4 mr-2" />
         )}
         Corriger
       </Button>
       <Button
         size={size}
         onClick={() => handleAction('validate', onValidate)}
         disabled={disabled || isLoading}
       >
         {isActionLoading('validate') ? (
           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
         ) : (
           <CheckCircle className="h-4 w-4 mr-2" />
         )}
         Valider
       </Button>
     </div>
   );
 }