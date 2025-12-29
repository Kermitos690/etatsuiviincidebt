import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Quote, AlertTriangle, Calendar, FileText, Shield } from 'lucide-react';

interface ImportantPassage {
  text: string;
  type: 'violation' | 'deadline' | 'commitment' | 'threat' | 'evidence' | 'key_fact' | 'document_ref';
  startIndex: number;
  endIndex: number;
  reason?: string;
}

interface HighlightedEmailBodyProps {
  body: string;
  passages?: ImportantPassage[];
  aiAnalysis?: {
    summary?: string;
    keyPhrases?: string[];
    violations?: string[];
    deadlines?: string[];
    commitments?: string[];
  };
  className?: string;
  showPassageLabels?: boolean;
}

// Color mapping for passage types
const passageColors: Record<ImportantPassage['type'], { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  violation: { 
    bg: 'bg-destructive/20', 
    text: 'text-destructive', 
    border: 'border-destructive/30',
    icon: <AlertTriangle className="h-3 w-3" />
  },
  deadline: { 
    bg: 'bg-amber-500/20', 
    text: 'text-amber-600 dark:text-amber-400', 
    border: 'border-amber-500/30',
    icon: <Calendar className="h-3 w-3" />
  },
  commitment: { 
    bg: 'bg-blue-500/20', 
    text: 'text-blue-600 dark:text-blue-400', 
    border: 'border-blue-500/30',
    icon: <FileText className="h-3 w-3" />
  },
  threat: { 
    bg: 'bg-purple-500/20', 
    text: 'text-purple-600 dark:text-purple-400', 
    border: 'border-purple-500/30',
    icon: <AlertTriangle className="h-3 w-3" />
  },
  evidence: { 
    bg: 'bg-emerald-500/20', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    border: 'border-emerald-500/30',
    icon: <Quote className="h-3 w-3" />
  },
  key_fact: { 
    bg: 'bg-primary/20', 
    text: 'text-primary', 
    border: 'border-primary/30',
    icon: <Quote className="h-3 w-3" />
  },
  document_ref: { 
    bg: 'bg-cyan-500/20', 
    text: 'text-cyan-600 dark:text-cyan-400', 
    border: 'border-cyan-500/30',
    icon: <Shield className="h-3 w-3" />
  },
};

const passageLabels: Record<ImportantPassage['type'], string> = {
  violation: 'Violation',
  deadline: 'Délai',
  commitment: 'Engagement',
  threat: 'Menace',
  evidence: 'Preuve',
  key_fact: 'Fait clé',
  document_ref: 'Réf. document',
};

// ====== INTELLIGENT SIGNATURE FILTER ======
// Detects and filters out email signatures, greetings, and boilerplate content

const SIGNATURE_START_PATTERNS = [
  // French greetings/closings
  /^(meilleures?\s+)?salutations?\b/i,
  /^bien\s+(cordialement|à\s+vous)\b/i,
  /^(très\s+)?cordialement\b/i,
  /^respectueusement\b/i,
  /^sincères?\s+salutations?\b/i,
  /^avec\s+mes?\s+(meilleures?\s+)?salutations?\b/i,
  /^bonne\s+(journée|soirée|continuation)\b/i,
  /^au\s+plaisir\b/i,
  /^veuillez\s+agréer\b/i,
  /^je\s+vous\s+prie\s+(d'agréer|de\s+croire)\b/i,
  /^dans\s+l'attente\s+de\b/i,
  /^restant\s+à\s+votre\s+disposition\b/i,
  // German
  /^mit\s+freundlichen\s+grüßen\b/i,
  // English
  /^(best\s+)?regards\b/i,
  /^sincerely\b/i,
  /^kind\s+regards\b/i,
  /^best\s+wishes\b/i,
];

const BOILERPLATE_PATTERNS = [
  // Contact blocks
  /^(tél|tel|téléphone|phone|fax)\s*[:.]/i,
  /^(mobile|portable|natel)\s*[:.]/i,
  /^\+\d{2,3}\s*\d/,
  /^0\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/, // Swiss phone format
  // Address patterns
  /^(avenue|av\.|rue|route|chemin|boulevard|bd\.|place|case\s+postale|cp)\s+/i,
  /^\d{4,5}\s+[A-Z]/,  // Postal code + city
  // Job titles
  /^(directeur|directrice|responsable|chef|assistante?|secrétaire|gestionnaire|coordinat(eur|rice)|chargée?\s+de)\b/i,
  /^(service|département|division|secteur|unité)\b/i,
  // Institution names (when appearing as signature)
  /^(office|direction|tribunal|greffe|service\s+(social|juridique))\b/i,
  // Legal disclaimers
  /^(confidentiel|confidential|ce\s+message\s+est\s+confidentiel)\b/i,
  /^(ce\s+(courriel|e-?mail|message).*destiné\s+exclusivement)/i,
  /^(toute\s+utilisation|si\s+vous\s+n'êtes\s+pas\s+le\s+destinataire)/i,
  // Website/email in signature
  /^(www\.|http|site\s*web)/i,
  /^e-?mail\s*:/i,
];

function isSignatureOrBoilerplate(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  
  // Check signature start patterns
  for (const pattern of SIGNATURE_START_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Check boilerplate patterns
  for (const pattern of BOILERPLATE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Short lines with just a name pattern (likely signature)
  if (trimmed.length < 50 && /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][a-zàâäéèêëïîôùûüÿç]+(\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][a-zàâäéèêëïîôùûüÿç]+){0,2}$/.test(trimmed)) {
    return true;
  }
  
  // Lines that are just titles (M., Mme, etc.)
  if (/^(M\.|Mme|Mr|Dr|Maître|Me|Pr)\s+[A-Z]/i.test(trimmed) && trimmed.length < 60) {
    return true;
  }
  
  return false;
}

function getSignatureStartIndex(body: string): number {
  const lines = body.split('\n');
  let signatureStart = -1;
  let consecutiveBoilerplate = 0;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isSignatureOrBoilerplate(lines[i])) {
      consecutiveBoilerplate++;
      signatureStart = body.indexOf(lines[i]);
    } else if (lines[i].trim()) {
      // Found non-boilerplate content, check if we have enough signature lines
      if (consecutiveBoilerplate >= 2) {
        return signatureStart;
      }
      consecutiveBoilerplate = 0;
      signatureStart = -1;
    }
  }
  
  // If we found signature from the end
  if (consecutiveBoilerplate >= 2 && signatureStart > 0) {
    return signatureStart;
  }
  
  return -1;
}

