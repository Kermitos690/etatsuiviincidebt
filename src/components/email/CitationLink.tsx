import { useState } from 'react';
import { Quote } from 'lucide-react';
import { EmailViewer } from './EmailViewer';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CitationLinkProps {
  emailId: string;
  citation: string;
  className?: string;
  showQuoteIcon?: boolean;
  maxLength?: number;
}

export function CitationLink({ 
  emailId, 
  citation,
  className,
  showQuoteIcon = true,
  maxLength = 150
}: CitationLinkProps) {
  const [open, setOpen] = useState(false);

  const displayCitation = citation.length > maxLength 
    ? citation.substring(0, maxLength) + '...' 
    : citation;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              className={cn(
                "inline-flex items-start gap-2 text-left px-3 py-2 rounded-lg",
                "bg-muted/50 hover:bg-muted border border-border/50",
                "transition-all duration-200 cursor-pointer group",
                "text-sm text-muted-foreground hover:text-foreground",
                className
              )}
            >
              {showQuoteIcon && (
                <Quote className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary/60 group-hover:text-primary" />
              )}
              <span className="italic">{displayCitation}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-sm">Cliquer pour voir l'email source</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <EmailViewer 
        emailId={emailId} 
        open={open} 
        onOpenChange={setOpen} 
      />
    </>
  );
}
