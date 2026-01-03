
-- Articles CPC (Code de procédure civile)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CPC-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'Le présent code règle la procédure applicable devant les juridictions cantonales.', ARRAY['procédure', 'juridictions', 'cantonales']),
  ('52', 'Quiconque participe à la procédure doit se conformer aux règles de la bonne foi.', ARRAY['bonne foi', 'procédure', 'obligation']),
  ('55', 'Les parties ont le droit d''être entendues.', ARRAY['droit entendu', 'parties', 'audition']),
  ('56', 'Le tribunal interpelle les parties dont les actes ou déclarations sont peu clairs.', ARRAY['interpellation', 'tribunal', 'clarification']),
  ('59', 'Le tribunal entre en matière sur les demandes et requêtes si les conditions de recevabilité sont remplies.', ARRAY['recevabilité', 'demande', 'conditions']),
  ('62', 'Si le demandeur retire son action, le procès prend fin sans décision sur le fond.', ARRAY['retrait', 'action', 'fin procès']),
  ('128', 'Le demandeur expose les faits sur lesquels il fonde sa prétention.', ARRAY['allégués', 'faits', 'demandeur']),
  ('150', 'La preuve a pour objet les faits pertinents et contestés.', ARRAY['preuve', 'faits', 'pertinence']),
  ('157', 'Le tribunal peut librement apprécier les preuves.', ARRAY['libre appréciation', 'preuves', 'tribunal']),
  ('229', 'Les faits et moyens de preuve nouveaux ne sont admis qu''aux conditions énoncées.', ARRAY['nova', 'faits nouveaux', 'admissibilité']),
  ('308', 'L''appel est recevable contre les décisions finales de première instance.', ARRAY['appel', 'décision finale', 'recevabilité']),
  ('311', 'L''appel doit être motivé.', ARRAY['motivation', 'appel', 'exigence']),
  ('319', 'Le recours est recevable contre les décisions finales, incidentes et provisionnelles.', ARRAY['recours', 'décision', 'recevabilité'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CPC'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles CPP (Code de procédure pénale)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CPP-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'Le présent code régit la poursuite et le jugement des infractions prévues par le droit fédéral.', ARRAY['poursuite', 'infractions', 'droit fédéral']),
  ('3', 'Le respect de la dignité des personnes impliquées dans la procédure est garanti.', ARRAY['dignité', 'personnes', 'garantie']),
  ('6', 'Les autorités pénales recherchent d''office tous les faits pertinents.', ARRAY['instruction d''office', 'faits', 'autorités']),
  ('10', 'Toute personne est présumée innocente tant qu''elle n''est pas condamnée par un jugement entré en force.', ARRAY['présomption innocence', 'condamnation', 'jugement']),
  ('29', 'Le ministère public est l''autorité investie de la direction de la procédure.', ARRAY['ministère public', 'direction', 'procédure']),
  ('104', 'La victime est la personne lésée qui a été atteinte dans son intégrité physique, psychique ou sexuelle.', ARRAY['victime', 'lésée', 'intégrité']),
  ('107', 'Les parties ont le droit d''être entendues.', ARRAY['droit entendu', 'parties', 'audition']),
  ('118', 'La partie plaignante peut faire valoir des conclusions civiles.', ARRAY['partie plaignante', 'conclusions civiles', 'prétentions']),
  ('139', 'Les autorités pénales recourent à des moyens de contrainte conformément à la loi.', ARRAY['moyens contrainte', 'autorités', 'légalité']),
  ('197', 'Les mesures de contrainte ne peuvent être ordonnées que si elles sont prévues par la loi.', ARRAY['mesures contrainte', 'légalité', 'conditions']),
  ('212', 'Le prévenu reste en liberté s''il n''y a pas de risque de fuite, de collusion ou de réitération.', ARRAY['liberté', 'détention', 'conditions']),
  ('221', 'La détention provisoire est ordonnée s''il existe un soupçon fortement vraisemblable.', ARRAY['détention provisoire', 'soupçon', 'conditions']),
  ('310', 'Le ministère public rend une ordonnance de non-entrée en matière s''il ressort de la dénonciation que les éléments constitutifs de l''infraction ne sont pas réunis.', ARRAY['non-entrée matière', 'classement', 'éléments constitutifs']),
  ('319', 'Le ministère public ordonne le classement de tout ou partie de la procédure.', ARRAY['classement', 'procédure', 'ministère public']),
  ('328', 'Le ministère public peut rendre une ordonnance pénale.', ARRAY['ordonnance pénale', 'sanction', 'procédure']),
  ('382', 'Toute partie qui a un intérêt juridiquement protégé peut former recours.', ARRAY['recours', 'intérêt', 'partie'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CPP'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles LPA-VD (Loi sur la procédure administrative vaudoise)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'VD-LPA-VD-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'La présente loi règle la procédure applicable devant les autorités administratives cantonales.', ARRAY['procédure', 'administrative', 'cantonale']),
  ('3', 'Les autorités administratives agissent d''office.', ARRAY['action office', 'autorités', 'principe']),
  ('26', 'Les parties ont le droit d''être entendues avant toute décision les concernant.', ARRAY['droit entendu', 'parties', 'décision']),
  ('27', 'Le droit d''être entendu comprend le droit de s''exprimer sur les éléments pertinents.', ARRAY['expression', 'éléments pertinents', 'droit']),
  ('28', 'Les parties ont le droit de consulter le dossier.', ARRAY['consultation dossier', 'parties', 'accès']),
  ('46', 'La décision doit être motivée.', ARRAY['motivation', 'décision', 'obligation']),
  ('47', 'La décision indique les voies de recours.', ARRAY['voies recours', 'décision', 'indication']),
  ('75', 'Le recours peut être formé pour violation du droit.', ARRAY['recours', 'violation', 'droit']),
  ('76', 'Le recours peut être formé pour constatation inexacte des faits.', ARRAY['recours', 'faits', 'constatation']),
  ('77', 'Le recours peut être formé pour inopportunité.', ARRAY['recours', 'opportunité', 'motif'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'VD-LPA-VD'
ON CONFLICT (cite_key) DO NOTHING;

-- Créer versions 'current' pour CPC et CPP
INSERT INTO legal_versions (instrument_id, version_number, valid_from, status)
SELECT id, 1, '2025-01-01', 'current'
FROM legal_instruments
WHERE instrument_uid IN ('CH-CPC', 'CH-CPP', 'VD-LPA-VD')
AND id NOT IN (SELECT instrument_id FROM legal_versions WHERE status = 'current')
ON CONFLICT DO NOTHING;

-- Articles additionnels Constitution vaudoise
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'VD-Cst-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'Le Canton de Vaud est un État démocratique.', ARRAY['démocratie', 'canton', 'état']),
  ('7', 'La dignité humaine doit être respectée et protégée.', ARRAY['dignité', 'protection', 'respect']),
  ('8', 'Tous les êtres humains sont égaux devant la loi.', ARRAY['égalité', 'loi', 'humains']),
  ('10', 'Toute personne a droit à la vie et à l''intégrité physique et psychique.', ARRAY['vie', 'intégrité', 'droit']),
  ('11', 'Toute personne a droit au respect de sa vie privée et familiale.', ARRAY['vie privée', 'famille', 'respect']),
  ('12', 'Toute personne a droit à la protection contre l''arbitraire.', ARRAY['arbitraire', 'protection', 'droit']),
  ('13', 'Toute personne a la liberté de manifester sa conviction.', ARRAY['liberté', 'conviction', 'manifestation']),
  ('17', 'Chaque enfant a droit à une formation de base gratuite.', ARRAY['enfant', 'formation', 'gratuité']),
  ('35', 'Toute personne a droit au respect des garanties de procédure judiciaire.', ARRAY['procédure', 'garanties', 'judiciaire']),
  ('53', 'Le Grand Conseil est l''autorité suprême du Canton.', ARRAY['Grand Conseil', 'autorité', 'législatif'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'VD-Cst'
ON CONFLICT (cite_key) DO NOTHING;

-- Créer version pour VD-Cst si nécessaire
INSERT INTO legal_versions (instrument_id, version_number, valid_from, status)
SELECT id, 1, '2025-01-01', 'current'
FROM legal_instruments
WHERE instrument_uid = 'VD-Cst'
AND id NOT IN (SELECT instrument_id FROM legal_versions WHERE status = 'current')
ON CONFLICT DO NOTHING;

-- Articles additionnels CO (bail, mandat, société)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CO-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('253', 'Le bail à loyer est un contrat par lequel le bailleur s''oblige à céder l''usage d''une chose au locataire.', ARRAY['bail', 'loyer', 'contrat']),
  ('256', 'Le bailleur est tenu de délivrer la chose à la date convenue.', ARRAY['délivrance', 'chose', 'obligation']),
  ('257a', 'Le locataire doit payer le loyer à la fin de chaque mois.', ARRAY['loyer', 'paiement', 'mensuel']),
  ('257d', 'Lorsque le locataire est en demeure de payer le loyer, le bailleur peut lui fixer un délai.', ARRAY['demeure', 'loyer', 'délai']),
  ('257f', 'Le locataire est tenu d''user de la chose avec le soin nécessaire.', ARRAY['usage', 'soin', 'locataire']),
  ('261', 'Si le bailleur aliène la chose louée, le bail passe à l''acquéreur.', ARRAY['aliénation', 'acquéreur', 'bail']),
  ('266a', 'Le bail peut être résilié moyennant un congé.', ARRAY['résiliation', 'congé', 'bail']),
  ('269', 'Les loyers sont abusifs lorsqu''ils permettent au bailleur d''obtenir un rendement excessif.', ARRAY['loyer abusif', 'rendement', 'excessif']),
  ('271', 'Le congé est annulable lorsqu''il contrevient aux règles de la bonne foi.', ARRAY['congé annulable', 'bonne foi', 'protection']),
  ('272', 'Le locataire peut demander la prolongation d''un bail de durée déterminée ou indéterminée.', ARRAY['prolongation', 'bail', 'demande']),
  ('394', 'Le mandat est un contrat par lequel le mandataire s''oblige à gérer l''affaire dont il s''est chargé.', ARRAY['mandat', 'mandataire', 'gestion']),
  ('397', 'Le mandant peut révoquer le mandat en tout temps.', ARRAY['révocation', 'mandat', 'mandant']),
  ('398', 'Le mandataire est responsable envers le mandant de la bonne et fidèle exécution du mandat.', ARRAY['responsabilité', 'exécution', 'fidélité']),
  ('404', 'Le mandat finit par la révocation faite par le mandant ou la renonciation du mandataire.', ARRAY['fin mandat', 'révocation', 'renonciation']),
  ('530', 'La société simple est un contrat par lequel deux ou plusieurs personnes conviennent d''unir leurs efforts.', ARRAY['société simple', 'contrat', 'association']),
  ('620', 'La société anonyme est celle qui se forme sous une raison sociale et dont le capital est divisé en actions.', ARRAY['société anonyme', 'actions', 'capital']),
  ('680', 'L''actionnaire est tenu d''effectuer les versements prévus par les statuts.', ARRAY['actionnaire', 'versements', 'statuts']),
  ('716', 'Le conseil d''administration gère les affaires de la société.', ARRAY['conseil administration', 'gestion', 'société']),
  ('772', 'La société à responsabilité limitée est une société de capitaux.', ARRAY['Sàrl', 'société', 'capitaux']),
  ('828', 'La société coopérative est celle que forment des personnes pour favoriser des intérêts économiques.', ARRAY['coopérative', 'intérêts', 'économiques'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CO'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles CP additionnels (infractions contre le patrimoine, faux)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CP-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('251', 'Celui qui, dans le dessein de nuire au patrimoine ou aux droits d''autrui, aura créé un titre faux sera puni.', ARRAY['faux titre', 'patrimoine', 'nuire']),
  ('253', 'Celui qui, en induisant en erreur un fonctionnaire, l''aura amené à constater dans un titre authentique un fait faux sera puni.', ARRAY['faux certificat', 'fonctionnaire', 'erreur']),
  ('254', 'Celui qui, dans le dessein de nuire à autrui, aura endommagé, détruit, fait disparaître ou soustrait un titre sera puni.', ARRAY['suppression titre', 'destruction', 'soustraction']),
  ('258', 'Celui qui aura alarmé la population par la menace ou l''annonce d''un danger sera puni.', ARRAY['alarme population', 'menace', 'danger']),
  ('285', 'Celui qui, en usant de violence ou de menace, aura empêché une autorité de remplir ses fonctions sera puni.', ARRAY['violence autorité', 'empêchement', 'menace']),
  ('286', 'Celui qui aura empêché une autorité de faire un acte entrant dans ses fonctions sera puni.', ARRAY['entrave', 'autorité', 'acte officiel']),
  ('303', 'Celui qui aura dénoncé à l''autorité comme auteur d''un crime une personne qu''il savait innocente sera puni.', ARRAY['dénonciation calomnieuse', 'innocence', 'crime']),
  ('305', 'Celui qui aura soustrait une personne à une poursuite pénale sera puni.', ARRAY['entrave justice', 'poursuite', 'soustraction']),
  ('317', 'Le fonctionnaire qui aura intentionnellement créé un titre faux sera puni.', ARRAY['faux fonctionnaire', 'titre', 'intentionnel']),
  ('322ter', 'Celui qui aura offert, promis ou octroyé un avantage indu à un agent public sera puni.', ARRAY['corruption active', 'avantage', 'agent public']),
  ('322quater', 'L''agent public qui aura sollicité, accepté un avantage indu sera puni.', ARRAY['corruption passive', 'avantage', 'sollicitation'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CP'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles CC additionnels (droits réels, servitudes)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CC-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('655', 'La propriété foncière a pour objet les immeubles.', ARRAY['propriété foncière', 'immeubles', 'objet']),
  ('656', 'L''inscription au registre foncier est nécessaire pour l''acquisition de la propriété foncière.', ARRAY['inscription', 'registre foncier', 'acquisition']),
  ('667', 'La propriété du sol emporte celle du dessus et du dessous.', ARRAY['sol', 'propriété', 'dessus dessous']),
  ('712a', 'La propriété par étages est la part de copropriété d''un immeuble.', ARRAY['PPE', 'copropriété', 'étages']),
  ('730', 'La servitude est une charge imposée sur un immeuble.', ARRAY['servitude', 'charge', 'immeuble']),
  ('737', 'L''ayant droit peut prendre toutes les mesures nécessaires pour conserver la servitude.', ARRAY['conservation', 'servitude', 'mesures']),
  ('745', 'L''usufruit peut être établi sur des meubles, des immeubles, des droits ou un patrimoine.', ARRAY['usufruit', 'meubles', 'immeubles']),
  ('776', 'Les droits d''habitation et de superficie sont des servitudes personnelles.', ARRAY['habitation', 'superficie', 'servitudes']),
  ('793', 'Le gage immobilier ne peut être constitué que sur un immeuble.', ARRAY['gage immobilier', 'hypothèque', 'immeuble']),
  ('842', 'La cédule hypothécaire est une créance personnelle garantie par un gage immobilier.', ARRAY['cédule hypothécaire', 'créance', 'garantie']),
  ('884', 'Sauf les exceptions prévues par la loi, le créancier n''acquiert de droit de gage sur les meubles qu''en prenant possession du gage.', ARRAY['nantissement', 'possession', 'meubles'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CC'
ON CONFLICT (cite_key) DO NOTHING;
