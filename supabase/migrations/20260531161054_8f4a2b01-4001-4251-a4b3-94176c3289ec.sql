
-- Restrict has_role execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Tighten avatar listing: replace broad SELECT with name-prefix scoped policy
DROP POLICY IF EXISTS "Avatar images public read" ON storage.objects;
CREATE POLICY "Avatar images public read by name" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IS NOT NULL
  );
