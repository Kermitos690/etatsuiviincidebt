export interface PDFFolder {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  documentsCount?: number;
}

export interface PDFDocument {
  id: string;
  user_id: string;
  folder_id: string | null;
  filename: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  page_count: number | null;
  document_type: string;
  metadata: Record<string, unknown>;
  extracted_text: string | null;
  extraction_status: 'pending' | 'extracting' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  analysis?: PDFAnalysis | null;
}

export interface PDFAnalysis {
  id: string;
  document_id: string;
  user_id: string;
  analysis_type: string;
  ai_analysis: {
    isIncident: boolean;
    confidence: number;
    suggestedTitle: string;
    suggestedFacts: string;
    suggestedDysfunction: string;
    suggestedInstitution: string;
    suggestedType: string;
    suggestedGravity: string;
  } | null;
  thread_analysis: {
    deadline_violations: {
      detected: boolean;
      details: string[];
      missed_deadlines: string[];
      severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    };
    unanswered_questions: {
      detected: boolean;
      questions: string[];
      waiting_since: string[];
    };
    repetitions: {
      detected: boolean;
      repeated_requests: string[];
      count: number;
    };
    contradictions: {
      detected: boolean;
      details: string[];
      conflicting_statements: Array<{ statement1: string; statement2: string }>;
    };
    rule_violations: {
      detected: boolean;
      violations: string[];
      rules_concerned: string[];
      legal_references: string[];
    };
    circumvention: {
      detected: boolean;
      details: string[];
      evasive_responses: string[];
    };
    problem_score: number;
  } | null;
  timeline: Array<{
    date: string;
    event: string;
    actor?: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
  }> | null;
  participants: Array<{
    name: string;
    role: string;
    email?: string;
    institution?: string;
  }> | null;
  problem_score: number;
  severity: string;
  confidence_score: number;
  summary: string | null;
  recommendations: string[] | null;
  legal_references: Array<{
    article: string;
    law: string;
    description: string;
  }> | null;
  analyzed_at: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface PDFIncident {
  id: string;
  document_id: string;
  incident_id: string | null;
  user_id: string;
  created_at: string;
}
