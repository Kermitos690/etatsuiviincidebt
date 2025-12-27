import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// BASE LÉGALE SUISSE EXHAUSTIVE - PROTECTION DE L'ADULTE & ASSURANCES SOCIALES
// "Nul n'est censé ignorer la loi"
// Droit fédéral, cantonal vaudois, normes RI et règlements internes
// ============================================================================

export const SWISS_LEGAL_BASE = {
  // =========================================================================
  // I. DROIT FÉDÉRAL - PROTECTION DE L'ADULTE
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

  // =========================================================================
  // II. DROIT FÉDÉRAL - ASSURANCES SOCIALES
  // =========================================================================

  // LAI - Loi fédérale sur l'assurance-invalidité (RS 831.20)
  assurance_invalidite: {
    principes: [
      { article: "Art. 1 LAI", titre: "But de l'assurance", description: "L'assurance-invalidité a pour but de prévenir, réduire ou éliminer l'invalidité grâce à des mesures de réadaptation, de compenser les effets économiques de l'invalidité par une rente d'invalidité ou une allocation pour impotent.", type: "but", mots_cles: ["prévention", "réadaptation", "rente", "invalidité"] },
      { article: "Art. 1a LAI", titre: "Prestations de l'assurance", description: "L'assurance alloue des mesures de réadaptation, des rentes d'invalidité, des allocations pour impotent et des mesures médicales de réadaptation.", type: "prestations", mots_cles: ["mesures", "rentes", "allocations"] },
      { article: "Art. 4 LAI", titre: "Invalidité", description: "L'invalidité est la diminution de la capacité de gain, présumée permanente ou de longue durée, qui résulte d'une atteinte à la santé physique, mentale ou psychique.", type: "définition", mots_cles: ["incapacité de gain", "atteinte à la santé", "permanente"] },
      { article: "Art. 5 LAI", titre: "Cas spéciaux", description: "Chez les mineurs, l'invalidité est définie en fonction de la probabilité d'une atteinte à la capacité de gain. Chez les personnes qui n'exercent pas d'activité lucrative, c'est l'impossibilité d'accomplir les travaux habituels.", type: "cas_spéciaux", mots_cles: ["mineurs", "travaux habituels"] },
      { article: "Art. 6 LAI", titre: "Conditions d'assurance", description: "Ont droit aux prestations les personnes assurées qui sont invalides au sens de la LAI et qui ont versé des cotisations pendant une année au moins ou qui sont domiciliées en Suisse.", type: "conditions", mots_cles: ["cotisations", "domicile", "assurés"] },
      { article: "Art. 7 LAI", titre: "Délai de carence", description: "L'assuré a droit à une rente si sa capacité de gain ou sa capacité d'accomplir ses travaux habituels est réduite de manière durable ou si elle ne peut pas être rétablie par des mesures de réadaptation.", type: "délai", mots_cles: ["capacité de gain", "durée", "réadaptation"] },
      { article: "Art. 7a LAI", titre: "Mesures raisonnablement exigibles", description: "Est réputée raisonnablement exigible toute mesure servant à la réadaptation de l'assuré, à l'exception des mesures qui ne sont pas adaptées à son état de santé.", type: "exigibilité", mots_cles: ["réadaptation", "état de santé", "mesures"] },
      { article: "Art. 7b LAI", titre: "Sanctions", description: "Les prestations peuvent être réduites ou refusées si l'assuré ne collabore pas ou s'il se soustrait aux mesures de réadaptation sans motif valable.", type: "sanctions", mots_cles: ["réduction", "refus", "collaboration"] },
    ],
    mesures_readaptation: [
      { article: "Art. 8 LAI", titre: "Principe des mesures de réadaptation", description: "Les assurés invalides ou menacés d'une invalidité ont droit aux mesures de réadaptation nécessaires pour améliorer leur capacité de gain ou l'empêcher de diminuer.", type: "principe", mots_cles: ["réadaptation", "capacité de gain", "prévention"] },
      { article: "Art. 8a LAI", titre: "Intervention précoce", description: "L'office AI peut accorder une intervention précoce dès que l'assuré a présenté une demande de prestations de l'AI.", type: "intervention", mots_cles: ["précoce", "demande", "prestations"] },
      { article: "Art. 9 LAI", titre: "Mesures de réinsertion", description: "L'assurance peut accorder des mesures de réinsertion préparant à la réadaptation professionnelle.", type: "réinsertion", mots_cles: ["réinsertion", "préparation", "professionnel"] },
      { article: "Art. 10 LAI", titre: "Début et fin des mesures", description: "Les mesures de réadaptation commencent lorsque l'assuré remplit les conditions et prennent fin lorsque le but est atteint ou que les conditions ne sont plus remplies.", type: "durée", mots_cles: ["début", "fin", "conditions"] },
      { article: "Art. 11 LAI", titre: "Obligation de l'assuré", description: "L'assuré doit entreprendre tout ce qui peut être raisonnablement exigé de lui pour réduire la durée et l'étendue de l'incapacité de travail et pour empêcher la survenance d'une invalidité.", type: "obligation", mots_cles: ["obligation", "réduction", "prévention"] },
      { article: "Art. 12 LAI", titre: "Mesures médicales", description: "L'assuré a droit aux mesures médicales qui ne visent pas le traitement de l'affection mais sont directement nécessaires à la réadaptation professionnelle.", type: "médical", mots_cles: ["traitement", "réadaptation", "mesures médicales"] },
      { article: "Art. 13 LAI", titre: "Mesures médicales pour les mineurs", description: "Les assurés mineurs ont droit aux mesures médicales destinées à traiter les infirmités congénitales.", type: "mineurs", mots_cles: ["mineurs", "infirmités congénitales", "traitement"] },
      { article: "Art. 14 LAI", titre: "Moyens auxiliaires", description: "L'assuré a droit aux moyens auxiliaires nécessaires à l'exercice d'une activité lucrative ou à l'accomplissement de ses travaux habituels.", type: "auxiliaires", mots_cles: ["moyens auxiliaires", "activité lucrative", "travaux habituels"] },
      { article: "Art. 15 LAI", titre: "Formation professionnelle initiale", description: "L'assuré a droit à la formation professionnelle initiale si, en raison de son invalidité, ses frais de formation sont beaucoup plus élevés que ceux d'une personne non invalide.", type: "formation", mots_cles: ["formation", "initiale", "frais"] },
      { article: "Art. 16 LAI", titre: "Reclassement", description: "L'assuré qui ne peut plus exercer son activité habituelle a droit à une nouvelle formation professionnelle si les mesures de réadaptation sont nécessaires et appropriées.", type: "reclassement", mots_cles: ["reclassement", "nouvelle formation", "réadaptation"] },
      { article: "Art. 17 LAI", titre: "Placement", description: "L'assuré a droit à l'aide au placement si des mesures de placement sont nécessaires pour lui permettre de trouver un emploi approprié.", type: "placement", mots_cles: ["placement", "emploi", "aide"] },
      { article: "Art. 18 LAI", titre: "Indemnité journalière", description: "L'assuré majeur qui suit des mesures de réadaptation a droit à une indemnité journalière pendant la durée des mesures.", type: "indemnité", mots_cles: ["indemnité journalière", "mesures", "majeur"] },
    ],
    rentes: [
      { article: "Art. 28 LAI", titre: "Droit à la rente d'invalidité", description: "L'assuré a droit à une rente d'invalidité s'il a présenté une incapacité de travail d'au moins 40% en moyenne durant une année, si sa capacité de gain est réduite de 40% au moins.", type: "droit", mots_cles: ["rente", "incapacité", "40%"] },
      { article: "Art. 28a LAI", titre: "Évaluation de l'invalidité des personnes exerçant une activité lucrative", description: "L'invalidité des personnes exerçant une activité lucrative est évaluée d'après le revenu que l'assuré pourrait obtenir et le revenu qu'il pourrait obtenir s'il n'était pas invalide.", type: "évaluation", mots_cles: ["évaluation", "revenu", "comparaison"] },
      { article: "Art. 28b LAI", titre: "Détermination du taux d'invalidité pour les personnes partiellement actives", description: "Pour les personnes exerçant une activité lucrative à temps partiel, l'invalidité est calculée de manière proportionnelle.", type: "temps_partiel", mots_cles: ["temps partiel", "calcul", "proportionnel"] },
      { article: "Art. 29 LAI", titre: "Naissance et extinction du droit à la rente", description: "Le droit à la rente prend naissance au plus tôt à l'échéance d'une période de six mois et au plus tard dès le début du mois qui suit le dépôt de la demande.", type: "naissance", mots_cles: ["naissance", "six mois", "demande"] },
      { article: "Art. 30 LAI", titre: "Extinction du droit", description: "Le droit à la rente s'éteint dès que l'assuré a la possibilité d'exercer une activité lucrative lui permettant de réaliser les 2/3 du revenu qu'il obtenait avant l'invalidité.", type: "extinction", mots_cles: ["extinction", "2/3", "activité lucrative"] },
      { article: "Art. 36 LAI", titre: "Montant de la rente", description: "Le montant de la rente dépend du taux d'invalidité: rente entière (70% ou plus), 3/4 de rente (60-69%), 1/2 rente (50-59%), 1/4 de rente (40-49%).", type: "montant", mots_cles: ["montant", "taux", "échelonnement"] },
      { article: "Art. 37 LAI", titre: "Calcul de la rente", description: "Le montant de la rente est calculé selon les mêmes règles que pour la rente de vieillesse AVS.", type: "calcul", mots_cles: ["calcul", "AVS", "règles"] },
      { article: "Art. 38 LAI", titre: "Rente pour enfant", description: "L'assuré qui a droit à une rente d'invalidité a également droit à une rente pour chaque enfant qui aurait droit à une rente d'orphelin à son décès.", type: "enfant", mots_cles: ["enfant", "rente", "orphelin"] },
      { article: "Art. 42 LAI", titre: "Allocation pour impotent", description: "L'assuré impotent a droit à une allocation pour impotent. L'impotence peut être grave, moyenne ou faible.", type: "impotence", mots_cles: ["allocation", "impotent", "degrés"] },
    ],
    procedure: [
      { article: "Art. 57 LAI", titre: "Attributions des offices AI", description: "Les offices AI statuent sur les prestations de l'assurance, examinent les demandes, ordonnent les mesures d'instruction et rendent des décisions.", type: "compétence", mots_cles: ["office AI", "décision", "instruction"] },
      { article: "Art. 59 LAI", titre: "Organisation des offices AI", description: "Chaque canton institue un office AI. L'office est une autorité administrative au sens de la LPGA.", type: "organisation", mots_cles: ["canton", "office", "administration"] },
      { article: "Art. 69 LAI", titre: "Voies de droit", description: "Les décisions des offices AI peuvent faire l'objet d'un recours devant le tribunal cantonal des assurances dans un délai de 30 jours.", type: "recours", mots_cles: ["recours", "tribunal", "30 jours"] },
      { article: "Art. 70 LAI", titre: "Représentation", description: "L'assuré peut se faire représenter ou assister par un mandataire de son choix.", type: "représentation", mots_cles: ["représentation", "mandataire", "assistance"] },
    ],
    ocai_vaud: [
      { article: "OCAI VD", titre: "Office cantonal de l'assurance-invalidité du canton de Vaud", description: "L'OCAI Vaud traite les demandes AI pour les assurés domiciliés dans le canton. Adresse: Avenue de Longemalle 11, 1020 Renens.", type: "institution", mots_cles: ["Vaud", "OCAI", "Renens"] },
      { article: "OCAI VD - Demande", titre: "Dépôt de la demande AI", description: "La demande de prestations AI doit être déposée auprès de l'OCAI du canton de domicile sur le formulaire officiel.", type: "procédure", mots_cles: ["demande", "formulaire", "dépôt"] },
      { article: "OCAI VD - SMR", titre: "Service médical régional", description: "Le SMR évalue l'état de santé de l'assuré et établit des rapports médicaux pour l'instruction des dossiers AI.", type: "médical", mots_cles: ["SMR", "évaluation", "rapports médicaux"] },
    ],
  },

  // LAVS - Loi fédérale sur l'assurance-vieillesse et survivants (RS 831.10)
  avs: {
    assures: [
      { article: "Art. 1 LAVS", titre: "Personnes assurées obligatoirement", description: "Sont assurées obligatoirement à l'AVS les personnes physiques domiciliées en Suisse et les personnes physiques qui exercent en Suisse une activité lucrative.", type: "obligation", mots_cles: ["domicile", "Suisse", "activité lucrative"] },
      { article: "Art. 1a LAVS", titre: "Assurance obligatoire des ressortissants suisses à l'étranger", description: "Les ressortissants suisses travaillant à l'étranger pour un employeur suisse restent assurés obligatoirement.", type: "étranger", mots_cles: ["étranger", "employeur suisse", "obligatoire"] },
      { article: "Art. 2 LAVS", titre: "Assurance facultative", description: "Les ressortissants suisses et les ressortissants des États membres de l'UE ou de l'AELE qui ne sont pas assurés obligatoirement peuvent s'assurer facultativement.", type: "facultatif", mots_cles: ["facultative", "Suisses", "UE"] },
      { article: "Art. 3 LAVS", titre: "Personnes exerçant une activité lucrative", description: "Les personnes qui exercent une activité lucrative en Suisse doivent payer des cotisations à l'AVS.", type: "cotisations", mots_cles: ["activité lucrative", "cotisations", "obligation"] },
    ],
    cotisations: [
      { article: "Art. 4 LAVS", titre: "Calcul des cotisations", description: "Les cotisations des assurés qui exercent une activité lucrative sont calculées en pour-cent du revenu de l'activité.", type: "calcul", mots_cles: ["calcul", "pourcentage", "revenu"] },
      { article: "Art. 5 LAVS", titre: "Cotisations des employés", description: "Les cotisations des salariés sont prélevées sur chaque salaire. L'employeur retient la part du salarié et verse l'intégralité à la caisse de compensation.", type: "employés", mots_cles: ["salariés", "employeur", "prélèvement"] },
      { article: "Art. 8 LAVS", titre: "Taux de cotisation", description: "Le taux de cotisation est de 8,7% du salaire, réparti par moitié entre l'employeur et l'employé (4,35% chacun).", type: "taux", mots_cles: ["8.7%", "répartition", "moitié"] },
      { article: "Art. 9 LAVS", titre: "Cotisations des indépendants", description: "Les personnes exerçant une activité lucrative indépendante paient des cotisations calculées sur leur revenu annuel.", type: "indépendants", mots_cles: ["indépendants", "revenu annuel", "calcul"] },
      { article: "Art. 10 LAVS", titre: "Cotisations des personnes sans activité lucrative", description: "Les assurés qui n'exercent pas d'activité lucrative paient des cotisations fixées selon leur condition sociale.", type: "sans_activité", mots_cles: ["sans activité", "condition sociale", "cotisations"] },
    ],
    rentes_vieillesse: [
      { article: "Art. 21 LAVS", titre: "Âge de la retraite", description: "L'âge de la retraite est fixé à 65 ans pour les hommes et les femmes (AVS 21 dès 2024 avec période transitoire).", type: "âge", mots_cles: ["65 ans", "retraite", "AVS 21"] },
      { article: "Art. 29 LAVS", titre: "Droit à la rente de vieillesse", description: "Les personnes qui ont cotisé à l'AVS pendant au moins une année complète ont droit à une rente de vieillesse.", type: "droit", mots_cles: ["droit", "une année", "cotisations"] },
      { article: "Art. 29bis LAVS", titre: "Bonifications pour tâches éducatives", description: "Des bonifications pour tâches éducatives sont attribuées aux assurés pour les années pendant lesquelles ils ont exercé l'autorité parentale sur des enfants.", type: "bonifications", mots_cles: ["éducatives", "enfants", "autorité parentale"] },
      { article: "Art. 29sexies LAVS", titre: "Bonifications pour tâches d'assistance", description: "Des bonifications pour tâches d'assistance sont attribuées aux assurés qui prennent en charge des proches nécessitant des soins.", type: "assistance", mots_cles: ["assistance", "proches", "soins"] },
      { article: "Art. 33 LAVS", titre: "Rente de vieillesse pour les veufs et veuves", description: "Les rentes de veufs et veuves sont remplacées par la rente de vieillesse lorsque celle-ci est plus élevée.", type: "veufs", mots_cles: ["veufs", "veuves", "remplacement"] },
      { article: "Art. 33bis LAVS", titre: "Anticipation de la rente", description: "Les assurés peuvent anticiper le versement de la rente de vieillesse de un à deux ans avant l'âge de référence.", type: "anticipation", mots_cles: ["anticipation", "réduction", "1-2 ans"] },
      { article: "Art. 33ter LAVS", titre: "Ajournement de la rente", description: "Les assurés peuvent ajourner le versement de la rente de 5 ans au maximum après l'âge de référence.", type: "ajournement", mots_cles: ["ajournement", "5 ans", "majoration"] },
      { article: "Art. 34 LAVS", titre: "Montant de la rente", description: "La rente mensuelle complète minimale est de 1'225 CHF et la rente maximale de 2'450 CHF (2024). La rente maximale est le double de la rente minimale.", type: "montant", mots_cles: ["1225", "2450", "minimum", "maximum"] },
      { article: "Art. 35 LAVS", titre: "Rentes pour enfants", description: "Les bénéficiaires d'une rente de vieillesse ont droit à une rente pour chaque enfant de moins de 25 ans en formation.", type: "enfants", mots_cles: ["enfants", "25 ans", "formation"] },
    ],
    rentes_survivants: [
      { article: "Art. 23 LAVS", titre: "Rente de veuve", description: "Les veuves ont droit à une rente si elles ont un ou plusieurs enfants, ou si elles ont atteint 45 ans et ont été mariées au moins 5 ans.", type: "veuve", mots_cles: ["veuve", "enfants", "45 ans"] },
      { article: "Art. 24 LAVS", titre: "Rente de veuf", description: "Les veufs ont droit à une rente tant qu'ils ont des enfants de moins de 18 ans.", type: "veuf", mots_cles: ["veuf", "enfants", "18 ans"] },
      { article: "Art. 25 LAVS", titre: "Rente d'orphelin", description: "Les enfants dont le père ou la mère est décédé ont droit à une rente d'orphelin jusqu'à 18 ans, ou 25 ans s'ils sont en formation.", type: "orphelin", mots_cles: ["orphelin", "18 ans", "25 ans", "formation"] },
      { article: "Art. 26 LAVS", titre: "Montant des rentes de survivants", description: "La rente de veuve ou de veuf correspond à 80% de la rente de vieillesse. La rente d'orphelin correspond à 40%.", type: "montant", mots_cles: ["80%", "40%", "survivants"] },
    ],
    ccavs_vaud: [
      { article: "CCAVS VD", titre: "Caisse cantonale vaudoise de compensation AVS", description: "La CCAVS gère l'AVS, l'AI, les APG, les allocations familiales et les prestations complémentaires pour les assurés vaudois. Adresse: Rue du Lac 37, 1815 Clarens.", type: "institution", mots_cles: ["Vaud", "CCAVS", "Clarens"] },
      { article: "CCAVS VD - Affiliation", titre: "Affiliation à la CCAVS", description: "Les employeurs vaudois doivent s'affilier à la CCAVS et déclarer leurs salariés.", type: "affiliation", mots_cles: ["affiliation", "employeurs", "déclaration"] },
      { article: "CCAVS VD - Cotisations", titre: "Encaissement des cotisations", description: "La CCAVS encaisse les cotisations AVS/AI/APG et les allocations familiales auprès des employeurs et indépendants.", type: "cotisations", mots_cles: ["encaissement", "employeurs", "indépendants"] },
    ],
  },

  // LPC - Loi fédérale sur les prestations complémentaires (RS 831.30)
  prestations_complementaires: {
    conditions: [
      { article: "Art. 2 LPC", titre: "Principe", description: "Les prestations complémentaires sont destinées à couvrir les besoins vitaux des personnes qui ne peuvent pas les couvrir par leurs propres moyens.", type: "principe", mots_cles: ["besoins vitaux", "couverture", "moyens propres"] },
      { article: "Art. 4 LPC", titre: "Conditions générales", description: "Ont droit aux prestations complémentaires les personnes qui ont leur domicile et leur résidence habituelle en Suisse et qui ont droit à une rente AVS/AI ou à une allocation pour impotent AI.", type: "conditions", mots_cles: ["domicile", "Suisse", "rente AVS/AI"] },
      { article: "Art. 4a LPC", titre: "Condition de résidence", description: "Les étrangers ont droit aux PC s'ils résident en Suisse sans interruption depuis 10 ans au moins.", type: "résidence", mots_cles: ["étrangers", "10 ans", "résidence"] },
      { article: "Art. 5 LPC", titre: "Conditions supplémentaires pour les étrangers", description: "Les réfugiés et les apatrides ont droit aux PC s'ils résident en Suisse depuis 5 ans au moins.", type: "étrangers", mots_cles: ["réfugiés", "apatrides", "5 ans"] },
    ],
    calcul: [
      { article: "Art. 9 LPC", titre: "Montant de la PC annuelle", description: "La PC annuelle correspond à la différence entre les dépenses reconnues et les revenus déterminants.", type: "calcul", mots_cles: ["dépenses", "revenus", "différence"] },
      { article: "Art. 10 LPC", titre: "Dépenses reconnues", description: "Sont reconnues comme dépenses: le montant destiné à la couverture des besoins vitaux, le loyer et les frais accessoires, la prime d'assurance-maladie.", type: "dépenses", mots_cles: ["besoins vitaux", "loyer", "assurance-maladie"] },
      { article: "Art. 10 al. 1 let. a LPC", titre: "Besoins vitaux - Personnes seules", description: "Le montant annuel destiné à la couverture des besoins vitaux est de 20'100 CHF pour une personne seule vivant à domicile (2024).", type: "montant", mots_cles: ["20100", "personne seule", "domicile"] },
      { article: "Art. 10 al. 1 let. a LPC", titre: "Besoins vitaux - Couples", description: "Le montant annuel destiné à la couverture des besoins vitaux est de 30'150 CHF pour un couple vivant à domicile (2024).", type: "montant", mots_cles: ["30150", "couple", "domicile"] },
      { article: "Art. 10 al. 1 let. b LPC", titre: "Loyer maximum", description: "Le loyer maximal pris en compte varie selon la région et la taille du ménage: de 16'440 CHF à 21'600 CHF/an pour une personne seule selon la région.", type: "loyer", mots_cles: ["loyer", "maximum", "région"] },
      { article: "Art. 11 LPC", titre: "Revenus déterminants", description: "Sont considérés comme revenus: les rentes, pensions, autres revenus périodiques, le produit de la fortune, les ressources dont l'assuré s'est dessaisi.", type: "revenus", mots_cles: ["rentes", "fortune", "dessaisissement"] },
      { article: "Art. 11 al. 1 let. c LPC", titre: "Fortune prise en compte", description: "1/10 de la fortune nette pour les rentiers AVS, 1/15 pour les rentiers AI, avec des franchises de 30'000 CHF (personne seule) ou 50'000 CHF (couple).", type: "fortune", mots_cles: ["1/10", "1/15", "franchise", "30000", "50000"] },
      { article: "Art. 11a LPC", titre: "Dessaisissement de fortune", description: "Est considéré comme dessaisissement la renonciation à des éléments de fortune, le transfert à des tiers sans contre-prestation équivalente.", type: "dessaisissement", mots_cles: ["dessaisissement", "renonciation", "transfert"] },
    ],
    frais_maladie: [
      { article: "Art. 14 LPC", titre: "Remboursement des frais de maladie et d'invalidité", description: "Les cantons remboursent aux bénéficiaires de PC les frais de maladie et d'invalidité non couverts par les assurances sociales.", type: "remboursement", mots_cles: ["maladie", "invalidité", "remboursement"] },
      { article: "Art. 14 al. 1 let. a LPC", titre: "Frais dentaires", description: "Sont remboursés les frais de soins dentaires jusqu'à 3'500 CHF par année civile.", type: "dentaire", mots_cles: ["dentaire", "3500", "remboursement"] },
      { article: "Art. 14 al. 1 let. b LPC", titre: "Aide, soins et assistance à domicile", description: "Sont remboursés les frais d'aide, de soins et d'assistance à domicile jusqu'à 25'000 CHF/an.", type: "soins", mots_cles: ["aide à domicile", "soins", "25000"] },
      { article: "Art. 14 al. 1 let. c LPC", titre: "Moyens auxiliaires", description: "Sont remboursés les frais liés aux moyens auxiliaires jusqu'à 6'000 CHF/an.", type: "auxiliaires", mots_cles: ["moyens auxiliaires", "6000"] },
      { article: "Art. 14 al. 1 let. d LPC", titre: "Participations aux frais de maladie", description: "Sont remboursés les participations aux frais de maladie (franchises, quotes-parts) jusqu'au montant prévu par le canton.", type: "participation", mots_cles: ["franchise", "quote-part", "LAMal"] },
    ],
    procedure: [
      { article: "Art. 20 LPC", titre: "Demande de PC", description: "La demande de prestations complémentaires doit être déposée auprès de l'organe compétent du canton de domicile.", type: "demande", mots_cles: ["demande", "canton", "domicile"] },
      { article: "Art. 21 LPC", titre: "Décision et versement", description: "L'organe compétent statue sur la demande par une décision écrite motivée et verse les PC mensuellement.", type: "décision", mots_cles: ["décision", "mensuel", "versement"] },
      { article: "Art. 22 LPC", titre: "Révision des PC", description: "Les PC sont révisées périodiquement et adaptées aux changements de situation du bénéficiaire.", type: "révision", mots_cles: ["révision", "changement", "adaptation"] },
      { article: "Art. 25 LPC", titre: "Restitution des prestations indûment perçues", description: "Les PC indûment perçues doivent être restituées. La restitution peut être demandée dans un délai de 3 ans.", type: "restitution", mots_cles: ["restitution", "3 ans", "indu"] },
    ],
  },

  // LPP - Loi fédérale sur la prévoyance professionnelle (RS 831.40)
  prevoyance_professionnelle: {
    principes: [
      { article: "Art. 1 LPP", titre: "But", description: "La prévoyance professionnelle permet aux personnes âgées, aux survivants et aux invalides de maintenir leur niveau de vie antérieur avec les prestations de l'AVS/AI.", type: "but", mots_cles: ["maintien", "niveau de vie", "AVS/AI"] },
      { article: "Art. 2 LPP", titre: "Assurance obligatoire des salariés", description: "Sont soumis à l'assurance obligatoire les salariés qui ont plus de 17 ans et reçoivent d'un même employeur un salaire annuel supérieur au seuil d'entrée.", type: "obligatoire", mots_cles: ["salariés", "17 ans", "seuil"] },
      { article: "Art. 3 LPP", titre: "Assurance obligatoire des chômeurs", description: "Les personnes au chômage sont assurées obligatoirement pour les risques décès et invalidité.", type: "chômeurs", mots_cles: ["chômage", "décès", "invalidité"] },
      { article: "Art. 4 LPP", titre: "Assurance facultative", description: "Les salariés et les indépendants qui ne sont pas soumis à l'assurance obligatoire peuvent s'assurer à titre facultatif.", type: "facultative", mots_cles: ["facultative", "indépendants", "volontaire"] },
      { article: "Art. 7 LPP", titre: "Salaire minimum et âge d'entrée", description: "Le seuil d'entrée LPP (salaire minimum) est de 22'050 CHF par année (2024). La cotisation commence à 25 ans pour l'épargne.", type: "seuil", mots_cles: ["22050", "seuil", "25 ans"] },
      { article: "Art. 8 LPP", titre: "Salaire coordonné", description: "Le salaire coordonné (assuré) est la part du salaire entre 25'725 CHF et 88'200 CHF par année (2024). La déduction de coordination est de 25'725 CHF.", type: "salaire_coordonné", mots_cles: ["25725", "88200", "coordination"] },
    ],
    prestations: [
      { article: "Art. 13 LPP", titre: "Âge de la retraite", description: "L'âge réglementaire de la retraite correspond à l'âge de référence AVS (65 ans). Une retraite anticipée est possible dès 58 ans.", type: "âge", mots_cles: ["65 ans", "58 ans", "anticipée"] },
      { article: "Art. 14 LPP", titre: "Rente de vieillesse", description: "L'assuré qui a atteint l'âge de la retraite a droit à une rente de vieillesse viagère.", type: "rente", mots_cles: ["rente", "vieillesse", "viagère"] },
      { article: "Art. 15 LPP", titre: "Prestation de sortie en capital", description: "L'assuré peut demander le versement en capital de sa prestation de sortie au lieu de la rente si le règlement le prévoit.", type: "capital", mots_cles: ["capital", "prestation de sortie", "règlement"] },
      { article: "Art. 16 LPP", titre: "Bonifications de vieillesse", description: "Les bonifications de vieillesse sont calculées en pour-cent du salaire coordonné: 7% (25-34 ans), 10% (35-44 ans), 15% (45-54 ans), 18% (55-65 ans).", type: "bonifications", mots_cles: ["bonifications", "7%", "10%", "15%", "18%"] },
      { article: "Art. 17 LPP", titre: "Taux de conversion", description: "Le taux de conversion minimal pour la partie obligatoire est de 6,8%.", type: "conversion", mots_cles: ["6.8%", "conversion", "obligatoire"] },
      { article: "Art. 18 LPP", titre: "Conditions pour la rente de veuve ou de veuf", description: "Le conjoint survivant a droit à une rente de veuve ou de veuf si, au décès de l'assuré, il a des enfants à charge ou a atteint 45 ans et était marié depuis 5 ans.", type: "veuve", mots_cles: ["veuve", "veuf", "45 ans", "5 ans"] },
      { article: "Art. 19 LPP", titre: "Rente de veuve ou de veuf", description: "La rente de veuve ou de veuf s'élève à 60% de la rente d'invalidité entière à laquelle l'assuré aurait eu droit.", type: "montant", mots_cles: ["60%", "rente", "survivants"] },
      { article: "Art. 20 LPP", titre: "Rente d'orphelin", description: "Les enfants du défunt ont droit à une rente d'orphelin jusqu'à 18 ans ou 25 ans s'ils sont en formation. La rente s'élève à 20% de la rente d'invalidité.", type: "orphelin", mots_cles: ["orphelin", "20%", "25 ans"] },
      { article: "Art. 23 LPP", titre: "Droit à la rente d'invalidité", description: "Ont droit à des prestations d'invalidité les personnes qui sont invalides à 40% au moins au sens de l'AI.", type: "invalidité", mots_cles: ["invalidité", "40%", "AI"] },
      { article: "Art. 24 LPP", titre: "Montant de la rente d'invalidité", description: "La rente d'invalidité entière correspond au minimum à la rente de vieillesse calculée sur l'avoir de vieillesse acquis jusqu'à la survenance de l'invalidité.", type: "montant", mots_cles: ["rente", "avoir de vieillesse", "calcul"] },
    ],
    libre_passage: [
      { article: "Art. 25 LPP", titre: "Libre passage", description: "En cas de changement d'emploi, l'avoir de prévoyance est transféré à la nouvelle institution de prévoyance.", type: "transfert", mots_cles: ["libre passage", "changement", "transfert"] },
      { article: "Art. 26 LPP", titre: "Prestation de libre passage", description: "La prestation de libre passage correspond à la valeur actuelle de la prestation de vieillesse acquise.", type: "prestation", mots_cles: ["prestation", "valeur actuelle", "acquis"] },
      { article: "Art. 30c LPP", titre: "Versement anticipé pour l'accession à la propriété", description: "L'assuré peut demander le versement anticipé de son avoir pour financer l'accession à la propriété d'un logement pour ses propres besoins.", type: "versement", mots_cles: ["anticipé", "propriété", "logement"] },
    ],
    institutions: [
      { article: "Art. 48 LPP", titre: "Institutions de prévoyance", description: "Les institutions de prévoyance sont des fondations ou des sociétés coopératives. Elles sont inscrites au registre de la prévoyance professionnelle.", type: "forme", mots_cles: ["fondation", "coopérative", "registre"] },
      { article: "Art. 49 LPP", titre: "Liberté d'organisation", description: "Les institutions de prévoyance peuvent définir librement les prestations dans les limites de la loi.", type: "liberté", mots_cles: ["organisation", "prestations", "limites"] },
      { article: "Art. 51 LPP", titre: "Gestion paritaire", description: "Les salariés et les employeurs désignent en nombre égal les membres de l'organe suprême de l'institution.", type: "paritaire", mots_cles: ["paritaire", "employés", "employeurs"] },
    ],
    previva: [
      { article: "Previva", titre: "Caisse de pension Previva", description: "Previva est une fondation de prévoyance professionnelle LPP basée à Paudex (VD). Elle gère la prévoyance professionnelle pour de nombreux employeurs vaudois. Adresse: Chemin de la Vignette 2, 1094 Paudex.", type: "institution", mots_cles: ["Previva", "Paudex", "LPP"] },
      { article: "Previva - Prestations", titre: "Prestations Previva", description: "Previva offre des prestations de retraite, d'invalidité et de décès conformément à son règlement et à la LPP.", type: "prestations", mots_cles: ["retraite", "invalidité", "décès"] },
      { article: "Previva - Affiliation", titre: "Affiliation à Previva", description: "Les employeurs peuvent affilier leurs collaborateurs à Previva. L'affiliation est gérée par contrat d'adhésion.", type: "affiliation", mots_cles: ["affiliation", "employeurs", "contrat"] },
      { article: "Previva - Contact", titre: "Contact Previva", description: "Pour toute question relative à la prévoyance professionnelle, les assurés peuvent contacter Previva: tél. 021 796 30 90.", type: "contact", mots_cles: ["contact", "téléphone", "questions"] },
    ],
  },

  // LPGA - Loi fédérale sur la partie générale du droit des assurances sociales (RS 830.1)
  lpga: {
    definitions: [
      { article: "Art. 1 LPGA", titre: "But et objet", description: "La LPGA coordonne le droit des assurances sociales. Elle définit les principes et les règles générales applicables à toutes les assurances sociales.", type: "but", mots_cles: ["coordination", "principes", "règles générales"] },
      { article: "Art. 3 LPGA", titre: "Maladie", description: "Est réputée maladie toute atteinte à la santé physique, mentale ou psychique qui n'est pas due à un accident.", type: "définition", mots_cles: ["maladie", "atteinte", "santé"] },
      { article: "Art. 4 LPGA", titre: "Accident", description: "Est réputée accident toute atteinte dommageable, soudaine et involontaire, portée au corps humain.", type: "définition", mots_cles: ["accident", "soudaine", "involontaire"] },
      { article: "Art. 6 LPGA", titre: "Incapacité de travail", description: "Est réputée incapacité de travail toute perte, totale ou partielle, de l'aptitude de l'assuré à accomplir son travail habituel.", type: "définition", mots_cles: ["incapacité", "travail", "aptitude"] },
      { article: "Art. 7 LPGA", titre: "Incapacité de gain", description: "Est réputée incapacité de gain toute diminution de l'ensemble ou d'une partie des possibilités de gain de l'assuré sur un marché du travail équilibré.", type: "définition", mots_cles: ["incapacité de gain", "marché du travail", "diminution"] },
      { article: "Art. 8 LPGA", titre: "Invalidité", description: "Est réputée invalidité l'incapacité de gain totale ou partielle qui est présumée permanente ou de longue durée.", type: "définition", mots_cles: ["invalidité", "permanente", "longue durée"] },
      { article: "Art. 9 LPGA", titre: "Impotence", description: "Est réputée impotente toute personne qui, en raison d'une atteinte à sa santé, a besoin de façon permanente de l'aide d'autrui.", type: "définition", mots_cles: ["impotence", "aide", "permanente"] },
    ],
    principes_procedure: [
      { article: "Art. 27 LPGA", titre: "Renseignements et conseils", description: "Les assureurs et les organes d'exécution des diverses assurances sociales sont tenus de renseigner les personnes intéressées sur leurs droits et obligations.", type: "information", mots_cles: ["renseignements", "conseils", "droits"] },
      { article: "Art. 28 LPGA", titre: "Collaboration de l'assuré", description: "Quiconque fait valoir son droit à des prestations doit fournir gratuitement tous les renseignements nécessaires pour établir ce droit.", type: "collaboration", mots_cles: ["collaboration", "renseignements", "établir"] },
      { article: "Art. 29 LPGA", titre: "Réclamation de la prestation", description: "Celui qui fait valoir son droit à des prestations doit s'annoncer à l'assureur compétent.", type: "annonce", mots_cles: ["réclamation", "annonce", "assureur"] },
      { article: "Art. 42 LPGA", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues. Elles peuvent consulter le dossier et produire des moyens de preuve.", type: "audition", mots_cles: ["droit d'être entendu", "dossier", "preuves"] },
      { article: "Art. 43 LPGA", titre: "Instruction de la demande", description: "L'assureur examine les demandes, prend d'office les mesures d'instruction nécessaires et recueille les renseignements dont il a besoin.", type: "instruction", mots_cles: ["instruction", "mesures", "renseignements"] },
      { article: "Art. 44 LPGA", titre: "Expertise", description: "L'assureur peut recourir aux services d'experts pour des questions médicales ou techniques.", type: "expertise", mots_cles: ["expertise", "expert", "médical"] },
    ],
    decisions_voies_droit: [
      { article: "Art. 49 LPGA", titre: "Décision", description: "L'assureur doit rendre par écrit les décisions qui portent sur des prestations, créances ou injonctions importantes.", type: "décision", mots_cles: ["décision", "écrite", "prestations"] },
      { article: "Art. 51 LPGA", titre: "Motivation et indication des voies de droit", description: "Les décisions doivent être motivées. Elles doivent indiquer les voies de droit.", type: "motivation", mots_cles: ["motivation", "voies de droit", "indication"] },
      { article: "Art. 52 LPGA", titre: "Opposition", description: "Les décisions peuvent être attaquées dans les 30 jours par voie d'opposition auprès de l'assureur qui les a rendues.", type: "opposition", mots_cles: ["opposition", "30 jours", "assureur"] },
      { article: "Art. 56 LPGA", titre: "Recours", description: "Les décisions sur opposition ou les décisions contre lesquelles la voie de l'opposition n'est pas ouverte peuvent faire l'objet d'un recours.", type: "recours", mots_cles: ["recours", "opposition", "tribunal"] },
      { article: "Art. 60 LPGA", titre: "Délai de recours", description: "Le recours doit être déposé dans les 30 jours suivant la notification de la décision sujette à recours.", type: "délai", mots_cles: ["30 jours", "notification", "délai"] },
      { article: "Art. 61 LPGA", titre: "Procédure", description: "Les cantons instituent un tribunal cantonal des assurances sociales. La procédure est gratuite pour les parties.", type: "procédure", mots_cles: ["tribunal cantonal", "gratuite", "procédure"] },
    ],
    delais: [
      { article: "Art. 38 LPGA", titre: "Calcul des délais", description: "Le délai commence à courir le lendemain de la communication ou de la survenance de l'événement qui le fait courir.", type: "calcul", mots_cles: ["délai", "calcul", "lendemain"] },
      { article: "Art. 39 LPGA", titre: "Observation des délais", description: "Le délai est réputé observé si l'acte est remis avant l'expiration du délai à l'assureur ou à une représentation suisse à l'étranger.", type: "observation", mots_cles: ["observation", "remise", "expiration"] },
      { article: "Art. 40 LPGA", titre: "Prolongation du délai", description: "Le délai légal ne peut être prolongé. Les délais fixés par l'assureur peuvent être prolongés pour un motif suffisant.", type: "prolongation", mots_cles: ["prolongation", "motif", "suffisant"] },
      { article: "Art. 41 LPGA", titre: "Restitution du délai", description: "Si le requérant ou son mandataire a été empêché, sans sa faute, d'agir dans le délai fixé, celui-ci est restitué pour autant que, dans les 30 jours, il en fasse la demande motivée.", type: "restitution", mots_cles: ["restitution", "30 jours", "empêchement"] },
    ],
  },

  // LAMal, LAF, LACI - Autres lois fédérales
  autres_assurances: {
    lamal: [
      { article: "Art. 1 LAMal", titre: "Champ d'application", description: "L'assurance-maladie comprend l'assurance obligatoire des soins et l'assurance facultative d'indemnités journalières.", type: "champ", mots_cles: ["obligatoire", "soins", "indemnités journalières"] },
      { article: "Art. 3 LAMal", titre: "Personnes tenues de s'assurer", description: "Toute personne domiciliée en Suisse doit s'assurer pour les soins en cas de maladie dans les 3 mois.", type: "obligation", mots_cles: ["domicile", "3 mois", "obligation"] },
      { article: "Art. 25 LAMal", titre: "Prestations de l'assurance obligatoire", description: "L'assurance obligatoire des soins prend en charge les coûts des prestations définies aux art. 25 à 31.", type: "prestations", mots_cles: ["prestations", "soins", "prise en charge"] },
      { article: "Art. 64 LAMal", titre: "Participation aux coûts", description: "Les assurés participent aux coûts des prestations par le biais d'une franchise et d'une quote-part de 10%.", type: "participation", mots_cles: ["franchise", "quote-part", "10%"] },
      { article: "Art. 65 LAMal", titre: "Réduction des primes", description: "Les cantons accordent des réductions de primes aux assurés de condition économique modeste.", type: "subsides", mots_cles: ["réduction", "primes", "subsides"] },
    ],
    laf: [
      { article: "Art. 1 LAFam", titre: "But", description: "La loi vise à compenser partiellement les charges familiales par l'octroi d'allocations familiales.", type: "but", mots_cles: ["allocations", "familiales", "charges"] },
      { article: "Art. 3 LAFam", titre: "Allocations pour enfant", description: "L'allocation pour enfant est versée pour chaque enfant jusqu'à 16 ans, ou 20 ans s'il ne peut exercer d'activité lucrative.", type: "allocation", mots_cles: ["enfant", "16 ans", "20 ans"] },
      { article: "Art. 4 LAFam", titre: "Allocation de formation professionnelle", description: "L'allocation de formation professionnelle est versée pour chaque enfant de 16 à 25 ans en formation.", type: "formation", mots_cles: ["formation", "16-25 ans", "allocation"] },
      { article: "Art. 5 LAFam", titre: "Montants minimaux", description: "Le montant minimal de l'allocation pour enfant est de 200 CHF/mois, celui de l'allocation de formation de 250 CHF/mois.", type: "montants", mots_cles: ["200 CHF", "250 CHF", "minimum"] },
    ],
    laci: [
      { article: "Art. 1 LACI", titre: "But", description: "L'assurance-chômage prévient le chômage, combat le chômage et indemnise les personnes qui en sont victimes.", type: "but", mots_cles: ["prévention", "chômage", "indemnisation"] },
      { article: "Art. 8 LACI", titre: "Droit à l'indemnité", description: "L'assuré a droit à l'indemnité de chômage s'il est sans emploi ou partiellement sans emploi et s'il remplit les conditions.", type: "droit", mots_cles: ["indemnité", "sans emploi", "conditions"] },
      { article: "Art. 13 LACI", titre: "Période de cotisation", description: "Celui qui, dans les deux ans précédant l'inscription, a exercé une activité soumise à cotisation pendant 12 mois remplit la période de cotisation.", type: "cotisation", mots_cles: ["12 mois", "2 ans", "cotisation"] },
      { article: "Art. 22 LACI", titre: "Montant de l'indemnité", description: "L'indemnité journalière s'élève à 70% du gain assuré (80% pour les assurés ayant des enfants à charge ou un gain faible).", type: "montant", mots_cles: ["70%", "80%", "gain assuré"] },
      { article: "Art. 27 LACI", titre: "Durée de l'indemnisation", description: "Le nombre maximum d'indemnités journalières est de 400 ou 520 selon les conditions (âge, cotisations).", type: "durée", mots_cles: ["400", "520", "indemnités journalières"] },
    ],
  },

  // =========================================================================
  // III. DROIT FÉDÉRAL - PROTECTION DES DONNÉES ET AUTRES
  // =========================================================================

  protection_donnees: {
    principes: [
      { article: "Art. 1 LPD", titre: "But", description: "La LPD vise à protéger la personnalité et les droits fondamentaux des personnes physiques dont les données personnelles font l'objet d'un traitement.", type: "but" },
      { article: "Art. 2 LPD", titre: "Champ d'application", description: "La loi s'applique au traitement de données personnelles effectué par des personnes privées et des organes fédéraux.", type: "application" },
      { article: "Art. 5 LPD", titre: "Définitions", description: "Données personnelles: toute information concernant une personne identifiée ou identifiable. Données sensibles: données sur les opinions ou activités religieuses, philosophiques, politiques ou syndicales, la santé, la sphère intime ou l'origine.", type: "définitions" },
      { article: "Art. 6 LPD", titre: "Principes de traitement", description: "Les données personnelles doivent être traitées de manière licite, conforme à la bonne foi et proportionnée. La collecte doit être reconnaissable pour la personne concernée.", type: "principes" },
      { article: "Art. 8 LPD", titre: "Sécurité des données", description: "Les données doivent être protégées contre tout traitement non autorisé par des mesures techniques et organisationnelles appropriées.", type: "sécurité" },
    ],
    droits: [
      { article: "Art. 25 LPD", titre: "Droit d'accès", description: "Toute personne peut demander au responsable du traitement si des données la concernant sont traitées.", type: "accès" },
      { article: "Art. 29 LPD", titre: "Modalités du droit d'accès", description: "La communication des renseignements est gratuite. Le responsable fournit les renseignements dans les 30 jours.", type: "modalités" },
      { article: "Art. 32 LPD", titre: "Prétentions en cas d'atteinte", description: "La personne concernée peut exiger la rectification, la destruction ou le blocage des données inexactes ou traitées de manière illicite.", type: "prétentions" },
    ],
  },

  constitution: {
    droits_fondamentaux: [
      { article: "Art. 7 Cst.", titre: "Dignité humaine", description: "La dignité humaine doit être respectée et protégée.", type: "droit_absolu" },
      { article: "Art. 8 Cst.", titre: "Égalité", description: "Tous les êtres humains sont égaux devant la loi. Nul ne doit subir de discrimination.", type: "égalité" },
      { article: "Art. 9 Cst.", titre: "Protection contre l'arbitraire et bonne foi", description: "Toute personne a le droit d'être traitée par les organes de l'État sans arbitraire et conformément aux règles de la bonne foi.", type: "bonne_foi" },
      { article: "Art. 10 Cst.", titre: "Droit à la vie et liberté personnelle", description: "Tout être humain a droit à la vie. La peine de mort est interdite. Tout être humain a droit à la liberté personnelle, à l'intégrité physique et psychique et à la liberté de mouvement.", type: "liberté" },
      { article: "Art. 12 Cst.", titre: "Droit d'obtenir de l'aide dans des situations de détresse", description: "Quiconque est dans une situation de détresse et n'est pas en mesure de subvenir à son entretien a le droit d'être aidé et assisté.", type: "aide" },
      { article: "Art. 13 Cst.", titre: "Protection de la sphère privée", description: "Toute personne a droit au respect de sa vie privée et familiale, de son domicile, de sa correspondance.", type: "vie_privée" },
    ],
    garanties_procedures: [
      { article: "Art. 29 Cst.", titre: "Garanties générales de procédure", description: "Toute personne a droit, dans une procédure judiciaire ou administrative, à ce que sa cause soit traitée équitablement et jugée dans un délai raisonnable.", type: "équité" },
      { article: "Art. 29 al. 2 Cst.", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues.", type: "audition" },
      { article: "Art. 29a Cst.", titre: "Garantie de l'accès au juge", description: "Toute personne a droit à ce que sa cause soit jugée par une autorité judiciaire.", type: "accès_juge" },
    ],
  },

  procedure_administrative: {
    principes: [
      { article: "Art. 5 PA", titre: "Notion de décision", description: "Sont des décisions les mesures prises par les autorités dans des cas d'espèce, fondées sur le droit public fédéral.", type: "définition" },
      { article: "Art. 12 PA", titre: "Établissement des faits d'office", description: "L'autorité constate les faits d'office et n'est pas liée par les allégués des parties.", type: "instruction" },
    ],
    droits_parties: [
      { article: "Art. 26 PA", titre: "Droit de consulter les pièces", description: "La partie ou son mandataire a le droit de consulter les pièces du dossier.", type: "consultation" },
      { article: "Art. 29 PA", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues.", type: "audition" },
      { article: "Art. 35 PA", titre: "Motivation des décisions", description: "Les décisions doivent être motivées. Elles doivent indiquer les voies de recours.", type: "motivation" },
      { article: "Art. 50 PA", titre: "Délai de recours", description: "Le recours doit être déposé dans les 30 jours suivant la notification de la décision.", type: "délai" },
    ],
  },

  code_penal: {
    infractions_fonction: [
      { article: "Art. 312 CP", titre: "Abus d'autorité", description: "Les membres d'une autorité et les fonctionnaires qui, dans le dessein de se procurer ou de procurer à un tiers un avantage illicite, ou de nuire à autrui, auront abusé des pouvoirs de leur charge, seront punis.", type: "infraction" },
      { article: "Art. 320 CP", titre: "Violation du secret de fonction", description: "Celui qui aura révélé un secret qui lui avait été confié en sa qualité de fonctionnaire sera puni.", type: "secret" },
      { article: "Art. 321 CP", titre: "Violation du secret professionnel", description: "Les médecins, avocats, notaires, curateurs et autres personnes astreintes au secret professionnel qui auront révélé un secret seront punis.", type: "secret" },
    ],
  },

  code_obligations: {
    responsabilite_civile: [
      { article: "Art. 41 CO", titre: "Responsabilité pour faute", description: "Celui qui cause, d'une manière illicite, un dommage à autrui, soit intentionnellement, soit par négligence ou imprudence, est tenu de le réparer.", type: "faute" },
      { article: "Art. 47 CO", titre: "Tort moral", description: "Le juge peut, en tenant compte de circonstances particulières, allouer à la victime une indemnité équitable à titre de réparation morale.", type: "tort_moral" },
    ],
  },

  // =========================================================================
  // IV. DROIT CANTONAL VAUDOIS
  // =========================================================================

  droit_vaudois: {
    lvpae: [
      { article: "Art. 1 LVPAE", titre: "Objet", description: "La loi règle l'application dans le canton de Vaud des dispositions fédérales sur la protection de l'adulte et de l'enfant.", type: "objet" },
      { article: "Art. 2 LVPAE", titre: "Autorité de protection", description: "La Justice de Paix est l'autorité de protection de l'adulte au sens de l'art. 440 CC.", type: "autorité" },
      { article: "Art. 7 LVPAE", titre: "Nomination des curateurs", description: "La Justice de Paix nomme les curateurs professionnels et privés.", type: "nomination" },
    ],

    // LASV - Loi sur l'action sociale vaudoise - ÉTENDUE
    lasv: {
      principes: [
        { article: "Art. 1 LASV", titre: "But", description: "La loi a pour but de garantir le minimum vital et de favoriser l'intégration sociale et professionnelle des personnes en difficulté.", type: "but", mots_cles: ["minimum vital", "intégration", "difficultés"] },
        { article: "Art. 2 LASV", titre: "Droit aux prestations", description: "Toute personne dans le besoin a droit aux prestations prévues par la loi, sans distinction de nationalité.", type: "droit", mots_cles: ["droit", "besoin", "prestations"] },
        { article: "Art. 3 LASV", titre: "Prestations de l'aide sociale", description: "L'aide comprend l'aide financière (Revenu d'Insertion), l'aide personnelle, l'hébergement d'urgence et les mesures d'insertion.", type: "prestations", mots_cles: ["RI", "aide financière", "insertion"] },
        { article: "Art. 4 LASV", titre: "Subsidiarité", description: "L'aide sociale est subsidiaire par rapport aux autres sources de revenus et prestations (chômage, AI, AVS, PC, pension alimentaire).", type: "subsidiarité", mots_cles: ["subsidiaire", "chômage", "AI", "AVS"] },
        { article: "Art. 5 LASV", titre: "Dignité", description: "L'aide est octroyée dans le respect de la dignité de la personne. Le bénéficiaire est traité avec considération et sans discrimination.", type: "dignité", mots_cles: ["dignité", "respect", "discrimination"] },
        { article: "Art. 6 LASV", titre: "Individualisation", description: "L'aide est adaptée à la situation personnelle et familiale du bénéficiaire. Elle tient compte de ses besoins spécifiques.", type: "individualisation", mots_cles: ["individualisation", "besoins", "situation"] },
      ],
      revenu_insertion: [
        { article: "Art. 21 LASV", titre: "Revenu d'Insertion (RI)", description: "Le Revenu d'Insertion garantit le minimum vital aux personnes qui ne peuvent subvenir à leurs besoins. Il est calculé selon les normes CSIAS adaptées.", type: "RI", mots_cles: ["RI", "minimum vital", "CSIAS"] },
        { article: "Art. 22 LASV", titre: "Calcul du RI", description: "Le RI est la différence entre les besoins reconnus (forfait entretien, loyer, prime AM) et les revenus du bénéficiaire.", type: "calcul", mots_cles: ["calcul", "besoins", "revenus"] },
        { article: "Art. 23 LASV", titre: "Composition du budget", description: "Le budget RI comprend: le forfait d'entretien, le loyer effectif (max. plafond), la prime d'assurance-maladie de base, les prestations circonstancielles.", type: "budget", mots_cles: ["budget", "forfait", "loyer", "assurance-maladie"] },
        { article: "Art. 24 LASV", titre: "Supplément d'intégration", description: "Un supplément d'intégration peut être accordé aux bénéficiaires qui participent activement à des mesures d'insertion sociale ou professionnelle.", type: "supplément", mots_cles: ["SIS", "SIP", "intégration", "supplément"] },
        { article: "Art. 25 LASV", titre: "Franchise sur revenu", description: "Une franchise est accordée sur le revenu d'une activité lucrative (25% du salaire net, max. 400 CHF/mois).", type: "franchise", mots_cles: ["franchise", "25%", "400 CHF", "travail"] },
      ],
      droits_devoirs: [
        { article: "Art. 31 LASV", titre: "Obligation de déclarer", description: "Le bénéficiaire doit déclarer de manière complète et exacte sa situation financière et personnelle. Il doit signaler tout changement.", type: "déclaration", mots_cles: ["déclaration", "situation", "changement"] },
        { article: "Art. 32 LASV", titre: "Obligation de collaborer", description: "Le bénéficiaire collabore activement avec les services sociaux. Il répond aux convocations et fournit les documents demandés.", type: "collaboration", mots_cles: ["collaboration", "convocations", "documents"] },
        { article: "Art. 33 LASV", titre: "Recherche d'emploi ou de formation", description: "Le bénéficiaire apte au travail doit entreprendre tout ce qui est raisonnablement exigible pour retrouver son autonomie financière.", type: "recherche", mots_cles: ["emploi", "formation", "autonomie"] },
        { article: "Art. 34 LASV", titre: "Participation aux mesures d'insertion", description: "Le bénéficiaire participe aux mesures d'insertion qui lui sont proposées dans le cadre de son contrat d'insertion.", type: "mesures", mots_cles: ["mesures", "insertion", "CISP"] },
        { article: "Art. 35 LASV", titre: "Droit à l'information", description: "Le bénéficiaire a le droit d'être informé sur ses droits, ses obligations et les voies de recours.", type: "information", mots_cles: ["information", "droits", "recours"] },
        { article: "Art. 36 LASV", titre: "Droit au recours", description: "Le bénéficiaire peut contester les décisions du CSR par recours au Département (DSAS) dans les 30 jours.", type: "recours", mots_cles: ["recours", "30 jours", "DSAS"] },
      ],
      sanctions: [
        { article: "Art. 45 LASV", titre: "Réduction des prestations", description: "Les prestations peuvent être réduites en cas de manquement aux obligations. La réduction est progressive: 15%, 30%, 50% du forfait.", type: "sanction", mots_cles: ["réduction", "15%", "30%", "50%", "sanction"] },
        { article: "Art. 46 LASV", titre: "Suspension des prestations", description: "En cas de manquement grave ou répété, les prestations peuvent être suspendues temporairement, à l'exception du loyer et de la prime AM.", type: "suspension", mots_cles: ["suspension", "grave", "répété"] },
        { article: "Art. 47 LASV", titre: "Procédure de sanction", description: "Avant toute sanction, le bénéficiaire est entendu. La décision est motivée et indique les voies de recours.", type: "procédure", mots_cles: ["procédure", "audition", "motivation"] },
      ],
      remboursement: [
        { article: "Art. 48 LASV", titre: "Obligation de remboursement", description: "Les prestations indûment perçues doivent être remboursées. La demande de remboursement doit intervenir dans les 3 ans.", type: "indu", mots_cles: ["remboursement", "indu", "3 ans"] },
        { article: "Art. 49 LASV", titre: "Retour à meilleure fortune", description: "Les prestations d'aide sociale peuvent être réclamées au bénéficiaire dont la situation financière s'est améliorée de manière significative.", type: "fortune", mots_cles: ["meilleure fortune", "récupération", "amélioration"] },
        { article: "Art. 50 LASV", titre: "Prescription du remboursement", description: "La créance de remboursement se prescrit par 10 ans à compter de l'amélioration de la situation.", type: "prescription", mots_cles: ["prescription", "10 ans", "créance"] },
      ],
    },

    // RLASV - Règlement d'application de la LASV
    rlasv: {
      procedure: [
        { article: "Art. 1 RLASV", titre: "Compétence des CSR", description: "Les Centres Sociaux Régionaux (CSR) sont compétents pour traiter les demandes d'aide sociale et octroyer le Revenu d'Insertion.", type: "compétence", mots_cles: ["CSR", "compétence", "demandes"] },
        { article: "Art. 2 RLASV", titre: "Dépôt de la demande", description: "La demande d'aide sociale est déposée auprès du CSR du lieu de domicile sur le formulaire officiel.", type: "demande", mots_cles: ["demande", "CSR", "formulaire"] },
        { article: "Art. 3 RLASV", titre: "Pièces justificatives", description: "Le demandeur fournit: pièce d'identité, attestation de domicile, relevés bancaires, justificatifs de revenus, bail à loyer, polices d'assurance.", type: "pièces", mots_cles: ["pièces", "justificatifs", "documents"] },
        { article: "Art. 4 RLASV", titre: "Délai de traitement normal", description: "Le CSR statue sur la demande dans un délai de 30 jours à compter de la réception du dossier complet.", type: "délai", mots_cles: ["30 jours", "traitement", "délai"] },
        { article: "Art. 5 RLASV", titre: "Délai de traitement urgent", description: "En cas d'urgence avérée, une aide financière provisoire peut être accordée dans un délai de 5 jours ouvrables.", type: "urgence", mots_cles: ["5 jours", "urgence", "provisoire"] },
        { article: "Art. 6 RLASV", titre: "Décision écrite", description: "La décision est notifiée par écrit au bénéficiaire. Elle indique le montant accordé, les conditions et les voies de recours.", type: "décision", mots_cles: ["décision", "écrite", "notification"] },
      ],
      calcul_budget: [
        { article: "Art. 10 RLASV", titre: "Formule de calcul du RI", description: "RI mensuel = Besoins reconnus - Revenus déterminants. Les besoins comprennent le forfait, le loyer (max.), la prime AM, les frais particuliers.", type: "formule", mots_cles: ["formule", "calcul", "besoins", "revenus"] },
        { article: "Art. 11 RLASV", titre: "Forfait d'entretien", description: "Le forfait d'entretien est fixé selon les normes CSIAS et la taille du ménage. Il couvre l'alimentation, l'habillement, l'hygiène, les loisirs.", type: "forfait", mots_cles: ["forfait", "CSIAS", "entretien"] },
        { article: "Art. 12 RLASV", titre: "Loyer pris en compte", description: "Le loyer effectif est pris en compte jusqu'au plafond fixé pour la zone géographique et la composition du ménage.", type: "loyer", mots_cles: ["loyer", "plafond", "zone"] },
        { article: "Art. 13 RLASV", titre: "Prime d'assurance-maladie", description: "La prime d'assurance-maladie obligatoire (LAMal) est prise en compte en totalité, après déduction des subsides.", type: "assurance-maladie", mots_cles: ["prime", "LAMal", "subsides"] },
        { article: "Art. 14 RLASV", titre: "Revenus pris en compte", description: "Sont pris en compte: le salaire net après franchise, les rentes, les pensions alimentaires, les allocations familiales, les autres revenus.", type: "revenus", mots_cles: ["salaire", "rentes", "allocations", "revenus"] },
        { article: "Art. 15 RLASV", titre: "Fortune prise en compte", description: "La fortune nette est prise en compte au-delà d'une franchise de 4'000 CHF par personne. L'excédent est considéré comme revenu.", type: "fortune", mots_cles: ["fortune", "franchise", "4000"] },
      ],
      cisp: [
        { article: "Art. 25 RLASV", titre: "Contrat d'Insertion Sociale et Professionnelle (CISP)", description: "Le CISP est obligatoire pour tout bénéficiaire RI apte. Il définit les objectifs d'insertion et les mesures à entreprendre.", type: "CISP", mots_cles: ["CISP", "obligatoire", "objectifs"] },
        { article: "Art. 26 RLASV", titre: "Contenu du CISP", description: "Le CISP comprend: les objectifs personnalisés, les mesures proposées, les obligations du bénéficiaire, les engagements du CSR, le calendrier de suivi.", type: "contenu", mots_cles: ["objectifs", "mesures", "obligations", "suivi"] },
        { article: "Art. 27 RLASV", titre: "Durée du CISP", description: "Le CISP est conclu pour une durée de 6 mois renouvelable. Un bilan est effectué à chaque échéance.", type: "durée", mots_cles: ["6 mois", "renouvelable", "bilan"] },
        { article: "Art. 28 RLASV", titre: "Révision du CISP", description: "Le CISP peut être révisé en cas de changement de situation. L'assistant social propose des adaptations en accord avec le bénéficiaire.", type: "révision", mots_cles: ["révision", "changement", "adaptation"] },
      ],
    },

    // Normes RI (CSIAS adaptées Vaud)
    normes_ri: {
      forfaits_entretien: [
        { norme: "Norme RI 1.1", titre: "Forfait 1 personne", montant: 1031, type: "CHF/mois", description: "Forfait mensuel d'entretien pour une personne seule. Couvre alimentation, habillement, hygiène, transports locaux, télécommunications, loisirs.", mots_cles: ["1031", "personne seule", "forfait"] },
        { norme: "Norme RI 1.2", titre: "Forfait 2 personnes", montant: 1577, type: "CHF/mois", description: "Forfait mensuel d'entretien pour un ménage de 2 personnes.", mots_cles: ["1577", "2 personnes", "couple"] },
        { norme: "Norme RI 1.3", titre: "Forfait 3 personnes", montant: 1918, type: "CHF/mois", description: "Forfait mensuel d'entretien pour un ménage de 3 personnes.", mots_cles: ["1918", "3 personnes", "famille"] },
        { norme: "Norme RI 1.4", titre: "Forfait 4 personnes", montant: 2201, type: "CHF/mois", description: "Forfait mensuel d'entretien pour un ménage de 4 personnes.", mots_cles: ["2201", "4 personnes", "famille"] },
        { norme: "Norme RI 1.5", titre: "Forfait 5 personnes", montant: 2456, type: "CHF/mois", description: "Forfait mensuel d'entretien pour un ménage de 5 personnes.", mots_cles: ["2456", "5 personnes", "famille"] },
        { norme: "Norme RI 1.6", titre: "Forfait 6 personnes", montant: 2683, type: "CHF/mois", description: "Forfait mensuel d'entretien pour un ménage de 6 personnes.", mots_cles: ["2683", "6 personnes", "famille"] },
        { norme: "Norme RI 1.7", titre: "Supplément par personne supplémentaire", montant: 227, type: "CHF/mois", description: "Forfait additionnel pour chaque personne supplémentaire au-delà de 6.", mots_cles: ["227", "supplément", "personne supplémentaire"] },
        { norme: "Norme RI 1.8", titre: "Composition du forfait", description: "Le forfait couvre: alimentation (environ 35%), vêtements/chaussures (environ 10%), énergie/communications (environ 15%), santé courante (environ 5%), transports locaux (environ 10%), loisirs/formation (environ 10%), autres dépenses courantes (environ 15%).", type: "composition", mots_cles: ["composition", "alimentation", "vêtements", "loisirs"] },
      ],
      plafonds_loyer: [
        { norme: "Norme RI 2.1", titre: "Zone A - Lausanne - 1 personne", montant: 1100, type: "CHF/mois", zone: "A", personnes: 1, description: "Plafond de loyer pour 1 personne à Lausanne et communes assimilées (Pully, Prilly, Renens).", mots_cles: ["1100", "Lausanne", "1 personne", "Zone A"] },
        { norme: "Norme RI 2.2", titre: "Zone A - Lausanne - 2 personnes", montant: 1350, type: "CHF/mois", zone: "A", personnes: 2, description: "Plafond de loyer pour 2 personnes à Lausanne et communes assimilées.", mots_cles: ["1350", "Lausanne", "2 personnes", "Zone A"] },
        { norme: "Norme RI 2.3", titre: "Zone A - Lausanne - 3 personnes", montant: 1550, type: "CHF/mois", zone: "A", personnes: 3, description: "Plafond de loyer pour 3 personnes à Lausanne et communes assimilées.", mots_cles: ["1550", "Lausanne", "3 personnes", "Zone A"] },
        { norme: "Norme RI 2.4", titre: "Zone A - Lausanne - 4 personnes", montant: 1700, type: "CHF/mois", zone: "A", personnes: 4, description: "Plafond de loyer pour 4 personnes à Lausanne et communes assimilées.", mots_cles: ["1700", "Lausanne", "4 personnes", "Zone A"] },
        { norme: "Norme RI 2.5", titre: "Zone A - Lausanne - 5+ personnes", montant: 1850, type: "CHF/mois", zone: "A", personnes: 5, description: "Plafond de loyer pour 5 personnes et plus à Lausanne.", mots_cles: ["1850", "Lausanne", "5+ personnes", "Zone A"] },
        { norme: "Norme RI 2.6", titre: "Zone B - Agglomération - 1 personne", montant: 1000, type: "CHF/mois", zone: "B", personnes: 1, description: "Plafond de loyer pour 1 personne dans l'agglomération (Morges, Nyon, Vevey, Montreux, Yverdon).", mots_cles: ["1000", "agglomération", "1 personne", "Zone B"] },
        { norme: "Norme RI 2.7", titre: "Zone B - Agglomération - 2 personnes", montant: 1250, type: "CHF/mois", zone: "B", personnes: 2, description: "Plafond de loyer pour 2 personnes dans l'agglomération.", mots_cles: ["1250", "agglomération", "2 personnes", "Zone B"] },
        { norme: "Norme RI 2.8", titre: "Zone B - Agglomération - 3 personnes", montant: 1450, type: "CHF/mois", zone: "B", personnes: 3, description: "Plafond de loyer pour 3 personnes dans l'agglomération.", mots_cles: ["1450", "agglomération", "3 personnes", "Zone B"] },
        { norme: "Norme RI 2.9", titre: "Zone B - Agglomération - 4 personnes", montant: 1600, type: "CHF/mois", zone: "B", personnes: 4, description: "Plafond de loyer pour 4 personnes dans l'agglomération.", mots_cles: ["1600", "agglomération", "4 personnes", "Zone B"] },
        { norme: "Norme RI 2.10", titre: "Zone B - Agglomération - 5+ personnes", montant: 1750, type: "CHF/mois", zone: "B", personnes: 5, description: "Plafond de loyer pour 5 personnes et plus dans l'agglomération.", mots_cles: ["1750", "agglomération", "5+ personnes", "Zone B"] },
        { norme: "Norme RI 2.11", titre: "Zone C - Autres régions - 1 personne", montant: 900, type: "CHF/mois", zone: "C", personnes: 1, description: "Plafond de loyer pour 1 personne dans les autres régions vaudoises.", mots_cles: ["900", "autres régions", "1 personne", "Zone C"] },
        { norme: "Norme RI 2.12", titre: "Zone C - Autres régions - 2 personnes", montant: 1150, type: "CHF/mois", zone: "C", personnes: 2, description: "Plafond de loyer pour 2 personnes dans les autres régions.", mots_cles: ["1150", "autres régions", "2 personnes", "Zone C"] },
        { norme: "Norme RI 2.13", titre: "Zone C - Autres régions - 3 personnes", montant: 1350, type: "CHF/mois", zone: "C", personnes: 3, description: "Plafond de loyer pour 3 personnes dans les autres régions.", mots_cles: ["1350", "autres régions", "3 personnes", "Zone C"] },
        { norme: "Norme RI 2.14", titre: "Zone C - Autres régions - 4 personnes", montant: 1500, type: "CHF/mois", zone: "C", personnes: 4, description: "Plafond de loyer pour 4 personnes dans les autres régions.", mots_cles: ["1500", "autres régions", "4 personnes", "Zone C"] },
        { norme: "Norme RI 2.15", titre: "Zone C - Autres régions - 5+ personnes", montant: 1650, type: "CHF/mois", zone: "C", personnes: 5, description: "Plafond de loyer pour 5 personnes et plus dans les autres régions.", mots_cles: ["1650", "autres régions", "5+ personnes", "Zone C"] },
      ],
      supplements: [
        { norme: "Norme RI 3.1", titre: "Supplément d'Intégration Sociale (SIS)", montant_max: 100, type: "CHF/mois", description: "Supplément accordé pour la participation active à des activités sociales, culturelles ou associatives. Encourage l'insertion sociale.", mots_cles: ["SIS", "100", "intégration sociale", "activités"] },
        { norme: "Norme RI 3.2", titre: "Supplément d'Intégration Professionnelle (SIP)", montant_max: 300, type: "CHF/mois", description: "Supplément accordé pour la participation à une mesure d'insertion professionnelle, un stage ou une formation.", mots_cles: ["SIP", "300", "intégration professionnelle", "mesure"] },
        { norme: "Norme RI 3.3", titre: "Cumul des suppléments", description: "Les suppléments SIS et SIP peuvent être cumulés, pour un maximum de 400 CHF/mois au total.", mots_cles: ["cumul", "400", "SIS", "SIP"] },
        { norme: "Norme RI 3.4", titre: "Conditions d'octroi SIS", description: "Le SIS est accordé sur décision de l'assistant social, pour une participation régulière et active à des activités d'insertion sociale.", type: "conditions", mots_cles: ["conditions", "participation", "régulière"] },
        { norme: "Norme RI 3.5", titre: "Conditions d'octroi SIP", description: "Le SIP est accordé pour la participation à une mesure formalisée dans le CISP: stage, formation, programme d'emploi temporaire.", type: "conditions", mots_cles: ["conditions", "CISP", "stage", "formation"] },
      ],
      franchise_revenu: [
        { norme: "Norme RI 4.1", titre: "Franchise sur salaire", taux: 0.25, montant_max: 400, type: "CHF/mois", description: "25% du salaire net est exonéré, jusqu'à un maximum de 400 CHF/mois. Cette franchise vise à encourager l'activité lucrative.", mots_cles: ["25%", "400", "franchise", "salaire", "travail"] },
        { norme: "Norme RI 4.2", titre: "Pas de franchise sur indemnités chômage", description: "Les indemnités de chômage sont prises en compte intégralement, sans franchise.", mots_cles: ["chômage", "pas de franchise", "intégral"] },
        { norme: "Norme RI 4.3", titre: "Pas de franchise sur rentes", description: "Les rentes AI, AVS et PC sont prises en compte intégralement comme revenus.", mots_cles: ["rentes", "AI", "AVS", "PC", "intégral"] },
        { norme: "Norme RI 4.4", titre: "Revenus occasionnels", description: "Les revenus occasionnels inférieurs à 100 CHF/mois ne sont pas pris en compte.", mots_cles: ["occasionnels", "100", "exonérés"] },
      ],
      prestations_circonstancielles: [
        { norme: "Norme RI 5.1", titre: "Frais dentaires urgents", montant_max: 1000, type: "CHF", frequence: "par événement", description: "Remboursement des frais dentaires urgents (extractions, douleurs aiguës) jusqu'à 1'000 CHF par événement.", mots_cles: ["dentaire", "1000", "urgent", "extraction"] },
        { norme: "Norme RI 5.2", titre: "Lunettes/lentilles", montant_max: 200, type: "CHF", frequence: "tous les 3 ans", description: "Remboursement des frais de lunettes ou de lentilles jusqu'à 200 CHF tous les 3 ans.", mots_cles: ["lunettes", "200", "3 ans", "optique"] },
        { norme: "Norme RI 5.3", titre: "Mobilier première installation", montant_max: 1500, type: "CHF", frequence: "unique", description: "Aide pour l'acquisition de mobilier de base lors d'une première installation, jusqu'à 1'500 CHF.", mots_cles: ["mobilier", "1500", "installation", "unique"] },
        { norme: "Norme RI 5.4", titre: "Frais de déménagement", montant_max: 500, type: "CHF", frequence: "par déménagement", description: "Remboursement des frais de déménagement justifiés jusqu'à 500 CHF.", mots_cles: ["déménagement", "500", "frais"] },
        { norme: "Norme RI 5.5", titre: "Vêtements professionnels", montant_max: 300, type: "CHF", frequence: "annuel", description: "Remboursement des frais de vêtements professionnels jusqu'à 300 CHF par année.", mots_cles: ["vêtements", "300", "professionnel", "annuel"] },
        { norme: "Norme RI 5.6", titre: "Frais de recherche d'emploi", montant_max: 50, type: "CHF", frequence: "mensuel", description: "Forfait de 50 CHF/mois pour couvrir les frais liés à la recherche d'emploi (déplacements, timbres, photocopies).", mots_cles: ["emploi", "50", "recherche", "mensuel"] },
        { norme: "Norme RI 5.7", titre: "Dépôt de garantie (caution)", montant_max: 3000, type: "CHF", frequence: "remboursable", description: "Avance pour le dépôt de garantie jusqu'à 3 mois de loyer. Cette avance est remboursable à la fin du bail.", mots_cles: ["caution", "garantie", "3 mois", "remboursable"] },
        { norme: "Norme RI 5.8", titre: "Frais de garde d'enfants", description: "Les frais de garde d'enfants sont pris en compte selon les tarifs subventionnés.", mots_cles: ["garde", "enfants", "subventionnés"] },
      ],
      sanctions: [
        { norme: "Norme RI 6.1", titre: "Avertissement", reduction: 0, duree: "sans", description: "Premier avertissement sans réduction de prestations pour un manquement mineur.", mots_cles: ["avertissement", "mineur", "sans réduction"] },
        { norme: "Norme RI 6.2", titre: "Réduction niveau 1", reduction: 0.15, duree: "1-3 mois", description: "Réduction de 15% du forfait d'entretien pour non-respect des obligations (durée: 1 à 3 mois).", mots_cles: ["15%", "réduction", "niveau 1"] },
        { norme: "Norme RI 6.3", titre: "Réduction niveau 2", reduction: 0.30, duree: "1-3 mois", description: "Réduction de 30% du forfait d'entretien pour non-respect répété des obligations.", mots_cles: ["30%", "réduction", "répété", "niveau 2"] },
        { norme: "Norme RI 6.4", titre: "Réduction niveau 3", reduction: 0.50, duree: "1-3 mois", description: "Réduction de 50% du forfait d'entretien pour manquement grave aux obligations.", mots_cles: ["50%", "réduction", "grave", "niveau 3"] },
        { norme: "Norme RI 6.5", titre: "Suspension", reduction: 1.00, duree: "variable", description: "Suspension totale des prestations en cas de refus de collaboration. Le loyer et la prime AM restent garantis.", mots_cles: ["suspension", "totale", "refus", "loyer garanti"] },
        { norme: "Norme RI 6.6", titre: "Procédure de sanction", description: "Avant toute sanction: 1) Entretien avec le bénéficiaire, 2) Possibilité de se déterminer par écrit, 3) Décision motivée, 4) Indication des voies de recours.", mots_cles: ["procédure", "entretien", "motivation", "recours"] },
        { norme: "Norme RI 6.7", titre: "Recours contre sanction", description: "La décision de sanction peut être contestée par recours au DSAS dans les 30 jours.", mots_cles: ["recours", "DSAS", "30 jours"] },
      ],
      calcul_budget: [
        { norme: "Norme RI 7.1", titre: "Formule de calcul du RI", description: "RI mensuel = (Besoins reconnus) - (Revenus déterminants). Le résultat ne peut être négatif.", mots_cles: ["formule", "calcul", "besoins", "revenus"] },
        { norme: "Norme RI 7.2", titre: "Besoins reconnus", description: "Besoins = Forfait entretien + Loyer effectif (max. plafond) + Prime AM de base + Frais médicaux non couverts + Frais de garde + SIS/SIP.", mots_cles: ["besoins", "forfait", "loyer", "AM", "SIS", "SIP"] },
        { norme: "Norme RI 7.3", titre: "Revenus déterminants", description: "Revenus = Salaire net - franchise 25% + Rentes AI/AVS/PC + Allocations familiales + Pension alimentaire + Autres revenus.", mots_cles: ["revenus", "salaire", "rentes", "allocations", "pension"] },
        { norme: "Norme RI 7.4", titre: "Exemple de calcul - Personne seule Lausanne", description: "Forfait (1'031) + Loyer (1'100) + Prime AM (450) = 2'581 CHF besoins. Si revenus = 0, RI = 2'581 CHF/mois.", mots_cles: ["exemple", "personne seule", "Lausanne", "2581"] },
        { norme: "Norme RI 7.5", titre: "Exemple de calcul - Famille 4 personnes", description: "Forfait (2'201) + Loyer (1'700) + Prime AM (1'200) = 5'101 CHF besoins. Si allocations = 800 CHF, RI = 4'301 CHF/mois.", mots_cles: ["exemple", "famille", "4 personnes", "5101"] },
      ],
    },

    // CISP - Contrat d'Insertion Sociale et Professionnelle
    cisp: [
      { article: "CISP 1", titre: "Obligatoire pour bénéficiaires aptes", description: "Le CISP est obligatoire pour tout bénéficiaire RI apte au travail ou à une mesure d'insertion.", mots_cles: ["obligatoire", "apte", "insertion"] },
      { article: "CISP 2", titre: "Objectif du CISP", description: "Le CISP vise à définir un projet d'insertion personnalisé avec des objectifs réalistes et mesurables.", mots_cles: ["projet", "personnalisé", "objectifs"] },
      { article: "CISP 3", titre: "Contenu du CISP", description: "Le CISP contient: 1) Analyse de la situation, 2) Objectifs à atteindre, 3) Mesures proposées, 4) Obligations réciproques, 5) Calendrier de suivi.", mots_cles: ["analyse", "objectifs", "mesures", "obligations"] },
      { article: "CISP 4", titre: "Signature du CISP", description: "Le CISP est signé par le bénéficiaire et l'assistant social. La signature vaut engagement réciproque.", mots_cles: ["signature", "engagement", "réciproque"] },
      { article: "CISP 5", titre: "Durée du CISP", description: "Le CISP est conclu pour 6 mois et renouvelable. Un bilan est effectué avant chaque renouvellement.", mots_cles: ["6 mois", "renouvelable", "bilan"] },
      { article: "CISP 6", titre: "Mesures d'insertion possibles", description: "Les mesures peuvent inclure: formation, stage, emploi temporaire, mesure de santé, activité sociale, bilan de compétences.", mots_cles: ["formation", "stage", "emploi", "santé", "compétences"] },
      { article: "CISP 7", titre: "Suivi du CISP", description: "L'assistant social effectue un suivi régulier (au minimum tous les 2 mois) pour évaluer l'avancement du projet.", mots_cles: ["suivi", "2 mois", "évaluation"] },
      { article: "CISP 8", titre: "Non-respect du CISP", description: "Le non-respect injustifié du CISP peut entraîner des sanctions (réduction ou suspension des prestations).", mots_cles: ["non-respect", "sanctions", "réduction"] },
    ],

    // Articulation avec autres prestations
    subsidiarite: [
      { article: "Subsidiarité 1", titre: "Principe de subsidiarité", description: "Le RI est une aide de dernier recours. Le bénéficiaire doit d'abord faire valoir tous ses droits auprès des autres assurances sociales.", mots_cles: ["dernier recours", "droits", "assurances"] },
      { article: "Subsidiarité 2", titre: "Priorité assurance-chômage", description: "Les personnes ayant droit au chômage doivent d'abord épuiser leurs droits avant de demander le RI.", mots_cles: ["chômage", "priorité", "épuisement"] },
      { article: "Subsidiarité 3", titre: "Priorité AI", description: "Les personnes présentant une atteinte à la santé doivent déposer une demande AI. Le RI peut verser des avances en attendant la décision.", mots_cles: ["AI", "demande", "avances"] },
      { article: "Subsidiarité 4", titre: "Priorité AVS/PC", description: "Les personnes ayant atteint l'âge de la retraite doivent faire valoir leurs droits AVS et PC.", mots_cles: ["AVS", "PC", "retraite"] },
      { article: "Subsidiarité 5", titre: "Priorité pension alimentaire", description: "Le bénéficiaire doit faire valoir ses droits à pension alimentaire. Le RI peut agir en subrogation.", mots_cles: ["pension", "alimentaire", "subrogation"] },
      { article: "Subsidiarité 6", titre: "Avances sur prestations", description: "Le CSR peut verser des avances sur les prestations AI, AVS, PC en attendant la décision. L'avance est remboursée lors du versement rétroactif.", mots_cles: ["avances", "remboursement", "rétroactif"] },
      { article: "Subsidiarité 7", titre: "Cession de créance", description: "Le bénéficiaire signe une cession de créance autorisant le remboursement automatique des avances.", mots_cles: ["cession", "créance", "automatique"] },
    ],

    // Institutions vaudoises
    institutions: [
      { institution: "CSR", nom_complet: "Centres Sociaux Régionaux", description: "Les CSR sont les guichets d'accès au RI. Ils instruisent les demandes, versent les prestations et accompagnent les bénéficiaires.", mots_cles: ["CSR", "demandes", "accompagnement"] },
      { institution: "DSAS", nom_complet: "Département de la santé et de l'action sociale", description: "Le DSAS est l'autorité de recours contre les décisions des CSR. Il supervise l'application de la LASV.", mots_cles: ["DSAS", "recours", "supervision"] },
      { institution: "SASH", nom_complet: "Service de l'action sociale et de l'hébergement", description: "Le SASH coordonne la politique d'action sociale du canton et élabore les directives d'application.", mots_cles: ["SASH", "coordination", "directives"] },
      { institution: "OCAI VD", nom_complet: "Office cantonal de l'assurance-invalidité Vaud", description: "L'OCAI Vaud traite les demandes AI pour les assurés domiciliés dans le canton. Adresse: Avenue de Longemalle 11, 1020 Renens.", mots_cles: ["OCAI", "AI", "Renens"] },
      { institution: "CCAVS", nom_complet: "Caisse cantonale vaudoise de compensation", description: "La CCAVS gère l'AVS, AI, APG, allocations familiales et PC. Adresse: Rue du Lac 37, 1815 Clarens.", mots_cles: ["CCAVS", "AVS", "Clarens"] },
      { institution: "Previva", nom_complet: "Caisse de pension Previva", description: "Previva gère la prévoyance professionnelle LPP. Adresse: Chemin de la Vignette 2, 1094 Paudex.", mots_cles: ["Previva", "LPP", "Paudex"] },
    ],
  },

  // =========================================================================
  // V. RÈGLEMENTS INTERNES ET NORMES PROFESSIONNELLES
  // =========================================================================

  reglements_internes: {
    copma: [
      { article: "Dir. COPMA 1", titre: "Principes directeurs", description: "Le curateur agit toujours dans l'intérêt de la personne protégée et respecte son autonomie.", type: "principe" },
      { article: "Dir. COPMA 2", titre: "Relation de confiance", description: "Le curateur établit une relation de confiance avec la personne protégée.", type: "relation" },
      { article: "Dir. COPMA 3", titre: "Communication", description: "Le curateur informe régulièrement la personne protégée de ses démarches.", type: "communication" },
    ],
    csias: [
      { article: "CSIAS A.1", titre: "Principes CSIAS", description: "Les normes CSIAS définissent les standards pour le calcul du minimum vital social en Suisse.", type: "principe", mots_cles: ["CSIAS", "minimum vital", "standards"] },
      { article: "CSIAS A.2", titre: "Application cantonale", description: "Chaque canton adapte les normes CSIAS à sa réalité locale. Le canton de Vaud applique les Normes RI.", type: "cantonal", mots_cles: ["cantonal", "adaptation", "Vaud"] },
      { article: "CSIAS A.3", titre: "Révision périodique", description: "Les normes CSIAS sont révisées périodiquement pour tenir compte de l'évolution du coût de la vie.", type: "révision", mots_cles: ["révision", "coût de la vie", "périodique"] },
    ],
  },

  // =========================================================================
  // VI. DROITS ET DEVOIRS DES PARTIES
  // =========================================================================

  droits_devoirs: {
    droits_beneficiaire: [
      { droit: "Droit à la dignité", base_legale: "Art. 7 Cst., Art. 5 LASV", description: "La personne bénéficiaire a droit au respect de sa dignité en toute circonstance." },
      { droit: "Droit au minimum vital", base_legale: "Art. 12 Cst., Art. 1 LASV", description: "Toute personne dans le besoin a droit au minimum vital." },
      { droit: "Droit d'être entendu", base_legale: "Art. 29 Cst., Art. 42 LPGA", description: "La personne a le droit d'être entendue avant toute décision la concernant." },
      { droit: "Droit d'accès au dossier", base_legale: "Art. 26 PA, Art. 25 LPD", description: "La personne a le droit de consulter son dossier." },
      { droit: "Droit de recours", base_legale: "Art. 29a Cst., Art. 56 LPGA", description: "La personne peut contester les décisions par voie de recours dans les 30 jours." },
      { droit: "Droit à l'information", base_legale: "Art. 27 LPGA, Art. 35 LASV", description: "La personne a le droit d'être informée de ses droits, obligations et voies de recours." },
      { droit: "Droit à l'accompagnement", base_legale: "Art. 3 LASV", description: "La personne a droit à un accompagnement personnalisé par un assistant social." },
    ],
    devoirs_beneficiaire: [
      { devoir: "Déclaration complète", base_legale: "Art. 28 LPGA, Art. 31 LASV", description: "Le bénéficiaire doit déclarer sa situation de manière complète et exacte." },
      { devoir: "Collaboration", base_legale: "Art. 28 LPGA, Art. 32 LASV", description: "Le bénéficiaire doit collaborer activement avec les services sociaux." },
      { devoir: "Signalement des changements", base_legale: "Art. 31 LASV", description: "Le bénéficiaire doit signaler tout changement de situation dans les plus brefs délais." },
      { devoir: "Recherche d'autonomie", base_legale: "Art. 33 LASV, Art. 11 LAI", description: "Le bénéficiaire doit entreprendre tout ce qui est raisonnablement exigible pour retrouver son autonomie." },
      { devoir: "Participation aux mesures", base_legale: "Art. 34 LASV, CISP", description: "Le bénéficiaire participe aux mesures d'insertion qui lui sont proposées." },
    ],
  },
};

// Fonction pour obtenir les articles pertinents par type de problème
function getRelevantArticles(problemType: string): any[] {
  const relevanceMap: Record<string, string[][]> = {
    'délai': [
      ['procedure_administrative', 'droits_parties'],
      ['constitution', 'garanties_procedures'],
      ['lpga', 'delais'],
    ],
    'invalidité': [
      ['assurance_invalidite', 'principes'],
      ['assurance_invalidite', 'mesures_readaptation'],
      ['assurance_invalidite', 'rentes'],
      ['assurance_invalidite', 'procedure'],
      ['lpga', 'definitions'],
    ],
    'rente_ai': [
      ['assurance_invalidite', 'rentes'],
      ['assurance_invalidite', 'procedure'],
      ['lpga', 'decisions_voies_droit'],
    ],
    'avs': [
      ['avs', 'rentes_vieillesse'],
      ['avs', 'cotisations'],
      ['avs', 'ccavs_vaud'],
    ],
    'retraite': [
      ['avs', 'rentes_vieillesse'],
      ['prevoyance_professionnelle', 'prestations'],
      ['prevoyance_professionnelle', 'previva'],
    ],
    'prestations_complementaires': [
      ['prestations_complementaires', 'conditions'],
      ['prestations_complementaires', 'calcul'],
      ['prestations_complementaires', 'frais_maladie'],
      ['prestations_complementaires', 'procedure'],
    ],
    'pc_calcul': [
      ['prestations_complementaires', 'calcul'],
    ],
    'lpp': [
      ['prevoyance_professionnelle', 'principes'],
      ['prevoyance_professionnelle', 'prestations'],
      ['prevoyance_professionnelle', 'libre_passage'],
    ],
    'previva': [
      ['prevoyance_professionnelle', 'previva'],
      ['prevoyance_professionnelle', 'prestations'],
    ],
    'revenu_insertion': [
      ['droit_vaudois', 'lasv'],
      ['droit_vaudois', 'rlasv'],
      ['droit_vaudois', 'normes_ri'],
      ['droit_vaudois', 'cisp'],
    ],
    'normes_ri': [
      ['droit_vaudois', 'normes_ri'],
    ],
    'minimum_vital': [
      ['droit_vaudois', 'normes_ri', 'forfaits_entretien'],
      ['droit_vaudois', 'normes_ri', 'plafonds_loyer'],
      ['constitution', 'droits_fondamentaux'],
    ],
    'sanction_ri': [
      ['droit_vaudois', 'normes_ri', 'sanctions'],
      ['droit_vaudois', 'lasv', 'sanctions'],
    ],
    'cisp': [
      ['droit_vaudois', 'cisp'],
      ['droit_vaudois', 'rlasv', 'cisp'],
    ],
    'contrat_insertion': [
      ['droit_vaudois', 'cisp'],
      ['droit_vaudois', 'rlasv', 'cisp'],
    ],
    'subsidiarite': [
      ['droit_vaudois', 'subsidiarite'],
      ['droit_vaudois', 'lasv', 'principes'],
    ],
    'remboursement': [
      ['droit_vaudois', 'lasv', 'remboursement'],
      ['prestations_complementaires', 'procedure'],
    ],
    'curatelle': [
      ['protection_adulte', 'types_curatelle'],
      ['protection_adulte', 'curateur_devoirs'],
      ['droit_vaudois', 'lvpae'],
    ],
    'recours': [
      ['protection_adulte', 'recours'],
      ['lpga', 'decisions_voies_droit'],
      ['procedure_administrative', 'droits_parties'],
    ],
    'droits_beneficiaire': [
      ['droits_devoirs', 'droits_beneficiaire'],
      ['constitution', 'droits_fondamentaux'],
    ],
    'chomage': [
      ['autres_assurances', 'laci'],
      ['droit_vaudois', 'subsidiarite'],
    ],
    'assurance_maladie': [
      ['autres_assurances', 'lamal'],
      ['prestations_complementaires', 'frais_maladie'],
    ],
    'allocations_familiales': [
      ['autres_assurances', 'laf'],
    ],
  };

  const paths = relevanceMap[problemType] || [];
  const articles: any[] = [];

  for (const path of paths) {
    let current: any = SWISS_LEGAL_BASE;
    for (const key of path) {
      if (current && current[key]) {
        current = current[key];
      }
    }
    if (Array.isArray(current)) {
      articles.push(...current);
    } else if (typeof current === 'object' && current !== null) {
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
          'délai', 'invalidité', 'rente_ai', 'avs', 'retraite',
          'prestations_complementaires', 'pc_calcul', 'lpp', 'previva',
          'revenu_insertion', 'normes_ri', 'minimum_vital', 'sanction_ri',
          'cisp', 'contrat_insertion', 'subsidiarite', 'remboursement',
          'curatelle', 'recours', 'droits_beneficiaire',
          'chomage', 'assurance_maladie', 'allocations_familiales'
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
        droit_federal_protection_adulte: {
          protection_adulte: "CC Art. 360-456 (Protection de l'adulte)",
        },
        droit_federal_assurances_sociales: {
          assurance_invalidite: "LAI - Loi fédérale sur l'assurance-invalidité (RS 831.20)",
          avs: "LAVS - Assurance vieillesse et survivants (RS 831.10)",
          prestations_complementaires: "LPC - Prestations complémentaires (RS 831.30)",
          prevoyance_professionnelle: "LPP - Prévoyance professionnelle (RS 831.40)",
          lpga: "LPGA - Partie générale des assurances sociales (RS 830.1)",
          lamal: "LAMal - Assurance-maladie",
          laf: "LAFam - Allocations familiales",
          laci: "LACI - Assurance-chômage",
        },
        droit_federal_autres: {
          protection_donnees: "LPD - Protection des données",
          constitution: "Cst. - Droits fondamentaux",
          procedure_administrative: "PA - Procédure administrative",
        },
        droit_cantonal_vaudois: {
          lvpae: "LVPAE - Protection adulte/enfant VD",
          lasv: "LASV - Loi sur l'action sociale vaudoise",
          rlasv: "RLASV - Règlement d'application",
          normes_ri: "Normes RI - Barèmes CSIAS adaptés Vaud",
          cisp: "CISP - Contrat d'insertion sociale et professionnelle",
        },
        institutions_vaudoises: {
          ocai: "OCAI Vaud - Office cantonal AI",
          ccavs: "CCAVS - Caisse cantonale AVS",
          previva: "Previva - Caisse de pension LPP Paudex",
          csr: "CSR - Centres sociaux régionaux",
        },
      },
      usage: {
        get_all: "Obtenir toute la base légale",
        get_relevant: "Obtenir les articles pertinents par type de problème",
        search: "Rechercher dans la base légale",
        get_problem_types: "Obtenir la liste des types de problèmes",
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in legal-reference-system:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
