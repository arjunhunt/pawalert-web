"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  LayoutGrid,
  Map,
  RefreshCw,
  Dog,
  PlusCircle,
  AlertCircle,
  Compass,
  ChevronDown,
  Mic,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import DogCard from "@/components/DogCard";
import NotificationBanner from "@/components/NotificationBanner";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";
import CategoryFilter from "@/components/CategoryFilter";
import VoiceSOSModal from "@/components/VoiceSOSModal";
import { ParsedVoiceReport } from "@/lib/voiceParser";
import { DogReport, ProblemType, ReportStatus } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { calculateDistanceMeters, getDeviceGeolocation, getCachedCoordinates, watchLiveHardwareGPS } from "@/lib/geo";
import { sendProximityAlert, getAlertRadiusKm } from "@/lib/notifications";

// Global in-memory SWR cache for 0ms instant page loads
let memoryReportsCache: DogReport[] | null = null;
let memoryCacheTime: number = 0;
const CACHE_TTL_MS = 30000; // 30 seconds
const PAGE_SIZE = 30;

// Dynamically import MapView to prevent SSR Leaflet window errors
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-2xl bg-darkCard border border-darkBorder flex items-center justify-center text-neutral-400">
      <Compass className="w-8 h-8 animate-spin text-pawAmber mr-2" />
      <span>Loading Interactive Dog Map...</span>
    </div>
  ),
});

