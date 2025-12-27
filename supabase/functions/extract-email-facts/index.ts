import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

// Regex patterns for extraction
const EMAIL_PATTERN = /[\w.-]+@[\w.-]+\.\w+/gi;
const DATE_PATTERN = /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2})\b/g;
const INSTITUTION_KEYWORDS = [
  'tribunal', 'juge', 'avocat', 'maître', 'procureur', 'greffier',
  'ASE', 'CDAD', 'MJIE', 'PMI', 'AED', 'AEMO', 'JAF',
  'conseil départemental', 'protection', 'enfance', 'famille',
  'école', 'collège', 'lycée', 'académie', 'inspection',
  'police', 'gendarmerie', 'commissariat',
  'hôpital', 'clinique', 'médecin', 'docteur', 'dr.',
  'CAF', 'CPAM', 'sécurité sociale', 'allocations',
  'mairie', 'préfecture', 'sous-préfecture',
  'notaire', 'huissier', 'expert', 'psychologue', 'psychiatre'
];

interface ExtractedFacts {
  senderName: string | null;
  senderEmail: string | null;
  recipients: string[];
  ccRecipients: string[];
  mentionedPersons: string[];
  mentionedInstitutions: string[];
  mentionedDates: string[];
  keyPhrases: string[];
  actionItems: string[];
  sentiment: string;
  urgencyLevel: string;
  rawCitations: { text: string; context: string }[];
}

function extractPersonNames(text: string): string[] {
  const names: string[] = [];
  
  // Pattern for French formal names: M., Mme, Mr, Dr, Maître, etc.
  const titlePattern = /(?:M\.|Mme|Mr|Dr|Maître|Me|Pr|Professeur)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][a-zàâäéèêëïîôùûüÿç]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][a-zàâäéèêëïîôùûüÿç]+)?)/g;
  let match;
  while ((match = titlePattern.exec(text)) !== null) {
    names.push(match[0].trim());
  }
  
  // Pattern for names in all caps (often used in formal documents)
  const capsPattern = /\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]{2,}(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]{2,})?)\b/g;
  while ((match = capsPattern.exec(text)) !== null) {
    const name = match[1];
    // Filter out common words
    if (!['LE', 'LA', 'LES', 'UN', 'UNE', 'DES', 'DE', 'DU', 'AU', 'AUX', 'ET', 'OU', 'EN', 'PAR', 'POUR', 'AVEC', 'SANS', 'SUR', 'SOUS', 'DANS', 'OBJET', 'RE', 'FW', 'TR'].includes(name)) {
      names.push(name);
    }
  }
  
  return [...new Set(names)];
}

function extractInstitutions(text: string): string[] {
  const institutions: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of INSTITUTION_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      // Find the context around the keyword
      const pattern = new RegExp(`[^.]*${keyword}[^.]*\\.?`, 'gi');
      const matches = text.match(pattern);
      if (matches) {
        // Extract just the institution reference
        institutions.push(keyword);
      }
    }
  }
  
  return [...new Set(institutions)];
}

function extractKeyPhrases(text: string): string[] {
  const phrases: string[] = [];
  
  // Patterns for important phrases
  const importantPatterns = [
    /(?:je|nous)\s+(?:vous\s+)?(?:demande|demandons|exige|exigeons|sollicite|sollicitons)[^.!?]*/gi,
    /(?:urgent|urgence|immédiat|immédiatement|rapidement|délai|échéance)[^.!?]*/gi,
    /(?:violation|manquement|irrégularité|dysfonctionnement|problème|incident)[^.!?]*/gi,
    /(?:conformément|selon|en vertu de|article|loi|décret|code)[^.!?]*/gi,
    /(?:mise en demeure|rappel|relance|dernier délai)[^.!?]*/gi,
    /(?:sans réponse|sans suite|aucune réponse)[^.!?]*/gi,
  ];
  
  for (const pattern of importantPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      phrases.push(...matches.map(m => m.trim().slice(0, 200)));
    }
  }
  
  return [...new Set(phrases)].slice(0, 10);
}

function extractActionItems(text: string): string[] {
  const actions: string[] = [];
  
  const actionPatterns = [
    /(?:merci\s+de|prière\s+de|veuillez|vous\s+êtes\s+prié)[^.!?]*/gi,
    /(?:à\s+(?:transmettre|envoyer|faire|fournir|communiquer))[^.!?]*/gi,
    /(?:dans\s+un\s+délai\s+de|avant\s+le|au\s+plus\s+tard)[^.!?]*/gi,
  ];
  
  for (const pattern of actionPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      actions.push(...matches.map(m => m.trim().slice(0, 200)));
    }
  }
  
  return [...new Set(actions)].slice(0, 5);
}

