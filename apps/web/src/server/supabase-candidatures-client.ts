import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdmin } from "@/server/supabase-admin";
import {
  createSupabaseClerkServerClient,
  isSupabaseClerkJwtEnabled,
} from "@/server/supabase-clerk";

/** Client pour la table `candidatures` : service role (défaut) ou JWT Clerk si `SUPABASE_USE_CLERK_JWT=true`. */
export async function createSupabaseCandidaturesClient(): Promise<SupabaseClient> {
  if (isSupabaseClerkJwtEnabled()) {
    return createSupabaseClerkServerClient();
  }
  return createSupabaseAdmin();
}
