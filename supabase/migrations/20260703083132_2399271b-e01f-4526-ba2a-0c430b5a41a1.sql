
-- Legal Navigation Cleanup Audit (post EPIC-07)
-- Hide legacy duplicates from the sidebar; rename sections to canonical labels.
-- No rows deleted; only show_in_menu/display_name/route updated.

-- 1) Rename Orders & Judgments section to Judicial Orders & Judgments and
--    repoint the child "Orders" entry to the canonical /legal/lg/orders.
UPDATE public.app_modules
   SET display_name = 'Judicial Orders & Judgments'
 WHERE id = '1e9a2000-0000-0000-0000-0000000000c6';

UPDATE public.app_modules
   SET display_name = 'Court Orders',
       route = '/legal/lg/orders'
 WHERE id = '1e9a1000-0000-0000-0000-000000000070';

-- 2) Rename Hearings section to Court Operations.
UPDATE public.app_modules
   SET display_name = 'Court Operations'
 WHERE id = '1e9a2000-0000-0000-0000-0000000000c5';

-- 3) Hide legacy "Recovery Actions" (/legal/enforcement) — canonical flow
--    is Legal Recovery Assignments + Judicial Orders. Retain row + route.
UPDATE public.app_modules
   SET show_in_menu = false
 WHERE id = '1e9a1000-0000-0000-0000-000000000080';

-- 4) Hide legacy "Payment Arrangements" (/legal/payment-plans) — canonical
--    is Legal Settlements under Legal Recovery.
UPDATE public.app_modules
   SET show_in_menu = false
 WHERE id = '1e9a1000-0000-0000-0000-000000000090';

-- 5) Hide the empty legacy "Settlements" section shell now that its only
--    child is hidden (Legal Settlements lives under Legal Recovery).
UPDATE public.app_modules
   SET show_in_menu = false
 WHERE id = '1e9a2000-0000-0000-0000-0000000000c8';

-- 6) Hide the empty legacy "Recovery & Payments" section shell.
UPDATE public.app_modules
   SET show_in_menu = false
 WHERE id = '1e9a2000-0000-0000-0000-0000000000c7';

-- 7) Hide duplicate My Tasks entry under Tasks & SLA — the canonical
--    "My Work" section already exposes My Tasks and Team Queue.
UPDATE public.app_modules
   SET show_in_menu = false
 WHERE id = '1e9a2000-0000-0000-0000-0000000000d9';

UPDATE public.app_modules
   SET show_in_menu = false
 WHERE id = '1e9a2000-0000-0000-0000-0000000000c9';
