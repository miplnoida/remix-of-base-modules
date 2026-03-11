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
      api_config_audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          entity_id: string
          entity_type: string
          field_name: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          entity_id: string
          entity_type: string
          field_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          entity_id?: string
          entity_type?: string
          field_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      api_key_scope_assignments: {
        Row: {
          api_key_id: string
          api_registry_id: string
          created_at: string
          created_by: string | null
          id: string
          is_allowed: boolean
        }
        Insert: {
          api_key_id: string
          api_registry_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_allowed?: boolean
        }
        Update: {
          api_key_id?: string
          api_registry_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_allowed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "api_key_scope_assignments_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "public_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_key_scope_assignments_api_registry_id_fkey"
            columns: ["api_registry_id"]
            isOneToOne: false
            referencedRelation: "api_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      api_logs: {
        Row: {
          api_name: string
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          endpoint_url: string | null
          error_message: string | null
          execution_timestamp: string
          http_method: string | null
          id: string
          is_success: boolean | null
          module: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          request_headers: Json | null
          request_payload: Json | null
          response_body: Json | null
          response_status: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          api_name: string
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint_url?: string | null
          error_message?: string | null
          execution_timestamp?: string
          http_method?: string | null
          id?: string
          is_success?: boolean | null
          module?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          request_headers?: Json | null
          request_payload?: Json | null
          response_body?: Json | null
          response_status?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          api_name?: string
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint_url?: string | null
          error_message?: string | null
          execution_timestamp?: string
          http_method?: string | null
          id?: string
          is_success?: boolean | null
          module?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          request_headers?: Json | null
          request_payload?: Json | null
          response_body?: Json | null
          response_status?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_rate_limit_policies: {
        Row: {
          burst_limit: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          policy_name: string
          requests_per_day: number | null
          requests_per_hour: number | null
          requests_per_minute: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          burst_limit?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          policy_name: string
          requests_per_day?: number | null
          requests_per_hour?: number | null
          requests_per_minute?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          burst_limit?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          policy_name?: string
          requests_per_day?: number | null
          requests_per_hour?: number | null
          requests_per_minute?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      api_registry: {
        Row: {
          api_name: string
          api_version: string
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          endpoint_path: string
          http_method: string
          id: string
          is_enabled: boolean
          rate_limit_override: number | null
          requires_auth: boolean
          sort_order: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_name: string
          api_version?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          endpoint_path: string
          http_method?: string
          id?: string
          is_enabled?: boolean
          rate_limit_override?: number | null
          requires_auth?: boolean
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_name?: string
          api_version?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          endpoint_path?: string
          http_method?: string
          id?: string
          is_enabled?: boolean
          rate_limit_override?: number | null
          requires_auth?: boolean
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      api_settings: {
        Row: {
          api_key: string | null
          base_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          header_name: string | null
          id: string
          is_active: boolean | null
          linked_module: string | null
          setting_key: string
          setting_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          header_name?: string | null
          id?: string
          is_active?: boolean | null
          linked_module?: string | null
          setting_key: string
          setting_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          header_name?: string | null
          id?: string
          is_active?: boolean | null
          linked_module?: string | null
          setting_key?: string
          setting_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_lockdown_state: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          locked_reason: string | null
          unlock_reason: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          unlock_reason?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_modules: {
        Row: {
          business_key_column: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_enabled: boolean | null
          name: string
          parent_id: string | null
          primary_key_column: string | null
          primary_table: string | null
          route: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          business_key_column?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          parent_id?: string | null
          primary_key_column?: string | null
          primary_table?: string | null
          route?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          business_key_column?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          parent_id?: string | null
          primary_key_column?: string | null
          primary_table?: string | null
          route?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_modules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      au_ip_last_self_emp: {
        Row: {
          action: string | null
          audit_id: number
          date_issued: string | null
          modified_date: string | null
          modifier: string | null
          self_ref_no: string | null
        }
        Insert: {
          action?: string | null
          audit_id?: never
          date_issued?: string | null
          modified_date?: string | null
          modifier?: string | null
          self_ref_no?: string | null
        }
        Update: {
          action?: string | null
          audit_id?: never
          date_issued?: string | null
          modified_date?: string | null
          modifier?: string | null
          self_ref_no?: string | null
        }
        Relationships: []
      }
      au_ip_self_employ: {
        Row: {
          action: string | null
          activity_seq_no: string | null
          activity_type: string | null
          arrears: string | null
          audit_id: number
          date_ceased: string | null
          date_commenced: string | null
          date_educated: string | null
          date_modified: string | null
          date_of_application: string | null
          date_of_entry: string | null
          date_of_issue: string | null
          date_verified: string | null
          entered_by: string | null
          fax: string | null
          industrial_code: string | null
          inspector_code: string | null
          inspector_name: string | null
          legal_action: string | null
          modified_date: string | null
          modifier: string | null
          occupation_code: string | null
          office_code: string | null
          persons_employed: number | null
          phone: string | null
          sector_code: string | null
          self_edu: string | null
          self_guide: string | null
          self_maddr1: string | null
          self_maddr2: string | null
          self_paddr1: string | null
          self_paddr2: string | null
          self_ref_no: string | null
          ssn: string | null
          status: string | null
          userid: string | null
          verified_by: string | null
          village_code: string | null
        }
        Insert: {
          action?: string | null
          activity_seq_no?: string | null
          activity_type?: string | null
          arrears?: string | null
          audit_id?: never
          date_ceased?: string | null
          date_commenced?: string | null
          date_educated?: string | null
          date_modified?: string | null
          date_of_application?: string | null
          date_of_entry?: string | null
          date_of_issue?: string | null
          date_verified?: string | null
          entered_by?: string | null
          fax?: string | null
          industrial_code?: string | null
          inspector_code?: string | null
          inspector_name?: string | null
          legal_action?: string | null
          modified_date?: string | null
          modifier?: string | null
          occupation_code?: string | null
          office_code?: string | null
          persons_employed?: number | null
          phone?: string | null
          sector_code?: string | null
          self_edu?: string | null
          self_guide?: string | null
          self_maddr1?: string | null
          self_maddr2?: string | null
          self_paddr1?: string | null
          self_paddr2?: string | null
          self_ref_no?: string | null
          ssn?: string | null
          status?: string | null
          userid?: string | null
          verified_by?: string | null
          village_code?: string | null
        }
        Update: {
          action?: string | null
          activity_seq_no?: string | null
          activity_type?: string | null
          arrears?: string | null
          audit_id?: never
          date_ceased?: string | null
          date_commenced?: string | null
          date_educated?: string | null
          date_modified?: string | null
          date_of_application?: string | null
          date_of_entry?: string | null
          date_of_issue?: string | null
          date_verified?: string | null
          entered_by?: string | null
          fax?: string | null
          industrial_code?: string | null
          inspector_code?: string | null
          inspector_name?: string | null
          legal_action?: string | null
          modified_date?: string | null
          modifier?: string | null
          occupation_code?: string | null
          office_code?: string | null
          persons_employed?: number | null
          phone?: string | null
          sector_code?: string | null
          self_edu?: string | null
          self_guide?: string | null
          self_maddr1?: string | null
          self_maddr2?: string | null
          self_paddr1?: string | null
          self_paddr2?: string | null
          self_ref_no?: string | null
          ssn?: string | null
          status?: string | null
          userid?: string | null
          verified_by?: string | null
          village_code?: string | null
        }
        Relationships: []
      }
      audit_interviews: {
        Row: {
          audit_id: string | null
          created_at: string | null
          discrepancies: string | null
          employee_name: string | null
          employee_ssn: string | null
          id: string
          interview_date: string | null
          interviewer_id: string | null
          notes: string | null
          position: string | null
          signature_data: string | null
          wages_claimed: number | null
          weeks_worked: number | null
        }
        Insert: {
          audit_id?: string | null
          created_at?: string | null
          discrepancies?: string | null
          employee_name?: string | null
          employee_ssn?: string | null
          id?: string
          interview_date?: string | null
          interviewer_id?: string | null
          notes?: string | null
          position?: string | null
          signature_data?: string | null
          wages_claimed?: number | null
          weeks_worked?: number | null
        }
        Update: {
          audit_id?: string | null
          created_at?: string | null
          discrepancies?: string | null
          employee_name?: string | null
          employee_ssn?: string | null
          id?: string
          interview_date?: string | null
          interviewer_id?: string | null
          notes?: string | null
          position?: string | null
          signature_data?: string | null
          wages_claimed?: number | null
          weeks_worked?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_interviews_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "compliance_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          field_name: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          module_name: string | null
          new_value: string | null
          old_value: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          field_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module_name?: string | null
          new_value?: string | null
          old_value?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          field_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module_name?: string | null
          new_value?: string | null
          old_value?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      bema_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bema_arrears_ledger: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          due_date: string | null
          ei_owed: number | null
          employer_id: string
          escalated_to_legal: boolean | null
          escalation_date: string | null
          id: string
          interest: number | null
          is_estimated: boolean | null
          last_payment_date: string | null
          levy_owed: number | null
          outstanding_balance: number | null
          payment_plan_id: string | null
          penalties: number | null
          period: string
          period_type: string | null
          ss_owed: number | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string | null
          ei_owed?: number | null
          employer_id: string
          escalated_to_legal?: boolean | null
          escalation_date?: string | null
          id?: string
          interest?: number | null
          is_estimated?: boolean | null
          last_payment_date?: string | null
          levy_owed?: number | null
          outstanding_balance?: number | null
          payment_plan_id?: string | null
          penalties?: number | null
          period: string
          period_type?: string | null
          ss_owed?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string | null
          ei_owed?: number | null
          employer_id?: string
          escalated_to_legal?: boolean | null
          escalation_date?: string | null
          id?: string
          interest?: number | null
          is_estimated?: boolean | null
          last_payment_date?: string | null
          levy_owed?: number | null
          outstanding_balance?: number | null
          payment_plan_id?: string | null
          penalties?: number | null
          period?: string
          period_type?: string | null
          ss_owed?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bema_audit_cases: {
        Row: {
          assigned_at: string | null
          assigned_inspector_id: string | null
          audit_type: Database["public"]["Enums"]["bema_audit_type"]
          case_number: string | null
          closed_at: string | null
          complaint_details: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          employees_interviewed: number | null
          employer_id: string
          employer_name: string | null
          escalated_to_legal: boolean | null
          escalation_date: string | null
          evidence_documents: Json | null
          findings: string | null
          id: string
          interview_notes: Json | null
          outcome: string | null
          penalty_approved: number | null
          penalty_recommended: number | null
          referral_source: string | null
          source_description: string | null
          status: Database["public"]["Enums"]["bema_audit_status"] | null
          updated_at: string | null
          wage_book_images: Json | null
          wage_books_reviewed: boolean | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_inspector_id?: string | null
          audit_type: Database["public"]["Enums"]["bema_audit_type"]
          case_number?: string | null
          closed_at?: string | null
          complaint_details?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          employees_interviewed?: number | null
          employer_id: string
          employer_name?: string | null
          escalated_to_legal?: boolean | null
          escalation_date?: string | null
          evidence_documents?: Json | null
          findings?: string | null
          id?: string
          interview_notes?: Json | null
          outcome?: string | null
          penalty_approved?: number | null
          penalty_recommended?: number | null
          referral_source?: string | null
          source_description?: string | null
          status?: Database["public"]["Enums"]["bema_audit_status"] | null
          updated_at?: string | null
          wage_book_images?: Json | null
          wage_books_reviewed?: boolean | null
        }
        Update: {
          assigned_at?: string | null
          assigned_inspector_id?: string | null
          audit_type?: Database["public"]["Enums"]["bema_audit_type"]
          case_number?: string | null
          closed_at?: string | null
          complaint_details?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          employees_interviewed?: number | null
          employer_id?: string
          employer_name?: string | null
          escalated_to_legal?: boolean | null
          escalation_date?: string | null
          evidence_documents?: Json | null
          findings?: string | null
          id?: string
          interview_notes?: Json | null
          outcome?: string | null
          penalty_approved?: number | null
          penalty_recommended?: number | null
          referral_source?: string | null
          source_description?: string | null
          status?: Database["public"]["Enums"]["bema_audit_status"] | null
          updated_at?: string | null
          wage_book_images?: Json | null
          wage_books_reviewed?: boolean | null
        }
        Relationships: []
      }
      bema_c3_line_items: {
        Row: {
          c3_id: string | null
          created_at: string | null
          ei_contribution: number | null
          employee_name: string | null
          employee_ssn: string | null
          holidays: number | null
          id: string
          invalid_ssn: boolean | null
          levy_contribution: number | null
          line_number: number | null
          over_age: boolean | null
          overtime: number | null
          ss_contribution: number | null
          under_age: boolean | null
          wages_paid: number | null
          weeks_worked: number | null
        }
        Insert: {
          c3_id?: string | null
          created_at?: string | null
          ei_contribution?: number | null
          employee_name?: string | null
          employee_ssn?: string | null
          holidays?: number | null
          id?: string
          invalid_ssn?: boolean | null
          levy_contribution?: number | null
          line_number?: number | null
          over_age?: boolean | null
          overtime?: number | null
          ss_contribution?: number | null
          under_age?: boolean | null
          wages_paid?: number | null
          weeks_worked?: number | null
        }
        Update: {
          c3_id?: string | null
          created_at?: string | null
          ei_contribution?: number | null
          employee_name?: string | null
          employee_ssn?: string | null
          holidays?: number | null
          id?: string
          invalid_ssn?: boolean | null
          levy_contribution?: number | null
          line_number?: number | null
          over_age?: boolean | null
          overtime?: number | null
          ss_contribution?: number | null
          under_age?: boolean | null
          wages_paid?: number | null
          weeks_worked?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bema_c3_line_items_c3_id_fkey"
            columns: ["c3_id"]
            isOneToOne: false
            referencedRelation: "bema_c3_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      bema_c3_submissions: {
        Row: {
          attachments: Json | null
          c3_number: string | null
          created_at: string | null
          employer_id: string
          filing_period: string
          id: string
          payment_amount: number | null
          payment_date: string | null
          payment_received: boolean | null
          payment_reference: string | null
          posted_at: string | null
          query_raised: boolean | null
          query_resolved_at: string | null
          query_response: string | null
          query_text: string | null
          scanned_document_url: string | null
          status: Database["public"]["Enums"]["bema_c3_status"] | null
          submission_method: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_ei_contribution: number | null
          total_employees: number | null
          total_levy_contribution: number | null
          total_ss_contribution: number | null
          total_wages: number | null
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
          validation_errors: Json | null
          validation_warnings: Json | null
        }
        Insert: {
          attachments?: Json | null
          c3_number?: string | null
          created_at?: string | null
          employer_id: string
          filing_period: string
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_received?: boolean | null
          payment_reference?: string | null
          posted_at?: string | null
          query_raised?: boolean | null
          query_resolved_at?: string | null
          query_response?: string | null
          query_text?: string | null
          scanned_document_url?: string | null
          status?: Database["public"]["Enums"]["bema_c3_status"] | null
          submission_method?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_ei_contribution?: number | null
          total_employees?: number | null
          total_levy_contribution?: number | null
          total_ss_contribution?: number | null
          total_wages?: number | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_errors?: Json | null
          validation_warnings?: Json | null
        }
        Update: {
          attachments?: Json | null
          c3_number?: string | null
          created_at?: string | null
          employer_id?: string
          filing_period?: string
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_received?: boolean | null
          payment_reference?: string | null
          posted_at?: string | null
          query_raised?: boolean | null
          query_resolved_at?: string | null
          query_response?: string | null
          query_text?: string | null
          scanned_document_url?: string | null
          status?: Database["public"]["Enums"]["bema_c3_status"] | null
          submission_method?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_ei_contribution?: number | null
          total_employees?: number | null
          total_levy_contribution?: number | null
          total_ss_contribution?: number | null
          total_wages?: number | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_errors?: Json | null
          validation_warnings?: Json | null
        }
        Relationships: []
      }
      bema_contributors: {
        Row: {
          active: boolean | null
          address: string | null
          category_change_count: number | null
          category_effective_date: string | null
          cessation_date: string | null
          contribution_category: Database["public"]["Enums"]["bema_category"]
          contributor_type: Database["public"]["Enums"]["bema_registration_type"]
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          enrollment_date: string | null
          full_name: string
          id: string
          last_category_change: string | null
          phone: string | null
          registration_id: string | null
          ssn: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          category_change_count?: number | null
          category_effective_date?: string | null
          cessation_date?: string | null
          contribution_category: Database["public"]["Enums"]["bema_category"]
          contributor_type: Database["public"]["Enums"]["bema_registration_type"]
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          full_name: string
          id?: string
          last_category_change?: string | null
          phone?: string | null
          registration_id?: string | null
          ssn?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          category_change_count?: number | null
          category_effective_date?: string | null
          cessation_date?: string | null
          contribution_category?: Database["public"]["Enums"]["bema_category"]
          contributor_type?: Database["public"]["Enums"]["bema_registration_type"]
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          full_name?: string
          id?: string
          last_category_change?: string | null
          phone?: string | null
          registration_id?: string | null
          ssn?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bema_contributors_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "bema_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      bema_employee_interviews: {
        Row: {
          audit_id: string | null
          created_at: string | null
          discrepancies: string | null
          employee_name: string | null
          employee_ssn: string | null
          id: string
          interview_date: string | null
          interviewer_id: string | null
          notes: string | null
          position: string | null
          signature_data: string | null
          wages_claimed: number | null
          weeks_worked: number | null
        }
        Insert: {
          audit_id?: string | null
          created_at?: string | null
          discrepancies?: string | null
          employee_name?: string | null
          employee_ssn?: string | null
          id?: string
          interview_date?: string | null
          interviewer_id?: string | null
          notes?: string | null
          position?: string | null
          signature_data?: string | null
          wages_claimed?: number | null
          weeks_worked?: number | null
        }
        Update: {
          audit_id?: string | null
          created_at?: string | null
          discrepancies?: string | null
          employee_name?: string | null
          employee_ssn?: string | null
          id?: string
          interview_date?: string | null
          interviewer_id?: string | null
          notes?: string | null
          position?: string | null
          signature_data?: string | null
          wages_claimed?: number | null
          weeks_worked?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bema_employee_interviews_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "bema_audit_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      bema_field_activities: {
        Row: {
          action_taken: string | null
          activity_date: string
          activity_type: Database["public"]["Enums"]["bema_inspector_activity"]
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          documents: Json | null
          employer_id: string | null
          employer_name: string | null
          employer_signature_data: string | null
          findings: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          inspector_id: string
          location_lat: number | null
          location_lng: number | null
          notice_served: boolean | null
          notice_type: string | null
          photos: Json | null
          purpose: string | null
          updated_at: string | null
        }
        Insert: {
          action_taken?: string | null
          activity_date: string
          activity_type: Database["public"]["Enums"]["bema_inspector_activity"]
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          documents?: Json | null
          employer_id?: string | null
          employer_name?: string | null
          employer_signature_data?: string | null
          findings?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspector_id: string
          location_lat?: number | null
          location_lng?: number | null
          notice_served?: boolean | null
          notice_type?: string | null
          photos?: Json | null
          purpose?: string | null
          updated_at?: string | null
        }
        Update: {
          action_taken?: string | null
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["bema_inspector_activity"]
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          documents?: Json | null
          employer_id?: string | null
          employer_name?: string | null
          employer_signature_data?: string | null
          findings?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspector_id?: string
          location_lat?: number | null
          location_lng?: number | null
          notice_served?: boolean | null
          notice_type?: string | null
          photos?: Json | null
          purpose?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bema_inspector_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          id: string
          inspector_id: string
          is_primary: boolean | null
          zone_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          inspector_id: string
          is_primary?: boolean | null
          zone_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          inspector_id?: string
          is_primary?: boolean | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bema_inspector_assignments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "bema_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      bema_installments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          overdue: boolean | null
          paid: boolean | null
          paid_amount: number | null
          paid_date: string | null
          payment_plan_id: string | null
          payment_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          overdue?: boolean | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_plan_id?: string | null
          payment_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          overdue?: boolean | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_plan_id?: string | null
          payment_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bema_installments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "bema_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bema_payment_plans: {
        Row: {
          agreement_document_url: string | null
          agreement_signed: boolean | null
          broken_date: string | null
          broken_reason: string | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          employer_id: string
          escalated_at: string | null
          frequency: string
          id: string
          installment_amount: number
          installments_paid: number | null
          next_due_date: string | null
          number_of_installments: number
          signature_data: string | null
          signed_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["bema_plan_status"] | null
          terms: string | null
          total_debt: number
          total_paid: number | null
          updated_at: string | null
        }
        Insert: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          broken_date?: string | null
          broken_reason?: string | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          employer_id: string
          escalated_at?: string | null
          frequency: string
          id?: string
          installment_amount: number
          installments_paid?: number | null
          next_due_date?: string | null
          number_of_installments: number
          signature_data?: string | null
          signed_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["bema_plan_status"] | null
          terms?: string | null
          total_debt: number
          total_paid?: number | null
          updated_at?: string | null
        }
        Update: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          broken_date?: string | null
          broken_reason?: string | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          employer_id?: string
          escalated_at?: string | null
          frequency?: string
          id?: string
          installment_amount?: number
          installments_paid?: number | null
          next_due_date?: string | null
          number_of_installments?: number
          signature_data?: string | null
          signed_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["bema_plan_status"] | null
          terms?: string | null
          total_debt?: number
          total_paid?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bema_registrations: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_at: string | null
          assigned_inspector_id: string | null
          business_type: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          documents: Json | null
          education_completed: boolean | null
          education_date: string | null
          email: string | null
          employer_name: string | null
          id: string
          notes: string | null
          person_name: string | null
          phone: string | null
          registration_number: string | null
          registration_type: Database["public"]["Enums"]["bema_registration_type"]
          ssn: string | null
          status: Database["public"]["Enums"]["bema_registration_status"] | null
          tax_id: string | null
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_at?: string | null
          assigned_inspector_id?: string | null
          business_type?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          education_completed?: boolean | null
          education_date?: string | null
          email?: string | null
          employer_name?: string | null
          id?: string
          notes?: string | null
          person_name?: string | null
          phone?: string | null
          registration_number?: string | null
          registration_type: Database["public"]["Enums"]["bema_registration_type"]
          ssn?: string | null
          status?:
            | Database["public"]["Enums"]["bema_registration_status"]
            | null
          tax_id?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_at?: string | null
          assigned_inspector_id?: string | null
          business_type?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          education_completed?: boolean | null
          education_date?: string | null
          email?: string | null
          employer_name?: string | null
          id?: string
          notes?: string | null
          person_name?: string | null
          phone?: string | null
          registration_number?: string | null
          registration_type?: Database["public"]["Enums"]["bema_registration_type"]
          ssn?: string | null
          status?:
            | Database["public"]["Enums"]["bema_registration_status"]
            | null
          tax_id?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      bema_remittance_calendar: {
        Row: {
          auto_generate_voucher: boolean | null
          contributor_id: string | null
          created_at: string | null
          frequency: string
          id: string
          next_due_date: string
          updated_at: string | null
        }
        Insert: {
          auto_generate_voucher?: boolean | null
          contributor_id?: string | null
          created_at?: string | null
          frequency: string
          id?: string
          next_due_date: string
          updated_at?: string | null
        }
        Update: {
          auto_generate_voucher?: boolean | null
          contributor_id?: string | null
          created_at?: string | null
          frequency?: string
          id?: string
          next_due_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bema_remittance_calendar_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "bema_contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      bema_vouchers: {
        Row: {
          amount_due: number
          contribution_category: Database["public"]["Enums"]["bema_category"]
          contributor_id: string | null
          created_at: string | null
          generated_by: string | null
          id: string
          is_prorated: boolean | null
          overdue: boolean | null
          paid: boolean | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          proration_details: string | null
          reminder_date: string | null
          reminder_sent: boolean | null
          updated_at: string | null
          voucher_number: string | null
        }
        Insert: {
          amount_due: number
          contribution_category: Database["public"]["Enums"]["bema_category"]
          contributor_id?: string | null
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_prorated?: boolean | null
          overdue?: boolean | null
          paid?: boolean | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          proration_details?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          updated_at?: string | null
          voucher_number?: string | null
        }
        Update: {
          amount_due?: number
          contribution_category?: Database["public"]["Enums"]["bema_category"]
          contributor_id?: string | null
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_prorated?: boolean | null
          overdue?: boolean | null
          paid?: boolean | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          proration_details?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          updated_at?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bema_vouchers_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "bema_contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      bema_waivers: {
        Row: {
          agreement_document_url: string | null
          agreement_signed: boolean | null
          amount_requested: number
          approved_amount: number | null
          case_reference: string | null
          conditions: string | null
          created_at: string | null
          director_approved: boolean | null
          director_approved_at: string | null
          director_comments: string | null
          director_decision: string | null
          director_id: string | null
          employer_id: string | null
          id: string
          interest_to_waive: number | null
          justification: string
          legal_comments: string | null
          legal_decision: string | null
          legal_officer_id: string | null
          legal_reviewed: boolean | null
          legal_reviewed_at: string | null
          manager_comments: string | null
          manager_decision: string | null
          manager_id: string | null
          manager_reviewed: boolean | null
          manager_reviewed_at: string | null
          penalties_to_waive: number | null
          requested_at: string | null
          requested_by: string | null
          signature_data: string | null
          status: Database["public"]["Enums"]["bema_waiver_status"] | null
          supporting_documents: Json | null
          updated_at: string | null
          waiver_number: string | null
        }
        Insert: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          amount_requested: number
          approved_amount?: number | null
          case_reference?: string | null
          conditions?: string | null
          created_at?: string | null
          director_approved?: boolean | null
          director_approved_at?: string | null
          director_comments?: string | null
          director_decision?: string | null
          director_id?: string | null
          employer_id?: string | null
          id?: string
          interest_to_waive?: number | null
          justification: string
          legal_comments?: string | null
          legal_decision?: string | null
          legal_officer_id?: string | null
          legal_reviewed?: boolean | null
          legal_reviewed_at?: string | null
          manager_comments?: string | null
          manager_decision?: string | null
          manager_id?: string | null
          manager_reviewed?: boolean | null
          manager_reviewed_at?: string | null
          penalties_to_waive?: number | null
          requested_at?: string | null
          requested_by?: string | null
          signature_data?: string | null
          status?: Database["public"]["Enums"]["bema_waiver_status"] | null
          supporting_documents?: Json | null
          updated_at?: string | null
          waiver_number?: string | null
        }
        Update: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          amount_requested?: number
          approved_amount?: number | null
          case_reference?: string | null
          conditions?: string | null
          created_at?: string | null
          director_approved?: boolean | null
          director_approved_at?: string | null
          director_comments?: string | null
          director_decision?: string | null
          director_id?: string | null
          employer_id?: string | null
          id?: string
          interest_to_waive?: number | null
          justification?: string
          legal_comments?: string | null
          legal_decision?: string | null
          legal_officer_id?: string | null
          legal_reviewed?: boolean | null
          legal_reviewed_at?: string | null
          manager_comments?: string | null
          manager_decision?: string | null
          manager_id?: string | null
          manager_reviewed?: boolean | null
          manager_reviewed_at?: string | null
          penalties_to_waive?: number | null
          requested_at?: string | null
          requested_by?: string | null
          signature_data?: string | null
          status?: Database["public"]["Enums"]["bema_waiver_status"] | null
          supporting_documents?: Json | null
          updated_at?: string | null
          waiver_number?: string | null
        }
        Relationships: []
      }
      bema_weekly_plans: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          inspector_id: string
          planned_activities: Json | null
          submitted: boolean | null
          submitted_at: string | null
          updated_at: string | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          inspector_id: string
          planned_activities?: Json | null
          submitted?: boolean | null
          submitted_at?: string | null
          updated_at?: string | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          inspector_id?: string
          planned_activities?: Json | null
          submitted?: boolean | null
          submitted_at?: string | null
          updated_at?: string | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
      bema_zones: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          parishes: string[] | null
          updated_at: string | null
          zone_code: string | null
          zone_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          parishes?: string[] | null
          updated_at?: string | null
          zone_code?: string | null
          zone_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          parishes?: string[] | null
          updated_at?: string | null
          zone_code?: string | null
          zone_name?: string
        }
        Relationships: []
      }
      c3_bonus_policy_default: {
        Row: {
          calc_flat_enabled: boolean
          calc_flat_percentage: number | null
          calc_slab_enabled: boolean
          calculation_method: string
          contrib_eir: boolean
          contrib_employee: boolean
          contrib_employer: boolean
          contrib_severance: boolean
          created_by: string | null
          created_on: string
          date_from: string
          date_to: string | null
          distribution: Json
          id: string
          include_in_levy: boolean
          include_in_severance: boolean
          is_active: boolean
          last_published_at: string | null
          max_bonus_amount: number | null
          min_bonus_amount: number | null
          modified_by: string | null
          modified_on: string
        }
        Insert: {
          calc_flat_enabled?: boolean
          calc_flat_percentage?: number | null
          calc_slab_enabled?: boolean
          calculation_method?: string
          contrib_eir?: boolean
          contrib_employee?: boolean
          contrib_employer?: boolean
          contrib_severance?: boolean
          created_by?: string | null
          created_on?: string
          date_from?: string
          date_to?: string | null
          distribution?: Json
          id?: string
          include_in_levy?: boolean
          include_in_severance?: boolean
          is_active?: boolean
          last_published_at?: string | null
          max_bonus_amount?: number | null
          min_bonus_amount?: number | null
          modified_by?: string | null
          modified_on?: string
        }
        Update: {
          calc_flat_enabled?: boolean
          calc_flat_percentage?: number | null
          calc_slab_enabled?: boolean
          calculation_method?: string
          contrib_eir?: boolean
          contrib_employee?: boolean
          contrib_employer?: boolean
          contrib_severance?: boolean
          created_by?: string | null
          created_on?: string
          date_from?: string
          date_to?: string | null
          distribution?: Json
          id?: string
          include_in_levy?: boolean
          include_in_severance?: boolean
          is_active?: boolean
          last_published_at?: string | null
          max_bonus_amount?: number | null
          min_bonus_amount?: number | null
          modified_by?: string | null
          modified_on?: string
        }
        Relationships: []
      }
      c3_bonus_policy_exceptions: {
        Row: {
          calc_flat_enabled: boolean | null
          calc_flat_percentage: number | null
          calc_slab_enabled: boolean | null
          calculation_method: string | null
          contrib_eir: boolean | null
          contrib_employee: boolean | null
          contrib_employer: boolean | null
          contrib_severance: boolean | null
          created_by: string | null
          created_on: string
          date_from: string
          date_to: string | null
          description: string | null
          distribution: Json | null
          exception_month: number
          exception_type: string
          id: string
          include_in_levy: boolean | null
          include_in_severance: boolean | null
          is_active: boolean
          last_published_at: string | null
          max_bonus_amount: number | null
          min_bonus_amount: number | null
          modified_by: string | null
          modified_on: string
          override_default: boolean
          year_from: number
          year_to: number | null
        }
        Insert: {
          calc_flat_enabled?: boolean | null
          calc_flat_percentage?: number | null
          calc_slab_enabled?: boolean | null
          calculation_method?: string | null
          contrib_eir?: boolean | null
          contrib_employee?: boolean | null
          contrib_employer?: boolean | null
          contrib_severance?: boolean | null
          created_by?: string | null
          created_on?: string
          date_from: string
          date_to?: string | null
          description?: string | null
          distribution?: Json | null
          exception_month?: number
          exception_type?: string
          id?: string
          include_in_levy?: boolean | null
          include_in_severance?: boolean | null
          is_active?: boolean
          last_published_at?: string | null
          max_bonus_amount?: number | null
          min_bonus_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          override_default?: boolean
          year_from?: number
          year_to?: number | null
        }
        Update: {
          calc_flat_enabled?: boolean | null
          calc_flat_percentage?: number | null
          calc_slab_enabled?: boolean | null
          calculation_method?: string | null
          contrib_eir?: boolean | null
          contrib_employee?: boolean | null
          contrib_employer?: boolean | null
          contrib_severance?: boolean | null
          created_by?: string | null
          created_on?: string
          date_from?: string
          date_to?: string | null
          description?: string | null
          distribution?: Json | null
          exception_month?: number
          exception_type?: string
          id?: string
          include_in_levy?: boolean | null
          include_in_severance?: boolean | null
          is_active?: boolean
          last_published_at?: string | null
          max_bonus_amount?: number | null
          min_bonus_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          override_default?: boolean
          year_from?: number
          year_to?: number | null
        }
        Relationships: []
      }
      c3_calculation_config: {
        Row: {
          category: string
          config_key: string
          config_type: string
          config_value: number
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          display_order: number | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          config_key: string
          config_type?: string
          config_value: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          display_order?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_type?: string
          config_value?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          display_order?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      c3_calculation_config_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          config_id: string | null
          config_key: string
          id: string
          new_value: number | null
          old_value: number | null
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          config_id?: string | null
          config_key: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          config_id?: string | null
          config_key?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "c3_calculation_config_audit_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "c3_calculation_config"
            referencedColumns: ["id"]
          },
        ]
      }
      c3_config_audit: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          config_period_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          config_period_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          config_period_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "c3_config_audit_config_period_id_fkey"
            columns: ["config_period_id"]
            isOneToOne: false
            referencedRelation: "c3_config_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      c3_config_details: {
        Row: {
          config_period_id: string
          created_by: string | null
          created_on: string | null
          employee_ss_max_wage: number | null
          employee_ss_rate: number | null
          employer_eib_max_wage: number
          employer_eib_rate: number | null
          employer_levy_rate: number | null
          employer_severance_rate: number | null
          employer_ss_max_wage: number | null
          employer_ss_rate: number | null
          id: string
          levy_monthly_threshold: number | null
          levy_penalty_initial_rate: number | null
          levy_penalty_subsequent_rate: number | null
          levy_slab_id: string | null
          levy_use_monthly_when_exceeded: boolean | null
          max_age_levy: number | null
          max_age_ss: number | null
          min_age_levy: number | null
          min_age_ss: number | null
          modified_by: string | null
          modified_on: string | null
          nwd_employee_levy_rate: number | null
          severance_penalty_initial_rate: number | null
          severance_penalty_subsequent_rate: number | null
          ss_fine_initial_rate: number | null
          ss_fine_subsequent_rate: number | null
          submission_due_day: number | null
        }
        Insert: {
          config_period_id: string
          created_by?: string | null
          created_on?: string | null
          employee_ss_max_wage?: number | null
          employee_ss_rate?: number | null
          employer_eib_max_wage?: number
          employer_eib_rate?: number | null
          employer_levy_rate?: number | null
          employer_severance_rate?: number | null
          employer_ss_max_wage?: number | null
          employer_ss_rate?: number | null
          id?: string
          levy_monthly_threshold?: number | null
          levy_penalty_initial_rate?: number | null
          levy_penalty_subsequent_rate?: number | null
          levy_slab_id?: string | null
          levy_use_monthly_when_exceeded?: boolean | null
          max_age_levy?: number | null
          max_age_ss?: number | null
          min_age_levy?: number | null
          min_age_ss?: number | null
          modified_by?: string | null
          modified_on?: string | null
          nwd_employee_levy_rate?: number | null
          severance_penalty_initial_rate?: number | null
          severance_penalty_subsequent_rate?: number | null
          ss_fine_initial_rate?: number | null
          ss_fine_subsequent_rate?: number | null
          submission_due_day?: number | null
        }
        Update: {
          config_period_id?: string
          created_by?: string | null
          created_on?: string | null
          employee_ss_max_wage?: number | null
          employee_ss_rate?: number | null
          employer_eib_max_wage?: number
          employer_eib_rate?: number | null
          employer_levy_rate?: number | null
          employer_severance_rate?: number | null
          employer_ss_max_wage?: number | null
          employer_ss_rate?: number | null
          id?: string
          levy_monthly_threshold?: number | null
          levy_penalty_initial_rate?: number | null
          levy_penalty_subsequent_rate?: number | null
          levy_slab_id?: string | null
          levy_use_monthly_when_exceeded?: boolean | null
          max_age_levy?: number | null
          max_age_ss?: number | null
          min_age_levy?: number | null
          min_age_ss?: number | null
          modified_by?: string | null
          modified_on?: string | null
          nwd_employee_levy_rate?: number | null
          severance_penalty_initial_rate?: number | null
          severance_penalty_subsequent_rate?: number | null
          ss_fine_initial_rate?: number | null
          ss_fine_subsequent_rate?: number | null
          submission_due_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "c3_config_details_config_period_id_fkey"
            columns: ["config_period_id"]
            isOneToOne: true
            referencedRelation: "c3_config_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "c3_config_details_levy_slab_id_fkey"
            columns: ["levy_slab_id"]
            isOneToOne: false
            referencedRelation: "tb_levy_slabs"
            referencedColumns: ["id"]
          },
        ]
      }
      c3_config_periods: {
        Row: {
          created_by: string | null
          created_on: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          last_published_at: string | null
          modified_by: string | null
          modified_on: string | null
          start_date: string
        }
        Insert: {
          created_by?: string | null
          created_on?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_published_at?: string | null
          modified_by?: string | null
          modified_on?: string | null
          start_date: string
        }
        Update: {
          created_by?: string | null
          created_on?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_published_at?: string | null
          modified_by?: string | null
          modified_on?: string | null
          start_date?: string
        }
        Relationships: []
      }
      c3_config_sync_log: {
        Row: {
          bonus_exceptions_count: number
          bonus_exemptions_count: number
          bonus_policies_count: number
          config_periods_count: number
          created_at: string
          error_message: string | null
          holiday_exceptions_count: number
          holiday_policies_count: number
          id: string
          levy_slabs_count: number
          payload: Json
          payload_hash: string
          published_at: string
          published_by: string | null
          response_data: Json | null
          status: string
          sync_version: string
        }
        Insert: {
          bonus_exceptions_count?: number
          bonus_exemptions_count?: number
          bonus_policies_count?: number
          config_periods_count?: number
          created_at?: string
          error_message?: string | null
          holiday_exceptions_count?: number
          holiday_policies_count?: number
          id?: string
          levy_slabs_count?: number
          payload: Json
          payload_hash: string
          published_at?: string
          published_by?: string | null
          response_data?: Json | null
          status?: string
          sync_version?: string
        }
        Update: {
          bonus_exceptions_count?: number
          bonus_exemptions_count?: number
          bonus_policies_count?: number
          config_periods_count?: number
          created_at?: string
          error_message?: string | null
          holiday_exceptions_count?: number
          holiday_policies_count?: number
          id?: string
          levy_slabs_count?: number
          payload?: Json
          payload_hash?: string
          published_at?: string
          published_by?: string | null
          response_data?: Json | null
          status?: string
          sync_version?: string
        }
        Relationships: []
      }
      c3_holiday_pay_policy_default: {
        Row: {
          created_by: string | null
          created_on: string
          date_from: string
          date_to: string | null
          distribution_enabled: boolean
          id: string
          include_in_severance: boolean
          is_active: boolean
          last_published_at: string | null
          levy_calc_flat_enabled: boolean
          levy_calc_flat_percentage: number | null
          levy_calc_slab_enabled: boolean
          levy_calculation_method: string
          levy_distribution: Json
          levy_include: boolean
          max_holiday_amount: number | null
          min_holiday_amount: number | null
          modified_by: string | null
          modified_on: string
          policy_type: string
          ssc_contrib_eib: boolean
          ssc_contrib_employee: boolean
          ssc_contrib_employer: boolean
          ssc_include: boolean
        }
        Insert: {
          created_by?: string | null
          created_on?: string
          date_from?: string
          date_to?: string | null
          distribution_enabled?: boolean
          id?: string
          include_in_severance?: boolean
          is_active?: boolean
          last_published_at?: string | null
          levy_calc_flat_enabled?: boolean
          levy_calc_flat_percentage?: number | null
          levy_calc_slab_enabled?: boolean
          levy_calculation_method?: string
          levy_distribution?: Json
          levy_include?: boolean
          max_holiday_amount?: number | null
          min_holiday_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          policy_type?: string
          ssc_contrib_eib?: boolean
          ssc_contrib_employee?: boolean
          ssc_contrib_employer?: boolean
          ssc_include?: boolean
        }
        Update: {
          created_by?: string | null
          created_on?: string
          date_from?: string
          date_to?: string | null
          distribution_enabled?: boolean
          id?: string
          include_in_severance?: boolean
          is_active?: boolean
          last_published_at?: string | null
          levy_calc_flat_enabled?: boolean
          levy_calc_flat_percentage?: number | null
          levy_calc_slab_enabled?: boolean
          levy_calculation_method?: string
          levy_distribution?: Json
          levy_include?: boolean
          max_holiday_amount?: number | null
          min_holiday_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          policy_type?: string
          ssc_contrib_eib?: boolean
          ssc_contrib_employee?: boolean
          ssc_contrib_employer?: boolean
          ssc_include?: boolean
        }
        Relationships: []
      }
      c3_holiday_pay_policy_exceptions: {
        Row: {
          created_by: string | null
          created_on: string
          date_from: string
          date_to: string | null
          description: string | null
          distribution_enabled: boolean | null
          exception_month: number
          exception_type: string
          id: string
          include_in_severance: boolean | null
          is_active: boolean
          last_published_at: string | null
          levy_calc_flat_enabled: boolean | null
          levy_calc_flat_percentage: number | null
          levy_calc_slab_enabled: boolean | null
          levy_calculation_method: string | null
          levy_distribution: Json | null
          levy_include: boolean | null
          max_holiday_amount: number | null
          min_holiday_amount: number | null
          modified_by: string | null
          modified_on: string
          override_default: boolean
          policy_type: string
          ssc_contrib_eib: boolean | null
          ssc_contrib_employee: boolean | null
          ssc_contrib_employer: boolean | null
          ssc_include: boolean | null
          year_from: number
          year_to: number | null
        }
        Insert: {
          created_by?: string | null
          created_on?: string
          date_from: string
          date_to?: string | null
          description?: string | null
          distribution_enabled?: boolean | null
          exception_month: number
          exception_type?: string
          id?: string
          include_in_severance?: boolean | null
          is_active?: boolean
          last_published_at?: string | null
          levy_calc_flat_enabled?: boolean | null
          levy_calc_flat_percentage?: number | null
          levy_calc_slab_enabled?: boolean | null
          levy_calculation_method?: string | null
          levy_distribution?: Json | null
          levy_include?: boolean | null
          max_holiday_amount?: number | null
          min_holiday_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          override_default?: boolean
          policy_type?: string
          ssc_contrib_eib?: boolean | null
          ssc_contrib_employee?: boolean | null
          ssc_contrib_employer?: boolean | null
          ssc_include?: boolean | null
          year_from: number
          year_to?: number | null
        }
        Update: {
          created_by?: string | null
          created_on?: string
          date_from?: string
          date_to?: string | null
          description?: string | null
          distribution_enabled?: boolean | null
          exception_month?: number
          exception_type?: string
          id?: string
          include_in_severance?: boolean | null
          is_active?: boolean
          last_published_at?: string | null
          levy_calc_flat_enabled?: boolean | null
          levy_calc_flat_percentage?: number | null
          levy_calc_slab_enabled?: boolean | null
          levy_calculation_method?: string | null
          levy_distribution?: Json | null
          levy_include?: boolean | null
          max_holiday_amount?: number | null
          min_holiday_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          override_default?: boolean
          policy_type?: string
          ssc_contrib_eib?: boolean | null
          ssc_contrib_employee?: boolean | null
          ssc_contrib_employer?: boolean | null
          ssc_include?: boolean | null
          year_from?: number
          year_to?: number | null
        }
        Relationships: []
      }
      c3_income_code_policy_default: {
        Row: {
          calc_flat_enabled: boolean | null
          calc_flat_percentage: number | null
          calc_slab_enabled: boolean | null
          calculation_method: string | null
          contrib_eir: boolean | null
          contrib_employee: boolean | null
          contrib_employer: boolean | null
          contrib_severance: boolean | null
          created_by: string | null
          created_on: string
          date_entry_mode: string
          date_from: string
          date_to: string | null
          distribution: Json | null
          distribution_enabled: boolean | null
          id: string
          include_in_levy: boolean | null
          include_in_severance: boolean | null
          income_code_id: string
          is_active: boolean
          levy_calc_flat_enabled: boolean | null
          levy_calc_flat_percentage: number | null
          levy_calc_slab_enabled: boolean | null
          levy_calculation_method: string | null
          levy_distribution: Json | null
          levy_include: boolean | null
          max_amount: number | null
          min_amount: number | null
          modified_by: string | null
          modified_on: string
          policy_type: string | null
          ssc_contrib_eib: boolean | null
          ssc_contrib_employee: boolean | null
          ssc_contrib_employer: boolean | null
          ssc_include: boolean | null
        }
        Insert: {
          calc_flat_enabled?: boolean | null
          calc_flat_percentage?: number | null
          calc_slab_enabled?: boolean | null
          calculation_method?: string | null
          contrib_eir?: boolean | null
          contrib_employee?: boolean | null
          contrib_employer?: boolean | null
          contrib_severance?: boolean | null
          created_by?: string | null
          created_on?: string
          date_entry_mode?: string
          date_from: string
          date_to?: string | null
          distribution?: Json | null
          distribution_enabled?: boolean | null
          id?: string
          include_in_levy?: boolean | null
          include_in_severance?: boolean | null
          income_code_id: string
          is_active?: boolean
          levy_calc_flat_enabled?: boolean | null
          levy_calc_flat_percentage?: number | null
          levy_calc_slab_enabled?: boolean | null
          levy_calculation_method?: string | null
          levy_distribution?: Json | null
          levy_include?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          policy_type?: string | null
          ssc_contrib_eib?: boolean | null
          ssc_contrib_employee?: boolean | null
          ssc_contrib_employer?: boolean | null
          ssc_include?: boolean | null
        }
        Update: {
          calc_flat_enabled?: boolean | null
          calc_flat_percentage?: number | null
          calc_slab_enabled?: boolean | null
          calculation_method?: string | null
          contrib_eir?: boolean | null
          contrib_employee?: boolean | null
          contrib_employer?: boolean | null
          contrib_severance?: boolean | null
          created_by?: string | null
          created_on?: string
          date_entry_mode?: string
          date_from?: string
          date_to?: string | null
          distribution?: Json | null
          distribution_enabled?: boolean | null
          id?: string
          include_in_levy?: boolean | null
          include_in_severance?: boolean | null
          income_code_id?: string
          is_active?: boolean
          levy_calc_flat_enabled?: boolean | null
          levy_calc_flat_percentage?: number | null
          levy_calc_slab_enabled?: boolean | null
          levy_calculation_method?: string | null
          levy_distribution?: Json | null
          levy_include?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          policy_type?: string | null
          ssc_contrib_eib?: boolean | null
          ssc_contrib_employee?: boolean | null
          ssc_contrib_employer?: boolean | null
          ssc_include?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "c3_income_code_policy_default_income_code_id_fkey"
            columns: ["income_code_id"]
            isOneToOne: false
            referencedRelation: "tb_income_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      c3_income_code_policy_exceptions: {
        Row: {
          calc_flat_enabled: boolean | null
          calc_flat_percentage: number | null
          calc_slab_enabled: boolean | null
          calculation_method: string | null
          contrib_eir: boolean | null
          contrib_employee: boolean | null
          contrib_employer: boolean | null
          contrib_severance: boolean | null
          created_by: string | null
          created_on: string
          date_entry_mode: string
          date_from: string
          date_to: string | null
          description: string | null
          distribution: Json | null
          distribution_enabled: boolean | null
          exception_month: number
          exception_type: string
          id: string
          include_in_levy: boolean | null
          include_in_severance: boolean | null
          income_code_id: string
          is_active: boolean
          levy_calc_flat_enabled: boolean | null
          levy_calc_flat_percentage: number | null
          levy_calc_slab_enabled: boolean | null
          levy_calculation_method: string | null
          levy_distribution: Json | null
          levy_include: boolean | null
          max_amount: number | null
          min_amount: number | null
          modified_by: string | null
          modified_on: string
          override_default: boolean | null
          policy_type: string | null
          ssc_contrib_eib: boolean | null
          ssc_contrib_employee: boolean | null
          ssc_contrib_employer: boolean | null
          ssc_include: boolean | null
          year_from: number
          year_to: number | null
        }
        Insert: {
          calc_flat_enabled?: boolean | null
          calc_flat_percentage?: number | null
          calc_slab_enabled?: boolean | null
          calculation_method?: string | null
          contrib_eir?: boolean | null
          contrib_employee?: boolean | null
          contrib_employer?: boolean | null
          contrib_severance?: boolean | null
          created_by?: string | null
          created_on?: string
          date_entry_mode?: string
          date_from: string
          date_to?: string | null
          description?: string | null
          distribution?: Json | null
          distribution_enabled?: boolean | null
          exception_month: number
          exception_type?: string
          id?: string
          include_in_levy?: boolean | null
          include_in_severance?: boolean | null
          income_code_id: string
          is_active?: boolean
          levy_calc_flat_enabled?: boolean | null
          levy_calc_flat_percentage?: number | null
          levy_calc_slab_enabled?: boolean | null
          levy_calculation_method?: string | null
          levy_distribution?: Json | null
          levy_include?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          override_default?: boolean | null
          policy_type?: string | null
          ssc_contrib_eib?: boolean | null
          ssc_contrib_employee?: boolean | null
          ssc_contrib_employer?: boolean | null
          ssc_include?: boolean | null
          year_from: number
          year_to?: number | null
        }
        Update: {
          calc_flat_enabled?: boolean | null
          calc_flat_percentage?: number | null
          calc_slab_enabled?: boolean | null
          calculation_method?: string | null
          contrib_eir?: boolean | null
          contrib_employee?: boolean | null
          contrib_employer?: boolean | null
          contrib_severance?: boolean | null
          created_by?: string | null
          created_on?: string
          date_entry_mode?: string
          date_from?: string
          date_to?: string | null
          description?: string | null
          distribution?: Json | null
          distribution_enabled?: boolean | null
          exception_month?: number
          exception_type?: string
          id?: string
          include_in_levy?: boolean | null
          include_in_severance?: boolean | null
          income_code_id?: string
          is_active?: boolean
          levy_calc_flat_enabled?: boolean | null
          levy_calc_flat_percentage?: number | null
          levy_calc_slab_enabled?: boolean | null
          levy_calculation_method?: string | null
          levy_distribution?: Json | null
          levy_include?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          modified_by?: string | null
          modified_on?: string
          override_default?: boolean | null
          policy_type?: string | null
          ssc_contrib_eib?: boolean | null
          ssc_contrib_employee?: boolean | null
          ssc_contrib_employer?: boolean | null
          ssc_include?: boolean | null
          year_from?: number
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "c3_income_code_policy_exceptions_income_code_id_fkey"
            columns: ["income_code_id"]
            isOneToOne: false
            referencedRelation: "tb_income_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      c3_line_items: {
        Row: {
          c3_id: string | null
          created_at: string | null
          ei_contribution: number | null
          employee_name: string | null
          employee_ssn: string | null
          holidays: number | null
          id: string
          invalid_ssn: boolean | null
          levy_contribution: number | null
          line_number: number | null
          over_age: boolean | null
          overtime: number | null
          ss_contribution: number | null
          under_age: boolean | null
          wages_paid: number | null
          weeks_worked: number | null
        }
        Insert: {
          c3_id?: string | null
          created_at?: string | null
          ei_contribution?: number | null
          employee_name?: string | null
          employee_ssn?: string | null
          holidays?: number | null
          id?: string
          invalid_ssn?: boolean | null
          levy_contribution?: number | null
          line_number?: number | null
          over_age?: boolean | null
          overtime?: number | null
          ss_contribution?: number | null
          under_age?: boolean | null
          wages_paid?: number | null
          weeks_worked?: number | null
        }
        Update: {
          c3_id?: string | null
          created_at?: string | null
          ei_contribution?: number | null
          employee_name?: string | null
          employee_ssn?: string | null
          holidays?: number | null
          id?: string
          invalid_ssn?: boolean | null
          levy_contribution?: number | null
          line_number?: number | null
          over_age?: boolean | null
          overtime?: number | null
          ss_contribution?: number | null
          under_age?: boolean | null
          wages_paid?: number | null
          weeks_worked?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "c3_line_items_c3_id_fkey"
            columns: ["c3_id"]
            isOneToOne: false
            referencedRelation: "c3_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      c3_pending_holiday_pay: {
        Row: {
          amount: number
          applied_at: string | null
          applied_c3_id: string | null
          created_by: string | null
          created_on: string
          holiday_date_from: string | null
          holiday_date_to: string | null
          id: string
          modified_by: string | null
          modified_on: string
          source_c3_id: string | null
          ssn: string
          status: string
          target_period: string
        }
        Insert: {
          amount?: number
          applied_at?: string | null
          applied_c3_id?: string | null
          created_by?: string | null
          created_on?: string
          holiday_date_from?: string | null
          holiday_date_to?: string | null
          id?: string
          modified_by?: string | null
          modified_on?: string
          source_c3_id?: string | null
          ssn: string
          status?: string
          target_period: string
        }
        Update: {
          amount?: number
          applied_at?: string | null
          applied_c3_id?: string | null
          created_by?: string | null
          created_on?: string
          holiday_date_from?: string | null
          holiday_date_to?: string | null
          id?: string
          modified_by?: string | null
          modified_on?: string
          source_c3_id?: string | null
          ssn?: string
          status?: string
          target_period?: string
        }
        Relationships: []
      }
      c3_submissions: {
        Row: {
          attachments: Json | null
          c3_number: string | null
          created_at: string | null
          employer_id: string
          filing_period: string
          id: string
          payment_amount: number | null
          payment_date: string | null
          payment_received: boolean | null
          payment_reference: string | null
          posted_at: string | null
          query_raised: boolean | null
          query_resolved_at: string | null
          query_response: string | null
          query_text: string | null
          scanned_document_url: string | null
          status: Database["public"]["Enums"]["c3_filing_status"] | null
          submission_method: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_ei_contribution: number | null
          total_employees: number | null
          total_levy_contribution: number | null
          total_ss_contribution: number | null
          total_wages: number | null
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
          validation_errors: Json | null
          validation_warnings: Json | null
        }
        Insert: {
          attachments?: Json | null
          c3_number?: string | null
          created_at?: string | null
          employer_id: string
          filing_period: string
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_received?: boolean | null
          payment_reference?: string | null
          posted_at?: string | null
          query_raised?: boolean | null
          query_resolved_at?: string | null
          query_response?: string | null
          query_text?: string | null
          scanned_document_url?: string | null
          status?: Database["public"]["Enums"]["c3_filing_status"] | null
          submission_method?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_ei_contribution?: number | null
          total_employees?: number | null
          total_levy_contribution?: number | null
          total_ss_contribution?: number | null
          total_wages?: number | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_errors?: Json | null
          validation_warnings?: Json | null
        }
        Update: {
          attachments?: Json | null
          c3_number?: string | null
          created_at?: string | null
          employer_id?: string
          filing_period?: string
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_received?: boolean | null
          payment_reference?: string | null
          posted_at?: string | null
          query_raised?: boolean | null
          query_resolved_at?: string | null
          query_response?: string | null
          query_text?: string | null
          scanned_document_url?: string | null
          status?: Database["public"]["Enums"]["c3_filing_status"] | null
          submission_method?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_ei_contribution?: number | null
          total_employees?: number | null
          total_levy_contribution?: number | null
          total_ss_contribution?: number | null
          total_wages?: number | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_errors?: Json | null
          validation_warnings?: Json | null
        }
        Relationships: []
      }
      c3_unified_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          config_type: string
          entity_name: string | null
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          reason: string | null
          record_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          config_type: string
          entity_name?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          record_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          config_type?: string
          entity_name?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          record_id?: string
        }
        Relationships: []
      }
      c3_wage_category: {
        Row: {
          category: string | null
          category_description: string | null
          category_id: number
          is_locked: number | null
          ses_id: number | null
          weekly_contribution: number | null
          weekly_income: number | null
        }
        Insert: {
          category?: string | null
          category_description?: string | null
          category_id?: number
          is_locked?: number | null
          ses_id?: number | null
          weekly_contribution?: number | null
          weekly_income?: number | null
        }
        Update: {
          category?: string | null
          category_description?: string | null
          category_id?: number
          is_locked?: number | null
          ses_id?: number | null
          weekly_contribution?: number | null
          weekly_income?: number | null
        }
        Relationships: []
      }
      ce_arrangement_breaches: {
        Row: {
          arrangement_id: string | null
          breach_type: string | null
          description: string | null
          detected_at: string | null
          detected_by: string | null
          id: string
          resolution: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          arrangement_id?: string | null
          breach_type?: string | null
          description?: string | null
          detected_at?: string | null
          detected_by?: string | null
          id?: string
          resolution?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          arrangement_id?: string | null
          breach_type?: string | null
          description?: string | null
          detected_at?: string | null
          detected_by?: string | null
          id?: string
          resolution?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_arrangement_breaches_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "ce_payment_arrangements"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_audit_log: {
        Row: {
          action: string
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          performed_at: string | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ce_automation_jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          frequency: string | null
          id: string
          is_enabled: boolean | null
          job_code: string
          job_type: string
          last_run_at: string | null
          last_run_status: string | null
          name: string
          next_scheduled_at: string | null
          parameters: Json | null
          schedule_cron: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_enabled?: boolean | null
          job_code: string
          job_type: string
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          next_scheduled_at?: string | null
          parameters?: Json | null
          schedule_cron?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_enabled?: boolean | null
          job_code?: string
          job_type?: string
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          next_scheduled_at?: string | null
          parameters?: Json | null
          schedule_cron?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ce_automation_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          execution_log: Json | null
          id: string
          job_id: string | null
          records_affected: number | null
          records_processed: number | null
          started_at: string | null
          status: string | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          job_id?: string | null
          records_affected?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          job_id?: string | null
          records_affected?: number | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_automation_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ce_automation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_calculation_rules: {
        Row: {
          applies_to: string
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          formula_expression: string
          fund_type: string | null
          id: string
          is_enabled: boolean | null
          name: string
          parameters: Json | null
          rule_code: string
          source_config: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          applies_to: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          formula_expression: string
          fund_type?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          parameters?: Json | null
          rule_code: string
          source_config?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          applies_to?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          formula_expression?: string
          fund_type?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          parameters?: Json | null
          rule_code?: string
          source_config?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ce_case_history: {
        Row: {
          action: string
          case_id: string | null
          from_status: string | null
          id: string
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          case_id?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          case_id?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_case_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "ce_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_case_violations: {
        Row: {
          case_id: string | null
          id: string
          linked_at: string | null
          linked_by: string | null
          violation_id: string | null
        }
        Insert: {
          case_id?: string | null
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          violation_id?: string | null
        }
        Update: {
          case_id?: string | null
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          violation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_case_violations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "ce_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_case_violations_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "ce_violations"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_cases: {
        Row: {
          amount_collected: number | null
          assigned_officer_id: string | null
          assigned_officer_name: string | null
          case_number: string
          case_type: string | null
          closed_date: string | null
          closure_reason: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          employer_id: string
          employer_name: string | null
          fund_type: string | null
          id: string
          is_deleted: boolean | null
          opened_date: string | null
          priority: string | null
          risk_band: string | null
          risk_score: number | null
          status: string | null
          summary: string | null
          target_resolution_date: string | null
          territory: string | null
          total_amount: number | null
          total_interest: number | null
          total_penalties: number | null
          total_principal: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount_collected?: number | null
          assigned_officer_id?: string | null
          assigned_officer_name?: string | null
          case_number: string
          case_type?: string | null
          closed_date?: string | null
          closure_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          employer_id: string
          employer_name?: string | null
          fund_type?: string | null
          id?: string
          is_deleted?: boolean | null
          opened_date?: string | null
          priority?: string | null
          risk_band?: string | null
          risk_score?: number | null
          status?: string | null
          summary?: string | null
          target_resolution_date?: string | null
          territory?: string | null
          total_amount?: number | null
          total_interest?: number | null
          total_penalties?: number | null
          total_principal?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount_collected?: number | null
          assigned_officer_id?: string | null
          assigned_officer_name?: string | null
          case_number?: string
          case_type?: string | null
          closed_date?: string | null
          closure_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          employer_id?: string
          employer_name?: string | null
          fund_type?: string | null
          id?: string
          is_deleted?: boolean | null
          opened_date?: string | null
          priority?: string | null
          risk_band?: string | null
          risk_score?: number | null
          status?: string | null
          summary?: string | null
          target_resolution_date?: string | null
          territory?: string | null
          total_amount?: number | null
          total_interest?: number | null
          total_penalties?: number | null
          total_principal?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ce_detection_rules: {
        Row: {
          auto_create_violation: boolean | null
          condition_expression: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          frequency: string | null
          id: string
          is_enabled: boolean | null
          name: string
          parameters: Json | null
          priority: string | null
          rule_code: string
          trigger_event: string
          updated_at: string | null
          updated_by: string | null
          violation_type_id: string | null
        }
        Insert: {
          auto_create_violation?: boolean | null
          condition_expression?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          parameters?: Json | null
          priority?: string | null
          rule_code: string
          trigger_event: string
          updated_at?: string | null
          updated_by?: string | null
          violation_type_id?: string | null
        }
        Update: {
          auto_create_violation?: boolean | null
          condition_expression?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          parameters?: Json | null
          priority?: string | null
          rule_code?: string
          trigger_event?: string
          updated_at?: string | null
          updated_by?: string | null
          violation_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_detection_rules_violation_type_id_fkey"
            columns: ["violation_type_id"]
            isOneToOne: false
            referencedRelation: "ce_violation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_escalation_rules: {
        Row: {
          amount_threshold: number | null
          auto_escalate: boolean | null
          condition_expression: string | null
          created_at: string | null
          created_by: string | null
          days_threshold: number | null
          description: string | null
          from_status: string
          id: string
          is_enabled: boolean | null
          name: string
          notification_template_id: string | null
          requires_approval: boolean | null
          rule_code: string
          to_status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount_threshold?: number | null
          auto_escalate?: boolean | null
          condition_expression?: string | null
          created_at?: string | null
          created_by?: string | null
          days_threshold?: number | null
          description?: string | null
          from_status: string
          id?: string
          is_enabled?: boolean | null
          name: string
          notification_template_id?: string | null
          requires_approval?: boolean | null
          rule_code: string
          to_status: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount_threshold?: number | null
          auto_escalate?: boolean | null
          condition_expression?: string | null
          created_at?: string | null
          created_by?: string | null
          days_threshold?: number | null
          description?: string | null
          from_status?: string
          id?: string
          is_enabled?: boolean | null
          name?: string
          notification_template_id?: string | null
          requires_approval?: boolean | null
          rule_code?: string
          to_status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ce_inspection_findings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          evidence_documents: Json | null
          finding_type: string | null
          id: string
          inspection_id: string | null
          severity: string | null
          violation_created: boolean | null
          violation_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          evidence_documents?: Json | null
          finding_type?: string | null
          id?: string
          inspection_id?: string | null
          severity?: string | null
          violation_created?: boolean | null
          violation_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          evidence_documents?: Json | null
          finding_type?: string | null
          id?: string
          inspection_id?: string | null
          severity?: string | null
          violation_created?: boolean | null
          violation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_inspection_findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "ce_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_inspection_findings_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "ce_violations"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_inspections: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          case_id: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          created_by: string | null
          documents_collected: Json | null
          employees_interviewed: number | null
          employer_id: string
          employer_name: string | null
          employer_signature_data: string | null
          findings_summary: string | null
          id: string
          inspection_number: string
          inspection_type: string | null
          inspector_id: string | null
          inspector_name: string | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          photos: Json | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          territory: string | null
          updated_at: string | null
          updated_by: string | null
          wage_books_reviewed: boolean | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          case_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          created_by?: string | null
          documents_collected?: Json | null
          employees_interviewed?: number | null
          employer_id: string
          employer_name?: string | null
          employer_signature_data?: string | null
          findings_summary?: string | null
          id?: string
          inspection_number: string
          inspection_type?: string | null
          inspector_id?: string | null
          inspector_name?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          photos?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          territory?: string | null
          updated_at?: string | null
          updated_by?: string | null
          wage_books_reviewed?: boolean | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          case_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          created_by?: string | null
          documents_collected?: Json | null
          employees_interviewed?: number | null
          employer_id?: string
          employer_name?: string | null
          employer_signature_data?: string | null
          findings_summary?: string | null
          id?: string
          inspection_number?: string
          inspection_type?: string | null
          inspector_id?: string | null
          inspector_name?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          photos?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          territory?: string | null
          updated_at?: string | null
          updated_by?: string | null
          wage_books_reviewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_inspections_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "ce_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_installments: {
        Row: {
          amount: number
          arrangement_id: string | null
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          is_overdue: boolean | null
          overdue_days: number | null
          paid_amount: number | null
          paid_date: string | null
          payment_reference: string | null
          status: string | null
        }
        Insert: {
          amount: number
          arrangement_id?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          is_overdue?: boolean | null
          overdue_days?: number | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          arrangement_id?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          is_overdue?: boolean | null
          overdue_days?: number | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_installments_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "ce_payment_arrangements"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_legal_documents: {
        Row: {
          acknowledged_at: string | null
          document_type: string
          document_url: string | null
          escalation_id: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          notes: string | null
          sent_at: string | null
          sent_method: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          document_type: string
          document_url?: string | null
          escalation_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          sent_method?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          document_type?: string
          document_url?: string | null
          escalation_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          sent_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_legal_documents_escalation_id_fkey"
            columns: ["escalation_id"]
            isOneToOne: false
            referencedRelation: "ce_legal_escalations"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_legal_escalations: {
        Row: {
          amount_in_dispute: number | null
          case_id: string | null
          court_case_number: string | null
          court_name: string | null
          created_at: string | null
          created_by: string | null
          current_stage: string | null
          employer_id: string
          employer_name: string | null
          escalation_number: string
          hearing_date: string | null
          id: string
          judgment_amount: number | null
          judgment_date: string | null
          legal_officer_id: string | null
          legal_officer_name: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount_in_dispute?: number | null
          case_id?: string | null
          court_case_number?: string | null
          court_name?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage?: string | null
          employer_id: string
          employer_name?: string | null
          escalation_number: string
          hearing_date?: string | null
          id?: string
          judgment_amount?: number | null
          judgment_date?: string | null
          legal_officer_id?: string | null
          legal_officer_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount_in_dispute?: number | null
          case_id?: string | null
          court_case_number?: string | null
          court_name?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage?: string | null
          employer_id?: string
          employer_name?: string | null
          escalation_number?: string
          hearing_date?: string | null
          id?: string
          judgment_amount?: number | null
          judgment_date?: string | null
          legal_officer_id?: string | null
          legal_officer_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_legal_escalations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "ce_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_notices: {
        Row: {
          acknowledged_at: string | null
          body: string | null
          case_id: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          delivery_method: string | null
          due_response_date: string | null
          employer_id: string
          employer_name: string | null
          id: string
          notice_number: string
          notice_type: string
          response_date: string | null
          response_notes: string | null
          response_received: boolean | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          updated_at: string | null
          updated_by: string | null
          violation_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          body?: string | null
          case_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivery_method?: string | null
          due_response_date?: string | null
          employer_id: string
          employer_name?: string | null
          id?: string
          notice_number: string
          notice_type: string
          response_date?: string | null
          response_notes?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          violation_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          body?: string | null
          case_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivery_method?: string | null
          due_response_date?: string | null
          employer_id?: string
          employer_name?: string | null
          id?: string
          notice_number?: string
          notice_type?: string
          response_date?: string | null
          response_notes?: string | null
          response_received?: boolean | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          violation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_notices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "ce_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_notices_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "ce_violations"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_number_sequences: {
        Row: {
          current_value: number | null
          id: string
          month: number | null
          template_id: string | null
          year: number
        }
        Insert: {
          current_value?: number | null
          id?: string
          month?: number | null
          template_id?: string | null
          year: number
        }
        Update: {
          current_value?: number | null
          id?: string
          month?: number | null
          template_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ce_number_sequences_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ce_number_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_number_templates: {
        Row: {
          applies_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          padding_length: number | null
          prefix: string | null
          reset_frequency: string | null
          template_pattern: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          applies_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          padding_length?: number | null
          prefix?: string | null
          reset_frequency?: string | null
          template_pattern: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          applies_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          padding_length?: number | null
          prefix?: string | null
          reset_frequency?: string | null
          template_pattern?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ce_payment_arrangements: {
        Row: {
          agreement_document_url: string | null
          agreement_signed: boolean | null
          approved_at: string | null
          approved_by: string | null
          arrangement_number: string
          breach_date: string | null
          breach_detected: boolean | null
          breach_reason: string | null
          case_id: string | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          down_payment: number | null
          employer_id: string
          employer_name: string | null
          end_date: string | null
          frequency: string | null
          id: string
          installment_amount: number
          installments_paid: number | null
          max_missed_before_breach: number | null
          missed_payments: number | null
          next_due_date: string | null
          number_of_installments: number
          signature_data: string | null
          signed_at: string | null
          start_date: string
          status: string | null
          terms_text: string | null
          total_debt: number
          total_paid: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          arrangement_number: string
          breach_date?: string | null
          breach_detected?: boolean | null
          breach_reason?: string | null
          case_id?: string | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          down_payment?: number | null
          employer_id: string
          employer_name?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          installment_amount: number
          installments_paid?: number | null
          max_missed_before_breach?: number | null
          missed_payments?: number | null
          next_due_date?: string | null
          number_of_installments: number
          signature_data?: string | null
          signed_at?: string | null
          start_date: string
          status?: string | null
          terms_text?: string | null
          total_debt: number
          total_paid?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          arrangement_number?: string
          breach_date?: string | null
          breach_detected?: boolean | null
          breach_reason?: string | null
          case_id?: string | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          down_payment?: number | null
          employer_id?: string
          employer_name?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          installment_amount?: number
          installments_paid?: number | null
          max_missed_before_breach?: number | null
          missed_payments?: number | null
          next_due_date?: string | null
          number_of_installments?: number
          signature_data?: string | null
          signed_at?: string | null
          start_date?: string
          status?: string | null
          terms_text?: string | null
          total_debt?: number
          total_paid?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_payment_arrangements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "ce_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_risk_bands: {
        Row: {
          audit_frequency: string | null
          auto_select_enabled: boolean | null
          auto_select_type: string | null
          auto_select_value: number | null
          band_name: string
          color: string | null
          created_at: string | null
          escalation_action: string | null
          escalation_enabled: boolean | null
          escalation_months_in_band: number | null
          follow_up_intensity: string | null
          id: string
          mandatory_audit: boolean | null
          policy_id: string
          score_range_max: number
          score_range_min: number
          updated_at: string | null
        }
        Insert: {
          audit_frequency?: string | null
          auto_select_enabled?: boolean | null
          auto_select_type?: string | null
          auto_select_value?: number | null
          band_name: string
          color?: string | null
          created_at?: string | null
          escalation_action?: string | null
          escalation_enabled?: boolean | null
          escalation_months_in_band?: number | null
          follow_up_intensity?: string | null
          id?: string
          mandatory_audit?: boolean | null
          policy_id: string
          score_range_max?: number
          score_range_min?: number
          updated_at?: string | null
        }
        Update: {
          audit_frequency?: string | null
          auto_select_enabled?: boolean | null
          auto_select_type?: string | null
          auto_select_value?: number | null
          band_name?: string
          color?: string | null
          created_at?: string | null
          escalation_action?: string | null
          escalation_enabled?: boolean | null
          escalation_months_in_band?: number | null
          follow_up_intensity?: string | null
          id?: string
          mandatory_audit?: boolean | null
          policy_id?: string
          score_range_max?: number
          score_range_min?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_risk_bands_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "ce_risk_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_risk_config: {
        Row: {
          calculation_formula: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          data_source: string | null
          description: string | null
          factor_code: string
          factor_name: string
          id: string
          is_enabled: boolean | null
          max_score: number | null
          scoring_method: string | null
          thresholds: Json | null
          updated_at: string | null
          updated_by: string | null
          weight: number | null
        }
        Insert: {
          calculation_formula?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          description?: string | null
          factor_code: string
          factor_name: string
          id?: string
          is_enabled?: boolean | null
          max_score?: number | null
          scoring_method?: string | null
          thresholds?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          weight?: number | null
        }
        Update: {
          calculation_formula?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          data_source?: string | null
          description?: string | null
          factor_code?: string
          factor_name?: string
          id?: string
          is_enabled?: boolean | null
          max_score?: number | null
          scoring_method?: string | null
          thresholds?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      ce_risk_policies: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          applicable_employer_types: string[] | null
          applicable_zones: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          policy_code: string
          policy_name: string
          status: string
          update_frequency: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          applicable_employer_types?: string[] | null
          applicable_zones?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          policy_code: string
          policy_name: string
          status?: string
          update_frequency?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          applicable_employer_types?: string[] | null
          applicable_zones?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          policy_code?: string
          policy_name?: string
          status?: string
          update_frequency?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ce_risk_policy_factors: {
        Row: {
          created_at: string | null
          factor_id: string
          id: string
          is_active: boolean | null
          policy_id: string
          weight_override: number | null
        }
        Insert: {
          created_at?: string | null
          factor_id: string
          id?: string
          is_active?: boolean | null
          policy_id: string
          weight_override?: number | null
        }
        Update: {
          created_at?: string | null
          factor_id?: string
          id?: string
          is_active?: boolean | null
          policy_id?: string
          weight_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_risk_policy_factors_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "ce_risk_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_risk_policy_factors_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "ce_risk_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_risk_profiles: {
        Row: {
          arrears_score: number | null
          created_at: string | null
          created_by: string | null
          employer_id: string
          employer_name: string | null
          filing_score: number | null
          id: string
          last_calculated_at: string | null
          legal_history_score: number | null
          next_review_date: string | null
          override_band: string | null
          override_by: string | null
          override_reason: string | null
          payment_behavior_score: number | null
          risk_band: string | null
          territory: string | null
          total_score: number | null
          updated_at: string | null
          updated_by: string | null
          violation_score: number | null
        }
        Insert: {
          arrears_score?: number | null
          created_at?: string | null
          created_by?: string | null
          employer_id: string
          employer_name?: string | null
          filing_score?: number | null
          id?: string
          last_calculated_at?: string | null
          legal_history_score?: number | null
          next_review_date?: string | null
          override_band?: string | null
          override_by?: string | null
          override_reason?: string | null
          payment_behavior_score?: number | null
          risk_band?: string | null
          territory?: string | null
          total_score?: number | null
          updated_at?: string | null
          updated_by?: string | null
          violation_score?: number | null
        }
        Update: {
          arrears_score?: number | null
          created_at?: string | null
          created_by?: string | null
          employer_id?: string
          employer_name?: string | null
          filing_score?: number | null
          id?: string
          last_calculated_at?: string | null
          legal_history_score?: number | null
          next_review_date?: string | null
          override_band?: string | null
          override_by?: string | null
          override_reason?: string | null
          payment_behavior_score?: number | null
          risk_band?: string | null
          territory?: string | null
          total_score?: number | null
          updated_at?: string | null
          updated_by?: string | null
          violation_score?: number | null
        }
        Relationships: []
      }
      ce_risk_score_history: {
        Row: {
          calculated_at: string | null
          calculated_by: string | null
          calculation_details: Json | null
          id: string
          new_band: string | null
          new_score: number | null
          previous_band: string | null
          previous_score: number | null
          risk_profile_id: string | null
        }
        Insert: {
          calculated_at?: string | null
          calculated_by?: string | null
          calculation_details?: Json | null
          id?: string
          new_band?: string | null
          new_score?: number | null
          previous_band?: string | null
          previous_score?: number | null
          risk_profile_id?: string | null
        }
        Update: {
          calculated_at?: string | null
          calculated_by?: string | null
          calculation_details?: Json | null
          id?: string
          new_band?: string | null
          new_score?: number | null
          previous_band?: string | null
          previous_score?: number | null
          risk_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_risk_score_history_risk_profile_id_fkey"
            columns: ["risk_profile_id"]
            isOneToOne: false
            referencedRelation: "ce_risk_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_rule_variable_mappings: {
        Row: {
          applies_to_rule_type: string
          c3_config_key: string | null
          computation_logic: string | null
          created_at: string | null
          data_type: string
          description: string | null
          display_name: string
          group_name: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          source_column: string | null
          source_schema: string | null
          source_table: string | null
          updated_at: string | null
          variable_category: string
          variable_key: string
        }
        Insert: {
          applies_to_rule_type?: string
          c3_config_key?: string | null
          computation_logic?: string | null
          created_at?: string | null
          data_type?: string
          description?: string | null
          display_name: string
          group_name: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          source_column?: string | null
          source_schema?: string | null
          source_table?: string | null
          updated_at?: string | null
          variable_category: string
          variable_key: string
        }
        Update: {
          applies_to_rule_type?: string
          c3_config_key?: string | null
          computation_logic?: string | null
          created_at?: string | null
          data_type?: string
          description?: string | null
          display_name?: string
          group_name?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          source_column?: string | null
          source_schema?: string | null
          source_table?: string | null
          updated_at?: string | null
          variable_category?: string
          variable_key?: string
        }
        Relationships: []
      }
      ce_settings: {
        Row: {
          category: string | null
          data_type: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          data_type?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          data_type?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ce_violation_history: {
        Row: {
          action: string
          from_value: string | null
          id: string
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          to_value: string | null
          violation_id: string | null
        }
        Insert: {
          action: string
          from_value?: string | null
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          to_value?: string | null
          violation_id?: string | null
        }
        Update: {
          action?: string
          from_value?: string | null
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          to_value?: string | null
          violation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_violation_history_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "ce_violations"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_violation_types: {
        Row: {
          applicable_funds: string[] | null
          auto_detect: boolean | null
          category: string | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          fund_type: string | null
          grace_period_days: number | null
          id: string
          is_active: boolean | null
          name: string
          severity_default: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          applicable_funds?: string[] | null
          auto_detect?: boolean | null
          category?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fund_type?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          severity_default?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          applicable_funds?: string[] | null
          auto_detect?: boolean | null
          category?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fund_type?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          severity_default?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ce_violations: {
        Row: {
          assigned_at: string | null
          assigned_to_name: string | null
          assigned_to_user_id: string | null
          c3_submission_id: string | null
          candidate_activity_type: string | null
          candidate_business_name: string | null
          candidate_location: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discovered_by: string | null
          discovered_date: string
          due_date: string | null
          employer_id: string | null
          employer_name: string | null
          escalated_at: string | null
          escalated_to: string | null
          estimated_employees: number | null
          fund_type: string | null
          id: string
          inspection_id: string | null
          interest_amount: number | null
          is_deleted: boolean | null
          is_unlinked: boolean | null
          penalty_amount: number | null
          period_from: string | null
          period_to: string | null
          principal_amount: number | null
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          source_rule_id: string | null
          source_type: string | null
          status: string | null
          summary: string
          territory: string | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          violation_number: string
          violation_type_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          c3_submission_id?: string | null
          candidate_activity_type?: string | null
          candidate_business_name?: string | null
          candidate_location?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discovered_by?: string | null
          discovered_date?: string
          due_date?: string | null
          employer_id?: string | null
          employer_name?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          estimated_employees?: number | null
          fund_type?: string | null
          id?: string
          inspection_id?: string | null
          interest_amount?: number | null
          is_deleted?: boolean | null
          is_unlinked?: boolean | null
          penalty_amount?: number | null
          period_from?: string | null
          period_to?: string | null
          principal_amount?: number | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_rule_id?: string | null
          source_type?: string | null
          status?: string | null
          summary: string
          territory?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          violation_number: string
          violation_type_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          c3_submission_id?: string | null
          candidate_activity_type?: string | null
          candidate_business_name?: string | null
          candidate_location?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discovered_by?: string | null
          discovered_date?: string
          due_date?: string | null
          employer_id?: string | null
          employer_name?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          estimated_employees?: number | null
          fund_type?: string | null
          id?: string
          inspection_id?: string | null
          interest_amount?: number | null
          is_deleted?: boolean | null
          is_unlinked?: boolean | null
          penalty_amount?: number | null
          period_from?: string | null
          period_to?: string | null
          principal_amount?: number | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_rule_id?: string | null
          source_type?: string | null
          status?: string | null
          summary?: string
          territory?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          violation_number?: string
          violation_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_violations_violation_type_id_fkey"
            columns: ["violation_type_id"]
            isOneToOne: false
            referencedRelation: "ce_violation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_waivers: {
        Row: {
          amount_approved: number | null
          amount_requested: number | null
          approved_at: string | null
          approver_comments: string | null
          approver_decision: string | null
          approver_id: string | null
          case_id: string | null
          created_at: string | null
          created_by: string | null
          employer_id: string
          id: string
          justification: string
          requested_at: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewer_comments: string | null
          reviewer_decision: string | null
          reviewer_id: string | null
          status: string | null
          supporting_documents: Json | null
          updated_at: string | null
          updated_by: string | null
          waiver_number: string
          waiver_type: string
        }
        Insert: {
          amount_approved?: number | null
          amount_requested?: number | null
          approved_at?: string | null
          approver_comments?: string | null
          approver_decision?: string | null
          approver_id?: string | null
          case_id?: string | null
          created_at?: string | null
          created_by?: string | null
          employer_id: string
          id?: string
          justification: string
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewer_comments?: string | null
          reviewer_decision?: string | null
          reviewer_id?: string | null
          status?: string | null
          supporting_documents?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          waiver_number: string
          waiver_type: string
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number | null
          approved_at?: string | null
          approver_comments?: string | null
          approver_decision?: string | null
          approver_id?: string | null
          case_id?: string | null
          created_at?: string | null
          created_by?: string | null
          employer_id?: string
          id?: string
          justification?: string
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewer_comments?: string | null
          reviewer_decision?: string | null
          reviewer_id?: string | null
          status?: string | null
          supporting_documents?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          waiver_number?: string
          waiver_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_waivers_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "ce_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cn_c3_reported: {
        Row: {
          created_at: string
          date_entered: string | null
          date_posted: string | null
          date_received: string | null
          date_verified: string | null
          emp_levy_amt_calc: number | null
          emp_levy_penalty_amt: number | null
          emp_pe_amt_calc: number | null
          emp_pe_penalty_amt: number | null
          emp_ss_amt_calc: number | null
          emp_ss_fines_due: number | null
          entered_by: string | null
          id: string
          modified_by: string | null
          modified_date: string | null
          nil_return: boolean | null
          notes: string | null
          number_employed: number | null
          payer_address: string | null
          payer_id: string
          payer_name: string | null
          payer_type: string
          period: string
          posting_status: string
          received_by: string | null
          sequence_no: number
          total_wages: number | null
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          date_entered?: string | null
          date_posted?: string | null
          date_received?: string | null
          date_verified?: string | null
          emp_levy_amt_calc?: number | null
          emp_levy_penalty_amt?: number | null
          emp_pe_amt_calc?: number | null
          emp_pe_penalty_amt?: number | null
          emp_ss_amt_calc?: number | null
          emp_ss_fines_due?: number | null
          entered_by?: string | null
          id?: string
          modified_by?: string | null
          modified_date?: string | null
          nil_return?: boolean | null
          notes?: string | null
          number_employed?: number | null
          payer_address?: string | null
          payer_id: string
          payer_name?: string | null
          payer_type: string
          period: string
          posting_status?: string
          received_by?: string | null
          sequence_no?: number
          total_wages?: number | null
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          date_entered?: string | null
          date_posted?: string | null
          date_received?: string | null
          date_verified?: string | null
          emp_levy_amt_calc?: number | null
          emp_levy_penalty_amt?: number | null
          emp_pe_amt_calc?: number | null
          emp_pe_penalty_amt?: number | null
          emp_ss_amt_calc?: number | null
          emp_ss_fines_due?: number | null
          entered_by?: string | null
          id?: string
          modified_by?: string | null
          modified_date?: string | null
          nil_return?: boolean | null
          notes?: string | null
          number_employed?: number | null
          payer_address?: string | null
          payer_id?: string
          payer_name?: string | null
          payer_type?: string
          period?: string
          posting_status?: string
          received_by?: string | null
          sequence_no?: number
          total_wages?: number | null
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      cn_payment: {
        Row: {
          bank_code: string | null
          bank_lodgement_code: string | null
          cheque_date: string | null
          created_at: string | null
          credit_card_code: string | null
          expiration_date: string | null
          fund_code: string
          mop_account_number: string | null
          mop_code: string
          mop_notes1: string | null
          mop_number: string | null
          mop_transit_number: string | null
          payment_amount: number | null
          payment_code: string
          payment_date: string | null
          payment_id: number
          payment_sequence_no: number
          period: string | null
        }
        Insert: {
          bank_code?: string | null
          bank_lodgement_code?: string | null
          cheque_date?: string | null
          created_at?: string | null
          credit_card_code?: string | null
          expiration_date?: string | null
          fund_code: string
          mop_account_number?: string | null
          mop_code: string
          mop_notes1?: string | null
          mop_number?: string | null
          mop_transit_number?: string | null
          payment_amount?: number | null
          payment_code: string
          payment_date?: string | null
          payment_id: number
          payment_sequence_no?: number
          period?: string | null
        }
        Update: {
          bank_code?: string | null
          bank_lodgement_code?: string | null
          cheque_date?: string | null
          created_at?: string | null
          credit_card_code?: string | null
          expiration_date?: string | null
          fund_code?: string
          mop_account_number?: string | null
          mop_code?: string
          mop_notes1?: string | null
          mop_number?: string | null
          mop_transit_number?: string | null
          payment_amount?: number | null
          payment_code?: string
          payment_date?: string | null
          payment_id?: number
          payment_sequence_no?: number
          period?: string | null
        }
        Relationships: []
      }
      cn_payment_header: {
        Row: {
          batch_number: string
          created_at: string | null
          date_received: string | null
          payer_id: string
          payer_type: string
          payment_id: number
          remarks: string | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          date_received?: string | null
          payer_id: string
          payer_type: string
          payment_id?: number
          remarks?: string | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          date_received?: string | null
          payer_id?: string
          payer_type?: string
          payment_id?: number
          remarks?: string | null
        }
        Relationships: []
      }
      cn_receipt: {
        Row: {
          cancel_date: string | null
          cancel_reason: string | null
          cancel_user: string | null
          created_at: string | null
          payment_id: number
          receipt_id: string
          receipt_total: number | null
          reprint_times: number | null
          status: string | null
          total_number_of_payments: number | null
          update_control: number | null
        }
        Insert: {
          cancel_date?: string | null
          cancel_reason?: string | null
          cancel_user?: string | null
          created_at?: string | null
          payment_id: number
          receipt_id: string
          receipt_total?: number | null
          reprint_times?: number | null
          status?: string | null
          total_number_of_payments?: number | null
          update_control?: number | null
        }
        Update: {
          cancel_date?: string | null
          cancel_reason?: string | null
          cancel_user?: string | null
          created_at?: string | null
          payment_id?: number
          receipt_id?: string
          receipt_total?: number | null
          reprint_times?: number | null
          status?: string | null
          total_number_of_payments?: number | null
          update_control?: number | null
        }
        Relationships: []
      }
      compliance_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      compliance_arrears: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          due_date: string | null
          ei_owed: number | null
          employer_id: string
          escalated_to_legal: boolean | null
          escalation_date: string | null
          id: string
          interest: number | null
          is_estimated: boolean | null
          last_payment_date: string | null
          levy_owed: number | null
          outstanding_balance: number | null
          payment_plan_id: string | null
          penalties: number | null
          period: string
          period_type: string | null
          ss_owed: number | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string | null
          ei_owed?: number | null
          employer_id: string
          escalated_to_legal?: boolean | null
          escalation_date?: string | null
          id?: string
          interest?: number | null
          is_estimated?: boolean | null
          last_payment_date?: string | null
          levy_owed?: number | null
          outstanding_balance?: number | null
          payment_plan_id?: string | null
          penalties?: number | null
          period: string
          period_type?: string | null
          ss_owed?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string | null
          ei_owed?: number | null
          employer_id?: string
          escalated_to_legal?: boolean | null
          escalation_date?: string | null
          id?: string
          interest?: number | null
          is_estimated?: boolean | null
          last_payment_date?: string | null
          levy_owed?: number | null
          outstanding_balance?: number | null
          payment_plan_id?: string | null
          penalties?: number | null
          period?: string
          period_type?: string | null
          ss_owed?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_audits: {
        Row: {
          assigned_at: string | null
          assigned_inspector_id: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
          case_number: string | null
          closed_at: string | null
          complaint_details: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          employees_interviewed: number | null
          employer_id: string
          employer_name: string | null
          escalated_to_legal: boolean | null
          escalation_date: string | null
          evidence_documents: Json | null
          findings: string | null
          id: string
          interview_notes: Json | null
          outcome: string | null
          penalty_approved: number | null
          penalty_recommended: number | null
          referral_source: string | null
          source_description: string | null
          status: Database["public"]["Enums"]["audit_status"] | null
          updated_at: string | null
          wage_book_images: Json | null
          wage_books_reviewed: boolean | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_inspector_id?: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
          case_number?: string | null
          closed_at?: string | null
          complaint_details?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          employees_interviewed?: number | null
          employer_id: string
          employer_name?: string | null
          escalated_to_legal?: boolean | null
          escalation_date?: string | null
          evidence_documents?: Json | null
          findings?: string | null
          id?: string
          interview_notes?: Json | null
          outcome?: string | null
          penalty_approved?: number | null
          penalty_recommended?: number | null
          referral_source?: string | null
          source_description?: string | null
          status?: Database["public"]["Enums"]["audit_status"] | null
          updated_at?: string | null
          wage_book_images?: Json | null
          wage_books_reviewed?: boolean | null
        }
        Update: {
          assigned_at?: string | null
          assigned_inspector_id?: string | null
          audit_type?: Database["public"]["Enums"]["audit_type"]
          case_number?: string | null
          closed_at?: string | null
          complaint_details?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          employees_interviewed?: number | null
          employer_id?: string
          employer_name?: string | null
          escalated_to_legal?: boolean | null
          escalation_date?: string | null
          evidence_documents?: Json | null
          findings?: string | null
          id?: string
          interview_notes?: Json | null
          outcome?: string | null
          penalty_approved?: number | null
          penalty_recommended?: number | null
          referral_source?: string | null
          source_description?: string | null
          status?: Database["public"]["Enums"]["audit_status"] | null
          updated_at?: string | null
          wage_book_images?: Json | null
          wage_books_reviewed?: boolean | null
        }
        Relationships: []
      }
      compliance_payment_plans: {
        Row: {
          agreement_document_url: string | null
          agreement_signed: boolean | null
          broken_date: string | null
          broken_reason: string | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          employer_id: string
          escalated_at: string | null
          frequency: string
          id: string
          installment_amount: number
          installments_paid: number | null
          next_due_date: string | null
          number_of_installments: number
          signature_data: string | null
          signed_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["payment_plan_status"] | null
          terms: string | null
          total_debt: number
          total_paid: number | null
          updated_at: string | null
        }
        Insert: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          broken_date?: string | null
          broken_reason?: string | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          employer_id: string
          escalated_at?: string | null
          frequency: string
          id?: string
          installment_amount: number
          installments_paid?: number | null
          next_due_date?: string | null
          number_of_installments: number
          signature_data?: string | null
          signed_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["payment_plan_status"] | null
          terms?: string | null
          total_debt: number
          total_paid?: number | null
          updated_at?: string | null
        }
        Update: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          broken_date?: string | null
          broken_reason?: string | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          employer_id?: string
          escalated_at?: string | null
          frequency?: string
          id?: string
          installment_amount?: number
          installments_paid?: number | null
          next_due_date?: string | null
          number_of_installments?: number
          signature_data?: string | null
          signed_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["payment_plan_status"] | null
          terms?: string | null
          total_debt?: number
          total_paid?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_registrations: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_at: string | null
          assigned_inspector_id: string | null
          business_type: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          documents: Json | null
          education_completed: boolean | null
          education_date: string | null
          email: string | null
          employer_name: string | null
          id: string
          notes: string | null
          person_name: string | null
          phone: string | null
          registration_number: string | null
          registration_type: Database["public"]["Enums"]["compliance_registration_type"]
          ssn: string | null
          status:
            | Database["public"]["Enums"]["compliance_registration_status"]
            | null
          tax_id: string | null
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_at?: string | null
          assigned_inspector_id?: string | null
          business_type?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          education_completed?: boolean | null
          education_date?: string | null
          email?: string | null
          employer_name?: string | null
          id?: string
          notes?: string | null
          person_name?: string | null
          phone?: string | null
          registration_number?: string | null
          registration_type: Database["public"]["Enums"]["compliance_registration_type"]
          ssn?: string | null
          status?:
            | Database["public"]["Enums"]["compliance_registration_status"]
            | null
          tax_id?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_at?: string | null
          assigned_inspector_id?: string | null
          business_type?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          education_completed?: boolean | null
          education_date?: string | null
          email?: string | null
          employer_name?: string | null
          id?: string
          notes?: string | null
          person_name?: string | null
          phone?: string | null
          registration_number?: string | null
          registration_type?: Database["public"]["Enums"]["compliance_registration_type"]
          ssn?: string | null
          status?:
            | Database["public"]["Enums"]["compliance_registration_status"]
            | null
          tax_id?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      compliance_waivers: {
        Row: {
          agreement_document_url: string | null
          agreement_signed: boolean | null
          amount_requested: number
          approved_amount: number | null
          case_reference: string | null
          conditions: string | null
          created_at: string | null
          director_approved: boolean | null
          director_approved_at: string | null
          director_comments: string | null
          director_decision: string | null
          director_id: string | null
          employer_id: string | null
          id: string
          interest_to_waive: number | null
          justification: string
          legal_comments: string | null
          legal_decision: string | null
          legal_officer_id: string | null
          legal_reviewed: boolean | null
          legal_reviewed_at: string | null
          manager_comments: string | null
          manager_decision: string | null
          manager_id: string | null
          manager_reviewed: boolean | null
          manager_reviewed_at: string | null
          penalties_to_waive: number | null
          requested_at: string | null
          requested_by: string | null
          signature_data: string | null
          status: Database["public"]["Enums"]["waiver_status"] | null
          supporting_documents: Json | null
          updated_at: string | null
          waiver_number: string | null
        }
        Insert: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          amount_requested: number
          approved_amount?: number | null
          case_reference?: string | null
          conditions?: string | null
          created_at?: string | null
          director_approved?: boolean | null
          director_approved_at?: string | null
          director_comments?: string | null
          director_decision?: string | null
          director_id?: string | null
          employer_id?: string | null
          id?: string
          interest_to_waive?: number | null
          justification: string
          legal_comments?: string | null
          legal_decision?: string | null
          legal_officer_id?: string | null
          legal_reviewed?: boolean | null
          legal_reviewed_at?: string | null
          manager_comments?: string | null
          manager_decision?: string | null
          manager_id?: string | null
          manager_reviewed?: boolean | null
          manager_reviewed_at?: string | null
          penalties_to_waive?: number | null
          requested_at?: string | null
          requested_by?: string | null
          signature_data?: string | null
          status?: Database["public"]["Enums"]["waiver_status"] | null
          supporting_documents?: Json | null
          updated_at?: string | null
          waiver_number?: string | null
        }
        Update: {
          agreement_document_url?: string | null
          agreement_signed?: boolean | null
          amount_requested?: number
          approved_amount?: number | null
          case_reference?: string | null
          conditions?: string | null
          created_at?: string | null
          director_approved?: boolean | null
          director_approved_at?: string | null
          director_comments?: string | null
          director_decision?: string | null
          director_id?: string | null
          employer_id?: string | null
          id?: string
          interest_to_waive?: number | null
          justification?: string
          legal_comments?: string | null
          legal_decision?: string | null
          legal_officer_id?: string | null
          legal_reviewed?: boolean | null
          legal_reviewed_at?: string | null
          manager_comments?: string | null
          manager_decision?: string | null
          manager_id?: string | null
          manager_reviewed?: boolean | null
          manager_reviewed_at?: string | null
          penalties_to_waive?: number | null
          requested_at?: string | null
          requested_by?: string | null
          signature_data?: string | null
          status?: Database["public"]["Enums"]["waiver_status"] | null
          supporting_documents?: Json | null
          updated_at?: string | null
          waiver_number?: string | null
        }
        Relationships: []
      }
      contribution_vouchers: {
        Row: {
          amount_due: number
          contribution_category: Database["public"]["Enums"]["contribution_category"]
          contributor_id: string | null
          created_at: string | null
          generated_by: string | null
          id: string
          is_prorated: boolean | null
          overdue: boolean | null
          paid: boolean | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          proration_details: string | null
          reminder_date: string | null
          reminder_sent: boolean | null
          updated_at: string | null
          voucher_number: string | null
        }
        Insert: {
          amount_due: number
          contribution_category: Database["public"]["Enums"]["contribution_category"]
          contributor_id?: string | null
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_prorated?: boolean | null
          overdue?: boolean | null
          paid?: boolean | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          proration_details?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          updated_at?: string | null
          voucher_number?: string | null
        }
        Update: {
          amount_due?: number
          contribution_category?: Database["public"]["Enums"]["contribution_category"]
          contributor_id?: string | null
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_prorated?: boolean | null
          overdue?: boolean | null
          paid?: boolean | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          proration_details?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          updated_at?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_vouchers_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contributor_profiles: {
        Row: {
          active: boolean | null
          address: string | null
          category_change_count: number | null
          category_effective_date: string | null
          cessation_date: string | null
          contribution_category: Database["public"]["Enums"]["contribution_category"]
          contributor_type: Database["public"]["Enums"]["compliance_registration_type"]
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          enrollment_date: string | null
          full_name: string
          id: string
          last_category_change: string | null
          phone: string | null
          registration_id: string | null
          ssn: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          category_change_count?: number | null
          category_effective_date?: string | null
          cessation_date?: string | null
          contribution_category: Database["public"]["Enums"]["contribution_category"]
          contributor_type: Database["public"]["Enums"]["compliance_registration_type"]
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          full_name: string
          id?: string
          last_category_change?: string | null
          phone?: string | null
          registration_id?: string | null
          ssn?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          category_change_count?: number | null
          category_effective_date?: string | null
          cessation_date?: string | null
          contribution_category?: Database["public"]["Enums"]["contribution_category"]
          contributor_type?: Database["public"]["Enums"]["compliance_registration_type"]
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          full_name?: string
          id?: string
          last_category_change?: string | null
          phone?: string | null
          registration_id?: string | null
          ssn?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributor_profiles_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "compliance_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_policy_audit_log: {
        Row: {
          access_granted: boolean | null
          action: string
          created_at: string | null
          denial_reason: string | null
          id: string
          module_name: string | null
          record_id: string | null
          rules_applied: Json | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean | null
          action: string
          created_at?: string | null
          denial_reason?: string | null
          id?: string
          module_name?: string | null
          record_id?: string | null
          rules_applied?: Json | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean | null
          action?: string
          created_at?: string | null
          denial_reason?: string | null
          id?: string
          module_name?: string | null
          record_id?: string | null
          rules_applied?: Json | null
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_scope_rules: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          condition_type: Database["public"]["Enums"]["data_scope_condition_type"]
          condition_value: string | null
          created_at: string | null
          created_by: string | null
          custom_sql: string | null
          description: string | null
          id: string
          is_active: boolean
          module_id: string | null
          priority: number
          role_id: string | null
          target_table: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          condition_type: Database["public"]["Enums"]["data_scope_condition_type"]
          condition_value?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_sql?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          module_id?: string | null
          priority?: number
          role_id?: string | null
          target_table: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          condition_type?: Database["public"]["Enums"]["data_scope_condition_type"]
          condition_value?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_sql?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          module_id?: string | null
          priority?: number
          role_id?: string | null
          target_table?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_scope_rules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_scope_rules_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      db_diagram_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          details: string | null
          id: string
          ip_address: string | null
          module_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          details?: string | null
          id?: string
          ip_address?: string | null
          module_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          module_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      db_diagram_analysis_logs: {
        Row: {
          analysis_scope: string | null
          created_at: string | null
          duration_ms: number | null
          errors: string | null
          id: string
          module_id: string | null
          relationships_found: number | null
          status: string | null
          tables_found: number | null
          triggered_at: string | null
          triggered_by: string | null
          warnings: string | null
        }
        Insert: {
          analysis_scope?: string | null
          created_at?: string | null
          duration_ms?: number | null
          errors?: string | null
          id?: string
          module_id?: string | null
          relationships_found?: number | null
          status?: string | null
          tables_found?: number | null
          triggered_at?: string | null
          triggered_by?: string | null
          warnings?: string | null
        }
        Update: {
          analysis_scope?: string | null
          created_at?: string | null
          duration_ms?: number | null
          errors?: string | null
          id?: string
          module_id?: string | null
          relationships_found?: number | null
          status?: string | null
          tables_found?: number | null
          triggered_at?: string | null
          triggered_by?: string | null
          warnings?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "db_diagram_analysis_logs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      db_diagram_module_dependencies: {
        Row: {
          created_at: string | null
          criticality: string | null
          dependency_type: string | null
          description: string | null
          id: string
          last_analyzed_at: string | null
          source_module_id: string | null
          tables_involved: string | null
          target_module_id: string | null
        }
        Insert: {
          created_at?: string | null
          criticality?: string | null
          dependency_type?: string | null
          description?: string | null
          id?: string
          last_analyzed_at?: string | null
          source_module_id?: string | null
          tables_involved?: string | null
          target_module_id?: string | null
        }
        Update: {
          created_at?: string | null
          criticality?: string | null
          dependency_type?: string | null
          description?: string | null
          id?: string
          last_analyzed_at?: string | null
          source_module_id?: string | null
          tables_involved?: string | null
          target_module_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "db_diagram_module_dependencies_source_module_id_fkey"
            columns: ["source_module_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "db_diagram_module_dependencies_target_module_id_fkey"
            columns: ["target_module_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      db_diagram_modules: {
        Row: {
          created_at: string | null
          current_version_no: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_analyzed_at: string | null
          last_analyzed_by: string | null
          module_code: string
          module_name: string
          remarks: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_version_no?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_analyzed_at?: string | null
          last_analyzed_by?: string | null
          module_code: string
          module_name: string
          remarks?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_version_no?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_analyzed_at?: string | null
          last_analyzed_by?: string | null
          module_code?: string
          module_name?: string
          remarks?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      db_diagram_object_references: {
        Row: {
          created_at: string | null
          id: string
          module_id: string | null
          object_name: string
          object_type: string
          reference_path: string | null
          remarks: string | null
          table_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          object_name: string
          object_type: string
          reference_path?: string | null
          remarks?: string | null
          table_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          object_name?: string
          object_type?: string
          reference_path?: string | null
          remarks?: string | null
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "db_diagram_object_references_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "db_diagram_object_references_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      db_diagram_relationships: {
        Row: {
          cardinality: string | null
          created_at: string | null
          dependency_strength: string | null
          description: string | null
          id: string
          is_inferred: boolean | null
          is_physical_fk: boolean | null
          last_analyzed_at: string | null
          relationship_type: string | null
          source_column: string
          source_table_id: string | null
          target_column: string
          target_table_id: string | null
        }
        Insert: {
          cardinality?: string | null
          created_at?: string | null
          dependency_strength?: string | null
          description?: string | null
          id?: string
          is_inferred?: boolean | null
          is_physical_fk?: boolean | null
          last_analyzed_at?: string | null
          relationship_type?: string | null
          source_column: string
          source_table_id?: string | null
          target_column: string
          target_table_id?: string | null
        }
        Update: {
          cardinality?: string | null
          created_at?: string | null
          dependency_strength?: string | null
          description?: string | null
          id?: string
          is_inferred?: boolean | null
          is_physical_fk?: boolean | null
          last_analyzed_at?: string | null
          relationship_type?: string | null
          source_column?: string
          source_table_id?: string | null
          target_column?: string
          target_table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "db_diagram_relationships_source_table_id_fkey"
            columns: ["source_table_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "db_diagram_relationships_target_table_id_fkey"
            columns: ["target_table_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      db_diagram_saved_layouts: {
        Row: {
          created_at: string
          created_by: string | null
          excluded_table_ids: string[]
          id: string
          included_table_ids: string[]
          is_default: boolean
          layout_name: string
          module_id: string | null
          node_positions: Json
          updated_at: string
          updated_by: string | null
          viewport_x: number | null
          viewport_y: number | null
          zoom_level: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          excluded_table_ids?: string[]
          id?: string
          included_table_ids?: string[]
          is_default?: boolean
          layout_name?: string
          module_id?: string | null
          node_positions?: Json
          updated_at?: string
          updated_by?: string | null
          viewport_x?: number | null
          viewport_y?: number | null
          zoom_level?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          excluded_table_ids?: string[]
          id?: string
          included_table_ids?: string[]
          is_default?: boolean
          layout_name?: string
          module_id?: string | null
          node_positions?: Json
          updated_at?: string
          updated_by?: string | null
          viewport_x?: number | null
          viewport_y?: number | null
          zoom_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "db_diagram_saved_layouts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      db_diagram_table_module_map: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          is_primary_owner: boolean | null
          module_id: string | null
          ownership_type: string | null
          remarks: string | null
          table_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          is_primary_owner?: boolean | null
          module_id?: string | null
          ownership_type?: string | null
          remarks?: string | null
          table_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          is_primary_owner?: boolean | null
          module_id?: string | null
          ownership_type?: string | null
          remarks?: string | null
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "db_diagram_table_module_map_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "db_diagram_table_module_map_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      db_diagram_tables: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_row_count: number | null
          foreign_key_summary: string | null
          id: string
          index_summary: string | null
          is_physical_table: boolean | null
          is_shared: boolean | null
          is_view: boolean | null
          last_analyzed_at: string | null
          module_id: string | null
          primary_key_summary: string | null
          schema_name: string | null
          table_category: string | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_row_count?: number | null
          foreign_key_summary?: string | null
          id?: string
          index_summary?: string | null
          is_physical_table?: boolean | null
          is_shared?: boolean | null
          is_view?: boolean | null
          last_analyzed_at?: string | null
          module_id?: string | null
          primary_key_summary?: string | null
          schema_name?: string | null
          table_category?: string | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_row_count?: number | null
          foreign_key_summary?: string | null
          id?: string
          index_summary?: string | null
          is_physical_table?: boolean | null
          is_shared?: boolean | null
          is_view?: boolean | null
          last_analyzed_at?: string | null
          module_id?: string | null
          primary_key_summary?: string | null
          schema_name?: string | null
          table_category?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_diagram_tables_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      db_diagram_versions: {
        Row: {
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          generation_type: string | null
          id: string
          is_current: boolean | null
          module_id: string | null
          snapshot_json: Json | null
          summary: string | null
          version_no: number
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generation_type?: string | null
          id?: string
          is_current?: boolean | null
          module_id?: string | null
          snapshot_json?: Json | null
          summary?: string | null
          version_no: number
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generation_type?: string | null
          id?: string
          is_current?: boolean | null
          module_id?: string | null
          snapshot_json?: Json | null
          summary?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "db_diagram_versions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "db_diagram_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      designation_hierarchy: {
        Row: {
          created_at: string
          designation_id: string
          id: string
          level: number
          parent_designation_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation_id: string
          id?: string
          level?: number
          parent_designation_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation_id?: string
          id?: string
          level?: number
          parent_designation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designation_hierarchy_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: true
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designation_hierarchy_parent_designation_id_fkey"
            columns: ["parent_designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
        ]
      }
      designations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      dev_info_access_log: {
        Row: {
          accessed_at: string | null
          accessed_by: string | null
          action_type: string | null
          id: string
          ip_address: string | null
          remarks: string | null
          screen_code: string | null
          screen_id: string | null
          user_role: string | null
        }
        Insert: {
          accessed_at?: string | null
          accessed_by?: string | null
          action_type?: string | null
          id?: string
          ip_address?: string | null
          remarks?: string | null
          screen_code?: string | null
          screen_id?: string | null
          user_role?: string | null
        }
        Update: {
          accessed_at?: string | null
          accessed_by?: string | null
          action_type?: string | null
          id?: string
          ip_address?: string | null
          remarks?: string | null
          screen_code?: string | null
          screen_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dev_info_access_log_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dev_info_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_info_actions: {
        Row: {
          action_description: string | null
          action_name: string
          action_type: string | null
          api_or_service_called: string | null
          business_logic: string | null
          created_at: string | null
          downstream_effect: string | null
          id: string
          permission_required: string | null
          remarks: string | null
          screen_id: string
          tables_affected: string | null
        }
        Insert: {
          action_description?: string | null
          action_name: string
          action_type?: string | null
          api_or_service_called?: string | null
          business_logic?: string | null
          created_at?: string | null
          downstream_effect?: string | null
          id?: string
          permission_required?: string | null
          remarks?: string | null
          screen_id: string
          tables_affected?: string | null
        }
        Update: {
          action_description?: string | null
          action_name?: string
          action_type?: string | null
          api_or_service_called?: string | null
          business_logic?: string | null
          created_at?: string | null
          downstream_effect?: string | null
          id?: string
          permission_required?: string | null
          remarks?: string | null
          screen_id?: string
          tables_affected?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dev_info_actions_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dev_info_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_info_audit: {
        Row: {
          audit_description: string | null
          audit_type: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          remarks: string | null
          screen_id: string
        }
        Insert: {
          audit_description?: string | null
          audit_type?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          remarks?: string | null
          screen_id: string
        }
        Update: {
          audit_description?: string | null
          audit_type?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          remarks?: string | null
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_info_audit_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dev_info_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_info_dependencies: {
        Row: {
          created_at: string | null
          dependency_details: string | null
          dependency_name: string
          dependency_type: string
          id: string
          remarks: string | null
          screen_id: string
        }
        Insert: {
          created_at?: string | null
          dependency_details?: string | null
          dependency_name: string
          dependency_type: string
          id?: string
          remarks?: string | null
          screen_id: string
        }
        Update: {
          created_at?: string | null
          dependency_details?: string | null
          dependency_name?: string
          dependency_type?: string
          id?: string
          remarks?: string | null
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_info_dependencies_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dev_info_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_info_documents: {
        Row: {
          created_at: string | null
          document_name: string | null
          document_reference: string | null
          document_type: string | null
          id: string
          remarks: string | null
          screen_id: string
        }
        Insert: {
          created_at?: string | null
          document_name?: string | null
          document_reference?: string | null
          document_type?: string | null
          id?: string
          remarks?: string | null
          screen_id: string
        }
        Update: {
          created_at?: string | null
          document_name?: string | null
          document_reference?: string | null
          document_type?: string | null
          id?: string
          remarks?: string | null
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_info_documents_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dev_info_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_info_fields: {
        Row: {
          control_type: string | null
          created_at: string | null
          data_type: string | null
          default_logic: string | null
          edit_rule: string | null
          field_label: string | null
          field_name: string
          id: string
          is_required: boolean | null
          remarks: string | null
          screen_id: string
          sort_order: number | null
          source_column: string | null
          source_table: string | null
          validation_rule: string | null
          visibility_rule: string | null
        }
        Insert: {
          control_type?: string | null
          created_at?: string | null
          data_type?: string | null
          default_logic?: string | null
          edit_rule?: string | null
          field_label?: string | null
          field_name: string
          id?: string
          is_required?: boolean | null
          remarks?: string | null
          screen_id: string
          sort_order?: number | null
          source_column?: string | null
          source_table?: string | null
          validation_rule?: string | null
          visibility_rule?: string | null
        }
        Update: {
          control_type?: string | null
          created_at?: string | null
          data_type?: string | null
          default_logic?: string | null
          edit_rule?: string | null
          field_label?: string | null
          field_name?: string
          id?: string
          is_required?: boolean | null
          remarks?: string | null
          screen_id?: string
          sort_order?: number | null
          source_column?: string | null
          source_table?: string | null
          validation_rule?: string | null
          visibility_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dev_info_fields_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dev_info_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_info_logic: {
        Row: {
          created_at: string | null
          execution_order: number | null
          id: string
          logic_description: string | null
          logic_title: string
          logic_type: string
          screen_id: string
        }
        Insert: {
          created_at?: string | null
          execution_order?: number | null
          id?: string
          logic_description?: string | null
          logic_title: string
          logic_type: string
          screen_id: string
        }
        Update: {
          created_at?: string | null
          execution_order?: number | null
          id?: string
          logic_description?: string | null
          logic_title?: string
          logic_type?: string
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_info_logic_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dev_info_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_info_screens: {
        Row: {
          business_purpose: string | null
          created_at: string | null
          created_by: string | null
          documentation_status: string | null
          downstream_screens: string | null
          functional_summary: string | null
          id: string
          is_active: boolean | null
          last_ai_analysis_at: string | null
          menu_path: string | null
          module_name: string | null
          primary_user_roles: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          route_url: string | null
          screen_code: string
          screen_name: string
          screen_type: string | null
          submodule_name: string | null
          trigger_context: string | null
          updated_at: string | null
          updated_by: string | null
          upstream_screens: string | null
        }
        Insert: {
          business_purpose?: string | null
          created_at?: string | null
          created_by?: string | null
          documentation_status?: string | null
          downstream_screens?: string | null
          functional_summary?: string | null
          id?: string
          is_active?: boolean | null
          last_ai_analysis_at?: string | null
          menu_path?: string | null
          module_name?: string | null
          primary_user_roles?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_url?: string | null
          screen_code: string
          screen_name: string
          screen_type?: string | null
          submodule_name?: string | null
          trigger_context?: string | null
          updated_at?: string | null
          updated_by?: string | null
          upstream_screens?: string | null
        }
        Update: {
          business_purpose?: string | null
          created_at?: string | null
          created_by?: string | null
          documentation_status?: string | null
          downstream_screens?: string | null
          functional_summary?: string | null
          id?: string
          is_active?: boolean | null
          last_ai_analysis_at?: string | null
          menu_path?: string | null
          module_name?: string | null
          primary_user_roles?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_url?: string | null
          screen_code?: string
          screen_name?: string
          screen_type?: string | null
          submodule_name?: string | null
          trigger_context?: string | null
          updated_at?: string | null
          updated_by?: string | null
          upstream_screens?: string | null
        }
        Relationships: []
      }
      dev_info_table_maps: {
        Row: {
          created_at: string | null
          id: string
          purpose: string | null
          remarks: string | null
          screen_id: string
          table_name: string
          table_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          purpose?: string | null
          remarks?: string | null
          screen_id: string
          table_name: string
          table_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          purpose?: string | null
          remarks?: string | null
          screen_id?: string
          table_name?: string
          table_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dev_info_table_maps_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "dev_info_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      document_purpose_rules: {
        Row: {
          ai_prompt_hint: string | null
          created_at: string
          doc_code: string
          doc_description: string
          expected_keywords: string[]
          id: string
          is_active: boolean
          min_confidence: number
          updated_at: string
        }
        Insert: {
          ai_prompt_hint?: string | null
          created_at?: string
          doc_code: string
          doc_description: string
          expected_keywords?: string[]
          id?: string
          is_active?: boolean
          min_confidence?: number
          updated_at?: string
        }
        Update: {
          ai_prompt_hint?: string | null
          created_at?: string
          doc_code?: string
          doc_description?: string
          expected_keywords?: string[]
          id?: string
          is_active?: boolean
          min_confidence?: number
          updated_at?: string
        }
        Relationships: []
      }
      document_validation_results: {
        Row: {
          confidence: number | null
          doc_code: string
          document_id: string
          extracted_text_preview: string | null
          id: string
          is_valid: boolean
          reason: string | null
          validated_at: string
          validated_by: string | null
        }
        Insert: {
          confidence?: number | null
          doc_code: string
          document_id: string
          extracted_text_preview?: string | null
          id?: string
          is_valid?: boolean
          reason?: string | null
          validated_at?: string
          validated_by?: string | null
        }
        Update: {
          confidence?: number | null
          doc_code?: string
          document_id?: string
          extracted_text_preview?: string | null
          id?: string
          is_valid?: boolean
          reason?: string | null
          validated_at?: string
          validated_by?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_count: number | null
          from_email: string
          from_name: string
          html_body: string
          id: string
          metadata: Json | null
          name: string
          plain_body: string | null
          recipient_emails: string[] | null
          recipient_filter: string
          sent_count: number | null
          status: string
          subject: string
          total_recipients: number | null
          triggered_at: string | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_count?: number | null
          from_email?: string
          from_name?: string
          html_body: string
          id?: string
          metadata?: Json | null
          name: string
          plain_body?: string | null
          recipient_emails?: string[] | null
          recipient_filter?: string
          sent_count?: number | null
          status?: string
          subject: string
          total_recipients?: number | null
          triggered_at?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_count?: number | null
          from_email?: string
          from_name?: string
          html_body?: string
          id?: string
          metadata?: Json | null
          name?: string
          plain_body?: string | null
          recipient_emails?: string[] | null
          recipient_filter?: string
          sent_count?: number | null
          status?: string
          subject?: string
          total_recipients?: number | null
          triggered_at?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_layout_components: {
        Row: {
          component_type: string
          created_at: string
          created_by: string | null
          display_name: string
          html_content: string
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
          version_no: number
        }
        Insert: {
          component_type: string
          created_at?: string
          created_by?: string | null
          display_name: string
          html_content: string
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          version_no?: number
        }
        Update: {
          component_type?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          html_content?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          version_no?: number
        }
        Relationships: []
      }
      email_provider_test_logs: {
        Row: {
          error_message: string | null
          id: string
          provider_id: string
          response_data: Json | null
          status: string
          test_to: string
          tested_at: string | null
          tested_by: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          provider_id: string
          response_data?: Json | null
          status?: string
          test_to: string
          tested_at?: string | null
          tested_by?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          provider_id?: string
          response_data?: Json | null
          status?: string
          test_to?: string
          tested_at?: string | null
          tested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_provider_test_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "notification_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      er_commence: {
        Row: {
          commence_seq_no: number
          date_ceased: string | null
          date_commenced: string | null
          date_modified: string | null
          modified_by: string | null
          regno: string
        }
        Insert: {
          commence_seq_no?: number
          date_ceased?: string | null
          date_commenced?: string | null
          date_modified?: string | null
          modified_by?: string | null
          regno: string
        }
        Update: {
          commence_seq_no?: number
          date_ceased?: string | null
          date_commenced?: string | null
          date_modified?: string | null
          modified_by?: string | null
          regno?: string
        }
        Relationships: []
      }
      er_last_regno: {
        Row: {
          date_issued: string
          regno: string
        }
        Insert: {
          date_issued: string
          regno: string
        }
        Update: {
          date_issued?: string
          regno?: string
        }
        Relationships: []
      }
      er_locations: {
        Row: {
          activity_type: string | null
          loc_addr1: string | null
          loc_addr2: string | null
          location_id: number
          regno: string
          trade_name: string | null
        }
        Insert: {
          activity_type?: string | null
          loc_addr1?: string | null
          loc_addr2?: string | null
          location_id?: number
          regno: string
          trade_name?: string | null
        }
        Update: {
          activity_type?: string | null
          loc_addr1?: string | null
          loc_addr2?: string | null
          location_id?: number
          regno?: string
          trade_name?: string | null
        }
        Relationships: []
      }
      er_master: {
        Row: {
          acquired_code: string | null
          activity_type: string | null
          application_date: string | null
          arrears: string | null
          computer_payroll: string | null
          date_incorporated: string | null
          date_modified: string | null
          date_of_acquisition: string | null
          date_of_closure: string | null
          date_of_entry: string | null
          date_of_issue: string | null
          date_verified: string | null
          date_wages_first_paid: string | null
          disk_tape: string | null
          email: string | null
          entered_by: string | null
          estim_arrears_lv: number | null
          estim_arrears_pe: number | null
          estim_arrears_ss: number | null
          estim_wages_lv: number | null
          estim_wages_pe: number | null
          estim_wages_ss: number | null
          exp_mthly_income: number | null
          fax: string | null
          females_employed: number | null
          hq_addr1: string | null
          hq_addr2: string | null
          industrial_code: string | null
          inspector_code: string | null
          legal_action: string | null
          maddr1: string | null
          maddr2: string | null
          make_model: string | null
          males_employed: number | null
          mobile: string | null
          modified_by: string | null
          name: string
          office_code: string | null
          ownership_code: string | null
          parent_regno: string | null
          phone: string | null
          prev_owner_addr1: string | null
          prev_owner_addr2: string | null
          previous_owner: string | null
          re_registration_date: string | null
          registration_date: string | null
          registry_num: string | null
          regno: string
          sector_code: string | null
          status: string | null
          trade_name: string | null
          verified_by: string | null
          village_code: string | null
        }
        Insert: {
          acquired_code?: string | null
          activity_type?: string | null
          application_date?: string | null
          arrears?: string | null
          computer_payroll?: string | null
          date_incorporated?: string | null
          date_modified?: string | null
          date_of_acquisition?: string | null
          date_of_closure?: string | null
          date_of_entry?: string | null
          date_of_issue?: string | null
          date_verified?: string | null
          date_wages_first_paid?: string | null
          disk_tape?: string | null
          email?: string | null
          entered_by?: string | null
          estim_arrears_lv?: number | null
          estim_arrears_pe?: number | null
          estim_arrears_ss?: number | null
          estim_wages_lv?: number | null
          estim_wages_pe?: number | null
          estim_wages_ss?: number | null
          exp_mthly_income?: number | null
          fax?: string | null
          females_employed?: number | null
          hq_addr1?: string | null
          hq_addr2?: string | null
          industrial_code?: string | null
          inspector_code?: string | null
          legal_action?: string | null
          maddr1?: string | null
          maddr2?: string | null
          make_model?: string | null
          males_employed?: number | null
          mobile?: string | null
          modified_by?: string | null
          name: string
          office_code?: string | null
          ownership_code?: string | null
          parent_regno?: string | null
          phone?: string | null
          prev_owner_addr1?: string | null
          prev_owner_addr2?: string | null
          previous_owner?: string | null
          re_registration_date?: string | null
          registration_date?: string | null
          registry_num?: string | null
          regno: string
          sector_code?: string | null
          status?: string | null
          trade_name?: string | null
          verified_by?: string | null
          village_code?: string | null
        }
        Update: {
          acquired_code?: string | null
          activity_type?: string | null
          application_date?: string | null
          arrears?: string | null
          computer_payroll?: string | null
          date_incorporated?: string | null
          date_modified?: string | null
          date_of_acquisition?: string | null
          date_of_closure?: string | null
          date_of_entry?: string | null
          date_of_issue?: string | null
          date_verified?: string | null
          date_wages_first_paid?: string | null
          disk_tape?: string | null
          email?: string | null
          entered_by?: string | null
          estim_arrears_lv?: number | null
          estim_arrears_pe?: number | null
          estim_arrears_ss?: number | null
          estim_wages_lv?: number | null
          estim_wages_pe?: number | null
          estim_wages_ss?: number | null
          exp_mthly_income?: number | null
          fax?: string | null
          females_employed?: number | null
          hq_addr1?: string | null
          hq_addr2?: string | null
          industrial_code?: string | null
          inspector_code?: string | null
          legal_action?: string | null
          maddr1?: string | null
          maddr2?: string | null
          make_model?: string | null
          males_employed?: number | null
          mobile?: string | null
          modified_by?: string | null
          name?: string
          office_code?: string | null
          ownership_code?: string | null
          parent_regno?: string | null
          phone?: string | null
          prev_owner_addr1?: string | null
          prev_owner_addr2?: string | null
          previous_owner?: string | null
          re_registration_date?: string | null
          registration_date?: string | null
          registry_num?: string | null
          regno?: string
          sector_code?: string | null
          status?: string | null
          trade_name?: string | null
          verified_by?: string | null
          village_code?: string | null
        }
        Relationships: []
      }
      er_notes: {
        Row: {
          note: string | null
          note_date: string
          regno: string
          seq_no: number
          user_id: string | null
        }
        Insert: {
          note?: string | null
          note_date: string
          regno: string
          seq_no?: number
          user_id?: string | null
        }
        Update: {
          note?: string | null
          note_date?: string
          regno?: string
          seq_no?: number
          user_id?: string | null
        }
        Relationships: []
      }
      er_notification: {
        Row: {
          amount: number | null
          comment: string | null
          event_date: string | null
          eventid: number
          name: string | null
          status_code: string | null
          userid: string | null
        }
        Insert: {
          amount?: number | null
          comment?: string | null
          event_date?: string | null
          eventid?: number
          name?: string | null
          status_code?: string | null
          userid?: string | null
        }
        Update: {
          amount?: number | null
          comment?: string | null
          event_date?: string | null
          eventid?: number
          name?: string | null
          status_code?: string | null
          userid?: string | null
        }
        Relationships: []
      }
      er_owner: {
        Row: {
          email: string | null
          location_id: number
          mobile: string | null
          name: string | null
          owner_id: number
          phone: string | null
          regno: string
          ssn: string | null
          title: string | null
        }
        Insert: {
          email?: string | null
          location_id: number
          mobile?: string | null
          name?: string | null
          owner_id?: number
          phone?: string | null
          regno: string
          ssn?: string | null
          title?: string | null
        }
        Update: {
          email?: string | null
          location_id?: number
          mobile?: string | null
          name?: string | null
          owner_id?: number
          phone?: string | null
          regno?: string
          ssn?: string | null
          title?: string | null
        }
        Relationships: []
      }
      er_suit: {
        Row: {
          awarded_amount: number | null
          awarded_cost: number | null
          beginperiod: string | null
          date_modified: string | null
          date_of_entry: string | null
          date_of_filing: string | null
          date_of_hearing: string | null
          date_pay_by: string | null
          date_verified: string | null
          endperiod: string | null
          entered_by: string | null
          initial_suit_no: string | null
          initial_suit_year: string | null
          jds_no: string | null
          jds_year: string | null
          modified_by: string | null
          outcome_code: string | null
          regno: string
          remarks: string | null
          remarks2: string | null
          scheme_code: string | null
          suit_amount: number | null
          suit_identifier: number
          suit_no: string | null
          suit_status: string | null
          suit_type: string | null
          suit_year: string | null
          verified_by: string | null
        }
        Insert: {
          awarded_amount?: number | null
          awarded_cost?: number | null
          beginperiod?: string | null
          date_modified?: string | null
          date_of_entry?: string | null
          date_of_filing?: string | null
          date_of_hearing?: string | null
          date_pay_by?: string | null
          date_verified?: string | null
          endperiod?: string | null
          entered_by?: string | null
          initial_suit_no?: string | null
          initial_suit_year?: string | null
          jds_no?: string | null
          jds_year?: string | null
          modified_by?: string | null
          outcome_code?: string | null
          regno: string
          remarks?: string | null
          remarks2?: string | null
          scheme_code?: string | null
          suit_amount?: number | null
          suit_identifier?: number
          suit_no?: string | null
          suit_status?: string | null
          suit_type?: string | null
          suit_year?: string | null
          verified_by?: string | null
        }
        Update: {
          awarded_amount?: number | null
          awarded_cost?: number | null
          beginperiod?: string | null
          date_modified?: string | null
          date_of_entry?: string | null
          date_of_filing?: string | null
          date_of_hearing?: string | null
          date_pay_by?: string | null
          date_verified?: string | null
          endperiod?: string | null
          entered_by?: string | null
          initial_suit_no?: string | null
          initial_suit_year?: string | null
          jds_no?: string | null
          jds_year?: string | null
          modified_by?: string | null
          outcome_code?: string | null
          regno?: string
          remarks?: string | null
          remarks2?: string | null
          scheme_code?: string | null
          suit_amount?: number | null
          suit_identifier?: number
          suit_no?: string | null
          suit_status?: string | null
          suit_type?: string | null
          suit_year?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      er_visit: {
        Row: {
          date_of_visit: string
          inspector_code: string | null
          location_id: number
          number_of_jobs: number | null
          operation_code: string | null
          outcome_code: string | null
          regno: string
          time_end: string | null
          time_start: string | null
          work_code: string | null
        }
        Insert: {
          date_of_visit: string
          inspector_code?: string | null
          location_id: number
          number_of_jobs?: number | null
          operation_code?: string | null
          outcome_code?: string | null
          regno: string
          time_end?: string | null
          time_start?: string | null
          work_code?: string | null
        }
        Update: {
          date_of_visit?: string
          inspector_code?: string | null
          location_id?: number
          number_of_jobs?: number | null
          operation_code?: string | null
          outcome_code?: string | null
          regno?: string
          time_end?: string | null
          time_start?: string | null
          work_code?: string | null
        }
        Relationships: []
      }
      external_api_change_log: {
        Row: {
          api_id: string
          change_description: string
          changed_at: string
          changed_by: string | null
          id: string
          version: string
        }
        Insert: {
          api_id: string
          change_description: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          version: string
        }
        Update: {
          api_id?: string
          change_description?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_api_change_log_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "external_api_master"
            referencedColumns: ["id"]
          },
        ]
      }
      external_api_execution_logs: {
        Row: {
          api_id: string
          created_at: string
          error_message: string | null
          executed_by: string | null
          execution_time_ms: number | null
          http_status_code: number | null
          id: string
          is_success: boolean | null
          request_payload: Json | null
          response_payload: Json | null
        }
        Insert: {
          api_id: string
          created_at?: string
          error_message?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          http_status_code?: number | null
          id?: string
          is_success?: boolean | null
          request_payload?: Json | null
          response_payload?: Json | null
        }
        Update: {
          api_id?: string
          created_at?: string
          error_message?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          http_status_code?: number | null
          id?: string
          is_success?: boolean | null
          request_payload?: Json | null
          response_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "external_api_execution_logs_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "external_api_master"
            referencedColumns: ["id"]
          },
        ]
      }
      external_api_master: {
        Row: {
          api_code: string
          api_group: string
          api_name: string
          auth_type: string
          created_at: string
          description: string | null
          endpoint_url: string
          http_method: string
          id: string
          is_active: boolean
          is_public: boolean
          requires_auth: boolean
          updated_at: string
          version: string
        }
        Insert: {
          api_code: string
          api_group: string
          api_name: string
          auth_type?: string
          created_at?: string
          description?: string | null
          endpoint_url: string
          http_method?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          requires_auth?: boolean
          updated_at?: string
          version?: string
        }
        Update: {
          api_code?: string
          api_group?: string
          api_name?: string
          auth_type?: string
          created_at?: string
          description?: string | null
          endpoint_url?: string
          http_method?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          requires_auth?: boolean
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      external_api_request_fields: {
        Row: {
          api_id: string
          data_type: string
          description: string | null
          display_order: number
          field_name: string
          id: string
          is_required: boolean
          location: string
          sample_value: string | null
        }
        Insert: {
          api_id: string
          data_type?: string
          description?: string | null
          display_order?: number
          field_name: string
          id?: string
          is_required?: boolean
          location?: string
          sample_value?: string | null
        }
        Update: {
          api_id?: string
          data_type?: string
          description?: string | null
          display_order?: number
          field_name?: string
          id?: string
          is_required?: boolean
          location?: string
          sample_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_api_request_fields_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "external_api_master"
            referencedColumns: ["id"]
          },
        ]
      }
      external_api_response_fields: {
        Row: {
          api_id: string
          data_type: string
          description: string | null
          display_order: number
          field_name: string
          id: string
          sample_value: string | null
        }
        Insert: {
          api_id: string
          data_type?: string
          description?: string | null
          display_order?: number
          field_name: string
          id?: string
          sample_value?: string | null
        }
        Update: {
          api_id?: string
          data_type?: string
          description?: string | null
          display_order?: number
          field_name?: string
          id?: string
          sample_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_api_response_fields_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "external_api_master"
            referencedColumns: ["id"]
          },
        ]
      }
      external_api_role_mapping: {
        Row: {
          api_id: string
          created_at: string
          id: string
          role_name: string
        }
        Insert: {
          api_id: string
          created_at?: string
          id?: string
          role_name: string
        }
        Update: {
          api_id?: string
          created_at?: string
          id?: string
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_api_role_mapping_api_id_fkey"
            columns: ["api_id"]
            isOneToOne: false
            referencedRelation: "external_api_master"
            referencedColumns: ["id"]
          },
        ]
      }
      field_security_rules: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string | null
          created_by: string | null
          description: string | null
          field_name: string
          id: string
          is_active: boolean
          masking_type: Database["public"]["Enums"]["field_masking_type"]
          module_id: string | null
          priority: number
          role_id: string | null
          target_table: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_name: string
          id?: string
          is_active?: boolean
          masking_type?: Database["public"]["Enums"]["field_masking_type"]
          module_id?: string | null
          priority?: number
          role_id?: string | null
          target_table: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_name?: string
          id?: string
          is_active?: boolean
          masking_type?: Database["public"]["Enums"]["field_masking_type"]
          module_id?: string | null
          priority?: number
          role_id?: string | null
          target_table?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_security_rules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_security_rules_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_action_plan_milestones: {
        Row: {
          action_id: string | null
          completion_percent: number | null
          created_at: string | null
          created_by: string | null
          evidence: string | null
          id: string
          milestone_name: string
          owner: string | null
          status: string | null
          target_date: string | null
          update_notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action_id?: string | null
          completion_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          evidence?: string | null
          id?: string
          milestone_name: string
          owner?: string | null
          status?: string | null
          target_date?: string | null
          update_notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action_id?: string | null
          completion_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          evidence?: string | null
          id?: string
          milestone_name?: string
          owner?: string | null
          status?: string | null
          target_date?: string | null
          update_notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_action_plan_updates: {
        Row: {
          action_id: string | null
          created_at: string | null
          evidence_url: string | null
          id: string
          notes: string | null
          progress_percent: number | null
          update_date: string | null
          updated_by_user: string | null
        }
        Insert: {
          action_id?: string | null
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          progress_percent?: number | null
          update_date?: string | null
          updated_by_user?: string | null
        }
        Update: {
          action_id?: string | null
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          notes?: string | null
          progress_percent?: number | null
          update_date?: string | null
          updated_by_user?: string | null
        }
        Relationships: []
      }
      ia_action_tracking: {
        Row: {
          action_description: string | null
          action_status: string | null
          created_at: string | null
          created_by: string | null
          evidence_of_implementation: string[] | null
          finding_id: string
          id: string
          notes: string | null
          response_id: string | null
          responsible_person: string | null
          status: string | null
          target_date: string | null
          updated_at: string | null
          updated_by: string | null
          verification_date: string | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          action_description?: string | null
          action_status?: string | null
          created_at?: string | null
          created_by?: string | null
          evidence_of_implementation?: string[] | null
          finding_id: string
          id?: string
          notes?: string | null
          response_id?: string | null
          responsible_person?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verification_date?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          action_description?: string | null
          action_status?: string | null
          created_at?: string | null
          created_by?: string | null
          evidence_of_implementation?: string[] | null
          finding_id?: string
          id?: string
          notes?: string | null
          response_id?: string | null
          responsible_person?: string | null
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verification_date?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_action_tracking_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "ia_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_action_tracking_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "ia_management_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_activities: {
        Row: {
          activity_type: string | null
          actual_date_from: string | null
          actual_date_to: string | null
          annual_plan_id: string | null
          assigned_auditor_ids: string[] | null
          auditor_id: string | null
          auditor_name: string | null
          control_area: string | null
          created_at: string | null
          created_by: string | null
          department_audit_id: string | null
          department_id: string | null
          description: string | null
          end_date: string | null
          engagement_id: string | null
          function_area: string | null
          id: string
          location: string | null
          name: string
          planned_date_from: string | null
          planned_date_to: string | null
          priority: string | null
          start_date: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activity_type?: string | null
          actual_date_from?: string | null
          actual_date_to?: string | null
          annual_plan_id?: string | null
          assigned_auditor_ids?: string[] | null
          auditor_id?: string | null
          auditor_name?: string | null
          control_area?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          engagement_id?: string | null
          function_area?: string | null
          id?: string
          location?: string | null
          name: string
          planned_date_from?: string | null
          planned_date_to?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activity_type?: string | null
          actual_date_from?: string | null
          actual_date_to?: string | null
          annual_plan_id?: string | null
          assigned_auditor_ids?: string[] | null
          auditor_id?: string | null
          auditor_name?: string | null
          control_area?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          engagement_id?: string | null
          function_area?: string | null
          id?: string
          location?: string | null
          name?: string
          planned_date_from?: string | null
          planned_date_to?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_activities_annual_plan_id_fkey"
            columns: ["annual_plan_id"]
            isOneToOne: false
            referencedRelation: "ia_annual_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_activities_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "ia_auditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_activities_department_audit_id_fkey"
            columns: ["department_audit_id"]
            isOneToOne: false
            referencedRelation: "ia_department_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_activities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_activities_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "ia_audit_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_activity_types: {
        Row: {
          created_at: string
          created_by: string | null
          default_duration: number | null
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          sort_order: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_duration?: number | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_duration?: number | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_annual_plans: {
        Row: {
          approval_comments: string | null
          approved_by: string | null
          approved_date: string | null
          auto_notify_on_approval: boolean | null
          committee_email_proof_url: string | null
          committee_minutes_url: string | null
          committee_noted: boolean | null
          created_at: string | null
          created_by: string | null
          created_date: string | null
          fiscal_year: string
          id: string
          internally_approved: boolean | null
          internally_approved_by: string | null
          internally_approved_date: string | null
          methodology: string | null
          objective: string | null
          reviewed_by: string | null
          reviewed_date: string | null
          scope: string | null
          status: string | null
          submitted_date: string | null
          title: string
          total_department_audits: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approval_comments?: string | null
          approved_by?: string | null
          approved_date?: string | null
          auto_notify_on_approval?: boolean | null
          committee_email_proof_url?: string | null
          committee_minutes_url?: string | null
          committee_noted?: boolean | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          fiscal_year: string
          id?: string
          internally_approved?: boolean | null
          internally_approved_by?: string | null
          internally_approved_date?: string | null
          methodology?: string | null
          objective?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          scope?: string | null
          status?: string | null
          submitted_date?: string | null
          title: string
          total_department_audits?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approval_comments?: string | null
          approved_by?: string | null
          approved_date?: string | null
          auto_notify_on_approval?: boolean | null
          committee_email_proof_url?: string | null
          committee_minutes_url?: string | null
          committee_noted?: boolean | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          fiscal_year?: string
          id?: string
          internally_approved?: boolean | null
          internally_approved_by?: string | null
          internally_approved_date?: string | null
          methodology?: string | null
          objective?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          scope?: string | null
          status?: string | null
          submitted_date?: string | null
          title?: string
          total_department_audits?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_audit_config: {
        Row: {
          category: string | null
          config_key: string
          config_type: string | null
          config_value: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string | null
          id: string
          is_editable: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          config_key: string
          config_type?: string | null
          config_value?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          is_editable?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          config_key?: string
          config_type?: string | null
          config_value?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          is_editable?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_audit_engagements: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          annual_plan_id: string | null
          approved_at: string | null
          approved_by: string | null
          budgeted_hours: number | null
          created_at: string | null
          created_by: string | null
          criteria: string | null
          department_audit_id: string | null
          department_id: string | null
          engagement_code: string | null
          engagement_name: string
          engagement_risk_rating: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          lead_auditor_id: string | null
          methodology: string | null
          objectives: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          scope: string | null
          status: string | null
          team_member_ids: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          annual_plan_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budgeted_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          criteria?: string | null
          department_audit_id?: string | null
          department_id?: string | null
          engagement_code?: string | null
          engagement_name: string
          engagement_risk_rating?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          lead_auditor_id?: string | null
          methodology?: string | null
          objectives?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          scope?: string | null
          status?: string | null
          team_member_ids?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          annual_plan_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budgeted_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          criteria?: string | null
          department_audit_id?: string | null
          department_id?: string | null
          engagement_code?: string | null
          engagement_name?: string
          engagement_risk_rating?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          lead_auditor_id?: string | null
          methodology?: string | null
          objectives?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          scope?: string | null
          status?: string | null
          team_member_ids?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_audit_engagements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_audit_procedures: {
        Row: {
          audit_program_id: string | null
          created_at: string | null
          description: string | null
          evidence_required: string | null
          expected_result: string | null
          id: string
          is_active: boolean | null
          procedure_no: string | null
          sort_order: number | null
          test_type: string | null
          title: string
        }
        Insert: {
          audit_program_id?: string | null
          created_at?: string | null
          description?: string | null
          evidence_required?: string | null
          expected_result?: string | null
          id?: string
          is_active?: boolean | null
          procedure_no?: string | null
          sort_order?: number | null
          test_type?: string | null
          title: string
        }
        Update: {
          audit_program_id?: string | null
          created_at?: string | null
          description?: string | null
          evidence_required?: string | null
          expected_result?: string | null
          id?: string
          is_active?: boolean | null
          procedure_no?: string | null
          sort_order?: number | null
          test_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_audit_procedures_audit_program_id_fkey"
            columns: ["audit_program_id"]
            isOneToOne: false
            referencedRelation: "ia_audit_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_audit_programs: {
        Row: {
          approved_by: string | null
          audit_area: string | null
          created_at: string | null
          created_by: string | null
          expected_evidence_json: Json | null
          id: string
          is_active: boolean | null
          linked_controls_json: Json | null
          linked_risks_json: Json | null
          methodology: string | null
          objective: string | null
          procedure_steps_json: Json | null
          program_code: string | null
          program_name: string
          scope: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          approved_by?: string | null
          audit_area?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_evidence_json?: Json | null
          id?: string
          is_active?: boolean | null
          linked_controls_json?: Json | null
          linked_risks_json?: Json | null
          methodology?: string | null
          objective?: string | null
          procedure_steps_json?: Json | null
          program_code?: string | null
          program_name: string
          scope?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          approved_by?: string | null
          audit_area?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_evidence_json?: Json | null
          id?: string
          is_active?: boolean | null
          linked_controls_json?: Json | null
          linked_risks_json?: Json | null
          methodology?: string | null
          objective?: string | null
          procedure_steps_json?: Json | null
          program_code?: string | null
          program_name?: string
          scope?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      ia_audit_reports: {
        Row: {
          approved_on: string | null
          background: string | null
          conclusion: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          distribution_list: string | null
          fiscal_year: string | null
          follow_up_actions: string | null
          generated_on: string | null
          id: string
          key_highlights: string | null
          limitations: string | null
          overall_assessment: string | null
          period: string | null
          plan_id: string | null
          prepared_by: string | null
          report_number: string | null
          report_type: string
          reviewed_by: string | null
          status: string
          submitted_on: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_on?: string | null
          background?: string | null
          conclusion?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          distribution_list?: string | null
          fiscal_year?: string | null
          follow_up_actions?: string | null
          generated_on?: string | null
          id?: string
          key_highlights?: string | null
          limitations?: string | null
          overall_assessment?: string | null
          period?: string | null
          plan_id?: string | null
          prepared_by?: string | null
          report_number?: string | null
          report_type?: string
          reviewed_by?: string | null
          status?: string
          submitted_on?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_on?: string | null
          background?: string | null
          conclusion?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          distribution_list?: string | null
          fiscal_year?: string | null
          follow_up_actions?: string | null
          generated_on?: string | null
          id?: string
          key_highlights?: string | null
          limitations?: string | null
          overall_assessment?: string | null
          period?: string | null
          plan_id?: string | null
          prepared_by?: string | null
          report_number?: string | null
          report_type?: string
          reviewed_by?: string | null
          status?: string
          submitted_on?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_audit_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_audit_reports_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ia_annual_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_audit_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          setting_category: string
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          setting_category: string
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          setting_category?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_audit_universe: {
        Row: {
          audit_frequency: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          entity_code: string | null
          entity_name: string
          entity_type: string
          function_id: string | null
          id: string
          inherent_risk_score: number | null
          is_active: boolean | null
          last_audit_date: string | null
          materiality: string | null
          next_audit_due: string | null
          process_owner: string | null
          regulatory_impact: string | null
          residual_risk_score: number | null
          risk_category: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          audit_frequency?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          entity_code?: string | null
          entity_name: string
          entity_type?: string
          function_id?: string | null
          id?: string
          inherent_risk_score?: number | null
          is_active?: boolean | null
          last_audit_date?: string | null
          materiality?: string | null
          next_audit_due?: string | null
          process_owner?: string | null
          regulatory_impact?: string | null
          residual_risk_score?: number | null
          risk_category?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          audit_frequency?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          entity_code?: string | null
          entity_name?: string
          entity_type?: string
          function_id?: string | null
          id?: string
          inherent_risk_score?: number | null
          is_active?: boolean | null
          last_audit_date?: string | null
          materiality?: string | null
          next_audit_due?: string | null
          process_owner?: string | null
          regulatory_impact?: string | null
          residual_risk_score?: number | null
          risk_category?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_audit_universe_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_auditor_workload: {
        Row: {
          assigned_hours: number | null
          auditor_id: string
          booked_hours: number | null
          created_at: string | null
          fiscal_year: string
          id: string
          remaining_hours: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_hours?: number | null
          auditor_id: string
          booked_hours?: number | null
          created_at?: string | null
          fiscal_year: string
          id?: string
          remaining_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_hours?: number | null
          auditor_id?: string
          booked_hours?: number | null
          created_at?: string | null
          fiscal_year?: string
          id?: string
          remaining_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_auditor_workload_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "ia_auditors"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_auditors: {
        Row: {
          certifications: string[] | null
          created_at: string | null
          created_by: string | null
          email: string
          employee_no: string
          employment_status: string | null
          id: string
          name: string
          phone: string | null
          role: string
          seniority_level: string | null
          signature_image: string | null
          skills: string[] | null
          supervisor_id: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          work_location: string | null
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          email: string
          employee_no: string
          employment_status?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string
          seniority_level?: string | null
          signature_image?: string | null
          skills?: string[] | null
          supervisor_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          work_location?: string | null
        }
        Update: {
          certifications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          employee_no?: string
          employment_status?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          seniority_level?: string | null
          signature_image?: string | null
          skills?: string[] | null
          supervisor_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          work_location?: string | null
        }
        Relationships: []
      }
      ia_communications: {
        Row: {
          acknowledged_date: string | null
          annual_plan_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          department_audit_id: string | null
          id: string
          recipient_email: string | null
          recipient_name: string | null
          sent_date: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          template_type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          acknowledged_date?: string | null
          annual_plan_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          sent_date?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          template_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          acknowledged_date?: string | null
          annual_plan_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          sent_date?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          template_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_communications_annual_plan_id_fkey"
            columns: ["annual_plan_id"]
            isOneToOne: false
            referencedRelation: "ia_annual_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_communications_department_audit_id_fkey"
            columns: ["department_audit_id"]
            isOneToOne: false
            referencedRelation: "ia_department_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_communications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ia_document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_control_effectiveness_levels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          label: string
          reduction_percentage: number
          sort_order: number | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          reduction_percentage: number
          sort_order?: number | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          reduction_percentage?: number
          sort_order?: number | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_control_test_results: {
        Row: {
          control_test_id: string | null
          created_at: string | null
          exception_detail: string | null
          id: string
          observation: string | null
          result: string | null
          sample_reference: string | null
          test_item_no: number | null
        }
        Insert: {
          control_test_id?: string | null
          created_at?: string | null
          exception_detail?: string | null
          id?: string
          observation?: string | null
          result?: string | null
          sample_reference?: string | null
          test_item_no?: number | null
        }
        Update: {
          control_test_id?: string | null
          created_at?: string | null
          exception_detail?: string | null
          id?: string
          observation?: string | null
          result?: string | null
          sample_reference?: string | null
          test_item_no?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_control_test_results_control_test_id_fkey"
            columns: ["control_test_id"]
            isOneToOne: false
            referencedRelation: "ia_control_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_control_tests: {
        Row: {
          created_at: string | null
          created_by: string | null
          engagement_id: string | null
          exceptions_found: number | null
          id: string
          is_active: boolean | null
          linked_evidence_ids: Json | null
          rcm_control_id: string | null
          remarks: string | null
          result: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          sample_size: number | null
          test_date: string | null
          tested_by: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          engagement_id?: string | null
          exceptions_found?: number | null
          id?: string
          is_active?: boolean | null
          linked_evidence_ids?: Json | null
          rcm_control_id?: string | null
          remarks?: string | null
          result?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          sample_size?: number | null
          test_date?: string | null
          tested_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          engagement_id?: string | null
          exceptions_found?: number | null
          id?: string
          is_active?: boolean | null
          linked_evidence_ids?: Json | null
          rcm_control_id?: string | null
          remarks?: string | null
          result?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          sample_size?: number | null
          test_date?: string | null
          tested_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_control_tests_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "ia_audit_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_control_tests_rcm_control_id_fkey"
            columns: ["rcm_control_id"]
            isOneToOne: false
            referencedRelation: "ia_rcm_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_department_audits: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          admin_override_close: boolean | null
          annual_plan_id: string
          closed_by: string | null
          closed_date: string | null
          created_at: string | null
          created_by: string | null
          department_id: string
          department_name: string | null
          functions: string[] | null
          id: string
          is_closed: boolean | null
          lead_auditor_id: string | null
          lead_auditor_name: string | null
          month_year: string | null
          objective: string | null
          period: string | null
          planned_end: string | null
          planned_start: string | null
          risk_rating: string | null
          scope: string | null
          status: string | null
          team_member_ids: string[] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          admin_override_close?: boolean | null
          annual_plan_id: string
          closed_by?: string | null
          closed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id: string
          department_name?: string | null
          functions?: string[] | null
          id?: string
          is_closed?: boolean | null
          lead_auditor_id?: string | null
          lead_auditor_name?: string | null
          month_year?: string | null
          objective?: string | null
          period?: string | null
          planned_end?: string | null
          planned_start?: string | null
          risk_rating?: string | null
          scope?: string | null
          status?: string | null
          team_member_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          admin_override_close?: boolean | null
          annual_plan_id?: string
          closed_by?: string | null
          closed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string
          department_name?: string | null
          functions?: string[] | null
          id?: string
          is_closed?: boolean | null
          lead_auditor_id?: string | null
          lead_auditor_name?: string | null
          month_year?: string | null
          objective?: string | null
          period?: string | null
          planned_end?: string | null
          planned_start?: string | null
          risk_rating?: string | null
          scope?: string | null
          status?: string | null
          team_member_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_department_audits_annual_plan_id_fkey"
            columns: ["annual_plan_id"]
            isOneToOne: false
            referencedRelation: "ia_annual_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_department_audits_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_department_audits_lead_auditor_id_fkey"
            columns: ["lead_auditor_id"]
            isOneToOne: false
            referencedRelation: "ia_auditors"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_department_functions: {
        Row: {
          control_effectiveness: string | null
          created_at: string | null
          created_by: string | null
          department_id: string
          description: string | null
          function_name: string
          id: string
          impact: string | null
          is_active: boolean | null
          last_audit_date: string | null
          likelihood: string | null
          next_audit_date: string | null
          notes: string | null
          responsible_person: string | null
          risk_rating: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          control_effectiveness?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id: string
          description?: string | null
          function_name: string
          id?: string
          impact?: string | null
          is_active?: boolean | null
          last_audit_date?: string | null
          likelihood?: string | null
          next_audit_date?: string | null
          notes?: string | null
          responsible_person?: string | null
          risk_rating?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          control_effectiveness?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string
          description?: string | null
          function_name?: string
          id?: string
          impact?: string | null
          is_active?: boolean | null
          last_audit_date?: string | null
          likelihood?: string | null
          next_audit_date?: string | null
          notes?: string | null
          responsible_person?: string | null
          risk_rating?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_department_functions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_departments: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          head: string
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          phone: string | null
          risk_rating: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          head: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          phone?: string | null
          risk_rating?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          head?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          phone?: string | null
          risk_rating?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_document_templates: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          merge_fields: string[] | null
          name: string
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          merge_fields?: string[] | null
          name: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          merge_fields?: string[] | null
          name?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_escalation_rules: {
        Row: {
          action_type: string | null
          created_at: string | null
          escalate_after_days: number | null
          id: string
          is_active: boolean | null
          level: number | null
          notify_roles: Json | null
          sla_rule_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          escalate_after_days?: number | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          notify_roles?: Json | null
          sla_rule_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          escalate_after_days?: number | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          notify_roles?: Json | null
          sla_rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_escalation_rules_sla_rule_id_fkey"
            columns: ["sla_rule_id"]
            isOneToOne: false
            referencedRelation: "ia_sla_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_evidence: {
        Row: {
          activity_id: string | null
          annual_plan_id: string | null
          created_at: string | null
          created_by: string | null
          department_audit_id: string | null
          description: string | null
          evidence_id: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          finding_id: string | null
          hash: string | null
          id: string
          reference_no: string | null
          tags: string[] | null
          updated_at: string | null
          updated_by: string | null
          upload_date: string | null
          uploaded_by: string | null
        }
        Insert: {
          activity_id?: string | null
          annual_plan_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          description?: string | null
          evidence_id: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          finding_id?: string | null
          hash?: string | null
          id?: string
          reference_no?: string | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Update: {
          activity_id?: string | null
          annual_plan_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          description?: string | null
          evidence_id?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          finding_id?: string | null
          hash?: string | null
          id?: string
          reference_no?: string | null
          tags?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_evidence_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ia_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_evidence_annual_plan_id_fkey"
            columns: ["annual_plan_id"]
            isOneToOne: false
            referencedRelation: "ia_annual_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_evidence_department_audit_id_fkey"
            columns: ["department_audit_id"]
            isOneToOne: false
            referencedRelation: "ia_department_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_findings: {
        Row: {
          activity_id: string | null
          annual_plan_id: string | null
          cause: string | null
          condition: string | null
          created_at: string | null
          created_by: string | null
          created_date: string | null
          criteria: string | null
          department_audit_id: string | null
          department_head_name: string | null
          department_id: string | null
          department_name: string | null
          effect: string | null
          finding_id: string
          function_area: string | null
          id: string
          impact_area: string | null
          owner_role: string | null
          risk_rating: string | null
          status: string | null
          submitted_for_response_date: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activity_id?: string | null
          annual_plan_id?: string | null
          cause?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          criteria?: string | null
          department_audit_id?: string | null
          department_head_name?: string | null
          department_id?: string | null
          department_name?: string | null
          effect?: string | null
          finding_id: string
          function_area?: string | null
          id?: string
          impact_area?: string | null
          owner_role?: string | null
          risk_rating?: string | null
          status?: string | null
          submitted_for_response_date?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activity_id?: string | null
          annual_plan_id?: string | null
          cause?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          criteria?: string | null
          department_audit_id?: string | null
          department_head_name?: string | null
          department_id?: string | null
          department_name?: string | null
          effect?: string | null
          finding_id?: string
          function_area?: string | null
          id?: string
          impact_area?: string | null
          owner_role?: string | null
          risk_rating?: string | null
          status?: string | null
          submitted_for_response_date?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_findings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ia_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_findings_annual_plan_id_fkey"
            columns: ["annual_plan_id"]
            isOneToOne: false
            referencedRelation: "ia_annual_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_findings_department_audit_id_fkey"
            columns: ["department_audit_id"]
            isOneToOne: false
            referencedRelation: "ia_department_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_findings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_follow_ups: {
        Row: {
          action_required: string
          activity_id: string | null
          annual_plan_id: string | null
          created_at: string | null
          created_by: string | null
          department_audit_id: string | null
          department_id: string | null
          department_name: string | null
          description: string | null
          due_date: string
          finding_id: string | null
          follow_up_type: string | null
          id: string
          priority: string | null
          resolution: string | null
          resolved_date: string | null
          responsible_name: string | null
          responsible_party: string | null
          scheduled_follow_up_date: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action_required: string
          activity_id?: string | null
          annual_plan_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          department_id?: string | null
          department_name?: string | null
          description?: string | null
          due_date: string
          finding_id?: string | null
          follow_up_type?: string | null
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_date?: string | null
          responsible_name?: string | null
          responsible_party?: string | null
          scheduled_follow_up_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action_required?: string
          activity_id?: string | null
          annual_plan_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          department_id?: string | null
          department_name?: string | null
          description?: string | null
          due_date?: string
          finding_id?: string | null
          follow_up_type?: string | null
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_date?: string | null
          responsible_name?: string | null
          responsible_party?: string | null
          scheduled_follow_up_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_follow_ups_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ia_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_follow_ups_annual_plan_id_fkey"
            columns: ["annual_plan_id"]
            isOneToOne: false
            referencedRelation: "ia_annual_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_follow_ups_department_audit_id_fkey"
            columns: ["department_audit_id"]
            isOneToOne: false
            referencedRelation: "ia_department_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_follow_ups_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_follow_ups_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "ia_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_holidays: {
        Row: {
          country: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          is_active: boolean | null
          is_ssb_specific: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
          year: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          is_active?: boolean | null
          is_ssb_specific?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
          year?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          is_active?: boolean | null
          is_ssb_specific?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ia_leave_requests: {
        Row: {
          approver_id: string | null
          attachment_url: string | null
          auditor_id: string
          created_at: string | null
          created_by: string | null
          decided_date: string | null
          decision_note: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          request_id: string
          start_date: string
          status: string | null
          submitted_date: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approver_id?: string | null
          attachment_url?: string | null
          auditor_id: string
          created_at?: string | null
          created_by?: string | null
          decided_date?: string | null
          decision_note?: string | null
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          request_id: string
          start_date: string
          status?: string | null
          submitted_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approver_id?: string | null
          attachment_url?: string | null
          auditor_id?: string
          created_at?: string | null
          created_by?: string | null
          decided_date?: string | null
          decision_note?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          request_id?: string
          start_date?: string
          status?: string | null
          submitted_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "ia_auditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_leave_requests_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "ia_auditors"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_management_responses: {
        Row: {
          action_plan: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          finding_id: string
          id: string
          is_overdue: boolean | null
          last_reminder_date: string | null
          official_target_date: string | null
          reminder_sent: boolean | null
          response_text: string | null
          responsible_person: string | null
          status: string | null
          submitted_by: string | null
          submitted_date: string | null
          supporting_docs: string[] | null
          target_date: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action_plan?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          finding_id: string
          id?: string
          is_overdue?: boolean | null
          last_reminder_date?: string | null
          official_target_date?: string | null
          reminder_sent?: boolean | null
          response_text?: string | null
          responsible_person?: string | null
          status?: string | null
          submitted_by?: string | null
          submitted_date?: string | null
          supporting_docs?: string[] | null
          target_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action_plan?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          finding_id?: string
          id?: string
          is_overdue?: boolean | null
          last_reminder_date?: string | null
          official_target_date?: string | null
          reminder_sent?: boolean | null
          response_text?: string | null
          responsible_person?: string | null
          status?: string | null
          submitted_by?: string | null
          submitted_date?: string | null
          supporting_docs?: string[] | null
          target_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_management_responses_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "ia_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_notification_logs: {
        Row: {
          channel: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          channel?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "ia_notification_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_notification_queue: {
        Row: {
          channel: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          recipient_user_code: string | null
          scheduled_at: string | null
          sent_at: string | null
          sla_rule_id: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          recipient_user_code?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sla_rule_id?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          recipient_user_code?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sla_rule_id?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_notification_queue_sla_rule_id_fkey"
            columns: ["sla_rule_id"]
            isOneToOne: false
            referencedRelation: "ia_sla_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_plan_carry_forward: {
        Row: {
          annual_plan_id: string | null
          carried_by: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          source_id: string | null
          source_reference: string | null
          source_type: string
          status: string | null
        }
        Insert: {
          annual_plan_id?: string | null
          carried_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          source_id?: string | null
          source_reference?: string | null
          source_type: string
          status?: string | null
        }
        Update: {
          annual_plan_id?: string | null
          carried_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          source_id?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string | null
        }
        Relationships: []
      }
      ia_planning_assumptions: {
        Row: {
          annual_plan_id: string | null
          assumption_text: string
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          impact: string | null
        }
        Insert: {
          annual_plan_id?: string | null
          assumption_text: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          impact?: string | null
        }
        Update: {
          annual_plan_id?: string | null
          assumption_text?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          impact?: string | null
        }
        Relationships: []
      }
      ia_quality_review_checklist: {
        Row: {
          category: string | null
          checklist_item: string
          created_at: string | null
          id: string
          is_compliant: boolean | null
          remarks: string | null
          review_id: string | null
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          checklist_item: string
          created_at?: string | null
          id?: string
          is_compliant?: boolean | null
          remarks?: string | null
          review_id?: string | null
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          checklist_item?: string
          created_at?: string | null
          id?: string
          is_compliant?: boolean | null
          remarks?: string | null
          review_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_quality_review_checklist_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "ia_quality_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_quality_reviews: {
        Row: {
          checklist_results: Json | null
          created_at: string | null
          created_by: string | null
          engagement_id: string | null
          final_disposition: string | null
          id: string
          is_active: boolean | null
          observations: string | null
          quality_rating: string | null
          required_rework: boolean | null
          review_date: string | null
          review_type: string | null
          reviewer_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          checklist_results?: Json | null
          created_at?: string | null
          created_by?: string | null
          engagement_id?: string | null
          final_disposition?: string | null
          id?: string
          is_active?: boolean | null
          observations?: string | null
          quality_rating?: string | null
          required_rework?: boolean | null
          review_date?: string | null
          review_type?: string | null
          reviewer_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          checklist_results?: Json | null
          created_at?: string | null
          created_by?: string | null
          engagement_id?: string | null
          final_disposition?: string | null
          id?: string
          is_active?: boolean | null
          observations?: string | null
          quality_rating?: string | null
          required_rework?: boolean | null
          review_date?: string | null
          review_type?: string | null
          reviewer_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_quality_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "ia_audit_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_rcm_controls: {
        Row: {
          control_name: string
          control_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          effectiveness: string | null
          effectiveness_reduction: number | null
          frequency: string | null
          id: string
          is_active: boolean | null
          owner: string | null
          risk_id: string | null
        }
        Insert: {
          control_name: string
          control_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effectiveness?: string | null
          effectiveness_reduction?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          owner?: string | null
          risk_id?: string | null
        }
        Update: {
          control_name?: string
          control_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effectiveness?: string | null
          effectiveness_reduction?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          owner?: string | null
          risk_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_rcm_controls_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "ia_rcm_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_rcm_processes: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          function_id: string | null
          id: string
          is_active: boolean | null
          owner: string | null
          process_name: string
          sub_process_name: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          function_id?: string | null
          id?: string
          is_active?: boolean | null
          owner?: string | null
          process_name: string
          sub_process_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          function_id?: string | null
          id?: string
          is_active?: boolean | null
          owner?: string | null
          process_name?: string
          sub_process_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_rcm_processes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "ia_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_rcm_processes_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "ia_department_functions"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_rcm_risks: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          impact: number | null
          inherent_risk_score: number | null
          is_active: boolean | null
          likelihood: number | null
          process_id: string | null
          residual_risk_score: number | null
          risk_level: string | null
          risk_score: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          impact?: number | null
          inherent_risk_score?: number | null
          is_active?: boolean | null
          likelihood?: number | null
          process_id?: string | null
          residual_risk_score?: number | null
          risk_level?: string | null
          risk_score?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          impact?: number | null
          inherent_risk_score?: number | null
          is_active?: boolean | null
          likelihood?: number | null
          process_id?: string | null
          residual_risk_score?: number | null
          risk_level?: string | null
          risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_rcm_risks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "ia_rcm_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_rcm_tests: {
        Row: {
          control_id: string | null
          created_at: string | null
          expected_result: string | null
          id: string
          is_active: boolean | null
          review_required: boolean | null
          test_procedure: string | null
          tester: string | null
        }
        Insert: {
          control_id?: string | null
          created_at?: string | null
          expected_result?: string | null
          id?: string
          is_active?: boolean | null
          review_required?: boolean | null
          test_procedure?: string | null
          tester?: string | null
        }
        Update: {
          control_id?: string | null
          created_at?: string | null
          expected_result?: string | null
          id?: string
          is_active?: boolean | null
          review_required?: boolean | null
          test_procedure?: string | null
          tester?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_rcm_tests_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "ia_rcm_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_recommendations: {
        Row: {
          created_at: string | null
          created_by: string | null
          finding_id: string
          id: string
          official_target_date: string | null
          priority: string | null
          recommendation_text: string
          responsible_party: string | null
          status: string | null
          suggested_target_date: string | null
          target_date_set_by: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          finding_id: string
          id?: string
          official_target_date?: string | null
          priority?: string | null
          recommendation_text: string
          responsible_party?: string | null
          status?: string | null
          suggested_target_date?: string | null
          target_date_set_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          finding_id?: string
          id?: string
          official_target_date?: string | null
          priority?: string | null
          recommendation_text?: string
          responsible_party?: string | null
          status?: string | null
          suggested_target_date?: string | null
          target_date_set_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_recommendations_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "ia_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_risk_assessment_factors: {
        Row: {
          assessment_id: string | null
          created_at: string | null
          factor_category: string | null
          factor_name: string
          id: string
          notes: string | null
          score: number | null
          weight: number | null
          weighted_score: number | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string | null
          factor_category?: string | null
          factor_name: string
          id?: string
          notes?: string | null
          score?: number | null
          weight?: number | null
          weighted_score?: number | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string | null
          factor_category?: string | null
          factor_name?: string
          id?: string
          notes?: string | null
          score?: number | null
          weight?: number | null
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_risk_assessment_factors_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "ia_risk_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_risk_assessments: {
        Row: {
          assessed_by: string | null
          assessment_date: string | null
          audit_universe_id: string | null
          control_effectiveness_score: number | null
          created_at: string | null
          created_by: string | null
          function_id: string | null
          id: string
          impact_score: number | null
          is_active: boolean | null
          likelihood_score: number | null
          notes: string | null
          overall_risk_score: number | null
          regulatory_score: number | null
          reputational_score: number | null
          risk_level: string | null
          updated_at: string | null
          updated_by: string | null
          velocity_score: number | null
        }
        Insert: {
          assessed_by?: string | null
          assessment_date?: string | null
          audit_universe_id?: string | null
          control_effectiveness_score?: number | null
          created_at?: string | null
          created_by?: string | null
          function_id?: string | null
          id?: string
          impact_score?: number | null
          is_active?: boolean | null
          likelihood_score?: number | null
          notes?: string | null
          overall_risk_score?: number | null
          regulatory_score?: number | null
          reputational_score?: number | null
          risk_level?: string | null
          updated_at?: string | null
          updated_by?: string | null
          velocity_score?: number | null
        }
        Update: {
          assessed_by?: string | null
          assessment_date?: string | null
          audit_universe_id?: string | null
          control_effectiveness_score?: number | null
          created_at?: string | null
          created_by?: string | null
          function_id?: string | null
          id?: string
          impact_score?: number | null
          is_active?: boolean | null
          likelihood_score?: number | null
          notes?: string | null
          overall_risk_score?: number | null
          regulatory_score?: number | null
          reputational_score?: number | null
          risk_level?: string | null
          updated_at?: string | null
          updated_by?: string | null
          velocity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_risk_assessments_audit_universe_id_fkey"
            columns: ["audit_universe_id"]
            isOneToOne: false
            referencedRelation: "ia_audit_universe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_risk_assessments_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "ia_department_functions"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_risk_classification_thresholds: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          max_score: number
          min_score: number
          sort_order: number | null
          updated_by: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          max_score: number
          min_score: number
          sort_order?: number | null
          updated_by?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          max_score?: number
          min_score?: number
          sort_order?: number | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_risk_criteria: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: string
          id: string
          is_enabled: boolean
          sort_order: number | null
          updated_at: string
          updated_by: string | null
          weight: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria: string
          id?: string
          is_enabled?: boolean
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
          weight?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: string
          id?: string
          is_enabled?: boolean
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
          weight?: string
        }
        Relationships: []
      }
      ia_risk_criteria_weights: {
        Row: {
          created_at: string | null
          criterion_name: string
          id: string
          is_active: boolean | null
          max_score: number | null
          model_id: string | null
          sort_order: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          criterion_name: string
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          model_id?: string | null
          sort_order?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          criterion_name?: string
          id?: string
          is_active?: boolean | null
          max_score?: number | null
          model_id?: string | null
          sort_order?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_risk_criteria_weights_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ia_risk_scoring_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_risk_impact_levels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          label: string
          score: number
          sort_order: number | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          score: number
          sort_order?: number | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          score?: number
          sort_order?: number | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_risk_likelihood_levels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          label: string
          score: number
          sort_order: number | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          score: number
          sort_order?: number | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          score?: number
          sort_order?: number | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_risk_scoring_models: {
        Row: {
          created_at: string | null
          created_by: string | null
          critical_threshold: number | null
          description: string | null
          high_threshold: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          low_threshold: number | null
          medium_threshold: number | null
          model_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number | null
          description?: string | null
          high_threshold?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          low_threshold?: number | null
          medium_threshold?: number | null
          model_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          critical_threshold?: number | null
          description?: string | null
          high_threshold?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          low_threshold?: number | null
          medium_threshold?: number | null
          model_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_sla_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          escalation_level: number | null
          id: string
          is_active: boolean | null
          notification_channel: string | null
          notify_roles: Json | null
          rule_name: string
          threshold_days: number | null
          trigger_event: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          escalation_level?: number | null
          id?: string
          is_active?: boolean | null
          notification_channel?: string | null
          notify_roles?: Json | null
          rule_name: string
          threshold_days?: number | null
          trigger_event: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          escalation_level?: number | null
          id?: string
          is_active?: boolean | null
          notification_channel?: string | null
          notify_roles?: Json | null
          rule_name?: string
          threshold_days?: number | null
          trigger_event?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ia_time_logs: {
        Row: {
          activity_id: string | null
          auditor_id: string | null
          created_at: string | null
          created_by: string | null
          engagement_id: string | null
          hours_spent: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string | null
          updated_by: string | null
          work_date: string | null
          work_type: string | null
        }
        Insert: {
          activity_id?: string | null
          auditor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          engagement_id?: string | null
          hours_spent?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
          work_date?: string | null
          work_type?: string | null
        }
        Update: {
          activity_id?: string | null
          auditor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          engagement_id?: string | null
          hours_spent?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
          work_date?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_time_logs_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "ia_audit_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_working_papers: {
        Row: {
          activity_id: string | null
          annual_plan_id: string | null
          approved_by: string | null
          approved_date: string | null
          audit_area: string | null
          conclusion: string | null
          created_at: string | null
          created_by: string | null
          department_audit_id: string | null
          description: string | null
          evidence_ids: string[] | null
          id: string
          linked_finding_ids: string[] | null
          objective: string | null
          observations: string | null
          prepared_by: string | null
          prepared_date: string | null
          procedure: string | null
          results: string | null
          reviewed_by: string | null
          reviewed_date: string | null
          status: string | null
          tags: string[] | null
          test_performed: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
          version: number | null
          working_paper_id: string
        }
        Insert: {
          activity_id?: string | null
          annual_plan_id?: string | null
          approved_by?: string | null
          approved_date?: string | null
          audit_area?: string | null
          conclusion?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          description?: string | null
          evidence_ids?: string[] | null
          id?: string
          linked_finding_ids?: string[] | null
          objective?: string | null
          observations?: string | null
          prepared_by?: string | null
          prepared_date?: string | null
          procedure?: string | null
          results?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          status?: string | null
          tags?: string[] | null
          test_performed?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          working_paper_id: string
        }
        Update: {
          activity_id?: string | null
          annual_plan_id?: string | null
          approved_by?: string | null
          approved_date?: string | null
          audit_area?: string | null
          conclusion?: string | null
          created_at?: string | null
          created_by?: string | null
          department_audit_id?: string | null
          description?: string | null
          evidence_ids?: string[] | null
          id?: string
          linked_finding_ids?: string[] | null
          objective?: string | null
          observations?: string | null
          prepared_by?: string | null
          prepared_date?: string | null
          procedure?: string | null
          results?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          status?: string | null
          tags?: string[] | null
          test_performed?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          working_paper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_working_papers_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ia_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_working_papers_annual_plan_id_fkey"
            columns: ["annual_plan_id"]
            isOneToOne: false
            referencedRelation: "ia_annual_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_working_papers_department_audit_id_fkey"
            columns: ["department_audit_id"]
            isOneToOne: false
            referencedRelation: "ia_department_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          metadata: Json | null
          module: string | null
          notification_type: string | null
          priority: string | null
          read_at: string | null
          related_record_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          metadata?: Json | null
          module?: string | null
          notification_type?: string | null
          priority?: string | null
          read_at?: string | null
          related_record_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          metadata?: Json | null
          module?: string | null
          notification_type?: string | null
          priority?: string | null
          read_at?: string | null
          related_record_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      inspector_activities: {
        Row: {
          action_taken: string | null
          activity_date: string
          activity_type: Database["public"]["Enums"]["inspector_activity_type"]
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          documents: Json | null
          employer_id: string | null
          employer_name: string | null
          employer_signature_data: string | null
          findings: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          inspector_id: string
          location_lat: number | null
          location_lng: number | null
          notice_served: boolean | null
          notice_type: string | null
          photos: Json | null
          purpose: string | null
          updated_at: string | null
        }
        Insert: {
          action_taken?: string | null
          activity_date: string
          activity_type: Database["public"]["Enums"]["inspector_activity_type"]
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          documents?: Json | null
          employer_id?: string | null
          employer_name?: string | null
          employer_signature_data?: string | null
          findings?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspector_id: string
          location_lat?: number | null
          location_lng?: number | null
          notice_served?: boolean | null
          notice_type?: string | null
          photos?: Json | null
          purpose?: string | null
          updated_at?: string | null
        }
        Update: {
          action_taken?: string | null
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["inspector_activity_type"]
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          documents?: Json | null
          employer_id?: string | null
          employer_name?: string | null
          employer_signature_data?: string | null
          findings?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspector_id?: string
          location_lat?: number | null
          location_lng?: number | null
          notice_served?: boolean | null
          notice_type?: string | null
          photos?: Json | null
          purpose?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inspector_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          id: string
          inspector_id: string
          is_primary: boolean | null
          zone_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          inspector_id: string
          is_primary?: boolean | null
          zone_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          inspector_id?: string
          is_primary?: boolean | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspector_assignments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "inspector_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_weekly_plans: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          inspector_id: string
          planned_activities: Json | null
          submitted: boolean | null
          submitted_at: string | null
          updated_at: string | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          inspector_id: string
          planned_activities?: Json | null
          submitted?: boolean | null
          submitted_at?: string | null
          updated_at?: string | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          inspector_id?: string
          planned_activities?: Json | null
          submitted?: boolean | null
          submitted_at?: string | null
          updated_at?: string | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
      inspector_zones: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          parishes: string[] | null
          updated_at: string | null
          zone_code: string | null
          zone_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          parishes?: string[] | null
          updated_at?: string | null
          zone_code?: string | null
          zone_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          parishes?: string[] | null
          updated_at?: string | null
          zone_code?: string | null
          zone_name?: string
        }
        Relationships: []
      }
      ip_application_documents: {
        Row: {
          application_reference_number: string | null
          birth_status: string | null
          created_at: string
          created_by: string | null
          death_status: string | null
          dms_document_id: string | null
          document_name: string | null
          document_type: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_supportive: boolean | null
          marital_status: string | null
          metadata: Json | null
          mime_type: string | null
          name_status: string | null
          signed_url: string | null
          source_document_id: string | null
          ssn: string
          supportive_doc_type: string | null
          transfer_attempted_at: string | null
          transfer_attempts: number
          transfer_error: string | null
          transfer_http_status: number | null
          transfer_request_id: string | null
          transfer_response_snippet: string | null
          transfer_status: string
          transferred_at: string | null
          transferred_by: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          url: string | null
          verification_category: string | null
          verification_type: string | null
        }
        Insert: {
          application_reference_number?: string | null
          birth_status?: string | null
          created_at?: string
          created_by?: string | null
          death_status?: string | null
          dms_document_id?: string | null
          document_name?: string | null
          document_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_supportive?: boolean | null
          marital_status?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name_status?: string | null
          signed_url?: string | null
          source_document_id?: string | null
          ssn: string
          supportive_doc_type?: string | null
          transfer_attempted_at?: string | null
          transfer_attempts?: number
          transfer_error?: string | null
          transfer_http_status?: number | null
          transfer_request_id?: string | null
          transfer_response_snippet?: string | null
          transfer_status?: string
          transferred_at?: string | null
          transferred_by?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          url?: string | null
          verification_category?: string | null
          verification_type?: string | null
        }
        Update: {
          application_reference_number?: string | null
          birth_status?: string | null
          created_at?: string
          created_by?: string | null
          death_status?: string | null
          dms_document_id?: string | null
          document_name?: string | null
          document_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_supportive?: boolean | null
          marital_status?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name_status?: string | null
          signed_url?: string | null
          source_document_id?: string | null
          ssn?: string
          supportive_doc_type?: string | null
          transfer_attempted_at?: string | null
          transfer_attempts?: number
          transfer_error?: string | null
          transfer_http_status?: number | null
          transfer_request_id?: string | null
          transfer_response_snippet?: string | null
          transfer_status?: string
          transferred_at?: string | null
          transferred_by?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          url?: string | null
          verification_category?: string | null
          verification_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ip_application_documents_ssn"
            columns: ["ssn"]
            isOneToOne: false
            referencedRelation: "ip_master"
            referencedColumns: ["ssn"]
          },
        ]
      }
      ip_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
          unique_uuid: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
          unique_uuid?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
          unique_uuid?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      ip_card_config: {
        Row: {
          card_validity_years: number
          created_at: string
          created_by: string | null
          date_source: string
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          card_validity_years?: number
          created_at?: string
          created_by?: string | null
          date_source?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          card_validity_years?: number
          created_at?: string
          created_by?: string | null
          date_source?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ip_depend: {
        Row: {
          date_modified: string | null
          date_of_death: string | null
          depend_addr1: string | null
          depend_addr2: string | null
          depend_id: string
          depend_ssn: string | null
          dob: string | null
          firstname: string | null
          invalid: string | null
          middle_name: string | null
          relation: string | null
          school_child: string | null
          sex: string | null
          ssn: string
          status: string | null
          surname: string | null
          tran_code: string | null
          userid: string | null
        }
        Insert: {
          date_modified?: string | null
          date_of_death?: string | null
          depend_addr1?: string | null
          depend_addr2?: string | null
          depend_id: string
          depend_ssn?: string | null
          dob?: string | null
          firstname?: string | null
          invalid?: string | null
          middle_name?: string | null
          relation?: string | null
          school_child?: string | null
          sex?: string | null
          ssn: string
          status?: string | null
          surname?: string | null
          tran_code?: string | null
          userid?: string | null
        }
        Update: {
          date_modified?: string | null
          date_of_death?: string | null
          depend_addr1?: string | null
          depend_addr2?: string | null
          depend_id?: string
          depend_ssn?: string | null
          dob?: string | null
          firstname?: string | null
          invalid?: string | null
          middle_name?: string | null
          relation?: string | null
          school_child?: string | null
          sex?: string | null
          ssn?: string
          status?: string | null
          surname?: string | null
          tran_code?: string | null
          userid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ip_depend_ssn"
            columns: ["ssn"]
            isOneToOne: false
            referencedRelation: "ip_master"
            referencedColumns: ["ssn"]
          },
          {
            foreignKeyName: "ip_depend_relation_fkey"
            columns: ["relation"]
            isOneToOne: false
            referencedRelation: "tb_relation"
            referencedColumns: ["code"]
          },
        ]
      }
      ip_depend_staging: {
        Row: {
          application_ref: string
          created_at: string
          dep_ssn: string | null
          depend_addr1: string | null
          depend_addr2: string | null
          dob: string | null
          firstname: string | null
          id: string
          ip_master_id: string
          notes: string | null
          relation: string | null
          relation_raw: string | null
          school_child: string | null
          sex: string | null
          status: string
          surname: string | null
        }
        Insert: {
          application_ref: string
          created_at?: string
          dep_ssn?: string | null
          depend_addr1?: string | null
          depend_addr2?: string | null
          dob?: string | null
          firstname?: string | null
          id?: string
          ip_master_id: string
          notes?: string | null
          relation?: string | null
          relation_raw?: string | null
          school_child?: string | null
          sex?: string | null
          status?: string
          surname?: string | null
        }
        Update: {
          application_ref?: string
          created_at?: string
          dep_ssn?: string | null
          depend_addr1?: string | null
          depend_addr2?: string | null
          dob?: string | null
          firstname?: string | null
          id?: string
          ip_master_id?: string
          notes?: string | null
          relation?: string | null
          relation_raw?: string | null
          school_child?: string | null
          sex?: string | null
          status?: string
          surname?: string | null
        }
        Relationships: []
      }
      ip_documents: {
        Row: {
          document_name: string
          document_type: string
          file_path: string
          file_size: number | null
          id: string
          is_supportive: boolean | null
          is_temp: boolean | null
          mime_type: string | null
          supportive_doc_type: string | null
          unique_uuid: string
          uploaded_at: string | null
          uploaded_by: string | null
          verification_category: string | null
        }
        Insert: {
          document_name: string
          document_type: string
          file_path: string
          file_size?: number | null
          id?: string
          is_supportive?: boolean | null
          is_temp?: boolean | null
          mime_type?: string | null
          supportive_doc_type?: string | null
          unique_uuid: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          verification_category?: string | null
        }
        Update: {
          document_name?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_supportive?: boolean | null
          is_temp?: boolean | null
          mime_type?: string | null
          supportive_doc_type?: string | null
          unique_uuid?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          verification_category?: string | null
        }
        Relationships: []
      }
      ip_employer: {
        Row: {
          created_at: string | null
          date_entered: string | null
          date_modified: string | null
          employer_id: string
          entered_by: string | null
          id: string
          modified_by: string | null
          occupation: string | null
          posting_status: string | null
          source: string | null
          ssn: string
          term_end_date: string | null
          term_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_entered?: string | null
          date_modified?: string | null
          employer_id: string
          entered_by?: string | null
          id?: string
          modified_by?: string | null
          occupation?: string | null
          posting_status?: string | null
          source?: string | null
          ssn: string
          term_end_date?: string | null
          term_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_entered?: string | null
          date_modified?: string | null
          employer_id?: string
          entered_by?: string | null
          id?: string
          modified_by?: string | null
          occupation?: string | null
          posting_status?: string | null
          source?: string | null
          ssn?: string
          term_end_date?: string | null
          term_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ip_last_self_emp: {
        Row: {
          date_issued: string | null
          self_ref_no: string
        }
        Insert: {
          date_issued?: string | null
          self_ref_no: string
        }
        Update: {
          date_issued?: string | null
          self_ref_no?: string
        }
        Relationships: []
      }
      ip_master: {
        Row: {
          alias: string | null
          application_date: string | null
          application_id: string
          application_reference_number: string | null
          application_remarks: string | null
          asp_num: string | null
          ben_addr1: string | null
          ben_addr2: string | null
          beneficiary: string | null
          birth_doc_type: string | null
          birth_place: string | null
          card_expiration: string | null
          citizenship: string | null
          citizenship_flag: string | null
          contact: string | null
          contact_addr1: string | null
          contact_addr2: string | null
          contact_email: string | null
          contact_mobile: string | null
          contact_phone: string | null
          contact_relation: string | null
          created_at: string | null
          created_by: string | null
          date_card_recvd: string | null
          date_died: string | null
          date_married: string | null
          date_modified: string | null
          date_of_entry: string | null
          date_of_residency: string | null
          date_rejected: string | null
          date_verified: string | null
          date_witnessed: string | null
          death_doc_type: string | null
          deb_crd_amount: number | null
          delivery_zone: string | null
          district: string | null
          dob: string
          email_addr: string | null
          employer_address: string | null
          employer_name: string | null
          employer_phone: string | null
          employer_town: string | null
          entered_by: string | null
          eyecolor: string | null
          father_name: string | null
          firstname: string
          heightfeet: number | null
          heightinches: number | null
          id: string
          ip_code: string | null
          ip_signature: string | null
          mail_addr1: string | null
          mail_addr2: string | null
          marital_doc_type: string | null
          marital_status: string
          middle_name: string | null
          mobile: string | null
          mother_name: string | null
          name_doc_type: string | null
          name_prefix: string | null
          name_suffix: string | null
          nationality: string
          npf: string | null
          old_card_attached: string | null
          perm_card_date: string | null
          phone: string | null
          phone_mobile: string | null
          photo_location: string | null
          place_of_residence: string | null
          previous_name: string | null
          primary_occup: string | null
          registration_date: string | null
          rejected_by: string | null
          rejection_reason: string | null
          resident_addr1: string | null
          resident_addr2: string | null
          second_middle_name: string | null
          self_ref_no: string | null
          sex: string
          signature_location: string | null
          spouse_addr1: string | null
          spouse_addr2: string | null
          spouse_dob: string | null
          spouse_name: string | null
          spouse_ssn: string | null
          ssn: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          surname: string
          telephone: string | null
          temp_card_date: string | null
          temp_ssn: string | null
          termination_code: string | null
          termination_date: string | null
          tran_code: string | null
          unique_uuid: string
          updated_at: string | null
          updated_by: string | null
          userid: string | null
          verified_by: string | null
          verify_birth_code: string | null
          verify_death_code: string | null
          verify_marital_code: string | null
          verify_name_code: string | null
          vol_contrib: string | null
          witness_name: string | null
          work_permit: string | null
          work_permit_expiration: string | null
        }
        Insert: {
          alias?: string | null
          application_date?: string | null
          application_id: string
          application_reference_number?: string | null
          application_remarks?: string | null
          asp_num?: string | null
          ben_addr1?: string | null
          ben_addr2?: string | null
          beneficiary?: string | null
          birth_doc_type?: string | null
          birth_place?: string | null
          card_expiration?: string | null
          citizenship?: string | null
          citizenship_flag?: string | null
          contact?: string | null
          contact_addr1?: string | null
          contact_addr2?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          contact_phone?: string | null
          contact_relation?: string | null
          created_at?: string | null
          created_by?: string | null
          date_card_recvd?: string | null
          date_died?: string | null
          date_married?: string | null
          date_modified?: string | null
          date_of_entry?: string | null
          date_of_residency?: string | null
          date_rejected?: string | null
          date_verified?: string | null
          date_witnessed?: string | null
          death_doc_type?: string | null
          deb_crd_amount?: number | null
          delivery_zone?: string | null
          district?: string | null
          dob: string
          email_addr?: string | null
          employer_address?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          employer_town?: string | null
          entered_by?: string | null
          eyecolor?: string | null
          father_name?: string | null
          firstname: string
          heightfeet?: number | null
          heightinches?: number | null
          id?: string
          ip_code?: string | null
          ip_signature?: string | null
          mail_addr1?: string | null
          mail_addr2?: string | null
          marital_doc_type?: string | null
          marital_status: string
          middle_name?: string | null
          mobile?: string | null
          mother_name?: string | null
          name_doc_type?: string | null
          name_prefix?: string | null
          name_suffix?: string | null
          nationality: string
          npf?: string | null
          old_card_attached?: string | null
          perm_card_date?: string | null
          phone?: string | null
          phone_mobile?: string | null
          photo_location?: string | null
          place_of_residence?: string | null
          previous_name?: string | null
          primary_occup?: string | null
          registration_date?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          resident_addr1?: string | null
          resident_addr2?: string | null
          second_middle_name?: string | null
          self_ref_no?: string | null
          sex: string
          signature_location?: string | null
          spouse_addr1?: string | null
          spouse_addr2?: string | null
          spouse_dob?: string | null
          spouse_name?: string | null
          spouse_ssn?: string | null
          ssn?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          surname: string
          telephone?: string | null
          temp_card_date?: string | null
          temp_ssn?: string | null
          termination_code?: string | null
          termination_date?: string | null
          tran_code?: string | null
          unique_uuid?: string
          updated_at?: string | null
          updated_by?: string | null
          userid?: string | null
          verified_by?: string | null
          verify_birth_code?: string | null
          verify_death_code?: string | null
          verify_marital_code?: string | null
          verify_name_code?: string | null
          vol_contrib?: string | null
          witness_name?: string | null
          work_permit?: string | null
          work_permit_expiration?: string | null
        }
        Update: {
          alias?: string | null
          application_date?: string | null
          application_id?: string
          application_reference_number?: string | null
          application_remarks?: string | null
          asp_num?: string | null
          ben_addr1?: string | null
          ben_addr2?: string | null
          beneficiary?: string | null
          birth_doc_type?: string | null
          birth_place?: string | null
          card_expiration?: string | null
          citizenship?: string | null
          citizenship_flag?: string | null
          contact?: string | null
          contact_addr1?: string | null
          contact_addr2?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          contact_phone?: string | null
          contact_relation?: string | null
          created_at?: string | null
          created_by?: string | null
          date_card_recvd?: string | null
          date_died?: string | null
          date_married?: string | null
          date_modified?: string | null
          date_of_entry?: string | null
          date_of_residency?: string | null
          date_rejected?: string | null
          date_verified?: string | null
          date_witnessed?: string | null
          death_doc_type?: string | null
          deb_crd_amount?: number | null
          delivery_zone?: string | null
          district?: string | null
          dob?: string
          email_addr?: string | null
          employer_address?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          employer_town?: string | null
          entered_by?: string | null
          eyecolor?: string | null
          father_name?: string | null
          firstname?: string
          heightfeet?: number | null
          heightinches?: number | null
          id?: string
          ip_code?: string | null
          ip_signature?: string | null
          mail_addr1?: string | null
          mail_addr2?: string | null
          marital_doc_type?: string | null
          marital_status?: string
          middle_name?: string | null
          mobile?: string | null
          mother_name?: string | null
          name_doc_type?: string | null
          name_prefix?: string | null
          name_suffix?: string | null
          nationality?: string
          npf?: string | null
          old_card_attached?: string | null
          perm_card_date?: string | null
          phone?: string | null
          phone_mobile?: string | null
          photo_location?: string | null
          place_of_residence?: string | null
          previous_name?: string | null
          primary_occup?: string | null
          registration_date?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          resident_addr1?: string | null
          resident_addr2?: string | null
          second_middle_name?: string | null
          self_ref_no?: string | null
          sex?: string
          signature_location?: string | null
          spouse_addr1?: string | null
          spouse_addr2?: string | null
          spouse_dob?: string | null
          spouse_name?: string | null
          spouse_ssn?: string | null
          ssn?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          surname?: string
          telephone?: string | null
          temp_card_date?: string | null
          temp_ssn?: string | null
          termination_code?: string | null
          termination_date?: string | null
          tran_code?: string | null
          unique_uuid?: string
          updated_at?: string | null
          updated_by?: string | null
          userid?: string | null
          verified_by?: string | null
          verify_birth_code?: string | null
          verify_death_code?: string | null
          verify_marital_code?: string | null
          verify_name_code?: string | null
          vol_contrib?: string | null
          witness_name?: string | null
          work_permit?: string | null
          work_permit_expiration?: string | null
        }
        Relationships: []
      }
      ip_master_column_conflicts: {
        Row: {
          canonical_column_name: string
          canonical_value: string | null
          detected_at: string
          duplicate_column_name: string
          duplicate_value: string | null
          id: string
          ip_master_id: string
        }
        Insert: {
          canonical_column_name: string
          canonical_value?: string | null
          detected_at?: string
          duplicate_column_name: string
          duplicate_value?: string | null
          id?: string
          ip_master_id: string
        }
        Update: {
          canonical_column_name?: string
          canonical_value?: string | null
          detected_at?: string
          duplicate_column_name?: string
          duplicate_value?: string | null
          id?: string
          ip_master_id?: string
        }
        Relationships: []
      }
      ip_name: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_id: string | null
          previous_first_name: string | null
          previous_last_name: string | null
          previous_middle_name: string | null
          reason: string | null
          unique_uuid: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_id?: string | null
          previous_first_name?: string | null
          previous_last_name?: string | null
          previous_middle_name?: string | null
          reason?: string | null
          unique_uuid: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_id?: string | null
          previous_first_name?: string | null
          previous_last_name?: string | null
          previous_middle_name?: string | null
          reason?: string | null
          unique_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_name_ip_id_fkey"
            columns: ["ip_id"]
            isOneToOne: false
            referencedRelation: "ip_master"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_notes: {
        Row: {
          note: string | null
          note_date: string
          note_seq: number
          note_tran_code: string | null
          ssn: string
          userid: string | null
        }
        Insert: {
          note?: string | null
          note_date?: string
          note_seq?: number
          note_tran_code?: string | null
          ssn: string
          userid?: string | null
        }
        Update: {
          note?: string | null
          note_date?: string
          note_seq?: number
          note_tran_code?: string | null
          ssn?: string
          userid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ip_notes_ssn"
            columns: ["ssn"]
            isOneToOne: false
            referencedRelation: "ip_master"
            referencedColumns: ["ssn"]
          },
        ]
      }
      ip_other_payments: {
        Row: {
          amount: number
          c3_id: string
          created_at: string | null
          created_by: string | null
          date_entry_mode: string | null
          employee_levy: number | null
          employee_ss: number | null
          employer_eib: number | null
          employer_levy: number | null
          employer_severance: number | null
          employer_ss: number | null
          id: string
          income_code_id: string
          policy_id: string | null
          policy_type: string | null
          ssn: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount?: number
          c3_id: string
          created_at?: string | null
          created_by?: string | null
          date_entry_mode?: string | null
          employee_levy?: number | null
          employee_ss?: number | null
          employer_eib?: number | null
          employer_levy?: number | null
          employer_severance?: number | null
          employer_ss?: number | null
          id?: string
          income_code_id: string
          policy_id?: string | null
          policy_type?: string | null
          ssn: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          c3_id?: string
          created_at?: string | null
          created_by?: string | null
          date_entry_mode?: string | null
          employee_levy?: number | null
          employee_ss?: number | null
          employer_eib?: number | null
          employer_levy?: number | null
          employer_severance?: number | null
          employer_ss?: number | null
          id?: string
          income_code_id?: string
          policy_id?: string | null
          policy_type?: string | null
          ssn?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_other_payments_income_code_id_fkey"
            columns: ["income_code_id"]
            isOneToOne: false
            referencedRelation: "tb_income_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_self_category: {
        Row: {
          activity_seq_no: string
          effective_end_date: string | null
          effective_start_date: string
          self_ref_no: string
          ssn: string
          wage_category: number | null
        }
        Insert: {
          activity_seq_no: string
          effective_end_date?: string | null
          effective_start_date: string
          self_ref_no: string
          ssn: string
          wage_category?: number | null
        }
        Update: {
          activity_seq_no?: string
          effective_end_date?: string | null
          effective_start_date?: string
          self_ref_no?: string
          ssn?: string
          wage_category?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ip_self_category_ip_self_employ"
            columns: ["ssn", "self_ref_no", "activity_seq_no"]
            isOneToOne: false
            referencedRelation: "ip_self_employ"
            referencedColumns: ["ssn", "self_ref_no", "activity_seq_no"]
          },
        ]
      }
      ip_self_commence: {
        Row: {
          activity_seq_no: string
          date_ceased: string | null
          date_commenced: string
          self_ref_no: string
          ssn: string
        }
        Insert: {
          activity_seq_no: string
          date_ceased?: string | null
          date_commenced: string
          self_ref_no: string
          ssn: string
        }
        Update: {
          activity_seq_no?: string
          date_ceased?: string | null
          date_commenced?: string
          self_ref_no?: string
          ssn?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ip_self_commence_ip_self_employ"
            columns: ["ssn", "self_ref_no", "activity_seq_no"]
            isOneToOne: false
            referencedRelation: "ip_self_employ"
            referencedColumns: ["ssn", "self_ref_no", "activity_seq_no"]
          },
        ]
      }
      ip_self_employ: {
        Row: {
          activity_seq_no: string
          activity_type: string | null
          arrears: string | null
          date_ceased: string | null
          date_commenced: string | null
          date_educated: string | null
          date_modified: string | null
          date_of_application: string | null
          date_of_entry: string | null
          date_of_issue: string | null
          date_verified: string | null
          entered_by: string | null
          fax: string | null
          industrial_code: string | null
          inspector_code: string | null
          inspector_name: string | null
          legal_action: string | null
          occupation_code: string | null
          office_code: string | null
          persons_employed: number | null
          phone: string | null
          sector_code: string | null
          self_edu: string | null
          self_guide: string | null
          self_maddr1: string | null
          self_maddr2: string | null
          self_paddr1: string | null
          self_paddr2: string | null
          self_ref_no: string
          ssn: string
          status: string | null
          userid: string | null
          verified_by: string | null
          village_code: string | null
        }
        Insert: {
          activity_seq_no: string
          activity_type?: string | null
          arrears?: string | null
          date_ceased?: string | null
          date_commenced?: string | null
          date_educated?: string | null
          date_modified?: string | null
          date_of_application?: string | null
          date_of_entry?: string | null
          date_of_issue?: string | null
          date_verified?: string | null
          entered_by?: string | null
          fax?: string | null
          industrial_code?: string | null
          inspector_code?: string | null
          inspector_name?: string | null
          legal_action?: string | null
          occupation_code?: string | null
          office_code?: string | null
          persons_employed?: number | null
          phone?: string | null
          sector_code?: string | null
          self_edu?: string | null
          self_guide?: string | null
          self_maddr1?: string | null
          self_maddr2?: string | null
          self_paddr1?: string | null
          self_paddr2?: string | null
          self_ref_no: string
          ssn: string
          status?: string | null
          userid?: string | null
          verified_by?: string | null
          village_code?: string | null
        }
        Update: {
          activity_seq_no?: string
          activity_type?: string | null
          arrears?: string | null
          date_ceased?: string | null
          date_commenced?: string | null
          date_educated?: string | null
          date_modified?: string | null
          date_of_application?: string | null
          date_of_entry?: string | null
          date_of_issue?: string | null
          date_verified?: string | null
          entered_by?: string | null
          fax?: string | null
          industrial_code?: string | null
          inspector_code?: string | null
          inspector_name?: string | null
          legal_action?: string | null
          occupation_code?: string | null
          office_code?: string | null
          persons_employed?: number | null
          phone?: string | null
          sector_code?: string | null
          self_edu?: string | null
          self_guide?: string | null
          self_maddr1?: string | null
          self_maddr2?: string | null
          self_paddr1?: string | null
          self_paddr2?: string | null
          self_ref_no?: string
          ssn?: string
          status?: string | null
          userid?: string | null
          verified_by?: string | null
          village_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ip_self_employ_ip_master"
            columns: ["ssn"]
            isOneToOne: false
            referencedRelation: "ip_master"
            referencedColumns: ["ssn"]
          },
        ]
      }
      ip_self_locations: {
        Row: {
          activity_seq_no: string
          activity_type: string | null
          location: string | null
          self_ref_no: string
          seq_no: number
          ssn: string
        }
        Insert: {
          activity_seq_no: string
          activity_type?: string | null
          location?: string | null
          self_ref_no: string
          seq_no?: never
          ssn: string
        }
        Update: {
          activity_seq_no?: string
          activity_type?: string | null
          location?: string | null
          self_ref_no?: string
          seq_no?: never
          ssn?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ip_self_locations_ip_self_employ"
            columns: ["ssn", "self_ref_no", "activity_seq_no"]
            isOneToOne: false
            referencedRelation: "ip_self_employ"
            referencedColumns: ["ssn", "self_ref_no", "activity_seq_no"]
          },
        ]
      }
      ip_self_weeks_paid: {
        Row: {
          paid_code1: string | null
          paid_code2: string | null
          paid_code3: string | null
          paid_code4: string | null
          paid_code5: string | null
          paid_code6: string | null
          pay_period: string | null
          payer_id: string
          payer_type: string
          period: string
          sep_ss_amt: number | null
          sequence_no: number
          ssn: string
        }
        Insert: {
          paid_code1?: string | null
          paid_code2?: string | null
          paid_code3?: string | null
          paid_code4?: string | null
          paid_code5?: string | null
          paid_code6?: string | null
          pay_period?: string | null
          payer_id: string
          payer_type: string
          period: string
          sep_ss_amt?: number | null
          sequence_no: number
          ssn: string
        }
        Update: {
          paid_code1?: string | null
          paid_code2?: string | null
          paid_code3?: string | null
          paid_code4?: string | null
          paid_code5?: string | null
          paid_code6?: string | null
          pay_period?: string | null
          payer_id?: string
          payer_type?: string
          period?: string
          sep_ss_amt?: number | null
          sequence_no?: number
          ssn?: string
        }
        Relationships: []
      }
      ip_status: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      ip_vol_contrib: {
        Row: {
          avg_weekly_wage: number | null
          contrib_amt: number | null
          date_ceased: string | null
          date_commenced: string | null
          date_registered: string
          due_date: string | null
          last_payment_date: string | null
          payment_interval: string | null
          ssn: string
        }
        Insert: {
          avg_weekly_wage?: number | null
          contrib_amt?: number | null
          date_ceased?: string | null
          date_commenced?: string | null
          date_registered: string
          due_date?: string | null
          last_payment_date?: string | null
          payment_interval?: string | null
          ssn: string
        }
        Update: {
          avg_weekly_wage?: number | null
          contrib_amt?: number | null
          date_ceased?: string | null
          date_commenced?: string | null
          date_registered?: string
          due_date?: string | null
          last_payment_date?: string | null
          payment_interval?: string | null
          ssn?: string
        }
        Relationships: []
      }
      ip_vol_contrib_wages: {
        Row: {
          contrib_amt: number | null
          created_at: string | null
          date_entered: string | null
          date_modified: string | null
          entered_by: string | null
          modified_by: string | null
          payment_sequence_no: number
          period: string | null
          ssn: string
          updated_at: string | null
        }
        Insert: {
          contrib_amt?: number | null
          created_at?: string | null
          date_entered?: string | null
          date_modified?: string | null
          entered_by?: string | null
          modified_by?: string | null
          payment_sequence_no: number
          period?: string | null
          ssn: string
          updated_at?: string | null
        }
        Update: {
          contrib_amt?: number | null
          created_at?: string | null
          date_entered?: string | null
          date_modified?: string | null
          entered_by?: string | null
          modified_by?: string | null
          payment_sequence_no?: number
          period?: string | null
          ssn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ip_wages: {
        Row: {
          bonus_date: string | null
          bonus_exempt_levy: boolean | null
          bonus_holiday_swapped: boolean | null
          c3_id: string | null
          created_at: string
          date_entered: string | null
          date_modified: string | null
          date_verified: string | null
          employee_name: string | null
          entered_by: string | null
          er_ei_amt: number | null
          er_levy_amt: number | null
          er_ss_amt: number | null
          holiday_end_date: string | null
          holiday_start_date: string | null
          id: string
          input_seq_no: number | null
          ip_levy_amt: number | null
          ip_pe_amt: number | null
          ip_ss_amt: number | null
          is_verified: boolean
          modified_by: string | null
          paid_code1: string | null
          paid_code2: string | null
          paid_code3: string | null
          paid_code4: string | null
          paid_code5: string | null
          paid_code6: string | null
          paid_code7: string | null
          pay_period: string | null
          payer_id: string
          payer_type: string
          period: string
          posting_status: string | null
          sequence_no: number
          ssn: string
          total_wages: number | null
          updated_at: string
          verified_by: string | null
          wages_paid1: number | null
          wages_paid2: number | null
          wages_paid3: number | null
          wages_paid4: number | null
          wages_paid5: number | null
          wages_paid6: number | null
          wages_paid7: number | null
        }
        Insert: {
          bonus_date?: string | null
          bonus_exempt_levy?: boolean | null
          bonus_holiday_swapped?: boolean | null
          c3_id?: string | null
          created_at?: string
          date_entered?: string | null
          date_modified?: string | null
          date_verified?: string | null
          employee_name?: string | null
          entered_by?: string | null
          er_ei_amt?: number | null
          er_levy_amt?: number | null
          er_ss_amt?: number | null
          holiday_end_date?: string | null
          holiday_start_date?: string | null
          id?: string
          input_seq_no?: number | null
          ip_levy_amt?: number | null
          ip_pe_amt?: number | null
          ip_ss_amt?: number | null
          is_verified?: boolean
          modified_by?: string | null
          paid_code1?: string | null
          paid_code2?: string | null
          paid_code3?: string | null
          paid_code4?: string | null
          paid_code5?: string | null
          paid_code6?: string | null
          paid_code7?: string | null
          pay_period?: string | null
          payer_id: string
          payer_type: string
          period: string
          posting_status?: string | null
          sequence_no?: number
          ssn: string
          total_wages?: number | null
          updated_at?: string
          verified_by?: string | null
          wages_paid1?: number | null
          wages_paid2?: number | null
          wages_paid3?: number | null
          wages_paid4?: number | null
          wages_paid5?: number | null
          wages_paid6?: number | null
          wages_paid7?: number | null
        }
        Update: {
          bonus_date?: string | null
          bonus_exempt_levy?: boolean | null
          bonus_holiday_swapped?: boolean | null
          c3_id?: string | null
          created_at?: string
          date_entered?: string | null
          date_modified?: string | null
          date_verified?: string | null
          employee_name?: string | null
          entered_by?: string | null
          er_ei_amt?: number | null
          er_levy_amt?: number | null
          er_ss_amt?: number | null
          holiday_end_date?: string | null
          holiday_start_date?: string | null
          id?: string
          input_seq_no?: number | null
          ip_levy_amt?: number | null
          ip_pe_amt?: number | null
          ip_ss_amt?: number | null
          is_verified?: boolean
          modified_by?: string | null
          paid_code1?: string | null
          paid_code2?: string | null
          paid_code3?: string | null
          paid_code4?: string | null
          paid_code5?: string | null
          paid_code6?: string | null
          paid_code7?: string | null
          pay_period?: string | null
          payer_id?: string
          payer_type?: string
          period?: string
          posting_status?: string | null
          sequence_no?: number
          ssn?: string
          total_wages?: number | null
          updated_at?: string
          verified_by?: string | null
          wages_paid1?: number | null
          wages_paid2?: number | null
          wages_paid3?: number | null
          wages_paid4?: number | null
          wages_paid5?: number | null
          wages_paid6?: number | null
          wages_paid7?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_wages_c3_id_fkey"
            columns: ["c3_id"]
            isOneToOne: false
            referencedRelation: "cn_c3_reported"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_admin_audit: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          changes: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          timestamp: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          changes?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          timestamp?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          changes?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          timestamp?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_admin_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      legal_code_sets: {
        Row: {
          category: string
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          metadata: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          metadata?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          metadata?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_code_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_complainant_settings: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          default_officer: string | null
          default_priority: string | null
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          default_officer?: string | null
          default_priority?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          default_officer?: string | null
          default_priority?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
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
      legal_integrations: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_sync: string | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_integrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      legal_sla_rules: {
        Row: {
          auto_assign_rule: string | null
          case_type: string | null
          created_at: string | null
          created_by: string | null
          escalation_queue: string | null
          id: string
          is_active: boolean | null
          name: string
          notification_email: boolean | null
          notification_sms: boolean | null
          sla_days: number
          stage: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auto_assign_rule?: string | null
          case_type?: string | null
          created_at?: string | null
          created_by?: string | null
          escalation_queue?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_email?: boolean | null
          notification_sms?: boolean | null
          sla_days: number
          stage?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_assign_rule?: string | null
          case_type?: string | null
          created_at?: string | null
          created_by?: string | null
          escalation_queue?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_email?: boolean | null
          notification_sms?: boolean | null
          sla_days?: number
          stage?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_sla_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_status_transitions: {
        Row: {
          allowed_roles: string[]
          conditions: Json | null
          created_at: string | null
          from_status: string
          id: string
          requires_approval: boolean | null
          to_status: string
        }
        Insert: {
          allowed_roles: string[]
          conditions?: Json | null
          created_at?: string | null
          from_status: string
          id?: string
          requires_approval?: boolean | null
          to_status: string
        }
        Update: {
          allowed_roles?: string[]
          conditions?: Json | null
          created_at?: string | null
          from_status?: string
          id?: string
          requires_approval?: boolean | null
          to_status?: string
        }
        Relationships: []
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
      legal_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          merge_fields: Json | null
          name: string
          parent_template_id: string | null
          published_at: string | null
          published_by: string | null
          status: string | null
          type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          merge_fields?: Json | null
          name: string
          parent_template_id?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          merge_fields?: Json | null
          name?: string
          parent_template_id?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "legal_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_templates_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      login_security_events: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          login_success: boolean | null
          metadata: Json | null
          risk_level: string
          turnstile_token_valid: boolean | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          verification_result: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          login_success?: boolean | null
          metadata?: Json | null
          risk_level?: string
          turnstile_token_valid?: boolean | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          verification_result?: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          login_success?: boolean | null
          metadata?: Json | null
          risk_level?: string
          turnstile_token_valid?: boolean | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          verification_result?: string
        }
        Relationships: []
      }
      meeting_api_logs: {
        Row: {
          action_type: string
          api_config_id: string | null
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          is_success: boolean | null
          meeting_id: string
          request_headers: Json | null
          request_method: string | null
          request_payload: Json | null
          request_url: string | null
          response_headers: Json | null
          response_payload: Json | null
          response_status: number | null
          retry_attempt: number | null
        }
        Insert: {
          action_type: string
          api_config_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          is_success?: boolean | null
          meeting_id: string
          request_headers?: Json | null
          request_method?: string | null
          request_payload?: Json | null
          request_url?: string | null
          response_headers?: Json | null
          response_payload?: Json | null
          response_status?: number | null
          retry_attempt?: number | null
        }
        Update: {
          action_type?: string
          api_config_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          is_success?: boolean | null
          meeting_id?: string
          request_headers?: Json | null
          request_method?: string | null
          request_payload?: Json | null
          request_url?: string | null
          response_headers?: Json | null
          response_payload?: Json | null
          response_status?: number | null
          retry_attempt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_api_logs_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_api_logs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_history: {
        Row: {
          action_taken: string
          id: string
          ip_address: string | null
          meeting_id: string
          new_date: string | null
          new_status: Database["public"]["Enums"]["meeting_status"]
          new_time: string | null
          old_date: string | null
          old_status: Database["public"]["Enums"]["meeting_status"] | null
          old_time: string | null
          outcome: Database["public"]["Enums"]["meeting_outcome"] | null
          performed_at: string | null
          performed_by: string | null
          performed_by_name: string | null
          remarks: string | null
          user_agent: string | null
        }
        Insert: {
          action_taken: string
          id?: string
          ip_address?: string | null
          meeting_id: string
          new_date?: string | null
          new_status: Database["public"]["Enums"]["meeting_status"]
          new_time?: string | null
          old_date?: string | null
          old_status?: Database["public"]["Enums"]["meeting_status"] | null
          old_time?: string | null
          outcome?: Database["public"]["Enums"]["meeting_outcome"] | null
          performed_at?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          remarks?: string | null
          user_agent?: string | null
        }
        Update: {
          action_taken?: string
          id?: string
          ip_address?: string | null
          meeting_id?: string
          new_date?: string | null
          new_status?: Database["public"]["Enums"]["meeting_status"]
          new_time?: string | null
          old_date?: string | null
          old_status?: Database["public"]["Enums"]["meeting_status"] | null
          old_time?: string | null
          outcome?: Database["public"]["Enums"]["meeting_outcome"] | null
          performed_at?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          remarks?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_history_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_slot_reservations: {
        Row: {
          assigned_user_id: string
          contact_person: string | null
          created_at: string
          id: string
          is_active: boolean
          meeting_date: string
          meeting_time: string
          reason: string | null
          reserved_by: string | null
          source_meeting_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id: string
          contact_person?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meeting_date: string
          meeting_time: string
          reason?: string | null
          reserved_by?: string | null
          source_meeting_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string
          contact_person?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meeting_date?: string
          meeting_time?: string
          reason?: string | null
          reserved_by?: string | null
          source_meeting_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_slot_reservations_source_meeting_id_fkey"
            columns: ["source_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_uploaded_documents: {
        Row: {
          application_reference: string
          created_at: string
          doc_code: string | null
          document_name: string | null
          document_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean
          is_supportive: boolean | null
          meeting_id: string
          metadata: Json | null
          mime_type: string | null
          replaced_at: string | null
          replaced_by: string | null
          storage_url: string
          supportive_doc_type: string | null
          updated_at: string
          uploaded_by: string | null
          uploaded_by_code: string | null
          verification_category: string | null
        }
        Insert: {
          application_reference: string
          created_at?: string
          doc_code?: string | null
          document_name?: string | null
          document_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          is_supportive?: boolean | null
          meeting_id: string
          metadata?: Json | null
          mime_type?: string | null
          replaced_at?: string | null
          replaced_by?: string | null
          storage_url: string
          supportive_doc_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_code?: string | null
          verification_category?: string | null
        }
        Update: {
          application_reference?: string
          created_at?: string
          doc_code?: string | null
          document_name?: string | null
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          is_supportive?: boolean | null
          meeting_id?: string
          metadata?: Json | null
          mime_type?: string | null
          replaced_at?: string | null
          replaced_by?: string | null
          storage_url?: string
          supportive_doc_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_code?: string | null
          verification_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_uploaded_documents_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_uploaded_documents_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "meeting_uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          action_config_id: string | null
          api_notification_at: string | null
          api_notified: boolean | null
          application_reference: string
          assigned_user_id: string | null
          closed_at: string | null
          closed_by: string | null
          closed_by_name: string | null
          contact_email: string | null
          contact_person: string | null
          contact_person_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          meeting_date: string
          meeting_end_time: string | null
          meeting_reference: string
          meeting_time: string
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          metadata: Json | null
          office_address: string | null
          office_code: string | null
          office_location_id: string | null
          outcome: Database["public"]["Enums"]["meeting_outcome"] | null
          outcome_remarks: string | null
          parent_meeting_id: string | null
          remarks: string | null
          reschedule_count: number | null
          scheduled_by: string | null
          scheduled_by_name: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          step_id: string | null
          updated_at: string | null
          updated_by: string | null
          workflow_id: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          action_config_id?: string | null
          api_notification_at?: string | null
          api_notified?: boolean | null
          application_reference: string
          assigned_user_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_by_name?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          meeting_date: string
          meeting_end_time?: string | null
          meeting_reference: string
          meeting_time: string
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          metadata?: Json | null
          office_address?: string | null
          office_code?: string | null
          office_location_id?: string | null
          outcome?: Database["public"]["Enums"]["meeting_outcome"] | null
          outcome_remarks?: string | null
          parent_meeting_id?: string | null
          remarks?: string | null
          reschedule_count?: number | null
          scheduled_by?: string | null
          scheduled_by_name?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          step_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_id?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          action_config_id?: string | null
          api_notification_at?: string | null
          api_notified?: boolean | null
          application_reference?: string
          assigned_user_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_by_name?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          meeting_date?: string
          meeting_end_time?: string | null
          meeting_reference?: string
          meeting_time?: string
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          metadata?: Json | null
          office_address?: string | null
          office_code?: string | null
          office_location_id?: string | null
          outcome?: Database["public"]["Enums"]["meeting_outcome"] | null
          outcome_remarks?: string | null
          parent_meeting_id?: string | null
          remarks?: string | null
          reschedule_count?: number | null
          scheduled_by?: string | null
          scheduled_by_name?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          step_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_id?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_action_config_id_fkey"
            columns: ["action_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_action_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "tb_office_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_parent_meeting_id_fkey"
            columns: ["parent_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_config: {
        Row: {
          allowed_methods: string[] | null
          created_at: string | null
          id: string
          is_required: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowed_methods?: string[] | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowed_methods?: string[] | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      mi_tb_del_ip_depend: {
        Row: {
          address: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          first_name: string | null
          gender: string | null
          id: string
          ip_id: string | null
          last_name: string | null
          middle_name: string | null
          original_id: string
          relation_type: string | null
          unique_uuid: string
        }
        Insert: {
          address?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          ip_id?: string | null
          last_name?: string | null
          middle_name?: string | null
          original_id: string
          relation_type?: string | null
          unique_uuid: string
        }
        Update: {
          address?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          ip_id?: string | null
          last_name?: string | null
          middle_name?: string | null
          original_id?: string
          relation_type?: string | null
          unique_uuid?: string
        }
        Relationships: []
      }
      module_actions: {
        Row: {
          action_name: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_enabled: boolean | null
          module_id: string
        }
        Insert: {
          action_name: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_enabled?: boolean | null
          module_id: string
        }
        Update: {
          action_name?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_enabled?: boolean | null
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_actions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_button_bindings: {
        Row: {
          action_id: string
          button_key: string
          button_label: string
          created_at: string
          created_by: string | null
          id: string
          module_id: string
        }
        Insert: {
          action_id: string
          button_key: string
          button_label: string
          created_at?: string
          created_by?: string | null
          id?: string
          module_id: string
        }
        Update: {
          action_id?: string
          button_key?: string
          button_label?: string
          created_at?: string
          created_by?: string | null
          id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_button_bindings_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "module_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_button_bindings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_doc_categories: {
        Row: {
          category_name: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          module_id: string
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_doc_categories_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_doc_configs: {
        Row: {
          allow_alternate_doc: boolean | null
          allowed_extensions: string[] | null
          alternate_allowed_extensions: string[] | null
          alternate_doc_name: string | null
          alternate_max_file_size_mb: number | null
          alternate_requires_supportive: boolean | null
          alternate_supportive_allowed_extensions: string[] | null
          alternate_supportive_description: string | null
          alternate_supportive_max_file_size_mb: number | null
          category_id: string
          created_at: string | null
          created_by: string | null
          document_name: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          max_file_size_mb: number | null
          requires_supportive_doc: boolean | null
          sort_order: number | null
          supportive_allowed_extensions: string[] | null
          supportive_doc_description: string | null
          supportive_max_file_size_mb: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allow_alternate_doc?: boolean | null
          allowed_extensions?: string[] | null
          alternate_allowed_extensions?: string[] | null
          alternate_doc_name?: string | null
          alternate_max_file_size_mb?: number | null
          alternate_requires_supportive?: boolean | null
          alternate_supportive_allowed_extensions?: string[] | null
          alternate_supportive_description?: string | null
          alternate_supportive_max_file_size_mb?: number | null
          category_id: string
          created_at?: string | null
          created_by?: string | null
          document_name: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_file_size_mb?: number | null
          requires_supportive_doc?: boolean | null
          sort_order?: number | null
          supportive_allowed_extensions?: string[] | null
          supportive_doc_description?: string | null
          supportive_max_file_size_mb?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allow_alternate_doc?: boolean | null
          allowed_extensions?: string[] | null
          alternate_allowed_extensions?: string[] | null
          alternate_doc_name?: string | null
          alternate_max_file_size_mb?: number | null
          alternate_requires_supportive?: boolean | null
          alternate_supportive_allowed_extensions?: string[] | null
          alternate_supportive_description?: string | null
          alternate_supportive_max_file_size_mb?: number | null
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          document_name?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_file_size_mb?: number | null
          requires_supportive_doc?: boolean | null
          sort_order?: number | null
          supportive_allowed_extensions?: string[] | null
          supportive_doc_description?: string | null
          supportive_max_file_size_mb?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_doc_configs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "module_doc_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      module_tables: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string | null
          id: string
          module_id: string | null
          table_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          module_id?: string | null
          table_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          module_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_tables_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          campaign_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          last_retry_at: string | null
          metadata: Json | null
          recipient_address: string
          recipient_user_id: string | null
          resend_message_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          subject: string | null
          template_id: string | null
          title: string | null
          trigger_source: string | null
          triggered_by: string | null
        }
        Insert: {
          body: string
          campaign_id?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          last_retry_at?: string | null
          metadata?: Json | null
          recipient_address: string
          recipient_user_id?: string | null
          resend_message_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          template_id?: string | null
          title?: string | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Update: {
          body?: string
          campaign_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          last_retry_at?: string | null
          metadata?: Json | null
          recipient_address?: string
          recipient_user_id?: string | null
          resend_message_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string | null
          template_id?: string | null
          title?: string | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_providers: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string | null
          email_provider_type: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          provider_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          email_provider_type?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          email_provider_type?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_template_audit_logs: {
        Row: {
          action: string
          details: Json | null
          field_name: string | null
          id: string
          ip_address: string | null
          new_value: string | null
          old_value: string | null
          performed_at: string
          performed_by: string | null
          template_id: string | null
          template_name: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          field_name?: string | null
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string | null
          template_id?: string | null
          template_name?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          field_name?: string | null
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string | null
          template_id?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_template_audit_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_template_versions: {
        Row: {
          body: string | null
          change_summary: string | null
          changed_at: string
          changed_by: string | null
          html_body: string | null
          id: string
          name: string
          placeholders: Json | null
          subject: string | null
          template_id: string
          version_no: number
        }
        Insert: {
          body?: string | null
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          html_body?: string | null
          id?: string
          name: string
          placeholders?: Json | null
          subject?: string | null
          template_id: string
          version_no: number
        }
        Update: {
          body?: string | null
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          html_body?: string | null
          id?: string
          name?: string
          placeholders?: Json | null
          subject?: string | null
          template_id?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          category: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          created_by: string | null
          description: string | null
          html_body: string | null
          id: string
          is_enabled: boolean | null
          module_id: string | null
          name: string
          placeholders: Json | null
          subject: string | null
          template_code: string | null
          title: string | null
          trigger_event: string | null
          updated_at: string | null
          updated_by: string | null
          version_no: number
        }
        Insert: {
          body: string
          category?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_body?: string | null
          id?: string
          is_enabled?: boolean | null
          module_id?: string | null
          name: string
          placeholders?: Json | null
          subject?: string | null
          template_code?: string | null
          title?: string | null
          trigger_event?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version_no?: number
        }
        Update: {
          body?: string
          category?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_body?: string | null
          id?: string
          is_enabled?: boolean | null
          module_id?: string | null
          name?: string
          placeholders?: Json | null
          subject?: string | null
          template_code?: string | null
          title?: string | null
          trigger_event?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      office_locations: {
        Row: {
          address: string | null
          branch_name: string
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          state: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          branch_name: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          state?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          branch_name?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          state?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      password_policies: {
        Row: {
          auto_refresh_enabled: boolean | null
          created_at: string | null
          id: string
          idle_timeout_minutes: number | null
          is_active: boolean | null
          lockout_duration_minutes: number | null
          lockout_threshold: number | null
          max_age_days: number | null
          max_concurrent_sessions: number | null
          min_length: number | null
          prevent_reuse_count: number | null
          require_lowercase: boolean | null
          require_numbers: boolean | null
          require_special_chars: boolean | null
          require_uppercase: boolean | null
          session_timeout_minutes: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_refresh_enabled?: boolean | null
          created_at?: string | null
          id?: string
          idle_timeout_minutes?: number | null
          is_active?: boolean | null
          lockout_duration_minutes?: number | null
          lockout_threshold?: number | null
          max_age_days?: number | null
          max_concurrent_sessions?: number | null
          min_length?: number | null
          prevent_reuse_count?: number | null
          require_lowercase?: boolean | null
          require_numbers?: boolean | null
          require_special_chars?: boolean | null
          require_uppercase?: boolean | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_refresh_enabled?: boolean | null
          created_at?: string | null
          id?: string
          idle_timeout_minutes?: number | null
          is_active?: boolean | null
          lockout_duration_minutes?: number | null
          lockout_threshold?: number | null
          max_age_days?: number | null
          max_concurrent_sessions?: number | null
          min_length?: number | null
          prevent_reuse_count?: number | null
          require_lowercase?: boolean | null
          require_numbers?: boolean | null
          require_special_chars?: boolean | null
          require_uppercase?: boolean | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_plan_installments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          overdue: boolean | null
          paid: boolean | null
          paid_amount: number | null
          paid_date: string | null
          payment_plan_id: string | null
          payment_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          overdue?: boolean | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_plan_id?: string | null
          payment_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          overdue?: boolean | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_plan_id?: string | null
          payment_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_installments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "compliance_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pii_unlock_logs: {
        Row: {
          expires_at: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          profile_id: string
          profile_type: string
          success: boolean
          unlocked_at: string
          user_agent: string | null
          user_code: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          profile_id: string
          profile_type?: string
          success: boolean
          unlocked_at?: string
          user_agent?: string | null
          user_code?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          profile_id?: string
          profile_type?: string
          success?: boolean
          unlocked_at?: string
          user_agent?: string | null
          user_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          department_id: string | null
          designation_id: string | null
          email: string | null
          employee_code: string | null
          failed_login_attempts: number | null
          first_name: string | null
          force_password_change: boolean | null
          full_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          last_password_change: string | null
          locked_until: string | null
          mfa_enabled: boolean | null
          mfa_method: string | null
          middle_name: string | null
          office_code: string | null
          phone: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
          user_code: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          designation_id?: string | null
          email?: string | null
          employee_code?: string | null
          failed_login_attempts?: number | null
          first_name?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          gender?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          last_password_change?: string | null
          locked_until?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          middle_name?: string | null
          office_code?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_code?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          designation_id?: string | null
          email?: string | null
          employee_code?: string | null
          failed_login_attempts?: number | null
          first_name?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          last_password_change?: string | null
          locked_until?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          middle_name?: string | null
          office_code?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "tb_office_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_office_code_fkey"
            columns: ["office_code"]
            isOneToOne: false
            referencedRelation: "tb_office"
            referencedColumns: ["code"]
          },
        ]
      }
      public_api_access_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string | null
          error_message: string | null
          http_method: string | null
          id: string
          request_ip: string | null
          request_payload_summary: string | null
          response_status: number | null
          response_time_ms: number | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: string
          request_ip?: string | null
          request_payload_summary?: string | null
          response_status?: number | null
          response_time_ms?: number | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: string
          request_ip?: string | null
          request_payload_summary?: string | null
          response_status?: number | null
          response_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_api_access_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "public_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      public_api_keys: {
        Row: {
          allowed_endpoints: string[] | null
          allowed_ip_addresses: string[] | null
          app_name: string
          created_at: string
          created_by: string | null
          encrypted_key: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          rate_limit_per_minute: number
          revoked_at: string | null
          revoked_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allowed_endpoints?: string[] | null
          allowed_ip_addresses?: string[] | null
          app_name: string
          created_at?: string
          created_by?: string | null
          encrypted_key?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          rate_limit_per_minute?: number
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allowed_endpoints?: string[] | null
          allowed_ip_addresses?: string[] | null
          app_name?: string
          created_at?: string
          created_by?: string | null
          encrypted_key?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          rate_limit_per_minute?: number
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_api_rate_limits: {
        Row: {
          api_key_id: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          api_key_id: string
          id?: string
          request_count?: number
          window_start: string
        }
        Update: {
          api_key_id?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "public_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_ai_generation_log: {
        Row: {
          accepted_count: number
          created_at: string
          generated_count: number
          id: string
          knowledge_entry_id: string | null
          model_used: string | null
          module: string | null
          prompt_used: string | null
          raw_response: Json | null
          rejected_count: number
          triggered_by: string | null
        }
        Insert: {
          accepted_count?: number
          created_at?: string
          generated_count?: number
          id?: string
          knowledge_entry_id?: string | null
          model_used?: string | null
          module?: string | null
          prompt_used?: string | null
          raw_response?: Json | null
          rejected_count?: number
          triggered_by?: string | null
        }
        Update: {
          accepted_count?: number
          created_at?: string
          generated_count?: number
          id?: string
          knowledge_entry_id?: string | null
          model_used?: string | null
          module?: string | null
          prompt_used?: string | null
          raw_response?: Json | null
          rejected_count?: number
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_ai_generation_log_knowledge_entry_id_fkey"
            columns: ["knowledge_entry_id"]
            isOneToOne: false
            referencedRelation: "qa_knowledge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_change_requests: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          before_snapshot: Json | null
          change_type: string
          created_at: string
          id: string
          module: string | null
          proposed_changes: Json
          reason: string
          requested_at: string
          requested_by: string | null
          requested_by_code: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_code: string | null
          status: Database["public"]["Enums"]["qa_change_status"]
          target_id: string | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          before_snapshot?: Json | null
          change_type: string
          created_at?: string
          id?: string
          module?: string | null
          proposed_changes?: Json
          reason: string
          requested_at?: string
          requested_by?: string | null
          requested_by_code?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_code?: string | null
          status?: Database["public"]["Enums"]["qa_change_status"]
          target_id?: string | null
          target_type: string
          title: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          before_snapshot?: Json | null
          change_type?: string
          created_at?: string
          id?: string
          module?: string | null
          proposed_changes?: Json
          reason?: string
          requested_at?: string
          requested_by?: string | null
          requested_by_code?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_code?: string | null
          status?: Database["public"]["Enums"]["qa_change_status"]
          target_id?: string | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      qa_enforcement_log: {
        Row: {
          action: string
          attempted_at: string
          attempted_by: string | null
          change_request_id: string | null
          detail: string | null
          id: string
          target_id: string
          target_type: string
          was_approved: boolean
        }
        Insert: {
          action: string
          attempted_at?: string
          attempted_by?: string | null
          change_request_id?: string | null
          detail?: string | null
          id?: string
          target_id: string
          target_type: string
          was_approved?: boolean
        }
        Update: {
          action?: string
          attempted_at?: string
          attempted_by?: string | null
          change_request_id?: string | null
          detail?: string | null
          id?: string
          target_id?: string
          target_type?: string
          was_approved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "qa_enforcement_log_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "qa_change_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_execution_runs: {
        Row: {
          blocking_failures: number
          change_reference: string | null
          completed_at: string | null
          created_at: string
          deployment_blocked: boolean
          error_count: number
          execution_duration_ms: number | null
          failed_count: number
          id: string
          modules_targeted: string[] | null
          passed_count: number
          release_version: string | null
          run_name: string
          run_type: string
          skipped_count: number
          started_at: string | null
          status: string
          summary_notes: string | null
          total_tests: number
          trigger_source: string
          triggered_by: string | null
          triggered_by_code: string | null
        }
        Insert: {
          blocking_failures?: number
          change_reference?: string | null
          completed_at?: string | null
          created_at?: string
          deployment_blocked?: boolean
          error_count?: number
          execution_duration_ms?: number | null
          failed_count?: number
          id?: string
          modules_targeted?: string[] | null
          passed_count?: number
          release_version?: string | null
          run_name: string
          run_type?: string
          skipped_count?: number
          started_at?: string | null
          status?: string
          summary_notes?: string | null
          total_tests?: number
          trigger_source?: string
          triggered_by?: string | null
          triggered_by_code?: string | null
        }
        Update: {
          blocking_failures?: number
          change_reference?: string | null
          completed_at?: string | null
          created_at?: string
          deployment_blocked?: boolean
          error_count?: number
          execution_duration_ms?: number | null
          failed_count?: number
          id?: string
          modules_targeted?: string[] | null
          passed_count?: number
          release_version?: string | null
          run_name?: string
          run_type?: string
          skipped_count?: number
          started_at?: string | null
          status?: string
          summary_notes?: string | null
          total_tests?: number
          trigger_source?: string
          triggered_by?: string | null
          triggered_by_code?: string | null
        }
        Relationships: []
      }
      qa_knowledge_entries: {
        Row: {
          api_endpoint: string | null
          boundary_conditions: Json | null
          created_at: string
          created_by: string | null
          created_by_code: string | null
          db_table: string | null
          description: string | null
          expected_behavior: string | null
          id: string
          is_latest: boolean
          module: string
          negative_example: Json | null
          parent_id: string | null
          positive_example: Json | null
          priority: string
          rule_definition: Json
          rule_type: string
          screen_path: string | null
          status: string
          submodule: string | null
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
          updated_by_code: string | null
          version: number
          workflow_step: string | null
        }
        Insert: {
          api_endpoint?: string | null
          boundary_conditions?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_code?: string | null
          db_table?: string | null
          description?: string | null
          expected_behavior?: string | null
          id?: string
          is_latest?: boolean
          module: string
          negative_example?: Json | null
          parent_id?: string | null
          positive_example?: Json | null
          priority?: string
          rule_definition?: Json
          rule_type?: string
          screen_path?: string | null
          status?: string
          submodule?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          updated_by_code?: string | null
          version?: number
          workflow_step?: string | null
        }
        Update: {
          api_endpoint?: string | null
          boundary_conditions?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_code?: string | null
          db_table?: string | null
          description?: string | null
          expected_behavior?: string | null
          id?: string
          is_latest?: boolean
          module?: string
          negative_example?: Json | null
          parent_id?: string | null
          positive_example?: Json | null
          priority?: string
          rule_definition?: Json
          rule_type?: string
          screen_path?: string | null
          status?: string
          submodule?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_code?: string | null
          version?: number
          workflow_step?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_knowledge_entries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "qa_knowledge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_module_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          depends_on_module: string
          description: string | null
          id: string
          source_module: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          depends_on_module: string
          description?: string | null
          id?: string
          source_module: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          depends_on_module?: string
          description?: string | null
          id?: string
          source_module?: string
        }
        Relationships: []
      }
      qa_pipeline_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      qa_test_cases: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_code: string | null
          description: string | null
          expected_result: Json
          generation_prompt: string | null
          generation_source: string
          id: string
          is_mandatory: boolean
          knowledge_entry_id: string | null
          module: string
          priority: string
          status: string
          submodule: string | null
          tags: string[] | null
          test_config: Json
          test_type: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_code?: string | null
          description?: string | null
          expected_result?: Json
          generation_prompt?: string | null
          generation_source?: string
          id?: string
          is_mandatory?: boolean
          knowledge_entry_id?: string | null
          module: string
          priority?: string
          status?: string
          submodule?: string | null
          tags?: string[] | null
          test_config?: Json
          test_type?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_code?: string | null
          description?: string | null
          expected_result?: Json
          generation_prompt?: string | null
          generation_source?: string
          id?: string
          is_mandatory?: boolean
          knowledge_entry_id?: string | null
          module?: string
          priority?: string
          status?: string
          submodule?: string | null
          tags?: string[] | null
          test_config?: Json
          test_type?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "qa_test_cases_knowledge_entry_id_fkey"
            columns: ["knowledge_entry_id"]
            isOneToOne: false
            referencedRelation: "qa_knowledge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_test_results: {
        Row: {
          actual_outcome: Json | null
          created_at: string
          diff_details: Json | null
          error_message: string | null
          executed_at: string | null
          execution_duration_ms: number | null
          expected_outcome: Json | null
          id: string
          notes: string | null
          request_payload: Json | null
          run_id: string
          stack_trace: string | null
          status: string
          test_case_id: string
        }
        Insert: {
          actual_outcome?: Json | null
          created_at?: string
          diff_details?: Json | null
          error_message?: string | null
          executed_at?: string | null
          execution_duration_ms?: number | null
          expected_outcome?: Json | null
          id?: string
          notes?: string | null
          request_payload?: Json | null
          run_id: string
          stack_trace?: string | null
          status?: string
          test_case_id: string
        }
        Update: {
          actual_outcome?: Json | null
          created_at?: string
          diff_details?: Json | null
          error_message?: string | null
          executed_at?: string | null
          execution_duration_ms?: number | null
          expected_outcome?: Json | null
          id?: string
          notes?: string | null
          request_payload?: Json | null
          run_id?: string
          stack_trace?: string | null
          status?: string
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "qa_execution_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_test_results_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "qa_test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      remittance_schedule: {
        Row: {
          auto_generate_voucher: boolean | null
          contributor_id: string | null
          created_at: string | null
          frequency: string
          id: string
          next_due_date: string
          updated_at: string | null
        }
        Insert: {
          auto_generate_voucher?: boolean | null
          contributor_id?: string | null
          created_at?: string | null
          frequency: string
          id?: string
          next_due_date: string
          updated_at?: string | null
        }
        Update: {
          auto_generate_voucher?: boolean | null
          contributor_id?: string | null
          created_at?: string | null
          frequency?: string
          id?: string
          next_due_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remittance_schedule_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "contributor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_hierarchy: {
        Row: {
          created_at: string
          id: string
          level: number
          parent_role_id: string | null
          role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          parent_role_id?: string | null
          role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          parent_role_id?: string | null
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_hierarchy_parent_role_id_fkey"
            columns: ["parent_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_hierarchy_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: true
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_granted: boolean | null
          module_id: string
          role_id: string
        }
        Insert: {
          action_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_granted?: boolean | null
          module_id: string
          role_id: string
        }
        Update: {
          action_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_granted?: boolean | null
          module_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "module_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system_role: boolean
          mfa_required: boolean
          role_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          mfa_required?: boolean
          role_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          mfa_required?: boolean
          role_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      route_security_config: {
        Row: {
          admin_only: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_settings_route: boolean
          module_name: string
          requires_auth: boolean
          route_pattern: string
          screen_name: string | null
          severity_on_violation: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_only?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_settings_route?: boolean
          module_name: string
          requires_auth?: boolean
          route_pattern: string
          screen_name?: string | null
          severity_on_violation?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_only?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_settings_route?: boolean
          module_name?: string
          requires_auth?: boolean
          route_pattern?: string
          screen_name?: string | null
          severity_on_violation?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sample_applications: {
        Row: {
          amount: number
          applicant_comments: string | null
          applicant_email: string | null
          applicant_id: string | null
          applicant_name: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
          workflow_instance_id: string | null
        }
        Insert: {
          amount?: number
          applicant_comments?: string | null
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
          workflow_instance_id?: string | null
        }
        Update: {
          amount?: number
          applicant_comments?: string | null
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          workflow_instance_id?: string | null
        }
        Relationships: []
      }
      schema_change_approvals: {
        Row: {
          approval_status: string
          approved_at: string | null
          approver_identity: string | null
          change_description: string
          change_type: string
          created_at: string
          created_by: string | null
          current_schema_snapshot: Json | null
          data_loss_risk: string | null
          environment: string
          id: string
          impacted_modules: string[] | null
          migration_file_reference: string | null
          notes: string | null
          proposed_change: Json | null
          risk_level: string
          rollback_script: string | null
          table_name: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approver_identity?: string | null
          change_description: string
          change_type: string
          created_at?: string
          created_by?: string | null
          current_schema_snapshot?: Json | null
          data_loss_risk?: string | null
          environment?: string
          id?: string
          impacted_modules?: string[] | null
          migration_file_reference?: string | null
          notes?: string | null
          proposed_change?: Json | null
          risk_level: string
          rollback_script?: string | null
          table_name: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approver_identity?: string | null
          change_description?: string
          change_type?: string
          created_at?: string
          created_by?: string | null
          current_schema_snapshot?: Json | null
          data_loss_risk?: string | null
          environment?: string
          id?: string
          impacted_modules?: string[] | null
          migration_file_reference?: string | null
          notes?: string | null
          proposed_change?: Json | null
          risk_level?: string
          rollback_script?: string | null
          table_name?: string
        }
        Relationships: []
      }
      schema_migration_logs: {
        Row: {
          column_pair: string
          executed_at: string
          id: string
          migration_name: string
          rows_migrated: number
        }
        Insert: {
          column_pair: string
          executed_at?: string
          id?: string
          migration_name: string
          rows_migrated?: number
        }
        Update: {
          column_pair?: string
          executed_at?: string
          id?: string
          migration_name?: string
          rows_migrated?: number
        }
        Relationships: []
      }
      security_ip_blocks: {
        Row: {
          block_duration_minutes: number
          block_reason: string
          blocked_at: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string
          is_active: boolean
          unblocked_at: string | null
          unblocked_by: string | null
        }
        Insert: {
          block_duration_minutes?: number
          block_reason: string
          blocked_at?: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address: string
          is_active?: boolean
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Update: {
          block_duration_minutes?: number
          block_reason?: string
          blocked_at?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string
          is_active?: boolean
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Relationships: []
      }
      security_policy_config: {
        Row: {
          category: string
          config_key: string
          config_value: string
          created_at: string
          data_type: string
          description: string | null
          display_name: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          config_key: string
          config_value: string
          created_at?: string
          data_type?: string
          description?: string | null
          display_name: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: string
          created_at?: string
          data_type?: string
          description?: string | null
          display_name?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      system_audit_trail: {
        Row: {
          action: string | null
          after_value: Json | null
          api_name: string | null
          before_value: Json | null
          correlation_id: string | null
          created_at: string
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          module: string | null
          payload_json: Json | null
          session_id: string | null
          severity: string | null
          timestamp: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action?: string | null
          after_value?: Json | null
          api_name?: string | null
          before_value?: Json | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string | null
          after_value?: Json | null
          api_name?: string | null
          before_value?: Json | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      system_business_events: {
        Row: {
          action: string | null
          api_name: string | null
          correlation_id: string | null
          created_at: string
          description: string | null
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          module: string | null
          payload_json: Json | null
          performed_by: string | null
          session_id: string | null
          severity: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action?: string | null
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          description?: string | null
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          performed_by?: string | null
          session_id?: string | null
          severity?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string | null
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          description?: string | null
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          performed_by?: string | null
          session_id?: string | null
          severity?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          api_name: string | null
          correlation_id: string | null
          created_at: string
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          error_type: string | null
          id: string
          ip_address: string | null
          module: string | null
          payload_json: Json | null
          session_id: string | null
          severity: string | null
          stack_trace: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          stack_trace?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          stack_trace?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_integration_logs: {
        Row: {
          api_name: string | null
          correlation_id: string | null
          created_at: string
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          external_service: string | null
          id: string
          ip_address: string | null
          module: string | null
          payload_json: Json | null
          request_data: Json | null
          response_data: Json | null
          retry_count: number | null
          session_id: string | null
          severity: string | null
          status: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          external_service?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          request_data?: Json | null
          response_data?: Json | null
          retry_count?: number | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          external_service?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          request_data?: Json | null
          response_data?: Json | null
          retry_count?: number | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_performance_metrics: {
        Row: {
          api_name: string | null
          correlation_id: string | null
          cpu_usage_percent: number | null
          created_at: string
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          execution_time_ms: number | null
          id: string
          ip_address: string | null
          memory_usage_mb: number | null
          module: string | null
          payload_json: Json | null
          session_id: string | null
          severity: string | null
          status: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          api_name?: string | null
          correlation_id?: string | null
          cpu_usage_percent?: number | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: string | null
          memory_usage_mb?: number | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          api_name?: string | null
          correlation_id?: string | null
          cpu_usage_percent?: number | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: string | null
          memory_usage_mb?: number | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_security_logs: {
        Row: {
          api_name: string | null
          correlation_id: string | null
          created_at: string
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string | null
          id: string
          ip_address: string | null
          module: string | null
          payload_json: Json | null
          session_id: string | null
          severity: string | null
          success: boolean | null
          timestamp: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          success?: boolean | null
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          success?: boolean | null
          timestamp?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          allowed_values: Json | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_editable: boolean
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_values?: Json | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_editable?: boolean
          setting_key: string
          setting_type?: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_values?: Json | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_editable?: boolean
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      system_technical_logs: {
        Row: {
          api_name: string | null
          correlation_id: string | null
          created_at: string
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          execution_time_ms: number | null
          headers: Json | null
          id: string
          ip_address: string | null
          module: string | null
          payload_json: Json | null
          request_payload: Json | null
          response_payload: Json | null
          session_id: string | null
          severity: string | null
          stack_trace: string | null
          status: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          execution_time_ms?: number | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          request_payload?: Json | null
          response_payload?: Json | null
          session_id?: string | null
          severity?: string | null
          stack_trace?: string | null
          status?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          api_name?: string | null
          correlation_id?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          execution_time_ms?: number | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          request_payload?: Json | null
          response_payload?: Json | null
          session_id?: string | null
          severity?: string | null
          stack_trace?: string | null
          status?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tb_activity: {
        Row: {
          code: string
          long_description: string | null
          short_description: string | null
        }
        Insert: {
          code: string
          long_description?: string | null
          short_description?: string | null
        }
        Update: {
          code?: string
          long_description?: string | null
          short_description?: string | null
        }
        Relationships: []
      }
      tb_c3_status: {
        Row: {
          code: string
          description: string
          isactive: boolean
        }
        Insert: {
          code: string
          description: string
          isactive?: boolean
        }
        Update: {
          code?: string
          description?: string
          isactive?: boolean
        }
        Relationships: []
      }
      tb_country: {
        Row: {
          caricom: number | null
          code: string
          description: string | null
          nationality: string | null
          oecs: number | null
        }
        Insert: {
          caricom?: number | null
          code: string
          description?: string | null
          nationality?: string | null
          oecs?: number | null
        }
        Update: {
          caricom?: number | null
          code?: string
          description?: string | null
          nationality?: string | null
          oecs?: number | null
        }
        Relationships: []
      }
      tb_deductions_tax_table_details: {
        Row: {
          base_amt: number | null
          ded_code: string | null
          marital_stat: string | null
          month: number | null
          order_no: number | null
          over_amt: number | null
          pay_period: string | null
          tax_rate: number | null
          tax_year: string | null
          taxheaderid: number | null
          taxtabid: number
        }
        Insert: {
          base_amt?: number | null
          ded_code?: string | null
          marital_stat?: string | null
          month?: number | null
          order_no?: number | null
          over_amt?: number | null
          pay_period?: string | null
          tax_rate?: number | null
          tax_year?: string | null
          taxheaderid?: number | null
          taxtabid?: number
        }
        Update: {
          base_amt?: number | null
          ded_code?: string | null
          marital_stat?: string | null
          month?: number | null
          order_no?: number | null
          over_amt?: number | null
          pay_period?: string | null
          tax_rate?: number | null
          tax_year?: string | null
          taxheaderid?: number | null
          taxtabid?: number
        }
        Relationships: []
      }
      tb_deductions_tax_table_header: {
        Row: {
          allow_or_limit: string | null
          biweek_allow: number | null
          ded_code: string | null
          enddate: string | null
          hrs_biweek_allow: number | null
          hrs_misc_allow: number | null
          hrs_month_allow: number | null
          hrs_quarter_allow: number | null
          hrs_smonth_allow: number | null
          hrs_syear_allow: number | null
          hrs_week_allow: number | null
          hrs_year_allow: number | null
          misc_allow: number | null
          month_allow: number | null
          quarter_allow: number | null
          smonth_allow: number | null
          startdate: string | null
          syear_allow: number | null
          tax_year: string | null
          taxtabhid: number
          week_allow: number | null
          year_allow: number | null
        }
        Insert: {
          allow_or_limit?: string | null
          biweek_allow?: number | null
          ded_code?: string | null
          enddate?: string | null
          hrs_biweek_allow?: number | null
          hrs_misc_allow?: number | null
          hrs_month_allow?: number | null
          hrs_quarter_allow?: number | null
          hrs_smonth_allow?: number | null
          hrs_syear_allow?: number | null
          hrs_week_allow?: number | null
          hrs_year_allow?: number | null
          misc_allow?: number | null
          month_allow?: number | null
          quarter_allow?: number | null
          smonth_allow?: number | null
          startdate?: string | null
          syear_allow?: number | null
          tax_year?: string | null
          taxtabhid?: number
          week_allow?: number | null
          year_allow?: number | null
        }
        Update: {
          allow_or_limit?: string | null
          biweek_allow?: number | null
          ded_code?: string | null
          enddate?: string | null
          hrs_biweek_allow?: number | null
          hrs_misc_allow?: number | null
          hrs_month_allow?: number | null
          hrs_quarter_allow?: number | null
          hrs_smonth_allow?: number | null
          hrs_syear_allow?: number | null
          hrs_week_allow?: number | null
          hrs_year_allow?: number | null
          misc_allow?: number | null
          month_allow?: number | null
          quarter_allow?: number | null
          smonth_allow?: number | null
          startdate?: string | null
          syear_allow?: number | null
          tax_year?: string | null
          taxtabhid?: number
          week_allow?: number | null
          year_allow?: number | null
        }
        Relationships: []
      }
      tb_dependent_relation: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      tb_district: {
        Row: {
          code: string
          description: string | null
        }
        Insert: {
          code: string
          description?: string | null
        }
        Update: {
          code?: string
          description?: string | null
        }
        Relationships: []
      }
      tb_eye_color: {
        Row: {
          code: string
          description: string | null
        }
        Insert: {
          code: string
          description?: string | null
        }
        Update: {
          code?: string
          description?: string | null
        }
        Relationships: []
      }
      tb_income_cat: {
        Row: {
          appeal: string | null
          category_code: string
          wage_upper: number | null
        }
        Insert: {
          appeal?: string | null
          category_code: string
          wage_upper?: number | null
        }
        Update: {
          appeal?: string | null
          category_code?: string
          wage_upper?: number | null
        }
        Relationships: []
      }
      tb_income_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tb_indus: {
        Row: {
          code: string
          long_description: string | null
          short_description: string | null
        }
        Insert: {
          code: string
          long_description?: string | null
          short_description?: string | null
        }
        Update: {
          code?: string
          long_description?: string | null
          short_description?: string | null
        }
        Relationships: []
      }
      tb_inspector: {
        Row: {
          code: string
          insp_name: string | null
        }
        Insert: {
          code: string
          insp_name?: string | null
        }
        Update: {
          code?: string
          insp_name?: string | null
        }
        Relationships: []
      }
      tb_legal_status: {
        Row: {
          code: string
          description: string | null
        }
        Insert: {
          code: string
          description?: string | null
        }
        Update: {
          code?: string
          description?: string | null
        }
        Relationships: []
      }
      tb_levy_slab_details: {
        Row: {
          base_amt: number | null
          created_by: string | null
          created_on: string | null
          id: string
          is_active: boolean | null
          modified_by: string | null
          modified_on: string | null
          order_no: number | null
          over_amt: number | null
          pay_period: string | null
          slab_id: string
          tax_rate: number | null
        }
        Insert: {
          base_amt?: number | null
          created_by?: string | null
          created_on?: string | null
          id?: string
          is_active?: boolean | null
          modified_by?: string | null
          modified_on?: string | null
          order_no?: number | null
          over_amt?: number | null
          pay_period?: string | null
          slab_id: string
          tax_rate?: number | null
        }
        Update: {
          base_amt?: number | null
          created_by?: string | null
          created_on?: string | null
          id?: string
          is_active?: boolean | null
          modified_by?: string | null
          modified_on?: string | null
          order_no?: number | null
          over_amt?: number | null
          pay_period?: string | null
          slab_id?: string
          tax_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_levy_slab_details_slab_id_fkey"
            columns: ["slab_id"]
            isOneToOne: false
            referencedRelation: "tb_levy_slabs"
            referencedColumns: ["id"]
          },
        ]
      }
      tb_levy_slabs: {
        Row: {
          created_by: string | null
          created_on: string | null
          end_date: string
          id: string
          is_active: boolean | null
          last_published_at: string | null
          modified_by: string | null
          modified_on: string | null
          start_date: string
        }
        Insert: {
          created_by?: string | null
          created_on?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          last_published_at?: string | null
          modified_by?: string | null
          modified_on?: string | null
          start_date: string
        }
        Update: {
          created_by?: string | null
          created_on?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          last_published_at?: string | null
          modified_by?: string | null
          modified_on?: string | null
          start_date?: string
        }
        Relationships: []
      }
      tb_marital: {
        Row: {
          code: string
          description: string | null
        }
        Insert: {
          code: string
          description?: string | null
        }
        Update: {
          code?: string
          description?: string | null
        }
        Relationships: []
      }
      tb_occup: {
        Row: {
          code: string
          long_description: string | null
          short_description: string | null
        }
        Insert: {
          code: string
          long_description?: string | null
          short_description?: string | null
        }
        Update: {
          code?: string
          long_description?: string | null
          short_description?: string | null
        }
        Relationships: []
      }
      tb_office: {
        Row: {
          address1: string
          address2: string
          code: string
          description: string
          office_email: string | null
          office_end_time: string | null
          office_phone: string | null
          office_start_time: string | null
        }
        Insert: {
          address1?: string
          address2?: string
          code: string
          description: string
          office_email?: string | null
          office_end_time?: string | null
          office_phone?: string | null
          office_start_time?: string | null
        }
        Update: {
          address1?: string
          address2?: string
          code?: string
          description?: string
          office_email?: string | null
          office_end_time?: string | null
          office_phone?: string | null
          office_start_time?: string | null
        }
        Relationships: []
      }
      tb_office_departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          office_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          office_code?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          office_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_office_departments_office_code_fkey"
            columns: ["office_code"]
            isOneToOne: false
            referencedRelation: "tb_office"
            referencedColumns: ["code"]
          },
        ]
      }
      tb_penalty: {
        Row: {
          created_by: string
          created_date: string
          description: string | null
          effective_end_date: string | null
          effective_start_date: string
          id: number
          is_active: boolean
          modified_by: string | null
          modified_date: string | null
          month_number: number
          penalty_percentage: number
          penalty_type: string
        }
        Insert: {
          created_by?: string
          created_date?: string
          description?: string | null
          effective_end_date?: string | null
          effective_start_date: string
          id?: number
          is_active?: boolean
          modified_by?: string | null
          modified_date?: string | null
          month_number: number
          penalty_percentage: number
          penalty_type: string
        }
        Update: {
          created_by?: string
          created_date?: string
          description?: string | null
          effective_end_date?: string | null
          effective_start_date?: string
          id?: number
          is_active?: boolean
          modified_by?: string | null
          modified_date?: string | null
          month_number?: number
          penalty_percentage?: number
          penalty_type?: string
        }
        Relationships: []
      }
      tb_postal_district: {
        Row: {
          code: string
          description: string | null
        }
        Insert: {
          code: string
          description?: string | null
        }
        Update: {
          code?: string
          description?: string | null
        }
        Relationships: []
      }
      tb_relation: {
        Row: {
          code: string
          description: string
          surv_type: string | null
        }
        Insert: {
          code: string
          description: string
          surv_type?: string | null
        }
        Update: {
          code?: string
          description?: string
          surv_type?: string | null
        }
        Relationships: []
      }
      tb_sector: {
        Row: {
          code: string
          description: string | null
        }
        Insert: {
          code: string
          description?: string | null
        }
        Update: {
          code?: string
          description?: string | null
        }
        Relationships: []
      }
      tb_self_emp_contrib_rate: {
        Row: {
          effend: string
          effstart: string
          sep_penalty_percent: number | null
          sep_ss_percent: number
          wage_cat: number
        }
        Insert: {
          effend: string
          effstart: string
          sep_penalty_percent?: number | null
          sep_ss_percent: number
          wage_cat?: number
        }
        Update: {
          effend?: string
          effstart?: string
          sep_penalty_percent?: number | null
          sep_ss_percent?: number
          wage_cat?: number
        }
        Relationships: []
      }
      tb_ssc_rates: {
        Row: {
          created_by: string
          created_date: string
          description: string | null
          effective_end_date: string | null
          effective_start_date: string
          employee_pe_percentage: number
          employee_ss_percentage: number
          employer_ei_percentage: number
          employer_levy_percentage: number
          employer_ss_percentage: number
          id: number
          is_active: boolean
          modified_by: string | null
          modified_date: string | null
        }
        Insert: {
          created_by?: string
          created_date?: string
          description?: string | null
          effective_end_date?: string | null
          effective_start_date: string
          employee_pe_percentage?: number
          employee_ss_percentage?: number
          employer_ei_percentage?: number
          employer_levy_percentage?: number
          employer_ss_percentage?: number
          id?: number
          is_active?: boolean
          modified_by?: string | null
          modified_date?: string | null
        }
        Update: {
          created_by?: string
          created_date?: string
          description?: string | null
          effective_end_date?: string | null
          effective_start_date?: string
          employee_pe_percentage?: number
          employee_ss_percentage?: number
          employer_ei_percentage?: number
          employer_levy_percentage?: number
          employer_ss_percentage?: number
          id?: number
          is_active?: boolean
          modified_by?: string | null
          modified_date?: string | null
        }
        Relationships: []
      }
      tb_vc_contrib_rate: {
        Row: {
          created_at: string | null
          effend: string
          effstart: string
          id: string
          min_contrib_weeks: number | null
          submission_limit_nbr: number | null
          updated_at: string | null
          vc_contrib_pct: number | null
          vc_duration: number | null
        }
        Insert: {
          created_at?: string | null
          effend: string
          effstart: string
          id?: string
          min_contrib_weeks?: number | null
          submission_limit_nbr?: number | null
          updated_at?: string | null
          vc_contrib_pct?: number | null
          vc_duration?: number | null
        }
        Update: {
          created_at?: string | null
          effend?: string
          effstart?: string
          id?: string
          min_contrib_weeks?: number | null
          submission_limit_nbr?: number | null
          updated_at?: string | null
          vc_contrib_pct?: number | null
          vc_duration?: number | null
        }
        Relationships: []
      }
      tb_vc_eligibility_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          effend: string | null
          effstart: string
          id: string
          is_active: boolean
          max_age: number
          min_age: number
          min_contrib_weeks: number
          residency_grace_weeks: number
          termination_grace_weeks: number
          updated_at: string | null
          updated_by: string | null
          vc_contrib_pct: number
          vc_duration: number
          wage_history_months: number
          weeks_per_year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effend?: string | null
          effstart?: string
          id?: string
          is_active?: boolean
          max_age?: number
          min_age?: number
          min_contrib_weeks?: number
          residency_grace_weeks?: number
          termination_grace_weeks?: number
          updated_at?: string | null
          updated_by?: string | null
          vc_contrib_pct?: number
          vc_duration?: number
          wage_history_months?: number
          weeks_per_year?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effend?: string | null
          effstart?: string
          id?: string
          is_active?: boolean
          max_age?: number
          min_age?: number
          min_contrib_weeks?: number
          residency_grace_weeks?: number
          termination_grace_weeks?: number
          updated_at?: string | null
          updated_by?: string | null
          vc_contrib_pct?: number
          vc_duration?: number
          wage_history_months?: number
          weeks_per_year?: number
        }
        Relationships: []
      }
      tb_verify: {
        Row: {
          code: string
          description: string | null
        }
        Insert: {
          code: string
          description?: string | null
        }
        Update: {
          code?: string
          description?: string | null
        }
        Relationships: []
      }
      tb_villages: {
        Row: {
          code: string
          description: string | null
          postal_code: string | null
        }
        Insert: {
          code: string
          description?: string | null
          postal_code?: string | null
        }
        Update: {
          code?: string
          description?: string | null
          postal_code?: string | null
        }
        Relationships: []
      }
      tmp_ip_dependents: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          phone: string | null
          relation_type: string
          ssn: string | null
          status: string | null
          tmp_ip_id: string | null
          unique_uuid: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          relation_type: string
          ssn?: string | null
          status?: string | null
          tmp_ip_id?: string | null
          unique_uuid: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          relation_type?: string
          ssn?: string | null
          status?: string | null
          tmp_ip_id?: string | null
          unique_uuid?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmp_ip_dependents_tmp_ip_id_fkey"
            columns: ["tmp_ip_id"]
            isOneToOne: false
            referencedRelation: "tmp_ip_master"
            referencedColumns: ["id"]
          },
        ]
      }
      tmp_ip_master: {
        Row: {
          alias: string | null
          application_date: string | null
          application_id: string
          birth_doc_type: string | null
          birth_place: string | null
          citizenship: string | null
          created_at: string | null
          created_by: string | null
          date_married: string | null
          date_of_birth: string | null
          date_resident: string | null
          death_doc_type: string | null
          email: string | null
          eye_color: string | null
          first_name: string | null
          gender: string | null
          height_feet: number | null
          height_inches: number | null
          id: string
          last_name: string | null
          maiden_name: string | null
          mailing_address: string | null
          marital_doc_type: string | null
          marital_status: string | null
          middle_name: string | null
          mobile: string | null
          name_doc_type: string | null
          nationality: string | null
          npf_status: string | null
          occupation: string | null
          place_of_residence: string | null
          postal_district: string | null
          resident_address_1: string | null
          resident_address_2: string | null
          signature_on_file: string | null
          ssn: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          suffix: string | null
          telephone: string | null
          title: string | null
          unique_uuid: string
          updated_at: string | null
          updated_by: string | null
          work_permit_expiry: string | null
          work_permit_status: string | null
        }
        Insert: {
          alias?: string | null
          application_date?: string | null
          application_id: string
          birth_doc_type?: string | null
          birth_place?: string | null
          citizenship?: string | null
          created_at?: string | null
          created_by?: string | null
          date_married?: string | null
          date_of_birth?: string | null
          date_resident?: string | null
          death_doc_type?: string | null
          email?: string | null
          eye_color?: string | null
          first_name?: string | null
          gender?: string | null
          height_feet?: number | null
          height_inches?: number | null
          id?: string
          last_name?: string | null
          maiden_name?: string | null
          mailing_address?: string | null
          marital_doc_type?: string | null
          marital_status?: string | null
          middle_name?: string | null
          mobile?: string | null
          name_doc_type?: string | null
          nationality?: string | null
          npf_status?: string | null
          occupation?: string | null
          place_of_residence?: string | null
          postal_district?: string | null
          resident_address_1?: string | null
          resident_address_2?: string | null
          signature_on_file?: string | null
          ssn?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          suffix?: string | null
          telephone?: string | null
          title?: string | null
          unique_uuid?: string
          updated_at?: string | null
          updated_by?: string | null
          work_permit_expiry?: string | null
          work_permit_status?: string | null
        }
        Update: {
          alias?: string | null
          application_date?: string | null
          application_id?: string
          birth_doc_type?: string | null
          birth_place?: string | null
          citizenship?: string | null
          created_at?: string | null
          created_by?: string | null
          date_married?: string | null
          date_of_birth?: string | null
          date_resident?: string | null
          death_doc_type?: string | null
          email?: string | null
          eye_color?: string | null
          first_name?: string | null
          gender?: string | null
          height_feet?: number | null
          height_inches?: number | null
          id?: string
          last_name?: string | null
          maiden_name?: string | null
          mailing_address?: string | null
          marital_doc_type?: string | null
          marital_status?: string | null
          middle_name?: string | null
          mobile?: string | null
          name_doc_type?: string | null
          nationality?: string | null
          npf_status?: string | null
          occupation?: string | null
          place_of_residence?: string | null
          postal_district?: string | null
          resident_address_1?: string | null
          resident_address_2?: string | null
          signature_on_file?: string | null
          ssn?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          suffix?: string | null
          telephone?: string | null
          title?: string | null
          unique_uuid?: string
          updated_at?: string | null
          updated_by?: string | null
          work_permit_expiry?: string | null
          work_permit_status?: string | null
        }
        Relationships: []
      }
      tmp_ip_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          note_content: string
          note_type: string | null
          tmp_ip_id: string | null
          unique_uuid: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_content: string
          note_type?: string | null
          tmp_ip_id?: string | null
          unique_uuid: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_content?: string
          note_type?: string | null
          tmp_ip_id?: string | null
          unique_uuid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmp_ip_notes_tmp_ip_id_fkey"
            columns: ["tmp_ip_id"]
            isOneToOne: false
            referencedRelation: "tmp_ip_master"
            referencedColumns: ["id"]
          },
        ]
      }
      unauthorized_access_logs: {
        Row: {
          environment: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          module_name: string | null
          reason: string
          route_attempted: string
          severity: string
          timestamp: string
          user_agent: string | null
          user_code: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          environment?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module_name?: string | null
          reason: string
          route_attempted: string
          severity?: string
          timestamp?: string
          user_agent?: string | null
          user_code?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          environment?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module_name?: string | null
          reason?: string
          route_attempted?: string
          severity?: string
          timestamp?: string
          user_agent?: string | null
          user_code?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_data_overrides: {
        Row: {
          condition_sql: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          field_name: string | null
          id: string
          is_active: boolean
          module_id: string | null
          override_type: string
          reason: string | null
          record_ids: string[] | null
          target_table: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          condition_sql?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          field_name?: string | null
          id?: string
          is_active?: boolean
          module_id?: string | null
          override_type: string
          reason?: string | null
          record_ids?: string[] | null
          target_table: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          condition_sql?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          field_name?: string | null
          id?: string
          is_active?: boolean
          module_id?: string | null
          override_type?: string
          reason?: string | null
          record_ids?: string[] | null
          target_table?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_data_overrides_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          is_enabled: boolean | null
          notification_type: string | null
          preferred_channel: string | null
          push_enabled: boolean | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          is_enabled?: boolean | null
          notification_type?: string | null
          preferred_channel?: string | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          is_enabled?: boolean | null
          notification_type?: string | null
          preferred_channel?: string | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          action_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_granted: boolean
          module_id: string
          override_reason: string | null
          user_id: string
        }
        Insert: {
          action_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_granted: boolean
          module_id: string
          override_reason?: string | null
          user_id: string
        }
        Update: {
          action_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_granted?: boolean
          module_id?: string
          override_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "module_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workflow_action_configurations: {
        Row: {
          action_id: string | null
          action_type_id: string
          api_config_id: string | null
          created_at: string | null
          created_by: string | null
          custom_config: Json | null
          id: string
          is_active: boolean | null
          meeting_type: Database["public"]["Enums"]["meeting_type"] | null
          notify_assigned_person: boolean | null
          requires_api_integration: boolean | null
          step_id: string
          updated_at: string | null
          updated_by: string | null
          workflow_id: string
        }
        Insert: {
          action_id?: string | null
          action_type_id: string
          api_config_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_config?: Json | null
          id?: string
          is_active?: boolean | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"] | null
          notify_assigned_person?: boolean | null
          requires_api_integration?: boolean | null
          step_id: string
          updated_at?: string | null
          updated_by?: string | null
          workflow_id: string
        }
        Update: {
          action_id?: string | null
          action_type_id?: string
          api_config_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_config?: Json | null
          id?: string
          is_active?: boolean | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"] | null
          notify_assigned_person?: boolean | null
          requires_api_integration?: boolean | null
          step_id?: string
          updated_at?: string | null
          updated_by?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_api_config"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_configurations_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_configurations_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "workflow_action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_configurations_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_configurations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_action_field_updates: {
        Row: {
          action_id: string
          created_at: string
          created_by: string | null
          display_order: number | null
          field_name: string
          field_value: string
          id: string
          updated_at: string
        }
        Insert: {
          action_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          field_name: string
          field_value: string
          id?: string
          updated_at?: string
        }
        Update: {
          action_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          field_name?: string
          field_value?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_action_field_updates_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_action_notifications: {
        Row: {
          action_id: string
          created_at: string | null
          id: string
          notification_type: string
          template_id: string | null
        }
        Insert: {
          action_id: string
          created_at?: string | null
          id?: string
          notification_type: string
          template_id?: string | null
        }
        Update: {
          action_id?: string
          created_at?: string | null
          id?: string
          notification_type?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_action_notifications_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_action_outcomes: {
        Row: {
          action_config_id: string
          api_config_id: string | null
          button_variant: string | null
          created_at: string | null
          created_by: string | null
          creates_new_request: boolean | null
          description: string | null
          display_order: number | null
          end_state: Database["public"]["Enums"]["workflow_end_state"] | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          new_request_module: string | null
          next_step_id: string | null
          next_step_type: string
          outcome_code: Database["public"]["Enums"]["meeting_outcome"]
          outcome_label: string
          requires_remarks: boolean | null
          triggers_api: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action_config_id: string
          api_config_id?: string | null
          button_variant?: string | null
          created_at?: string | null
          created_by?: string | null
          creates_new_request?: boolean | null
          description?: string | null
          display_order?: number | null
          end_state?: Database["public"]["Enums"]["workflow_end_state"] | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          new_request_module?: string | null
          next_step_id?: string | null
          next_step_type?: string
          outcome_code: Database["public"]["Enums"]["meeting_outcome"]
          outcome_label: string
          requires_remarks?: boolean | null
          triggers_api?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action_config_id?: string
          api_config_id?: string | null
          button_variant?: string | null
          created_at?: string | null
          created_by?: string | null
          creates_new_request?: boolean | null
          description?: string | null
          display_order?: number | null
          end_state?: Database["public"]["Enums"]["workflow_end_state"] | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          new_request_module?: string | null
          next_step_id?: string | null
          next_step_type?: string
          outcome_code?: Database["public"]["Enums"]["meeting_outcome"]
          outcome_label?: string
          requires_remarks?: boolean | null
          triggers_api?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_action_outcomes_action_config_id_fkey"
            columns: ["action_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_action_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_outcomes_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_outcomes_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_action_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_defined: boolean | null
          pauses_workflow: boolean | null
          requires_api_integration: boolean | null
          requires_form: boolean | null
          type_code: string
          type_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_defined?: boolean | null
          pauses_workflow?: boolean | null
          requires_api_integration?: boolean | null
          requires_form?: boolean | null
          type_code: string
          type_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_defined?: boolean | null
          pauses_workflow?: boolean | null
          requires_api_integration?: boolean | null
          requires_form?: boolean | null
          type_code?: string
          type_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      workflow_api_configurations: {
        Row: {
          body_template: Json | null
          config_name: string
          created_at: string | null
          created_by: string | null
          description: string | null
          endpoint_url: string
          headers_template: Json | null
          http_method: string
          id: string
          is_active: boolean | null
          retry_count: number | null
          secret_name: string | null
          success_condition: Json | null
          timeout_seconds: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          body_template?: Json | null
          config_name: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url: string
          headers_template?: Json | null
          http_method?: string
          id?: string
          is_active?: boolean | null
          retry_count?: number | null
          secret_name?: string | null
          success_condition?: Json | null
          timeout_seconds?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          body_template?: Json | null
          config_name?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url?: string
          headers_template?: Json | null
          http_method?: string
          id?: string
          is_active?: boolean | null
          retry_count?: number | null
          secret_name?: string | null
          success_condition?: Json | null
          timeout_seconds?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      workflow_api_execution_log: {
        Row: {
          action_code: string
          api_config_id: string | null
          duration_ms: number | null
          endpoint_url: string
          error_message: string | null
          executed_at: string
          executed_by: string | null
          execution_status: string
          http_method: string
          http_status: number | null
          id: string
          request_payload: Json
          response_payload: Json | null
          retry_attempt: number
          task_id: string | null
          workflow_instance_id: string
          workflow_step_id: string | null
        }
        Insert: {
          action_code: string
          api_config_id?: string | null
          duration_ms?: number | null
          endpoint_url: string
          error_message?: string | null
          executed_at?: string
          executed_by?: string | null
          execution_status: string
          http_method: string
          http_status?: number | null
          id?: string
          request_payload: Json
          response_payload?: Json | null
          retry_attempt?: number
          task_id?: string | null
          workflow_instance_id: string
          workflow_step_id?: string | null
        }
        Update: {
          action_code?: string
          api_config_id?: string | null
          duration_ms?: number | null
          endpoint_url?: string
          error_message?: string | null
          executed_at?: string
          executed_by?: string | null
          execution_status?: string
          http_method?: string
          http_status?: number | null
          id?: string
          request_payload?: Json
          response_payload?: Json | null
          retry_attempt?: number
          task_id?: string | null
          workflow_instance_id?: string
          workflow_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_api_execution_log_api_config_id_fkey"
            columns: ["api_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_action_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_api_execution_log_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_sla_hours: number | null
          description: string | null
          id: string
          is_active: boolean | null
          maker_checker_enabled: boolean
          name: string
          process_type: string
          secured_module_id: string | null
          secured_table: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_sla_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          maker_checker_enabled?: boolean
          name: string
          process_type: string
          secured_module_id?: string | null
          secured_table?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_sla_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          maker_checker_enabled?: boolean
          name?: string
          process_type?: string
          secured_module_id?: string | null
          secured_table?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definitions_secured_module_id_fkey"
            columns: ["secured_module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_logs: {
        Row: {
          api_name: string | null
          application_id: string | null
          correlation_id: string | null
          created_at: string
          current_step: string | null
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          module: string | null
          payload_json: Json | null
          session_id: string | null
          severity: string | null
          status: string | null
          step_history: Json | null
          step_number: number | null
          timestamp: string
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          api_name?: string | null
          application_id?: string | null
          correlation_id?: string | null
          created_at?: string
          current_step?: string | null
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          step_history?: Json | null
          step_number?: number | null
          timestamp?: string
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          api_name?: string | null
          application_id?: string | null
          correlation_id?: string | null
          created_at?: string
          current_step?: string | null
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          payload_json?: Json | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          step_history?: Json | null
          step_number?: number | null
          timestamp?: string
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      workflow_instances: {
        Row: {
          business_key_column: string | null
          business_key_value: string | null
          completed_at: string | null
          current_step_id: string | null
          due_at: string | null
          id: string
          metadata: Json | null
          primary_key_column: string | null
          primary_key_value: string | null
          primary_table: string | null
          source_module: string | null
          source_record_id: string | null
          source_record_name: string | null
          started_at: string | null
          started_by: string | null
          started_by_name: string | null
          status: Database["public"]["Enums"]["workflow_instance_status"] | null
          workflow_id: string
          workflow_name: string
        }
        Insert: {
          business_key_column?: string | null
          business_key_value?: string | null
          completed_at?: string | null
          current_step_id?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          primary_key_column?: string | null
          primary_key_value?: string | null
          primary_table?: string | null
          source_module?: string | null
          source_record_id?: string | null
          source_record_name?: string | null
          started_at?: string | null
          started_by?: string | null
          started_by_name?: string | null
          status?:
            | Database["public"]["Enums"]["workflow_instance_status"]
            | null
          workflow_id: string
          workflow_name: string
        }
        Update: {
          business_key_column?: string | null
          business_key_value?: string | null
          completed_at?: string | null
          current_step_id?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          primary_key_column?: string | null
          primary_key_value?: string | null
          primary_table?: string | null
          source_module?: string | null
          source_record_id?: string | null
          source_record_name?: string | null
          started_at?: string | null
          started_by?: string | null
          started_by_name?: string | null
          status?:
            | Database["public"]["Enums"]["workflow_instance_status"]
            | null
          workflow_id?: string
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_logs: {
        Row: {
          action: string
          comments: string | null
          created_at: string | null
          id: string
          instance_id: string
          metadata: Json | null
          new_status: string | null
          old_status: string | null
          step_id: string | null
          step_name: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          comments?: string | null
          created_at?: string | null
          id?: string
          instance_id: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          step_id?: string | null
          step_name?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          step_id?: string | null
          step_name?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_meeting_departments: {
        Row: {
          action_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string
          id: string
          office_code: string
          step_id: string
          workflow_id: string
        }
        Insert: {
          action_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id: string
          id?: string
          office_code: string
          step_id: string
          workflow_id: string
        }
        Update: {
          action_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string
          id?: string
          office_code?: string
          step_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_meeting_departments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_meeting_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "tb_office_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_meeting_departments_office_code_fkey"
            columns: ["office_code"]
            isOneToOne: false
            referencedRelation: "tb_office"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "workflow_meeting_departments_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_meeting_departments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_security_audit_log: {
        Row: {
          access_granted: boolean
          action: string
          created_at: string
          denial_reason: string | null
          fields_edited: string[] | null
          fields_viewed: string[] | null
          id: string
          ip_address: string | null
          record_id: string | null
          record_table: string | null
          rules_applied: Json | null
          user_agent: string | null
          user_id: string | null
          user_name: string | null
          workflow_definition_id: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          access_granted?: boolean
          action: string
          created_at?: string
          denial_reason?: string | null
          fields_edited?: string[] | null
          fields_viewed?: string[] | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          record_table?: string | null
          rules_applied?: Json | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
          workflow_definition_id?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          access_granted?: boolean
          action?: string
          created_at?: string
          denial_reason?: string | null
          fields_edited?: string[] | null
          fields_viewed?: string[] | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          record_table?: string | null
          rules_applied?: Json | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
          workflow_definition_id?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_security_audit_log_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_security_audit_log_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_action_api: {
        Row: {
          action_code: string
          api_key_secret_name: string
          content_type: string
          created_at: string
          created_by: string
          description: string | null
          endpoint_url: string
          http_method: string
          id: string
          is_active: boolean
          retry_count: number
          timeout_seconds: number
          updated_at: string
          updated_by: string | null
          workflow_id: string
          workflow_step_id: string
        }
        Insert: {
          action_code: string
          api_key_secret_name: string
          content_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          endpoint_url: string
          http_method: string
          id?: string
          is_active?: boolean
          retry_count?: number
          timeout_seconds?: number
          updated_at?: string
          updated_by?: string | null
          workflow_id: string
          workflow_step_id: string
        }
        Update: {
          action_code?: string
          api_key_secret_name?: string
          content_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          endpoint_url?: string
          http_method?: string
          id?: string
          is_active?: boolean
          retry_count?: number
          timeout_seconds?: number
          updated_at?: string
          updated_by?: string | null
          workflow_id?: string
          workflow_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_action_api_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_action_api_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_action_api_body: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_required: boolean
          json_field_name: string
          source_key: string
          static_value: string | null
          value_source: string
          workflow_action_api_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          json_field_name: string
          source_key: string
          static_value?: string | null
          value_source: string
          workflow_action_api_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          json_field_name?: string
          source_key?: string
          static_value?: string | null
          value_source?: string
          workflow_action_api_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_action_api_body_workflow_action_api_id_fkey"
            columns: ["workflow_action_api_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_action_api"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_actions: {
        Row: {
          action_name: string
          action_type: Database["public"]["Enums"]["workflow_step_action_type"]
          created_at: string | null
          display_order: number | null
          end_state: Database["public"]["Enums"]["workflow_end_state"] | null
          id: string
          is_final_action: boolean | null
          next_step_id: string | null
          next_step_type: Database["public"]["Enums"]["next_step_type"] | null
          notification_module_id: string | null
          notification_template_id: string | null
          notification_type: string | null
          remarks_required: boolean
          result_status: string | null
          step_id: string
        }
        Insert: {
          action_name: string
          action_type?: Database["public"]["Enums"]["workflow_step_action_type"]
          created_at?: string | null
          display_order?: number | null
          end_state?: Database["public"]["Enums"]["workflow_end_state"] | null
          id?: string
          is_final_action?: boolean | null
          next_step_id?: string | null
          next_step_type?: Database["public"]["Enums"]["next_step_type"] | null
          notification_module_id?: string | null
          notification_template_id?: string | null
          notification_type?: string | null
          remarks_required?: boolean
          result_status?: string | null
          step_id: string
        }
        Update: {
          action_name?: string
          action_type?: Database["public"]["Enums"]["workflow_step_action_type"]
          created_at?: string | null
          display_order?: number | null
          end_state?: Database["public"]["Enums"]["workflow_end_state"] | null
          id?: string
          is_final_action?: boolean | null
          next_step_id?: string | null
          next_step_type?: Database["public"]["Enums"]["next_step_type"] | null
          notification_module_id?: string | null
          notification_template_id?: string | null
          notification_type?: string | null
          remarks_required?: boolean
          result_status?: string | null
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_actions_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_actions_notification_module_id_fkey"
            columns: ["notification_module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_actions_notification_template_id_fkey"
            columns: ["notification_template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_actions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          action_type: string
          approver_designation_ids: string[] | null
          approver_role_ids: string[] | null
          approver_type: string | null
          approver_user_ids: string[] | null
          assigned_designation: string | null
          assigned_role: string | null
          auto_approve_on_timeout: boolean | null
          condition_expression: Json | null
          created_at: string | null
          description: string | null
          escalation_enabled: boolean | null
          escalation_module_id: string | null
          escalation_notification_type: string | null
          escalation_template_id: string | null
          has_condition: boolean | null
          id: string
          is_final_step: boolean | null
          parallel_approval: boolean | null
          required_approvals: number | null
          sla_hours: number | null
          step_name: string
          step_number: number
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          action_type?: string
          approver_designation_ids?: string[] | null
          approver_role_ids?: string[] | null
          approver_type?: string | null
          approver_user_ids?: string[] | null
          assigned_designation?: string | null
          assigned_role?: string | null
          auto_approve_on_timeout?: boolean | null
          condition_expression?: Json | null
          created_at?: string | null
          description?: string | null
          escalation_enabled?: boolean | null
          escalation_module_id?: string | null
          escalation_notification_type?: string | null
          escalation_template_id?: string | null
          has_condition?: boolean | null
          id?: string
          is_final_step?: boolean | null
          parallel_approval?: boolean | null
          required_approvals?: number | null
          sla_hours?: number | null
          step_name: string
          step_number: number
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          action_type?: string
          approver_designation_ids?: string[] | null
          approver_role_ids?: string[] | null
          approver_type?: string | null
          approver_user_ids?: string[] | null
          assigned_designation?: string | null
          assigned_role?: string | null
          auto_approve_on_timeout?: boolean | null
          condition_expression?: Json | null
          created_at?: string | null
          description?: string | null
          escalation_enabled?: boolean | null
          escalation_module_id?: string | null
          escalation_notification_type?: string | null
          escalation_template_id?: string | null
          has_condition?: boolean | null
          id?: string
          is_final_step?: boolean | null
          parallel_approval?: boolean | null
          required_approvals?: number | null
          sla_hours?: number | null
          step_name?: string
          step_number?: number
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_escalation_module_id_fkey"
            columns: ["escalation_module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_escalation_template_id_fkey"
            columns: ["escalation_template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          action_taken: string | null
          assigned_designation: string | null
          assigned_role: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          comments: string | null
          completed_at: string | null
          created_at: string | null
          due_at: string | null
          id: string
          instance_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_task_status"] | null
          step_id: string
          step_name: string
        }
        Insert: {
          action_taken?: string | null
          assigned_designation?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          comments?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          instance_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_task_status"] | null
          step_id: string
          step_name: string
        }
        Update: {
          action_taken?: string | null
          assigned_designation?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          comments?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          instance_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_task_status"] | null
          step_id?: string
          step_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          action_name: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          module_id: string | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          action_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          action_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_triggers_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_sep_activity: {
        Args: {
          p_activity_type: string
          p_date_commenced: string
          p_entered_by?: string
          p_occupation_code?: string
          p_office_code?: string
          p_sector_code?: string
          p_self_ref_no: string
          p_ssn: string
        }
        Returns: string
      }
      apply_pending_holiday_pay: {
        Args: { p_applied_by?: string; p_pending_ids: string[] }
        Returns: undefined
      }
      apply_qa_change_request: {
        Args: {
          p_notes?: string
          p_request_id: string
          p_reviewer_code: string
          p_reviewer_id: string
        }
        Returns: Json
      }
      apply_workflow_field_updates: {
        Args: {
          p_action_id: string
          p_instance_id: string
          p_user_id?: string
          p_user_name?: string
        }
        Returns: Json
      }
      calculate_c3_contributions: {
        Args: {
          p_employee_data: Json
          p_period_month: number
          p_period_year: number
          p_received_date: string
        }
        Returns: Json
      }
      calculate_c3_contributions_with_other_payments: {
        Args: {
          p_employee_data: Json
          p_period_month: number
          p_period_year: number
          p_received_date: string
        }
        Returns: Json
      }
      calculate_other_payment_components: {
        Args: {
          p_amount: number
          p_income_code_id: string
          p_period_month: number
          p_period_year: number
        }
        Returns: Json
      }
      calculate_vc_avg_weekly_wage: {
        Args: { p_date_registered: string; p_ssn: string }
        Returns: Json
      }
      can_access_module: {
        Args: { _module_name: string; _user_id: string }
        Returns: boolean
      }
      cease_voluntary_contributor: {
        Args: { p_reason?: string; p_ssn: string }
        Returns: Json
      }
      change_ip_status: {
        Args: {
          p_current_status: string
          p_new_status: string
          p_unique_uuid: string
          p_user_code?: string
          p_user_id?: string
        }
        Returns: Json
      }
      change_sep_status: {
        Args: {
          p_new_status: string
          p_self_ref_no: string
          p_ssn: string
          p_userid?: string
        }
        Returns: undefined
      }
      check_and_log_unauthorized_access: {
        Args: {
          _ip_address: string
          _module_name?: string
          _reason?: string
          _route: string
          _severity?: string
          _user_agent?: string
          _user_email?: string
          _user_id?: string
        }
        Returns: Json
      }
      check_dms_transfer_eligibility: { Args: { p_ssn: string }; Returns: Json }
      check_ip_duplicates: {
        Args: {
          p_dob: string
          p_exclude_uuid?: string
          p_first_name: string
          p_gender: string
          p_last_name: string
        }
        Returns: {
          date_of_birth: string
          full_name: string
          gender: string
          id: string
          match_score: number
          ssn: string
        }[]
      }
      check_meeting_overlap: {
        Args: {
          p_assigned_user_id: string
          p_buffer_minutes?: number
          p_exclude_meeting_id?: string
          p_meeting_date: string
          p_meeting_start_time: string
        }
        Returns: {
          conflicting_meeting_id: string
          conflicting_reference: string
          conflicting_start_time: string
          has_overlap: boolean
        }[]
      }
      check_row_access: {
        Args: {
          _action: string
          _module_name: string
          _record?: Json
          _table_name: string
          _user_id: string
        }
        Returns: Json
      }
      check_sep_eligibility: { Args: { p_ssn: string }; Returns: Json }
      check_vc_eligibility: { Args: { p_ssn: string }; Returns: Json }
      check_workflow_task_access: {
        Args: {
          _action?: string
          _user_id: string
          _workflow_instance_id: string
        }
        Returns: Json
      }
      clone_c3_config: {
        Args: {
          p_description?: string
          p_new_end_date?: string
          p_new_start_date: string
          p_source_period_id: string
          p_user_code?: string
        }
        Returns: string
      }
      clone_role: {
        Args: { new_role_name: string; source_role_id: string }
        Returns: string
      }
      clone_workflow: {
        Args: { p_new_name?: string; p_source_workflow_id: string }
        Returns: string
      }
      convert_application_atomic: {
        Args: {
          p_alias: string
          p_application_date: string
          p_application_id: string
          p_application_ref_number: string
          p_ben_addr1: string
          p_ben_addr2: string
          p_beneficiary: string
          p_birth_place: string
          p_citizenship_flag: string
          p_contact: string
          p_contact_addr1: string
          p_contact_addr2: string
          p_contact_email: string
          p_contact_mobile: string
          p_contact_phone: string
          p_contact_relation: string
          p_created_by: string
          p_date_married: string
          p_date_of_residency: string
          p_date_witnessed: string
          p_dependants?: Json
          p_district: string
          p_dob: string
          p_documents?: Json
          p_email_addr: string
          p_employer_address: string
          p_employer_name: string
          p_employer_phone: string
          p_employer_town: string
          p_entered_by: string
          p_eyecolor: string
          p_father_name: string
          p_firstname: string
          p_heightfeet: number
          p_heightinches: number
          p_ip_signature: string
          p_mail_addr1: string
          p_mail_addr2: string
          p_marital_status: string
          p_middle_name: string
          p_mother_name: string
          p_name_prefix: string
          p_name_suffix: string
          p_nationality: string
          p_npf: string
          p_phone: string
          p_phone_mobile: string
          p_photo_location: string
          p_place_of_residence: string
          p_previous_name: string
          p_primary_occup: string
          p_remarks: string
          p_resident_addr1: string
          p_resident_addr2: string
          p_second_middle_name: string
          p_sex: string
          p_spouse_addr1: string
          p_spouse_addr2: string
          p_spouse_dob: string
          p_spouse_name: string
          p_spouse_ssn: string
          p_surname: string
          p_temp_ssn: string
          p_unique_uuid: string
          p_witness_name: string
          p_work_permit: string
          p_work_permit_expiration: string
        }
        Returns: Json
      }
      convert_application_to_ip: {
        Args: {
          p_address_line1?: string
          p_address_line2?: string
          p_alias?: string
          p_application_date?: string
          p_approved_by?: string
          p_ben_addr1?: string
          p_ben_addr2?: string
          p_beneficiary_name?: string
          p_birth_place?: string
          p_citizenship?: string
          p_contact_addr1?: string
          p_contact_addr2?: string
          p_contact_email?: string
          p_contact_mobile?: string
          p_contact_name?: string
          p_contact_phone?: string
          p_contact_relation?: string
          p_date_married?: string
          p_date_of_birth?: string
          p_date_of_residency?: string
          p_dependants?: Json
          p_email?: string
          p_employer_address?: string
          p_employer_name?: string
          p_employer_phone?: string
          p_employer_town?: string
          p_eye_color?: string
          p_father_name?: string
          p_first_name?: string
          p_gender?: string
          p_has_work_permit?: string
          p_height_feet?: number
          p_height_inches?: number
          p_last_name?: string
          p_maiden_name?: string
          p_mailing_addr1?: string
          p_mailing_addr2?: string
          p_marital_status?: string
          p_middle_name?: string
          p_mother_name?: string
          p_nationality?: string
          p_npf?: string
          p_occupation?: string
          p_phone?: string
          p_phone_mobile?: string
          p_photo_url?: string
          p_postal_district?: string
          p_reference_number: string
          p_remarks?: string
          p_second_middle_name?: string
          p_source_route?: string
          p_spouse_addr1?: string
          p_spouse_addr2?: string
          p_spouse_dob?: string
          p_spouse_name?: string
          p_spouse_ssn?: string
          p_submitted_at?: string
          p_submitted_by?: string
          p_suffix?: string
          p_title?: string
          p_witness_date?: string
          p_witness_name?: string
          p_work_permit_expiry?: string
        }
        Returns: Json
      }
      create_pending_holiday_pay: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_holiday_date_from?: string
          p_holiday_date_to?: string
          p_source_c3_period: string
          p_ssn: string
          p_target_month: number
          p_target_year: number
        }
        Returns: string
      }
      evaluate_levy_amounts: {
        Args: {
          p_amounts: number[]
          p_pay_period_code: string
          p_slab_id: string
        }
        Returns: number
      }
      find_eligible_approver: {
        Args: {
          _exclude_users?: string[]
          _step_id: string
          _workflow_instance_id: string
        }
        Returns: {
          access_details: Json
          has_data_access: boolean
          user_id: string
          user_name: string
        }[]
      }
      generate_application_id: { Args: never; Returns: string }
      generate_depend_id: { Args: { p_ssn: string }; Returns: string }
      generate_er_regno: { Args: never; Returns: string }
      generate_ip_ssn: { Args: never; Returns: string }
      generate_meeting_reference: { Args: never; Returns: string }
      generate_sref: {
        Args: {
          p_activity_type: string
          p_date_commenced: string
          p_entered_by?: string
          p_occupation_code?: string
          p_office_code?: string
          p_sector_code?: string
          p_ssn: string
        }
        Returns: string
      }
      generate_temp_er_regno: { Args: never; Returns: string }
      generate_temp_ssn: { Args: never; Returns: string }
      generate_user_code: {
        Args: { p_first_name: string; p_last_name: string }
        Returns: string
      }
      get_all_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_app_security_state: { Args: never; Returns: Json }
      get_biweekly_enabled_weeks: {
        Args: { p_month: number; p_year: number }
        Returns: boolean[]
      }
      get_biweekly_valid_weeks: {
        Args: { p_year: number }
        Returns: {
          week_end: string
          week_number: number
          week_start: string
        }[]
      }
      get_c3_config_for_period: {
        Args: { p_period_date: string }
        Returns: {
          config_period_id: string
          employee_ss_max_wage: number
          employee_ss_rate: number
          employer_eib_max_wage: number
          employer_eib_rate: number
          employer_levy_rate: number
          employer_severance_rate: number
          employer_ss_max_wage: number
          employer_ss_rate: number
          end_date: string
          levy_monthly_threshold: number
          levy_penalty_initial_rate: number
          levy_penalty_subsequent_rate: number
          levy_slab_id: string
          levy_use_monthly_when_exceeded: boolean
          max_age_levy: number
          max_age_ss: number
          min_age_levy: number
          min_age_ss: number
          severance_penalty_initial_rate: number
          severance_penalty_subsequent_rate: number
          ss_fine_initial_rate: number
          ss_fine_subsequent_rate: number
          start_date: string
          submission_due_day: number
        }[]
      }
      get_c3_filing_config: {
        Args: never
        Returns: {
          config_key: string
          config_type: string
          config_value: number
          description: string
          display_name: string
        }[]
      }
      get_c3_records_filtered: {
        Args: {
          p_date_entered?: string
          p_date_received?: string
          p_entered_by?: string
          p_exclude_deleted?: boolean
          p_page?: number
          p_page_size?: number
          p_payer_id?: string
          p_payer_type?: string
          p_period_month?: number
          p_period_year?: number
          p_schedule_no?: number
          p_status?: string
          p_verified_by?: string
        }
        Returns: Json
      }
      get_income_code_policy_for_period: {
        Args: {
          p_income_code_id: string
          p_period_month: number
          p_period_year: number
        }
        Returns: Json
      }
      get_ip_status_transitions: {
        Args: { p_current_status: string }
        Returns: Json
      }
      get_module_tables: {
        Args: { _module_id: string }
        Returns: {
          display_name: string
          table_name: string
        }[]
      }
      get_next_c3_schedule_no: {
        Args: { p_payer_id: string; p_payer_type: string; p_period: string }
        Returns: number
      }
      get_pending_holiday_pay: {
        Args: { p_ssn: string; p_target_month: number; p_target_year: number }
        Returns: Json
      }
      get_sep_audit_history: {
        Args: { p_self_ref_no: string; p_ssn: string }
        Returns: {
          action: string
          activity_seq_no: string
          activity_type: string
          audit_id: number
          date_ceased: string
          date_commenced: string
          modified_date: string
          modifier: string
          status: string
        }[]
      }
      get_sep_contribution_rate: {
        Args: { p_period: string; p_wage_category: number }
        Returns: {
          sep_penalty_percent: number
          sep_ss_percent: number
        }[]
      }
      get_sep_contribution_summary: {
        Args: { p_ssn: string }
        Returns: {
          earliest_period: string
          latest_period: string
          total_contributions: number
          total_ss_amount: number
        }[]
      }
      get_sep_weeks_paid: {
        Args: { p_payer_id: string; p_ssn: string }
        Returns: {
          paid_code1: string | null
          paid_code2: string | null
          paid_code3: string | null
          paid_code4: string | null
          paid_code5: string | null
          paid_code6: string | null
          pay_period: string | null
          payer_id: string
          payer_type: string
          period: string
          sep_ss_amt: number | null
          sequence_no: number
          ssn: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ip_self_weeks_paid"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_system_setting: { Args: { p_setting_key: string }; Returns: string }
      get_table_columns: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: boolean
        }[]
      }
      get_table_foreign_keys: {
        Args: never
        Returns: {
          constraint_name: string
          source_column: string
          source_table: string
          target_column: string
          target_table: string
        }[]
      }
      get_user_accessible_modules: {
        Args: { _user_id: string }
        Returns: {
          description: string
          display_name: string
          icon: string
          id: string
          name: string
          parent_id: string
          route: string
          sort_order: number
        }[]
      }
      get_user_meetings_for_date: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          application_reference: string
          id: string
          meeting_end_time: string
          meeting_reference: string
          meeting_time: string
          meeting_type: string
          status: string
        }[]
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          action_name: string
          is_granted: boolean
          module_name: string
        }[]
      }
      get_visible_fields: {
        Args: { _module_name: string; _table_name: string; _user_id: string }
        Returns: {
          can_edit: boolean
          can_view: boolean
          field_name: string
          masking_type: string
          rule_source: string
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _action_name: string; _module_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initiate_ip_registration_workflow: {
        Args: {
          p_record_name: string
          p_source_context?: string
          p_ssn: string
          p_unique_uuid: string
          p_user_code?: string
          p_user_id?: string
        }
        Returns: string
      }
      insert_ip_employer_if_not_consecutive_duplicate: {
        Args: {
          p_employer_id: string
          p_entered_by?: string
          p_occupation: string
          p_posting_status?: string
          p_source?: string
          p_ssn: string
          p_term_end_date?: string
          p_term_start_date?: string
        }
        Returns: Json
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_c3_ready_for_acceptance: {
        Args: { p_c3_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action_type: string
          _entity_id?: string
          _entity_type?: string
          _field_name?: string
          _metadata?: Json
          _module_name?: string
          _new_value?: string
          _old_value?: string
        }
        Returns: string
      }
      log_c3_config_change:
        | {
            Args: {
              p_action: string
              p_changed_by?: string
              p_changed_by_name?: string
              p_config_type: string
              p_entity_name: string
              p_field_name?: string
              p_metadata?: Json
              p_new_value?: string
              p_old_value?: string
              p_reason?: string
              p_record_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_changed_by?: string
              p_changed_by_name?: string
              p_config_type: string
              p_entity_name: string
              p_field_name?: string
              p_metadata?: string
              p_new_value?: string
              p_old_value?: string
              p_reason?: string
              p_record_id: string
            }
            Returns: string
          }
      log_workflow_security_event: {
        Args: {
          _access_granted?: boolean
          _action: string
          _denial_reason?: string
          _fields_edited?: string[]
          _fields_viewed?: string[]
          _record_id?: string
          _rules_applied?: Json
          _user_id: string
          _workflow_instance_id: string
        }
        Returns: string
      }
      process_meeting_outcome: {
        Args: {
          p_meeting_id: string
          p_new_date?: string
          p_new_time?: string
          p_outcome: Database["public"]["Enums"]["meeting_outcome"]
          p_remarks?: string
          p_user_id?: string
          p_user_name?: string
        }
        Returns: Json
      }
      process_ready_to_print_card: {
        Args: { p_unique_uuid: string }
        Returns: Json
      }
      register_voluntary_contributor: {
        Args: {
          p_date_commenced: string
          p_date_registered: string
          p_due_date: string
          p_payment_interval: string
          p_ssn: string
          p_user_code?: string
        }
        Returns: Json
      }
      reject_c3_record: {
        Args: { p_c3_id: string; p_reason?: string; p_user_id?: string }
        Returns: Json
      }
      reject_qa_change_request: {
        Args: {
          p_notes?: string
          p_request_id: string
          p_reviewer_code: string
          p_reviewer_id: string
        }
        Returns: Json
      }
      render_email_template: {
        Args: { p_template_id: string; p_variables?: Json }
        Returns: string
      }
      resolve_holiday_pay_policy: {
        Args: {
          p_month: number
          p_period_date: string
          p_policy_type: string
          p_year: number
        }
        Returns: Json
      }
      resolve_root_placeholders: {
        Args: { p_instance_id: string; p_template: string }
        Returns: string
      }
      schedule_meeting: {
        Args: {
          p_action_config_id: string
          p_application_reference: string
          p_contact_email?: string
          p_contact_person: string
          p_contact_phone?: string
          p_meeting_date: string
          p_meeting_time: string
          p_meeting_type: Database["public"]["Enums"]["meeting_type"]
          p_office_address?: string
          p_remarks?: string
          p_step_id: string
          p_user_id?: string
          p_user_name?: string
          p_workflow_id: string
          p_workflow_instance_id: string
        }
        Returns: Json
      }
      set_email_provider_default: {
        Args: { provider_id: string }
        Returns: undefined
      }
      submit_c3_record: {
        Args: { p_c3_id: string; p_user_id?: string }
        Returns: Json
      }
      submit_er_registration: {
        Args: { p_temp_regno: string; p_user_id?: string }
        Returns: Json
      }
      submit_ip_registration: { Args: { p_unique_uuid: string }; Returns: Json }
      test_data_policy: {
        Args: { _action: string; _module_name: string; _test_user_id: string }
        Returns: Json
      }
      test_workflow_policy: {
        Args: {
          _record_id?: string
          _test_user_id: string
          _workflow_id: string
        }
        Returns: Json
      }
      update_system_setting: {
        Args: {
          p_setting_key: string
          p_setting_value: string
          p_user_code?: string
        }
        Returns: boolean
      }
      validate_application_for_conversion: {
        Args: {
          p_address_line1?: string
          p_address_line2?: string
          p_alias?: string
          p_ben_addr1?: string
          p_ben_addr2?: string
          p_beneficiary_name?: string
          p_birth_place?: string
          p_contact_addr1?: string
          p_contact_addr2?: string
          p_contact_email?: string
          p_contact_mobile?: string
          p_contact_name?: string
          p_contact_phone?: string
          p_contact_relation?: string
          p_date_of_birth?: string
          p_dependants?: Json
          p_email?: string
          p_employer_address?: string
          p_employer_name?: string
          p_employer_phone?: string
          p_employer_town?: string
          p_eye_color?: string
          p_father_name?: string
          p_first_name?: string
          p_gender?: string
          p_last_name?: string
          p_maiden_name?: string
          p_mailing_addr1?: string
          p_mailing_addr2?: string
          p_marital_status?: string
          p_middle_name?: string
          p_mother_name?: string
          p_nationality?: string
          p_occupation?: string
          p_phone?: string
          p_phone_mobile?: string
          p_postal_district?: string
          p_reference_number?: string
          p_remarks?: string
          p_second_middle_name?: string
          p_spouse_addr1?: string
          p_spouse_addr2?: string
          p_spouse_dob?: string
          p_spouse_name?: string
          p_spouse_ssn?: string
          p_suffix?: string
          p_title?: string
          p_witness_name?: string
        }
        Returns: Json
      }
      validate_biweekly_week: {
        Args: { p_month: number; p_week_index: number; p_year: number }
        Returns: Json
      }
      validate_meeting_office_hours: {
        Args: {
          p_buffer_minutes?: number
          p_meeting_time: string
          p_office_code: string
        }
        Returns: {
          is_valid: boolean
          latest_allowed: string
          message: string
          office_end: string
          office_start: string
        }[]
      }
      verify_c3_record: {
        Args: { p_c3_id: string; p_user_id?: string }
        Returns: Json
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
        | "FinanceManager"
        | "IP Registration Officer"
      audit_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "escalated"
        | "closed"
      audit_type:
        | "random"
        | "complaint"
        | "referral"
        | "follow_up"
        | "scouting"
        | "investigation"
      bema_audit_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "escalated"
        | "closed"
      bema_audit_type:
        | "random"
        | "complaint"
        | "referral"
        | "follow_up"
        | "scouting"
        | "investigation"
      bema_c3_status:
        | "draft"
        | "submitted"
        | "validated"
        | "posted"
        | "rejected"
        | "query_raised"
      bema_category: "cat_a" | "cat_b" | "cat_c" | "cat_d" | "cat_e"
      bema_inspector_activity:
        | "inspection"
        | "audit"
        | "investigation"
        | "scouting"
        | "education"
        | "notice_service"
      bema_plan_status: "active" | "completed" | "broken" | "escalated"
      bema_registration_status:
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "inactive"
        | "suspended"
      bema_registration_type: "employer" | "self_employed" | "voluntary"
      bema_waiver_status: "pending" | "approved" | "rejected"
      c3_filing_status:
        | "draft"
        | "submitted"
        | "validated"
        | "posted"
        | "rejected"
        | "query_raised"
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
      compliance_registration_status:
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "inactive"
        | "suspended"
      compliance_registration_type: "employer" | "self_employed" | "voluntary"
      contribution_category: "cat_a" | "cat_b" | "cat_c" | "cat_d" | "cat_e"
      data_scope_condition_type:
        | "owner"
        | "department"
        | "office"
        | "created_by"
        | "custom_sql"
      document_type:
        | "Filings"
        | "Evidence"
        | "Notices"
        | "Orders"
        | "Correspondence"
        | "Internal"
      field_masking_type: "none" | "partial" | "full"
      inspector_activity_type:
        | "inspection"
        | "audit"
        | "investigation"
        | "scouting"
        | "education"
        | "notice_service"
      meeting_outcome:
        | "ClosedWithApproval"
        | "ClosedWithRejection"
        | "Reschedule"
        | "NextSchedule"
        | "Cancel"
      meeting_status:
        | "Scheduled"
        | "Rescheduled"
        | "InProgress"
        | "Closed"
        | "Cancelled"
        | "Rejected"
      meeting_type:
        | "IP-Registration"
        | "Employer-Registration"
        | "Doctor-Registration"
        | "General"
      next_step_type:
        | "next_step"
        | "specific_step"
        | "end_workflow"
        | "send_back_to_applicant"
        | "pause_workflow"
      notification_channel: "email" | "sms" | "push" | "in_app"
      notification_status:
        | "queued"
        | "sending"
        | "sent"
        | "failed"
        | "cancelled"
      order_status: "Draft" | "Under Review" | "Approved" | "Published"
      party_role:
        | "Primary Respondent"
        | "Complainant"
        | "Representative"
        | "Third Party"
      payment_plan_status: "active" | "completed" | "broken" | "escalated"
      penalty_status: "Pending" | "Paid" | "Overdue" | "Waived"
      priority_level: "Low" | "Medium" | "High" | "Urgent"
      qa_change_status: "pending" | "approved" | "rejected" | "withdrawn"
      service_status: "Not Served" | "Served" | "Service Failed"
      settlement_status: "Proposed" | "Accepted" | "Rejected" | "Completed"
      task_status: "Open" | "In Progress" | "Completed" | "Deferred"
      waiver_status: "pending" | "approved" | "rejected"
      workflow_end_state: "Approved" | "Rejected"
      workflow_instance_status:
        | "Pending"
        | "InProgress"
        | "Completed"
        | "Rejected"
        | "Cancelled"
        | "Escalated"
        | "Approved"
        | "Query"
        | "AwaitingMeeting"
      workflow_status: "Draft" | "Active" | "Disabled" | "Archived"
      workflow_step_action_type:
        | "Approve"
        | "Reject"
        | "SendBack"
        | "Escalate"
        | "AutoApprove"
        | "Review"
        | "Custom"
        | "ScheduleMeeting"
      workflow_task_status:
        | "Pending"
        | "InProgress"
        | "Completed"
        | "Skipped"
        | "Cancelled"
        | "Paused"
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
        "FinanceManager",
        "IP Registration Officer",
      ],
      audit_status: [
        "assigned",
        "in_progress",
        "completed",
        "escalated",
        "closed",
      ],
      audit_type: [
        "random",
        "complaint",
        "referral",
        "follow_up",
        "scouting",
        "investigation",
      ],
      bema_audit_status: [
        "assigned",
        "in_progress",
        "completed",
        "escalated",
        "closed",
      ],
      bema_audit_type: [
        "random",
        "complaint",
        "referral",
        "follow_up",
        "scouting",
        "investigation",
      ],
      bema_c3_status: [
        "draft",
        "submitted",
        "validated",
        "posted",
        "rejected",
        "query_raised",
      ],
      bema_category: ["cat_a", "cat_b", "cat_c", "cat_d", "cat_e"],
      bema_inspector_activity: [
        "inspection",
        "audit",
        "investigation",
        "scouting",
        "education",
        "notice_service",
      ],
      bema_plan_status: ["active", "completed", "broken", "escalated"],
      bema_registration_status: [
        "pending",
        "approved",
        "rejected",
        "active",
        "inactive",
        "suspended",
      ],
      bema_registration_type: ["employer", "self_employed", "voluntary"],
      bema_waiver_status: ["pending", "approved", "rejected"],
      c3_filing_status: [
        "draft",
        "submitted",
        "validated",
        "posted",
        "rejected",
        "query_raised",
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
      compliance_registration_status: [
        "pending",
        "approved",
        "rejected",
        "active",
        "inactive",
        "suspended",
      ],
      compliance_registration_type: ["employer", "self_employed", "voluntary"],
      contribution_category: ["cat_a", "cat_b", "cat_c", "cat_d", "cat_e"],
      data_scope_condition_type: [
        "owner",
        "department",
        "office",
        "created_by",
        "custom_sql",
      ],
      document_type: [
        "Filings",
        "Evidence",
        "Notices",
        "Orders",
        "Correspondence",
        "Internal",
      ],
      field_masking_type: ["none", "partial", "full"],
      inspector_activity_type: [
        "inspection",
        "audit",
        "investigation",
        "scouting",
        "education",
        "notice_service",
      ],
      meeting_outcome: [
        "ClosedWithApproval",
        "ClosedWithRejection",
        "Reschedule",
        "NextSchedule",
        "Cancel",
      ],
      meeting_status: [
        "Scheduled",
        "Rescheduled",
        "InProgress",
        "Closed",
        "Cancelled",
        "Rejected",
      ],
      meeting_type: [
        "IP-Registration",
        "Employer-Registration",
        "Doctor-Registration",
        "General",
      ],
      next_step_type: [
        "next_step",
        "specific_step",
        "end_workflow",
        "send_back_to_applicant",
        "pause_workflow",
      ],
      notification_channel: ["email", "sms", "push", "in_app"],
      notification_status: ["queued", "sending", "sent", "failed", "cancelled"],
      order_status: ["Draft", "Under Review", "Approved", "Published"],
      party_role: [
        "Primary Respondent",
        "Complainant",
        "Representative",
        "Third Party",
      ],
      payment_plan_status: ["active", "completed", "broken", "escalated"],
      penalty_status: ["Pending", "Paid", "Overdue", "Waived"],
      priority_level: ["Low", "Medium", "High", "Urgent"],
      qa_change_status: ["pending", "approved", "rejected", "withdrawn"],
      service_status: ["Not Served", "Served", "Service Failed"],
      settlement_status: ["Proposed", "Accepted", "Rejected", "Completed"],
      task_status: ["Open", "In Progress", "Completed", "Deferred"],
      waiver_status: ["pending", "approved", "rejected"],
      workflow_end_state: ["Approved", "Rejected"],
      workflow_instance_status: [
        "Pending",
        "InProgress",
        "Completed",
        "Rejected",
        "Cancelled",
        "Escalated",
        "Approved",
        "Query",
        "AwaitingMeeting",
      ],
      workflow_status: ["Draft", "Active", "Disabled", "Archived"],
      workflow_step_action_type: [
        "Approve",
        "Reject",
        "SendBack",
        "Escalate",
        "AutoApprove",
        "Review",
        "Custom",
        "ScheduleMeeting",
      ],
      workflow_task_status: [
        "Pending",
        "InProgress",
        "Completed",
        "Skipped",
        "Cancelled",
        "Paused",
      ],
    },
  },
} as const
