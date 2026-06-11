
-- Profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Identidade
  display_name TEXT,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  age INT,
  city TEXT,
  state TEXT,
  -- Vida pessoal
  works BOOLEAN,
  has_children BOOLEAN,
  hours_per_day NUMERIC,
  routine_notes TEXT,
  -- Formação
  has_degree BOOLEAN,
  degree_name TEXT,
  degree_area TEXT,
  -- Objetivo / concurso
  target_concurso TEXT,
  concurso_area TEXT, -- militar | policial | tribunal | saude | fiscal | neutro
  exam_date DATE,
  level TEXT, -- iniciante | intermediario | avancado
  studied_before BOOLEAN,
  feeling TEXT,
  -- Preferências de experiência
  notifications_enabled BOOLEAN DEFAULT true,
  focus_mode BOOLEAN DEFAULT false,
  reminders_enabled BOOLEAN DEFAULT true,
  reviews_enabled BOOLEAN DEFAULT true,
  -- Estado
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
