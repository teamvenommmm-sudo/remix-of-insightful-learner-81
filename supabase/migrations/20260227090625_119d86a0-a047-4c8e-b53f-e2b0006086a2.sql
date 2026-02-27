
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  difficulty_level INT NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  hint TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session logs table
CREATE TABLE public.session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_questions_attempted INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  total_retries INT NOT NULL DEFAULT 0,
  session_duration_seconds INT,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL
);

-- Question attempts table
CREATE TABLE public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.session_logs(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  difficulty_level INT,
  response_time_ms INT,
  number_of_retries INT NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  hint_used BOOLEAN NOT NULL DEFAULT false,
  time_between_attempts_ms INT,
  abandonment_flag BOOLEAN NOT NULL DEFAULT false,
  selected_answer TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Topic performance table
CREATE TABLE public.topic_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  total_attempts INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  avg_response_time_ms FLOAT,
  avg_retries FLOAT,
  accuracy_rate FLOAT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

-- Cognitive profiles table
CREATE TABLE public.cognitive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cognitive_type TEXT NOT NULL DEFAULT 'Unclassified',
  confidence_score FLOAT,
  feature_vector JSONB,
  reasoning TEXT,
  previous_types JSONB DEFAULT '[]',
  last_evaluated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recommendations table
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cognitive_type TEXT,
  recommended_difficulty INT,
  focus_topics JSONB DEFAULT '[]',
  practice_type TEXT,
  time_limit_mode TEXT,
  review_schedule JSONB DEFAULT '{}',
  learning_strategy_summary TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance reports table
CREATE TABLE public.performance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'weekly',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  accuracy_trend JSONB DEFAULT '[]',
  response_time_trend JSONB DEFAULT '[]',
  improvement_percentage FLOAT,
  cognitive_type_at_time TEXT,
  retention_risk_score FLOAT,
  report_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reports ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cognitive_profiles_updated_at BEFORE UPDATE ON public.cognitive_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: users see own, teachers/admins see all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles: users see own, admins manage all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own role on signup" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Topics: everyone can read, teachers/admins can write
CREATE POLICY "Anyone authenticated can view topics" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create topics" ON public.topics FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can update topics" ON public.topics FOR UPDATE USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can delete topics" ON public.topics FOR DELETE USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Questions: everyone can read, teachers/admins can write
CREATE POLICY "Anyone authenticated can view questions" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create questions" ON public.questions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can update questions" ON public.questions FOR UPDATE USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can delete questions" ON public.questions FOR DELETE USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Session logs: users see own, teachers/admins see all
CREATE POLICY "Users can view own sessions" ON public.session_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.session_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.session_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all sessions" ON public.session_logs FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all sessions" ON public.session_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Question attempts: users see own, teachers/admins see all
CREATE POLICY "Users can view own attempts" ON public.question_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own attempts" ON public.question_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers can view all attempts" ON public.question_attempts FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all attempts" ON public.question_attempts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Topic performance: users see own, teachers/admins see all
CREATE POLICY "Users can view own topic performance" ON public.topic_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own topic performance" ON public.topic_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topic performance" ON public.topic_performance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all topic performance" ON public.topic_performance FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all topic performance" ON public.topic_performance FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Cognitive profiles: users see own, teachers/admins see all
CREATE POLICY "Users can view own cognitive profile" ON public.cognitive_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all cognitive profiles" ON public.cognitive_profiles FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all cognitive profiles" ON public.cognitive_profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Recommendations: users see own, teachers/admins see all
CREATE POLICY "Users can view own recommendations" ON public.recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all recommendations" ON public.recommendations FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all recommendations" ON public.recommendations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Performance reports: users see own, teachers/admins see all
CREATE POLICY "Users can view own reports" ON public.performance_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all reports" ON public.performance_reports FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all reports" ON public.performance_reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
