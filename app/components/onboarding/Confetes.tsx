"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

/** Burst de confetes nas cores da marca AURON (só efeito visual). */
export function Confetes() {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#D4A843", "#E8B339", "#D8DCE6", "#B8902F", "#ffffff"],
    });

    const t = window.setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ["#D4A843", "#D8DCE6"],
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ["#D4A843", "#D8DCE6"],
      });
    }, 250);

    return () => window.clearTimeout(t);
  }, []);

  return null;
}
