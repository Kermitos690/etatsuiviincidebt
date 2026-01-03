-- Enrichissement LKB avec cite_key
INSERT INTO legal_units (instrument_id, version_id, unit_type, article_number, cite_key, title, content_text, hash_sha256)
SELECT li.id, lv.id, 'article', '28', 'LEO-art-28', 'Obligation scolaire', 'Obligation scolaire dès 4 ans.', encode(sha256('LEO-28'::bytea), 'hex')
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.valid_to IS NULL
WHERE li.abbreviation = 'LEO' AND NOT EXISTS (SELECT 1 FROM legal_units lu WHERE lu.cite_key = 'LEO-art-28');

INSERT INTO legal_units (instrument_id, version_id, unit_type, article_number, cite_key, title, content_text, hash_sha256)
SELECT li.id, lv.id, 'article', '98', 'LEO-art-98', 'Mesures disciplinaires', 'Mesures proportionnées.', encode(sha256('LEO-98'::bytea), 'hex')
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.valid_to IS NULL
WHERE li.abbreviation = 'LEO' AND NOT EXISTS (SELECT 1 FROM legal_units lu WHERE lu.cite_key = 'LEO-art-98');

INSERT INTO legal_units (instrument_id, version_id, unit_type, article_number, cite_key, title, content_text, hash_sha256)
SELECT li.id, lv.id, 'article', '26', 'LProMin-art-26', 'Signalement obligatoire', 'Signalement par professionnels.', encode(sha256('LProMin-26'::bytea), 'hex')
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.valid_to IS NULL
WHERE li.abbreviation = 'LProMin' AND NOT EXISTS (SELECT 1 FROM legal_units lu WHERE lu.cite_key = 'LProMin-art-26');

INSERT INTO legal_units (instrument_id, version_id, unit_type, article_number, cite_key, title, content_text, hash_sha256)
SELECT li.id, lv.id, 'article', '390', 'CC-art-390', 'Curatelle', 'Conditions de la curatelle.', encode(sha256('CC-390'::bytea), 'hex')
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.valid_to IS NULL
WHERE li.abbreviation = 'CC' AND NOT EXISTS (SELECT 1 FROM legal_units lu WHERE lu.cite_key = 'CC-art-390');

INSERT INTO legal_units (instrument_id, version_id, unit_type, article_number, cite_key, title, content_text, hash_sha256)
SELECT li.id, lv.id, 'article', '426', 'CC-art-426', 'PAFA', 'Placement à fins d''assistance.', encode(sha256('CC-426'::bytea), 'hex')
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.valid_to IS NULL
WHERE li.abbreviation = 'CC' AND NOT EXISTS (SELECT 1 FROM legal_units lu WHERE lu.cite_key = 'CC-art-426');

INSERT INTO legal_units (instrument_id, version_id, unit_type, article_number, cite_key, title, content_text, hash_sha256)
SELECT li.id, lv.id, 'article', '8', 'Cst-art-8', 'Égalité', 'Égalité devant la loi.', encode(sha256('Cst-8'::bytea), 'hex')
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.valid_to IS NULL
WHERE li.abbreviation = 'Cst' AND NOT EXISTS (SELECT 1 FROM legal_units lu WHERE lu.cite_key = 'Cst-art-8');

INSERT INTO legal_units (instrument_id, version_id, unit_type, article_number, cite_key, title, content_text, hash_sha256)
SELECT li.id, lv.id, 'article', '11', 'Cst-art-11', 'Protection enfants', 'Protection particulière enfants.', encode(sha256('Cst-11'::bytea), 'hex')
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.valid_to IS NULL
WHERE li.abbreviation = 'Cst' AND NOT EXISTS (SELECT 1 FROM legal_units lu WHERE lu.cite_key = 'Cst-art-11');

INSERT INTO legal_units (instrument_id, version_id, unit_type, article_number, cite_key, title, content_text, hash_sha256)
SELECT li.id, lv.id, 'article', '312', 'CP-art-312', 'Abus autorité', 'Abus de pouvoir.', encode(sha256('CP-312'::bytea), 'hex')
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.valid_to IS NULL
WHERE li.abbreviation = 'CP' AND NOT EXISTS (SELECT 1 FROM legal_units lu WHERE lu.cite_key = 'CP-art-312');