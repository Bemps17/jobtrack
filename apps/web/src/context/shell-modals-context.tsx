"use client";

import { DetailModal } from "@/components/modals/detail-modal";
import { DuplicateModal } from "@/components/modals/duplicate-modal";
import { FormModal } from "@/components/modals/form-modal";
import { ImportModal } from "@/components/modals/import-modal";
import { downloadCsvTemplate } from "@/lib/csv-template";
import type { Candidature } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useCandidatures } from "./candidatures-context";
import { useToast } from "./toast-context";

type ShellModalsContextValue = {
  openFormNew: () => void;
  openFormEdit: (id: string) => void;
  openDetail: (id: string) => void;
  openImport: () => void;
  downloadTemplate: () => void;
};

const ShellModalsContext = createContext<ShellModalsContextValue | null>(null);

export function ShellModalsProvider({ children }: { children: ReactNode }) {
  const { show } = useToast();
  const {
    candidatures,
    addCandidature,
    updateCandidature,
    deleteCandidature,
  } = useCandidatures();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);

  const editing = editingId
    ? candidatures.find((c) => c.id === editingId) ?? null
    : null;
  const detail = detailId
    ? candidatures.find((c) => c.id === detailId) ?? null
    : null;

  const openFormNew = useCallback(() => {
    setEditingId(null);
    setFormOpen(true);
  }, []);

  const openFormEdit = useCallback((id: string) => {
    setEditingId(id);
    setFormOpen(true);
    setDetailId(null);
  }, []);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
  }, []);

  const openImport = useCallback(() => setImportOpen(true), []);

  const downloadTemplate = useCallback(
    () => downloadCsvTemplate((m) => show(m)),
    [show]
  );

  const handleSaveForm = useCallback(
    async (data: Omit<Candidature, "id" | "_createdAt">) => {
      if (editingId) await updateCandidature(editingId, data);
      else await addCandidature(data);
    },
    [addCandidature, editingId, updateCandidature]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const c = candidatures.find((x) => x.id === id);
      if (!c) return;
      if (!confirm(`Supprimer « ${c.company} – ${c.job_title} » ?`)) return;
      await deleteCandidature(id);
      setDetailId(null);
    },
    [candidatures, deleteCandidature]
  );

  return (
    <ShellModalsContext.Provider
      value={{
        openFormNew,
        openFormEdit,
        openDetail,
        openImport,
        downloadTemplate,
      }}
    >
      {children}
      <FormModal
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
        onSave={handleSaveForm}
      />
      <DetailModal
        open={detailId !== null}
        c={detail}
        onClose={() => setDetailId(null)}
        onEdit={() => detail && openFormEdit(detail.id)}
        onDelete={() => detail && void handleDelete(detail.id)}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDuplicates={() => {
          setImportOpen(false);
          setDupOpen(true);
        }}
      />
      <DupCloser dupOpen={dupOpen} setDupOpen={setDupOpen} />
    </ShellModalsContext.Provider>
  );
}

function DupCloser({
  dupOpen,
  setDupOpen,
}: {
  dupOpen: boolean;
  setDupOpen: (v: boolean) => void;
}) {
  const { duplicates } = useCandidatures();
  useEffect(() => {
    if (dupOpen && duplicates.length === 0) setDupOpen(false);
  }, [dupOpen, duplicates.length, setDupOpen]);
  return <DuplicateModal open={dupOpen} onClose={() => setDupOpen(false)} />;
}

export function useShellModals() {
  const c = useContext(ShellModalsContext);
  if (!c) throw new Error("useShellModals dans ShellModalsProvider");
  return c;
}
