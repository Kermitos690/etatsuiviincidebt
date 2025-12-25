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

export const DEFAULT_TYPES = [
  'Transparence',
  'Traçabilité',
  'Communication',
  'Représentation',
  'Neutralité',
  'Délais',
  'Accès aux pièces',
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
    case 'faible': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'moyen': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'eleve': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critique': return 'bg-red-100 text-red-800 border-red-200';
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
