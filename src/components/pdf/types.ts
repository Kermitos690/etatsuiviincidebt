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
  
  // Situation fields
  situation_status?: 'ouvert' | 'en_cours' | 'analysé' | 'résolu' | 'archivé' | string;
  situation_type?: string;
  institution_concerned?: string;
  priority?: 'faible' | 'moyenne' | 'haute' | 'critique' | string;
  problem_score?: number;
  last_analysis_at?: string;
  summary?: string;
  participants?: SituationParticipant[];
  timeline?: SituationTimelineEvent[];
  violations_detected?: SituationViolation[];
  recommendations?: SituationRecommendation[];
  linked_incident_ids?: string[];
}

export interface SituationParticipant {
  name: string;
  role?: string;
  institution?: string;
  documents_mentioned?: string[];
  first_mention?: {
    citation: string;
    source: string;
  };
  actions?: string[];
  trust_indicators?: {
    positive: string[];
    negative: string[];
  };
}

export interface SituationTimelineEvent {
  date: string;
  event: string;
  source: string;
  citation?: string;
  actors_involved?: string[];
  importance?: 'critique' | 'haute' | 'moyenne' | 'faible' | string;
}

export interface SituationViolation {
  type: string;
  description: string;
  severity: 'critique' | 'élevée' | 'moyenne' | 'faible' | string;
  confidence: 'CERTAIN' | 'PROBABLE' | 'POSSIBLE' | string;
  citations?: Array<{
    text: string;
    source: string;
  }>;
  legal_references?: Array<{
    article: string;
    law: string;
    description: string;
  }>;
  actors_responsible?: string[];
  evidence_strength?: string;
}

export interface SituationRecommendation {
  priority: 'critique' | 'haute' | 'moyenne' | 'faible' | string;
  action: string;
  legal_basis?: string;
  evidence?: string[];
}

export interface SituationContradiction {
  type: string;
  description: string;
  document_1: {
    source: string;
    citation: string;
    date?: string;
  };
  document_2: {
    source: string;
    citation: string;
    date?: string;
  };
  severity: string;
  analysis?: string;
}

export interface SituationJPAction {
  action: string;
  urgency: 'immédiate' | 'court_terme' | 'moyen_terme' | string;
  legal_basis?: string;
  documents_to_attach?: string[];
}

export interface SituationAnalysis {
  id: string;
  folder_id: string;
  user_id: string;
  analyzed_at: string;
  model?: string;
  prompt_version?: string;
  
  // Analysis results
  summary?: string;
  chronological_summary?: string;
  problem_score: number;
  confidence_score: number;
  severity: string;
  
  // Extracted data
  participants: SituationParticipant[];
  timeline: SituationTimelineEvent[];
  
  // Problems detected
  contradictions: SituationContradiction[];
  violations_detected: SituationViolation[];
  unanswered_questions: Array<{
    question: string;
    source: string;
    citation?: string;
    importance?: string;
  }>;
  deadline_violations: Array<{
    deadline: string;
    context: string;
    source: string;
    citation?: string;
    days_exceeded?: number;
  }>;
  
  // Recommendations
  recommendations: SituationRecommendation[];
  legal_references?: Array<{
    article: string;
    law: string;
    description: string;
  }>;
  jp_actions: SituationJPAction[];
  
  // Metadata
  documents_analyzed: number;
  total_pages: number;
  analysis_json?: any;
  
  created_at: string;
  updated_at: string;
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
  extraction_status: 'pending' | 'extracting' | 'completed' | 'error' | string;
  tags: string[] | null;
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
