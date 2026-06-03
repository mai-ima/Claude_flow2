"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, XIcon, SparklesIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const TONE_STYLE: Record<ToastTone, { icon: React.ReactNode; ring: string }> = {
  success: { icon: <CheckIcon size={16} />, ring: "bg-income/15 text-income" },
  error: { icon: <XIcon size={16} />, ring: "bg-expense/15 text-expense" },
  info: { icon: <SparklesIcon size={16} />, ring: "bg-accent/15 text-accent" },
};

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const s = TONE_STYLE[item.tone];
  return (
    <button
      onClick={onClose}
      className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border-subtle bg-glass px-4 py-3 text-left shadow-lg backdrop-blur-xl"
    >
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", s.ring)}>
        {s.icon}
      </span>
      <span className="flex-1 text-[14px] font-medium text-text-primary">{item.message}</span>
    </button>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const remove = useCallback((id: number) => {
    setItems((s) => s.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = (idRef.current += 1);
      setItems((s) => [...s.slice(-2), { id, tone, message }]);
      setTimeout(() => remove(id), 3600);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
            role="status"
            aria-live="polite"
          >
            {items.map((t) => (
              <ToastView key={t.id} item={t} onClose={() => remove(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
