"use client";

import { badgeClass, fmtDate, norm } from "@/lib/candidature-utils";
import type { Candidature } from "@/lib/types";

export function DetailModal({
  open,
  c,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  c: Candidature | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!open || !c) return null;

  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-lg max-w-[560px]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold">{c.company}</h2>
            <p className="text-[var(--text2)] text-sm">{c.job_title}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className={`badge ${badgeClass(c.status)}`}>{c.status || "—"}</span>
          {c.priority ? (
            <span className="text-[11px] text-[var(--text2)] flex items-center">
              <span className={`priority-dot ${norm(c.priority)}`} />
              {c.priority}
            </span>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-[13px]">
          {[
            ["Contrat", c.contract_type],
            ["Localisation", c.location],
            ["Mode", c.work_mode],
            ["Source", c.source],
            ["Salaire", c.salary],
            ["Trouvée le", fmtDate(c.date_found)],
            ["Postulée le", fmtDate(c.date_applied)],
            ["Relance le", fmtDate(c.follow_up_date)],
            ["Contact", c.contact_name],
          ].map(([k, v]) =>
            v ? (
              <div key={k}>
                <dt className="text-[var(--text3)] text-[11px]">{k}</dt>
                <dd>{v}</dd>
              </div>
            ) : null
          )}
          {c.contact_email ? (
            <div className="col-span-2">
              <dt className="text-[var(--text3)] text-[11px]">Email</dt>
              <dd>
                <a
                  href={`mailto:${c.contact_email}`}
                  className="text-[var(--accent)] hover:underline"
                >
                  {c.contact_email}
                </a>
              </dd>
            </div>
          ) : null}
          {c.job_url ? (
            <div className="col-span-2">
              <dt className="text-[var(--text3)] text-[11px]">URL</dt>
              <dd>
                <a
                  href={c.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] break-all hover:underline"
                >
                  {c.job_url}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        {c.notes ? (
          <div className="mt-4">
            <div className="text-[11px] text-[var(--text3)] mb-1">Notes</div>
            <div className="text-[13px] whitespace-pre-wrap text-[var(--text2)] border border-[var(--border)] rounded p-3">
              {c.notes}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" className="btn btn-ghost" onClick={onDelete}>
            Supprimer
          </button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}
