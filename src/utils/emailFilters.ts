export type GmailFilters = {
  domains: string[];
  keywords: string[];
};

const normalize = (v: string) => v.trim().toLowerCase();

export function normalizeDomain(input: string): string {
  const d = normalize(input);
  // allow user to paste full email; keep only domain part
  const at = d.lastIndexOf("@");
  const domain = at >= 0 ? d.slice(at + 1) : d;
  return domain.replace(/^\.+|\.+$/g, "");
}

function emailHasDomain(email: { sender?: string | null; recipient?: string | null }, domain: string) {
  const d = normalizeDomain(domain);
  if (!d) return false;
  const s = normalize(email.sender || "");
  const r = normalize(email.recipient || "");
  return s.includes(`@${d}`) || s.endsWith(d) || r.includes(`@${d}`) || r.endsWith(d);
}

function emailHasKeyword(email: { subject?: string | null; body?: string | null }, keyword: string) {
  const k = normalize(keyword);
  if (!k) return false;
  const subject = normalize(email.subject || "");
  const body = normalize(email.body || "");
  return subject.includes(k) || body.includes(k);
}

export function isEmailRelevant(
  email: { sender?: string | null; recipient?: string | null; subject?: string | null; body?: string | null },
  filters: GmailFilters,
) {
  const domains = (filters.domains || []).map(normalizeDomain).filter(Boolean);
  const keywords = (filters.keywords || []).map(normalize).filter(Boolean);

  const hasDomains = domains.length > 0;
  const hasKeywords = keywords.length > 0;

  // No filters => treat everything as relevant (UI can warn)
  if (!hasDomains && !hasKeywords) return true;

  const domainMatch = hasDomains ? domains.some((d) => emailHasDomain(email, d)) : true;
  const keywordMatch = hasKeywords ? keywords.some((k) => emailHasKeyword(email, k)) : true;

  // If both are configured, require BOTH to reduce noise.
  return domainMatch && keywordMatch;
}

// =====================================================
// NEWSLETTER & SPAM AUTO-DETECTION PATTERNS
// =====================================================

/**
 * Known newsletter/spam domain patterns
 * These domains are commonly used for newsletters, marketing, transactional emails
 */
export const NEWSLETTER_DOMAIN_PATTERNS = [
  // Marketing & newsletters
  "newsletter", "news.", "mail1.", "mail2.", "mailchimp", "mailgun", "sendgrid",
  "campaignmonitor", "constantcontact", "hubspot", "marketo", "mailerlite",
  "getresponse", "aweber", "brevo", "sendinblue", "mailjet", "klaviyo",
  "drip.", "convertkit", "activecampaign", "autopilot", "intercom",
  "customerio", "customer.io", "sailthru", "iterable", "pardot", "emma.",
  
  // Promotions & marketing
  "promo.", "promotions.", "marketing.", "offers.", "deals.", "discount.",
  "sales.", "campaign.", "announce.", "updates.", "bulletin.",
  
  // E-commerce & retail
  "shop.", "store.", "order.", "tracking.", "shipment.", "delivery.",
  "package.", "receipt.", "invoice.", "billing.",
  
  // Social & community
  "digest.", "weekly.", "daily.", "monthly.", "summary.",
];

/**
 * Known spam/newsletter domains (full domain matches)
 */
