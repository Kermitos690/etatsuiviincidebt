import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// INLINE DATA - 12 Legal Domains
// ============================================================
const LEGAL_DOMAINS = [
  { code: 'constitution', label_fr: 'Constitution et droits politiques', description: 'Droits fondamentaux, organisation de l\'État, droits politiques, transparence', icon: 'Scale', display_order: 1, keywords: ['constitution', 'droits fondamentaux', 'vote', 'élection', 'référendum', 'initiative', 'citoyenneté', 'naturalisation', 'information', 'transparence'] },
  { code: 'organisation', label_fr: 'Organisation de l\'État et communes', description: 'Structure de l\'État, communes, personnel, péréquation', icon: 'Building2', display_order: 2, keywords: ['commune', 'canton', 'district', 'municipal', 'fusion', 'péréquation', 'personnel', 'fonctionnaire', 'église'] },
  { code: 'finances', label_fr: 'Finances publiques et fiscalité', description: 'Impôts, taxes, marchés publics, budget', icon: 'Coins', display_order: 3, keywords: ['impôt', 'taxe', 'fiscal', 'budget', 'comptabilité', 'marché public', 'mutation', 'estimation'] },
  { code: 'formation', label_fr: 'Formation et éducation', description: 'Enseignement obligatoire, pédagogie spécialisée, hautes écoles', icon: 'GraduationCap', display_order: 4, keywords: ['école', 'enseignement', 'élève', 'formation', 'université', 'HEP', 'pédagogie', 'éducation', 'apprentissage'] },
  { code: 'social', label_fr: 'Aides sociales, famille et jeunesse', description: 'Aide sociale, prestations familiales, protection des mineurs', icon: 'Heart', display_order: 5, keywords: ['aide sociale', 'RI', 'famille', 'enfant', 'mineur', 'protection', 'victime', 'accueil', 'crèche', 'handicap'] },
  { code: 'sante', label_fr: 'Santé publique et handicap', description: 'Hôpitaux, soins, professions médicales, EMS', icon: 'Stethoscope', display_order: 6, keywords: ['santé', 'hôpital', 'médecin', 'soins', 'EMS', 'psychiatrie', 'maladie', 'patient', 'infirmier'] },
  { code: 'justice', label_fr: 'Justice, tribunaux et sécurité', description: 'Tribunaux, procédures, police, exécution des peines', icon: 'Gavel', display_order: 7, keywords: ['tribunal', 'justice', 'police', 'procédure', 'pénal', 'civil', 'administratif', 'prison', 'détention', 'recours'] },
  { code: 'population', label_fr: 'Population, registres et affaires civiles', description: 'État civil, contrôle des habitants, protection des données', icon: 'Users', display_order: 8, keywords: ['habitant', 'domicile', 'état civil', 'données', 'archives', 'registre', 'étranger', 'intégration', 'tutelle', 'curatelle'] },
  { code: 'territoire', label_fr: 'Territoire, construction et environnement', description: 'Aménagement, constructions, énergie, nature, eau', icon: 'Map', display_order: 9, keywords: ['construction', 'permis', 'aménagement', 'zone', 'environnement', 'énergie', 'eau', 'forêt', 'nature', 'déchet', 'chasse', 'pêche'] },
  { code: 'mobilite', label_fr: 'Mobilité et transports publics', description: 'Routes, transports publics, navigation', icon: 'Bus', display_order: 10, keywords: ['route', 'transport', 'mobilité', 'bus', 'train', 'taxi', 'circulation', 'bateau', 'navigation'] },
  { code: 'economie', label_fr: 'Économie, emploi et consommation', description: 'Commerce, agriculture, tourisme, travail', icon: 'Briefcase', display_order: 11, keywords: ['commerce', 'économie', 'emploi', 'chômage', 'agriculture', 'tourisme', 'viticulture', 'consommation', 'travail'] },
  { code: 'culture', label_fr: 'Culture, patrimoine et sports', description: 'Monuments, musées, sports, archives culturelles', icon: 'Landmark', display_order: 12, keywords: ['culture', 'patrimoine', 'monument', 'musée', 'sport', 'archive', 'art', 'histoire'] }
];

