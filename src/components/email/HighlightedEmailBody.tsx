import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Quote, AlertTriangle, Calendar, FileText } from 'lucide-react';

interface ImportantPassage {
  text: string;
  type: 'violation' | 'deadline' | 'commitment' | 'threat' | 'evidence' | 'key_fact';
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
};

const passageLabels: Record<ImportantPassage['type'], string> = {
  violation: 'Violation',
  deadline: 'Délai',
  commitment: 'Engagement',
  threat: 'Menace',
  evidence: 'Preuve',
  key_fact: 'Fait clé',
};

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

  // Helper to find text in body
  const findTextPosition = (searchText: string): { start: number; end: number } | null => {
    const searchLower = searchText.toLowerCase();
    const index = bodyLower.indexOf(searchLower);
    if (index !== -1) {
      return { start: index, end: index + searchText.length };
    }
    // Try partial match (first 50 chars)
    const partial = searchLower.slice(0, 50);
    const partialIndex = bodyLower.indexOf(partial);
    if (partialIndex !== -1) {
      // Find the sentence end
      const endIndex = body.indexOf('.', partialIndex + partial.length);
      return { start: partialIndex, end: endIndex !== -1 ? endIndex + 1 : partialIndex + searchText.length };
    }
    return null;
  };

  // Extract from key phrases
  if (aiAnalysis?.keyPhrases) {
    aiAnalysis.keyPhrases.forEach(phrase => {
      const pos = findTextPosition(phrase);
      if (pos) {
        passages.push({
          text: body.slice(pos.start, pos.end),
          type: 'key_fact',
          startIndex: pos.start,
          endIndex: pos.end,
          reason: 'Phrase clé identifiée par l\'IA'
        });
      }
    });
  }

  // Extract violations
  if (aiAnalysis?.violations) {
    aiAnalysis.violations.forEach(violation => {
      const pos = findTextPosition(violation);
      if (pos) {
        passages.push({
          text: body.slice(pos.start, pos.end),
          type: 'violation',
          startIndex: pos.start,
          endIndex: pos.end,
          reason: 'Violation détectée'
        });
      }
    });
  }

  // Extract deadlines - look for date patterns
  const datePatterns = [
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/gi,
    /\b\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{2,4}\b/gi,
    /\bdélai[^\.]*\./gi,
    /\bavant le\s+[^\.]+\./gi,
    /\bjusqu'au\s+[^\.]+\./gi,
    /\bau plus tard[^\.]*\./gi,
  ];

  datePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      // Avoid duplicates
      if (!passages.some(p => p.startIndex === match.index)) {
        passages.push({
          text: match[0],
          type: 'deadline',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          reason: 'Délai ou date mentionné'
        });
      }
    }
  });

  // Look for commitment patterns
  const commitmentPatterns = [
    /\bje m'engage[^\.]*\./gi,
    /\bnous nous engageons[^\.]*\./gi,
    /\bje vous confirme[^\.]*\./gi,
    /\bje vous assure[^\.]*\./gi,
    /\bje ferai[^\.]*\./gi,
    /\bnous ferons[^\.]*\./gi,
  ];

  commitmentPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      if (!passages.some(p => p.startIndex === match.index)) {
        passages.push({
          text: match[0],
          type: 'commitment',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          reason: 'Engagement identifié'
        });
      }
    }
  });

  // Look for threat/warning patterns
  const threatPatterns = [
    /\bà défaut[^\.]*\./gi,
    /\bsans réponse[^\.]*\./gi,
    /\bsinon[^\.]*\./gi,
    /\bsous peine[^\.]*\./gi,
    /\bfaute de quoi[^\.]*\./gi,
    /\bje me verrai[^\.]*\./gi,
    /\bnous nous réservons[^\.]*\./gi,
  ];

  threatPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      if (!passages.some(p => p.startIndex === match.index)) {
        passages.push({
          text: match[0],
          type: 'threat',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          reason: 'Avertissement ou menace'
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
          <span className="text-xs text-muted-foreground mr-2">Passages surlignés:</span>
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

// Export extracted citations for PDF
export function getExtractedCitations(
  body: string, 
  aiAnalysis?: any, 
  sender?: string, 
  date?: string
): Array<{ text: string; type: string; source: string; date: string }> {
  const passages = extractPassagesFromAnalysis(body, aiAnalysis);
  
  return passages.map(p => ({
    text: p.text,
    type: passageLabels[p.type],
    source: sender || 'Inconnu',
    date: date || ''
  }));
}

export default HighlightedEmailBody;
