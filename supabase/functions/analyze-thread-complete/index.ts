import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { validateAIOutput, createProofChainData, LegalArticle } from "../_shared/legal-validation.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// ===============================================================
// PROMPT MAÎTRE ULTRA-STRICT - BASES LÉGALES SUISSES EXHAUSTIVES
// ===============================================================
const MASTER_ANALYSIS_PROMPT = `Tu es un auditeur juridique ULTRA-RIGOUREUX spécialisé dans les dossiers de protection de l'adulte en Suisse.

🔒 RÈGLES ABSOLUES - VIOLATION = ÉCHEC DE L'ANALYSE 🔒

1. **CITATION OU SILENCE**
   - Chaque affirmation DOIT être accompagnée d'une citation EXACTE
   - Format OBLIGATOIRE: "FAIT: [citation exacte entre guillemets]" → ANALYSE: [interprétation]
   - ⛔ INTERDIT: Affirmer QUOI QUE CE SOIT sans citation source
   - Si tu n'as pas de citation → tu NE DIS RIEN sur ce sujet

2. **ZÉRO SUPPOSITION**
   - ❌ INTERDIT: "Il semble que...", "On peut supposer...", "Cela suggère...", "Probablement..."
   - ❌ INTERDIT: "Il est possible que...", "On pourrait penser..."
   - ✅ AUTORISÉ: "Le texte indique EXPLICITEMENT: '[citation]'"
   - ✅ AUTORISÉ: "Aucune information disponible sur ce point"

3. **PERSONNES = CITATIONS OBLIGATOIRES**
   - ❌ INTERDIT: "Dr. Martin a refusé le traitement"
   - ✅ AUTORISÉ: "Dans l'email du 15/01, il est écrit: 'Dr. Martin nous informe que le traitement ne sera pas administré.'"

4. **CHRONOLOGIE VÉRIFIABLE**
   - Chaque événement = date + source email
   - Format: [DATE] - [ÉVÉNEMENT] - Source: Email du [JJ/MM/AAAA] de [EXPÉDITEUR]

5. **NIVEAUX DE CERTITUDE (obligatoire pour chaque problème)**
   - "CERTAIN" = Citation directe explicite prouvant le fait
   - "PROBABLE" = Déduction logique de 2+ citations convergentes
   - "POSSIBLE" = Interprétation d'une seule citation - À VÉRIFIER

================================================================================
BASES LÉGALES SUISSES EXHAUSTIVES
================================================================================

═══════════════════════════════════════════════════════════════════════════════
DROIT FÉDÉRAL
═══════════════════════════════════════════════════════════════════════════════

▀▀▀ CONSTITUTION FÉDÉRALE (Cst. - RS 101) ▀▀▀

DROITS FONDAMENTAUX:
- Art. 7 Cst.: Dignité humaine
- Art. 8 Cst.: Égalité devant la loi
- Art. 9 Cst.: Protection contre l'arbitraire et bonne foi
- Art. 10 Cst.: Droit à la vie et à la liberté personnelle
- Art. 13 Cst.: Protection de la sphère privée

GARANTIES DE PROCÉDURE:
- Art. 29 Cst.: Garanties générales de procédure
- Art. 29 al. 1 Cst.: Décision dans un délai raisonnable
- Art. 29 al. 2 Cst.: Droit d'être entendu
- Art. 29a Cst.: Garantie de l'accès au juge
- Art. 30 Cst.: Garanties de procédure judiciaire
- Art. 36 Cst.: Restriction des droits (base légale, proportionnalité)

▀▀▀ CODE CIVIL SUISSE (CC - RS 210) ▀▀▀

PRINCIPES:
- Art. 2 CC: Bonne foi - Abus de droit non protégé
- Art. 27 CC: Protection de la personnalité
- Art. 28 CC: Atteintes illicites à la personnalité

PROTECTION DE L'ADULTE (Art. 360-456 CC):
- Art. 388 CC: But des mesures = BIEN-ÊTRE du pupille
- Art. 389 CC: SUBSIDIARITÉ et PROPORTIONNALITÉ
- Art. 390-391 CC: Conditions de la curatelle
- Art. 392 CC: Curatelle de REPRÉSENTATION
- Art. 393 CC: Curatelle de GESTION
- Art. 394 CC: Curatelle de COOPÉRATION - Assister avec consentement
- Art. 395 CC: Combinaison des curatelles
- Art. 396 CC: Curatelle de portée générale
- Art. 400-403 CC: Nomination du curateur
- Art. 404 CC: COLLABORATION avec la personne concernée
- Art. 405 CC: Information et consultation
- Art. 406 CC: DEVOIRS DU CURATEUR - respect de l'avis et volonté
- Art. 407 CC: Gestion patrimoniale diligente
- Art. 408-410 CC: Inventaire, comptes, rémunération
- Art. 411 CC: Rapports périodiques à l'autorité
- Art. 413 CC: Révocation du curateur
- Art. 415 CC: Surveillance par l'autorité
- Art. 416 CC: Actes requérant consentement de l'autorité
- Art. 417 CC: Conflits d'intérêts
- Art. 419 CC: DROIT D'ÊTRE ENTENDU du pupille
- Art. 440-449 CC: Autorité de protection
- Art. 450 CC: Recours (délai 30 jours)
- Art. 450a-e CC: Procédure de recours
- Art. 454-456 CC: Responsabilité

▀▀▀ CODE DES OBLIGATIONS (CO - RS 220) ▀▀▀

MANDAT:
- Art. 394 CO: Définition du mandat
- Art. 397 CO: Diligence et fidélité du mandataire
- Art. 398 CO: RESPONSABILITÉ pour exécution diligente
- Art. 400 CO: Obligation de rendre compte

RESPONSABILITÉ CIVILE:
- Art. 41 CO: Responsabilité pour faute
- Art. 49 CO: Tort moral

▀▀▀ LOI SUR LA PROCÉDURE ADMINISTRATIVE (PA - RS 172.021) ▀▀▀

- Art. 12 PA: Établissement des faits
- Art. 26 PA: Droit de consulter les pièces
- Art. 29 PA: Droit d'être entendu
- Art. 35 PA: Motivation des décisions (OBLIGATOIRE)
- Art. 46a PA: Déni de justice, retard injustifié
- Art. 48 PA: Qualité pour recourir

▀▀▀ LOI SUR LA PROTECTION DES DONNÉES (LPD - RS 235.1) ▀▀▀

- Art. 6 LPD: Principes (licéité, bonne foi, proportionnalité)
- Art. 25 LPD: Droit d'accès
- Art. 30 LPD: Communication à des tiers = CONSENTEMENT requis

▀▀▀ CODE PÉNAL SUISSE (CP - RS 311.0) ▀▀▀

- Art. 312 CP: Abus d'autorité
- Art. 314 CP: Gestion déloyale des intérêts publics
- Art. 320 CP: Violation du secret de fonction
- Art. 321 CP: Violation du secret professionnel

═══════════════════════════════════════════════════════════════════════════════
DROIT CANTONAL VAUDOIS
═══════════════════════════════════════════════════════════════════════════════

▀▀▀ LVPAE - Loi d'application protection adulte/enfant (BLV 211.255) ▀▀▀
- Art. 2 LVPAE: Autorité de protection (Juge de Paix)
- Art. 11 LVPAE: Audition de la personne concernée
- Art. 20 LVPAE: Surveillance des curateurs
- Art. 21 LVPAE: Rapports périodiques
- Art. 30-31 LVPAE: Recours (Chambre des curatelles)

▀▀▀ RAM - Règlement administration mandats (BLV 211.255.1) ▀▀▀
- Gestion du patrimoine, comptes, contrôle

▀▀▀ LSP - Loi santé publique (BLV 800.01) ▀▀▀
- Art. 21 LSP: Secret professionnel médical
- Art. 23-24 LSP: Dossier médical, accès

▀▀▀ LPA-VD - Procédure administrative vaudoise (BLV 173.36) ▀▀▀
- Consultation des pièces, droit d'être entendu, recours

═══════════════════════════════════════════════════════════════════════════════
NORMES PROFESSIONNELLES
═══════════════════════════════════════════════════════════════════════════════

▀▀▀ DIRECTIVES COPMA ▀▀▀
- Qualité des décisions, audition, surveillance des curateurs

▀▀▀ STANDARDS KOKES ▀▀▀
- Formation, nombre de mandats, supervision

▀▀▀ DÉONTOLOGIE DU CURATEUR ▀▀▀
- Diligence, loyauté, confidentialité, information, collaboration

================================================================================
VIOLATIONS À DÉTECTER
================================================================================

1. COLLABORATION CURATEUR-PUPILLE:
   - Décision unilatérale sans consultation
   - Exclusion du pupille des réunions
   - Non-transmission d'informations

2. CONSENTEMENT ET CONFIDENTIALITÉ:
   - Communication à tiers sans consentement
   - Violation du secret médical
   - Partage de données sensibles

3. DÉLAIS ET PROCÉDURES:
   - Retard injustifié (Art. 46a PA)
   - Déni de justice
   - Non-réponse aux demandes

4. DROITS PROCÉDURAUX:
   - Droit d'être entendu bafoué
   - Décision non motivée
   - Accès au dossier refusé

5. GESTION PATRIMONIALE:
   - Mauvaise gestion
   - Actes non autorisés (Art. 416 CC)
   - Absence de comptabilité

6. ABUS DE POUVOIR:
   - Dépassement du mandat
   - Conflit d'intérêts
   - Gestion déloyale

================================================================================
FORMAT JSON STRICT
================================================================================

{
  "analysis_metadata": {
    "date": "YYYY-MM-DD",
    "emails_analyzed": 0,
    "confidence_overall": "CERTAIN/PROBABLE/MIXTE"
  },
  "summary": "Résumé ULTRA-FACTUEL (max 300 mots) - UNIQUEMENT des faits cités",
  "participants": [
    {
      "name": "Nom EXACT tel qu'il apparaît",
      "role": "Rôle si EXPLICITEMENT mentionné, sinon 'Non spécifié'",
      "institution": "Institution si mentionnée",
      "first_mention": {
        "citation": "Citation exacte de la première apparition",
        "source": "Email du JJ/MM/AAAA de Expéditeur"
      },
      "consistency_score": 100,
      "contradictions_detected": []
    }
  ],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "Description factuelle de l'événement",
      "source": "Email du JJ/MM/AAAA de Expéditeur",
      "citation": "Citation EXACTE prouvant cet événement",
      "actors_involved": ["Liste des personnes impliquées"]
    }
  ],
  "issues": [
    {
      "type": "délai/refus/non-réponse/violation_droits/conflit_intérêt/abus/collaboration/confidentialité/gestion",
      "description": "Description FACTUELLE du problème",
      "severity": "critique/élevée/moyenne/faible",
      "confidence": "CERTAIN/PROBABLE/POSSIBLE",
      "citations": [
        {
          "text": "Citation EXACTE",
          "source": "Email du JJ/MM/AAAA de Expéditeur",
          "email_id": "ID si disponible"
        }
      ],
      "legal_violations": [
        {
          "article": "Art. XXX CC/PA/Cst./LPD",
          "law": "Nom complet de la loi",
          "description": "Description de la violation",
          "evidence": "Citation prouvant la violation"
        }
      ],
      "actors_responsible": ["Noms des personnes/institutions responsables"],
      "recommended_action": "Action recommandée"
    }
  ],
  "contradictions": [
    {
      "actor": "Nom de la personne",
      "statement_1": {
        "content": "Première affirmation",
        "source": "Email du JJ/MM/AAAA",
        "date": "YYYY-MM-DD"
      },
      "statement_2": {
        "content": "Affirmation contradictoire",
        "source": "Email du JJ/MM/AAAA",
        "date": "YYYY-MM-DD"
      },
      "analysis": "Nature de la contradiction",
      "severity": "critique/élevée/moyenne"
    }
  ],
  "hidden_communications": [
    {
      "type": "cc_suspect/référence_conversation/exclusion",
      "description": "Description du comportement",
      "evidence": "Citation prouvant ce comportement",
      "source": "Email du JJ/MM/AAAA",
      "actors_involved": ["Noms"]
    }
  ],
  "promises_tracking": [
    {
      "promise": "Ce qui a été promis",
      "promised_by": "Nom de la personne",
      "promise_date": "YYYY-MM-DD",
      "promise_source": "Email du JJ/MM/AAAA",
      "promise_citation": "Citation exacte de la promesse",
      "status": "tenue/brisée/en_attente",
      "resolution_evidence": "Citation prouvant si la promesse a été tenue ou non"
    }
  ],
  "unanswered_questions": [
    {
      "question": "Question restée sans réponse",
      "asked_by": "Qui a posé la question",
      "asked_date": "YYYY-MM-DD",
      "asked_source": "Email du JJ/MM/AAAA",
      "days_without_response": 0
    }
  ],
  "recommendations": [
    {
      "priority": "critique/haute/moyenne/faible",
      "action": "Action recommandée",
      "legal_basis": "Base légale justifiant cette action",
      "evidence": "Citations justifiant cette recommandation"
    }
  ]
}`;

