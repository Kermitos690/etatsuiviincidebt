/**
 * PDF Legal Explainer - Récupération et explication contextuelle des bases légales
 * Version améliorée avec vérification exhaustive et anti-hallucination
 */

import { supabase } from '@/integrations/supabase/client';

export interface LegalReference {
  code: string;
  article: string;
}

export interface VerifiedLegalReference extends LegalReference {
  verified: boolean;
  title?: string | null;
  text?: string;
  keywords?: string[] | null;
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
 * Comprehensive mapping of incident types to EXHAUSTIVE legal bases
 * Each type includes ALL potentially applicable articles from:
 * - Code Civil (CC) - Protection de l'adulte
 * - Constitution (Cst) - Droits fondamentaux
 * - Procédure Administrative (PA)
 * - Protection des données (LPD)
 * - Loi vaudoise sur la protection de l'adulte (LVPAE)
 * - Règlement CSIAS (normes d'aide sociale)
 */
export const EXHAUSTIVE_LEGAL_MAPPING: Record<string, LegalReference[]> = {
  // Délais et retards
  'Délai non respecté': [
    { code: 'CC', article: '406' },      // Accomplissement diligent des tâches
    { code: 'CC', article: '404' },      // Obligation générale du curateur
    { code: 'CC', article: '405' },      // Exécution des tâches avec soin
    { code: 'Cst', article: '29' },      // Garanties de procédure (délai raisonnable)
    { code: 'PA', article: '29' },       // Constatation des faits en temps utile
    { code: 'LPPA-VD', article: '42' },  // Délais cantonaux
  ],
  
  // Communication et réponses
  'Non-réponse': [
    { code: 'CC', article: '406' },      // Accomplissement diligent
    { code: 'CC', article: '413' },      // Rapports et comptes
    { code: 'PA', article: '26' },       // Droit d'être entendu
    { code: 'PA', article: '29' },       // Constatation des faits
    { code: 'Cst', article: '29' },      // Droit d'être entendu constitutionnel
    { code: 'LPD', article: '25' },      // Droit d'accès aux données
  ],
  
  // Décisions et motivations
  'Décision contestable': [
    { code: 'PA', article: '35' },       // Motivation des décisions
    { code: 'Cst', article: '29' },      // Garanties de procédure
    { code: 'CC', article: '450' },      // Droit de recours
    { code: 'CC', article: '450a' },     // Qualité pour recourir
    { code: 'CC', article: '450b' },     // Délai et forme du recours
    { code: 'CC', article: '450c' },     // Effet suspensif
    { code: 'PA', article: '26' },       // Consultation du dossier
  ],
  
  // Information et transparence
  "Défaut d'information": [
    { code: 'CC', article: '406' },      // Devoir d'information
    { code: 'CC', article: '413' },      // Rapports et comptes
    { code: 'CC', article: '414' },      // Examen des rapports par l'APEA
    { code: 'LPD', article: '25' },      // Droit d'accès
    { code: 'LPD', article: '6' },       // Principes de transparence
    { code: 'PA', article: '26' },       // Droit de consulter
    { code: 'Cst', article: '29' },      // Droit d'être entendu
  ],
  
  // Procédures
  'Violation procédurale': [
    { code: 'Cst', article: '29' },      // Garanties de procédure
    { code: 'PA', article: '26' },       // Droit d'être entendu
    { code: 'PA', article: '29' },       // Constatation des faits
    { code: 'PA', article: '35' },       // Motivation
    { code: 'CC', article: '447' },      // Procédure APEA
    { code: 'CC', article: '446' },      // Principes procéduraux
    { code: 'CC', article: '448' },      // Collaboration des personnes concernées
  ],
  
  // Abus et pouvoir
  'Abus de pouvoir': [
    { code: 'CC', article: '420' },      // Responsabilité du curateur
    { code: 'CC', article: '421' },      // Actes nécessitant consentement
    { code: 'CC', article: '422' },      // Actes interdits
    { code: 'Cst', article: '10' },      // Droit à la vie et liberté
    { code: 'Cst', article: '13' },      // Protection vie privée
    { code: 'CC', article: '450' },      // Droit de recours
    { code: 'CC', article: '389' },      // Principe de subsidiarité
  ],
  
  // Négligence
  'Négligence': [
    { code: 'CC', article: '406' },      // Accomplissement diligent
    { code: 'CC', article: '420' },      // Responsabilité
    { code: 'CC', article: '404' },      // Obligations du curateur
    { code: 'CC', article: '405' },      // Exécution des tâches
    { code: 'CC', article: '413' },      // Rapports et comptes
    { code: 'CC', article: '414' },      // Surveillance par APEA
  ],
  
  // Patrimoine et gestion financière
  'Gestion patrimoniale': [
    { code: 'CC', article: '408' },      // Gestion du patrimoine
    { code: 'CC', article: '409' },      // Utilisation des revenus
    { code: 'CC', article: '410' },      // Montants à disposition
    { code: 'CC', article: '411' },      // Compte courant
    { code: 'CC', article: '412' },      // Placement de fortune
    { code: 'CC', article: '413' },      // Rapport de gestion
    { code: 'CC', article: '420' },      // Responsabilité
  ],
  
  // Placement et liberté
  'Placement contesté': [
    { code: 'CC', article: '426' },      // PAFA - Conditions
    { code: 'CC', article: '427' },      // PAFA - Compétence
    { code: 'CC', article: '428' },      // PAFA - Médecin habilité
    { code: 'CC', article: '429' },      // PAFA - Examen médical
    { code: 'CC', article: '430' },      // PAFA - Examen périodique
    { code: 'CC', article: '431' },      // PAFA - Libération
    { code: 'CC', article: '439' },      // PAFA - Recours
    { code: 'Cst', article: '10' },      // Liberté personnelle
    { code: 'Cst', article: '31' },      // Privation de liberté
  ],
  
  // Confidentialité
  'Violation confidentialité': [
    { code: 'LPD', article: '6' },       // Principes
    { code: 'LPD', article: '7' },       // Sécurité des données
    { code: 'LPD', article: '13' },      // Obligation de discrétion
    { code: 'LPD', article: '25' },      // Droit d'accès
    { code: 'Cst', article: '13' },      // Protection vie privée
    { code: 'CP', article: '321' },      // Secret professionnel
  ],
  
  // Consentement
  'Défaut de consentement': [
    { code: 'CC', article: '377' },      // Directives anticipées
    { code: 'CC', article: '378' },      // Représentant désigné
    { code: 'CC', article: '394' },      // Curatelle de coopération
    { code: 'CC', article: '421' },      // Actes nécessitant consentement
    { code: 'Cst', article: '10' },      // Liberté personnelle
    { code: 'Cst', article: '13' },      // Autodétermination
  ],
};

/**
 * Extrait les références légales d'un texte avec patterns exhaustifs
 */
export function extractLegalReferences(text: string): LegalReference[] {
  const patterns = [
    // Art. 406 CC, Art. 29 Cst, Art. 35 PA, Art. 6 LPD
    /Art\.?\s*(\d+(?:\s*(?:al\.|alinéa|let\.|§|bis|ter|quater)\s*\d*)?)\s+(CC|CO|CP|CPC|CPP|Cst|PA|LPD|LPMA|LVPAE|LPPA-VD|LAMal|LTF|LCA|CEDH)/gi,
    // CC art. 406
    /(CC|CO|CP|CPC|CPP|Cst|PA|LPD|LPMA|LVPAE|LPPA-VD|LAMal|LTF|LCA|CEDH)\s+art\.?\s*(\d+(?:\s*(?:al\.|alinéa|let\.|§|bis|ter|quater)\s*\d*)?)/gi,
    // Article 406 du Code civil
    /[Aa]rticle\s+(\d+(?:\s*(?:al\.|alinéa|let\.|§|bis|ter|quater)\s*\d*)?)\s+(?:du\s+)?(?:Code\s+civil|Code\s+des\s+obligations|Code\s+pénal|Code\s+de\s+procédure)/gi,
    // § 12 CSIAS (normes d'aide sociale)
    /§\s*(\d+(?:\.\d+)?)\s+(CSIAS|normes)/gi,
  ];

  const refs: LegalReference[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let code: string;
      let article: string;

      if (match[2] && /^(CC|CO|CP|CPC|CPP|Cst|PA|LPD|LPMA|LVPAE|LPPA-VD|LAMal|LTF|LCA|CEDH|CSIAS)$/i.test(match[2])) {
        article = match[1].trim();
        code = match[2].toUpperCase();
      } else if (match[1] && /^(CC|CO|CP|CPC|CPP|Cst|PA|LPD|LPMA|LVPAE|LPPA-VD|LAMal|LTF|LCA|CEDH|CSIAS)$/i.test(match[1])) {
        code = match[1].toUpperCase();
        article = match[2].trim();
      } else {
        const fullText = match[0].toLowerCase();
        if (fullText.includes('code civil')) code = 'CC';
        else if (fullText.includes('code des obligations')) code = 'CO';
        else if (fullText.includes('code pénal')) code = 'CP';
        else if (fullText.includes('procédure civile')) code = 'CPC';
        else if (fullText.includes('csias') || fullText.includes('normes')) code = 'CSIAS';
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
 * Bases légales complètes en protection de l'adulte (Art. 388-456 CC)
 */
export const COMMON_LEGAL_BASES: LegalReference[] = [
  // Protection de l'adulte - Dispositions générales
  { code: 'CC', article: '388' },    // But de la protection
  { code: 'CC', article: '389' },    // Subsidiarité et proportionnalité
  
  // Types de curatelle
  { code: 'CC', article: '390' },    // Conditions de la curatelle
  { code: 'CC', article: '391' },    // Curatelle d'accompagnement
  { code: 'CC', article: '392' },    // Curatelle de représentation
  { code: 'CC', article: '393' },    // Curatelle de gestion
  { code: 'CC', article: '394' },    // Curatelle de coopération
  { code: 'CC', article: '395' },    // Curatelle de portée générale
  
  // Curateur
  { code: 'CC', article: '400' },    // Nomination du curateur
  { code: 'CC', article: '401' },    // Désignation par la personne concernée
  { code: 'CC', article: '402' },    // Refus de mandat
  { code: 'CC', article: '403' },    // Plusieurs curateurs
  { code: 'CC', article: '404' },    // Obligation du curateur
  { code: 'CC', article: '405' },    // Exécution des tâches
  { code: 'CC', article: '406' },    // Accomplissement diligent
  
  // Patrimoine
  { code: 'CC', article: '408' },    // Gestion du patrimoine
  { code: 'CC', article: '409' },    // Utilisation des revenus
  { code: 'CC', article: '410' },    // Montants à disposition
  { code: 'CC', article: '411' },    // Compte courant
  { code: 'CC', article: '412' },    // Placement de fortune
  { code: 'CC', article: '413' },    // Rapports et comptes
  { code: 'CC', article: '414' },    // Examen des rapports
  
  // Responsabilité
  { code: 'CC', article: '419' },    // Rémunération
  { code: 'CC', article: '420' },    // Responsabilité
  { code: 'CC', article: '421' },    // Actes nécessitant consentement
  { code: 'CC', article: '422' },    // Actes interdits
  
  // PAFA
  { code: 'CC', article: '426' },    // Placement à des fins d'assistance
  { code: 'CC', article: '427' },    // Compétence
  { code: 'CC', article: '439' },    // Recours PAFA
  
  // Procédure et recours
  { code: 'CC', article: '446' },    // Principes procéduraux
  { code: 'CC', article: '447' },    // Audition de la personne
  { code: 'CC', article: '448' },    // Collaboration
  { code: 'CC', article: '450' },    // Droit de recours
  { code: 'CC', article: '450a' },   // Qualité pour recourir
  { code: 'CC', article: '450b' },   // Délai et forme (30 jours)
  { code: 'CC', article: '450c' },   // Effet suspensif
  
  // Constitution
  { code: 'Cst', article: '10' },    // Droit à la vie et liberté personnelle
  { code: 'Cst', article: '13' },    // Protection de la vie privée
  { code: 'Cst', article: '29' },    // Garanties de procédure
  { code: 'Cst', article: '31' },    // Privation de liberté
  
  // Procédure administrative
  { code: 'PA', article: '26' },     // Droit d'être entendu
  { code: 'PA', article: '29' },     // Constatation des faits
  { code: 'PA', article: '35' },     // Motivation des décisions
  
  // Protection des données
  { code: 'LPD', article: '6' },     // Principes
  { code: 'LPD', article: '7' },     // Sécurité des données
  { code: 'LPD', article: '13' },    // Obligation de discrétion
  { code: 'LPD', article: '25' },    // Droit d'accès
];

/**
 * Vérifie les références légales contre la base de données
 * Retourne uniquement les articles vérifiés comme existants
 */
export async function verifyLegalReferences(
  references: LegalReference[]
): Promise<VerifiedLegalReference[]> {
  const results: VerifiedLegalReference[] = [];

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
          verified: true,
          title: data[0].article_title,
          text: data[0].article_text,
          keywords: data[0].keywords,
        });
      } else {
        // Article non trouvé dans la base - marquer comme non vérifié
        results.push({
          code: ref.code,
          article: ref.article,
          verified: false,
        });
      }
    } catch (e) {
      console.error(`Error verifying article ${ref.code} ${ref.article}:`, e);
      results.push({
        code: ref.code,
        article: ref.article,
        verified: false,
      });
    }
  }

