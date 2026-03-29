"use client";

import {
  applyEnvoyeeTransitionRules,
  detectDuplicates,
  isRelanceDueOrFlagged,
  mapRow,
  mergeCandidatures,
  validateHeaders,
} from "@/lib/candidature-utils";
import { stripLeadingHashCommentLines } from "@/lib/csv-template-content";
import { buildSampleData, uid } from "@/lib/sample-data";
import type { Candidature, DuplicatePair, ListFilters } from "@/lib/types";
import Papa from "papaparse";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "./toast-context";

type CandidaturesContextValue = {
  candidatures: Candidature[];
  loading: boolean;
  filters: ListFilters;
  setFilters: (patch: Partial<ListFilters>) => void;
  pendingImport: Candidature[];
  duplicates: DuplicatePair[];
  relanceCount: number;
  load: () => Promise<void>;
  addCandidature: (data: Omit<Candidature, "id" | "_createdAt">) => Promise<void>;
  updateCandidature: (id: string, data: Partial<Candidature>) => Promise<void>;
  deleteCandidature: (id: string) => Promise<void>;
  finalizeImport: () => Promise<void>;
  resolveDuplicate: (index: number, action: "skip" | "replace" | "merge") => Promise<void>;
  resolveAllDuplicates: (action: "skip" | "replace" | "merge") => Promise<void>;
  prepareCsvImport: (file: File) => Promise<{
    total: number;
    valid: Candidature[];
    errors: string[];
    dupCount: number;
    newCount: number;
  }>;
  prepareJsonImport: (raw: unknown) => Promise<{
    total: number;
    valid: Candidature[];
    errors: string[];
    dupCount: number;
    newCount: number;
  }>;
  /** Lignes déjà mappées (ex. extraction IA une ligne CSV). */
  prepareImportFromParsed: (rows: Candidature[]) => {
    total: number;
    valid: Candidature[];
    errors: string[];
    dupCount: number;
    newCount: number;
  };
  clearImportArtifacts: () => void;
  setPendingAndDuplicates: (pending: Candidature[], dups: DuplicatePair[]) => void;
};

const CandidaturesContext =
  createContext<CandidaturesContextValue | null>(null);

const defaultFilters: ListFilters = {
  search: "",
  status: "",
  contract: "",
  priority: "",
  sort: "date_desc",
};

async function persistList(list: Candidature[], show: (m: string, t?: "error") => void) {
  try {
    const r = await fetch("/api/candidatures", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    });
    if (!r.ok) {
      const text = await r.text();
      let msg = text;
      try {
        const j = JSON.parse(text) as { details?: string; error?: string };
        if (j.details) msg = j.details;
        else if (j.error) msg = j.error;
      } catch {
        /* text brut */
      }
      throw new Error(msg);
    }
  } catch (e) {
    console.error(e);
    const msg =
      e instanceof Error && e.message
        ? e.message
        : "Sauvegarde serveur impossible.";
    show(
      msg.length > 180 ? `${msg.slice(0, 177)}…` : msg,
      "error"
    );
  }
}

