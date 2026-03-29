"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error";

type ToastContextValue = {
  show: (msg: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("success");
  const [visible, setVisible] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((m: string, ty: ToastType = "success") => {
    setMsg(m);
    setType(ty);
    setVisible(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setVisible(false), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        id="toast"
        role="status"
        aria-live="polite"
        className={`toast-fixed ${visible ? "toast-show" : ""} ${
          type === "error" ? "toast-error" : "toast-success"
        }`}
      >
        {msg}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast dans ToastProvider");
  return c;
}
