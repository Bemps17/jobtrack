"use client";

import { CardStatusChip } from "@/components/card-status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ENUM_VALUES } from "@/lib/constants";
import { fmtDate, getFiltered, norm } from "@/lib/candidature-utils";
import { nativeSelectClassName } from "@/lib/field-classes";
import { useCandidatures } from "@/context/candidatures-context";
import { useShellModals } from "@/context/shell-modals-context";
import { useToast } from "@/context/toast-context";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="mb-1 text-xl font-bold tracking-wide">Candidatures</h1>
          <p className="text-sm text-muted-foreground">
            {list.length} résultat(s)
          </p>
        </div>
        <Button className="self-start" onClick={openFormNew}>
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Recherche…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
        <select
          className={cn(nativeSelectClassName, "max-w-[160px]")}
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
          className={cn(nativeSelectClassName, "max-w-[140px]")}
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
          className={cn(nativeSelectClassName, "max-w-[140px]")}
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
          className={cn(nativeSelectClassName, "max-w-[160px]")}
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
        <Button type="button" variant="ghost" onClick={resetFilters}>
          Réinitialiser
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>Aucune candidature ne correspond à votre recherche.</p>
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
                    <div className="flex items-center gap-1 text-[14px] font-semibold">
                      <span
                        className={`priority-dot ${norm(c.priority)}`}
                        title={`Priorité ${c.priority}`}
                      />
                      {c.company}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {c.job_title}
                    </div>
                  </div>
                  <CardStatusChip c={c} />
                </div>
                <div className="mb-2 flex flex-wrap gap-1">
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
                        className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[10px]"
                      >
                        {v}
                      </span>
                    ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{fmtDate(c.date_applied || c.date_found)}</span>
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
                {c.notes ? (
                  <p className="mt-2 line-clamp-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                    {c.notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