function isProbativePassage(text: string): boolean {
  const trimmed = text.trim();
  
  // Reject if too short or too long
  if (trimmed.length < 15 || trimmed.length > 500) return false;
  
  // Reject signatures/greetings
  if (isSignatureOrBoilerplate(trimmed)) return false;
  
  // Reject generic phrases
  const genericPatterns = [
    /^bonjour\b/i,
    /^bonsoir\b/i,
    /^madame,?\s*monsieur\b/i,
    /^cher(e|s)?\s+(madame|monsieur|collègue)/i,
    /^je\s+vous\s+(remercie|prie)/i,
    /^merci\s+(de\s+votre|pour\s+votre)\s+(message|mail|courrier|réponse)/i,
    /^suite\s+à\s+votre\s+(mail|courrier|message|appel)\b/i,
    /^comme\s+convenu\b/i,
    /^veuillez\s+trouver\s+ci-joint/i,
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(trimmed)) return false;
  }
  
  // Must contain actionable/factual content
  const probativeIndicators = [
    // Actions taken or to take
    /\b(a|ont|avons|avez)\s+(refusé|accepté|transmis|envoyé|reçu|confirmé|décidé|ordonné)/i,
    /\b(refuse|rejette|accepte|confirme|constate|ordonne|demande|exige)\b/i,
    // Dates and deadlines
    /\b(délai|échéance|avant\s+le|jusqu'au|au\s+plus\s+tard)\b/i,
    /\b\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}\b/,
    // Document references
    /\b(lettre|courrier|décision|jugement|ordonnance|rapport)\s+(du|de\s+la|n°)/i,
    /\b(tribunal|juge|cour|chambre)\b/i,
    /\b(article|art\.)\s*\d+/i,
    // Factual observations
    /\b(violation|manquement|irrégularité|dysfonctionnement|retard|absence|défaut)\b/i,
    /\b(constaté|observé|noté|relevé|signalé)\b/i,
    // Commitments and promises
    /\b(je\s+m'engage|nous\s+nous\s+engageons|promis|garanti)\b/i,
    /\b(sera|seront|ferai|ferons)\s+(transmis|envoyé|fait|effectué)/i,
    // Consequences
    /\b(à\s+défaut|sinon|faute\s+de|sous\s+peine)\b/i,
  ];
  
  for (const pattern of probativeIndicators) {
    if (pattern.test(trimmed)) return true;
  }
  
  return false;
}

