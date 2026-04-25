"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { SimulationResult } from "@/lib/types";

type SortKey = "roi" | "reach" | "engagement_rate";

type ResultRow = SimulationResult & {
  id: string;
  team_id: string;
  session_id: string;
  team_name: string;
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// ── Animated metric bar ────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ width: "82px", fontSize: "0.73rem", color: "var(--muted)", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        height: "6px",
        background: "var(--surface)",
        borderRadius: "99px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${width}%`,
          background: color,
          borderRadius: "99px",
          transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <span style={{
        width: "54px",
        textAlign: "right",
        fontSize: "0.85rem",
        fontWeight: 700,
        color: "var(--text)",
        flexShrink: 0,
        fontFamily: "monospace",
      }}>
        {value}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function Leaderboard({ sessionId }: { sessionId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("roi");
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    const { data } = await supabase
      .from("results")
      .select("*, teams(team_name)")
      .eq("session_id", sessionId);

    if (data) {
      setResults(
        data.map((r: Record<string, unknown> & { teams?: { team_name?: string } }) => ({
          ...r,
          team_name: r.teams?.team_name ?? "Unknown Team",
        })) as ResultRow[]
      );
    }
    setLoading(false);
  }, [sessionId, supabase]);

  useEffect(() => {
    fetchResults();
    const ch = supabase
      .channel(`leaderboard-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "results", filter: `session_id=eq.${sessionId}` },
        () => fetchResults()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchResults, sessionId, supabase]);

  const sorted = [...results].sort((a, b) => b[sortKey] - a[sortKey]);

  // Compute per-column maximums for bar scaling
  const maxReach = Math.max(...results.map((r) => r.reach), 1);
  const maxEng = Math.max(...results.map((r) => r.engagement_rate), 1);
  const maxConv = Math.max(...results.map((r) => r.conversion_rate), 1);
  const maxRoi = Math.max(...results.map((r) => r.roi), 1);

  function downloadCSV() {
    const headers = ["Rank", "Team Name", "Reach", "Engagement Rate", "Conversion Rate", "ROI", "Overall Verdict"];
    const rows = sorted.map((r, i) => [
      i + 1,
      r.team_name,
      r.reach,
      r.engagement_rate,
      r.conversion_rate,
      r.roi,
      `"${r.overall_verdict.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `leaderboard-${sessionId.slice(0, 8)}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
        Loading results…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "2rem",
        color: "var(--muted)",
        textAlign: "center",
      }}>
        No results yet. Run the simulation to see the leaderboard.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Sort + download bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600, marginRight: "0.25rem" }}>
            Sort by:
          </span>
          {(["roi", "reach", "engagement_rate"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              style={{
                padding: "0.3rem 0.85rem",
                borderRadius: "99px",
                border: `1px solid ${sortKey === key ? "var(--accent)" : "var(--border)"}`,
                background: sortKey === key ? "rgba(167,139,250,0.15)" : "transparent",
                color: sortKey === key ? "var(--accent)" : "var(--muted)",
                fontSize: "0.78rem",
                fontWeight: sortKey === key ? 700 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {key === "roi" ? "ROI" : key === "reach" ? "Reach" : "Engagement"}
            </button>
          ))}
          <button
            onClick={downloadCSV}
            style={{
              marginLeft: "auto",
              padding: "0.3rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            📥 Download CSV
          </button>
        </div>

        {/* Result cards */}
        {sorted.map((r, i) => {
          const reachDisplay =
            r.reach >= 1_000_000
              ? `${(r.reach / 1_000_000).toFixed(1)}M`
              : `${(r.reach / 1_000).toFixed(0)}k`;

          return (
            <div
              key={r.id}
              style={{
                background: "var(--card)",
                border: `1px solid ${i === 0 ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "12px",
                padding: "1.5rem",
                animation: "fadeUp 0.4s ease both",
                animationDelay: `${i * 0.08}s`,
              }}
            >
              {/* Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}>
                <span style={{ fontSize: i < 3 ? "1.75rem" : "1rem", lineHeight: 1 }}>
                  {i < 3 ? RANK_MEDALS[i] : ordinal(i + 1)}
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" }}>
                  {r.team_name}
                </span>
              </div>

              {/* Metric bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                <MetricBar
                  label="Reach"
                  value={reachDisplay}
                  pct={(r.reach / maxReach) * 100}
                  color="var(--accent)"
                />
                <MetricBar
                  label="Engagement"
                  value={`${r.engagement_rate.toFixed(1)}%`}
                  pct={(r.engagement_rate / maxEng) * 100}
                  color="var(--green)"
                />
                <MetricBar
                  label="Conversion"
                  value={`${r.conversion_rate.toFixed(1)}%`}
                  pct={(r.conversion_rate / maxConv) * 100}
                  color="var(--amber)"
                />
                <MetricBar
                  label="ROI"
                  value={`${r.roi.toFixed(1)}×`}
                  pct={(r.roi / maxRoi) * 100}
                  color="var(--red)"
                />
              </div>

              {/* Verdict */}
              <p style={{
                fontSize: "0.8rem",
                color: "var(--muted)",
                fontStyle: "italic",
                lineHeight: 1.55,
                margin: "1rem 0 0 0",
              }}>
                {r.overall_verdict}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
