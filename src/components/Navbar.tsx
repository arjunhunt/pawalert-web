"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dog, Plus, MapPin, User, Navigation, Trophy, HeartPulse, ChevronDown } from "lucide-react";
import { reverseGeocode } from "@/lib/geo";

interface NavbarProps {
  userLocation?: { lat: number; lng: number } | null;
  onDetectLocation?: () => void;
  isLocating?: boolean;
}

export default function Navbar({
  userLocation,
  onDetectLocation,
  isLocating,
}: NavbarProps) {
  const pathname = usePathname();
  const [areaName, setAreaName] = useState<string>("Locating...");

  useEffect(() => {
    if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
      reverseGeocode(userLocation.lat, userLocation.lng).then((addr) => {
        if (addr) {
          const tokens = addr.split(",");
          const shortAddr = tokens.slice(0, 2).join(",").trim();
          setAreaName(shortAddr || "GPS Active");
        }
      });
    } else {
      setAreaName("Enable GPS");
    }
  }, [userLocation]);

  return (
    <header className="sticky top-0 z-50 bg-[#08090A]/85 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Brand & Locality */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white group-hover:border-white/[0.25] transition-colors">
              <Dog className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white flex items-center space-x-1.5">
              <span>PawAlert</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/[0.06] text-linearText-muted border border-white/[0.08]">
                v1.2
              </span>
            </span>
          </Link>

          {/* Divider */}
          <div className="h-4 w-[1px] bg-white/[0.1] hidden sm:block" />

          {/* Linear-style Hardware Location Pill */}
          <button
            onClick={onDetectLocation}
            disabled={isLocating}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all text-left max-w-[190px] sm:max-w-[260px] active:scale-95"
            title="Click to refresh hardware satellite GPS"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${userLocation ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"}`} />
            <span className="text-xs font-medium text-linearText-muted truncate font-mono">
              {isLocating ? "Acquiring..." : areaName}
            </span>
            <ChevronDown className="w-3 h-3 text-linearText-subtle shrink-0" />
          </button>
        </div>

        {/* Right: Clean Instrument Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* 24/7 Vets */}
          <Link
            href="/vets"
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/vets"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "text-linearText-muted hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Vets</span>
          </Link>

          {/* Feeder Karma */}
          <Link
            href="/leaderboard"
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/leaderboard"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "text-linearText-muted hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Karma</span>
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className={`p-1.5 rounded-lg transition-colors border ${
              pathname === "/profile"
                ? "bg-white/[0.1] text-white border-white/[0.2]"
                : "border-white/[0.06] text-linearText-muted hover:text-white hover:bg-white/[0.04]"
            }`}
            title="Profile & Activity"
          >
            <User className="w-3.5 h-3.5" />
          </Link>

          {/* Raycast-style High-Contrast CTA */}
          <Link
            href="/report"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold tracking-tight shadow-sm active:scale-95 transition-all ml-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Report</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
