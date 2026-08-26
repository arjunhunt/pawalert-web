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
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
      {/* All Needs Chip */}
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
          selectedCategory === null
            ? "bg-pawAmber text-white border-pawAmber shadow-md shadow-pawAmber/20"
            : "bg-darkCard text-neutral-300 border-darkBorder hover:border-neutral-600 hover:text-white"
        }`}
      >
        🐾 All Needs
      </button>

      {/* Specific Categories */}
      {categories.map((cat) => {
        const info = PROBLEM_TYPE_LABELS[cat];
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(isSelected ? null : cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center space-x-1.5 ${
              isSelected
                ? "bg-pawAmber text-white border-pawAmber shadow-md shadow-pawAmber/20"
                : "bg-darkCard text-neutral-300 border-darkBorder hover:border-neutral-600 hover:text-white"
            }`}
          >
            <span>{info.icon}</span>
            <span>{info.label}</span>
          </button>
        );
      })}
    </div>
  );
}
