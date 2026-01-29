-- Create master lookup tables

CREATE TABLE IF NOT EXISTS public.tb_activity(
	code char(6) NOT NULL PRIMARY KEY,
	short_description varchar(25) NULL,
	long_description varchar(120) NULL
);

CREATE TABLE IF NOT EXISTS public.tb_district(
	code varchar(3) NOT NULL PRIMARY KEY,
	description varchar(25) NULL
);

CREATE TABLE IF NOT EXISTS public.tb_indus(
	code varchar(4) NOT NULL PRIMARY KEY,
	short_description varchar(25) NULL,
	long_description varchar(55) NULL
);

CREATE TABLE IF NOT EXISTS public.tb_inspector(
	code varchar(3) NOT NULL PRIMARY KEY,
	insp_name varchar(50) NULL
);

CREATE TABLE IF NOT EXISTS public.tb_office(
	code varchar(3) NOT NULL PRIMARY KEY,
	description varchar(25) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tb_sector(
	code char(1) NOT NULL PRIMARY KEY,
	description varchar(25) NULL
);

CREATE TABLE IF NOT EXISTS public.tb_villages(
	code varchar(3) NOT NULL PRIMARY KEY,
	description varchar(25) NULL,
	postal_code varchar(10) NULL
);

-- Enable RLS for all tables (these are lookup tables - allow read for authenticated)
ALTER TABLE public.tb_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_district ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_indus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_inspector ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_office ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_sector ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_villages ENABLE ROW LEVEL SECURITY;

-- Create read policies for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON public.tb_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_district FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_indus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_inspector FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_office FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_sector FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.tb_villages FOR SELECT TO authenticated USING (true);

-- Also allow anon access for public lookup data
CREATE POLICY "Allow read access for anonymous users" ON public.tb_activity FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for anonymous users" ON public.tb_district FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for anonymous users" ON public.tb_indus FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for anonymous users" ON public.tb_inspector FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for anonymous users" ON public.tb_office FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for anonymous users" ON public.tb_sector FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access for anonymous users" ON public.tb_villages FOR SELECT TO anon USING (true);

-- Insert tb_office data
INSERT INTO public.tb_office (code, description) VALUES ('NEV', 'Nevis') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_office (code, description) VALUES ('STK', 'St. Kitts') ON CONFLICT (code) DO NOTHING;

-- Insert tb_sector data
INSERT INTO public.tb_sector (code, description) VALUES ('G', 'Government') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_sector (code, description) VALUES ('O', 'Other') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_sector (code, description) VALUES ('P', 'Public') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_sector (code, description) VALUES ('R', 'Private') ON CONFLICT (code) DO NOTHING;

-- Insert tb_district data
INSERT INTO public.tb_district (code, description) VALUES ('BAS', 'Basseterre , Zone 01 - 11') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('CAY', 'Cayon, Zone 06') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('CHA', 'Charlestown, Zone') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('DIE', 'Dieppe Bay, Zone 04') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('GIN', 'Gingerland') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('OLD', 'Old Road, Zone 02') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('OVS', 'Overseas') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('SAN', 'Sandy Point, Zone 03') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('UNK', 'Unknown') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_district (code, description) VALUES ('TAB', 'Tabernacle, Zone 05') ON CONFLICT (code) DO NOTHING;

-- Insert tb_inspector data
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('00', 'Nevis') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('01', 'Vincent Sutton') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('02', 'Dexter Richardson') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('03', 'Danielle Brown') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('04', 'Kimmoy Brathwaite') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('05', 'Omar Hodge') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('06', 'Aleks Condell (Dexter)') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('N01', 'Chase Lawrence') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('N02', 'Karen Amory') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('N03', 'Fayola O Tross') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('OSC', 'Overseas Company') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('UNK', 'Unknown') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('07', 'Patricia Rogers-Lake') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.tb_inspector (code, insp_name) VALUES ('N04', 'Sheon Lewis') ON CONFLICT (code) DO NOTHING;