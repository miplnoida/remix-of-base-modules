

# Three Feature Implementation Plan

## Feature 1: Office IP Address Management + Auto-Detection on Batch Creation

### Database
Create table `office_ip_addresses`:
```sql
CREATE TABLE public.office_ip_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL REFERENCES tb_office(code),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('single', 'range')),
  single_ip TEXT,
  range_start_ip TEXT,
  range_end_ip TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  entered_by VARCHAR,
  entered_at TIMESTAMPTZ DEFAULT now(),
  modified_by VARCHAR,
  modified_at TIMESTAMPTZ DEFAULT now()
);
```

Create RPC function `resolve_office_by_ip` that takes an IP address and returns the matching `office_code` by checking single IPs and ranges in `office_ip_addresses` (same numeric comparison logic used in `check_ip_whitelist`).

### New Admin Screen: `/admin/office-ip-management`
- CRUD screen for managing IP addresses/ranges per office
- Select office from `tb_office`, add single IP or range (start/end)
- Table showing all rules grouped by office with edit/delete/toggle
- Add route to `AppRoutes.tsx`

### Batch Creation Auto-Detection
In `OpenBatchDialog` (`src/pages/cashier/BatchManagement.tsx`):
- On dialog open, call `getClientIP()` then invoke `resolve_office_by_ip` RPC
- If a match is found, override the office location with the IP-matched office (show indicator "Detected from IP: x.x.x.x")
- If no match found, fall back to existing logic (profile default / head cashier override)
- The detected office code is what gets saved to `cn_batch.office_code`

### Files Changed
| File | Change |
|------|--------|
| Migration SQL | Create `office_ip_addresses` table + `resolve_office_by_ip` RPC |
| `src/pages/admin/OfficeIPManagement.tsx` | New CRUD screen |
| `src/components/routing/AppRoutes.tsx` | Add route |
| `src/pages/cashier/BatchManagement.tsx` | Add IP detection in `OpenBatchDialog` |

---

## Feature 2: Move Non-Working Days from 'Meeting' to 'General' Category

### Database
Update the `system_settings` row for `non_working_days` to change its `category` from `'Meeting'` to `'General'`.

### Impact
- The GlobalSettings page dynamically renders tabs from categories, so the setting will automatically appear under the General tab
- The meeting dialogs (`ScheduleMeetingDialog`, `RescheduleMeetingDialog`) query by `setting_key` not category, so they are unaffected
- The trigger `validate_meeting_non_working_day` queries by `setting_key`, also unaffected

### Files Changed
| File | Change |
|------|--------|
| Data update (insert tool) | `UPDATE system_settings SET category = 'General' WHERE setting_key = 'non_working_days'` |

---

## Feature 3: Public Holidays Management in Global Settings (General Tab)

### Database
Create table `public_holidays`:
```sql
CREATE TABLE public.public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL REFERENCES tb_office(code),
  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  entered_by VARCHAR,
  entered_at TIMESTAMPTZ DEFAULT now(),
  modified_by VARCHAR,
  modified_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_code, holiday_date)
);
```

### UI: New Section in Global Settings > General Tab
Add a `PublicHolidaysSection` component rendered inside the General tab:
- **Year selector** (dropdown) + **Office selector** (from `tb_office`)
- Table of holidays for selected year/office with Add, Edit, Delete
- Each holiday: date, name, office
- **Copy Year** button: select a source year and target year → copies all holidays from source to target for the same office (blocks if target year already has entries)
- Validation: no duplicate date per office, date must fall within selected year

### Files Changed
| File | Change |
|------|--------|
| Migration SQL | Create `public_holidays` table |
| `src/components/admin/PublicHolidaysSection.tsx` | New component with CRUD + copy-year |
| `src/pages/systemAdmin/GlobalSettings.tsx` | Import and render `PublicHolidaysSection` in General tab content |

