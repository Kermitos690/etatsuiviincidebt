-- ============================================================
-- SEED COMPLET: Legal Knowledge Base (LKB) - CORRECTIF
-- 12 Domaines VD + Lois fédérales et cantonales + Articles clés
-- ============================================================

-- 1. LEGAL DOMAINS (12 domaines juridiques VD)
INSERT INTO legal_domains (code, label_fr, description, icon, display_order, keywords) VALUES
  ('CONSTITUTION', 'Constitution & Organisation', 'Droit constitutionnel vaudois, organisation de l''État, droits fondamentaux', 'landmark', 1, ARRAY['constitution', 'état', 'organisation', 'droits fondamentaux', 'souveraineté']),
  ('EDUCATION', 'Éducation & Formation', 'Enseignement obligatoire, secondaire, formation professionnelle, hautes écoles', 'graduation-cap', 2, ARRAY['école', 'enseignement', 'élève', 'formation', 'apprentissage', 'études']),
  ('SOCIAL', 'Social & Famille', 'Protection de l''enfance, aide sociale, famille, intégration', 'users', 3, ARRAY['social', 'aide', 'famille', 'enfant', 'protection', 'intégration']),
  ('SANTE', 'Santé & Sanitaire', 'Santé publique, établissements sanitaires, professions médicales', 'heart-pulse', 4, ARRAY['santé', 'médical', 'hôpital', 'soins', 'patient']),
  ('JUSTICE', 'Justice & Procédure', 'Procédure administrative, juridictions, exécution des peines', 'scale', 5, ARRAY['justice', 'tribunal', 'procédure', 'recours', 'jugement']),
  ('PROTECTION_ADULTE', 'Protection de l''adulte', 'Curatelle, tutelle, APEA, mesures de protection', 'shield', 6, ARRAY['curatelle', 'tutelle', 'protection', 'adulte', 'APEA', 'curateur']),
  ('FINANCES', 'Finances & Fiscalité', 'Impôts, finances communales, comptabilité publique', 'wallet', 7, ARRAY['impôt', 'fiscal', 'finances', 'budget', 'commune']),
  ('TERRITOIRE', 'Territoire & Environnement', 'Aménagement, constructions, environnement, routes', 'map', 8, ARRAY['construction', 'permis', 'territoire', 'environnement', 'route']),
  ('ECONOMIE', 'Économie & Emploi', 'Activités économiques, agriculture, tourisme, emploi', 'briefcase', 9, ARRAY['économie', 'emploi', 'entreprise', 'agriculture', 'tourisme']),
  ('SECURITE', 'Sécurité & Police', 'Police, sécurité publique, circulation routière', 'shield-alert', 10, ARRAY['police', 'sécurité', 'circulation', 'ordre public']),
  ('CULTURE', 'Culture & Patrimoine', 'Patrimoine, archives, bibliothèques, sports', 'book', 11, ARRAY['culture', 'patrimoine', 'archives', 'sports', 'loisirs']),
  ('DONNEES', 'Protection des données', 'Données personnelles, transparence, information', 'lock', 12, ARRAY['données', 'vie privée', 'LIPAD', 'transparence', 'information'])
ON CONFLICT (code) DO UPDATE SET 
  label_fr = EXCLUDED.label_fr,
  description = EXCLUDED.description,
  keywords = EXCLUDED.keywords;

