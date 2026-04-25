"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { Session, SimulationResult, Platform } from "@/lib/types";
import ScoreCard from "@/components/ScoreCard";

// ── Constants ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { name: "Instagram", emoji: "📸" },
  { name: "TikTok",    emoji: "🎵" },
  { name: "LinkedIn",  emoji: "💼" },
  { name: "X/Twitter", emoji: "🐦" },
  { name: "YouTube",   emoji: "▶️" },
];

const PILLAR_OPTIONS = [
  "Education", "Entertainment", "Inspiration", "Behind the Scenes",
  "Product Showcase", "Community", "Trending", "Storytelling",
];

const FREQUENCY_OPTIONS = ["3× per week", "Daily", "Twice daily", "Multiple times daily"];
const DEMOGRAPHIC_OPTIONS = ["Gen Z (18-24)", "Millennials (25-34)", "Gen X (35-44)", "Mixed"];
const FORMAT_OPTIONS = ["Reels-heavy", "Carousel-heavy", "Mixed formats", "Static image-heavy"];

// ── Sub-components ─────────────────────────────────────────────────────

function BriefBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: "0.3rem 0.65rem",
      borderRadius: "6px",
      fontSize: "0.75rem",
      fontWeight: 600,
      color,
      background: "rgba(255,255,255,0.05)",
      border: `1px solid ${color}`,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function PulsingDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c % 3) + 1), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <p style={{ color: "var(--muted)", marginTop: "1.25rem", fontSize: "1.5rem", letterSpacing: "0.25em" }}>
      {".".repeat(count)}
    </p>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function StudentView() {
  const supabase = useMemo(() => createClient(), []);

  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [restored, setRestored] = useState(false);

  // Stage 1 — Join
  const [teamName, setTeamName] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  // Session & team
  const [session, setSession] = useState<Session | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Curveball
  const [curveball, setCurveball] = useState<{ type: string; message: string } | null>(null);
  const [flashOn, setFlashOn] = useState(true);

  // Countdown
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Stage 2 — Strategy
  const [platforms, setPlatforms] = useState<Platform[]>(
    PLATFORMS.map((p) => ({ name: p.name, budget_percent: 20 }))
  );
  const [pillars, setPillars] = useState<string[]>([]);
  const [pillarError, setPillarError] = useState("");
  const [demographic, setDemographic] = useState("Gen Z (18-24)");
  const [frequency, setFrequency] = useState("Daily");
  const [format, setFormat] = useState("Mixed formats");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const pillarGridRef = useRef<HTMLDivElement>(null);

  // Stage 3 — Results
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("campaignlab_student");
      if (!saved) { setRestored(true); return; }
      const { teamId: tid, sessionId } = JSON.parse(saved) as { teamId: string; sessionId: string };
      Promise.all([
        supabase.from("teams").select("*").eq("id", tid).single(),
        supabase.from("sessions").select("*").eq("id", sessionId).single(),
      ]).then(([teamRes, sessRes]) => {
        if (teamRes.data && sessRes.data) {
          setTeamId(tid);
          setSession(sessRes.data as Session);
          setTeamName(teamRes.data.team_name ?? "");
          setStage(teamRes.data.submitted ? 3 : 2);
        }
        setRestored(true);
      });
    } catch {
      setRestored(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Curveball flash toggle
  useEffect(() => {
    if (!curveball) return;
    const id = setInterval(() => setFlashOn((f) => !f), 550);
    return () => clearInterval(id);
  }, [curveball]);

  // Session realtime — watch for curveball injection
  useEffect(() => {
    if (stage < 2 || !session) return;
    if (session.curveball) {
      setCurveball(session.curveball as { type: string; message: string });
    }
    const ch = supabase
      .channel(`session-cb-${session.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        const updated = payload.new as Session;
        if (updated.curveball) {
          setCurveball(updated.curveball as { type: string; message: string });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, session?.id]);

  // Countdown timer
  useEffect(() => {
    if (stage !== 2 || !session) return;
    setTimeLeft(session.time_limit * 60);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 0) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, session?.id]);

  // Results realtime subscription
  useEffect(() => {
    if (stage !== 3 || !teamId) return;

    const cols = [
      "reach", "engagement_rate", "conversion_rate", "roi",
      "reach_explanation", "engagement_explanation",
      "conversion_explanation", "roi_explanation", "overall_verdict",
    ].join(",");

    // Check if result already exists (professor may have run sim before student reached stage 3)
    supabase
      .from("results")
      .select(cols)
      .eq("team_id", teamId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setResult(data as SimulationResult);
          setTimeout(() => setShowResult(true), 400);
        }
      });

    const ch = supabase
      .channel(`results-${teamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "results",
        filter: `team_id=eq.${teamId}`,
      }, (payload) => {
        setResult(payload.new as unknown as SimulationResult);
        setTimeout(() => setShowResult(true), 400);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, teamId]);

  // ── Handlers ─────────────────────────────────────────────────────────

  async function handleJoin() {
    if (!teamName.trim() || sessionCode.length < 6) return;
    setJoining(true);
    setJoinError("");

    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_code", sessionCode)
      .eq("status", "waiting")
      .limit(1);

    if (!sessions?.length) {
      setJoinError("Session not found. Check the code and try again.");
      setJoining(false);
      return;
    }

    const found = sessions[0] as Session;

    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .insert({ session_id: found.id, team_name: teamName.trim(), submitted: false })
      .select()
      .single();

    setJoining(false);

    if (teamErr || !team) {
      setJoinError("Failed to join session. Please try again.");
      return;
    }

    const tid = team.id as string;
    setTeamId(tid);
    setSession(found);
    localStorage.setItem(
      "campaignlab_student",
      JSON.stringify({ teamId: tid, sessionId: found.id })
    );
    setStage(2);
  }

  function handlePillarToggle(pillar: string) {
    if (pillars.includes(pillar)) {
      setPillars((prev) => prev.filter((p) => p !== pillar));
      setPillarError("");
    } else if (pillars.length >= 3) {
      setPillarError("Maximum 3 pillars");
      const el = pillarGridRef.current;
      if (el) {
        el.style.animation = "none";
        void el.offsetHeight; // trigger reflow
        el.style.animation = "shake 0.45s ease";
        setTimeout(() => { if (el) el.style.animation = ""; }, 450);
      }
    } else {
      setPillars((prev) => {
        const next = [...prev, pillar];
        if (next.length === 3) setPillarError("");
        return next;
      });
    }
  }

  async function handleSubmit() {
    if (!teamId || !canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    const { error } = await supabase
      .from("teams")
      .update({
        strategy: {
          platforms,
          content_pillars: pillars,
          target_demographic: demographic,
          posting_frequency: frequency,
          creative_format: format,
        },
        submitted: true,
      })
      .eq("id", teamId);
    setSubmitting(false);
    if (error) { setSubmitError(error.message); return; }
    setStage(3);
  }

  const budgetTotal = platforms.reduce((sum, p) => sum + p.budget_percent, 0);
  const canSubmit = budgetTotal === 100 && pillars.length === 3;
  const submitHint =
    budgetTotal !== 100
      ? `Budget is ${budgetTotal}% — adjust sliders to reach exactly 100%`
      : pillars.length < 3
      ? `Select ${3 - pillars.length} more content pillar${3 - pillars.length !== 1 ? "s" : ""}`
      : "";

  // ── Loading ───────────────────────────────────────────────────────────

  if (!restored) {
    return <div style={s.centered}><p style={s.muted}>Loading…</p></div>;
  }

  // ── STAGE 1 — Join ────────────────────────────────────────────────────

  if (stage === 1) {
    return (
      <div style={s.pageCenter}>
        <div style={s.joinCard}>
          <div style={{ fontSize: "2.5rem", textAlign: "center" }}>🎯</div>
          <h1 style={{ ...s.title, textAlign: "center", marginTop: "0.5rem" }}>
            Join CampaignLab
          </h1>

          {joinError && (
            <div style={{ ...s.error, marginTop: "1rem" }}>{joinError}</div>
          )}

          <div style={{ ...s.field, marginTop: "1.25rem" }}>
            <label style={s.label}>Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Team Alpha"
              style={s.input}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Session Code</label>
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="e.g. ABC123"
              maxLength={6}
              style={{
                ...s.input,
                fontFamily: "monospace",
                letterSpacing: "0.25em",
                fontSize: "1.1rem",
                textTransform: "uppercase",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={joining || !teamName.trim() || sessionCode.length < 6}
            style={{
              ...s.btnGreen,
              opacity: joining || !teamName.trim() || sessionCode.length < 6 ? 0.5 : 1,
            }}
          >
            {joining ? "Joining…" : "Join Session →"}
          </button>
        </div>
      </div>
    );
  }

  // ── STAGE 2 — Strategy Builder ────────────────────────────────────────

  if (stage === 2 && session) {
    const mins = String(Math.floor((timeLeft ?? 0) / 60)).padStart(2, "0");
    const secs = String((timeLeft ?? 0) % 60).padStart(2, "0");
    const urgent = (timeLeft ?? 999) < 60;

    return (
      <>
        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20%      { transform: translateX(-7px); }
            40%      { transform: translateX(7px); }
            60%      { transform: translateX(-4px); }
            80%      { transform: translateX(4px); }
          }
        `}</style>

        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

          {/* ── Curveball banner ── */}
          {curveball && (
            <div style={{
              background: flashOn ? "#e30613" : "#9c0410",
              color: "white",
              padding: "0.9rem 1.5rem",
              textAlign: "center",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "0.01em",
              position: "sticky",
              top: 0,
              zIndex: 200,
            }}>
              🚨 BREAKING: {curveball.message}
            </div>
          )}

          <div style={s.page}>

            {/* Brief */}
            <div style={s.card}>
              <p style={{ ...s.label, marginBottom: "0.65rem" }}>Campaign Brief</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <BriefBadge label={session.brand_name} color="var(--accent)" />
                <BriefBadge label={session.industry} color="var(--amber)" />
                <BriefBadge label={session.objective} color="var(--green)" />
                <BriefBadge label="€10,000" color="var(--muted)" />
                <BriefBadge
                  label={session.client_personality.split("—")[0].trim()}
                  color="var(--red)"
                />
              </div>
            </div>

            {/* Countdown */}
            <div style={{
              ...s.card,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <p style={s.label}>Time Remaining</p>
              <span style={{
                fontFamily: "monospace",
                fontSize: "2rem",
                fontWeight: 700,
                color: urgent ? "var(--red)" : "var(--green)",
              }}>
                {mins}:{secs}
              </span>
            </div>

            {/* ── Section 1: Platform allocation ── */}
            <div style={s.card}>
              <p style={s.sectionTitle}>1 — Platform Budget Allocation</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "1rem" }}>
                {PLATFORMS.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{
                      width: "118px",
                      fontSize: "0.875rem",
                      color: "var(--text)",
                      flexShrink: 0,
                    }}>
                      {p.emoji} {p.name}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={platforms[i].budget_percent}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPlatforms((prev) =>
                          prev.map((pl, idx) =>
                            idx === i ? { ...pl, budget_percent: v } : pl
                          )
                        );
                      }}
                      style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                    <span style={{
                      width: "42px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "var(--text)",
                    }}>
                      {platforms[i].budget_percent}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Budget total indicator */}
              <div style={{
                marginTop: "1rem",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                textAlign: "center",
                fontWeight: 700,
                fontSize: "0.875rem",
                background: budgetTotal === 100
                  ? "rgba(52,211,153,0.1)"
                  : "rgba(248,113,113,0.1)",
                border: `1px solid ${budgetTotal === 100
                  ? "rgba(52,211,153,0.35)"
                  : "rgba(248,113,113,0.35)"}`,
                color: budgetTotal === 100 ? "var(--green)" : "var(--red)",
              }}>
                {budgetTotal === 100
                  ? "✓ Total: 100% — Perfect allocation"
                  : `Total: ${budgetTotal}% (must be exactly 100%)`}
              </div>
            </div>

            {/* ── Section 2: Content pillars ── */}
            <div style={s.card}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}>
                <p style={s.sectionTitle}>2 — Content Pillars</p>
                <span style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: pillars.length === 3 ? "var(--green)" : "var(--muted)",
                }}>
                  {pillars.length}/3 selected
                </span>
              </div>

              <div
                ref={pillarGridRef}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "0.6rem",
                  marginTop: "0.85rem",
                }}
              >
                {PILLAR_OPTIONS.map((pillar) => {
                  const selected = pillars.includes(pillar);
                  return (
                    <button
                      key={pillar}
                      onClick={() => handlePillarToggle(pillar)}
                      style={{
                        padding: "0.55rem 0.75rem",
                        borderRadius: "8px",
                        border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                        background: selected ? "rgba(167,139,250,0.15)" : "transparent",
                        color: selected ? "var(--accent)" : "var(--muted)",
                        fontSize: "0.82rem",
                        fontWeight: selected ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                        textAlign: "left",
                      }}
                    >
                      {selected ? "✓ " : ""}{pillar}
                    </button>
                  );
                })}
              </div>

              {pillarError && (
                <p style={{
                  color: "var(--red)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginTop: "0.6rem",
                  marginBottom: 0,
                }}>
                  ⚠ {pillarError}
                </p>
              )}
            </div>

            {/* ── Section 3: Target demographic ── */}
            <div style={s.card}>
              <p style={s.sectionTitle}>3 — Target Demographic</p>
              <select
                value={demographic}
                onChange={(e) => setDemographic(e.target.value)}
                style={{ ...s.select, marginTop: "0.75rem" }}
              >
                {DEMOGRAPHIC_OPTIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* ── Section 4: Posting frequency ── */}
            <div style={s.card}>
              <p style={s.sectionTitle}>4 — Posting Frequency</p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                {FREQUENCY_OPTIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "99px",
                      border: `1px solid ${frequency === f ? "var(--accent)" : "var(--border)"}`,
                      background: frequency === f ? "rgba(167,139,250,0.15)" : "transparent",
                      color: frequency === f ? "var(--accent)" : "var(--muted)",
                      fontWeight: frequency === f ? 600 : 400,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Section 5: Creative format ── */}
            <div style={s.card}>
              <p style={s.sectionTitle}>5 — Creative Format Mix</p>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{ ...s.select, marginTop: "0.75rem" }}
              >
                {FORMAT_OPTIONS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            {/* Submit */}
            {submitHint && (
              <p style={{ ...s.muted, textAlign: "center", fontSize: "0.8rem" }}>
                {submitHint}
              </p>
            )}
            {submitError && <div style={s.error}>{submitError}</div>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              style={{
                ...s.btnGreen,
                opacity: !canSubmit || submitting ? 0.4 : 1,
                cursor: !canSubmit ? "not-allowed" : "pointer",
                fontSize: "1rem",
                padding: "1rem 1.5rem",
              }}
            >
              {submitting ? "Submitting…" : "Submit Strategy 🚀"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── STAGE 3 — Waiting for results ────────────────────────────────────

  return (
    <div style={s.page}>
      {!showResult ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{ fontSize: "3.5rem" }}>✅</div>
          <h2 style={{ ...s.title, marginTop: "1rem" }}>Strategy submitted!</h2>
          <p style={{ ...s.muted, marginTop: "0.5rem" }}>
            Waiting for professor to run simulation
          </p>
          <PulsingDots />
        </div>
      ) : result ? (
        <div style={{ opacity: 1, transition: "opacity 0.5s ease" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "2.5rem", letterSpacing: "0.1em" }}>🎉 🏆 🎉</div>
            <h2 style={{ ...s.title, marginTop: "0.75rem" }}>The market has spoken.</h2>
            <p style={{ ...s.muted, marginTop: "0.25rem" }}>Here are your results.</p>
          </div>
          <ScoreCard result={result} team_name={teamName || "Your Team"} />
        </div>
      ) : null}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  pageCenter: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    background: "var(--bg)",
  },
  page: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "2rem 1.5rem 4rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  centered: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "60vh",
  },
  joinCard: {
    width: "100%",
    maxWidth: "400px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "var(--text)",
    margin: 0,
  },
  muted: {
    color: "var(--muted)",
    margin: 0,
    fontSize: "0.875rem",
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  label: {
    fontSize: "0.73rem",
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: 0,
  },
  sectionTitle: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--text)",
    margin: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  input: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "var(--text)",
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  select: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "var(--text)",
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  btnGreen: {
    background: "var(--green)",
    color: "#000",
    border: "none",
    borderRadius: "8px",
    padding: "0.85rem 1.5rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  error: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.4)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "var(--red)",
    fontSize: "0.875rem",
    margin: 0,
  },
};
