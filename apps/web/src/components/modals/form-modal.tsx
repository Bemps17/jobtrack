"use client";

import { DEFAULTS, ENUM_VALUES } from "@/lib/constants";
import { today } from "@/lib/candidature-utils";
import type { Candidature } from "@/lib/types";
import { useEffect, useState } from "react";

const empty: Omit<Candidature, "id" | "_createdAt"> = {
  company: "",
  job_title: "",
  contract_type: "",
  location: "",
  work_mode: "",
  source: "",
  job_url: "",
  date_found: "",
  date_applied: "",
  status: DEFAULTS.status,
  priority: DEFAULTS.priority,
  salary: "",
  contact_name: "",
  contact_email: "",
  follow_up_date: "",
  notes: "",
};

export function FormModal({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Candidature | null;
  onClose: () => void;
  onSave: (
    data: Omit<Candidature, "id" | "_createdAt">
  ) => void | Promise<void>;
}) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const { id, _createdAt, ...rest } = editing;
      void id;
      void _createdAt;
      setForm({ ...empty, ...rest });
    } else {
      setForm({
        ...empty,
        date_found: today(),
        status: "à envoyer",
        priority: "moyenne",
      });
    }
  }, [open, editing]);

  if (!open) return null;

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.company.trim() || !form.job_title.trim()) return;
    await Promise.resolve(onSave(form));
    onClose();
  };

  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal-lg max-w-[540px]">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--accent)]">
            {editing ? "Modifier la candidature" : "Nouvelle candidature"}
          </h2>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Fermer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="grid gap-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-[11px] text-[var(--text2)]">
              Entreprise *
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
              />
            </label>
            <label className="text-[11px] text-[var(--text2)]">
              Poste *
              <input
                value={form.job_title}
                onChange={(e) => set("job_title", e.target.value)}
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-[11px] text-[var(--text2)]">
              Contrat
              <select
                value={form.contract_type}
                onChange={(e) => set("contract_type", e.target.value)}
              >
                <option value="">—</option>
                {ENUM_VALUES.contract_type.filter(Boolean).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-[var(--text2)]">
              Localisation
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-[11px] text-[var(--text2)]">
              Mode
              <select
                value={form.work_mode}
                onChange={(e) => set("work_mode", e.target.value)}
              >
                <option value="">—</option>
                {ENUM_VALUES.work_mode.filter(Boolean).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-[var(--text2)]">
              Source
              <input
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-[11px] text-[var(--text2)]">
              Statut
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {ENUM_VALUES.status.filter(Boolean).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-[var(--text2)]">
              Priorité
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                {ENUM_VALUES.priority.filter(Boolean).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-[11px] text-[var(--text2)]">
              Salaire
              <input
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
              />
            </label>
            <label className="text-[11px] text-[var(--text2)]">
              URL offre
              <input
                value={form.job_url}
                onChange={(e) => set("job_url", e.target.value)}
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-[11px] text-[var(--text2)]">
              Date trouvée
              <input
                type="date"
                value={form.date_found}
                onChange={(e) => set("date_found", e.target.value)}
              />
            </label>
            <label className="text-[11px] text-[var(--text2)]">
              Date postulée
              <input
                type="date"
                value={form.date_applied}
                onChange={(e) => set("date_applied", e.target.value)}
              />
            </label>
          </div>
          <label className="text-[11px] text-[var(--text2)]">
            Relance
            <input
              type="date"
              value={form.follow_up_date}
              onChange={(e) => set("follow_up_date", e.target.value)}
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-[11px] text-[var(--text2)]">
              Contact
              <input
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
              />
            </label>
            <label className="text-[11px] text-[var(--text2)]">
              Email
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </label>
          </div>
          <label className="text-[11px] text-[var(--text2)]">
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void submit()}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
