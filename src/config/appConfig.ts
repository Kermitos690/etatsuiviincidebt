export const DEFAULT_INSTITUTIONS = [
  'SCTP',
  'CSR', 
  'Curatelle',
  'Justice de paix',
  'ARAS',
  'AI',
  'TCA',
  'Autre'
];

export const INSTITUTIONAL_DOMAINS = [
  'vd.ch',
  'ne.ch',
  'justice.ch',
  'admin.ch',
  'ge.ch',
  'fr.ch'
];

export const DEFAULT_TYPES = [
  'Transparence',
  'Traçabilité',
  'Communication',
  'Représentation',
  'Neutralité',
  'Délais',
  'Accès aux pièces',
  'Non-réponse',
  'Rupture de thread',
  'Contournement',
  'Autre'
];

export const DEFAULT_STATUTS = [
  'Ouvert',
  'En cours',
  'Résolu',
  'Classé',
  'Transmis'
];

export const DEFAULT_GRAVITES = [
  'Faible',
  'Moyenne',
  'Haute',
  'Critique'
];

export const SYNC_KEYWORDS = [
  'demande',
  'requête',
  'recours',
  'décision',
  'délai',
  'urgent',
  'réponse',
  'question',
  'dossier',
  'curatelle'
];

// Predefined filter presets for common use cases
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  domains: string[];
  keywords: string[];
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'education',
    name: 'Éducation',
    description: 'Écoles, universités, DGEO, formations',
    icon: '🎓',
    domains: [
      'edu.vd.ch',
      'epfl.ch',
      'unil.ch',
      'unige.ch',
      'unifr.ch',
      'unine.ch',
      'unibas.ch',
      'uzh.ch',
      'ethz.ch',
      'hes-so.ch',
      'vd.ch',
      'ge.ch',
      'eduvs.ch',
      'rpn.ch'
    ],
    keywords: [
      'scolarité',
      'inscription',
      'orientation',
      'élève',
      'étudiant',
      'formation',
      'diplôme',
      'examen',
      'enseignant',
      'école',
      'collège',
      'gymnase',
      'université',
      'apprentissage'
    ]
  },
  {
    id: 'sante',
    name: 'Santé',
    description: 'Hôpitaux, assurances maladie, médecins',
    icon: '🏥',
    domains: [
      'chuv.ch',
      'hug.ch',
      'insel.ch',
      'usz.ch',
      'lamal.ch',
      'css.ch',
      'swica.ch',
      'groupe-mutuel.ch',
      'assura.ch',
      'helsana.ch',
      'sanitas.ch',
      'concordia.ch',
      'ofsp.admin.ch',
      'bag.admin.ch',
      'vd.ch',
      'ge.ch'
    ],
    keywords: [
      'patient',
      'traitement',
      'hospitalisation',
      'ordonnance',
      'consultation',
      'diagnostic',
      'maladie',
      'accident',
      'assurance',
      'remboursement',
      'franchise',
      'médecin',
      'hôpital',
      'clinique',
      'soins'
    ]
  },
  {
    id: 'administration',
    name: 'Administration',
    description: 'Services publics, communes, cantons',
    icon: '🏛️',
    domains: [
      'admin.ch',
      'vd.ch',
      'ge.ch',
      'ne.ch',
      'fr.ch',
      'vs.ch',
      'be.ch',
      'ti.ch',
      'zh.ch',
      'lu.ch',
      'ag.ch',
      'sg.ch',
      'bs.ch',
      'bl.ch',
      'justice.ch',
      'police.ch'
    ],
    keywords: [
      'demande',
      'autorisation',
      'permis',
      'décision',
      'recours',
      'délai',
      'formulaire',
      'taxe',
      'impôt',
      'registre',
      'citoyenneté',
      'état civil',
      'commune',
      'canton',
      'confédération'
    ]
  },
  {
    id: 'justice',
    name: 'Justice & Curatelle',
    description: 'Tribunaux, justice de paix, protection',
    icon: '⚖️',
    domains: [
      'justice.ch',
      'vd.ch',
      'ge.ch',
      'ne.ch',
      'admin.ch',
      'tribunaux.ch'
    ],
    keywords: [
      'curatelle',
      'tutelle',
      'protection',
      'jugement',
      'tribunal',
      'ordonnance',
      'audience',
      'procédure',
      'dossier',
      'requête',
      'recours',
      'appel',
      'décision',
      'justice de paix',
      'curateur'
    ]
  },
  {
    id: 'social',
    name: 'Social & Aide',
    description: 'Aide sociale, AVS, AI, chômage',
    icon: '🤝',
    domains: [
      'avs.ch',
      'ahv.ch',
      'ai.ch',
      'iv.ch',
      'ocs.ch',
      'csc.ch',
      'admin.ch',
      'vd.ch',
      'ge.ch',
      'caritas.ch',
      'csp.ch'
    ],
    keywords: [
      'aide sociale',
      'prestation',
      'allocation',
      'rente',
      'AVS',
      'AI',
      'invalidité',
      'chômage',
      'indemnité',
      'subsides',
      'logement',
      'revenus',
      'budget',
      'dette',
      'situation financière'
    ]
  }
];

export const POIDS_GRAVITE: Record<string, number> = {
  'Faible': 1,
  'Moyenne': 3,
  'Haute': 6,
  'Critique': 10
};

export const POIDS_TYPE: Record<string, number> = {
  'Représentation': 8,
  'Traçabilité': 7,
  'Accès aux pièces': 7,
  'Transparence': 6,
  'Communication': 5,
  'Délais': 5,
  'Non-réponse': 8,
  'Rupture de thread': 7,
  'Contournement': 9,
  'Neutralité': 4,
  'Autre': 3
};

export const PRIORITY_THRESHOLDS = {
  faible: 8,
  moyen: 15,
  eleve: 22
};

export function calculateScore(
  gravite: string,
  type: string,
  transmisJP: boolean,
  poidsGravite: Record<string, number> = POIDS_GRAVITE,
  poidsType: Record<string, number> = POIDS_TYPE
): number {
  const poidG = poidsGravite[gravite] || 1;
  const poidT = poidsType[type] || 3;
  let score = (poidG * 2) + poidT;
  
  // Pénalité si non transmis JP et gravité haute/critique
  if (!transmisJP && (gravite === 'Haute' || gravite === 'Critique')) {
    score += 3;
  }
  
  return score;
}

export function getPriorityFromScore(score: number): 'faible' | 'moyen' | 'eleve' | 'critique' {
  if (score <= PRIORITY_THRESHOLDS.faible) return 'faible';
  if (score <= PRIORITY_THRESHOLDS.moyen) return 'moyen';
  if (score <= PRIORITY_THRESHOLDS.eleve) return 'eleve';
  return 'critique';
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'faible': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    case 'moyen': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
    case 'eleve': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
    case 'critique': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function getGraviteColor(gravite: string): string {
  switch (gravite) {
    case 'Faible': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Moyenne': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'Haute': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'Critique': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'High': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'Low': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