-- 2. LEGAL INSTRUMENTS - Lois fédérales principales
INSERT INTO legal_instruments (instrument_uid, title, short_title, jurisdiction, domain_tags, blv_or_rs_id, current_status) VALUES
  -- Constitution & Codes fédéraux
  ('CH-CST', 'Constitution fédérale de la Confédération suisse', 'Cst.', 'CH', ARRAY['CONSTITUTION'], 'RS 101', 'in_force'),
  ('CH-CC', 'Code civil suisse', 'CC', 'CH', ARRAY['PROTECTION_ADULTE', 'SOCIAL'], 'RS 210', 'in_force'),
  ('CH-CO', 'Code des obligations', 'CO', 'CH', ARRAY['ECONOMIE'], 'RS 220', 'in_force'),
  ('CH-CP', 'Code pénal suisse', 'CP', 'CH', ARRAY['JUSTICE', 'SECURITE'], 'RS 311.0', 'in_force'),
  ('CH-CPC', 'Code de procédure civile', 'CPC', 'CH', ARRAY['JUSTICE'], 'RS 272', 'in_force'),
  ('CH-CPP', 'Code de procédure pénale suisse', 'CPP', 'CH', ARRAY['JUSTICE'], 'RS 312.0', 'in_force'),
  ('CH-LPD', 'Loi fédérale sur la protection des données', 'LPD', 'CH', ARRAY['DONNEES'], 'RS 235.1', 'in_force'),
  ('CH-LTRANS', 'Loi fédérale sur le principe de la transparence', 'LTrans', 'CH', ARRAY['DONNEES'], 'RS 152.3', 'in_force'),
  ('CH-LPGA', 'Loi fédérale sur la partie générale du droit des assurances sociales', 'LPGA', 'CH', ARRAY['SOCIAL'], 'RS 830.1', 'in_force'),
  ('CH-LAI', 'Loi fédérale sur l''assurance-invalidité', 'LAI', 'CH', ARRAY['SOCIAL', 'SANTE'], 'RS 831.20', 'in_force'),
  ('CH-LAVS', 'Loi fédérale sur l''assurance-vieillesse et survivants', 'LAVS', 'CH', ARRAY['SOCIAL'], 'RS 831.10', 'in_force'),
  ('CH-LAMAL', 'Loi fédérale sur l''assurance-maladie', 'LAMal', 'CH', ARRAY['SANTE'], 'RS 832.10', 'in_force'),
  ('CH-LAA', 'Loi fédérale sur l''assurance-accidents', 'LAA', 'CH', ARRAY['SOCIAL', 'SANTE'], 'RS 832.20', 'in_force'),
  ('CH-LACI', 'Loi fédérale sur l''assurance-chômage', 'LACI', 'CH', ARRAY['SOCIAL', 'ECONOMIE'], 'RS 837.0', 'in_force'),
  ('CH-LTF', 'Loi sur le Tribunal fédéral', 'LTF', 'CH', ARRAY['JUSTICE'], 'RS 173.110', 'in_force'),
  ('CH-PA', 'Loi fédérale sur la procédure administrative', 'PA', 'CH', ARRAY['JUSTICE'], 'RS 172.021', 'in_force'),
  ('CH-LHES', 'Loi fédérale sur l''encouragement des hautes écoles', 'LEHE', 'CH', ARRAY['EDUCATION'], 'RS 414.20', 'in_force'),
  ('CH-LFPR', 'Loi fédérale sur la formation professionnelle', 'LFPr', 'CH', ARRAY['EDUCATION'], 'RS 412.10', 'in_force')
ON CONFLICT (instrument_uid) DO UPDATE SET 
  title = EXCLUDED.title,
  short_title = EXCLUDED.short_title,
  domain_tags = EXCLUDED.domain_tags,
  current_status = EXCLUDED.current_status;

