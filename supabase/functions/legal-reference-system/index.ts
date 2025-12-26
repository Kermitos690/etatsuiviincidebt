import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// BASE LÉGALE SUISSE EXHAUSTIVE - PROTECTION DE L'ADULTE
// "Nul n'est censé ignorer la loi"
// Droit fédéral, cantonal vaudois et règlements internes
// ============================================================================

export const SWISS_LEGAL_BASE = {
  // =========================================================================
  // I. DROIT FÉDÉRAL
  // =========================================================================

  // Code civil - Protection de l'adulte (Art. 360-456 CC)
  protection_adulte: {
    principes_generaux: [
      { article: "Art. 388 CC", titre: "But des mesures de curatelle", description: "Les mesures de curatelle assurent l'assistance, la représentation et la protection de la personne concernée tout en préservant le plus possible son autonomie.", type: "principe", mots_cles: ["autonomie", "protection", "assistance"] },
      { article: "Art. 389 CC", titre: "Subsidiarité et proportionnalité", description: "L'autorité ordonne une mesure si: 1. l'appui fourni par la famille ou les proches ne suffit pas; 2. l'assistance ou la représentation par un tiers n'est pas suffisante. Une mesure de protection n'est ordonnée que si elle est nécessaire et appropriée.", type: "principe", mots_cles: ["subsidiarité", "proportionnalité", "nécessité"] },
    ],
    mandat_inaptitude: [
      { article: "Art. 360 CC", titre: "Mandat pour cause d'inaptitude - Principe", description: "Toute personne ayant l'exercice des droits civils peut charger une personne physique ou morale de lui fournir une assistance personnelle, de gérer son patrimoine ou de la représenter dans les rapports juridiques avec les tiers au cas où elle deviendrait incapable de discernement.", type: "mandat" },
      { article: "Art. 361 CC", titre: "Constitution du mandat", description: "Le mandat pour cause d'inaptitude est constitué en la forme authentique ou par écrit. Il doit être daté et signé de la main du mandant.", type: "forme" },
      { article: "Art. 362 CC", titre: "Révocation du mandat", description: "Le mandant peut révoquer le mandat en tout temps en respectant les formes prévues pour sa constitution ou en détruisant le document.", type: "révocation" },
      { article: "Art. 363 CC", titre: "Acceptation, refus, démission", description: "Le mandataire peut en tout temps notifier au mandant son refus ou sa démission par écrit.", type: "démission" },
      { article: "Art. 364 CC", titre: "Validation par l'autorité", description: "L'autorité de protection de l'adulte valide le mandat lorsque la personne devient incapable de discernement et le met en œuvre.", type: "validation" },
      { article: "Art. 365 CC", titre: "Intérêts du mandant", description: "Le mandataire agit dans l'intérêt du mandant et tient compte, dans la mesure du possible, de ses opinions et souhaits.", type: "devoir" },
      { article: "Art. 366 CC", titre: "Pouvoirs légaux subsidiaires", description: "Lorsqu'il n'y a pas de mandat pour cause d'inaptitude ni de représentation légale suffisante, l'autorité ordonne les mesures de protection nécessaires.", type: "subsidiarité" },
      { article: "Art. 367 CC", titre: "Reddition de comptes du mandataire", description: "Le mandataire rend compte périodiquement de son activité à l'autorité de protection de l'adulte.", type: "contrôle" },
      { article: "Art. 368 CC", titre: "Représentation par le conjoint", description: "Lorsqu'une personne est incapable de discernement et n'a pas établi de mandat, son conjoint ou partenaire enregistré peut la représenter pour les actes juridiques usuels.", type: "représentation" },
      { article: "Art. 369 CC", titre: "Incapacité passagère", description: "L'incapacité passagère de discernement ne fait pas cesser automatiquement les pouvoirs de représentation déjà conférés.", type: "continuité" },
    ],
    types_curatelle: [
      { article: "Art. 390 CC", titre: "Conditions de la curatelle", description: "L'autorité institue une curatelle si une personne majeure est partiellement ou totalement empêchée d'assurer elle-même la sauvegarde de ses intérêts en raison d'une déficience mentale, de troubles psychiques ou d'un autre état de faiblesse.", type: "condition" },
      { article: "Art. 391 CC", titre: "Champ des tâches", description: "L'autorité définit les tâches du curateur en fonction des besoins de la personne concernée. Ces tâches concernent l'assistance personnelle, la gestion du patrimoine ou les rapports juridiques.", type: "définition" },
      { article: "Art. 392 CC", titre: "Curatelle provisoire", description: "L'autorité peut instituer une curatelle provisoire d'urgence, avant même d'avoir examiné la cause au fond, lorsqu'un retard présente un danger.", type: "urgence" },
      { article: "Art. 393 CC", titre: "Curatelle d'accompagnement", description: "Une curatelle d'accompagnement est instituée, avec le consentement de la personne concernée, lorsque celle-ci doit être assistée pour accomplir certains actes.", type: "accompagnement" },
      { article: "Art. 394 CC", titre: "Curatelle de représentation", description: "Une curatelle de représentation est instituée lorsque la personne concernée ne peut pas accomplir certains actes et doit être représentée.", type: "représentation" },
      { article: "Art. 395 CC", titre: "Combinaison des curatelles", description: "Une curatelle d'accompagnement et une curatelle de représentation peuvent être combinées.", type: "combinaison" },
      { article: "Art. 396 CC", titre: "Curatelle de coopération", description: "Une curatelle de coopération est instituée lorsque certains actes de la personne concernée requièrent le consentement du curateur pour être valables.", type: "coopération" },
      { article: "Art. 397 CC", titre: "Curatelle de portée générale", description: "L'autorité institue une curatelle de portée générale si la personne a particulièrement besoin d'aide, notamment lorsque son état requiert une assistance permanente.", type: "portée_générale" },
      { article: "Art. 398 al. 1 CC", titre: "Retrait de l'exercice des droits civils", description: "Le retrait de l'exercice des droits civils ne peut être ordonné que si une curatelle de portée générale est instituée.", type: "retrait_droits" },
    ],
    curateur_devoirs: [
      { article: "Art. 398 al. 2 CC", titre: "Diligence du curateur", description: "Le curateur accomplit sa tâche avec diligence et dans l'intérêt de la personne concernée. Il tient compte autant que possible de son avis.", type: "devoir_diligence" },
      { article: "Art. 399 CC", titre: "Recours au juge", description: "Le curateur peut demander l'intervention de l'autorité de protection de l'adulte lorsqu'une mesure ne peut être exécutée.", type: "recours" },
      { article: "Art. 400 CC", titre: "Gestion du patrimoine", description: "Le curateur gère le patrimoine de la personne concernée avec soin et effectue les opérations juridiques liées à cette gestion.", type: "gestion_patrimoine" },
      { article: "Art. 401 CC", titre: "Placement de fortune", description: "Le curateur place la fortune de manière sûre et, si possible, à un taux d'intérêt convenable.", type: "placement" },
      { article: "Art. 402 CC", titre: "Prélèvements autorisés", description: "Le curateur peut prélever les montants nécessaires à l'accomplissement correct de ses tâches sur les biens de la personne concernée.", type: "prélèvement" },
      { article: "Art. 403 CC", titre: "Comptabilité obligatoire", description: "Le curateur tient les comptes de sa gestion et les soumet périodiquement à l'approbation de l'autorité de protection de l'adulte.", type: "comptabilité" },
      { article: "Art. 404 CC", titre: "Collaboration avec la personne", description: "Le curateur associe la personne concernée, dans la mesure du possible, à l'accomplissement de ses tâches et tient compte de son opinion.", type: "collaboration" },
      { article: "Art. 405 CC", titre: "Droit de s'adresser à l'autorité", description: "La personne concernée ou l'un de ses proches peut s'adresser en tout temps à l'autorité sur des questions concernant l'assistance.", type: "droit_recours" },
      { article: "Art. 406 CC", titre: "Information régulière", description: "Le curateur informe régulièrement la personne concernée et l'autorité de protection de l'adulte de son activité et des résultats obtenus.", type: "information" },
    ],
    actes_consentement: [
      { article: "Art. 407 CC", titre: "Actes pour lesquels la personne concernée est capable", description: "Même sous curatelle, la personne concernée peut conclure des contrats relatifs aux petits besoins de la vie quotidienne.", type: "capacité" },
      { article: "Art. 408 CC", titre: "Actes nécessitant le consentement du curateur", description: "Certains actes juridiques de la personne concernée nécessitent le consentement du curateur pour être valables.", type: "consentement" },
      { article: "Art. 409 CC", titre: "Responsabilité du curateur", description: "Le curateur répond du dommage causé par une violation fautive de ses obligations.", type: "responsabilité" },
      { article: "Art. 410 CC", titre: "Rémunération du curateur", description: "Le curateur a droit à une rémunération appropriée et au remboursement des frais nécessaires, prélevés sur les biens de la personne concernée.", type: "rémunération" },
      { article: "Art. 411 CC", titre: "Rapport et comptes", description: "L'autorité de protection de l'adulte examine le rapport et les comptes du curateur et prend les décisions nécessaires.", type: "contrôle" },
      { article: "Art. 412 CC", titre: "Approbation du rapport", description: "L'autorité approuve le rapport et les comptes lorsqu'ils sont complets et conformes.", type: "approbation" },
      { article: "Art. 413 CC", titre: "Révocation du curateur", description: "L'autorité révoque le curateur d'office ou sur requête si celui-ci ne remplit plus les conditions ou viole gravement ses obligations.", type: "révocation" },
      { article: "Art. 414 CC", titre: "Avis des proches", description: "L'autorité tient compte de l'avis des proches avant de prendre une décision importante.", type: "consultation" },
      { article: "Art. 415 CC", titre: "Surveillance de l'autorité", description: "L'autorité de protection de l'adulte surveille l'activité du curateur et prend les mesures nécessaires en cas de manquement.", type: "surveillance" },
    ],
    actes_autorisation_autorite: [
      { article: "Art. 416 CC", titre: "Actes nécessitant l'autorisation de l'autorité", description: "Les actes suivants requièrent le consentement de l'autorité: acquisition/aliénation d'immeubles, constitution de droits réels, cautions, emprunts importants, contrats de rente viagère, acceptation/répudiation de succession, contrats de société, liquidation d'entreprise, procès importants.", type: "autorisation" },
      { article: "Art. 417 CC", titre: "Conflit d'intérêts", description: "Le curateur ne peut représenter la personne concernée lorsqu'il existe un conflit d'intérêts.", type: "conflit" },
      { article: "Art. 418 CC", titre: "Représentation en cas de conflit", description: "En cas de conflit d'intérêts, l'autorité désigne un curateur de substitution ou agit elle-même.", type: "substitution" },
      { article: "Art. 419 CC", titre: "Action en responsabilité", description: "La personne concernée ou ses héritiers peuvent exercer une action en responsabilité contre le curateur, l'autorité ou le canton.", type: "action" },
      { article: "Art. 420 CC", titre: "Responsabilité du canton", description: "Le canton répond du dommage causé illicitement par les personnes agissant dans le cadre des mesures de protection de l'adulte.", type: "responsabilité_état" },
    ],
    autorite: [
      { article: "Art. 440 CC", titre: "Autorité de protection de l'adulte", description: "L'autorité de protection de l'adulte est une autorité interdisciplinaire. Elle est composée de trois membres au moins.", type: "composition" },
      { article: "Art. 441 CC", titre: "Compétence territoriale", description: "L'autorité du domicile de la personne concernée est compétente pour ordonner des mesures de protection.", type: "compétence" },
      { article: "Art. 442 CC", titre: "Compétence matérielle", description: "L'autorité est compétente pour toutes les mesures de protection de l'adulte prévues par le code civil.", type: "matière" },
      { article: "Art. 443 CC", titre: "Avis obligatoire", description: "Toute personne a le droit d'aviser l'autorité qu'une personne semble avoir besoin d'aide. Les personnes qui ont connaissance d'un tel cas dans l'exercice de leur fonction officielle sont tenues d'en informer l'autorité.", type: "signalement" },
      { article: "Art. 444 CC", titre: "Examen de la requête", description: "L'autorité examine la requête et prend les mesures provisionnelles nécessaires.", type: "examen" },
      { article: "Art. 445 CC", titre: "Maxime d'office et collaboration", description: "L'autorité établit les faits d'office et ordonne les mesures d'instruction nécessaires. Elle peut charger une tierce personne de procéder à une enquête.", type: "instruction" },
      { article: "Art. 446 CC", titre: "Procédure orale et écrite", description: "La procédure est orale ou écrite selon les circonstances. L'audition peut aussi avoir lieu par vidéoconférence.", type: "procédure" },
      { article: "Art. 447 CC", titre: "Audition de la personne concernée", description: "La personne concernée est entendue personnellement, si cela est utile et si son état de santé le permet.", type: "audition" },
      { article: "Art. 448 CC", titre: "Obligation de collaborer des tiers", description: "La personne concernée et les tiers ont l'obligation de collaborer à l'établissement des faits.", type: "collaboration" },
      { article: "Art. 449 CC", titre: "Expertise", description: "L'autorité ordonne une expertise lorsqu'une curatelle de portée générale ou un placement à des fins d'assistance semble nécessaire.", type: "expertise" },
      { article: "Art. 449a CC", titre: "Restriction de la liberté de mouvement", description: "Toute restriction de la liberté de mouvement fait l'objet d'une décision de l'autorité.", type: "liberté" },
      { article: "Art. 449b CC", titre: "Droit d'accès au dossier", description: "La personne concernée a accès à son dossier, sauf si un intérêt prépondérant s'y oppose.", type: "accès" },
      { article: "Art. 449c CC", titre: "Notification des décisions", description: "Les décisions sont notifiées par écrit aux personnes intéressées, avec indication des voies de recours.", type: "notification" },
    ],
    recours: [
      { article: "Art. 450 CC", titre: "Recours devant le juge", description: "Les décisions de l'autorité de protection de l'adulte peuvent faire l'objet d'un recours devant le juge compétent.", type: "recours" },
      { article: "Art. 450a CC", titre: "Objet du recours", description: "Le recours peut porter sur: la violation du droit (y compris l'excès ou l'abus du pouvoir d'appréciation), la constatation inexacte ou incomplète des faits, l'inopportunité.", type: "motifs" },
      { article: "Art. 450b CC", titre: "Délai de recours", description: "Le délai de recours est de 30 jours à compter de la notification de la décision, ou de 10 jours pour les mesures provisionnelles et le placement.", type: "délai" },
      { article: "Art. 450c CC", titre: "Effet suspensif", description: "Le recours a effet suspensif, sauf si l'autorité ou l'instance de recours en décide autrement.", type: "suspensif" },
      { article: "Art. 450d CC", titre: "Consultation du dossier", description: "L'instance de recours peut consulter le dossier de l'autorité de protection de l'adulte.", type: "dossier" },
      { article: "Art. 450e CC", titre: "Renvoi à l'autorité", description: "L'instance de recours peut renvoyer la cause à l'autorité pour nouvelle décision ou réformer elle-même.", type: "renvoi" },
      { article: "Art. 450f CC", titre: "Dispositions complémentaires", description: "Les cantons édictent les dispositions complémentaires de procédure.", type: "cantonal" },
    ],
    placement: [
      { article: "Art. 426 CC", titre: "Placement à des fins d'assistance", description: "Une personne peut être placée dans une institution appropriée lorsqu'elle souffre d'une déficience mentale, de troubles psychiques ou d'un grave état d'abandon et que l'assistance nécessaire ne peut lui être fournie d'une autre manière.", type: "conditions" },
      { article: "Art. 427 CC", titre: "Durée du placement", description: "L'autorité fixe la durée du placement ou renonce à la fixer si la personne accepte le placement.", type: "durée" },
      { article: "Art. 428 CC", titre: "Compétence pour le placement", description: "L'autorité du lieu de domicile ou du lieu de séjour est compétente pour ordonner le placement.", type: "compétence" },
      { article: "Art. 429 CC", titre: "Compétence médicale en cas d'urgence", description: "En cas de péril en la demeure, un médecin peut ordonner le placement pour une durée maximale fixée par le droit cantonal.", type: "urgence" },
      { article: "Art. 430 CC", titre: "Durée maximale du placement médical", description: "La durée maximale du placement ordonné par un médecin est de six semaines.", type: "limite" },
      { article: "Art. 431 CC", titre: "Examen médical d'entrée", description: "L'institution fait procéder à un examen médical de la personne placée dans les plus brefs délais.", type: "examen" },
      { article: "Art. 432 CC", titre: "Libération par l'institution", description: "L'institution libère la personne placée dès que les conditions du placement ne sont plus remplies.", type: "libération" },
      { article: "Art. 433 CC", titre: "Demande de libération", description: "La personne placée ou l'un de ses proches peut demander sa libération à l'autorité en tout temps.", type: "demande" },
      { article: "Art. 434 CC", titre: "Traitement sans consentement", description: "Un traitement médical peut être administré sans le consentement de la personne si elle n'est pas capable de discernement et si le traitement est nécessaire.", type: "traitement" },
      { article: "Art. 435 CC", titre: "Mesures limitant la liberté de mouvement", description: "Des mesures limitant la liberté de mouvement ne peuvent être ordonnées que pour protéger la personne ou des tiers.", type: "restriction" },
      { article: "Art. 436 CC", titre: "Documentation", description: "Toutes les mesures sont documentées. Le dossier médical mentionne le but et la durée des mesures.", type: "documentation" },
      { article: "Art. 437 CC", titre: "Personne de confiance", description: "La personne placée peut désigner une personne de confiance qui l'assistera pendant le séjour et jusqu'à sa libération.", type: "confiance" },
      { article: "Art. 438 CC", titre: "Surveillance des institutions", description: "Les cantons assurent la surveillance des institutions accueillant des personnes placées.", type: "surveillance" },
      { article: "Art. 439 CC", titre: "Recours contre les mesures", description: "La personne concernée ou l'un de ses proches peut contester devant le juge les mesures prises par l'institution.", type: "recours" },
    ],
  },

  // Loi fédérale sur la protection des données (LPD - RS 235.1)
  protection_donnees: {
    principes: [
      { article: "Art. 1 LPD", titre: "But", description: "La LPD vise à protéger la personnalité et les droits fondamentaux des personnes physiques dont les données personnelles font l'objet d'un traitement.", type: "but" },
      { article: "Art. 2 LPD", titre: "Champ d'application", description: "La loi s'applique au traitement de données personnelles effectué par des personnes privées et des organes fédéraux.", type: "application" },
      { article: "Art. 3 LPD", titre: "Champ d'application territorial", description: "La loi s'applique aux états de fait qui déploient des effets en Suisse, même s'ils se sont produits à l'étranger.", type: "territorial" },
      { article: "Art. 5 LPD", titre: "Définitions", description: "Données personnelles: toute information concernant une personne identifiée ou identifiable. Données sensibles: données sur les opinions ou activités religieuses, philosophiques, politiques ou syndicales, la santé, la sphère intime ou l'origine.", type: "définitions" },
      { article: "Art. 6 LPD", titre: "Principes de traitement", description: "Les données personnelles doivent être traitées de manière licite, conforme à la bonne foi et proportionnée. La collecte doit être reconnaissable pour la personne concernée.", type: "principes" },
      { article: "Art. 6 al. 4 LPD", titre: "Exactitude des données", description: "Quiconque traite des données personnelles doit s'assurer de leur exactitude et prendre toutes les mesures appropriées pour rectifier ou détruire les données inexactes.", type: "exactitude" },
      { article: "Art. 7 LPD", titre: "Protection dès la conception", description: "Le responsable du traitement est tenu de prendre les mesures techniques et organisationnelles appropriées pour que le traitement respecte les prescriptions de protection des données.", type: "conception" },
      { article: "Art. 8 LPD", titre: "Sécurité des données", description: "Les données doivent être protégées contre tout traitement non autorisé par des mesures techniques et organisationnelles appropriées.", type: "sécurité" },
    ],
    droits: [
      { article: "Art. 25 LPD", titre: "Droit d'accès", description: "Toute personne peut demander au responsable du traitement si des données la concernant sont traitées.", type: "accès" },
      { article: "Art. 26 LPD", titre: "Restrictions du droit d'accès", description: "Le responsable peut refuser, restreindre ou différer la communication si une loi le prévoit ou si les intérêts de tiers l'exigent.", type: "restriction" },
      { article: "Art. 27 LPD", titre: "Restrictions pour les médias", description: "Le responsable peut refuser l'accès si les données sont utilisées exclusivement pour la publication dans la partie rédactionnelle d'un média.", type: "médias" },
      { article: "Art. 28 LPD", titre: "Restrictions pour les archives", description: "Le responsable peut refuser ou restreindre l'accès si les données sont archivées.", type: "archives" },
      { article: "Art. 29 LPD", titre: "Modalités du droit d'accès", description: "La communication des renseignements est gratuite. Le responsable fournit les renseignements dans les 30 jours.", type: "modalités" },
      { article: "Art. 30 LPD", titre: "Droit de remettre ou de transférer des données", description: "Toute personne peut demander que ses données lui soient remises ou transmises à un tiers dans un format électronique courant.", type: "portabilité" },
      { article: "Art. 32 LPD", titre: "Prétentions en cas d'atteinte", description: "La personne concernée peut exiger la rectification, la destruction ou le blocage des données inexactes ou traitées de manière illicite.", type: "prétentions" },
      { article: "Art. 41 LPD", titre: "Atteintes à la personnalité", description: "Celui qui traite des données personnelles en violation des principes de la LPD porte atteinte à la personnalité de la personne concernée.", type: "atteinte" },
    ],
    sanctions: [
      { article: "Art. 60 LPD", titre: "Violation du devoir de discrétion", description: "Est puni sur plainte d'une amende de 250 000 francs au plus celui qui révèle intentionnellement des données personnelles secrètes.", type: "sanction" },
      { article: "Art. 61 LPD", titre: "Violation du devoir d'informer", description: "Est puni d'une amende de 250 000 francs au plus celui qui, intentionnellement, ne fournit pas les informations requises ou donne de fausses indications.", type: "sanction" },
      { article: "Art. 62 LPD", titre: "Violation du devoir de diligence", description: "Est puni d'une amende de 250 000 francs au plus celui qui, intentionnellement, communique des données à l'étranger en violation des prescriptions.", type: "sanction" },
      { article: "Art. 63 LPD", titre: "Non-respect des décisions du PFPDT", description: "Est puni d'une amende de 250 000 francs au plus celui qui ne respecte pas une décision du PFPDT.", type: "sanction" },
    ],
  },

  // Constitution fédérale (Cst. - RS 101)
  constitution: {
    droits_fondamentaux: [
      { article: "Art. 7 Cst.", titre: "Dignité humaine", description: "La dignité humaine doit être respectée et protégée.", type: "droit_absolu" },
      { article: "Art. 8 Cst.", titre: "Égalité", description: "Tous les êtres humains sont égaux devant la loi. Nul ne doit subir de discrimination.", type: "égalité" },
      { article: "Art. 9 Cst.", titre: "Protection contre l'arbitraire et bonne foi", description: "Toute personne a le droit d'être traitée par les organes de l'État sans arbitraire et conformément aux règles de la bonne foi.", type: "bonne_foi" },
      { article: "Art. 10 Cst.", titre: "Droit à la vie et liberté personnelle", description: "Tout être humain a droit à la vie. La peine de mort est interdite. Tout être humain a droit à la liberté personnelle, à l'intégrité physique et psychique et à la liberté de mouvement.", type: "liberté" },
      { article: "Art. 11 Cst.", titre: "Protection des enfants et des jeunes", description: "Les enfants et les jeunes ont droit à une protection particulière de leur intégrité et à l'encouragement de leur développement.", type: "protection_enfants" },
      { article: "Art. 12 Cst.", titre: "Droit d'obtenir de l'aide dans des situations de détresse", description: "Quiconque est dans une situation de détresse et n'est pas en mesure de subvenir à son entretien a le droit d'être aidé et assisté.", type: "aide" },
      { article: "Art. 13 Cst.", titre: "Protection de la sphère privée", description: "Toute personne a droit au respect de sa vie privée et familiale, de son domicile, de sa correspondance et des relations qu'elle établit par la poste et les télécommunications.", type: "vie_privée" },
    ],
    garanties_procedures: [
      { article: "Art. 29 Cst.", titre: "Garanties générales de procédure", description: "Toute personne a droit, dans une procédure judiciaire ou administrative, à ce que sa cause soit traitée équitablement et jugée dans un délai raisonnable.", type: "équité" },
      { article: "Art. 29 al. 2 Cst.", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues.", type: "audition" },
      { article: "Art. 29 al. 3 Cst.", titre: "Assistance judiciaire gratuite", description: "Toute personne qui ne dispose pas de ressources suffisantes a droit à l'assistance judiciaire gratuite.", type: "assistance" },
      { article: "Art. 29a Cst.", titre: "Garantie de l'accès au juge", description: "Toute personne a droit à ce que sa cause soit jugée par une autorité judiciaire.", type: "accès_juge" },
      { article: "Art. 30 Cst.", titre: "Garanties de procédure judiciaire", description: "Toute personne dont la cause doit être jugée dans une procédure judiciaire a droit à ce que sa cause soit portée devant un tribunal établi par la loi, compétent, indépendant et impartial.", type: "tribunal" },
      { article: "Art. 31 Cst.", titre: "Privation de liberté", description: "Nul ne peut être privé de sa liberté si ce n'est dans les cas prévus par la loi et selon les formes qu'elle prescrit.", type: "liberté" },
      { article: "Art. 32 Cst.", titre: "Procédure pénale", description: "Toute personne est présumée innocente jusqu'à ce qu'elle fasse l'objet d'une condamnation entrée en force.", type: "présomption" },
    ],
  },

  // Loi fédérale sur la procédure administrative (PA - RS 172.021)
  procedure_administrative: {
    principes: [
      { article: "Art. 1 PA", titre: "Champ d'application", description: "La présente loi s'applique à la procédure devant les autorités administratives fédérales.", type: "champ" },
      { article: "Art. 5 PA", titre: "Notion de décision", description: "Sont des décisions les mesures prises par les autorités dans des cas d'espèce, fondées sur le droit public fédéral.", type: "définition" },
      { article: "Art. 6 PA", titre: "Qualité de partie", description: "Ont qualité de partie les personnes dont les droits ou les obligations pourraient être touchés par la décision.", type: "partie" },
      { article: "Art. 7 PA", titre: "Examen de la compétence", description: "L'autorité examine d'office si elle est compétente.", type: "compétence" },
      { article: "Art. 8 PA", titre: "Récusation", description: "Les personnes qui doivent se récuser ne peuvent prendre part à l'instruction.", type: "récusation" },
      { article: "Art. 10 PA", titre: "Désignation d'un mandataire", description: "L'autorité peut demander à une partie de désigner un mandataire.", type: "mandataire" },
      { article: "Art. 12 PA", titre: "Établissement des faits d'office", description: "L'autorité constate les faits d'office et n'est pas liée par les allégués des parties.", type: "instruction" },
    ],
    droits_parties: [
      { article: "Art. 26 PA", titre: "Droit de consulter les pièces", description: "La partie ou son mandataire a le droit de consulter les pièces du dossier destinées à servir de moyens de preuve.", type: "consultation" },
      { article: "Art. 27 PA", titre: "Consultation refusée", description: "L'autorité ne peut refuser la consultation que si des intérêts publics importants ou des intérêts privés importants de tiers l'exigent.", type: "refus" },
      { article: "Art. 28 PA", titre: "Pièces tenues secrètes", description: "Une pièce dont la consultation a été refusée ne peut être utilisée contre une partie que si l'autorité lui en a communiqué le contenu essentiel.", type: "secret" },
      { article: "Art. 29 PA", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues. Ce droit comprend le droit de s'exprimer, de consulter le dossier, d'offrir des preuves.", type: "audition" },
      { article: "Art. 30 PA", titre: "Audition des parties", description: "L'autorité entend les parties avant de prendre une décision.", type: "audition" },
      { article: "Art. 30a PA", titre: "Participation à la procédure", description: "Les parties peuvent participer à l'audition des témoins et à l'inspection locale.", type: "participation" },
      { article: "Art. 31 PA", titre: "Délai pour se prononcer", description: "L'autorité impartit aux parties un délai suffisant pour se prononcer.", type: "délai" },
      { article: "Art. 32 PA", titre: "Moyens de preuve", description: "L'autorité apprécie librement les preuves. Elle peut refuser d'administrer des preuves non pertinentes.", type: "preuves" },
    ],
    decisions: [
      { article: "Art. 34 PA", titre: "Notification des décisions", description: "L'autorité notifie ses décisions aux parties par écrit.", type: "notification" },
      { article: "Art. 35 PA", titre: "Motivation des décisions", description: "Les décisions doivent être motivées. Elles doivent indiquer les voies de recours.", type: "motivation" },
      { article: "Art. 38 PA", titre: "Vice de la notification", description: "La notification irrégulière d'une décision ne doit entraîner aucun préjudice pour les parties.", type: "vice" },
      { article: "Art. 46a PA", titre: "Déni de justice / Retard injustifié", description: "Le recours est recevable si l'autorité a refusé de statuer ou a tardé à le faire sans motif.", type: "déni" },
    ],
    recours: [
      { article: "Art. 44 PA", titre: "Objet du recours", description: "Le recours peut être formé contre les décisions incidentes et finales.", type: "objet" },
      { article: "Art. 48 PA", titre: "Qualité pour recourir", description: "A qualité pour recourir quiconque est touché par la décision et a un intérêt digne de protection.", type: "qualité" },
      { article: "Art. 49 PA", titre: "Motifs de recours", description: "Le recourant peut invoquer la violation du droit, la constatation inexacte des faits, l'inopportunité.", type: "motifs" },
      { article: "Art. 50 PA", titre: "Délai de recours", description: "Le recours doit être déposé dans les 30 jours suivant la notification de la décision.", type: "délai" },
      { article: "Art. 52 PA", titre: "Contenu du mémoire", description: "Le mémoire de recours indique les conclusions, motifs et moyens de preuve.", type: "contenu" },
      { article: "Art. 55 PA", titre: "Effet suspensif", description: "Le recours a effet suspensif, sauf disposition contraire de la loi.", type: "suspensif" },
      { article: "Art. 56 PA", titre: "Mesures provisionnelles", description: "L'autorité de recours peut ordonner des mesures provisionnelles.", type: "provisionnelles" },
      { article: "Art. 61 PA", titre: "Décision sur recours", description: "L'autorité de recours rend une décision sur le recours.", type: "décision" },
    ],
  },

  // Code de procédure civile (CPC - RS 272)
  cpc: {
    principes_generaux: [
      { article: "Art. 1 CPC", titre: "Objet", description: "Le CPC règle la procédure applicable devant les juridictions cantonales pour les affaires civiles contentieuses et gracieuses.", type: "objet" },
      { article: "Art. 52 CPC", titre: "Bonne foi", description: "Quiconque participe à la procédure doit se comporter conformément aux règles de la bonne foi.", type: "bonne_foi" },
      { article: "Art. 53 CPC", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues. Elles ont en particulier le droit de consulter le dossier.", type: "audition" },
      { article: "Art. 54 CPC", titre: "Publicité de la procédure", description: "Les débats et la lecture du jugement sont publics, sauf exception prévue par la loi.", type: "publicité" },
      { article: "Art. 55 CPC", titre: "Maxime des débats et maxime inquisitoire", description: "Dans les procédures soumises à la maxime des débats, les parties allèguent les faits et offrent les preuves.", type: "maximes" },
      { article: "Art. 56 CPC", titre: "Interpellation par le tribunal", description: "Le tribunal interpelle les parties lorsque leurs actes de procédure sont obscurs, contradictoires, incertains ou manifestement incomplets.", type: "interpellation" },
      { article: "Art. 57 CPC", titre: "Application du droit d'office", description: "Le tribunal applique le droit d'office.", type: "droit" },
    ],
    preuves: [
      { article: "Art. 150 CPC", titre: "Objet de la preuve", description: "La preuve porte sur les faits pertinents et contestés.", type: "objet" },
      { article: "Art. 152 CPC", titre: "Droit à la preuve", description: "Toute partie a droit à ce que le tribunal administre les moyens de preuve adéquats, offerts régulièrement et en temps utile.", type: "droit" },
      { article: "Art. 153 CPC", titre: "Administration des preuves d'office", description: "Le tribunal administre les preuves d'office lorsque les faits doivent être établis d'office.", type: "office" },
      { article: "Art. 154 CPC", titre: "Ordonnances de preuves", description: "Le tribunal rend les ordonnances de preuves nécessaires avant l'administration des preuves.", type: "ordonnances" },
      { article: "Art. 157 CPC", titre: "Libre appréciation des preuves", description: "Le tribunal établit sa conviction par une libre appréciation des preuves administrées.", type: "appréciation" },
      { article: "Art. 160 CPC", titre: "Obligation de collaborer", description: "Les parties et les tiers sont tenus de collaborer à l'administration des preuves.", type: "collaboration" },
      { article: "Art. 161 CPC", titre: "Droit de refus absolu", description: "Les proches de la partie peuvent refuser de collaborer.", type: "refus" },
      { article: "Art. 163 CPC", titre: "Droit de refus limité", description: "Un témoin peut refuser de collaborer si sa déposition expose des proches à un préjudice.", type: "refus_limité" },
      { article: "Art. 166 CPC", titre: "Tiers soumis à obligation", description: "Le tiers est tenu de produire les titres en sa possession.", type: "production" },
      { article: "Art. 170 CPC", titre: "Expertise", description: "Le tribunal peut ordonner une expertise d'office ou à la demande d'une partie.", type: "expertise" },
    ],
    voies_droit: [
      { article: "Art. 308 CPC", titre: "Appel", description: "L'appel est recevable contre les décisions finales et incidentes du tribunal de première instance.", type: "appel" },
      { article: "Art. 311 CPC", titre: "Délai d'appel", description: "L'appel doit être introduit dans les 30 jours suivant la notification de la décision motivée.", type: "délai" },
      { article: "Art. 319 CPC", titre: "Recours", description: "Le recours est recevable contre les décisions finales et incidentes non sujettes à appel.", type: "recours" },
      { article: "Art. 321 CPC", titre: "Délai de recours", description: "Le recours doit être introduit dans les 30 jours suivant la notification de la décision motivée.", type: "délai" },
    ],
  },

  // Code pénal (CP - RS 311.0)
  code_penal: {
    infractions_fonction: [
      { article: "Art. 312 CP", titre: "Abus d'autorité", description: "Les membres d'une autorité et les fonctionnaires qui, dans le dessein de se procurer ou de procurer à un tiers un avantage illicite, ou de nuire à autrui, auront abusé des pouvoirs de leur charge, seront punis d'une peine privative de liberté de cinq ans au plus ou d'une peine pécuniaire.", type: "infraction" },
      { article: "Art. 313 CP", titre: "Perception indue de contributions", description: "Le fonctionnaire qui perçoit des contributions non dues ou qui excèdent le tarif légal sera puni.", type: "infraction" },
      { article: "Art. 314 CP", titre: "Gestion déloyale des intérêts publics", description: "Les membres d'une autorité et les fonctionnaires qui, dans le dessein de se procurer ou de procurer à un tiers un avantage illicite, auront lésé dans un acte juridique les intérêts publics qu'ils avaient mission de défendre seront punis.", type: "infraction" },
      { article: "Art. 315 CP", titre: "Faux dans les titres commis par un fonctionnaire", description: "Le fonctionnaire qui, dans le dessein de porter atteinte aux droits d'autrui ou de se procurer un avantage illicite, aura créé un titre faux sera puni.", type: "infraction" },
      { article: "Art. 316 CP", titre: "Fausse déclaration d'une autorité", description: "Le fonctionnaire qui aura sciemment certifié faux un fait qui a une portée juridique sera puni.", type: "infraction" },
      { article: "Art. 317 CP", titre: "Faux dans les titres commis par un fonctionnaire", description: "Le fonctionnaire qui aura créé un titre faux ou falsifié un titre sera puni.", type: "infraction" },
      { article: "Art. 320 CP", titre: "Violation du secret de fonction", description: "Celui qui aura révélé un secret qui lui avait été confié en sa qualité de fonctionnaire sera puni.", type: "secret" },
      { article: "Art. 321 CP", titre: "Violation du secret professionnel", description: "Les médecins, avocats, notaires, vérificateurs, curateurs et autres personnes astreintes au secret professionnel qui auront révélé un secret seront punis.", type: "secret" },
      { article: "Art. 322ter CP", titre: "Corruption passive", description: "Celui qui, en qualité de membre d'une autorité judiciaire ou autre, de fonctionnaire, d'expert, aura sollicité, se sera fait promettre ou aura accepté un avantage indu sera puni.", type: "corruption" },
      { article: "Art. 322quater CP", titre: "Corruption active", description: "Celui qui aura offert, promis ou octroyé un avantage indu à un membre d'une autorité sera puni.", type: "corruption" },
      { article: "Art. 322quinquies CP", titre: "Octroi d'un avantage", description: "Celui qui aura offert, promis ou octroyé un avantage indu à un membre d'une autorité en faveur de l'accomplissement des devoirs de sa charge sera puni.", type: "avantage" },
      { article: "Art. 322sexies CP", titre: "Acceptation d'un avantage", description: "Celui qui, en qualité de fonctionnaire, aura sollicité ou accepté un avantage indu sera puni.", type: "avantage" },
    ],
    atteintes_patrimoine: [
      { article: "Art. 137 CP", titre: "Appropriation illégitime", description: "Celui qui, pour se procurer ou procurer à un tiers un enrichissement illégitime, se sera approprié une chose mobilière appartenant à autrui sera puni.", type: "appropriation" },
      { article: "Art. 138 CP", titre: "Abus de confiance", description: "Celui qui, pour se procurer ou procurer à un tiers un enrichissement illégitime, se sera approprié une chose mobilière qui lui avait été confiée sera puni.", type: "abus" },
      { article: "Art. 158 CP", titre: "Gestion déloyale", description: "Celui qui, en vertu de la loi, d'un mandat officiel ou d'un acte juridique, est tenu de gérer les intérêts pécuniaires d'autrui et qui les aura lésés sera puni.", type: "gestion" },
    ],
  },

  // Code des obligations (CO - RS 220) - Responsabilité civile et mandat
  code_obligations: {
    responsabilite_civile: [
      { article: "Art. 41 CO", titre: "Responsabilité pour faute", description: "Celui qui cause, d'une manière illicite, un dommage à autrui, soit intentionnellement, soit par négligence ou imprudence, est tenu de le réparer.", type: "faute" },
      { article: "Art. 42 CO", titre: "Preuve du dommage", description: "La preuve du dommage incombe au demandeur. Le juge détermine équitablement le montant lorsque le dommage ne peut être établi dans son montant exact.", type: "preuve" },
      { article: "Art. 43 CO", titre: "Mode et étendue de la réparation", description: "Le juge détermine le mode ainsi que l'étendue de la réparation, d'après les circonstances et la gravité de la faute.", type: "réparation" },
      { article: "Art. 44 CO", titre: "Réduction de l'indemnité", description: "Le juge peut réduire les dommages-intérêts, voire n'en point allouer, lorsque la partie lésée a consenti au dommage ou lorsque la situation financière l'exige.", type: "réduction" },
      { article: "Art. 46 CO", titre: "Indemnité en cas de lésions corporelles", description: "En cas de lésions corporelles, la partie qui en est victime a droit au remboursement des frais et aux dommages-intérêts pour l'incapacité de travail.", type: "lésions" },
      { article: "Art. 47 CO", titre: "Tort moral", description: "Le juge peut, en tenant compte de circonstances particulières, allouer à la victime une indemnité équitable à titre de réparation morale.", type: "tort_moral" },
      { article: "Art. 49 CO", titre: "Atteinte à la personnalité", description: "Celui qui subit une atteinte illicite à sa personnalité a droit à une somme d'argent à titre de réparation morale, pour autant que la gravité de l'atteinte le justifie.", type: "personnalité" },
      { article: "Art. 55 CO", titre: "Responsabilité de l'employeur", description: "L'employeur est responsable du dommage causé par ses travailleurs dans l'accomplissement de leur travail.", type: "employeur" },
      { article: "Art. 60 CO", titre: "Prescription", description: "L'action en dommages-intérêts se prescrit par trois ans à compter du jour où la partie lésée a eu connaissance du dommage et de l'auteur.", type: "prescription" },
    ],
    mandat: [
      { article: "Art. 394 CO", titre: "Définition du mandat", description: "Le mandat est un contrat par lequel le mandataire s'oblige, dans les termes de la convention, à gérer l'affaire dont il s'est chargé ou à rendre les services qu'il a promis.", type: "définition" },
      { article: "Art. 396 CO", titre: "Étendue du mandat", description: "Le mandataire a le droit de faire tous les actes juridiques nécessités par l'exécution du mandat.", type: "étendue" },
      { article: "Art. 397 CO", titre: "Observance des instructions", description: "Le mandataire qui a reçu des instructions précises ne peut s'en écarter qu'autant que les circonstances ne lui permettent pas de demander l'autorisation du mandant.", type: "instructions" },
      { article: "Art. 398 CO", titre: "Responsabilité du mandataire", description: "Le mandataire répond du dommage qu'il cause au mandant intentionnellement ou par négligence.", type: "responsabilité" },
      { article: "Art. 400 CO", titre: "Obligations du mandataire", description: "Le mandataire est tenu de rendre compte de sa gestion et de restituer au mandant tout ce qu'il a reçu à l'occasion de sa gestion.", type: "obligations" },
      { article: "Art. 402 CO", titre: "Obligations du mandant", description: "Le mandant doit rembourser au mandataire les avances et frais nécessaires et lui verser une rémunération si elle est convenue.", type: "mandant" },
      { article: "Art. 404 CO", titre: "Révocation et répudiation", description: "Le mandat peut être révoqué ou répudié en tout temps par chacune des parties.", type: "fin" },
      { article: "Art. 405 CO", titre: "Fin du mandat", description: "Le mandat finit par la mort, l'incapacité ou la faillite du mandant ou du mandataire.", type: "extinction" },
    ],
  },

  // Loi fédérale sur la responsabilité de la Confédération (LRCF - RS 170.32)
  responsabilite_etat: [
    { article: "Art. 1 LRCF", titre: "Objet et but", description: "La Confédération répond du dommage causé par ses agents dans l'exercice de leurs fonctions.", type: "principe" },
    { article: "Art. 3 LRCF", titre: "Responsabilité pour acte illicite", description: "La Confédération répond du dommage causé sans droit à un tiers par un fonctionnaire dans l'exercice de ses fonctions.", type: "illicéité" },
    { article: "Art. 4 LRCF", titre: "Recours contre l'agent", description: "La Confédération peut se retourner contre l'agent fautif en cas de faute grave.", type: "recours" },
    { article: "Art. 6 LRCF", titre: "Dommages-intérêts", description: "La Confédération répare le dommage selon les règles du droit fédéral en matière de responsabilité civile.", type: "réparation" },
    { article: "Art. 7 LRCF", titre: "Demande en dommages-intérêts", description: "La personne lésée peut demander réparation à la Confédération par voie de réclamation écrite.", type: "demande" },
    { article: "Art. 10 LRCF", titre: "Prescription", description: "L'action en dommages-intérêts contre la Confédération se prescrit par un an à compter du jour où le lésé a eu connaissance du dommage.", type: "prescription" },
    { article: "Art. 12 LRCF", titre: "Action du lésé contre l'agent", description: "Le lésé ne peut pas agir directement contre l'agent. Son action s'exerce exclusivement contre la Confédération.", type: "action" },
  ],

  // =========================================================================
  // II. DROIT CANTONAL VAUDOIS
  // =========================================================================

  droit_vaudois: {
    // Loi d'application du droit fédéral de la protection de l'adulte et de l'enfant (LVPAE - BLV 211.255)
    lvpae: [
      { article: "Art. 1 LVPAE", titre: "Objet", description: "La loi règle l'application dans le canton de Vaud des dispositions fédérales sur la protection de l'adulte et de l'enfant.", type: "objet" },
      { article: "Art. 2 LVPAE", titre: "Autorité de protection", description: "La Justice de Paix est l'autorité de protection de l'adulte au sens de l'art. 440 CC.", type: "autorité" },
      { article: "Art. 3 LVPAE", titre: "Composition", description: "La Justice de Paix est composée d'un juge de paix assisté de deux assesseurs au moins.", type: "composition" },
      { article: "Art. 4 LVPAE", titre: "Compétence territoriale", description: "L'autorité du domicile de la personne concernée est compétente.", type: "compétence" },
      { article: "Art. 5 LVPAE", titre: "Procédure", description: "La procédure devant la Justice de Paix est réglée par le code de procédure civile.", type: "procédure" },
      { article: "Art. 6 LVPAE", titre: "Frais de procédure", description: "La procédure est gratuite. Des émoluments peuvent être perçus pour des actes spéciaux.", type: "gratuité" },
      { article: "Art. 7 LVPAE", titre: "Nomination des curateurs", description: "La Justice de Paix nomme les curateurs professionnels et privés.", type: "nomination" },
      { article: "Art. 8 LVPAE", titre: "Formation des curateurs", description: "Le département assure la formation continue des curateurs professionnels.", type: "formation" },
      { article: "Art. 9 LVPAE", titre: "Service de curatelles", description: "Les communes peuvent instituer un service de curatelles pour les curateurs professionnels.", type: "service" },
      { article: "Art. 10 LVPAE", titre: "Surveillance", description: "Le département surveille l'application de la loi et le fonctionnement des autorités de protection.", type: "surveillance" },
    ],

    // Règlement sur l'administration des mandats de protection (RAM - BLV 211.255.1)
    ram: [
      { article: "Art. 1 RAM", titre: "Objet", description: "Le règlement fixe les modalités d'administration des mandats de protection de l'adulte.", type: "objet" },
      { article: "Art. 2 RAM", titre: "Inventaire initial", description: "Le curateur établit un inventaire complet des biens de la personne protégée dans les trois mois suivant sa nomination.", type: "inventaire" },
      { article: "Art. 3 RAM", titre: "Gestion du patrimoine", description: "Le curateur gère le patrimoine avec diligence. Il tient une comptabilité détaillée.", type: "gestion" },
      { article: "Art. 4 RAM", titre: "Placements", description: "Les fonds disponibles sont placés en titres sûrs ou sur des comptes garantis.", type: "placements" },
      { article: "Art. 5 RAM", titre: "Comptes bancaires", description: "Le curateur ouvre un compte au nom de la personne protégée. Les avoirs sont distincts des siens.", type: "comptes" },
      { article: "Art. 6 RAM", titre: "Rapport périodique", description: "Le curateur remet un rapport à la Justice de Paix dans les délais fixés.", type: "rapport" },
      { article: "Art. 7 RAM", titre: "Contenu du rapport", description: "Le rapport comprend un compte de gestion, un relevé des actifs et passifs, un bilan de l'assistance personnelle.", type: "contenu" },
      { article: "Art. 8 RAM", titre: "Délais", description: "Le rapport annuel est remis dans les trois mois suivant la fin de la période.", type: "délais" },
      { article: "Art. 9 RAM", titre: "Budget prévisionnel", description: "Le curateur établit un budget prévisionnel pour l'année à venir.", type: "budget" },
      { article: "Art. 10 RAM", titre: "Contrôle", description: "La Justice de Paix contrôle les rapports et peut demander des explications.", type: "contrôle" },
    ],

    // Règlement sur la rémunération des curateurs (Rcur - BLV 211.255.2)
    rcur: [
      { article: "Art. 1 Rcur", titre: "Droit à rémunération", description: "Le curateur a droit à une rémunération appropriée pour son activité.", type: "droit" },
      { article: "Art. 2 Rcur", titre: "Tarif horaire", description: "La rémunération est calculée sur la base d'un tarif horaire fixé par le Conseil d'État.", type: "tarif" },
      { article: "Art. 3 Rcur", titre: "Forfaits", description: "Des forfaits peuvent être fixés pour des prestations standardisées.", type: "forfaits" },
      { article: "Art. 4 Rcur", titre: "Frais", description: "Les frais effectifs sont remboursés sur justificatifs.", type: "frais" },
      { article: "Art. 5 Rcur", titre: "Facturation", description: "Le curateur soumet sa facturation à l'approbation de la Justice de Paix.", type: "facturation" },
      { article: "Art. 6 Rcur", titre: "Prise en charge", description: "La rémunération est à la charge de la personne protégée ou, subsidiairement, de l'État.", type: "charge" },
    ],

    // Loi sur l'aide aux personnes en difficulté (LASV - BLV 850.051)
    lasv: [
      { article: "Art. 1 LASV", titre: "But", description: "La loi a pour but de garantir le minimum vital et de favoriser l'intégration sociale et professionnelle.", type: "but" },
      { article: "Art. 2 LASV", titre: "Droit aux prestations", description: "Toute personne dans le besoin a droit aux prestations prévues par la loi.", type: "droit" },
      { article: "Art. 3 LASV", titre: "Prestations", description: "L'aide comprend l'aide financière, l'aide personnelle, l'hébergement d'urgence.", type: "prestations" },
      { article: "Art. 4 LASV", titre: "Subsidiarité", description: "L'aide sociale est subsidiaire par rapport aux autres sources de revenus et prestations.", type: "subsidiarité" },
      { article: "Art. 5 LASV", titre: "Dignité", description: "L'aide est octroyée dans le respect de la dignité de la personne.", type: "dignité" },
      { article: "Art. 6 LASV", titre: "Individualisation", description: "L'aide est adaptée à la situation personnelle du bénéficiaire.", type: "individualisation" },
      { article: "Art. 7 LASV", titre: "Collaboration", description: "Le bénéficiaire collabore avec les services sociaux pour améliorer sa situation.", type: "collaboration" },
      { article: "Art. 8 LASV", titre: "Secret", description: "Les personnes chargées de l'application de la loi sont tenues au secret.", type: "secret" },
    ],

    // Loi sur la santé publique (LSP - BLV 800.01)
    lsp: [
      { article: "Art. 1 LSP", titre: "But", description: "La loi a pour but de protéger et promouvoir la santé de la population.", type: "but" },
      { article: "Art. 21 LSP", titre: "Secret médical", description: "Les professionnels de la santé sont tenus au secret médical.", type: "secret" },
      { article: "Art. 22 LSP", titre: "Levée du secret", description: "Le secret peut être levé avec le consentement du patient ou si la loi le prévoit.", type: "levée" },
      { article: "Art. 23 LSP", titre: "Droit à l'information", description: "Le patient a droit à une information complète sur son état de santé et les traitements.", type: "information" },
      { article: "Art. 24 LSP", titre: "Consentement éclairé", description: "Aucun traitement ne peut être effectué sans le consentement libre et éclairé du patient.", type: "consentement" },
      { article: "Art. 25 LSP", titre: "Droit de refus", description: "Le patient capable de discernement peut refuser un traitement.", type: "refus" },
      { article: "Art. 26 LSP", titre: "Représentant thérapeutique", description: "Le patient peut désigner un représentant thérapeutique.", type: "représentant" },
      { article: "Art. 27 LSP", titre: "Dossier médical", description: "Le patient a accès à son dossier médical.", type: "accès" },
    ],

    // Loi sur la procédure administrative (LPA-VD - BLV 173.36)
    lpa_vd: [
      { article: "Art. 1 LPA-VD", titre: "Champ d'application", description: "La loi s'applique à la procédure devant les autorités administratives cantonales.", type: "champ" },
      { article: "Art. 2 LPA-VD", titre: "Définitions", description: "Sont des décisions les mesures prises par les autorités dans des cas d'espèce.", type: "définition" },
      { article: "Art. 27 LPA-VD", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues avant qu'une décision ne soit prise.", type: "audition" },
      { article: "Art. 28 LPA-VD", titre: "Consultation du dossier", description: "Les parties peuvent consulter les pièces du dossier.", type: "consultation" },
      { article: "Art. 30 LPA-VD", titre: "Motivation des décisions", description: "Les décisions sont motivées et indiquent les voies de recours.", type: "motivation" },
      { article: "Art. 40 LPA-VD", titre: "Délai de recours", description: "Le délai de recours est de 30 jours dès la notification de la décision.", type: "délai" },
      { article: "Art. 41 LPA-VD", titre: "Recevabilité du recours", description: "Le recours est recevable s'il est formé dans le délai et la forme prescrits.", type: "recevabilité" },
      { article: "Art. 75 LPA-VD", titre: "Déni de justice", description: "Le recours est recevable contre le refus ou le retard de statuer.", type: "déni" },
    ],
  },

  // =========================================================================
  // III. RÈGLEMENTS INTERNES ET NORMES PROFESSIONNELLES
  // =========================================================================

  reglements_internes: {
    // Directives COPMA (Conférence en matière de protection des mineurs et des adultes)
    copma: [
      { article: "Dir. COPMA 1", titre: "Principes directeurs", description: "Le curateur agit toujours dans l'intérêt de la personne protégée et respecte son autonomie.", type: "principe" },
      { article: "Dir. COPMA 2", titre: "Relation de confiance", description: "Le curateur établit une relation de confiance avec la personne protégée.", type: "relation" },
      { article: "Dir. COPMA 3", titre: "Communication", description: "Le curateur informe régulièrement la personne protégée de ses démarches.", type: "communication" },
      { article: "Dir. COPMA 4", titre: "Documentation", description: "Le curateur documente toutes les décisions importantes et les motifs.", type: "documentation" },
      { article: "Dir. COPMA 5", titre: "Confidentialité", description: "Le curateur respecte la confidentialité des informations concernant la personne protégée.", type: "confidentialité" },
      { article: "Dir. COPMA 6", titre: "Formation continue", description: "Le curateur professionnel suit une formation continue régulière.", type: "formation" },
      { article: "Dir. COPMA 7", titre: "Supervision", description: "Les situations complexes font l'objet d'une supervision ou d'un intervision.", type: "supervision" },
      { article: "Dir. COPMA 8", titre: "Signalement", description: "Le curateur signale toute situation de mise en danger à l'autorité compétente.", type: "signalement" },
    ],

    // Standards KOKES (Conférence des cantons en matière de protection des mineurs et des adultes)
    kokes: [
      { article: "Standard KOKES 1", titre: "Qualité de la prise en charge", description: "La qualité de la prise en charge est régulièrement évaluée.", type: "qualité" },
      { article: "Standard KOKES 2", titre: "Délais de traitement", description: "Les demandes sont traitées dans des délais raisonnables.", type: "délais" },
      { article: "Standard KOKES 3", titre: "Accessibilité", description: "Les services de protection sont accessibles aux personnes concernées.", type: "accessibilité" },
      { article: "Standard KOKES 4", titre: "Transparence", description: "Les procédures et décisions sont transparentes.", type: "transparence" },
      { article: "Standard KOKES 5", titre: "Participation", description: "La personne protégée participe aux décisions qui la concernent.", type: "participation" },
      { article: "Standard KOKES 6", titre: "Coordination", description: "Les différents intervenants coordonnent leurs actions.", type: "coordination" },
    ],

    // Normes déontologiques du curateur professionnel
    deontologie: [
      { article: "Déonto. 1", titre: "Respect de la dignité", description: "Le curateur respecte en tout temps la dignité de la personne protégée.", type: "dignité" },
      { article: "Déonto. 2", titre: "Indépendance", description: "Le curateur exerce son mandat en toute indépendance.", type: "indépendance" },
      { article: "Déonto. 3", titre: "Compétence", description: "Le curateur dispose des compétences nécessaires à l'exercice de son mandat.", type: "compétence" },
      { article: "Déonto. 4", titre: "Probité", description: "Le curateur agit avec honnêteté et intégrité.", type: "probité" },
      { article: "Déonto. 5", titre: "Loyauté", description: "Le curateur est loyal envers la personne protégée et l'autorité.", type: "loyauté" },
      { article: "Déonto. 6", titre: "Conflit d'intérêts", description: "Le curateur évite tout conflit d'intérêts et le signale le cas échéant.", type: "conflit" },
      { article: "Déonto. 7", titre: "Secret professionnel", description: "Le curateur respecte le secret professionnel.", type: "secret" },
      { article: "Déonto. 8", titre: "Responsabilité", description: "Le curateur assume la responsabilité de ses actes.", type: "responsabilité" },
    ],

    // Procédures d'enquête administrative
    enquete_administrative: [
      { article: "EA 1", titre: "Ouverture de l'enquête", description: "L'autorité peut ouvrir une enquête administrative en cas de soupçon de manquement.", type: "ouverture" },
      { article: "EA 2", titre: "Droits de la personne visée", description: "La personne visée est informée de l'enquête et peut se faire assister.", type: "droits" },
      { article: "EA 3", titre: "Mesures d'instruction", description: "L'autorité procède aux auditions et investigations nécessaires.", type: "instruction" },
      { article: "EA 4", titre: "Audition", description: "La personne visée est entendue avant toute décision.", type: "audition" },
      { article: "EA 5", titre: "Rapport d'enquête", description: "L'enquêteur établit un rapport avec ses conclusions et recommandations.", type: "rapport" },
      { article: "EA 6", titre: "Décision", description: "L'autorité prend une décision motivée sur la base du rapport.", type: "décision" },
      { article: "EA 7", titre: "Mesures", description: "Les mesures peuvent aller de l'avertissement à la révocation.", type: "mesures" },
      { article: "EA 8", titre: "Recours", description: "La décision peut faire l'objet d'un recours.", type: "recours" },
    ],
  },

  // =========================================================================
  // IV. DROITS ET DEVOIRS DES PARTIES
  // =========================================================================

  droits_devoirs: {
    // Droits du bénéficiaire (pupille/personne protégée)
    droits_beneficiaire: [
      { droit: "Droit à la dignité", base_legale: "Art. 7 Cst., Art. 388 CC", description: "La personne protégée a droit au respect de sa dignité en toute circonstance." },
      { droit: "Droit d'être entendu", base_legale: "Art. 29 Cst., Art. 447 CC", description: "La personne a le droit d'être entendue personnellement avant toute décision la concernant." },
      { droit: "Droit d'accès au dossier", base_legale: "Art. 449b CC, Art. 26 PA", description: "La personne a le droit de consulter son dossier." },
      { droit: "Droit de recours", base_legale: "Art. 450 CC, Art. 29a Cst.", description: "La personne peut recourir contre les décisions de l'autorité." },
      { droit: "Droit à l'autodétermination", base_legale: "Art. 388 CC, Art. 10 Cst.", description: "L'autonomie de la personne doit être préservée autant que possible." },
      { droit: "Droit au consentement éclairé", base_legale: "Art. 407-408 CC", description: "La personne doit consentir aux actes la concernant dans la mesure de ses capacités." },
      { droit: "Droit à l'information", base_legale: "Art. 406 CC", description: "La personne a le droit d'être informée des décisions et démarches du curateur." },
      { droit: "Droit à la vie privée", base_legale: "Art. 13 Cst., Art. 28 CC", description: "La sphère privée de la personne est protégée." },
      { droit: "Droit de désigner une personne de confiance", base_legale: "Art. 437 CC", description: "En cas de placement, la personne peut désigner une personne de confiance." },
      { droit: "Droit à un curateur approprié", base_legale: "Art. 400-401 CC", description: "La personne a droit à un curateur compétent et diligent." },
    ],

    // Devoirs du curateur
    devoirs_curateur: [
      { devoir: "Diligence", base_legale: "Art. 398 CC", description: "Le curateur accomplit sa tâche avec diligence et dans l'intérêt de la personne." },
      { devoir: "Loyauté et bonne foi", base_legale: "Art. 2 CC", description: "Le curateur agit avec loyauté et bonne foi." },
      { devoir: "Collaboration avec le pupille", base_legale: "Art. 404 CC", description: "Le curateur associe la personne à l'accomplissement de ses tâches." },
      { devoir: "Information régulière", base_legale: "Art. 406 CC", description: "Le curateur informe régulièrement la personne et l'autorité." },
      { devoir: "Rapports périodiques", base_legale: "Art. 411 CC", description: "Le curateur soumet des rapports et comptes à l'autorité." },
      { devoir: "Respect de l'autonomie", base_legale: "Art. 388 CC", description: "Le curateur préserve l'autonomie de la personne." },
      { devoir: "Confidentialité", base_legale: "Art. 321 CP, LPD", description: "Le curateur respecte le secret professionnel." },
      { devoir: "Gestion prudente", base_legale: "Art. 400-401 CC", description: "Le curateur gère le patrimoine avec soin et prudence." },
      { devoir: "Éviter les conflits d'intérêts", base_legale: "Art. 417 CC", description: "Le curateur évite et signale tout conflit d'intérêts." },
      { devoir: "Signalement", base_legale: "Art. 443 CC", description: "Le curateur signale les situations de danger à l'autorité." },
    ],

    // Devoirs de l'autorité (APEA/Justice de Paix)
    devoirs_autorite: [
      { devoir: "Traitement équitable", base_legale: "Art. 29 Cst.", description: "L'autorité traite les dossiers de manière équitable et impartiale." },
      { devoir: "Délai raisonnable", base_legale: "Art. 29 Cst., Art. 46a PA", description: "L'autorité statue dans un délai raisonnable." },
      { devoir: "Motivation des décisions", base_legale: "Art. 35 PA, Art. 449c CC", description: "Les décisions sont motivées et indiquent les voies de recours." },
      { devoir: "Surveillance des curateurs", base_legale: "Art. 415 CC", description: "L'autorité surveille l'activité des curateurs." },
      { devoir: "Subsidiarité", base_legale: "Art. 389 CC", description: "L'autorité n'ordonne des mesures que si elles sont nécessaires." },
      { devoir: "Proportionnalité", base_legale: "Art. 389 CC", description: "Les mesures sont proportionnées aux besoins de la personne." },
      { devoir: "Audition de la personne", base_legale: "Art. 447 CC", description: "L'autorité entend la personne concernée." },
      { devoir: "Instruction d'office", base_legale: "Art. 445 CC", description: "L'autorité établit les faits d'office." },
      { devoir: "Protection des données", base_legale: "LPD", description: "L'autorité protège les données personnelles des justiciables." },
      { devoir: "Accessibilité", base_legale: "Art. 29a Cst.", description: "L'autorité garantit l'accès au juge." },
    ],
  },
};

// Fonction pour obtenir les articles pertinents par type de problème
function getRelevantArticles(problemType: string): any[] {
  const relevanceMap: Record<string, string[][]> = {
    'délai': [
      ['procedure_administrative', 'decisions'],
      ['constitution', 'garanties_procedures'],
      ['droit_vaudois', 'lpa_vd'],
    ],
    'non-réponse': [
      ['procedure_administrative', 'decisions'],
      ['constitution', 'garanties_procedures'],
    ],
    'refus': [
      ['protection_adulte', 'recours'],
      ['procedure_administrative', 'droits_parties'],
      ['constitution', 'garanties_procedures'],
    ],
    'abus': [
      ['code_penal', 'infractions_fonction'],
      ['protection_adulte', 'curateur_devoirs'],
      ['protection_adulte', 'autorite'],
    ],
    'conflit_intérêt': [
      ['protection_adulte', 'actes_autorisation_autorite'],
      ['code_penal', 'infractions_fonction'],
      ['reglements_internes', 'deontologie'],
    ],
    'violation_données': [
      ['protection_donnees', 'principes'],
      ['protection_donnees', 'droits'],
      ['protection_donnees', 'sanctions'],
      ['constitution', 'droits_fondamentaux'],
    ],
    'curatelle': [
      ['protection_adulte', 'types_curatelle'],
      ['protection_adulte', 'curateur_devoirs'],
      ['droit_vaudois', 'lvpae'],
      ['droit_vaudois', 'ram'],
    ],
    'communication': [
      ['protection_adulte', 'curateur_devoirs'],
      ['procedure_administrative', 'droits_parties'],
      ['reglements_internes', 'copma'],
    ],
    'patrimoine': [
      ['protection_adulte', 'curateur_devoirs'],
      ['protection_adulte', 'actes_autorisation_autorite'],
      ['droit_vaudois', 'ram'],
      ['code_penal', 'atteintes_patrimoine'],
    ],
    'placement': [
      ['protection_adulte', 'placement'],
      ['constitution', 'droits_fondamentaux'],
    ],
    'responsabilite': [
      ['code_obligations', 'responsabilite_civile'],
      ['responsabilite_etat'],
      ['protection_adulte', 'actes_autorisation_autorite'],
    ],
    'secret': [
      ['code_penal', 'infractions_fonction'],
      ['protection_donnees', 'principes'],
      ['droit_vaudois', 'lsp'],
    ],
    'recours': [
      ['protection_adulte', 'recours'],
      ['procedure_administrative', 'recours'],
      ['cpc', 'voies_droit'],
      ['droit_vaudois', 'lpa_vd'],
    ],
    'droits_beneficiaire': [
      ['droits_devoirs', 'droits_beneficiaire'],
      ['constitution', 'droits_fondamentaux'],
      ['protection_adulte', 'principes_generaux'],
    ],
    'devoirs_curateur': [
      ['droits_devoirs', 'devoirs_curateur'],
      ['protection_adulte', 'curateur_devoirs'],
      ['reglements_internes', 'deontologie'],
    ],
    'devoirs_autorite': [
      ['droits_devoirs', 'devoirs_autorite'],
      ['protection_adulte', 'autorite'],
      ['constitution', 'garanties_procedures'],
    ],
  };

  const paths = relevanceMap[problemType] || [];
  const articles: any[] = [];

  for (const path of paths) {
    let current: any = SWISS_LEGAL_BASE;
    for (const key of path) {
      if (current[key]) {
        current = current[key];
      }
    }
    if (Array.isArray(current)) {
      articles.push(...current);
    } else if (typeof current === 'object') {
      for (const subKey of Object.keys(current)) {
        if (Array.isArray(current[subKey])) {
          articles.push(...current[subKey]);
        }
      }
    }
  }

  return articles;
}

// Fonction pour compter tous les articles
function countAllArticles(): number {
  let count = 0;
  
  const countInObject = (obj: any) => {
    if (Array.isArray(obj)) {
      count += obj.length;
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        countInObject(obj[key]);
      }
    }
  };
  
  countInObject(SWISS_LEGAL_BASE);
  return count;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, problemType, searchQuery } = await req.json().catch(() => ({}));

    if (action === 'get_all') {
      return new Response(JSON.stringify({
        success: true,
        legal_base: SWISS_LEGAL_BASE,
        total_articles: countAllArticles(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_relevant' && problemType) {
      const articles = getRelevantArticles(problemType);
      return new Response(JSON.stringify({
        success: true,
        problem_type: problemType,
        relevant_articles: articles,
        count: articles.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'search' && searchQuery) {
      const query = searchQuery.toLowerCase();
      const results: any[] = [];
      
      const searchInObject = (obj: any, path: string[] = []) => {
        if (Array.isArray(obj)) {
          for (const item of obj) {
            if (typeof item === 'object') {
              const text = JSON.stringify(item).toLowerCase();
              if (text.includes(query)) {
                results.push({ ...item, path: path.join(' > ') });
              }
            }
          }
        } else if (typeof obj === 'object' && obj !== null) {
          for (const key of Object.keys(obj)) {
            searchInObject(obj[key], [...path, key]);
          }
        }
      };

      searchInObject(SWISS_LEGAL_BASE);

      return new Response(JSON.stringify({
        success: true,
        query: searchQuery,
        results,
        count: results.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_problem_types') {
      return new Response(JSON.stringify({
        success: true,
        problem_types: [
          'délai', 'non-réponse', 'refus', 'abus', 'conflit_intérêt',
          'violation_données', 'curatelle', 'communication', 'patrimoine',
          'placement', 'responsabilite', 'secret', 'recours',
          'droits_beneficiaire', 'devoirs_curateur', 'devoirs_autorite'
        ],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: return summary
    const totalArticles = countAllArticles();
    
    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_articles: totalArticles,
        droit_federal: {
          protection_adulte: "CC Art. 360-456 (Protection de l'adulte)",
          protection_donnees: "LPD - Loi fédérale sur la protection des données",
          constitution: "Cst. - Droits fondamentaux et garanties de procédure",
          procedure_administrative: "PA - Procédure administrative fédérale",
          cpc: "CPC - Code de procédure civile",
          code_penal: "CP - Infractions fonction publique et patrimoine",
          code_obligations: "CO - Responsabilité civile et mandat",
          responsabilite_etat: "LRCF - Responsabilité de l'État",
        },
        droit_cantonal_vaudois: {
          lvpae: "Loi d'application protection adulte/enfant",
          ram: "Règlement administration mandats",
          rcur: "Règlement rémunération curateurs",
          lasv: "Loi sur l'action sociale",
          lsp: "Loi sur la santé publique",
          lpa_vd: "Loi sur la procédure administrative VD",
        },
        reglements_internes: {
          copma: "Directives COPMA",
          kokes: "Standards KOKES",
          deontologie: "Normes déontologiques",
          enquete_administrative: "Procédures d'enquête administrative",
        },
        droits_devoirs: {
          droits_beneficiaire: "Droits de la personne protégée",
          devoirs_curateur: "Devoirs du curateur",
          devoirs_autorite: "Devoirs de l'autorité",
        },
      },
      usage: {
        get_all: "Retourne toute la base légale complète",
        get_relevant: "Retourne les articles pertinents pour un type de problème",
        search: "Recherche dans la base légale",
        get_problem_types: "Retourne la liste des types de problèmes supportés",
      },
      problem_types: [
        'délai', 'non-réponse', 'refus', 'abus', 'conflit_intérêt',
        'violation_données', 'curatelle', 'communication', 'patrimoine',
        'placement', 'responsabilite', 'secret', 'recours',
        'droits_beneficiaire', 'devoirs_curateur', 'devoirs_autorite'
      ],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Legal reference error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
