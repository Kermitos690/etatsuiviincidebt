import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth } from "../_shared/auth.ts";
import { getCorsHeaders, corsHeaders, log } from "../_shared/core.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// =====================================================
// NEWSLETTER & SPAM AUTO-DETECTION PATTERNS
// =====================================================

const NEWSLETTER_DOMAIN_PATTERNS = [
  "newsletter", "news.", "mail1.", "mail2.", "mailchimp", "mailgun", "sendgrid",
  "campaignmonitor", "constantcontact", "hubspot", "marketo", "mailerlite",
  "getresponse", "aweber", "brevo", "sendinblue", "mailjet", "klaviyo",
  "drip.", "convertkit", "activecampaign", "autopilot", "intercom",
  "customerio", "customer.io", "sailthru", "iterable", "pardot", "emma.",
  "promo.", "promotions.", "marketing.", "offers.", "deals.", "discount.",
  "sales.", "campaign.", "announce.", "updates.", "bulletin.",
  "shop.", "store.", "order.", "tracking.", "shipment.", "delivery.",
  "package.", "receipt.", "invoice.", "billing.", "digest.", "weekly.", 
  "daily.", "monthly.", "summary.",
];

const KNOWN_SPAM_DOMAINS = [
  "dpd.ch", "dpd.com", "post.ch", "laposte.fr", "ups.com", "fedex.com", "dhl.com",
  "amazon.com", "amazon.fr", "amazon.de", "amazon.co.uk",
  "ebay.com", "ebay.fr", "aliexpress.com", "wish.com",
  "zalando.ch", "zalando.fr", "zalando.de", "asos.com", "hm.com", "zara.com",
  "crypto.com", "binance.com", "coinbase.com", "kraken.com",
  "whale.io", "go.whale.io", "stake.com", "bet365.com",
  "toluna.com", "swagbucks.com", "surveyjunkie.com", "qmee.com",
  "stockx.com", "adidas.com", "nike.com", "underarmour.com",
  "footlocker.com", "jdsports.com", "apple.com", "microsoft.com",
  "linkedin.com", "facebookmail.com", "twitter.com", "x.com",
  "instagram.com", "tiktok.com", "pinterest.com",
  "spotify.com", "netflix.com", "disney.com", "hulu.com",
  "dropbox.com", "box.com", "wetransfer.com",
  "booking.com", "airbnb.com", "expedia.com", "hotels.com",
  "kayak.com", "skyscanner.com", "tripadvisor.com",
  "ubereats.com", "doordash.com", "grubhub.com", "deliveroo.com",
  "justeat.com", "thuisbezorgd.nl",
  "mailchimp.com", "sendgrid.net", "amazonses.com", "mailgun.org",
];

const NEWSLETTER_SENDER_PATTERNS = [
  "no-reply@", "noreply@", "no_reply@",
  "newsletter@", "news@", "updates@", "info@",
  "notifications@", "notification@", "alert@", "alerts@",
  "marketing@", "promo@", "promotions@", "offers@",
  "do-not-reply@", "donotreply@",
  "mailer-daemon@", "postmaster@",
  "bounce@", "bounces@",
  "digest@", "weekly@", "daily@", "monthly@",
  "system@", "automated@", "auto@",
];

const NEWSLETTER_SUBJECT_PATTERNS = [
  "newsletter", "bulletin", "digest",
  "unsubscribe", "se désinscrire", "désabonnement",
  "weekly roundup", "weekly update", "monthly update",
  "your order", "votre commande", "order confirmation",
  "shipping confirmation", "expédition", "livraison",
  "tracking number", "numéro de suivi",
  "receipt for", "reçu de", "facture",
  "password reset", "réinitialisation",
  "verify your", "vérifiez votre", "confirm your",
  "welcome to", "bienvenue",
  "% off", "% de réduction", "offre spéciale", "special offer",
  "don't miss", "ne manquez pas", "dernière chance", "last chance",
  "limited time", "temps limité",
];

// ===== Helper Functions =====
function normalize(v: string): string {
  return v.trim().toLowerCase();
}

