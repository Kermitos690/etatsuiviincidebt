import React, { memo, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Memoized Badge for lists
interface MemoizedBadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children: ReactNode;
}

export const MemoizedBadge = memo<MemoizedBadgeProps>(
  ({ variant = 'default', className, children }) => (
    <Badge variant={variant} className={className}>
      {children}
    </Badge>
  )
);
MemoizedBadge.displayName = 'MemoizedBadge';

// Memoized stat card for dashboards
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const MemoizedStatCard = memo<StatCardProps>(
  ({ title, value, icon, description, trend, className }) => (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-xs mt-1",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </p>
        )}
      </CardContent>
    </Card>
  )
);
MemoizedStatCard.displayName = 'MemoizedStatCard';

// Memoized list item for performance
interface ListItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  isActive?: boolean;
}

export const MemoizedListItem = memo<ListItemProps>(
  ({ children, onClick, className, isActive }) => (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-colors",
        isActive ? "bg-accent" : "hover:bg-muted/50",
        className
      )}
    >
      {children}
    </div>
  )
);
MemoizedListItem.displayName = 'MemoizedListItem';

// Memoized action button
interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const MemoizedActionButton = memo<ActionButtonProps>(
  ({ onClick, disabled, loading, icon, children, variant = 'default', size = 'default', className }) => (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <span className="animate-spin mr-2">⏳</span>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </Button>
  )
);
MemoizedActionButton.displayName = 'MemoizedActionButton';

// Helper HOC for creating memoized components with comparison
export function createMemoComponent<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) {
  return memo(Component, areEqual);
}

// Custom comparison for array props
export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Custom comparison helper for objects
export function shallowObjectEqual<T extends object>(a: T, b: T): boolean {
  const keysA = Object.keys(a) as (keyof T)[];
  const keysB = Object.keys(b) as (keyof T)[];
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
}
