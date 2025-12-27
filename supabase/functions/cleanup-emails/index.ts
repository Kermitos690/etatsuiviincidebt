import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ===== Email Relevance Filtering (copied from gmail-sync) =====
function normalize(v: string): string {
  return v.trim().toLowerCase();
}

function normalizeDomain(input: string): string {
  const d = normalize(input);
  const at = d.lastIndexOf("@");
  const domain = at >= 0 ? d.slice(at + 1) : d;
  return domain.replace(/^\.+|\.+$/g, "");
}

function emailHasDomain(
  email: { sender?: string | null; recipient?: string | null },
  domain: string
): boolean {
  const d = normalizeDomain(domain);
  if (!d) return false;
  const s = normalize(email.sender || "");
  const r = normalize(email.recipient || "");
  return s.includes(`@${d}`) || s.endsWith(d) || r.includes(`@${d}`) || r.endsWith(d);
}

function emailHasKeyword(
  email: { subject?: string | null; body?: string | null },
  keyword: string
): boolean {
  const k = normalize(keyword);
  if (!k) return false;
  const subject = normalize(email.subject || "");
  const body = normalize(email.body || "");
  return subject.includes(k) || body.includes(k);
}

interface EmailFilters {
  domains: string[];
  keywords: string[];
}

function isEmailRelevant(
  email: { sender?: string | null; recipient?: string | null; subject?: string | null; body?: string | null },
  filters: EmailFilters
): { relevant: boolean; reason: string; matchedDomain?: string; matchedKeyword?: string } {
  const domains = (filters.domains || []).map(normalizeDomain).filter(Boolean);
  const keywords = (filters.keywords || []).map(normalize).filter(Boolean);

  const hasDomains = domains.length > 0;
  const hasKeywords = keywords.length > 0;

  // No filters => treat everything as relevant
  if (!hasDomains && !hasKeywords) {
    return { relevant: true, reason: "no_filters_configured" };
  }

  // Check domain match
  let domainMatch = false;
  let matchedDomain: string | undefined;
  if (hasDomains) {
    for (const d of domains) {
      if (emailHasDomain(email, d)) {
        domainMatch = true;
        matchedDomain = d;
        break;
      }
    }
  } else {
    domainMatch = true;
  }

  // Check keyword match
  let keywordMatch = false;
  let matchedKeyword: string | undefined;
  if (hasKeywords) {
    for (const k of keywords) {
      if (emailHasKeyword(email, k)) {
        keywordMatch = true;
        matchedKeyword = k;
        break;
      }
    }
  } else {
    keywordMatch = true;
  }

  if (!domainMatch && !keywordMatch) {
    const senderDomain = normalizeDomain(email.sender || "");
    return { relevant: false, reason: `no_match (sender: ${senderDomain})` };
  }
  if (!domainMatch) {
    const senderDomain = normalizeDomain(email.sender || "");
    return { relevant: false, reason: `domain_mismatch (sender: ${senderDomain})` };
  }
  if (!keywordMatch) {
    return { relevant: false, reason: "keyword_mismatch" };
  }

  return { relevant: true, reason: "matched", matchedDomain, matchedKeyword };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error("[Auth] cleanup-emails unauthorized:", authError);
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body for options
    let dryRun = true; // Default to dry run for safety
    let deleteEmails = false;
    
    try {
      const body = await req.json();
      if (body.dryRun === false) dryRun = false;
      if (body.deleteEmails === true) deleteEmails = true;
    } catch {
      // Default options
    }

    console.log(`[Cleanup] Starting for user ${user.id} (dryRun: ${dryRun}, delete: ${deleteEmails})`);

    // Get user's gmail_config with filters
    const { data: config, error: configError } = await supabase
      .from("gmail_config")
      .select("domains, keywords")
      .eq("user_id", user.id)
      .maybeSingle();

    if (configError || !config) {
      // Fallback to email lookup
      const { data: configByEmail } = await supabase
        .from("gmail_config")
        .select("domains, keywords")
        .eq("user_email", user.email)
        .maybeSingle();
      
      if (!configByEmail) {
        return new Response(JSON.stringify({ 
          error: "Aucune configuration Gmail trouvée" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      Object.assign(config || {}, configByEmail);
    }

    const filters: EmailFilters = {
      domains: config?.domains || [],
      keywords: config?.keywords || [],
    };

    if (filters.domains.length === 0 && filters.keywords.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Aucun filtre configuré. Ajoutez des domaines ou mots-clés dans la configuration Gmail avant de nettoyer." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Cleanup] Filters: ${filters.domains.length} domains, ${filters.keywords.length} keywords`);
    console.log(`[Cleanup] Domains: ${filters.domains.join(', ')}`);
    console.log(`[Cleanup] Keywords: ${filters.keywords.join(', ')}`);

    // Fetch ALL user's emails
    const { data: emails, error: emailsError } = await supabase
      .from("emails")
      .select("id, sender, recipient, subject, body, received_at, gmail_message_id")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false });

    if (emailsError) {
      console.error("[Cleanup] Error fetching emails:", emailsError);
      throw new Error("Failed to fetch emails");
    }

    console.log(`[Cleanup] Found ${emails?.length || 0} total emails to check`);

    // Categorize emails
    const relevantEmails: any[] = [];
    const irrelevantEmails: any[] = [];
    const domainStats: Record<string, number> = {};

    for (const email of emails || []) {
      const result = isEmailRelevant(email, filters);
      
      // Track sender domain stats
      const senderDomain = normalizeDomain(email.sender || "");
      if (senderDomain) {
        domainStats[senderDomain] = (domainStats[senderDomain] || 0) + 1;
      }

      if (result.relevant) {
        relevantEmails.push({
          id: email.id,
          subject: email.subject?.substring(0, 80),
          sender: email.sender,
          matchedDomain: result.matchedDomain,
          matchedKeyword: result.matchedKeyword,
        });
      } else {
        irrelevantEmails.push({
          id: email.id,
          subject: email.subject?.substring(0, 80),
          sender: email.sender,
          gmail_message_id: email.gmail_message_id,
          reason: result.reason,
        });
      }
    }

    // Sort domain stats by count (descending)
    const sortedDomainStats = Object.entries(domainStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30); // Top 30 domains

    console.log(`[Cleanup] Results: ${relevantEmails.length} relevant, ${irrelevantEmails.length} irrelevant`);

    // Delete irrelevant emails if not dry run AND delete is enabled
    let deleted = 0;
    if (!dryRun && deleteEmails && irrelevantEmails.length > 0) {
      const idsToDelete = irrelevantEmails.map(e => e.id);
      
      // Delete in batches of 100
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const batch = idsToDelete.slice(i, i + 100);
        
        // First delete attachments
        const { error: attachError } = await supabase
          .from("email_attachments")
          .delete()
          .in("email_id", batch);
        
        if (attachError) {
          console.error(`[Cleanup] Error deleting attachments batch ${i}:`, attachError);
        }

        // Delete email facts
        const { error: factsError } = await supabase
          .from("email_facts")
          .delete()
          .in("email_id", batch);
        
        if (factsError) {
          console.error(`[Cleanup] Error deleting facts batch ${i}:`, factsError);
        }

        // Then delete emails
        const { error: deleteError } = await supabase
          .from("emails")
          .delete()
          .in("id", batch);

        if (deleteError) {
          console.error(`[Cleanup] Error deleting emails batch ${i}:`, deleteError);
        } else {
          deleted += batch.length;
        }
      }
      
      console.log(`[Cleanup] Deleted ${deleted} irrelevant emails`);
    }

    return new Response(JSON.stringify({
      status: dryRun ? "dry_run" : "completed",
      summary: {
        totalEmails: emails?.length || 0,
        relevantEmails: relevantEmails.length,
        irrelevantEmails: irrelevantEmails.length,
        deleted: deleted,
      },
      filters: {
        domains: filters.domains,
        keywords: filters.keywords,
      },
      // Show top irrelevant emails (limited)
      irrelevantSamples: irrelevantEmails.slice(0, 50),
      // Show domain distribution
      domainDistribution: sortedDomainStats,
      message: dryRun 
        ? `Mode aperçu: ${irrelevantEmails.length} emails hors périmètre identifiés sur ${emails?.length || 0} total. Relancez avec dryRun=false et deleteEmails=true pour supprimer.`
        : `${deleted} emails hors périmètre supprimés. ${relevantEmails.length} emails conservés.`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Cleanup] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
