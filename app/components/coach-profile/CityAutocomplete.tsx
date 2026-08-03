"use client";

import { useMemo, useState } from "react";
import { BR_CITIES, BR_STATES } from "@/lib/coach/publicProfile";
import { Input } from "@/components/ui/Input";
import {
  Select,
  selectListboxClassName,
  selectOptionClassName,
} from "@/components/ui/Select";
import { Check } from "@phosphor-icons/react";
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

  const stateOptions = useMemo(
    () => [
      { value: "", label: "—" },
      ...BR_STATES.map((uf) => ({ value: uf, label: uf })),
    ],
    [],
  );

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
          <ul
            role="listbox"
            aria-label="Sugestões de cidade"
            className={cn(selectListboxClassName, "mt-1")}
          >
            {suggestions.map((s) => {
              const active = s.city === city && s.state === state;
              return (
                <li key={`${s.city}-${s.state}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={selectOptionClassName(active)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onCityChange(s.city);
                      onStateChange(s.state);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded",
                        active ? "bg-brand text-text-on-brand" : "bg-surface-1",
                      )}
                    >
                      {active && <Check size={10} weight="bold" />}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{s.city}</span>
                    <span className="shrink-0 text-[11px] text-text-tertiary">
                      {s.state}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Select
        label="UF"
        value={state}
        onChange={onStateChange}
        options={stateOptions}
        placeholder="—"
      />
    </div>
  );
}
