/**
 * PDF Legal Explainer - Récupération et explication contextuelle des bases légales
 */

import { supabase } from '@/integrations/supabase/client';

export interface LegalReference {
  code: string;
  article: string;
}

export interface LegalExplanation {
  code: string;
  article: string;
  title?: string | null;
  text: string;
  contextExplanation?: string | null;
  verified: boolean;
  keywords?: string[] | null;
}

/**
 * Extrait les références légales d'un texte
 */
export function extractLegalReferences(text: string): LegalReference[] {
  const patterns = [
    // Art. 406 CC, Art. 29 Cst, Art. 35 PA
    /Art\.?\s*(\d+(?:\s*(?:al\.|alinéa|let\.|§)\s*\d+)?)\s+(CC|CO|CP|CPC|CPP|Cst|PA|LPD|LPMA|LVPAE|LAMal|LTF|LCA)/gi,
    // CC art. 406
    /(CC|CO|CP|CPC|CPP|Cst|PA|LPD|LPMA|LVPAE|LAMal|LTF|LCA)\s+art\.?\s*(\d+(?:\s*(?:al\.|alinéa|let\.|§)\s*\d+)?)/gi,
    // Article 406 du Code civil
    /[Aa]rticle\s+(\d+(?:\s*(?:al\.|alinéa|let\.|§)\s*\d+)?)\s+(?:du\s+)?(?:Code\s+civil|Code\s+des\s+obligations|Code\s+pénal|Code\s+de\s+procédure\s+civile)/gi,
  ];

  const refs: LegalReference[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let code: string;
      let article: string;

      if (match[2] && /^(CC|CO|CP|CPC|CPP|Cst|PA|LPD|LPMA|LVPAE|LAMal|LTF|LCA)$/i.test(match[2])) {
        article = match[1].trim();
        code = match[2].toUpperCase();
      } else if (match[1] && /^(CC|CO|CP|CPC|CPP|Cst|PA|LPD|LPMA|LVPAE|LAMal|LTF|LCA)$/i.test(match[1])) {
        code = match[1].toUpperCase();
        article = match[2].trim();
      } else {
        // Conversion des noms complets en codes
        const fullText = match[0].toLowerCase();
        if (fullText.includes('code civil')) code = 'CC';
        else if (fullText.includes('code des obligations')) code = 'CO';
        else if (fullText.includes('code pénal')) code = 'CP';
        else if (fullText.includes('procédure civile')) code = 'CPC';
        else continue;
        article = match[1].trim();
      }

      const key = `${code}-${article}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ code, article });
      }
    }
  }

  return refs;
}

/**
 * Bases légales communes en protection de l'adulte
 */
export const COMMON_LEGAL_BASES: LegalReference[] = [
  { code: 'CC', article: '388' },    // But de la protection
  { code: 'CC', article: '389' },    // Subsidiarité
  { code: 'CC', article: '390' },    // Conditions de la curatelle
  { code: 'CC', article: '391' },    // Curatelle d'accompagnement
  { code: 'CC', article: '392' },    // Curatelle de représentation
  { code: 'CC', article: '393' },    // Curatelle de gestion
  { code: 'CC', article: '394' },    // Curatelle de coopération
  { code: 'CC', article: '395' },    // Curatelle de portée générale
  { code: 'CC', article: '400' },    // Nomination du curateur
  { code: 'CC', article: '404' },    // Obligation du curateur
  { code: 'CC', article: '405' },    // Exécution des tâches
  { code: 'CC', article: '406' },    // Accomplissement diligent
  { code: 'CC', article: '413' },    // Rapports et comptes
  { code: 'CC', article: '414' },    // Examen des rapports
  { code: 'CC', article: '419' },    // Rémunération
  { code: 'CC', article: '420' },    // Responsabilité
  { code: 'CC', article: '426' },    // Placement à des fins d'assistance
  { code: 'CC', article: '450' },    // Surveillance
  { code: 'Cst', article: '29' },    // Garanties de procédure
  { code: 'Cst', article: '10' },    // Droit à la vie et liberté personnelle
  { code: 'Cst', article: '13' },    // Protection de la vie privée
  { code: 'PA', article: '26' },     // Droit d'être entendu
  { code: 'PA', article: '29' },     // Constatation des faits
  { code: 'PA', article: '35' },     // Motivation des décisions
  { code: 'LPD', article: '6' },     // Principes
  { code: 'LPD', article: '13' },    // Obligation de confidentialité
  { code: 'LPD', article: '25' },    // Droit d'accès
];

/**
 * Récupère les explications légales depuis l'edge function
 */
export async function fetchLegalExplanations(
  legalReferences: LegalReference[],
  factsSummary: string,
  dysfunction?: string,
  incidentType?: string
): Promise<LegalExplanation[]> {
  try {
    const { data, error } = await supabase.functions.invoke('explain-legal-context', {
      body: {
        legalReferences,
        factsSummary,
        dysfunction,
        incidentType,
      },
    });

    if (error) {
      console.error('Error fetching legal explanations:', error);
      return [];
    }

    return data?.explanations || [];
  } catch (e) {
    console.error('Failed to fetch legal explanations:', e);
    return [];
  }
}

/**
 * Récupère les articles légaux directement depuis la base
 */
export async function fetchLegalArticlesFromDB(
  references: LegalReference[]
): Promise<Array<{
  code: string;
  article: string;
  title: string | null;
  text: string;
  keywords: string[] | null;
}>> {
  const results: Array<{
    code: string;
    article: string;
    title: string | null;
    text: string;
    keywords: string[] | null;
  }> = [];

  for (const ref of references) {
    try {
      const { data, error } = await supabase
        .from('legal_articles')
        .select('code_name, article_number, article_title, article_text, keywords')
        .eq('code_name', ref.code)
        .eq('article_number', ref.article)
        .eq('is_current', true)
        .limit(1);

      if (!error && data && data.length > 0) {
        results.push({
          code: data[0].code_name,
          article: data[0].article_number,
          title: data[0].article_title,
          text: data[0].article_text,
          keywords: data[0].keywords,
        });
      }
    } catch (e) {
      console.error(`Error fetching article ${ref.code} ${ref.article}:`, e);
    }
  }

  return results;
}

/**
 * Génère des bases légales par défaut pour un type d'incident
 */
export function getDefaultLegalBasesForType(incidentType: string): LegalReference[] {
  const typeMapping: Record<string, LegalReference[]> = {
    'Délai non respecté': [
      { code: 'CC', article: '406' },
      { code: 'PA', article: '29' },
      { code: 'Cst', article: '29' },
    ],
    'Non-réponse': [
      { code: 'CC', article: '406' },
      { code: 'PA', article: '26' },
      { code: 'Cst', article: '29' },
    ],
    'Décision contestable': [
      { code: 'PA', article: '35' },
      { code: 'Cst', article: '29' },
      { code: 'CC', article: '450' },
    ],
    'Défaut d\'information': [
      { code: 'CC', article: '406' },
      { code: 'CC', article: '413' },
      { code: 'LPD', article: '25' },
    ],
    'Violation procédurale': [
      { code: 'Cst', article: '29' },
      { code: 'PA', article: '26' },
      { code: 'PA', article: '35' },
    ],
    'Abus de pouvoir': [
      { code: 'CC', article: '420' },
      { code: 'Cst', article: '10' },
      { code: 'CC', article: '450' },
    ],
    'Négligence': [
      { code: 'CC', article: '406' },
      { code: 'CC', article: '420' },
      { code: 'CC', article: '404' },
    ],
  };

  return typeMapping[incidentType] || [
    { code: 'CC', article: '406' },
    { code: 'Cst', article: '29' },
  ];
}

/**
 * Formate une référence légale pour affichage
 */
export function formatLegalReference(ref: LegalReference): string {
  return `${ref.code} art. ${ref.article}`;
}

/**
 * Formate une liste de références légales
 */
export function formatLegalReferencesList(refs: LegalReference[]): string {
  return refs.map(formatLegalReference).join(', ');
}
