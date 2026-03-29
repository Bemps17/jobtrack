import type { Candidature } from "@/lib/types";
import { createSupabaseCandidaturesClient } from "@/server/supabase-candidatures-client";
import { useClerkJwtForSupabase } from "@/server/supabase-clerk";

type DbRow = {
  id: string;
  user_id: string | null;
  company: string;
  job_title: string;
  contract_type: string | null;
  location: string | null;
  work_mode: string | null;
  source: string | null;
  job_url: string | null;
  date_found: string | null;
  date_applied: string | null;
  status: string | null;
  priority: string | null;
  salary: string | null;
  contact_name: string | null;
  contact_email: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const CHUNK = 200;

function dateToStr(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v);
  return s.includes("T") ? (s.split("T")[0] ?? "") : s;
}

function rowToCandidature(r: DbRow): Candidature {
  return {
    id: r.id,
    company: r.company,
    job_title: r.job_title,
    contract_type: r.contract_type ?? "",
    location: r.location ?? "",
    work_mode: r.work_mode ?? "",
    source: r.source ?? "",
    job_url: r.job_url ?? "",
    date_found: dateToStr(r.date_found),
    date_applied: dateToStr(r.date_applied),
    status: r.status ?? "à envoyer",
    priority: r.priority ?? "moyenne",
    salary: r.salary ?? "",
    contact_name: r.contact_name ?? "",
    contact_email: r.contact_email ?? "",
    follow_up_date: dateToStr(r.follow_up_date),
    notes: r.notes ?? "",
    _createdAt: new Date(r.created_at).toISOString(),
    _updatedAt: r.updated_at
      ? new Date(r.updated_at).toISOString()
      : undefined,
  };
}

/** Valeurs acceptées par PostgreSQL DATE ; sinon null (évite erreurs d’upsert). */
function toPgDate(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function safeTimestamptz(iso: string, fallback: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toISOString();
}

function candidatureToRow(c: Candidature, clerkUserId: string): DbRow {
  const now = new Date().toISOString();
  const created = safeTimestamptz(c._createdAt || now, now);
  const updated = safeTimestamptz(c._updatedAt || c._createdAt || now, created);
  return {
    id: c.id,
    user_id: clerkUserId,
    company: c.company,
    job_title: c.job_title,
    contract_type: c.contract_type || null,
    location: c.location || null,
    work_mode: c.work_mode || null,
    source: c.source || null,
    job_url: c.job_url || null,
    date_found: toPgDate(c.date_found),
    date_applied: toPgDate(c.date_applied),
    status: c.status || null,
    priority: c.priority || null,
    salary: c.salary || null,
    contact_name: c.contact_name || null,
    contact_email: c.contact_email || null,
    follow_up_date: toPgDate(c.follow_up_date),
    notes: c.notes || null,
    created_at: created,
    updated_at: updated,
  };
}

function normalizeIncoming(c: unknown): Candidature {
  const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  return {
    id: String(o.id ?? ""),
    company: String(o.company ?? ""),
    job_title: String(o.job_title ?? ""),
    contract_type: String(o.contract_type ?? ""),
    location: String(o.location ?? ""),
    work_mode: String(o.work_mode ?? ""),
    source: String(o.source ?? ""),
    job_url: String(o.job_url ?? ""),
    date_found: String(o.date_found ?? ""),
    date_applied: String(o.date_applied ?? ""),
    status: String(o.status ?? "à envoyer"),
    priority: String(o.priority ?? "moyenne"),
    salary: String(o.salary ?? ""),
    contact_name: String(o.contact_name ?? ""),
    contact_email: String(o.contact_email ?? ""),
    follow_up_date: String(o.follow_up_date ?? ""),
    notes: String(o.notes ?? ""),
    _createdAt: String(o._createdAt ?? now),
    _updatedAt:
      o._updatedAt != null && o._updatedAt !== ""
        ? String(o._updatedAt)
        : undefined,
  };
}

export async function readCandidaturesFromSupabase(
  clerkUserId: string
): Promise<Candidature[]> {
  const supabase = await createSupabaseCandidaturesClient();
  let q = supabase
    .from("candidatures")
    .select("*")
    .order("created_at", { ascending: true });
  if (!useClerkJwtForSupabase()) {
    q = q.eq("user_id", clerkUserId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(rowToCandidature);
}

export async function writeCandidaturesToSupabase(
  list: unknown[],
  clerkUserId: string
): Promise<void> {
  const supabase = await createSupabaseCandidaturesClient();
  const rows = list.map((item) =>
    candidatureToRow(normalizeIncoming(item), clerkUserId)
  );
  for (const r of rows) {
    if (!r.id.trim()) {
      throw new Error("Une candidature a un id vide (sauvegarde annulée).");
    }
    if (!r.company.trim() || !r.job_title.trim()) {
      throw new Error(
        `Candidature « ${r.id} » : company et job_title sont obligatoires en base.`
      );
    }
  }

  if (rows.length === 0) {
    let sel = supabase.from("candidatures").select("id");
    if (!useClerkJwtForSupabase()) {
      sel = sel.eq("user_id", clerkUserId);
    }
    const { data: existing, error: selErr } = await sel;
    if (selErr) throw selErr;
    const ids = (existing ?? []).map((r) => String((r as { id: string }).id));
    if (ids.length > 0) {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        let del = supabase.from("candidatures").delete().in("id", chunk);
        if (!useClerkJwtForSupabase()) {
          del = del.eq("user_id", clerkUserId);
        }
        const { error: delErr } = await del;
        if (delErr) throw delErr;
      }
    }
    return;
  }

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("candidatures")
      .upsert(chunk, { onConflict: "id" });
    if (error) throw error;
  }

  const wanted = new Set(rows.map((r) => r.id));
  let sel2 = supabase.from("candidatures").select("id");
  if (!useClerkJwtForSupabase()) {
    sel2 = sel2.eq("user_id", clerkUserId);
  }
  const { data: existing, error: selErr } = await sel2;
  if (selErr) throw selErr;
  const toDelete = (existing ?? [])
    .map((r) => String((r as { id: string }).id))
    .filter((id) => !wanted.has(id));
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const chunk = toDelete.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    let del2 = supabase.from("candidatures").delete().in("id", chunk);
    if (!useClerkJwtForSupabase()) {
      del2 = del2.eq("user_id", clerkUserId);
    }
    const { error: delErr } = await del2;
    if (delErr) throw delErr;
  }
}
