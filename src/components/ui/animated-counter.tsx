import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedCounterProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

const AnimatedCounter = React.forwardRef<HTMLSpanElement, AnimatedCounterProps>(
  ({ className, value, duration = 1000, decimals = 0, prefix = '', suffix = '', ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(0);
    const [hasAnimated, setHasAnimated] = React.useState(false);
    const elementRef = React.useRef<HTMLSpanElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasAnimated) {
              setHasAnimated(true);
              animateValue();
            }
          });
        },
        { threshold: 0.1 }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, [value, hasAnimated]);

    const animateValue = () => {
      const startTime = performance.now();
      const startValue = 0;
      const endValue = value;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out-cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        const current = startValue + (endValue - startValue) * easeOut;
        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    };

    const formattedValue = React.useMemo(() => {
      return displayValue.toFixed(decimals);
    }, [displayValue, decimals]);

    return (
      <span
        ref={(node) => {
          elementRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn('tabular-nums', className)}
        {...props}
      >
        {prefix}{formattedValue}{suffix}
      </span>
    );
  }
);
AnimatedCounter.displayName = 'AnimatedCounter';

export { AnimatedCounter };
