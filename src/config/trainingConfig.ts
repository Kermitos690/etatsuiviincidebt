 /**
  * Training Configuration - Constants centralisées pour l'entraînement IA
  */
 
 export const VIOLATION_TYPES = [
   'Abus de droit',
   'Retard injustifié',
   'Défaut d\'information',
   'Non-respect des délais',
   'Manquement au devoir de protection',
   'Violation du droit d\'être entendu',
   'Discrimination',
   'Autre',
   'Non applicable',
 ] as const;
 
 export type ViolationType = typeof VIOLATION_TYPES[number];
 
 export const CONFIDENCE_THRESHOLDS = {
   HIGH: 80,
   MEDIUM: 50,
   LOW: 30,
   AUTO_APPROVE: 90,
   REQUIRE_REVIEW: 70,
 } as const;
 
 export const TRAINING_PRIORITIES = {
   CRITICAL: 1,
   HIGH: 3,
   MEDIUM: 5,
   LOW: 7,
   BACKGROUND: 10,
 } as const;
 
 export const ACTION_TYPES = {
   VALIDATE: 'validated',
   CORRECT: 'corrected',
   REJECT: 'rejected',
   LOW_IMPORTANCE: 'low_importance',
 } as const;
 
 export const GRAVITY_LEVELS = [
   'Critique',
   'Grave',
   'Modéré',
   'Mineur',
 ] as const;
 
 export type GravityLevel = typeof GRAVITY_LEVELS[number];
 
 export const GRAVITY_COLORS: Record<GravityLevel | string, string> = {
   'Critique': 'bg-destructive text-destructive-foreground',
   'Grave': 'bg-orange-500 text-white',
   'Modéré': 'bg-yellow-500 text-black',
   'Mineur': 'bg-green-500 text-white',
 };
 
 export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
   if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
   if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
   return 'low';
 }
 
 export function getConfidenceColor(confidence: number): string {
   const level = getConfidenceLevel(confidence);
   switch (level) {
     case 'high': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
     case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
     case 'low': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
   }
 }