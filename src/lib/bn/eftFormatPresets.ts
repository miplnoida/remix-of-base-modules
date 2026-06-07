/**
 * EFT format presets — seed templates for common bank-file standards.
 * Tokens supported by eftFileService:
 *   {file_reference} {generated_date} {count} {total_amount} {batch_number}
 *   {bank_code} {seq} {payee_name} {account_number} {routing_number}
 *   {amount} {currency} {reference} {ssn}
 */
export interface EftFormatPreset {
  key: string;
  label: string;
  description: string;
  bank_file_format: string;
  file_naming_convention: string;
  file_date_format: string;
  header_record_format: string;
  detail_record_format: string;
  trailer_record_format: string;
  account_number_rule?: string;
  routing_number_rule?: string;
}

export const EFT_FORMAT_PRESETS: EftFormatPreset[] = [
  {
    key: 'GENERIC_CSV',
    label: 'Generic CSV',
    description: 'Comma-separated header + detail + trailer. Works with most local banks for testing.',
    bank_file_format: 'CSV',
    file_naming_convention: 'BN_EFT_{batch_number}_{yyyymmdd}.csv',
    file_date_format: 'YYYYMMDD',
    header_record_format: 'H,{file_reference},{generated_date},{count},{total_amount},{bank_code}',
    detail_record_format: 'D,{seq},{payee_name},{account_number},{routing_number},{amount},{currency},{reference}',
    trailer_record_format: 'T,{count},{total_amount}',
    account_number_rule: 'NUMERIC,MAX=17',
    routing_number_rule: 'NUMERIC,LEN=9',
  },
  {
    key: 'NACHA_PPD',
    label: 'NACHA PPD (US ACH)',
    description: 'Simplified NACHA PPD layout. Adjust field widths before production use.',
    bank_file_format: 'NACHA',
    file_naming_convention: 'NACHA_{batch_number}_{yyyymmdd}.ach',
    file_date_format: 'YYMMDD',
    header_record_format:
      '101 {bank_code}{file_reference}{generated_date}A094101BANK NAME              BN BENEFITS              ',
    detail_record_format:
      '622{routing_number}{account_number}{amount}{ssn}{payee_name}  S 1{bank_code}{seq}',
    trailer_record_format:
      '82200000{count}{routing_number}{total_amount}{bank_code}                         {seq}',
    account_number_rule: 'ALPHANUM,MAX=17',
    routing_number_rule: 'NUMERIC,LEN=9,MOD10',
  },
  {
    key: 'SWIFT_MT103',
    label: 'SWIFT MT103 (text)',
    description: 'Single-message SWIFT MT103 text per detail. One file = one batch.',
    bank_file_format: 'SWIFT',
    file_naming_convention: 'SWIFT_{batch_number}_{yyyymmdd}.txt',
    file_date_format: 'YYMMDD',
    header_record_format: '{1:F01{bank_code}XXXX0000000000}{2:O1031200{generated_date}{bank_code}}',
    detail_record_format:
      ':20:{reference}\n:23B:CRED\n:32A:{generated_date}{currency}{amount}\n:50K:/BN-BENEFITS\n:59:/{account_number}\n{payee_name}\n:70:BN PAYMENT {reference}\n:71A:OUR',
    trailer_record_format: '-}{5:{CHK:000000000000}}',
    account_number_rule: 'IBAN_OR_LOCAL',
    routing_number_rule: 'BIC,LEN=8_OR_11',
  },
  {
    key: 'SEPA_PAIN001',
    label: 'SEPA pain.001 (CSV emulation)',
    description: 'CSV emulation of SEPA pain.001 fields. Use XML generator for production.',
    bank_file_format: 'CSV',
    file_naming_convention: 'SEPA_{batch_number}_{yyyymmdd}.csv',
    file_date_format: 'YYYY-MM-DD',
    header_record_format: 'GroupHeader,{file_reference},{generated_date},{count},{total_amount},EUR',
    detail_record_format:
      'CdtTrfTxInf,{seq},{reference},{amount},EUR,{routing_number},{account_number},{payee_name}',
    trailer_record_format: 'EOF,{count},{total_amount}',
    account_number_rule: 'IBAN,LEN=15_34',
    routing_number_rule: 'BIC,LEN=8_OR_11',
  },
];

export const getPreset = (key: string) =>
  EFT_FORMAT_PRESETS.find((p) => p.key === key);
