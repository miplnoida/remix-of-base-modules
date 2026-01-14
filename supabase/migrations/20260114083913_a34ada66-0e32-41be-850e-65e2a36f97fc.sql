-- Create ip_status master table
CREATE TABLE IF NOT EXISTS public.ip_status (
    code char(1) PRIMARY KEY NOT NULL,
    description varchar(20) NOT NULL
);

-- Insert status values
INSERT INTO public.ip_status (code, description) VALUES
    ('E', 'E-Verified'),
    ('V', 'Verified'),
    ('C', 'Deceased'),
    ('T', 'Terminated'),
    ('A', 'Active'),
    ('I', 'Inactive'),
    ('S', 'Suspended'),
    ('D', 'Deleted'),
    ('P', 'Pending'),
    ('Z', 'Draft')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- Enable RLS
ALTER TABLE public.ip_status ENABLE ROW LEVEL SECURITY;

-- Create read policy for all authenticated users
CREATE POLICY "Allow read access for authenticated users"
ON public.ip_status
FOR SELECT
TO authenticated
USING (true);

-- Also allow public read for lookups
CREATE POLICY "Allow public read access"
ON public.ip_status
FOR SELECT
TO anon
USING (true);