function analyzeSentiment(text: string): string {
  const lowerText = text.toLowerCase();
  
  const negativeWords = ['problème', 'urgent', 'violation', 'manquement', 'plainte', 'réclamation', 'refus', 'rejet', 'impossible', 'échec', 'retard', 'absence', 'négligence', 'faute', 'erreur', 'insuffisant', 'inacceptable', 'inadmissible'];
  const positiveWords = ['merci', 'accord', 'accepté', 'favorable', 'satisfait', 'résolu', 'solution', 'succès', 'réussi', 'excellent', 'parfait', 'conforme'];
  
  let negativeCount = 0;
  let positiveCount = 0;
  
  for (const word of negativeWords) {
    if (lowerText.includes(word)) negativeCount++;
  }
  for (const word of positiveWords) {
    if (lowerText.includes(word)) positiveCount++;
  }
  
  if (negativeCount > positiveCount + 2) return 'negative';
  if (positiveCount > negativeCount + 2) return 'positive';
  if (negativeCount > 0 || positiveCount > 0) return 'mixed';
  return 'neutral';
}

function analyzeUrgency(text: string): string {
  const lowerText = text.toLowerCase();
  
  const highUrgencyWords = ['urgent', 'urgence', 'immédiat', 'immédiatement', 'extrême urgence', 'sans délai', 'critique', 'impératif'];
  const mediumUrgencyWords = ['rapidement', 'dès que possible', 'dans les meilleurs délais', 'prioritaire', 'important'];
  
  for (const word of highUrgencyWords) {
    if (lowerText.includes(word)) return 'high';
  }
  for (const word of mediumUrgencyWords) {
    if (lowerText.includes(word)) return 'medium';
  }
  
  return 'normal';
}

function extractCitations(text: string): { text: string; context: string }[] {
  const citations: { text: string; context: string }[] = [];
  
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Extract notable sentences
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    
    // Check if sentence contains important content
    const importantIndicators = [
      'affirme', 'déclare', 'confirme', 'indique', 'précise',
      'refuse', 'rejette', 'accepte', 'demande', 'exige',
      'constate', 'observe', 'note', 'remarque',
      'violation', 'manquement', 'problème', 'incident'
    ];
    
    const isImportant = importantIndicators.some(ind => trimmed.toLowerCase().includes(ind));
    
    if (isImportant && trimmed.length > 30 && trimmed.length < 500) {
      citations.push({
        text: trimmed,
        context: 'email_body'
      });
    }
  }
  
  return citations.slice(0, 20);
}

