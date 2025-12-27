export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      active_learning_queue: {
        Row: {
          context_summary: string | null
          created_at: string
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          potential_learning_value: number | null
          proposal_reason: string
          reviewed_at: string | null
          status: string | null
          suggested_questions: Json | null
          uncertainty_score: number | null
          user_id: string | null
        }
        Insert: {
          context_summary?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          potential_learning_value?: number | null
          proposal_reason: string
          reviewed_at?: string | null
          status?: string | null
          suggested_questions?: Json | null
          uncertainty_score?: number | null
          user_id?: string | null
        }
        Update: {
          context_summary?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          potential_learning_value?: number | null
          proposal_reason?: string
          reviewed_at?: string | null
          status?: string | null
          suggested_questions?: Json | null
          uncertainty_score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      actor_trust_scores: {
        Row: {
          actor_email: string | null
          actor_institution: string | null
          actor_name: string
          actor_role: string | null
          contradictions_count: number | null
          created_at: string
          evidence: Json | null
          helpful_actions_count: number | null
          hidden_communications_count: number | null
          id: string
          notes: string | null
          promises_broken_count: number | null
          trust_score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_institution?: string | null
          actor_name: string
          actor_role?: string | null
          contradictions_count?: number | null
          created_at?: string
          evidence?: Json | null
          helpful_actions_count?: number | null
          hidden_communications_count?: number | null
          id?: string
          notes?: string | null
          promises_broken_count?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_institution?: string | null
          actor_name?: string
          actor_role?: string | null
          contradictions_count?: number | null
          created_at?: string
          evidence?: Json | null
          helpful_actions_count?: number | null
          hidden_communications_count?: number | null
          id?: string
          notes?: string | null
          promises_broken_count?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_output_validations: {
        Row: {
          confidence_after: number | null
          confidence_before: number | null
          created_at: string
          edge_function_name: string
          hallucination_details: Json | null
          hallucination_detected: boolean | null
          id: string
          input_hash: string
          legal_refs_claimed: string[] | null
          legal_refs_rejected: string[] | null
          legal_refs_verified: string[] | null
          model_used: string | null
          output_hash: string
          processing_time_ms: number | null
          prompt_version: string | null
          raw_output: Json
          user_id: string | null
          validated_at: string | null
          validated_output: Json | null
          validation_rules_applied: string[] | null
          validation_status: string
        }
        Insert: {
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          edge_function_name: string
          hallucination_details?: Json | null
          hallucination_detected?: boolean | null
          id?: string
          input_hash: string
          legal_refs_claimed?: string[] | null
          legal_refs_rejected?: string[] | null
          legal_refs_verified?: string[] | null
          model_used?: string | null
          output_hash: string
          processing_time_ms?: number | null
          prompt_version?: string | null
          raw_output: Json
          user_id?: string | null
          validated_at?: string | null
          validated_output?: Json | null
          validation_rules_applied?: string[] | null
          validation_status?: string
        }
        Update: {
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          edge_function_name?: string
          hallucination_details?: Json | null
          hallucination_detected?: boolean | null
          id?: string
          input_hash?: string
          legal_refs_claimed?: string[] | null
          legal_refs_rejected?: string[] | null
          legal_refs_verified?: string[] | null
          model_used?: string | null
          output_hash?: string
          processing_time_ms?: number | null
          prompt_version?: string | null
          raw_output?: Json
          user_id?: string | null
          validated_at?: string | null
          validated_output?: Json | null
          validation_rules_applied?: string[] | null
          validation_status?: string
        }
        Relationships: []
      }
      ai_situation_training: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          correct_legal_refs: Json | null
          correction_notes: string | null
          created_at: string
          detected_legal_refs: Json | null
          detected_violation_type: string | null
          email_id: string | null
          id: string
          incident_id: string | null
          is_used_for_training: boolean | null
          situation_summary: string
          trained_at: string | null
          training_priority: number | null
          updated_at: string
          user_correction: string | null
          user_id: string | null
          validation_status: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          correct_legal_refs?: Json | null
          correction_notes?: string | null
          created_at?: string
          detected_legal_refs?: Json | null
          detected_violation_type?: string | null
          email_id?: string | null
          id?: string
          incident_id?: string | null
          is_used_for_training?: boolean | null
          situation_summary: string
          trained_at?: string | null
          training_priority?: number | null
          updated_at?: string
          user_correction?: string | null
          user_id?: string | null
          validation_status?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          correct_legal_refs?: Json | null
          correction_notes?: string | null
          created_at?: string
          detected_legal_refs?: Json | null
          detected_violation_type?: string | null
          email_id?: string | null
          id?: string
          incident_id?: string | null
          is_used_for_training?: boolean | null
          situation_summary?: string
          trained_at?: string | null
          training_priority?: number | null
          updated_at?: string
          user_correction?: string | null
          user_id?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_situation_training_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_situation_training_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_feedback: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          feedback_type: string
          id: string
          notes: string | null
          original_detection: Json | null
          used_for_training: boolean | null
          user_correction: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          feedback_type: string
          id?: string
          notes?: string | null
          original_detection?: Json | null
          used_for_training?: boolean | null
          user_correction?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          feedback_type?: string
          id?: string
          notes?: string | null
          original_detection?: Json | null
          used_for_training?: boolean | null
          user_correction?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      anomaly_detections: {
        Row: {
          ai_explanation: string | null
          ai_recommendations: Json | null
          anomaly_type: string
          baseline_data: Json | null
          confidence: number | null
          created_at: string
          description: string
          detected_at: string
          deviation_score: number | null
          id: string
          investigated_at: string | null
          pattern_data: Json | null
          related_actor_id: string | null
          related_email_ids: string[] | null
          related_incident_ids: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          time_window_end: string | null
          time_window_start: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_explanation?: string | null
          ai_recommendations?: Json | null
          anomaly_type: string
          baseline_data?: Json | null
          confidence?: number | null
          created_at?: string
          description: string
          detected_at?: string
          deviation_score?: number | null
          id?: string
          investigated_at?: string | null
          pattern_data?: Json | null
          related_actor_id?: string | null
          related_email_ids?: string[] | null
          related_incident_ids?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          time_window_end?: string | null
          time_window_start?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_explanation?: string | null
          ai_recommendations?: Json | null
          anomaly_type?: string
          baseline_data?: Json | null
          confidence?: number | null
          created_at?: string
          description?: string
          detected_at?: string
          deviation_score?: number | null
          id?: string
          investigated_at?: string | null
          pattern_data?: Json | null
          related_actor_id?: string | null
          related_email_ids?: string[] | null
          related_incident_ids?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          time_window_end?: string | null
          time_window_start?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_detections_related_actor_id_fkey"
            columns: ["related_actor_id"]
            isOneToOne: false
            referencedRelation: "actor_trust_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          user_id: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          user_id?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          user_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean | null
          legal_reference: Json | null
          related_email_id: string | null
          related_incident_id: string | null
          resolved_at: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean | null
          legal_reference?: Json | null
          related_email_id?: string | null
          related_incident_id?: string | null
          resolved_at?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean | null
          legal_reference?: Json | null
          related_email_id?: string | null
          related_incident_id?: string | null
          resolved_at?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_alerts_related_email_id_fkey"
            columns: ["related_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_alerts_related_incident_id_fkey"
            columns: ["related_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          changed_fields: string[] | null
          context: Json | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          operation: string
          performed_at: string
          performed_by: string | null
          record_id: string
          session_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          changed_fields?: string[] | null
          context?: Json | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          performed_at?: string
          performed_by?: string | null
          record_id: string
          session_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          changed_fields?: string[] | null
          context?: Json | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          performed_at?: string
          performed_by?: string | null
          record_id?: string
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      behavior_baselines: {
        Row: {
          avg_emails_per_day: number | null
          avg_response_time_hours: number | null
          calculated_at: string | null
          communication_frequency: Json | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          id: string
          recipient_patterns: Json | null
          sample_size: number | null
          topic_distribution: Json | null
          typical_days: Json | null
          typical_hours: Json | null
          typical_sentiment: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avg_emails_per_day?: number | null
          avg_response_time_hours?: number | null
          calculated_at?: string | null
          communication_frequency?: Json | null
          created_at?: string
          entity_id: string
          entity_label?: string | null
          entity_type: string
          id?: string
          recipient_patterns?: Json | null
          sample_size?: number | null
          topic_distribution?: Json | null
          typical_days?: Json | null
          typical_hours?: Json | null
          typical_sentiment?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avg_emails_per_day?: number | null
          avg_response_time_hours?: number | null
          calculated_at?: string | null
          communication_frequency?: Json | null
          created_at?: string
          entity_id?: string
          entity_label?: string | null
          entity_type?: string
          id?: string
          recipient_patterns?: Json | null
          sample_size?: number | null
          topic_distribution?: Json | null
          typical_days?: Json | null
          typical_hours?: Json | null
          typical_sentiment?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      betrayal_detections: {
        Row: {
          actor_name: string
          betrayal_type: string
          citations: Json
          confidence: string
          counter_evidence: Json | null
          created_at: string
          evidence: Json
          id: string
          severity: string
          thread_id: string
          user_id: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actor_name: string
          betrayal_type: string
          citations: Json
          confidence: string
          counter_evidence?: Json | null
          created_at?: string
          evidence: Json
          id?: string
          severity: string
          thread_id: string
          user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actor_name?: string
          betrayal_type?: string
          citations?: Json
          confidence?: string
          counter_evidence?: Json | null
          created_at?: string
          evidence?: Json
          id?: string
          severity?: string
          thread_id?: string
          user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      compliance_assessments: {
        Row: {
          ai_validation_id: string | null
          assessed_by: string
          assessment_date: string
          compliance_status: string
          created_at: string
          data_protection_score: number | null
          documentation_score: number | null
          entity_id: string
          entity_type: string
          id: string
          issues_detected: Json | null
          legal_basis_score: number | null
          legal_mappings_used: string[] | null
          overall_score: number | null
          procedural_score: number | null
          proof_chain_id: string | null
          recommendations: Json | null
          red_zones: Json | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_validation_id?: string | null
          assessed_by?: string
          assessment_date?: string
          compliance_status?: string
          created_at?: string
          data_protection_score?: number | null
          documentation_score?: number | null
          entity_id: string
          entity_type: string
          id?: string
          issues_detected?: Json | null
          legal_basis_score?: number | null
          legal_mappings_used?: string[] | null
          overall_score?: number | null
          procedural_score?: number | null
          proof_chain_id?: string | null
          recommendations?: Json | null
          red_zones?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_validation_id?: string | null
          assessed_by?: string
          assessment_date?: string
          compliance_status?: string
          created_at?: string
          data_protection_score?: number | null
          documentation_score?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          issues_detected?: Json | null
          legal_basis_score?: number | null
          legal_mappings_used?: string[] | null
          overall_score?: number | null
          procedural_score?: number | null
          proof_chain_id?: string | null
          recommendations?: Json | null
          red_zones?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_assessments_ai_validation_id_fkey"
            columns: ["ai_validation_id"]
            isOneToOne: false
            referencedRelation: "ai_output_validations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_assessments_proof_chain_id_fkey"
            columns: ["proof_chain_id"]
            isOneToOne: false
            referencedRelation: "proof_chain"
            referencedColumns: ["id"]
          },
        ]
      }
      corroborations: {
        Row: {
          attachment_ids: string[] | null
          contradicting_evidence: Json | null
          corroboration_type: string
          created_at: string
          final_confidence: number | null
          id: string
          incident_id: string | null
          notes: string | null
          supporting_evidence: Json | null
          thread_analysis_ids: string[] | null
          updated_at: string
          user_id: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          attachment_ids?: string[] | null
          contradicting_evidence?: Json | null
          corroboration_type: string
          created_at?: string
          final_confidence?: number | null
          id?: string
          incident_id?: string | null
          notes?: string | null
          supporting_evidence?: Json | null
          thread_analysis_ids?: string[] | null
          updated_at?: string
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          attachment_ids?: string[] | null
          contradicting_evidence?: Json | null
          corroboration_type?: string
          created_at?: string
          final_confidence?: number | null
          id?: string
          incident_id?: string | null
          notes?: string | null
          supporting_evidence?: Json | null
          thread_analysis_ids?: string[] | null
          updated_at?: string
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corroborations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      email_attachments: {
        Row: {
          ai_analysis: Json | null
          analyzed_at: string | null
          created_at: string
          email_id: string
          extracted_text: string | null
          filename: string
          gmail_attachment_id: string | null
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          ai_analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          email_id: string
          extracted_text?: string | null
          filename: string
          gmail_attachment_id?: string | null
          id?: string
          mime_type: string
          size_bytes?: number
          storage_path: string
        }
        Update: {
          ai_analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          email_id?: string
          extracted_text?: string | null
          filename?: string
          gmail_attachment_id?: string | null
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_blacklist: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          reason: string | null
          sender_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          reason?: string | null
          sender_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          reason?: string | null
          sender_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_facts: {
        Row: {
          action_items: string[] | null
          cc_recipients: string[] | null
          created_at: string
          email_id: string
          extracted_at: string
          id: string
          key_phrases: string[] | null
          mentioned_dates: string[] | null
          mentioned_institutions: string[] | null
          mentioned_persons: string[] | null
          raw_citations: Json | null
          recipients: string[] | null
          sender_email: string | null
          sender_name: string | null
          sentiment: string | null
          urgency_level: string | null
        }
        Insert: {
          action_items?: string[] | null
          cc_recipients?: string[] | null
          created_at?: string
          email_id: string
          extracted_at?: string
          id?: string
          key_phrases?: string[] | null
          mentioned_dates?: string[] | null
          mentioned_institutions?: string[] | null
          mentioned_persons?: string[] | null
          raw_citations?: Json | null
          recipients?: string[] | null
          sender_email?: string | null
          sender_name?: string | null
          sentiment?: string | null
          urgency_level?: string | null
        }
        Update: {
          action_items?: string[] | null
          cc_recipients?: string[] | null
          created_at?: string
          email_id?: string
          extracted_at?: string
          id?: string
          key_phrases?: string[] | null
          mentioned_dates?: string[] | null
          mentioned_institutions?: string[] | null
          mentioned_persons?: string[] | null
          raw_citations?: Json | null
          recipients?: string[] | null
          sender_email?: string | null
          sender_name?: string | null
          sentiment?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_facts_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_relations: {
        Row: {
          created_at: string
          evidence: Json | null
          id: string
          relation_type: string
          source_email_id: string
          strength: number | null
          target_email_id: string
        }
        Insert: {
          created_at?: string
          evidence?: Json | null
          id?: string
          relation_type: string
          source_email_id: string
          strength?: number | null
          target_email_id: string
        }
        Update: {
          created_at?: string
          evidence?: Json | null
          id?: string
          relation_type?: string
          source_email_id?: string
          strength?: number | null
          target_email_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_relations_source_email_id_fkey"
            columns: ["source_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_relations_target_email_id_fkey"
            columns: ["target_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          ai_analysis: Json | null
          body: string
          created_at: string
          email_type: string | null
          gmail_label: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          incident_id: string | null
          is_sent: boolean | null
          processed: boolean
          received_at: string
          recipient: string | null
          sender: string
          subject: string
          thread_analysis: Json | null
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          body: string
          created_at?: string
          email_type?: string | null
          gmail_label?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          incident_id?: string | null
          is_sent?: boolean | null
          processed?: boolean
          received_at?: string
          recipient?: string | null
          sender: string
          subject: string
          thread_analysis?: Json | null
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          body?: string
          created_at?: string
          email_type?: string | null
          gmail_label?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          incident_id?: string | null
          is_sent?: boolean | null
          processed?: boolean
          received_at?: string
          recipient?: string | null
          sender?: string
          subject?: string
          thread_analysis?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      entity_relations: {
        Row: {
          created_at: string
          evidence: Json | null
          id: string
          is_verified: boolean | null
          relation_strength: number | null
          relation_type: string
          source_id: string
          source_label: string | null
          source_type: string
          target_id: string
          target_label: string | null
          target_type: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          evidence?: Json | null
          id?: string
          is_verified?: boolean | null
          relation_strength?: number | null
          relation_type: string
          source_id: string
          source_label?: string | null
          source_type: string
          target_id: string
          target_label?: string | null
          target_type: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          evidence?: Json | null
          id?: string
          is_verified?: boolean | null
          relation_strength?: number | null
          relation_type?: string
          source_id?: string
          source_label?: string | null
          source_type?: string
          target_id?: string
          target_label?: string | null
          target_type?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      fact_law_mappings: {
        Row: {
          ai_confidence: number | null
          ai_generated: boolean | null
          created_at: string
          fact_id: string | null
          fact_text: string
          fact_type: string
          id: string
          legal_article_id: string
          mapping_reason: string | null
          mapping_type: string
          relevance_score: number | null
          updated_at: string
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
          validation_notes: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_generated?: boolean | null
          created_at?: string
          fact_id?: string | null
          fact_text: string
          fact_type: string
          id?: string
          legal_article_id: string
          mapping_reason?: string | null
          mapping_type?: string
          relevance_score?: number | null
          updated_at?: string
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_generated?: boolean | null
          created_at?: string
          fact_id?: string | null
          fact_text?: string
          fact_type?: string
          id?: string
          legal_article_id?: string
          mapping_reason?: string | null
          mapping_type?: string
          relevance_score?: number | null
          updated_at?: string
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_law_mappings_legal_article_id_fkey"
            columns: ["legal_article_id"]
            isOneToOne: false
            referencedRelation: "legal_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_config: {
        Row: {
          access_token: string | null
          access_token_enc: string | null
          created_at: string | null
          domains: string[] | null
          id: string
          keywords: string[] | null
          last_sync: string | null
          refresh_token: string | null
          refresh_token_enc: string | null
          sync_enabled: boolean | null
          token_expiry: string | null
          token_key_version: number
          token_nonce: string | null
          updated_at: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          access_token_enc?: string | null
          created_at?: string | null
          domains?: string[] | null
          id?: string
          keywords?: string[] | null
          last_sync?: string | null
          refresh_token?: string | null
          refresh_token_enc?: string | null
          sync_enabled?: boolean | null
          token_expiry?: string | null
          token_key_version?: number
          token_nonce?: string | null
          updated_at?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          access_token_enc?: string | null
          created_at?: string | null
          domains?: string[] | null
          id?: string
          keywords?: string[] | null
          last_sync?: string | null
          refresh_token?: string | null
          refresh_token_enc?: string | null
          sync_enabled?: boolean | null
          token_expiry?: string | null
          token_key_version?: number
          token_nonce?: string | null
          updated_at?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          confidence_level: string | null
          created_at: string
          date_creation: string
          date_incident: string
          date_transmission_jp: string | null
          dedup_key: string | null
          dysfonctionnement: string
          email_source_id: string | null
          faits: string
          gmail_references: Json | null
          gravite: string
          id: string
          institution: string
          numero: number
          preuves: Json | null
          priorite: string
          rejection_reason: string | null
          score: number
          statut: string
          titre: string
          transmis_jp: boolean
          type: string
          updated_at: string
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          date_creation?: string
          date_incident: string
          date_transmission_jp?: string | null
          dedup_key?: string | null
          dysfonctionnement: string
          email_source_id?: string | null
          faits: string
          gmail_references?: Json | null
          gravite: string
          id?: string
          institution: string
          numero?: number
          preuves?: Json | null
          priorite?: string
          rejection_reason?: string | null
          score?: number
          statut?: string
          titre: string
          transmis_jp?: boolean
          type: string
          updated_at?: string
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          date_creation?: string
          date_incident?: string
          date_transmission_jp?: string | null
          dedup_key?: string | null
          dysfonctionnement?: string
          email_source_id?: string | null
          faits?: string
          gmail_references?: Json | null
          gravite?: string
          id?: string
          institution?: string
          numero?: number
          preuves?: Json | null
          priorite?: string
          rejection_reason?: string | null
          score?: number
          statut?: string
          titre?: string
          transmis_jp?: boolean
          type?: string
          updated_at?: string
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_email_source_id_fkey"
            columns: ["email_source_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_articles: {
        Row: {
          article_number: string
          article_text: string
          article_title: string | null
          code_name: string
          content_hash: string
          created_at: string
          domain: string | null
          id: string
          is_current: boolean | null
          keywords: string[] | null
          previous_version_id: string | null
          source_document: string | null
          source_url: string | null
          updated_at: string
          user_id: string | null
          version_date: string
          version_number: number
        }
        Insert: {
          article_number: string
          article_text: string
          article_title?: string | null
          code_name: string
          content_hash: string
          created_at?: string
          domain?: string | null
          id?: string
          is_current?: boolean | null
          keywords?: string[] | null
          previous_version_id?: string | null
          source_document?: string | null
          source_url?: string | null
          updated_at?: string
          user_id?: string | null
          version_date?: string
          version_number?: number
        }
        Update: {
          article_number?: string
          article_text?: string
          article_title?: string | null
          code_name?: string
          content_hash?: string
          created_at?: string
          domain?: string | null
          id?: string
          is_current?: boolean | null
          keywords?: string[] | null
          previous_version_id?: string | null
          source_document?: string | null
          source_url?: string | null
          updated_at?: string
          user_id?: string | null
          version_date?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_articles_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "legal_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_references: {
        Row: {
          article_number: string
          article_text: string | null
          code_name: string
          created_at: string
          domain: string | null
          id: string
          is_verified: boolean | null
          keywords: string[] | null
          notes: string | null
          source_url: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          article_number: string
          article_text?: string | null
          code_name: string
          created_at?: string
          domain?: string | null
          id?: string
          is_verified?: boolean | null
          keywords?: string[] | null
          notes?: string | null
          source_url?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          article_number?: string
          article_text?: string | null
          code_name?: string
          created_at?: string
          domain?: string | null
          id?: string
          is_verified?: boolean | null
          keywords?: string[] | null
          notes?: string | null
          source_url?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      legal_search_results: {
        Row: {
          created_at: string | null
          date_decision: string | null
          full_content: string | null
          id: string
          is_saved: boolean | null
          keywords: string[] | null
          legal_domain: string | null
          reference_number: string | null
          relevance_score: number | null
          scraped_at: string | null
          search_query: string
          source_name: string
          source_type: string
          source_url: string
          summary: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_decision?: string | null
          full_content?: string | null
          id?: string
          is_saved?: boolean | null
          keywords?: string[] | null
          legal_domain?: string | null
          reference_number?: string | null
          relevance_score?: number | null
          scraped_at?: string | null
          search_query: string
          source_name: string
          source_type: string
          source_url: string
          summary?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_decision?: string | null
          full_content?: string | null
          id?: string
          is_saved?: boolean | null
          keywords?: string[] | null
          legal_domain?: string | null
          reference_number?: string | null
          relevance_score?: number | null
          scraped_at?: string | null
          search_query?: string
          source_name?: string
          source_type?: string
          source_url?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          created_at: string
          cumulative_score: number
          emails_count: number
          id: string
          incidents_count: number
          institution_breakdown: Json | null
          key_issues: Json | null
          legal_references: Json | null
          month_year: string
          recommendations: Json | null
          report_date: string
          severity_breakdown: Json | null
          summary: string | null
          user_id: string | null
          violations_count: number
        }
        Insert: {
          created_at?: string
          cumulative_score?: number
          emails_count?: number
          id?: string
          incidents_count?: number
          institution_breakdown?: Json | null
          key_issues?: Json | null
          legal_references?: Json | null
          month_year: string
          recommendations?: Json | null
          report_date?: string
          severity_breakdown?: Json | null
          summary?: string | null
          user_id?: string | null
          violations_count?: number
        }
        Update: {
          created_at?: string
          cumulative_score?: number
          emails_count?: number
          id?: string
          incidents_count?: number
          institution_breakdown?: Json | null
          key_issues?: Json | null
          legal_references?: Json | null
          month_year?: string
          recommendations?: Json | null
          report_date?: string
          severity_breakdown?: Json | null
          summary?: string | null
          user_id?: string | null
          violations_count?: number
        }
        Relationships: []
      }
      pdf_analyses: {
        Row: {
          ai_analysis: Json | null
          analysis_type: string | null
          analyzed_at: string | null
          confidence_score: number | null
          created_at: string
          document_id: string
          id: string
          legal_references: Json | null
          model: string | null
          participants: Json | null
          problem_score: number | null
          recommendations: Json | null
          severity: string | null
          summary: string | null
          thread_analysis: Json | null
          timeline: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          analysis_type?: string | null
          analyzed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          document_id: string
          id?: string
          legal_references?: Json | null
          model?: string | null
          participants?: Json | null
          problem_score?: number | null
          recommendations?: Json | null
          severity?: string | null
          summary?: string | null
          thread_analysis?: Json | null
          timeline?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          analysis_type?: string | null
          analyzed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          document_id?: string
          id?: string
          legal_references?: Json | null
          model?: string | null
          participants?: Json | null
          problem_score?: number | null
          recommendations?: Json | null
          severity?: string | null
          summary?: string | null
          thread_analysis?: Json | null
          timeline?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_analyses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "pdf_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_comparisons: {
        Row: {
          comparison_result: Json | null
          contradictions_count: number | null
          created_at: string
          document_id_1: string
          document_id_2: string
          id: string
          risk_level: string | null
          similarity_score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comparison_result?: Json | null
          contradictions_count?: number | null
          created_at?: string
          document_id_1: string
          document_id_2: string
          id?: string
          risk_level?: string | null
          similarity_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comparison_result?: Json | null
          contradictions_count?: number | null
          created_at?: string
          document_id_1?: string
          document_id_2?: string
          id?: string
          risk_level?: string | null
          similarity_score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_comparisons_document_id_1_fkey"
            columns: ["document_id_1"]
            isOneToOne: false
            referencedRelation: "pdf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_comparisons_document_id_2_fkey"
            columns: ["document_id_2"]
            isOneToOne: false
            referencedRelation: "pdf_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_documents: {
        Row: {
          created_at: string
          document_type: string | null
          extracted_text: string | null
          extraction_status: string | null
          file_size: number
          filename: string
          folder_id: string | null
          id: string
          metadata: Json | null
          original_filename: string
          page_count: number | null
          storage_path: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          extracted_text?: string | null
          extraction_status?: string | null
          file_size?: number
          filename: string
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          original_filename: string
          page_count?: number | null
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          extracted_text?: string | null
          extraction_status?: string | null
          file_size?: number
          filename?: string
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          original_filename?: string
          page_count?: number | null
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "pdf_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_folders: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_incidents: {
        Row: {
          created_at: string
          document_id: string
          id: string
          incident_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          incident_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          incident_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_incidents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pdf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_incidents_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          last_active_at: string | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          last_active_at?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          last_active_at?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proof_chain: {
        Row: {
          chain_position: number
          combined_hash: string
          content_hash: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          last_verified_at: string | null
          metadata_hash: string | null
          previous_proof_id: string | null
          seal_reason: string | null
          sealed_at: string
          sealed_by: string
          source_ip: string | null
          user_agent: string | null
          user_id: string | null
          verification_status: string | null
        }
        Insert: {
          chain_position?: number
          combined_hash: string
          content_hash: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_verified_at?: string | null
          metadata_hash?: string | null
          previous_proof_id?: string | null
          seal_reason?: string | null
          sealed_at?: string
          sealed_by: string
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
          verification_status?: string | null
        }
        Update: {
          chain_position?: number
          combined_hash?: string
          content_hash?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_verified_at?: string | null
          metadata_hash?: string | null
          previous_proof_id?: string | null
          seal_reason?: string | null
          sealed_at?: string
          sealed_by?: string
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_chain_previous_proof_id_fkey"
            columns: ["previous_proof_id"]
            isOneToOne: false
            referencedRelation: "proof_chain"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_tracking: {
        Row: {
          created_at: string
          first_occurrence: string
          id: string
          institution: string
          last_occurrence: string
          legal_implications: string | null
          occurrence_count: number
          related_incidents: Json | null
          updated_at: string
          user_id: string | null
          violation_type: string
        }
        Insert: {
          created_at?: string
          first_occurrence: string
          id?: string
          institution: string
          last_occurrence: string
          legal_implications?: string | null
          occurrence_count?: number
          related_incidents?: Json | null
          updated_at?: string
          user_id?: string | null
          violation_type: string
        }
        Update: {
          created_at?: string
          first_occurrence?: string
          id?: string
          institution?: string
          last_occurrence?: string
          legal_implications?: string | null
          occurrence_count?: number
          related_incidents?: Json | null
          updated_at?: string
          user_id?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      sheets_config: {
        Row: {
          column_mapping: Json | null
          created_at: string | null
          id: string
          last_sync: string | null
          sheet_name: string | null
          spreadsheet_id: string | null
          sync_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          column_mapping?: Json | null
          created_at?: string | null
          id?: string
          last_sync?: string | null
          sheet_name?: string | null
          spreadsheet_id?: string | null
          sync_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          column_mapping?: Json | null
          created_at?: string | null
          id?: string
          last_sync?: string | null
          sheet_name?: string | null
          spreadsheet_id?: string | null
          sync_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      swipe_training_pairs: {
        Row: {
          actors_overlap: string[] | null
          ai_confidence: number | null
          ai_enrichment: Json | null
          ai_prediction: string | null
          context_summary: string | null
          created_at: string | null
          email_1_id: string | null
          email_2_id: string | null
          generated_at: string | null
          id: string
          is_processed: boolean | null
          keywords_overlap: string[] | null
          pair_type: string
          priority_score: number | null
          user_id: string | null
        }
        Insert: {
          actors_overlap?: string[] | null
          ai_confidence?: number | null
          ai_enrichment?: Json | null
          ai_prediction?: string | null
          context_summary?: string | null
          created_at?: string | null
          email_1_id?: string | null
          email_2_id?: string | null
          generated_at?: string | null
          id?: string
          is_processed?: boolean | null
          keywords_overlap?: string[] | null
          pair_type: string
          priority_score?: number | null
          user_id?: string | null
        }
        Update: {
          actors_overlap?: string[] | null
          ai_confidence?: number | null
          ai_enrichment?: Json | null
          ai_prediction?: string | null
          context_summary?: string | null
          created_at?: string | null
          email_1_id?: string | null
          email_2_id?: string | null
          generated_at?: string | null
          id?: string
          is_processed?: boolean | null
          keywords_overlap?: string[] | null
          pair_type?: string
          priority_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swipe_training_pairs_email_1_id_fkey"
            columns: ["email_1_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipe_training_pairs_email_2_id_fkey"
            columns: ["email_2_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      swipe_training_results: {
        Row: {
          ai_analysis: Json | null
          created_at: string | null
          id: string
          manual_notes: string | null
          pair_id: string | null
          relationship_type: string | null
          swipe_direction: string | null
          time_spent_ms: number | null
          user_decision: string
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string | null
          id?: string
          manual_notes?: string | null
          pair_id?: string | null
          relationship_type?: string | null
          swipe_direction?: string | null
          time_spent_ms?: number | null
          user_decision: string
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string | null
          id?: string
          manual_notes?: string | null
          pair_id?: string | null
          relationship_type?: string | null
          swipe_direction?: string | null
          time_spent_ms?: number | null
          user_decision?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swipe_training_results_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "swipe_training_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      swipe_training_stats: {
        Row: {
          badges: Json | null
          correct_predictions: number | null
          created_at: string | null
          current_streak: number | null
          id: string
          last_active_at: string | null
          max_streak: number | null
          total_swipes: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          badges?: Json | null
          correct_predictions?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_active_at?: string | null
          max_streak?: number | null
          total_swipes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          badges?: Json | null
          correct_predictions?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_active_at?: string | null
          max_streak?: number | null
          total_swipes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_processed_id: string | null
          new_emails: number | null
          processed_emails: number | null
          started_at: string | null
          stats: Json | null
          status: string | null
          total_emails: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_processed_id?: string | null
          new_emails?: number | null
          processed_emails?: number | null
          started_at?: string | null
          stats?: Json | null
          status?: string | null
          total_emails?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_processed_id?: string | null
          new_emails?: number | null
          processed_emails?: number | null
          started_at?: string | null
          stats?: Json | null
          status?: string | null
          total_emails?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      thread_analyses: {
        Row: {
          analysis_json: Json | null
          analyzed_at: string
          chronological_summary: string | null
          citations: Json | null
          confidence_score: number | null
          created_at: string
          detected_issues: Json | null
          email_ids: string[]
          emails_count: number | null
          id: string
          input_hash: string | null
          model: string | null
          participants: Json | null
          prompt_version: string | null
          severity: string | null
          thread_id: string
          timeline: Json | null
          user_id: string | null
        }
        Insert: {
          analysis_json?: Json | null
          analyzed_at?: string
          chronological_summary?: string | null
          citations?: Json | null
          confidence_score?: number | null
          created_at?: string
          detected_issues?: Json | null
          email_ids: string[]
          emails_count?: number | null
          id?: string
          input_hash?: string | null
          model?: string | null
          participants?: Json | null
          prompt_version?: string | null
          severity?: string | null
          thread_id: string
          timeline?: Json | null
          user_id?: string | null
        }
        Update: {
          analysis_json?: Json | null
          analyzed_at?: string
          chronological_summary?: string | null
          citations?: Json | null
          confidence_score?: number | null
          created_at?: string
          detected_issues?: Json | null
          email_ids?: string[]
          emails_count?: number | null
          id?: string
          input_hash?: string | null
          model?: string | null
          participants?: Json | null
          prompt_version?: string | null
          severity?: string | null
          thread_id?: string
          timeline?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      business_days_between: { Args: { a: string; b: string }; Returns: number }
      get_last_curatelle_contact: {
        Args: { p_curatelle_emails: string[]; p_user_id: string }
        Returns: {
          contact_recipient: string
          contact_sender: string
          last_contact_at: string
        }[]
      }
      get_users_with_gmail_sync: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_owns_email: { Args: { _email_id: string }; Returns: boolean }
      user_owns_training_pair: { Args: { _pair_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "auditor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "auditor"],
    },
  },
} as const
