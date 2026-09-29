"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dog, PlusCircle, User, Navigation, Trophy, HeartPulse } from "lucide-react";

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

  return (
    <header className="sticky top-0 z-50 bg-[#0B0C10]/85 backdrop-blur-xl border-b border-darkBorder">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-pawAmber/15 flex items-center justify-center border border-pawAmber/30 group-hover:scale-105 transition-transform shadow-lg shadow-pawAmber/10">
            <Dog className="w-5 h-5 text-pawAmber" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-pawAmber transition-colors">
                Paw<span className="text-pawAmber">Alert</span>
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
                Trial Mode
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium -mt-0.5 hidden sm:block">
              Community Stray Dog Network
            </p>
          </div>
        </Link>

        {/* Center / Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Location status / detector */}
          {onDetectLocation && (
            <button
              onClick={onDetectLocation}
              disabled={isLocating}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                userLocation
                  ? "bg-emerald-950/50 text-emerald-400 border-emerald-700/50 hover:bg-emerald-900/50"
                  : "bg-darkCard text-neutral-300 border-darkBorder hover:border-neutral-600 hover:text-white"
              }`}
              title="Click to detect current GPS location"
            >
              <Navigation
                className={`w-3.5 h-3.5 ${
                  isLocating ? "animate-spin text-pawAmber" : ""
                }`}
              />
              <span className="hidden md:inline">
                {isLocating
                  ? "Locating..."
                  : userLocation
                  ? "GPS Active"
                  : "Enable GPS"}
              </span>
            </button>
          )}

          {/* 24/7 Emergency Vet & Ambulance Directory Link */}
          <Link
            href="/vets"
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              pathname === "/vets"
                ? "bg-red-950/60 text-red-300 border-red-500/60"
                : "bg-darkCard text-red-400 border-darkBorder hover:text-red-300 hover:bg-darkCardHover"
            }`}
            title="24/7 Emergency Vet & Ambulance Directory"
          >
            <HeartPulse className="w-4 h-4 text-red-400" />
          </Link>

          {/* Leaderboard Link */}
          <Link
            href="/leaderboard"
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              pathname === "/leaderboard"
                ? "bg-pawAmber/20 text-pawAmber border-pawAmber/40"
                : "bg-darkCard text-neutral-400 border-darkBorder hover:text-white hover:bg-darkCardHover"
            }`}
            title="Community Feeder Karma Leaderboard"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </Link>

          {/* Profile / Karma Link */}
          <Link
            href="/profile"
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              pathname === "/profile"
                ? "bg-pawAmber/20 text-pawAmber border-pawAmber/40"
                : "bg-darkCard text-neutral-400 border-darkBorder hover:text-white hover:bg-darkCardHover"
            }`}
            title="Volunteer Profile & Karma Stats"
          >
            <User className="w-4 h-4" />
          </Link>

          {/* Emergency Alert Broadcast Button */}
          <Link
            href="/report"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold shadow-lg shadow-pawAmber/20 active:scale-95 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report Dog</span>
            <span className="sm:hidden">Report</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