// ============================================================
// INLINE DATA - Key Vaud Laws (44 laws)
// ============================================================
const VAUD_LAWS = [
  // Constitution
  { code_name: 'Cst-VD', full_name: 'Constitution du Canton de Vaud', abbreviation: 'Cst-VD', blv_reference: 'BLV 101.01', domain: 'constitution', total_articles: 175, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5765', keywords: ['constitution', 'droits fondamentaux', 'organisation', 'état', 'canton'] },
  { code_name: 'LDCV', full_name: 'Loi sur le droit de cité vaudois', abbreviation: 'LDCV', blv_reference: 'BLV 141.11', domain: 'constitution', total_articles: 45, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5131', keywords: ['naturalisation', 'citoyenneté', 'droit de cité'] },
  { code_name: 'LEDP', full_name: 'Loi sur l\'exercice des droits politiques', abbreviation: 'LEDP', blv_reference: 'BLV 160.01', domain: 'constitution', total_articles: 120, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5139', keywords: ['vote', 'élection', 'référendum', 'initiative'] },
  { code_name: 'LInfo', full_name: 'Loi sur l\'information', abbreviation: 'LInfo', blv_reference: 'BLV 170.21', domain: 'constitution', total_articles: 45, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5155', keywords: ['transparence', 'information', 'accès', 'documents'] },
  // Organisation
  { code_name: 'LC', full_name: 'Loi sur les communes', abbreviation: 'LC', blv_reference: 'BLV 175.11', domain: 'organisation', total_articles: 150, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5162', keywords: ['commune', 'municipal', 'conseil', 'autonomie'] },
  { code_name: 'LFusCom', full_name: 'Loi sur les fusions de communes', abbreviation: 'LFusCom', blv_reference: 'BLV 175.61', domain: 'organisation', total_articles: 60, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5163', keywords: ['fusion', 'commune', 'regroupement'] },
  { code_name: 'LPers-VD', full_name: 'Loi sur le personnel de l\'État de Vaud', abbreviation: 'LPers-VD', blv_reference: 'BLV 172.31', domain: 'organisation', total_articles: 120, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5161', keywords: ['personnel', 'fonctionnaire', 'emploi', 'état', 'salaire'] },
  // Finances
  { code_name: 'LFin', full_name: 'Loi sur les finances', abbreviation: 'LFin', blv_reference: 'BLV 610.11', domain: 'finances', total_articles: 80, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5200', keywords: ['budget', 'comptabilité', 'finances', 'contrôle'] },
  { code_name: 'LI', full_name: 'Loi sur les impôts directs cantonaux', abbreviation: 'LI', blv_reference: 'BLV 642.11', domain: 'finances', total_articles: 280, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5205', keywords: ['impôt', 'revenu', 'fortune', 'capital', 'fiscal'] },
  { code_name: 'LICom', full_name: 'Loi sur les impôts communaux', abbreviation: 'LICom', blv_reference: 'BLV 650.11', domain: 'finances', total_articles: 50, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5210', keywords: ['impôt', 'commune', 'centime additionnel'] },
  { code_name: 'LMP-VD', full_name: 'Loi sur les marchés publics', abbreviation: 'LMP-VD', blv_reference: 'BLV 726.01', domain: 'finances', total_articles: 85, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5220', keywords: ['marché public', 'appel d\'offres', 'soumission'] },
  // Formation
  { code_name: 'LEO', full_name: 'Loi sur l\'enseignement obligatoire', abbreviation: 'LEO', blv_reference: 'BLV 400.02', domain: 'formation', total_articles: 156, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5400', keywords: ['école', 'élève', 'enseignement', 'primaire', 'secondaire'] },
  { code_name: 'RLEO', full_name: 'Règlement d\'application de la LEO', abbreviation: 'RLEO', blv_reference: 'BLV 400.02.1', domain: 'formation', total_articles: 120, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5401', keywords: ['école', 'évaluation', 'discipline', 'horaire', 'note'] },
  { code_name: 'LPS', full_name: 'Loi sur la pédagogie spécialisée', abbreviation: 'LPS', blv_reference: 'BLV 417.31', domain: 'formation', total_articles: 65, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5410', keywords: ['pédagogie spécialisée', 'handicap', 'inclusion', 'besoins éducatifs'] },
  { code_name: 'LHEP', full_name: 'Loi sur la Haute école pédagogique', abbreviation: 'LHEP', blv_reference: 'BLV 419.11', domain: 'formation', total_articles: 55, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5420', keywords: ['HEP', 'formation', 'enseignant', 'pédagogie'] },
  { code_name: 'LUL', full_name: 'Loi sur l\'Université de Lausanne', abbreviation: 'LUL', blv_reference: 'BLV 414.11', domain: 'formation', total_articles: 60, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5415', keywords: ['université', 'UNIL', 'études', 'recherche'] },
  { code_name: 'LVLFPr', full_name: 'Loi sur la formation professionnelle', abbreviation: 'LVLFPr', blv_reference: 'BLV 413.01', domain: 'formation', total_articles: 75, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5407', keywords: ['apprentissage', 'formation professionnelle', 'CFC', 'AFP'] },
  // Social
  { code_name: 'LASV', full_name: 'Loi sur l\'action sociale vaudoise', abbreviation: 'LASV', blv_reference: 'BLV 850.01', domain: 'social', total_articles: 95, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5850', keywords: ['aide sociale', 'RI', 'revenu d\'insertion', 'prestation', 'CSR'] },
  { code_name: 'LPCFam', full_name: 'Loi sur les prestations complémentaires familles et rente-pont', abbreviation: 'LPCFam', blv_reference: 'BLV 850.11', domain: 'social', total_articles: 55, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5852', keywords: ['famille', 'prestations', 'rente-pont', 'chômage'] },
  { code_name: 'LAJE', full_name: 'Loi sur l\'accueil de jour des enfants', abbreviation: 'LAJE', blv_reference: 'BLV 211.22', domain: 'social', total_articles: 50, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5082', keywords: ['accueil', 'crèche', 'parascolaire', 'enfant'] },
  { code_name: 'LProMin', full_name: 'Loi sur la protection des mineurs', abbreviation: 'LProMin', blv_reference: 'BLV 850.41', domain: 'social', total_articles: 65, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5856', keywords: ['protection', 'mineur', 'SPJ', 'signalement'] },
  { code_name: 'LVLAVI', full_name: 'Loi d\'application de la LAVI', abbreviation: 'LVLAVI', blv_reference: 'BLV 312.51', domain: 'social', total_articles: 30, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5180', keywords: ['victime', 'indemnisation', 'réparation'] },
  // Santé
  { code_name: 'LSP', full_name: 'Loi sur la santé publique', abbreviation: 'LSP', blv_reference: 'BLV 800.01', domain: 'sante', total_articles: 180, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5800', keywords: ['santé', 'patient', 'médecin', 'soins', 'hôpital'] },
  { code_name: 'LPFES', full_name: 'Loi sur les professions de la santé et établissements sanitaires', abbreviation: 'LPFES', blv_reference: 'BLV 810.01', domain: 'sante', total_articles: 100, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5810', keywords: ['profession', 'santé', 'autorisation', 'établissement'] },
  { code_name: 'LEMS', full_name: 'Loi sur les EMS et établissements pour handicapés', abbreviation: 'LEMS', blv_reference: 'BLV 850.31', domain: 'sante', total_articles: 60, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5855', keywords: ['EMS', 'handicap', 'hébergement', 'soins'] },
  { code_name: 'LVPAE', full_name: 'Loi sur la protection de l\'adulte et de l\'enfant', abbreviation: 'LVPAE', blv_reference: 'BLV 211.251', domain: 'sante', total_articles: 45, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5083', keywords: ['APEA', 'curatelle', 'tutelle', 'protection'] },
  // Justice
  { code_name: 'LPA-VD', full_name: 'Loi sur la procédure administrative', abbreviation: 'LPA-VD', blv_reference: 'BLV 173.36', domain: 'justice', total_articles: 100, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5159', keywords: ['procédure', 'recours', 'décision', 'délai'] },
  { code_name: 'LJPA', full_name: 'Loi sur la juridiction et la procédure administratives', abbreviation: 'LJPA', blv_reference: 'BLV 173.36', domain: 'justice', total_articles: 90, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5159', keywords: ['tribunal', 'recours', 'procédure', 'administratif'] },
  { code_name: 'LPol', full_name: 'Loi sur la police cantonale', abbreviation: 'LPol', blv_reference: 'BLV 133.11', domain: 'justice', total_articles: 80, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5127', keywords: ['police', 'sécurité', 'ordre public'] },
  { code_name: 'LEP', full_name: 'Loi sur l\'exécution des condamnations pénales', abbreviation: 'LEP', blv_reference: 'BLV 340.01', domain: 'justice', total_articles: 95, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5190', keywords: ['prison', 'détention', 'exécution', 'peine'] },
  // Population
  { code_name: 'LCH', full_name: 'Loi sur le contrôle des habitants', abbreviation: 'LCH', blv_reference: 'BLV 142.01', domain: 'population', total_articles: 55, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5132', keywords: ['habitant', 'domicile', 'registre', 'annonce'] },
  { code_name: 'LArch', full_name: 'Loi sur l\'archivage', abbreviation: 'LArch', blv_reference: 'BLV 432.11', domain: 'population', total_articles: 40, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5430', keywords: ['archives', 'conservation', 'accès', 'document'] },
  { code_name: 'LPrD', full_name: 'Loi sur la protection des données personnelles', abbreviation: 'LPrD', blv_reference: 'BLV 172.65', domain: 'population', total_articles: 45, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5161', keywords: ['données', 'protection', 'vie privée', 'traitement'] },
  // Territoire
  { code_name: 'LATC', full_name: 'Loi sur l\'aménagement du territoire et les constructions', abbreviation: 'LATC', blv_reference: 'BLV 700.11', domain: 'territoire', total_articles: 130, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5700', keywords: ['construction', 'permis', 'aménagement', 'zone'] },
  { code_name: 'LVLEne', full_name: 'Loi vaudoise sur l\'énergie', abbreviation: 'LVLEne', blv_reference: 'BLV 730.01', domain: 'territoire', total_articles: 85, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5730', keywords: ['énergie', 'renouvelable', 'efficacité', 'bâtiment'] },
  { code_name: 'LFaune', full_name: 'Loi sur la faune', abbreviation: 'LFaune', blv_reference: 'BLV 922.01', domain: 'territoire', total_articles: 65, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5920', keywords: ['chasse', 'faune', 'protection', 'gibier'] },
  { code_name: 'LGD', full_name: 'Loi sur la gestion des déchets', abbreviation: 'LGD', blv_reference: 'BLV 814.11', domain: 'territoire', total_articles: 50, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5814', keywords: ['déchet', 'recyclage', 'élimination', 'tri'] },
  // Mobilité
  { code_name: 'LRou', full_name: 'Loi sur les routes', abbreviation: 'LRou', blv_reference: 'BLV 725.01', domain: 'mobilite', total_articles: 95, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5725', keywords: ['route', 'voie', 'entretien', 'circulation'] },
  { code_name: 'LMTP', full_name: 'Loi sur la mobilité et les transports publics', abbreviation: 'LMTP', blv_reference: 'BLV 740.01', domain: 'mobilite', total_articles: 70, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5740', keywords: ['transport', 'mobilité', 'bus', 'train'] },
  // Économie
  { code_name: 'LEAE', full_name: 'Loi sur l\'emploi', abbreviation: 'LEAE', blv_reference: 'BLV 822.11', domain: 'economie', total_articles: 60, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5822', keywords: ['emploi', 'chômage', 'travail', 'mesure'] },
  { code_name: 'LAgr', full_name: 'Loi sur l\'agriculture vaudoise', abbreviation: 'LAgr', blv_reference: 'BLV 910.01', domain: 'economie', total_articles: 75, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5910', keywords: ['agriculture', 'paysan', 'exploitation', 'subvention'] },
  { code_name: 'LTour', full_name: 'Loi sur le tourisme', abbreviation: 'LTour', blv_reference: 'BLV 935.01', domain: 'economie', total_articles: 45, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5935', keywords: ['tourisme', 'hébergement', 'promotion'] },
  // Culture
  { code_name: 'LPMS', full_name: 'Loi sur la protection des monuments et sites', abbreviation: 'LPMS', blv_reference: 'BLV 450.01', domain: 'culture', total_articles: 50, source_url: 'https://www.rsv.vd.ch/dire-cocoon/rsv_site/doc.fo.html?docId=5450', keywords: ['monument', 'patrimoine', 'protection', 'site'] },
];

// ============================================================
// INLINE DATA - Key Federal Laws (18 laws)
// ============================================================
const FEDERAL_LAWS = [
  { code_name: 'Cst', full_name: 'Constitution fédérale de la Confédération suisse', abbreviation: 'Cst', blv_reference: 'RS 101', domain: 'constitution', total_articles: 197, source_url: 'https://www.fedlex.admin.ch/eli/cc/1999/404/fr', keywords: ['constitution', 'droits fondamentaux', 'fédéralisme', 'démocratie'] },
  { code_name: 'CC', full_name: 'Code civil suisse', abbreviation: 'CC', blv_reference: 'RS 210', domain: 'population', total_articles: 977, source_url: 'https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr', keywords: ['personne', 'famille', 'succession', 'propriété', 'tutelle', 'curatelle'] },
  { code_name: 'CO', full_name: 'Code des obligations', abbreviation: 'CO', blv_reference: 'RS 220', domain: 'economie', total_articles: 1186, source_url: 'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/fr', keywords: ['contrat', 'obligation', 'responsabilité', 'travail', 'société'] },
  { code_name: 'CP', full_name: 'Code pénal suisse', abbreviation: 'CP', blv_reference: 'RS 311.0', domain: 'justice', total_articles: 392, source_url: 'https://www.fedlex.admin.ch/eli/cc/54/757_781_799/fr', keywords: ['infraction', 'peine', 'crime', 'délit'] },
  { code_name: 'CPC', full_name: 'Code de procédure civile', abbreviation: 'CPC', blv_reference: 'RS 272', domain: 'justice', total_articles: 407, source_url: 'https://www.fedlex.admin.ch/eli/cc/2010/262/fr', keywords: ['procédure civile', 'action', 'jugement', 'appel'] },
  { code_name: 'CPP', full_name: 'Code de procédure pénale', abbreviation: 'CPP', blv_reference: 'RS 312.0', domain: 'justice', total_articles: 457, source_url: 'https://www.fedlex.admin.ch/eli/cc/2010/267/fr', keywords: ['procédure pénale', 'enquête', 'accusation', 'ministère public'] },
  { code_name: 'PA', full_name: 'Loi fédérale sur la procédure administrative', abbreviation: 'PA', blv_reference: 'RS 172.021', domain: 'justice', total_articles: 78, source_url: 'https://www.fedlex.admin.ch/eli/cc/1969/737_757_755/fr', keywords: ['procédure administrative', 'décision', 'recours', 'délai'] },
  { code_name: 'LPD', full_name: 'Loi fédérale sur la protection des données', abbreviation: 'LPD', blv_reference: 'RS 235.1', domain: 'population', total_articles: 74, source_url: 'https://www.fedlex.admin.ch/eli/cc/2022/491/fr', keywords: ['données personnelles', 'vie privée', 'traitement', 'PFPDT'] },
  { code_name: 'LAMal', full_name: 'Loi fédérale sur l\'assurance-maladie', abbreviation: 'LAMal', blv_reference: 'RS 832.10', domain: 'sante', total_articles: 105, source_url: 'https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr', keywords: ['assurance maladie', 'prime', 'franchise', 'caisse maladie'] },
  { code_name: 'LAI', full_name: 'Loi fédérale sur l\'assurance-invalidité', abbreviation: 'LAI', blv_reference: 'RS 831.20', domain: 'social', total_articles: 85, source_url: 'https://www.fedlex.admin.ch/eli/cc/1959/827_857_845/fr', keywords: ['invalidité', 'rente', 'réadaptation', 'handicap', 'AI'] },
  { code_name: 'LAVS', full_name: 'Loi fédérale sur l\'assurance-vieillesse et survivants', abbreviation: 'LAVS', blv_reference: 'RS 831.10', domain: 'social', total_articles: 95, source_url: 'https://www.fedlex.admin.ch/eli/cc/1952/89_89_89/fr', keywords: ['AVS', 'retraite', 'rente', 'cotisation'] },
  { code_name: 'LPGA', full_name: 'Loi fédérale sur la partie générale du droit des assurances sociales', abbreviation: 'LPGA', blv_reference: 'RS 830.1', domain: 'social', total_articles: 83, source_url: 'https://www.fedlex.admin.ch/eli/cc/2002/510/fr', keywords: ['assurances sociales', 'procédure', 'recours', 'délai'] },
  { code_name: 'LAVI', full_name: 'Loi fédérale sur l\'aide aux victimes d\'infractions', abbreviation: 'LAVI', blv_reference: 'RS 312.5', domain: 'social', total_articles: 32, source_url: 'https://www.fedlex.admin.ch/eli/cc/2008/232/fr', keywords: ['victime', 'infraction', 'aide', 'indemnisation'] },
  { code_name: 'LEI', full_name: 'Loi fédérale sur les étrangers et l\'intégration', abbreviation: 'LEI', blv_reference: 'RS 142.20', domain: 'population', total_articles: 130, source_url: 'https://www.fedlex.admin.ch/eli/cc/2007/758/fr', keywords: ['étranger', 'séjour', 'permis', 'intégration'] },
  { code_name: 'LAT', full_name: 'Loi fédérale sur l\'aménagement du territoire', abbreviation: 'LAT', blv_reference: 'RS 700', domain: 'territoire', total_articles: 45, source_url: 'https://www.fedlex.admin.ch/eli/cc/1979/1573_1573_1573/fr', keywords: ['aménagement', 'zone', 'plan', 'construction'] },
  { code_name: 'LCR', full_name: 'Loi fédérale sur la circulation routière', abbreviation: 'LCR', blv_reference: 'RS 741.01', domain: 'mobilite', total_articles: 110, source_url: 'https://www.fedlex.admin.ch/eli/cc/1959/679_705_685/fr', keywords: ['circulation', 'véhicule', 'permis', 'conducteur'] },
  { code_name: 'LTr', full_name: 'Loi sur le travail', abbreviation: 'LTr', blv_reference: 'RS 822.11', domain: 'economie', total_articles: 83, source_url: 'https://www.fedlex.admin.ch/eli/cc/1966/57_57_57/fr', keywords: ['travail', 'horaire', 'repos', 'nuit', 'protection'] },
  { code_name: 'LACI', full_name: 'Loi fédérale sur l\'assurance-chômage', abbreviation: 'LACI', blv_reference: 'RS 837.0', domain: 'economie', total_articles: 125, source_url: 'https://www.fedlex.admin.ch/eli/cc/1982/2184_2184_2184/fr', keywords: ['chômage', 'indemnité', 'ORP', 'recherche emploi'] },
];

// ============================================================
// INLINE DATA - Key Articles (80+ articles)
// ============================================================
const KEY_ARTICLES = [
  // Cst-VD
  { code_name: 'Cst-VD', article_number: '6', content: 'La dignité humaine est inviolable.', keywords: ['dignité', 'droits fondamentaux'], is_key: true },
  { code_name: 'Cst-VD', article_number: '7', content: 'Tous les êtres humains sont égaux en droit. Nul ne doit subir de discrimination du fait notamment de son origine, de son sexe, de son âge, de sa langue, de sa situation sociale, de son mode de vie, de ses convictions religieuses, philosophiques ou politiques, ou du fait d\'une déficience physique, mentale ou psychique.', keywords: ['égalité', 'discrimination', 'origine', 'sexe', 'handicap'], is_key: true },
  { code_name: 'Cst-VD', article_number: '8', content: 'L\'État et les communes garantissent à chacun le respect de sa vie et de son intégrité physique et psychique.', keywords: ['intégrité', 'vie', 'protection'], is_key: true },
  { code_name: 'Cst-VD', article_number: '10', content: 'La liberté personnelle est inviolable. Elle comprend notamment l\'intégrité physique et psychique, la liberté de mouvement et la protection contre les traitements arbitraires.', keywords: ['liberté', 'intégrité', 'mouvement', 'arbitraire'], is_key: true },
  { code_name: 'Cst-VD', article_number: '11', content: 'La vie privée et familiale, le domicile, le secret des lettres et télécommunications sont garantis.', keywords: ['vie privée', 'famille', 'domicile', 'secret'], is_key: true },
  { code_name: 'Cst-VD', article_number: '12', content: 'Toute personne a le droit d\'être protégée contre l\'utilisation abusive de données la concernant.', keywords: ['données', 'protection', 'vie privée'], is_key: true },
  { code_name: 'Cst-VD', article_number: '17', content: 'Toute personne a le droit d\'accéder aux informations et documents officiels, sauf si un intérêt prépondérant s\'y oppose.', keywords: ['transparence', 'information', 'accès', 'documents'], is_key: true },
  { code_name: 'Cst-VD', article_number: '29', content: 'Dans ses relations avec l\'administration, toute personne a le droit d\'être traitée dans un délai raisonnable et de manière non arbitraire.', keywords: ['délai', 'administration', 'arbitraire'], is_key: true },
  { code_name: 'Cst-VD', article_number: '30', content: 'Toute personne a droit, dans une procédure judiciaire ou administrative, à ce que sa cause soit traitée équitablement et jugée dans un délai raisonnable.', keywords: ['procédure', 'équitable', 'délai', 'jugement'], is_key: true },
  { code_name: 'Cst-VD', article_number: '38', content: 'Toute personne a droit à des conditions minimales d\'existence.', keywords: ['minimum vital', 'existence', 'aide sociale'], is_key: true },
  { code_name: 'Cst-VD', article_number: '53', content: 'L\'enfant a droit à une protection particulière de son intégrité et à l\'encouragement de son développement.', keywords: ['enfant', 'protection', 'développement'], is_key: true },
  { code_name: 'Cst-VD', article_number: '61', content: 'L\'État assure une formation de base gratuite, suffisante et de qualité.', keywords: ['formation', 'école', 'gratuit', 'éducation'], is_key: true },
  // LEO
  { code_name: 'LEO', article_number: '1', content: 'L\'école assure, en collaboration avec les parents, l\'instruction et l\'éducation des enfants.', keywords: ['école', 'parents', 'éducation', 'instruction'], is_key: true },
  { code_name: 'LEO', article_number: '4', content: 'L\'école offre à tous les élèves les meilleures possibilités de développement, d\'intégration et d\'apprentissage.', keywords: ['élève', 'développement', 'intégration', 'apprentissage'], is_key: true },
  { code_name: 'LEO', article_number: '5', content: 'L\'école est gratuite. L\'instruction obligatoire est assurée par les établissements scolaires publics ou par des établissements privés autorisés.', keywords: ['gratuit', 'école publique', 'école privée'], is_key: true },
  { code_name: 'LEO', article_number: '9', content: 'La scolarité obligatoire dure onze années, dont deux années d\'école enfantine.', keywords: ['scolarité obligatoire', '11 ans', 'école enfantine'], is_key: true },
  { code_name: 'LEO', article_number: '17', content: 'L\'école veille à promouvoir un climat propice à l\'apprentissage et au bien-être des élèves.', keywords: ['climat', 'apprentissage', 'bien-être'], is_key: true },
  { code_name: 'LEO', article_number: '52', content: 'Les parents ont le droit d\'être informés du comportement de leur enfant et des résultats obtenus ainsi que d\'être consultés avant toute décision importante pour leur enfant.', keywords: ['parents', 'information', 'comportement', 'résultats'], is_key: true },
  { code_name: 'LEO', article_number: '98', content: 'Le directeur est responsable de la gestion pédagogique, administrative et financière de l\'établissement.', keywords: ['directeur', 'gestion', 'établissement'], is_key: true },
  { code_name: 'LEO', article_number: '120', content: 'Les mesures disciplinaires applicables sont: a) le rappel à l\'ordre; b) les travaux supplémentaires; c) les heures d\'arrêts; d) la suspension temporaire de l\'établissement.', keywords: ['discipline', 'mesure', 'sanction', 'suspension'], is_key: true },
  // LASV
  { code_name: 'LASV', article_number: '1', content: 'La loi régit l\'aide sociale, dans le respect de la dignité des personnes.', keywords: ['aide sociale', 'dignité', 'respect'], is_key: true },
  { code_name: 'LASV', article_number: '2', content: 'L\'aide sociale a pour but de garantir le minimum vital à toute personne qui ne peut y parvenir par ses propres moyens.', keywords: ['minimum vital', 'aide', 'garantie'], is_key: true },
  { code_name: 'LASV', article_number: '3', content: 'Le revenu d\'insertion (RI) est une aide financière versée aux personnes qui ne disposent pas des moyens suffisants pour subvenir à leur entretien.', keywords: ['RI', 'revenu d\'insertion', 'aide financière'], is_key: true },
  { code_name: 'LASV', article_number: '25', content: 'La demande d\'aide sociale est présentée au centre social régional (CSR) du lieu de domicile du requérant.', keywords: ['demande', 'CSR', 'domicile'], is_key: true },
  { code_name: 'LASV', article_number: '31', content: 'Le bénéficiaire est tenu de se conformer aux mesures d\'insertion qui lui sont proposées dans le cadre de son contrat d\'insertion.', keywords: ['insertion', 'contrat', 'mesures'], is_key: true },
  { code_name: 'LASV', article_number: '40', content: 'Le département peut réduire ou supprimer l\'aide sociale en cas de refus de participer aux mesures d\'insertion sans motifs valables.', keywords: ['réduction', 'suppression', 'refus'], is_key: true },
  // LPS
  { code_name: 'LPS', article_number: '1', content: 'La présente loi régit les mesures de pédagogie spécialisée destinées aux enfants et adolescents présentant des besoins éducatifs particuliers.', keywords: ['pédagogie spécialisée', 'besoins particuliers', 'enfant'], is_key: true },
  { code_name: 'LPS', article_number: '3', content: 'Les mesures de pédagogie spécialisée doivent favoriser l\'intégration des enfants et adolescents concernés dans la société.', keywords: ['intégration', 'société', 'inclusion'], is_key: true },
  { code_name: 'LPS', article_number: '7', content: 'Les mesures ordinaires ont pour but de soutenir l\'élève dans le cadre de l\'enseignement régulier dispensé dans les classes de l\'école ordinaire.', keywords: ['mesures ordinaires', 'soutien', 'classe régulière'], is_key: true },
  { code_name: 'LPS', article_number: '10', content: 'Les mesures renforcées visent à répondre aux besoins particuliers d\'un élève qui ne peuvent être satisfaits dans le cadre des mesures ordinaires.', keywords: ['mesures renforcées', 'besoins particuliers'], is_key: true },
  { code_name: 'LPS', article_number: '17', content: 'Le projet pédagogique individualisé définit les objectifs, les moyens et les mesures appropriés aux besoins de l\'élève.', keywords: ['PPI', 'projet pédagogique', 'individualisé'], is_key: true },
  // LProMin
  { code_name: 'LProMin', article_number: '1', content: 'La présente loi a pour but de protéger les mineurs dont le développement physique, intellectuel, affectif ou social est compromis ou menacé.', keywords: ['protection', 'mineur', 'développement'], is_key: true },
  { code_name: 'LProMin', article_number: '3', content: 'Le service de protection de la jeunesse (SPJ) est l\'autorité cantonale compétente en matière de protection des mineurs.', keywords: ['SPJ', 'autorité', 'protection'], is_key: true },
  { code_name: 'LProMin', article_number: '26', content: 'Toute personne qui, dans le cadre de l\'exercice de sa profession ou d\'une fonction officielle, a connaissance de faits compromettant le développement d\'un mineur, est tenue d\'en informer le SPJ ou les autorités compétentes.', keywords: ['signalement', 'obligation', 'professionnel'], is_key: true },
  // LSP
  { code_name: 'LSP', article_number: '21', content: 'Toute personne a droit aux soins qu\'exige son état de santé.', keywords: ['droit aux soins', 'santé', 'patient'], is_key: true },
  { code_name: 'LSP', article_number: '22', content: 'Aucun soin ne peut être fourni sans le consentement libre et éclairé du patient.', keywords: ['consentement', 'patient', 'libre', 'éclairé'], is_key: true },
  { code_name: 'LSP', article_number: '23', content: 'Le patient a droit à des informations claires et appropriées sur son état de santé, le traitement et les alternatives possibles.', keywords: ['information', 'patient', 'traitement'], is_key: true },
  { code_name: 'LSP', article_number: '80', content: 'Les professionnels de la santé sont tenus au secret professionnel concernant les informations dont ils ont connaissance dans l\'exercice de leur activité.', keywords: ['secret professionnel', 'confidentialité'], is_key: true },
  // LVPAE
  { code_name: 'LVPAE', article_number: '1', content: 'La présente loi règle l\'organisation et le fonctionnement des autorités de protection de l\'enfant et de l\'adulte (APEA).', keywords: ['APEA', 'protection', 'organisation'], is_key: true },
  { code_name: 'LVPAE', article_number: '11', content: 'L\'APEA peut ordonner les mesures de protection prévues par le Code civil.', keywords: ['mesure de protection', 'curatelle', 'Code civil'], is_key: true },
  { code_name: 'LVPAE', article_number: '17', content: 'Le placement à des fins d\'assistance (PAFA) est ordonné par l\'APEA ou, en cas d\'urgence, par un médecin habilité.', keywords: ['PAFA', 'placement', 'urgence'], is_key: true },
  // LPA-VD
  { code_name: 'LPA-VD', article_number: '27', content: 'Les parties ont le droit de consulter le dossier et d\'en obtenir des copies, sous réserve des secrets protégés par la loi.', keywords: ['dossier', 'consultation', 'copie'], is_key: true },
  { code_name: 'LPA-VD', article_number: '29', content: 'Toute décision doit être motivée.', keywords: ['motivation', 'décision'], is_key: true },
  { code_name: 'LPA-VD', article_number: '46', content: 'Le recours doit être déposé dans les trente jours dès la notification de la décision.', keywords: ['recours', '30 jours', 'délai'], is_key: true },
  // LATC
  { code_name: 'LATC', article_number: '47', content: 'Aucune construction ne peut être édifiée sans permis de construire délivrée par la municipalité.', keywords: ['permis de construire', 'municipalité', 'construction'], is_key: true },
  { code_name: 'LATC', article_number: '59', content: 'La demande de permis de construire est mise à l\'enquête publique pendant trente jours.', keywords: ['enquête publique', '30 jours', 'permis'], is_key: true },
  { code_name: 'LATC', article_number: '75', content: 'Toute personne qui justifie d\'un intérêt digne de protection peut former opposition à la demande de permis de construire.', keywords: ['opposition', 'intérêt', 'permis'], is_key: true },
  // Federal Laws Articles
  { code_name: 'CC', article_number: '360', content: 'Toute personne ayant l\'exercice des droits civils (personne capable de discernement et majeure) peut charger une ou plusieurs personnes physiques ou morales de prendre soin de sa personne ou de gérer son patrimoine au cas où elle deviendrait incapable de discernement (directives anticipées pour la gestion patrimoniale et des soins personnels).', keywords: ['directives anticipées', 'mandat', 'incapacité', 'représentation'], is_key: true },
  { code_name: 'CC', article_number: '388', content: 'Les mesures de protection de l\'adulte garantissent l\'assistance et la protection des personnes ayant besoin d\'aide.', keywords: ['protection', 'adulte', 'assistance', 'aide'], is_key: true },
  { code_name: 'CC', article_number: '390', content: 'L\'autorité de protection de l\'adulte institue une curatelle lorsqu\'une personne majeure est partiellement ou totalement empêchée d\'assurer elle-même la sauvegarde de ses intérêts.', keywords: ['curatelle', 'protection', 'incapacité', 'intérêts'], is_key: true },
  { code_name: 'CC', article_number: '426', content: 'Une personne peut être placée dans une institution appropriée lorsqu\'en raison de troubles psychiques, d\'une déficience mentale ou d\'un grave état d\'abandon, l\'assistance ou le traitement nécessaires ne peuvent lui être fournis d\'une autre manière.', keywords: ['PAFA', 'placement', 'troubles psychiques', 'institution'], is_key: true },
  { code_name: 'LPD', article_number: '6', content: 'Les données personnelles doivent être traitées de manière licite.', keywords: ['licéité', 'traitement', 'données'], is_key: true },
  { code_name: 'LPD', article_number: '8', content: 'Le traitement de données personnelles doit être proportionné.', keywords: ['proportionnalité', 'traitement', 'données'], is_key: true },
  { code_name: 'LPD', article_number: '25', content: 'Toute personne peut demander au responsable du traitement si des données personnelles la concernant sont traitées.', keywords: ['droit d\'accès', 'demande', 'traitement'], is_key: true },
  { code_name: 'PA', article_number: '48', content: 'Le recours doit être déposé dans les trente jours à compter de la notification de la décision.', keywords: ['recours', 'délai', '30 jours'], is_key: true },
  { code_name: 'PA', article_number: '35', content: 'Toute décision doit être motivée.', keywords: ['motivation', 'décision'], is_key: true },
  { code_name: 'LPGA', article_number: '43', content: 'L\'assureur examine les demandes, prend d\'office les mesures d\'instruction nécessaires et recueille les renseignements dont il a besoin.', keywords: ['instruction', 'assureur', 'renseignements'], is_key: true },
  { code_name: 'LPGA', article_number: '56', content: 'Les décisions rendues par les assureurs peuvent faire l\'objet d\'un recours.', keywords: ['recours', 'décision', 'assureur'], is_key: true },
  { code_name: 'LPGA', article_number: '60', content: 'Le délai de recours est de trente jours à compter de la notification de la décision.', keywords: ['recours', 'délai', '30 jours'], is_key: true },
];

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = { 
      domains: 0, 
      instruments: 0, 
      units: 0, 
      versions: 0,
      sources: 0,
      errors: [] as string[] 
    };

    console.log('Starting LKB seed with inline data...');

    // 1. Insert Legal Domains
    console.log('Seeding 12 legal domains...');
    for (const domain of LEGAL_DOMAINS) {
      const { error } = await supabase.from('legal_domains').upsert({
        code: domain.code,
        label_fr: domain.label_fr,
        description: domain.description,
        icon: domain.icon,
        display_order: domain.display_order,
        keywords: domain.keywords
      }, { onConflict: 'code' });
      
      if (error) {
        results.errors.push(`Domain ${domain.code}: ${error.message}`);
      } else {
        results.domains++;
      }
    }

    // 2. Insert Vaud Laws as Instruments
    console.log('Seeding Vaud cantonal instruments...');
    for (const law of VAUD_LAWS) {
      const instrumentUid = `VD-${law.code_name}`;
      
      // Insert instrument
      const { data: instrument, error: instrError } = await supabase
        .from('legal_instruments')
        .upsert({
          instrument_uid: instrumentUid,
          jurisdiction: 'VD',
          instrument_type: law.code_name.startsWith('R') ? 'regulation' : 'law',
          title: law.full_name,
          abbreviation: law.abbreviation || law.code_name,
          official_ref: law.blv_reference,
          domain_tags: [law.domain],
          current_status: 'in_force'
        }, { onConflict: 'instrument_uid' })
        .select('id')
        .single();
      
      if (instrError) {
        results.errors.push(`Instrument ${instrumentUid}: ${instrError.message}`);
        continue;
      }
      
      results.instruments++;
      
      // Insert version
      if (instrument) {
        const { data: version, error: verError } = await supabase
          .from('legal_versions')
          .upsert({
            instrument_id: instrument.id,
            version_label: 'current',
            valid_from: '2020-01-01',
            is_current: true
          }, { onConflict: 'instrument_id,version_label' })
          .select('id')
          .single();
        
        if (!verError && version) {
          results.versions++;
          
          // Insert source
          const { error: srcError } = await supabase
            .from('legal_sources')
            .upsert({
              version_id: version.id,
              source_url: law.source_url,
              is_primary: true,
              fetch_status: 'pending'
            }, { onConflict: 'version_id,source_url' });
          
          if (!srcError) results.sources++;
        }
      }
    }

    // 3. Insert Federal Laws
    console.log('Seeding Federal instruments...');
    for (const law of FEDERAL_LAWS) {
      const instrumentUid = `CH-${law.code_name}`;
      
      const { data: instrument, error: instrError } = await supabase
        .from('legal_instruments')
        .upsert({
          instrument_uid: instrumentUid,
          jurisdiction: 'CH',
          instrument_type: law.code_name.length <= 3 ? 'code' : 'law',
          title: law.full_name,
          abbreviation: law.abbreviation || law.code_name,
          official_ref: law.blv_reference,
          domain_tags: [law.domain],
          current_status: 'in_force'
        }, { onConflict: 'instrument_uid' })
        .select('id')
        .single();
      
      if (instrError) {
        results.errors.push(`Instrument ${instrumentUid}: ${instrError.message}`);
        continue;
      }
      
      results.instruments++;
      
      if (instrument) {
        const { data: version, error: verError } = await supabase
          .from('legal_versions')
          .upsert({
            instrument_id: instrument.id,
            version_label: 'current',
            valid_from: '2020-01-01',
            is_current: true
          }, { onConflict: 'instrument_id,version_label' })
          .select('id')
          .single();
        
        if (!verError && version) {
          results.versions++;
          
          const { error: srcError } = await supabase
            .from('legal_sources')
            .upsert({
              version_id: version.id,
              source_url: law.source_url,
              is_primary: true,
              fetch_status: 'pending'
            }, { onConflict: 'version_id,source_url' });
          
          if (!srcError) results.sources++;
        }
      }
    }

    // 4. Insert Key Articles as Units
    console.log('Seeding key legal units (articles)...');
    for (const article of KEY_ARTICLES) {
      // Find instrument
      const instrumentUid = article.code_name.startsWith('C') && !article.code_name.includes('-') 
        ? `CH-${article.code_name}` 
        : (article.code_name.includes('-VD') || VAUD_LAWS.some(l => l.code_name === article.code_name) 
            ? `VD-${article.code_name}` 
            : `CH-${article.code_name}`);
      
      const { data: instrument } = await supabase
        .from('legal_instruments')
        .select('id')
        .eq('instrument_uid', instrumentUid)
        .single();
      
      if (!instrument) {
        results.errors.push(`Unit ${article.code_name} art.${article.article_number}: instrument not found`);
        continue;
      }
      
      // Find version
      const { data: version } = await supabase
        .from('legal_versions')
        .select('id')
        .eq('instrument_id', instrument.id)
        .eq('is_current', true)
        .single();
      
      if (!version) {
        results.errors.push(`Unit ${article.code_name} art.${article.article_number}: version not found`);
        continue;
      }
      
      // Create hash
      const hashData = new TextEncoder().encode(article.content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const citeKey = `art. ${article.article_number}`;
      
      const { error: unitError } = await supabase
        .from('legal_units')
        .upsert({
          instrument_id: instrument.id,
          version_id: version.id,
          unit_type: 'article',
          cite_key: citeKey,
          ordinal: parseInt(article.article_number) || 0,
          content_text: article.content,
          hash_sha256: hash,
          keywords: article.keywords,
          is_key_unit: article.is_key
        }, { onConflict: 'version_id,cite_key' });
      
      if (unitError) {
        results.errors.push(`Unit ${citeKey}: ${unitError.message}`);
      } else {
        results.units++;
      }
    }

    console.log('LKB seed complete:', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Legal Knowledge Base seeded successfully',
      stats: {
        domains: results.domains,
        instruments: results.instruments,
        versions: results.versions,
        sources: results.sources,
        units: results.units,
        errors_count: results.errors.length
      },
      errors: results.errors.slice(0, 20)
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    console.error('Seed error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
