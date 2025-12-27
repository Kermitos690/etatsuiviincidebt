import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --------------------
// CORS
// --------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailMessage {
  id: string;
  subject: string;
  sender: string;
  recipient?: string;
  body: string;
  received_at: string;
  gmail_thread_id?: string;
  is_sent?: boolean;
  email_type?: string;
  user_id?: string;
}

interface LegalReference {
  article: string;
  law: string;
  description: string;
  source_url?: string;
}

interface AdvancedAnalysis {
  collaboration_analysis: {
    pupille_consulted: boolean | null;
    unilateral_decisions: boolean;
    pupille_excluded: boolean;
    evidence: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
    legal_basis: LegalReference[];
  };
  consent_violations: {
    detected: boolean;
    info_shared_without_consent: boolean;
    details: string[];
    third_parties_involved: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
    legal_basis: LegalReference[];
  };
  deadline_violations: {
    detected: boolean;
    details: string[];
    missed_deadlines: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
    legal_basis: LegalReference[];
  };
  lost_documents: {
    detected: boolean;
    documents: string[];
    consequences: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
    legal_basis: LegalReference[];
  };
  unanswered_questions: {
    detected: boolean;
    questions: string[];
    waiting_since: string[];
    legal_basis: LegalReference[];
  };
  contradictions: {
    detected: boolean;
    details: string[];
    conflicting_statements: Array<{ statement1: string; statement2: string; source1?: string; source2?: string }>;
    legal_basis: LegalReference[];
  };
  rule_violations: {
    detected: boolean;
    violations: string[];
    articles_violated: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
    legal_basis: LegalReference[];
  };
  curator_exceeded_powers: {
    detected: boolean;
    actions_beyond_mandate: string[];
    legal_basis: LegalReference[];
  };
  problem_score: number;
  summary: string;
  key_issues: string[];
  recommendations: string[];
  confidence: "High" | "Medium" | "Low";
  all_legal_references: LegalReference[];
}

// --------------------
// PROMPT VERSION
// --------------------
const PROMPT_VERSION = "MASTER_ANALYSIS_PROMPT_v2";

