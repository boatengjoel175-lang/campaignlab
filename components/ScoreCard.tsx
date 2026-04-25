"use client";

import { useState, useEffect } from "react";
import type { SimulationResult } from "@/lib/types";

const CIRCUMFERENCE = 2 * Math.PI * 40; // 251.33

function getColor(normalized: number, isRoi = false, roiRaw = 0): string {
  if (isRoi) {
    if (roiRaw > 4) return "#34d399";
    if (roiRaw >= 2) return "#fb923c";
    return "#f87171";
  }
  if (normalized > 70) return "#34d399";
  if (normalized >= 40) return "#fb923c";
  return "#f87171";
}

function Ring({
  value,
  unit,
  label,
  normalized,
  color,
  explanation,
  delay = 0,
}: {
  value: string;
  unit: string;
  label: string;
  normalized: number;
  color: string;
  explanation: string;
  delay?: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setProgress(Math.min(100, normalized)), 100 + delay);
    return () => clearTimeout(t);
  }, [normalized, delay]);

  const offset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
      <div style={{ position: "relative", width: "116px", height: "116px" }}>
        <svg
          width="116"
          height="116"
          viewBox="0 0 100 100"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{ fontSize: "1.15rem", fontWeight: 700, color, lineHeight: 1 }}>
            {value}
          </span>
          <span style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "2px" }}>
            {unit}
          </span>
        </div>
      </div>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)", textAlign: "center" }}>
        {label}
      </span>
      <p style={{
        fontSize: "0.71rem",
        color: "var(--muted)",
        fontStyle: "italic",
        textAlign: "center",
        lineHeight: 1.5,
        margin: 0,
        maxWidth: "140px",
      }}>
        {explanation}
      </p>
    </div>
  );
}

export default function ScoreCard({
  result,
  team_name,
}: {
  result: SimulationResult;
  team_name: string;
}) {
  // Normalise each metric to 0–100 for ring fill
  // Reach: 100k people = 100%
  const reachNorm = Math.min(100, (result.reach / 100_000) * 100);
  // Engagement: 20% real-world engagement = 100% ring
  const engNorm = Math.min(100, result.engagement_rate * 5);
  // Conversion: 10% conversion = 100% ring
  const convNorm = Math.min(100, result.conversion_rate * 10);
  // ROI: 8× = 100% ring, colour based on raw roi
  const roiNorm = Math.min(100, (result.roi / 8) * 100);

  const reachDisplay =
    result.reach >= 1_000_000
      ? `${(result.reach / 1_000_000).toFixed(1)}M`
      : result.reach >= 1_000
      ? `${(result.reach / 1_000).toFixed(0)}k`
      : String(result.reach);

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "1.75rem",
    }}>
      <h3 style={{
        fontSize: "1.25rem",
        fontWeight: 700,
        color: "var(--text)",
        margin: "0 0 1.5rem 0",
        textAlign: "center",
      }}>
        {team_name}
      </h3>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1.5rem 1rem",
        justifyItems: "center",
      }}>
        <Ring
          label="Total Reach"
          value={reachDisplay}
          unit="people"
          normalized={reachNorm}
          color={getColor(reachNorm)}
          explanation={result.reach_explanation}
          delay={0}
        />
        <Ring
          label="Engagement Rate"
          value={result.engagement_rate.toFixed(1)}
          unit="%"
          normalized={engNorm}
          color={getColor(engNorm)}
          explanation={result.engagement_explanation}
          delay={100}
        />
        <Ring
          label="Conversion Rate"
          value={result.conversion_rate.toFixed(1)}
          unit="%"
          normalized={convNorm}
          color={getColor(convNorm)}
          explanation={result.conversion_explanation}
          delay={200}
        />
        <Ring
          label="ROI"
          value={result.roi.toFixed(1)}
          unit="×"
          normalized={roiNorm}
          color={getColor(roiNorm, true, result.roi)}
          explanation={result.roi_explanation}
          delay={300}
        />
      </div>

      <div style={{
        marginTop: "1.75rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "1rem 1.25rem",
      }}>
        <p style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 0 0.5rem 0",
        }}>
          AI Verdict
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.65, margin: 0 }}>
          {result.overall_verdict}
        </p>
      </div>
    </div>
  );
}
