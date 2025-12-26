import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, ExternalLink, Eye } from 'lucide-react';
import { EmailViewer } from './EmailViewer';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EmailLinkProps {
  emailId: string;
  label?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'link' | 'cta' | 'citation';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  tooltip?: string;
  previewText?: string;
}

export function EmailLink({ 
  emailId, 
  label = "Voir l'email", 
  variant = 'ghost',
  size = 'sm',
  className,
  showIcon = true,
  tooltip,
  previewText
}: EmailLinkProps) {
  const [open, setOpen] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'cta':
        return 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow';
      case 'citation':
        return 'text-primary underline-offset-4 hover:underline p-0 h-auto font-normal';
      default:
        return '';
    }
  };

  const buttonElement = (
    <Button
      variant={variant === 'cta' || variant === 'citation' ? 'ghost' : variant}
      size={variant === 'citation' ? 'sm' : size}
      className={cn(
        "gap-2 transition-all duration-200",
        getVariantStyles(),
        variant === 'cta' && "glow-button",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
    >
      {showIcon && variant !== 'citation' && <Mail className="h-4 w-4" />}
      {variant === 'citation' && <Eye className="h-3 w-3" />}
      {label}
      {variant === 'link' && <ExternalLink className="h-3 w-3" />}
    </Button>
  );

  return (
    <>
      {tooltip || previewText ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonElement}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px]">
              <p className="text-sm">{tooltip || previewText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        buttonElement
      )}
      <EmailViewer 
        emailId={emailId} 
        open={open} 
        onOpenChange={setOpen} 
      />
    </>
  );
}
