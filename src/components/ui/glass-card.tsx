import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const glassCardVariants = cva(
  'relative overflow-hidden rounded-2xl transition-all duration-500 ease-out',
  {
    variants: {
      variant: {
        default: 'glass-card',
        elevated: 'glass-elevated',
        subtle: 'bg-glass backdrop-blur-glass border border-glass shadow-glass',
        solid: 'bg-card border border-border shadow-glass',
      },
      severity: {
        none: '',
        critique: 'severity-band-critique',
        grave: 'severity-band-grave',
        modere: 'severity-band-modere',
        mineur: 'severity-band-mineur',
      },
      hover: {
        none: '',
        lift: 'hover:-translate-y-1 hover:shadow-elevated',
        glow: 'hover:shadow-glow',
        scale: 'hover:scale-[1.02]',
        '3d': 'card-3d',
      },
      locked: {
        true: 'ice-effect',
        false: '',
      },
      animate: {
        none: '',
        float: 'animate-float',
        pulse: 'animate-depth-pulse',
        shimmer: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      severity: 'none',
      hover: 'lift',
      locked: false,
      animate: 'none',
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  /** Show liquid border on hover */
  liquidBorder?: boolean;
  /** Delay for staggered animations */
  animationDelay?: number;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ 
    className, 
    variant, 
    severity, 
    hover, 
    locked, 
    animate,
    liquidBorder = false,
    animationDelay,
    style,
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          glassCardVariants({ variant, severity, hover, locked, animate }),
          liquidBorder && 'liquid-border',
          className
        )}
        style={{
          ...style,
          animationDelay: animationDelay ? `${animationDelay}ms` : undefined,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = 'GlassCard';

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
GlassCardHeader.displayName = 'GlassCardHeader';

const GlassCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
GlassCardTitle.displayName = 'GlassCardTitle';

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
GlassCardDescription.displayName = 'GlassCardDescription';

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
GlassCardContent.displayName = 'GlassCardContent';

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
GlassCardFooter.displayName = 'GlassCardFooter';

export { 
  GlassCard, 
  GlassCardHeader, 
  GlassCardTitle, 
  GlassCardDescription, 
  GlassCardContent, 
  GlassCardFooter,
  glassCardVariants 
};