function normalizeDomain(input: string): string {
  const d = normalize(input);
  const at = d.lastIndexOf("@");
  const domain = at >= 0 ? d.slice(at + 1) : d;
  return domain.replace(/^\.+|\.+$/g, "").replace(/>.*$/, "");
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

interface BlacklistEntry {
  domain?: string | null;
  sender_email?: string | null;
}

// Check if email matches newsletter/spam patterns
function isNewsletterOrSpam(email: {
  sender?: string | null;
  subject?: string | null;
  body?: string | null;
}): { isSpam: boolean; reason: string; pattern?: string } {
  const sender = normalize(email.sender || "");
  const subject = normalize(email.subject || "");
  const body = normalize(email.body || "");
  const senderDomain = normalizeDomain(sender);
  
  // Check against known spam domains
  for (const domain of KNOWN_SPAM_DOMAINS) {
    if (senderDomain === domain || senderDomain.endsWith(`.${domain}`)) {
      return { isSpam: true, reason: "known_spam_domain", pattern: domain };
    }
  }
  
  // Check domain patterns
  for (const pattern of NEWSLETTER_DOMAIN_PATTERNS) {
    if (senderDomain.includes(pattern)) {
      return { isSpam: true, reason: "newsletter_domain_pattern", pattern };
    }
  }
  
  // Check sender patterns
  for (const pattern of NEWSLETTER_SENDER_PATTERNS) {
    if (sender.includes(pattern)) {
      return { isSpam: true, reason: "newsletter_sender_pattern", pattern };
    }
  }
  
  // Check subject patterns
  for (const pattern of NEWSLETTER_SUBJECT_PATTERNS) {
    if (subject.includes(pattern)) {
      return { isSpam: true, reason: "newsletter_subject_pattern", pattern };
    }
  }
  
  // Check body for unsubscribe links
  if (body.includes("unsubscribe") || body.includes("désinscrire") || body.includes("se désabonner")) {
    return { isSpam: true, reason: "unsubscribe_link", pattern: "unsubscribe" };
  }
  
  return { isSpam: false, reason: "not_detected" };
}

// Check if email is in blacklist
function isInBlacklist(
  email: { sender?: string | null },
  blacklist: BlacklistEntry[]
): { blacklisted: boolean; reason: string; match?: string } {
  const sender = normalize(email.sender || "");
  const senderDomain = normalizeDomain(sender);
  
  for (const entry of blacklist) {
    // Check domain match
    if (entry.domain) {
      const blacklistDomain = normalizeDomain(entry.domain);
      if (senderDomain === blacklistDomain || senderDomain.endsWith(`.${blacklistDomain}`)) {
        return { blacklisted: true, reason: "blacklisted_domain", match: entry.domain };
      }
    }
    
    // Check sender email match
    if (entry.sender_email) {
      const blacklistSender = normalize(entry.sender_email);
      if (sender.includes(blacklistSender)) {
        return { blacklisted: true, reason: "blacklisted_sender", match: entry.sender_email };
      }
    }
  }
  
  return { blacklisted: false, reason: "not_blacklisted" };
}

// Check if email matches user's configured filters (relevant = should keep)
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
  }

  // OR logic: relevant if domain OR keyword matches
  if (!hasDomains && !hasKeywords) {
    return { relevant: true, reason: "no_filters_configured" };
  }

  if (domainMatch || keywordMatch) {
    return { relevant: true, reason: "matched", matchedDomain, matchedKeyword };
  }

  const senderDomain = normalizeDomain(email.sender || "");
  return { relevant: false, reason: `no_match (sender: ${senderDomain})` };
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
    let dryRun = true;
    let deleteEmails = false;
    let hardReset = false; // New: include newsletter/spam auto-detection
    let purgeAll = false;  // New: delete ALL emails regardless
    let useBlacklist = true; // New: also check user's blacklist
    
    try {
      const body = await req.json();
      if (body.dryRun === false) dryRun = false;
      if (body.deleteEmails === true) deleteEmails = true;
      if (body.hardReset === true) hardReset = true;
      if (body.purgeAll === true) purgeAll = true;
      if (body.useBlacklist === false) useBlacklist = false;
    } catch {
      // Default options
    }

    console.log(`[Cleanup] Starting for user ${user.id}`);
    console.log(`[Cleanup] Options: dryRun=${dryRun}, delete=${deleteEmails}, hardReset=${hardReset}, purgeAll=${purgeAll}`);

    // Get user's gmail_config with filters
    let config: { domains: string[]; keywords: string[] } | null = null;
    const { data: configData } = await supabase
      .from("gmail_config")
      .select("domains, keywords")
      .eq("user_id", user.id)
      .maybeSingle();

    if (configData) {
      config = configData;
    } else {
      // Fallback to email lookup
      const { data: configByEmail } = await supabase
        .from("gmail_config")
        .select("domains, keywords")
        .eq("user_email", user.email)
        .maybeSingle();
      
      if (configByEmail) {
        config = configByEmail;
      }
    }

    const filters: EmailFilters = {
      domains: config?.domains || [],
      keywords: config?.keywords || [],
    };

    // Get user's blacklist
    let blacklist: BlacklistEntry[] = [];
    if (useBlacklist) {
      const { data: blacklistData } = await supabase
        .from("email_blacklist")
        .select("domain, sender_email")
        .eq("user_id", user.id);
      
      blacklist = blacklistData || [];
      console.log(`[Cleanup] Loaded ${blacklist.length} blacklist entries`);
    }

    // Check if we have any criteria for filtering
    const hasFilters = filters.domains.length > 0 || filters.keywords.length > 0;
    const hasBlacklist = blacklist.length > 0;
    
    if (!purgeAll && !hardReset && !hasFilters && !hasBlacklist) {
      return new Response(JSON.stringify({ 
        error: "Aucun critère de nettoyage. Configurez des filtres, une blacklist, ou utilisez le mode hardReset/purgeAll." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Cleanup] Filters: ${filters.domains.length} domains, ${filters.keywords.length} keywords`);

    // Fetch ALL user's emails
    const { data: emails, error: emailsError } = await supabase
      .from("emails")
      .select("id, sender, recipient, subject, body, received_at, gmail_message_id, incident_id")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false });

    if (emailsError) {
      console.error("[Cleanup] Error fetching emails:", emailsError);
      throw new Error("Failed to fetch emails");
    }

    console.log(`[Cleanup] Found ${emails?.length || 0} total emails to check`);

    // Get emails linked to incidents (protect these)
    const { data: linkedEmails } = await supabase
      .from("incidents")
      .select("email_source_id")
      .eq("user_id", user.id)
      .not("email_source_id", "is", null);
    
    const protectedEmailIds = new Set(
      (linkedEmails || []).map(i => i.email_source_id).filter(Boolean)
    );
    console.log(`[Cleanup] ${protectedEmailIds.size} emails linked to incidents (protected)`);

    // Categorize emails
    interface ClassifiedEmail {
      id: string;
      subject: string;
      sender: string;
      gmail_message_id?: string;
      reason: string;
      pattern?: string;
      protected?: boolean;
    }
    
    const toKeep: ClassifiedEmail[] = [];
    const toDelete: ClassifiedEmail[] = [];
    const protectedEmails: ClassifiedEmail[] = [];
    const domainStats: Record<string, number> = {};
    const deletionReasons: Record<string, number> = {};

    for (const email of emails || []) {
      const senderDomain = normalizeDomain(email.sender || "");
      if (senderDomain) {
        domainStats[senderDomain] = (domainStats[senderDomain] || 0) + 1;
      }

      const emailInfo: ClassifiedEmail = {
        id: email.id,
        subject: (email.subject || "(sans sujet)").substring(0, 100),
        sender: email.sender || "unknown",
        gmail_message_id: email.gmail_message_id,
        reason: "",
      };

      // Check if email is protected (linked to incident)
      if (protectedEmailIds.has(email.id) || email.incident_id) {
        emailInfo.reason = "linked_to_incident";
        emailInfo.protected = true;
        protectedEmails.push(emailInfo);
        toKeep.push(emailInfo);
        continue;
      }

      // Purge all mode: delete everything except protected
      if (purgeAll) {
        emailInfo.reason = "purge_all";
        toDelete.push(emailInfo);
        deletionReasons["purge_all"] = (deletionReasons["purge_all"] || 0) + 1;
        continue;
      }

      let shouldDelete = false;
      let deleteReason = "";
      let deletePattern: string | undefined;

      // Check blacklist first
      if (useBlacklist && blacklist.length > 0) {
        const blacklistResult = isInBlacklist(email, blacklist);
        if (blacklistResult.blacklisted) {
          shouldDelete = true;
          deleteReason = blacklistResult.reason;
          deletePattern = blacklistResult.match;
        }
      }

      // Check newsletter/spam patterns (hardReset mode)
      if (!shouldDelete && hardReset) {
        const spamResult = isNewsletterOrSpam(email);
        if (spamResult.isSpam) {
          shouldDelete = true;
          deleteReason = spamResult.reason;
          deletePattern = spamResult.pattern;
        }
      }

      // Check if email matches configured filters (if not already marked for deletion)
      if (!shouldDelete && hasFilters) {
        const relevanceResult = isEmailRelevant(email, filters);
        if (!relevanceResult.relevant) {
          shouldDelete = true;
          deleteReason = "not_matching_filters";
        }
      }

      if (shouldDelete) {
        emailInfo.reason = deleteReason;
        emailInfo.pattern = deletePattern;
        toDelete.push(emailInfo);
        deletionReasons[deleteReason] = (deletionReasons[deleteReason] || 0) + 1;
      } else {
        emailInfo.reason = "relevant";
        toKeep.push(emailInfo);
      }
    }

    // Sort domain stats
    const sortedDomainStats = Object.entries(domainStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30);

    console.log(`[Cleanup] Results: ${toKeep.length} to keep, ${toDelete.length} to delete, ${protectedEmails.length} protected`);

    // Delete emails if not dry run
    let deleted = 0;
    const deletedByDomain: Record<string, number> = {};
    
    if (!dryRun && deleteEmails && toDelete.length > 0) {
      const idsToDelete = toDelete.map(e => e.id);
      
      // Track domains being deleted
      for (const email of toDelete) {
        const domain = normalizeDomain(email.sender);
        deletedByDomain[domain] = (deletedByDomain[domain] || 0) + 1;
      }
      
      // Delete in batches of 100
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const batch = idsToDelete.slice(i, i + 100);
        
        // Delete attachments first
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

        // Delete email relations
        const { error: relationsError } = await supabase
          .from("email_relations")
          .delete()
          .or(`source_email_id.in.(${batch.join(',')}),target_email_id.in.(${batch.join(',')})`);
        
        if (relationsError) {
          console.error(`[Cleanup] Error deleting relations batch ${i}:`, relationsError);
        }

        // Delete emails
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
      
      console.log(`[Cleanup] Deleted ${deleted} emails`);
    }

    // Sort deleted by domain
    const sortedDeletedByDomain = Object.entries(deletedByDomain)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    return new Response(JSON.stringify({
      status: dryRun ? "dry_run" : "completed",
      mode: purgeAll ? "purge_all" : (hardReset ? "hard_reset" : "filter_based"),
      summary: {
        totalEmails: emails?.length || 0,
        toKeep: toKeep.length,
        toDelete: toDelete.length,
        protected: protectedEmails.length,
        deleted: deleted,
      },
      filters: {
        domains: filters.domains,
        keywords: filters.keywords,
        blacklistCount: blacklist.length,
      },
      deletionReasons,
      deleteSamples: toDelete.slice(0, 100),
      protectedEmails: protectedEmails.slice(0, 20),
      domainDistribution: sortedDomainStats,
      deletedByDomain: sortedDeletedByDomain,
      message: dryRun 
        ? `Mode aperçu: ${toDelete.length} emails à supprimer sur ${emails?.length || 0}. ${protectedEmails.length} emails protégés (liés à des incidents).`
        : `${deleted} emails supprimés. ${toKeep.length} emails conservés. ${protectedEmails.length} emails protégés.`
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
