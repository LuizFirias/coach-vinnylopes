"use client";

import { useMemo, useState } from "react";
import { BR_CITIES, BR_STATES } from "@/lib/coach/publicProfile";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

type Props = {
  city: string;
  state: string;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
};

export function CityAutocomplete({
  city,
  state,
  onCityChange,
  onStateChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = city.trim().toLowerCase();
    if (q.length < 2) return [];
    return BR_CITIES.filter((c) => {
      if (state && c.state !== state) return false;
      return c.city.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [city, state]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_88px] gap-3">
      <div className="relative">
        <Input
          label="Cidade"
          name="city"
          value={city}
          onChange={(e) => {
            onCityChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Ex: São Paulo"
          autoComplete="off"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full rounded-lg border-0 bg-surface-1 shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <li key={`${s.city}-${s.state}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-xs text-text-primary hover:bg-surface-2 touch-manipulation"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onCityChange(s.city);
                    onStateChange(s.state);
                    setOpen(false);
                  }}
                >
                  {s.city}
                  <span className="text-text-tertiary"> · {s.state}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="state" className="text-xs font-medium text-text-secondary">
          UF
        </label>
        <select
          id="state"
          value={state}
          onChange={(e) => onStateChange(e.target.value)}
          className={cn(
            "h-10 w-full rounded-md px-2 text-xs",
            "bg-surface-2 border-0 text-text-primary",
            "focus:outline-none focus:ring-0 focus:shadow-none",
          )}
        >
          <option value="">—</option>
          {BR_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
