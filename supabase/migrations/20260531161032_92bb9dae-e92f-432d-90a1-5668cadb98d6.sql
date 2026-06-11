
-- ========== ROLES ==========
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- ========== PROFILES: extra policy for owners ==========
CREATE POLICY "Owners view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- ========== STUDY SESSIONS ==========
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own sessions select" ON public.study_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "users own sessions insert" ON public.study_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own sessions update" ON public.study_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "users own sessions delete" ON public.study_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER study_sessions_set_updated_at BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== QUESTION LOGS ==========
CREATE TABLE public.question_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  total INTEGER NOT NULL CHECK (total > 0),
  correct INTEGER NOT NULL DEFAULT 0 CHECK (correct >= 0),
  wrong INTEGER NOT NULL DEFAULT 0 CHECK (wrong >= 0),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_logs TO authenticated;
GRANT ALL ON public.question_logs TO service_role;
ALTER TABLE public.question_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own qlogs select" ON public.question_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "users own qlogs insert" ON public.question_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own qlogs delete" ON public.question_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ========== REVISIONS ==========
CREATE TABLE public.revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  due_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revisions TO authenticated;
GRANT ALL ON public.revisions TO service_role;
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own revs select" ON public.revisions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "users own revs insert" ON public.revisions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users own revs update" ON public.revisions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users own revs delete" ON public.revisions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER revisions_set_updated_at BEFORE UPDATE ON public.revisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== AVATARS BUCKET ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
