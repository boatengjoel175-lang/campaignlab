"use client";

import { memo, useState, useEffect } from "react";

function AnimatedNumber({
  value,
  duration = 1500,
  decimals = 0,
}: {
  value: number;
  duration?: number;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    let current = 0;
    const steps = Math.ceil(duration / 25);
    const increment = value / steps;

    const id = setInterval(() => {
      current = Math.min(current + increment, value);
      setDisplay(current);
      if (current >= value) clearInterval(id);
    }, 25);

    return () => clearInterval(id);
  }, [value, duration]);

  if (decimals > 0) return <>{display.toFixed(decimals)}</>;
  return <>{Math.round(display).toLocaleString()}</>;
}

// memo prevents re-renders when parent re-renders but value hasn't changed
export default memo(AnimatedNumber);
