"use client";

import { badgeClass, fmtDate, norm } from "@/lib/candidature-utils";
import { useCandidatures } from "@/context/candidatures-context";
import { useShellModals } from "@/context/shell-modals-context";

export function RelancesView() {
  const { candidatures, deleteCandidature } = useCandidatures();
  const { openFormEdit, openDetail } = useShellModals();
  const list = candidatures.filter((c) => norm(c.status) === "relance à faire");

  const handleDelete = async (id: string) => {
    const c = candidatures.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Supprimer « ${c.company} – ${c.job_title} » ?`)) return;
    await deleteCandidature(id);
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-wide mb-1">Relances</h1>
        <p className="text-sm text-[var(--text2)]">
          Candidatures à relancer
        </p>
      </div>
      {list.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎉</span>
          <p>Aucune relance en attente. Bravo !</p>
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
                  <div className="font-semibold text-[14px]">{c.company}</div>
                  <div className="text-[12px] text-[var(--text2)]">
                    {c.job_title}
                  </div>
                </div>
                <span className={`badge ${badgeClass(c.status)}`}>
                  {c.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-[var(--text3)]">
                <span>{fmtDate(c.follow_up_date || c.date_applied)}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="card-btn"
                    onClick={() => openFormEdit(c.id)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="card-btn"
                    onClick={() => void handleDelete(c.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
