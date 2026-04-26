"use client";

import { useState, useEffect, useMemo } from "react";
import { Source_Sans_3 } from "next/font/google";
import { createClient } from "@/lib/supabase";
import type { SimulationResult, Strategy, Platform } from "@/lib/types";
import AnimatedNumber from "@/components/AnimatedNumber";

const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["300", "400", "600", "700"] });

// ── Design constants ──────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 36; // r=36 → 226.2

const PLATFORM_COLORS: Record<string, string> = {
  "Instagram": "#e1306c",
  "TikTok":    "#69c9d0",
  "LinkedIn":  "#0077b5",
  "X/Twitter": "#1da1f2",
  "YouTube":   "#ff0000",
};

const PILLAR_COLORS = ["#e30613","#1a1a1a","#666666","#0077b5","#e1306c","#69c9d0","#1da1f2","#ff0000"];

// ── Helpers ───────────────────────────────────────────────────────────

function toScore(metric: string, result: SimulationResult): number {
  switch (metric) {
    case "reach":      return Math.min(100, Math.round((result.reach / 100_000) * 100));
    case "engagement": return Math.min(100, Math.round(result.engagement_rate * 5));
    case "conversion": return Math.min(100, Math.round(result.conversion_rate * 10));
    case "roi":        return Math.min(100, Math.round((result.roi / 8) * 100));
    default:           return 0;
  }
}

function ordinal(n: number): string {
  if (n === 1) return "1st"; if (n === 2) return "2nd";
  if (n === 3) return "3rd"; return `${n}th`;
}

function badge(score: number) {
  if (score >= 80) return { label: "EXCELLENT", bg: "#e30613" };
  if (score >= 60) return { label: "GOOD",      bg: "#666666" };
  if (score >= 40) return { label: "AVERAGE",   bg: "#666666" };
  return               { label: "NEEDS WORK",   bg: "#666666" };
}

// ── Sub-components ────────────────────────────────────────────────────

function Ring({ score }: { score: number }) {
  const [p, setP] = useState(0);
  useEffect(() => { const t = setTimeout(() => setP(score), 200); return () => clearTimeout(t); }, [score]);
  const offset = CIRCUMFERENCE - (p / 100) * CIRCUMFERENCE;
  return (
    <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke="#e0e0e0" strokeWidth="8" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="#e30613" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "#1a1a1a" }}>
        {p}%
      </div>
    </div>
  );
}

