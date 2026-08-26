"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Map, RefreshCw, Dog, PlusCircle, AlertCircle, Compass } from "lucide-react";
import Navbar from "@/components/Navbar";
import DogCard from "@/components/DogCard";
import CategoryFilter from "@/components/CategoryFilter";
import { DogReport, ProblemType, ReportStatus } from "@/lib/types";
import { DEMO_REPORTS, supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { calculateDistanceMeters } from "@/lib/geo";

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
  const [reports, setReports] = useState<DogReport[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<ProblemType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [viewMode, setViewMode] = useState<"feed" | "map">("feed");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch live reports from Supabase
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setReports(data as DogReport[]);
        }
      }
    } catch (e) {
      console.warn("Could not load from Supabase", e);
    } finally {
      setIsLoading(false);
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
              setReports((prev) => [payload.new as DogReport, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setReports((prev) =>
                prev.map((r) =>
                  r.id === payload.new.id ? (payload.new as DogReport) : r
                )
              );
            } else if (payload.eventType === "DELETE") {
              setReports((prev) => prev.filter((r) => r.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    }
  }, []);

  // Filter and sort reports nearest first
  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        // Status filter
        if (selectedStatus === "ACTIVE") {
          if (report.status === "RESOLVED") return false;
        }
        // Category filter
        if (selectedCategory !== null) {
          if (report.problem_type !== selectedCategory) return false;
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
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return (
          new Date(b.report.created_at).getTime() -
          new Date(a.report.created_at).getTime()
        );
      });
  }, [reports, selectedCategory, selectedStatus, userLocation]);

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      {/* Top Navigation */}
      <Navbar
        userLocation={userLocation}
        onDetectLocation={detectLocation}
        isLocating={isLocating}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Supabase Notice Banner if demo fallback */}
        {!isSupabaseConfigured && (
          <div className="bg-pawAmber/10 border border-pawAmber/30 rounded-2xl p-4 flex items-center justify-between text-xs sm:text-sm text-neutral-200">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-pawAmber shrink-0" />
              <span>
                <b>Demo Mode Active:</b> Link your Supabase project keys to activate live global database sync.
              </span>
            </div>
          </div>
        )}

        {/* View Switcher & Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-darkBorder">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
              <span>Live Stray Dog Alerts</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pawAmber/20 text-pawAmber border border-pawAmber/30">
                {filteredReports.length} {filteredReports.length === 1 ? "Dog" : "Dogs"}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              {userLocation
                ? "Sorted by nearest distance from your GPS location"
                : "Enable GPS to sort alerts closest to you"}
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {/* Active vs All status filter */}
            <div className="bg-darkCard p-1 rounded-xl border border-darkBorder flex items-center text-xs font-semibold">
              <button
                onClick={() => setSelectedStatus("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  selectedStatus === "ACTIVE"
                    ? "bg-pawAmber text-white font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Needs Action
              </button>
              <button
                onClick={() => setSelectedStatus("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  selectedStatus === "ALL"
                    ? "bg-pawAmber text-white font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                All Reports
              </button>
            </div>

            {/* View Mode Toggle: Feed vs Map */}
            <div className="bg-darkCard p-1 rounded-xl border border-darkBorder flex items-center text-xs">
              <button
                onClick={() => setViewMode("feed")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "feed"
                    ? "bg-neutral-700 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="Card Feed View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "map"
                    ? "bg-neutral-700 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="Interactive Map View"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-darkCard hover:bg-darkCardHover text-neutral-300 border border-darkBorder transition-all"
              title="Refresh feed"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReports.map(({ report, distance }) => (
              <DogCard
                key={report.id}
                report={report}
                distanceMeters={distance}
              />
            ))}
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
    </div>
  );
}
