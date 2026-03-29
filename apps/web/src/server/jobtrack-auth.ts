import { auth } from "@clerk/nextjs/server";

import {
  isJobtrackDevAuthBypass,
  JOBTRACK_DEV_DUMMY_USER_ID,
} from "@/lib/dev-auth-bypass";

export async function getJobtrackClerkUserId(): Promise<string | null> {
  if (isJobtrackDevAuthBypass()) return JOBTRACK_DEV_DUMMY_USER_ID;
  const { userId } = await auth();
  return userId ?? null;
}