function PlatformBar({ platforms }: { platforms: Platform[] }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 300); return () => clearTimeout(t); }, []);
  const nz = platforms.filter(p => p.budget_percent > 0);
  return (
    <div>
      <div style={{ height: "32px", borderRadius: "2px", overflow: "hidden", display: "flex", background: "#e0e0e0" }}>
        {go && nz.map(p => (
          <div key={p.name} title={`${p.name}: ${p.budget_percent}%`}
            style={{ width: `${p.budget_percent}%`, background: PLATFORM_COLORS[p.name] ?? "#666666", transition: "width 1s ease" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", marginTop: "0.75rem" }}>
        {nz.map(p => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: PLATFORM_COLORS[p.name] ?? "#666666", flexShrink: 0 }} />
            <span style={{ fontSize: "0.78rem", color: "#666666" }}>{p.name} {p.budget_percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonChart({ rows, myId }: { rows: { team_id: string; team_name: string; roi: number }[]; myId: string }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 400); return () => clearTimeout(t); }, []);
  const max = Math.max(...rows.map(r => r.roi), 0.01);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {rows.map(r => {
        const isMe = r.team_id === myId;
        const pct = go ? (r.roi / max) * 100 : 0;
        return (
          <div key={r.team_id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ width: "120px", fontSize: "0.82rem", fontWeight: 600, color: "#1a1a1a", textAlign: "right", flexShrink: 0 }}>
              {r.team_name}
            </span>
            <div style={{ flex: 1, height: isMe ? "32px" : "24px", background: "#e0e0e0", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: isMe ? "#e30613" : "#1a1a1a",
                borderRadius: "2px",
                transition: `width ${isMe ? 1.5 : 1.2}s ease`,
              }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
              <span style={{ width: "40px", fontSize: "0.85rem", fontFamily: "monospace", fontWeight: 600, color: isMe ? "#e30613" : "#1a1a1a" }}>
                {r.roi.toFixed(1)}×
              </span>
              {isMe && <span style={{ fontSize: "0.7rem", color: "#e30613", fontWeight: 700 }}>← YOUR TEAM</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section heading (HdM style) ────────────────────────────────────────

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1a1a", borderLeft: "4px solid #e30613", paddingLeft: "1rem", margin: "0 0 1.5rem 0" }}>
      {children}
    </h2>
  );
}

// ── Main ScoreCard ─────────────────────────────────────────────────────

interface ScoreCardProps {
  result: SimulationResult;
  teamName: string;
  teamId: string;
  sessionId: string;
  scenario: { brand_name: string; industry: string; objective: string; client_personality: string };
}

export default function ScoreCard({ result, teamName, teamId, sessionId, scenario }: ScoreCardProps) {
  const supabase = useMemo(() => createClient(), []);

  const [allResults, setAllResults] = useState<{ team_id: string; team_name: string; roi: number }[]>([]);
  const [strategy,   setStrategy]   = useState<Strategy | null>(null);
  const [analysis,   setAnalysis]   = useState<{ worked: string[]; improve: string[] } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  const [reflMistake,  setReflMistake]  = useState("");
  const [reflInsight,  setReflInsight]  = useState("");
  const [reflSurprise, setReflSurprise] = useState("");
  const [reflSubmitting, setReflSubmitting] = useState(false);
  const [reflSubmitted,  setReflSubmitted]  = useState(false);

  useEffect(() => {
    // All results for comparison + rank
    supabase.from("results").select("roi, team_id, teams(team_name)")
      .eq("session_id", sessionId).order("roi", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => { if (data) setAllResults((data as any[]).map(r => ({ team_id: r.team_id, team_name: (Array.isArray(r.teams) ? r.teams[0]?.team_name : r.teams?.team_name) ?? "Unknown", roi: r.roi }))); });

    // This team's strategy
    supabase.from("teams").select("strategy").eq("id", teamId).single()
      .then(({ data }) => { if (data?.strategy) setStrategy(data.strategy as Strategy); });

    // Already reflected?
    supabase.from("reflections").select("id").eq("team_id", teamId).maybeSingle()
      .then(({ data }) => { if (data) setReflSubmitted(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, teamId]);

  useEffect(() => {
    if (!strategy) return;
    fetch("/api/analyze-result", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, strategy, scenario }),
    })
      .then(r => r.json()).then(d => { setAnalysis(d); setAnalysisLoading(false); })
      .catch(() => { setAnalysis({ worked: ["Good platform engagement", "Clear objective alignment"], improve: ["Refine budget split", "Tighten demographic targeting"] }); setAnalysisLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy]);

  const rank = allResults.length > 0 ? allResults.findIndex(r => r.team_id === teamId) + 1 : null;

  const METRICS = [
    { key: "reach",      label: "Reach",           topColor: "#e30613", displayVal: toScore("reach", result),   unit: "/100",  decimals: 0, explanation: result.reach_explanation },
    { key: "engagement", label: "Engagement Rate",  topColor: "#1a1a1a", displayVal: result.engagement_rate,     unit: "%",     decimals: 1, explanation: result.engagement_explanation },
    { key: "conversion", label: "Conversion Rate",  topColor: "#666666", displayVal: result.conversion_rate,     unit: "%",     decimals: 1, explanation: result.conversion_explanation },
    { key: "roi",        label: "ROI",              topColor: "#e30613", displayVal: result.roi,                 unit: "× ROI", decimals: 1, explanation: result.roi_explanation },
  ];

  const container: React.CSSProperties = { maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 2rem" };

  async function submitReflection() {
    if (!reflMistake.trim() && !reflInsight.trim() && !reflSurprise.trim()) return;
    setReflSubmitting(true);
    await supabase.from("reflections").insert({ session_id: sessionId, team_id: teamId, biggest_mistake: reflMistake.trim(), winning_insight: reflInsight.trim(), biggest_surprise: reflSurprise.trim() });
    setReflSubmitting(false);
    setReflSubmitted(true);
  }

  return (
    <div className={sourceSans.className} style={{ background: "#ffffff", color: "#1a1a1a", minHeight: "100vh" }}>

      {/* ── NAV (exact HdM landing page nav) ─────────────────────── */}
      <nav style={{ background: "#ffffff", borderBottom: "1px solid #e0e0e0", height: "72px", display: "flex", alignItems: "center", padding: "0 2rem", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://hdm-stuttgart.de/_assets/08d436265eb2875b100f4b4e69dd70a4/Images/Logo/Logo-HdM_b.svg" alt="Hochschule der Medien Stuttgart" style={{ height: "40px" }} />
          <div style={{ width: "1px", height: "32px", background: "#e0e0e0" }} />
          <span style={{ fontSize: "1rem", fontWeight: 600, color: "#1a1a1a" }}>SMM Campaign Lab</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", fontSize: "0.75rem", color: "#666666", padding: "4px 12px", borderRadius: "4px" }}>
            Powered by Google Gemini AI
          </div>
          <button
            onClick={() => { localStorage.removeItem("campaignlab_student"); window.location.href = "/student"; }}
            style={{ background: "white", border: "1px solid #e30613", borderRadius: "4px", padding: "5px 14px", fontSize: "0.78rem", fontWeight: 700, color: "#e30613", cursor: "pointer", fontFamily: "inherit" }}
          >
            &#x2192; Sign Out
          </button>
        </div>
      </nav>

      {/* ── SECTION 1: HERO BANNER ───────────────────────────────── */}
      <section style={{ background: "#e30613", padding: "3rem 2rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2rem", flexWrap: "wrap" }}>

          {/* Left */}
          <div style={{ flex: 1, minWidth: "260px" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 300, opacity: 0.8, letterSpacing: "0.12em", textTransform: "uppercase", color: "white", margin: "0 0 0.75rem 0" }}>
              SMM Campaign Lab &middot; Session Results
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              {rank && (
                <span style={{ background: "white", color: "#e30613", fontSize: "0.9rem", fontWeight: 700, padding: "4px 12px", borderRadius: "4px", flexShrink: 0 }}>
                  {ordinal(rank)}
                </span>
              )}
              <span style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, color: "white", lineHeight: 1.1 }}>
                {teamName}
              </span>
            </div>
            <p style={{ fontSize: "1rem", fontWeight: 300, opacity: 0.9, maxWidth: "500px", lineHeight: 1.6, color: "white", margin: 0 }}>
              {result.overall_verdict}
            </p>
          </div>

          {/* Right — ROI headline */}
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 300, opacity: 0.7, letterSpacing: "0.15em", textTransform: "uppercase", color: "white", margin: "0 0 0.25rem 0" }}>
              Return on Investment
            </p>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: "0.4rem" }}>
              <span style={{ fontSize: "5rem", fontWeight: 700, lineHeight: 1, fontFamily: "monospace", color: "white" }}>
                <AnimatedNumber value={result.roi} duration={1500} decimals={1} />
              </span>
              <span style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.8)", fontWeight: 300 }}>× ROI</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: FOUR METRIC CARDS ─────────────────────────── */}
      <section style={{ background: "#f5f5f5", padding: "2.5rem 2rem" }}>
        <div style={container}>
          <SectionHead>Your Performance Metrics</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            {METRICS.map(m => {
              const score = toScore(m.key, result);
              const b = badge(score);
              return (
                <div key={m.key} style={{ background: "white", border: "1px solid #e0e0e0", borderTop: `4px solid ${m.topColor}`, borderRadius: "4px", padding: "1.25rem" }}>
                  {/* Horizontal layout: info left, ring right */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                    {/* Left */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#666666", fontWeight: 600, margin: "0 0 0.4rem 0" }}>
                        {m.label}
                      </p>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
                        <span style={{ fontSize: "2.5rem", fontWeight: 700, fontFamily: "monospace", color: "#1a1a1a", lineHeight: 1 }}>
                          <AnimatedNumber value={m.displayVal} duration={1500} decimals={m.decimals} />
                        </span>
                        <span style={{ fontSize: "1rem", color: "#666666" }}>{m.unit}</span>
                      </div>
                      <span style={{ display: "inline-block", marginTop: "0.5rem", fontSize: "0.6rem", fontWeight: 700, color: "white", background: b.bg, padding: "2px 8px", borderRadius: "2px", letterSpacing: "0.08em" }}>
                        {b.label}
                      </span>
                    </div>
                    {/* Right — ring */}
                    <Ring score={score} />
                  </div>
                  {/* Explanation */}
                  <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
                    <p style={{ fontSize: "0.78rem", color: "#666666", fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
                      {m.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: STRATEGY BREAKDOWN ────────────────────────── */}
      {strategy && (
        <section style={{ background: "#ffffff", padding: "2.5rem 2rem" }}>
          <div style={container}>
            <SectionHead>Your Strategy at a Glance</SectionHead>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              {/* Left — platform bar */}
              <div style={{ flex: "1.2", minWidth: "280px" }}>
                <p style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#666666", letterSpacing: "0.08em", fontWeight: 600, margin: "0 0 0.75rem 0" }}>
                  Platform Budget Allocation
                </p>
                <PlatformBar platforms={strategy.platforms} />
              </div>
              {/* Right — pillars + choices */}
              <div style={{ flex: "0.8", minWidth: "220px" }}>
                <p style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#666666", letterSpacing: "0.08em", fontWeight: 600, margin: "0 0 0.75rem 0" }}>
                  Content Pillars
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  {strategy.content_pillars.map((p, i) => (
                    <span key={p} style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", color: "#1a1a1a", fontSize: "0.85rem", padding: "0.4rem 1rem", borderRadius: "2px", borderLeft: `3px solid ${PILLAR_COLORS[i % PILLAR_COLORS.length]}` }}>
                      {p}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0", flexWrap: "wrap" }}>
                  {[
                    { label: "Audience", value: strategy.target_demographic },
                    { label: "Frequency", value: strategy.posting_frequency },
                    { label: "Format", value: strategy.creative_format },
                  ].map((item, i) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0" }}>
                      {i > 0 && <div style={{ width: "1px", height: "32px", background: "#e0e0e0", margin: "0 1rem" }} />}
                      <div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e30613", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}: </span>
                        <span style={{ fontSize: "0.82rem", color: "#1a1a1a", fontWeight: 600 }}>{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 4: CLASS COMPARISON ──────────────────────────── */}
      {allResults.length > 1 && (
        <section style={{ background: "#f5f5f5", padding: "2.5rem 2rem" }}>
          <div style={container}>
            <SectionHead>How You Compare to the Class</SectionHead>
            <ComparisonChart rows={allResults} myId={teamId} />
          </div>
        </section>
      )}

      {/* ── SECTION 5: STRATEGIC ANALYSIS ────────────────────────── */}
      <section style={{ background: "#ffffff", padding: "2.5rem 2rem" }}>
        <div style={container}>
          <SectionHead>Strategic Analysis</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* What Worked */}
            <div style={{ background: "white", border: "1px solid #e0e0e0", borderTop: "4px solid #1a1a1a", borderRadius: "4px", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <div style={{ width: "20px", height: "20px", background: "#1a1a1a", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: "white", fontWeight: 700 }}>✓</span>
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1a1a" }}>What Worked</span>
              </div>
              {analysisLoading ? (
                <div style={{ height: "80px", background: "#f5f5f5", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "0.78rem", color: "#666666" }}>Analysing strategy...</span>
                </div>
              ) : analysis?.worked.map((pt, i) => (
                <div key={i} style={{ display: "flex", gap: "0.75rem", padding: "0.4rem 0", borderBottom: i < (analysis.worked.length - 1) ? "1px solid #f5f5f5" : "none" }}>
                  <span style={{ color: "#e30613", fontWeight: 700, flexShrink: 0 }}>—</span>
                  <span style={{ fontSize: "0.85rem", color: "#1a1a1a", lineHeight: 1.6 }}>{pt}</span>
                </div>
              ))}
            </div>
            {/* What to Improve */}
            <div style={{ background: "white", border: "1px solid #e0e0e0", borderTop: "4px solid #e30613", borderRadius: "4px", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <div style={{ width: "20px", height: "20px", background: "#e30613", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: "white", fontWeight: 700 }}>✗</span>
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1a1a" }}>Areas to Improve</span>
              </div>
              {analysisLoading ? (
                <div style={{ height: "80px", background: "#f5f5f5", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "0.78rem", color: "#666666" }}>Analysing strategy...</span>
                </div>
              ) : analysis?.improve.map((pt, i) => (
                <div key={i} style={{ display: "flex", gap: "0.75rem", padding: "0.4rem 0", borderBottom: i < (analysis.improve.length - 1) ? "1px solid #f5f5f5" : "none" }}>
                  <span style={{ color: "#e30613", fontWeight: 700, flexShrink: 0 }}>—</span>
                  <span style={{ fontSize: "0.85rem", color: "#1a1a1a", lineHeight: 1.6 }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: REFLECTION FORM ───────────────────────────── */}
      <section style={{ background: "#f5f5f5", padding: "2.5rem 2rem" }}>
        <div style={container}>
          <SectionHead>Session Reflection</SectionHead>
          <p style={{ fontSize: "0.82rem", color: "#666666", margin: "-1rem 0 1.5rem 0" }}>
            Your responses are visible to your professor only.
          </p>

          {reflSubmitted ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 0" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "white", fontSize: "0.9rem", fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ fontSize: "0.9rem", color: "#1a1a1a", fontWeight: 600 }}>
                Reflection submitted &mdash; your professor has received it.
              </span>
            </div>
          ) : (
            <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "4px" }}>
              {[
                { num: "01", q: "What was your team's biggest strategic mistake?",   placeholder: "Be honest — what would you change first?",     val: reflMistake,  set: setReflMistake },
                { num: "02", q: "What did the winning team do that you didn't?",     placeholder: "Look at the leaderboard and compare...",        val: reflInsight,  set: setReflInsight },
                { num: "03", q: "What surprised you most about this simulation?",    placeholder: "Did the AI judge what you expected it to?",     val: reflSurprise, set: setReflSurprise },
              ].map(({ num, q, placeholder, val, set }, i, arr) => (
                <div key={num} style={{ display: "flex", gap: "2rem", alignItems: "flex-start", padding: "1.25rem 1.5rem", borderBottom: i < arr.length - 1 ? "1px solid #e0e0e0" : "none" }}>
                  {/* Left — question */}
                  <div style={{ flexShrink: 0, width: "260px" }}>
                    <span style={{ fontSize: "0.65rem", color: "#e30613", fontWeight: 700, letterSpacing: "0.12em", display: "block", marginBottom: "0.3rem" }}>{num}</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1a1a1a", lineHeight: 1.4 }}>{q}</span>
                  </div>
                  {/* Right — textarea */}
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={val}
                      onChange={e => set(e.target.value.slice(0, 200))}
                      placeholder={placeholder}
                      rows={3}
                      maxLength={200}
                      style={{
                        width: "100%", boxSizing: "border-box", height: "80px", resize: "none",
                        background: "white", border: "1px solid #e0e0e0", borderRadius: "4px",
                        padding: "0.6rem 0.75rem", fontFamily: "inherit", fontSize: "0.85rem",
                        color: "#1a1a1a", outline: "none",
                      }}
                      onFocus={e => { e.target.style.borderColor = "#e30613"; }}
                      onBlur={e => { e.target.style.borderColor = "#e0e0e0"; }}
                    />
                    <p style={{ fontSize: "0.7rem", color: "#999999", textAlign: "right", margin: "0.2rem 0 0 0" }}>{val.length}/200</p>
                  </div>
                </div>
              ))}
              <div style={{ padding: "1rem 1.5rem" }}>
                <ReflectionButton submitting={reflSubmitting} disabled={!reflMistake.trim() && !reflInsight.trim() && !reflSurprise.trim()} onClick={submitReflection} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER (exact HdM landing page footer) ───────────────── */}
      <footer style={{ background: "#1a1a1a", color: "white", padding: "2rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://hdm-stuttgart.de/_assets/08d436265eb2875b100f4b4e69dd70a4/Images/Logo/Logo-HdM_white.svg" alt="Hochschule der Medien Stuttgart" style={{ height: "32px" }} />
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: "0.5rem", marginBottom: 0 }}>SMM Campaign Lab</p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.25rem", marginBottom: 0 }}>Social Media Marketing &amp; Management</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>Nobelstrasse 10, 70569 Stuttgart</p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.25rem", marginBottom: 0 }}>Built with Google Gemini AI &middot; Supabase &middot; Vercel</p>
          </div>
        </div>
        <div style={{ maxWidth: "1100px", margin: "1.5rem auto 0", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>&copy; 2025 Hochschule der Medien Stuttgart</p>
        </div>
      </footer>
    </div>
  );
}

function ReflectionButton({ submitting, disabled, onClick }: { submitting: boolean; disabled: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={submitting || disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", padding: "0.85rem", border: "none", borderRadius: "4px",
        background: disabled || submitting ? "#e0e0e0" : hovered ? "#c0050f" : "#e30613",
        color: disabled || submitting ? "#999999" : "white",
        fontSize: "0.9rem", fontWeight: 600, cursor: disabled || submitting ? "not-allowed" : "pointer",
        fontFamily: "inherit", transition: "background 0.2s",
      }}
    >
      {submitting ? "Submitting..." : "Submit Reflection"}
    </button>
  );
}
