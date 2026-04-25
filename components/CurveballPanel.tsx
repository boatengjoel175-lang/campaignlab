"use client";

import { useState } from "react";
import { toast } from "@/components/Toast";

type CurveballType = "budget_cut" | "competitor_viral" | "audience_shift";

const CURVEBALLS = [
  {
    type: "budget_cut" as CurveballType,
    title: "Budget Slashed 💸",
    desc: "A stakeholder just cut the budget in half. Teams now have €5,000.",
    btnColor: "#f87171",
    btnText: "#000",
  },
  {
    type: "competitor_viral" as CurveballType,
    title: "Competitor Went Viral 🚀",
    desc: "Rival brand exploded on TikTok. TikTok strategy is now worth 2×.",
    btnColor: "#fb923c",
    btnText: "#000",
  },
  {
    type: "audience_shift" as CurveballType,
    title: "Audience Shifted 👥",
    desc: "New research — target audience is 10 years younger than briefed.",
    btnColor: "#60a5fa",
    btnText: "#000",
  },
];

export default function CurveballPanel({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [triggered, setTriggered] = useState(false);
  const [loading, setLoading] = useState<CurveballType | null>(null);
  const [error, setError] = useState("");

  async function handleTrigger(type: CurveballType) {
    setLoading(type);
    setError("");
    try {
      const res = await fetch("/api/curveball", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger");
      setTriggered(true);
      toast("Curveball triggered! All students will see the alert.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to trigger curveball");
    }
    setLoading(null);
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem",
    }}>
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "2rem",
        maxWidth: "520px",
        width: "100%",
        position: "relative",
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: "1.25rem",
            lineHeight: 1,
            fontFamily: "inherit",
          }}
        >
          ✕
        </button>

        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)", margin: "0 0 0.25rem 0" }}>
          🌪 Inject a Curveball
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: "0 0 1.5rem 0" }}>
          Trigger a live market event — all students will see it instantly.
        </p>

        {error && (
          <div style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.4)",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            color: "var(--red)",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}>
            {error}
          </div>
        )}

        {triggered ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✅</div>
            <p style={{ color: "var(--green)", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.5rem 0" }}>
              Curveball triggered!
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 1.5rem 0" }}>
              All students will see the breaking news banner.
            </p>
            <button
              onClick={onClose}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.65rem 1.5rem",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {CURVEBALLS.map((cb) => (
              <div
                key={cb.type}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  opacity: triggered ? 0.4 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontWeight: 700,
                    color: "var(--text)",
                    margin: "0 0 0.25rem 0",
                    fontSize: "0.95rem",
                  }}>
                    {cb.title}
                  </p>
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: 0, lineHeight: 1.5 }}>
                    {cb.desc}
                  </p>
                </div>
                <button
                  onClick={() => handleTrigger(cb.type)}
                  disabled={loading !== null}
                  style={{
                    background: cb.btnColor,
                    color: cb.btnText,
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.55rem 1rem",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: loading !== null ? "wait" : "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    opacity: loading !== null && loading !== cb.type ? 0.45 : 1,
                    minWidth: "72px",
                    transition: "opacity 0.15s",
                  }}
                >
                  {loading === cb.type ? "…" : "Trigger"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
