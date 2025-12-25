import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

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
    options?: NotificationOptions
  ) => {
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
    incident: { titre: string; institution: string; gravite: string }
  ) => {
    if (incident.gravite === 'Critique' || incident.gravite === 'Haute') {
      sendNotification(`🚨 Incident ${incident.gravite}`, {
        body: `${incident.titre} - ${incident.institution}`,
        tag: 'incident-critical',
        requireInteraction: true,
      });
    }
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifyIncidentCritique,
  };
}
