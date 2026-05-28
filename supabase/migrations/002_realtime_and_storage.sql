-- ============================================================
-- 002_realtime_and_storage.sql
-- Enable Supabase Realtime on key tables
-- Set up Storage bucket for attachments
-- ============================================================

-- Enable Realtime on tickets, comments, notifications
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- ============================================================
-- STORAGE BUCKET
-- Create the attachments bucket (public=false → signed URLs)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  FALSE,
  10485760,   -- 10 MB per file
  ARRAY[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT DO NOTHING;

-- Storage RLS: tenant members can upload to their folder
CREATE POLICY "Tenant members can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::TEXT FROM tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::TEXT FROM tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Uploaders and admins can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] IN (
        SELECT tenant_id::TEXT FROM tenant_members
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );
