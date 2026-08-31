"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Utensils,
  PlusCircle,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowLeft,
  X,
  Dog,
  Compass,
  Heart,
  Share2,
  Trash2,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { FeedingSpot } from "@/lib/types";
import {
  getStoredFeedingSpots,
  saveFeedingSpot,
  logFeedingEvent,
  deleteFeedingSpot,
  isSpotFedToday,
} from "@/lib/feedingData";
import {
  calculateDistanceMeters,
  formatDistance,
  formatTimeAgo,
  getCachedCoordinates,
  getDeviceGeolocation,
  getFastestNavigationUrl,
  reverseGeocodeDetailed,
} from "@/lib/geo";
import { getUserName, syncStatsToCloud, isAdmin } from "@/lib/user";
import { sanitizeText } from "@/lib/security";

export default function FeedingTrackerPage() {
  const [spots, setSpots] = useState<FeedingSpot[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() =>
    getCachedCoordinates()
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<"ALL" | "HUNGRY" | "FED">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newDogCount, setNewDogCount] = useState<number>(4);
  const [newPuppyCount, setNewPuppyCount] = useState<number>(0);
  const [newArea, setNewArea] = useState<string>("");
  const [newCity, setNewCity] = useState<string>("");
  const [newAddress, setNewAddress] = useState<string>("");
  const [newLandmark, setNewLandmark] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);

  // Success Feedback
  const [feedSuccessSpotId, setFeedSuccessSpotId] = useState<string | null>(null);

  useEffect(() => {
    setSpots(getStoredFeedingSpots());

    // Auto-detect user GPS for distance sorting
    getDeviceGeolocation(false).then((loc) => {
      if (loc && loc.lat !== 0 && loc.lng !== 0) {
        setUserLocation({ lat: loc.lat, lng: loc.lng });
      }
    });
  }, []);

  const detectModalGPS = async () => {
    setIsLocating(true);
    try {
      const loc = await getDeviceGeolocation(true);
      if (loc && loc.lat !== 0 && loc.lng !== 0) {
        setNewLat(loc.lat);
        setNewLng(loc.lng);
        setUserLocation({ lat: loc.lat, lng: loc.lng });

        const details = await reverseGeocodeDetailed(loc.lat, loc.lng);
        if (details.area) setNewArea(details.area);
        if (details.city) setNewCity(details.city);
        if (details.street && !newAddress) setNewAddress(details.street);
      }
    } catch (e) {
      console.warn("GPS error", e);
    } finally {
      setIsLocating(false);
    }
  };

  // Stats Counters
  const totalPacks = spots.length;
  const fedPacksCount = spots.filter((s) => isSpotFedToday(s.last_fed_at)).length;
  const hungryPacksCount = totalPacks - fedPacksCount;
  const totalDogsFedToday = spots
    .filter((s) => isSpotFedToday(s.last_fed_at))
    .reduce((acc, curr) => acc + curr.dog_count + (curr.puppy_count || 0), 0);

  const percentFed = totalPacks > 0 ? Math.round((fedPacksCount / totalPacks) * 100) : 0;

  // Filtered & Distance Sorted Spots
  const filteredSpots = useMemo(() => {
    return spots
      .filter((spot) => {
        const isFed = isSpotFedToday(spot.last_fed_at);
        if (filterTab === "HUNGRY" && isFed) return false;
        if (filterTab === "FED" && !isFed) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = spot.name.toLowerCase().includes(q);
          const matchArea = spot.area.toLowerCase().includes(q);
          const matchCity = spot.city.toLowerCase().includes(q);
          const matchLandmark = spot.landmark.toLowerCase().includes(q);
          return matchName || matchArea || matchCity || matchLandmark;
        }

        return true;
      })
      .map((spot) => {
        let distance: number | null = null;
        if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
          distance = calculateDistanceMeters(
            userLocation.lat,
            userLocation.lng,
            spot.latitude,
            spot.longitude
          );
        }
        return { spot, distance };
      })
      .sort((a, b) => {
        // First prioritize hungry packs, then distance
        const aFed = isSpotFedToday(a.spot.last_fed_at);
        const bFed = isSpotFedToday(b.spot.last_fed_at);
        if (!aFed && bFed) return -1;
        if (aFed && !bFed) return 1;

        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return 0;
      });
  }, [spots, filterTab, searchQuery, userLocation]);

  // Log Feeding Event Action
  const handleMarkFed = (spot: FeedingSpot) => {
    const activeFeederName = getUserName() || "Community Feeder";
    const updated = logFeedingEvent(spot.id, activeFeederName);
    setSpots(updated);

    // Increment personal user profile stats
    const curFed = parseInt(localStorage.getItem("pawalert_dogs_fed") || "0", 10);
    const curRescues = parseInt(localStorage.getItem("pawalert_rescues") || "0", 10);
    const curReports = parseInt(localStorage.getItem("pawalert_reports_made") || "0", 10);
    const addedCount = spot.dog_count + (spot.puppy_count || 0);

    localStorage.setItem("pawalert_dogs_fed", (curFed + addedCount).toString());
    syncStatsToCloud("DOG_FED", curFed, curRescues, curReports);

    // Trigger celebration toast
    setFeedSuccessSpotId(spot.id);
    setTimeout(() => setFeedSuccessSpotId(null), 3000);
  };

  // Add Feeding Spot Form Submit
  const handleCreateSpot = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeText(newName, 80);
    const cleanArea = sanitizeText(newArea, 80);
    const cleanCity = sanitizeText(newCity, 60);
    const cleanAddress = sanitizeText(newAddress, 150);
    const cleanLandmark = sanitizeText(newLandmark, 150);
    const cleanNotes = sanitizeText(newNotes, 250);

    if (!cleanName || !cleanArea || !cleanCity) return;

    const lat = newLat || userLocation?.lat || 20.1759;
    const lng = newLng || userLocation?.lng || 72.7549;

    const newSpot = saveFeedingSpot({
      name: cleanName,
      dog_count: Math.max(1, Number(newDogCount) || 1),
      puppy_count: Math.max(0, Number(newPuppyCount) || 0),
      area: cleanArea,
      city: cleanCity,
      address: cleanAddress || `${cleanArea}, ${cleanCity}`,
      landmark: cleanLandmark || "Near street corner",
      latitude: lat,
      longitude: lng,
      dietary_notes: cleanNotes || "Community dogs love rice, pedigree, or boiled eggs.",
      last_fed_at: null,
      last_fed_by: null,
      created_by: getUserName(),
    });

    setSpots((prev) => [newSpot, ...prev]);
    setIsModalOpen(false);

    // Reset fields
    setNewName("");
    setNewDogCount(4);
    setNewPuppyCount(0);
    setNewArea("");
    setNewCity("");
    setNewAddress("");
    setNewLandmark("");
    setNewNotes("");
    setNewLat(null);
    setNewLng(null);
  };

  return (
    <div className="min-h-screen bg-darkBg text-neutral-100 flex flex-col font-sans pb-20">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Top Breadcrumb & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live Map</span>
          </Link>

          <button
            onClick={() => {
              setIsModalOpen(true);
              detectModalGPS();
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-extrabold shadow-md shadow-pawAmber/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Map Feeding Spot</span>
          </button>
        </div>

        {/* Hero Header & Daily Progress */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pawAmber/15 border border-pawAmber/30 text-pawAmber text-xs font-bold">
              <Utensils className="w-3.5 h-3.5" />
              <span>Daily Stray Feeding Coordinator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Community Feeding Routes
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl leading-relaxed">
              Coordinate daily feeding with fellow animal lovers. Check which street dog packs have been fed today and ensure no stray goes hungry!
            </p>
          </div>

          {/* Progress Bar & Summary Metric Cards */}
          <div className="space-y-3 pt-2 border-t border-darkBorder/60">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-neutral-300 flex items-center space-x-1.5">
                <span>Today's Feeding Progress:</span>
                <span className="text-white">{percentFed}% Completed</span>
              </span>
              <span className="text-pawAmber">
                {fedPacksCount} of {totalPacks} Packs Fed
              </span>
            </div>

            {/* Progress Visual Bar */}
            <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden border border-darkBorder">
              <div
                className="h-full bg-gradient-to-r from-pawAmber to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${percentFed}%` }}
              />
            </div>

            {/* 3 Metric Badges */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-neutral-900/80 border border-darkBorder text-center">
                <div className="text-lg sm:2xl font-black text-white">{totalPacks}</div>
                <div className="text-[11px] text-neutral-400 font-semibold">Total Packs</div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-center">
                <div className="text-lg sm:2xl font-black text-emerald-400">{fedPacksCount}</div>
                <div className="text-[11px] text-emerald-300 font-semibold">Fed Today 🟢</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-center">
                <div className="text-lg sm:2xl font-black text-amber-400">{hungryPacksCount}</div>
                <div className="text-[11px] text-amber-300 font-semibold">Needs Food 🔴</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                filterTab === "ALL"
                  ? "bg-white text-black shadow-md"
                  : "bg-darkCard border border-darkBorder text-neutral-400 hover:text-white"
              }`}
            >
              All Packs ({totalPacks})
            </button>
            <button
              onClick={() => setFilterTab("HUNGRY")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center space-x-1.5 ${
                filterTab === "HUNGRY"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "bg-darkCard border border-darkBorder text-amber-400 hover:bg-neutral-800"
              }`}
            >
              <span>🔴 Needs Food Today</span>
              <span>({hungryPacksCount})</span>
            </button>
            <button
              onClick={() => setFilterTab("FED")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center space-x-1.5 ${
                filterTab === "FED"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "bg-darkCard border border-darkBorder text-emerald-400 hover:bg-neutral-800"
              }`}
            >
              <span>🟢 Fed Today</span>
              <span>({fedPacksCount})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pack name, colony, landmark, or area..."
              className="w-full bg-darkCard border border-darkBorder rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pawAmber transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Feeding Packs List */}
        <div className="space-y-4">
          {filteredSpots.length === 0 ? (
            <div className="bg-darkCard border border-darkBorder rounded-3xl p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-darkBorder flex items-center justify-center text-neutral-500 mx-auto">
                <Dog className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Feeding Spots Found</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {filterTab === "HUNGRY"
                    ? "Great job! All mapped feeding packs have been fed today 🎉"
                    : "No feeding spots matching your filter. Map a new pack in your area!"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(true);
                  detectModalGPS();
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-pawAmber text-white text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Map New Feeding Spot</span>
              </button>
            </div>
          ) : (
            filteredSpots.map(({ spot, distance }) => {
              const isFed = isSpotFedToday(spot.last_fed_at);
              const navUrl = getFastestNavigationUrl(
                spot.latitude,
                spot.longitude,
                userLocation?.lat,
                userLocation?.lng,
                "two-wheeler"
              );

              return (
                <div
                  key={spot.id}
                  className={`bg-darkCard border rounded-3xl p-5 sm:p-6 space-y-4 transition-all shadow-lg ${
                    isFed
                      ? "border-darkBorder/80 opacity-90"
                      : "border-amber-700/50 shadow-amber-900/10 hover:border-amber-500"
                  }`}
                >
                  {/* Top Bar: Status Badge, Pack Size & Distance */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1.5">
                      <div className="flex items-center flex-wrap gap-2">
                        {isFed ? (
                          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Fed Today ({formatTimeAgo(spot.last_fed_at)})</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center space-x-1.5 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Needs Food Today</span>
                          </span>
                        )}

                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-800 text-white border border-darkBorder flex items-center space-x-1">
                          <span>🐕</span>
                          <span>{spot.dog_count} Dogs</span>
                        </span>

                        {spot.puppy_count && spot.puppy_count > 0 ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-pink-950/50 text-pink-300 border border-pink-800/50 flex items-center space-x-1">
                            <span>🍼</span>
                            <span>{spot.puppy_count} Puppies</span>
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-white pt-0.5">
                        {spot.name}
                      </h3>
                    </div>

                    {distance !== null && (
                      <div className="shrink-0">
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-pawAmber bg-pawAmber/10 px-2.5 py-1 rounded-xl border border-pawAmber/20">
                          <MapPin className="w-3 h-3" />
                          <span>{formatDistance(distance)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Location & Landmark */}
                  <div className="text-xs text-neutral-300 space-y-1">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-pawAmber shrink-0 mt-0.5" />
                      <div>
                        <span>{spot.address}, </span>
                        <strong className="text-white">{spot.area}</strong>, {spot.city}
                      </div>
                    </div>
                    {spot.landmark && (
                      <div className="text-xs text-amber-400/90 pl-6">
                        📍 <b>Spot Landmark:</b> {spot.landmark}
                      </div>
                    )}
                  </div>

                  {/* Dietary & Pack Notes */}
                  {spot.dietary_notes && (
                    <div className="p-3 rounded-2xl bg-neutral-900/90 border border-darkBorder text-xs text-neutral-300 flex items-start space-x-2">
                      <Utensils className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      <span>{spot.dietary_notes}</span>
                    </div>
                  )}

                  {/* Last Fed Credit Info */}
                  {spot.last_fed_by && isFed && (
                    <div className="text-[11px] text-emerald-400 flex items-center space-x-1.5 pl-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Last fed by <b>{spot.last_fed_by}</b></span>
                    </div>
                  )}

                  {/* Action Buttons: Mark Fed & Navigation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleMarkFed(spot)}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all active:scale-95 shadow-md ${
                        isFed
                          ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-darkBorder"
                          : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-600/20"
                      }`}
                    >
                      <Utensils className="w-4 h-4" />
                      <span>{isFed ? "🍲 Mark Fed Again Today" : "🍲 I Fed This Pack Today"}</span>
                    </button>

                    <a
                      href={navUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-neutral-800/90 hover:bg-neutral-700 border border-darkBorder text-neutral-100 font-bold text-xs sm:text-sm transition-all active:scale-95 text-center"
                    >
                      <Navigation className="w-4 h-4 text-pawAmber" />
                      <span>Shortest Bike / Walk Route</span>
                    </a>
                  </div>

                  {/* Toast Success Feedback */}
                  {feedSuccessSpotId === spot.id && (
                    <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in zoom-in-95">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Hero volunteer! +{spot.dog_count + (spot.puppy_count || 0)} dogs added to your profile & leaderboard! 🎉</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Map New Feeding Spot Modal */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150 my-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl bg-pawAmber/20 flex items-center justify-center text-pawAmber">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Map New Feeding Spot</h3>
                  <p className="text-xs text-neutral-400">Add a stray pack territory to daily feeding routes</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSpot} className="space-y-4 text-left">
              {/* GPS Auto-Detect Button */}
              <div className="p-3.5 rounded-2xl bg-darkBg border border-darkBorder flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className={`w-4 h-4 ${newLat ? "text-emerald-400" : "text-neutral-500"}`} />
                  <span className="text-xs font-bold text-white">
                    {newLat ? "GPS Coordinates Locked" : "GPS Required"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={detectModalGPS}
                  disabled={isLocating}
                  className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-pawAmber/15 text-pawAmber text-xs font-bold border border-pawAmber/30 hover:bg-pawAmber/25 transition-all"
                >
                  <Navigation className={`w-3 h-3 ${isLocating ? "animate-spin" : ""}`} />
                  <span>{isLocating ? "Locating..." : newLat ? "Re-detect GPS" : "Detect Spot GPS"}</span>
                </button>
              </div>

              {/* Pack Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Pack Name / Spot Title *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Railway Station Auto Stand Pack, Market Corner"
                  className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                />
              </div>

              {/* Dog & Puppy Count Steppers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    🐕 Adult Dogs Count *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={newDogCount}
                    onChange={(e) => setNewDogCount(Number(e.target.value))}
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-pawAmber"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    🍼 Puppy Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={newPuppyCount}
                    onChange={(e) => setNewPuppyCount(Number(e.target.value))}
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-pawAmber"
                  />
                </div>
              </div>

              {/* Area & City Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Area / Colony *
                  </label>
                  <input
                    type="text"
                    required
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="e.g. Devdham, Sector 14"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Umargam, Mumbai"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                  />
                </div>
              </div>

              {/* Landmark & Spot Details */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Spot Landmark / Visual Recognition Clue
                </label>
                <input
                  type="text"
                  value={newLandmark}
                  onChange={(e) => setNewLandmark(e.target.value)}
                  placeholder="e.g. Under the banyan tree, behind tea stall, opposite bank"
                  className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                />
              </div>

              {/* Dietary & Pack Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Food Preferences & Pack Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Loves boiled rice with pedigree; 1 puppy needs milk; keep fresh water."
                  className="w-full bg-darkBg border border-darkBorder rounded-xl p-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-extrabold shadow-md shadow-pawAmber/20 transition-all active:scale-95"
                >
                  Save Feeding Spot 🍲
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
