"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { badgeClass, fmtDate, norm } from "@/lib/candidature-utils";
import { cn } from "@/lib/utils";
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[560px] gap-4 sm:max-w-[560px]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-bold">{c.company}</DialogTitle>
          <p className="text-sm text-muted-foreground">{c.job_title}</p>
        </DialogHeader>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className={cn("font-normal", badgeClass(c.status))}
          >
            {c.status || "—"}
          </Badge>
          {c.priority ? (
            <span className="flex items-center text-[11px] text-muted-foreground">
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
                <dt className="text-[11px] text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ) : null
          )}
          {c.contact_email ? (
            <div className="col-span-2">
              <dt className="text-[11px] text-muted-foreground">Email</dt>
              <dd>
                <a
                  href={`mailto:${c.contact_email}`}
                  className="text-primary hover:underline"
                >
                  {c.contact_email}
                </a>
              </dd>
            </div>
          ) : null}
          {c.job_url ? (
            <div className="col-span-2">
              <dt className="text-[11px] text-muted-foreground">URL</dt>
              <dd>
                <a
                  href={c.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {c.job_url}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        {c.notes ? (
          <div className="mt-1">
            <div className="mb-1 text-[11px] text-muted-foreground">Notes</div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-[13px] whitespace-pre-wrap text-muted-foreground">
              {c.notes}
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onDelete}>
            Supprimer
          </Button>
          <Button type="button" onClick={onEdit}>
            Modifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
