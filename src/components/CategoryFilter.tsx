"use client";

import { ProblemType, PROBLEM_TYPE_LABELS } from "@/lib/types";

interface CategoryFilterProps {
  selectedCategory: ProblemType | null;
  onSelectCategory: (category: ProblemType | null) => void;
}

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const categories = Object.keys(PROBLEM_TYPE_LABELS) as ProblemType[];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-extrabold text-brandText tracking-tight">
          What does the dog need?
        </h2>
        {selectedCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs font-bold text-brandOrange hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>

      <div className="flex items-center space-x-3 overflow-x-auto pb-2 pt-1 no-scrollbar select-none">
        {/* All Needs Circle */}
        <button
          onClick={() => onSelectCategory(null)}
          className="flex flex-col items-center space-y-1.5 shrink-0 group active:scale-95 transition-transform"
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-sm ${
              selectedCategory === null
                ? "bg-brandOrange text-white shadow-md shadow-brandOrange/30 ring-2 ring-brandOrange ring-offset-2 ring-offset-brandBg"
                : "bg-white text-brandText border border-brandBorder group-hover:border-neutral-300"
            }`}
          >
            🐾
          </div>
          <span
            className={`text-[11px] font-bold transition-colors ${
              selectedCategory === null ? "text-brandOrange" : "text-brandTextMuted"
            }`}
          >
            All Dogs
          </span>
        </button>

        {/* Specific Categories */}
        {categories.map((cat) => {
          const info = PROBLEM_TYPE_LABELS[cat];
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(isSelected ? null : cat)}
              className="flex flex-col items-center space-y-1.5 shrink-0 group active:scale-95 transition-transform"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all shadow-sm ${
                  isSelected
                    ? "bg-brandOrange text-white shadow-md shadow-brandOrange/30 ring-2 ring-brandOrange ring-offset-2 ring-offset-brandBg"
                    : "bg-white text-brandText border border-brandBorder group-hover:border-neutral-300"
                }`}
              >
                {info.icon}
              </div>
              <span
                className={`text-[11px] font-bold transition-colors whitespace-nowrap ${
                  isSelected ? "text-brandOrange" : "text-brandTextMuted"
                }`}
              >
                {info.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
