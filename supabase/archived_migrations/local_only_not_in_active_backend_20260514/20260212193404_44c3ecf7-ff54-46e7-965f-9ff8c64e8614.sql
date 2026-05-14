
-- Step 1: Clear profiles office/department references
UPDATE profiles SET office_id = NULL, department_id = NULL;

-- Step 2: Drop FK constraints on profiles referencing old tables
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_office_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_department_id_fkey;

-- Step 3: Drop office_departments table
DROP TABLE IF EXISTS office_departments;

-- Step 4: Delete all records from departments
DELETE FROM departments;

-- Step 5: Drop all FK constraints on departments before rename
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_office_id_fkey;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_created_by_fkey;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_updated_by_fkey;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_department_head_user_id_fkey;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_office_id_name_key;

-- Step 6: Rename departments -> tb_office_departments
ALTER TABLE departments RENAME TO tb_office_departments;

-- Step 7: Drop old office_id column (uuid, referenced office_locations) and add office_code (varchar, references tb_office)
ALTER TABLE tb_office_departments DROP COLUMN office_id;
ALTER TABLE tb_office_departments DROP COLUMN created_by;
ALTER TABLE tb_office_departments DROP COLUMN updated_by;
ALTER TABLE tb_office_departments DROP COLUMN department_head_user_id;
ALTER TABLE tb_office_departments ADD COLUMN office_code VARCHAR(3) NOT NULL DEFAULT 'STK';
ALTER TABLE tb_office_departments ADD CONSTRAINT tb_office_departments_office_code_fkey 
  FOREIGN KEY (office_code) REFERENCES tb_office(code);
ALTER TABLE tb_office_departments ADD CONSTRAINT tb_office_departments_office_code_name_key 
  UNIQUE (office_code, name);

-- Step 8: Add address1 and address2 to tb_office
ALTER TABLE tb_office ADD COLUMN address1 VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE tb_office ADD COLUMN address2 VARCHAR(100) NOT NULL DEFAULT '';

-- Populate address fields with test data
UPDATE tb_office SET address1 = 'P.O. Box 161, Church Street', address2 = 'Basseterre, St. Kitts' WHERE code = 'STK';
UPDATE tb_office SET address1 = 'Main Street', address2 = 'Charlestown, Nevis' WHERE code = 'NEV';

-- Step 9: Update profiles to reference tb_office instead of office_locations
-- Change office_id column to office_code varchar
ALTER TABLE profiles DROP COLUMN office_id;
ALTER TABLE profiles ADD COLUMN office_code VARCHAR(3);
ALTER TABLE profiles ADD CONSTRAINT profiles_office_code_fkey 
  FOREIGN KEY (office_code) REFERENCES tb_office(code);

-- Change department_id to reference tb_office_departments
ALTER TABLE profiles ADD CONSTRAINT profiles_department_id_fkey 
  FOREIGN KEY (department_id) REFERENCES tb_office_departments(id);

-- Step 10: Insert test department records
INSERT INTO tb_office_departments (id, name, description, is_active, office_code) VALUES
  (gen_random_uuid(), 'Benefits', 'Benefits administration department', true, 'STK'),
  (gen_random_uuid(), 'Compliance', 'Compliance and enforcement', true, 'STK'),
  (gen_random_uuid(), 'Finance', 'Financial operations', true, 'STK'),
  (gen_random_uuid(), 'Human Resources', 'HR management', true, 'STK'),
  (gen_random_uuid(), 'Information Technology', 'IT services and support', true, 'STK'),
  (gen_random_uuid(), 'Legal', 'Legal affairs', true, 'STK'),
  (gen_random_uuid(), 'Administration', 'General administration', true, 'STK'),
  (gen_random_uuid(), 'Benefits', 'Benefits administration department', true, 'NEV'),
  (gen_random_uuid(), 'Compliance', 'Compliance and enforcement', true, 'NEV'),
  (gen_random_uuid(), 'Finance', 'Financial operations', true, 'NEV'),
  (gen_random_uuid(), 'Administration', 'General administration', true, 'NEV'),
  (gen_random_uuid(), 'Customer Service', 'Customer service operations', true, 'NEV');

-- Step 11: Enable RLS on tb_office_departments
ALTER TABLE tb_office_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to tb_office_departments" ON tb_office_departments FOR SELECT USING (true);

-- RLS policy for tb_office (read-only master table)
ALTER TABLE tb_office ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to tb_office" ON tb_office FOR SELECT USING (true);
