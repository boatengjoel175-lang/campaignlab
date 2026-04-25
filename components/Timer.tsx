"use client";

import { useState, useEffect, useRef } from "react";

export default function Timer({
  minutes,
  onExpire,
}: {
  minutes: number;
  onExpire?: () => void;
}) {
  const endTimeRef = useRef(Date.now() + minutes * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState(minutes * 60);

  useEffect(() => {
    endTimeRef.current = Date.now() + minutes * 60 * 1000;
    setTimeLeft(minutes * 60);

    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [minutes, onExpire]);

  if (timeLeft === 0) {
    return (
      <span style={{ color: "var(--red)", fontFamily: "monospace", fontWeight: 700 }}>
        ⏰ Time&apos;s up!
      </span>
    );
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const color =
    timeLeft <= 30
      ? "var(--red)"
      : timeLeft <= 120
      ? "var(--amber)"
      : "var(--text)";

  return (
    <span
      style={{
        color,
        fontFamily: "monospace",
        fontWeight: 700,
        transition: "color 0.5s",
      }}
    >
      {mins}:{secs}
    </span>
  );
}