  return results;
}

/**
 * Récupère les explications légales depuis l'edge function
 * avec validation anti-hallucination
 */
export async function fetchLegalExplanations(
  legalReferences: LegalReference[],
  factsSummary: string,
  dysfunction?: string,
  incidentType?: string
): Promise<LegalExplanation[]> {
  try {
    // D'abord vérifier quelles références existent vraiment
    const verifiedRefs = await verifyLegalReferences(legalReferences);
    const validRefs = verifiedRefs.filter(r => r.verified);

    if (validRefs.length === 0) {
      console.warn('No verified legal references found in database');
      return [];
    }

    const { data, error } = await supabase.functions.invoke('explain-legal-context', {
      body: {
        legalReferences: validRefs.map(r => ({ code: r.code, article: r.article })),
        factsSummary,
        dysfunction,
        incidentType,
        requireVerification: true, // Flag for anti-hallucination
      },
    });

    if (error) {
      console.error('Error fetching legal explanations:', error);
      // Fall back to database-only explanations
      return validRefs.map(r => ({
        code: r.code,
        article: r.article,
        title: r.title,
        text: r.text || `Article ${r.article} du ${r.code}`,
        verified: true,
        keywords: r.keywords,
      }));
    }

    // Mark all returned explanations as verified since we filtered upfront
    return (data?.explanations || []).map((exp: LegalExplanation) => ({
      ...exp,
      verified: true,
    }));
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
  verified: boolean;
}>> {
  const results: Array<{
    code: string;
    article: string;
    title: string | null;
    text: string;
    keywords: string[] | null;
    verified: boolean;
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
          verified: true,
        });
      }
    } catch (e) {
      console.error(`Error fetching article ${ref.code} ${ref.article}:`, e);
    }
  }

  return results;
}

