-- JobTrack : corréler les candidatures à l’utilisateur Clerk + RLS (optionnel)
-- À exécuter dans Supabase → SQL Editor après backup si table déjà remplie.

-- 1) Colonne métier (id Clerk, ex. user_2abc...)
ALTER TABLE public.candidatures
  ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Index pour les listes par utilisateur
CREATE INDEX IF NOT EXISTS idx_candidatures_user_id ON public.candidatures (user_id);

-- 2) Renseigner les lignes existantes (UNE FOIS) : remplace par ton user_id Clerk réel
-- UPDATE public.candidatures SET user_id = 'user_XXXXX' WHERE user_id IS NULL;

-- 3) Quand toutes les lignes ont un user_id pertinent, passer en NOT NULL (optionnel)
-- ALTER TABLE public.candidatures ALTER COLUMN user_id SET NOT NULL;

-- ========== RLS avec JWT Clerk (intégration native Clerk ↔ Supabase) ==========
-- Prérequis : Dashboard Clerk → intégration Supabase activée
--            + Supabase → Authentication → Third-party → Clerk (domaine Clerk)
-- Ensuite les requêtes utilisent la clé anon + JWT session Clerk côté Next (`SUPABASE_USE_CLERK_JWT=true`).

ALTER TABLE public.candidatures ENABLE ROW LEVEL SECURITY;

-- Supprimer d’anciennes policies nommées si besoin :
-- DROP POLICY IF EXISTS "candidatures_select_own" ON public.candidatures;

CREATE POLICY "candidatures_select_own"
  ON public.candidatures FOR SELECT TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = (user_id)::text);

CREATE POLICY "candidatures_insert_own"
  ON public.candidatures FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt()->>'sub') = (user_id)::text);

CREATE POLICY "candidatures_update_own"
  ON public.candidatures FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = (user_id)::text)
  WITH CHECK ((SELECT auth.jwt()->>'sub') = (user_id)::text);

CREATE POLICY "candidatures_delete_own"
  ON public.candidatures FOR DELETE TO authenticated
  USING ((SELECT auth.jwt()->>'sub') = (user_id)::text);

-- Note : le rôle `service_role` contourne toujours RLS (non utilisé quand SUPABASE_USE_CLERK_JWT=true).
