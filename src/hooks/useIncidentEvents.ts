/**
 * Hook for incident event logging
 * Provides audit trail functionality for incident lifecycle
 */

import { supabase } from '@/integrations/supabase/client';
import type { Incident, IncidentEvent, IncidentEventType } from '@/types/incident';
import { mapDbToIncidentEvent } from '@/mappers/incidents';

interface LogEventParams {
  incidentId: string;
  eventType: IncidentEventType;
  description: string;
  changes?: Record<string, { old: any; new: any }>;
  modificationReason?: string;
}

/**
 * Log an incident event to the audit trail
 */
export async function logIncidentEvent({
  incidentId,
  eventType,
  description,
  changes,
  modificationReason,
}: LogEventParams): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('incident_events')
      .insert({
        incident_id: incidentId,
        user_id: user?.id,
        event_type: eventType,
        event_description: description,
        changes: changes ?? {},
        modification_reason: modificationReason,
      });

    if (error) {
      console.error('Error logging incident event:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging incident event:', error);
    return false;
  }
}

/**
 * Log incident creation
 */
export async function logIncidentCreation(incident: Incident): Promise<boolean> {
  return logIncidentEvent({
    incidentId: incident.id,
    eventType: 'creation',
    description: `Incident #${incident.numero} créé: ${incident.titre}`,
  });
}

/**
 * Log incident update with changes tracking
 */
export async function logIncidentUpdate(
  incidentId: string,
  incidentNumero: number,
  oldValues: Partial<Incident>,
  newValues: Partial<Incident>,
  modificationReason?: string
): Promise<boolean> {
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Track changed fields
  const trackedFields: (keyof Incident)[] = [
    'titre', 'faits', 'dysfonctionnement', 'gravite', 'type', 
    'statut', 'institution', 'dateIncident', 'transmisJP', 'priorite'
  ];
  
  for (const field of trackedFields) {
    if (newValues[field] !== undefined && newValues[field] !== oldValues[field]) {
      changes[field] = { old: oldValues[field], new: newValues[field] };
    }
  }

  if (Object.keys(changes).length === 0) {
    return true; // No changes to log
  }

  const changedFieldNames = Object.keys(changes).join(', ');
  
  return logIncidentEvent({
    incidentId,
    eventType: 'update',
    description: `Incident #${incidentNumero} modifié: ${changedFieldNames}`,
    changes,
    modificationReason,
  });
}

/**
 * Log transmission to JP
 */
export async function logIncidentTransmission(
  incidentId: string,
  incidentNumero: number
): Promise<boolean> {
  return logIncidentEvent({
    incidentId,
    eventType: 'transmission_jp',
    description: `Incident #${incidentNumero} transmis au Juge des Protections`,
    changes: { transmisJP: { old: false, new: true } },
  });
}

/**
 * Log incident lock/unlock
 */
export async function logIncidentLock(
  incidentId: string,
  incidentNumero: number,
  locked: boolean,
  reason?: string
): Promise<boolean> {
  return logIncidentEvent({
    incidentId,
    eventType: locked ? 'lock' : 'unlock',
    description: locked 
      ? `Incident #${incidentNumero} verrouillé` 
      : `Incident #${incidentNumero} déverrouillé`,
    changes: { isLocked: { old: !locked, new: locked } },
    modificationReason: reason,
  });
}

/**
 * Fetch incident events for audit trail
 */
export async function fetchIncidentEvents(incidentId: string): Promise<IncidentEvent[]> {
  try {
    const { data, error } = await supabase
      .from('incident_events')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching incident events:', error);
      return [];
    }

    return (data || []).map(mapDbToIncidentEvent);
  } catch (error) {
    console.error('Error fetching incident events:', error);
    return [];
  }
}

/**
 * Custom hook for incident events
 */
export function useIncidentEvents(incidentId?: string) {
  return {
    logCreation: logIncidentCreation,
    logUpdate: logIncidentUpdate,
    logTransmission: logIncidentTransmission,
    logLock: logIncidentLock,
    fetchEvents: () => incidentId ? fetchIncidentEvents(incidentId) : Promise.resolve([]),
  };
}
