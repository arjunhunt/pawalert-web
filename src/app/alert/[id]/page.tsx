"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Share2,
  MapPin,
  Clock,
  User,
  HeartHandshake,
  CheckCircle2,
  Navigation,
  Compass,
  Dog,
  ExternalLink,
  Maximize2,
  X,
  ZoomIn,
  Trash2,
  AlertTriangle,
  Stethoscope,
  Sparkles,
  Loader2,
  HeartPulse,
  Phone,
  Building2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import CommentsSection from "@/components/CommentsSection";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS, VetClinic, VET_FACILITY_LABELS } from "@/lib/types";
import { DEMO_REPORTS, supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { formatTimeAgo, calculateDistanceMeters, formatDistance } from "@/lib/geo";
import { getStoredVets } from "@/lib/vetsData";
import { isMyReport, removeMyReportId, getUserName, syncStatsToCloud, isAdmin } from "@/lib/user";

// Dynamic map preview for detail screen
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-400 text-xs">
      <Compass className="w-5 h-5 animate-spin text-pawAmber mr-2" />
      <span>Loading Dog Coordinate Pin...</span>
    </div>
  ),
});

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [report, setReport] = useState<DogReport | null>(null);
  const [helperName, setHelperName] = useState<string>("Community Feeder");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isAuthor, setIsAuthor] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  useEffect(() => {
    setHelperName(getUserName());
    setIsSuperAdmin(isAdmin());

    const normalize = (raw: any): DogReport => ({
      id: String(raw?.id || id),
      reporter_id: raw?.reporter_id || "anonymous",
      reporter_name: raw?.reporter_name || "Community Feeder",
      problem_type: raw?.problem_type || "OTHER",
      description: raw?.description || "No description provided.",
      photo_url: raw?.photo_url || "",
      latitude: typeof raw?.latitude === "number" ? raw.latitude : (parseFloat(String(raw?.latitude)) || 19.3824),
      longitude: typeof raw?.longitude === "number" ? raw.longitude : (parseFloat(String(raw?.longitude)) || 72.8291),
      address: raw?.address || "Location captured",
      landmark: raw?.landmark || "",
      status: raw?.status || "OPEN",
      helper_name: raw?.helper_name || undefined,
      created_at: raw?.created_at || new Date().toISOString(),
      updated_at: raw?.updated_at || undefined,
    });

    const fetchSingleReport = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .eq("id", id)
          .single();

        if (!error && data) {
          const loaded = normalize(data);
          setReport(loaded);
          setIsAuthor(isMyReport(loaded));
          return;
        }
      }

      // Fallback demo report finder
      const demo = DEMO_REPORTS.find((r) => r.id === id) || DEMO_REPORTS[0];
      const fallback = normalize(demo);
      setReport(fallback);
      setIsAuthor(isMyReport(fallback));
    };

    if (id) fetchSingleReport();
  }, [id]);

  useEffect(() => {
    if (report) {
      setIsAuthor(isMyReport(report));
    }
  }, [report]);

  // Handle escape key to close lightbox or delete modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col bg-darkBg text-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Dog className="w-10 h-10 text-pawAmber animate-bounce" />
        </div>
      </div>
    );
  }

  const catInfo = PROBLEM_TYPE_LABELS[report.problem_type] || PROBLEM_TYPE_LABELS.OTHER;
  const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.OPEN;

  // Claim report
  const handleClaim = async () => {
    setIsUpdating(true);
    const activeName = getUserName() || helperName || "Community Feeder";
    const updated = {
      ...report,
      status: "IN_PROGRESS" as const,
      helper_name: activeName,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("reports")
        .update({
          status: "IN_PROGRESS",
          helper_name: activeName,
        })
        .eq("id", id);
    }
    setReport(updated);
    setIsUpdating(false);
  };

  // Mark report resolved
  const handleResolve = async () => {
    setIsUpdating(true);
    const updated = {
      ...report,
      status: "RESOLVED" as const,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("reports")
        .update({ status: "RESOLVED" })
        .eq("id", id);
    }

    // Increment personal user stats in localStorage & Supabase Cloud
    const curFed = parseInt(localStorage.getItem("pawalert_dogs_fed") || "0", 10);
    const curRescues = parseInt(localStorage.getItem("pawalert_rescues") || "0", 10);
    const curReports = parseInt(localStorage.getItem("pawalert_reports_made") || "0", 10);

    if (
      report.problem_type === "INJURED" ||
      report.problem_type === "SICK" ||
      report.problem_type === "STUCK" ||
      report.problem_type === "NEWBORN_LITTER"
    ) {
      localStorage.setItem("pawalert_rescues", (curRescues + 1).toString());
      syncStatsToCloud("RESCUE", curFed, curRescues, curReports);
    } else {
      localStorage.setItem("pawalert_dogs_fed", (curFed + 1).toString());
      syncStatsToCloud("DOG_FED", curFed, curRescues, curReports);
    }

    setReport(updated);
    setIsUpdating(false);

    // Trigger celebration confetti
    try {
      const confettiModule = (await import("canvas-confetti")).default;
      confettiModule({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // Ignore confetti failures
    }
  };

  // Delete report
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("reports").delete().eq("id", id);
      }
      removeMyReportId(id);
      router.push("/");
    } catch (e) {
      console.error("Delete failed", e);
      setIsDeleting(false);
    }
  };

  // Share alert
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `PawAlert: ${catInfo.label} Dog in ${report.address}`,
        text: `Urgent Dog Alert: ${report.description} at ${report.address}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const safeLat = typeof report.latitude === "number" ? report.latitude : (parseFloat(String(report.latitude)) || 19.3824);
  const safeLng = typeof report.longitude === "number" ? report.longitude : (parseFloat(String(report.longitude)) || 72.8291);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${safeLat},${safeLng}`;

  // Calculate nearest emergency vet or ambulance facility
  const nearestVet = useMemo<{ vet: VetClinic; distance: number } | null>(() => {
    if (!report) return null;
    const allVets = getStoredVets();
    let bestVet: VetClinic | null = null;
    let minDistance = Infinity;

    for (const vet of allVets) {
      const dist = calculateDistanceMeters(
        safeLat,
        safeLng,
        vet.latitude,
        vet.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        bestVet = vet;
      }
    }

    if (bestVet) {
      return { vet: bestVet, distance: minDistance };
    }
    return null;
  }, [report, safeLat, safeLng]);

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Navigation / Header Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Alerts Feed</span>
          </Link>

          <div className="flex items-center space-x-2">
            {/* Super Admin Master Delete Button */}
            {isSuperAdmin && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 border border-red-500/80 text-red-200 text-xs font-bold transition-all shadow-lg shadow-red-950/50"
                title="Founder Admin: Master Delete this alert"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>👑 Master Take-Down</span>
              </button>
            )}

            {/* Regular Author Delete Button */}
            {!isSuperAdmin && isAuthor && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs font-semibold transition-colors"
                title="Delete this alert (You created this)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Alert</span>
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-darkCard hover:bg-darkCardHover border border-darkBorder text-neutral-200 text-xs font-semibold transition-colors"
            >
              <Share2 className="w-4 h-4 text-pawAmber" />
              <span>{shareCopied ? "Link Copied!" : "Share Alert"}</span>
            </button>
          </div>
        </div>

        {/* Main Alert Card */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl overflow-hidden shadow-2xl space-y-6">
          {/* Photo & Badges */}
          <div
            onClick={() => report.photo_url && setIsLightboxOpen(true)}
            className={`relative w-full h-72 sm:h-96 bg-neutral-900 overflow-hidden ${
              report.photo_url ? "cursor-zoom-in group" : ""
            }`}
          >
            {report.photo_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.photo_url}
                  alt={catInfo.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-xl text-white text-xs font-bold flex items-center space-x-2 border border-white/20 shadow-2xl">
                    <ZoomIn className="w-4 h-4 text-pawAmber" />
                    <span>Tap to view full uncropped photo</span>
                  </div>
                </div>

                {/* Bottom-Right Zoom Pill */}
                <div className="absolute bottom-4 right-4 pointer-events-none">
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-black/70 backdrop-blur-md border border-white/15">
                    <Maximize2 className="w-3.5 h-3.5 text-pawAmber" />
                    <span>Zoom</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                <Dog className="w-16 h-16 text-pawAmber/30 mb-2" />
                <span>No photo provided</span>
              </div>
            )}

            {/* Top-Left: Status Badge */}
            <div className="absolute top-4 left-4 pointer-events-none">
              <span
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wide border backdrop-blur-md shadow-lg ${statusInfo.bg}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Category & Time */}
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-pawAmber/15 text-pawAmber font-extrabold text-sm border border-pawAmber/20">
                <span>{catInfo.icon}</span>
                <span>{catInfo.label}</span>
              </span>
              <span className="flex items-center space-x-1.5 text-xs text-neutral-400">
                <Clock className="w-4 h-4" />
                <span>Reported {formatTimeAgo(report.created_at)}</span>
              </span>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-pawAmber uppercase tracking-wider">
                Situation Description
              </h3>
              <p className="text-neutral-100 text-base sm:text-lg leading-relaxed">
                {report.description}
              </p>
            </div>

            {/* 🚨 Nearest Emergency Vet & Ambulance Card */}
            {nearestVet && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-darkBg to-darkBg border border-red-800/40 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <HeartPulse className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                      <h4 className="text-[11px] font-bold text-red-300 uppercase tracking-wider">
                        Nearest Emergency Vet / Ambulance
                      </h4>
                      <div className="text-sm font-black text-white">
                        {nearestVet.vet.name}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-red-300 bg-red-950/60 px-2.5 py-1 rounded-xl border border-red-800/60 flex items-center space-x-1 shrink-0">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span>{formatDistance(nearestVet.distance)}</span>
                  </span>
                </div>

                <p className="text-xs text-neutral-300">
                  📍 {nearestVet.vet.address}, {nearestVet.vet.area}
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <a
                    href={`tel:${nearestVet.vet.emergencyPhone || nearestVet.vet.phone}`}
                    className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 text-center"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Helpline</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${nearestVet.vet.latitude},${nearestVet.vet.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-darkBorder text-neutral-200 text-xs font-bold transition-all active:scale-95 text-center"
                  >
                    <Navigation className="w-3.5 h-3.5 text-pawAmber" />
                    <span>Directions</span>
                  </a>
                </div>

                <div className="text-center pt-1">
                  <Link
                    href="/vets"
                    className="text-[11px] text-neutral-400 hover:text-white transition-colors underline"
                  >
                    View all 24/7 emergency clinics & ambulances →
                  </Link>
                </div>
              </div>
            )}

            {/* Reporter Info */}
            <div className="flex items-center space-x-2.5 p-3.5 rounded-2xl bg-darkBg border border-darkBorder text-xs text-neutral-300">
              <User className="w-4 h-4 text-pawAmber" />
              <span>
                Reported by <b className="text-white">{report.reporter_name}</b>
                {isAuthor && (
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-pawAmber/20 text-pawAmber font-bold text-[10px]">
                    You created this
                  </span>
                )}
              </span>
            </div>

            {/* Location & Map Box */}
            <div className="space-y-3 pt-2 border-t border-darkBorder">
              <h3 className="text-xs font-bold text-pawAmber uppercase tracking-wider">
                Exact Dog Location
              </h3>

              <div className="bg-darkBg border border-darkBorder rounded-2xl p-4 space-y-3">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-5 h-5 text-pawAmber shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-white">
                      {report.address || "Location coordinates recorded"}
                    </div>
                    {report.landmark && (
                      <div className="text-xs text-pawAmber-light mt-0.5">
                        📍 <b>Landmark:</b> {report.landmark}
                      </div>
                    )}
                    <div className="text-[11px] text-neutral-500 mt-1">
                      GPS: {Number(safeLat).toFixed(5)}, {Number(safeLng).toFixed(5)}
                    </div>
                  </div>
                </div>

                {/* Embedded Map */}
                <div className="h-48 w-full rounded-xl overflow-hidden border border-darkBorder">
                  <MapView reports={[report]} />
                </div>

                {/* Turn-by-Turn Directions Button */}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-pawAmber/10"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Google Maps Turn-by-Turn Navigation</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            </div>

            {/* Feeder & Volunteer Action Area */}
            <div className="pt-4 border-t border-darkBorder space-y-4">
              {report.status === "OPEN" && (
                <button
                  onClick={handleClaim}
                  disabled={isUpdating}
                  className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-base shadow-xl shadow-amber-600/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
                >
                  <HeartHandshake className="w-5 h-5" />
                  <span>🐾 I'll Help This Dog (Claim Alert)</span>
                </button>
              )}

              {report.status === "IN_PROGRESS" && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center space-x-2">
                    <HeartHandshake className="w-4 h-4 shrink-0" />
                    <span>
                      Currently being handled by <b>{report.helper_name || "a feeder"}</b>
                    </span>
                  </div>

                  <button
                    onClick={handleResolve}
                    disabled={isUpdating}
                    className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-base shadow-xl shadow-green-600/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Mark as Fed / Rescued / Resolved 🎉</span>
                  </button>
                </div>
              )}

              {report.status === "RESOLVED" && (
                <div className="p-4 rounded-2xl bg-green-950/40 border border-green-800/50 text-green-300 text-sm font-bold flex items-center space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>This dog alert has been safely resolved by community volunteers! 🎉</span>
                </div>
              )}

              {/* Creator Delete Section */}
              {isAuthor && (
                <div className="pt-3 border-t border-darkBorder/60">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full py-3 rounded-2xl bg-red-950/30 hover:bg-red-950/60 text-red-400 border border-red-800/40 text-xs font-bold transition-all flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete This Alert (Author Only)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Rescue Updates & Community Comments */}
        <CommentsSection reportId={report.id} reporterId={report.reporter_id} />
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          onClick={() => setShowDeleteModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-950/50 border border-red-800/50 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white">Delete this Alert?</h3>
              <p className="text-xs sm:text-sm text-neutral-400">
                Are you sure you want to delete this dog report? It will be permanently removed from the live feed and map for all community volunteers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? "Deleting..." : "Yes, Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Scalable Image Lightbox Modal */}
      {isLightboxOpen && report.photo_url && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Close Button Header */}
          <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-white">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-pawAmber/20 text-pawAmber border border-pawAmber/30">
                {catInfo.label}
              </span>
              <span className="text-xs text-neutral-400 truncate max-w-[200px] sm:max-w-md">
                {report.address}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Full Scalable Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.photo_url}
              alt={catInfo.label}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-2xl select-none"
            />
          </div>

          <p className="text-neutral-500 text-xs mt-3">
            Click anywhere or press Esc to close
          </p>
        </div>
      )}
    </div>
  );
}
