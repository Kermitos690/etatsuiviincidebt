import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base légale suisse EXHAUSTIVE pour l'analyse des dossiers de protection de l'adulte
export const SWISS_LEGAL_BASE = {
  // Code civil - Protection de l'adulte (Art. 360-456 CC)
  protection_adulte: {
    mandat_inaptitude: [
      { article: "Art. 360 CC", titre: "Mandat pour cause d'inaptitude - Principe", description: "Toute personne ayant l'exercice des droits civils peut charger une personne physique ou morale de lui fournir une assistance personnelle, de gérer son patrimoine ou de la représenter dans les rapports juridiques avec les tiers au cas où elle deviendrait incapable de discernement." },
      { article: "Art. 361 CC", titre: "Constitution", description: "Le mandat pour cause d'inaptitude est constitué en la forme authentique ou par écrit." },
      { article: "Art. 362 CC", titre: "Révocation", description: "Le mandant peut révoquer le mandat en tout temps en respectant les formes." },
      { article: "Art. 363 CC", titre: "Acceptation, refus, démission", description: "Le mandataire peut en tout temps notifier au mandant son refus ou sa démission." },
      { article: "Art. 364 CC", titre: "Validation par l'autorité", description: "L'autorité valide le mandat et le met en œuvre." },
      { article: "Art. 365 CC", titre: "Intérêts du mandant", description: "Le mandataire agit dans l'intérêt du mandant et tient compte de ses opinions." },
      { article: "Art. 366 CC", titre: "Pouvoirs du mandataire", description: "Lorsqu'il n'y a pas de mandat pour cause d'inaptitude ou de représentation, l'autorité ordonne les mesures de protection." },
      { article: "Art. 367 CC", titre: "Reddition de comptes", description: "Le mandataire rend compte périodiquement de son activité." },
      { article: "Art. 368 CC", titre: "Représentation par le conjoint", description: "Les époux peuvent se représenter mutuellement." },
      { article: "Art. 369 CC", titre: "Incapacité passagère", description: "L'incapacité passagère ne fait pas cesser la capacité de représentation." },
    ],
    curatelle: [
      { article: "Art. 388 CC", titre: "But des mesures de curatelle", description: "Les mesures de curatelle assurent l'assistance, la représentation et la protection de la personne concernée tout en préservant le plus possible son autonomie." },
      { article: "Art. 389 CC", titre: "Subsidiarité et proportionnalité", description: "L'autorité ordonne une mesure si: 1. l'appui fourni par la famille ou les proches ne suffit pas; 2. l'assistance ou la représentation par un tiers n'est pas suffisante." },
      { article: "Art. 390 CC", titre: "Conditions de la curatelle", description: "L'autorité institue une curatelle si une personne majeure est partiellement ou totalement empêchée d'assurer elle-même la sauvegarde de ses intérêts." },
      { article: "Art. 391 CC", titre: "Champ des tâches", description: "L'autorité définit les tâches du curateur en fonction des besoins de la personne concernée." },
      { article: "Art. 392 CC", titre: "Curatelle provisoire", description: "L'autorité peut instituer une curatelle provisoire dans l'urgence avant même d'examiner la cause au fond." },
      { article: "Art. 393 CC", titre: "Curatelle d'accompagnement", description: "Une curatelle d'accompagnement est instituée, avec le consentement de la personne, lorsque celle-ci doit être assistée." },
      { article: "Art. 394 CC", titre: "Curatelle de représentation", description: "Une curatelle de représentation est instituée lorsque la personne ne peut pas accomplir certains actes et doit être représentée." },
      { article: "Art. 395 CC", titre: "Curatelle de coopération", description: "Une curatelle de coopération est instituée lorsque la personne doit être protégée par le consentement du curateur." },
      { article: "Art. 396 CC", titre: "Curatelle de portée générale", description: "L'autorité institue une curatelle de portée générale si la personne a besoin d'une aide permanente et étendue." },
      { article: "Art. 397 CC", titre: "Retrait de l'exercice des droits civils", description: "Le retrait de l'exercice des droits civils ne peut être ordonné que si une curatelle de portée générale est instituée." },
    ],
    curateur: [
      { article: "Art. 398 CC", titre: "Diligence du curateur", description: "Le curateur accomplit sa tâche avec diligence et dans l'intérêt de la personne concernée." },
      { article: "Art. 399 CC", titre: "Recours au juge", description: "Le curateur peut demander l'intervention de l'autorité lorsque la mesure ne peut être exécutée." },
      { article: "Art. 400 CC", titre: "Gestion du patrimoine", description: "Le curateur gère le patrimoine de la personne concernée avec soin et effectue les opérations nécessaires." },
      { article: "Art. 401 CC", titre: "Placement de fortune", description: "Le curateur place la fortune de manière appropriée et sûre." },
      { article: "Art. 402 CC", titre: "Prélèvements", description: "Le curateur peut prélever les montants nécessaires à l'accomplissement de sa tâche." },
      { article: "Art. 403 CC", titre: "Comptabilité", description: "Le curateur tient les comptes de sa gestion et les soumet à l'autorité." },
      { article: "Art. 404 CC", titre: "Collaboration avec la personne concernée", description: "Le curateur associe la personne concernée, dans la mesure du possible, à l'accomplissement de ses tâches et tient compte de son opinion." },
      { article: "Art. 405 CC", titre: "Droit d'être entendu", description: "La personne concernée peut s'adresser à l'autorité sur des questions concernant son assistance." },
      { article: "Art. 406 CC", titre: "Information et rapport", description: "Le curateur informe régulièrement la personne concernée et l'autorité de son activité." },
      { article: "Art. 407-408 CC", titre: "Actes nécessitant le consentement", description: "Certains actes requièrent le consentement de l'autorité ou de la personne concernée." },
      { article: "Art. 409 CC", titre: "Responsabilité du curateur", description: "Le curateur répond du dommage causé par faute dans l'accomplissement de sa tâche." },
      { article: "Art. 410 CC", titre: "Rémunération du curateur", description: "Le curateur a droit à une rémunération appropriée et au remboursement des frais." },
      { article: "Art. 411 CC", titre: "Rapport et comptes", description: "L'autorité examine le rapport et les comptes et prend les décisions nécessaires." },
      { article: "Art. 412 CC", titre: "Approbation du rapport", description: "L'autorité approuve le rapport et les comptes lorsqu'ils sont complets." },
      { article: "Art. 413 CC", titre: "Révocation du curateur", description: "L'autorité révoque le curateur si celui-ci ne remplit plus les conditions ou viole ses obligations." },
      { article: "Art. 414 CC", titre: "Avis des proches", description: "L'autorité tient compte de l'avis des proches avant de prendre une décision." },
      { article: "Art. 415 CC", titre: "Surveillance de l'autorité", description: "L'autorité surveille l'activité du curateur et prend les mesures nécessaires." },
      { article: "Art. 416 CC", titre: "Actes nécessitant le consentement de l'autorité", description: "Certains actes importants requièrent le consentement préalable de l'autorité." },
      { article: "Art. 417-418 CC", titre: "Conflits d'intérêts et représentation du pupille", description: "Le curateur ne peut pas agir en cas de conflit d'intérêts." },
      { article: "Art. 419 CC", titre: "Action en responsabilité", description: "La personne concernée peut exercer une action en responsabilité contre le curateur, l'autorité ou le canton." },
      { article: "Art. 420 CC", titre: "Responsabilité de l'État", description: "Le canton répond du dommage causé illicitement par les personnes agissant dans le cadre des mesures de protection." },
    ],
    autorite: [
      { article: "Art. 440 CC", titre: "Autorité de protection de l'adulte", description: "L'autorité de protection de l'adulte est une autorité interdisciplinaire composée de trois membres au moins." },
      { article: "Art. 441 CC", titre: "Compétence ratione loci", description: "L'autorité du lieu de domicile de la personne concernée est compétente." },
      { article: "Art. 442 CC", titre: "Compétence ratione materiae", description: "L'autorité est compétente pour les mesures de protection de l'adulte." },
      { article: "Art. 443 CC", titre: "Avis obligatoire", description: "Toute personne a le droit d'aviser l'autorité qu'une personne semble avoir besoin d'aide." },
      { article: "Art. 444 CC", titre: "Examen de la requête", description: "L'autorité examine la requête et prend les mesures provisionnelles nécessaires." },
      { article: "Art. 445 CC", titre: "Maxime d'office et collaboration", description: "L'autorité établit les faits d'office et ordonne les mesures d'instruction nécessaires." },
      { article: "Art. 446 CC", titre: "Procédure orale et écrite", description: "La procédure est orale ou écrite selon les circonstances." },
      { article: "Art. 447 CC", titre: "Audition de la personne concernée", description: "La personne concernée est entendue personnellement si cela est utile et si son état le permet." },
      { article: "Art. 448 CC", titre: "Obligation de collaborer", description: "La personne concernée et les tiers ont l'obligation de collaborer à l'établissement des faits." },
      { article: "Art. 449 CC", titre: "Expertise", description: "L'autorité peut ordonner une expertise." },
      { article: "Art. 449a CC", titre: "Restriction de la liberté de mouvement", description: "Toute restriction de la liberté de mouvement requiert une décision de l'autorité." },
    ],
    recours: [
      { article: "Art. 450 CC", titre: "Recours devant le juge", description: "Les décisions de l'autorité peuvent faire l'objet d'un recours devant le juge compétent." },
      { article: "Art. 450a CC", titre: "Objet du recours", description: "Le recours peut porter sur la violation du droit, la constatation inexacte des faits, l'inopportunité." },
      { article: "Art. 450b CC", titre: "Délai de recours", description: "Le délai de recours est de 30 jours pour les décisions, 10 jours pour les mesures provisionnelles." },
      { article: "Art. 450c CC", titre: "Effet suspensif", description: "Le recours a effet suspensif sauf décision contraire de l'autorité." },
      { article: "Art. 450d CC", titre: "Consultation du dossier", description: "L'instance de recours peut consulter le dossier de l'autorité." },
      { article: "Art. 450e CC", titre: "Renvoi à l'autorité", description: "L'instance de recours peut renvoyer la cause à l'autorité pour nouvelle décision." },
      { article: "Art. 450f CC", titre: "Dispositions complémentaires", description: "Les cantons complètent les règles de procédure." },
      { article: "Art. 451-456 CC", titre: "Dispositions finales", description: "Dispositions finales concernant les mesures de protection." },
    ],
  },

  // Loi fédérale sur la protection des données (LPD)
  protection_donnees: [
    { article: "Art. 1 LPD", titre: "But", description: "La LPD vise à protéger la personnalité et les droits fondamentaux des personnes physiques dont les données personnelles font l'objet d'un traitement." },
    { article: "Art. 6 LPD", titre: "Principes de traitement", description: "Le traitement doit être licite, conforme à la bonne foi, proportionné, reconnaissable et exact." },
    { article: "Art. 7 LPD", titre: "Sécurité des données", description: "Les données doivent être protégées contre tout traitement non autorisé par des mesures techniques et organisationnelles appropriées." },
    { article: "Art. 17 LPD", titre: "Traitement par des organismes privés", description: "Les données personnelles ne peuvent être traitées que pour les finalités indiquées lors de la collecte." },
    { article: "Art. 19 LPD", titre: "Communication de données", description: "Les données personnelles ne peuvent être communiquées que si une base légale le prévoit ou si la personne a consenti." },
    { article: "Art. 25 LPD", titre: "Droit d'accès", description: "Toute personne peut demander au responsable du traitement si des données la concernant sont traitées." },
    { article: "Art. 30 LPD", titre: "Prétentions", description: "La personne concernée peut exiger la rectification, la destruction ou le blocage des données." },
    { article: "Art. 32 LPD", titre: "Atteintes à la personnalité", description: "Celui qui traite des données en violation de la LPD porte atteinte à la personnalité de la personne concernée." },
  ],

  // Constitution fédérale (Cst.)
  constitution: [
    { article: "Art. 7 Cst.", titre: "Dignité humaine", description: "La dignité humaine doit être respectée et protégée." },
    { article: "Art. 8 Cst.", titre: "Égalité", description: "Tous les êtres humains sont égaux devant la loi. Nul ne doit subir de discrimination." },
    { article: "Art. 9 Cst.", titre: "Protection contre l'arbitraire et protection de la bonne foi", description: "Toute personne a le droit d'être traitée par les organes de l'État sans arbitraire et conformément à la bonne foi." },
    { article: "Art. 10 Cst.", titre: "Droit à la vie et liberté personnelle", description: "Tout être humain a droit à la vie et à la liberté personnelle, notamment à l'intégrité physique et psychique." },
    { article: "Art. 13 Cst.", titre: "Protection de la sphère privée", description: "Toute personne a droit au respect de sa vie privée et familiale, de son domicile et de sa correspondance." },
    { article: "Art. 29 Cst.", titre: "Garanties générales de procédure", description: "Toute personne a droit à ce que sa cause soit traitée équitablement et dans un délai raisonnable." },
    { article: "Art. 29a Cst.", titre: "Garantie de l'accès au juge", description: "Toute personne a droit à ce que sa cause soit jugée par une autorité judiciaire." },
    { article: "Art. 30 Cst.", titre: "Garanties de procédure judiciaire", description: "Toute personne a droit à être entendue par un tribunal établi par la loi, compétent, indépendant et impartial." },
  ],

  // Loi fédérale sur la procédure administrative (PA)
  procedure_administrative: [
    { article: "Art. 26 PA", titre: "Droit de consulter les pièces", description: "La partie a le droit de consulter les pièces de son dossier." },
    { article: "Art. 27 PA", titre: "Consultation refusée", description: "L'autorité ne peut refuser la consultation que si des intérêts publics ou privés importants l'exigent." },
    { article: "Art. 29 PA", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues avant qu'une décision ne soit prise." },
    { article: "Art. 32 PA", titre: "Preuves", description: "L'autorité apprécie librement les preuves." },
    { article: "Art. 35 PA", titre: "Motivation des décisions", description: "Les décisions doivent être motivées; elles indiquent les voies de recours." },
    { article: "Art. 46a PA", titre: "Déni de justice / retard injustifié", description: "Le recours est recevable si l'autorité tarde à rendre une décision sans motif valable." },
  ],

  // Code de procédure civile (CPC)
  cpc: [
    { article: "Art. 52 CPC", titre: "Bonne foi", description: "Quiconque participe à la procédure doit se comporter conformément aux règles de la bonne foi." },
    { article: "Art. 53 CPC", titre: "Droit d'être entendu", description: "Les parties ont le droit d'être entendues et de prendre connaissance du dossier." },
    { article: "Art. 56 CPC", titre: "Interpellation par le tribunal", description: "Le tribunal interpelle les parties lorsque leurs actes sont obscurs, incomplets ou contradictoires." },
    { article: "Art. 157 CPC", titre: "Libre appréciation des preuves", description: "Le tribunal apprécie librement les preuves." },
    { article: "Art. 160 CPC", titre: "Obligation de collaborer", description: "Les parties sont tenues de collaborer à l'administration des preuves." },
  ],

  // Code pénal (CP) - articles pertinents
  code_penal: [
    { article: "Art. 312 CP", titre: "Abus d'autorité", description: "Les membres d'une autorité et les fonctionnaires qui abusent de leur pouvoir sont punis." },
    { article: "Art. 314 CP", titre: "Gestion déloyale des intérêts publics", description: "Celui qui, dans l'exercice d'une fonction publique, cause un dommage aux intérêts publics." },
    { article: "Art. 321 CP", titre: "Violation du secret professionnel", description: "Les personnes tenues au secret professionnel qui le violent sont punies." },
    { article: "Art. 322ter CP", titre: "Corruption passive", description: "Celui qui, en qualité de membre d'une autorité, sollicite, se fait promettre ou accepte un avantage indu." },
  ],
};

// Fonction pour obtenir les articles pertinents par type de problème
function getRelevantArticles(problemType: string): any[] {
  const relevanceMap: Record<string, string[][]> = {
    'délai': [
      ['procedure_administrative'],
      ['constitution'],
      ['cpc'],
    ],
    'non-réponse': [
      ['procedure_administrative'],
      ['constitution'],
    ],
    'refus': [
      ['protection_adulte', 'recours'],
      ['procedure_administrative'],
      ['constitution'],
    ],
    'abus': [
      ['code_penal'],
      ['protection_adulte', 'curateur'],
      ['protection_adulte', 'autorite'],
    ],
    'conflit_intérêt': [
      ['protection_adulte', 'curateur'],
      ['code_penal'],
    ],
    'violation_données': [
      ['protection_donnees'],
      ['constitution'],
    ],
    'curatelle': [
      ['protection_adulte', 'curatelle'],
      ['protection_adulte', 'curateur'],
    ],
    'communication': [
      ['protection_adulte', 'curateur'],
      ['procedure_administrative'],
    ],
    'patrimoine': [
      ['protection_adulte', 'curateur'],
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
        } else if (typeof obj === 'object') {
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
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: return summary
    return new Response(JSON.stringify({
      success: true,
      summary: {
        protection_adulte: {
          sections: ['mandat_inaptitude', 'curatelle', 'curateur', 'autorite', 'recours'],
          total_articles: Object.values(SWISS_LEGAL_BASE.protection_adulte).flat().length,
        },
        protection_donnees: {
          total_articles: SWISS_LEGAL_BASE.protection_donnees.length,
        },
        constitution: {
          total_articles: SWISS_LEGAL_BASE.constitution.length,
        },
        procedure_administrative: {
          total_articles: SWISS_LEGAL_BASE.procedure_administrative.length,
        },
        cpc: {
          total_articles: SWISS_LEGAL_BASE.cpc.length,
        },
        code_penal: {
          total_articles: SWISS_LEGAL_BASE.code_penal.length,
        },
      },
      usage: {
        get_all: "Retourne toute la base légale",
        get_relevant: "Retourne les articles pertinents pour un type de problème (délai, non-réponse, refus, abus, conflit_intérêt, violation_données, curatelle, communication, patrimoine)",
        search: "Recherche dans la base légale",
      },
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
