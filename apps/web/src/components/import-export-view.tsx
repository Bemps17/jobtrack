"use client";

import { useCandidatures } from "@/context/candidatures-context";
import { useShellModals } from "@/context/shell-modals-context";
import { useToast } from "@/context/toast-context";
import {
  exportCandidaturesCsv,
  exportCandidaturesJson,
  extractCsvDataLineFromAiResponse,
  parseGroqCsvBlock,
  parseSingleCsvDataLine,
} from "@/lib/export-import-data";
import {
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_SYSTEM_PROMPT,
  GROQ_DEFAULT_MAX_TOKENS_BATCH,
  GROQ_DEFAULT_MAX_TOKENS_SINGLE,
  GROQ_MODEL_SUGGESTIONS,
  GROQ_SYSTEM_PROMPT_BATCH,
} from "@/lib/groq-prompt-defaults";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsvTemplate } from "@/lib/csv-template";
import { nativeSelectClassName } from "@/lib/field-classes";
import type { Candidature } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const LS_SYSTEM = "jobtrack-groq-system-prompt";
const LS_MODEL = "jobtrack-groq-model";
const LS_TEMP = "jobtrack-groq-temperature";
const LS_MAX = "jobtrack-groq-max-tokens";
const LS_GROQ_MODE = "jobtrack-groq-extract-mode";
const LS_ENABLED_MODELS = "jobtrack-groq-models-enabled";

/** Liste prédéfinie (cases à cocher) — les ids ajoutés manuellement sont aussi dans enabledModels. */
const GROQ_PRESET_IDS: string[] = [...GROQ_MODEL_SUGGESTIONS];

/** Limite confortable pour le corps de texte envoyé à Groq (caractères). */
const GROQ_USER_TEXT_MAX = 80000;

const SAMPLE_OFFER_TEXT = `Pennylane — Développeur·seuse React (H/F), CDI
Paris / remote partiel · Fourchette 45–55 k€
Nous cherchons un·e profil pour renforcer l’équipe produit. Stack : React, TypeScript, tests.
Candidature : jobs@company.example`;

const GROQ_PARAM_PRESETS: {
  id: string;
  label: string;
  temperature: number;
  maxTokens: number;
}[] = [
  { id: "precise", label: "Précis", temperature: 0.2, maxTokens: 1024 },
  { id: "balanced", label: "Équilibré", temperature: 0.5, maxTokens: 2048 },
  { id: "creative", label: "Créatif", temperature: 1, maxTokens: 2048 },
];

function normalizeEnabledModelsFromStorage(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const ids = raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
  return ids.length > 0 ? ids : null;
}

/** Libellé court optionnel pour l’affichage (le id reste la valeur technique). */
function groqModelDisplayLabel(id: string): string {
  const hints: Record<string, string> = {
    "llama-3.3-70b-versatile": "Llama 3.3 — 70B polyvalent",
    "llama-3.1-8b-instant": "Llama 3.1 — 8B rapide",
    "openai/gpt-oss-120b": "GPT-OSS — 120B",
    "openai/gpt-oss-20b": "GPT-OSS — 20B",
    "mixtral-8x7b-32768": "Mixtral 8×7B",
    "gemma2-9b-it": "Gemma 2 — 9B",
    "qwen/qwen3-32b": "Qwen3 — 32B",
    "groq/compound": "Compound",
    "groq/compound-mini": "Compound Mini",
  };
  return hints[id] ?? id;
}

type GroqExtractMode = "single_csv" | "batch_csv" | "json_rows";

function defaultSystemForMode(mode: GroqExtractMode): string {
  switch (mode) {
    case "batch_csv":
    case "json_rows":
      return GROQ_SYSTEM_PROMPT_BATCH;
    default:
      return DEFAULT_GROQ_SYSTEM_PROMPT;
  }
}

