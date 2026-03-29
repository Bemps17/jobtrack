import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  readCandidaturesFromSupabase,
  writeCandidaturesToSupabase,
} from "@/server/candidatures-supabase";
import { isSupabaseConfigured } from "@/server/supabase-admin";

const DATA_FILE = path.join(process.cwd(), "data", "candidatures.json");

async function readCandidaturesFromFile(): Promise<unknown[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw e;
  }
}

async function writeCandidaturesToFile(list: unknown[]): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  await mkdir(dir, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(list, null, 2), "utf8");
}

export async function readCandidatures(
  clerkUserId?: string | null
): Promise<unknown[]> {
  if (isSupabaseConfigured()) {
    if (!clerkUserId) {
      throw new Error(
        "Lecture Supabase : identifiant Clerk requis (session utilisateur)."
      );
    }
    return readCandidaturesFromSupabase(clerkUserId);
  }
  return readCandidaturesFromFile();
}

export async function writeCandidatures(
  list: unknown[],
  clerkUserId?: string | null
): Promise<void> {
  if (isSupabaseConfigured()) {
    if (!clerkUserId) {
      throw new Error(
        "Écriture Supabase : identifiant Clerk requis (session utilisateur)."
      );
    }
    await writeCandidaturesToSupabase(list, clerkUserId);
    return;
  }
  await writeCandidaturesToFile(list);
}
