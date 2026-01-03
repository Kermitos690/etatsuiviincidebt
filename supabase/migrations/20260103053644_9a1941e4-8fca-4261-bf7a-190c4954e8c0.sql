-- Étape 1: Créer les versions légales manquantes pour chaque instrument
INSERT INTO public.legal_versions (instrument_id, version_number, status, valid_from)
SELECT 
  li.id,
  1,
  'current',
  '2024-01-01'::date
FROM public.legal_instruments li
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_versions lv WHERE lv.instrument_id = li.id
)
ON CONFLICT DO NOTHING;

-- Articles CC (Code civil suisse) - Relations familiales et protection
INSERT INTO public.legal_units (version_id, unit_type, article_number, cite_key, content_text, keywords, is_key_unit)
SELECT 
  lv.id,
  'article',
  vals.num,
  vals.cite,
  vals.content,
  vals.kw,
  true
FROM (VALUES
  ('307', 'CH-CC-307', 'Art. 307 CC - Mesures de protection de l''enfant. L''autorité de protection de l''enfant prend les mesures nécessaires pour protéger l''enfant si son développement est menacé.', ARRAY['protection enfant', 'mesures', 'développement', 'APEA']),
  ('308', 'CH-CC-308', 'Art. 308 CC - Curatelle éducative. L''autorité de protection de l''enfant nomme un curateur qui assiste les père et mère de ses conseils et de son appui.', ARRAY['curatelle', 'éducative', 'curateur', 'assistance']),
  ('309', 'CH-CC-309', 'Art. 309 CC - Curatelle de représentation. L''autorité nomme un curateur au mineur pour le représenter dans certains actes.', ARRAY['curatelle', 'représentation', 'mineur', 'actes juridiques']),
  ('310', 'CH-CC-310', 'Art. 310 CC - Retrait du droit de déterminer le lieu de résidence. L''autorité peut retirer aux parents le droit de déterminer le lieu de résidence de l''enfant.', ARRAY['retrait', 'résidence', 'placement', 'enfant']),
  ('311', 'CH-CC-311', 'Art. 311 CC - Retrait de l''autorité parentale. L''autorité de protection de l''enfant retire l''autorité parentale si les mesures moins incisives ont été sans résultat.', ARRAY['retrait', 'autorité parentale', 'mesures', 'ultima ratio']),
  ('312', 'CH-CC-312', 'Art. 312 CC - Retrait de l''autorité parentale pour nouveau-né. L''autorité peut retirer l''autorité parentale dès la naissance si des circonstances graves l''exigent.', ARRAY['nouveau-né', 'retrait', 'circonstances graves']),
  ('314', 'CH-CC-314', 'Art. 314 CC - Compétence de l''autorité de protection de l''enfant. L''autorité de protection de l''enfant est compétente pour les mesures de protection.', ARRAY['compétence', 'APEA', 'mesures protection']),
  ('314a', 'CH-CC-314a', 'Art. 314a CC - Audition de l''enfant. L''enfant est entendu personnellement et de manière appropriée par l''autorité, sauf si son âge ou d''autres motifs importants s''y opposent.', ARRAY['audition', 'enfant', 'droit être entendu', 'procédure']),
  ('314b', 'CH-CC-314b', 'Art. 314b CC - Représentation de l''enfant. L''autorité ordonne si nécessaire la représentation de l''enfant et désigne un curateur expérimenté.', ARRAY['représentation', 'curateur', 'procédure', 'enfant']),
  ('315', 'CH-CC-315', 'Art. 315 CC - Mesures provisionnelles. L''autorité de protection de l''enfant peut ordonner des mesures provisionnelles d''urgence.', ARRAY['mesures provisionnelles', 'urgence', 'protection']),
  ('315a', 'CH-CC-315a', 'Art. 315a CC - Compétence du juge matrimonial. Le juge du divorce ou de la séparation est compétent pour les mesures de protection.', ARRAY['divorce', 'juge', 'compétence', 'mesures']),
  ('316', 'CH-CC-316', 'Art. 316 CC - Placement de l''enfant auprès de parents nourriciers. Le placement requiert l''autorisation de l''autorité de protection et est soumis à sa surveillance.', ARRAY['placement', 'famille accueil', 'autorisation', 'surveillance']),
  ('317', 'CH-CC-317', 'Art. 317 CC - Collaboration des autorités. Les autorités collaborent entre elles et avec les services compétents.', ARRAY['collaboration', 'autorités', 'coordination']),
  ('318', 'CH-CC-318', 'Art. 318 CC - Modification des mesures. L''autorité modifie les mesures si les circonstances ont changé.', ARRAY['modification', 'mesures', 'circonstances', 'révision']),
  ('392', 'CH-CC-392', 'Art. 392 CC - Curatelle de représentation pour adulte. Une curatelle est instituée pour représenter la personne dans ses affaires.', ARRAY['curatelle', 'représentation', 'adulte', 'affaires']),
  ('393', 'CH-CC-393', 'Art. 393 CC - Curatelle de gestion du patrimoine. L''autorité institue une curatelle de gestion si la personne ne peut gérer son patrimoine.', ARRAY['curatelle', 'gestion', 'patrimoine', 'biens']),
  ('394', 'CH-CC-394', 'Art. 394 CC - Curatelle de coopération. Une curatelle de coopération peut être instituée si la personne a besoin d''un accompagnement.', ARRAY['curatelle', 'coopération', 'accompagnement', 'consentement']),
  ('395', 'CH-CC-395', 'Art. 395 CC - Combinaison des curatelles. L''autorité peut combiner différents types de curatelle selon les besoins de la personne.', ARRAY['combinaison', 'curatelles', 'besoins', 'flexibilité']),
  ('396', 'CH-CC-396', 'Art. 396 CC - Curatelle de portée générale. Si une personne a un besoin d''aide durable et étendu, l''autorité institue une curatelle de portée générale.', ARRAY['curatelle générale', 'aide durable', 'étendue', 'protection']),
  ('397', 'CH-CC-397', 'Art. 397 CC - Nomination du curateur. L''autorité nomme une personne physique comme curateur, en tenant compte des souhaits de la personne concernée.', ARRAY['nomination', 'curateur', 'personne physique', 'souhaits']),
  ('398', 'CH-CC-398', 'Art. 398 CC - Acceptation du mandat. La personne désignée comme curateur est tenue d''accepter le mandat sauf justes motifs.', ARRAY['acceptation', 'mandat', 'obligation', 'justes motifs']),
  ('400', 'CH-CC-400', 'Art. 400 CC - Rémunération du curateur. Le curateur a droit à une rémunération appropriée et au remboursement des frais.', ARRAY['rémunération', 'curateur', 'frais', 'indemnisation']),
  ('401', 'CH-CC-401', 'Art. 401 CC - Fin du mandat du curateur. Le mandat du curateur prend fin par décision de l''autorité ou par décès.', ARRAY['fin mandat', 'curateur', 'décision', 'décès']),
  ('404', 'CH-CC-404', 'Art. 404 CC - Devoir de diligence du curateur. Le curateur accomplit sa tâche avec diligence et respect de la personnalité de la personne concernée.', ARRAY['diligence', 'curateur', 'respect', 'personnalité']),
  ('406', 'CH-CC-406', 'Art. 406 CC - Actes requérant le consentement. Pour certains actes, le curateur doit obtenir le consentement de l''autorité de protection.', ARRAY['consentement', 'autorité', 'actes', 'approbation']),
  ('409', 'CH-CC-409', 'Art. 409 CC - Droit de la personne concernée de gérer elle-même. La personne peut gérer seule une partie de ses revenus.', ARRAY['autonomie', 'gestion', 'revenus', 'indépendance']),
  ('410', 'CH-CC-410', 'Art. 410 CC - Rapports du curateur. Le curateur établit périodiquement un rapport et les comptes sur son activité.', ARRAY['rapports', 'comptes', 'curateur', 'surveillance']),
  ('413', 'CH-CC-413', 'Art. 413 CC - Fin de la curatelle. La curatelle prend fin de plein droit lorsque les conditions ne sont plus remplies.', ARRAY['fin curatelle', 'conditions', 'levée', 'autonomie']),
  ('419', 'CH-CC-419', 'Art. 419 CC - Placement à des fins d''assistance. Une personne peut être placée dans une institution appropriée lorsque l''assistance nécessaire ne peut lui être fournie autrement.', ARRAY['placement', 'PAFA', 'institution', 'assistance']),
  ('426', 'CH-CC-426', 'Art. 426 CC - Conditions du PAFA. Le PAFA ne peut être ordonné que si les conditions légales sont réunies et les mesures moins incisives insuffisantes.', ARRAY['PAFA', 'conditions', 'proportionnalité', 'ultima ratio']),
  ('427', 'CH-CC-427', 'Art. 427 CC - Autorité compétente pour le PAFA. L''autorité de protection de l''adulte est compétente pour le PAFA.', ARRAY['compétence', 'PAFA', 'autorité', 'adulte']),
  ('428', 'CH-CC-428', 'Art. 428 CC - Compétence médicale pour le PAFA. En cas d''urgence, un médecin peut ordonner un PAFA pour une durée limitée.', ARRAY['urgence', 'médecin', 'PAFA', 'durée limitée']),
  ('429', 'CH-CC-429', 'Art. 429 CC - Examen à l''entrée. La personne placée doit être examinée par un médecin à son entrée dans l''institution.', ARRAY['examen', 'médecin', 'entrée', 'institution']),
  ('430', 'CH-CC-430', 'Art. 430 CC - Examen périodique du PAFA. L''institution examine régulièrement si les conditions du placement sont encore remplies.', ARRAY['examen périodique', 'conditions', 'placement', 'révision']),
  ('431', 'CH-CC-431', 'Art. 431 CC - Libération du PAFA. La personne peut demander en tout temps sa libération à l''autorité de protection.', ARRAY['libération', 'demande', 'PAFA', 'recours']),
  ('432', 'CH-CC-432', 'Art. 432 CC - Personne de confiance. La personne placée peut désigner une personne de confiance pour l''assister.', ARRAY['personne confiance', 'assistance', 'PAFA', 'droits']),
  ('433', 'CH-CC-433', 'Art. 433 CC - Traitement médical sans consentement. Le médecin-chef peut ordonner un traitement sans le consentement si certaines conditions sont remplies.', ARRAY['traitement', 'consentement', 'médecin', 'conditions']),
  ('434', 'CH-CC-434', 'Art. 434 CC - Information sur le traitement. La personne placée doit être informée de son traitement médical.', ARRAY['information', 'traitement', 'droits', 'patient']),
  ('435', 'CH-CC-435', 'Art. 435 CC - Traitement d''urgence. En cas d''urgence, les mesures médicales indispensables peuvent être prises immédiatement.', ARRAY['urgence', 'mesures médicales', 'immédiates', 'traitement']),
  ('438', 'CH-CC-438', 'Art. 438 CC - Mesures limitant la liberté de mouvement. Les mesures limitant la liberté de mouvement doivent être proportionnées et documentées.', ARRAY['liberté mouvement', 'mesures', 'proportionnalité', 'documentation']),
  ('439', 'CH-CC-439', 'Art. 439 CC - Recours contre le PAFA. La personne peut recourir auprès du juge contre la décision de PAFA.', ARRAY['recours', 'juge', 'PAFA', 'voies de droit']),
  ('443', 'CH-CC-443', 'Art. 443 CC - Organisation de l''autorité de protection. Les cantons désignent les autorités de protection de l''adulte et de l''enfant.', ARRAY['organisation', 'APEA', 'cantons', 'désignation']),
  ('445', 'CH-CC-445', 'Art. 445 CC - Composition de l''autorité. L''autorité de protection est une autorité interdisciplinaire.', ARRAY['composition', 'interdisciplinaire', 'autorité', 'compétences']),
  ('446', 'CH-CC-446', 'Art. 446 CC - Maximes de la procédure. La procédure devant l''autorité de protection est régie par les maximes inquisitoire et d''office.', ARRAY['procédure', 'maxime inquisitoire', 'office', 'instruction']),
  ('447', 'CH-CC-447', 'Art. 447 CC - Audition des parties. L''autorité entend les personnes concernées en personne.', ARRAY['audition', 'personnes', 'procédure', 'droits']),
  ('448', 'CH-CC-448', 'Art. 448 CC - Obligation de collaborer. Les personnes concernées et les tiers ont l''obligation de collaborer à l''établissement des faits.', ARRAY['collaboration', 'obligation', 'faits', 'instruction']),
  ('449', 'CH-CC-449', 'Art. 449 CC - Décision de l''autorité. Les décisions sont rendues par écrit et motivées.', ARRAY['décision', 'écrit', 'motivation', 'notification']),
  ('450', 'CH-CC-450', 'Art. 450 CC - Recours contre les décisions. Le recours est ouvert contre les décisions de l''autorité de protection.', ARRAY['recours', 'décision', 'voies de droit', 'délai'])
) AS vals(num, cite, content, kw)
CROSS JOIN public.legal_instruments li
CROSS JOIN public.legal_versions lv
WHERE li.instrument_uid = 'CH-CC' 
  AND lv.instrument_id = li.id 
  AND lv.status = 'current'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles LEO (Loi sur l'enseignement obligatoire) - Vaud
INSERT INTO public.legal_units (version_id, unit_type, article_number, cite_key, content_text, keywords, is_key_unit)
SELECT 
  lv.id,
  'article',
  vals.num,
  vals.cite,
  vals.content,
  vals.kw,
  true
FROM (VALUES
  ('5', 'VD-LEO-5', 'Art. 5 LEO - Obligation scolaire. Tout enfant domicilié dans le canton est astreint à l''instruction obligatoire.', ARRAY['obligation scolaire', 'domicile', 'instruction', 'enfant']),
  ('6', 'VD-LEO-6', 'Art. 6 LEO - Durée de l''obligation scolaire. L''obligation scolaire dure onze années.', ARRAY['durée', 'onze ans', 'scolarité', 'obligation']),
  ('7', 'VD-LEO-7', 'Art. 7 LEO - Début de l''obligation scolaire. L''obligation scolaire débute à quatre ans révolus.', ARRAY['début', 'quatre ans', 'âge', 'entrée école']),
  ('8', 'VD-LEO-8', 'Art. 8 LEO - Fin de l''obligation scolaire. L''obligation scolaire prend fin à la fin de l''année scolaire au cours de laquelle l''élève atteint l''âge de 15 ans.', ARRAY['fin', 'quinze ans', 'terme', 'scolarité']),
  ('9', 'VD-LEO-9', 'Art. 9 LEO - Dispense et report. Le directeur peut dispenser un enfant de l''obligation scolaire ou reporter le début de celle-ci.', ARRAY['dispense', 'report', 'directeur', 'exception']),
  ('55', 'VD-LEO-55', 'Art. 55 LEO - Devoirs des parents. Les parents sont tenus de collaborer avec l''école.', ARRAY['parents', 'collaboration', 'devoirs', 'école']),
  ('56', 'VD-LEO-56', 'Art. 56 LEO - Entretiens avec les parents. L''établissement organise des entretiens réguliers avec les parents.', ARRAY['entretiens', 'parents', 'communication', 'suivi']),
  ('57', 'VD-LEO-57', 'Art. 57 LEO - Information des parents. Les parents sont informés régulièrement de la progression de leur enfant.', ARRAY['information', 'parents', 'progression', 'évaluation']),
  ('98', 'VD-LEO-98', 'Art. 98 LEO - Mesures disciplinaires. L''école peut prendre des mesures disciplinaires proportionnées.', ARRAY['discipline', 'mesures', 'proportionnalité', 'sanctions']),
  ('99', 'VD-LEO-99', 'Art. 99 LEO - Types de mesures. Les mesures disciplinaires comprennent l''avertissement, les travaux supplémentaires, l''exclusion temporaire.', ARRAY['avertissement', 'exclusion', 'travaux', 'sanctions']),
  ('100', 'VD-LEO-100', 'Art. 100 LEO - Procédure disciplinaire. Avant de prononcer une mesure, l''élève doit être entendu.', ARRAY['procédure', 'audition', 'élève', 'droits']),
  ('101', 'VD-LEO-101', 'Art. 101 LEO - Exclusion définitive. L''exclusion définitive est prononcée par le département.', ARRAY['exclusion définitive', 'département', 'décision', 'ultima ratio']),
  ('120', 'VD-LEO-120', 'Art. 120 LEO - Pédagogie spécialisée. L''État assure aux élèves à besoins particuliers les prestations de pédagogie spécialisée.', ARRAY['pédagogie spécialisée', 'besoins particuliers', 'prestations', 'inclusion']),
  ('121', 'VD-LEO-121', 'Art. 121 LEO - Évaluation des besoins. Les besoins de l''élève sont évalués par des professionnels qualifiés.', ARRAY['évaluation', 'besoins', 'professionnels', 'diagnostic']),
  ('122', 'VD-LEO-122', 'Art. 122 LEO - Mesures ordinaires. Les mesures ordinaires de pédagogie différenciée sont dispensées dans l''école.', ARRAY['mesures ordinaires', 'différenciation', 'école', 'intégration']),
  ('123', 'VD-LEO-123', 'Art. 123 LEO - Mesures renforcées. Les mesures renforcées nécessitent une procédure d''évaluation standardisée.', ARRAY['mesures renforcées', 'PES', 'évaluation', 'procédure']),
  ('124', 'VD-LEO-124', 'Art. 124 LEO - Décision relative aux mesures. La décision d''octroyer des mesures renforcées est prise par l''autorité compétente.', ARRAY['décision', 'mesures', 'autorité', 'octroi']),
  ('125', 'VD-LEO-125', 'Art. 125 LEO - Placement en institution. Le placement en institution spécialisée est une mesure subsidiaire.', ARRAY['placement', 'institution', 'subsidiaire', 'spécialisée']),
  ('129', 'VD-LEO-129', 'Art. 129 LEO - Signalement. Tout professionnel qui constate une situation préoccupante doit la signaler.', ARRAY['signalement', 'professionnel', 'obligation', 'protection']),
  ('130', 'VD-LEO-130', 'Art. 130 LEO - Protection des élèves. L''école prend les mesures nécessaires pour protéger l''intégrité physique et psychique des élèves.', ARRAY['protection', 'intégrité', 'élèves', 'sécurité'])
) AS vals(num, cite, content, kw)
CROSS JOIN public.legal_instruments li
CROSS JOIN public.legal_versions lv
WHERE li.instrument_uid = 'VD-LEO' 
  AND lv.instrument_id = li.id 
  AND lv.status = 'current'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles LProMin (Loi sur la protection des mineurs) - Vaud
INSERT INTO public.legal_units (version_id, unit_type, article_number, cite_key, content_text, keywords, is_key_unit)
SELECT 
  lv.id,
  'article',
  vals.num,
  vals.cite,
  vals.content,
  vals.kw,
  true
FROM (VALUES
  ('3', 'VD-LPROMIN-3', 'Art. 3 LProMin - Intérêt supérieur du mineur. L''intérêt supérieur du mineur prime toute autre considération.', ARRAY['intérêt supérieur', 'mineur', 'principe', 'priorité']),
  ('4', 'VD-LPROMIN-4', 'Art. 4 LProMin - Droit d''être entendu. Le mineur capable de discernement a le droit d''être entendu dans toute procédure le concernant.', ARRAY['droit être entendu', 'discernement', 'procédure', 'participation']),
  ('5', 'VD-LPROMIN-5', 'Art. 5 LProMin - Droit à l''information. Le mineur a droit à une information appropriée à son âge et à sa maturité.', ARRAY['information', 'âge', 'maturité', 'droits']),
  ('7', 'VD-LPROMIN-7', 'Art. 7 LProMin - Signalement obligatoire. Les professionnels doivent signaler les situations de mise en danger.', ARRAY['signalement', 'obligatoire', 'professionnels', 'danger']),
  ('8', 'VD-LPROMIN-8', 'Art. 8 LProMin - Signalement facultatif. Toute personne peut signaler une situation préoccupante.', ARRAY['signalement', 'facultatif', 'citoyen', 'préoccupation']),
  ('9', 'VD-LPROMIN-9', 'Art. 9 LProMin - Protection du signalant. Le signalant de bonne foi est protégé.', ARRAY['protection', 'signalant', 'bonne foi', 'immunité']),
  ('12', 'VD-LPROMIN-12', 'Art. 12 LProMin - Mesures de protection. La DGEJ peut prendre des mesures de protection en faveur du mineur.', ARRAY['mesures', 'protection', 'DGEJ', 'intervention']),
  ('14', 'VD-LPROMIN-14', 'Art. 14 LProMin - Urgence. En cas d''urgence, la DGEJ peut prendre des mesures immédiates.', ARRAY['urgence', 'mesures immédiates', 'DGEJ', 'protection']),
  ('15', 'VD-LPROMIN-15', 'Art. 15 LProMin - Collaboration avec les parents. La DGEJ recherche la collaboration des parents.', ARRAY['collaboration', 'parents', 'DGEJ', 'partenariat']),
  ('16', 'VD-LPROMIN-16', 'Art. 16 LProMin - Placement en institution. Le placement en institution requiert une décision motivée.', ARRAY['placement', 'institution', 'décision', 'motivation']),
  ('17', 'VD-LPROMIN-17', 'Art. 17 LProMin - Suivi du placement. Le placement fait l''objet d''un suivi régulier.', ARRAY['suivi', 'placement', 'régulier', 'évaluation']),
  ('20', 'VD-LPROMIN-20', 'Art. 20 LProMin - Curatelle de protection. La DGEJ peut demander l''institution d''une curatelle.', ARRAY['curatelle', 'protection', 'DGEJ', 'demande']),
  ('22', 'VD-LPROMIN-22', 'Art. 22 LProMin - Accueil familial. L''accueil familial est une mesure de protection privilégiée.', ARRAY['accueil familial', 'protection', 'famille', 'placement']),
  ('25', 'VD-LPROMIN-25', 'Art. 25 LProMin - Droit de visite. Le mineur placé a droit à des contacts avec sa famille.', ARRAY['droit visite', 'contacts', 'famille', 'maintien liens']),
  ('28', 'VD-LPROMIN-28', 'Art. 28 LProMin - Fin du placement. Le placement prend fin lorsque les conditions ne sont plus remplies.', ARRAY['fin placement', 'conditions', 'retour', 'famille']),
  ('30', 'VD-LPROMIN-30', 'Art. 30 LProMin - Secret de fonction. Les collaborateurs sont tenus au secret de fonction.', ARRAY['secret', 'fonction', 'confidentialité', 'collaborateurs']),
  ('32', 'VD-LPROMIN-32', 'Art. 32 LProMin - Financement. L''État finance les mesures de protection.', ARRAY['financement', 'État', 'mesures', 'coûts']),
  ('35', 'VD-LPROMIN-35', 'Art. 35 LProMin - Coordination. La DGEJ coordonne les interventions des différents services.', ARRAY['coordination', 'DGEJ', 'services', 'collaboration']),
  ('38', 'VD-LPROMIN-38', 'Art. 38 LProMin - Recours. Les décisions de la DGEJ peuvent faire l''objet d''un recours.', ARRAY['recours', 'décision', 'DGEJ', 'voies de droit']),
  ('40', 'VD-LPROMIN-40', 'Art. 40 LProMin - Évaluation périodique. Les mesures font l''objet d''une évaluation périodique.', ARRAY['évaluation', 'périodique', 'mesures', 'révision'])
) AS vals(num, cite, content, kw)
CROSS JOIN public.legal_instruments li
CROSS JOIN public.legal_versions lv
WHERE li.instrument_uid = 'VD-LPROMIN' 
  AND lv.instrument_id = li.id 
  AND lv.status = 'current'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles LVPAE - Vaud
INSERT INTO public.legal_units (version_id, unit_type, article_number, cite_key, content_text, keywords, is_key_unit)
SELECT 
  lv.id,
  'article',
  vals.num,
  vals.cite,
  vals.content,
  vals.kw,
  true
FROM (VALUES
  ('4', 'VD-LVPAE-4', 'Art. 4 LVPAE - Justice de paix. La justice de paix est l''autorité de protection de l''adulte et de l''enfant.', ARRAY['justice de paix', 'APEA', 'autorité', 'compétence']),
  ('5', 'VD-LVPAE-5', 'Art. 5 LVPAE - Composition. La justice de paix siège en formation collégiale ou à juge unique.', ARRAY['composition', 'collégiale', 'juge unique', 'formation']),
  ('7', 'VD-LVPAE-7', 'Art. 7 LVPAE - Compétence territoriale. La justice de paix du domicile de la personne concernée est compétente.', ARRAY['compétence', 'territoriale', 'domicile', 'for']),
  ('10', 'VD-LVPAE-10', 'Art. 10 LVPAE - Procédure. La procédure est régie par les dispositions du Code civil et de la LVPAE.', ARRAY['procédure', 'Code civil', 'règles', 'application']),
  ('12', 'VD-LVPAE-12', 'Art. 12 LVPAE - Instruction. L''instruction est menée d''office par le juge.', ARRAY['instruction', 'office', 'juge', 'investigation']),
  ('14', 'VD-LVPAE-14', 'Art. 14 LVPAE - Audition. L''autorité entend la personne concernée en règle générale.', ARRAY['audition', 'personne concernée', 'règle', 'procédure']),
  ('16', 'VD-LVPAE-16', 'Art. 16 LVPAE - Expertise. L''autorité peut ordonner une expertise médicale ou psychologique.', ARRAY['expertise', 'médicale', 'psychologique', 'évaluation']),
  ('18', 'VD-LVPAE-18', 'Art. 18 LVPAE - Mesures provisionnelles. L''autorité peut prendre des mesures provisionnelles urgentes.', ARRAY['mesures provisionnelles', 'urgence', 'protection', 'temporaire']),
  ('20', 'VD-LVPAE-20', 'Art. 20 LVPAE - Décision. La décision est rendue par écrit et motivée.', ARRAY['décision', 'écrit', 'motivation', 'notification']),
  ('22', 'VD-LVPAE-22', 'Art. 22 LVPAE - Notification. La décision est notifiée aux parties et aux autorités concernées.', ARRAY['notification', 'parties', 'autorités', 'communication']),
  ('24', 'VD-LVPAE-24', 'Art. 24 LVPAE - Recours. Le recours contre les décisions de la justice de paix est ouvert auprès de la Chambre des curatelles.', ARRAY['recours', 'Chambre curatelles', 'voies de droit', 'appel']),
  ('26', 'VD-LVPAE-26', 'Art. 26 LVPAE - Délai de recours. Le délai de recours est de 30 jours dès la notification.', ARRAY['délai', 'recours', 'trente jours', 'notification']),
  ('30', 'VD-LVPAE-30', 'Art. 30 LVPAE - Curateurs professionnels. Les curateurs professionnels sont engagés par le canton.', ARRAY['curateurs', 'professionnels', 'canton', 'engagement']),
  ('32', 'VD-LVPAE-32', 'Art. 32 LVPAE - Surveillance des curateurs. La justice de paix surveille l''activité des curateurs.', ARRAY['surveillance', 'curateurs', 'justice de paix', 'contrôle']),
  ('34', 'VD-LVPAE-34', 'Art. 34 LVPAE - Rapports des curateurs. Les curateurs remettent un rapport périodique à l''autorité.', ARRAY['rapports', 'curateurs', 'périodique', 'comptes']),
  ('38', 'VD-LVPAE-38', 'Art. 38 LVPAE - PAFA. Le placement à des fins d''assistance est ordonné par la justice de paix.', ARRAY['PAFA', 'placement', 'justice de paix', 'décision']),
  ('40', 'VD-LVPAE-40', 'Art. 40 LVPAE - PAFA médical. Le médecin peut ordonner un PAFA en cas d''urgence pour une durée maximale de 6 semaines.', ARRAY['PAFA', 'médecin', 'urgence', 'six semaines']),
  ('42', 'VD-LVPAE-42', 'Art. 42 LVPAE - Contrôle du PAFA. Le PAFA fait l''objet d''un contrôle régulier par l''autorité.', ARRAY['contrôle', 'PAFA', 'régulier', 'révision']),
  ('45', 'VD-LVPAE-45', 'Art. 45 LVPAE - Frais de procédure. Les frais de procédure sont à la charge de l''État sauf exception.', ARRAY['frais', 'procédure', 'État', 'gratuité']),
  ('48', 'VD-LVPAE-48', 'Art. 48 LVPAE - Assistance judiciaire. L''assistance judiciaire peut être accordée selon les conditions légales.', ARRAY['assistance judiciaire', 'conditions', 'avocat', 'gratuité'])
) AS vals(num, cite, content, kw)
CROSS JOIN public.legal_instruments li
CROSS JOIN public.legal_versions lv
WHERE li.instrument_uid = 'VD-LVPAE' 
  AND lv.instrument_id = li.id 
  AND lv.status = 'current'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles LPD - CH
INSERT INTO public.legal_units (version_id, unit_type, article_number, cite_key, content_text, keywords, is_key_unit)
SELECT 
  lv.id,
  'article',
  vals.num,
  vals.cite,
  vals.content,
  vals.kw,
  true
FROM (VALUES
  ('4', 'CH-LPD-4', 'Art. 4 LPD - Principes. Les données personnelles doivent être traitées de manière licite, de bonne foi et proportionnée.', ARRAY['principes', 'licéité', 'bonne foi', 'proportionnalité']),
  ('5', 'CH-LPD-5', 'Art. 5 LPD - Exactitude des données. Celui qui traite des données personnelles doit s''assurer qu''elles sont exactes.', ARRAY['exactitude', 'données', 'traitement', 'vérification']),
  ('6', 'CH-LPD-6', 'Art. 6 LPD - Traitement par un tiers. Le traitement peut être confié à un tiers si certaines conditions sont remplies.', ARRAY['tiers', 'sous-traitance', 'conditions', 'responsabilité']),
  ('8', 'CH-LPD-8', 'Art. 8 LPD - Sécurité des données. Les données doivent être protégées contre tout traitement non autorisé.', ARRAY['sécurité', 'protection', 'traitement non autorisé', 'mesures']),
  ('19', 'CH-LPD-19', 'Art. 19 LPD - Droit d''accès. Toute personne peut demander au responsable du traitement si des données la concernant sont traitées.', ARRAY['droit accès', 'demande', 'responsable', 'information']),
  ('20', 'CH-LPD-20', 'Art. 20 LPD - Exceptions au droit d''accès. Le droit d''accès peut être limité dans certains cas.', ARRAY['exceptions', 'limitation', 'droit accès', 'conditions']),
  ('25', 'CH-LPD-25', 'Art. 25 LPD - Droit à la rectification. Toute personne peut demander la rectification de données inexactes.', ARRAY['rectification', 'inexactes', 'demande', 'correction']),
  ('30', 'CH-LPD-30', 'Art. 30 LPD - Violation de la sécurité des données. En cas de violation, le responsable doit informer le PFPDT.', ARRAY['violation', 'sécurité', 'notification', 'PFPDT']),
  ('32', 'CH-LPD-32', 'Art. 32 LPD - Analyse d''impact. Une analyse d''impact doit être effectuée si le traitement présente un risque élevé.', ARRAY['analyse impact', 'risque élevé', 'évaluation', 'AIPD']),
  ('34', 'CH-LPD-34', 'Art. 34 LPD - Préposé fédéral. Le Préposé fédéral à la protection des données surveille l''application de la loi.', ARRAY['PFPDT', 'surveillance', 'autorité', 'contrôle'])
) AS vals(num, cite, content, kw)
CROSS JOIN public.legal_instruments li
CROSS JOIN public.legal_versions lv
WHERE li.instrument_uid = 'CH-LPD' 
  AND lv.instrument_id = li.id 
  AND lv.status = 'current'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles PA - CH
INSERT INTO public.legal_units (version_id, unit_type, article_number, cite_key, content_text, keywords, is_key_unit)
SELECT 
  lv.id,
  'article',
  vals.num,
  vals.cite,
  vals.content,
  vals.kw,
  true
FROM (VALUES
  ('26', 'CH-PA-26', 'Art. 26 PA - Droit d''être entendu. Les parties ont le droit de consulter les pièces du dossier.', ARRAY['droit être entendu', 'consultation', 'dossier', 'pièces']),
  ('27', 'CH-PA-27', 'Art. 27 PA - Restriction du droit d''accès. L''accès peut être restreint si un intérêt public ou privé prépondérant l''exige.', ARRAY['restriction', 'accès', 'intérêt', 'prépondérant']),
  ('28', 'CH-PA-28', 'Art. 28 PA - Pièces dont la consultation est refusée. L''autorité indique les pièces dont l''accès est refusé.', ARRAY['refus', 'pièces', 'indication', 'motivation']),
  ('29', 'CH-PA-29', 'Art. 29 PA - Droit de s''exprimer. Les parties ont le droit de s''exprimer sur les faits essentiels.', ARRAY['expression', 'faits', 'parties', 'droit']),
  ('30', 'CH-PA-30', 'Art. 30 PA - Audition des parties. L''autorité entend les parties avant de prendre sa décision.', ARRAY['audition', 'parties', 'décision', 'procédure']),
  ('32', 'CH-PA-32', 'Art. 32 PA - Droit à l''assistance. Les parties peuvent se faire assister par un mandataire.', ARRAY['assistance', 'mandataire', 'représentation', 'avocat']),
  ('35', 'CH-PA-35', 'Art. 35 PA - Décision écrite. Les décisions sont notifiées par écrit aux parties.', ARRAY['décision', 'écrit', 'notification', 'parties']),
  ('44', 'CH-PA-44', 'Art. 44 PA - Recours. La décision peut faire l''objet d''un recours.', ARRAY['recours', 'décision', 'voies de droit', 'contestation']),
  ('48', 'CH-PA-48', 'Art. 48 PA - Qualité pour recourir. A qualité pour recourir quiconque est touché par la décision.', ARRAY['qualité', 'recourir', 'touché', 'intérêt']),
  ('50', 'CH-PA-50', 'Art. 50 PA - Délai de recours. Le délai de recours est de 30 jours.', ARRAY['délai', 'recours', 'trente jours', 'computation'])
) AS vals(num, cite, content, kw)
CROSS JOIN public.legal_instruments li
CROSS JOIN public.legal_versions lv
WHERE li.instrument_uid = 'CH-PA' 
  AND lv.instrument_id = li.id 
  AND lv.status = 'current'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles LPA-VD
INSERT INTO public.legal_units (version_id, unit_type, article_number, cite_key, content_text, keywords, is_key_unit)
SELECT 
  lv.id,
  'article',
  vals.num,
  vals.cite,
  vals.content,
  vals.kw,
  true
FROM (VALUES
  ('26', 'VD-LPA-26', 'Art. 26 LPA-VD - Droit d''être entendu. Les parties ont le droit d''être entendues avant toute décision les concernant.', ARRAY['droit être entendu', 'parties', 'décision', 'procédure']),
  ('27', 'VD-LPA-27', 'Art. 27 LPA-VD - Accès au dossier. Les parties peuvent consulter le dossier de la cause.', ARRAY['accès', 'dossier', 'consultation', 'pièces']),
  ('30', 'VD-LPA-30', 'Art. 30 LPA-VD - Décision motivée. Toute décision doit être motivée.', ARRAY['décision', 'motivation', 'obligation', 'justification']),
  ('47', 'VD-LPA-47', 'Art. 47 LPA-VD - Recours au Tribunal cantonal. Le recours au Tribunal cantonal est ouvert contre les décisions cantonales.', ARRAY['recours', 'Tribunal cantonal', 'décision', 'voies de droit']),
  ('50', 'VD-LPA-50', 'Art. 50 LPA-VD - Délai de recours. Le délai de recours est de 30 jours dès la notification.', ARRAY['délai', 'recours', 'trente jours', 'notification'])
) AS vals(num, cite, content, kw)
CROSS JOIN public.legal_instruments li
CROSS JOIN public.legal_versions lv
WHERE li.instrument_uid = 'VD-LPA' 
  AND lv.instrument_id = li.id 
  AND lv.status = 'current'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles Cst - CH
INSERT INTO public.legal_units (version_id, unit_type, article_number, cite_key, content_text, keywords, is_key_unit)
SELECT 
  lv.id,
  'article',
  vals.num,
  vals.cite,
  vals.content,
  vals.kw,
  true
FROM (VALUES
  ('7', 'CH-CST-7', 'Art. 7 Cst - Dignité humaine. La dignité humaine doit être respectée et protégée.', ARRAY['dignité', 'humaine', 'respect', 'protection']),
  ('8', 'CH-CST-8', 'Art. 8 Cst - Égalité. Tous les êtres humains sont égaux devant la loi.', ARRAY['égalité', 'loi', 'discrimination', 'droits']),
  ('9', 'CH-CST-9', 'Art. 9 Cst - Protection contre l''arbitraire. Toute personne a le droit d''être traitée sans arbitraire.', ARRAY['arbitraire', 'bonne foi', 'protection', 'traitement']),
  ('10', 'CH-CST-10', 'Art. 10 Cst - Droit à la vie et liberté personnelle. Tout être humain a droit à la vie et à l''intégrité physique et psychique.', ARRAY['vie', 'intégrité', 'liberté', 'personnelle']),
  ('11', 'CH-CST-11', 'Art. 11 Cst - Protection des enfants et des jeunes. Les enfants et les jeunes ont droit à une protection particulière.', ARRAY['protection', 'enfants', 'jeunes', 'droits']),
  ('12', 'CH-CST-12', 'Art. 12 Cst - Droit d''obtenir de l''aide. Quiconque est dans une situation de détresse a droit à l''aide.', ARRAY['aide', 'détresse', 'droit', 'assistance']),
  ('13', 'CH-CST-13', 'Art. 13 Cst - Protection de la sphère privée. Toute personne a droit au respect de sa vie privée et familiale.', ARRAY['vie privée', 'familiale', 'protection', 'données']),
  ('29', 'CH-CST-29', 'Art. 29 Cst - Garanties de procédure. Toute personne a droit à ce que sa cause soit traitée équitablement.', ARRAY['procédure', 'équitable', 'garanties', 'délai raisonnable']),
  ('29a', 'CH-CST-29a', 'Art. 29a Cst - Garantie de l''accès au juge. Toute personne a droit à ce que sa cause soit jugée par une autorité judiciaire.', ARRAY['accès juge', 'autorité judiciaire', 'droit', 'justice']),
  ('35', 'CH-CST-35', 'Art. 35 Cst - Réalisation des droits fondamentaux. Les droits fondamentaux doivent être réalisés dans l''ensemble de l''ordre juridique.', ARRAY['réalisation', 'droits fondamentaux', 'ordre juridique', 'application'])
) AS vals(num, cite, content, kw)
CROSS JOIN public.legal_instruments li
CROSS JOIN public.legal_versions lv
WHERE li.instrument_uid = 'CH-CST' 
  AND lv.instrument_id = li.id 
  AND lv.status = 'current'
ON CONFLICT (cite_key) DO NOTHING;