/**
 * Génère des bases légales EXHAUSTIVES pour un type d'incident
 * Utilise le mapping complet et vérifie dans la base
 */
export function getDefaultLegalBasesForType(incidentType: string): LegalReference[] {
  // D'abord chercher dans le mapping exhaustif
  const mappedBases = EXHAUSTIVE_LEGAL_MAPPING[incidentType];
  
  if (mappedBases && mappedBases.length > 0) {
    return mappedBases;
  }
  
  // Fallback: chercher des correspondances partielles
  for (const [key, refs] of Object.entries(EXHAUSTIVE_LEGAL_MAPPING)) {
    if (incidentType.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(incidentType.toLowerCase())) {
      return refs;
    }
  }
  
  // Fallback final: bases minimales mais vérifiées
  return [
    { code: 'CC', article: '406' },      // Accomplissement diligent
    { code: 'CC', article: '404' },      // Obligations du curateur
    { code: 'Cst', article: '29' },      // Garanties de procédure
    { code: 'PA', article: '35' },       // Motivation des décisions
  ];
}

/**
 * Génère des bases légales en fonction du contenu de l'incident
 * Analyse le texte pour détecter les problématiques spécifiques
 */
export function detectLegalBasesFromContent(
  faits: string,
  dysfonctionnement: string,
  incidentType: string
): LegalReference[] {
  const allText = `${faits} ${dysfonctionnement}`.toLowerCase();
  const detectedRefs: LegalReference[] = [];
  const seen = new Set<string>();
  
  const addRef = (code: string, article: string) => {
    const key = `${code}-${article}`;
    if (!seen.has(key)) {
      seen.add(key);
      detectedRefs.push({ code, article });
    }
  };
  
  // Détection par mots-clés
  const keywordMapping: Array<{ keywords: string[]; refs: LegalReference[] }> = [
    {
      keywords: ['délai', 'retard', 'attente', 'jours', 'semaines', 'mois'],
      refs: [
        { code: 'CC', article: '406' },
        { code: 'Cst', article: '29' },
        { code: 'PA', article: '29' },
      ],
    },
    {
      keywords: ['réponse', 'silence', 'ignor', 'sans suite'],
      refs: [
        { code: 'CC', article: '406' },
        { code: 'PA', article: '26' },
        { code: 'Cst', article: '29' },
      ],
    },
    {
      keywords: ['décision', 'refus', 'rejet', 'motiv'],
      refs: [
        { code: 'PA', article: '35' },
        { code: 'CC', article: '450' },
        { code: 'Cst', article: '29' },
      ],
    },
    {
      keywords: ['information', 'document', 'accès', 'consulter'],
      refs: [
        { code: 'LPD', article: '25' },
        { code: 'PA', article: '26' },
        { code: 'CC', article: '413' },
      ],
    },
    {
      keywords: ['argent', 'compte', 'finance', 'paiement', 'facture'],
      refs: [
        { code: 'CC', article: '408' },
        { code: 'CC', article: '413' },
        { code: 'CC', article: '420' },
      ],
    },
    {
      keywords: ['placement', 'pafa', 'clinique', 'hôpital', 'internement'],
      refs: [
        { code: 'CC', article: '426' },
        { code: 'CC', article: '439' },
        { code: 'Cst', article: '10' },
      ],
    },
    {
      keywords: ['recours', 'appel', 'contester'],
      refs: [
        { code: 'CC', article: '450' },
        { code: 'CC', article: '450a' },
        { code: 'CC', article: '450b' },
      ],
    },
    {
      keywords: ['confidenti', 'secret', 'privé', 'donnée'],
      refs: [
        { code: 'LPD', article: '6' },
        { code: 'LPD', article: '13' },
        { code: 'Cst', article: '13' },
      ],
    },
    {
      keywords: ['curateur', 'curatrice', 'curatelle'],
      refs: [
        { code: 'CC', article: '404' },
        { code: 'CC', article: '405' },
        { code: 'CC', article: '406' },
      ],
    },
    {
      keywords: ['négligen', 'faute', 'erreur', 'manquement'],
      refs: [
        { code: 'CC', article: '420' },
        { code: 'CC', article: '406' },
      ],
    },
    {
      keywords: ['vacances', 'absent', 'indisponible', 'congé'],
      refs: [
        { code: 'CC', article: '406' },
        { code: 'CC', article: '403' },
      ],
    },
    {
      keywords: ['promesse', 'engagement', 'dit', 'prévu'],
      refs: [
        { code: 'CC', article: '3' },  // Bonne foi
        { code: 'CC', article: '406' },
      ],
    },
  ];
  
  for (const mapping of keywordMapping) {
    for (const keyword of mapping.keywords) {
      if (allText.includes(keyword)) {
        for (const ref of mapping.refs) {
          addRef(ref.code, ref.article);
        }
        break;
      }
    }
  }
  
  // Ajouter les bases par défaut du type
  const typeRefs = getDefaultLegalBasesForType(incidentType);
  for (const ref of typeRefs) {
    addRef(ref.code, ref.article);
  }
  
  // Extraire les références explicites du texte
  const explicitRefs = extractLegalReferences(allText);
  for (const ref of explicitRefs) {
    addRef(ref.code, ref.article);
  }
  
  return detectedRefs;
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
