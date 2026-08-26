"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, MapPin, Navigation, Dog, CheckCircle, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import PhotoUpload from "@/components/PhotoUpload";
import { ProblemType, PROBLEM_TYPE_LABELS } from "@/lib/types";
import { reverseGeocode } from "@/lib/geo";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function ReportPage() {
  const router = useRouter();

  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<ProblemType>("HUNGRY");
  const [description, setDescription] = useState<string>("");
  const [reporterName, setReporterName] = useState<string>("Community Feeder");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Auto-detect browser GPS on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);

        // Reverse geocode to street address
        const detected = await reverseGeocode(lat, lng);
        setAddress((prev) => (prev.trim() === "" ? detected : prev));
      },
      (err) => {
        console.warn("GPS error:", err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) {
      setErrorMessage("Please capture or upload a dog photo.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please describe the dog's condition or situation.");
      return;
    }
    if (latitude === null || longitude === null) {
      setErrorMessage("GPS location is required to broadcast the alert.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("reports").insert([
          {
            reporter_id: "user-" + Math.random().toString(36).substring(7),
            reporter_name: reporterName.trim() || "Anonymous Feeder",
            problem_type: selectedCategory,
            description: description.trim(),
            photo_url: photoUrl,
            latitude: latitude,
            longitude: longitude,
            address: address.trim() || "Location captured",
            landmark: landmark.trim(),
            status: "OPEN",
          },
        ]).select();

        if (error) throw error;
        if (data && data[0]) {
          router.push(`/alert/${data[0].id}`);
          return;
        }
      }

      // Fallback: Redirect to home on success
      router.push("/");
    } catch (e: any) {
      console.error("Submission failed", e);
      setErrorMessage(e.message || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-neutral-400 hover:text-white text-xs font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Feed</span>
        </Link>

        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center space-x-2">
              <span>Report Stray Dog Alert</span>
              <Dog className="w-6 h-6 text-pawAmber" />
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Notify nearby volunteers and community feeders to assist this dog immediately.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-4 text-xs sm:text-sm text-red-300 flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Photo */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-pawAmber">
                1. Dog Photo *
              </label>
              <PhotoUpload onPhotoReady={setPhotoUrl} currentPhotoUrl={photoUrl} />
            </div>

            {/* Step 2: Need Category */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-pawAmber">
                2. Category of Need *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(Object.keys(PROBLEM_TYPE_LABELS) as ProblemType[]).map((cat) => {
                  const info = PROBLEM_TYPE_LABELS[cat];
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all ${
                        isSelected
                          ? "bg-pawAmber/20 border-pawAmber text-white ring-1 ring-pawAmber"
                          : "bg-darkCard/60 border-darkBorder text-neutral-300 hover:border-neutral-600"
                      }`}
                    >
                      <span className="text-xl">{info.icon}</span>
                      <span className="text-xs font-bold">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Description */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-pawAmber">
                3. Situation Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe dog appearance, collar, physical condition, behavior, or immediate dangers..."
                rows={3}
                required
                className="w-full bg-darkBg border border-darkBorder rounded-2xl p-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber transition-colors"
              />
            </div>

            {/* Step 4: Location & Landmark */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-pawAmber">
                4. Location & Landmark *
              </label>

              <div className="bg-darkBg border border-darkBorder rounded-2xl p-4 space-y-4">
                {/* GPS Status & Detector */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className={`w-5 h-5 ${latitude ? "text-green-400" : "text-neutral-500"}`} />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {latitude ? "GPS Coordinates Locked" : "GPS Required"}
                      </div>
                      {latitude && longitude && (
                        <div className="text-[11px] text-neutral-400">
                          {latitude.toFixed(5)}, {longitude.toFixed(5)}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isLocating}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-pawAmber/15 text-pawAmber text-xs font-bold border border-pawAmber/30 hover:bg-pawAmber/25 transition-all"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
                    <span>{latitude ? "Refresh GPS" : "Detect GPS"}</span>
                  </button>
                </div>

                {/* Editable Street Address */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Area / Locality / Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Devdham, Umargam"
                    className="w-full bg-darkCard border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                  />
                </div>

                {/* Landmark Input */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Specific Landmark / Spot Details (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Sharma tea stall, opposite blue gate, under banyan tree"
                    className="w-full bg-darkCard border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                  />
                </div>
              </div>
            </div>

            {/* Reporter Nickname */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-400">
                Your Volunteer Name / Handle
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="e.g. Arjun (Dog Lover)"
                className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-pawAmber hover:bg-pawAmber-hover text-white font-extrabold text-base shadow-xl shadow-pawAmber/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              <span>
                {isSubmitting ? "Broadcasting Alert..." : "Broadcast Dog Alert 🐾"}
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
