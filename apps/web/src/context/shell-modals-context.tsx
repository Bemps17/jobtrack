"use client";

import { DetailModal } from "@/components/modals/detail-modal";
import { DuplicateModal } from "@/components/modals/duplicate-modal";
import { FormModal } from "@/components/modals/form-modal";
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

type ShellModalsContextValue = {
  openFormNew: () => void;
  openFormEdit: (id: string) => void;
  openDetail: (id: string) => void;
  openDuplicateModal: () => void;
};

const ShellModalsContext = createContext<ShellModalsContextValue | null>(null);

export function ShellModalsProvider({ children }: { children: ReactNode }) {
  const {
    candidatures,
    addCandidature,
    updateCandidature,
    deleteCandidature,
  } = useCandidatures();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
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

  const openDuplicateModal = useCallback(() => setDupOpen(true), []);

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
        openDuplicateModal,
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
