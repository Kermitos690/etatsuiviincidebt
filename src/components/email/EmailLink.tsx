import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, ExternalLink } from 'lucide-react';
import { EmailViewer } from './EmailViewer';
import { cn } from '@/lib/utils';

interface EmailLinkProps {
  emailId: string;
  label?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
}

export function EmailLink({ 
  emailId, 
  label = "Voir l'email", 
  variant = 'ghost',
  size = 'sm',
  className,
  showIcon = true
}: EmailLinkProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {showIcon && <Mail className="h-4 w-4" />}
        {label}
        {variant === 'link' && <ExternalLink className="h-3 w-3" />}
      </Button>
      <EmailViewer 
        emailId={emailId} 
        open={open} 
        onOpenChange={setOpen} 
      />
    </>
  );
}
