"use client";

import React, { useRef } from "react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function toRaw(formatted: string): string {
  const digits = formatted.replace(/\D/g, "").padStart(4, "0").slice(-4);
  return digits;
}

function formatRaw(raw: string): string {
  const padded = raw.padStart(4, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

function isValidRaw(raw: string): boolean {
  const ss = parseInt(raw.slice(2), 10);
  return ss <= 59;
}

export default function TimeInput({ value, onChange, className, placeholder }: TimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = (() => {
    if (!value) return "00:00";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "00:00";
    const padded = digits.padStart(4, "0").slice(-4);
    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
  })();

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab" || e.key === "Escape") return;

    e.preventDefault();

    const currentRaw = toRaw(displayValue);

    if (e.key === "Backspace") {
      const newRaw = ("0" + currentRaw.slice(0, 3)).padStart(4, "0");
      onChange(formatRaw(newRaw));
      return;
    }

    if (/^\d$/.test(e.key)) {
      const next = (currentRaw + e.key).slice(-4);
      if (isValidRaw(next)) {
        onChange(formatRaw(next));
      }
      return;
    }
  }

  function handleFocus() {
    setTimeout(() => inputRef.current?.select(), 0);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={() => {}}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      placeholder={placeholder ?? "00:00"}
      className={className}
    />
  );
}
