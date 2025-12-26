import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, AlertTriangle, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface NotificationItem {
  id: string;
  type: 'incident' | 'email' | 'alert' | 'sync';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  read: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Update unread count whenever notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Les notifications ne sont pas supportées par ce navigateur');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notifications activées');
        return true;
      } else if (result === 'denied') {
        toast.error('Notifications refusées');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erreur lors de la demande de permission');
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((
    title: string,
    options?: NotificationOptions & { severity?: 'info' | 'warning' | 'critical' }
  ) => {
    // Add to internal notifications list
    const newNotification: NotificationItem = {
      id: crypto.randomUUID(),
      type: 'alert',
      title,
      message: options?.body || '',
      severity: options?.severity || 'info',
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));

    // Send browser notification if permitted
    if (!isSupported) return null;
    if (permission !== 'granted') return null;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const notifyIncidentCritique = useCallback((
    incident: { titre: string; institution: string; gravite: string; id?: string }
  ) => {
    if (incident.gravite === 'Critique' || incident.gravite === 'Haute') {
      const notification: NotificationItem = {
        id: incident.id || crypto.randomUUID(),
        type: 'incident',
        title: `🚨 Incident ${incident.gravite}`,
        message: `${incident.titre} - ${incident.institution}`,
        severity: incident.gravite === 'Critique' ? 'critical' : 'warning',
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [notification, ...prev].slice(0, 50));

      sendNotification(`🚨 Incident ${incident.gravite}`, {
        body: `${incident.titre} - ${incident.institution}`,
        tag: 'incident-critical',
        requireInteraction: true,
        severity: incident.gravite === 'Critique' ? 'critical' : 'warning'
      });
    }
  }, [sendNotification]);

  const notifyNewEmail = useCallback((
    email: { subject: string; sender: string; hasIncident?: boolean }
  ) => {
    const notification: NotificationItem = {
      id: crypto.randomUUID(),
      type: 'email',
      title: email.hasIncident ? '📧 Nouvel email avec incident' : '📧 Nouvel email',
      message: `${email.subject} de ${email.sender}`,
      severity: email.hasIncident ? 'warning' : 'info',
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [notification, ...prev].slice(0, 50));

    if (email.hasIncident) {
      sendNotification('📧 Nouvel email avec incident détecté', {
        body: `${email.subject} de ${email.sender}`,
        tag: 'new-email-incident',
        severity: 'warning'
      });
    }
  }, [sendNotification]);

  const notifySyncComplete = useCallback((
    stats: { newEmails: number; incidents: number }
  ) => {
    if (stats.newEmails > 0 || stats.incidents > 0) {
      const notification: NotificationItem = {
        id: crypto.randomUUID(),
        type: 'sync',
        title: '✅ Synchronisation terminée',
        message: `${stats.newEmails} nouveaux emails, ${stats.incidents} incidents détectés`,
        severity: stats.incidents > 0 ? 'warning' : 'info',
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [notification, ...prev].slice(0, 50));

      toast.success(`Sync: ${stats.newEmails} emails, ${stats.incidents} incidents`);
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const getNotificationIcon = useCallback((type: NotificationItem['type']) => {
    switch (type) {
      case 'incident': return AlertTriangle;
      case 'email': return Mail;
      case 'alert': return BellRing;
      case 'sync': return CheckCircle;
      default: return Bell;
    }
  }, []);

  return {
    isSupported,
    permission,
    notifications,
    unreadCount,
    requestPermission,
    sendNotification,
    notifyIncidentCritique,
    notifyNewEmail,
    notifySyncComplete,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getNotificationIcon,
  };
}
