// Leaderboard component — populated in a later prompt
export default function Leaderboard({ sessionId }: { sessionId: string }) {
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "1.5rem",
      color: "var(--muted)",
      textAlign: "center",
    }}>
      Leaderboard loading… (session: {sessionId})
    </div>
  );
}
