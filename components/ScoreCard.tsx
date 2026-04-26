"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { SimulationResult, Strategy, Platform } from "@/lib/types";
import AnimatedNumber from "@/components/AnimatedNumber";

// ── Constants ──────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 50; // radius 50 → 314.16

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#e1306c",
  TikTok: "#69c9d0",
  LinkedIn: "#0077b5",
  "X/Twitter": "#1da1f2",
  YouTube: "#ff0000",
};

const PILLAR_COLORS = [
  "#a78bfa", "#34d399", "#fb923c", "#60a5fa",
  "#f472b6", "#facc15", "#4ade80", "#38bdf8",
];

const METRIC_CFG = [
  { key: "reach",      icon: "📡", label: "Reach",           unit: "/100",  color: "#a78bfa" },
  { key: "engagement", icon: "💬", label: "Engagement Rate", unit: "%",     color: "#34d399" },
  { key: "conversion", icon: "🎯", label: "Conversion Rate", unit: "%",     color: "#fb923c" },
  { key: "roi",        icon: "💰", label: "ROI",             unit: "× ROI", color: "#60a5fa" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────

function normalize(metric: string, value: number): number {
  switch (metric) {
    case "reach":      return Math.min(100, Math.round((value / 100_000) * 100));
    case "engagement": return Math.min(100, Math.round(value * 5));
    case "conversion": return Math.min(100, Math.round(value * 10));
    case "roi":        return Math.min(100, Math.round((value / 8) * 100));
    default:           return 0;
  }
}

function grade(score: number) {
  if (score >= 80) return { label: "EXCELLENT", color: "#34d399", bg: "rgba(52,211,153,0.15)" };
  if (score >= 60) return { label: "GOOD",      color: "#60a5fa", bg: "rgba(96,165,250,0.15)" };
  if (score >= 40) return { label: "AVERAGE",   color: "#fb923c", bg: "rgba(251,146,60,0.15)" };
  return             { label: "NEEDS WORK",      color: "#f87171", bg: "rgba(248,113,113,0.15)" };
}

function rawDisplay(metric: string, result: SimulationResult): number {
  switch (metric) {
    case "reach":      return normalize("reach", result.reach);
    case "engagement": return result.engagement_rate;
    case "conversion": return result.conversion_rate;
    case "roi":        return result.roi;
    default:           return 0;
  }
}

function decimalsFor(metric: string): number {
  return metric === "reach" ? 0 : 1;
}

// ── Sub-components ─────────────────────────────────────────────────────

function Ring({ score, color }: { score: number; color: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setProgress(score), 150);
    return () => clearTimeout(t);
  }, [score]);

  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div style={{ position: "relative", width: "110px", height: "110px", flexShrink: 0 }}>
      <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="55" cy="55" r="50" fill="none" stroke="#27272a" strokeWidth="10" />
        <circle
          cx="55" cy="55" r="50"
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1rem", fontWeight: 700, color, fontFamily: "monospace",
      }}>
        {progress}%
      </div>
    </div>
  );
}

