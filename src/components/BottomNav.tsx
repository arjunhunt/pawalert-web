"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Map, Plus, HeartPulse, User } from "lucide-react";

interface BottomNavProps {
  viewMode?: "feed" | "map";
  onToggleViewMode?: (mode: "feed" | "map") => void;
}

export default function BottomNav({ viewMode, onToggleViewMode }: BottomNavProps) {
  const pathname = usePathname();

  const isFeedActive = pathname === "/" && viewMode === "feed";
  const isMapActive = pathname === "/" && viewMode === "map";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#08090A]/90 backdrop-blur-xl border-t border-white/[0.08] md:hidden">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Feed Tab */}
        <button
          onClick={() => onToggleViewMode ? onToggleViewMode("feed") : null}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isFeedActive ? "text-white font-semibold" : "text-linearText-muted hover:text-white"
          }`}
        >
          <LayoutGrid className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Alerts</span>
        </button>

        {/* Map Tab */}
        <button
          onClick={() => onToggleViewMode ? onToggleViewMode("map") : null}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isMapActive ? "text-white font-semibold" : "text-linearText-muted hover:text-white"
          }`}
        >
          <Map className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Map</span>
        </button>

        {/* Center High-Contrast + Report Button */}
        <div className="flex-1 flex justify-center -mt-4">
          <Link
            href="/report"
            className="w-11 h-11 rounded-xl bg-white text-black shadow-lg flex items-center justify-center active:scale-95 transition-transform border border-white/[0.2]"
            title="Report emergency incident"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </Link>
        </div>

        {/* 24/7 Vets Tab */}
        <Link
          href="/vets"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === "/vets" ? "text-rose-400 font-semibold" : "text-linearText-muted hover:text-white"
          }`}
        >
          <HeartPulse className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Vets</span>
        </Link>

        {/* Profile / Karma Tab */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === "/profile" ? "text-white font-semibold" : "text-linearText-muted hover:text-white"
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
