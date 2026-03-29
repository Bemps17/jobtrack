"use client";

import { CardStatusChip } from "@/components/card-status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  compareRelancePriority,
  fmtDate,
  isRelanceDueOrFlagged,
} from "@/lib/candidature-utils";
import { useCandidatures } from "@/context/candidatures-context";
import { useShellModals } from "@/context/shell-modals-context";
import { Pencil, Trash2 } from "lucide-react";

export function RelancesView() {
  const { candidatures, deleteCandidature } = useCandidatures();
  const { openFormEdit, openDetail } = useShellModals();
  const list = [...candidatures.filter((c) => isRelanceDueOrFlagged(c))].sort(
    compareRelancePriority
  );

  const handleDelete = async (id: string) => {
    const c = candidatures.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Supprimer « ${c.company} – ${c.job_title} » ?`)) return;
    await deleteCandidature(id);
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-bold tracking-wide">Relances</h1>
        <p className="text-sm text-muted-foreground">
          Statut « relance à faire » ou date de relance arrivée / dépassée (poste
          encore actif : envoyée, en attente, entretiens…).
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
            <Card
              key={c.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer gap-3 py-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => openDetail(c.id)}
              onKeyDown={(e) => e.key === "Enter" && openDetail(c.id)}
            >
              <CardContent className="space-y-2 px-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-semibold">{c.company}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {c.job_title}
                    </div>
                  </div>
                  <CardStatusChip c={c} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{fmtDate(c.follow_up_date || c.date_applied)}</span>
                  <div
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Modifier"
                      onClick={() => openFormEdit(c.id)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Supprimer"
                      onClick={() => void handleDelete(c.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
