ALTER TABLE role_permissions DISABLE TRIGGER admin_permissions_protection;

DELETE FROM role_permissions
 WHERE module_id IN (
   'c3010000-0000-0000-0000-000000000031',
   'c3010000-0000-0000-0000-000000000032'
 );

DELETE FROM app_modules
 WHERE id IN (
   'c3010000-0000-0000-0000-000000000031',
   'c3010000-0000-0000-0000-000000000032'
 );

ALTER TABLE role_permissions ENABLE TRIGGER admin_permissions_protection;