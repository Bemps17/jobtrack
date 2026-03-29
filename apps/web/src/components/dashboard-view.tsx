"use client";

import { PIPELINE_STATUSES } from "@/lib/constants";
import { badgeClass, fmtDate, norm } from "@/lib/candidature-utils";
import { useCandidatures } from "@/context/candidatures-context";
import { useShellModals } from "@/context/shell-modals-context";
import Link from "next/link";
import { useEffect, useState } from "react";

function Greeting() {
  const [text, setText] = useState("");
  useEffect(() => {
    const h = new Date().getHours();
    const greet =
      h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
    setText(
      `${greet} · ${new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}`
    );
  }, []);
  return <p className="text-xs md:text-sm text-[var(--text2)]">{text}</p>;
}

export function DashboardView() {
  const { candidatures, relanceCount } = useCandidatures();
  const { openFormNew, openImport, downloadTemplate, openDetail } =
    useShellModals();
  const C = candidatures;
  const total = C.length;
  const envoye = C.filter(
    (c) => norm(c.status) !== "à envoyer" && norm(c.status) !== ""
  ).length;
  const entretiens = C.filter((c) =>
    ["entretien rh", "entretien technique", "test technique"].includes(
      norm(c.status)
    )
  ).length;
  const refus = C.filter((c) => norm(c.status) === "refusée").length;
  const relances = C.filter((c) => norm(c.status) === "relance à faire").length;
  const offres = C.filter((c) =>
    ["offre reçue", "acceptée"].includes(norm(c.status))
  ).length;
  const taux = envoye > 0 ? Math.round((entretiens / envoye) * 100) : 0;

  const kpis = [
    { val: total, lbl: "Total", cls: "accent" },
    { val: envoye, lbl: "Envoyées", cls: "" },
    { val: entretiens, lbl: "Entretiens", cls: "green" },
    { val: refus, lbl: "Refus", cls: refus > 0 ? "danger" : "" },
    { val: relances, lbl: "Relances dues", cls: relances > 0 ? "warn" : "" },
    { val: offres, lbl: "Offres reçues", cls: offres > 0 ? "green" : "" },
    { val: `${taux}%`, lbl: "Taux entretiens", cls: "" },
  ];

  const maxPipeline = Math.max(
    1,
    ...PIPELINE_STATUSES.map(
      (s) => C.filter((c) => norm(c.status) === s.key).length
    )
  );

  const recent = [...C]
    .sort((a, b) =>
      (b._createdAt ?? "").localeCompare(a._createdAt ?? "")
    )
    .slice(0, 5);

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-[22px] font-bold tracking-wide mb-1">
            Dashboard
          </h1>
          <Greeting />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            className="btn btn-ghost text-xs md:text-sm"
            onClick={downloadTemplate}
          >
            ⬇ <span className="hidden sm:inline">Modèle CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary text-xs md:text-sm"
            onClick={openImport}
          >
            ⬆ <span className="hidden sm:inline">Importer CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-primary text-xs md:text-sm"
            onClick={openFormNew}
          >
            + Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 mb-6 md:mb-8">
        {kpis.map((k) => (
          <div key={k.lbl} className={`kpi-card ${k.cls}`}>
            <span className="kpi-val">{k.val}</span>
            <div className="kpi-lbl">{k.lbl}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 md:mb-8">
        <h2 className="text-xs md:text-[13px] font-bold uppercase tracking-wider text-[var(--text2)] mb-3 md:mb-4">
          Pipeline
        </h2>
        <div className="pipeline flex gap-2 items-end overflow-x-auto pb-2 md:pb-0">
          {PIPELINE_STATUSES.map((s) => {
            const count = C.filter((c) => norm(c.status) === s.key).length;
            const height =
              count === 0 ? 4 : Math.max(6, Math.round((count / maxPipeline) * 70));
            return (
              <div key={s.key} className="pipeline-col">
                <span className="text-xs text-[var(--text2)]">{count}</span>
                <div className="pipeline-bar-wrap">
                  <div
                    className="pipeline-bar rounded-t w-full"
                    style={{
                      height,
                      background: s.color,
                      opacity: count === 0 ? 0.2 : 0.85,
                    }}
                  />
                </div>
                <span className="text-[10px] text-center text-[var(--text2)]">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs md:text-[13px] font-bold uppercase tracking-wider text-[var(--text2)]">
            Récentes
          </h2>
          <Link
            href="/list"
            className="bg-transparent border-none text-[var(--accent)] text-xs hover:underline"
          >
            Tout voir →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>Aucune candidature pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((c) => (
              <button
                key={c.id}
                type="button"
                className="recent-row text-left w-full"
                onClick={() => openDetail(c.id)}
              >
                <div className="font-semibold text-[13px] min-w-[100px] shrink-0">
                  {c.company}
                </div>
                <div className="text-[12px] text-[var(--text2)] flex-1 truncate">
                  {c.job_title}
                </div>
                <span className={`badge shrink-0 ${badgeClass(c.status)}`}>
                  {c.status || "—"}
                </span>
                <span className="text-[11px] text-[var(--text3)] whitespace-nowrap">
                  {fmtDate(c.date_applied || c.date_found)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-[var(--text3)] mt-8 md:hidden">
        Relances en attente : {relanceCount}
      </p>
    </>
  );
}
