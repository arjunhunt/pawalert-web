"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dog, Plus, MapPin, User, Navigation, Trophy, HeartPulse, ChevronDown, Loader2 } from "lucide-react";
import { getCachedCoordinates, getDeviceGeolocation, reverseGeocodeDetailed, watchLiveHardwareGPS } from "@/lib/geo";

interface NavbarProps {
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  onDetectLocation?: () => void;
  isLocating?: boolean;
}

export default function Navbar({
  userLocation: propUserLocation,
  onDetectLocation: propOnDetectLocation,
  isLocating: propIsLocating,
}: NavbarProps) {
  const pathname = usePathname();

  // Internal location state to guarantee location shows everywhere even if parent doesn't pass props
  const [internalLocation, setInternalLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(
    () => propUserLocation || getCachedCoordinates()
  );
  const [internalIsLocating, setInternalIsLocating] = useState<boolean>(false);
  const [localityName, setLocalityName] = useState<string>("Detecting GPS...");

  const activeLocation = propUserLocation !== undefined ? propUserLocation : internalLocation;
  const activeIsLocating = propIsLocating !== undefined ? propIsLocating : internalIsLocating;

  // Sync prop changes into internal state
  useEffect(() => {
    if (propUserLocation) {
      setInternalLocation(propUserLocation);
    }
  }, [propUserLocation]);

  // Initial detection if no coordinates exist yet
  useEffect(() => {
    if (!activeLocation) {
      const cached = getCachedCoordinates();
      if (cached) {
        setInternalLocation(cached);
      } else {
        // Auto-detect GPS seamlessly
        getDeviceGeolocation(false).then((res) => {
          if (res && res.lat !== 0 && res.lng !== 0) {
            setInternalLocation({ lat: res.lat, lng: res.lng, accuracy: res.accuracy });
          } else {
            setLocalityName("Enable GPS");
          }
        });
      }
    }
  }, [activeLocation]);

  // Reverse geocode to clean locality (e.g. "Devdham, Umargam")
  useEffect(() => {
    if (activeLocation && activeLocation.lat !== 0 && activeLocation.lng !== 0) {
      let isSubscribed = true;
      reverseGeocodeDetailed(activeLocation.lat, activeLocation.lng).then((details) => {
        if (!isSubscribed) return;
        const parts = [details.area || details.street, details.city].filter(Boolean);
        if (parts.length > 0) {
          setLocalityName(parts.join(", "));
        } else if (details.fullAddress && details.fullAddress !== "Location recorded") {
          const tokens = details.fullAddress.split(",");
          setLocalityName(tokens.slice(0, 2).join(",").trim());
        } else {
          setLocalityName("GPS Active");
        }
      });
      return () => {
        isSubscribed = false;
      };
    } else {
      setLocalityName("Enable GPS");
    }
  }, [activeLocation?.lat, activeLocation?.lng]);

  const handleLocationClick = async () => {
    if (propOnDetectLocation) {
      propOnDetectLocation();
      return;
    }

    setInternalIsLocating(true);
    try {
      const res = await getDeviceGeolocation(true);
      if (res && res.lat !== 0 && res.lng !== 0) {
        setInternalLocation({ lat: res.lat, lng: res.lng, accuracy: res.accuracy });
      }
    } catch (e) {
      console.warn("Location detection error:", e);
    } finally {
      setInternalIsLocating(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-darkCard/95 backdrop-blur-md border-b border-darkBorder">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Locality Pill */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Link href="/" className="flex items-center space-x-2 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-pawAmber/20 flex items-center justify-center border border-pawAmber/30 group-hover:scale-105 transition-transform">
              <Dog className="w-5 h-5 text-pawAmber" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-lg font-black tracking-tight text-pawAmber leading-none">
                PawAlert
              </h1>
            </div>
          </Link>

          {/* Divider */}
          <div className="h-5 w-[1px] bg-darkBorder hidden sm:block" />

          {/* 📍 Current Real-time Location Pill */}
          <button
            type="button"
            onClick={handleLocationClick}
            disabled={activeIsLocating}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-darkBg hover:bg-neutral-800 border border-darkBorder hover:border-pawAmber/40 transition-all text-left max-w-[160px] sm:max-w-[240px] shrink min-w-0 active:scale-95 shadow-sm"
            title="Tap to update current GPS location"
          >
            {activeIsLocating ? (
              <Loader2 className="w-3.5 h-3.5 text-pawAmber animate-spin shrink-0" />
            ) : (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  activeLocation && activeLocation.lat !== 0
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                    : "bg-amber-400"
                }`}
              />
            )}

            <span className="text-xs font-bold text-neutral-200 truncate">
              {activeIsLocating ? "Acquiring..." : localityName}
            </span>

            {activeLocation?.accuracy !== undefined && activeLocation.accuracy > 0 && (
              <span className="text-[10px] font-mono font-bold text-emerald-400 px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/60 hidden md:inline shrink-0">
                ±{Math.round(activeLocation.accuracy)}m
              </span>
            )}

            <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* 24/7 Emergency Vets */}
          <Link
            href="/vets"
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
              pathname === "/vets"
                ? "bg-red-950/60 text-red-300 border-red-500/60"
                : "bg-neutral-800/40 text-red-400 border-darkBorder hover:text-red-300 hover:bg-neutral-800"
            }`}
            title="24/7 Emergency Vet & Ambulance Directory"
          >
            <HeartPulse className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Vets</span>
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
            <Trophy className="w-4 h-4 text-amber-400" />
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
            <User className="w-4 h-4" />
          </Link>

          {/* + Report Quick Button */}
          <Link
            href="/report"
            className="flex items-center space-x-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-md shadow-pawAmber/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Report</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