// Extract important passages from email body using AI analysis
export function extractPassagesFromAnalysis(
  body: string,
  aiAnalysis?: {
    summary?: string;
    keyPhrases?: string[];
    violations?: string[];
    deadlines?: string[];
    commitments?: string[];
    threats?: string[];
  }
): ImportantPassage[] {
  const passages: ImportantPassage[] = [];
  const bodyLower = body.toLowerCase();
  
  // Get signature boundary to exclude
  const signatureStart = getSignatureStartIndex(body);
  const effectiveBody = signatureStart > 0 ? body.slice(0, signatureStart) : body;
  const effectiveBodyLower = effectiveBody.toLowerCase();

  // Helper to find text in body (excluding signature)
  const findTextPosition = (searchText: string): { start: number; end: number } | null => {
    const searchLower = searchText.toLowerCase();
    const index = effectiveBodyLower.indexOf(searchLower);
    if (index !== -1) {
      const matchedText = effectiveBody.slice(index, index + searchText.length);
      // Validate the matched text is probative
      if (isProbativePassage(matchedText)) {
        return { start: index, end: index + searchText.length };
      }
    }
    // Try partial match (first 50 chars)
    const partial = searchLower.slice(0, 50);
    const partialIndex = effectiveBodyLower.indexOf(partial);
    if (partialIndex !== -1) {
      // Find the sentence end
      const endIndex = effectiveBody.indexOf('.', partialIndex + partial.length);
      const endPos = endIndex !== -1 ? endIndex + 1 : partialIndex + searchText.length;
      const matchedText = effectiveBody.slice(partialIndex, endPos);
      if (isProbativePassage(matchedText)) {
        return { start: partialIndex, end: endPos };
      }
    }
    return null;
  };

  // Extract from key phrases (with probative validation)
  if (aiAnalysis?.keyPhrases) {
    aiAnalysis.keyPhrases.forEach(phrase => {
      if (!isProbativePassage(phrase)) return;
      const pos = findTextPosition(phrase);
      if (pos) {
        passages.push({
          text: effectiveBody.slice(pos.start, pos.end),
          type: 'key_fact',
          startIndex: pos.start,
          endIndex: pos.end,
          reason: 'Fait clé probant'
        });
      }
    });
  }

  // Extract violations
  if (aiAnalysis?.violations) {
    aiAnalysis.violations.forEach(violation => {
      if (!isProbativePassage(violation)) return;
      const pos = findTextPosition(violation);
      if (pos) {
        passages.push({
          text: effectiveBody.slice(pos.start, pos.end),
          type: 'violation',
          startIndex: pos.start,
          endIndex: pos.end,
          reason: 'Violation constatée'
        });
      }
    });
  }

  // Extract document references (lettre TC, décision TC, jugement, etc.)
  const documentRefPatterns = [
    /\b(lettre|courrier)\s+(du\s+)?(tribunal|TC|juge|greffier)[^.!?]*/gi,
    /\b(décision|jugement|ordonnance|arrêt)\s+(du\s+)?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}|tribunal|TC)[^.!?]*/gi,
    /\b(pièce\s+n°?\s*\d+|annexe\s+\d+)[^.!?]*/gi,
    /\b(rapport|expertise|évaluation)\s+(du|de\s+la)\s+[^.!?]*/gi,
  ];

  documentRefPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(effectiveBody)) !== null) {
      const matchText = match[0].trim();
      if (matchText.length > 10 && !passages.some(p => p.startIndex === match.index)) {
        passages.push({
          text: matchText,
          type: 'document_ref',
          startIndex: match.index,
          endIndex: match.index + matchText.length,
          reason: 'Référence documentaire'
        });
      }
    }
  });

  // Extract deadlines - look for date patterns with context
  const deadlinePatterns = [
    /\b(délai|échéance)[^.!?]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})[^.!?]*/gi,
    /\b(avant\s+le|jusqu'au|au\s+plus\s+tard\s+le)\s+\d{1,2}[^.!?]*/gi,
    /\b\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4}[^.!?]*/gi,
  ];

  deadlinePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(effectiveBody)) !== null) {
      const matchText = match[0].trim();
      if (matchText.length > 10 && isProbativePassage(matchText) && !passages.some(p => p.startIndex === match.index)) {
        passages.push({
          text: matchText,
          type: 'deadline',
          startIndex: match.index,
          endIndex: match.index + matchText.length,
          reason: 'Délai ou échéance'
        });
      }
    }
  });

  // Look for commitment patterns
  const commitmentPatterns = [
    /\bje\s+m'engage\s+à[^.!?]*\./gi,
    /\bnous\s+nous\s+engageons\s+à[^.!?]*\./gi,
    /\bnous\s+(vous\s+)?confirmons[^.!?]*\./gi,
    /\b(sera|seront)\s+(transmis|envoyé|communiqué)[^.!?]*\./gi,
  ];

  commitmentPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(effectiveBody)) !== null) {
      const matchText = match[0].trim();
      if (isProbativePassage(matchText) && !passages.some(p => p.startIndex === match.index)) {
        passages.push({
          text: matchText,
          type: 'commitment',
          startIndex: match.index,
          endIndex: match.index + matchText.length,
          reason: 'Engagement formel'
        });
      }
    }
  });

  // Look for threat/warning patterns
  const threatPatterns = [
    /\bà\s+défaut[^.!?]*\./gi,
    /\bsans\s+réponse\s+de\s+votre\s+part[^.!?]*\./gi,
    /\bsous\s+peine\s+de[^.!?]*\./gi,
    /\bfaute\s+de\s+quoi[^.!?]*\./gi,
    /\bje\s+me\s+verrai\s+(dans\s+l'obligation|contraint)[^.!?]*\./gi,
    /\bnous\s+nous\s+réservons\s+le\s+droit[^.!?]*\./gi,
  ];

  threatPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(effectiveBody)) !== null) {
      const matchText = match[0].trim();
      if (!passages.some(p => p.startIndex === match.index)) {
        passages.push({
          text: matchText,
          type: 'threat',
          startIndex: match.index,
          endIndex: match.index + matchText.length,
          reason: 'Mise en garde ou conséquence'
        });
      }
    }
  });

  // Sort by position and remove overlaps
  passages.sort((a, b) => a.startIndex - b.startIndex);
  
  const nonOverlapping: ImportantPassage[] = [];
  for (const passage of passages) {
    const last = nonOverlapping[nonOverlapping.length - 1];
    if (!last || passage.startIndex >= last.endIndex) {
      nonOverlapping.push(passage);
    }
  }

  return nonOverlapping;
}

