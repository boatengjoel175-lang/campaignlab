"use client";

import type { ReactNode } from "react";

export default function HdMHeader({
  title,
  subtitle,
  badge,
  right,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  right?: ReactNode;
}) {
  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 200,
      background: "#ffffff",
      borderBottom: "1px solid #e0e0e0",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      padding: "0 2rem",
      height: "62px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "1rem",
      fontFamily: "Arial, Helvetica, sans-serif",
    }}>
      {/* Left — brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://hdm-stuttgart.de/_assets/08d436265eb2875b100f4b4e69dd70a4/Images/Logo/Logo-HdM_b.svg"
          alt="Hochschule der Medien Stuttgart"
          style={{ height: "34px" }}
        />
        <div style={{ width: "1px", height: "26px", background: "#e0e0e0" }} />
        <span style={{
          fontSize: "1.45rem",
          fontWeight: 900,
          color: "#e30613",
          fontStyle: "italic",
          fontFamily: "Arial Black, Arial, sans-serif",
          lineHeight: 1,
        }}>
          SMM
        </span>
        <div style={{ width: "1px", height: "26px", background: "#e0e0e0" }} />
        <div>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1a1a1a" }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: "0.75rem", color: "#888", marginLeft: "0.5rem" }}>
              {subtitle}
            </span>
          )}
        </div>
        {badge && (
          <span style={{
            background: "#e30613",
            color: "white",
            fontSize: "0.6rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "99px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            {badge}
          </span>
        )}
      </div>

      {/* Right */}
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {right}
        </div>
      )}
    </header>
  );
}
