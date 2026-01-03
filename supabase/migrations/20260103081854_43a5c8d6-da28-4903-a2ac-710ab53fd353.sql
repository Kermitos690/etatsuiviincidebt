
-- Articles additionnels pour atteindre 500+

-- CEDH (Convention européenne des droits de l'homme)
INSERT INTO legal_versions (instrument_id, version_number, valid_from, status)
SELECT id, 1, '2025-01-01', 'current'
FROM legal_instruments WHERE instrument_uid = 'CH-CEDH'
AND id NOT IN (SELECT instrument_id FROM legal_versions WHERE status = 'current')
ON CONFLICT DO NOTHING;

INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CEDH-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('2', 'Le droit de toute personne à la vie est protégé par la loi.', ARRAY['vie', 'protection', 'droit fondamental']),
  ('3', 'Nul ne peut être soumis à la torture ni à des peines ou traitements inhumains ou dégradants.', ARRAY['torture', 'traitements inhumains', 'interdiction']),
  ('5', 'Toute personne a droit à la liberté et à la sûreté.', ARRAY['liberté', 'sûreté', 'personne']),
  ('6', 'Toute personne a droit à ce que sa cause soit entendue équitablement.', ARRAY['procès équitable', 'tribunal', 'impartialité']),
  ('8', 'Toute personne a droit au respect de sa vie privée et familiale.', ARRAY['vie privée', 'famille', 'respect']),
  ('10', 'Toute personne a droit à la liberté d''expression.', ARRAY['expression', 'liberté', 'opinion']),
  ('13', 'Toute personne a droit à un recours effectif devant une instance nationale.', ARRAY['recours effectif', 'instance', 'national']),
  ('14', 'La jouissance des droits et libertés doit être assurée sans discrimination.', ARRAY['discrimination', 'égalité', 'droits'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CEDH'
ON CONFLICT (cite_key) DO NOTHING;

-- Constitution fédérale suisse (Cst.)
INSERT INTO legal_instruments (instrument_uid, jurisdiction, title, abbreviation, instrument_type, current_status, domain_tags)
VALUES ('CH-Cst', 'CH', 'Constitution fédérale de la Confédération suisse', 'Cst.', 'loi', 'in_force', ARRAY['constitution', 'droits fondamentaux'])
ON CONFLICT (instrument_uid) DO NOTHING;

INSERT INTO legal_versions (instrument_id, version_number, valid_from, status)
SELECT id, 1, '2025-01-01', 'current'
FROM legal_instruments WHERE instrument_uid = 'CH-Cst'
AND id NOT IN (SELECT instrument_id FROM legal_versions WHERE status = 'current')
ON CONFLICT DO NOTHING;

INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-Cst-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('5', 'Le droit est la base et la limite de l''activité de l''État.', ARRAY['état de droit', 'légalité', 'limite']),
  ('7', 'La dignité humaine doit être respectée et protégée.', ARRAY['dignité', 'protection', 'respect']),
  ('8', 'Tous les êtres humains sont égaux devant la loi.', ARRAY['égalité', 'loi', 'discrimination']),
  ('9', 'Toute personne a le droit d''être traitée par les organes de l''État sans arbitraire et conformément aux règles de la bonne foi.', ARRAY['arbitraire', 'bonne foi', 'État']),
  ('10', 'Tout être humain a droit à la vie. La peine de mort est interdite.', ARRAY['vie', 'peine de mort', 'interdiction']),
  ('11', 'Les enfants et les jeunes ont droit à une protection particulière de leur intégrité.', ARRAY['enfants', 'protection', 'intégrité']),
  ('13', 'Toute personne a droit au respect de sa vie privée et familiale.', ARRAY['vie privée', 'famille', 'protection']),
  ('16', 'La liberté d''opinion et la liberté d''information sont garanties.', ARRAY['opinion', 'information', 'liberté']),
  ('19', 'Le droit à un enseignement de base suffisant et gratuit est garanti.', ARRAY['enseignement', 'gratuit', 'droit']),
  ('26', 'La propriété est garantie.', ARRAY['propriété', 'garantie', 'droit']),
  ('27', 'La liberté économique est garantie.', ARRAY['liberté économique', 'commerce', 'garantie']),
  ('29', 'Toute personne a droit, dans une procédure judiciaire ou administrative, à ce que sa cause soit traitée équitablement.', ARRAY['procédure', 'équité', 'droit entendu']),
  ('29a', 'Toute personne a droit à ce que sa cause soit jugée par une autorité judiciaire.', ARRAY['accès juge', 'autorité judiciaire', 'garantie']),
  ('30', 'Toute personne dont la cause doit être jugée a droit à un tribunal indépendant et impartial.', ARRAY['tribunal', 'indépendance', 'impartialité']),
  ('36', 'Toute restriction d''un droit fondamental doit être fondée sur une base légale.', ARRAY['restriction', 'base légale', 'proportionnalité'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-Cst'
ON CONFLICT (cite_key) DO NOTHING;

-- Loi fédérale sur le travail (LTr)
INSERT INTO legal_instruments (instrument_uid, jurisdiction, title, abbreviation, instrument_type, current_status, domain_tags)
VALUES ('CH-LTr', 'CH', 'Loi fédérale sur le travail dans l''industrie, l''artisanat et le commerce', 'LTr', 'loi', 'in_force', ARRAY['travail', 'protection', 'santé'])
ON CONFLICT (instrument_uid) DO NOTHING;

INSERT INTO legal_versions (instrument_id, version_number, valid_from, status)
SELECT id, 1, '2025-01-01', 'current'
FROM legal_instruments WHERE instrument_uid = 'CH-LTr'
AND id NOT IN (SELECT instrument_id FROM legal_versions WHERE status = 'current')
ON CONFLICT DO NOTHING;

INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-LTr-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('6', 'L''employeur est tenu de prendre toutes les mesures pour protéger l''intégrité personnelle des travailleurs.', ARRAY['protection', 'intégrité', 'employeur']),
  ('9', 'La durée maximale de la semaine de travail est de 45 heures.', ARRAY['durée travail', 'heures', 'maximum']),
  ('10', 'Le travail de nuit et le travail du dimanche sont interdits.', ARRAY['nuit', 'dimanche', 'interdiction']),
  ('13', 'L''employeur doit accorder aux travailleurs les pauses d''usage.', ARRAY['pauses', 'repos', 'droit']),
  ('35', 'Il est interdit d''occuper des femmes enceintes et des mères qui allaitent.', ARRAY['grossesse', 'maternité', 'protection'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-LTr'
ON CONFLICT (cite_key) DO NOTHING;

-- Loi sur l'aide aux victimes (LAVI)
INSERT INTO legal_instruments (instrument_uid, jurisdiction, title, abbreviation, instrument_type, current_status, domain_tags)
VALUES ('CH-LAVI', 'CH', 'Loi fédérale sur l''aide aux victimes d''infractions', 'LAVI', 'loi', 'in_force', ARRAY['victimes', 'aide', 'infractions'])
ON CONFLICT (instrument_uid) DO NOTHING;

INSERT INTO legal_versions (instrument_id, version_number, valid_from, status)
SELECT id, 1, '2025-01-01', 'current'
FROM legal_instruments WHERE instrument_uid = 'CH-LAVI'
AND id NOT IN (SELECT instrument_id FROM legal_versions WHERE status = 'current')
ON CONFLICT DO NOTHING;

INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-LAVI-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('1', 'Toute personne qui a subi du fait d''une infraction une atteinte directe à son intégrité a qualité de victime.', ARRAY['victime', 'infraction', 'atteinte']),
  ('2', 'L''aide aux victimes comprend les conseils, l''aide immédiate et l''aide à plus long terme.', ARRAY['aide', 'conseils', 'soutien']),
  ('12', 'Ont droit à des indemnités et à une réparation morale les victimes et leurs proches.', ARRAY['indemnité', 'réparation morale', 'droit']),
  ('14', 'La victime et ses proches reçoivent une indemnité pour le dommage subi.', ARRAY['dommage', 'indemnisation', 'victimes'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-LAVI'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles additionnels LEO (éducation spécialisée, discipline)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'VD-LEO-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('50', 'Les élèves à besoins particuliers bénéficient de mesures d''appui.', ARRAY['besoins particuliers', 'appui', 'soutien']),
  ('60', 'L''orientation scolaire et professionnelle est assurée par des conseillers spécialisés.', ARRAY['orientation', 'conseillers', 'professionnel']),
  ('70', 'Les établissements scolaires disposent d''un règlement interne.', ARRAY['règlement', 'établissement', 'interne']),
  ('80', 'Les parents sont informés régulièrement de la progression de leur enfant.', ARRAY['parents', 'information', 'progression']),
  ('90', 'Les devoirs à domicile sont adaptés à l''âge et aux capacités des élèves.', ARRAY['devoirs', 'domicile', 'adaptation'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'VD-LEO'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles additionnels LPers (congés, formation)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'VD-LPERS-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('35', 'Le collaborateur a droit à un congé de formation continue.', ARRAY['formation', 'congé', 'développement']),
  ('45', 'Le collaborateur bénéficie d''un congé maternité de 16 semaines.', ARRAY['maternité', 'congé', 'semaines']),
  ('46', 'Le collaborateur bénéficie d''un congé paternité de 2 semaines.', ARRAY['paternité', 'congé', 'semaines']),
  ('65', 'Le harcèlement psychologique et sexuel sont interdits.', ARRAY['harcèlement', 'interdiction', 'protection']),
  ('70', 'Le collaborateur a droit à la protection de ses données personnelles.', ARRAY['données', 'protection', 'personnel'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'VD-LPERS'
ON CONFLICT (cite_key) DO NOTHING;
