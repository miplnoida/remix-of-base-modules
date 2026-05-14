
-- Disable instead of delete (trigger protects admin permissions)
UPDATE app_modules SET is_enabled = false 
WHERE id IN (
  'ca000000-0000-0000-0000-000000000101',
  'ca000000-0000-0000-0000-000000000102',
  'ca000000-0000-0000-0000-000000000107'
);
