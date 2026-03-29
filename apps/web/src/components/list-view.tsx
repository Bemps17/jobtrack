"use client";

import { ENUM_VALUES } from "@/lib/constants";
import { badgeClass, fmtDate, getFiltered, norm } from "@/lib/candidature-utils";
import { useCandidatures } from "@/context/candidatures-context";
import { useShellModals } from "@/context/shell-modals-context";
import { useToast } from "@/context/toast-context";
import { useCallback } from "react";

export function ListView() {
  const { show } = useToast();
  const { candidatures, filters, setFilters, deleteCandidature } =
    useCandidatures();
  const { openFormNew, openFormEdit, openDetail } = useShellModals();
  const list = getFiltered(candidatures, filters);

  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      status: "",
      contract: "",
      priority: "",
      sort: "date_desc",
    });
    show("Filtres réinitialisés");
  }, [setFilters, show]);

  const handleDelete = async (id: string) => {
    const c = candidatures.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Supprimer « ${c.company} – ${c.job_title} » ?`)) return;
    await deleteCandidature(id);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide mb-1">Candidatures</h1>
          <p className="text-sm text-[var(--text2)]">
            {list.length} résultat(s)
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary self-start"
          onClick={openFormNew}
        >
          + Ajouter
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <input
          className="max-w-xs"
          placeholder="Recherche…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
        >
          <option value="">Tous statuts</option>
          {ENUM_VALUES.status.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.contract}
          onChange={(e) => setFilters({ contract: e.target.value })}
        >
          <option value="">Contrat</option>
          {ENUM_VALUES.contract_type.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ priority: e.target.value })}
        >
          <option value="">Priorité</option>
          {ENUM_VALUES.priority.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(e) =>
            setFilters({
              sort: e.target.value as typeof filters.sort,
            })
          }
        >
          <option value="date_desc">Plus récent</option>
          <option value="date_asc">Plus ancien</option>
          <option value="company">Entreprise</option>
          <option value="priority">Priorité</option>
        </select>
        <button type="button" className="btn btn-ghost" onClick={resetFilters}>
          Réinitialiser
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>Aucune candidature ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              className="card"
              onClick={() => openDetail(c.id)}
              onKeyDown={(e) => e.key === "Enter" && openDetail(c.id)}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <div className="font-semibold text-[14px] flex items-center gap-1">
                    <span
                      className={`priority-dot ${norm(c.priority)}`}
                      title={`Priorité ${c.priority}`}
                    />
                    {c.company}
                  </div>
                  <div className="text-[12px] text-[var(--text2)]">
                    {c.job_title}
                  </div>
                </div>
                <span className={`badge shrink-0 ${badgeClass(c.status)}`}>
                  {c.status || "—"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {(
                  [
                    ["contract", c.contract_type],
                    ["location", c.location],
                    ["work_mode", c.work_mode],
                  ] as const
                )
                  .filter(([, v]) => Boolean(String(v ?? "").trim()))
                  .map(([field, v]) => (
                    <span
                      key={`${c.id}-${field}`}
                      className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)]"
                    >
                      {v}
                    </span>
                  ))}
              </div>
              <div className="flex justify-between items-center text-[11px] text-[var(--text3)]">
                <span>{fmtDate(c.date_applied || c.date_found)}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="card-btn"
                    aria-label="Modifier"
                    onClick={() => openFormEdit(c.id)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="card-btn"
                    aria-label="Supprimer"
                    onClick={() => void handleDelete(c.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {c.notes ? (
                <p className="text-[11px] text-[var(--text2)] border-t border-[var(--border)] pt-2 mt-2 line-clamp-2">
                  {c.notes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
