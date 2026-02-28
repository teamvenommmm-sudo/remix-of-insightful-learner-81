
-- 1. Student gamification table
CREATE TABLE public.student_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  quizzes_completed integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification" ON public.student_gamification
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification" ON public.student_gamification
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification" ON public.student_gamification
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all gamification" ON public.student_gamification
  FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can view all gamification" ON public.student_gamification
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_student_gamification_updated_at
  BEFORE UPDATE ON public.student_gamification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Unique constraint on cognitive_profiles(user_id)
ALTER TABLE public.cognitive_profiles ADD CONSTRAINT cognitive_profiles_user_id_unique UNIQUE (user_id);

-- 3. Composite unique constraint on topic_performance(user_id, topic_id)
ALTER TABLE public.topic_performance ADD CONSTRAINT topic_performance_user_topic_unique UNIQUE (user_id, topic_id);
