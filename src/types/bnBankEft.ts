/**
 * Types for the BN bank / EFT / payment-method master tables.
 */

export interface BnBankMaster {
  id: string;
  bank_code: string;
  country_code: string;
  bank_name: string;
  swift_code: string | null;
  clearing_code: string | null;
  default_currency: string | null;
  active: boolean;
  notes: string | null;
}

export interface BnBankBranch {
  id: string;
  bank_code: string;
  branch_code: string;
  branch_name: string;
  routing_number: string | null;
  address_snapshot: Record<string, any> | null;
  active: boolean;
}

export interface BnPaymentMethod {
  id: string;
  method_code: string;
  method_name: string;
  requires_bank_account: boolean;
  requires_postal_address: boolean;
  generates_eft_file: boolean;
  consumes_cheque_stock: boolean;
  active: boolean;
  sort_order: number;
}

export type EftRecordType = 'HEADER' | 'DETAIL' | 'TRAILER';
export type EftPadding = 'NONE' | 'LEFT' | 'RIGHT' | 'ZERO';

export interface BnEftFormat {
  id: string;
  format_code: string;
  format_name: string;
  country_code: string | null;
  bank_code: string | null;
  file_extension: string;
  delimiter: string | null;
  record_separator: string;
  date_format: string;
  amount_format: string;
  amount_decimals: number;
  header_required: boolean;
  trailer_required: boolean;
  encoding: string;
  active: boolean;
  notes: string | null;
}

export interface BnEftFormatField {
  id: string;
  format_code: string;
  record_type: EftRecordType;
  order_index: number;
  field_name: string;
  source_field: string | null;
  start_position: number | null;
  length: number | null;
  padding: EftPadding;
  pad_char: string;
  required: boolean;
  default_value: string | null;
  transform: string | null;
}