-- 3. LEGAL INSTRUMENTS - Lois cantonales VD principales
INSERT INTO legal_instruments (instrument_uid, title, short_title, jurisdiction, domain_tags, blv_or_rs_id, current_status) VALUES
  ('VD-CST', 'Constitution du Canton de Vaud', 'Cst-VD', 'VD', ARRAY['CONSTITUTION'], 'BLV 101.01', 'in_force'),
  ('VD-LEO', 'Loi sur l''enseignement obligatoire', 'LEO', 'VD', ARRAY['EDUCATION'], 'BLV 400.02', 'in_force'),
  ('VD-RLEO', 'Règlement d''application de la LEO', 'RLEO', 'VD', ARRAY['EDUCATION'], 'BLV 400.02.1', 'in_force'),
  ('VD-LPS', 'Loi sur l''enseignement secondaire supérieur', 'LPS', 'VD', ARRAY['EDUCATION'], 'BLV 412.11', 'in_force'),
  ('VD-LEPR', 'Loi sur l''enseignement privé', 'LEPr', 'VD', ARRAY['EDUCATION'], 'BLV 400.40', 'in_force'),
  ('VD-LHEP', 'Loi sur la Haute école pédagogique', 'LHEP', 'VD', ARRAY['EDUCATION'], 'BLV 419.11', 'in_force'),
  ('VD-LUL', 'Loi sur l''Université de Lausanne', 'LUL', 'VD', ARRAY['EDUCATION'], 'BLV 414.11', 'in_force'),
  ('VD-LVLFPR', 'Loi d''application de la loi fédérale sur la formation professionnelle', 'LVLFPr', 'VD', ARRAY['EDUCATION'], 'BLV 413.01', 'in_force'),
  ('VD-LASV', 'Loi sur l''action sociale vaudoise', 'LASV', 'VD', ARRAY['SOCIAL'], 'BLV 850.051', 'in_force'),
  ('VD-RLASV', 'Règlement d''application de la LASV', 'RLASV', 'VD', ARRAY['SOCIAL'], 'BLV 850.051.1', 'in_force'),
  ('VD-LPCFAM', 'Loi sur les prestations complémentaires pour familles', 'LPCFam', 'VD', ARRAY['SOCIAL'], 'BLV 850.053', 'in_force'),
  ('VD-LAJE', 'Loi sur l''accueil de jour des enfants', 'LAJE', 'VD', ARRAY['SOCIAL'], 'BLV 211.22', 'in_force'),
  ('VD-LPROMIN', 'Loi sur la protection des mineurs', 'LProMin', 'VD', ARRAY['SOCIAL', 'PROTECTION_ADULTE'], 'BLV 850.41', 'in_force'),
  ('VD-LVLAVI', 'Loi d''application de la loi fédérale sur l''aide aux victimes', 'LVLAVI', 'VD', ARRAY['SOCIAL', 'JUSTICE'], 'BLV 312.51', 'in_force'),
  ('VD-LVPAE', 'Loi d''application du droit fédéral de la protection de l''adulte et de l''enfant', 'LVPAE', 'VD', ARRAY['PROTECTION_ADULTE'], 'BLV 211.255', 'in_force'),
  ('VD-RLVPAE', 'Règlement d''application de la LVPAE', 'RLVPAE', 'VD', ARRAY['PROTECTION_ADULTE'], 'BLV 211.255.1', 'in_force'),
  ('VD-LSP', 'Loi sur la santé publique', 'LSP', 'VD', ARRAY['SANTE'], 'BLV 800.01', 'in_force'),
  ('VD-LPFES', 'Loi sur les prestations et financements en matière de santé', 'LPFES', 'VD', ARRAY['SANTE'], 'BLV 800.011', 'in_force'),
  ('VD-LSR', 'Loi sur la responsabilité médicale', 'LSR', 'VD', ARRAY['SANTE'], 'BLV 800.03', 'in_force'),
  ('VD-LEMS', 'Loi sur les établissements médico-sociaux', 'LEMS', 'VD', ARRAY['SANTE', 'SOCIAL'], 'BLV 850.11', 'in_force'),
  ('VD-LPA', 'Loi sur la procédure administrative', 'LPA-VD', 'VD', ARRAY['JUSTICE'], 'BLV 173.36', 'in_force'),
  ('VD-LJPA', 'Loi sur la juridiction et la procédure administratives', 'LJPA', 'VD', ARRAY['JUSTICE'], 'BLV 173.36', 'in_force'),
  ('VD-LEP', 'Loi sur l''exécution des peines', 'LEP', 'VD', ARRAY['JUSTICE'], 'BLV 340.01', 'in_force'),
  ('VD-LPOL', 'Loi sur la police cantonale', 'LPol', 'VD', ARRAY['SECURITE'], 'BLV 133.11', 'in_force'),
  ('VD-LICPP', 'Loi d''introduction du Code de procédure pénale suisse', 'LiCPP', 'VD', ARRAY['JUSTICE'], 'BLV 312.01', 'in_force'),
  ('VD-LOJV', 'Loi sur l''organisation judiciaire', 'LOJV', 'VD', ARRAY['JUSTICE'], 'BLV 173.01', 'in_force'),
  ('VD-LIPAD', 'Loi sur l''information du public, l''accès aux documents et la protection des données personnelles', 'LInfo', 'VD', ARRAY['DONNEES'], 'BLV 170.21', 'in_force'),
  ('VD-LI', 'Loi sur les impôts directs cantonaux', 'LI', 'VD', ARRAY['FINANCES'], 'BLV 642.11', 'in_force'),
  ('VD-LICOM', 'Loi sur les impôts communaux', 'LICom', 'VD', ARRAY['FINANCES'], 'BLV 650.11', 'in_force'),
  ('VD-LFIN', 'Loi sur les finances', 'LFin', 'VD', ARRAY['FINANCES'], 'BLV 610.11', 'in_force'),
  ('VD-LMP', 'Loi sur les marchés publics', 'LMP-VD', 'VD', ARRAY['FINANCES', 'ECONOMIE'], 'BLV 726.01', 'in_force'),
  ('VD-LATC', 'Loi sur l''aménagement du territoire et les constructions', 'LATC', 'VD', ARRAY['TERRITOIRE'], 'BLV 700.11', 'in_force'),
  ('VD-RLATC', 'Règlement d''application de la LATC', 'RLATC', 'VD', ARRAY['TERRITOIRE'], 'BLV 700.11.1', 'in_force'),
  ('VD-LVLENE', 'Loi vaudoise sur l''énergie', 'LVLEne', 'VD', ARRAY['TERRITOIRE'], 'BLV 730.01', 'in_force'),
  ('VD-LFAUNE', 'Loi sur la faune', 'LFaune', 'VD', ARRAY['TERRITOIRE'], 'BLV 922.01', 'in_force'),
  ('VD-LPECHE', 'Loi sur la pêche', 'LPêche', 'VD', ARRAY['TERRITOIRE'], 'BLV 923.01', 'in_force'),
  ('VD-LROU', 'Loi sur les routes', 'LRou', 'VD', ARRAY['TERRITOIRE', 'SECURITE'], 'BLV 725.01', 'in_force'),
  ('VD-LEAE', 'Loi sur l''appui au développement économique', 'LEAE', 'VD', ARRAY['ECONOMIE'], 'BLV 900.05', 'in_force'),
  ('VD-LAGR', 'Loi sur l''agriculture', 'LAgr', 'VD', ARRAY['ECONOMIE'], 'BLV 910.01', 'in_force'),
  ('VD-LTOUR', 'Loi sur le tourisme', 'LTour', 'VD', ARRAY['ECONOMIE'], 'BLV 935.01', 'in_force'),
  ('VD-LOCE', 'Loi sur l''organisation du Conseil d''État', 'LOCE', 'VD', ARRAY['CONSTITUTION'], 'BLV 172.115', 'in_force'),
  ('VD-LC', 'Loi sur les communes', 'LC', 'VD', ARRAY['CONSTITUTION'], 'BLV 175.11', 'in_force'),
  ('VD-LDCV', 'Loi sur les droits civiques vaudois', 'LDCV', 'VD', ARRAY['CONSTITUTION'], 'BLV 160.11', 'in_force'),
  ('VD-LPERS', 'Loi sur le personnel de l''État de Vaud', 'LPers-VD', 'VD', ARRAY['CONSTITUTION'], 'BLV 172.31', 'in_force')
