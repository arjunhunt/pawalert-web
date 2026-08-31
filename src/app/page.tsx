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
  ChevronDown,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import DogCard from "@/components/DogCard";
import NotificationBanner from "@/components/NotificationBanner";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";
import CategoryFilter from "@/components/CategoryFilter";
import { DogReport, ProblemType, ReportStatus } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { calculateDistanceMeters } from "@/lib/geo";
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
  const [reports, setReports] = useState<DogReport[]>(() => memoryReportsCache || []);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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

  // Detect user GPS location via browser Geolocation API
  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation permission denied or error:", err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Initial load & Supabase Realtime setup
  useEffect(() => {
    fetchReports();
    detectLocation();

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
        supabase?.removeChannel(channel);
      };
    }
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

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-darkCard/80 backdrop-blur-md p-4 rounded-3xl border border-darkBorder">
          {/* Status Tabs & Report Dog Button */}
          <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto">
            <div className="flex items-center space-x-1 bg-darkBg p-1 rounded-2xl border border-darkBorder">
              <button
                onClick={() => setSelectedStatus("ACTIVE")}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedStatus === "ACTIVE"
                    ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Needs Help (Active)
              </button>
              <button
                onClick={() => setSelectedStatus("ALL")}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedStatus === "ALL"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                All Alerts
              </button>
            </div>

            {/* + Report Dog Button */}
            <Link
              href="/report"
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black shadow-lg shadow-pawAmber/20 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Report Dog</span>
            </Link>
          </div>

          {/* Location & View Controls */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={detectLocation}
              disabled={isLocating}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-darkBg hover:bg-neutral-800 border border-darkBorder text-xs text-neutral-300 transition-colors"
              title="Update your GPS location"
            >
              <Compass className={`w-4 h-4 text-pawAmber ${isLocating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {userLocation ? "GPS Locked" : "Detect GPS"}
              </span>
            </button>

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
              title="Refresh alerts"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-pawAmber" : ""}`} />
            </button>
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
    </div>
  );
}
