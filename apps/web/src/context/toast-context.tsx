"use client";

import { Toaster } from "@/components/ui/sonner";
import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { toast as sonnerToast } from "sonner";

type ToastType = "success" | "error";

type ToastContextValue = {
  show: (msg: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const show = useCallback((m: string, ty: ToastType = "success") => {
    if (ty === "error") sonnerToast.error(m);
    else sonnerToast.success(m);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast dans ToastProvider");
  return c;
}
