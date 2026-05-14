
-- Temporarily disable the contact validation trigger
ALTER TABLE public.ip_master DISABLE TRIGGER trg_validate_ip_master_contact;

-- Fix invalid email data
UPDATE public.ip_master SET email = NULL WHERE email IS NOT NULL AND email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$';

-- Clean invalid height data
UPDATE public.ip_master SET height_feet = NULL, height_inches = NULL 
WHERE height_feet > 8 OR height_inches > 11 OR height_feet < 0 OR height_inches < 0;

-- ============================================================
-- ip_master: Convert TEXT columns to VARCHAR with proper lengths
-- ============================================================
ALTER TABLE public.ip_master
  ALTER COLUMN application_id TYPE varchar(20) USING left(application_id, 20),
  ALTER COLUMN ssn TYPE varchar(6) USING left(ssn, 6),
  ALTER COLUMN title TYPE varchar(6) USING left(title, 6),
  ALTER COLUMN first_name TYPE varchar(25) USING left(first_name, 25),
  ALTER COLUMN middle_name TYPE varchar(25) USING left(middle_name, 25),
  ALTER COLUMN last_name TYPE varchar(25) USING left(last_name, 25),
  ALTER COLUMN suffix TYPE varchar(6) USING left(suffix, 6),
  ALTER COLUMN maiden_name TYPE varchar(25) USING left(maiden_name, 25),
  ALTER COLUMN alias TYPE varchar(25) USING left(alias, 25),
  ALTER COLUMN gender TYPE varchar(1) USING left(gender, 1),
  ALTER COLUMN marital_status TYPE varchar(20) USING left(marital_status, 20),
  ALTER COLUMN birth_place TYPE varchar(3) USING left(birth_place, 3),
  ALTER COLUMN nationality TYPE varchar(3) USING left(nationality, 3),
  ALTER COLUMN eye_color TYPE varchar(3) USING left(eye_color, 3),
  ALTER COLUMN resident_address_1 TYPE varchar(30) USING left(resident_address_1, 30),
  ALTER COLUMN resident_address_2 TYPE varchar(30) USING left(resident_address_2, 30),
  ALTER COLUMN postal_district TYPE varchar(3) USING left(postal_district, 3),
  ALTER COLUMN mailing_address TYPE varchar(60) USING left(mailing_address, 60),
  ALTER COLUMN email TYPE varchar(40) USING left(email, 40),
  ALTER COLUMN telephone TYPE varchar(15) USING left(telephone, 15),
  ALTER COLUMN mobile TYPE varchar(15) USING left(mobile, 15),
  ALTER COLUMN occupation TYPE varchar(4) USING left(occupation, 4),
  ALTER COLUMN work_permit_status TYPE varchar(1) USING left(work_permit_status, 1),
  ALTER COLUMN npf_status TYPE varchar(1) USING left(npf_status, 1),
  ALTER COLUMN place_of_residence TYPE varchar(30) USING left(place_of_residence, 30),
  ALTER COLUMN citizenship TYPE varchar(30) USING left(citizenship, 30),
  ALTER COLUMN signature_on_file TYPE varchar(1) USING left(signature_on_file, 1),
  ALTER COLUMN marital_doc_type TYPE varchar(1) USING left(marital_doc_type, 1),
  ALTER COLUMN birth_doc_type TYPE varchar(1) USING left(birth_doc_type, 1),
  ALTER COLUMN death_doc_type TYPE varchar(1) USING left(death_doc_type, 1),
  ALTER COLUMN name_doc_type TYPE varchar(1) USING left(name_doc_type, 1),
  ALTER COLUMN status TYPE varchar(1) USING left(status, 1),
  ALTER COLUMN rejection_reason TYPE varchar(250) USING left(rejection_reason, 250);

-- ip_master: Relations fields
ALTER TABLE public.ip_master
  ALTER COLUMN contact TYPE varchar(35) USING left(contact, 35),
  ALTER COLUMN contact_relation TYPE varchar(20) USING left(contact_relation, 20),
  ALTER COLUMN contact_addr1 TYPE varchar(30) USING left(contact_addr1, 30),
  ALTER COLUMN contact_addr2 TYPE varchar(30) USING left(contact_addr2, 30),
  ALTER COLUMN contact_phone TYPE varchar(10) USING left(contact_phone, 10),
  ALTER COLUMN contact_mobile TYPE varchar(10) USING left(contact_mobile, 10),
  ALTER COLUMN contact_email TYPE varchar(40) USING left(contact_email, 40),
  ALTER COLUMN father_name TYPE varchar(35) USING left(father_name, 35),
  ALTER COLUMN mother_name TYPE varchar(35) USING left(mother_name, 35),
  ALTER COLUMN spouse_name TYPE varchar(35) USING left(spouse_name, 35),
  ALTER COLUMN spouse_addr1 TYPE varchar(30) USING left(spouse_addr1, 30),
  ALTER COLUMN spouse_addr2 TYPE varchar(30) USING left(spouse_addr2, 30),
  ALTER COLUMN spouse_ssn TYPE varchar(6) USING left(spouse_ssn, 6),
  ALTER COLUMN witness_name TYPE varchar(35) USING left(witness_name, 35),
  ALTER COLUMN beneficiary TYPE varchar(35) USING left(beneficiary, 35),
  ALTER COLUMN ben_addr1 TYPE varchar(30) USING left(ben_addr1, 30),
  ALTER COLUMN ben_addr2 TYPE varchar(30) USING left(ben_addr2, 30);

-- ip_master: Change height fields to smallint
ALTER TABLE public.ip_master
  ALTER COLUMN height_feet TYPE smallint USING height_feet::smallint,
  ALTER COLUMN height_inches TYPE smallint USING height_inches::smallint;

-- ip_depend: Align surname to varchar(25)
ALTER TABLE public.ip_depend
  ALTER COLUMN surname TYPE varchar(25) USING left(surname, 25);

-- Re-enable the contact validation trigger
ALTER TABLE public.ip_master ENABLE TRIGGER trg_validate_ip_master_contact;
