import { DEFAULTS, ENUM_VALUES, PIPELINE_STATUSES } from "./constants";
import type { Candidature, DuplicatePair, ListFilters } from "./types";
import { uid } from "./sample-data";

export function norm(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function badgeClass(status: string): string {
  const map: Record<string, string> = {
    "à envoyer": "badge-envoyer",
    envoyée: "badge-envoyee",
    "relance à faire": "badge-relance",
    "entretien rh": "badge-entretien",
    "entretien technique": "badge-entretien",
    "test technique": "badge-entretien",
    "en attente": "badge-attente",
    refusée: "badge-refuse",
    "offre reçue": "badge-offre",
    acceptée: "badge-offre",
  };
  return map[norm(status)] ?? "badge-default";
}

export function isDuplicate(c1: Candidature, c2: Candidature): boolean {
  const company1 = norm(c1.company);
  const company2 = norm(c2.company);
  const job1 = norm(c1.job_title);
  const job2 = norm(c2.job_title);

  if (company1 === company2 && company1 !== "") {
    if (job1 === job2) return true;
    const words1 = job1.split(/\s+/).filter((w) => w.length > 2);
    const words2 = job2.split(/\s+/).filter((w) => w.length > 2);
    const common = words1.filter((w) => words2.includes(w));
    if (common.length >= 2) return true;
  }
  return false;
}

export function mergeCandidatures(
  existing: Candidature,
  imported: Candidature
): Candidature {
  return {
    ...existing,
    ...Object.fromEntries(
      Object.entries(imported).filter(
        ([k, v]) =>
          v &&
          v !== "" &&
          k !== "id" &&
          k !== "_createdAt"
      )
    ),
    date_applied: imported.date_applied || existing.date_applied,
    notes: [existing.notes, imported.notes].filter(Boolean).join("\n\n---\n\n"),
    _updatedAt: new Date().toISOString(),
  } as Candidature;
}

export function getFiltered(
  candidatures: Candidature[],
  f: ListFilters
): Candidature[] {
  const list = candidatures.filter((c) => {
    if (f.search) {
      const q = norm(f.search);
      if (
        !norm(c.company).includes(q) &&
        !norm(c.job_title).includes(q)
      ) {
        return false;
      }
    }
    if (f.status && norm(c.status) !== norm(f.status)) return false;
    if (f.contract && norm(c.contract_type) !== norm(f.contract))
      return false;
    if (f.priority && norm(c.priority) !== norm(f.priority)) return false;
    return true;
  });

  switch (f.sort) {
    case "date_asc":
      list.sort((a, b) =>
        (a._createdAt ?? "").localeCompare(b._createdAt ?? "")
      );
      break;
    case "company":
      list.sort((a, b) => norm(a.company).localeCompare(norm(b.company)));
      break;
    case "priority": {
      const order: Record<string, number> = {
        haute: 0,
        moyenne: 1,
        basse: 2,
      };
      list.sort(
        (a, b) =>
          (order[norm(a.priority)] ?? 2) - (order[norm(b.priority)] ?? 2)
      );
      break;
    }
    default:
      list.sort((a, b) =>
        (b._createdAt ?? "").localeCompare(a._createdAt ?? "")
      );
  }
  return list;
}

export function detectDuplicates(
  candidatures: Candidature[],
  imported: Candidature[]
): { duplicates: DuplicatePair[]; newItems: Candidature[] } {
  const duplicates: DuplicatePair[] = [];
  const newItems: Candidature[] = [];

  imported.forEach((item) => {
    const existing = candidatures.find((c) => isDuplicate(c, item));
    if (existing) duplicates.push({ imported: item, existing });
    else newItems.push(item);
  });

  return { duplicates, newItems };
}

function mapEnum(field: keyof typeof ENUM_VALUES, value: string): string {
  if (!value) return (DEFAULTS as Record<string, string>)[field] ?? "";
  const allowed = ENUM_VALUES[field] as readonly string[];
  const match = allowed.find((a) => a === norm(value));
  return match !== undefined ? (match || value) : value;
}

export function mapRow(
  raw: Record<string, unknown>,
  lineNum: number
): { data: Candidature | null; error: string | null } {
  const get = (key: string) => String(raw[key] ?? "").trim();
  const company = get("company");
  const job_title = get("job_title");
  if (!company)
    return { data: null, error: `Ligne ${lineNum} : "company" vide.` };
  if (!job_title)
    return { data: null, error: `Ligne ${lineNum} : "job_title" vide.` };

  const data: Candidature = {
    id: uid(),
    company,
    job_title,
    contract_type: mapEnum("contract_type", get("contract_type")),
    location: get("location"),
    work_mode: mapEnum("work_mode", get("work_mode")),
    source: get("source"),
    job_url: get("job_url"),
    date_found: get("date_found"),
    date_applied: get("date_applied"),
    status:
      mapEnum("status", get("status")) || DEFAULTS.status,
    priority:
      mapEnum("priority", get("priority")) || DEFAULTS.priority,
    salary: get("salary"),
    contact_name: get("contact_name"),
    contact_email: get("contact_email"),
    follow_up_date: get("follow_up_date"),
    notes: get("notes"),
    _createdAt: new Date().toISOString(),
  };
  return { data, error: null };
}

export function validateHeaders(headers: string[]): {
  ok: boolean;
  missing: string[];
} {
  const required = ["company", "job_title"];
  const normalized = headers.map(norm);
  const missing = required.filter((r) => !normalized.includes(r));
  return { ok: missing.length === 0, missing };
}

export { PIPELINE_STATUSES };
