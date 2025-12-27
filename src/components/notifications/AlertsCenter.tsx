import React from 'react';
import { 
  Bell, Clock, AlertTriangle, FileWarning, Copy, 
  Flame, Check, X, ChevronRight, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useProactiveAlerts, type ProactiveAlert } from '@/hooks/useProactiveAlerts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const ALERT_ICONS = {
  deadline: Clock,
  anomaly: AlertTriangle,
  contradiction: FileWarning,
  template_abuse: Copy,
  critical_situation: Flame,
};

const PRIORITY_STYLES = {
  critique: 'bg-red-500/10 text-red-500 border-red-500/30',
  haute: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  moyenne: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  faible: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
};

function AlertItem({ 
  alert, 
  onRead, 
  onDismiss,
  onNavigate 
}: { 
  alert: ProactiveAlert;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (alert: ProactiveAlert) => void;
}) {
  const Icon = ALERT_ICONS[alert.alert_type as keyof typeof ALERT_ICONS] || AlertTriangle;
  const priorityStyle = PRIORITY_STYLES[alert.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.moyenne;

  return (
    <div 
      className={cn(
        "p-3 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-muted/50",
        !alert.is_read && "bg-primary/5"
      )}
      onClick={() => {
        if (!alert.is_read) onRead(alert.id);
        onNavigate(alert);
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", priorityStyle)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-medium truncate",
              !alert.is_read && "font-semibold"
            )}>
              {alert.title}
            </p>
            {!alert.is_read && (
              <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
            )}
          </div>

          {alert.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {alert.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(alert.created_at), { 
                addSuffix: true, 
                locale: fr 
              })}
            </span>
            {alert.due_date && (
              <>
                <span>•</span>
                <Badge variant="outline" className="text-xs py-0">
                  Échéance: {new Date(alert.due_date).toLocaleDateString('fr-FR')}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(alert.id);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export function AlertsCenter() {
  const navigate = useNavigate();
  const { 
    alerts, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    dismissAlert 
  } = useProactiveAlerts();

  const handleNavigate = (alert: ProactiveAlert) => {
    // Navigate based on entity type
    switch (alert.entity_type) {
      case 'email':
        navigate('/emails-analyzed');
        break;
      case 'incident':
        navigate(`/incidents/${alert.entity_id}`);
        break;
      case 'situation':
        navigate('/pdf-documents');
        break;
      case 'actor':
        navigate('/control-center');
        break;
      default:
        // Navigate based on alert type
        if (alert.alert_type === 'anomaly') {
          navigate('/anomaly-detection');
        } else if (alert.alert_type === 'deadline') {
          navigate('/incidents');
        }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 text-xs bg-destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Alertes</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Chargement...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune alerte</p>
            </div>
          ) : (
            alerts.map(alert => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onRead={markAsRead}
                onDismiss={dismissAlert}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </ScrollArea>

        {alerts.length > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              className="w-full text-sm"
              onClick={() => navigate('/alerts')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Voir toutes les alertes
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
