-- Add avatar_url to employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Note: Create a public storage bucket named 'avatars' in Supabase UI (or via SQL) and allow authenticated users to upload.
-- Example storage policy (run in Storage Policies, not here):
--   Bucket: avatars
--   Policy: "Authenticated users can upload/read"
--   For "Object" with checks like:
--     (auth.role() = 'authenticated')
--   and SELECT for anon if you want public access to images.