export function CandidaturesProvider({ children }: { children: ReactNode }) {
  const { show } = useToast();
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFiltersState] = useState<ListFilters>(defaultFilters);
  const [pendingImport, setPendingImport] = useState<Candidature[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const candidaturesRef = useRef(candidatures);
  candidaturesRef.current = candidatures;
  const pendingImportRef = useRef(pendingImport);
  pendingImportRef.current = pendingImport;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/candidatures");
      if (!r.ok) throw new Error(r.statusText);
      const data = (await r.json()) as unknown;
      if (!Array.isArray(data)) throw new Error("Réponse invalide");
      if (data.length === 0) {
        const seed = buildSampleData();
        setCandidatures(seed);
        await persistList(seed, show);
      } else {
        setCandidatures(data as Candidature[]);
      }
    } catch (e) {
      console.warn(e);
      const seed = buildSampleData();
      setCandidatures(seed);
      show("API indisponible — données de démo (non sauvegardées).", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilters = useCallback((patch: Partial<ListFilters>) => {
    setFiltersState((f) => ({ ...f, ...patch }));
  }, []);

  const relanceCount = candidatures.filter((c) => isRelanceDueOrFlagged(c)).length;

  const addCandidature = useCallback(
    async (data: Omit<Candidature, "id" | "_createdAt">) => {
      const draft: Candidature = {
        ...data,
        id: uid(),
        _createdAt: new Date().toISOString(),
      };
      const row = applyEnvoyeeTransitionRules(null, draft);
      const next = [row, ...candidaturesRef.current];
      setCandidatures(next);
      show("Candidature ajoutée ✓");
      await persistList(next, show);
    },
    [show]
  );

  const updateCandidature = useCallback(
    async (id: string, data: Partial<Candidature>) => {
      const next = candidaturesRef.current.map((c) => {
        if (c.id !== id) return c;
        const merged = { ...c, ...data };
        return applyEnvoyeeTransitionRules(c, merged);
      });
      setCandidatures(next);
      show("Candidature mise à jour ✓");
      await persistList(next, show);
    },
    [show]
  );

  const deleteCandidature = useCallback(
    async (id: string) => {
      const next = candidaturesRef.current.filter((c) => c.id !== id);
      setCandidatures(next);
      show("Candidature supprimée");
      await persistList(next, show);
    },
    [show]
  );

  const finalizeImport = useCallback(async () => {
    const pending = pendingImportRef.current;
    let next = candidaturesRef.current;
    if (pending.length > 0) {
      next = [...next, ...pending];
      setCandidatures(next);
      show(`${pending.length} candidature(s) importée(s) ✓`);
    }
    setPendingImport([]);
    setDuplicates([]);
    await persistList(next, show);
  }, [show]);

  const resolveDuplicate = useCallback(
    async (index: number, action: "skip" | "replace" | "merge") => {
      const dup = duplicates[index];
      if (!dup) return;

      const list = [...candidaturesRef.current];
      if (action === "replace") {
        const idx = list.findIndex((c) => c.id === dup.existing.id);
        if (idx !== -1) {
          list[idx] = {
            ...dup.imported,
            id: dup.existing.id,
            _createdAt: dup.existing._createdAt,
          };
        }
        show("Candidature remplacée ✓");
      } else if (action === "merge") {
        const mergeIdx = list.findIndex((c) => c.id === dup.existing.id);
        if (mergeIdx !== -1) {
          list[mergeIdx] = mergeCandidatures(dup.existing, dup.imported);
        }
        show("Candidatures fusionnées ✓");
      }

      const newDups = duplicates.filter((_, i) => i !== index);
      setCandidatures(list);
      setDuplicates(newDups);
      await persistList(list, show);

      if (newDups.length === 0) {
        const pending = pendingImportRef.current;
        let merged = list;
        if (pending.length > 0) {
          merged = [...list, ...pending];
          setCandidatures(merged);
          show(`${pending.length} candidature(s) importée(s) ✓`);
        }
        setPendingImport([]);
        setDuplicates([]);
        await persistList(merged, show);
      }
    },
    [duplicates, show]
  );

  const resolveAllDuplicates = useCallback(
    async (action: "skip" | "replace" | "merge") => {
      let dups = [...duplicates];
      const list = [...candidaturesRef.current];
      while (dups.length > 0) {
        const dup = dups[0];
        if (action === "replace") {
          const idx = list.findIndex((c) => c.id === dup.existing.id);
          if (idx !== -1) {
            list[idx] = {
              ...dup.imported,
              id: dup.existing.id,
              _createdAt: dup.existing._createdAt,
            };
          }
        } else if (action === "merge") {
          const mergeIdx = list.findIndex((c) => c.id === dup.existing.id);
          if (mergeIdx !== -1) {
            list[mergeIdx] = mergeCandidatures(dup.existing, dup.imported);
          }
        }
        dups = dups.slice(1);
      }
      setDuplicates([]);
      setCandidatures(list);
      const pending = pendingImportRef.current;
      let merged = list;
      if (pending.length > 0) {
        merged = [...list, ...pending];
        setCandidatures(merged);
        show(`${pending.length} candidature(s) importée(s) ✓`);
      }
      setPendingImport([]);
      await persistList(merged, show);
      if (action !== "skip") show("Doublons traités ✓");
    },
    [duplicates, show]
  );

  const prepareCsvImport = useCallback(async (file: File) => {
    let csvText: string;
    try {
      csvText = stripLeadingHashCommentLines(await file.text());
    } catch {
      show("Lecture du fichier impossible.", "error");
      return {
        total: 0,
        valid: [],
        errors: [],
        dupCount: 0,
        newCount: 0,
      };
    }
    if (!csvText.trim()) {
      show("CSV vide ou uniquement des lignes commentaires (#).", "error");
      return {
        total: 0,
        valid: [],
        errors: [],
        dupCount: 0,
        newCount: 0,
      };
    }

    const parsed = await new Promise<{
      valid: Candidature[];
      errors: string[];
      total: number;
    }>((resolve, reject) => {
      Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete(results) {
          const { ok, missing } = validateHeaders(results.meta.fields ?? []);
          if (!ok) {
            reject(new Error(`Colonnes manquantes : ${missing.join(", ")}`));
            return;
          }
          const valid: Candidature[] = [];
          const errors: string[] = [];
          results.data.forEach((row, i) => {
            const { data, error } = mapRow(row as Record<string, unknown>, i + 2);
            if (data) valid.push(data);
            if (error) errors.push(error);
          });
          resolve({ valid, errors, total: results.data.length });
        },
        error: (err: Error) => reject(new Error(err.message)),
      });
    });

    const { duplicates: dups, newItems } = detectDuplicates(
      candidaturesRef.current,
      parsed.valid
    );
    setPendingImport(newItems);
    setDuplicates(dups);
    return {
      total: parsed.total,
      valid: parsed.valid,
      errors: parsed.errors,
      dupCount: dups.length,
      newCount: newItems.length,
    };
  }, [show]);

  const prepareJsonImport = useCallback(
    async (raw: unknown) => {
      if (!Array.isArray(raw)) {
        show("Le JSON doit être un tableau d’objets.", "error");
        return {
          total: 0,
          valid: [] as Candidature[],
          errors: [] as string[],
          dupCount: 0,
          newCount: 0,
        };
      }
      const valid: Candidature[] = [];
      const errors: string[] = [];
      raw.forEach((item, i) => {
        if (!item || typeof item !== "object") {
          errors.push(`Entrée ${i + 1} : objet attendu.`);
          return;
        }
        const { data, error } = mapRow(item as Record<string, unknown>, i + 1);
        if (data) valid.push(data);
        if (error) errors.push(error);
      });
      const { duplicates: dups, newItems } = detectDuplicates(
        candidaturesRef.current,
        valid
      );
      setPendingImport(newItems);
      setDuplicates(dups);
      return {
        total: raw.length,
        valid,
        errors,
        dupCount: dups.length,
        newCount: newItems.length,
      };
    },
    [show]
  );

  const prepareImportFromParsed = useCallback((rows: Candidature[]) => {
    const { duplicates: dups, newItems } = detectDuplicates(
      candidaturesRef.current,
      rows
    );
    setPendingImport(newItems);
    setDuplicates(dups);
    return {
      total: rows.length,
      valid: rows,
      errors: [] as string[],
      dupCount: dups.length,
      newCount: newItems.length,
    };
  }, []);

  const clearImportArtifacts = useCallback(() => {
    setPendingImport([]);
    setDuplicates([]);
  }, []);

  const setPendingAndDuplicates = useCallback(
    (pending: Candidature[], dups: DuplicatePair[]) => {
      setPendingImport(pending);
      setDuplicates(dups);
    },
    []
  );

  const value: CandidaturesContextValue = {
    candidatures,
    loading,
    filters,
    setFilters,
    pendingImport,
    duplicates,
    relanceCount,
    load,
    addCandidature,
    updateCandidature,
    deleteCandidature,
    finalizeImport,
    resolveDuplicate,
    resolveAllDuplicates,
    prepareCsvImport,
    prepareJsonImport,
    prepareImportFromParsed,
    clearImportArtifacts,
    setPendingAndDuplicates,
  };

  return (
    <CandidaturesContext.Provider value={value}>
      {children}
    </CandidaturesContext.Provider>
  );
}

export function useCandidatures() {
  const c = useContext(CandidaturesContext);
  if (!c) throw new Error("useCandidatures dans CandidaturesProvider");
  return c;
}
