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
    <div className="w-full h-[550px] bg-[#101114] rounded-xl border border-white/[0.08] flex flex-col items-center justify-center space-y-2.5">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono text-linearText-muted">Loading Satellite Radar...</span>
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
    <div className="min-h-screen flex flex-col bg-[#08090A] text-[#F7F8F8] pb-16 md:pb-8">
      {/* Linear Top Header */}
      <Navbar
        userLocation={userLocation}
        onDetectLocation={() => detectLocation(true)}
        isLocating={isLocating}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 space-y-4">
        {/* Proximity Distress Alert Notifications */}
        <NotificationBanner
          incomingAlert={incomingAlert}
          onDismissAlert={() => setIncomingAlert(null)}
        />

        {/* Location Diagnostic Alert */}
        {locationError && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{locationError}</span>
            </div>
            <button
              onClick={() => setLocationError(null)}
              className="text-amber-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Linear Header Bar: Title + Segmented Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Active Incidents
              </h1>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/[0.06] text-linearText-muted border border-white/[0.08]">
                {filteredReports.length} {selectedStatus === "ACTIVE" ? "open" : "total"}
              </span>
            </div>
            <p className="text-xs text-linearText-muted mt-0.5">
              Community emergency dispatch & street feeder network
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {/* Status Segmented Control */}
            <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <button
                onClick={() => setSelectedStatus("ACTIVE")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedStatus === "ACTIVE"
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-linearText-muted hover:text-white"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setSelectedStatus("ALL")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedStatus === "ALL"
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-linearText-muted hover:text-white"
                }`}
              >
                All
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <button
                onClick={() => setViewMode("feed")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "feed"
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-linearText-muted hover:text-white"
                }`}
                title="List View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "map"
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-linearText-muted hover:text-white"
                }`}
                title="Satellite Map View"
              >
                <Map className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchReports(true)}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-linearText-muted hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-white" : ""}`} />
            </button>
          </div>
        </div>

        {/* Linear Category Filter Chips */}
        <div className="pt-0.5">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Main Content Area */}
        {viewMode === "map" ? (
          <div className="h-[550px] w-full rounded-xl overflow-hidden border border-white/[0.08] shadow-linear bg-[#101114]">
            <MapView
              reports={filteredReports.map((r) => r.report)}
              userLocation={userLocation}
              onLocationDetected={(lat, lng, accuracy) => {
                setUserLocation({ lat, lng, accuracy });
              }}
            />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-[#101114] border border-white/[0.08] rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3 max-w-md mx-auto my-12 shadow-linear">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-linearText-muted">
              <Dog className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">No active incidents found</h3>
              <p className="text-xs text-linearText-muted">
                No stray animal alerts match this filter. Have you spotted a dog in distress?
              </p>
            </div>
            <Link
              href="/report"
              className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold tracking-tight shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Broadcast Alert</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map(({ report, distance }) => (
                <DogCard
                  key={report.id}
                  report={report}
                  distanceMeters={distance}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMoreReports}
                  disabled={isLoadingMore}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-white transition-all font-mono"
                >
                  {isLoadingMore ? "Loading..." : "Load Older Incidents"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <InstallPwaPrompt />
      <BottomNav viewMode={viewMode} onToggleViewMode={setViewMode} />
    </div>
  );
}
