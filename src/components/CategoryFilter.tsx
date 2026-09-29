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
    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
      {/* All Issues Tag */}
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center space-x-1.5 active:scale-95 ${
          selectedCategory === null
            ? "bg-white/[0.12] text-white border-white/[0.25] shadow-sm"
            : "bg-white/[0.03] text-linearText-muted border-white/[0.06] hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-linearAccent-coral" />
        <span>All Alerts</span>
      </button>

      {/* Specific Category Tags */}
      {categories.map((cat) => {
        const info = PROBLEM_TYPE_LABELS[cat];
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(isSelected ? null : cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center space-x-1.5 active:scale-95 ${
              isSelected
                ? "bg-white/[0.12] text-white border-white/[0.25] shadow-sm"
                : "bg-white/[0.03] text-linearText-muted border-white/[0.06] hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span className="text-[13px]">{info.icon}</span>
            <span>{info.label}</span>
          </button>
        );
      })}
    </div>
  );
}
