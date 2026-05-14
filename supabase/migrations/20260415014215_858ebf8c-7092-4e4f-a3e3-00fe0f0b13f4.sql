
-- Enums
DO $$ BEGIN
  CREATE TYPE kb_content_type AS ENUM (
    'module_overview','screen_help','field_help','faq',
    'process_guide','troubleshooting','release_note','best_practice'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kb_audience AS ENUM (
    'all_users','admin','officer','supervisor','legal','technical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kb_content_status AS ENUM (
    'draft','in_review','published','stale','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kb_source_type AS ENUM (
    'database','c3_config','derived','manual_entry','system_calculated','external_api'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== TABLE 1: kb_articles =====
CREATE TABLE IF NOT EXISTS public.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  submodule_key TEXT,
  screen_key TEXT,
  article_type kb_content_type NOT NULL DEFAULT 'screen_help',
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  audience kb_audience DEFAULT 'all_users',
  tags TEXT[] DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  status kb_content_status NOT NULL DEFAULT 'draft',
  is_stale BOOLEAN NOT NULL DEFAULT false,
  stale_since TIMESTAMPTZ,
  stale_reason TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  search_vector tsvector,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_module_screen ON public.kb_articles (module_key, screen_key);
CREATE INDEX IF NOT EXISTS idx_kb_articles_search ON public.kb_articles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON public.kb_articles USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON public.kb_articles (status) WHERE status = 'published';

-- ===== TABLE 2: kb_field_help =====
CREATE TABLE IF NOT EXISTS public.kb_field_help (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  screen_key TEXT NOT NULL,
  component_key TEXT,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  short_help TEXT NOT NULL,
  full_help TEXT,
  example_value TEXT,
  source_type kb_source_type DEFAULT 'manual_entry',
  impact_of_change TEXT,
  related_rules TEXT[] DEFAULT '{}',
  related_article_id UUID REFERENCES public.kb_articles(id) ON DELETE SET NULL,
  status kb_content_status NOT NULL DEFAULT 'draft',
  is_stale BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_key, screen_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_kb_field_help_component ON public.kb_field_help (module_key, screen_key, component_key);

-- ===== TABLE 3: kb_faqs =====
CREATE TABLE IF NOT EXISTS public.kb_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  screen_key TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  audience kb_audience DEFAULT 'all_users',
  related_field_key TEXT,
  related_article_id UUID REFERENCES public.kb_articles(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status kb_content_status NOT NULL DEFAULT 'draft',
  is_stale BOOLEAN NOT NULL DEFAULT false,
  search_vector tsvector,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_faqs_module_screen ON public.kb_faqs (module_key, screen_key);
CREATE INDEX IF NOT EXISTS idx_kb_faqs_search ON public.kb_faqs USING GIN (search_vector);

-- ===== TABLE 4: kb_process_guides =====
CREATE TABLE IF NOT EXISTS public.kb_process_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL,
  submodule_key TEXT,
  process_name TEXT NOT NULL,
  trigger_description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  roles_involved TEXT[] DEFAULT '{}',
  expected_outcome TEXT,
  estimated_duration TEXT,
  prerequisites TEXT[] DEFAULT '{}',
  related_article_ids UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  status kb_content_status NOT NULL DEFAULT 'draft',
  is_stale BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  search_vector tsvector,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_process_guides_module ON public.kb_process_guides (module_key);
CREATE INDEX IF NOT EXISTS idx_kb_process_guides_search ON public.kb_process_guides USING GIN (search_vector);

-- ===== TABLE 5: kb_release_notes =====
CREATE TABLE IF NOT EXISTS public.kb_release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version TEXT NOT NULL UNIQUE,
  release_date DATE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  change_details JSONB NOT NULL DEFAULT '[]',
  impacted_article_ids UUID[] DEFAULT '{}',
  impacted_field_help_ids UUID[] DEFAULT '{}',
  impacted_faq_ids UUID[] DEFAULT '{}',
  update_completed BOOLEAN NOT NULL DEFAULT false,
  status kb_content_status NOT NULL DEFAULT 'draft',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_release_notes_date ON public.kb_release_notes (release_date DESC);

-- ===== TABLE 6: kb_article_links =====
CREATE TABLE IF NOT EXISTS public.kb_article_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  link_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_links_source ON public.kb_article_links (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_kb_links_target ON public.kb_article_links (target_type, target_id);

-- ===== SEARCH VECTOR TRIGGERS =====

-- Articles search vector
CREATE OR REPLACE FUNCTION kb_articles_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.summary, '') || ' ' ||
    coalesce(NEW.content, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_kb_articles_search ON public.kb_articles;
CREATE TRIGGER trg_kb_articles_search
  BEFORE INSERT OR UPDATE OF title, summary, content
  ON public.kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION kb_articles_search_vector_trigger();

-- FAQs search vector
CREATE OR REPLACE FUNCTION kb_faqs_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.question, '') || ' ' ||
    coalesce(NEW.answer, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_kb_faqs_search ON public.kb_faqs;
CREATE TRIGGER trg_kb_faqs_search
  BEFORE INSERT OR UPDATE OF question, answer
  ON public.kb_faqs
  FOR EACH ROW
  EXECUTE FUNCTION kb_faqs_search_vector_trigger();

-- Process guides search vector
CREATE OR REPLACE FUNCTION kb_process_guides_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.process_name, '') || ' ' ||
    coalesce(NEW.trigger_description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_kb_process_guides_search ON public.kb_process_guides;
CREATE TRIGGER trg_kb_process_guides_search
  BEFORE INSERT OR UPDATE OF process_name, trigger_description
  ON public.kb_process_guides
  FOR EACH ROW
  EXECUTE FUNCTION kb_process_guides_search_vector_trigger();

-- ===== UPDATED_AT TRIGGERS =====
CREATE OR REPLACE FUNCTION kb_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_kb_articles_updated_at ON public.kb_articles;
CREATE TRIGGER trg_kb_articles_updated_at BEFORE UPDATE ON public.kb_articles FOR EACH ROW EXECUTE FUNCTION kb_update_updated_at();

DROP TRIGGER IF EXISTS trg_kb_field_help_updated_at ON public.kb_field_help;
CREATE TRIGGER trg_kb_field_help_updated_at BEFORE UPDATE ON public.kb_field_help FOR EACH ROW EXECUTE FUNCTION kb_update_updated_at();

DROP TRIGGER IF EXISTS trg_kb_faqs_updated_at ON public.kb_faqs;
CREATE TRIGGER trg_kb_faqs_updated_at BEFORE UPDATE ON public.kb_faqs FOR EACH ROW EXECUTE FUNCTION kb_update_updated_at();

DROP TRIGGER IF EXISTS trg_kb_process_guides_updated_at ON public.kb_process_guides;
CREATE TRIGGER trg_kb_process_guides_updated_at BEFORE UPDATE ON public.kb_process_guides FOR EACH ROW EXECUTE FUNCTION kb_update_updated_at();

DROP TRIGGER IF EXISTS trg_kb_release_notes_updated_at ON public.kb_release_notes;
CREATE TRIGGER trg_kb_release_notes_updated_at BEFORE UPDATE ON public.kb_release_notes FOR EACH ROW EXECUTE FUNCTION kb_update_updated_at();

-- ===== UNIFIED SEARCH FUNCTION =====
CREATE OR REPLACE FUNCTION public.kb_search(p_query TEXT, p_module TEXT DEFAULT NULL)
RETURNS TABLE (
  content_type TEXT,
  id UUID,
  title TEXT,
  summary TEXT,
  module_key TEXT,
  screen_key TEXT,
  rank REAL
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT 'article'::TEXT, a.id, a.title, a.summary, a.module_key, a.screen_key,
         ts_rank(a.search_vector, plainto_tsquery('english', p_query))::REAL as rank
  FROM public.kb_articles a
  WHERE a.search_vector @@ plainto_tsquery('english', p_query)
    AND a.status = 'published'
    AND (p_module IS NULL OR a.module_key = p_module)
  UNION ALL
  SELECT 'faq'::TEXT, f.id, f.question, f.answer, f.module_key, f.screen_key,
         ts_rank(f.search_vector, plainto_tsquery('english', p_query))::REAL as rank
  FROM public.kb_faqs f
  WHERE f.search_vector @@ plainto_tsquery('english', p_query)
    AND f.status = 'published'
    AND (p_module IS NULL OR f.module_key = p_module)
  UNION ALL
  SELECT 'process_guide'::TEXT, g.id, g.process_name, g.trigger_description, g.module_key, NULL::TEXT,
         ts_rank(g.search_vector, plainto_tsquery('english', p_query))::REAL as rank
  FROM public.kb_process_guides g
  WHERE g.search_vector @@ plainto_tsquery('english', p_query)
    AND g.status = 'published'
    AND (p_module IS NULL OR g.module_key = p_module)
  ORDER BY rank DESC
  LIMIT 50;
$$;
