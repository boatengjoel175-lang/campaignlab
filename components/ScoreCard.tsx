import type { SimulationResult } from "@/lib/types";

function MetricCard({
  label,
  value,
  unit,
  explanation,
  color,
}: {
  label: string;
  value: string | number;
  unit: string;
  explanation: string;
  color: string;
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
      padding: "1.25rem",
      borderTop: `3px solid ${color}`,
    }}>
      <p style={{
        fontSize: "0.68rem",
        fontWeight: 700,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "0 0 0.4rem 0",
      }}>
        {label}
      </p>
      <p style={{ fontSize: "1.8rem", fontWeight: 700, color, margin: "0 0 0.6rem 0", lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: "0.85rem", fontWeight: 400, color }}>{unit}</span>
      </p>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>
        {explanation}
      </p>
    </div>
  );
}

export default function ScoreCard({ result }: { result: SimulationResult }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
      }}>
        <MetricCard
          label="Total Reach"
          value={result.reach.toLocaleString()}
          unit=" people"
          explanation={result.reach_explanation}
          color="var(--accent)"
        />
        <MetricCard
          label="Engagement Rate"
          value={result.engagement_rate.toFixed(1)}
          unit="%"
          explanation={result.engagement_explanation}
          color="var(--green)"
        />
        <MetricCard
          label="Conversion Rate"
          value={result.conversion_rate.toFixed(1)}
          unit="%"
          explanation={result.conversion_explanation}
          color="var(--amber)"
        />
        <MetricCard
          label="ROI"
          value={result.roi.toFixed(1)}
          unit="×"
          explanation={result.roi_explanation}
          color="var(--red)"
        />
      </div>

      <div style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "1.5rem",
      }}>
        <p style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 0 0.6rem 0",
        }}>
          AI Verdict
        </p>
        <p style={{ fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.7, margin: 0 }}>
          {result.overall_verdict}
        </p>
      </div>
    </div>
  );
}
