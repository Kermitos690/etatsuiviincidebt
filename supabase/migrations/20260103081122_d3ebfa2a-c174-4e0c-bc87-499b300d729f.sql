
-- Articles additionnels du Code civil suisse (famille, tutelle, successions)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CC-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('11', 'Toute personne jouit des droits civils.', ARRAY['capacité', 'droits civils', 'personne']),
  ('12', 'Quiconque a l''exercice des droits civils est capable d''acquérir et de s''obliger.', ARRAY['capacité', 'exercice', 'obligation']),
  ('16', 'Toute personne qui n''est pas privée de la faculté d''agir raisonnablement est capable de discernement.', ARRAY['discernement', 'faculté', 'raison']),
  ('19', 'Les personnes capables de discernement mais privées de l''exercice des droits civils ne peuvent s''obliger par leurs propres actes.', ARRAY['capacité', 'discernement', 'mineurs']),
  ('29', 'Celui dont le nom est contesté peut demander au juge la reconnaissance de son droit.', ARRAY['nom', 'protection', 'identité']),
  ('159', 'La célébration du mariage crée l''union conjugale.', ARRAY['mariage', 'union', 'célébration']),
  ('163', 'Mari et femme contribuent, chacun selon ses facultés, à l''entretien convenable de la famille.', ARRAY['famille', 'entretien', 'contribution']),
  ('165', 'Lorsqu''un époux a collaboré à la profession de son conjoint dans une mesure supérieure à sa contribution normale, il a droit à une indemnité équitable.', ARRAY['indemnité', 'profession', 'collaboration']),
  ('176', 'Le juge peut ordonner la séparation de biens si l''un des époux le demande pour de justes motifs.', ARRAY['séparation biens', 'justes motifs', 'régime']),
  ('296', 'L''autorité parentale appartient aux père et mère.', ARRAY['autorité parentale', 'parents', 'enfant']),
  ('301', 'Les père et mère déterminent les soins à donner à l''enfant, dirigent son éducation et prennent les décisions nécessaires.', ARRAY['éducation', 'soins', 'décisions']),
  ('311', 'Si d''autres mesures sont demeurées sans effet ou paraissent d''emblée insuffisantes, l''autorité de protection de l''enfant peut retirer l''enfant.', ARRAY['retrait', 'protection', 'mesures']),
  ('457', 'Les héritiers légaux sont les descendants, les père et mère et leur postérité, les grand-parents et leur postérité.', ARRAY['succession', 'héritiers', 'parenté']),
  ('470', 'Celui qui a des descendants, un conjoint survivant, des père et mère, des frères et sœurs peut disposer par testament ou pacte successoral de la portion disponible.', ARRAY['testament', 'réserve', 'disponible']),
  ('471', 'La réserve est de la moitié du droit de succession pour les descendants.', ARRAY['réserve', 'descendants', 'succession']),
  ('522', 'Le testament peut être annulé si le testateur n''était pas capable de disposer au moment où il l''a fait.', ARRAY['testament', 'capacité', 'annulation']),
  ('560', 'Les héritiers acquièrent de plein droit l''universalité de la succession dès que celle-ci est ouverte.', ARRAY['succession', 'acquisition', 'universalité']),
  ('641', 'Le propriétaire d''une chose a le droit d''en disposer librement, dans les limites de la loi.', ARRAY['propriété', 'disposition', 'liberté']),
  ('679', 'Celui qui est atteint ou menacé d''un dommage parce qu''un propriétaire excède son droit peut actionner ce propriétaire.', ARRAY['trouble', 'propriété', 'voisinage']),
  ('684', 'Le propriétaire est tenu, dans l''exercice de son droit, spécialement dans ses travaux d''exploitation, de s''abstenir de tout excès au détriment de la propriété du voisin.', ARRAY['voisinage', 'excès', 'exploitation'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CC'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles additionnels du Code des obligations (droit du travail, responsabilité)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CO-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('20', 'Le contrat est nul s''il a pour objet une chose impossible, illicite ou contraire aux mœurs.', ARRAY['nullité', 'contrat', 'illicéité']),
  ('21', 'En cas de lésion manifeste entre les prestations promises, la partie lésée peut résilier le contrat.', ARRAY['lésion', 'résiliation', 'contrat']),
  ('28', 'La partie induite à contracter par le dol de l''autre n''est pas obligée, même si son erreur n''est pas essentielle.', ARRAY['dol', 'erreur', 'tromperie']),
  ('29', 'Si la contrainte exercée par l''une des parties est de nature à inspirer une crainte fondée, la partie menacée peut résilier le contrat.', ARRAY['contrainte', 'crainte', 'menace']),
  ('42', 'La preuve du dommage incombe au demandeur.', ARRAY['preuve', 'dommage', 'demandeur']),
  ('43', 'Le juge détermine le mode ainsi que l''étendue de la réparation.', ARRAY['réparation', 'juge', 'mode']),
  ('44', 'Le juge peut réduire les dommages-intérêts si le lésé a consenti à la lésion.', ARRAY['réduction', 'dommages', 'consentement']),
  ('47', 'Le juge peut, en tenant compte de circonstances particulières, allouer à la victime une indemnité équitable à titre de réparation morale.', ARRAY['tort moral', 'indemnité', 'réparation']),
  ('49', 'Celui qui subit une atteinte illicite à sa personnalité a droit à une somme d''argent à titre de réparation morale.', ARRAY['personnalité', 'atteinte', 'réparation morale']),
  ('55', 'L''employeur est responsable du dommage causé par ses travailleurs dans l''accomplissement de leur travail.', ARRAY['responsabilité employeur', 'dommage', 'travailleur']),
  ('320', 'Sauf disposition contraire de la loi, le contrat individuel de travail n''est soumis à aucune forme spéciale.', ARRAY['contrat travail', 'forme', 'liberté']),
  ('322', 'L''employeur paie au travailleur le salaire convenu, usuel ou fixé par un contrat-type ou une convention collective.', ARRAY['salaire', 'paiement', 'employeur']),
  ('324', 'Si l''employeur empêche par sa faute l''exécution du travail ou se trouve en demeure de l''accepter, il reste tenu de payer le salaire.', ARRAY['demeure', 'salaire', 'faute employeur']),
  ('324a', 'Si le travailleur est empêché de travailler sans faute de sa part pour des causes inhérentes à sa personne, l''employeur lui verse le salaire pour un temps limité.', ARRAY['maladie', 'salaire', 'empêchement']),
  ('329', 'L''employeur accorde au travailleur, chaque année de service, au moins quatre semaines de vacances.', ARRAY['vacances', 'congés', 'employeur']),
  ('330a', 'Le travailleur peut demander en tout temps à l''employeur un certificat portant sur la nature et la durée des rapports de travail.', ARRAY['certificat travail', 'attestation', 'employeur']),
  ('331', 'Lorsque l''employeur prend un engagement en faveur du personnel, le travailleur y a droit dès l''institution de prévoyance.', ARRAY['prévoyance', 'institution', 'engagement']),
  ('334', 'Le contrat de durée déterminée prend fin sans qu''il soit nécessaire de donner congé.', ARRAY['durée déterminée', 'fin', 'contrat']),
  ('335', 'Le contrat de durée indéterminée peut être résilié par chacune des parties.', ARRAY['résiliation', 'durée indéterminée', 'congé']),
  ('335c', 'Le contrat peut être résilié pour la fin d''un mois moyennant un délai de congé.', ARRAY['délai congé', 'résiliation', 'mois']),
  ('336a', 'La partie qui résilie abusivement le contrat doit verser à l''autre une indemnité.', ARRAY['indemnité', 'congé abusif', 'réparation']),
  ('336c', 'Après le temps d''essai, l''employeur ne peut pas résilier le contrat pendant une incapacité de travail totale ou partielle.', ARRAY['protection', 'maladie', 'licenciement']),
  ('339', 'À la fin du contrat, toutes les créances qui en découlent deviennent exigibles.', ARRAY['fin contrat', 'créances', 'exigibilité']),
  ('340', 'Le travailleur qui a l''exercice des droits civils peut s''engager par écrit à ne pas faire concurrence à l''employeur.', ARRAY['prohibition concurrence', 'clause', 'engagement']),
  ('343', 'Le tribunal apprécie librement la valeur des moyens de preuve.', ARRAY['preuve', 'tribunal', 'appréciation'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CO'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles additionnels du Code pénal (infractions contre la personne)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-CP-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('111', 'Celui qui aura intentionnellement tué une personne sera puni d''une peine privative de liberté de cinq ans au moins.', ARRAY['meurtre', 'homicide', 'intentionnel']),
  ('117', 'Celui qui, cédant à un mobile honorable, notamment à la pitié, aura donné la mort à une personne sera puni.', ARRAY['meurtre passion', 'mobile honorable', 'pitié']),
  ('122', 'Celui qui, intentionnellement, aura blessé une personne de façon à mettre sa vie en danger sera puni.', ARRAY['lésions graves', 'danger vie', 'intentionnel']),
  ('123', 'Celui qui, intentionnellement, aura fait subir à une personne une autre atteinte à l''intégrité corporelle sera puni.', ARRAY['lésions simples', 'intégrité corporelle', 'atteinte']),
  ('125', 'Celui qui, par négligence, aura fait subir à une personne une atteinte à l''intégrité corporelle sera puni.', ARRAY['lésions négligence', 'imprudence', 'corporel']),
  ('126', 'Celui qui se sera livré sur une personne à des voies de fait qui n''auront causé ni lésion corporelle ni atteinte à la santé sera puni.', ARRAY['voies fait', 'violence', 'sans lésion']),
  ('137', 'Celui qui, pour se procurer ou procurer à un tiers un enrichissement illégitime, se sera approprié une chose mobilière appartenant à autrui sera puni.', ARRAY['appropriation', 'enrichissement', 'vol']),
  ('138', 'Celui qui, pour se procurer ou procurer à un tiers un enrichissement illégitime, se sera approprié une chose mobilière appartenant à autrui et qui lui avait été confiée, sera puni.', ARRAY['abus confiance', 'chose confiée', 'appropriation']),
  ('139', 'Celui qui, pour se procurer ou procurer à un tiers un enrichissement illégitime, aura soustrait une chose mobilière appartenant à autrui dans le but de se l''approprier sera puni.', ARRAY['vol', 'soustraction', 'appropriation']),
  ('143', 'Celui qui, sans droit, aura obtenu pour lui-même ou pour un tiers des données enregistrées ou transmises électroniquement sera puni.', ARRAY['soustraction données', 'informatique', 'électronique']),
  ('146', 'Celui qui, dans le dessein de se procurer ou de procurer à un tiers un enrichissement illégitime, aura astucieusement induit en erreur une personne sera puni.', ARRAY['escroquerie', 'tromperie', 'enrichissement']),
  ('156', 'Celui qui, dans le dessein de se procurer ou de procurer à un tiers un enrichissement illégitime, aura déterminé une personne à des actes préjudiciables à ses intérêts sera puni.', ARRAY['extorsion', 'chantage', 'préjudice']),
  ('179', 'Celui qui, sans droit, aura pris connaissance d''un document qui ne lui était pas destiné sera puni.', ARRAY['violation secret', 'document', 'correspondance']),
  ('185', 'Celui qui, intentionnellement, aura enlevé une personne, l''aura séquestrée ou l''aura d''une autre manière privée de sa liberté sera puni.', ARRAY['séquestration', 'enlèvement', 'liberté']),
  ('187', 'Celui qui aura commis un acte d''ordre sexuel sur un enfant de moins de seize ans sera puni.', ARRAY['acte sexuel', 'mineur', 'enfant']),
  ('189', 'Celui qui, notamment en usant de menace ou de violence, en exerçant sur sa victime des pressions d''ordre psychique, aura contraint une personne à subir un acte analogue à l''acte sexuel sera puni.', ARRAY['contrainte sexuelle', 'violence', 'menace']),
  ('190', 'Celui qui, notamment en usant de menace ou de violence, aura contraint une personne de sexe féminin à subir l''acte sexuel sera puni.', ARRAY['viol', 'contrainte', 'violence']),
  ('198', 'Celui qui aura causé du scandale en se livrant à un acte d''ordre sexuel en présence d''une personne qui y était inopinément confrontée sera puni.', ARRAY['exhibitionnisme', 'scandale', 'sexuel']),
  ('261bis', 'Celui qui, publiquement, aura incité à la haine ou à la discrimination envers une personne ou un groupe en raison de leur appartenance raciale, ethnique ou religieuse sera puni.', ARRAY['discrimination', 'racisme', 'haine'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-CP'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles additionnels LPD (protection données)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'CH-LPD-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('2', 'La présente loi s''applique au traitement de données personnelles effectué par des personnes privées et des organes fédéraux.', ARRAY['champ application', 'personnes privées', 'organes fédéraux']),
  ('3', 'Les données personnelles sont toutes les informations qui se rapportent à une personne identifiée ou identifiable.', ARRAY['définition', 'données personnelles', 'identifiable']),
  ('4', 'Tout traitement de données doit être licite.', ARRAY['licéité', 'traitement', 'données']),
  ('5', 'Les données personnelles sensibles comprennent les opinions politiques, religieuses, les données sur la santé.', ARRAY['données sensibles', 'santé', 'opinions']),
  ('7', 'La personne concernée doit consentir au traitement de ses données.', ARRAY['consentement', 'traitement', 'personne']),
  ('8', 'Quiconque traite des données personnelles doit s''assurer qu''elles sont exactes.', ARRAY['exactitude', 'données', 'vérification']),
  ('13', 'Toute personne peut s''opposer au traitement de données la concernant.', ARRAY['opposition', 'droit', 'traitement']),
  ('14', 'Le responsable du traitement communique les données personnelles à des tiers dans le cadre de l''accomplissement de ses tâches.', ARRAY['communication', 'tiers', 'données']),
  ('15', 'La communication transfrontière de données personnelles est autorisée si le pays destinataire assure un niveau adéquat de protection.', ARRAY['transfrontière', 'communication', 'protection adéquate']),
  ('34', 'Le Préposé fédéral à la protection des données surveille l''application de la présente loi.', ARRAY['surveillance', 'préposé', 'application'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'CH-LPD'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles additionnels LEO Vaud (éducation)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'VD-LEO-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('2', 'L''enseignement obligatoire a pour but le développement de chaque élève.', ARRAY['développement', 'élève', 'but']),
  ('3', 'L''école publique est gratuite.', ARRAY['gratuité', 'école', 'publique']),
  ('4', 'L''enseignement est neutre du point de vue religieux et politique.', ARRAY['neutralité', 'religion', 'politique']),
  ('10', 'La scolarité obligatoire dure onze années.', ARRAY['durée', 'scolarité', 'obligatoire']),
  ('20', 'Les élèves sont tenus de fréquenter l''école avec régularité et ponctualité.', ARRAY['présence', 'régularité', 'obligation']),
  ('30', 'L''évaluation a pour but de guider l''apprentissage de l''élève.', ARRAY['évaluation', 'apprentissage', 'guide']),
  ('40', 'Les élèves ayant des besoins particuliers bénéficient de mesures pédagogiques adaptées.', ARRAY['besoins particuliers', 'mesures', 'adaptation']),
  ('100', 'Les enseignants sont responsables de la conduite de la classe.', ARRAY['enseignants', 'responsabilité', 'classe']),
  ('110', 'Les sanctions disciplinaires sont progressives et proportionnées.', ARRAY['sanctions', 'progressivité', 'proportionnalité']),
  ('125', 'Le conseil de direction est l''organe directeur de l''établissement.', ARRAY['conseil direction', 'établissement', 'organe'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'VD-LEO'
ON CONFLICT (cite_key) DO NOTHING;

-- Articles additionnels LPers Vaud (fonction publique)
INSERT INTO legal_units (instrument_id, version_id, cite_key, unit_type, article_number, content_text, hash_sha256, keywords, is_key_unit)
SELECT li.id, lv.id, 'VD-LPERS-' || d.art, 'article', d.art, d.content, encode(sha256(d.content::bytea), 'hex'), d.keywords, true
FROM legal_instruments li
JOIN legal_versions lv ON lv.instrument_id = li.id AND lv.status = 'current'
CROSS JOIN (VALUES
  ('2', 'Le personnel est soumis à des rapports de droit public.', ARRAY['droit public', 'personnel', 'rapports']),
  ('10', 'Le collaborateur est engagé à la suite d''une procédure de recrutement.', ARRAY['engagement', 'recrutement', 'procédure']),
  ('15', 'Le collaborateur accomplit son travail avec diligence et fidélité.', ARRAY['diligence', 'fidélité', 'travail']),
  ('20', 'Le collaborateur respecte le secret de fonction.', ARRAY['secret fonction', 'confidentialité', 'obligation']),
  ('25', 'Le collaborateur a droit à une rémunération correspondant à sa fonction et à ses responsabilités.', ARRAY['rémunération', 'fonction', 'responsabilités']),
  ('30', 'Le collaborateur a droit aux vacances et aux congés prévus par le règlement.', ARRAY['vacances', 'congés', 'droit']),
  ('40', 'Les rapports de service prennent fin par démission, retraite, licenciement ou décès.', ARRAY['fin rapports', 'démission', 'licenciement']),
  ('50', 'Le licenciement est prononcé pour motif fondé.', ARRAY['licenciement', 'motif fondé', 'sanction']),
  ('55', 'Le collaborateur peut être mis en disponibilité pendant la procédure disciplinaire.', ARRAY['mise disponibilité', 'procédure', 'disciplinaire']),
  ('60', 'Le collaborateur peut faire recours contre les décisions qui le concernent.', ARRAY['recours', 'décision', 'droit'])
) AS d(art, content, keywords)
WHERE li.instrument_uid = 'VD-LPERS'
ON CONFLICT (cite_key) DO NOTHING;
