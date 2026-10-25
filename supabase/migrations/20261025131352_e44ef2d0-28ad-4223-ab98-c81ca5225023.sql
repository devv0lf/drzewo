CREATE TABLE public.family_trees (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_trees TO authenticated;
GRANT ALL ON public.family_trees TO service_role;
ALTER TABLE public.family_trees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tree" ON public.family_trees FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.family_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  label text NOT NULL DEFAULT '',
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX family_backups_user_idx ON public.family_backups(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_backups TO authenticated;
GRANT ALL ON public.family_backups TO service_role;
ALTER TABLE public.family_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backups" ON public.family_backups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER family_trees_updated BEFORE UPDATE ON public.family_trees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();