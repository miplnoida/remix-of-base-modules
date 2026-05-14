
-- 1. Widen the user_code column
ALTER TABLE public.profiles ALTER COLUMN user_code TYPE VARCHAR(50);

-- 2. Drop old unique index if exists
DROP INDEX IF EXISTS profiles_user_code_unique;
DROP INDEX IF EXISTS idx_profiles_user_code;

-- 3. Replace generate_user_code function (drop old overloads first)
DROP FUNCTION IF EXISTS public.generate_user_code(TEXT);
DROP FUNCTION IF EXISTS public.generate_user_code(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.generate_user_code(p_first_name TEXT, p_last_name TEXT)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_base VARCHAR(50);
  v_code VARCHAR(50);
  v_counter INT := 1;
BEGIN
  IF TRIM(COALESCE(p_last_name, '')) = '' THEN
    RAISE EXCEPTION 'Last name is required to generate user_code';
  END IF;
  IF TRIM(COALESCE(p_first_name, '')) = '' THEN
    RAISE EXCEPTION 'First name is required to generate user_code';
  END IF;
  v_base := UPPER(LEFT(TRIM(p_first_name), 1)) || INITCAP(TRIM(p_last_name));
  v_code := v_base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE user_code = v_code) LOOP
    v_counter := v_counter + 1;
    v_code := v_base || v_counter::TEXT;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 4. Update set_user_code trigger function
CREATE OR REPLACE FUNCTION public.set_user_code() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR
     NEW.first_name IS DISTINCT FROM OLD.first_name OR
     NEW.last_name IS DISTINCT FROM OLD.last_name OR
     NEW.user_code IS NULL THEN
    NEW.user_code := public.generate_user_code(NEW.first_name, NEW.last_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 5. Recreate unique index
CREATE UNIQUE INDEX profiles_user_code_unique ON public.profiles(user_code) WHERE user_code IS NOT NULL;

-- 6. Migrate existing data: set user_code to NULL so trigger regenerates
UPDATE public.profiles
SET user_code = NULL
WHERE first_name IS NOT NULL AND TRIM(first_name) != ''
  AND last_name IS NOT NULL AND TRIM(last_name) != '';