export function HighlightedEmailBody({ 
  body, 
  passages: providedPassages, 
  aiAnalysis,
  className,
  showPassageLabels = true
}: HighlightedEmailBodyProps) {
  // Extract passages if not provided
  const passages = useMemo(() => {
    if (providedPassages && providedPassages.length > 0) {
      return providedPassages;
    }
    return extractPassagesFromAnalysis(body, aiAnalysis);
  }, [body, providedPassages, aiAnalysis]);

  // Build highlighted content
  const highlightedContent = useMemo(() => {
    if (passages.length === 0) {
      return <span>{body}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    passages.forEach((passage, idx) => {
      // Add text before this passage
      if (passage.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>
            {body.slice(lastIndex, passage.startIndex)}
          </span>
        );
      }

      // Add highlighted passage
      const colors = passageColors[passage.type];
      elements.push(
        <span
          key={`highlight-${idx}`}
          className={cn(
            "relative inline rounded px-0.5 py-0.5 border",
            colors.bg,
            colors.border
          )}
          title={passage.reason}
        >
          {showPassageLabels && (
            <span className={cn(
              "absolute -top-5 left-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-t",
              colors.bg,
              colors.text
            )}>
              {colors.icon}
              {passageLabels[passage.type]}
            </span>
          )}
          <span className={colors.text}>
            {body.slice(passage.startIndex, passage.endIndex)}
          </span>
        </span>
      );

      lastIndex = passage.endIndex;
    });

    // Add remaining text
    if (lastIndex < body.length) {
      elements.push(
        <span key="text-final">
          {body.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  }, [body, passages, showPassageLabels]);

  return (
    <div className={cn("relative", className)}>
      {/* Legend */}
      {passages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-border/50">
          <span className="text-xs text-muted-foreground mr-2">Citations probantes:</span>
          {Object.entries(passageColors).map(([type, colors]) => {
            const count = passages.filter(p => p.type === type).length;
            if (count === 0) return null;
            return (
              <Badge 
                key={type} 
                variant="outline" 
                className={cn("text-xs gap-1", colors.bg, colors.text, colors.border)}
              >
                {colors.icon}
                {passageLabels[type as ImportantPassage['type']]} ({count})
              </Badge>
            );
          })}
        </div>
      )}

      {/* Content */}
      <p className="text-sm whitespace-pre-wrap leading-relaxed">
        {highlightedContent}
      </p>
    </div>
  );
}

// Export extracted citations for PDF (filtered and validated)
export function getExtractedCitations(
  body: string, 
  aiAnalysis?: any, 
  sender?: string, 
  date?: string
): Array<{ text: string; type: string; source: string; date: string }> {
  const passages = extractPassagesFromAnalysis(body, aiAnalysis);
  
  return passages
    .filter(p => isProbativePassage(p.text))
    .map(p => ({
      text: p.text,
      type: passageLabels[p.type],
      source: sender || 'Inconnu',
      date: date || ''
    }));
}

export default HighlightedEmailBody;
