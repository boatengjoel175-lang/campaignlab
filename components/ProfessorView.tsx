"use client";

import { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import type { Session, Team, Reflection } from "@/lib/types";
import Leaderboard from "@/components/Leaderboard";
import CurveballPanel from "@/components/CurveballPanel";
import HdMHeader from "@/components/HdMHeader";
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

  // Stage 3 — Top results for KPI cards
  const [topResults, setTopResults] = useState<{ roi: number; reach: number; engagement_rate: number } | null>(null);

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

    // Fetch top results for KPI cards
    supabase
      .from("results")
      .select("roi, reach, engagement_rate")
      .eq("session_id", session.id)
      .order("roi", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setTopResults(data as { roi: number; reach: number; engagement_rate: number }); });

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
      <div style={{ minHeight: "100vh", background: "#f4f4f4", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <HdMHeader
          title="Campaign Lab"
          subtitle="Create Session"
          right={
            <button
              onClick={async () => { await supabase.auth.signOut(); setUser(null); setStage(1); }}
              style={{ background: "white", border: "1px solid #e30613", borderRadius: "6px", padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 700, color: "#e30613", cursor: "pointer", fontFamily: "Arial, sans-serif" }}
            >
              &#x2192; Sign Out
            </button>
          }
        />

        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "1.75rem 2rem 4rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1a1a1a", margin: "0 0 0.2rem 0" }}>Create a Session</h1>
            <p style={{ color: "#777", margin: 0, fontSize: "0.82rem" }}>Signed in as <strong>{user.email}</strong></p>
          </div>

          <div style={lt.card}>
            <p style={lt.label}>Your Session Code</p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <span style={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 700, letterSpacing: "0.25em", color: "#e30613", background: "#fef2f2", padding: "0.5rem 1.25rem", borderRadius: "6px", border: "1px solid #fca5a5" }}>
                {sessionCode}
              </span>
              <button onClick={() => handleCopy(sessionCode)} style={lt.hBtn}>{copied ? "Copied" : "Copy"}</button>
            </div>
            <p style={{ ...lt.muted, marginTop: "0.4rem", fontSize: "0.75rem" }}>Share this code with your students</p>
          </div>

          <div style={lt.card}>
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={lt.label}>Brand Name</label>
              <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Volta Coffee" style={lt.input} />
            </div>
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={lt.label}>Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={lt.select}>
                {["Fashion","Food & Beverage","Tech","Fitness","Travel","Education","Retail","Beauty","Finance"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={lt.label}>Campaign Objective</label>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {["Awareness","Leads","Sales"].map((o) => (
                  <button key={o} onClick={() => setObjective(o)} style={{ padding: "0.45rem 1.1rem", borderRadius: "4px", border: `1px solid ${objective === o ? "#e30613" : "#ddd"}`, background: objective === o ? "#e30613" : "white", color: objective === o ? "white" : "#555", fontWeight: objective === o ? 700 : 400, fontSize: "0.85rem", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>{o}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={lt.label}>Budget</label>
              <div style={{ display: "inline-block", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.9rem", fontWeight: 600, color: "#16a34a" }}>
                EUR 10,000 Virtual Budget
              </div>
            </div>
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={lt.label}>Client Personality</label>
              <select value={personality} onChange={(e) => setPersonality(e.target.value)} style={lt.select}>
                {["Skeptical CFO — demands ROI justification","Excited startup founder — open to bold ideas","Conservative corporate director — values risk minimisation"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={lt.label}>Time Limit</label>
              <select value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} style={lt.select}>
                {[5,10,15,20].map((t) => <option key={t} value={t}>{t} minutes</option>)}
              </select>
            </div>
            {launchError && <div style={{ ...lt.error, marginBottom: "1rem" }}>{launchError}</div>}
            <button onClick={handleLaunch} disabled={launching || !brandName.trim()} style={{ ...lt.btnRed, opacity: launching || !brandName.trim() ? 0.5 : 1, cursor: launching || !brandName.trim() ? "not-allowed" : "pointer" }}>
              {launching ? "Launching..." : "Launch Session"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STAGE 2 — Live Monitor ────────────────────────────────────────────

  if (stage === 2 && session) {
    const mins = String(Math.floor((timeLeft ?? 0) / 60)).padStart(2, "0");
    const secs = String((timeLeft ?? 0) % 60).padStart(2, "0");
    const timerUrgent = (timeLeft ?? 999) < 60;

    return (
      <div style={{ minHeight: "100vh", background: "#f4f4f4", fontFamily: "Arial, Helvetica, sans-serif" }}>
        {showCurveball && <CurveballPanel sessionId={session.id} onClose={() => setShowCurveball(false)} />}

        <HdMHeader
          title="Campaign Lab"
          subtitle="Live Session"
          badge="LIVE"
          right={
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => window.location.reload()} style={lt.hBtn}>&#x21BA; Refresh</button>
              <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setStage(1); setSession(null); setTeams([]); }} style={{ ...lt.hBtn, color: "#e30613", borderColor: "#e30613" }}>
                &#x2192; Sign Out
              </button>
            </div>
          }
        />

        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem 2rem 4rem" }}>

          <div style={{ ...lt.card, textAlign: "center" }}>
            <p style={{ ...lt.label, marginBottom: "0.75rem" }}>Share this code with your students</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontSize: "3rem", fontWeight: 700, letterSpacing: "0.3em", color: "#e30613", background: "#fef2f2", padding: "0.5rem 1.5rem", borderRadius: "6px", border: "1px solid #fca5a5" }}>
                {session.session_code}
              </span>
              <button onClick={() => handleCopy(session.session_code)} style={lt.hBtn}>{copied ? "Copied" : "Copy Code"}</button>
            </div>
          </div>

          <div style={{ ...lt.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={lt.label}>Time Remaining</span>
            <span style={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 700, color: timerUrgent ? "#dc2626" : "#16a34a" }}>
              {mins}:{secs}
            </span>
          </div>

          <div style={lt.card}>
            <p style={{ ...lt.label, marginBottom: "0.75rem" }}>Session Brief</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
              {[{l:"Brand",v:session.brand_name},{l:"Industry",v:session.industry},{l:"Objective",v:session.objective},{l:"Budget",v:"EUR 10,000"},{l:"Client",v:session.client_personality}].map(({l,v}) => (
                <div key={l}>
                  <p style={{ fontSize: "0.65rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.2rem 0" }}>{l}</p>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={lt.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <p style={lt.label}>Teams</p>
              <span style={{ ...lt.muted, fontSize: "0.8rem" }}>{teams.length} joined &middot; {submittedCount} submitted</span>
            </div>
            {teams.length === 0 ? (
              <p style={{ ...lt.muted, textAlign: "center", padding: "1.5rem 0" }}>Waiting for teams to join...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {teams.map((team) => {
                  const age = secsSince(team.joined_at);
                  const badge = team.submitted
                    ? { label: "Submitted", color: "#16a34a", bg: "#f0fdf4" }
                    : age > 30
                    ? { label: "Building...", color: "#d97706", bg: "#fefce8" }
                    : { label: "Waiting", color: "#999", bg: "#f5f5f5" };
                  return (
                    <div key={team.id} style={{ background: "#f9f9f9", border: "1px solid #e8e8e8", borderRadius: "6px", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "0.9rem" }}>{team.team_name}</span>
                        <span style={{ color: "#999", fontSize: "0.73rem", marginLeft: "0.75rem" }}>joined {timeAgo(team.joined_at)}</span>
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: badge.color, background: badge.bg, padding: "3px 12px", borderRadius: "99px", border: `1px solid ${badge.color}55` }}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <button onClick={handleSimulate} disabled={!canSimulate || simulating} style={{ width: "100%", padding: "0.9rem", background: canSimulate ? "#e30613" : "#e0e0e0", color: canSimulate ? "white" : "#999", border: "none", borderRadius: "6px", fontSize: "0.95rem", fontWeight: 700, cursor: canSimulate ? "pointer" : "not-allowed", fontFamily: "Arial, sans-serif" }}>
                {simulating ? "Running simulation..." : "Run Market Simulation"}
              </button>
              {!canSimulate && <p style={{ ...lt.muted, fontSize: "0.72rem", textAlign: "center", marginTop: "0.4rem" }}>Need at least 2 submissions</p>}
              {simError && <div style={{ ...lt.error, marginTop: "0.5rem" }}>{simError}</div>}
            </div>
            <button onClick={() => setShowCurveball(true)} style={{ padding: "0.9rem", background: "white", color: "#1a1a1a", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "Arial, sans-serif" }}>
              Inject Curveball
            </button>
          </div>
        </div>
      </div>
    );
  }


  // ── STAGE 3 — Results Dashboard (White Professional Layout) ─────────────

  const teamCount = teams.length;
  const reflCount = reflections.length;

  const kpiCards = [
    { label: "Teams Competed", value: String(teamCount), unit: "", color: "#4f46e5", icon: "👥" },
    { label: "Best ROI", value: topResults ? topResults.roi.toFixed(1) : "—", unit: "×", color: "#e30613", icon: "📈" },
    { label: "Best Reach", value: topResults ? `${(topResults.reach / 1000).toFixed(0)}k` : "—", unit: " people", color: "#16a34a", icon: "👁" },
    { label: "Reflections", value: `${reflCount}/${teamCount}`, unit: " teams", color: "#d97706", icon: "🧠" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5f7", fontFamily: "Arial, Helvetica, sans-serif" }}>

      <HdMHeader
        title="Campaign Lab"
        subtitle="Simulation Results"
        badge="Complete"
        right={
          <>
            <button onClick={downloadCSV} style={lb.hBtn}>Export CSV</button>
            <button onClick={() => window.print()} style={lb.hBtn}>Print</button>
            <button onClick={() => window.location.reload()} style={lb.hBtn}>&#x21BA; Refresh</button>
            <button onClick={handleReset} style={{ ...lb.hBtn, color: "#e30613", borderColor: "#e30613" }}>
              New Session
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setStage(1); setSession(null); setTeams([]); }} style={{ ...lb.hBtn, color: "#e30613", borderColor: "#e30613" }}>
              &#x2192; Sign Out
            </button>
          </>
        }
      />

      <div style={{ padding: "1.75rem 2rem 3rem", maxWidth: "1280px", margin: "0 auto" }}>

        {/* Page heading */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1a1a1a", margin: "0 0 0.2rem 0" }}>
            Simulation Complete — Results Overview
          </h1>
          <p style={{ color: "#777", margin: 0, fontSize: "0.82rem" }}>
            {session?.brand_name} &middot; {session?.industry} &middot; {session?.objective} &middot; Session&nbsp;
            <strong style={{ fontFamily: "monospace", color: "#1a1a1a" }}>{session?.session_code}</strong>
          </p>
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpiCards.map((k) => (
            <div key={k.label} style={{
              background: "white",
              borderRadius: "8px",
              padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              borderLeft: `4px solid ${k.color}`,
            }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.4rem 0" }}>
                {k.icon} {k.label}
              </p>
              <p style={{ fontSize: "1.75rem", fontWeight: 700, color: k.color, margin: 0, lineHeight: 1 }}>
                {k.value}
                <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#999" }}>{k.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Main two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>

          {/* Left — Leaderboard (light vars override) */}
          <div style={{
            background: "white",
            borderRadius: "8px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
          }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a1a", margin: "0 0 1.25rem 0", borderLeft: "3px solid #e30613", paddingLeft: "0.65rem" }}>
              Team Rankings
            </h2>
            <div style={{
              "--card": "#ffffff",
              "--surface": "#f8f9fa",
              "--border": "#e8e8e8",
              "--text": "#1a1a1a",
              "--muted": "#777777",
              "--bg": "#f4f5f7",
              "--accent": "#4f46e5",
              "--green": "#16a34a",
              "--amber": "#d97706",
              "--red": "#e30613",
            } as React.CSSProperties}>
              {session && <Leaderboard sessionId={session.id} />}
            </div>
          </div>

          {/* Right — Session brief + Reflections sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Session brief card */}
            <div style={{ background: "white", borderRadius: "8px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1a1a", margin: "0 0 1rem 0", borderLeft: "3px solid #e30613", paddingLeft: "0.6rem" }}>
                Session Brief
              </h3>
              {[
                { label: "Brand", value: session?.brand_name ?? "" },
                { label: "Industry", value: session?.industry ?? "" },
                { label: "Objective", value: session?.objective ?? "" },
                { label: "Budget", value: "€10,000 virtual" },
                { label: "Client", value: (session?.client_personality ?? "").split("—")[0].trim() },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f0f0f0" }}>
                  <span style={{ fontSize: "0.75rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1a1a1a", textAlign: "right", maxWidth: "55%" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Reflections summary card */}
            <div style={{ background: "white", borderRadius: "8px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1a1a", margin: 0, borderLeft: "3px solid #d97706", paddingLeft: "0.6rem" }}>
                  Class Reflections
                </h3>
                <span style={{ fontSize: "0.72rem", background: reflCount > 0 ? "#fef3c7" : "#f3f4f6", color: reflCount > 0 ? "#d97706" : "#999", padding: "2px 8px", borderRadius: "99px", fontWeight: 700 }}>
                  {reflCount}/{teamCount}
                </span>
              </div>
              <button onClick={() => window.print()} style={{ ...lb.hBtn, width: "100%", justifyContent: "center", display: "flex", marginBottom: "0.75rem" }}>
                🖨 Export All as PDF
              </button>
              {reflections.length === 0 ? (
                <p style={{ fontSize: "0.78rem", color: "#999", textAlign: "center", padding: "0.75rem 0", margin: 0 }}>
                  Waiting for student reflections…
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "320px", overflowY: "auto" }}>
                  {reflections.map((r) => (
                    <div key={r.id} style={{ background: "#f8f9fa", borderRadius: "6px", padding: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1a1a1a" }}>{r.team_name}</span>
                        <button
                          onClick={() => handleHighlight(r)}
                          disabled={highlightingId === r.id}
                          style={{
                            background: "transparent",
                            border: "1px solid #4f46e5",
                            color: "#4f46e5",
                            borderRadius: "4px",
                            padding: "1px 8px",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            opacity: highlightingId === r.id ? 0.5 : 1,
                          }}
                        >
                          ✨ Highlight
                        </button>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "#555", margin: "0 0 0.25rem 0", lineHeight: 1.4 }}>
                        <strong>Mistake:</strong> {r.biggest_mistake || "—"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "#555", margin: 0, lineHeight: 1.4 }}>
                        <strong>Insight:</strong> {r.winning_insight || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Light theme (lt) — used across all professor stages ───────────────

const lt = {
  card: { background: "white", borderRadius: "8px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", marginBottom: "1.25rem" } as CSSProperties,
  label: { fontSize: "0.7rem", fontWeight: 700, color: "#777", textTransform: "uppercase" as const, letterSpacing: "0.1em", display: "block", marginBottom: "0.4rem", fontFamily: "Arial, sans-serif", margin: 0 } as CSSProperties,
  muted: { color: "#888", fontSize: "0.82rem", margin: 0, fontFamily: "Arial, sans-serif" } as CSSProperties,
  input: { display: "block", width: "100%", boxSizing: "border-box" as const, padding: "0.7rem 0.85rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.9rem", color: "#1a1a1a", background: "white", outline: "none", fontFamily: "Arial, sans-serif" } as CSSProperties,
  select: { display: "block", width: "100%", boxSizing: "border-box" as const, padding: "0.7rem 0.85rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.9rem", color: "#1a1a1a", background: "white", outline: "none", fontFamily: "Arial, sans-serif", cursor: "pointer" } as CSSProperties,
  btnRed: { display: "block", width: "100%", padding: "0.8rem", background: "#e30613", color: "white", border: "none", borderRadius: "6px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "Arial, sans-serif" } as CSSProperties,
  hBtn: { background: "white", border: "1px solid #d0d0d0", borderRadius: "6px", padding: "0.4rem 0.85rem", fontSize: "0.78rem", fontWeight: 600, color: "#444", cursor: "pointer", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" as const } as CSSProperties,
  error: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", padding: "0.65rem 1rem", color: "#dc2626", fontSize: "0.85rem", fontFamily: "Arial, sans-serif" } as CSSProperties,
};

// ── Light dashboard button style ──────────────────────────────────────

const lb = {
  hBtn: {
    background: "white",
    border: "1px solid #d0d0d0",
    borderRadius: "6px",
    padding: "0.4rem 0.85rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#444",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",
    whiteSpace: "nowrap",
  } as CSSProperties,
};

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