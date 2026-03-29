import { mapRow } from "./candidature-utils";
import { CSV_COLUMNS } from "./constants";
import type { Candidature } from "./types";
import Papa from "papaparse";

export function exportCandidaturesCsv(candidatures: Candidature[]): string {
  const rows = candidatures.map((c) => {
    const o: Record<string, string> = {};
    for (const col of CSV_COLUMNS) {
      o[col] = String((c as Record<string, unknown>)[col] ?? "");
    }
    return o;
  });
  return Papa.unparse(rows, { columns: [...CSV_COLUMNS] });
}

export function exportCandidaturesJson(candidatures: Candidature[]): string {
  return JSON.stringify(candidatures, null, 2);
}

/** Extrait une ligne de données CSV depuis la réponse du modèle (ignore fences markdown). */
/** Parse une seule ligne de données CSV (sans en-tête) avec les colonnes JobTrack. */
export function parseSingleCsvDataLine(line: string): {
  data: Candidature | null;
  error: string | null;
} {
  const trimmed = line.trim();
  if (!trimmed) return { data: null, error: "Ligne vide." };
  const csv = `${CSV_COLUMNS.join(",")}\n${trimmed}`;
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  const row = parsed.data[0];
  if (!row) return { data: null, error: "Ligne non analysable." };
  return mapRow(row as Record<string, unknown>, 1);
}

/** Retire les blocs markdown ``` ... ``` (plusieurs passes). */
export function stripGroqMarkdownFences(raw: string): string {
  let t = raw.trim();
  for (let i = 0; i < 5; i++) {
    const m = /^```(?:csv|text)?\s*([\s\S]*?)```/im.exec(t);
    if (!m) break;
    t = m[1].trim();
  }
  return t;
}

function looksLikeProseLine(line: string): boolean {
  const s = line.trim();
  if (s.length < 8) return true;
  if (/^#+\s/.test(s)) return true;
  if (/^(voici|excellent|basé|text|je |j'|pour |l'|total|offres|page|étape|étapes|maintenant|analyse|prompt)/i.test(s))
    return true;
  if (/^[\d]+\s+étapes?\s+termin/i.test(s)) return true;
  const commas = (s.match(/,/g) ?? []).length;
  return commas < 5;
}

/**
 * Détecte un bloc CSV (une ou plusieurs lignes de données) dans la réponse
 * du modèle ; ajoute l'en-tête JobTrack pour réutiliser prepareCsvImport.
 */
export function parseGroqCsvBlock(raw: string): {
  csvWithHeader: string;
  rowCount: number;
} | null {
  const t = stripGroqMarkdownFences(raw);
  const lines = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const header = CSV_COLUMNS.join(",");
  const normHeader = (s: string) => s.replace(/\s/g, "").toLowerCase();

  let dataLines = lines.filter((l) => !l.startsWith("#"));
  dataLines = dataLines.filter((l) => !looksLikeProseLine(l));

  if (dataLines.length > 0 && normHeader(dataLines[0]!) === normHeader(header)) {
    dataLines = dataLines.slice(1);
  }

  dataLines = dataLines.filter((l) => !looksLikeProseLine(l));
  dataLines = dataLines.filter((l) => (l.match(/,/g) ?? []).length >= 5);

  if (dataLines.length === 0) return null;

  const csvWithHeader = `${header}\n${dataLines.join("\n")}`;
  return { csvWithHeader, rowCount: dataLines.length };
}

/**
 * Extrait la meilleure ligne CSV « une offre » : essaie les lignes du bas vers le haut
 * jusqu'à ce que parseSingleCsvDataLine réussisse.
 */
export function extractCsvDataLineFromAiResponse(raw: string): string {
  const t = stripGroqMarkdownFences(raw);
  const lines = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (looksLikeProseLine(line)) continue;
    const { data, error } = parseSingleCsvDataLine(line);
    if (data && !error) return line;
  }

  const nonProse = lines.filter((l) => !looksLikeProseLine(l));
  return nonProse[nonProse.length - 1] ?? lines[lines.length - 1] ?? t;
}