function downloadText(
  content: string,
  filename: string,
  mime: string,
  bom = false
) {
  const body = bom ? `\uFEFF${content}` : content;
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type ImportMeta = {
  total: number;
  errors: string[];
  dupCount: number;
  newCount: number;
};

export function ImportExportView() {
  const { show } = useToast();
  const { openDuplicateModal } = useShellModals();
  const {
    candidatures,
    prepareCsvImport,
    prepareJsonImport,
    prepareImportFromParsed,
    finalizeImport,
    duplicates,
    pendingImport,
    clearImportArtifacts,
  } = useCandidatures();

  const csvFileRef = useRef<HTMLInputElement>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const [csvDrag, setCsvDrag] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const [pasteCsv, setPasteCsv] = useState("");
  const [jsonMode, setJsonMode] = useState<"array" | "jsonl">("array");
  const [pasteJson, setPasteJson] = useState("");

  const [meta, setMeta] = useState<ImportMeta | null>(null);

  const [groqExtractMode, setGroqExtractMode] =
    useState<GroqExtractMode>("single_csv");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_GROQ_SYSTEM_PROMPT);
  const [userContent, setUserContent] = useState("");
  const [enabledModels, setEnabledModels] = useState<string[]>(() => [
    ...GROQ_PRESET_IDS,
  ]);
  const [customModelInput, setCustomModelInput] = useState("");
  const [model, setModel] = useState(DEFAULT_GROQ_MODEL);
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(GROQ_DEFAULT_MAX_TOKENS_SINGLE);
  const [groqLoading, setGroqLoading] = useState(false);
  const [groqRaw, setGroqRaw] = useState("");
  const [groqLine, setGroqLine] = useState("");
  const skipGroqMaxAdjustOnMount = useRef(true);

  useEffect(() => {
    try {
      const mode = localStorage.getItem(LS_GROQ_MODE) as GroqExtractMode | null;
      if (
        mode === "single_csv" ||
        mode === "batch_csv" ||
        mode === "json_rows"
      ) {
        setGroqExtractMode(mode);
      }
      const s = localStorage.getItem(LS_SYSTEM);
      const m = localStorage.getItem(LS_MODEL);
      const t = localStorage.getItem(LS_TEMP);
      const x = localStorage.getItem(LS_MAX);
      const emRaw = localStorage.getItem(LS_ENABLED_MODELS);
      let enabled = [...GROQ_PRESET_IDS];
      if (emRaw) {
        try {
          const parsed = normalizeEnabledModelsFromStorage(JSON.parse(emRaw) as unknown);
          if (parsed) enabled = parsed;
        } catch {
          /* ignore */
        }
      }
      if (m?.trim()) {
        const mid = m.trim();
        if (!enabled.includes(mid)) enabled = [...enabled, mid];
        setModel(mid);
      } else {
        const pick = enabled.includes(DEFAULT_GROQ_MODEL)
          ? DEFAULT_GROQ_MODEL
          : (enabled[0] ?? DEFAULT_GROQ_MODEL);
        setModel(pick);
      }
      setEnabledModels(enabled);
      if (s) setSystemPrompt(s);
      else setSystemPrompt(
        defaultSystemForMode(
          (mode as GroqExtractMode) ?? "single_csv"
        )
      );
      if (t) {
        const n = parseFloat(t);
        if (!Number.isNaN(n)) setTemperature(n);
      }
      if (x) {
        const n = parseInt(x, 10);
        if (!Number.isNaN(n) && n > 0) setMaxTokens(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SYSTEM, systemPrompt);
      localStorage.setItem(LS_MODEL, model);
      localStorage.setItem(LS_TEMP, String(temperature));
      localStorage.setItem(LS_MAX, String(maxTokens));
      localStorage.setItem(LS_GROQ_MODE, groqExtractMode);
      localStorage.setItem(LS_ENABLED_MODELS, JSON.stringify(enabledModels));
    } catch {
      /* ignore */
    }
  }, [systemPrompt, model, temperature, maxTokens, groqExtractMode, enabledModels]);

  useEffect(() => {
    if (skipGroqMaxAdjustOnMount.current) {
      skipGroqMaxAdjustOnMount.current = false;
      return;
    }
    if (groqExtractMode === "batch_csv" || groqExtractMode === "json_rows") {
      setMaxTokens((t) =>
        t < GROQ_DEFAULT_MAX_TOKENS_BATCH ? GROQ_DEFAULT_MAX_TOKENS_BATCH : t
      );
    } else {
      setMaxTokens((t) =>
        t > GROQ_DEFAULT_MAX_TOKENS_SINGLE ? GROQ_DEFAULT_MAX_TOKENS_SINGLE : t
      );
    }
  }, [groqExtractMode]);

  const resetImportUi = useCallback(() => {
    setMeta(null);
    setCsvProgress(0);
    if (csvFileRef.current) csvFileRef.current.value = "";
    if (jsonFileRef.current) jsonFileRef.current.value = "";
    clearImportArtifacts();
  }, [clearImportArtifacts]);

  const applyMeta = useCallback(
    (r: {
      total: number;
      errors: string[];
      dupCount: number;
      newCount: number;
    }) => {
      setMeta({
        total: r.total,
        errors: r.errors,
        dupCount: r.dupCount,
        newCount: r.newCount,
      });
    },
    []
  );

  const togglePresetModel = useCallback(
    (id: string) => {
      setEnabledModels((prev) => {
        if (prev.includes(id)) {
          if (prev.length <= 1) {
            show("Garde au moins un modèle activé.", "error");
            return prev;
          }
          const next = prev.filter((x) => x !== id);
          setModel((m) => (m === id ? next[0]! : m));
          return next;
        }
        return [...prev, id];
      });
    },
    [show]
  );

  const addCustomGroqModel = useCallback(() => {
    const id = customModelInput.trim();
    if (!id) return;
    setEnabledModels((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setModel(id);
    setCustomModelInput("");
    show("Modèle ajouté et sélectionné.");
  }, [customModelInput, show]);

  const removeEnabledModel = useCallback(
    (id: string) => {
      setEnabledModels((prev) => {
        if (prev.length <= 1) {
          show("Garde au moins un modèle activé.", "error");
          return prev;
        }
        if (!prev.includes(id)) return prev;
        const next = prev.filter((x) => x !== id);
        setModel((m) => (m === id ? next[0]! : m));
        return next;
      });
    },
    [show]
  );

  const runCsvFile = async (file: File) => {
    resetImportUi();
    setCsvProgress(25);
    try {
      const r = await prepareCsvImport(file);
      applyMeta(r);
      setCsvProgress(100);
    } catch (e) {
      show(e instanceof Error ? e.message : "Erreur import CSV", "error");
      resetImportUi();
    } finally {
      setTimeout(() => setCsvProgress(0), 400);
    }
  };

  const runPasteCsv = async () => {
    const t = pasteCsv.trim();
    if (!t) {
      show("Colle d’abord le contenu CSV.", "error");
      return;
    }
    const file = new File([t], "colle.csv", { type: "text/csv" });
    await runCsvFile(file);
  };

  const runJsonText = async () => {
    const raw = pasteJson.trim();
    if (!raw) {
      show("Colle ou charge un JSON.", "error");
      return;
    }
    resetImportUi();
    try {
      let payload: unknown;
      if (jsonMode === "jsonl") {
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
        payload = lines.map((line, i) => {
          try {
            return JSON.parse(line) as unknown;
          } catch {
            throw new Error(`JSONL ligne ${i + 1} invalide.`);
          }
        });
      } else {
        payload = JSON.parse(raw) as unknown;
      }
      const r = await prepareJsonImport(payload);
      applyMeta(r);
    } catch (e) {
      show(e instanceof Error ? e.message : "JSON invalide", "error");
      resetImportUi();
    }
  };

  const runJsonFile = async (file: File) => {
    resetImportUi();
    try {
      const text = await file.text();
      let payload: unknown;
      if (jsonMode === "jsonl") {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        payload = lines.map((line, i) => {
          try {
            return JSON.parse(line) as unknown;
          } catch {
            throw new Error(`JSONL ligne ${i + 1} invalide.`);
          }
        });
      } else {
        payload = JSON.parse(text) as unknown;
      }
      const r = await prepareJsonImport(payload);
      applyMeta(r);
    } catch (e) {
      show(e instanceof Error ? e.message : "Fichier JSON invalide", "error");
      resetImportUi();
    }
  };

  const handleConfirmImport = async () => {
    if (duplicates.length > 0) {
      openDuplicateModal();
      return;
    }
    await finalizeImport();
    resetImportUi();
    show("Import enregistré ✓");
  };

  const runGroqExtract = async () => {
    const sys = systemPrompt.trim();
    const usr = userContent.trim();
    if (!sys || !usr) {
      show("Remplis le prompt système et le texte à analyser.", "error");
      return;
    }
    if (userContent.length > GROQ_USER_TEXT_MAX) {
      show(
        `Texte trop long (max. ${GROQ_USER_TEXT_MAX.toLocaleString("fr-FR")} caractères).`,
        "error"
      );
      return;
    }
    setGroqLoading(true);
    setGroqRaw("");
    setGroqLine("");
    try {
      const res = await fetch("/api/groq/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: sys,
          userContent: usr,
          model: model.trim() || DEFAULT_GROQ_MODEL,
          temperature,
          max_completion_tokens: maxTokens,
          outputFormat:
            groqExtractMode === "json_rows" ? "json_rows" : "text",
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        text?: string;
        rows?: unknown[];
        raw?: string;
      };
      if (!res.ok) {
        show(data.error ?? `Erreur Groq (${res.status})`, "error");
        if (typeof data.raw === "string") setGroqRaw(data.raw);
        return;
      }

      if (groqExtractMode === "json_rows" && Array.isArray(data.rows)) {
        const textPreview =
          typeof data.text === "string"
            ? data.text
            : JSON.stringify(data.rows, null, 2);
        setGroqRaw(textPreview);
        setGroqLine(`(${data.rows.length} offre(s) JSON)`);
        const r = await prepareJsonImport(data.rows);
        applyMeta(r);
        show(
          `${data.rows.length} offre(s) JSON — prévisualisation prête à confirmer.`
        );
        return;
      }

      const raw = data.text ?? "";
      setGroqRaw(raw);

      const block = parseGroqCsvBlock(raw);
      if (block && block.rowCount >= 1) {
        if (groqExtractMode === "single_csv" && block.rowCount > 1) {
          const lines = block.csvWithHeader.split(/\r?\n/);
          const firstDataLine = lines[1]?.trim() ?? "";
          if (firstDataLine) {
            const parsed = parseSingleCsvDataLine(firstDataLine);
            if (parsed.data && !parsed.error) {
              setGroqLine(firstDataLine);
              applyMeta(prepareImportFromParsed([parsed.data]));
              show(
                "Plusieurs lignes détectées — seule la 1re est importée (mode une offre). Utilise « Liste CSV » ou « JSON structuré » pour tout importer."
              );
              return;
            }
          }
        }
        const file = new File([block.csvWithHeader], "groq.csv", {
          type: "text/csv",
        });
        const r = await prepareCsvImport(file);
        applyMeta(r);
        const lines = block.csvWithHeader.split(/\r?\n/);
        setGroqLine(
          block.rowCount === 1
            ? (lines[1]?.trim() ?? "")
            : `(${block.rowCount} lignes CSV)`
        );
        show(
          block.rowCount > 1
            ? `${block.rowCount} lignes CSV importées en prévisualisation.`
            : "Une ligne CSV importée en prévisualisation."
        );
        return;
      }

      const line = extractCsvDataLineFromAiResponse(raw);
      setGroqLine(line);
      const parsed = parseSingleCsvDataLine(line);
      if (parsed.error || !parsed.data) {
        show(
          parsed.error ??
            "La réponse n’est pas une ligne CSV valide — essaie le mode JSON structuré ou vérifie les guillemets (URL, notes).",
          "error"
        );
        return;
      }
      const r = prepareImportFromParsed([parsed.data]);
      applyMeta(r);
      show("Ligne extraite — prête à confirmer avec le reste de l’import.");
    } catch (e) {
      show(e instanceof Error ? e.message : "Erreur réseau", "error");
    } finally {
      setGroqLoading(false);
    }
  };

  const showSummary = meta !== null;
  const confirmDisabled =
    pendingImport.length === 0 && duplicates.length === 0;

  const activeModelId =
    enabledModels.includes(model) ? model : (enabledModels[0] ?? DEFAULT_GROQ_MODEL);
  const extractButtonLabel = groqLoading
    ? "Appel Groq…"
    : `Extraire avec ${groqModelDisplayLabel(activeModelId)}`;

  const previewImportRows = pendingImport.slice(0, 8);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-wide mb-1">
          Données · import / export
        </h1>
        <p className="text-[11px] text-[var(--text3)] mb-2 flex flex-wrap gap-x-3 gap-y-1">
          <span>
            <span className="text-[var(--accent)]">1.</span> Préparer
          </span>
          <span>→</span>
          <span>
            <span className="text-[var(--accent)]">2.</span> Analyser
          </span>
          <span>→</span>
          <span>
            <span className="text-[var(--accent)]">3.</span> Valider en bas de
            page
          </span>
        </p>
        <p className="text-sm text-[var(--text2)]">
          Export CSV ou JSON, import fichier ou collage, extraction avec{" "}
          <a
            href="https://console.groq.com/docs/api-reference#chat-create"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline"
          >
            Groq
          </a>{" "}
          (clé <code className="text-[var(--text)]">GROQ_API_KEY</code> côté
          serveur).{" "}
          <Link
            href="/"
            className="text-[var(--accent)] hover:underline"
          >
            ← Dashboard
          </Link>
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card className="gap-3 p-4 md:p-5">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
            Export
          </h2>
          <p className="text-xs text-[var(--text2)]">
            <strong className="text-[var(--text)]">{candidatures.length}</strong>{" "}
            candidature(s) en base.
          </p>
          <p className="text-[11px] text-[var(--text2)] leading-relaxed">
            <strong className="text-[var(--text)]">CSV</strong> — tableur,
            Excel, sauvegarde lisible.{" "}
            <strong className="text-[var(--text)]">JSON</strong> — script,
            outil, sauvegarde technique.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="text-xs"
              onClick={() => {
                downloadText(
                  exportCandidaturesCsv(candidatures),
                  "jobtrack_export.csv",
                  "text/csv",
                  true
                );
                show("CSV exporté ✓");
              }}
            >
              Télécharger CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => {
                downloadText(
                  exportCandidaturesJson(candidatures),
                  "jobtrack_export.json",
                  "application/json"
                );
                show("JSON exporté ✓");
              }}
            >
              Télécharger JSON
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-xs"
              onClick={() => downloadCsvTemplate((m) => show(m))}
              title="Fichier vide avec les colonnes attendues"
            >
              Modèle CSV (vide)
            </Button>
          </div>
        </Card>

        <Card className="gap-3 p-4 md:p-5">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text2)]">
            Import CSV
          </h2>
          <p className="text-[11px] text-[var(--text2)] leading-relaxed">
            Les lignes qui commencent par{" "}
            <code className="text-[var(--text)]">#</code> sont traitées comme
            des commentaires et ignorées.
          </p>
          <div
            className={`drop-zone ${csvDrag ? "drag-over" : ""}`}
            onClick={() => csvFileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setCsvDrag(true);
            }}
            onDragLeave={() => setCsvDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setCsvDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) void runCsvFile(f);
            }}
          >
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runCsvFile(f);
              }}
            />
            <p className="text-[var(--text2)] text-sm font-medium">
              Fichier .csv — glisser-déposer ou cliquer
            </p>
          </div>
          <div
            className={`progress-wrap ${csvProgress > 0 && csvProgress < 100 ? "visible" : ""}`}
          >
            <div
              className="progress-bar"
              style={{ width: `${csvProgress}%` }}
            />
          </div>
          <p className="text-center text-[10px] uppercase tracking-wider text-[var(--text3)]">
            ou
          </p>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--text)]">
              Coller le CSV (avec ligne d’en-tête)
            </label>
            <Textarea
              className="min-h-[100px] font-mono text-xs"
              value={pasteCsv}
              onChange={(e) => setPasteCsv(e.target.value)}
              placeholder="company,job_title,..."
            />
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => void runPasteCsv()}
            >
              Analyser le CSV collé
            </Button>
          </div>
        </Card>

        <Card className="gap-3 p-4 md:p-5 lg:col-span-2">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text2)]">
            Import JSON
          </h2>
          <p className="text-[11px] text-[var(--text2)]">
            Choisis le format de ton fichier ou de ton collage, puis charge ou
            colle.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-xs transition-colors ${
                jsonMode === "array"
                  ? "border-[var(--accent)] bg-[var(--surface2)] ring-1 ring-[var(--accent)]/25"
                  : "border-[var(--border)] hover:bg-[var(--surface2)]/60"
              }`}
            >
              <input
                type="radio"
                name="jsonMode"
                className="mt-0.5"
                checked={jsonMode === "array"}
                onChange={() => setJsonMode("array")}
              />
              <span>
                <span className="font-semibold text-[var(--text)]">
                  Tableau JSON
                </span>
                <span className="mt-1 block font-mono text-[10px] text-[var(--text2)]">
                  [{`{...}`}, …]
                </span>
                <span className="mt-1 block text-[10px] text-[var(--text2)]">
                  Fichier <code className="text-[var(--text)]">.json</code>{" "}
                  classique
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-xs transition-colors ${
                jsonMode === "jsonl"
                  ? "border-[var(--accent)] bg-[var(--surface2)] ring-1 ring-[var(--accent)]/25"
                  : "border-[var(--border)] hover:bg-[var(--surface2)]/60"
              }`}
            >
              <input
                type="radio"
                name="jsonMode"
                className="mt-0.5"
                checked={jsonMode === "jsonl"}
                onChange={() => setJsonMode("jsonl")}
              />
              <span>
                <span className="font-semibold text-[var(--text)]">
                  JSON Lines
                </span>
                <span className="mt-1 block font-mono text-[10px] text-[var(--text2)] whitespace-pre">
                  {`{"..."}\n{"..."}`}
                </span>
                <span className="mt-1 block text-[10px] text-[var(--text2)]">
                  Un objet JSON par ligne (fichier texte)
                </span>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={jsonFileRef}
              type="file"
              accept=".json,application/json,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runJsonFile(f);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => jsonFileRef.current?.click()}
            >
              Charger un fichier
            </Button>
          </div>
          <Textarea
            className="min-h-[120px] font-mono text-xs"
            value={pasteJson}
            onChange={(e) => setPasteJson(e.target.value)}
            placeholder={
              jsonMode === "array"
                ? '[ { "company": "…", "job_title": "…" }, … ]'
                : '{"company":"…"}\n{"company":"…"}'
            }
          />
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={() => void runJsonText()}
          >
            Analyser le JSON
          </Button>
        </Card>

        <Card className="min-w-0 gap-3 p-4 md:p-5 lg:col-span-2">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text2)]">
            Extraction IA (Groq)
          </h2>
          <p className="text-[11px] text-[var(--text2)]">
            Prompt et paramètres sont mémorisés dans ce navigateur. Le serveur
            utilise <code className="text-[var(--text)]">GROQ_API_KEY</code>{" "}
            (jamais exposée ici). Les extractions sont fusionnées avec la
            détection de doublons comme un import classique.
          </p>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-[var(--text)]">
              Mode d’extraction
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label
                className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-[11px] transition-colors ${
                  groqExtractMode === "single_csv"
                    ? "border-[var(--accent)] bg-[var(--surface2)] ring-1 ring-[var(--accent)]/25"
                    : "border-[var(--border)] hover:bg-[var(--surface2)]/60"
                }`}
              >
                <input
                  type="radio"
                  name="groqMode"
                  className="mt-0.5"
                  checked={groqExtractMode === "single_csv"}
                  onChange={() => setGroqExtractMode("single_csv")}
                />
                <span>
                  <span className="font-semibold text-[var(--text)]">
                    Une offre
                  </span>
                  <span className="mt-1 block text-[10px] text-[var(--text2)] leading-snug">
                    Une annonce ou un e-mail → une ligne CSV.
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-[11px] transition-colors ${
                  groqExtractMode === "batch_csv"
                    ? "border-[var(--accent)] bg-[var(--surface2)] ring-1 ring-[var(--accent)]/25"
                    : "border-[var(--border)] hover:bg-[var(--surface2)]/60"
                }`}
              >
                <input
                  type="radio"
                  name="groqMode"
                  className="mt-0.5"
                  checked={groqExtractMode === "batch_csv"}
                  onChange={() => setGroqExtractMode("batch_csv")}
                />
                <span>
                  <span className="font-semibold text-[var(--text)]">
                    Liste / page
                  </span>
                  <span className="mt-1 block text-[10px] text-[var(--text2)] leading-snug">
                    Plusieurs offres dans un bloc → CSV multi-lignes.
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-[11px] transition-colors sm:col-span-1 ${
                  groqExtractMode === "json_rows"
                    ? "border-[var(--accent)] bg-[var(--surface2)] ring-1 ring-[var(--accent)]/25"
                    : "border-[var(--border)] hover:bg-[var(--surface2)]/60"
                }`}
              >
                <input
                  type="radio"
                  name="groqMode"
                  className="mt-0.5"
                  checked={groqExtractMode === "json_rows"}
                  onChange={() => setGroqExtractMode("json_rows")}
                />
                <span>
                  <span className="font-semibold text-[var(--text)]">
                    JSON structuré
                  </span>
                  <span className="mt-1 block text-[10px] text-[var(--text2)] leading-snug">
                    Si le CSV Groq est instable : objets JSON côté API.
                  </span>
                </span>
              </label>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-4">
            <div className="w-full min-w-0 space-y-4">
              <fieldset className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
                <legend className="sr-only">Modèles Groq activés</legend>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      Raccourcis dans le menu
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text2)] leading-relaxed">
                      Coche les modèles à proposer dans la liste déroulante
                      « Modèle pour cette requête » (en dessous).
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      title="Afficher tous les modèles prédéfinis dans le menu"
                      onClick={() => {
                        setEnabledModels([...GROQ_PRESET_IDS]);
                        setModel((m) =>
                          GROQ_PRESET_IDS.includes(m) ? m : GROQ_PRESET_IDS[0]!
                        );
                      }}
                    >
                      Tout afficher
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      title="Ne garder que le modèle par défaut (Llama 3.1 8B)"
                      onClick={() => {
                        setEnabledModels([DEFAULT_GROQ_MODEL]);
                        setModel(DEFAULT_GROQ_MODEL);
                      }}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </div>
                <ul
                  role="list"
                  className="mt-3 max-h-[min(360px,55vh)] w-full min-w-0 list-none overflow-y-auto overflow-x-hidden overscroll-contain rounded-md border border-[var(--border)]"
                >
                  {GROQ_PRESET_IDS.map((id) => {
                    const on = enabledModels.includes(id);
                    const isActiveModel =
                      id ===
                      (enabledModels.includes(model)
                        ? model
                        : (enabledModels[0] ?? DEFAULT_GROQ_MODEL));
                    return (
                      <li
                        key={id}
                        className="w-full min-w-0 border-b border-[var(--border)] last:border-b-0"
                      >
                        <label
                          className={`flex w-full min-w-0 cursor-pointer items-start gap-3 px-3 py-2.5 sm:px-4 sm:py-3 ${
                            isActiveModel
                              ? "border-l-2 border-l-[var(--accent)] bg-[var(--surface2)]"
                              : ""
                          } ${
                            on
                              ? "bg-[var(--surface2)]"
                              : "bg-[var(--surface)] hover:bg-[var(--surface2)]/80"
                          }`}
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={on}
                            onCheckedChange={() => togglePresetModel(id)}
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium leading-snug text-[var(--text)]">
                                {groqModelDisplayLabel(id)}
                              </span>
                              {isActiveModel ? (
                                <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                                  Actif
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 font-mono text-xs leading-normal text-[var(--text2)]">
                              {id}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
              {enabledModels.some((id) => !GROQ_PRESET_IDS.includes(id)) ? (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)]/40 px-3 py-2.5">
                  <p className="text-xs font-medium text-[var(--text2)] mb-2">
                    Modèles personnalisés
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {enabledModels
                      .filter((id) => !GROQ_PRESET_IDS.includes(id))
                      .map((id) => (
                        <span
                          key={id}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--text)] break-words"
                        >
                          {id}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="ml-0.5 h-5 w-5 shrink-0 text-destructive hover:bg-destructive/10"
                            aria-label={`Retirer ${id}`}
                            onClick={() => removeEnabledModel(id)}
                          >
                            ×
                          </Button>
                        </span>
                      ))}
                  </div>
                </div>
              ) : null}
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:[&>*]:min-w-0">
                <div className="min-w-0 space-y-1.5">
                  <label
                    className="block text-xs font-medium text-[var(--text)]"
                    htmlFor="groq-model-select"
                  >
                    Modèle pour cette requête
                  </label>
                  <select
                    id="groq-model-select"
                    className={cn(
                      nativeSelectClassName,
                      "py-2.5 text-sm"
                    )}
                    value={
                      enabledModels.includes(model)
                        ? model
                        : (enabledModels[0] ?? DEFAULT_GROQ_MODEL)
                    }
                    onChange={(e) => setModel(e.target.value)}
                  >
                    {enabledModels.map((id) => (
                      <option key={id} value={id}>
                        {groqModelDisplayLabel(id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label
                    className="block text-xs font-medium text-[var(--text)]"
                    htmlFor="groq-custom-model"
                  >
                    Autre id Groq
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="groq-custom-model"
                      className="min-w-0 flex-1 font-mono text-sm"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomGroqModel();
                        }
                      }}
                      placeholder="ex. openai/gpt-oss-20b"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 px-4 text-sm"
                      onClick={() => addCustomGroqModel()}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[11px]">
              <summary className="cursor-pointer font-medium text-[var(--text)]">
                Paramètres Groq (température, tokens, préréglages)
              </summary>
              <p className="mt-2 text-[10px] text-[var(--text2)] leading-relaxed">
                Température : plus bas = plus déterministe ; plus haut = plus
                varié. Max tokens : plafond de la réponse (pas de ton texte
                collé).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {GROQ_PARAM_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-[10px]"
                    onClick={() => {
                      setTemperature(p.temperature);
                      setMaxTokens(p.maxTokens);
                      show(`Préréglage « ${p.label} » appliqué.`);
                    }}
                  >
                    {p.label} (T={p.temperature}, {p.maxTokens} tok.)
                  </Button>
                ))}
              </div>
              <div className="mt-3 grid w-full min-w-0 grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text2)]">
                    Température (0–2)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full bg-muted/50 text-xs"
                    value={temperature}
                    onChange={(e) =>
                      setTemperature(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text2)]">
                    Max tokens (réponse)
                  </label>
                  <Input
                    type="number"
                    min={64}
                    max={8192}
                    step={64}
                    className="w-full bg-muted/50 text-xs"
                    value={maxTokens}
                    onChange={(e) =>
                      setMaxTokens(parseInt(e.target.value, 10) || 1536)
                    }
                  />
                </div>
              </div>
            </details>
          </div>
          <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <summary className="cursor-pointer text-[11px] font-medium text-[var(--text)]">
              Prompt système (avancé — touche aux contraintes d’extraction)
            </summary>
            <Textarea
              className="mt-2 min-h-[120px] font-mono text-[11px] leading-relaxed"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              aria-label="Prompt système Groq"
            />
            <Button
              type="button"
              variant="ghost"
              className="mt-2 py-1 text-[10px]"
              onClick={() => {
                setSystemPrompt(defaultSystemForMode(groqExtractMode));
                show("Prompt par défaut restauré pour ce mode.");
              }}
            >
              Restaurer le prompt par défaut (ce mode)
            </Button>
          </details>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] text-[var(--text2)]">
                Texte à analyser (offre, e-mail, notes…)
              </label>
              <Button
                type="button"
                variant="ghost"
                className="py-1 text-[10px]"
                onClick={() => {
                  setUserContent(SAMPLE_OFFER_TEXT);
                  show("Exemple inséré — tu peux le modifier.");
                }}
              >
                Insérer un exemple
              </Button>
            </div>
            <p className="text-[10px] text-[var(--text2)]">
              Texte brut ou copié depuis le web ; pas besoin de HTML propre.
            </p>
            <Textarea
              className="min-h-[120px] text-xs"
              value={userContent}
              onChange={(e) => setUserContent(e.target.value)}
              placeholder="Ex. annonce LinkedIn complète, copie d’e-mail recruteur, ou tes notes…"
              maxLength={GROQ_USER_TEXT_MAX}
            />
            <p
              className={`text-[10px] tabular-nums ${
                userContent.length > GROQ_USER_TEXT_MAX * 0.95
                  ? "text-[var(--warn)]"
                  : "text-[var(--text3)]"
              }`}
            >
              {userContent.length.toLocaleString("fr-FR")} /{" "}
              {GROQ_USER_TEXT_MAX.toLocaleString("fr-FR")} caractères
            </p>
          </div>
          <Button
            type="button"
            className="text-xs"
            disabled={groqLoading}
            onClick={() => void runGroqExtract()}
          >
            {extractButtonLabel}
          </Button>
          {groqRaw ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-[var(--text2)]">
                Réponse brute
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-[var(--surface2)] p-2 whitespace-pre-wrap">
                {groqRaw}
              </pre>
            </details>
          ) : null}
          {groqLine ? (
            <p className="text-[11px] text-[var(--text2)]">
              Ligne extraite :{" "}
              <code className="text-[var(--text)] break-all">{groqLine}</code>
            </p>
          ) : null}
        </Card>
      </div>

      <Card className="mt-6 gap-3 p-4 md:p-5 ring-1 ring-primary/30">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
          Valider l’import
        </h2>
        {showSummary && meta ? (
          <div className="mb-4 text-sm space-y-2 border border-[var(--border)] rounded p-3 bg-[var(--surface2)]">
            <p>
              Lignes : <strong>{meta.total}</strong> — Nouvelles :{" "}
              <strong>{meta.newCount}</strong> — Doublons :{" "}
              <strong>{meta.dupCount}</strong> — Rejetées :{" "}
              <strong>{meta.errors.length}</strong>
            </p>
            <p className="text-[11px] text-[var(--text2)]">
              Base actuelle :{" "}
              <strong className="text-[var(--text)]">
                {candidatures.length}
              </strong>{" "}
              candidature(s). Après confirmation,{" "}
              <strong className="text-[var(--text)]">{meta.newCount}</strong>{" "}
              fiche(s) nouvelle(s) au plus (selon résolution des doublons).
            </p>
            {previewImportRows.length > 0 ? (
              <div className="pt-2">
                <p className="text-[11px] font-medium text-[var(--text)] mb-1">
                  Aperçu ({previewImportRows.length}
                  {pendingImport.length > previewImportRows.length
                    ? ` sur ${pendingImport.length}`
                    : ""}{" "}
                  )
                </p>
                <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)]">
                  <table className="w-full min-w-[320px] text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text2)]">
                        <th className="p-2 font-medium">Entreprise</th>
                        <th className="p-2 font-medium">Poste</th>
                        <th className="p-2 font-medium">Lieu</th>
                        <th className="p-2 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewImportRows.map((c: Candidature) => (
                        <tr
                          key={c.id}
                          className="border-b border-[var(--border)] last:border-0"
                        >
                          <td className="max-w-[140px] p-2 align-top text-[var(--text)]">
                            <span className="line-clamp-2">{c.company}</span>
                          </td>
                          <td className="max-w-[140px] p-2 align-top text-[var(--text)]">
                            <span className="line-clamp-2">{c.job_title}</span>
                          </td>
                          <td className="max-w-[100px] p-2 align-top text-[var(--text2)]">
                            {c.location || "—"}
                          </td>
                          <td className="p-2 align-top text-[var(--text2)]">
                            {c.status || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {meta.errors.length > 0 ? (
              <details>
                <summary className="cursor-pointer text-[var(--warn)] text-xs">
                  Erreurs
                </summary>
                <ul className="mt-2 text-xs max-h-32 overflow-y-auto">
                  {meta.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            {duplicates.length > 0 ? (
              <p className="text-[var(--warn)] text-xs">
                Des doublons doivent être résolus : la confirmation ouvre la
                fenêtre de fusion.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--text2)] mb-4 leading-relaxed">
            Aucun import en attente. Utilise <strong>Import CSV</strong>,{" "}
            <strong>Import JSON</strong> ou <strong>Extraction IA</strong> plus
            haut : le résumé et l’aperçu des lignes apparaîtront ici.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-xs"
            onClick={() => {
              resetImportUi();
              setPasteCsv("");
              setPasteJson("");
              setGroqRaw("");
              setGroqLine("");
            }}
          >
            Tout annuler
          </Button>
          <Button
            type="button"
            className="text-xs"
            disabled={!showSummary || confirmDisabled}
            onClick={() => void handleConfirmImport()}
          >
            Confirmer l&apos;import
          </Button>
        </div>
      </Card>
    </>
  );
}
