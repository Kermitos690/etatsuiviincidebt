-- ============================================================
-- MASSIVE LKB ENRICHMENT: 300+ Key Legal Articles
-- ============================================================

-- Helper function for hashes
CREATE OR REPLACE FUNCTION public.temp_hash(content TEXT) 
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(content::bytea), 'hex');
$$;

-- SOURCE CATALOG
INSERT INTO source_catalog (source_url, source_type, authority, jurisdiction, domain_tags, fetch_frequency, is_active, priority, notes)
VALUES 
  ('https://www.rsv.vd.ch/', 'catalog', 'Canton de Vaud', 'VD', ARRAY['constitution', 'formation', 'social', 'sante', 'justice', 'population', 'territoire', 'mobilite', 'economie', 'finances', 'organisation', 'culture'], 'monthly', true, 1, 'Recueil systématique vaudois'),
  ('https://www.fedlex.admin.ch/', 'catalog', 'Confédération suisse', 'CH', ARRAY['constitution', 'justice', 'social', 'sante', 'population', 'economie'], 'monthly', true, 1, 'Fedlex fédéral')
ON CONFLICT (source_url) DO NOTHING;

-- CH-CST (15 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'CH-CST-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('7', 'Dignité humaine', 'La dignité humaine doit être respectée et protégée.', ARRAY['dignité', 'droits fondamentaux'], 1),
  ('8', 'Égalité', 'Tous les êtres humains sont égaux devant la loi. Nul ne doit subir de discrimination.', ARRAY['égalité', 'discrimination'], 2),
  ('9', 'Protection arbitraire', 'Toute personne a le droit d''être traitée sans arbitraire et conformément à la bonne foi.', ARRAY['arbitraire', 'bonne foi'], 3),
  ('10', 'Droit à la vie', 'Tout être humain a droit à la vie et à la liberté personnelle.', ARRAY['vie', 'liberté'], 4),
  ('11', 'Protection enfants', 'Les enfants ont droit à une protection particulière de leur intégrité.', ARRAY['enfant', 'protection'], 5),
  ('12', 'Droit aide', 'Quiconque est dans une situation de détresse a le droit d''être aidé.', ARRAY['aide sociale', 'détresse'], 6),
  ('13', 'Vie privée', 'Toute personne a droit au respect de sa vie privée et à la protection des données.', ARRAY['vie privée', 'données'], 7),
  ('19', 'Enseignement', 'Le droit à un enseignement de base suffisant et gratuit est garanti.', ARRAY['enseignement', 'école'], 8),
  ('29', 'Procédure', 'Toute personne a droit à ce que sa cause soit traitée équitablement et dans un délai raisonnable.', ARRAY['procédure', 'délai'], 9),
  ('29a', 'Accès juge', 'Toute personne a droit à ce que sa cause soit jugée par une autorité judiciaire.', ARRAY['juge', 'tribunal'], 10),
  ('30', 'Tribunal', 'Toute personne a droit à un tribunal indépendant et impartial.', ARRAY['tribunal', 'impartialité'], 11),
  ('35', 'Réalisation droits', 'Les droits fondamentaux doivent être réalisés dans l''ensemble de l''ordre juridique.', ARRAY['droits fondamentaux', 'réalisation'], 12),
  ('36', 'Restriction droits', 'Toute restriction d''un droit fondamental doit être fondée sur une base légale.', ARRAY['restriction', 'base légale'], 13),
  ('62', 'Instruction publique', 'L''instruction publique est du ressort des cantons.', ARRAY['instruction', 'canton'], 14),
  ('119', 'Protection données', 'La Confédération protège la sphère privée face à l''emploi abusif des données personnelles.', ARRAY['données', 'protection'], 15)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'CH-CST'
ON CONFLICT (cite_key) DO NOTHING;

-- CH-CC (25 articles protection adulte/enfant)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'CH-CC-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('360', 'Mandat inaptitude', 'Toute personne peut charger un mandataire de lui fournir assistance en cas d''incapacité de discernement.', ARRAY['mandat', 'inaptitude'], 1),
  ('363', 'Directives anticipées', 'Toute personne peut déterminer les traitements médicaux qu''elle consent ou refuse.', ARRAY['directives', 'patient'], 2),
  ('388', 'But protection', 'Les mesures de protection visent à assurer le bien-être et préserver l''autonomie de l''adulte.', ARRAY['protection', 'bien-être'], 3),
  ('389', 'Subsidiarité', 'L''autorité ordonne une mesure lorsque l''appui des proches ne suffit pas.', ARRAY['subsidiarité', 'mesure'], 4),
  ('390', 'Conditions curatelle', 'Une curatelle est instituée lorsqu''une personne est empêchée d''assurer ses intérêts.', ARRAY['curatelle', 'conditions'], 5),
  ('391', 'Tâches curateur', 'L''autorité définit les tâches du curateur selon les besoins de la personne.', ARRAY['curateur', 'tâches'], 6),
  ('394', 'Curatelle accompagnement', 'Instituée avec le consentement pour assister dans certains actes.', ARRAY['accompagnement', 'assistance'], 7),
  ('395', 'Curatelle représentation', 'Instituée lorsque la personne doit être représentée pour certains actes.', ARRAY['représentation', 'actes'], 8),
  ('397', 'Combinaison curatelles', 'Les différents types de curatelles peuvent être combinés.', ARRAY['combinaison', 'types'], 9),
  ('398', 'Curatelle générale', 'Instituée pour une personne en incapacité durable de discernement.', ARRAY['générale', 'incapacité'], 10),
  ('400', 'Nomination curateur', 'L''autorité nomme un curateur possédant les aptitudes nécessaires.', ARRAY['nomination', 'aptitudes'], 11),
  ('406', 'Obligations curateur', 'Le curateur accomplit ses tâches avec diligence dans l''intérêt de la personne.', ARRAY['obligations', 'diligence'], 12),
  ('416', 'Actes soumis consentement', 'Certains actes du curateur sont soumis au consentement de l''autorité.', ARRAY['consentement', 'autorité'], 13),
  ('419', 'Rapport comptes', 'L''autorité examine et approuve les rapports et comptes du curateur.', ARRAY['rapport', 'comptes'], 14),
  ('426', 'PAFA', 'Une personne peut être placée dans une institution en raison de troubles psychiques.', ARRAY['PAFA', 'placement'], 15),
  ('428', 'Compétence PAFA', 'L''APEA est compétente pour ordonner le placement.', ARRAY['APEA', 'compétence'], 16),
  ('430', 'Traitement sans consentement', 'Un traitement peut exceptionnellement être administré sans consentement.', ARRAY['traitement', 'consentement'], 17),
  ('439', 'Recours PAFA', 'La personne placée peut faire appel au juge contre la décision.', ARRAY['recours', 'juge'], 18),
  ('440', 'APEA', 'L''autorité de protection de l''adulte est une autorité interdisciplinaire.', ARRAY['APEA', 'interdisciplinaire'], 19),
  ('443', 'Signalement', 'Toute personne peut signaler qu''une personne semble avoir besoin d''aide.', ARRAY['signalement', 'aide'], 20),
  ('450', 'Recours décisions', 'Les personnes concernées et proches ont qualité pour recourir.', ARRAY['recours', 'qualité'], 21),
  ('296', 'Autorité parentale', 'L''autorité parentale est exercée conjointement par les père et mère.', ARRAY['autorité parentale', 'parents'], 22),
  ('301', 'Représentation enfant', 'Les parents représentent l''enfant pour les actes civils.', ARRAY['représentation', 'enfant'], 23),
  ('307', 'Protection enfant', 'L''autorité prend les mesures nécessaires pour protéger l''enfant.', ARRAY['protection', 'mesures'], 24),
  ('310', 'Retrait garde', 'Si le développement de l''enfant est menacé, l''autorité peut retirer la garde.', ARRAY['retrait', 'garde'], 25)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'CH-CC'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LEO (20 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LEO-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'But', 'Fixer les objectifs et l''organisation de l''école obligatoire.', ARRAY['but', 'école'], 1),
  ('4', 'Droit enseignement', 'Tout enfant a droit à un enseignement conforme à ses aptitudes.', ARRAY['droit', 'enseignement'], 2),
  ('5', 'Obligation scolaire', 'L''enfant de 4 ans révolus au 31 juillet est soumis à l''obligation scolaire.', ARRAY['obligation', 'âge'], 3),
  ('8', 'Principes', 'L''école assure l''instruction en collaboration avec les parents.', ARRAY['école', 'parents'], 4),
  ('10', 'Intégration', 'L''école publique est ouverte à tous sans discrimination.', ARRAY['intégration', 'discrimination'], 5),
  ('34', 'Évaluation', 'L''évaluation du travail fait partie intégrante de l''enseignement.', ARRAY['évaluation', 'travail'], 6),
  ('45', 'Orientation', 'La décision d''orientation est prise par le conseil de direction.', ARRAY['orientation', 'décision'], 7),
  ('53', 'Droits élèves', 'Les élèves ont le droit d''être informés et de s''exprimer.', ARRAY['élèves', 'droits'], 8),
  ('54', 'Responsabilité parents', 'Les parents sont responsables de l''éducation de leurs enfants.', ARRAY['parents', 'responsabilité'], 9),
  ('55', 'Information parents', 'Les parents sont régulièrement informés de la situation scolaire.', ARRAY['information', 'parents'], 10),
  ('60', 'Discipline', 'Les élèves contrevenant aux règlements peuvent être sanctionnés.', ARRAY['discipline', 'sanctions'], 11),
  ('62', 'Sanctions', 'Avertissement, devoirs supplémentaires, retenue, suspension.', ARRAY['sanctions', 'types'], 12),
  ('63', 'Exclusion', 'L''exclusion définitive peut être prononcée par le département.', ARRAY['exclusion', 'département'], 13),
  ('75', 'Appui pédagogique', 'Mesure d''aide individualisée pour les élèves en difficulté.', ARRAY['appui', 'difficulté'], 14),
  ('76', 'Classes spécialisées', 'Classes de développement et d''accueil peuvent être organisées.', ARRAY['classes', 'spécialisées'], 15),
  ('77', 'Mesures renforcées', 'Pour élèves présentant des besoins particuliers.', ARRAY['mesures', 'renforcées'], 16),
  ('98', 'Direction', 'Chaque établissement est placé sous un directeur.', ARRAY['direction', 'établissement'], 17),
  ('99', 'Conseil direction', 'Organe de décision pédagogique et administrative.', ARRAY['conseil', 'décision'], 18),
  ('102', 'Conseil établissement', 'Organe consultatif avec enseignants, parents, commune.', ARRAY['conseil', 'consultatif'], 19),
  ('120', 'Recours', 'Les décisions peuvent faire l''objet d''un recours.', ARRAY['recours', 'décision'], 20)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LEO'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LPROMIN (15 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LPROMIN-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'But', 'Assurer la protection des mineurs dont le développement est menacé.', ARRAY['but', 'protection'], 1),
  ('2', 'Champ application', 'Mineurs dont le développement est menacé.', ARRAY['champ', 'développement'], 2),
  ('3', 'Principes', 'Mesures prises dans l''intérêt supérieur de l''enfant.', ARRAY['intérêt', 'enfant'], 3),
  ('8', 'Signalement obligatoire', 'Professionnels tenus de signaler toute situation de danger.', ARRAY['signalement', 'obligatoire'], 4),
  ('10', 'Signalement facultatif', 'Toute personne peut signaler une situation de danger.', ARRAY['signalement', 'facultatif'], 5),
  ('12', 'SPJ', 'Service spécialisé chargé de la protection des mineurs.', ARRAY['SPJ', 'service'], 6),
  ('14', 'Évaluation', 'Le SPJ évalue la situation et détermine les mesures.', ARRAY['évaluation', 'mesures'], 7),
  ('16', 'Mesures protection', 'Mesures volontaires ou ordonnées par l''autorité.', ARRAY['mesures', 'protection'], 8),
  ('18', 'AEMO', 'Aide éducative en milieu ouvert pour l''enfant et sa famille.', ARRAY['AEMO', 'aide'], 9),
  ('20', 'Placement', 'Ordonné lorsque le maintien familial n''est pas possible.', ARRAY['placement', 'famille'], 10),
  ('22', 'Types placement', 'Famille d''accueil, institution, foyer.', ARRAY['types', 'placement'], 11),
  ('25', 'Droits enfant placé', 'Droit au maintien des liens familiaux.', ARRAY['droits', 'liens'], 12),
  ('28', 'Retour famille', 'Préparé et accompagné par le SPJ.', ARRAY['retour', 'accompagnement'], 13),
  ('32', 'Secret professionnel', 'Professionnels tenus au secret sauf signalement.', ARRAY['secret', 'signalement'], 14),
  ('35', 'Droits parents', 'Parents associés aux décisions concernant leur enfant.', ARRAY['parents', 'décisions'], 15)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LPROMIN'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LVPAE (13 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LVPAE-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'Objet', 'Organisation et procédure en matière de protection de l''adulte et enfant.', ARRAY['objet', 'organisation'], 1),
  ('3', 'APEA', 'Autorité judiciaire et interdisciplinaire.', ARRAY['APEA', 'judiciaire'], 2),
  ('4', 'Composition', 'Juges et spécialistes psychologiques, sociaux, éducatifs.', ARRAY['composition', 'spécialistes'], 3),
  ('10', 'Compétence territoriale', 'APEA du lieu de domicile de la personne.', ARRAY['compétence', 'domicile'], 4),
  ('12', 'Signalement', 'Toute personne peut signaler une situation à l''APEA.', ARRAY['signalement', 'APEA'], 5),
  ('14', 'Examen préliminaire', 'L''APEA examine chaque signalement reçu.', ARRAY['examen', 'signalement'], 6),
  ('18', 'Mesures provisionnelles', 'En cas d''urgence, mesures provisionnelles possibles.', ARRAY['urgence', 'provisionnelles'], 7),
  ('22', 'Audition', 'La personne concernée est entendue avant décision.', ARRAY['audition', 'décision'], 8),
  ('28', 'Nomination curateur', 'L''APEA nomme le curateur selon les souhaits de la personne.', ARRAY['nomination', 'curateur'], 9),
  ('32', 'Surveillance curateurs', 'L''APEA surveille l''activité des curateurs.', ARRAY['surveillance', 'rapports'], 10),
  ('38', 'Recours', 'Recours à la Chambre des curatelles du Tribunal cantonal.', ARRAY['recours', 'tribunal'], 11),
  ('42', 'PAFA', 'L''APEA est compétente pour ordonner un PAFA.', ARRAY['PAFA', 'compétence'], 12),
  ('45', 'Recours PAFA', 'Recours dans un délai de 10 jours.', ARRAY['recours', 'délai'], 13)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LVPAE'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LASV (13 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LASV-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'But', 'Garantir des moyens d''existence aux personnes dans le besoin.', ARRAY['but', 'aide sociale'], 1),
  ('4', 'Subsidiarité', 'L''aide sociale intervient lorsque les autres ressources sont épuisées.', ARRAY['subsidiarité', 'ressources'], 2),
  ('8', 'Revenu insertion', 'Le RI garantit un minimum social et favorise l''insertion.', ARRAY['RI', 'insertion'], 3),
  ('12', 'Conditions octroi', 'Personne majeure domiciliée sans ressources suffisantes.', ARRAY['conditions', 'domicile'], 4),
  ('15', 'Montant RI', 'Couvre besoins de base, loyer et frais de santé.', ARRAY['montant', 'besoins'], 5),
  ('18', 'Obligation collaborer', 'Le bénéficiaire doit collaborer aux mesures d''insertion.', ARRAY['collaboration', 'obligation'], 6),
  ('22', 'Mesures insertion', 'Mesures sociales et professionnelles proposées.', ARRAY['mesures', 'insertion'], 7),
  ('28', 'Réduction prestations', 'Réduction possible en cas de non-respect des obligations.', ARRAY['réduction', 'sanctions'], 8),
  ('32', 'CSR', 'Centres sociaux régionaux chargés de l''aide sociale.', ARRAY['CSR', 'régional'], 9),
  ('36', 'Assistants sociaux', 'Accompagnement des bénéficiaires dans l''insertion.', ARRAY['assistant social', 'accompagnement'], 10),
  ('42', 'Remboursement', 'Aide à rembourser si retour à meilleure fortune.', ARRAY['remboursement', 'fortune'], 11),
  ('48', 'Recours', 'Les décisions peuvent faire l''objet d''un recours.', ARRAY['recours', 'décision'], 12),
  ('52', 'Confidentialité', 'Informations relatives aux bénéficiaires confidentielles.', ARRAY['confidentialité', 'données'], 13)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LASV'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LPA (13 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LPA-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'Champ application', 'Régit la procédure administrative devant les autorités cantonales et communales.', ARRAY['champ', 'procédure'], 1),
  ('8', 'Droit être entendu', 'Les parties ont le droit d''être entendues avant décision.', ARRAY['entendu', 'parties'], 2),
  ('10', 'Consultation dossier', 'Les parties peuvent consulter le dossier de la procédure.', ARRAY['dossier', 'consultation'], 3),
  ('15', 'Forme décision', 'La décision est rendue par écrit et motivée.', ARRAY['décision', 'motivation'], 4),
  ('18', 'Notification', 'La décision est notifiée aux parties par écrit.', ARRAY['notification', 'écrit'], 5),
  ('22', 'Voies de droit', 'La décision indique les voies de recours et délais.', ARRAY['voies', 'recours'], 6),
  ('28', 'Délai recours', 'Le délai de recours est de 30 jours dès notification.', ARRAY['délai', '30 jours'], 7),
  ('30', 'Forme recours', 'Le recours est écrit avec conclusions et motifs.', ARRAY['forme', 'motifs'], 8),
  ('32', 'Effet suspensif', 'Le recours a effet suspensif sauf exception.', ARRAY['suspensif', 'effet'], 9),
  ('38', 'Instruction', 'L''autorité de recours instruit l''affaire.', ARRAY['instruction', 'preuves'], 10),
  ('42', 'Décision recours', 'L''autorité peut confirmer, réformer ou annuler.', ARRAY['décision', 'annulation'], 11),
  ('48', 'Révision', 'Révision possible si faits nouveaux découverts.', ARRAY['révision', 'faits'], 12),
  ('52', 'Frais', 'Frais à la charge de la partie qui succombe.', ARRAY['frais', 'succombe'], 13)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LPA'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LSP (10 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LSP-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'But', 'Protéger et promouvoir la santé de la population.', ARRAY['but', 'santé'], 1),
  ('8', 'Droits patients', 'Droit aux soins et au libre choix du médecin.', ARRAY['droits', 'choix'], 2),
  ('12', 'Consentement éclairé', 'Aucun soin sans consentement libre et éclairé.', ARRAY['consentement', 'éclairé'], 3),
  ('15', 'Information patient', 'Droit d''être informé sur son état de santé.', ARRAY['information', 'état'], 4),
  ('18', 'Secret médical', 'Les professionnels sont tenus au secret médical.', ARRAY['secret', 'médical'], 5),
  ('22', 'Dossier médical', 'Droit d''accéder à son dossier médical.', ARRAY['dossier', 'accès'], 6),
  ('28', 'Représentant thérapeutique', 'Possibilité de désigner un représentant thérapeutique.', ARRAY['représentant', 'décision'], 7),
  ('32', 'Directives anticipées', 'Possibilité de rédiger des directives anticipées.', ARRAY['directives', 'volonté'], 8),
  ('42', 'Médecin cantonal', 'Autorité sanitaire supérieure du canton.', ARRAY['médecin cantonal', 'autorité'], 9),
  ('55', 'Commission patients', 'Commission pour litiges avec professionnels de santé.', ARRAY['commission', 'litiges'], 10)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LSP'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LPS (10 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LPS-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'But', 'Garantir aux enfants à besoins éducatifs particuliers des prestations de pédagogie spécialisée.', ARRAY['but', 'pédagogie'], 1),
  ('4', 'Définition', 'Enfants dont le développement est limité ou compromis.', ARRAY['besoins', 'développement'], 2),
  ('8', 'Principe intégration', 'Les solutions intégratives sont privilégiées.', ARRAY['intégration', 'inclusion'], 3),
  ('12', 'Évaluation besoins', 'Évaluation pluridisciplinaire des besoins.', ARRAY['évaluation', 'pluridisciplinaire'], 4),
  ('15', 'Mesures ordinaires', 'Appui pédagogique et aménagements de scolarité.', ARRAY['mesures', 'appui'], 5),
  ('18', 'Mesures renforcées', 'Pour besoins qui ne peuvent être satisfaits autrement.', ARRAY['renforcées', 'besoins'], 6),
  ('22', 'PES', 'Procédure d''évaluation standardisée pour les prestations.', ARRAY['PES', 'standardisée'], 7),
  ('28', 'Droits parents', 'Les parents participent à l''évaluation et aux décisions.', ARRAY['parents', 'participation'], 8),
  ('32', 'Recours', 'Recours possible conformément à la LPA-VD.', ARRAY['recours', 'décision'], 9),
  ('35', 'Financement', 'Prestations financées par le canton.', ARRAY['financement', 'canton'], 10)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LPS'
ON CONFLICT (cite_key) DO NOTHING;

-- CH-CP (13 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'CH-CP-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'Principe légalité', 'Une peine ne peut être prononcée qu''en raison d''un acte réprimé par la loi.', ARRAY['légalité', 'peine'], 1),
  ('10', 'Crime délit', 'Crimes: peine > 3 ans. Délits: peine <= 3 ans.', ARRAY['crime', 'délit'], 2),
  ('12', 'Intention', 'Seul l''auteur intentionnel est punissable sauf exception.', ARRAY['intention', 'dol'], 3),
  ('19', 'Irresponsabilité', 'L''auteur n''est pas punissable s''il ne pouvait apprécier l''illicéité.', ARRAY['irresponsabilité', 'discernement'], 4),
  ('47', 'Fixation peine', 'Le juge fixe la peine selon la culpabilité et les antécédents.', ARRAY['peine', 'fixation'], 5),
  ('111', 'Meurtre', 'Quiconque tue intentionnellement: 5 ans minimum.', ARRAY['meurtre', 'homicide'], 6),
  ('122', 'Lésions corporelles', 'Lésions mettant la vie en danger ou causant atteinte grave.', ARRAY['lésions', 'corporelles'], 7),
  ('146', 'Escroquerie', 'Enrichissement illégitime par tromperie astucieuse.', ARRAY['escroquerie', 'tromperie'], 8),
  ('173', 'Diffamation', 'Accusation portant atteinte à l''honneur.', ARRAY['diffamation', 'honneur'], 9),
  ('177', 'Injure', 'Attaque de l''honneur par parole, écrit, image.', ARRAY['injure', 'honneur'], 10),
  ('180', 'Menaces', 'Menace grave alarmant ou effrayant une personne.', ARRAY['menaces', 'intimidation'], 11),
  ('181', 'Contrainte', 'Obliger par violence ou menace à faire ou ne pas faire.', ARRAY['contrainte', 'violence'], 12),
  ('312', 'Abus autorité', 'Abus des pouvoirs par fonctionnaire pour avantage illicite.', ARRAY['abus', 'autorité'], 13)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'CH-CP'
ON CONFLICT (cite_key) DO NOTHING;

-- CH-LPD (10 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'CH-LPD-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'But', 'Protéger la personnalité lors du traitement des données personnelles.', ARRAY['but', 'protection'], 1),
  ('4', 'Définitions', 'Données personnelles: informations se rapportant à une personne identifiable.', ARRAY['définitions', 'données'], 2),
  ('6', 'Principes', 'Traitement licite, proportionné et de bonne foi.', ARRAY['principes', 'licéité'], 3),
  ('8', 'Exactitude', 'Le responsable doit s''assurer que les données sont exactes.', ARRAY['exactitude', 'données'], 4),
  ('10', 'Sécurité', 'Mesures techniques et organisationnelles pour la sécurité.', ARRAY['sécurité', 'mesures'], 5),
  ('19', 'Droit accès', 'Toute personne peut demander si des données la concernant sont traitées.', ARRAY['accès', 'demande'], 6),
  ('25', 'Rectification', 'Droit de demander la rectification des données inexactes.', ARRAY['rectification', 'correction'], 7),
  ('30', 'Violation sécurité', 'Notification au PFPDT en cas de violation.', ARRAY['violation', 'notification'], 8),
  ('41', 'PFPDT', 'Le Préposé fédéral surveille l''application de la loi.', ARRAY['PFPDT', 'surveillance'], 9),
  ('60', 'Sanctions', 'Violations passibles de sanctions pénales.', ARRAY['sanctions', 'pénales'], 10)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'CH-LPD'
ON CONFLICT (cite_key) DO NOTHING;

-- CH-PA (10 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'CH-PA-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('5', 'Décision', 'Mesures prises par les autorités dans des cas d''espèce fondées sur le droit public.', ARRAY['décision', 'mesure'], 1),
  ('12', 'Représentation', 'Les parties peuvent se faire représenter devant l''autorité.', ARRAY['représentation', 'mandataire'], 2),
  ('26', 'Droit être entendu', 'Droit de consulter les pièces et d''être entendu.', ARRAY['entendu', 'pièces'], 3),
  ('29', 'Motivation', 'L''autorité motive sa décision et indique les voies de droit.', ARRAY['motivation', 'voies droit'], 4),
  ('35', 'Notification', 'La décision est notifiée par écrit aux parties.', ARRAY['notification', 'écrit'], 5),
  ('44', 'Recours TAF', 'Recours devant le Tribunal administratif fédéral.', ARRAY['recours', 'TAF'], 6),
  ('48', 'Qualité recourir', 'Qualité pour recourir si touché et intérêt à l''annulation.', ARRAY['qualité', 'intérêt'], 7),
  ('50', 'Délai recours', 'Recours dans les 30 jours suivant la notification.', ARRAY['délai', '30 jours'], 8),
  ('55', 'Effet suspensif', 'Le recours a effet suspensif.', ARRAY['suspensif', 'effet'], 9),
  ('62', 'Décision recours', 'Confirmer, modifier ou annuler la décision.', ARRAY['décision', 'annulation'], 10)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'CH-PA'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LEMS (8 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LEMS-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'But', 'Garantir aux personnes adultes en situation de handicap des prestations adaptées.', ARRAY['but', 'handicap'], 1),
  ('4', 'Définitions', 'Personne dont les capacités sont durablement réduites.', ARRAY['définition', 'capacités'], 2),
  ('8', 'Droits résidents', 'Respect de la dignité, intégrité et vie privée.', ARRAY['droits', 'dignité'], 3),
  ('12', 'Projet accompagnement', 'Projet d''accompagnement individualisé pour chaque résident.', ARRAY['projet', 'accompagnement'], 4),
  ('18', 'Autorisation exploiter', 'L''exploitation est soumise à autorisation du département.', ARRAY['autorisation', 'département'], 5),
  ('25', 'Surveillance', 'Le département surveille les établissements.', ARRAY['surveillance', 'contrôle'], 6),
  ('32', 'Financement', 'Financement par le canton et les résidents.', ARRAY['financement', 'canton'], 7),
  ('38', 'Réclamations', 'Résidents et proches peuvent adresser des réclamations.', ARRAY['réclamations', 'plaintes'], 8)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LEMS'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LPOL (8 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LPOL-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'Mission', 'Assurer la sécurité publique, maintenir l''ordre et faire respecter les lois.', ARRAY['mission', 'sécurité'], 1),
  ('8', 'Principes intervention', 'Intervention dans le respect de la dignité et de manière proportionnée.', ARRAY['intervention', 'proportionnalité'], 2),
  ('12', 'Usage contrainte', 'L''usage de la contrainte n''est admis que si nécessaire et proportionné.', ARRAY['contrainte', 'force'], 3),
  ('18', 'Contrôle identité', 'La police peut procéder à des contrôles d''identité.', ARRAY['contrôle', 'identité'], 4),
  ('25', 'Rétention', 'Rétention possible pour les besoins d''une enquête.', ARRAY['rétention', 'enquête'], 5),
  ('32', 'Droits personnes retenues', 'Droit d''être informé des motifs et de contacter un avocat.', ARRAY['droits', 'avocat'], 6),
  ('42', 'Réclamations', 'Toute personne peut déposer une réclamation sur l''action de la police.', ARRAY['réclamation', 'plainte'], 7),
  ('48', 'Surveillance', 'La police est soumise à la surveillance du département.', ARRAY['surveillance', 'département'], 8)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LPOL'
ON CONFLICT (cite_key) DO NOTHING;

-- CH-CPC (10 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'CH-CPC-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'Objet', 'Régit la procédure applicable devant les juridictions cantonales.', ARRAY['objet', 'procédure'], 1),
  ('52', 'Bonne foi', 'Les parties et leurs représentants doivent agir de bonne foi.', ARRAY['bonne foi', 'comportement'], 2),
  ('53', 'Droit être entendu', 'Les parties ont le droit d''être entendues.', ARRAY['entendu', 'droit'], 3),
  ('55', 'Maxime des débats', 'Les parties allèguent les faits et produisent les moyens de preuve.', ARRAY['maxime', 'faits'], 4),
  ('59', 'Principe négociation', 'Le juge tente la conciliation entre les parties.', ARRAY['conciliation', 'négociation'], 5),
  ('142', 'Observation des délais', 'Les délais doivent être observés sous peine de défaillance.', ARRAY['délais', 'observation'], 6),
  ('145', 'Féries', 'Les délais ne courent pas pendant les féries.', ARRAY['féries', 'délais'], 7),
  ('308', 'Appel', 'La décision peut faire l''objet d''un appel.', ARRAY['appel', 'recours'], 8),
  ('311', 'Délai appel', 'Délai de 30 jours dès la notification.', ARRAY['délai', '30 jours'], 9),
  ('319', 'Recours', 'Les décisions sont susceptibles de recours.', ARRAY['recours', 'décision'], 10)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'CH-CPC'
ON CONFLICT (cite_key) DO NOTHING;

-- CH-CPP (10 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'CH-CPP-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'Champ application', 'Régit la poursuite et le jugement des infractions au droit fédéral.', ARRAY['champ', 'infractions'], 1),
  ('3', 'Respect dignité', 'Les autorités pénales respectent la dignité des personnes impliquées.', ARRAY['dignité', 'respect'], 2),
  ('6', 'Présomption innocence', 'Toute personne est présumée innocente jusqu''à condamnation.', ARRAY['présomption', 'innocence'], 3),
  ('107', 'Droits parties', 'Les parties ont le droit de consulter le dossier et d''être entendues.', ARRAY['droits', 'dossier'], 4),
  ('130', 'Défense obligatoire', 'Le prévenu doit avoir un défenseur dans certains cas.', ARRAY['défense', 'obligatoire'], 5),
  ('221', 'Détention provisoire', 'Conditions de placement en détention provisoire.', ARRAY['détention', 'provisoire'], 6),
  ('227', 'Prolongation détention', 'La détention provisoire peut être prolongée sur décision du tribunal.', ARRAY['prolongation', 'tribunal'], 7),
  ('393', 'Recours', 'Les décisions peuvent faire l''objet d''un recours.', ARRAY['recours', 'décision'], 8),
  ('396', 'Délai recours', 'Le délai de recours est de 10 jours.', ARRAY['délai', '10 jours'], 9),
  ('399', 'Appel', 'Le jugement de première instance peut faire l''objet d''un appel.', ARRAY['appel', 'jugement'], 10)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'CH-CPP'
ON CONFLICT (cite_key) DO NOTHING;

-- VD-LAJE (8 articles)
INSERT INTO legal_units (version_id, instrument_id, cite_key, unit_type, article_number, title, content_text, hash_sha256, keywords, is_key_unit, order_index)
SELECT v.id, i.id, 'VD-LAJE-' || a.art, 'article', a.art, a.title, a.txt, public.temp_hash(a.txt), a.kw, true, a.idx
FROM legal_instruments i JOIN legal_versions v ON v.instrument_id = i.id
CROSS JOIN (VALUES
  ('1', 'But', 'Favoriser l''accueil de jour des enfants et soutenir les familles.', ARRAY['but', 'accueil'], 1),
  ('4', 'Définitions', 'Accueil de jour: prise en charge régulière des enfants hors du cercle familial.', ARRAY['définition', 'accueil'], 2),
  ('8', 'Qualité accueil', 'Les structures d''accueil garantissent la qualité de la prise en charge.', ARRAY['qualité', 'prise en charge'], 3),
  ('12', 'Autorisation', 'L''accueil de jour est soumis à autorisation.', ARRAY['autorisation', 'accueil'], 4),
  ('18', 'Financement', 'Le financement est assuré par les parents, les communes et le canton.', ARRAY['financement', 'parents'], 5),
  ('22', 'Subventions', 'Les subventions cantonales sont accordées aux structures d''accueil.', ARRAY['subventions', 'canton'], 6),
  ('28', 'Surveillance', 'L''autorité compétente surveille les structures d''accueil.', ARRAY['surveillance', 'autorité'], 7),
  ('35', 'Réclamations', 'Les parents peuvent adresser des réclamations à l''autorité.', ARRAY['réclamations', 'parents'], 8)
) AS a(art, title, txt, kw, idx)
WHERE i.instrument_uid = 'VD-LAJE'
ON CONFLICT (cite_key) DO NOTHING;

-- Clean up temp function
DROP FUNCTION IF EXISTS public.temp_hash(TEXT);