// Seed minimal pour legal_references (idempotent via upsert)
// Ne pas importer depuis src/

const SEED_DATA = [
  {
    code_name: "LPD",
    article_number: "5",
    article_text: "Principe de licéité: le traitement des données doit être licite et conforme à la bonne foi.",
    domain: "données",
    keywords: ["lpd", "licéité", "données", "traitement"],
  },
  {
    code_name: "LPD",
    article_number: "6",
    article_text: "Exactitude des données: quiconque traite des données doit s'assurer qu'elles sont correctes.",
    domain: "données",
    keywords: ["lpd", "exactitude", "données"],
  },
  {
    code_name: "LPD",
    article_number: "7",
    article_text: "Sécurité des données: mesures techniques et organisationnelles appropriées contre perte, accès non autorisé.",
    domain: "données",
    keywords: ["lpd", "sécurité", "données", "protection"],
  },
  {
    code_name: "CC",
    article_number: "28",
    article_text: "Protection de la personnalité: celui qui subit une atteinte illicite à sa personnalité peut agir en justice.",
    domain: "civil",
    keywords: ["cc", "personnalité", "atteinte", "protection"],
  },
  {
    code_name: "CC",
    article_number: "389",
    article_text: "Curatelle: l'autorité de protection ordonne une mesure si l'appui est insuffisant.",
    domain: "tutelle",
    keywords: ["cc", "curatelle", "protection", "adulte"],
  },
  {
    code_name: "CC",
    article_number: "390",
    article_text: "Institution de curatelle: lorsqu'une personne majeure est empêchée d'assurer elle-même la sauvegarde de ses intérêts.",
    domain: "tutelle",
    keywords: ["cc", "curatelle", "majeur", "intérêts"],
  },
  {
    code_name: "CO",
    article_number: "41",
    article_text: "Responsabilité pour acte illicite: celui qui cause un dommage à autrui de manière illicite est tenu de le réparer.",
    domain: "obligations",
    keywords: ["co", "responsabilité", "dommage", "illicite"],
  },
  {
    code_name: "CO",
    article_number: "97",
    article_text: "Responsabilité contractuelle: le débiteur répond du dommage s'il ne prouve pas qu'aucune faute ne lui est imputable.",
    domain: "obligations",
    keywords: ["co", "contrat", "responsabilité", "faute"],
  },
  {
    code_name: "CPC",
    article_number: "52",
    article_text: "Bonne foi: les parties et tiers doivent se conformer aux règles de la bonne foi en procédure civile.",
    domain: "procédure",
    keywords: ["cpc", "bonne foi", "procédure", "parties"],
  },
  {
    code_name: "CPC",
    article_number: "229",
    article_text: "Faits et moyens de preuve nouveaux: admis aux débats principaux sous certaines conditions strictes.",
    domain: "procédure",
    keywords: ["cpc", "preuves", "débats", "nouveaux"],
  },
  {
    code_name: "CP",
    article_number: "143",
    article_text: "Soustraction de données: quiconque obtient sans droit des données informatiques est punissable.",
    domain: "pénal",
    keywords: ["cp", "données", "soustraction", "informatique"],
  },
  {
    code_name: "CP",
    article_number: "179novies",
    article_text: "Soustraction de données personnelles: obtention non autorisée de données personnelles sensibles.",
    domain: "pénal",
    keywords: ["cp", "données personnelles", "soustraction"],
  },
  {
    code_name: "Cst",
    article_number: "13",
    article_text: "Protection de la sphère privée: toute personne a droit au respect de sa vie privée et familiale.",
    domain: "constitutionnel",
    keywords: ["cst", "vie privée", "constitution", "protection"],
  },
  {
    code_name: "Cst",
    article_number: "29",
    article_text: "Garanties générales de procédure: droit d'être entendu, décision dans un délai raisonnable.",
    domain: "constitutionnel",
    keywords: ["cst", "procédure", "droit", "entendu"],
  },
  {
    code_name: "LAMal",
    article_number: "42",
    article_text: "Facturation des prestations: le fournisseur de prestations doit remettre une facture détaillée.",
    domain: "santé",
    keywords: ["lamal", "facturation", "prestations", "santé"],
  },
];

export type SeedResult = {
  seeded: boolean;
  inserted: number;
  reason: string;
  error?: string;
};

export async function seedLegalReferencesIfEmpty(supabase: any): Promise<SeedResult> {
  try {
    // Probe count exact
    const probe = await supabase
      .from("legal_references")
      .select("id", { count: "exact", head: true });

    if (probe.error) {
      return {
        seeded: false,
        inserted: 0,
        reason: "probe_error",
        error: probe.error.message,
      };
    }

    const count = probe.count ?? 0;

    if (count > 0) {
      return {
        seeded: false,
        inserted: 0,
        reason: "already_has_rows",
      };
    }

    // Upsert seed data (idempotent)
    const { data, error } = await supabase
      .from("legal_references")
      .upsert(SEED_DATA, { onConflict: "code_name,article_number" })
      .select("id");

    if (error) {
      return {
        seeded: false,
        inserted: 0,
        reason: "upsert_error",
        error: error.message,
      };
    }

    return {
      seeded: true,
      inserted: Array.isArray(data) ? data.length : 0,
      reason: "seeded_initial",
    };
  } catch (err: any) {
    return {
      seeded: false,
      inserted: 0,
      reason: "exception",
      error: err?.message || "unknown_error",
    };
  }
}