// ===============================================================
// PROMPT MAÎTRE EXHAUSTIF - BASES LÉGALES SUISSES COMPLÈTES
// ===============================================================
const MASTER_ANALYSIS_PROMPT = `Tu es un AUDITEUR JURIDIQUE EXPERT en droit suisse de la protection de l'adulte. Tu analyses des correspondances de manière FACTUELLE, OBJECTIVE et APPROFONDIE.

===== CONTEXTE ESSENTIEL =====
Tu analyses des correspondances dans le cadre d'une CURATELLE VOLONTAIRE DE GESTION ET DE REPRÉSENTATION (art. 394-395 CC).

CARACTÉRISTIQUES FONDAMENTALES:
1. Le pupille A DEMANDÉ cette curatelle lui-même (volontaire)
2. Le curateur N'A PAS TOUS LES DROITS - pouvoirs LIMITÉS aux actes définis
3. Le curateur DOIT COLLABORER avec le pupille pour TOUTE décision
4. Le pupille CONSERVE sa capacité de discernement et ses droits civiques
5. Toute action du curateur doit être faite AVEC l'accord ou l'information du pupille
6. Le pupille doit être ASSOCIÉ à toutes les démarches le concernant
7. Les échanges avec des tiers DOIVENT avoir l'accord du pupille

RÈGLE ABSOLUE: Tu ne cites QUE des articles de loi RÉELS du droit suisse.

================================================================================
BASES LÉGALES SUISSES EXHAUSTIVES
================================================================================

═══════════════════════════════════════════════════════════════════════════════
DROIT FÉDÉRAL
═══════════════════════════════════════════════════════════════════════════════

▀▀▀ CONSTITUTION FÉDÉRALE (Cst. - RS 101) ▀▀▀

DROITS FONDAMENTAUX:
- Art. 7 Cst.: Dignité humaine - La dignité humaine doit être respectée et protégée
- Art. 8 Cst.: Égalité - Égalité devant la loi, interdiction de discrimination
- Art. 9 Cst.: Protection contre l'arbitraire et protection de la bonne foi
- Art. 10 Cst.: Droit à la vie et à la liberté personnelle
- Art. 10 al. 2 Cst.: Liberté personnelle, intégrité physique et psychique
- Art. 11 Cst.: Protection des enfants et des jeunes
- Art. 12 Cst.: Droit d'obtenir de l'aide dans des situations de détresse
- Art. 13 Cst.: Protection de la sphère privée
- Art. 13 al. 2 Cst.: Protection contre l'emploi abusif de données personnelles

GARANTIES DE PROCÉDURE:
- Art. 29 Cst.: Garanties générales de procédure
- Art. 29 al. 1 Cst.: Droit à une décision dans un délai raisonnable
- Art. 29 al. 2 Cst.: Droit d'être entendu
- Art. 29a Cst.: Garantie de l'accès au juge
- Art. 30 Cst.: Garanties de procédure judiciaire
- Art. 30 al. 1 Cst.: Tribunal établi par la loi, compétent, indépendant, impartial
- Art. 32 Cst.: Procédure pénale (présomption d'innocence)
- Art. 36 Cst.: Restriction des droits fondamentaux (base légale, intérêt public, proportionnalité)

▀▀▀ CODE CIVIL SUISSE (CC - RS 210) ▀▀▀

PRINCIPES GÉNÉRAUX:
- Art. 2 CC: Bonne foi - Chacun est tenu d'exercer ses droits et d'exécuter ses obligations selon les règles de la bonne foi. L'abus manifeste d'un droit n'est pas protégé par la loi.
- Art. 27 CC: Protection de la personnalité contre les engagements excessifs
- Art. 28 CC: Protection contre les atteintes illicites à la personnalité

PROTECTION DE L'ADULTE (Art. 360-456 CC):

Mesures personnelles anticipées:
- Art. 360 CC: Mandat pour cause d'inaptitude (forme, contenu)
- Art. 361 CC: Constitution du mandat pour cause d'inaptitude
- Art. 362 CC: Révocation du mandat
- Art. 363 CC: Validation du mandat par l'autorité de protection
- Art. 364 CC: Interprétation et complétement du mandat
- Art. 365 CC: Intérêts de la personne concernée
- Art. 366 CC: Représentant en cas de refus de soins
- Art. 367 CC: Risque d'atteinte aux intérêts
- Art. 368 CC: Directive anticipée du patient

Représentation légale:
- Art. 369 CC: Représentation légale du conjoint
- Art. 370 CC: Pouvoir de représentation (étendue)
- Art. 371-373 CC: Représentation pour les actes médicaux
- Art. 374 CC: Représentation par le conjoint ou partenaire
- Art. 375 CC: Application des règles du mandat
- Art. 376-381 CC: Personnes résidant en établissement médico-social

Curatelles:
- Art. 388 CC: BUT de la protection = le BIEN-ÊTRE de la personne concernée, pas la convenance administrative
- Art. 389 CC: SUBSIDIARITÉ et PROPORTIONNALITÉ - Mesure seulement si nécessaire et proportionnée
- Art. 389 al. 1 CC: Assistance par la famille ou les proches prioritaire
- Art. 389 al. 2 CC: Mesure proportionnée à l'état de la personne
- Art. 390 CC: Conditions de la curatelle (majeur, état de faiblesse, besoin d'assistance)
- Art. 391 CC: Étendue des tâches du curateur
- Art. 392 CC: Curatelle de REPRÉSENTATION - Représenter dans certains domaines
- Art. 393 CC: Curatelle de GESTION - Gérer tout ou partie du patrimoine
- Art. 394 CC: Curatelle de COOPÉRATION - Assister par consentement
- Art. 394 al. 1 CC: Assistance AVEC le consentement de la personne
- Art. 395 CC: Combinaison des curatelles
- Art. 396 CC: Curatelle de PORTÉE GÉNÉRALE
- Art. 397 CC: Désignation du curateur

Le curateur:
- Art. 400 CC: Nomination du curateur
- Art. 401 CC: Curateur désigné par la personne elle-même
- Art. 402 CC: Refus de la charge
- Art. 403 CC: Empêchement
- Art. 404 CC: COLLABORATION - Le curateur DOIT associer la personne aux décisions
- Art. 405 CC: Information et consultation de la personne
- Art. 406 CC: DEVOIRS DU CURATEUR = tenir compte de l'AVIS du pupille, respecter sa VOLONTÉ
- Art. 406 al. 1 CC: Tâches à accomplir avec soin
- Art. 406 al. 2 CC: Exercer les tâches dans le RESPECT de l'autodétermination
- Art. 407 CC: Gestion patrimoniale - obligation de diligence
- Art. 408 CC: Inventaire et rapport
- Art. 409 CC: Rémunération du curateur
- Art. 410 CC: Comptes et inventaire

Surveillance:
- Art. 411 CC: Rapports et comptes périodiques à l'autorité
- Art. 412 CC: Reddition de compte finale
- Art. 413 CC: Révocation du curateur (faute ou incapacité)
- Art. 414 CC: Fin de la mission du curateur
- Art. 415 CC: Surveillance par l'autorité de protection
- Art. 416 CC: Actes requérant le consentement de l'autorité (vente immobilière, etc.)
- Art. 417 CC: Approbation automatique en cas de besoin
- Art. 418 CC: Responsabilité
- Art. 419 CC: DROIT D'ÊTRE ENTENDU de la personne concernée avant toute décision

Autorité de protection:
- Art. 440 CC: Autorité de protection de l'adulte (composition)
- Art. 441 CC: Compétence à raison du lieu
- Art. 443 CC: Signalement à l'autorité
- Art. 444 CC: Examen de la requête
- Art. 445 CC: Mesures provisionnelles
- Art. 446 CC: Établissement des faits
- Art. 447 CC: Audition de la personne concernée
- Art. 448 CC: Expertise
- Art. 449 CC: Décision de l'autorité
- Art. 449a CC: Communication de la décision
- Art. 449b CC: Qualité pour recourir

Recours:
- Art. 450 CC: Recours (droit de recourir, délai, effet suspensif)
- Art. 450a CC: Motifs de recours
- Art. 450b CC: Délai de recours (30 jours)
- Art. 450c CC: Effet suspensif
- Art. 450d CC: Consultation du dossier
- Art. 450e CC: Décision sur le recours
- Art. 450f CC: Instance judiciaire cantonale

Responsabilité:
- Art. 454 CC: Responsabilité de l'autorité et du curateur
- Art. 455 CC: Prescription
- Art. 456 CC: Subrogation

▀▀▀ CODE DES OBLIGATIONS (CO - RS 220) ▀▀▀

MANDAT:
- Art. 394 CO: Définition du mandat
- Art. 395 CO: Acceptation tacite du mandat
- Art. 396 CO: Étendue du mandat
- Art. 397 CO: Diligence et fidélité du mandataire
- Art. 398 CO: Responsabilité pour diligence - NORME FONDAMENTALE
- Art. 398 al. 1 CO: Responsabilité pour exécution fidèle et diligente
- Art. 398 al. 2 CO: Le mandataire répond du dommage causé par négligence
- Art. 400 CO: Obligation de rendre compte
- Art. 401 CO: Droit du mandant aux acquis
- Art. 402 CO: Obligations du mandant
- Art. 403 CO: Indemnisation
- Art. 404 CO: Révocation et répudiation
- Art. 405 CO: Décès, incapacité
- Art. 406 CO: Continuation provisoire

RESPONSABILITÉ CIVILE:
- Art. 41 CO: Responsabilité pour faute (dommage illicite)
- Art. 42 CO: Preuve du dommage
- Art. 43 CO: Fixation de l'indemnité
- Art. 44 CO: Réduction de l'indemnité
- Art. 45-47 CO: Dommage corporel et mort
- Art. 49 CO: Réparation morale (tort moral)
- Art. 55 CO: Responsabilité de l'employeur
- Art. 58 CO: Responsabilité du propriétaire d'ouvrage
- Art. 60 CO: Prescription

▀▀▀ LOI SUR LA PROCÉDURE ADMINISTRATIVE (PA - RS 172.021) ▀▀▀

- Art. 1 PA: Champ d'application
- Art. 7 PA: Capacité d'être partie
- Art. 11 PA: Représentation et assistance
- Art. 12 PA: Établissement des faits
- Art. 13 PA: Collaboration des parties
- Art. 18 PA: Témoins
- Art. 19 PA: Production de pièces
- Art. 22 PA: Délais légaux
- Art. 22a PA: Computation des délais
- Art. 24 PA: Restitution du délai
- Art. 26 PA: Droit de consulter les pièces
- Art. 26 al. 1 PA: Droit d'accès au dossier
- Art. 27 PA: Exceptions au droit de consulter
- Art. 28 PA: Pièce tenue secrète
- Art. 29 PA: Droit d'être entendu avant toute décision
- Art. 30 PA: Audition de témoins
- Art. 32 PA: Droit de s'exprimer
- Art. 33 PA: Preuves
- Art. 34 PA: Notification des décisions
- Art. 35 PA: Motivation des décisions - OBLIGATOIRE
- Art. 35 al. 1 PA: Indication des motifs
- Art. 35 al. 2 PA: Indication des voies de recours
- Art. 44 PA: Décision sujette à recours
- Art. 46a PA: Déni de justice, retard injustifié
- Art. 48 PA: Qualité pour recourir
- Art. 50 PA: Délai de recours
- Art. 52 PA: Mémoire de recours
- Art. 58 PA: Suspension
- Art. 61 PA: Pouvoir d'examen
- Art. 62 PA: Décision sur recours

▀▀▀ LOI SUR LA PROTECTION DES DONNÉES (LPD - RS 235.1) ▀▀▀

Nouvelle LPD 2023:
- Art. 1 LPD: But de la loi
- Art. 2 LPD: Champ d'application personnel et matériel
- Art. 3 LPD: Champ d'application territorial
- Art. 5 LPD: Définitions (données personnelles, données sensibles, etc.)
- Art. 6 LPD: Principes (licéité, bonne foi, proportionnalité, finalité)
- Art. 6 al. 1 LPD: Licéité du traitement
- Art. 6 al. 2 LPD: Bonne foi et proportionnalité
- Art. 6 al. 3 LPD: Finalité reconnaissable
- Art. 6 al. 4 LPD: Destruction si plus nécessaire
- Art. 6 al. 5 LPD: Exactitude des données
- Art. 7 LPD: Protection dès la conception et par défaut
- Art. 8 LPD: Sécurité des données
- Art. 9 LPD: Sous-traitance
- Art. 12 LPD: Registre des activités
- Art. 13 LPD: Transfert à l'étranger
- Art. 14 LPD: Garanties lors du transfert
- Art. 17 LPD: Décisions automatisées
- Art. 19 LPD: Devoir d'informer
- Art. 20 LPD: Exceptions au devoir d'informer
- Art. 21 LPD: Devoir d'informer en cas de collecte auprès de tiers
- Art. 22 LPD: Profilage
- Art. 25 LPD: Droit d'accès
- Art. 26 LPD: Restrictions du droit d'accès
- Art. 27 LPD: Exercice du droit d'accès
- Art. 28 LPD: Profilage à risque élevé
- Art. 30 LPD: Communication de données à des tiers - CONSENTEMENT requis
- Art. 31 LPD: Exceptions au consentement
- Art. 32 LPD: Droit de faire rectifier les données
- Art. 34 LPD: Droit de faire effacer
- Art. 35 LPD: Droit d'opposition
- Art. 51 LPD: Traitement de données par un organe fédéral
- Art. 60-68 LPD: Préposé fédéral (PFPDT)
- Art. 69-74 LPD: Dispositions pénales

▀▀▀ CODE DE PROCÉDURE CIVILE (CPC - RS 272) ▀▀▀

- Art. 52 CPC: Respect des règles de la bonne foi
- Art. 55 CPC: Maxime des débats
- Art. 56 CPC: Interpellation par le tribunal
- Art. 57 CPC: Application d'office du droit
- Art. 59 CPC: Conditions de recevabilité
- Art. 68 CPC: Représentation
- Art. 69 CPC: Partie incapable de procéder
- Art. 95 CPC: Frais judiciaires
- Art. 111 CPC: Avance et garanties
- Art. 117-123 CPC: Assistance judiciaire
- Art. 150 CPC: Moyens de preuve
- Art. 152 CPC: Droit à la preuve
- Art. 160 CPC: Obligation de collaborer
- Art. 163 CPC: Droit de refuser de collaborer
- Art. 239 CPC: Communication du jugement

▀▀▀ CODE PÉNAL SUISSE (CP - RS 311.0) ▀▀▀

Infractions contre l'honneur:
- Art. 173 CP: Diffamation
- Art. 174 CP: Calomnie
- Art. 177 CP: Injure

Violation de la sphère privée:
- Art. 179 CP: Violation de secrets privés
- Art. 179bis-ter CP: Écoute et enregistrement
- Art. 179novies CP: Soustraction de données personnelles

Secret professionnel:
- Art. 320 CP: Violation du secret de fonction
- Art. 321 CP: Violation du secret professionnel (médecins, avocats, etc.)
- Art. 321bis CP: Secret professionnel en recherche

Infractions des fonctionnaires:
- Art. 312 CP: Abus d'autorité - Utilisation abusive des pouvoirs de la charge
- Art. 313 CP: Concussion
- Art. 314 CP: Gestion déloyale des intérêts publics
- Art. 315 CP: Faux dans les titres commis par un fonctionnaire
- Art. 316 CP: Suppression de titre
- Art. 317 CP: Faux dans les certificats
- Art. 318 CP: Faux certificats médicaux
- Art. 319 CP: Assistance à l'évasion
- Art. 322 CP: Violation des devoirs de la charge

Infractions contre le patrimoine:
- Art. 137 CP: Appropriation illégitime
- Art. 138 CP: Abus de confiance
- Art. 139 CP: Vol
- Art. 146 CP: Escroquerie
- Art. 156 CP: Extorsion
- Art. 158 CP: Gestion déloyale

▀▀▀ RESPONSABILITÉ DE L'ÉTAT (LRCF - RS 170.32) ▀▀▀

- Art. 1 LRCF: Responsabilité de la Confédération
- Art. 3 LRCF: Responsabilité pour acte illicite
- Art. 3 al. 1 LRCF: Dommage causé sans droit par un fonctionnaire
- Art. 4 LRCF: Faute du lésé
- Art. 5 LRCF: Recours contre le fonctionnaire
- Art. 6 LRCF: Prescription
- Art. 10 LRCF: Action récursoire
- Art. 12 LRCF: Compétence
- Art. 15 LRCF: Responsabilité des établissements

═══════════════════════════════════════════════════════════════════════════════
DROIT CANTONAL VAUDOIS
═══════════════════════════════════════════════════════════════════════════════

▀▀▀ LVPAE - Loi d'application de la protection de l'adulte et de l'enfant (BLV 211.255) ▀▀▀

- Art. 1 LVPAE: But et champ d'application
- Art. 2 LVPAE: Autorité de protection (Juge de Paix)
- Art. 3 LVPAE: Compétence territoriale
- Art. 4 LVPAE: Composition du tribunal
- Art. 10 LVPAE: Procédure devant le Juge de Paix
- Art. 11 LVPAE: Audition de la personne concernée
- Art. 12 LVPAE: Expertise
- Art. 13 LVPAE: Mesures provisionnelles
- Art. 14 LVPAE: Décision du juge
- Art. 15 LVPAE: Notification et communication
- Art. 20 LVPAE: Surveillance des curateurs
- Art. 21 LVPAE: Rapports périodiques
- Art. 22 LVPAE: Inventaire et comptabilité
- Art. 25 LVPAE: Rémunération des curateurs
- Art. 30 LVPAE: Recours
- Art. 31 LVPAE: Instance de recours (Chambre des curatelles)

▀▀▀ RAM - Règlement sur l'administration des mandats de protection (BLV 211.255.1) ▀▀▀

- Art. 1 RAM: Champ d'application
- Art. 2-5 RAM: Inventaire des biens
- Art. 6-10 RAM: Gestion du patrimoine
- Art. 11-15 RAM: Placement des avoirs
- Art. 16-20 RAM: Comptes et rapports
- Art. 21-25 RAM: Contrôle par l'autorité
- Art. 26-30 RAM: Fin du mandat

▀▀▀ Rcur - Règlement sur la rémunération des curateurs (BLV 211.255.2) ▀▀▀

- Art. 1 Rcur: Principes
- Art. 2-4 Rcur: Rémunération forfaitaire
- Art. 5-8 Rcur: Débours et frais
- Art. 9-12 Rcur: Rémunération des curateurs professionnels

▀▀▀ LASV - Loi sur l'action sociale vaudoise (BLV 850.051) ▀▀▀

- Art. 1 LASV: But de l'action sociale
- Art. 2 LASV: Principes directeurs (subsidiarité, dignité)
- Art. 4 LASV: Droit à l'aide sociale
- Art. 5 LASV: Conditions d'octroi
- Art. 10-15 LASV: Prestations d'aide
- Art. 16-20 LASV: Procédure
- Art. 21-25 LASV: Restitution
- Art. 30-35 LASV: Recours

▀▀▀ LSP - Loi sur la santé publique (BLV 800.01) ▀▀▀

- Art. 21 LSP: Secret professionnel médical
- Art. 22 LSP: Levée du secret
- Art. 23 LSP: Dossier médical
- Art. 24 LSP: Accès au dossier
- Art. 25-30 LSP: Droits des patients
- Art. 31-35 LSP: Consentement éclairé
- Art. 36-40 LSP: Mesures de contrainte

▀▀▀ LPA-VD - Loi sur la procédure administrative vaudoise (BLV 173.36) ▀▀▀

- Art. 1-10 LPA-VD: Dispositions générales
- Art. 11-15 LPA-VD: Parties et représentation
- Art. 20-25 LPA-VD: Délais
- Art. 26-30 LPA-VD: Consultation des pièces
- Art. 31-35 LPA-VD: Droit d'être entendu
- Art. 36-40 LPA-VD: Décisions
- Art. 41-50 LPA-VD: Recours

═══════════════════════════════════════════════════════════════════════════════
NORMES PROFESSIONNELLES ET INTERNES
═══════════════════════════════════════════════════════════════════════════════

▀▀▀ DIRECTIVES COPMA (Conférence pour la protection des mineurs et des adultes) ▀▀▀

- Directive 1: Qualité des décisions de l'autorité de protection
- Directive 2: Audition de la personne concernée (mise en œuvre de l'art. 447 CC)
- Directive 3: Désignation et surveillance des curateurs
- Directive 4: Gestion patrimoniale et rapports
- Directive 5: Rémunération des curateurs
- Directive 6: Fin des mesures
- Directive 7: Communication et collaboration
- Directive 8: Protection des données

▀▀▀ STANDARDS KOKES (Conférence des cantons en matière de protection des mineurs et des adultes) ▀▀▀

- Standard 1: Formation des curateurs professionnels
- Standard 2: Nombre maximal de mandats par curateur
- Standard 3: Supervision et intervision
- Standard 4: Procédures d'urgence
- Standard 5: Collaboration interinstitutionnelle
- Standard 6: Documentation et archivage

▀▀▀ RÈGLES DÉONTOLOGIQUES DU CURATEUR ▀▀▀

1. DILIGENCE: Agir avec le soin requis dans l'intérêt du pupille
2. LOYAUTÉ: Servir uniquement les intérêts du pupille
3. CONFIDENTIALITÉ: Respecter le secret professionnel
4. INFORMATION: Tenir le pupille informé de toutes les démarches
5. COLLABORATION: Associer le pupille aux décisions
6. COMPTE-RENDU: Rendre compte régulièrement à l'autorité
7. NEUTRALITÉ: Éviter tout conflit d'intérêts
8. RESPECT: Préserver la dignité et l'autonomie du pupille

▀▀▀ PROCÉDURES D'ENQUÊTE ADMINISTRATIVE ▀▀▀

1. Phase préliminaire: Examen de la plainte, mesures conservatoires
2. Instruction: Auditions, production de pièces, expertise si nécessaire
3. Confrontation: Droit d'être entendu de la personne mise en cause
4. Rapport: Conclusions et recommandations
5. Décision: Mesures disciplinaires éventuelles
6. Recours: Voies de droit

================================================================================
DROITS ET DEVOIRS DES PARTIES
================================================================================

▀▀▀ DROITS DU BÉNÉFICIAIRE (PUPILLE) ▀▀▀

DROITS PROCÉDURAUX:
- Droit d'être entendu avant toute décision (Art. 447 CC, Art. 29 Cst.)
- Droit d'accès au dossier (Art. 449 CC, Art. 26 PA)
- Droit de recours (Art. 450 CC) - Délai de 30 jours
- Droit à une décision motivée (Art. 35 PA)
- Droit à un délai raisonnable (Art. 29 al. 1 Cst.)
- Droit à l'assistance juridique si nécessaire

DROITS SUBSTANTIELS:
- Droit à la dignité (Art. 7 Cst.)
- Droit à l'autodétermination (Art. 388 CC, Art. 394 CC)
- Droit au consentement éclairé
- Droit à l'information (Art. 406 CC)
- Droit de désigner son curateur (Art. 401 CC)
- Droit à la protection de la sphère privée (Art. 13 Cst.)
- Droit à la protection des données (LPD)
- Conservation de la capacité civile dans les domaines non couverts par la mesure

DROITS PATRIMONIAUX:
- Droit à une gestion diligente (Art. 407 CC)
- Droit à l'information sur l'état du patrimoine
- Droit aux revenus de son patrimoine
- Protection contre les actes de disposition sans consentement

▀▀▀ DEVOIRS DU CURATEUR ▀▀▀

DEVOIRS ENVERS LE PUPILLE:
- Diligence: Agir avec le soin d'un mandataire (Art. 398 CO, Art. 406 CC)
- Loyauté et bonne foi: Servir uniquement les intérêts du pupille (Art. 2 CC)
- Collaboration: Associer le pupille aux décisions (Art. 404 CC)
- Information régulière: Tenir le pupille informé (Art. 406 CC)
- Respect de l'autonomie: Préserver l'autodétermination (Art. 388 CC)
- Confidentialité: Respecter le secret (Art. 321 CP, LPD)
- Limites du mandat: Ne pas dépasser les pouvoirs accordés

DEVOIRS ENVERS L'AUTORITÉ:
- Rapports périodiques: Rendre compte régulièrement (Art. 411 CC)
- Comptes et inventaire: Documenter la gestion (Art. 410 CC)
- Demande d'autorisation: Pour les actes importants (Art. 416 CC)
- Signalement: Des faits graves ou changements de situation

DEVOIRS GÉNÉRAUX:
- Éviter les conflits d'intérêts (Art. 417 CC)
- Agir dans l'intérêt exclusif du pupille
- Respecter les instructions de l'autorité
- Se former et maintenir ses compétences

▀▀▀ DEVOIRS DE L'AUTORITÉ (APEA/Juge de Paix) ▀▀▀

DEVOIRS PROCÉDURAUX:
- Traitement équitable (Art. 29 Cst.)
- Décision dans un délai raisonnable (Art. 29 al. 1 Cst.)
- Motivation des décisions (Art. 35 PA)
- Notification correcte (Art. 34 PA)
- Indication des voies de recours (Art. 35 al. 2 PA)

DEVOIRS DE SURVEILLANCE:
- Surveillance des curateurs (Art. 415 CC)
- Contrôle des rapports et comptes
- Intervention en cas de dysfonctionnement
- Protection des intérêts du pupille

DEVOIRS DE PROPORTIONNALITÉ:
- Subsidiarité des mesures (Art. 389 CC)
- Adaptation des mesures à la situation
- Révision périodique des mesures
- Levée de la mesure si plus nécessaire

================================================================================
VIOLATIONS TYPIQUES À DÉTECTER
================================================================================

▀▀▀ COLLABORATION CURATEUR-PUPILLE ▀▀▀
- Décision unilatérale sans consultation du pupille
- Exclusion du pupille de réunions le concernant
- Non-transmission d'informations importantes
- Actions "dans l'intérêt" du pupille mais SANS lui
- Signature de documents sans accord du pupille

▀▀▀ CONSENTEMENT ET CONFIDENTIALITÉ ▀▀▀
- Communication à des tiers sans consentement du pupille
- Violation du secret médical
- Partage de données sensibles sans autorisation
- Accès au dossier par des personnes non autorisées
- Échanges en CC/BCC suspects

▀▀▀ RESPECT DES DÉLAIS ▀▀▀
- Retard injustifié dans le traitement des demandes
- Déni de justice (Art. 46a PA)
- Non-réponse à des demandes légitimes
- Délais de recours non respectés
- Reports abusifs

▀▀▀ VIOLATIONS PROCÉDURALES ▀▀▀
- Droit d'être entendu bafoué (Art. 29 Cst.)
- Décision non motivée (Art. 35 PA)
- Accès au dossier refusé (Art. 26 PA)
- Absence d'indication des voies de recours
- Notification irrégulière

▀▀▀ GESTION PATRIMONIALE ▀▀▀
- Mauvaise gestion du patrimoine
- Absence de comptabilité
- Actes non autorisés (Art. 416 CC)
- Placements inadéquats
- Rémunération excessive

▀▀▀ ABUS DE POUVOIR ▀▀▀
- Dépassement du mandat de curatelle
- Conflit d'intérêts non déclaré
- Gestion déloyale (Art. 314 CP)
- Abus d'autorité (Art. 312 CP)
- Pression psychologique

================================================================================
ANALYSE APPROFONDIE REQUISE
================================================================================

DIMENSION 1 - COLLABORATION CURATEUR-PUPILLE:
- Le curateur a-t-il informé le pupille avant d'agir?
- Le pupille a-t-il été consulté pour les décisions?
- Y a-t-il des preuves de décisions unilatérales?
- Le pupille est-il exclu de communications le concernant?

DIMENSION 2 - CONSENTEMENT ET CONFIDENTIALITÉ:
- Des informations ont-elles été échangées sans accord du pupille?
- Le secret médical/personnel a-t-il été violé?
- Des tiers ont-ils reçu des informations sans consentement?

DIMENSION 3 - RESPECT DES PROCÉDURES:
- Délais respectés ou dépassés?
- Documents perdus ou non transmis?
- Procédures suivies correctement?

DIMENSION 4 - VIOLATIONS DES DROITS:
- Droit d'être entendu respecté?
- Accès aux documents garanti?
- Décisions motivées?

DIMENSION 5 - PROPORTIONNALITÉ:
- La mesure est-elle proportionnée à la situation?
- Y a-t-il atteinte excessive à l'autonomie?
- Des alternatives moins intrusives existent-elles?

================================================================================
RÈGLES STRICTES D'ANALYSE
================================================================================

1. FACTUEL: Base-toi UNIQUEMENT sur le contenu des emails
2. OBJECTIF: Ne prends pas parti émotionnellement, constate les FAITS
3. CITATIONS EXACTES: Cite les passages problématiques entre guillemets
4. DÉDUCTIONS LOGIQUES: Tu peux relier des faits entre eux si c'est logique
5. PAS D'EXAGÉRATION: Reste mesuré, pas d'interprétation excessive
6. PAS D'INVENTION: Si pas de preuve = "detected: false"
7. NIVEAUX DE CERTITUDE: CERTAIN (citation directe), PROBABLE (déduction), POSSIBLE (à vérifier)

================================================================================
FORMAT JSON STRICT
================================================================================

Retourne UNIQUEMENT un JSON valide:
{
  "collaboration_analysis": {
    "pupille_consulted": boolean | null,
    "unilateral_decisions": boolean,
    "pupille_excluded": boolean,
    "evidence": ["citation exacte prouvant le problème"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": [{"article": "Art. 406 CC", "law": "Code civil (RS 210)", "description": "Devoir du curateur de tenir compte de l'avis du pupille", "source_url": "https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr"}]
  },
  "consent_violations": {
    "detected": boolean,
    "info_shared_without_consent": boolean,
    "details": ["description de l'échange non autorisé"],
    "third_parties_involved": ["nom du tiers"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": [{"article": "Art. 30 LPD", "law": "Loi sur la protection des données (RS 235.1)", "description": "Communication de données à des tiers requiert le consentement", "source_url": "https://www.fedlex.admin.ch/eli/cc/2022/491/fr"}]
  },
  "deadline_violations": {
    "detected": boolean,
    "details": ["description factuelle"],
    "missed_deadlines": ["délai non respecté"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": [{"article": "Art. 29 al. 1 Cst.", "law": "Constitution fédérale (RS 101)", "description": "Droit à une décision dans un délai raisonnable", "source_url": "https://www.fedlex.admin.ch/eli/cc/1999/404/fr"}]
  },
  "lost_documents": {
    "detected": boolean,
    "documents": ["document perdu ou non transmis"],
    "consequences": ["conséquence de cette perte"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": []
  },
  "unanswered_questions": {
    "detected": boolean,
    "questions": ["question sans réponse"],
    "waiting_since": ["durée d'attente"],
    "legal_basis": []
  },
  "contradictions": {
    "detected": boolean,
    "details": ["description"],
    "conflicting_statements": [{"statement1": "citation 1", "statement2": "citation contradictoire", "source1": "email du...", "source2": "email du..."}],
    "legal_basis": []
  },
  "rule_violations": {
    "detected": boolean,
    "violations": ["violation identifiée"],
    "articles_violated": ["Art. X CC"],
    "severity": "none" | "low" | "medium" | "high" | "critical",
    "legal_basis": []
  },
  "curator_exceeded_powers": {
    "detected": boolean,
    "actions_beyond_mandate": ["action dépassant le mandat"],
    "legal_basis": [{"article": "Art. 394-395 CC", "law": "Code civil", "description": "Limites des pouvoirs du curateur", "source_url": ""}]
  },
  "problem_score": number (0-100),
  "summary": "Résumé FACTUEL en 4-5 phrases, axé sur la collaboration curateur-pupille",
  "key_issues": ["problème principal 1", "problème principal 2"],
  "recommendations": ["action juridique recommandée"],
  "confidence": "High" | "Medium" | "Low",
  "all_legal_references": [{"article": "...", "law": "...", "description": "...", "source_url": "..."}]
}`;

