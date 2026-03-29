"use client";

import { useCandidatures } from "@/context/candidatures-context";
import { useToast } from "@/context/toast-context";
import { useCallback, useRef, useState } from "react";

export function ImportModal({
  open,
  onClose,
  onDuplicates,
}: {
  open: boolean;
  onClose: () => void;
  onDuplicates: () => void;
}) {
  const { show } = useToast();
  const {
    prepareCsvImport,
    finalizeImport,
    duplicates,
    pendingImport,
    clearImportArtifacts,
  } = useCandidatures();

  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [meta, setMeta] = useState<{
    total: number;
    errors: string[];
    dupCount: number;
    newCount: number;
  } | null>(null);

  const reset = useCallback(() => {
    setMeta(null);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
    clearImportArtifacts();
  }, [clearImportArtifacts]);

  const runImport = async (file: File) => {
    reset();
    setProgress(25);
    try {
      const r = await prepareCsvImport(file);
      setMeta({
        total: r.total,
        errors: r.errors,
        dupCount: r.dupCount,
        newCount: r.newCount,
      });
      setProgress(100);
    } catch (e) {
      show(e instanceof Error ? e.message : "Erreur import", "error");
      reset();
    } finally {
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleConfirm = async () => {
    if (duplicates.length > 0) {
      onDuplicates();
      return;
    }
    await finalizeImport();
    reset();
    onClose();
  };

  if (!open) return null;

  const showSummary = meta !== null;
  const confirmDisabled = pendingImport.length === 0 && duplicates.length === 0;

  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-lg max-w-[520px]">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--accent)]">
            Importer un CSV
          </h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div
          className={`drop-zone mb-4 ${drag ? "drag-over" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) void runImport(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void runImport(f);
            }}
          />
          <p className="text-[var(--text2)] text-sm">
            Glissez un fichier .csv ou cliquez pour parcourir
          </p>
        </div>
        <div
          className={`progress-wrap ${progress > 0 && progress < 100 ? "visible" : ""}`}
        >
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        {showSummary && meta ? (
          <div className="mb-4 text-sm space-y-2 border border-[var(--border)] rounded p-3 bg-[var(--surface2)]">
            <p>
              Lignes : <strong>{meta.total}</strong> — Nouvelles :{" "}
              <strong>{meta.newCount}</strong> — Doublons :{" "}
              <strong>{meta.dupCount}</strong> — Rejetées :{" "}
              <strong>{meta.errors.length}</strong>
            </p>
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
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!showSummary || confirmDisabled}
            onClick={() => void handleConfirm()}
          >
            Confirmer l&apos;import
          </button>
        </div>
      </div>
    </div>
  );
}
