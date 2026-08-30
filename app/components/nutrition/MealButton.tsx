"use client";

interface MealButtonProps {
  label: string;
  onClick: () => void;
}

export function MealButton({ label, onClick }: MealButtonProps) {
  return (
    <button type="button" onClick={onClick} className="meal-type-btn">
      + {label}
    </button>
  );
}
