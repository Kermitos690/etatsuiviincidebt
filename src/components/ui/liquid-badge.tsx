import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const liquidBadgeVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary backdrop-blur-sm border border-primary/20',
        secondary: 'bg-secondary/80 text-secondary-foreground backdrop-blur-sm border border-secondary/30',
        success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 backdrop-blur-sm border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 backdrop-blur-sm border border-amber-500/20',
        destructive: 'bg-destructive/10 text-destructive backdrop-blur-sm border border-destructive/20',
        outline: 'bg-transparent border border-border text-foreground',
        legal: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 backdrop-blur-sm border border-violet-500/20',
        evidence: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 backdrop-blur-sm border border-teal-500/20',
        glass: 'bg-glass backdrop-blur-glass border border-glass text-foreground',
        aurora: 'bg-gradient-primary text-white shadow-glow',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        default: 'text-xs px-3 py-1',
        lg: 'text-sm px-4 py-1.5',
      },
      glow: {
        true: '',
        false: '',
      },
      pulse: {
        true: 'animate-pulse-glow',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        glow: true,
        className: 'shadow-[0_0_12px_-2px_hsl(var(--primary)/0.4)]',
      },
      {
        variant: 'success',
        glow: true,
        className: 'shadow-[0_0_12px_-2px_hsl(142_76%_36%/0.4)]',
      },
      {
        variant: 'warning',
        glow: true,
        className: 'shadow-[0_0_12px_-2px_hsl(38_92%_50%/0.4)]',
      },
      {
        variant: 'destructive',
        glow: true,
        className: 'shadow-[0_0_12px_-2px_hsl(0_72%_51%/0.4)]',
      },
      {
        variant: 'legal',
        glow: true,
        className: 'shadow-[0_0_12px_-2px_hsl(280_100%_65%/0.4)]',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      glow: false,
      pulse: false,
    },
  }
);

export interface LiquidBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof liquidBadgeVariants> {
  icon?: React.ReactNode;
}

const LiquidBadge = React.forwardRef<HTMLSpanElement, LiquidBadgeProps>(
  ({ className, variant, size, glow, pulse, icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(liquidBadgeVariants({ variant, size, glow, pulse }), className)}
        {...props}
      >
        {icon}
        {children}
      </span>
    );
  }
);
LiquidBadge.displayName = 'LiquidBadge';

export { LiquidBadge, liquidBadgeVariants };
