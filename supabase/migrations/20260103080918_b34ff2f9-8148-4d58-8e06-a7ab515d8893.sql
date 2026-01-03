
-- Articles clés du Code civil suisse (CH-CC)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id,
  lv.id,
  'CH-CC-' || unit_data.art,
  'article',
  unit_data.art,
  unit_data.content,
  encode(sha256(unit_data.content::bytea), 'hex'),
  unit_data.keywords,
  true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'La loi régit toutes les matières auxquelles se rapportent la lettre ou l''esprit de l''une de ses dispositions.', ARRAY['application', 'loi', 'interprétation']),
  ('2', 'À défaut d''une disposition légale applicable, le juge prononce selon le droit coutumier et, à défaut d''une coutume, selon les règles qu''il établirait s''il avait à faire acte de législateur.', ARRAY['lacune', 'droit coutumier', 'pouvoir du juge']),
  ('8', 'Chacun est tenu d''agir conformément aux règles de la bonne foi.', ARRAY['bonne foi', 'obligation', 'comportement']),
  ('27', 'Nul ne peut, même partiellement, renoncer à la jouissance ou à l''exercice des droits civils.', ARRAY['droits civils', 'capacité', 'renonciation']),
  ('28', 'Celui qui subit une atteinte illicite à sa personnalité peut agir en justice pour sa protection.', ARRAY['personnalité', 'protection', 'action en justice']),
  ('41', 'Celui qui cause, d''une manière illicite, un dommage à autrui, soit intentionnellement, soit par négligence ou imprudence, est tenu de le réparer.', ARRAY['responsabilité', 'dommage', 'réparation']),
  ('97', 'Lorsque le créancier ne peut obtenir l''exécution de l''obligation ou ne peut l''obtenir qu''imparfaitement, le débiteur est tenu de réparer le dommage.', ARRAY['inexécution', 'créancier', 'dommage']),
  ('170', 'Chaque époux peut demander à son conjoint qu''il le renseigne sur ses revenus, ses biens et ses dettes.', ARRAY['mariage', 'information', 'patrimoine']),
  ('276', 'Les père et mère contribuent à l''entretien de l''enfant.', ARRAY['entretien', 'enfant', 'parents']),
  ('307', 'L''autorité de protection de l''enfant prend les mesures nécessaires pour protéger l''enfant si son développement est menacé.', ARRAY['protection enfant', 'mesures', 'développement'])
) AS unit_data(art, content, keywords)
WHERE li.instrument_uid = 'CH-CC'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles clés du Code des obligations (CH-CO)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id,
  lv.id,
  'CH-CO-' || unit_data.art,
  'article',
  unit_data.art,
  unit_data.content,
  encode(sha256(unit_data.content::bytea), 'hex'),
  unit_data.keywords,
  true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'Le contrat est parfait lorsque les parties ont, réciproquement et d''une manière concordante, manifesté leur volonté.', ARRAY['contrat', 'volonté', 'consentement']),
  ('18', 'Pour apprécier la forme et les clauses d''un contrat, il y a lieu de rechercher la réelle et commune intention des parties.', ARRAY['interprétation', 'intention', 'contrat']),
  ('41', 'Celui qui cause, d''une manière illicite, un dommage à autrui, soit intentionnellement, soit par négligence, est tenu de le réparer.', ARRAY['responsabilité', 'dommage', 'illicéité']),
  ('97', 'Lorsque le créancier ne peut obtenir l''exécution de l''obligation, le débiteur est tenu de réparer le dommage en résultant.', ARRAY['inexécution', 'obligation', 'réparation']),
  ('319', 'Par le contrat individuel de travail, le travailleur s''engage à travailler au service de l''employeur.', ARRAY['contrat travail', 'employeur', 'travailleur']),
  ('321a', 'Le travailleur exécute avec soin le travail qui lui est confié et sauvegarde fidèlement les intérêts légitimes de l''employeur.', ARRAY['devoir fidélité', 'travailleur', 'diligence']),
  ('328', 'L''employeur protège et respecte, dans les rapports de travail, la personnalité du travailleur.', ARRAY['protection personnalité', 'employeur', 'respect']),
  ('336', 'Le congé est abusif lorsqu''il est donné par une partie pour une raison inhérente à la personnalité de l''autre.', ARRAY['congé abusif', 'licenciement', 'personnalité']),
  ('337', 'L''employeur et le travailleur peuvent résilier immédiatement le contrat en tout temps pour de justes motifs.', ARRAY['résiliation immédiate', 'justes motifs', 'contrat']),
  ('362', 'Il ne peut pas être dérogé aux dispositions ci-après par accord, contrat-type ou convention collective.', ARRAY['droit impératif', 'protection', 'travailleur'])
) AS unit_data(art, content, keywords)
WHERE li.instrument_uid = 'CH-CO'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles clés du Code pénal (CH-CP)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id,
  lv.id,
  'CH-CP-' || unit_data.art,
  'article',
  unit_data.art,
  unit_data.content,
  encode(sha256(unit_data.content::bytea), 'hex'),
  unit_data.keywords,
  true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'Une peine ou une mesure ne peuvent être prononcées qu''en raison d''un acte expressément réprimé par la loi.', ARRAY['légalité', 'peine', 'principe']),
  ('12', 'Sauf disposition expresse et contraire de la loi, est seul punissable l''auteur d''un crime ou d''un délit qui agit intentionnellement.', ARRAY['intention', 'crime', 'délit']),
  ('173', 'Celui qui, s''adressant à un tiers, aura accusé une personne ou jeté sur elle le soupçon de tenir une conduite contraire à l''honneur, sera puni sur plainte.', ARRAY['diffamation', 'honneur', 'plainte']),
  ('174', 'Celui qui, connaissant la fausseté de ses allégations et s''adressant à un tiers, aura accusé une personne de tenir une conduite contraire à l''honneur, sera puni.', ARRAY['calomnie', 'fausseté', 'honneur']),
  ('177', 'Celui qui, de toute autre manière, aura attaqué autrui dans son honneur par la parole, l''écriture ou l''image, sera puni sur plainte.', ARRAY['injure', 'honneur', 'parole']),
  ('180', 'Celui qui, par une menace grave, aura alarmé ou effrayé une personne sera, sur plainte, puni.', ARRAY['menace', 'peur', 'plainte']),
  ('181', 'Celui qui, en usant de violence envers une personne ou en la menaçant, l''aura obligée à faire ou à ne pas faire quelque chose, sera puni.', ARRAY['contrainte', 'violence', 'menace']),
  ('312', 'Les membres d''une autorité ou les fonctionnaires qui, dans le dessein de se procurer un avantage illicite, auront abusé des pouvoirs de leur charge seront punis.', ARRAY['abus autorité', 'fonctionnaire', 'avantage'])
) AS unit_data(art, content, keywords)
WHERE li.instrument_uid = 'CH-CP'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles de la LPD (CH-LPD)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id,
  lv.id,
  'CH-LPD-' || unit_data.art,
  'article',
  unit_data.art,
  unit_data.content,
  encode(sha256(unit_data.content::bytea), 'hex'),
  unit_data.keywords,
  true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'La présente loi vise à protéger la personnalité et les droits fondamentaux des personnes qui font l''objet d''un traitement de données.', ARRAY['protection', 'données', 'personnalité']),
  ('6', 'Les données personnelles doivent être traitées conformément aux principes de la bonne foi et de la proportionnalité.', ARRAY['bonne foi', 'proportionnalité', 'traitement']),
  ('25', 'Toute personne peut demander au responsable du traitement si des données personnelles la concernant sont traitées.', ARRAY['droit accès', 'responsable', 'données']),
  ('30', 'Le maître du fichier doit prendre les mesures organisationnelles et techniques appropriées contre le traitement non autorisé de données.', ARRAY['sécurité', 'mesures', 'protection'])
) AS unit_data(art, content, keywords)
WHERE li.instrument_uid = 'CH-LPD'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles de la LEO (VD-LEO)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id,
  lv.id,
  'VD-LEO-' || unit_data.art,
  'article',
  unit_data.art,
  unit_data.content,
  encode(sha256(unit_data.content::bytea), 'hex'),
  unit_data.keywords,
  true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'La présente loi régit l''enseignement obligatoire dans le canton de Vaud.', ARRAY['enseignement', 'obligatoire', 'Vaud']),
  ('5', 'L''école assure, en collaboration avec les parents, l''instruction des enfants.', ARRAY['école', 'parents', 'instruction']),
  ('115', 'L''exclusion définitive de l''école est prononcée par le département.', ARRAY['exclusion', 'département', 'sanction']),
  ('120', 'Les parents sont associés à la vie de l''école.', ARRAY['parents', 'participation', 'école']),
  ('129', 'La direction de l''établissement est responsable de la gestion pédagogique, éducative et administrative.', ARRAY['direction', 'gestion', 'établissement'])
) AS unit_data(art, content, keywords)
WHERE li.instrument_uid = 'VD-LEO'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles de la LPers (VD-LPERS)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT 
  li.id,
  lv.id,
  'VD-LPERS-' || unit_data.art,
  'article',
  unit_data.art,
  unit_data.content,
  encode(sha256(unit_data.content::bytea), 'hex'),
  unit_data.keywords,
  true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'La présente loi régit les rapports de service du personnel de l''État de Vaud.', ARRAY['personnel', 'État', 'Vaud']),
  ('5', 'L''employeur veille à la protection de la personnalité du collaborateur.', ARRAY['protection', 'personnalité', 'collaborateur']),
  ('57', 'Sont considérées comme fautes disciplinaires les violations des devoirs de service.', ARRAY['faute', 'disciplinaire', 'devoirs']),
  ('59', 'Les sanctions disciplinaires sont l''avertissement, le blâme, la suspension et la révocation.', ARRAY['sanctions', 'disciplinaire', 'révocation'])
) AS unit_data(art, content, keywords)
WHERE li.instrument_uid = 'VD-LPERS'
ON CONFLICT (cite_key) DO NOTHING;
