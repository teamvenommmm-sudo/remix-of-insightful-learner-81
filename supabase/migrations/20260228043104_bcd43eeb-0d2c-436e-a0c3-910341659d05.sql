
-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.cognitive_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cognitive_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_gamification;

-- System settings table for admin
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('risk_threshold', '{"value": 40}', 'Accuracy percentage below which a student is considered at-risk'),
  ('drift_sensitivity', '{"value": 15}', 'CSI point deduction per cognitive type change'),
  ('breakthrough_threshold', '{"value": 0.6}', 'Error probability above which a correct answer triggers breakthrough'),
  ('ai_model', '{"value": "google/gemini-3-flash-preview"}', 'AI model used for cognitive analysis'),
  ('session_fatigue_threshold', '{"value": 0.15}', 'Accuracy drop percentage to detect fatigue'),
  ('realtime_enabled', '{"value": true}', 'Enable real-time dashboard updates'),
  ('data_retention_days', '{"value": 365}', 'Days to retain detailed analytics data');

-- Unique constraint on energy_profiles for upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'energy_profiles_user_id_key') THEN
    ALTER TABLE public.energy_profiles ADD CONSTRAINT energy_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Unique constraint on behavioral_fingerprints for upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'behavioral_fingerprints_user_id_key') THEN
    ALTER TABLE public.behavioral_fingerprints ADD CONSTRAINT behavioral_fingerprints_user_id_key UNIQUE (user_id);
  END IF;
END $$;
