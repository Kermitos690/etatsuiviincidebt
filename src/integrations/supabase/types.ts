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
      emails: {
        Row: {
          ai_analysis: Json | null
          body: string
          created_at: string
          email_type: string | null
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
        }
        Insert: {
          ai_analysis?: Json | null
          body: string
          created_at?: string
          email_type?: string | null
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
        }
        Update: {
          ai_analysis?: Json | null
          body?: string
          created_at?: string
          email_type?: string | null
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
        }
        Relationships: []
      }
      gmail_config: {
        Row: {
          access_token: string
          created_at: string | null
          domains: string[] | null
          id: string
          keywords: string[] | null
          last_sync: string | null
          refresh_token: string | null
          sync_enabled: boolean | null
          token_expiry: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          domains?: string[] | null
          id?: string
          keywords?: string[] | null
          last_sync?: string | null
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expiry?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          domains?: string[] | null
          id?: string
          keywords?: string[] | null
          last_sync?: string | null
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expiry?: string | null
          updated_at?: string | null
          user_email?: string
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
          score: number
          statut: string
          titre: string
          transmis_jp: boolean
          type: string
          updated_at: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          date_creation?: string
          date_incident: string
          date_transmission_jp?: string | null
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
          score?: number
          statut?: string
          titre: string
          transmis_jp?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          date_creation?: string
          date_incident?: string
          date_transmission_jp?: string | null
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
          score?: number
          statut?: string
          titre?: string
          transmis_jp?: boolean
          type?: string
          updated_at?: string
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
          violations_count?: number
        }
        Relationships: []
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
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
