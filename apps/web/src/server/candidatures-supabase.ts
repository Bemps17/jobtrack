import type { Candidature } from "@/lib/types";
import { createSupabaseAdmin } from "@/server/supabase-admin";

type DbRow = {
  id: string;
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

function emptyToNull(s: string): string | null {
  return s.trim() === "" ? null : s;
}

function candidatureToRow(c: Candidature): DbRow {
  const now = new Date().toISOString();
  return {
    id: c.id,
    company: c.company,
    job_title: c.job_title,
    contract_type: c.contract_type || null,
    location: c.location || null,
    work_mode: c.work_mode || null,
    source: c.source || null,
    job_url: c.job_url || null,
    date_found: emptyToNull(c.date_found),
    date_applied: emptyToNull(c.date_applied),
    status: c.status || null,
    priority: c.priority || null,
    salary: c.salary || null,
    contact_name: c.contact_name || null,
    contact_email: c.contact_email || null,
    follow_up_date: emptyToNull(c.follow_up_date),
    notes: c.notes || null,
    created_at: c._createdAt || now,
    updated_at: c._updatedAt || c._createdAt || now,
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

export async function readCandidaturesFromSupabase(): Promise<Candidature[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("candidatures")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(rowToCandidature);
}

export async function writeCandidaturesToSupabase(
  list: unknown[]
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const rows = list.map((item) => candidatureToRow(normalizeIncoming(item)));

  if (rows.length === 0) {
    const { data: existing, error: selErr } = await supabase
      .from("candidatures")
      .select("id");
    if (selErr) throw selErr;
    const ids = (existing ?? []).map((r) => String((r as { id: string }).id));
    if (ids.length > 0) {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { error: delErr } = await supabase
          .from("candidatures")
          .delete()
          .in("id", chunk);
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
  const { data: existing, error: selErr } = await supabase
    .from("candidatures")
    .select("id");
  if (selErr) throw selErr;
  const toDelete = (existing ?? [])
    .map((r) => String((r as { id: string }).id))
    .filter((id) => !wanted.has(id));
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const chunk = toDelete.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    const { error: delErr } = await supabase
      .from("candidatures")
      .delete()
      .in("id", chunk);
    if (delErr) throw delErr;
  }
}
