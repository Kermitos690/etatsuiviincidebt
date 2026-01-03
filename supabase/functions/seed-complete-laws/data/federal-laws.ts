// Federal laws applicable in Vaud Canton
import { LawDefinition } from './vaud-laws.ts';

export const FEDERAL_LAWS: LawDefinition[] = [
  // ============================================
  // DROIT PRIVÉ
  // ============================================
  {
    code_name: 'CC',
    full_name: 'Code civil suisse',
    abbreviation: 'CC',
    blv_reference: 'RS 210',
    domain: 'population',
    domain_type: 'civil',
    total_articles: 977,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr',
    keywords: ['personne', 'famille', 'succession', 'propriété', 'tutelle', 'curatelle', 'mariage', 'divorce'],
    description: 'Droit des personnes, famille, successions, droits réels'
  },
  {
    code_name: 'CO',
    full_name: 'Code des obligations',
    abbreviation: 'CO',
    blv_reference: 'RS 220',
    domain: 'economie',
    domain_type: 'civil',
    total_articles: 1186,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/fr',
    keywords: ['contrat', 'obligation', 'responsabilité', 'travail', 'société', 'bail', 'vente'],
    description: 'Droit des contrats, responsabilité civile, droit du travail, sociétés'
  },
  {
    code_name: 'CPC',
    full_name: 'Code de procédure civile',
    abbreviation: 'CPC',
    blv_reference: 'RS 272',
    domain: 'justice',
    domain_type: 'civil',
    total_articles: 407,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2010/262/fr',
    keywords: ['procédure civile', 'action', 'jugement', 'appel', 'recours', 'conciliation'],
    description: 'Procédure applicable aux litiges civils'
  },
  {
    code_name: 'CPP',
    full_name: 'Code de procédure pénale',
    abbreviation: 'CPP',
    blv_reference: 'RS 312.0',
    domain: 'justice',
    domain_type: 'pénal',
    total_articles: 457,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2010/267/fr',
    keywords: ['procédure pénale', 'enquête', 'accusation', 'jugement', 'ministère public', 'prévenu'],
    description: 'Procédure applicable aux affaires pénales'
  },
  {
    code_name: 'CP',
    full_name: 'Code pénal suisse',
    abbreviation: 'CP',
    blv_reference: 'RS 311.0',
    domain: 'justice',
    domain_type: 'pénal',
    total_articles: 392,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/54/757_781_799/fr',
    keywords: ['infraction', 'peine', 'crime', 'délit', 'sanction', 'mesure'],
    description: 'Infractions pénales et sanctions'
  },
  {
    code_name: 'PA',
    full_name: 'Loi fédérale sur la procédure administrative',
    abbreviation: 'PA',
    blv_reference: 'RS 172.021',
    domain: 'justice',
    domain_type: 'administratif',
    total_articles: 78,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1969/737_757_755/fr',
    keywords: ['procédure administrative', 'décision', 'recours', 'délai', 'partie'],
    description: 'Procédure devant les autorités fédérales'
  },
  {
    code_name: 'Cst',
    full_name: 'Constitution fédérale de la Confédération suisse',
    abbreviation: 'Cst',
    blv_reference: 'RS 101',
    domain: 'constitution',
    domain_type: 'administratif',
    total_articles: 197,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1999/404/fr',
    keywords: ['constitution', 'droits fondamentaux', 'fédéralisme', 'démocratie', 'liberté'],
    description: 'Loi fondamentale de la Suisse'
  },

  // ============================================
  // ASSURANCES SOCIALES
  // ============================================
  {
    code_name: 'LAMal',
    full_name: 'Loi fédérale sur l\'assurance-maladie',
    abbreviation: 'LAMal',
    blv_reference: 'RS 832.10',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 105,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr',
    keywords: ['assurance maladie', 'prime', 'franchise', 'prestation', 'caisse maladie'],
    description: 'Assurance-maladie obligatoire'
  },
  {
    code_name: 'OAMal',
    full_name: 'Ordonnance sur l\'assurance-maladie',
    abbreviation: 'OAMal',
    blv_reference: 'RS 832.102',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 120,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr',
    keywords: ['prestation', 'tarif', 'franchise', 'médecin'],
    description: 'Modalités de l\'assurance-maladie'
  },
  {
    code_name: 'LAI',
    full_name: 'Loi fédérale sur l\'assurance-invalidité',
    abbreviation: 'LAI',
    blv_reference: 'RS 831.20',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 85,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1959/827_857_845/fr',
    keywords: ['invalidité', 'rente', 'réadaptation', 'handicap', 'AI'],
    description: 'Assurance-invalidité fédérale'
  },
  {
    code_name: 'RAI',
    full_name: 'Règlement sur l\'assurance-invalidité',
    abbreviation: 'RAI',
    blv_reference: 'RS 831.201',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 100,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1961/29_29_29/fr',
    keywords: ['évaluation', 'taux', 'mesure', 'rente'],
    description: 'Modalités de l\'assurance-invalidité'
  },
  {
    code_name: 'LAVS',
    full_name: 'Loi fédérale sur l\'assurance-vieillesse et survivants',
    abbreviation: 'LAVS',
    blv_reference: 'RS 831.10',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 95,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1952/89_89_89/fr',
    keywords: ['AVS', 'retraite', 'rente', 'cotisation', 'vieillesse'],
    description: 'Assurance-vieillesse et survivants (1er pilier)'
  },
  {
    code_name: 'RAVS',
    full_name: 'Règlement sur l\'assurance-vieillesse et survivants',
    abbreviation: 'RAVS',
    blv_reference: 'RS 831.101',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 140,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1952/98_98_98/fr',
    keywords: ['cotisation', 'calcul', 'rente', 'bonification'],
    description: 'Modalités de l\'AVS'
  },
  {
    code_name: 'LPP',
    full_name: 'Loi fédérale sur la prévoyance professionnelle',
    abbreviation: 'LPP',
    blv_reference: 'RS 831.40',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 98,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1983/797_797_797/fr',
    keywords: ['prévoyance', 'caisse de pension', '2e pilier', 'rente', 'capital'],
    description: 'Prévoyance professionnelle (2e pilier)'
  },
  {
    code_name: 'LPC',
    full_name: 'Loi fédérale sur les prestations complémentaires',
    abbreviation: 'LPC',
    blv_reference: 'RS 831.30',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2007/804/fr',
    keywords: ['prestations complémentaires', 'PC', 'AVS', 'AI', 'minimum vital'],
    description: 'Prestations complémentaires à l\'AVS et l\'AI'
  },
  {
    code_name: 'LACI',
    full_name: 'Loi fédérale sur l\'assurance-chômage',
    abbreviation: 'LACI',
    blv_reference: 'RS 837.0',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 125,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1982/2184_2184_2184/fr',
    keywords: ['chômage', 'indemnité', 'ORP', 'recherche emploi', 'délai-cadre'],
    description: 'Assurance-chômage et mesures du marché du travail'
  },
  {
    code_name: 'LAA',
    full_name: 'Loi fédérale sur l\'assurance-accidents',
    abbreviation: 'LAA',
    blv_reference: 'RS 832.20',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 115,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1982/1676_1676_1676/fr',
    keywords: ['accident', 'professionnel', 'non professionnel', 'SUVA', 'indemnité'],
    description: 'Assurance-accidents obligatoire'
  },
  {
    code_name: 'LAPG',
    full_name: 'Loi fédérale sur les allocations pour perte de gain',
    abbreviation: 'LAPG',
    blv_reference: 'RS 834.1',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 35,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1952/1165_1185_1185/fr',
    keywords: ['APG', 'service militaire', 'maternité', 'paternité', 'allocation'],
    description: 'Allocations pour perte de gain (service, maternité, paternité)'
  },
  {
    code_name: 'LAFam',
    full_name: 'Loi fédérale sur les allocations familiales',
    abbreviation: 'LAFam',
    blv_reference: 'RS 836.2',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 32,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2008/51/fr',
    keywords: ['allocation familiale', 'enfant', 'formation', 'naissance'],
    description: 'Allocations pour enfants et de formation'
  },

  // ============================================
  // PROTECTION DES DONNÉES ET VIE PRIVÉE
  // ============================================
  {
    code_name: 'LPD',
    full_name: 'Loi fédérale sur la protection des données',
    abbreviation: 'LPD',
    blv_reference: 'RS 235.1',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 74,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2022/491/fr',
    keywords: ['données personnelles', 'vie privée', 'traitement', 'PFPDT', 'consentement'],
    description: 'Protection des données personnelles (nouvelle LPD 2023)'
  },
  {
    code_name: 'OPDo',
    full_name: 'Ordonnance sur la protection des données',
    abbreviation: 'OPDo',
    blv_reference: 'RS 235.11',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2022/568/fr',
    keywords: ['sécurité', 'sous-traitance', 'transfert', 'notification'],
    description: 'Modalités de la protection des données'
  },

  // ============================================
  // DROIT DU TRAVAIL
  // ============================================
  {
    code_name: 'LTr',
    full_name: 'Loi sur le travail',
    abbreviation: 'LTr',
    blv_reference: 'RS 822.11',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 83,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1966/57_57_57/fr',
    keywords: ['travail', 'horaire', 'repos', 'nuit', 'dimanche', 'protection'],
    description: 'Protection des travailleurs et conditions de travail'
  },
  {
    code_name: 'OLT1',
    full_name: 'Ordonnance 1 relative à la loi sur le travail',
    abbreviation: 'OLT1',
    blv_reference: 'RS 822.111',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 75,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2000/131/fr',
    keywords: ['durée', 'pause', 'vacances', 'nuit'],
    description: 'Durée du travail et repos'
  },
  {
    code_name: 'LEg',
    full_name: 'Loi fédérale sur l\'égalité entre femmes et hommes',
    abbreviation: 'LEg',
    blv_reference: 'RS 151.1',
    domain: 'economie',
    domain_type: 'administratif',
    total_articles: 17,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1996/1498_1498_1498/fr',
    keywords: ['égalité', 'discrimination', 'salaire', 'harcèlement', 'femme'],
    description: 'Égalité entre femmes et hommes dans le travail'
  },

  // ============================================
  // AIDE AUX VICTIMES
  // ============================================
  {
    code_name: 'LAVI',
    full_name: 'Loi fédérale sur l\'aide aux victimes d\'infractions',
    abbreviation: 'LAVI',
    blv_reference: 'RS 312.5',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 32,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2008/232/fr',
    keywords: ['victime', 'infraction', 'aide', 'indemnisation', 'réparation'],
    description: 'Aide aux victimes d\'infractions pénales'
  },

  // ============================================
  // ÉTRANGERS ET ASILE
  // ============================================
  {
    code_name: 'LEI',
    full_name: 'Loi fédérale sur les étrangers et l\'intégration',
    abbreviation: 'LEI',
    blv_reference: 'RS 142.20',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 130,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2007/758/fr',
    keywords: ['étranger', 'séjour', 'permis', 'intégration', 'renvoi'],
    description: 'Conditions de séjour des étrangers'
  },
  {
    code_name: 'LAsi',
    full_name: 'Loi sur l\'asile',
    abbreviation: 'LAsi',
    blv_reference: 'RS 142.31',
    domain: 'population',
    domain_type: 'administratif',
    total_articles: 115,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1999/358/fr',
    keywords: ['asile', 'réfugié', 'protection', 'renvoi', 'admission'],
    description: 'Procédure d\'asile et statut de réfugié'
  },

  // ============================================
  // AMÉNAGEMENT ET ENVIRONNEMENT
  // ============================================
  {
    code_name: 'LAT',
    full_name: 'Loi fédérale sur l\'aménagement du territoire',
    abbreviation: 'LAT',
    blv_reference: 'RS 700',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1979/1573_1573_1573/fr',
    keywords: ['aménagement', 'zone', 'plan', 'construction', 'territoire'],
    description: 'Principes de l\'aménagement du territoire'
  },
  {
    code_name: 'LPE',
    full_name: 'Loi fédérale sur la protection de l\'environnement',
    abbreviation: 'LPE',
    blv_reference: 'RS 814.01',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 65,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1984/1122_1122_1122/fr',
    keywords: ['environnement', 'pollution', 'déchet', 'bruit', 'air'],
    description: 'Protection de l\'environnement'
  },
  {
    code_name: 'LEaux',
    full_name: 'Loi fédérale sur la protection des eaux',
    abbreviation: 'LEaux',
    blv_reference: 'RS 814.20',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 72,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1992/1860_1860_1860/fr',
    keywords: ['eau', 'pollution', 'épuration', 'lac', 'rivière'],
    description: 'Protection des eaux'
  },
  {
    code_name: 'LFo',
    full_name: 'Loi fédérale sur les forêts',
    abbreviation: 'LFo',
    blv_reference: 'RS 921.0',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 55,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1992/2521_2521_2521/fr',
    keywords: ['forêt', 'défrichement', 'bois', 'protection'],
    description: 'Protection et gestion des forêts'
  },
  {
    code_name: 'LPN',
    full_name: 'Loi fédérale sur la protection de la nature et du paysage',
    abbreviation: 'LPN',
    blv_reference: 'RS 451',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 28,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1966/1637_1694_1679/fr',
    keywords: ['nature', 'paysage', 'monument', 'protection', 'inventaire'],
    description: 'Protection de la nature et du paysage'
  },
  {
    code_name: 'LEne',
    full_name: 'Loi sur l\'énergie',
    abbreviation: 'LEne',
    blv_reference: 'RS 730.0',
    domain: 'territoire',
    domain_type: 'administratif',
    total_articles: 75,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2017/762/fr',
    keywords: ['énergie', 'renouvelable', 'efficacité', 'électricité', 'CO2'],
    description: 'Politique énergétique fédérale'
  },

  // ============================================
  // CIRCULATION ET TRANSPORTS
  // ============================================
  {
    code_name: 'LCR',
    full_name: 'Loi fédérale sur la circulation routière',
    abbreviation: 'LCR',
    blv_reference: 'RS 741.01',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 110,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1959/679_705_685/fr',
    keywords: ['circulation', 'véhicule', 'permis', 'conducteur', 'accident'],
    description: 'Règles de la circulation routière'
  },
  {
    code_name: 'OCR',
    full_name: 'Ordonnance sur les règles de la circulation routière',
    abbreviation: 'OCR',
    blv_reference: 'RS 741.11',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 75,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1962/1364_1409_1420/fr',
    keywords: ['vitesse', 'priorité', 'signalisation', 'règle'],
    description: 'Règles de comportement sur la route'
  },
  {
    code_name: 'LTP',
    full_name: 'Loi fédérale sur le transport de voyageurs',
    abbreviation: 'LTP',
    blv_reference: 'RS 745.1',
    domain: 'mobilite',
    domain_type: 'administratif',
    total_articles: 65,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2009/680/fr',
    keywords: ['transport', 'voyageur', 'concession', 'train', 'bus'],
    description: 'Transport public de voyageurs'
  },

  // ============================================
  // FORMATION
  // ============================================
  {
    code_name: 'LFPr',
    full_name: 'Loi fédérale sur la formation professionnelle',
    abbreviation: 'LFPr',
    blv_reference: 'RS 412.10',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 88,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2003/674/fr',
    keywords: ['formation professionnelle', 'apprentissage', 'CFC', 'AFP', 'maturité'],
    description: 'Formation professionnelle initiale et continue'
  },
  {
    code_name: 'LEHE',
    full_name: 'Loi fédérale sur l\'encouragement des hautes écoles',
    abbreviation: 'LEHE',
    blv_reference: 'RS 414.20',
    domain: 'formation',
    domain_type: 'administratif',
    total_articles: 70,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2014/691/fr',
    keywords: ['haute école', 'université', 'HES', 'EPF', 'recherche'],
    description: 'Coordination et financement des hautes écoles'
  },

  // ============================================
  // SANTÉ
  // ============================================
  {
    code_name: 'LPTh',
    full_name: 'Loi fédérale sur les produits thérapeutiques',
    abbreviation: 'LPTh',
    blv_reference: 'RS 812.21',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 95,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2001/422/fr',
    keywords: ['médicament', 'Swissmedic', 'autorisation', 'pharmacie'],
    description: 'Médicaments et dispositifs médicaux'
  },
  {
    code_name: 'LEp',
    full_name: 'Loi fédérale sur les épidémies',
    abbreviation: 'LEp',
    blv_reference: 'RS 818.101',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 88,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2015/297/fr',
    keywords: ['épidémie', 'pandémie', 'vaccination', 'quarantaine', 'maladie transmissible'],
    description: 'Lutte contre les maladies transmissibles'
  },
  {
    code_name: 'LPSan',
    full_name: 'Loi fédérale sur les professions de la santé',
    abbreviation: 'LPSan',
    blv_reference: 'RS 811.21',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 45,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2020/16/fr',
    keywords: ['profession', 'santé', 'infirmier', 'physiothérapeute', 'autorisation'],
    description: 'Professions de la santé non universitaires'
  },
  {
    code_name: 'LPMéd',
    full_name: 'Loi fédérale sur les professions médicales',
    abbreviation: 'LPMéd',
    blv_reference: 'RS 811.11',
    domain: 'sante',
    domain_type: 'administratif',
    total_articles: 68,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/2007/537/fr',
    keywords: ['médecin', 'pharmacien', 'dentiste', 'diplôme', 'FMH'],
    description: 'Professions médicales universitaires'
  },

  // ============================================
  // PROTECTION DE L'ENFANT ET ADULTE
  // ============================================
  {
    code_name: 'OPE',
    full_name: 'Ordonnance sur le placement d\'enfants',
    abbreviation: 'OPE',
    blv_reference: 'RS 211.222.338',
    domain: 'social',
    domain_type: 'administratif',
    total_articles: 25,
    source_url: 'https://www.fedlex.admin.ch/eli/cc/1977/1931_1931_1931/fr',
    keywords: ['placement', 'enfant', 'famille d\'accueil', 'institution', 'autorisation'],
    description: 'Placement d\'enfants hors du foyer familial'
  }
];
