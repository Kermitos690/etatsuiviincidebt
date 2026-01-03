// Key articles for Vaud cantonal laws - organized by law code
export interface ArticleDefinition {
  code_name: string;
  article_number: string;
  alinea?: string;
  lettre?: string;
  article_text: string;
  keywords: string[];
  is_key_article: boolean;
}

export const VAUD_ARTICLES: ArticleDefinition[] = [
  // ============================================
  // CST-VD - Constitution vaudoise (articles clés)
  // ============================================
  { code_name: 'Cst-VD', article_number: '1', article_text: 'Le Canton de Vaud est une république démocratique. Il est l\'un des États de la Confédération suisse.', keywords: ['république', 'démocratie', 'état'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '6', article_text: 'La dignité humaine est inviolable.', keywords: ['dignité', 'droits fondamentaux'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '7', article_text: 'Tous les êtres humains sont égaux en droit. Nul ne doit subir de discrimination du fait notamment de son origine, de son sexe, de son âge, de sa langue, de sa situation sociale, de son mode de vie, de ses convictions religieuses, philosophiques ou politiques, ou du fait d\'une déficience physique, mentale ou psychique.', keywords: ['égalité', 'discrimination', 'origine', 'sexe', 'handicap'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '8', article_text: 'L\'État et les communes garantissent à chacun le respect de sa vie et de son intégrité physique et psychique.', keywords: ['intégrité', 'vie', 'protection'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '10', article_text: 'La liberté personnelle est inviolable. Elle comprend notamment l\'intégrité physique et psychique, la liberté de mouvement et la protection contre les traitements arbitraires.', keywords: ['liberté', 'intégrité', 'mouvement', 'arbitraire'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '11', article_text: 'La vie privée et familiale, le domicile, le secret des lettres et télécommunications sont garantis.', keywords: ['vie privée', 'famille', 'domicile', 'secret'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '12', article_text: 'Toute personne a le droit d\'être protégée contre l\'utilisation abusive de données la concernant.', keywords: ['données', 'protection', 'vie privée'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '17', article_text: 'Toute personne a le droit d\'accéder aux informations et documents officiels, sauf si un intérêt prépondérant s\'y oppose.', keywords: ['transparence', 'information', 'accès', 'documents'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '23', article_text: 'Les droits fondamentaux doivent être réalisés dans l\'ensemble de l\'ordre juridique. Quiconque assume une tâche de l\'État est lié par les droits fondamentaux et contribue à leur réalisation.', keywords: ['droits fondamentaux', 'état', 'réalisation'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '29', article_text: 'Dans ses relations avec l\'administration, toute personne a le droit d\'être traitée dans un délai raisonnable et de manière non arbitraire.', keywords: ['délai', 'administration', 'arbitraire', 'raisonnable'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '30', article_text: 'Toute personne a droit, dans une procédure judiciaire ou administrative, à ce que sa cause soit traitée équitablement et jugée dans un délai raisonnable.', keywords: ['procédure', 'équitable', 'délai', 'jugement'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '38', article_text: 'Toute personne a droit à des conditions minimales d\'existence.', keywords: ['minimum vital', 'existence', 'aide sociale'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '53', article_text: 'L\'enfant a droit à une protection particulière de son intégrité et à l\'encouragement de son développement.', keywords: ['enfant', 'protection', 'développement', 'intégrité'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '61', article_text: 'L\'État assure une formation de base gratuite, suffisante et de qualité.', keywords: ['formation', 'école', 'gratuit', 'éducation'], is_key_article: true },
  { code_name: 'Cst-VD', article_number: '63', article_text: 'L\'État prend des mesures de protection de l\'environnement et veille à son intégration dans les autres politiques publiques.', keywords: ['environnement', 'protection', 'durabilité'], is_key_article: true },
  
  // ============================================
  // LEO - Loi sur l'enseignement obligatoire
  // ============================================
  { code_name: 'LEO', article_number: '1', article_text: 'L\'école assure, en collaboration avec les parents, l\'instruction et l\'éducation des enfants. Elle seconde les parents dans leur tâche éducative.', keywords: ['école', 'parents', 'éducation', 'instruction'], is_key_article: true },
  { code_name: 'LEO', article_number: '4', article_text: 'L\'école offre à tous les élèves les meilleures possibilités de développement, d\'intégration et d\'apprentissage.', keywords: ['élève', 'développement', 'intégration', 'apprentissage'], is_key_article: true },
  { code_name: 'LEO', article_number: '5', article_text: 'L\'école est gratuite. L\'instruction obligatoire est assurée par les établissements scolaires publics ou par des établissements privés autorisés.', keywords: ['gratuit', 'école publique', 'école privée'], is_key_article: true },
  { code_name: 'LEO', article_number: '9', article_text: 'La scolarité obligatoire dure onze années, dont deux années d\'école enfantine.', keywords: ['scolarité obligatoire', '11 ans', 'école enfantine'], is_key_article: true },
  { code_name: 'LEO', article_number: '52', article_text: 'Les parents ont le droit d\'être informés du comportement de leur enfant et des résultats obtenus ainsi que d\'être consultés avant toute décision importante pour leur enfant.', keywords: ['parents', 'information', 'comportement', 'résultats'], is_key_article: true },
  { code_name: 'LEO', article_number: '53', article_text: 'Les parents veillent à ce que leur enfant arrive à l\'école reposé, régulièrement et ponctuellement.', keywords: ['parents', 'obligations', 'ponctualité'], is_key_article: true },
  { code_name: 'LEO', article_number: '98', article_text: 'Le directeur est responsable de la gestion pédagogique, administrative et financière de l\'établissement.', keywords: ['directeur', 'gestion', 'établissement'], is_key_article: true },
  { code_name: 'LEO', article_number: '120', article_text: 'Les mesures disciplinaires applicables sont: a) le rappel à l\'ordre; b) les travaux supplémentaires; c) les heures d\'arrêts; d) la suspension temporaire de l\'établissement.', keywords: ['discipline', 'mesure', 'sanction', 'suspension'], is_key_article: true },
  { code_name: 'LEO', article_number: '128', article_text: 'L\'enseignement religieux est facultatif. Les parents qui ne désirent pas que leur enfant suive cet enseignement doivent en informer l\'établissement.', keywords: ['religion', 'enseignement religieux', 'facultatif'], is_key_article: true },
  
  // ============================================
  // LPS - Loi sur la pédagogie spécialisée
  // ============================================
  { code_name: 'LPS', article_number: '1', article_text: 'La présente loi régit les mesures de pédagogie spécialisée destinées aux enfants et adolescents présentant des besoins éducatifs particuliers.', keywords: ['pédagogie spécialisée', 'besoins particuliers', 'enfant'], is_key_article: true },
  { code_name: 'LPS', article_number: '3', article_text: 'Les mesures de pédagogie spécialisée doivent favoriser l\'intégration des enfants et adolescents concernés dans la société.', keywords: ['intégration', 'société', 'inclusion'], is_key_article: true },
  { code_name: 'LPS', article_number: '7', article_text: 'Les mesures ordinaires ont pour but de soutenir l\'élève dans le cadre de l\'enseignement régulier dispensé dans les classes de l\'école ordinaire.', keywords: ['mesures ordinaires', 'soutien', 'classe régulière'], is_key_article: true },
  { code_name: 'LPS', article_number: '10', article_text: 'Les mesures renforcées visent à répondre aux besoins particuliers d\'un élève qui ne peuvent être satisfaits dans le cadre des mesures ordinaires.', keywords: ['mesures renforcées', 'besoins particuliers'], is_key_article: true },
  { code_name: 'LPS', article_number: '17', article_text: 'Le projet pédagogique individualisé définit les objectifs, les moyens et les mesures appropriés aux besoins de l\'élève.', keywords: ['PPI', 'projet pédagogique', 'individualisé'], is_key_article: true },
  
  // ============================================
  // LASV - Loi sur l'action sociale vaudoise
  // ============================================
  { code_name: 'LASV', article_number: '1', article_text: 'La loi régit l\'aide sociale, dans le respect de la dignité des personnes.', keywords: ['aide sociale', 'dignité', 'respect'], is_key_article: true },
  { code_name: 'LASV', article_number: '2', article_text: 'L\'aide sociale a pour but de garantir le minimum vital à toute personne qui ne peut y parvenir par ses propres moyens.', keywords: ['minimum vital', 'aide', 'garantie'], is_key_article: true },
  { code_name: 'LASV', article_number: '3', article_text: 'Le revenu d\'insertion (RI) est une aide financière versée aux personnes qui ne disposent pas des moyens suffisants pour subvenir à leur entretien.', keywords: ['RI', 'revenu d\'insertion', 'aide financière'], is_key_article: true },
  { code_name: 'LASV', article_number: '25', article_text: 'La demande d\'aide sociale est présentée au centre social régional (CSR) du lieu de domicile du requérant.', keywords: ['demande', 'CSR', 'domicile'], is_key_article: true },
  { code_name: 'LASV', article_number: '31', article_text: 'Le bénéficiaire est tenu de se conformer aux mesures d\'insertion qui lui sont proposées dans le cadre de son contrat d\'insertion.', keywords: ['insertion', 'contrat', 'mesures', 'bénéficiaire'], is_key_article: true },
  { code_name: 'LASV', article_number: '40', article_text: 'Le département peut réduire ou supprimer l\'aide sociale en cas de refus de participer aux mesures d\'insertion sans motifs valables.', keywords: ['réduction', 'suppression', 'refus', 'insertion'], is_key_article: true },
  { code_name: 'LASV', article_number: '58', article_text: 'Le bénéficiaire de prestations d\'aide sociale est tenu de rembourser l\'aide reçue lorsque sa situation financière le lui permet.', keywords: ['remboursement', 'aide', 'situation financière'], is_key_article: true },
  
  // ============================================
  // LProMin - Loi sur la protection des mineurs
  // ============================================
  { code_name: 'LProMin', article_number: '1', article_text: 'La présente loi a pour but de protéger les mineurs dont le développement physique, intellectuel, affectif ou social est compromis ou menacé.', keywords: ['protection', 'mineur', 'développement', 'menace'], is_key_article: true },
  { code_name: 'LProMin', article_number: '3', article_text: 'Le service de protection de la jeunesse (SPJ) est l\'autorité cantonale compétente en matière de protection des mineurs.', keywords: ['SPJ', 'autorité', 'protection'], is_key_article: true },
  { code_name: 'LProMin', article_number: '26', article_text: 'Toute personne qui, dans le cadre de l\'exercice de sa profession ou d\'une fonction officielle, a connaissance de faits compromettant le développement d\'un mineur, est tenue d\'en informer le SPJ ou les autorités compétentes.', keywords: ['signalement', 'obligation', 'professionnel', 'SPJ'], is_key_article: true },
  { code_name: 'LProMin', article_number: '30', article_text: 'Le SPJ évalue la situation du mineur et détermine les mesures de protection appropriées.', keywords: ['évaluation', 'mesure', 'protection'], is_key_article: true },
  { code_name: 'LProMin', article_number: '38', article_text: 'Le placement d\'un mineur hors de sa famille ne peut être ordonné que si les autres mesures de protection ont échoué ou sont d\'emblée inadéquates.', keywords: ['placement', 'subsidiarité', 'famille'], is_key_article: true },
  
  // ============================================
  // LAJE - Loi sur l'accueil de jour des enfants
  // ============================================
  { code_name: 'LAJE', article_number: '1', article_text: 'La présente loi a pour but de garantir une offre suffisante de places d\'accueil collectif préscolaire et parascolaire pour les enfants jusqu\'à l\'âge de 12 ans.', keywords: ['accueil', 'crèche', 'parascolaire', '12 ans'], is_key_article: true },
  { code_name: 'LAJE', article_number: '3', article_text: 'L\'État, les communes, les employeurs et les parents participent au financement de l\'accueil de jour des enfants.', keywords: ['financement', 'état', 'commune', 'employeur', 'parents'], is_key_article: true },
  { code_name: 'LAJE', article_number: '15', article_text: 'Les structures d\'accueil doivent obtenir une autorisation d\'exploiter délivrée par le département.', keywords: ['autorisation', 'exploitation', 'structure'], is_key_article: true },
  { code_name: 'LAJE', article_number: '24', article_text: 'Les réseaux d\'accueil de jour sont responsables de la coordination et du développement de l\'offre d\'accueil sur leur territoire.', keywords: ['réseau', 'coordination', 'territoire'], is_key_article: true },
  
  // ============================================
  // LPCFam - Prestations complémentaires familles
  // ============================================
  { code_name: 'LPCFam', article_number: '1', article_text: 'Les prestations complémentaires pour familles visent à lutter contre la pauvreté des familles avec enfants.', keywords: ['pauvreté', 'famille', 'enfant', 'prestation'], is_key_article: true },
  { code_name: 'LPCFam', article_number: '2', article_text: 'Les prestations complémentaires pour familles sont destinées aux familles dont le revenu ne permet pas de couvrir les besoins vitaux.', keywords: ['revenu', 'besoins vitaux', 'famille'], is_key_article: true },
  { code_name: 'LPCFam', article_number: '18', article_text: 'La rente-pont vise à garantir le minimum vital aux personnes arrivant en fin de droit au chômage et proches de l\'âge de la retraite.', keywords: ['rente-pont', 'chômage', 'retraite', 'minimum vital'], is_key_article: true },
  { code_name: 'LPCFam', article_number: '20', article_text: 'La rente-pont est accordée aux personnes âgées de 60 ans révolus qui arrivent en fin de droit aux indemnités de chômage.', keywords: ['60 ans', 'fin de droit', 'chômage'], is_key_article: true },
  
  // ============================================
  // LSP - Loi sur la santé publique
  // ============================================
  { code_name: 'LSP', article_number: '1', article_text: 'La présente loi a pour but de protéger, d\'améliorer et de promouvoir la santé de la population.', keywords: ['santé', 'population', 'protection', 'promotion'], is_key_article: true },
  { code_name: 'LSP', article_number: '21', article_text: 'Toute personne a droit aux soins qu\'exige son état de santé.', keywords: ['droit aux soins', 'santé', 'patient'], is_key_article: true },
  { code_name: 'LSP', article_number: '22', article_text: 'Aucun soin ne peut être fourni sans le consentement libre et éclairé du patient.', keywords: ['consentement', 'patient', 'libre', 'éclairé'], is_key_article: true },
  { code_name: 'LSP', article_number: '23', article_text: 'Le patient a droit à des informations claires et appropriées sur son état de santé, le traitement et les alternatives possibles.', keywords: ['information', 'patient', 'traitement', 'alternative'], is_key_article: true },
  { code_name: 'LSP', article_number: '80', article_text: 'Les professionnels de la santé sont tenus au secret professionnel concernant les informations dont ils ont connaissance dans l\'exercice de leur activité.', keywords: ['secret professionnel', 'confidentialité', 'professionnel santé'], is_key_article: true },
  { code_name: 'LSP', article_number: '100', article_text: 'Les médecins doivent être au bénéfice d\'une autorisation de pratiquer délivrée par le département.', keywords: ['autorisation', 'médecin', 'pratiquer'], is_key_article: true },
  
  // ============================================
  // LVPAE - Protection de l'adulte et de l'enfant
  // ============================================
  { code_name: 'LVPAE', article_number: '1', article_text: 'La présente loi règle l\'organisation et le fonctionnement des autorités de protection de l\'enfant et de l\'adulte (APEA).', keywords: ['APEA', 'protection', 'organisation', 'adulte', 'enfant'], is_key_article: true },
  { code_name: 'LVPAE', article_number: '3', article_text: 'L\'APEA est une autorité interdisciplinaire composée d\'au moins trois membres.', keywords: ['APEA', 'interdisciplinaire', 'composition'], is_key_article: true },
  { code_name: 'LVPAE', article_number: '11', article_text: 'L\'APEA peut ordonner les mesures de protection prévues par le Code civil.', keywords: ['mesure de protection', 'curatelle', 'Code civil'], is_key_article: true },
  { code_name: 'LVPAE', article_number: '17', article_text: 'Le placement à des fins d\'assistance (PAFA) est ordonné par l\'APEA ou, en cas d\'urgence, par un médecin habilité.', keywords: ['PAFA', 'placement', 'urgence', 'médecin'], is_key_article: true },
  { code_name: 'LVPAE', article_number: '23', article_text: 'La personne concernée et ses proches peuvent recourir contre les décisions de l\'APEA auprès du Tribunal cantonal.', keywords: ['recours', 'Tribunal cantonal', 'décision'], is_key_article: true },
  
  // ============================================
  // LATC - Aménagement du territoire et constructions
  // ============================================
  { code_name: 'LATC', article_number: '1', article_text: 'La présente loi régit l\'aménagement du territoire cantonal et communal ainsi que la police des constructions.', keywords: ['aménagement', 'construction', 'territoire'], is_key_article: true },
  { code_name: 'LATC', article_number: '47', article_text: 'Aucune construction ne peut être édifiée sans permis de construire délivré par la municipalité.', keywords: ['permis de construire', 'municipalité', 'construction'], is_key_article: true },
  { code_name: 'LATC', article_number: '59', article_text: 'La demande de permis de construire est mise à l\'enquête publique pendant trente jours.', keywords: ['enquête publique', '30 jours', 'permis'], is_key_article: true },
  { code_name: 'LATC', article_number: '75', article_text: 'Toute personne qui justifie d\'un intérêt digne de protection peut former opposition à la demande de permis de construire.', keywords: ['opposition', 'intérêt', 'permis'], is_key_article: true },
  { code_name: 'LATC', article_number: '103', article_text: 'Les constructions édifiées sans permis de construire ou en violation des conditions du permis peuvent être ordonnées à la démolition.', keywords: ['démolition', 'construction illégale', 'violation'], is_key_article: true },
  
  // ============================================
  // LJPA - Procédure administrative
  // ============================================
  { code_name: 'LJPA', article_number: '3', article_text: 'L\'autorité administrative constate les faits d\'office et applique le droit d\'office.', keywords: ['d\'office', 'faits', 'droit', 'autorité'], is_key_article: true },
  { code_name: 'LJPA', article_number: '28', article_text: 'Les parties ont le droit d\'être entendues avant qu\'une décision ne soit prise à leur détriment.', keywords: ['droit d\'être entendu', 'décision', 'partie'], is_key_article: true },
  { code_name: 'LJPA', article_number: '44', article_text: 'Peuvent faire l\'objet d\'un recours les décisions des autorités administratives.', keywords: ['recours', 'décision', 'administratif'], is_key_article: true },
  { code_name: 'LJPA', article_number: '47', article_text: 'Le délai de recours est de trente jours dès la notification de la décision.', keywords: ['délai', '30 jours', 'recours', 'notification'], is_key_article: true },
  { code_name: 'LJPA', article_number: '53', article_text: 'Le recours n\'a pas d\'effet suspensif, sauf disposition légale contraire ou décision de l\'autorité de recours.', keywords: ['effet suspensif', 'recours', 'exception'], is_key_article: true },
  
  // ============================================
  // LInfo - Transparence
  // ============================================
  { code_name: 'LInfo', article_number: '1', article_text: 'La présente loi garantit la liberté d\'accès à l\'information détenue par les autorités publiques.', keywords: ['transparence', 'accès', 'information', 'public'], is_key_article: true },
  { code_name: 'LInfo', article_number: '6', article_text: 'Toute personne a le droit d\'obtenir des informations sur les activités des autorités ainsi que d\'accéder aux documents officiels.', keywords: ['droit d\'accès', 'documents officiels', 'activités'], is_key_article: true },
  { code_name: 'LInfo', article_number: '16', article_text: 'L\'accès aux documents peut être refusé ou limité lorsqu\'un intérêt public ou privé prépondérant s\'y oppose.', keywords: ['refus', 'intérêt public', 'intérêt privé'], is_key_article: true },
  { code_name: 'LInfo', article_number: '21', article_text: 'L\'autorité statue sur la demande d\'accès dans un délai de trente jours.', keywords: ['délai', '30 jours', 'demande', 'décision'], is_key_article: true },
  
  // ============================================
  // LPrD - Protection des données
  // ============================================
  { code_name: 'LPrD', article_number: '1', article_text: 'La présente loi a pour but de protéger la personnalité et les droits fondamentaux des personnes physiques dont les données personnelles sont traitées.', keywords: ['protection', 'personnalité', 'données', 'droits fondamentaux'], is_key_article: true },
  { code_name: 'LPrD', article_number: '8', article_text: 'Les données personnelles ne peuvent être traitées que pour des finalités déterminées et reconnaissables pour la personne concernée.', keywords: ['finalité', 'traitement', 'données', 'transparence'], is_key_article: true },
  { code_name: 'LPrD', article_number: '18', article_text: 'Toute personne peut demander au responsable du traitement si des données personnelles la concernant sont traitées.', keywords: ['droit d\'accès', 'données personnelles', 'responsable'], is_key_article: true },
  { code_name: 'LPrD', article_number: '20', article_text: 'Le préposé cantonal à la protection des données surveille l\'application de la présente loi.', keywords: ['préposé', 'surveillance', 'contrôle'], is_key_article: true },
  
  // ============================================
  // LPol - Police cantonale
  // ============================================
  { code_name: 'LPol', article_number: '1', article_text: 'La police cantonale vaudoise a pour mission d\'assurer la sécurité publique, de prévenir les infractions et de maintenir l\'ordre public.', keywords: ['sécurité publique', 'prévention', 'ordre public'], is_key_article: true },
  { code_name: 'LPol', article_number: '15', article_text: 'La police peut procéder à des contrôles d\'identité lorsque des indices laissent présumer qu\'une infraction a été commise ou va être commise.', keywords: ['contrôle d\'identité', 'infraction', 'indices'], is_key_article: true },
  { code_name: 'LPol', article_number: '22', article_text: 'L\'usage de la contrainte physique et des moyens auxiliaires doit être proportionné aux circonstances.', keywords: ['contrainte', 'proportionnalité', 'moyens'], is_key_article: true },
  { code_name: 'LPol', article_number: '28', article_text: 'Toute personne estimant avoir subi un préjudice du fait de l\'activité de la police peut déposer une plainte.', keywords: ['plainte', 'préjudice', 'recours'], is_key_article: true },
  
  // ============================================
  // LEP - Exécution des peines
  // ============================================
  { code_name: 'LEP', article_number: '1', article_text: 'La présente loi régit l\'exécution des peines privatives de liberté et des mesures privatives de liberté.', keywords: ['peine', 'détention', 'exécution', 'mesure'], is_key_article: true },
  { code_name: 'LEP', article_number: '3', article_text: 'L\'exécution des peines vise la réinsertion sociale du condamné et la protection de la collectivité.', keywords: ['réinsertion', 'protection', 'société'], is_key_article: true },
  { code_name: 'LEP', article_number: '32', article_text: 'La semi-détention permet au condamné de continuer à exercer son activité professionnelle ou à suivre une formation.', keywords: ['semi-détention', 'travail', 'formation'], is_key_article: true },
  { code_name: 'LEP', article_number: '38', article_text: 'Le bracelet électronique peut être accordé aux condamnés qui remplissent les conditions légales.', keywords: ['bracelet électronique', 'surveillance électronique'], is_key_article: true },
  
  // ============================================
  // LRou - Routes
  // ============================================
  { code_name: 'LRou', article_number: '1', article_text: 'La présente loi régit l\'établissement, l\'aménagement, l\'entretien et la gestion des routes cantonales et communales.', keywords: ['route', 'entretien', 'aménagement'], is_key_article: true },
  { code_name: 'LRou', article_number: '5', article_text: 'Les routes sont classées en routes nationales, routes cantonales et routes communales selon leur importance.', keywords: ['classement', 'nationale', 'cantonale', 'communale'], is_key_article: true },
  { code_name: 'LRou', article_number: '38', article_text: 'Les constructions doivent respecter les distances minimales par rapport à la chaussée.', keywords: ['distance', 'construction', 'chaussée'], is_key_article: true },
  
  // ============================================
  // LMTP - Mobilité et transports publics
  // ============================================
  { code_name: 'LMTP', article_number: '1', article_text: 'La présente loi a pour but de favoriser une mobilité durable et efficiente, de promouvoir les transports publics et la mobilité douce.', keywords: ['mobilité', 'transports publics', 'durable'], is_key_article: true },
  { code_name: 'LMTP', article_number: '8', article_text: 'L\'État et les communes contribuent au financement de l\'exploitation des lignes de transports publics.', keywords: ['financement', 'ligne', 'exploitation', 'subvention'], is_key_article: true },
  { code_name: 'LMTP', article_number: '15', article_text: 'La planification de la mobilité est coordonnée avec l\'aménagement du territoire.', keywords: ['planification', 'aménagement', 'coordination'], is_key_article: true },
  
  // ============================================
  // LEAE - Activités économiques
  // ============================================
  { code_name: 'LEAE', article_number: '1', article_text: 'La présente loi régit l\'exercice des activités économiques qui nécessitent une autorisation.', keywords: ['activité économique', 'autorisation', 'commerce'], is_key_article: true },
  { code_name: 'LEAE', article_number: '18', article_text: 'Les établissements publics tels que cafés, restaurants et hôtels sont soumis à une licence délivrée par la préfecture.', keywords: ['licence', 'restaurant', 'café', 'hôtel'], is_key_article: true },
  { code_name: 'LEAE', article_number: '35', article_text: 'Les magasins peuvent être ouverts du lundi au samedi de 6h00 à 19h00 et le dimanche de 9h00 à 18h00 dans les zones touristiques.', keywords: ['horaires', 'ouverture', 'magasin', 'dimanche'], is_key_article: true },
  
  // ============================================
  // LI - Impôts directs
  // ============================================
  { code_name: 'LI', article_number: '1', article_text: 'Le Canton perçoit un impôt sur le revenu et la fortune des personnes physiques et un impôt sur le bénéfice et le capital des personnes morales.', keywords: ['impôt', 'revenu', 'fortune', 'bénéfice', 'capital'], is_key_article: true },
  { code_name: 'LI', article_number: '7', article_text: 'L\'impôt sur le revenu est calculé sur l\'ensemble des revenus du contribuable après déduction des frais d\'acquisition.', keywords: ['revenu', 'calcul', 'déduction'], is_key_article: true },
  { code_name: 'LI', article_number: '46', article_text: 'L\'impôt sur la fortune a pour objet la fortune nette du contribuable au 31 décembre de la période fiscale.', keywords: ['fortune', 'nette', '31 décembre'], is_key_article: true },
  { code_name: 'LI', article_number: '180', article_text: 'La période de taxation correspond à l\'année civile. L\'impôt est établi pour chaque période fiscale.', keywords: ['période fiscale', 'année civile', 'taxation'], is_key_article: true },
  
  // ============================================
  // LC - Communes
  // ============================================
  { code_name: 'LC', article_number: '1', article_text: 'Les communes sont des collectivités de droit public dotées de la personnalité juridique.', keywords: ['commune', 'collectivité', 'personnalité juridique'], is_key_article: true },
  { code_name: 'LC', article_number: '2', article_text: 'Les communes jouissent de l\'autonomie dans les limites fixées par la Constitution et les lois.', keywords: ['autonomie', 'commune', 'Constitution'], is_key_article: true },
  { code_name: 'LC', article_number: '3', article_text: 'Les organes de la commune sont le conseil général ou communal, la municipalité et le syndic.', keywords: ['conseil', 'municipalité', 'syndic', 'organe'], is_key_article: true },
  { code_name: 'LC', article_number: '90', article_text: 'La municipalité est l\'autorité exécutive de la commune. Elle administre les affaires courantes.', keywords: ['municipalité', 'exécutif', 'administration'], is_key_article: true },
  
  // ============================================
  // LVLEne - Énergie
  // ============================================
  { code_name: 'LVLEne', article_number: '1', article_text: 'La présente loi vise à promouvoir une utilisation économe et rationnelle de l\'énergie ainsi que le recours aux énergies renouvelables.', keywords: ['énergie', 'renouvelable', 'économie', 'efficience'], is_key_article: true },
  { code_name: 'LVLEne', article_number: '15', article_text: 'Les nouvelles constructions doivent respecter les standards énergétiques fixés par le département.', keywords: ['construction', 'standard', 'énergétique'], is_key_article: true },
  { code_name: 'LVLEne', article_number: '28', article_text: 'L\'État peut accorder des subventions pour les mesures d\'assainissement énergétique des bâtiments.', keywords: ['subvention', 'rénovation', 'assainissement'], is_key_article: true },
  
  // ============================================
  // LMS - Monuments et sites
  // ============================================
  { code_name: 'LMS', article_number: '1', article_text: 'La présente loi a pour but la protection, la conservation et la mise en valeur du patrimoine bâti et archéologique.', keywords: ['patrimoine', 'monument', 'conservation', 'protection'], is_key_article: true },
  { code_name: 'LMS', article_number: '8', article_text: 'Les monuments historiques et les sites qui présentent un intérêt public peuvent être classés par le Conseil d\'État.', keywords: ['classement', 'monument', 'intérêt public'], is_key_article: true },
  { code_name: 'LMS', article_number: '15', article_text: 'Le propriétaire d\'un bien classé est tenu d\'assurer sa conservation et son entretien.', keywords: ['propriétaire', 'entretien', 'conservation'], is_key_article: true },
  { code_name: 'LMS', article_number: '20', article_text: 'L\'État peut accorder des aides financières pour la conservation et la restauration des monuments classés.', keywords: ['aide', 'restauration', 'subvention'], is_key_article: true },
  
  // ============================================
  // LSEP - Sport et éducation physique
  // ============================================
  { code_name: 'LSEP', article_number: '1', article_text: 'La présente loi a pour but de promouvoir l\'éducation physique, le sport et l\'activité physique pour tous.', keywords: ['sport', 'éducation physique', 'promotion'], is_key_article: true },
  { code_name: 'LSEP', article_number: '5', article_text: 'L\'enseignement de l\'éducation physique est obligatoire à tous les degrés de la scolarité.', keywords: ['obligatoire', 'école', 'enseignement'], is_key_article: true },
  { code_name: 'LSEP', article_number: '12', article_text: 'L\'État et les communes peuvent soutenir financièrement les associations sportives et la construction d\'infrastructures sportives.', keywords: ['subvention', 'association', 'infrastructure'], is_key_article: true },
  
  // ============================================
  // LGD - Gestion des déchets
  // ============================================
  { code_name: 'LGD', article_number: '1', article_text: 'La présente loi a pour but de protéger l\'être humain, les animaux, les plantes et leurs biocénoses contre les atteintes nuisibles dues aux déchets.', keywords: ['déchet', 'protection', 'environnement'], is_key_article: true },
  { code_name: 'LGD', article_number: '8', article_text: 'Le principe du pollueur-payeur s\'applique. Celui qui génère des déchets supporte les coûts de leur élimination.', keywords: ['pollueur-payeur', 'coût', 'élimination'], is_key_article: true },
  { code_name: 'LGD', article_number: '15', article_text: 'Les communes sont responsables de la collecte et de l\'élimination des déchets urbains.', keywords: ['commune', 'collecte', 'déchets urbains'], is_key_article: true },
  { code_name: 'LGD', article_number: '20', article_text: 'Le tri des déchets valorisables est obligatoire.', keywords: ['tri', 'recyclage', 'obligatoire'], is_key_article: true },
  
  // ============================================
  // LPêche - Pêche
  // ============================================
  { code_name: 'LPêche', article_number: '1', article_text: 'La présente loi règle l\'exercice de la pêche dans les eaux du canton et la protection de la faune aquatique.', keywords: ['pêche', 'eau', 'faune aquatique', 'protection'], is_key_article: true },
  { code_name: 'LPêche', article_number: '10', article_text: 'L\'exercice de la pêche est subordonné à l\'obtention d\'un permis délivré par le département.', keywords: ['permis', 'pêche', 'autorisation'], is_key_article: true },
  { code_name: 'LPêche', article_number: '20', article_text: 'Le département fixe les périodes de protection pendant lesquelles la capture de certaines espèces est interdite.', keywords: ['période de protection', 'espèce', 'interdiction'], is_key_article: true },
  
  // ============================================
  // LFaune - Faune (chasse)
  // ============================================
  { code_name: 'LFaune', article_number: '1', article_text: 'La présente loi a pour but la protection, la conservation et la gestion de la faune sauvage et de ses biotopes.', keywords: ['faune', 'protection', 'biotope', 'gestion'], is_key_article: true },
  { code_name: 'LFaune', article_number: '3', article_text: 'Le régime de la chasse dans le canton est le régime de la chasse à permis.', keywords: ['chasse', 'permis', 'régime'], is_key_article: true },
  { code_name: 'LFaune', article_number: '12', article_text: 'Le département délivre le permis de chasser après examen attestant des connaissances suffisantes du candidat.', keywords: ['permis de chasser', 'examen', 'candidat'], is_key_article: true },
  { code_name: 'LFaune', article_number: '25', article_text: 'Le Conseil d\'État fixe les espèces pouvant être chassées, les périodes de chasse et les plans de tir.', keywords: ['espèce', 'période', 'plan de tir'], is_key_article: true }
];
