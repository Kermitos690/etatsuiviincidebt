import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  BellRing,
  X,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuditAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
  related_email_id: string | null;
  related_incident_id: string | null;
}

export function RealtimeAlerts() {
  const queryClient = useQueryClient();
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Fetch initial alerts
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('audit_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setAlerts(data);
      }
    };
    
    fetchAlerts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('audit-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_alerts'
        },
        (payload) => {
          const newAlert = payload.new as AuditAlert;
          setAlerts(prev => [newAlert, ...prev].slice(0, 10));
          
          // Show toast for critical alerts
          if (newAlert.severity === 'critical' || newAlert.severity === 'critique') {
            toast.error(newAlert.title, {
              description: newAlert.description,
              duration: 10000
            });
          } else {
            toast.warning(newAlert.title, {
              description: newAlert.description
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audit_alerts'
        },
        (payload) => {
          const updatedAlert = payload.new as AuditAlert;
          setAlerts(prev => prev.map(a => 
            a.id === updatedAlert.id ? updatedAlert : a
          ).filter(a => !a.is_resolved));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resolveAlert = async (id: string) => {
    try {
      await supabase
        .from('audit_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success('Alerte résolue');
      queryClient.invalidateQueries({ queryKey: ['control-audit-alerts'] });
    } catch (error) {
      toast.error('Erreur lors de la résolution');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critique':
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'haute':
      case 'high':
      case 'warning':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      default:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critique':
      case 'critical':
        return 'destructive';
      case 'haute':
      case 'high':
      case 'warning':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {isConnected ? (
                <BellRing className="h-5 w-5 text-green-500 animate-pulse" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              Alertes en Temps Réel
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {isConnected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Connecté
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Déconnecté
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {alerts.length} active{alerts.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
              <p>Aucune alerte active</p>
              <p className="text-sm">Le système fonctionne normalement</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityBadge(alert.severity) as any}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {alert.alert_type}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {alert.related_incident_id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          asChild
                        >
                          <Link to={`/incidents/${alert.related_incident_id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