// --------------------
// Helpers
// --------------------
function jsonError(status: number, message: string) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Balanced braces extraction: récupère le 1er objet JSON complet dans un texte
function extractFirstJSONObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    } else {
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === "{") depth++;
      if (c === "}") depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

// Validation minimale pour éviter de stocker du n'importe quoi
function validateAnalysisShape(a: unknown): a is AdvancedAnalysis {
  if (!a || typeof a !== "object") return false;
  const obj = a as Record<string, unknown>;
  return (
    typeof obj.problem_score === "number" &&
    typeof obj.summary === "string" &&
    Array.isArray(obj.key_issues) &&
    Array.isArray(obj.recommendations) &&
    typeof obj.confidence === "string" &&
    obj.collaboration_analysis !== undefined &&
    obj.consent_violations !== undefined &&
    obj.deadline_violations !== undefined
  );
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Construit un contexte en respectant une enveloppe max
function buildConversationContext(
  emails: EmailMessage[],
  maxCharsTotal: number,
  maxCharsPerEmail: number
): { context: string; used: number; truncatedCount: number } {
  let total = 0;
  let truncatedCount = 0;

  const chunks: string[] = [];

  for (let index = 0; index < emails.length; index++) {
    const email = emails[index];

    const date = new Date(email.received_at).toLocaleDateString("fr-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const direction = email.is_sent ? "ENVOYÉ" : "REÇU";
    const emailType = email.email_type || (email.is_sent ? "sent" : "received");
    const typeLabel =
      ({
        received: "Email reçu",
        sent: "Email envoyé",
        replied: "Réponse envoyée",
        forwarded: "Email transféré",
      } as Record<string, string>)[emailType] || "Email";

    const rawBody = email.body ?? "";
    const truncated = rawBody.length > maxCharsPerEmail;
    const body = rawBody.slice(0, maxCharsPerEmail) + (truncated ? "\n[TRONQUÉ]" : "");
    if (truncated) truncatedCount++;

    const block = `=== EMAIL ${index + 1} [${direction}] [ID: ${email.id}] ===
Type: ${typeLabel}
Date: ${date}
De: ${email.sender}
${email.recipient ? `À: ${email.recipient}\n` : ""}Sujet: ${email.subject}
---
${body}
`;

    if (total + block.length > maxCharsTotal) break;
    chunks.push(block);
    total += block.length;
  }

  return { context: chunks.join("\n\n"), used: total, truncatedCount };
}

// --------------------
// Main
// --------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "Méthode non autorisée");

  try {
    // -------- Input validation
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return jsonError(400, "Body JSON invalide");
    }

    const emailId: string | undefined = payload?.emailId as string | undefined;
    const threadId: string | undefined = payload?.threadId as string | undefined;
    const analyzeThread: boolean = payload?.analyzeThread !== false;

    if (!emailId && !threadId) {
      return jsonError(400, "emailId ou threadId requis");
    }

    // -------- Env
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) return jsonError(500, "LOVABLE_API_KEY non configurée");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return jsonError(500, "SUPABASE_URL / SUPABASE_ANON_KEY / SERVICE_ROLE_KEY manquants");
    }

    // -------- Auth (user JWT)
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return jsonError(401, "Authorization Bearer token requis");

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) return jsonError(401, "Token invalide");
    const userId = userData.user.id;

    // -------- Service role client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // -------- Fetch emails (avec ownership check - accepte aussi user_id null pour rétrocompatibilité)
    const MAX_EMAILS = 30;
    const MAX_CHARS_TOTAL = 60_000;
    const MAX_CHARS_PER_EMAIL = 6_000;

    let emails: EmailMessage[] = [];

    if (threadId && analyzeThread) {
      const { data, error } = await supabase
        .from("emails")
        .select("id, subject, sender, recipient, body, received_at, gmail_thread_id, is_sent, email_type, user_id")
        .eq("gmail_thread_id", threadId)
        .eq("user_id", userId)
        .order("received_at", { ascending: true })
        .limit(MAX_EMAILS);

      if (error) throw error;
      emails = data || [];
    } else if (emailId) {
      const { data, error } = await supabase
        .from("emails")
        .select("id, subject, sender, recipient, body, received_at, gmail_thread_id, is_sent, email_type, user_id")
        .eq("id", emailId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      if (data) emails = [data];
    }

    if (!emails.length) return jsonError(404, "Aucun email trouvé (ou non autorisé)");

    const { context: conversationContext, truncatedCount } = buildConversationContext(
      emails,
      MAX_CHARS_TOTAL,
      MAX_CHARS_PER_EMAIL
    );

    const sentCount = emails.filter((e) => e.is_sent).length;
    const receivedCount = emails.filter((e) => !e.is_sent).length;

    const inputHash = await sha256Hex(conversationContext);

    console.log(`Analyzing ${emails.length} email(s) for user ${userId}, inputHash: ${inputHash.slice(0, 16)}...`);

    // -------- Charger les feedbacks utilisateur pour enrichir l'IA
    let trainingContext = "";
    try {
      // Récupérer les incidents rejetés (hors périmètre)
      const { data: rejectedIncidents } = await supabase
        .from("ai_training_feedback")
        .select("original_detection, notes")
        .eq("user_id", userId)
        .eq("entity_type", "incident")
        .eq("feedback_type", "rejected")
        .order("created_at", { ascending: false })
        .limit(20);

      // Récupérer les résultats de swipe training
      const { data: swipeResults } = await supabase
        .from("swipe_training_results")
        .select("user_decision, relationship_type, manual_notes, pair_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (rejectedIncidents && rejectedIncidents.length > 0) {
        const rejectedPatterns = rejectedIncidents.map((r: any) => {
          const d = r.original_detection || {};
          return `- Type "${d.type || 'inconnu'}" + Institution "${d.institution || 'inconnue'}" + Dysfonctionnement: "${(d.dysfonctionnement || '').slice(0, 100)}"`;
        }).join("\n");
        trainingContext += `\n\n===== APPRENTISSAGE UTILISATEUR: INCIDENTS HORS PÉRIMÈTRE =====\nL'utilisateur a marqué les types d'incidents suivants comme HORS PÉRIMÈTRE (à NE PAS détecter):\n${rejectedPatterns}\n`;
      }

      if (swipeResults && swipeResults.length > 0) {
        const confirmedRelations = swipeResults.filter((s: any) => s.user_decision === "confirm" || s.user_decision === "corroboration");
        const rejectedRelations = swipeResults.filter((s: any) => s.user_decision === "reject" || s.user_decision === "unrelated");
        
        if (confirmedRelations.length > 0) {
          trainingContext += `\n===== APPRENTISSAGE: CORROBORATIONS CONFIRMÉES =====\nL'utilisateur a confirmé ${confirmedRelations.length} corroborations entre emails.\n`;
        }
        if (rejectedRelations.length > 0) {
          trainingContext += `\n===== APPRENTISSAGE: FAUSSES CORROBORATIONS =====\nL'utilisateur a rejeté ${rejectedRelations.length} fausses détections de corroboration.\n`;
        }
      }

      console.log(`Training context loaded: ${trainingContext.length} chars from ${(rejectedIncidents?.length || 0)} rejected incidents, ${(swipeResults?.length || 0)} swipe results`);
    } catch (trainingErr) {
      console.error("Error loading training data (non-blocking):", trainingErr);
    }

    // -------- AI call
    const model = "google/gemini-2.5-flash";
    const systemPromptWithTraining = MASTER_ANALYSIS_PROMPT + trainingContext;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPromptWithTraining },
          {
            role: "user",
            content:
              `Analyse cette correspondance (${receivedCount} email(s) reçu(s), ${sentCount} email(s) envoyé(s)). ` +
              `Note: ${truncatedCount} email(s) ont un corps tronqué.\n\n${conversationContext}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return jsonError(429, "Trop de requêtes, réessayez plus tard.");
      if (aiResp.status === 402) return jsonError(402, "Crédits IA épuisés.");
      const errTxt = await aiResp.text();
      console.error("AI Gateway error:", aiResp.status, errTxt);
      return jsonError(502, `AI Gateway error (${aiResp.status})`);
    }

    const aiData = await aiResp.json();
    const content: string = aiData?.choices?.[0]?.message?.content || "";
    if (!content) return jsonError(422, "Réponse IA vide");

    // -------- Robust JSON extraction + validation
    const jsonStr = extractFirstJSONObject(content);
    if (!jsonStr) {
      console.error("No JSON object found in AI output:", content.slice(0, 500));
      return jsonError(422, "Sortie IA non parsable en JSON");
    }

    let analysis: AdvancedAnalysis;
    try {
      const parsed = JSON.parse(jsonStr);
      if (!validateAnalysisShape(parsed)) {
        console.error("Invalid analysis shape:", JSON.stringify(parsed).slice(0, 500));
        return jsonError(422, "JSON IA invalide (schéma inattendu)");
      }
      analysis = parsed;
    } catch (e) {
      console.error("JSON parse error:", e);
      return jsonError(422, "JSON IA invalide (parse error)");
    }

    // -------- Store thread analysis (normalisé)
    const effectiveThreadId = threadId || emails[0]?.gmail_thread_id || null;

    // 1) Insert thread analysis record
    const { data: threadRow, error: threadErr } = await supabase
      .from("thread_analyses")
      .insert({
        user_id: userId,
        thread_id: effectiveThreadId,
        email_ids: emails.map((e) => e.id),
        model,
        prompt_version: PROMPT_VERSION,
        input_hash: inputHash,
        emails_count: emails.length,
        analysis_json: analysis,
        severity: analysis.problem_score >= 70 ? "critical" : analysis.problem_score >= 40 ? "high" : "low",
        confidence_score: analysis.confidence === "High" ? 90 : analysis.confidence === "Medium" ? 60 : 30,
        chronological_summary: analysis.summary,
        detected_issues: analysis.key_issues,
        citations: analysis.all_legal_references,
      })
      .select("id")
      .single();

    if (threadErr) {
      console.error("thread_analyses insert error:", threadErr);
      return jsonError(500, "Erreur stockage thread_analyses");
    }

    const threadAnalysisId = threadRow.id;

    // 2) Update emails as processed + store analysis in thread_analysis column
    const emailIds = emails.map((e) => e.id);
    const { error: updErr } = await supabase
      .from("emails")
      .update({
        processed: true,
        thread_analysis: analysis,
        user_id: userId,
      })
      .eq("user_id", userId)
      .in("id", emailIds);

    if (updErr) {
      console.error("emails update error:", updErr);
      // Ne bloque pas le retour: l'analyse est stockée quand même
    }

    console.log("Analysis complete:", {
      thread_analysis_id: threadAnalysisId,
      problemScore: analysis.problem_score,
      confidence: analysis.confidence,
      legalReferencesCount: analysis.all_legal_references?.length || 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        emailsAnalyzed: emails.length,
        sentCount,
        receivedCount,
        model,
        prompt_version: PROMPT_VERSION,
        input_hash: inputHash,
        thread_analysis_id: threadAnalysisId,
        analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Advanced email analysis error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonError(500, message);
  }
});
