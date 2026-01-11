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
      app_modules: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_enabled: boolean | null
          name: string
          parent_id: string | null
          route: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          parent_id?: string | null
          route?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          parent_id?: string | null
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
      departments: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_head_user_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          office_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_head_user_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          office_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_head_user_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          office_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_department_head_user_id_fkey"
            columns: ["department_head_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "office_locations"
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
      in_app_notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          read_at?: string | null
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
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          recipient_address: string
          recipient_user_id: string | null
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
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          recipient_address: string
          recipient_user_id?: string | null
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
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          recipient_address?: string
          recipient_user_id?: string | null
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
          id: string
          is_active: boolean | null
          provider_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          created_by: string | null
          id: string
          is_enabled: boolean | null
          module_id: string | null
          name: string
          placeholders: Json | null
          subject: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          module_id?: string | null
          name: string
          placeholders?: Json | null
          subject?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_enabled?: boolean | null
          module_id?: string | null
          name?: string
          placeholders?: Json | null
          subject?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
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
      office_departments: {
        Row: {
          created_at: string
          department_id: string
          id: string
          office_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          office_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_departments_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "office_locations"
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
          office_id: string | null
          phone: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
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
          office_id?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
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
          office_id?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
            foreignKeyName: "profiles_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "office_locations"
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
      workflow_definitions: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_sla_hours: number | null
          description: string | null
          id: string
          is_active: boolean | null
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
          completed_at: string | null
          current_step_id: string | null
          due_at: string | null
          id: string
          metadata: Json | null
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
          completed_at?: string | null
          current_step_id?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
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
          completed_at?: string | null
          current_step_id?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
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
      can_access_module: {
        Args: { _module_name: string; _user_id: string }
        Returns: boolean
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
      check_workflow_task_access: {
        Args: {
          _action?: string
          _user_id: string
          _workflow_instance_id: string
        }
        Returns: Json
      }
      clone_role: {
        Args: { new_role_name: string; source_role_id: string }
        Returns: string
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
      get_all_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_module_tables: {
        Args: { _module_id: string }
        Returns: {
          display_name: string
          table_name: string
        }[]
      }
      get_table_columns: {
        Args: { _table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: boolean
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
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          action_id: string
          action_name: string
          is_granted: boolean
          module_id: string
          module_name: string
          source: string
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
      next_step_type:
        | "next_step"
        | "specific_step"
        | "end_workflow"
        | "send_back_to_applicant"
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
      workflow_status: "Draft" | "Active" | "Disabled" | "Archived"
      workflow_step_action_type:
        | "Approve"
        | "Reject"
        | "SendBack"
        | "Escalate"
        | "AutoApprove"
        | "Review"
        | "Custom"
      workflow_task_status:
        | "Pending"
        | "InProgress"
        | "Completed"
        | "Skipped"
        | "Cancelled"
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
      next_step_type: [
        "next_step",
        "specific_step",
        "end_workflow",
        "send_back_to_applicant",
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
      ],
      workflow_task_status: [
        "Pending",
        "InProgress",
        "Completed",
        "Skipped",
        "Cancelled",
      ],
    },
  },
} as const
