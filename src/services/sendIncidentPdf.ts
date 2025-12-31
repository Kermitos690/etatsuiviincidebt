/**
 * Send Incident PDF Service
 * Envoie un PDF d'incident par email via Edge Function
 */

import { supabase } from '@/integrations/supabase/client';
import { buildIncidentPdfBlob, blobToBase64, generatePdfFilename } from './pdfExport';
import type { Incident } from '@/types/incident';

interface SendPdfResult {
  success: boolean;
  error?: string;
}

/**
 * Envoie un PDF d'incident par email via l'Edge Function send-incident-pdf
 */
export async function sendIncidentPdfByEmail(
  incident: Incident,
  recipientEmail: string = 'gaetan.2025@icloud.com'
): Promise<SendPdfResult> {
  try {
    // 1. Générer le PDF blob
    const pdfBlob = await buildIncidentPdfBlob(incident, { mode: 'fiche' });
    
    // 2. Convertir en base64
    const pdfBase64 = await blobToBase64(pdfBlob);
    
    // 3. Générer le nom de fichier
    const filename = generatePdfFilename(incident);
    
    // 4. Appeler l'Edge Function
    const { data, error } = await supabase.functions.invoke('send-incident-pdf', {
      body: {
        recipientEmail,
        incidentNumero: incident.numero,
        incidentTitre: incident.titre,
        incidentDate: incident.dateIncident,
        pdfBase64,
        filename,
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      return { 
        success: false, 
        error: `Erreur d'envoi: ${error.message || 'Erreur inconnue'}` 
      };
    }

    if (!data?.ok) {
      return { 
        success: false, 
        error: data?.error || 'Échec de l\'envoi email' 
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error sending PDF:', err);
    return { 
      success: false, 
      error: err.message || 'Erreur lors de la génération ou envoi du PDF' 
    };
  }
}

/**
 * Télécharge le PDF localement (fallback si email échoue)
 */
export async function downloadIncidentPdf(incident: Incident): Promise<void> {
  const pdfBlob = await buildIncidentPdfBlob(incident, { mode: 'fiche' });
  const filename = generatePdfFilename(incident);
  
  // Créer un lien de téléchargement
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
