export interface Email {
  id: string;
  subject: string;
  sender: string;
  recipient?: string;
  body: string;
  received_at: string;
  processed: boolean;
  is_sent?: boolean;
  email_type?: 'received' | 'sent' | 'replied' | 'forwarded';
  ai_analysis: {
    isIncident: boolean;
    confidence: number;
    suggestedTitle: string;
    suggestedFacts: string;
    suggestedDysfunction: string;
    suggestedInstitution: string;
    suggestedType: string;
    suggestedGravity: string;
    summary: string;
    suggestedResponse?: string;
  } | null;
  thread_analysis: AdvancedAnalysis | null;
  incident_id: string | null;
  gmail_thread_id?: string;
  created_at: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  ai_analysis: {
    document_type: string;
    key_elements: string[];
    institutions_mentioned: string[];
    dates_found: string[];
    problems_detected: string[];
    legal_implications: string;
    summary: string;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
  } | null;
  analyzed_at: string | null;
  extracted_text: string | null;
  created_at: string;
}

export interface LegalReference {
  article: string;
  law: string;
  description: string;
  source_url?: string;
}

export interface AdvancedAnalysis {
  deadline_violations: {
    detected: boolean;
    details: string[];
    missed_deadlines: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
    legal_basis?: LegalReference[];
  };
  unanswered_questions: {
    detected: boolean;
    questions: string[];
    waiting_since: string[];
    legal_basis?: LegalReference[];
  };
  repetitions: {
    detected: boolean;
    repeated_requests: string[];
    count: number;
    legal_basis?: LegalReference[];
  };
  contradictions: {
    detected: boolean;
    details: string[];
    conflicting_statements: Array<{ statement1: string; statement2: string; source1?: string; source2?: string }>;
    legal_basis?: LegalReference[];
  };
  rule_violations: {
    detected: boolean;
    violations: string[];
    rules_concerned: string[];
    legal_references: string[];
    legal_basis?: LegalReference[];
  };
  circumvention: {
    detected: boolean;
    details: string[];
    evasive_responses: string[];
    legal_basis?: LegalReference[];
  };
  problem_score: number;
  summary: string;
  recommendations: string[];
  confidence: "High" | "Medium" | "Low";
  all_legal_references?: LegalReference[];
}

export interface EmailThread {
  threadId: string;
  subject: string;
  emails: Email[];
  latestDate: string;
  participants: string[];
  hasIncident: boolean;
  hasUnprocessed: boolean;
  avgConfidence: number;
  institution?: string;
}
