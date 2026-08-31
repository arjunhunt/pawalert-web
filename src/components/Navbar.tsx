"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dog, PlusCircle, MapPin, User, Navigation, Trophy, HeartPulse, Utensils } from "lucide-react";

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
    <header className="sticky top-0 z-50 bg-darkCard/90 backdrop-blur-md border-b border-darkBorder">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-pawAmber/20 flex items-center justify-center border border-pawAmber/30 group-hover:scale-105 transition-transform">
            <Dog className="w-6 h-6 text-pawAmber" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-pawAmber">
              PawAlert
            </h1>
            <p className="text-xs text-neutral-400 font-medium -mt-1 hidden sm:block">
              Community Stray Dog Network
            </p>
          </div>
        </Link>

        {/* Center / Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Location status / detector */}
          {onDetectLocation && (
            <button
              onClick={onDetectLocation}
              disabled={isLocating}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                userLocation
                  ? "bg-green-950/40 text-green-400 border-green-800/40 hover:bg-green-900/40"
                  : "bg-neutral-800/60 text-neutral-300 border-neutral-700 hover:bg-neutral-800"
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

          {/* Daily Stray Dog Feeding Tracker */}
          <Link
            href="/feeding"
            className={`p-2 rounded-xl border transition-colors flex items-center space-x-1.5 ${
              pathname === "/feeding"
                ? "bg-amber-950/60 text-amber-300 border-amber-500/60"
                : "bg-neutral-800/40 text-amber-400 border-darkBorder hover:text-amber-300 hover:bg-neutral-800"
            }`}
            title="Daily Feeding Spots & Stray Pack Tracker"
          >
            <Utensils className="w-5 h-5 text-pawAmber" />
            <span className="text-xs font-bold text-pawAmber hidden lg:inline">Feeding</span>
          </Link>

          {/* 24/7 Emergency Vet & Ambulance Directory Link */}
          <Link
            href="/vets"
            className={`p-2 rounded-xl border transition-colors ${
              pathname === "/vets"
                ? "bg-red-950/60 text-red-300 border-red-500/60"
                : "bg-neutral-800/40 text-red-400 border-darkBorder hover:text-red-300 hover:bg-neutral-800"
            }`}
            title="24/7 Emergency Vet & Ambulance Directory"
          >
            <HeartPulse className="w-5 h-5 text-red-400" />
          </Link>

          {/* Leaderboard link */}
          <Link
            href="/leaderboard"
            className={`p-2 rounded-xl border transition-colors ${
              pathname === "/leaderboard"
                ? "bg-pawAmber/20 text-pawAmber border-pawAmber/40"
                : "bg-neutral-800/40 text-neutral-400 border-darkBorder hover:text-white hover:bg-neutral-800"
            }`}
            title="Community Leaderboard"
          >
            <Trophy className="w-5 h-5 text-amber-400" />
          </Link>

          {/* Profile link */}
          <Link
            href="/profile"
            className={`p-2 rounded-xl border transition-colors ${
              pathname === "/profile"
                ? "bg-pawAmber/20 text-pawAmber border-pawAmber/40"
                : "bg-neutral-800/40 text-neutral-400 border-darkBorder hover:text-white hover:bg-neutral-800"
            }`}
            title="Volunteer Profile"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
