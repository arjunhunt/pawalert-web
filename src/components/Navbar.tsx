"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dog, PlusCircle, MapPin, User, Navigation, Trophy, HeartPulse, ChevronDown } from "lucide-react";
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
  const [areaName, setAreaName] = useState<string>("Detecting location...");

  useEffect(() => {
    if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
      reverseGeocode(userLocation.lat, userLocation.lng).then((addr) => {
        if (addr) {
          // Truncate to first 2 address tokens (e.g. "Devdham, Umargam")
          const tokens = addr.split(",");
          const shortAddr = tokens.slice(0, 2).join(",").trim();
          setAreaName(shortAddr || "Location Locked");
        }
      });
    } else {
      setAreaName("Tap to Enable GPS");
    }
  }, [userLocation]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-brandBorder shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Swiggy-style Location Selector */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-9 h-9 rounded-2xl bg-brandOrange flex items-center justify-center shadow-md shadow-brandOrange/25 group-hover:scale-105 transition-transform">
              <Dog className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-black tracking-tight text-brandText group-hover:text-brandOrange transition-colors">
                Paw<span className="text-brandOrange">Alert</span>
              </span>
            </div>
          </Link>

          {/* Divider */}
          <div className="h-6 w-[1px] bg-brandBorder hidden sm:block" />

          {/* Swiggy Location Chip */}
          <button
            onClick={onDetectLocation}
            disabled={isLocating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-brandBg hover:bg-neutral-200/60 border border-brandBorder transition-all text-left max-w-[200px] sm:max-w-[280px]"
            title="Click to detect current GPS location"
          >
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLocating ? "animate-spin text-brandOrange" : "text-brandOrange"}`} />
            <div className="truncate">
              <div className="flex items-center space-x-1 text-xs font-bold text-brandText truncate">
                <span className="truncate">{areaName}</span>
                <ChevronDown className="w-3 h-3 text-brandTextMuted shrink-0" />
              </div>
            </div>
          </button>
        </div>

        {/* Right: Desktop Action Links & Report Button */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Trial Badge */}
          <span className="hidden sm:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            Trial Mode
          </span>

          {/* 24/7 Vets */}
          <Link
            href="/vets"
            className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              pathname === "/vets"
                ? "bg-red-50 text-brandRed border border-red-200"
                : "text-brandTextMuted hover:text-brandText hover:bg-brandBg"
            }`}
          >
            <HeartPulse className="w-4 h-4 text-brandRed" />
            <span>24/7 Vets</span>
          </Link>

          {/* Feeder Leaderboard */}
          <Link
            href="/leaderboard"
            className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              pathname === "/leaderboard"
                ? "bg-orange-50 text-brandOrange border border-orange-200"
                : "text-brandTextMuted hover:text-brandText hover:bg-brandBg"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Karma</span>
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className={`p-2 rounded-full transition-all border ${
              pathname === "/profile"
                ? "bg-orange-50 text-brandOrange border-orange-200"
                : "border-brandBorder text-brandTextMuted hover:text-brandText hover:bg-brandBg"
            }`}
            title="Profile"
          >
            <User className="w-4 h-4" />
          </Link>

          {/* Report Stray Dog Button */}
          <Link
            href="/report"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-brandOrange hover:bg-brandOrange-hover text-white text-xs font-extrabold shadow-md shadow-brandOrange/25 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Report Stray Dog</span>
            <span className="sm:hidden">Report</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
