"use client";

import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// Module-level listener set — survives re-renders, no context needed
const listeners = new Set<(t: ToastItem) => void>();

export function toast(message: string, type: ToastType = "info") {
  const item: ToastItem = { id: Date.now() + Math.random(), message, type };
  listeners.forEach((fn) => fn(item));
}

const BG: Record<ToastType, string> = {
  success: "#34d399",
  error:   "#f87171",
  info:    "#a78bfa",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handler(item: ToastItem) {
      setToasts((prev) => [...prev, item]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== item.id)),
        3000
      );
    }
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        zIndex: 9999,
        pointerEvents: "none",
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: t.type === "info" ? "#fff" : "#000",
              background: BG[t.type],
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              animation: "slideIn 0.2s ease",
              maxWidth: "320px",
              lineHeight: 1.4,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
