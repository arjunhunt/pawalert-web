"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { DEMO_REPORTS, supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { formatTimeAgo } from "@/lib/geo";

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

  useEffect(() => {
    const savedName = localStorage.getItem("pawalert_user_name");
    if (savedName) setHelperName(savedName);

    const fetchSingleReport = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("reports")
          .select("*")
          .eq("id", id)
          .single();

        if (!error && data) {
          setReport(data as DogReport);
          return;
        }
      }

      // Fallback demo report finder
      const demo = DEMO_REPORTS.find((r) => r.id === id) || DEMO_REPORTS[0];
      setReport(demo);
    };

    if (id) fetchSingleReport();
  }, [id]);

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
    const activeName = localStorage.getItem("pawalert_user_name") || helperName || "Community Feeder";
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

    // Increment personal user stats in localStorage
    if (report.problem_type === "INJURED" || report.problem_type === "SICK" || report.problem_type === "STUCK" || report.problem_type === "NEWBORN_LITTER") {
      const rescues = parseInt(localStorage.getItem("pawalert_rescues") || "0", 10);
      localStorage.setItem("pawalert_rescues", (rescues + 1).toString());
    } else {
      const fed = parseInt(localStorage.getItem("pawalert_dogs_fed") || "0", 10);
      localStorage.setItem("pawalert_dogs_fed", (fed + 1).toString());
    }

    setReport(updated);
    setIsUpdating(false);

    // Trigger celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
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

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`;

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

          <button
            onClick={handleShare}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-darkCard hover:bg-darkCardHover border border-darkBorder text-neutral-200 text-xs font-semibold transition-colors"
          >
            <Share2 className="w-4 h-4 text-pawAmber" />
            <span>{shareCopied ? "Link Copied!" : "Share Alert"}</span>
          </button>
        </div>

        {/* Main Alert Card */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl overflow-hidden shadow-2xl space-y-6">
          {/* Photo & Badges */}
          <div className="relative w-full h-72 sm:h-96 bg-neutral-900">
            {report.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.photo_url}
                alt={catInfo.label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                <Dog className="w-16 h-16 text-pawAmber/30 mb-2" />
                <span>No photo provided</span>
              </div>
            )}

            {/* Top-Left: Status Badge */}
            <div className="absolute top-4 left-4">
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

            {/* Reporter Info */}
            <div className="flex items-center space-x-2.5 p-3.5 rounded-2xl bg-darkBg border border-darkBorder text-xs text-neutral-300">
              <User className="w-4 h-4 text-pawAmber" />
              <span>
                Reported by <b className="text-white">{report.reporter_name}</b>
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
                      GPS: {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
