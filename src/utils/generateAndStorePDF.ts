/**
 * Generate and Store Incident PDF - Automatic storage with versioning
 * Uses the proper generateIncidentPDF for full PDF+ capabilities
 */

import { supabase } from '@/integrations/supabase/client';
import { Incident } from '@/types/incident';
import generateIncidentPDF from './generateIncidentPDF';

export interface GenerateOptions {
  includeProofs?: boolean;
  includeLegalExplanations?: boolean;
  includeEmails?: boolean;
  includeEmailCitations?: boolean;
  includeLegalSearch?: boolean;
  includeDeepAnalysis?: boolean;
  includeAttachments?: boolean;
  emails?: any[];
  attachments?: any[];
}

/**
 * Extract initials from institution name
 */
export function getInstitutionInitials(institution: string): string {
  if (!institution) return 'INC';
  
  // Handle common abbreviations
  const abbrevMap: Record<string, string> = {
    'juge de paix': 'JP',
    'service curatelle professionnelle': 'SCP',
    'service de protection de l\'adulte': 'SPA',
    'autorité de protection': 'APEA',
    'office des poursuites': 'OP',
    'tribunal': 'TRI',
    'curatelle': 'CUR',
    'police': 'POL',
  };
  
  const lower = institution.toLowerCase();
  for (const [key, abbrev] of Object.entries(abbrevMap)) {
    if (lower.includes(key)) return abbrev;
  }
  
  // Extract first letters of significant words
  const words = institution.split(/[\s\-_,]+/).filter(w => w.length > 2 && !['de', 'du', 'des', 'la', 'le', 'les', 'et'].includes(w.toLowerCase()));
  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  }
  
  return institution.substring(0, 3).toUpperCase();
}

/**
 * Map priority to French label for filename
 */
function getPriorityLabel(priorite: string): string {
  const map: Record<string, string> = {
    'critique': 'CRITIQUE',
    'urgent': 'URGENT', 
    'elevee': 'ELEVE',
    'élevée': 'ELEVE',
    'haute': 'HAUTE',
    'normale': 'NORMALE',
    'basse': 'BASSE',
    'faible': 'FAIBLE',
    'moyen': 'MOYEN',
  };
  return map[priorite.toLowerCase()] || priorite.toUpperCase();
}

/**
 * Generate advanced filename with date, priority, institution, and version
 * Format: YYYY-MM-DD_PRIORITE_INITIALS_NUMERO_PLUS?_V{version}.pdf
 */
export function generateAdvancedFilename(
  incident: { dateIncident: string; priorite: string; institution: string; numero: number },
  isPdfPlus: boolean = false,
  version: number = 1
): string {
  const date = new Date(incident.dateIncident);
  const dateStr = date.toISOString().split('T')[0];
  const priority = getPriorityLabel(incident.priorite);
  const initials = getInstitutionInitials(incident.institution);
  const numero = String(incident.numero).padStart(4, '0');
  
  let filename = `${dateStr}_${priority}_${initials}_${numero}`;
  if (isPdfPlus) filename += '_PLUS';
  filename += `_V${version}.pdf`;
  
  return filename;
}

/**
 * Get next version number for an incident's exports
 */
async function getNextVersion(incidentId: string, isPdfPlus: boolean): Promise<number> {
  try {
    const { data } = await supabase
      .from('incident_exports')
      .select('version, file_name')
      .eq('incident_id', incidentId)
      .order('version', { ascending: false });
    
    if (!data || data.length === 0) return 1;
    
    // Filter by PDF type (PLUS or normal)
    const relevantExports = data.filter(e => {
      const hasPlus = e.file_name?.includes('_PLUS');
      return isPdfPlus ? hasPlus : !hasPlus;
    });
    
    if (relevantExports.length === 0) return 1;
    
    const maxVersion = Math.max(...relevantExports.map(e => e.version || 1));
    return maxVersion + 1;
  } catch (e) {
    console.error('Error getting version:', e);
    return 1;
  }
}

/**
 * Generate and store incident PDF with proper versioning
 * Uses the REAL generateIncidentPDF for full PDF+ capabilities
 */
export async function generateAndStoreIncidentPDF(
  incident: Incident | any,
  options: GenerateOptions = {},
  isPdfPlus: boolean = false
): Promise<{ blob: Blob; fileName: string; storagePath: string }> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Determine if this is a PDF+ (has advanced options enabled)
  const isAdvanced = isPdfPlus || 
    options.includeEmails || 
    options.includeEmailCitations ||
    options.includeLegalSearch || 
    options.includeDeepAnalysis;

  // Get next version number
  const version = await getNextVersion(incident.id, isAdvanced);

  // Generate filename with versioning
  const fileName = generateAdvancedFilename(
    {
      dateIncident: incident.dateIncident,
      priorite: incident.priorite,
      institution: incident.institution,
      numero: incident.numero
    },
    isAdvanced,
    version
  );

  // Build storage path with unique version folder
  const storagePath = `${user.id}/${incident.id}/v${version}/${fileName}`;

  // Convert incident to the format expected by generateIncidentPDF
  const incidentData = {
    id: incident.id,
    numero: incident.numero,
    titre: incident.titre,
    dateIncident: incident.dateIncident,
    dateCreation: incident.dateCreation,
    institution: incident.institution,
    type: incident.type,
    gravite: incident.gravite,
    priorite: incident.priorite,
    score: incident.score,
    statut: incident.statut,
    faits: incident.faits,
    dysfonctionnement: incident.dysfonctionnement,
    transmisJP: incident.transmisJP,
    dateTransmissionJP: incident.dateTransmissionJP,
    preuves: (incident.preuves || []).map((p: any) => ({
      id: p.id,
      type: p.type,
      label: p.label,
      url: p.url,
      hash: p.hash,
      filename: p.filename,
      ai_analysis: p.ai_analysis,
      size_bytes: p.size_bytes,
      mime_type: p.mime_type,
    })),
    gmailReferences: incident.gmailReferences,
    confidenceLevel: incident.confidenceLevel,
    email_source_id: incident.email_source_id,
  };

  // Use the REAL generateIncidentPDF for full PDF+ capabilities
  const blob = await generateIncidentPDF(incidentData, {
    includeProofs: options.includeProofs ?? true,
    includeLegalExplanations: options.includeLegalExplanations ?? true,
    includeEmails: options.includeEmails ?? false,
    includeEmailCitations: options.includeEmailCitations ?? false,
    includeLegalSearch: options.includeLegalSearch ?? false,
    includeDeepAnalysis: options.includeDeepAnalysis ?? false,
    includeAttachments: options.includeAttachments ?? false,
    emails: options.emails,
    attachments: options.attachments,
  });

  // Upload to Supabase Storage (no overwrite, unique path)
  const { error: uploadError } = await supabase.storage
    .from('incident-exports')
    .upload(storagePath, blob, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Échec du stockage: ${uploadError.message}`);
  }

  // Record in database with proper versioning
  const { error: dbError } = await supabase
    .from('incident_exports')
    .insert({
      incident_id: incident.id,
      user_id: user.id,
      file_name: fileName,
      storage_path: storagePath,
      file_size_bytes: blob.size,
      export_options: options as Record<string, boolean>,
      version: version
    });

  if (dbError) {
    console.error('DB insert error:', dbError);
    // Don't throw - PDF is already uploaded
  }

  return { blob, fileName, storagePath };
}

export default generateAndStoreIncidentPDF;
