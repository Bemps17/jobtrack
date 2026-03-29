"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  if (duplicates.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-[720px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-bold text-primary">
            Doublons détectés
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Choisissez comment gérer chaque candidature en double
          </p>
        </DialogHeader>
        <ScrollArea className="min-h-0 max-h-[55vh] px-6">
          <div className="space-y-3 pb-4 pr-2">
            {duplicates.map((dup, index) => (
              <div
                key={`${dup.existing.id}-${index}`}
                className="duplicate-item rounded-lg border border-border p-3"
              >
                <div className="mb-2 text-sm font-semibold">
                  ⚠ {dup.imported.company}
                </div>
                <div className="duplicate-comparison">
                  <div className="duplicate-side">
                    <div className="mb-1 text-[11px] font-bold text-muted-foreground">
                      Existant
                    </div>
                    <p className="font-semibold">{dup.existing.job_title}</p>
                    <p>Statut : {dup.existing.status}</p>
                    <p>Date : {fmtDate(dup.existing.date_applied)}</p>
                  </div>
                  <div className="duplicate-vs">VS</div>
                  <div className="duplicate-side">
                    <div className="mb-1 text-[11px] font-bold text-muted-foreground">
                      Import
                    </div>
                    <p className="font-semibold">{dup.imported.job_title}</p>
                    <p>Statut : {dup.imported.status}</p>
                    <p>Date : {fmtDate(dup.imported.date_applied)}</p>
                  </div>
                </div>
                <div className="duplicate-actions mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void resolveDuplicate(index, "skip")}
                  >
                    Ignorer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void resolveDuplicate(index, "replace")}
                  >
                    Remplacer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void resolveDuplicate(index, "merge")}
                  >
                    Fusionner
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0 flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          <Button
            type="button"
            onClick={() => void resolveAllDuplicates("merge")}
          >
            Tout fusionner
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void resolveAllDuplicates("replace")}
          >
            Tout remplacer
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void resolveAllDuplicates("skip")}
          >
            Tout ignorer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
