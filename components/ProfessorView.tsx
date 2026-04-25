"use client";

import { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import type { Session, Team, Reflection } from "@/lib/types";
import Leaderboard from "@/components/Leaderboard";
import CurveballPanel from "@/components/CurveballPanel";
import { toast } from "@/components/Toast";

// ── Utilities ──────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)}h ago`;
}

function secsSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
}

// ── Sub-components ─────────────────────────────────────────────────────

function BriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={s.briefLabel}>{label}</p>
      <p style={s.briefValue}>{value}</p>
    </div>
  );
}

function StatusBadge({ submitted, joinedAt }: { submitted: boolean; joinedAt: string }) {
  if (submitted) {
    return <Chip label="✓ Submitted" color="var(--green)" bg="rgba(52,211,153,0.1)" />;
  }
  if (secsSince(joinedAt) > 30) {
    return <Chip label="Building..." color="var(--amber)" bg="rgba(251,146,60,0.1)" />;
  }
  return <Chip label="Waiting" color="var(--muted)" bg="rgba(113,113,122,0.1)" />;
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: "0.72rem",
      fontWeight: 700,
      color,
      background: bg,
      padding: "2px 10px",
      borderRadius: "99px",
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function ProfessorView() {
  const supabase = useMemo(() => createClient(), []);

  // Global
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [user, setUser] = useState<User | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);

  // Auth
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Scenario builder
  const [sessionCode] = useState<string>(() => generateCode());
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("Fashion");
  const [objective, setObjective] = useState("Awareness");
  const [personality, setPersonality] = useState(
    "Skeptical CFO — demands ROI justification"
  );
  const [timeLimit, setTimeLimit] = useState(10);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");

  // Session & teams
  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [, setTick] = useState(0);

  // Simulation
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState("");

  // Stage 3 — Reflections
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [highlightingId, setHighlightingId] = useState<string | null>(null);

  // UI
  const [showCurveball, setShowCurveball] = useState(false);
  const [copied, setCopied] = useState(false);

  // Countdown
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // ── Effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setUserLoaded(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, sess) => {
      setUser(sess?.user ?? null);
      setUserLoaded(true);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teams realtime subscription
  useEffect(() => {
    if (stage !== 2 || !session) return;

    supabase
      .from("teams")
      .select("*")
      .eq("session_id", session.id)
      .then(({ data }) => { if (data) setTeams(data as Team[]); });

    const channel = supabase
      .channel(`teams-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `session_id=eq.${session.id}` },
        () => {
          supabase
            .from("teams")
            .select("*")
            .eq("session_id", session.id)
            .then(({ data }) => { if (data) setTeams(data as Team[]); });
        }
      )
      .subscribe();

    // Re-render every 15s to keep "X ago" labels fresh
    const ticker = setInterval(() => setTick((n) => n + 1), 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(ticker);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, session?.id]);

  // Countdown timer
  useEffect(() => {
    if (stage !== 2 || !session) return;
    setTimeLeft(session.time_limit * 60);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, session?.id]);

  // Reflections subscription (stage 3)
  useEffect(() => {
    if (stage !== 3 || !session) return;

    const fetchReflections = async () => {
      const { data } = await supabase
        .from("reflections")
        .select("*, teams(team_name)")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true });
      if (data) {
        setReflections(
          data.map((r: Record<string, unknown> & { teams?: { team_name?: string } }) => ({
            ...r,
            team_name: r.teams?.team_name ?? "Unknown Team",
          })) as Reflection[]
        );
      }
    };

    fetchReflections();
    const ch = supabase
      .channel(`reflections-${session.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "reflections",
        filter: `session_id=eq.${session.id}`,
      }, () => fetchReflections())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, session?.id]);

  // ── Handlers ─────────────────────────────────────────────────────────

  async function handleAuth() {
    setAuthLoading(true);
    setAuthError("");
    const fn = authMode === "login"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setAuthLoading(false);
    if (error) { setAuthError(error.message); toast(error.message, "error"); }
  }

  async function handleLaunch() {
    if (!brandName.trim() || !user) return;
    setLaunching(true);
    setLaunchError("");
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        session_code: sessionCode,
        professor_id: user.id,
        brand_name: brandName,
        industry,
        objective,
        budget: 10000,
        client_personality: personality,
        time_limit: timeLimit,
        status: "waiting",
      })
      .select()
      .single();
    setLaunching(false);
    if (error) { setLaunchError(error.message); toast(error.message, "error"); return; }
    setSession(data as Session);
    toast("Session created successfully!", "success");
    setStage(2);
  }

  async function handleSimulate() {
    if (!session) return;
    setSimulating(true);
    setSimError("");
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
      if (res.ok) {
        toast("Simulation complete! Results are live.", "success");
        setStage(3);
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = d.message || "Simulation failed. Check API logs.";
        setSimError(msg);
        toast(msg, "error");
      }
    } catch {
      const msg = "Network error — check your connection.";
      setSimError(msg);
      toast(msg, "error");
    }
    setSimulating(false);
  }

  async function handleHighlight(reflection: Reflection) {
    if (!session) return;
    setHighlightingId(reflection.id);
    await supabase
      .from("sessions")
      .update({
        highlighted_reflection: {
          team_name: reflection.team_name ?? "Unknown",
          biggest_mistake: reflection.biggest_mistake,
          winning_insight: reflection.winning_insight,
          biggest_surprise: reflection.biggest_surprise,
        },
      })
      .eq("id", session.id);
    toast("Reflection highlighted to all students!", "info");
    setHighlightingId(null);
  }

  async function handleReset() {
    if (!session) return;
    await supabase.from("sessions").update({ status: "closed" }).eq("id", session.id);
    setStage(1);
    setSession(null);
    setTeams([]);
    setSimError("");
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadCSV() {
    if (!session) return;
    const { data } = await supabase
      .from("results")
      .select("*, teams(team_name)")
      .eq("session_id", session.id);
    if (!data?.length) return;

    const headers = ["Team", "Reach", "Engagement%", "Conversion%", "ROI", "Verdict"];
    const rows = data.map((r: Record<string, unknown>) => {
      const team = r.teams as { team_name?: string } | null;
      return [
        team?.team_name ?? "",
        r.reach,
        r.engagement_rate,
        r.conversion_rate,
        r.roi,
        `"${String(r.overall_verdict ?? "").replace(/"/g, '""')}"`,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `campaignlab-${session.session_code}.csv`;
    a.click();
  }

  const submittedCount = teams.filter((t) => t.submitted).length;
  const canSimulate = submittedCount >= 2;

  // ── Loading ───────────────────────────────────────────────────────────

  if (!userLoaded) {
    return (
      <div style={s.centered}>
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  // ── STAGE 1A — Auth form ──────────────────────────────────────────────

  if (stage === 1 && !user) {
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
          {/* HdM red top bar */}
          <div style={{ height: "5px", background: "#e30613" }} />

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
              Campaign Lab &middot; Professor Access
            </p>
          </div>

          {/* Form section */}
          <div style={{ padding: "2rem 2.5rem 2.5rem" }}>
            {authError && (
              <div style={{
                background: "#fff0f0",
                border: "1px solid #e30613",
                borderRadius: "2px",
                padding: "0.65rem 1rem",
                color: "#e30613",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}>
                {authError}
              </div>
            )}

            <div style={{ marginBottom: "1.1rem" }}>
              <label style={hdmLabel}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor@hdm-stuttgart.de"
                style={hdmInput}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={hdmLabel}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={hdmInput}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              />
            </div>

            <button
              onClick={handleAuth}
              disabled={authLoading}
              style={{
                ...hdmBtn,
                opacity: authLoading ? 0.75 : 1,
              }}
            >
              {authLoading ? "Signing in…" : authMode === "login" ? "Log in" : "Sign Up"}
            </button>

            <button
              onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}
              style={{
                display: "block",
                marginTop: "1rem",
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#e30613",
                cursor: "pointer",
                fontSize: "0.85rem",
                textAlign: "center",
                fontFamily: "Arial, sans-serif",
                padding: "0.25rem 0",
              }}
            >
              {authMode === "login" ? "No account? Sign up" : "Have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STAGE 1B — Scenario Builder ───────────────────────────────────────

  if (stage === 1 && user) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <h1 style={s.title}>Create Session</h1>
          <p style={s.muted}>
            Signed in as{" "}
            <span style={{ color: "var(--accent)" }}>{user.email}</span>
          </p>
        </div>

        {/* Session code */}
        <div style={s.card}>
          <p style={{ ...s.label, marginBottom: "0.6rem" }}>Session Code</p>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span style={s.codeDisplay}>{sessionCode}</span>
            <button onClick={() => handleCopy(sessionCode)} style={s.btnOutline}>
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
          <p style={{ ...s.muted, fontSize: "0.75rem", marginTop: "0.5rem" }}>
            Students use this code to join your session
          </p>
        </div>

        {/* Form */}
        <div style={s.card}>
          <div style={s.field}>
            <label style={s.label}>Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Volta Coffee"
              style={s.input}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Industry</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={s.select}>
              {["Fashion","Food & Beverage","Tech","Fitness","Travel","Education","Retail","Beauty","Finance"]
                .map((opt) => <option key={opt}>{opt}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Campaign Objective</label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {["Awareness", "Leads", "Sales"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setObjective(opt)}
                  style={{
                    ...s.pill,
                    background: objective === opt ? "var(--accent)" : "transparent",
                    color: objective === opt ? "#fff" : "var(--muted)",
                    borderColor: objective === opt ? "var(--accent)" : "var(--border)",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Budget</label>
            <span style={s.budgetBadge}>€10,000 Virtual Budget</span>
          </div>

          <div style={s.field}>
            <label style={s.label}>Client Personality</label>
            <select value={personality} onChange={(e) => setPersonality(e.target.value)} style={s.select}>
              {[
                "Skeptical CFO — demands ROI justification",
                "Excited startup founder — open to bold ideas",
                "Conservative corporate director — values risk minimisation",
              ].map((opt) => <option key={opt}>{opt}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Time Limit</label>
            <select value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} style={s.select}>
              {[5, 10, 15, 20].map((t) => (
                <option key={t} value={t}>{t} minutes</option>
              ))}
            </select>
          </div>

          {launchError && <div style={{ ...s.error, marginBottom: "1rem" }}>{launchError}</div>}

          <button
            onClick={handleLaunch}
            disabled={launching || !brandName.trim()}
            style={{ ...s.btnPrimary, opacity: launching || !brandName.trim() ? 0.55 : 1 }}
          >
            {launching ? "Launching…" : "🚀 Launch Session"}
          </button>
        </div>
      </div>
    );
  }

  // ── STAGE 2 — Live Monitor ────────────────────────────────────────────

  if (stage === 2 && session) {
    const mins = String(Math.floor((timeLeft ?? 0) / 60)).padStart(2, "0");
    const secs = String((timeLeft ?? 0) % 60).padStart(2, "0");
    const timerColor = (timeLeft ?? 999) < 60 ? "var(--red)" : "var(--accent)";

    return (
      <div style={s.page}>
        {/* Curveball overlay — self-contained */}
        {showCurveball && (
          <CurveballPanel
            sessionId={session.id}
            onClose={() => setShowCurveball(false)}
          />
        )}

        {/* Header */}
        <div style={{ ...s.header, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={s.title}>Live Session</h1>
          <span style={{
            background: "var(--green)", color: "#000",
            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em",
            padding: "3px 10px", borderRadius: "99px",
          }}>● LIVE</span>
        </div>

        {/* Session code */}
        <div style={{ ...s.card, textAlign: "center" }}>
          <p style={{ ...s.label, marginBottom: "0.75rem" }}>Share this code with your students</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{ ...s.codeDisplay, fontSize: "3rem", letterSpacing: "0.3em" }}>
              {session.session_code}
            </span>
            <button onClick={() => handleCopy(session.session_code)} style={s.btnOutline}>
              {copied ? "✓ Copied" : "📋 Copy Code"}
            </button>
          </div>
        </div>

        {/* Countdown */}
        <div style={{ ...s.card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={s.label}>Time Remaining</p>
          <span style={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 700, color: timerColor }}>
            {mins}:{secs}
          </span>
        </div>

        {/* Brief summary */}
        <div style={s.card}>
          <p style={{ ...s.label, marginBottom: "0.75rem" }}>Session Brief</p>
          <div style={s.briefGrid}>
            <BriefItem label="Brand" value={session.brand_name} />
            <BriefItem label="Industry" value={session.industry} />
            <BriefItem label="Objective" value={session.objective} />
            <BriefItem label="Budget" value="€10,000" />
            <BriefItem label="Client" value={session.client_personality} />
          </div>
        </div>

        {/* Teams */}
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <p style={s.label}>Teams</p>
            <span style={{ ...s.muted, fontSize: "0.8rem" }}>
              {teams.length} joined · {submittedCount} submitted
            </span>
          </div>

          {teams.length === 0 ? (
            <p style={{ ...s.muted, textAlign: "center", padding: "2rem 0" }}>
              Waiting for teams to join…
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {teams.map((team) => (
                <div key={team.id} style={s.teamRow}>
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{team.team_name}</span>
                    <span style={{ ...s.muted, fontSize: "0.73rem", marginLeft: "0.75rem" }}>
                      joined {timeAgo(team.joined_at)}
                    </span>
                  </div>
                  <StatusBadge submitted={team.submitted} joinedAt={team.joined_at} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <button
              onClick={handleSimulate}
              disabled={!canSimulate || simulating}
              title={!canSimulate ? "Need at least 2 submissions" : ""}
              style={{
                ...s.btnPrimary,
                width: "100%",
                opacity: !canSimulate || simulating ? 0.5 : 1,
                cursor: !canSimulate ? "not-allowed" : "pointer",
              }}
            >
              {simulating ? "Running Gemini simulation…" : "⚡ Run Market Simulation"}
            </button>
            {!canSimulate && (
              <p style={{ ...s.muted, fontSize: "0.73rem", marginTop: "0.4rem", textAlign: "center" }}>
                Need at least 2 submissions
              </p>
            )}
            {simError && <div style={{ ...s.error, marginTop: "0.5rem" }}>{simError}</div>}
          </div>

          <button
            onClick={() => setShowCurveball(true)}
            style={{ ...s.btnOutline, flex: 1, minWidth: "200px" }}
          >
            🌪 Inject Curveball
          </button>
        </div>
      </div>
    );
  }

  // ── STAGE 3 — Results Dashboard ────────────────────────────────────────

  const teamCount = teams.length;
  const reflCount = reflections.length;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Simulation Complete!</h1>
        <p style={s.muted}>Here are the results for your session.</p>
      </div>

      {session && <Leaderboard sessionId={session.id} />}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={downloadCSV} style={{ ...s.btnOutline, flex: 1, minWidth: "180px" }}>
          📥 Download Results CSV
        </button>
        <button onClick={handleReset} style={{ ...s.btnDanger, flex: 1, minWidth: "180px" }}>
          🔄 Reset Session
        </button>
      </div>

      {/* ── Class Reflections Panel ── */}
      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: "0 0 0.2rem 0" }}>
              Class Reflections 🧠
            </h2>
            <p style={{ ...s.muted, fontSize: "0.8rem" }}>
              {reflCount} of {teamCount} team{teamCount !== 1 ? "s" : ""} reflected
            </p>
          </div>
          <button
            onClick={() => window.print()}
            style={{ ...s.btnOutline, fontSize: "0.82rem", padding: "0.5rem 1rem" }}
          >
            🖨 Export All as PDF
          </button>
        </div>

        {reflections.length === 0 ? (
          <p style={{ ...s.muted, textAlign: "center", padding: "2rem 0", fontSize: "0.875rem" }}>
            Waiting for students to submit reflections…
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {reflections.map((r) => (
              <div key={r.id} style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.25rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9rem" }}>
                    {r.team_name}
                  </span>
                  <button
                    onClick={() => handleHighlight(r)}
                    disabled={highlightingId === r.id}
                    style={{
                      background: "rgba(167,139,250,0.15)",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                      borderRadius: "6px",
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      opacity: highlightingId === r.id ? 0.5 : 1,
                    }}
                  >
                    {highlightingId === r.id ? "Highlighting…" : "✨ Highlight"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                  {[
                    { label: "Biggest mistake", text: r.biggest_mistake },
                    { label: "Winning insight", text: r.winning_insight },
                    { label: "Biggest surprise", text: r.biggest_surprise },
                  ].map(({ label, text }) => (
                    <div key={label}>
                      <p style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.3rem 0" }}>{label}</p>
                      <p style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.5, margin: 0 }}>
                        {text || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>—</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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

const hdmBtn: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.75rem 1rem",
  background: "#e30613",
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
  page: {
    maxWidth: "760px",
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
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    fontSize: "1.75rem",
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
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    margin: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginBottom: "1.25rem",
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
  pill: {
    padding: "0.4rem 1.1rem",
    borderRadius: "99px",
    border: "1px solid",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 500,
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  btnPrimary: {
    background: "var(--accent)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "0.85rem 1.5rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  btnOutline: {
    background: "transparent",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0.85rem 1.5rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnDanger: {
    background: "rgba(248,113,113,0.08)",
    color: "var(--red)",
    border: "1px solid var(--red)",
    borderRadius: "8px",
    padding: "0.85rem 1.5rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
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
  codeDisplay: {
    fontFamily: "monospace",
    fontSize: "1.5rem",
    fontWeight: 700,
    letterSpacing: "0.2em",
    color: "var(--accent)",
    background: "var(--surface)",
    padding: "0.5rem 1.25rem",
    borderRadius: "8px",
    border: "1px solid var(--border)",
  },
  budgetBadge: {
    display: "inline-block",
    background: "rgba(167,139,250,0.1)",
    color: "var(--accent)",
    border: "1px solid rgba(167,139,250,0.25)",
    borderRadius: "8px",
    padding: "0.5rem 1rem",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  briefGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "1rem",
  },
  briefLabel: {
    fontSize: "0.68rem",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.2rem",
    marginTop: 0,
  },
  briefValue: {
    fontSize: "0.875rem",
    color: "var(--text)",
    fontWeight: 500,
    margin: 0,
  },
  teamRow: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.5rem",
  },
  authCard: {
    width: "100%",
    maxWidth: "400px",
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
  },
  authTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text)",
    margin: "0 0 0.25rem 0",
  },
  authToggle: {
    background: "transparent",
    border: "none",
    color: "var(--accent)",
    cursor: "pointer",
    fontSize: "0.875rem",
    padding: "0.5rem 0",
    textAlign: "center",
    fontFamily: "inherit",
    marginTop: "0.5rem",
  },
};
