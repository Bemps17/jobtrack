import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase avec JWT Clerk (clé anon + RLS).
 * Les politiques utilisent typiquement `auth.jwt()->>'sub'` = colonne `user_id`.
 *
 * Deux sources de token :
 * - **Par défaut** : `getToken()` — session Clerk (intégration native Clerk ↔ Supabase).
 * - **Optionnel** : `CLERK_SUPABASE_JWT_TEMPLATE=supabase` → `getToken({ template: 'supabase' })`
 *   si tu utilises un JWT template dédié dans le dashboard Clerk.
 *
 * @see https://clerk.com/docs/integrations/databases/supabase
 */
export function useClerkJwtForSupabase(): boolean {
  return process.env.SUPABASE_USE_CLERK_JWT === "true";
}

export async function createSupabaseClerkServerClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    throw new Error(
      "Supabase + Clerk JWT : définir NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  const { getToken } = await auth();
  const jwtTemplate = process.env.CLERK_SUPABASE_JWT_TEMPLATE?.trim();
  return createClient(url, anon, {
    async accessToken() {
      const token = jwtTemplate
        ? await getToken({ template: jwtTemplate })
        : await getToken();
      return token ?? null;
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
