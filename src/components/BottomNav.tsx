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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-brandBorder shadow-bottomBar md:hidden">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        {/* Feed Tab */}
        <button
          onClick={() => onToggleViewMode ? onToggleViewMode("feed") : null}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isFeedActive ? "text-brandOrange font-bold" : "text-brandTextMuted hover:text-brandText"
          }`}
        >
          <LayoutGrid className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Alerts</span>
        </button>

        {/* Map Tab */}
        <button
          onClick={() => onToggleViewMode ? onToggleViewMode("map") : null}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isMapActive ? "text-brandOrange font-bold" : "text-brandTextMuted hover:text-brandText"
          }`}
        >
          <Map className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Live Map</span>
        </button>

        {/* Center Floating + Report Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <Link
            href="/report"
            className="w-13 h-13 p-3.5 rounded-full bg-brandOrange text-white shadow-lg shadow-brandOrange/35 flex items-center justify-center active:scale-90 transition-transform border-3 border-white"
            title="Report a stray dog in need"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </Link>
        </div>

        {/* 24/7 Vets Tab */}
        <Link
          href="/vets"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === "/vets" ? "text-brandRed font-bold" : "text-brandTextMuted hover:text-brandText"
          }`}
        >
          <HeartPulse className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Vets 24/7</span>
        </Link>

        {/* Profile / Karma Tab */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === "/profile" ? "text-brandOrange font-bold" : "text-brandTextMuted hover:text-brandText"
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
