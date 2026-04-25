// CurveballPanel component — populated in a later prompt
export default function CurveballPanel({ sessionId }: { sessionId: string }) {
  return (
    <div style={{ color: "var(--text)" }}>
      <h3 style={{ margin: "0 0 0.5rem", color: "var(--amber)" }}>🌪 Inject Curveball</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
        Curveball controls coming soon… (session: {sessionId})
      </p>
    </div>
  );
}
