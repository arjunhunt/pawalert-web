"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  LayoutGrid,
  Map,
  RefreshCw,
  Dog,
  PlusCircle,
  AlertCircle,
  Compass,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import DogCard from "@/components/DogCard";
import BottomNav from "@/components/BottomNav";
import NotificationBanner from "@/components/NotificationBanner";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";
import CategoryFilter from "@/components/CategoryFilter";
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
    <div className="w-full h-[550px] bg-white rounded-3xl border border-brandBorder flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-3 border-brandOrange border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold text-brandTextMuted">Loading High-Definition Satellite Map...</span>
    </div>
  ),
});

export default function Home() {
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
    const start = nextPage * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .range(start, end);

        if (!error && data) {
          const loaded = data as DogReport[];
          if (loaded.length < PAGE_SIZE) {
            setHasMore(false);
          }
          setReports((prev) => {
            const merged = [...prev, ...loaded.filter((n) => !prev.some((p) => p.id === n.id))];
            memoryReportsCache = merged;
            return merged;
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
    detectLocation(true);

    // Continuous live hardware GPS stream for progressive satellite convergence
    const stopWatcher = watchLiveHardwareGPS((coords) => {
      setUserLocation(coords);
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
              const maxRadiusM = maxRadiusKm * 1000;

              if (distM === null || distM <= maxRadiusM) {
                sendProximityAlert(newReport, distM);
                setIncomingAlert({ report: newReport, distanceMeters: distM });
              }
            } else if (payload.eventType === "UPDATE") {
              const updatedReport = payload.new as DogReport;
              setReports((prev) => {
                const updated = prev.map((r) =>
                  r.id === updatedReport.id ? updatedReport : r
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
        stopWatcher();
        supabase?.removeChannel(channel);
      };
    }

    return () => {
      stopWatcher();
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
    <div className="min-h-screen flex flex-col bg-brandBg pb-20 md:pb-8">
      {/* Swiggy-style Location & Header Bar */}
      <Navbar
        userLocation={userLocation}
        onDetectLocation={() => detectLocation(true)}
        isLocating={isLocating}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Proximity Distress Alert Notifications */}
        <NotificationBanner
          incomingAlert={incomingAlert}
          onDismissAlert={() => setIncomingAlert(null)}
        />

        {/* Location Diagnostic / Permission Alert */}
        {locationError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-brandOrange shrink-0" />
              <span>{locationError}</span>
            </div>
            <button
              onClick={() => setLocationError(null)}
              className="ml-2 text-brandOrange hover:text-black font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section 1: "What does the dog need?" Category Carousel */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-brandBorder shadow-card">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Section 2: Swiggy Filter & View Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-brandBorder shadow-card">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setSelectedStatus("ACTIVE")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                selectedStatus === "ACTIVE"
                  ? "bg-brandOrange text-white shadow-md shadow-brandOrange/25"
                  : "bg-brandBg text-brandTextMuted hover:text-brandText"
              }`}
            >
              Needs Help Now
            </button>
            <button
              onClick={() => setSelectedStatus("ALL")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                selectedStatus === "ALL"
                  ? "bg-brandText text-white shadow-md shadow-black/10"
                  : "bg-brandBg text-brandTextMuted hover:text-brandText"
              }`}
            >
              All Alerts
            </button>
          </div>

          {/* Right: View Mode Toggle & Refresh */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-brandBg p-1 rounded-full border border-brandBorder">
              <button
                onClick={() => setViewMode("feed")}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  viewMode === "feed"
                    ? "bg-white text-brandOrange shadow-sm"
                    : "text-brandTextMuted hover:text-brandText"
                }`}
                title="Feed View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Feed</span>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  viewMode === "map"
                    ? "bg-white text-brandOrange shadow-sm"
                    : "text-brandTextMuted hover:text-brandText"
                }`}
                title="Satellite Map View"
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>

            <button
              onClick={() => fetchReports(true)}
              disabled={isLoading}
              className="p-2 rounded-full bg-brandBg hover:bg-neutral-200 border border-brandBorder text-brandTextMuted hover:text-brandText transition-colors active:scale-95"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brandOrange" : ""}`} />
            </button>
          </div>
        </div>

        {/* Section 3: Main Content - Map or Grid Feed */}
        {viewMode === "map" ? (
          <div className="h-[550px] w-full rounded-3xl overflow-hidden shadow-card border border-brandBorder">
            <MapView
              reports={filteredReports.map((r) => r.report)}
              userLocation={userLocation}
              onLocationDetected={(lat, lng, accuracy) => {
                setUserLocation({ lat, lng, accuracy });
              }}
            />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white border border-brandBorder rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-8 shadow-card">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brandOrange">
              <Dog className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-brandText">No Dog Alerts in this Area</h3>
              <p className="text-brandTextMuted text-xs sm:text-sm">
                No dogs currently need help under this filter. Spotted a stray dog that needs food or medical care?
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <Link
                href="/report"
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-full bg-brandOrange hover:bg-brandOrange-hover text-white text-xs font-bold shadow-md shadow-brandOrange/25 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Stray Dog</span>
              </Link>
              {(selectedCategory !== null || selectedStatus !== "ACTIVE") && (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedStatus("ACTIVE");
                  }}
                  className="text-xs text-brandTextMuted hover:text-brandText px-3 py-2 font-bold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grid of Dog Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReports.map(({ report, distance }) => (
                <DogCard
                  key={report.id}
                  report={report}
                  distanceMeters={distance}
                />
              ))}
            </div>

            {/* Pagination Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMoreReports}
                  disabled={isLoadingMore}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-50 border border-brandBorder text-xs font-bold text-brandText shadow-sm transition-all"
                >
                  {isLoadingMore ? "Loading more dogs..." : "Load More Alerts"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* PWA Install Banner */}
      <InstallPwaPrompt />

      {/* Mobile App Bottom Navigation Bar */}
      <BottomNav viewMode={viewMode} onToggleViewMode={setViewMode} />
    </div>
  );
}
