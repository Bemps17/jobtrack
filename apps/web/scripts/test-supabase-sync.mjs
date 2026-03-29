/**
 * Test connexion + cycle écriture/lecture/suppression sur public.candidatures.
 * Charge apps/web/.env.local (et .env) sans dépendance supplémentaire.
 *
 * Usage : npm run test:supabase
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (let line of text.split(/\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv(path.join(root, ".env.local"));
loadDotEnv(path.join(root, ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error(
    "Définir NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans apps/web/.env.local (copier depuis .env.example)."
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const testId = `sync_test_${Date.now()}`;

async function main() {
  console.log("1) Count candidatures…");
  const { count, error: cErr } = await supabase
    .from("candidatures")
    .select("*", { count: "exact", head: true });
  if (cErr) throw cErr;
  console.log("   OK — lignes:", count ?? "?");

  console.log("2) Upsert ligne de test", testId);
  const now = new Date().toISOString();
  const row = {
    id: testId,
    company: "Sync Test Co",
    job_title: "Test Supabase",
    contract_type: "",
    location: "",
    work_mode: "",
    source: "",
    job_url: "",
    date_found: null,
    date_applied: null,
    status: "à envoyer",
    priority: "moyenne",
    salary: "",
    contact_name: "",
    contact_email: "",
    follow_up_date: null,
    notes: "jobtrack npm run test:supabase",
    created_at: now,
    updated_at: now,
  };
  const { error: uErr } = await supabase
    .from("candidatures")
    .upsert(row, { onConflict: "id" });
  if (uErr) throw uErr;
  console.log("   OK");

  console.log("3) Select par id…");
  const { data: one, error: gErr } = await supabase
    .from("candidatures")
    .select("id, company, job_title")
    .eq("id", testId)
    .single();
  if (gErr) throw gErr;
  console.log("   OK —", one);

  console.log("4) Delete ligne de test…");
  const { error: dErr } = await supabase
    .from("candidatures")
    .delete()
    .eq("id", testId);
  if (dErr) throw dErr;
  console.log("   OK");

  console.log("\nSupabase (service role + table candidatures) : OK.");
}

main().catch((e) => {
  console.error("Échec:", e.message || e);
  process.exit(1);
});
