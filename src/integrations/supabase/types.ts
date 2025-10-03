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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      legal_audit_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          case_id: string | null
          entity: string
          entity_id: string
          id: string
          ip_address: string | null
          timestamp: string
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          case_id?: string | null
          entity: string
          entity_id: string
          id?: string
          ip_address?: string | null
          timestamp?: string
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          case_id?: string | null
          entity?: string
          entity_id?: string
          id?: string
          ip_address?: string | null
          timestamp?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_audit_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_cases: {
        Row: {
          assignee_id: string | null
          case_type: Database["public"]["Enums"]["case_type"]
          confidential: boolean | null
          created_at: string
          created_by: string
          filed_at: string | null
          flags: Database["public"]["Enums"]["case_flag"][] | null
          id: string
          next_event_at: string | null
          number: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          related_case_ids: string[] | null
          relief_sought: string | null
          source: Database["public"]["Enums"]["case_source"]
          stage: string | null
          status: Database["public"]["Enums"]["case_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          case_type: Database["public"]["Enums"]["case_type"]
          confidential?: boolean | null
          created_at?: string
          created_by: string
          filed_at?: string | null
          flags?: Database["public"]["Enums"]["case_flag"][] | null
          id?: string
          next_event_at?: string | null
          number: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          related_case_ids?: string[] | null
          relief_sought?: string | null
          source: Database["public"]["Enums"]["case_source"]
          stage?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          case_type?: Database["public"]["Enums"]["case_type"]
          confidential?: boolean | null
          created_at?: string
          created_by?: string
          filed_at?: string | null
          flags?: Database["public"]["Enums"]["case_flag"][] | null
          id?: string
          next_event_at?: string | null
          number?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          related_case_ids?: string[] | null
          relief_sought?: string | null
          source?: Database["public"]["Enums"]["case_source"]
          stage?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_document_saved_searches: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          is_default?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_document_shares: {
        Row: {
          access_count: number | null
          access_token: string
          created_at: string | null
          created_by: string
          document_id: string
          expires_at: string
          id: string
          is_active: boolean | null
          max_access_count: number | null
          watermark_text: string | null
        }
        Insert: {
          access_count?: number | null
          access_token: string
          created_at?: string | null
          created_by: string
          document_id: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          max_access_count?: number | null
          watermark_text?: string | null
        }
        Update: {
          access_count?: number | null
          access_token?: string
          created_at?: string | null
          created_by?: string
          document_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_access_count?: number | null
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          case_id: string
          checksum: string | null
          confidential: boolean | null
          esign_envelope_id: string | null
          esign_provider: string | null
          esign_status: string | null
          file_path: string | null
          id: string
          linked_entities: string[] | null
          marked_as_evidence: boolean | null
          name: string
          ocr_text: string | null
          size: string | null
          tags: string[] | null
          template_id: string | null
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at: string
          uploaded_by: string
          url: string | null
          version: number | null
        }
        Insert: {
          case_id: string
          checksum?: string | null
          confidential?: boolean | null
          esign_envelope_id?: string | null
          esign_provider?: string | null
          esign_status?: string | null
          file_path?: string | null
          id?: string
          linked_entities?: string[] | null
          marked_as_evidence?: boolean | null
          name: string
          ocr_text?: string | null
          size?: string | null
          tags?: string[] | null
          template_id?: string | null
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
          uploaded_by: string
          url?: string | null
          version?: number | null
        }
        Update: {
          case_id?: string
          checksum?: string | null
          confidential?: boolean | null
          esign_envelope_id?: string | null
          esign_provider?: string | null
          esign_status?: string | null
          file_path?: string | null
          id?: string
          linked_entities?: string[] | null
          marked_as_evidence?: boolean | null
          name?: string
          ocr_text?: string | null
          size?: string | null
          tags?: string[] | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
          uploaded_by?: string
          url?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_hearings: {
        Row: {
          agenda: string | null
          attendance: Json | null
          case_id: string
          created_at: string | null
          created_by: string | null
          end_at: string
          id: string
          minutes_doc_id: string | null
          outcome: string | null
          panel: string[] | null
          recording_link: string | null
          start_at: string
          type: string
          venue: string
        }
        Insert: {
          agenda?: string | null
          attendance?: Json | null
          case_id: string
          created_at?: string | null
          created_by?: string | null
          end_at: string
          id?: string
          minutes_doc_id?: string | null
          outcome?: string | null
          panel?: string[] | null
          recording_link?: string | null
          start_at: string
          type: string
          venue: string
        }
        Update: {
          agenda?: string | null
          attendance?: Json | null
          case_id?: string
          created_at?: string | null
          created_by?: string | null
          end_at?: string
          id?: string
          minutes_doc_id?: string | null
          outcome?: string | null
          panel?: string[] | null
          recording_link?: string | null
          start_at?: string
          type?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_hearings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_orders: {
        Row: {
          case_id: string
          compliance_due: string | null
          created_at: string | null
          created_by: string | null
          directives: string | null
          draft_html: string | null
          findings: string | null
          id: string
          number: string | null
          published_at: string | null
          published_pdf_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          case_id: string
          compliance_due?: string | null
          created_at?: string | null
          created_by?: string | null
          directives?: string | null
          draft_html?: string | null
          findings?: string | null
          id?: string
          number?: string | null
          published_at?: string | null
          published_pdf_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          case_id?: string
          compliance_due?: string | null
          created_at?: string | null
          created_by?: string | null
          directives?: string | null
          draft_html?: string | null
          findings?: string | null
          id?: string
          number?: string | null
          published_at?: string | null
          published_pdf_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_orders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_parties: {
        Row: {
          address: string | null
          case_id: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          registry_ref: string | null
          registry_type: string | null
          representative_id: string | null
          role: Database["public"]["Enums"]["party_role"]
          service_date: string | null
          service_method: string | null
          service_status: Database["public"]["Enums"]["service_status"] | null
        }
        Insert: {
          address?: string | null
          case_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          registry_ref?: string | null
          registry_type?: string | null
          representative_id?: string | null
          role: Database["public"]["Enums"]["party_role"]
          service_date?: string | null
          service_method?: string | null
          service_status?: Database["public"]["Enums"]["service_status"] | null
        }
        Update: {
          address?: string | null
          case_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          registry_ref?: string | null
          registry_type?: string | null
          representative_id?: string | null
          role?: Database["public"]["Enums"]["party_role"]
          service_date?: string | null
          service_method?: string | null
          service_status?: Database["public"]["Enums"]["service_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_parties_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "legal_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_penalties: {
        Row: {
          amount: number
          case_id: string
          created_at: string | null
          currency: string | null
          due_on: string
          id: string
          order_id: string | null
          payments: Json | null
          status: Database["public"]["Enums"]["penalty_status"] | null
          type: string
        }
        Insert: {
          amount: number
          case_id: string
          created_at?: string | null
          currency?: string | null
          due_on: string
          id?: string
          order_id?: string | null
          payments?: Json | null
          status?: Database["public"]["Enums"]["penalty_status"] | null
          type: string
        }
        Update: {
          amount?: number
          case_id?: string
          created_at?: string | null
          currency?: string | null
          due_on?: string
          id?: string
          order_id?: string | null
          payments?: Json | null
          status?: Database["public"]["Enums"]["penalty_status"] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_penalties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_penalties_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "legal_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_saved_views: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          is_default?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_settlements: {
        Row: {
          case_id: string
          created_at: string | null
          created_by: string | null
          id: string
          payment_plan: Json | null
          status: Database["public"]["Enums"]["settlement_status"] | null
          terms: string
        }
        Insert: {
          case_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          payment_plan?: Json | null
          status?: Database["public"]["Enums"]["settlement_status"] | null
          terms: string
        }
        Update: {
          case_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          payment_plan?: Json | null
          status?: Database["public"]["Enums"]["settlement_status"] | null
          terms?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_settlements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_tasks: {
        Row: {
          case_id: string
          checklist: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_on: string | null
          id: string
          owner_id: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          recurrence: string | null
          related_entity: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
        }
        Insert: {
          case_id: string
          checklist?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_on?: string | null
          id?: string
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          recurrence?: string | null
          related_entity?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
        }
        Update: {
          case_id?: string
          checklist?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_on?: string | null
          id?: string
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          recurrence?: string | null
          related_entity?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_timeline_events: {
        Row: {
          actor_id: string | null
          actor_name: string
          case_id: string
          description: string
          id: string
          metadata: Json | null
          timestamp: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_name: string
          case_id: string
          description: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          case_id?: string
          description?: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_timeline_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "Clerk"
        | "LegalOfficer"
        | "Supervisor"
        | "FinanceOfficer"
        | "ReadOnly"
        | "Admin"
      case_flag:
        | "Urgent"
        | "Escalated"
        | "On Hold"
        | "Confidential"
        | "External Counsel"
      case_source: "Complaint" | "Referral" | "System" | "Audit"
      case_status:
        | "Draft"
        | "Filed"
        | "Under Review"
        | "Hearing Scheduled"
        | "Hearing Held"
        | "Decision Pending"
        | "Order Issued"
        | "Closed – Compliant"
        | "Closed – Non-Compliant"
        | "Withdrawn"
        | "Appealed"
        | "Reopened"
      case_type:
        | "Prosecution"
        | "Compliance"
        | "Appeal"
        | "Recovery"
        | "Employer Dispute"
        | "IP Dispute"
        | "Garnishment"
        | "Other"
      document_type:
        | "Filings"
        | "Evidence"
        | "Notices"
        | "Orders"
        | "Correspondence"
        | "Internal"
      order_status: "Draft" | "Under Review" | "Approved" | "Published"
      party_role:
        | "Primary Respondent"
        | "Complainant"
        | "Representative"
        | "Third Party"
      penalty_status: "Pending" | "Paid" | "Overdue" | "Waived"
      priority_level: "Low" | "Medium" | "High" | "Urgent"
      service_status: "Not Served" | "Served" | "Service Failed"
      settlement_status: "Proposed" | "Accepted" | "Rejected" | "Completed"
      task_status: "Open" | "In Progress" | "Completed" | "Deferred"
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
      app_role: [
        "Clerk",
        "LegalOfficer",
        "Supervisor",
        "FinanceOfficer",
        "ReadOnly",
        "Admin",
      ],
      case_flag: [
        "Urgent",
        "Escalated",
        "On Hold",
        "Confidential",
        "External Counsel",
      ],
      case_source: ["Complaint", "Referral", "System", "Audit"],
      case_status: [
        "Draft",
        "Filed",
        "Under Review",
        "Hearing Scheduled",
        "Hearing Held",
        "Decision Pending",
        "Order Issued",
        "Closed – Compliant",
        "Closed – Non-Compliant",
        "Withdrawn",
        "Appealed",
        "Reopened",
      ],
      case_type: [
        "Prosecution",
        "Compliance",
        "Appeal",
        "Recovery",
        "Employer Dispute",
        "IP Dispute",
        "Garnishment",
        "Other",
      ],
      document_type: [
        "Filings",
        "Evidence",
        "Notices",
        "Orders",
        "Correspondence",
        "Internal",
      ],
      order_status: ["Draft", "Under Review", "Approved", "Published"],
      party_role: [
        "Primary Respondent",
        "Complainant",
        "Representative",
        "Third Party",
      ],
      penalty_status: ["Pending", "Paid", "Overdue", "Waived"],
      priority_level: ["Low", "Medium", "High", "Urgent"],
      service_status: ["Not Served", "Served", "Service Failed"],
      settlement_status: ["Proposed", "Accepted", "Rejected", "Completed"],
      task_status: ["Open", "In Progress", "Completed", "Deferred"],
    },
  },
} as const
