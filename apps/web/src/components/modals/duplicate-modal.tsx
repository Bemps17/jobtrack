"use client";

import { fmtDate } from "@/lib/candidature-utils";
import { useCandidatures } from "@/context/candidatures-context";

export function DuplicateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { duplicates, resolveDuplicate, resolveAllDuplicates } =
    useCandidatures();

  if (!open || duplicates.length === 0) return null;

  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-lg max-w-[720px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--accent)]">
              Doublons détectés
            </h2>
            <p className="text-xs text-[var(--text2)] mt-1">
              Choisissez comment gérer chaque candidature en double
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mb-4 space-y-3">
          {duplicates.map((dup, index) => (
            <div key={`${dup.existing.id}-${index}`} className="duplicate-item">
              <div className="font-semibold text-sm mb-2">
                ⚠ {dup.imported.company}
              </div>
              <div className="duplicate-comparison">
                <div className="duplicate-side">
                  <div className="font-bold text-[11px] text-[var(--text3)] mb-1">
                    Existant
                  </div>
                  <p className="font-semibold">{dup.existing.job_title}</p>
                  <p>Statut : {dup.existing.status}</p>
                  <p>Date : {fmtDate(dup.existing.date_applied)}</p>
                </div>
                <div className="duplicate-vs">VS</div>
                <div className="duplicate-side">
                  <div className="font-bold text-[11px] text-[var(--text3)] mb-1">
                    Import
                  </div>
                  <p className="font-semibold">{dup.imported.job_title}</p>
                  <p>Statut : {dup.imported.status}</p>
                  <p>Date : {fmtDate(dup.imported.date_applied)}</p>
                </div>
              </div>
              <div className="duplicate-actions flex flex-wrap gap-2 justify-end mt-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void resolveDuplicate(index, "skip")}
                >
                  Ignorer
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void resolveDuplicate(index, "replace")}
                >
                  Remplacer
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void resolveDuplicate(index, "merge")}
                >
                  Fusionner
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-[var(--border)]">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void resolveAllDuplicates("merge")}
          >
            Tout fusionner
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void resolveAllDuplicates("replace")}
          >
            Tout remplacer
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void resolveAllDuplicates("skip")}
          >
            Tout ignorer
          </button>
        </div>
      </div>
    </div>
  );
}
