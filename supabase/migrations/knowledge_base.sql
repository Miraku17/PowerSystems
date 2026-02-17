-- ============================================
-- Knowledge Base: Tables
-- ============================================

-- Articles table
CREATE TABLE knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('engine', 'pump')),
  kb_number SERIAL,
  kb_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  video_links JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  deleted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Article images table
CREATE TABLE knowledge_base_article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_kb_articles_category ON knowledge_base_articles(category);
CREATE INDEX idx_kb_articles_kb_code ON knowledge_base_articles(kb_code);
CREATE INDEX idx_kb_articles_deleted_at ON knowledge_base_articles(deleted_at);
CREATE INDEX idx_kb_article_images_article_id ON knowledge_base_article_images(article_id);

-- ============================================
-- Knowledge Base: Permissions
-- ============================================

-- Insert permission module entries
INSERT INTO permissions (module, action, description) VALUES
  ('knowledge_base', 'read', 'View knowledge base articles'),
  ('knowledge_base', 'write', 'Create knowledge base articles'),
  ('knowledge_base', 'edit', 'Edit knowledge base articles'),
  ('knowledge_base', 'delete', 'Delete knowledge base articles')
ON CONFLICT (module, action) DO NOTHING;

-- ============================================
-- Assign permissions to admin positions
-- (Adjust the position name to match your admin position)
-- ============================================

INSERT INTO position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM positions p
CROSS JOIN permissions perm
WHERE p.name = 'Super Admin'
  AND perm.module = 'knowledge_base';

-- ============================================
-- Storage bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the bucket
CREATE POLICY "Public read access for knowledge-base"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-base');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload for knowledge-base"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'knowledge-base');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated delete for knowledge-base"
ON storage.objects FOR DELETE
USING (bucket_id = 'knowledge-base');
