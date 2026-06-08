ALTER TABLE public.bn_rule_catalogue ALTER COLUMN parameter DROP NOT NULL;
ALTER TABLE public.bn_rule_catalogue ALTER COLUMN parameter SET DEFAULT '';