"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { nativeSelectClassName } from "@/lib/field-classes";
import {
  addDaysFromIso,
  norm,
  today,
} from "@/lib/candidature-utils";
import { DEFAULTS, ENUM_VALUES } from "@/lib/constants";
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

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.company.trim() || !form.job_title.trim()) return;
    await Promise.resolve(onSave(form));
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-[540px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[540px]">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-bold text-primary">
            {editing ? "Modifier la candidature" : "Nouvelle candidature"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="min-h-0 max-h-[65vh] px-6">
          <div className="grid gap-3 pb-4 pr-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-company" className="text-[11px] text-muted-foreground">
                  Entreprise *
                </Label>
                <Input
                  id="fm-company"
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-job" className="text-[11px] text-muted-foreground">
                  Poste *
                </Label>
                <Input
                  id="fm-job"
                  value={form.job_title}
                  onChange={(e) => set("job_title", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-contract" className="text-[11px] text-muted-foreground">
                  Contrat
                </Label>
                <select
                  id="fm-contract"
                  className={nativeSelectClassName}
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-loc" className="text-[11px] text-muted-foreground">
                  Localisation
                </Label>
                <Input
                  id="fm-loc"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-mode" className="text-[11px] text-muted-foreground">
                  Mode
                </Label>
                <select
                  id="fm-mode"
                  className={nativeSelectClassName}
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-source" className="text-[11px] text-muted-foreground">
                  Source
                </Label>
                <Input
                  id="fm-source"
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-status" className="text-[11px] text-muted-foreground">
                  Statut
                </Label>
                <select
                  id="fm-status"
                  className={nativeSelectClassName}
                  value={form.status}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => {
                      if (norm(v) === "envoyée" && norm(f.status) !== "envoyée") {
                        const t = today();
                        return {
                          ...f,
                          status: v,
                          date_applied: t,
                          follow_up_date: addDaysFromIso(t, 7),
                        };
                      }
                      return { ...f, status: v };
                    });
                  }}
                >
                  {ENUM_VALUES.status.filter(Boolean).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] font-normal text-muted-foreground">
                  « À envoyer » : la date « trouvée » reste libre. Passage à «
                  Envoyée » : date postulée = aujourd&apos;hui, relance = J+7
                  (sauf déjà envoyée).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-prio" className="text-[11px] text-muted-foreground">
                  Priorité
                </Label>
                <select
                  id="fm-prio"
                  className={nativeSelectClassName}
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value)}
                >
                  {ENUM_VALUES.priority.filter(Boolean).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-salary" className="text-[11px] text-muted-foreground">
                  Salaire
                </Label>
                <Input
                  id="fm-salary"
                  value={form.salary}
                  onChange={(e) => set("salary", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-url" className="text-[11px] text-muted-foreground">
                  URL offre
                </Label>
                <Input
                  id="fm-url"
                  value={form.job_url}
                  onChange={(e) => set("job_url", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-df" className="text-[11px] text-muted-foreground">
                  Date trouvée
                </Label>
                <Input
                  id="fm-df"
                  type="date"
                  value={form.date_found}
                  onChange={(e) => set("date_found", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-da" className="text-[11px] text-muted-foreground">
                  Date postulée
                </Label>
                <Input
                  id="fm-da"
                  type="date"
                  value={form.date_applied}
                  onChange={(e) => set("date_applied", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fm-rel" className="text-[11px] text-muted-foreground">
                Relance
              </Label>
              <Input
                id="fm-rel"
                type="date"
                value={form.follow_up_date}
                onChange={(e) => set("follow_up_date", e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-contact" className="text-[11px] text-muted-foreground">
                  Contact
                </Label>
                <Input
                  id="fm-contact"
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-email" className="text-[11px] text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="fm-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fm-notes" className="text-[11px] text-muted-foreground">
                Notes
              </Label>
              <Textarea
                id="fm-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void submit()}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
