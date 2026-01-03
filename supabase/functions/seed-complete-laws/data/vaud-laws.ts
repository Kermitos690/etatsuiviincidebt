// Complete index of Vaud cantonal laws organized by domain
export interface LawDefinition {
  code_name: string;
  full_name: string;
  abbreviation?: string;
  blv_reference: string;
  domain: string;
  domain_category?: string;
  domain_type?: string;
  total_articles: number;
  source_url: string;
  keywords: string[];
  description?: string;
}

export const VAUD_LAWS: LawDefinition[] = [
  // ============================================
  // DOMAINE 1: CONSTITUTION ET DROITS POLITIQUES
  // ============================================
  {
    code_name: 'Cst-VD',
    full_name: 'Constitution du Canton de Vaud',
    abbreviation: 'Cst-VD',
    blv_reference: 'BLV 101.01',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 175,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5765',
    keywords: ['constitution', 'droits fondamentaux', 'organisation', 'état', 'canton'],
    description: 'Constitution cantonale du 14 avril 2003 définissant l\'organisation de l\'État vaudois et les droits fondamentaux'
  },
  {
    code_name: 'LDCV',
    full_name: 'Loi sur le droit de cité vaudois',
    abbreviation: 'LDCV',
    blv_reference: 'BLV 141.11',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5131',
    keywords: ['naturalisation', 'citoyenneté', 'droit de cité', 'bourgeoisie'],
    description: 'Conditions et procédures de naturalisation cantonale'
  },
  {
    code_name: 'LEDP',
    full_name: 'Loi sur l\'exercice des droits politiques',
    abbreviation: 'LEDP',
    blv_reference: 'BLV 160.01',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 120,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5139',
    keywords: ['vote', 'élection', 'référendum', 'initiative', 'droits politiques'],
    description: 'Droit de vote, éligibilité, initiatives et référendums'
  },
  {
    code_name: 'RLEDP',
    full_name: 'Règlement d\'application de la LEDP',
    abbreviation: 'RLEDP',
    blv_reference: 'BLV 160.01.1',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 80,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5140',
    keywords: ['vote', 'élection', 'procédure', 'bulletin'],
    description: 'Modalités pratiques des élections et votations'
  },
  {
    code_name: 'LInfo',
    full_name: 'Loi sur l\'information',
    abbreviation: 'LInfo',
    blv_reference: 'BLV 170.21',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5155',
    keywords: ['transparence', 'information', 'accès', 'documents', 'public'],
    description: 'Transparence de l\'administration et accès à l\'information publique'
  },
  {
    code_name: 'RLInfo',
    full_name: 'Règlement d\'application de la LInfo',
    abbreviation: 'RLInfo',
    blv_reference: 'BLV 170.21.1',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 25,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5156',
    keywords: ['transparence', 'procédure', 'demande', 'délai'],
    description: 'Modalités d\'accès aux documents publics'
  },
  {
    code_name: 'LLV',
    full_name: 'Loi sur la législation vaudoise',
    abbreviation: 'LLV',
    blv_reference: 'BLV 170.51',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5157',
    keywords: ['législation', 'RSV', 'codification', 'publication'],
    description: 'Publication du Recueil systématique vaudois et règles de codification'
  },
  {
    code_name: 'LJC',
    full_name: 'Loi sur la juridiction constitutionnelle',
    abbreviation: 'LJC',
    blv_reference: 'BLV 173.32',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5160',
    keywords: ['cour constitutionnelle', 'recours', 'contrôle', 'constitutionnalité'],
    description: 'Contrôle juridictionnel des lois cantonales'
  },

  // ============================================
  // DOMAINE 2: ORGANISATION DE L'ÉTAT ET COMMUNES
  // ============================================
  {
    code_name: 'LDecTer',
    full_name: 'Loi sur le découpage territorial',
    abbreviation: 'LDecTer',
    blv_reference: 'BLV 132.15',
    domain: 'organisation',
    domain_type: 'administratif',
    total_articles: 25,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5126',
    keywords: ['district', 'commune', 'territoire', 'découpage'],
    description: 'Organisation territoriale du canton en districts et communes'
  },
  {
    code_name: 'LC',
    full_name: 'Loi sur les communes',
    abbreviation: 'LC',
    blv_reference: 'BLV 175.11',
    domain: 'organisation',
    domain_type: 'administratif',
    total_articles: 150,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5162',
    keywords: ['commune', 'municipal', 'conseil', 'autonomie', 'compétence'],
    description: 'Statut, compétences et administration des communes vaudoises'
  },
  {
    code_name: 'LFusCom',
    full_name: 'Loi sur les fusions de communes',
    abbreviation: 'LFusCom',
    blv_reference: 'BLV 175.61',
    domain: 'organisation',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5163',
    keywords: ['fusion', 'commune', 'regroupement', 'procédure'],
    description: 'Procédures et mesures d\'accompagnement des fusions de communes'
  },
  {
    code_name: 'LPIV',
    full_name: 'Loi sur la péréquation intercommunale vaudoise',
    abbreviation: 'LPIV',
    blv_reference: 'BLV 175.51',
    domain: 'organisation',
    domain_type: 'administratif',
    total_articles: 80,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5164',
    keywords: ['péréquation', 'solidarité', 'commune', 'financement'],
    description: 'Solidarité financière entre communes (entrée en vigueur 01.01.2025)'
  },
  {
    code_name: 'LPers-VD',
    full_name: 'Loi sur le personnel de l\'État de Vaud',
    abbreviation: 'LPers-VD',
    blv_reference: 'BLV 172.31',
    domain: 'organisation',
    domain_type: 'administratif',
    total_articles: 120,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5161',
    keywords: ['personnel', 'fonctionnaire', 'emploi', 'état', 'salaire'],
    description: 'Conditions d\'emploi des collaborateurs de l\'État'
  },
  {
    code_name: 'RLPers',
    full_name: 'Règlement d\'application de la LPers-VD',
    abbreviation: 'RLPers',
    blv_reference: 'BLV 172.31.1',
    domain: 'organisation',
    domain_type: 'administratif',
    total_articles: 100,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5161',
    keywords: ['personnel', 'salaire', 'congé', 'horaire'],
    description: 'Modalités d\'application du statut du personnel'
  },
  {
    code_name: 'LREEDP',
    full_name: 'Loi sur les relations entre l\'État et les Églises reconnues',
    abbreviation: 'LREEDP',
    blv_reference: 'BLV 180.11',
    domain: 'organisation',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5165',
    keywords: ['église', 'religion', 'reconnaissance', 'financement'],
    description: 'Statut des Églises reconnues de droit public'
  },

  // ============================================
  // DOMAINE 3: FINANCES PUBLIQUES ET FISCALITÉ
  // ============================================
  {
    code_name: 'LFin',
    full_name: 'Loi sur les finances',
    abbreviation: 'LFin',
    blv_reference: 'BLV 610.11',
    domain: 'finances',
    domain_type: 'administratif',
    total_articles: 80,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5200',
    keywords: ['budget', 'comptabilité', 'finances', 'contrôle'],
    description: 'Principes de gestion financière cantonale'
  },
  {
    code_name: 'LI',
    full_name: 'Loi sur les impôts directs cantonaux',
    abbreviation: 'LI',
    blv_reference: 'BLV 642.11',
    domain: 'finances',
    domain_type: 'administratif',
    total_articles: 280,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5205',
    keywords: ['impôt', 'revenu', 'fortune', 'capital', 'bénéfice', 'fiscal'],
    description: 'Impôt cantonal sur le revenu, la fortune, le bénéfice et le capital'
  },
  {
    code_name: 'LICom',
    full_name: 'Loi sur les impôts communaux',
    abbreviation: 'LICom',
    blv_reference: 'BLV 650.11',
    domain: 'finances',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5210',
    keywords: ['impôt', 'commune', 'centime additionnel', 'taxe'],
    description: 'Impôts perçus par les communes'
  },
  {
    code_name: 'LEFI',
    full_name: 'Loi sur l\'estimation fiscale des immeubles',
    abbreviation: 'LEFI',
    blv_reference: 'BLV 642.21',
    domain: 'finances',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5206',
    keywords: ['estimation', 'immeuble', 'valeur', 'fiscale', 'foncier'],
    description: 'Règles de taxation de la valeur immobilière'
  },
  {
    code_name: 'LMut',
    full_name: 'Loi sur le droit de mutation',
    abbreviation: 'LMut',
    blv_reference: 'BLV 648.11',
    domain: 'finances',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5208',
    keywords: ['mutation', 'transfert', 'immobilier', 'impôt'],
    description: 'Impôt sur les transferts immobiliers'
  },
  {
    code_name: 'LMP-VD',
    full_name: 'Loi sur les marchés publics',
    abbreviation: 'LMP-VD',
    blv_reference: 'BLV 726.01',
    domain: 'finances',
    domain_type: 'administratif',
    total_articles: 85,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5220',
    keywords: ['marché public', 'appel d\'offres', 'soumission', 'adjudication'],
    description: 'Procédures d\'appels d\'offres publics (dès 01.01.2023)'
  },
  {
    code_name: 'RLMP-VD',
    full_name: 'Règlement d\'application de la LMP-VD',
    abbreviation: 'RLMP-VD',
    blv_reference: 'BLV 726.01.1',
    domain: 'finances',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5221',
    keywords: ['marché public', 'seuil', 'procédure', 'critères'],
    description: 'Modalités des marchés publics'
  },
  {
    code_name: 'LCC',
    full_name: 'Loi sur la Cour des comptes',
    abbreviation: 'LCC',
    blv_reference: 'BLV 610.21',
    domain: 'finances',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5201',
    keywords: ['cour des comptes', 'contrôle', 'audit', 'finances'],
    description: 'Institution cantonale de contrôle financier indépendant'
  },

  // ============================================
  // DOMAINE 4: FORMATION ET ÉDUCATION
  // ============================================
  {
    code_name: 'LEO',
    full_name: 'Loi sur l\'enseignement obligatoire',
    abbreviation: 'LEO',
    blv_reference: 'BLV 400.02',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 156,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5400',
    keywords: ['école', 'élève', 'enseignement', 'primaire', 'secondaire', 'obligatoire'],
    description: 'École obligatoire vaudoise (degrés primaire et secondaire I, 11 années)'
  },
  {
    code_name: 'RLEO',
    full_name: 'Règlement d\'application de la LEO',
    abbreviation: 'RLEO',
    blv_reference: 'BLV 400.02.1',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 120,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5401',
    keywords: ['école', 'évaluation', 'discipline', 'horaire', 'note'],
    description: 'Mise en œuvre pratique de l\'enseignement obligatoire'
  },
  {
    code_name: 'LPS',
    full_name: 'Loi sur la pédagogie spécialisée',
    abbreviation: 'LPS',
    blv_reference: 'BLV 417.31',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 65,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5410',
    keywords: ['pédagogie spécialisée', 'handicap', 'inclusion', 'besoins éducatifs'],
    description: 'Enseignement spécialisé pour les élèves ayant des besoins particuliers'
  },
  {
    code_name: 'RLPS',
    full_name: 'Règlement d\'application de la LPS',
    abbreviation: 'RLPS',
    blv_reference: 'BLV 417.31.1',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5411',
    keywords: ['évaluation', 'mesures', 'accompagnement', 'spécialisé'],
    description: 'Modalités d\'évaluation et de prise en charge spécialisées'
  },
  {
    code_name: 'LEPr',
    full_name: 'Loi sur l\'enseignement privé',
    abbreviation: 'LEPr',
    blv_reference: 'BLV 400.35',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5402',
    keywords: ['école privée', 'homologation', 'surveillance', 'autorisation'],
    description: 'Ouverture et supervision des établissements d\'enseignement privés'
  },
  {
    code_name: 'LHEP',
    full_name: 'Loi sur la Haute école pédagogique',
    abbreviation: 'LHEP',
    blv_reference: 'BLV 419.11',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5420',
    keywords: ['HEP', 'formation', 'enseignant', 'pédagogie'],
    description: 'Organisation et missions de la HEP Vaud'
  },
  {
    code_name: 'LUL',
    full_name: 'Loi sur l\'Université de Lausanne',
    abbreviation: 'LUL',
    blv_reference: 'BLV 414.11',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5415',
    keywords: ['université', 'UNIL', 'études', 'recherche', 'académique'],
    description: 'Statut de l\'Université de Lausanne'
  },
  {
    code_name: 'LGym',
    full_name: 'Loi sur l\'enseignement secondaire supérieur',
    abbreviation: 'LGym',
    blv_reference: 'BLV 412.11',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 70,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5405',
    keywords: ['gymnase', 'maturité', 'secondaire II', 'études'],
    description: 'Enseignement gymnasial et maturité'
  },
  {
    code_name: 'LVLFPr',
    full_name: 'Loi sur la formation professionnelle',
    abbreviation: 'LVLFPr',
    blv_reference: 'BLV 413.01',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 75,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5407',
    keywords: ['apprentissage', 'formation professionnelle', 'CFC', 'AFP'],
    description: 'Formation professionnelle et apprentissage'
  },

  // ============================================
  // DOMAINE 5: AIDES SOCIALES, FAMILLE, JEUNESSE
  // ============================================
  {
    code_name: 'LASV',
    full_name: 'Loi sur l\'action sociale vaudoise',
    abbreviation: 'LASV',
    blv_reference: 'BLV 850.01',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 95,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5850',
    keywords: ['aide sociale', 'RI', 'revenu d\'insertion', 'prestation', 'CSR'],
    description: 'Revenu d\'insertion (RI) et organisation de l\'aide sociale'
  },
  {
    code_name: 'RLASV',
    full_name: 'Règlement d\'application de la LASV',
    abbreviation: 'RLASV',
    blv_reference: 'BLV 850.01.1',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 80,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5851',
    keywords: ['barème', 'calcul', 'prestation', 'RI'],
    description: 'Barèmes et modalités d\'octroi de l\'aide sociale'
  },
  {
    code_name: 'LPCFam',
    full_name: 'Loi sur les prestations complémentaires familles et rente-pont',
    abbreviation: 'LPCFam',
    blv_reference: 'BLV 850.11',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5852',
    keywords: ['famille', 'prestations', 'rente-pont', 'chômage', 'retraite'],
    description: 'Prestations pour familles à bas revenu et rente-pont chômeurs'
  },
  {
    code_name: 'RLPCFam',
    full_name: 'Règlement d\'application de la LPCFam',
    abbreviation: 'RLPCFam',
    blv_reference: 'BLV 850.11.1',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5853',
    keywords: ['calcul', 'conditions', 'demande', 'famille'],
    description: 'Conditions des prestations complémentaires familles'
  },
  {
    code_name: 'LAJE',
    full_name: 'Loi sur l\'accueil de jour des enfants',
    abbreviation: 'LAJE',
    blv_reference: 'BLV 211.22',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5211',
    keywords: ['crèche', 'garderie', 'accueil', 'enfant', 'parascolaire', 'UAPE'],
    description: 'Places d\'accueil pour les enfants jusqu\'à 12 ans'
  },
  {
    code_name: 'RLAJE',
    full_name: 'Règlement d\'application de la LAJE',
    abbreviation: 'RLAJE',
    blv_reference: 'BLV 211.22.1',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5212',
    keywords: ['subvention', 'tarif', 'place', 'accueil'],
    description: 'Financement et normes des structures d\'accueil'
  },
  {
    code_name: 'LProMin',
    full_name: 'Loi sur la protection des mineurs',
    abbreviation: 'LProMin',
    blv_reference: 'BLV 850.41',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 75,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5854',
    keywords: ['protection', 'mineur', 'SPJ', 'placement', 'danger', 'enfant'],
    description: 'Protection des mineurs en danger et Service de protection de la jeunesse'
  },
  {
    code_name: 'RLProMin',
    full_name: 'Règlement d\'application de la LProMin',
    abbreviation: 'RLProMin',
    blv_reference: 'BLV 850.41.1',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5855',
    keywords: ['signalement', 'mesure', 'placement', 'procédure'],
    description: 'Procédures de protection des mineurs'
  },
  {
    code_name: 'LVLAVI',
    full_name: 'Loi vaudoise sur l\'aide aux victimes d\'infractions',
    abbreviation: 'LVLAVI',
    blv_reference: 'BLV 312.51',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5312',
    keywords: ['victime', 'infraction', 'aide', 'indemnisation', 'LAVI'],
    description: 'Mise en œuvre de la loi fédérale sur l\'aide aux victimes'
  },
  {
    code_name: 'LAIH',
    full_name: 'Loi sur les mesures d\'aide et d\'intégration pour personnes handicapées',
    abbreviation: 'LAIH',
    blv_reference: 'BLV 850.61',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5856',
    keywords: ['handicap', 'intégration', 'allocation', 'institution'],
    description: 'Prestations cantonales pour l\'intégration des personnes handicapées'
  },
  {
    code_name: 'LAPRAMS',
    full_name: 'Loi d\'aide aux personnes recourant à l\'action médico-sociale',
    abbreviation: 'LAPRAMS',
    blv_reference: 'BLV 850.21',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5857',
    keywords: ['EMS', 'soins', 'financement', 'hébergement', 'médico-social'],
    description: 'Prise en charge des coûts d\'EMS pour personnes âgées ou invalides'
  },
  {
    code_name: 'LVLAMal',
    full_name: 'Loi d\'application de la LAMal',
    abbreviation: 'LVLAMal',
    blv_reference: 'BLV 832.01',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5832',
    keywords: ['assurance maladie', 'subside', 'prime', 'LAMal'],
    description: 'Subsides cantonaux à l\'assurance-maladie'
  },
  {
    code_name: 'LIAM',
    full_name: 'Loi sur l\'intégration des étrangers et la prévention du racisme',
    abbreviation: 'LIAM',
    blv_reference: 'BLV 142.51',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5142',
    keywords: ['intégration', 'étranger', 'migrant', 'racisme', 'BCI'],
    description: 'Intégration des personnes d\'origine étrangère'
  },

  // ============================================
  // DOMAINE 6: SANTÉ PUBLIQUE ET HANDICAP
  // ============================================
  {
    code_name: 'LSP',
    full_name: 'Loi sur la santé publique',
    abbreviation: 'LSP',
    blv_reference: 'BLV 800.01',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 180,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5800',
    keywords: ['santé', 'hygiène', 'épidémie', 'profession médicale', 'patient'],
    description: 'Protection et promotion de la santé de la population'
  },
  {
    code_name: 'RLSP',
    full_name: 'Règlement d\'application de la LSP',
    abbreviation: 'RLSP',
    blv_reference: 'BLV 800.01.1',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 100,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5801',
    keywords: ['autorisation', 'profession', 'surveillance', 'norme'],
    description: 'Modalités d\'application de la loi sur la santé'
  },
  {
    code_name: 'LPFES',
    full_name: 'Loi sur la planification et le financement des établissements sanitaires',
    abbreviation: 'LPFES',
    blv_reference: 'BLV 810.01',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 85,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5810',
    keywords: ['hôpital', 'clinique', 'planification', 'financement', 'soins'],
    description: 'Organisation du réseau hospitalier vaudois'
  },
  {
    code_name: 'RLPFES',
    full_name: 'Règlement d\'application de la LPFES',
    abbreviation: 'RLPFES',
    blv_reference: 'BLV 810.01.1',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5811',
    keywords: ['planification', 'liste', 'hôpital', 'contribution'],
    description: 'Modalités de planification hospitalière'
  },
  {
    code_name: 'LSR',
    full_name: 'Loi sur les réseaux de soins',
    abbreviation: 'LSR',
    blv_reference: 'BLV 810.02',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5812',
    keywords: ['réseau', 'soins intégrés', 'coordination', 'médecin'],
    description: 'Réseaux de soins et médecine coordonnée'
  },
  {
    code_name: 'LAVASAD',
    full_name: 'Loi sur l\'Association vaudoise d\'aide et de soins à domicile',
    abbreviation: 'LAVASAD',
    blv_reference: 'BLV 801.11',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5802',
    keywords: ['AVASAD', 'CMS', 'soins à domicile', 'aide'],
    description: 'Organisation des soins infirmiers et aides à domicile'
  },
  {
    code_name: 'LHC',
    full_name: 'Loi sur les Hospices cantonaux',
    abbreviation: 'LHC',
    blv_reference: 'BLV 810.11',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5813',
    keywords: ['CHUV', 'hôpital', 'universitaire', 'hospices'],
    description: 'Base légale du CHUV et institutions hospitalières cantonales'
  },
  {
    code_name: 'LEMS',
    full_name: 'Loi sur les établissements médico-sociaux',
    abbreviation: 'LEMS',
    blv_reference: 'BLV 810.21',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5814',
    keywords: ['EMS', 'home', 'personne âgée', 'hébergement', 'long séjour'],
    description: 'Standards des homes pour personnes âgées'
  },
  {
    code_name: 'RLEMS',
    full_name: 'Règlement d\'application de la LEMS',
    abbreviation: 'RLEMS',
    blv_reference: 'BLV 810.21.1',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5815',
    keywords: ['tarif', 'qualité', 'norme', 'EMS'],
    description: 'Normes de qualité et tarifs EMS'
  },
  {
    code_name: 'LSPsy',
    full_name: 'Loi sur la psychiatrie',
    abbreviation: 'LSPsy',
    blv_reference: 'BLV 810.31',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5816',
    keywords: ['psychiatrie', 'internement', 'PAFA', 'soins', 'santé mentale'],
    description: 'Organisation des services psychiatriques'
  },
  {
    code_name: 'LPrS',
    full_name: 'Loi sur la prévention et la promotion de la santé',
    abbreviation: 'LPrS',
    blv_reference: 'BLV 800.11',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5803',
    keywords: ['prévention', 'promotion', 'santé publique', 'tabac', 'alcool'],
    description: 'Coordination des actions de prévention'
  },
  {
    code_name: 'LPSan',
    full_name: 'Loi sur les professions de la santé',
    abbreviation: 'LPSan',
    blv_reference: 'BLV 811.21',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 65,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5820',
    keywords: ['profession', 'infirmier', 'physiothérapeute', 'autorisation'],
    description: 'Professions non universitaires de la santé'
  },

  // ============================================
  // DOMAINE 7: JUSTICE, TRIBUNAUX ET SÉCURITÉ
  // ============================================
  {
    code_name: 'LOJV',
    full_name: 'Loi sur l\'organisation judiciaire',
    abbreviation: 'LOJV',
    blv_reference: 'BLV 173.01',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 120,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5173',
    keywords: ['tribunal', 'juge', 'organisation', 'compétence', 'justice'],
    description: 'Organisation et compétences des tribunaux vaudois'
  },
  {
    code_name: 'LJPA',
    full_name: 'Loi sur la juridiction et la procédure administratives',
    abbreviation: 'LJPA',
    blv_reference: 'BLV 173.36',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 100,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5174',
    keywords: ['recours', 'procédure', 'administratif', 'délai', 'CDAP'],
    description: 'Procédure devant les autorités administratives'
  },
  {
    code_name: 'LiCPP',
    full_name: 'Loi d\'introduction au Code de procédure pénale',
    abbreviation: 'LiCPP',
    blv_reference: 'BLV 312.01',
    domain: 'justice',
    domain_type: 'pénal',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5310',
    keywords: ['procédure pénale', 'ministère public', 'tribunal', 'police'],
    description: 'Autorités cantonales compétentes sous le CPP fédéral'
  },
  {
    code_name: 'LiCPC',
    full_name: 'Loi d\'introduction au Code de procédure civile',
    abbreviation: 'LiCPC',
    blv_reference: 'BLV 211.01',
    domain: 'justice',
    domain_type: 'civil',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5210',
    keywords: ['procédure civile', 'tribunal', 'conciliation', 'civil'],
    description: 'Adaptation de la procédure civile fédérale au canton'
  },
  {
    code_name: 'LAJ',
    full_name: 'Loi sur l\'assistance judiciaire',
    abbreviation: 'LAJ',
    blv_reference: 'BLV 173.41',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5175',
    keywords: ['assistance judiciaire', 'aide', 'avocat', 'gratuit'],
    description: 'Aide judiciaire aux personnes sans ressources'
  },
  {
    code_name: 'LMPu',
    full_name: 'Loi sur le Ministère public',
    abbreviation: 'LMPu',
    blv_reference: 'BLV 173.21',
    domain: 'justice',
    domain_type: 'pénal',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5176',
    keywords: ['procureur', 'ministère public', 'poursuite', 'pénal'],
    description: 'Statut et organisation du Ministère public cantonal'
  },
  {
    code_name: 'LEP',
    full_name: 'Loi sur l\'exécution des condamnations pénales',
    abbreviation: 'LEP',
    blv_reference: 'BLV 340.01',
    domain: 'justice',
    domain_type: 'pénal',
    total_articles: 85,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5340',
    keywords: ['prison', 'peine', 'détention', 'exécution', 'bracelet'],
    description: 'Exécution des peines privatives de liberté'
  },
  {
    code_name: 'RLEP',
    full_name: 'Règlement d\'application de la LEP',
    abbreviation: 'RLEP',
    blv_reference: 'BLV 340.01.1',
    domain: 'justice',
    domain_type: 'pénal',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5341',
    keywords: ['régime', 'détention', 'travail', 'semi-détention'],
    description: 'Régime de détention et exécution des peines'
  },
  {
    code_name: 'LPol',
    full_name: 'Loi sur la police cantonale',
    abbreviation: 'LPol',
    blv_reference: 'BLV 133.11',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 70,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5133',
    keywords: ['police', 'sécurité', 'ordre public', 'gendarmerie'],
    description: 'Missions et organisation de la Police cantonale'
  },
  {
    code_name: 'RLPol',
    full_name: 'Règlement d\'application de la LPol',
    abbreviation: 'RLPol',
    blv_reference: 'BLV 133.11.1',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5134',
    keywords: ['intervention', 'arme', 'uniforme', 'pouvoir'],
    description: 'Modalités d\'intervention policière'
  },
  {
    code_name: 'LVCR',
    full_name: 'Loi vaudoise sur la circulation routière',
    abbreviation: 'LVCR',
    blv_reference: 'BLV 741.01',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 75,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5741',
    keywords: ['circulation', 'permis', 'retrait', 'vitesse', 'infraction'],
    description: 'Application cantonale de la LCR fédérale'
  },
  {
    code_name: 'RLVCR',
    full_name: 'Règlement d\'application de la LVCR',
    abbreviation: 'RLVCR',
    blv_reference: 'BLV 741.01.1',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5742',
    keywords: ['signalisation', 'examen', 'commission', 'retrait'],
    description: 'Procédures en cas d\'infraction routière'
  },
  {
    code_name: 'LSDIS',
    full_name: 'Loi sur les services du feu',
    abbreviation: 'LSDIS',
    blv_reference: 'BLV 963.11',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5963',
    keywords: ['pompier', 'incendie', 'secours', 'SDIS'],
    description: 'Organisation des services de défense incendie'
  },
  {
    code_name: 'LPPop',
    full_name: 'Loi sur la protection de la population',
    abbreviation: 'LPPop',
    blv_reference: 'BLV 963.01',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5962',
    keywords: ['protection civile', 'catastrophe', 'urgence', 'secours'],
    description: 'Coordination des secours en cas de catastrophe'
  },

  // ============================================
  // DOMAINE 8: POPULATION, REGISTRES, AFFAIRES CIVILES
  // ============================================
  {
    code_name: 'LCH',
    full_name: 'Loi sur le contrôle des habitants',
    abbreviation: 'LCH',
    blv_reference: 'BLV 142.01',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5141',
    keywords: ['habitant', 'domicile', 'annonce', 'registre', 'déménagement'],
    description: 'Enregistrement de la population dans les communes'
  },
  {
    code_name: 'RLCH',
    full_name: 'Règlement d\'application de la LCH',
    abbreviation: 'RLCH',
    blv_reference: 'BLV 142.01.1',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5142',
    keywords: ['délai', 'document', 'annonce', 'procédure'],
    description: 'Modalités d\'enregistrement au contrôle des habitants'
  },
  {
    code_name: 'LiEC',
    full_name: 'Loi d\'introduction au droit fédéral de l\'état civil',
    abbreviation: 'LiEC',
    blv_reference: 'BLV 211.11',
    domain: 'population',
    domain_type: 'civil',
    total_articles: 30,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5211',
    keywords: ['état civil', 'naissance', 'mariage', 'décès', 'officier'],
    description: 'Désignation des officiers d\'état civil'
  },
  {
    code_name: 'LVPAE',
    full_name: 'Loi vaudoise sur la protection de l\'adulte et de l\'enfant',
    abbreviation: 'LVPAE',
    blv_reference: 'BLV 211.25',
    domain: 'population',
    domain_type: 'civil',
    total_articles: 65,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5215',
    keywords: ['curatelle', 'tutelle', 'APEA', 'protection', 'adulte', 'PAFA'],
    description: 'Organisation des Autorités de protection (APEA)'
  },
  {
    code_name: 'RLVPAE',
    full_name: 'Règlement d\'application de la LVPAE',
    abbreviation: 'RLVPAE',
    blv_reference: 'BLV 211.25.1',
    domain: 'population',
    domain_type: 'civil',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5216',
    keywords: ['procédure', 'APEA', 'audition', 'mesure'],
    description: 'Procédures devant les APEA'
  },
  {
    code_name: 'LPrD',
    full_name: 'Loi sur la protection des données personnelles',
    abbreviation: 'LPrD',
    blv_reference: 'BLV 172.65',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5172',
    keywords: ['données', 'vie privée', 'traitement', 'préposé', 'protection'],
    description: 'Protection des données détenues par l\'administration'
  },
  {
    code_name: 'RLPrD',
    full_name: 'Règlement d\'application de la LPrD',
    abbreviation: 'RLPrD',
    blv_reference: 'BLV 172.65.1',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 30,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5173',
    keywords: ['sécurité', 'accès', 'fichier', 'responsable'],
    description: 'Mesures de sécurité des données'
  },
  {
    code_name: 'LArch',
    full_name: 'Loi sur les archives publiques',
    abbreviation: 'LArch',
    blv_reference: 'BLV 170.61',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5170',
    keywords: ['archives', 'document', 'conservation', 'consultation', 'ACV'],
    description: 'Gestion et conservation des documents officiels'
  },

  // ============================================
  // DOMAINE 9: TERRITOIRE, CONSTRUCTION, ENVIRONNEMENT
  // ============================================
  {
    code_name: 'LATC',
    full_name: 'Loi sur l\'aménagement du territoire et les constructions',
    abbreviation: 'LATC',
    blv_reference: 'BLV 700.11',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 180,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5700',
    keywords: ['construction', 'permis', 'zone', 'aménagement', 'enquête'],
    description: 'Aménagement du sol et police des constructions'
  },
  {
    code_name: 'RLAT',
    full_name: 'Règlement d\'application de la LATC (aménagement)',
    abbreviation: 'RLAT',
    blv_reference: 'BLV 700.11.1',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 80,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5701',
    keywords: ['plan', 'affectation', 'zone', 'procédure'],
    description: 'Règles d\'aménagement du territoire'
  },
  {
    code_name: 'RLATC',
    full_name: 'Règlement d\'application de la LATC (constructions)',
    abbreviation: 'RLATC',
    blv_reference: 'BLV 700.11.2',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 100,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5702',
    keywords: ['construction', 'distance', 'hauteur', 'norme', 'technique'],
    description: 'Normes techniques de construction'
  },
  {
    code_name: 'LVLEne',
    full_name: 'Loi vaudoise sur l\'énergie',
    abbreviation: 'LVLEne',
    blv_reference: 'BLV 730.01',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 75,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5730',
    keywords: ['énergie', 'renouvelable', 'isolation', 'bâtiment', 'subvention'],
    description: 'Efficacité énergétique et énergies renouvelables'
  },
  {
    code_name: 'RLVLEne',
    full_name: 'Règlement d\'application de la LVLEne',
    abbreviation: 'RLVLEne',
    blv_reference: 'BLV 730.01.1',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5731',
    keywords: ['standard', 'rénovation', 'certificat', 'CECB'],
    description: 'Standards énergétiques des bâtiments'
  },
  {
    code_name: 'LPrPNP',
    full_name: 'Loi sur la protection de la nature, du patrimoine naturel et du paysage',
    abbreviation: 'LPrPNP',
    blv_reference: 'BLV 450.11',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 80,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5450',
    keywords: ['nature', 'biodiversité', 'réserve', 'paysage', 'protection'],
    description: 'Préservation de la biodiversité et des sites naturels'
  },
  {
    code_name: 'LFaune',
    full_name: 'Loi sur la faune',
    abbreviation: 'LFaune',
    blv_reference: 'BLV 922.03',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 65,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5922',
    keywords: ['chasse', 'permis', 'gibier', 'protection', 'faune'],
    description: 'Chasse et protection de la faune sauvage'
  },
  {
    code_name: 'RLFaune',
    full_name: 'Règlement d\'exécution de la LFaune',
    abbreviation: 'RLFaune',
    blv_reference: 'BLV 922.03.1',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5923',
    keywords: ['réserve', 'période', 'espèce', 'examen'],
    description: 'Conditions de chasse et réserves'
  },
  {
    code_name: 'LPêche',
    full_name: 'Loi sur la pêche',
    abbreviation: 'LPêche',
    blv_reference: 'BLV 923.01',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5924',
    keywords: ['pêche', 'permis', 'lac', 'rivière', 'poisson'],
    description: 'Pêche dans les eaux vaudoises'
  },
  {
    code_name: 'RLPêche',
    full_name: 'Règlement d\'application de la LPêche',
    abbreviation: 'RLPêche',
    blv_reference: 'BLV 923.01.1',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5925',
    keywords: ['période', 'taille', 'quota', 'professionnel'],
    description: 'Conditions de pêche et protection des espèces'
  },
  {
    code_name: 'LGD',
    full_name: 'Loi sur la gestion des déchets',
    abbreviation: 'LGD',
    blv_reference: 'BLV 814.11',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5814',
    keywords: ['déchet', 'tri', 'recyclage', 'taxe', 'pollueur-payeur'],
    description: 'Tri, collecte et élimination des déchets'
  },
  {
    code_name: 'RLGD',
    full_name: 'Règlement d\'application de la LGD',
    abbreviation: 'RLGD',
    blv_reference: 'BLV 814.11.1',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5815',
    keywords: ['collecte', 'déchetterie', 'taxe au sac', 'catégorie'],
    description: 'Modalités de gestion des déchets'
  },
  {
    code_name: 'LPEaux',
    full_name: 'Loi sur la protection des eaux',
    abbreviation: 'LPEaux',
    blv_reference: 'BLV 814.21',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5816',
    keywords: ['eau', 'STEP', 'épuration', 'pollution', 'assainissement'],
    description: 'Protection des eaux et traitement des eaux usées'
  },
  {
    code_name: 'LDE',
    full_name: 'Loi sur la distribution de l\'eau',
    abbreviation: 'LDE',
    blv_reference: 'BLV 721.31',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5721',
    keywords: ['eau potable', 'distribution', 'qualité', 'réseau'],
    description: 'Alimentation en eau potable'
  },
  {
    code_name: 'LVLFo',
    full_name: 'Loi d\'application de la loi fédérale sur les forêts',
    abbreviation: 'LVLFo',
    blv_reference: 'BLV 921.01',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5921',
    keywords: ['forêt', 'défrichement', 'protection', 'bois'],
    description: 'Protection des forêts vaudoises'
  },

  // ============================================
  // DOMAINE 10: MOBILITÉ ET TRANSPORTS
  // ============================================
  {
    code_name: 'LRou',
    full_name: 'Loi sur les routes',
    abbreviation: 'LRou',
    blv_reference: 'BLV 725.01',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 100,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5725',
    keywords: ['route', 'cantonale', 'communale', 'entretien', 'construction'],
    description: 'Classement et gestion des routes'
  },
  {
    code_name: 'RLRou',
    full_name: 'Règlement d\'application de la LRou',
    abbreviation: 'RLRou',
    blv_reference: 'BLV 725.01.1',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5726',
    keywords: ['distance', 'construction', 'accès', 'norme'],
    description: 'Distances minimales et normes routières'
  },
  {
    code_name: 'LMTP',
    full_name: 'Loi sur la mobilité et les transports publics',
    abbreviation: 'LMTP',
    blv_reference: 'BLV 740.21',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 65,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5740',
    keywords: ['transport public', 'bus', 'train', 'subvention', 'mobilité'],
    description: 'Soutien cantonal aux transports publics'
  },
  {
    code_name: 'RLMTP',
    full_name: 'Règlement d\'application de la LMTP',
    abbreviation: 'RLMTP',
    blv_reference: 'BLV 740.21.1',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5741',
    keywords: ['ligne', 'financement', 'commune', 'exploitation'],
    description: 'Financement des lignes de transports publics'
  },
  {
    code_name: 'LTV',
    full_name: 'Loi sur les taxis et transports avec chauffeur',
    abbreviation: 'LTV',
    blv_reference: 'BLV 741.11',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5743',
    keywords: ['taxi', 'VTC', 'chauffeur', 'licence', 'Uber'],
    description: 'Régime des taxis et VTC'
  },
  {
    code_name: 'LNav',
    full_name: 'Loi sur la navigation',
    abbreviation: 'LNav',
    blv_reference: 'BLV 751.01',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5751',
    keywords: ['bateau', 'lac', 'navigation', 'immatriculation'],
    description: 'Navigation de plaisance sur les lacs vaudois'
  },

  // ============================================
  // DOMAINE 11: ÉCONOMIE, EMPLOI, CONSOMMATION
  // ============================================
  {
    code_name: 'LEAE',
    full_name: 'Loi sur l\'exercice des activités économiques',
    abbreviation: 'LEAE',
    blv_reference: 'BLV 930.01',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 85,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5930',
    keywords: ['commerce', 'activité économique', 'licence', 'horaire', 'restaurant'],
    description: 'Accès aux activités commerciales'
  },
  {
    code_name: 'RLEAE',
    full_name: 'Règlement d\'application de la LEAE',
    abbreviation: 'RLEAE',
    blv_reference: 'BLV 930.01.1',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5931',
    keywords: ['autorisation', 'ouverture', 'magasin', 'procédure'],
    description: 'Modalités des autorisations commerciales'
  },
  {
    code_name: 'LAgr-VD',
    full_name: 'Loi sur l\'agriculture vaudoise',
    abbreviation: 'LAgr-VD',
    blv_reference: 'BLV 910.01',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 70,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5910',
    keywords: ['agriculture', 'paiement direct', 'exploitation', 'paysan'],
    description: 'Politique agricole cantonale'
  },
  {
    code_name: 'RLAgr-VD',
    full_name: 'Règlement d\'application de la LAgr-VD',
    abbreviation: 'RLAgr-VD',
    blv_reference: 'BLV 910.01.1',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5911',
    keywords: ['subvention', 'mesure', 'structure', 'amélioration'],
    description: 'Modalités des aides agricoles'
  },
  {
    code_name: 'LViti',
    full_name: 'Loi sur la viticulture',
    abbreviation: 'LViti',
    blv_reference: 'BLV 916.11',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5916',
    keywords: ['vigne', 'vin', 'AOC', 'vignoble', 'encavage'],
    description: 'Régulation du vignoble vaudois'
  },
  {
    code_name: 'LPET',
    full_name: 'Loi sur la promotion économique et le tourisme',
    abbreviation: 'LPET',
    blv_reference: 'BLV 900.11',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 50,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5900',
    keywords: ['tourisme', 'promotion', 'taxe de séjour', 'office'],
    description: 'Soutien au tourisme et à l\'économie'
  },
  {
    code_name: 'LIT',
    full_name: 'Loi sur l\'inspection du travail',
    abbreviation: 'LIT',
    blv_reference: 'BLV 822.11',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5822',
    keywords: ['travail', 'inspection', 'sécurité', 'santé', 'employeur'],
    description: 'Contrôle des conditions de travail'
  },
  {
    code_name: 'LEmp',
    full_name: 'Loi sur l\'emploi',
    abbreviation: 'LEmp',
    blv_reference: 'BLV 822.01',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5820',
    keywords: ['emploi', 'chômage', 'ORP', 'placement', 'insertion'],
    description: 'Organisation du marché de l\'emploi'
  },

  // ============================================
  // DOMAINE 12: CULTURE, PATRIMOINE ET SPORTS
  // ============================================
  {
    code_name: 'LMS',
    full_name: 'Loi sur la protection des monuments historiques et des sites',
    abbreviation: 'LMS',
    blv_reference: 'BLV 450.31',
    domain: 'culture',
    domain_type: 'administratif',
    total_articles: 60,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5451',
    keywords: ['monument', 'patrimoine', 'classement', 'restauration', 'archéologie'],
    description: 'Protection des monuments historiques et fouilles'
  },
  {
    code_name: 'RLMS',
    full_name: 'Règlement d\'application de la LMS',
    abbreviation: 'RLMS',
    blv_reference: 'BLV 450.31.1',
    domain: 'culture',
    domain_type: 'administratif',
    total_articles: 40,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5452',
    keywords: ['inventaire', 'subvention', 'procédure', 'commission'],
    description: 'Procédures de classement et aides à la restauration'
  },
  {
    code_name: 'LEC',
    full_name: 'Loi sur l\'encouragement culturel',
    abbreviation: 'LEC',
    blv_reference: 'BLV 440.21',
    domain: 'culture',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5440',
    keywords: ['culture', 'subvention', 'théâtre', 'musique', 'art'],
    description: 'Soutien public aux acteurs culturels'
  },
  {
    code_name: 'RLEC',
    full_name: 'Règlement d\'application de la LEC',
    abbreviation: 'RLEC',
    blv_reference: 'BLV 440.21.1',
    domain: 'culture',
    domain_type: 'administratif',
    total_articles: 30,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5441',
    keywords: ['demande', 'critère', 'subvention', 'projet'],
    description: 'Critères d\'attribution des aides culturelles'
  },
  {
    code_name: 'LSEP',
    full_name: 'Loi sur le sport et l\'éducation physique',
    abbreviation: 'LSEP',
    blv_reference: 'BLV 415.01',
    domain: 'culture',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5415',
    keywords: ['sport', 'éducation physique', 'infrastructure', 'association'],
    description: 'Enseignement du sport et soutien aux sociétés sportives'
  },
  {
    code_name: 'RLSEP',
    full_name: 'Règlement d\'application de la LSEP',
    abbreviation: 'RLSEP',
    blv_reference: 'BLV 415.01.1',
    domain: 'culture',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5416',
    keywords: ['subvention', 'installation', 'formation', 'jeunesse'],
    description: 'Aides aux infrastructures sportives'
  },
  {
    code_name: 'LMusées',
    full_name: 'Loi sur les musées cantonaux',
    abbreviation: 'LMusées',
    blv_reference: 'BLV 432.11',
    domain: 'culture',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5432',
    keywords: ['musée', 'collection', 'Plateforme 10', 'MCBA', 'exposition'],
    description: 'Organisation du réseau des musées cantonaux'
  },
  {
    code_name: 'LPCMob',
    full_name: 'Loi sur le patrimoine culturel mobilier',
    abbreviation: 'LPCMob',
    blv_reference: 'BLV 432.21',
    domain: 'culture',
    domain_type: 'administratif',
    total_articles: 30,
    source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5433',
    keywords: ['patrimoine', 'objet', 'collection', 'tradition', 'immatériel'],
    description: 'Protection du patrimoine mobilier et immatériel'
  }
];