function PlatformBar({ platforms }: { platforms: Platform[] }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  const nonZero = platforms.filter((p) => p.budget_percent > 0);

  return (
    <div>
      <div style={{
        height: "40px", borderRadius: "8px", overflow: "hidden",
        background: "#27272a", display: "flex",
        width: animated ? "100%" : "0%",
        transition: "width 1.2s ease",
      }}>
        {nonZero.map((p) => (
          <div
            key={p.name}
            style={{
              width: `${p.budget_percent}%`,
              background: PLATFORM_COLORS[p.name] ?? "#6b7280",
              transition: "width 1.2s ease",
            }}
            title={`${p.name}: ${p.budget_percent}%`}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.75rem" }}>
        {nonZero.map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: PLATFORM_COLORS[p.name] ?? "#6b7280", flexShrink: 0 }} />
            <span style={{ fontSize: "0.78rem", color: "#a1a1aa" }}>{p.name} {p.budget_percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonChart({
  allResults,
  myTeamId,
}: {
  allResults: Array<{ team_name: string; roi: number; team_id: string }>;
  myTeamId: string;
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  const maxRoi = Math.max(...allResults.map((r) => r.roi), 0.01);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {allResults.map((r) => {
        const isMe = r.team_id === myTeamId;
        const pct = animated ? (r.roi / maxRoi) * 100 : 0;
        return (
          <div key={r.team_id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{
              width: "110px", fontSize: "0.8rem", textAlign: "right", flexShrink: 0,
              color: isMe ? "#ffffff" : "#71717a",
              fontWeight: isMe ? 700 : 400,
            }}>
              {r.team_name}
            </span>
            <div style={{ flex: 1, height: "32px", background: "#111113", borderRadius: "6px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${pct}%`,
                background: isMe ? "#a78bfa" : "#3f3f46",
                borderRadius: "6px",
                display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "0.5rem",
                transition: `width ${isMe ? 1.5 : 1.2}s ease`,
              }}>
                {isMe && pct > 25 && (
                  <span style={{ fontSize: "0.62rem", color: "white", fontWeight: 700, whiteSpace: "nowrap" }}>
                    ← YOU
                  </span>
                )}
              </div>
            </div>
            <span style={{
              width: "44px", fontSize: "0.82rem", fontFamily: "monospace", fontWeight: 700, flexShrink: 0,
              color: isMe ? "#a78bfa" : "#71717a",
            }}>
              {r.roi.toFixed(1)}×
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ScoreCard ─────────────────────────────────────────────────────

interface ScoreCardProps {
  result: SimulationResult;
  teamName: string;
  teamId: string;
  sessionId: string;
  scenario: {
    brand_name: string;
    industry: string;
    objective: string;
    client_personality: string;
  };
}

export default function ScoreCard({
  result,
  teamName,
  teamId,
  sessionId,
  scenario,
}: ScoreCardProps) {
  const supabase = useMemo(() => createClient(), []);

  const [allResults, setAllResults] = useState<Array<{ team_name: string; roi: number; team_id: string }>>([]);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [analysis, setAnalysis] = useState<{ worked: string[]; improve: string[] } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // Reflection
  const [reflMistake, setReflMistake] = useState("");
  const [reflInsight, setReflInsight] = useState("");
  const [reflSurprise, setReflSurprise] = useState("");
  const [reflSubmitting, setReflSubmitting] = useState(false);
  const [reflSubmitted, setReflSubmitted] = useState(false);

  // Fetch all results + this team's strategy
  useEffect(() => {
    supabase
      .from("results")
      .select("roi, team_id, teams(team_name)")
      .eq("session_id", sessionId)
      .order("roi", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setAllResults(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data as any[]).map((r) => ({
              team_id:   r.team_id as string,
              team_name: (Array.isArray(r.teams) ? r.teams[0]?.team_name : r.teams?.team_name) ?? "Unknown",
              roi:       r.roi as number,
            }))
          );
        }
      });

    supabase
      .from("teams")
      .select("strategy")
      .eq("id", teamId)
      .single()
      .then(({ data }) => {
        if (data?.strategy) setStrategy(data.strategy as Strategy);
      });

    // Check if already reflected
    supabase
      .from("reflections")
      .select("id")
      .eq("team_id", teamId)
      .maybeSingle()
      .then(({ data }) => { if (data) setReflSubmitted(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, teamId]);

  // Fetch AI analysis once strategy loaded
  useEffect(() => {
    if (!strategy) return;
    fetch("/api/analyze-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, strategy, scenario }),
    })
      .then((r) => r.json())
      .then((d) => { setAnalysis(d); setAnalysisLoading(false); })
      .catch(() => {
        setAnalysis({
          worked: ["Good platform diversity", "Strategy aligned with objective"],
          improve: ["Refine budget allocation for higher ROI", "Tighten demographic targeting"],
        });
        setAnalysisLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy]);

  // Rank
  const rank = allResults.length > 0
    ? allResults.findIndex((r) => r.team_id === teamId) + 1
    : null;

  // Header config
  const header =
    rank === 1 ? { bg: "linear-gradient(135deg, #92400e, #d97706)", emoji: "🥇", title: "YOU WON THE MARKET",   sub: "Your strategy outperformed every other team" } :
    rank === 2 ? { bg: "linear-gradient(135deg, #374151, #6b7280)", emoji: "🥈", title: "STRONG PERFORMANCE",   sub: "An impressive result — you nearly took the top spot" } :
    rank === 3 ? { bg: "linear-gradient(135deg, #7c2d12, #c2410c)", emoji: "🥉", title: "SOLID STRATEGY",       sub: "A well-executed approach with room to grow" } :
                 { bg: "#18181b",                                    emoji: "📊", title: "YOUR RESULTS ARE IN", sub: "See how your strategy performed in the market" };

  async function submitReflection() {
    if (!reflMistake.trim() && !reflInsight.trim() && !reflSurprise.trim()) return;
    setReflSubmitting(true);
    await supabase.from("reflections").insert({
      session_id:      sessionId,
      team_id:         teamId,
      biggest_mistake: reflMistake.trim(),
      winning_insight: reflInsight.trim(),
      biggest_surprise: reflSurprise.trim(),
    });
    setReflSubmitting(false);
    setReflSubmitted(true);
  }

  const card: React.CSSProperties = {
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "16px",
    padding: "2rem",
    marginBottom: "1.25rem",
  };

  return (
    <div style={{ background: "#09090b", fontFamily: "Arial, Helvetica, sans-serif" }}>

      {/* ── SECTION 1 — Dramatic header ──────────────────────────────── */}
      <div style={{ background: header.bg, padding: "3rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>{header.emoji}</div>
        <h1 style={{
          fontSize: "clamp(1.4rem, 4vw, 2.4rem)", fontWeight: 900, color: "white",
          letterSpacing: "0.06em", margin: "0 0 0.75rem 0",
        }}>
          {header.title}
        </h1>
        {rank && allResults.length > 0 && (
          <div style={{
            display: "inline-block", background: "rgba(255,255,255,0.18)",
            borderRadius: "99px", padding: "0.3rem 1.1rem", color: "white",
            fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.75rem",
          }}>
            Rank #{rank} of {allResults.length} teams
          </div>
        )}
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "white", margin: "0 0 0.75rem 0" }}>
          {teamName}
        </h2>
        <p style={{
          fontSize: "1.1rem", color: "rgba(255,255,255,0.85)", fontStyle: "italic",
          maxWidth: "600px", margin: "0 auto", lineHeight: 1.65,
        }}>
          &ldquo;{result.overall_verdict}&rdquo;
        </p>
      </div>

      <div style={{ padding: "2rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>

        {/* ── SECTION 2 — Four metric cards ─────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}>
          {METRIC_CFG.map((m) => {
            const rawVal = rawDisplay(m.key, result);
            const actualScore = normalize(
              m.key,
              m.key === "reach"      ? result.reach :
              m.key === "engagement" ? result.engagement_rate :
              m.key === "conversion" ? result.conversion_rate :
              result.roi
            );
            const g = grade(actualScore);
            const explanation =
              m.key === "reach"      ? result.reach_explanation :
              m.key === "engagement" ? result.engagement_explanation :
              m.key === "conversion" ? result.conversion_explanation :
              result.roi_explanation;

            return (
              <div key={m.key} style={{
                ...card,
                borderTop: `4px solid ${m.color}`,
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginBottom: 0,
              }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>{m.icon}</span>
                    <span style={{ fontSize: "0.67rem", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {m.label}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: g.color, background: g.bg, padding: "3px 10px", borderRadius: "99px", letterSpacing: "0.06em" }}>
                    {g.label}
                  </span>
                </div>

                {/* Big number */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                  <span style={{ fontSize: "4rem", fontWeight: 900, fontFamily: "monospace", color: m.color, lineHeight: 1 }}>
                    <AnimatedNumber value={rawVal} duration={1500} decimals={decimalsFor(m.key)} />
                  </span>
                  <span style={{ fontSize: "1rem", color: "#71717a", fontWeight: 500 }}>{m.unit}</span>
                </div>

                {/* Ring + explanation */}
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  <Ring score={actualScore} color={m.color} />
                  <p style={{ fontSize: "0.82rem", color: "#71717a", fontStyle: "italic", lineHeight: 1.55, margin: 0 }}>
                    <span style={{ color: m.color, fontStyle: "normal", fontWeight: 700 }}>Why: </span>
                    {explanation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── SECTION 3 — Strategy breakdown ───────────────────────── */}
        {strategy && (
          <div style={card}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "white", margin: "0 0 1.5rem 0" }}>
              Your Strategy at a Glance
            </h3>

            <p style={{ fontSize: "0.7rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.75rem 0" }}>
              Platform Budget Allocation
            </p>
            <PlatformBar platforms={strategy.platforms} />

            <p style={{ fontSize: "0.7rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", margin: "1.5rem 0 0.75rem 0" }}>
              Content Pillars
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {strategy.content_pillars.map((p, i) => (
                <span key={p} style={{
                  padding: "0.5rem 1.25rem", borderRadius: "99px", fontSize: "0.88rem", fontWeight: 600,
                  background: PILLAR_COLORS[i % PILLAR_COLORS.length] + "20",
                  border: `1px solid ${PILLAR_COLORS[i % PILLAR_COLORS.length]}55`,
                  color: PILLAR_COLORS[i % PILLAR_COLORS.length],
                }}>
                  {p}
                </span>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
              {[
                { icon: "👥", label: "Target Demographic", value: strategy.target_demographic },
                { icon: "📅", label: "Posting Frequency",  value: strategy.posting_frequency },
                { icon: "🎬", label: "Creative Format",    value: strategy.creative_format },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ background: "#111113", borderRadius: "10px", padding: "1rem" }}>
                  <p style={{ fontSize: "0.67rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.4rem 0" }}>
                    {icon} {label}
                  </p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "white", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 4 — Class comparison ──────────────────────────── */}
        {allResults.length > 1 && (
          <div style={card}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "white", margin: "0 0 1.5rem 0" }}>
              How You Compare to the Class
            </h3>
            <ComparisonChart allResults={allResults} myTeamId={teamId} />
          </div>
        )}

        {/* ── SECTION 5 — What worked / What to improve ─────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ ...card, borderLeft: "4px solid #34d399", marginBottom: 0 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "white", margin: "0 0 1rem 0" }}>What Worked ✓</h3>
            {analysisLoading ? (
              <p style={{ color: "#52525b", fontSize: "0.85rem", fontStyle: "italic" }}>Analysing your strategy...</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {analysis?.worked.map((pt, i) => (
                  <li key={i} style={{ color: "#a1a1aa", fontSize: "0.875rem", lineHeight: 1.55 }}>{pt}</li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ ...card, borderLeft: "4px solid #f87171", marginBottom: 0 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "white", margin: "0 0 1rem 0" }}>What to Improve ✗</h3>
            {analysisLoading ? (
              <p style={{ color: "#52525b", fontSize: "0.85rem", fontStyle: "italic" }}>Analysing your strategy...</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {analysis?.improve.map((pt, i) => (
                  <li key={i} style={{ color: "#a1a1aa", fontSize: "0.875rem", lineHeight: 1.55 }}>{pt}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── SECTION 6 — Reflection form ───────────────────────────── */}
        <div style={card}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "white", margin: "0 0 0.4rem 0" }}>
            Your Reflection 🧠
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#71717a", margin: "0 0 1.5rem 0" }}>
            Take 2 minutes — this is anonymous to other students but your professor can see it.
          </p>

          {reflSubmitted ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
              <p style={{ color: "#34d399", fontWeight: 700, fontSize: "1.1rem", margin: "0 0 0.3rem 0" }}>
                Reflection submitted ✓
              </p>
              <p style={{ color: "#71717a", fontSize: "0.875rem", margin: 0 }}>
                Your professor has received your reflection.
              </p>
            </div>
          ) : (
            <>
              {[
                { label: "What was your team's biggest strategic mistake?",  placeholder: "Be honest — what would you change first?",        val: reflMistake, set: setReflMistake },
                { label: "What did the winning team do that you didn't?",    placeholder: "Look at the leaderboard and compare...",           val: reflInsight, set: setReflInsight },
                { label: "What surprised you most about this simulation?",   placeholder: "Did the AI judge what you expected it to?",        val: reflSurprise, set: setReflSurprise },
              ].map(({ label, placeholder, val, set }) => (
                <div key={label} style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#a1a1aa", marginBottom: "0.5rem" }}>
                    {label}
                  </label>
                  <textarea
                    value={val}
                    onChange={(e) => set(e.target.value.slice(0, 200))}
                    placeholder={placeholder}
                    rows={3}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "#111113", border: "1px solid #27272a",
                      borderRadius: "8px", padding: "0.75rem 1rem",
                      color: "#fafafa", fontSize: "0.875rem", fontFamily: "inherit",
                      resize: "vertical", outline: "none", lineHeight: 1.5,
                    }}
                  />
                  <p style={{ fontSize: "0.7rem", color: "#52525b", textAlign: "right", margin: "0.2rem 0 0 0" }}>
                    {val.length}/200
                  </p>
                </div>
              ))}

              <button
                onClick={submitReflection}
                disabled={reflSubmitting || (!reflMistake.trim() && !reflInsight.trim() && !reflSurprise.trim())}
                style={{
                  width: "100%", padding: "0.9rem",
                  background: "#a78bfa", color: "white",
                  border: "none", borderRadius: "10px",
                  fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit",
                  opacity: reflSubmitting || (!reflMistake.trim() && !reflInsight.trim() && !reflSurprise.trim()) ? 0.45 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {reflSubmitting ? "Submitting..." : "Submit Reflection"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
