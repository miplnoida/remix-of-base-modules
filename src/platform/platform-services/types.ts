export interface PlatformService {
  id: string;
  service_code: string;
  service_name: string;
  category: string;
  status: string;
  maturity: string;
  is_mandatory: boolean;
  owner_module_code: string;
  owner_team: string | null;
  primary_route: string | null;
  description: string | null;
  documentation_url: string | null;
  health_status: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformServiceContract {
  id: string;
  service_id: string;
  contract_code: string;
  contract_name: string;
  contract_type: string;
  version: string;
  status: string;
  description: string | null;
  is_active: boolean;
}

export interface PlatformServiceConsumer {
  id: string;
  service_id: string;
  consumer_module_code: string;
  consumer_name: string;
  consumption_type: string;
  status: string;
  notes: string | null;
  is_active: boolean;
}

export interface PlatformChecklistItem {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  is_mandatory: boolean;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface PlatformModuleAssessment {
  id: string;
  module_code: string;
  checklist_item_id: string;
  status: string;
  waived: boolean;
  waiver_reason: string | null;
  notes: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
}