interface Email {
  id: string;
  sender: string;
  recipient: string | null;
  subject: string;
  body: string;
  received_at: string;
}

interface ThreadAnalysis {
  analysis_metadata: any;
  summary: string;
  participants: any[];
  timeline: any[];
  issues: any[];
  contradictions: any[];
  hidden_communications: any[];
  promises_tracking: any[];
  unanswered_questions: any[];
  recommendations: any[];
}

async function analyzeThreadWithMasterPrompt(emails: Email[]): Promise<ThreadAnalysis | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  const sortedEmails = [...emails].sort((a, b) => 
    new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
  );

  const threadContent = sortedEmails.map((email, index) => {
    const date = new Date(email.received_at).toLocaleDateString('fr-CH');
    const fullDate = new Date(email.received_at).toISOString().split('T')[0];
    return `
=== EMAIL ${index + 1} [ID: ${email.id}] ===
Date: ${date} (${fullDate})
De: ${email.sender}
À: ${email.recipient || 'Non spécifié'}
Objet: ${email.subject}
---
${email.body}
===`;
  }).join('\n\n');

  const userPrompt = `Analyse ce thread email avec une RIGUEUR ABSOLUE.

RAPPELS CRITIQUES:
1. CHAQUE affirmation = citation EXACTE obligatoire
2. ZÉRO supposition - uniquement ce qui est EXPLICITE
3. Compare les affirmations de chaque personne entre les emails
4. Détecte les promesses et vérifie si elles ont été tenues
5. Identifie les questions restées sans réponse
6. Recherche les violations des bases légales suisses (CC, PA, Cst., LPD, LVPAE, etc.)

=== FOCUS SPÉCIAL: CONTRADICTIONS & PROMESSES NON TENUES ===

DÉTECTION DES CONTRADICTIONS:
- Compare CHAQUE affirmation d'un acteur avec ses affirmations précédentes
- Cherche les DATES qui changent (ex: "je vous enverrai lundi" puis "ce sera fait jeudi")
- Cherche les ENGAGEMENTS modifiés (ex: "je m'engage à..." puis "finalement nous ne pouvons pas...")
- Cherche les VERSIONS différentes d'un même événement
- Cherche les CHIFFRES/MONTANTS qui diffèrent
- Cherche les RESPONSABILITÉS qui changent (ex: "c'était ma responsabilité" puis "ce n'est pas de mon ressort")

SUIVI DES PROMESSES:
- Une promesse = tout engagement verbal ou écrit (ex: "je vous rappelle", "nous allons", "je m'engage", "ce sera fait")
- Vérifie dans les emails SUIVANTS si la promesse a été tenue
- Si pas de trace de réalisation = "en_attente" ou "brisée" selon le délai dépassé
- Note les excuses ou justifications données pour les promesses non tenues

THREAD À ANALYSER (${sortedEmails.length} emails):
${threadContent}

Réponds UNIQUEMENT en JSON valide selon le format spécifié.
CHAQUE problème identifié DOIT avoir au moins une citation exacte.
PRIORISE la détection des contradictions et promesses non tenues.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: MASTER_ANALYSIS_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content.substring(0, 500));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as ThreadAnalysis;
    
    // GUARDRAIL: Mark any analysis as needing validation
    if (parsed.analysis_metadata) {
      parsed.analysis_metadata.requires_validation = true;
      parsed.analysis_metadata.validation_status = 'pending';
    }
    
    return parsed;
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
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

    console.log(`User ${user.email} executing analyze-thread-complete`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { threadId, batchSize = 10, domains, keywords } = await req.json().catch(() => ({}));

    let threadsToAnalyze: string[] = [];

    if (threadId) {
      threadsToAnalyze = [threadId];
    } else {
      const { data: existingAnalyses } = await supabase
        .from('thread_analyses')
        .select('thread_id')
        .eq('user_id', user.id);
      
      const analyzedThreads = new Set(existingAnalyses?.map(a => a.thread_id) || []);

      // Fetch emails with sender/recipient for filtering
      const { data: emails } = await supabase
        .from('emails')
        .select('gmail_thread_id, sender, recipient, subject, body')
        .eq('user_id', user.id)
        .not('gmail_thread_id', 'is', null)
        .not('body', 'is', null)
        .not('body', 'eq', '');

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

      const uniqueThreads = [...new Set(filteredEmails.map(e => e.gmail_thread_id).filter(Boolean))];
      threadsToAnalyze = uniqueThreads.filter(t => !analyzedThreads.has(t!)).slice(0, batchSize) as string[];
    }

    console.log(`Analyzing ${threadsToAnalyze.length} threads with exhaustive Swiss legal bases`);

    const results = {
      analyzed: 0,
      issuesFound: 0,
      contradictionsFound: 0,
      promisesTracked: 0,
      legalViolationsFound: 0,
      errors: [] as string[],
    };

    for (const currentThreadId of threadsToAnalyze) {
      try {
        const { data: threadEmails, error: emailsError } = await supabase
          .from('emails')
          .select('id, sender, recipient, subject, body, received_at')
          .eq('user_id', user.id)
          .eq('gmail_thread_id', currentThreadId)
          .not('body', 'is', null)
          .not('body', 'eq', '')
          .order('received_at', { ascending: true });

        if (emailsError || !threadEmails || threadEmails.length === 0) {
          console.log(`No emails found for thread ${currentThreadId}`);
          continue;
        }

        console.log(`Analyzing thread ${currentThreadId} with ${threadEmails.length} emails`);

        const analysis = await analyzeThreadWithMasterPrompt(threadEmails);

        if (!analysis) {
          results.errors.push(`Failed to analyze thread ${currentThreadId}`);
          continue;
        }

        const severityScores: Record<string, number> = {
          'critique': 4,
          'élevée': 3,
          'moyenne': 2,
          'faible': 1,
        };

        const maxSeverity = (analysis.issues || []).reduce((max: string, issue: any) => {
          const score = severityScores[issue.severity] || 0;
          return score > (severityScores[max] || 0) ? issue.severity : max;
        }, 'faible');

        const certainIssues = (analysis.issues || []).filter((i: any) => i.confidence === 'CERTAIN').length;
        const avgConfidence = analysis.issues?.length > 0
          ? certainIssues / analysis.issues.length
          : 0;

        // Count legal violations
        const legalViolations = (analysis.issues || []).reduce((count: number, issue: any) => {
          return count + (issue.legal_violations?.length || 0);
        }, 0);

        // GUARDRAIL: Validate AI output against legal repository
        const { data: legalArticles } = await supabase
          .from('legal_articles')
          .select('*')
          .eq('is_current', true);

        let validationStatus = 'valid';
        let hallucinationDetected = false;
        
        if (legalArticles && legalArticles.length > 0) {
          const validation = await validateAIOutput(
            JSON.stringify(analysis),
            legalArticles as LegalArticle[],
            { requireLegalBasis: false, strictMode: false }
          );
          
          hallucinationDetected = validation.hallucinationDetected;
          if (hallucinationDetected) {
            validationStatus = 'requires_review';
            console.log(`Thread ${currentThreadId}: Hallucination detected, marking for review`);
          }
          
          // Record validation
          await supabase.from('ai_output_validations').insert({
            edge_function_name: 'analyze-thread-complete',
            input_hash: currentThreadId,
            output_hash: 'auto',
            raw_output: { analysis },
            validated_output: { analysis },
            legal_refs_claimed: validation.verifiedRefs.map(r => `${r.code} ${r.article}`),
            legal_refs_verified: validation.verifiedRefs.map(r => `${r.code} ${r.article}`),
            legal_refs_rejected: validation.rejectedRefs.map(r => `${r.code} ${r.article}`),
            hallucination_detected: hallucinationDetected,
            validation_status: validationStatus,
            model_used: 'google/gemini-2.5-flash',
            prompt_version: 'master-analysis-v1',
            validated_at: new Date().toISOString(),
            user_id: user.id,
          });
        }

        const { data: insertedAnalysis, error: insertError } = await supabase
          .from('thread_analyses')
          .insert({
            user_id: user.id,
            thread_id: currentThreadId,
            email_ids: threadEmails.map(e => e.id),
            chronological_summary: analysis.summary,
            detected_issues: analysis.issues,
            participants: analysis.participants,
            timeline: analysis.timeline,
            severity: maxSeverity,
            confidence_score: avgConfidence,
            citations: (analysis.issues || []).flatMap((i: any) => i.citations || []),
            model: 'google/gemini-2.5-flash',
            prompt_version: 'master-analysis-v1',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`Error storing analysis for thread ${currentThreadId}:`, insertError);
          results.errors.push(`Storage error for ${currentThreadId}`);
          continue;
        }
        
        // SEAL EVIDENCE: Create proof chain entry for audit trail
        if (insertedAnalysis) {
          const proofData = await createProofChainData(
            'thread_analysis',
            insertedAnalysis.id,
            analysis,
            { thread_id: currentThreadId, emails_count: threadEmails.length }
          );
          
          await supabase.from('proof_chain').insert({
            entity_type: 'thread_analysis',
            entity_id: insertedAnalysis.id,
            content_hash: proofData.content_hash,
            metadata_hash: proofData.metadata_hash,
            combined_hash: proofData.combined_hash,
            chain_position: 1,
            sealed_by: 'edge_function',
            seal_reason: 'creation',
            verification_status: 'valid',
            last_verified_at: new Date().toISOString(),
            user_id: user.id,
          });
        }

        results.analyzed++;
        results.issuesFound += (analysis.issues || []).length;
        results.contradictionsFound += (analysis.contradictions || []).length;
        results.promisesTracked += (analysis.promises_tracking || []).length;
        results.legalViolationsFound += legalViolations;

        console.log(`Thread ${currentThreadId} analyzed: ${analysis.issues?.length || 0} issues, ${legalViolations} legal violations, ${analysis.contradictions?.length || 0} contradictions`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing thread ${currentThreadId}:`, error);
        results.errors.push(`${currentThreadId}: ${error}`);
      }
    }

    console.log('Thread analysis with exhaustive Swiss legal bases completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Thread analysis error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
