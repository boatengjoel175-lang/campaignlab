"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Source_Sans_3 } from "next/font/google";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export default function Home() {
  const router = useRouter();

  return (
    <div
      className={sourceSans.className}
      style={{ background: "#ffffff", color: "#1a1a1a", minHeight: "100vh" }}
    >
      {/* ── NAVIGATION ─────────────────────────────────────────── */}
      <nav
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e0e0e0",
          height: "72px",
          display: "flex",
          alignItems: "center",
          padding: "0 2rem",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://hdm-stuttgart.de/_assets/08d436265eb2875b100f4b4e69dd70a4/Images/Logo/Logo-HdM_b.svg"
            alt="Hochschule der Medien Stuttgart"
            style={{ height: "40px" }}
          />
          <div
            style={{ width: "1px", height: "32px", background: "#e0e0e0" }}
          />
          <span style={{ fontSize: "1rem", fontWeight: 600, color: "#1a1a1a" }}>
            SMM Campaign Lab
          </span>
        </div>
        <div
          style={{
            background: "#f5f5f5",
            border: "1px solid #e0e0e0",
            fontSize: "0.75rem",
            color: "#666666",
            padding: "4px 12px",
            borderRadius: "4px",
          }}
        >
          Powered by Google Gemini AI
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section style={{ background: "#e30613", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "0.85rem",
              fontWeight: 300,
              opacity: 0.85,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "white",
              margin: 0,
            }}
          >
            Hochschule der Medien Stuttgart &middot; Social Media Marketing &amp; Management
          </p>
          <h1
            style={{
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: "0.5rem",
              marginBottom: 0,
              color: "white",
            }}
          >
            SMM Campaign Lab
          </h1>
          <p
            style={{
              fontSize: "1.25rem",
              fontWeight: 300,
              opacity: 0.9,
              marginTop: "0.5rem",
              marginBottom: 0,
              color: "white",
            }}
          >
            The Live Marketing Strategy Simulator
          </p>
          <p
            style={{
              fontSize: "1rem",
              opacity: 0.85,
              maxWidth: "520px",
              marginTop: "1rem",
              marginBottom: 0,
              lineHeight: 1.6,
              color: "white",
            }}
          >
            Professors set the brief. Student teams build strategy. AI simulates
            the market. The best strategy wins.
          </p>
        </div>
      </section>

      {/* ── ROLE CARDS ─────────────────────────────────────────── */}
      <section style={{ background: "#ffffff", padding: "4rem 2rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#e30613",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "2rem",
              marginTop: 0,
            }}
          >
            How do you want to participate?
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2rem",
            }}
          >
            <RoleCard
              icon="🎓"
              title="Professor"
              subtitle="Session Creator"
              description="Create a live classroom session, configure the brand brief, monitor student teams in real time, and run the AI market simulation when your teams are ready."
              buttonText="Create Session →"
              buttonColor="#e30613"
              buttonHoverColor="#c0050f"
              onClick={() => router.push("/professor")}
            />
            <RoleCard
              icon="🎯"
              title="Student"
              subtitle="Strategy Builder"
              description="Enter your professor's session code, build your campaign strategy by allocating budget across platforms, selecting content pillars, and defining your target approach."
              buttonText="Join Session →"
              buttonColor="#1a1a1a"
              buttonHoverColor="#333333"
              onClick={() => router.push("/student")}
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section style={{ background: "#f5f5f5", padding: "4rem 2rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#1a1a1a",
              borderLeft: "4px solid #e30613",
              paddingLeft: "1rem",
              marginBottom: "2.5rem",
              marginTop: 0,
            }}
          >
            How It Works
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {[
              {
                num: "01",
                title: "Professor sets the brief",
                desc: "Configure brand, industry, budget, and campaign objective",
              },
              {
                num: "02",
                title: "Teams build strategy",
                desc: "Allocate budget across platforms, choose content pillars",
              },
              {
                num: "03",
                title: "Gemini AI runs the market",
                desc: "Free AI engine evaluates strategies on quality, not luck",
              },
              {
                num: "04",
                title: "Leaderboard reveals winners",
                desc: "Live results ranked by ROI, reach, and engagement rate",
              },
            ].map((step) => (
              <div
                key={step.num}
                style={{
                  background: "white",
                  padding: "1.5rem",
                  borderRadius: "4px",
                  border: "1px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#e30613",
                    letterSpacing: "0.1em",
                    marginBottom: "0.75rem",
                  }}
                >
                  {step.num}
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#1a1a1a",
                    marginBottom: "0.5rem",
                    marginTop: 0,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#666666",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer style={{ background: "#1a1a1a", color: "white", padding: "2rem" }}>
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://hdm-stuttgart.de/_assets/08d436265eb2875b100f4b4e69dd70a4/Images/Logo/Logo-HdM_white.svg"
              alt="Hochschule der Medien Stuttgart"
              style={{ height: "32px" }}
            />
            <p
              style={{
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.6)",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              SMM Campaign Lab
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.4)",
                marginTop: "0.25rem",
                marginBottom: 0,
              }}
            >
              Social Media Marketing &amp; Management
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.5)",
                margin: 0,
              }}
            >
              Nobelstrasse 10, 70569 Stuttgart
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.4)",
                marginTop: "0.25rem",
                marginBottom: 0,
              }}
            >
              Built with Google Gemini AI &middot; Supabase &middot; Vercel
            </p>
          </div>
        </div>
        <div
          style={{
            maxWidth: "1100px",
            margin: "1.5rem auto 0",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.3)",
              margin: 0,
            }}
          >
            &copy; 2025 Hochschule der Medien Stuttgart
          </p>
        </div>
      </footer>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  subtitle,
  description,
  buttonText,
  buttonColor,
  buttonHoverColor,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonColor: string;
  buttonHoverColor: string;
  onClick: () => void;
}) {
  const [cardHovered, setCardHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{
        border: `2px solid ${cardHovered ? "#e30613" : "#e0e0e0"}`,
        borderRadius: "4px",
        padding: "2.5rem",
        background: "white",
        boxShadow: cardHovered
          ? "0 4px 20px rgba(227,6,19,0.1)"
          : "none",
        transition: "all 0.2s ease",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div
          style={{
            width: "4px",
            minHeight: "48px",
            background: "#e30613",
            borderRadius: "2px",
            flexShrink: 0,
            alignSelf: "stretch",
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>{icon}</div>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#1a1a1a",
              marginTop: "0.5rem",
              marginBottom: 0,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "#e30613",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginTop: "0.25rem",
              marginBottom: 0,
            }}
          >
            {subtitle}
          </p>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#666666",
              lineHeight: 1.6,
              marginTop: "0.75rem",
              marginBottom: 0,
            }}
          >
            {description}
          </p>
          <button
            onClick={onClick}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              background: btnHovered ? buttonHoverColor : buttonColor,
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "4px",
              fontWeight: 600,
              fontSize: "0.9rem",
              marginTop: "1.5rem",
              display: "block",
              width: "100%",
              border: "none",
              cursor: "pointer",
              transition: "background 0.2s ease",
              fontFamily: "inherit",
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
