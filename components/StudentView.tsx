"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase";
import type { Session, SimulationResult, Platform, HighlightedReflection } from "@/lib/types";
import ScoreCard from "@/components/ScoreCard";
import { toast } from "@/components/Toast";

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

  // Stage 3 — Reflection journal
  const [reflMistake, setReflMistake] = useState("");
  const [reflInsight, setReflInsight] = useState("");
  const [reflSurprise, setReflSurprise] = useState("");
  const [reflSubmitting, setReflSubmitting] = useState(false);
  const [reflSubmitted, setReflSubmitted] = useState(false);

  // Highlighted reflection from professor
  const [highlightBanner, setHighlightBanner] = useState<HighlightedReflection | null>(null);

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
        if (updated.highlighted_reflection) {
          setHighlightBanner(updated.highlighted_reflection);
          setTimeout(() => setHighlightBanner(null), 10000);
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
          setResult(data as unknown as SimulationResult);
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
      toast("Session not found. Check the code and try again.", "error");
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
      toast("Failed to join session. Please try again.", "error");
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
    if (error) { setSubmitError(error.message); toast(error.message, "error"); return; }
    toast("Strategy submitted! Waiting for simulation…", "success");
    setStage(3);
  }

  async function handleReflection() {
    if (!teamId || !session) return;
    setReflSubmitting(true);
    const { error } = await supabase.from("reflections").insert({
      session_id: session.id,
      team_id: teamId,
      biggest_mistake: reflMistake.trim(),
      winning_insight: reflInsight.trim(),
      biggest_surprise: reflSurprise.trim(),
    });
    setReflSubmitting(false);
    if (error) { toast(error.message, "error"); return; }
    setReflSubmitted(true);
    toast("Reflection submitted!", "success");
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
      <div style={{
        minHeight: "100vh",
        background: "#efefef",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
          background: "white",
          boxShadow: "0 4px 32px rgba(0,0,0,0.13)",
          borderRadius: "2px",
          overflow: "hidden",
        }}>
          {/* HdM green top bar for students */}
          <div style={{ height: "5px", background: "#16a34a" }} />

          {/* Logo section */}
          <div style={{ padding: "2rem 2.5rem 1.5rem", borderBottom: "1px solid #e8e8e8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://hdm-stuttgart.de/_assets/08d436265eb2875b100f4b4e69dd70a4/Images/Logo/Logo-HdM_b.svg"
                alt="Hochschule der Medien Stuttgart"
                style={{ height: "50px" }}
              />
              <div style={{
                fontSize: "2.4rem",
                fontWeight: 900,
                color: "#e30613",
                fontStyle: "italic",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                fontFamily: "Arial Black, Arial, sans-serif",
              }}>
                SMM
              </div>
            </div>
            <p style={{
              margin: "0.55rem 0 0 0",
              fontSize: "0.68rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#888",
              fontFamily: "Arial, sans-serif",
            }}>
              Campaign Lab &middot; Student Access
            </p>
          </div>

          {/* Form section */}
          <div style={{ padding: "2rem 2.5rem 2.5rem" }}>
            {joinError && (
              <div style={{
                background: "#fff0f0",
                border: "1px solid #e30613",
                borderRadius: "2px",
                padding: "0.65rem 1rem",
                color: "#e30613",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}>
                {joinError}
              </div>
            )}

            <div style={{ marginBottom: "1.1rem" }}>
              <label style={hdmLabel}>Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Team Alpha"
                style={hdmInput}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={hdmLabel}>Session Code</label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. ABC123"
                maxLength={6}
                style={{
                  ...hdmInput,
                  fontFamily: "monospace",
                  letterSpacing: "0.3em",
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
                ...hdmBtnGreen,
                opacity: joining || !teamName.trim() || sessionCode.length < 6 ? 0.5 : 1,
              }}
            >
              {joining ? "Joining…" : "Join Session →"}
            </button>
          </div>
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
    <>
      {/* Professor-highlighted reflection banner */}
      {highlightBanner && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          background: "var(--accent)",
          color: "white",
          padding: "1.25rem 2rem",
          zIndex: 300,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          <p style={{ fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem 0", opacity: 0.8 }}>
            💡 Professor Highlight — {highlightBanner.team_name}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {[
              { label: "Biggest mistake", text: highlightBanner.biggest_mistake },
              { label: "Winning insight", text: highlightBanner.winning_insight },
              { label: "Biggest surprise", text: highlightBanner.biggest_surprise },
            ].map((item) => (
              <div key={item.label}>
                <p style={{ fontSize: "0.65rem", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.2rem 0" }}>{item.label}</p>
                <p style={{ fontSize: "0.875rem", margin: 0 }}>{item.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setHighlightBanner(null)} style={{ position: "absolute", top: "0.75rem", right: "1rem", background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "1.1rem", opacity: 0.7 }}>✕</button>
        </div>
      )}

      <div style={{ ...s.page, paddingTop: highlightBanner ? "8rem" : undefined }}>
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

            {/* ── Reflection journal ── */}
            <div style={{ ...s.card, marginTop: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: "0 0 0.25rem 0" }}>
                Take a moment to reflect 🧠
              </h3>
              <p style={{ ...s.muted, marginBottom: "1.25rem" }}>
                Your answers are anonymous to other students.
              </p>

              {reflSubmitted ? (
                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🙏</div>
                  <p style={{ color: "var(--green)", fontWeight: 700, margin: "0 0 0.25rem 0" }}>
                    Thank you — your professor can see this.
                  </p>
                </div>
              ) : (
                <>
                  {[
                    { label: "What was the biggest mistake in your strategy?", val: reflMistake, set: setReflMistake },
                    { label: "What did the winning team do that you didn't?", val: reflInsight, set: setReflInsight },
                    { label: "What surprised you most about this simulation?", val: reflSurprise, set: setReflSurprise },
                  ].map(({ label, val, set }) => (
                    <div key={label} style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.4rem", lineHeight: 1.4 }}>
                        {label}
                      </label>
                      <textarea
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        rows={3}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "0.65rem 0.85rem",
                          color: "var(--text)",
                          fontSize: "0.875rem",
                          fontFamily: "inherit",
                          resize: "vertical",
                          outline: "none",
                          lineHeight: 1.5,
                        }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleReflection}
                    disabled={reflSubmitting || (!reflMistake.trim() && !reflInsight.trim() && !reflSurprise.trim())}
                    style={{
                      ...s.btnGreen,
                      opacity: reflSubmitting ? 0.6 : 1,
                      marginTop: "0.5rem",
                    }}
                  >
                    {reflSubmitting ? "Submitting…" : "Submit Reflection"}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ── HdM login-page styles (white institutional theme) ─────────────────

const hdmLabel: CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#555",
  marginBottom: "0.4rem",
  fontFamily: "Arial, sans-serif",
};

const hdmInput: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "0.7rem 0.85rem",
  border: "1px solid #ccc",
  borderRadius: "2px",
  fontSize: "0.95rem",
  color: "#1a1a1a",
  background: "white",
  outline: "none",
  fontFamily: "Arial, sans-serif",
};

const hdmBtnGreen: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.75rem 1rem",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "2px",
  fontSize: "0.95rem",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "Arial, sans-serif",
  letterSpacing: "0.02em",
};

// ── App styles (dark theme) ────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
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