export default function Home() {
  const router = useRouter();
  const [reports, setReports] = useState<DogReport[]>(() => memoryReportsCache || []);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(() => getCachedCoordinates());
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<ProblemType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [viewMode, setViewMode] = useState<"feed" | "map">("feed");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [incomingAlert, setIncomingAlert] = useState<{ report: DogReport; distanceMeters: number | null } | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const handleApplyHomeVoiceReport = (parsed: ParsedVoiceReport) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pawalert_voice_draft", JSON.stringify(parsed));
      router.push("/report");
    }
  };

  // Fetch live reports from Supabase with pagination & in-memory caching
  const fetchReports = useCallback(async (isRefresh: boolean = false) => {
    const now = Date.now();
    if (!isRefresh && memoryReportsCache && now - memoryCacheTime < CACHE_TTL_MS) {
      setReports(memoryReportsCache);
      return;
    }

    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (!error && data) {
          const loaded = data as DogReport[];
          setReports(loaded);
          memoryReportsCache = loaded;
          memoryCacheTime = Date.now();
          setPage(0);
          setHasMore(loaded.length >= PAGE_SIZE);
        }
      }
    } catch (e) {
      console.warn("Could not load from Supabase", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load more reports (infinite pagination)
  const loadMoreReports = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (!error && data) {
          const newItems = data as DogReport[];
          if (newItems.length < PAGE_SIZE) {
            setHasMore(false);
          }
          setReports((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const unique = newItems.filter((r) => !existingIds.has(r.id));
            const updated = [...prev, ...unique];
            memoryReportsCache = updated;
            return updated;
          });
          setPage(nextPage);
        }
      }
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const [locationError, setLocationError] = useState<string | null>(null);

  // Detect user GPS location via real device hardware GPS
  const detectLocation = async (isManual: boolean = false) => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const res = await getDeviceGeolocation(isManual);
      if (res && res.lat !== 0 && res.lng !== 0) {
        setUserLocation({ lat: res.lat, lng: res.lng, accuracy: res.accuracy });
      } else if (res?.error && isManual) {
        setLocationError(res.error);
      }
    } catch (err) {
      console.warn("Geolocation lock error:", err);
    } finally {
      setIsLocating(false);
    }
  };

  // Initial load & Supabase Realtime setup
  useEffect(() => {
    fetchReports();
    detectLocation();

    // Stream live hardware GPS updates as satellite lock refines
    const unwatch = watchLiveHardwareGPS((loc) => {
      setUserLocation(loc);
    });

    if (isSupabaseConfigured && supabase) {
      // Subscribe to real-time additions and updates
      const channel = supabase
        .channel("realtime-reports")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reports" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newReport = payload.new as DogReport;
              setReports((prev) => {
                const updated = [newReport, ...prev.filter((r) => r.id !== newReport.id)];
                memoryReportsCache = updated;
                return updated;
              });

              // Check proximity and trigger sound + notification
              let distM: number | null = null;
              if (userLocation && newReport.latitude && newReport.longitude) {
                distM = calculateDistanceMeters(
                  userLocation.lat,
                  userLocation.lng,
                  newReport.latitude,
                  newReport.longitude
                );
              }

              const maxRadiusKm = getAlertRadiusKm();
              const withinRadius = distM === null || maxRadiusKm === 0 || distM <= maxRadiusKm * 1000;

              if (withinRadius) {
                sendProximityAlert(newReport, distM);
                setIncomingAlert({ report: newReport, distanceMeters: distM });
              }
            } else if (payload.eventType === "UPDATE") {
              setReports((prev) => {
                const updated = prev.map((r) =>
                  r.id === payload.new.id ? (payload.new as DogReport) : r
                );
                memoryReportsCache = updated;
                return updated;
              });
            } else if (payload.eventType === "DELETE") {
              setReports((prev) => {
                const updated = prev.filter((r) => r.id !== payload.old.id);
                memoryReportsCache = updated;
                return updated;
              });
            }
          }
        )
        .subscribe();

      return () => {
        unwatch();
        supabase?.removeChannel(channel);
      };
    }

    return () => {
      unwatch();
    };
  }, [fetchReports]);

  // Filter and sort reports nearest first
  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        // Status filter
        if (selectedStatus === "ACTIVE") {
          if (report.status === "RESOLVED") return false;
        }

        // Category filter
        if (selectedCategory && report.problem_type !== selectedCategory) {
          return false;
        }

        return true;
      })
      .map((report) => {
        let distance: number | null = null;
        if (userLocation) {
          distance = calculateDistanceMeters(
            userLocation.lat,
            userLocation.lng,
            report.latitude,
            report.longitude
          );
        }
        return { report, distance };
      })
      .sort((a, b) => {
        // If distances are available, sort closest first
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        // Otherwise sort newest first
        return (
          new Date(b.report.created_at).getTime() -
          new Date(a.report.created_at).getTime()
        );
      });
  }, [reports, selectedCategory, selectedStatus, userLocation]);

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Proximity Distress Alert Notifications & Permission Prompt */}
        <NotificationBanner
          incomingAlert={incomingAlert}
          onDismissAlert={() => setIncomingAlert(null)}
        />

        {/* Location Permission / Diagnostic Banner */}
        {locationError && (
          <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{locationError}</span>
            </div>
            <button
              onClick={() => setLocationError(null)}
              className="ml-2 text-amber-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Top Control Bar */}
        <div className="flex flex-col items-center gap-3.5 bg-darkCard/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-darkBorder">
          {/* Status Tabs */}
          <div className="flex items-center justify-center space-x-1 bg-darkBg p-1 rounded-2xl border border-darkBorder">
            <button
              onClick={() => setSelectedStatus("ACTIVE")}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedStatus === "ACTIVE"
                  ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Needs Help (Active)
            </button>
            <button
              onClick={() => setSelectedStatus("ALL")}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedStatus === "ALL"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              All Alerts
            </button>
          </div>

          {/* Centered + Report Dog Button */}
          <div className="flex justify-center w-full">
            <Link
              href="/report"
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-pawAmber/25 transition-all hover:scale-105 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Report Dog</span>
            </Link>
          </div>

          {/* Location & View Controls */}
          <div className="flex items-center justify-between space-x-3 w-full pt-2 border-t border-darkBorder/40">
            <button
              onClick={() => detectLocation(true)}
              disabled={isLocating}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-darkBg hover:bg-neutral-800 border border-darkBorder text-xs text-neutral-300 transition-colors"
              title="Update your GPS location"
            >
              <Compass className={`w-4 h-4 text-pawAmber ${isLocating ? "animate-spin" : ""}`} />
              <span>
                {userLocation ? "GPS Locked" : "Detect GPS"}
              </span>
            </button>

            <div className="flex items-center space-x-2">
              {/* View Mode Toggle: Feed vs Map */}
              <div className="flex items-center space-x-1 bg-darkBg p-1 rounded-2xl border border-darkBorder">
                <button
                  onClick={() => setViewMode("feed")}
                  className={`p-2 rounded-xl transition-all ${
                    viewMode === "feed"
                      ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Feed View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`p-2 rounded-xl transition-all ${
                    viewMode === "map"
                      ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Map View"
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>

              {/* Manual Refresh */}
              <button
                onClick={() => fetchReports(true)}
                disabled={isLoading}
                className="p-2 rounded-2xl bg-darkBg hover:bg-neutral-800 border border-darkBorder text-neutral-400 hover:text-white transition-colors"
                title="Refresh Feed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin text-pawAmber" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Category Need Filter Chips */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Main Content: Map or Grid Feed */}
        {viewMode === "map" ? (
          <div className="h-[550px] w-full">
            <MapView
              reports={filteredReports.map((r) => r.report)}
              userLocation={userLocation}
            />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-darkCard/50 border border-darkBorder rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-pawAmber/10 border border-pawAmber/20 flex items-center justify-center text-pawAmber">
              <Dog className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No Dog Alerts in this Area</h3>
              <p className="text-neutral-400 text-xs sm:text-sm">
                No dogs currently need help in this filter. Seen a stray dog that needs food or care?
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <a
                href="/report"
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold shadow-lg shadow-pawAmber/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report a Dog Alert</span>
              </a>
              {(selectedCategory !== null || selectedStatus !== "ACTIVE") && (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedStatus("ACTIVE");
                  }}
                  className="text-xs text-neutral-400 hover:text-white px-3 py-2"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReports.map(({ report, distance }) => (
                <DogCard
                  key={report.id}
                  report={report}
                  distanceMeters={distance}
                />
              ))}
            </div>

            {/* Load More Pagination Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMoreReports}
                  disabled={isLoadingMore}
                  className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-darkCard hover:bg-darkCardHover border border-darkBorder hover:border-pawAmber/40 text-neutral-200 text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <ChevronDown className={`w-4 h-4 text-pawAmber ${isLoadingMore ? "animate-bounce" : ""}`} />
                  <span>{isLoadingMore ? "Loading more alerts..." : "Load More Alerts"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-darkBorder py-6 bg-darkCard text-center text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🐾 PawAlert — Connecting community feeders with dogs in need</span>
          <span>Open Source Community Project</span>
        </div>
      </footer>

      {/* PWA 1-Click Install Prompt */}
      <InstallPwaPrompt />

      {/* 🎙️ Floating Quick Voice SOS Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center space-x-2">
        <button
          onClick={() => setIsVoiceModalOpen(true)}
          className="group relative flex items-center space-x-2 px-4 py-3.5 rounded-full bg-gradient-to-r from-pawAmber to-amber-500 hover:from-pawAmber-hover hover:to-amber-400 text-white font-black text-xs sm:text-sm shadow-2xl shadow-pawAmber/50 transition-all hover:scale-105 active:scale-95"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping absolute -top-1 -right-1" />
          <Mic className="w-5 h-5 text-white" />
          <span className="hidden sm:inline">Voice SOS (Hindi / English)</span>
          <span className="sm:hidden">Voice SOS 🎙️</span>
        </button>
      </div>

      {/* 🎙️ Voice-to-Rescue AI Modal */}
      <VoiceSOSModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onApplyVoiceReport={handleApplyHomeVoiceReport}
      />
    </div>
  );
}