function extractFacts(email: { sender: string; recipient: string | null; subject: string; body: string }): ExtractedFacts {
  const fullText = `${email.subject}\n${email.body}`;
  
  // Extract sender info
  const senderEmails = email.sender.match(EMAIL_PATTERN);
  const senderEmail = senderEmails?.[0] || null;
  const senderName = email.sender.replace(/<[^>]+>/g, '').trim() || null;
  
  // Extract recipients
  const recipientEmails = email.recipient?.match(EMAIL_PATTERN) || [];
  
  // Extract CC from body (often included in forwarded emails)
  const ccPattern = /(?:Cc|CC|Copie)\s*:\s*([^\n]+)/gi;
  const ccMatches = fullText.match(ccPattern);
  const ccEmails = ccMatches?.flatMap(m => m.match(EMAIL_PATTERN) || []) || [];
  
  return {
    senderName,
    senderEmail,
    recipients: [...new Set(recipientEmails)],
    ccRecipients: [...new Set(ccEmails)],
    mentionedPersons: extractPersonNames(fullText),
    mentionedInstitutions: extractInstitutions(fullText),
    mentionedDates: [...new Set(fullText.match(DATE_PATTERN) || [])],
    keyPhrases: extractKeyPhrases(fullText),
    actionItems: extractActionItems(fullText),
    sentiment: analyzeSentiment(fullText),
    urgencyLevel: analyzeUrgency(fullText),
    rawCitations: extractCitations(email.body),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return unauthorizedResponse(authError || 'Non autorisé');
    }

    console.log(`User ${user.email} executing extract-email-facts`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 100, emailIds, domains, keywords } = await req.json().catch(() => ({}));

    // Get emails to process (scoped to current user)
    let query = supabase
      .from('emails')
      .select('id, sender, recipient, subject, body, gmail_thread_id')
      .eq('user_id', user.id)
      .not('body', 'is', null)
      .not('body', 'eq', '');

    if (emailIds && emailIds.length > 0) {
      query = query.in('id', emailIds);
    }

    const { data: emails, error: emailsError } = await query.limit(batchSize * 2);

    if (emailsError) throw emailsError;

    // Apply domain and keyword filters
    let filteredEmails = emails || [];

    if (domains && domains.length > 0) {
      filteredEmails = filteredEmails.filter(email => {
        const sender = email.sender?.toLowerCase() || '';
        const recipient = email.recipient?.toLowerCase() || '';
        return domains.some((d: string) => sender.includes(d.toLowerCase()) || recipient.includes(d.toLowerCase()));
      });
      console.log(`After domain filter (${domains.join(', ')}): ${filteredEmails.length} emails`);
    }

    if (keywords && keywords.length > 0) {
      filteredEmails = filteredEmails.filter(email => {
        const subject = email.subject?.toLowerCase() || '';
        const body = email.body?.toLowerCase() || '';
        return keywords.some((k: string) => subject.includes(k.toLowerCase()) || body.includes(k.toLowerCase()));
      });
      console.log(`After keyword filter (${keywords.join(', ')}): ${filteredEmails.length} emails`);
    }

    // Remove already processed emails (facts exist)
    const candidateIds = filteredEmails.map(e => e.id);
    const processedIds = new Set<string>();

    if (candidateIds.length > 0) {
      const { data: existingFacts, error: factsErr } = await supabase
        .from('email_facts')
        .select('email_id')
        .in('email_id', candidateIds);

      if (factsErr) throw factsErr;

      for (const f of existingFacts || []) {
        processedIds.add(f.email_id);
      }
    }

    filteredEmails = filteredEmails.filter(e => !processedIds.has(e.id));

    const emailsToProcess = filteredEmails.slice(0, batchSize);

    console.log(`Processing ${emailsToProcess.length} emails for fact extraction`);

    const results = {
      processed: 0,
      relationsCreated: 0,
      errors: [] as string[],
    };

    // Group emails by thread
    const threadGroups = new Map<string, typeof emailsToProcess>();
    for (const email of emailsToProcess) {
      const threadId = email.gmail_thread_id || email.id;
      if (!threadGroups.has(threadId)) {
        threadGroups.set(threadId, []);
      }
      threadGroups.get(threadId)!.push(email);
    }

    for (const email of emailsToProcess) {
      try {
        const facts = extractFacts(email);

        // Insert facts
        const { error: insertError } = await supabase
          .from('email_facts')
          .insert({
            email_id: email.id,
            sender_name: facts.senderName,
            sender_email: facts.senderEmail,
            recipients: facts.recipients,
            cc_recipients: facts.ccRecipients,
            mentioned_persons: facts.mentionedPersons,
            mentioned_institutions: facts.mentionedInstitutions,
            mentioned_dates: facts.mentionedDates,
            key_phrases: facts.keyPhrases,
            action_items: facts.actionItems,
            sentiment: facts.sentiment,
            urgency_level: facts.urgencyLevel,
            raw_citations: facts.rawCitations,
          });

        if (insertError) {
          console.error(`Error inserting facts for email ${email.id}:`, insertError);
          results.errors.push(`${email.subject}: ${insertError.message}`);
          continue;
        }

        results.processed++;

        // Create relations with other emails in the same thread
        if (email.gmail_thread_id) {
          const threadEmails = threadGroups.get(email.gmail_thread_id) || [];
          for (const otherEmail of threadEmails) {
            if (otherEmail.id !== email.id) {
              const { error: relationError } = await supabase
                .from('email_relations')
                .upsert({
                  source_email_id: email.id,
                  target_email_id: otherEmail.id,
                  relation_type: 'same_thread',
                  strength: 1.0,
                  evidence: { thread_id: email.gmail_thread_id },
                }, {
                  onConflict: 'source_email_id,target_email_id,relation_type',
                });

              if (!relationError) results.relationsCreated++;
            }
          }
        }

        // Create relations based on sender/recipient overlap
        const { data: relatedEmails } = await supabase
          .from('emails')
          .select('id')
          .or(`sender.ilike.%${facts.senderEmail}%,recipient.ilike.%${facts.senderEmail}%`)
          .neq('id', email.id)
          .limit(10);

        for (const related of relatedEmails || []) {
          const { error: relationError } = await supabase
            .from('email_relations')
            .upsert({
              source_email_id: email.id,
              target_email_id: related.id,
              relation_type: 'same_sender',
              strength: 0.7,
              evidence: { shared_email: facts.senderEmail },
            }, {
              onConflict: 'source_email_id,target_email_id,relation_type',
            });

          if (!relationError) results.relationsCreated++;
        }

      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        results.errors.push(`${email.subject}: ${error}`);
      }
    }

    console.log('Fact extraction completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fact extraction error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
