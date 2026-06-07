# BEMA → BN Payment Mapping

BEMA is an operational reference. BN owns its own configurable masters.

## BEMA artefacts inspected
`d_t_directdepositrpt.srd`, `p_d_t_DirectDepositRpt.sql`, `d_export.srq`,
`ds_export.srd`, `u_tab_cheque.sru`, `n_bso_cheque_print.sru`,
`q_dbd_cheques.srq`, `q_dbd_cheques_list.srq`, `ds_cheques_recon.srd`,
plus DDL create scripts. (Detailed quotes are captured in the background
research agent run; this doc is the authoritative summary going forward.)

## Verdict
| Concept | BEMA | BN |
| --- | --- | --- |
| Bank master | tb_bank_code (flat) | `bn_bank_master` (new) |
| Branch master | embedded / partial | `bn_bank_branch` (new) |
| Payment method master | hardcoded enum | `bn_payment_method` (new) |
| EFT format master | hardcoded DataWindow/SQL | `bn_eft_format` + `bn_eft_format_field` (new) |
| Direct-deposit export | fixed report layout | configurable via format master |
| Cheque stock / register | u_tab_cheque + manual ranges | `bn_cheque_stock` + `bn_cheque_register` (existing) |
| Reconciliation | ds_cheques_recon | `bn_payment_reconciliation` (existing) |

## Field map (BEMA → BN)
- `cl_bank_acct.bank_code` → `bn_payment_profile.bank_code` (+ FK to `bn_bank_master`)
- `cl_bank_acct.branch_code` → `bn_payment_profile.branch_code`
- `cl_bank_acct.account_no` → `bn_payment_profile.account_number_masked` (+ token)
- `cl_bank_acct.acct_name` → `bn_payment_profile.account_holder_name`
- `cl_cheques.cheque_no` → `bn_cheque_register.cheque_number`
- `cl_cheques.payee_name` → `bn_cheque_register.payee_name`
- Direct-deposit export columns (payee, account, routing, amount, ref) →
  `bn_eft_format_field.source_field` paths
  (`profile.account_holder_name`, `profile.account_number_masked`,
   `profile.branch_code`, `instruction.amount`, `instruction.reference`).

## Cheque concepts kept
batch, number range, print, reprint, cancel, correct, dispatch,
reconcile — all already modelled on `bn_cheque_register.status` and
`bn_payment_reconciliation`.
