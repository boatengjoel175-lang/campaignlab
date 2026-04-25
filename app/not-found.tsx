import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      textAlign: "center",
    }}>
      <h1 style={{
        fontSize: "clamp(5rem, 20vw, 9rem)",
        fontWeight: 700,
        color: "var(--accent)",
        margin: 0,
        lineHeight: 1,
      }}>
        404
      </h1>
      <p style={{
        fontSize: "1.125rem",
        color: "var(--muted)",
        marginTop: "1rem",
        marginBottom: "2rem",
      }}>
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          color: "var(--accent)",
          textDecoration: "none",
          fontSize: "0.95rem",
          fontWeight: 600,
          border: "1px solid var(--border)",
          padding: "0.65rem 1.25rem",
          borderRadius: "8px",
          transition: "border-color 0.15s",
        }}
      >
        ← Return to CampaignLab
      </Link>
    </div>
  );
}
