/**
 * Contournement auth **uniquement en dev local** : définir dans `.env.local` :
 * `JOBTRACK_DEV_BYPASS_AUTH=true`
 * Ne jamais activer en production (variable absente ou false).
 */
export function isJobtrackDevAuthBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.JOBTRACK_DEV_BYPASS_AUTH === "true"
  );
}

/** user_id factice pour fichier local / Supabase en mode bypass (données isolées du compte réel). */
export const JOBTRACK_DEV_DUMMY_USER_ID = "user_dev_local_jobtrack";