ON CONFLICT (instrument_uid) DO UPDATE SET 
  title = EXCLUDED.title,
  short_title = EXCLUDED.short_title,
  domain_tags = EXCLUDED.domain_tags,
  current_status = EXCLUDED.current_status;

-- 4. Create legal versions for all instruments
INSERT INTO legal_versions (instrument_id, version_number, status, valid_from, source_set_hash)
SELECT 
  li.id,
  1,
  'in_force',
  '2024-01-01'::date,
  encode(sha256(li.instrument_uid::bytea), 'hex')
FROM legal_instruments li
WHERE NOT EXISTS (
  SELECT 1 FROM legal_versions lv WHERE lv.instrument_id = li.id
);

-- 5. LEGAL UNITS - Articles clés du Code civil (Protection adulte)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id,
  lv.id,
  art.cite_key,
  'article',
  art.article_num,
  art.order_idx,
  art.content,
  encode(sha256(art.content::bytea), 'hex'),
  art.keywords,
  true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 388 CC', '388', 388, 'Les mesures de protection de l''adulte ont pour but d''assurer l''assistance et la représentation des personnes qui ont besoin d''aide.', ARRAY['protection', 'adulte', 'assistance', 'représentation']),
  ('Art. 389 CC', '389', 389, 'L''autorité de protection de l''adulte ordonne une mesure lorsqu''une personne n''est plus en mesure d''assurer la sauvegarde de ses intérêts en raison d''une déficience mentale, de troubles psychiques ou d''un autre état de faiblesse.', ARRAY['APEA', 'mesure', 'déficience', 'troubles', 'faiblesse']),
  ('Art. 390 CC', '390', 390, 'L''autorité de protection de l''adulte institue une curatelle lorsqu''une personne majeure est partiellement ou totalement empêchée d''assurer elle-même la sauvegarde de ses intérêts.', ARRAY['curatelle', 'institution', 'majeur', 'intérêts']),
  ('Art. 393 CC', '393', 393, 'Une curatelle d''accompagnement est instituée, avec le consentement de la personne concernée, lorsque celle-ci doit être assistée pour accomplir certains actes.', ARRAY['curatelle', 'accompagnement', 'consentement', 'assistance']),
  ('Art. 394 CC', '394', 394, 'Une curatelle de représentation est instituée lorsque la personne concernée ne peut accomplir certains actes et doit de ce fait être représentée.', ARRAY['curatelle', 'représentation', 'actes']),
  ('Art. 395 CC', '395', 395, 'L''autorité de protection de l''adulte peut limiter l''exercice des droits civils de la personne concernée dans la mesure nécessaire à sa protection.', ARRAY['droits civils', 'limitation', 'protection']),
  ('Art. 396 CC', '396', 396, 'Une curatelle de coopération est instituée lorsque, pour protéger la personne, il y a lieu de subordonner certains de ses actes au consentement du curateur.', ARRAY['curatelle', 'coopération', 'consentement', 'curateur']),
  ('Art. 398 CC', '398', 398, 'Une curatelle de portée générale est instituée lorsqu''une personne a particulièrement besoin d''aide, notamment parce qu''elle est durablement incapable de discernement.', ARRAY['curatelle', 'portée générale', 'incapacité', 'discernement']),
  ('Art. 400 CC', '400', 400, 'L''autorité de protection de l''adulte nomme comme curateur une personne physique qui possède les connaissances et les aptitudes nécessaires, qui dispose du temps requis et qui exécutera ses tâches en personne.', ARRAY['curateur', 'nomination', 'aptitudes', 'compétences']),
  ('Art. 404 CC', '404', 404, 'Le curateur a droit à une rémunération appropriée et au remboursement des frais justifiés.', ARRAY['curateur', 'rémunération', 'frais']),
  ('Art. 405 CC', '405', 405, 'Le curateur accomplit ses tâches avec diligence et dans l''intérêt de la personne concernée.', ARRAY['curateur', 'diligence', 'intérêt']),
  ('Art. 406 CC', '406', 406, 'Le curateur tient la personne concernée informée des affaires importantes et lui permet de participer à la prise de décisions dans la mesure du possible.', ARRAY['curateur', 'information', 'participation', 'décisions']),
  ('Art. 408 CC', '408', 408, 'Le curateur gère les biens de la personne concernée avec diligence.', ARRAY['curateur', 'gestion', 'biens', 'patrimoine']),
  ('Art. 409 CC', '409', 409, 'La personne concernée a droit à un montant dont elle peut disposer librement pour les dépenses de sa vie courante.', ARRAY['argent de poche', 'dépenses', 'vie courante']),
  ('Art. 410 CC', '410', 410, 'Le curateur établit un inventaire des biens de la personne concernée au début de la curatelle.', ARRAY['inventaire', 'biens', 'début', 'curatelle']),
  ('Art. 413 CC', '413', 413, 'Le curateur gère les biens avec diligence et représente la personne concernée dans les actes juridiques liés à la gestion.', ARRAY['gestion', 'patrimoine', 'actes juridiques', 'représentation']),
  ('Art. 414 CC', '414', 414, 'Le curateur établit au moins chaque année à l''intention de l''autorité de protection un rapport sur l''état de la personne concernée et sur la situation de ses biens.', ARRAY['rapport', 'annuel', 'APEA', 'surveillance']),
  ('Art. 416 CC', '416', 416, 'Certains actes de gestion du patrimoine nécessitent le consentement de l''autorité de protection de l''adulte.', ARRAY['consentement', 'APEA', 'actes', 'patrimoine']),
  ('Art. 440 CC', '440', 440, 'L''autorité de protection de l''adulte est une autorité interdisciplinaire; elle est désignée par les cantons.', ARRAY['APEA', 'autorité', 'interdisciplinaire', 'cantons']),
  ('Art. 443 CC', '443', 443, 'Toute personne a qualité pour aviser l''autorité de protection de l''adulte qu''une personne semble avoir besoin d''aide.', ARRAY['signalement', 'APEA', 'besoin d''aide']),
  ('Art. 446 CC', '446', 446, 'L''autorité de protection de l''adulte établit les faits d''office.', ARRAY['APEA', 'instruction', 'd''office', 'faits']),
  ('Art. 450 CC', '450', 450, 'Les décisions de l''autorité de protection de l''adulte peuvent faire l''objet d''un recours devant le juge compétent.', ARRAY['recours', 'décision', 'APEA', 'juge']),
  ('Art. 454 CC', '454', 454, 'La personne qui, dans l''exercice d''une fonction officielle relevant de la protection de l''adulte, commet un acte illicite porte atteinte aux droits de la personne concernée.', ARRAY['responsabilité', 'acte illicite', 'fonction officielle', 'dommage'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'CH-CC'
ON CONFLICT DO NOTHING;

-- 6. LEGAL UNITS - Articles clés LPD
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 1 LPD', '1', 1, 'La présente loi vise à protéger la personnalité et les droits fondamentaux des personnes qui font l''objet d''un traitement de données.', ARRAY['protection', 'personnalité', 'droits fondamentaux', 'données']),
  ('Art. 6 LPD', '6', 6, 'Les données personnelles doivent être traitées conformément aux principes de la bonne foi et de la proportionnalité.', ARRAY['bonne foi', 'proportionnalité', 'principes', 'traitement']),
  ('Art. 7 LPD', '7', 7, 'Les données personnelles doivent être protégées contre tout traitement non autorisé par des mesures organisationnelles et techniques appropriées.', ARRAY['sécurité', 'mesures techniques', 'protection', 'traitement']),
  ('Art. 8 LPD', '8', 8, 'Le responsable du traitement doit fournir des informations sur le traitement des données à la personne concernée.', ARRAY['information', 'transparence', 'responsable', 'traitement']),
  ('Art. 25 LPD', '25', 25, 'Toute personne peut demander au responsable du traitement si des données personnelles la concernant sont traitées.', ARRAY['droit d''accès', 'demande', 'personne concernée']),
  ('Art. 32 LPD', '32', 32, 'Toute personne concernée peut demander la rectification des données inexactes.', ARRAY['rectification', 'données inexactes', 'correction'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'CH-LPD'
ON CONFLICT DO NOTHING;

-- 7. LEGAL UNITS - Articles clés Constitution fédérale
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 7 Cst.', '7', 7, 'La dignité humaine doit être respectée et protégée.', ARRAY['dignité', 'humaine', 'respect', 'protection']),
  ('Art. 8 Cst.', '8', 8, 'Tous les êtres humains sont égaux devant la loi. Nul ne doit subir de discrimination.', ARRAY['égalité', 'non-discrimination', 'droits fondamentaux']),
  ('Art. 9 Cst.', '9', 9, 'Toute personne a le droit d''être traitée par les organes de l''État sans arbitraire et conformément aux règles de la bonne foi.', ARRAY['arbitraire', 'bonne foi', 'État', 'droits fondamentaux']),
  ('Art. 10 Cst.', '10', 10, 'Tout être humain a droit à la vie. La peine de mort est interdite. Tout être humain a droit à la liberté personnelle.', ARRAY['vie', 'liberté personnelle', 'droits fondamentaux']),
  ('Art. 13 Cst.', '13', 13, 'Toute personne a droit au respect de sa vie privée et familiale, de son domicile, de sa correspondance.', ARRAY['vie privée', 'famille', 'domicile', 'correspondance']),
  ('Art. 29 Cst.', '29', 29, 'Toute personne a droit, dans une procédure judiciaire ou administrative, à ce que sa cause soit traitée équitablement et jugée dans un délai raisonnable.', ARRAY['procès équitable', 'délai raisonnable', 'garanties procédurales']),
  ('Art. 29a Cst.', '29a', 30, 'Toute personne a droit à ce que sa cause soit jugée par une autorité judiciaire.', ARRAY['accès au juge', 'garantie judiciaire']),
  ('Art. 30 Cst.', '30', 31, 'Toute personne dont la cause doit être jugée dans une procédure judiciaire a droit à un tribunal établi par la loi, compétent, indépendant et impartial.', ARRAY['tribunal', 'indépendance', 'impartialité', 'compétence'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'CH-CST'
ON CONFLICT DO NOTHING;

-- 8. LEGAL UNITS - Articles clés LPGA
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 17 LPGA', '17', 17, 'Lorsque les circonstances dont dépendait le droit à des prestations se modifient notablement, celles-ci sont révisées.', ARRAY['révision', 'prestations', 'modification', 'circonstances']),
  ('Art. 27 LPGA', '27', 27, 'L''assureur renseigne les personnes intéressées sur leurs droits et obligations.', ARRAY['information', 'droits', 'obligations', 'assureur']),
  ('Art. 43 LPGA', '43', 43, 'L''assureur examine les demandes, prend d''office les mesures d''instruction nécessaires et recueille les renseignements dont il a besoin.', ARRAY['instruction', 'd''office', 'demande', 'assureur']),
  ('Art. 49 LPGA', '49', 49, 'L''assureur doit rendre une décision écrite sur les prestations, les créances et les injonctions.', ARRAY['décision', 'écrite', 'prestations', 'assureur']),
  ('Art. 52 LPGA', '52', 52, 'Les décisions peuvent être attaquées par voie d''opposition auprès de l''assureur.', ARRAY['opposition', 'recours', 'décision', 'assureur']),
  ('Art. 56 LPGA', '56', 56, 'Les décisions sur opposition peuvent faire l''objet d''un recours auprès du tribunal des assurances du canton.', ARRAY['recours', 'tribunal cantonal', 'assurances sociales']),
  ('Art. 61 LPGA', '61', 61, 'La procédure devant le tribunal cantonal des assurances est réglée par le droit cantonal.', ARRAY['procédure', 'tribunal cantonal', 'droit cantonal'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'CH-LPGA'
ON CONFLICT DO NOTHING;

-- 9. LEGAL UNITS - Articles clés LEO
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 1 LEO', '1', 1, 'La présente loi définit les objectifs de l''école obligatoire et les règles générales de son organisation.', ARRAY['école', 'obligatoire', 'objectifs', 'organisation']),
  ('Art. 5 LEO', '5', 5, 'L''école publique assume une mission éducative en collaboration avec la famille et favorise l''épanouissement de l''élève.', ARRAY['mission éducative', 'famille', 'épanouissement', 'élève']),
  ('Art. 10 LEO', '10', 10, 'Les parents sont les premiers responsables de l''éducation de leur enfant. Ils collaborent avec l''école.', ARRAY['parents', 'responsabilité', 'éducation', 'collaboration']),
  ('Art. 17 LEO', '17', 17, 'L''élève a le droit de recevoir un enseignement de qualité adapté à ses besoins et à son développement.', ARRAY['droit', 'enseignement', 'qualité', 'besoins']),
  ('Art. 98 LEO', '98', 98, 'Les décisions relatives au statut de l''élève peuvent faire l''objet d''une réclamation auprès de la direction de l''établissement.', ARRAY['réclamation', 'décision', 'élève', 'direction']),
  ('Art. 99 LEO', '99', 99, 'La décision sur réclamation peut faire l''objet d''un recours auprès du département.', ARRAY['recours', 'département', 'décision']),
  ('Art. 100 LEO', '100', 100, 'La décision sur recours peut faire l''objet d''un recours à la Cour de droit administratif et public du Tribunal cantonal.', ARRAY['recours', 'tribunal cantonal', 'CDAP'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'VD-LEO'
ON CONFLICT DO NOTHING;

-- 10. LEGAL UNITS - Articles clés LASV
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 1 LASV', '1', 1, 'La présente loi définit les principes et les règles de l''action sociale.', ARRAY['action sociale', 'principes', 'règles']),
  ('Art. 4 LASV', '4', 4, 'Toute personne majeure dans le besoin a droit à l''aide sociale.', ARRAY['droit', 'aide sociale', 'besoin', 'majeur']),
  ('Art. 8 LASV', '8', 8, 'L''aide sociale est accordée pour permettre au bénéficiaire de vivre conformément à la dignité humaine.', ARRAY['dignité', 'aide sociale', 'bénéficiaire']),
  ('Art. 31 LASV', '31', 31, 'L''aide sociale est subsidiaire à toutes les autres formes d''aide.', ARRAY['subsidiarité', 'aide sociale']),
  ('Art. 35 LASV', '35', 35, 'Les décisions en matière d''aide sociale sont prises par le centre social régional compétent.', ARRAY['décision', 'CSR', 'compétence', 'aide sociale'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'VD-LASV'
ON CONFLICT DO NOTHING;

-- 11. LEGAL UNITS - Articles clés LPA-VD
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 3 LPA-VD', '3', 3, 'Toute personne a le droit d''être entendue avant qu''une décision ne soit prise à son détriment.', ARRAY['droit d''être entendu', 'décision', 'procédure']),
  ('Art. 27 LPA-VD', '27', 27, 'Les décisions doivent être motivées.', ARRAY['motivation', 'décision', 'obligation']),
  ('Art. 28 LPA-VD', '28', 28, 'Les décisions doivent indiquer les voies de recours.', ARRAY['voies de recours', 'indication', 'décision']),
  ('Art. 40 LPA-VD', '40', 40, 'Le délai de recours est de trente jours dès la notification de la décision.', ARRAY['délai', 'recours', '30 jours', 'notification']),
  ('Art. 47 LPA-VD', '47', 47, 'Le recours peut être formé pour violation du droit, y compris l''excès ou l''abus du pouvoir d''appréciation, et pour constatation inexacte ou incomplète des faits pertinents.', ARRAY['motifs de recours', 'violation', 'faits', 'pouvoir d''appréciation']),
  ('Art. 67 LPA-VD', '67', 67, 'En cas de déni de justice ou de retard injustifié, la partie peut porter plainte auprès de l''autorité de surveillance.', ARRAY['déni de justice', 'retard', 'plainte', 'surveillance'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'VD-LPA'
ON CONFLICT DO NOTHING;

-- 12. LEGAL UNITS - Articles clés LVPAE
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 1 LVPAE', '1', 1, 'La présente loi fixe les règles relatives à l''application du droit fédéral de la protection de l''adulte et de l''enfant.', ARRAY['protection adulte', 'enfant', 'application', 'droit fédéral']),
  ('Art. 3 LVPAE', '3', 3, 'La Justice de paix est l''autorité de protection de l''adulte au sens du Code civil.', ARRAY['Justice de paix', 'APEA', 'autorité', 'Vaud']),
  ('Art. 7 LVPAE', '7', 7, 'Le curateur professionnel ou d''office est un agent de l''État soumis à la loi sur le personnel.', ARRAY['curateur', 'professionnel', 'agent État', 'personnel']),
  ('Art. 10 LVPAE', '10', 10, 'Les décisions de la Justice de paix peuvent être attaquées par voie de recours à la Chambre des curatelles du Tribunal cantonal.', ARRAY['recours', 'Chambre des curatelles', 'Tribunal cantonal', 'Justice de paix']),
  ('Art. 12 LVPAE', '12', 12, 'Le recours est suspensif sauf si l''autorité en décide autrement pour de justes motifs.', ARRAY['effet suspensif', 'recours', 'justes motifs']),
  ('Art. 17 LVPAE', '17', 17, 'La surveillance des curatelles est exercée par la Justice de paix.', ARRAY['surveillance', 'curatelle', 'Justice de paix'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'VD-LVPAE'
ON CONFLICT DO NOTHING;

-- 13. LEGAL UNITS - Articles clés PA fédérale
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 5 PA', '5', 5, 'Sont considérées comme décisions les mesures prises par les autorités dans des cas d''espèce.', ARRAY['décision', 'autorité', 'mesure', 'définition']),
  ('Art. 29 PA', '29', 29, 'Les parties ont le droit d''être entendues.', ARRAY['droit d''être entendu', 'parties', 'procédure']),
  ('Art. 35 PA', '35', 35, 'Les décisions doivent être motivées.', ARRAY['motivation', 'décision', 'obligation']),
  ('Art. 44 PA', '44', 44, 'La décision est sujette à recours.', ARRAY['recours', 'décision']),
  ('Art. 50 PA', '50', 50, 'Le délai de recours est de trente jours à compter de la notification de la décision.', ARRAY['délai', 'recours', '30 jours', 'notification'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'CH-PA'
ON CONFLICT DO NOTHING;

-- 14. LEGAL UNITS - Articles clés LInfo/LIPAD
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, order_index, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id, lv.id, art.cite_key, 'article', art.article_num, art.order_idx, art.content,
  encode(sha256(art.content::bytea), 'hex'), art.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
CROSS JOIN (VALUES
  ('Art. 1 LInfo', '1', 1, 'La présente loi règle l''information du public sur les activités des autorités, l''accès aux documents officiels et la protection des données personnelles.', ARRAY['information', 'transparence', 'documents', 'données']),
  ('Art. 8 LInfo', '8', 8, 'Toute personne a le droit de consulter des documents officiels et d''obtenir des renseignements sur leur contenu.', ARRAY['accès', 'documents officiels', 'consultation']),
  ('Art. 16 LInfo', '16', 16, 'L''accès aux documents peut être refusé, restreint ou différé si un intérêt public ou privé prépondérant s''y oppose.', ARRAY['refus', 'restriction', 'intérêt', 'exception']),
  ('Art. 25 LInfo', '25', 25, 'Toute personne concernée peut consulter les données la concernant et en demander la rectification ou l''effacement.', ARRAY['droit d''accès', 'rectification', 'effacement', 'données']),
  ('Art. 35 LInfo', '35', 35, 'Le préposé cantonal à la protection des données et à l''information veille au respect des principes de la présente loi.', ARRAY['préposé', 'surveillance', 'protection données'])
) AS art(cite_key, article_num, order_idx, content, keywords)
WHERE li.instrument_uid = 'VD-LIPAD'
ON CONFLICT DO NOTHING;

-- 15. Create legal sources for main instruments
INSERT INTO legal_sources (version_id, source_url, source_type, authority, retrieved_at)
SELECT 
  lv.id,
  CASE 
    WHEN li.jurisdiction = 'CH' THEN 'https://www.fedlex.admin.ch/eli/cc/' || REPLACE(REPLACE(li.blv_or_rs_id, 'RS ', ''), '.', '/') || '/fr'
    ELSE 'https://prestations.vd.ch/pub/blv/web/' || REPLACE(li.blv_or_rs_id, 'BLV ', '')
  END,
  'official_publication',
  CASE WHEN li.jurisdiction = 'CH' THEN 'Fedlex' ELSE 'Canton de Vaud' END,
  NOW()
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id
WHERE NOT EXISTS (
  SELECT 1 FROM legal_sources ls WHERE ls.version_id = lv.id
);