export const KNOWN_SPAM_DOMAINS = [
  // Delivery services (transactional)
  "dpd.ch", "dpd.com", "post.ch", "laposte.fr", "ups.com", "fedex.com", "dhl.com",
  
  // E-commerce platforms
  "amazon.com", "amazon.fr", "amazon.de", "amazon.co.uk",
  "ebay.com", "ebay.fr", "aliexpress.com", "wish.com",
  "zalando.ch", "zalando.fr", "zalando.de",
  "asos.com", "hm.com", "zara.com",
  
  // Crypto & gambling
  "crypto.com", "binance.com", "coinbase.com", "kraken.com",
  "whale.io", "go.whale.io", "stake.com", "bet365.com",
  
  // Survey & rewards
  "toluna.com", "swagbucks.com", "surveyjunkie.com", "qmee.com",
  
  // Retail & shopping
  "stockx.com", "adidas.com", "nike.com", "underarmour.com",
  "footlocker.com", "jdsports.com",
  "apple.com", "microsoft.com", "google.com",
  
  // Social media notifications
  "linkedin.com", "facebookmail.com", "twitter.com", "x.com",
  "instagram.com", "tiktok.com", "pinterest.com",
  
  // Services & subscriptions
  "spotify.com", "netflix.com", "disney.com", "hulu.com",
  "dropbox.com", "box.com", "wetransfer.com",
  
  // Travel
  "booking.com", "airbnb.com", "expedia.com", "hotels.com",
  "kayak.com", "skyscanner.com", "tripadvisor.com",
  
  // Food & delivery
  "ubereats.com", "doordash.com", "grubhub.com", "deliveroo.com",
  "justeat.com", "thuisbezorgd.nl",
  
  // Generic newsletter domains
  "mailchimp.com", "sendgrid.net", "amazonses.com", "mailgun.org",
  "e.mail", "em.mail", "email.mail",
];

/**
 * Sender patterns that indicate newsletters/automated emails
 */
export const NEWSLETTER_SENDER_PATTERNS = [
  "no-reply@", "noreply@", "no_reply@",
  "newsletter@", "news@", "updates@", "info@",
  "notifications@", "notification@", "alert@", "alerts@",
  "marketing@", "promo@", "promotions@", "offers@",
  "support@", "help@", "contact@", "hello@",
  "team@", "service@", "customerservice@",
  "do-not-reply@", "donotreply@",
  "mailer-daemon@", "postmaster@",
  "bounce@", "bounces@",
  "digest@", "weekly@", "daily@", "monthly@",
  "system@", "automated@", "auto@",
];

/**
 * Subject patterns that indicate newsletters/spam
 */
export const NEWSLETTER_SUBJECT_PATTERNS = [
  "newsletter", "bulletin", "digest",
  "unsubscribe", "se désinscrire", "désabonnement",
  "weekly roundup", "weekly update", "monthly update",
  "your order", "votre commande", "order confirmation",
  "shipping confirmation", "expédition", "livraison",
  "tracking number", "numéro de suivi",
  "receipt for", "reçu de", "facture",
  "password reset", "réinitialisation",
  "verify your", "vérifiez votre", "confirm your",
  "welcome to", "bienvenue", "merci de vous être inscrit",
  "% off", "% de réduction", "offre spéciale", "special offer",
  "don't miss", "ne manquez pas", "dernière chance", "last chance",
  "limited time", "temps limité", "expire bientôt",
  "your daily", "votre quotidien", "your weekly", "your monthly",
];

/**
 * Check if email matches newsletter/spam patterns
 */
export function isNewsletterOrSpam(email: {
  sender?: string | null;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
}): { isSpam: boolean; reason: string; pattern?: string } {
  const sender = normalize(email.sender || "");
  const subject = normalize(email.subject || "");
  const body = normalize(email.body || "");
  
  // Extract domain from sender
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
  
  // Check body for unsubscribe links (strong indicator of newsletter)
  if (body.includes("unsubscribe") || body.includes("désinscrire") || body.includes("se désabonner")) {
    return { isSpam: true, reason: "unsubscribe_link", pattern: "unsubscribe" };
  }
  
  return { isSpam: false, reason: "not_detected" };
}

/**
 * Get spam detection reason in French
 */
export function getSpamReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    known_spam_domain: "Domaine spam connu",
    newsletter_domain_pattern: "Pattern de newsletter",
    newsletter_sender_pattern: "Expéditeur automatisé",
    newsletter_subject_pattern: "Sujet de newsletter",
    unsubscribe_link: "Lien de désabonnement",
    blacklisted_domain: "Domaine blacklisté",
    blacklisted_sender: "Expéditeur blacklisté",
    not_matching_filters: "Ne correspond pas aux filtres",
    not_detected: "Non détecté",
  };
  return labels[reason] || reason;
}
