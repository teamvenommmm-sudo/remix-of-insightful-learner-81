
-- Cognitive History: track all cognitive type changes over time
CREATE TABLE public.cognitive_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cognitive_type TEXT NOT NULL,
  confidence_score DOUBLE PRECISION,
  stability_index DOUBLE PRECISION,
  stability_label TEXT,
  feature_vector JSONB,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cognitive_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cognitive history" ON public.cognitive_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all cognitive history" ON public.cognitive_history FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins can view all cognitive history" ON public.cognitive_history FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_cognitive_history_user ON public.cognitive_history(user_id, created_at DESC);

-- Prediction Logs: store shadow simulation predictions and actual outcomes
CREATE TABLE public.prediction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  session_id UUID NOT NULL,
  predicted_response_time_ms INTEGER,
  predicted_retry_probability DOUBLE PRECISION,
  predicted_error_probability DOUBLE PRECISION,
  predicted_mistake_type TEXT,
  predicted_hesitation_risk DOUBLE PRECISION,
  actual_response_time_ms INTEGER,
  actual_is_correct BOOLEAN,
  actual_retries INTEGER,
  deviation_score DOUBLE PRECISION,
  event_type TEXT, -- 'breakthrough', 'stress', 'shift', null
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prediction_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prediction logs" ON public.prediction_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prediction logs" ON public.prediction_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prediction logs" ON public.prediction_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all prediction logs" ON public.prediction_logs FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins can view all prediction logs" ON public.prediction_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_prediction_logs_user ON public.prediction_logs(user_id, created_at DESC);

-- Cognitive Events: breakthroughs, stress events, shifts
CREATE TABLE public.cognitive_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'breakthrough', 'stress', 'shift', 'fatigue'
  event_data JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cognitive_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cognitive events" ON public.cognitive_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cognitive events" ON public.cognitive_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers can view all cognitive events" ON public.cognitive_events FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins can view all cognitive events" ON public.cognitive_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_cognitive_events_user ON public.cognitive_events(user_id, created_at DESC);

-- Misconception Patterns: track common mistake clusters
CREATE TABLE public.misconception_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id UUID,
  misconception_type TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  example_questions JSONB DEFAULT '[]'::jsonb,
  confusion_cluster JSONB DEFAULT '[]'::jsonb,
  last_observed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.misconception_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own misconception patterns" ON public.misconception_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all misconception patterns" ON public.misconception_patterns FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins can view all misconception patterns" ON public.misconception_patterns FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_misconception_user ON public.misconception_patterns(user_id);

-- Energy Profiles: cognitive energy and fatigue tracking
CREATE TABLE public.energy_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  optimal_time_slots JSONB DEFAULT '[]'::jsonb,
  avg_session_fatigue_point_minutes INTEGER,
  accuracy_decay_rate DOUBLE PRECISION,
  best_performance_hour INTEGER,
  session_duration_recommendation_minutes INTEGER,
  energy_curve_data JSONB DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.energy_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own energy profile" ON public.energy_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own energy profile" ON public.energy_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own energy profile" ON public.energy_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all energy profiles" ON public.energy_profiles FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins can view all energy profiles" ON public.energy_profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Behavioral Fingerprint: unique cognitive DNA per student
CREATE TABLE public.behavioral_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  fingerprint_id TEXT NOT NULL,
  response_rhythm_pattern JSONB DEFAULT '{}'::jsonb,
  retry_timing_pattern JSONB DEFAULT '{}'::jsonb,
  error_clustering_behavior JSONB DEFAULT '{}'::jsonb,
  hesitation_burst_frequency DOUBLE PRECISION,
  speed_fluctuation_pattern JSONB DEFAULT '{}'::jsonb,
  signature_summary TEXT,
  cognitive_predictability_index DOUBLE PRECISION DEFAULT 50,
  cpi_label TEXT DEFAULT 'Moderate',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.behavioral_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own fingerprint" ON public.behavioral_fingerprints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own fingerprint" ON public.behavioral_fingerprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fingerprint" ON public.behavioral_fingerprints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view all fingerprints" ON public.behavioral_fingerprints FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins can view all fingerprints" ON public.behavioral_fingerprints FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
