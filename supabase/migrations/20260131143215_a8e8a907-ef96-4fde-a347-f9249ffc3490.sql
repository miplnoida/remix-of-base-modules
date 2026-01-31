-- Add user_code column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_code VARCHAR(5);

-- Create unique index on user_code
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_code_unique ON public.profiles(user_code) WHERE user_code IS NOT NULL;

-- Function to generate unique user_code from first_name and last_name
CREATE OR REPLACE FUNCTION public.generate_user_code(p_first_name TEXT, p_last_name TEXT)
RETURNS VARCHAR(5)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_base_code VARCHAR(5);
    v_code VARCHAR(5);
    v_counter INT := 0;
    v_first_initial CHAR(1);
    v_last_chars VARCHAR(4);
BEGIN
    -- Get first letter of first name (uppercase)
    v_first_initial := UPPER(LEFT(COALESCE(p_first_name, 'X'), 1));
    
    -- Get first 4 letters of last name (uppercase)
    v_last_chars := UPPER(LEFT(COALESCE(p_last_name, 'USER'), 4));
    
    -- Combine to form base code (e.g., "JSMIT" for John Smith)
    v_base_code := v_first_initial || v_last_chars;
    
    -- Pad with 'X' if less than 5 characters
    v_base_code := RPAD(v_base_code, 5, 'X');
    
    -- Check if this code already exists
    v_code := v_base_code;
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE user_code = v_code) LOOP
        v_counter := v_counter + 1;
        -- Replace last character(s) with number to make unique
        IF v_counter < 10 THEN
            v_code := LEFT(v_base_code, 4) || v_counter::TEXT;
        ELSIF v_counter < 100 THEN
            v_code := LEFT(v_base_code, 3) || v_counter::TEXT;
        ELSE
            -- Fallback: generate random code
            v_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
        END IF;
    END LOOP;
    
    RETURN v_code;
END;
$$;

-- Trigger function to auto-generate user_code on insert/update
CREATE OR REPLACE FUNCTION public.set_user_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only generate if user_code is null and we have name info
    IF NEW.user_code IS NULL THEN
        NEW.user_code := public.generate_user_code(NEW.first_name, NEW.last_name);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for auto-generating user_code
DROP TRIGGER IF EXISTS trigger_set_user_code ON public.profiles;
CREATE TRIGGER trigger_set_user_code
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_code();

-- Update existing profiles to have user_code
UPDATE public.profiles
SET user_code = public.generate_user_code(first_name, last_name)
WHERE user_code IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);