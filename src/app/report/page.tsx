"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Send,
  MapPin,
  Navigation,
  Dog,
  AlertTriangle,
  Compass,
  Sparkles,
  Loader2,
  CheckCircle2,
  Crosshair,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PhotoUpload from "@/components/PhotoUpload";
import { ProblemType, PROBLEM_TYPE_LABELS, DogReport } from "@/lib/types";
import { reverseGeocodeDetailed, getAccurateGPSPosition, getCachedCoordinates, forwardGeocode } from "@/lib/geo";
import { getUserId, getUserName, addMyReportId, syncStatsToCloud } from "@/lib/user";
import {
  isSafeImageUrl,
  sanitizeText,
  validateCoordinates,
  checkRateLimit,
  containsSuspiciousLinks,
} from "@/lib/security";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Other / Union Territory",
];

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-44 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-400 text-xs">
      <Compass className="w-5 h-5 animate-spin text-pawAmber mr-2" />
      <span>Loading Pinpoint Satellite Map...</span>
    </div>
  ),
});

export default function ReportPage() {
  const router = useRouter();

  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<ProblemType>("HUNGRY");
  const [description, setDescription] = useState<string>("");
  const [reporterName, setReporterName] = useState<string>("Community Feeder");

  // Granular Location States
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isAdjustingPin, setIsAdjustingPin] = useState<boolean>(false);
  const [pincode, setPincode] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [street, setStreet] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("Gujarat");

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Auto-detect browser GPS and user handle on mount
  useEffect(() => {
    const savedName = localStorage.getItem("pawalert_user_name");
    if (savedName) setReporterName(savedName);
    detectLocation();
  }, []);

  const handlePhotoUploaded = (url: string) => {
    setPhotoUrl(url);
  };

  const detectLocation = async () => {
    setIsLocating(true);
    setErrorMessage("");
    try {
      const res = await getAccurateGPSPosition(true, 6000);
      if (res && res.lat !== 0 && res.lng !== 0) {
        setLatitude(res.lat);
        setLongitude(res.lng);
        setGpsAccuracy(Math.round(res.accuracy));

        // Reverse geocode to detailed structured address
        const details = await reverseGeocodeDetailed(res.lat, res.lng);
        if (details.pincode) setPincode(details.pincode);
        if (details.area) setArea(details.area);
        if (details.street) setStreet(details.street);
        if (details.city) setCity(details.city);
        if (details.state) setState(details.state);
      } else if (res?.error) {
        setErrorMessage(res.error);
      }
    } catch (err) {
      console.warn("GPS error:", err);
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapCoordinatePicked = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setGpsAccuracy(1); // Manually verified exact pinpoint!
    setIsAdjustingPin(true);
    try {
      const details = await reverseGeocodeDetailed(lat, lng);
      if (details.pincode) setPincode(details.pincode);
      if (details.area) setArea(details.area);
      if (details.street) setStreet(details.street);
      if (details.city) setCity(details.city);
      if (details.state) setState(details.state);
    } catch (e) {}
    setTimeout(() => setIsAdjustingPin(false), 800);
  };

  const [honeypot, setHoneypot] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Bot Honeypot Trap Check: If hidden field is filled, silently ignore bot spam
    if (honeypot.trim().length > 0) {
      console.warn("Spam bot detected via honeypot trap");
      router.push("/");
      return;
    }

    // 2. Client-Side Anti-Flood Rate Limiting (20s cooldown between reports)
    const rateCheck = checkRateLimit("report_broadcast", 20000);
    if (!rateCheck.allowed) {
      setErrorMessage(`Please wait ${rateCheck.remainingSec}s before broadcasting another alert.`);
      return;
    }

    if (!photoUrl) {
      setErrorMessage("Please capture or upload a dog photo.");
      return;
    }

    // 3. Safe Image Protocol Validation (Anti-XSS)
    if (!isSafeImageUrl(photoUrl)) {
      setErrorMessage("Invalid image format or insecure image source.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Please describe the dog's condition or situation.");
      return;
    }

    if (containsSuspiciousLinks(description) || containsSuspiciousLinks(landmark)) {
      setErrorMessage("External promotional links and scam URLs are strictly prohibited in dog alerts.");
      return;
    }

    // 4. Coordinates Resolution & Validation (with automated forward-geocoding fallback)
    let finalLat = latitude;
    let finalLng = longitude;

    if (!validateCoordinates(finalLat, finalLng)) {
      const addressQuery = [area, street, city, state].filter(Boolean).join(", ");
      const geocoded = await forwardGeocode(addressQuery);
      if (geocoded && validateCoordinates(geocoded.lat, geocoded.lng)) {
        finalLat = geocoded.lat;
        finalLng = geocoded.lng;
        setLatitude(geocoded.lat);
        setLongitude(geocoded.lng);
      } else {
        setErrorMessage("Valid GPS location required. Please tap 'Detect GPS' or specify a known Area/City.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");

    // 5. Input Sanitization & Length Bounding
    const sanitizedDesc = sanitizeText(description, 1000);
    const sanitizedArea = sanitizeText(area, 150);
    const sanitizedStreet = sanitizeText(street, 150);
    const sanitizedCity = sanitizeText(city, 100);
    const sanitizedState = sanitizeText(state, 50);
    const sanitizedPincode = sanitizeText(pincode, 20);
    const sanitizedLandmark = sanitizeText(landmark, 250);
    const sanitizedReporterName = sanitizeText(reporterName, 60);

    // Build formatted full address
    const addressParts: string[] = [];
    if (sanitizedStreet) addressParts.push(sanitizedStreet);
    if (sanitizedArea) addressParts.push(sanitizedArea);
    if (sanitizedCity) addressParts.push(sanitizedCity);
    if (sanitizedState) addressParts.push(sanitizedState);
    if (sanitizedPincode) addressParts.push(sanitizedPincode);

    const combinedAddress =
      addressParts.length > 0 ? addressParts.join(", ") : "Location captured";

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("reports").insert([
          {
            reporter_id: getUserId(),
            reporter_name: sanitizedReporterName || getUserName(),
            problem_type: selectedCategory,
            description: sanitizedDesc,
            photo_url: photoUrl,
            latitude: latitude,
            longitude: longitude,
            address: combinedAddress,
            landmark: sanitizedLandmark,
            status: "OPEN",
          },
        ]).select();

        if (error) throw error;

        if (data && data[0]) {
          addMyReportId(data[0].id);
        }

        // Increment user's reports counter in localStorage & Supabase Cloud
        const curFed = parseInt(localStorage.getItem("pawalert_dogs_fed") || "0", 10);
        const curRescues = parseInt(localStorage.getItem("pawalert_rescues") || "0", 10);
        const curReports = parseInt(localStorage.getItem("pawalert_reports_made") || "0", 10);
        localStorage.setItem("pawalert_reports_made", (curReports + 1).toString());
        syncStatsToCloud("REPORT_MADE", curFed, curRescues, curReports);

        if (data && data[0]) {
          router.push(`/alert/${data[0].id}`);
          return;
        }
      }

      const curReports = parseInt(localStorage.getItem("pawalert_reports_made") || "0", 10);
      localStorage.setItem("pawalert_reports_made", (curReports + 1).toString());

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
            {/* Anti-Bot Honeypot Trap (Invisible to humans, catches automated spambots) */}
            <input
              type="text"
              name="hp_website_trap"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="opacity-0 absolute -z-50 w-0 h-0 pointer-events-none select-none"
              aria-hidden="true"
            />

            {/* Step 1: Photo & PawMedic AI Scanner */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-pawAmber">
                  1. Dog Photo *
                </label>
              </div>

              <PhotoUpload onPhotoReady={handlePhotoUploaded} currentPhotoUrl={photoUrl} />
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

            {/* Step 4: Structured Location Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-pawAmber uppercase tracking-wider">
                    4. Exact Location & Address *
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Be as precise as possible — this helps volunteers find the dog on ground.
                  </p>
                </div>
              </div>

              <div className="bg-darkBg border border-darkBorder rounded-2xl p-5 space-y-4">
                {/* GPS Auto-Detect Bar & High-Precision Meter */}
                <div className="flex items-center justify-between pb-3 border-b border-darkBorder flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className={`w-5 h-5 ${latitude ? "text-emerald-400" : "text-neutral-500"}`} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">
                          {latitude ? "GPS Coordinates Locked" : "GPS Required"}
                        </span>
                        {gpsAccuracy !== null && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
                              gpsAccuracy <= 10
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                                : gpsAccuracy <= 25
                                ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                                : "bg-neutral-800 text-neutral-300 border-neutral-700"
                            }`}
                          >
                            <Crosshair className="w-3 h-3" />
                            <span>
                              {gpsAccuracy <= 1
                                ? "🎯 Exact Pinpoint Verified"
                                : `±${gpsAccuracy}m Accuracy`}
                            </span>
                          </span>
                        )}
                      </div>
                      {latitude && longitude && (
                        <div className="text-[11px] text-neutral-400">
                          {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isLocating}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-pawAmber/15 text-pawAmber text-xs font-bold border border-pawAmber/30 hover:bg-pawAmber/25 transition-all shadow-sm active:scale-95"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
                    <span>{isLocating ? "Locking GPS..." : latitude ? "Re-lock GPS" : "Detect GPS"}</span>
                  </button>
                </div>

                {/* 📍 Interactive Draggable Pinpoint Map */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200 flex items-center space-x-1">
                      <span>📍</span>
                      <span>Pinpoint Exact Dog Spot</span>
                    </span>
                    <span className="text-[11px] text-pawAmber font-semibold">
                      Tap map or drag pin to adjust
                    </span>
                  </div>

                  <div className="h-52 w-full rounded-2xl overflow-hidden border border-darkBorder relative shadow-inner">
                    <MapView
                      reports={
                        latitude && longitude
                          ? [
                              {
                                id: "report-preview-pin",
                                reporter_id: "me",
                                reporter_name: reporterName,
                                problem_type: selectedCategory,
                                description: description || "Target Dog Spot",
                                photo_url: photoUrl,
                                latitude: latitude,
                                longitude: longitude,
                                address: area || "Exact Dog Location",
                                landmark: landmark,
                                status: "OPEN",
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                              },
                            ]
                          : []
                      }
                      userLocation={
                        latitude && longitude
                          ? { lat: latitude, lng: longitude, accuracy: gpsAccuracy || 10 }
                          : null
                      }
                      interactiveSelect={true}
                      onSelectCoordinate={handleMapCoordinatePicked}
                      onLocationDetected={(lat, lng) => {
                        handleMapCoordinatePicked(lat, lng);
                      }}
                    />

                    {isAdjustingPin && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-emerald-400 text-[11px] font-bold border border-emerald-800/60 shadow-lg flex items-center space-x-1.5 z-[1000]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Exact Spot Pinpoint Updated!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 396170"
                    className="w-full bg-darkCard border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                  />
                </div>

                {/* Area / Locality */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Area / Locality *
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Patilpada, Sector 12, Station Road"
                    required
                    className="w-full bg-darkCard border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Neighbourhood or locality name</p>
                </div>

                {/* Exact location / Street */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Exact location / Street
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. Near MG Road Metro Station, Main Bazar Road"
                    className="w-full bg-darkCard border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Street name or nearest identifiable spot</p>
                </div>

                {/* Additional details / Landmark */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Spot Landmark / Visual Recognition Clue
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Opposite State Bank, behind bus stand, under banyan tree"
                    className="w-full bg-darkCard border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Exact visual clues so responders can spot the dog without wandering</p>
                </div>

                {/* City & State Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      City / Town
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Umargam, Mumbai"
                      className="w-full bg-darkCard border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      State *
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-darkCard border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 focus:outline-none focus:border-pawAmber"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st} className="bg-neutral-900 text-white">
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
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
                className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
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
