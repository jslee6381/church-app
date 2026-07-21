"use client";

import { useMemo, useState } from "react";
import { applyUiTextSize, DEFAULT_SIZE, STORAGE_KEY } from "@/components/settings/ui-preferences-sync";

const SIZE_STEPS = [
  { label: "1", value: DEFAULT_SIZE },
  { label: "2", value: "1.0625rem" },
  { label: "3", value: "1.125rem" },
  { label: "4", value: "1.1875rem" },
  { label: "5", value: "1.25rem" },
] as const;

export function FontSizeEditor() {
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SIZE;
    }

    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SIZE;
  });

  const selectedIndex = useMemo(() => {
    const foundIndex = SIZE_STEPS.findIndex((step) => step.value === selectedSize);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [selectedSize]);

  function handleSelect(nextIndex: number) {
    const nextSize = SIZE_STEPS[nextIndex]?.value ?? DEFAULT_SIZE;

    setSelectedSize(nextSize);
    window.localStorage.setItem(STORAGE_KEY, nextSize);
    applyUiTextSize(nextSize);
  }

  return (
    <section className="mb-4 border-t border-border/70 pt-4">
      <div>
        <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Text Size</p>
        <p className="ui-text m-0 mt-1 font-semibold text-foreground">Adjust the app text size</p>
      </div>

      <div className="mt-4 px-1 py-1">
        <label className="sr-only" htmlFor="text-size-slider">
          Text size
        </label>
        <input
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-accent accent-[var(--primary)]"
          id="text-size-slider"
          max={SIZE_STEPS.length - 1}
          min={0}
          onChange={(event) => handleSelect(Number(event.target.value))}
          step={1}
          type="range"
          value={selectedIndex}
        />

        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          {SIZE_STEPS.map((step) => (
            <span key={step.label}>{step.label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
