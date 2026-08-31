"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Navigation,
  MapPin,
  Clock,
  Search,
  PlusCircle,
  ShieldCheck,
  Building2,
  Ambulance,
  HeartPulse,
  Sparkles,
  ExternalLink,
  X,
  Compass,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { VetClinic, VetFacilityType, VET_FACILITY_LABELS } from "@/lib/types";
import { getStoredVets, saveCustomVet } from "@/lib/vetsData";
import { calculateDistanceMeters, formatDistance, getCachedCoordinates, getDeviceGeolocation } from "@/lib/geo";

export default function VetsDirectoryPage() {
  const [vets, setVets] = useState<VetClinic[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() =>
    getCachedCoordinates()
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<VetFacilityType | "ALL">("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form state for adding custom clinic
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<VetFacilityType>("CLINIC");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newIs24x7, setNewIs24x7] = useState(false);
  const [newFacilities, setNewFacilities] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    setVets(getStoredVets());
    detectGPS();
  }, []);

  const detectGPS = async () => {
    setIsLocating(true);
    try {
      const res = await getDeviceGeolocation(false);
      if (res && res.lat !== 0 && res.lng !== 0) {
        setUserLocation({ lat: res.lat, lng: res.lng });
      }
    } catch (e) {
      console.warn("GPS lookup", e);
    } finally {
      setIsLocating(false);
    }
  };

  // Filter and sort nearest first
  const filteredVets = useMemo(() => {
    return vets
      .filter((vet) => {
        // Type filter
        if (selectedType !== "ALL" && vet.type !== selectedType) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = vet.name.toLowerCase().includes(q);
          const matchArea = vet.area.toLowerCase().includes(q);
          const matchCity = vet.city.toLowerCase().includes(q);
          const matchAddress = vet.address.toLowerCase().includes(q);
          if (!matchName && !matchArea && !matchCity && !matchAddress) {
            return false;
          }
        }

        return true;
      })
      .map((vet) => {
        let distance: number | null = null;
        if (userLocation) {
          distance = calculateDistanceMeters(
            userLocation.lat,
            userLocation.lng,
            vet.latitude,
            vet.longitude
          );
        }
        return { vet, distance };
      })
      .sort((a, b) => {
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return 0;
      });
  }, [vets, selectedType, searchQuery, userLocation]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newArea || !newCity) return;

    const facList = newFacilities
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const saved = saveCustomVet({
      name: newName,
      type: newType,
      phone: newPhone,
      is24x7: newIs24x7,
      address: newAddress || `${newArea}, ${newCity}`,
      area: newArea,
      city: newCity,
      state: "India",
      latitude: userLocation?.lat || 19.3824,
      longitude: userLocation?.lng || 72.8291,
      facilities: facList.length > 0 ? facList : ["Emergency Care", "OPD"],
      notes: newNotes,
    });

    setVets((prev) => [saved, ...prev]);
    setIsAddModalOpen(false);

    // Reset form
    setNewName("");
    setNewPhone("");
    setNewAddress("");
    setNewArea("");
    setNewCity("");
    setNewFacilities("");
    setNewNotes("");
  };

  return (
    <div className="min-h-screen bg-darkBg text-neutral-100 flex flex-col font-sans pb-16">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Back Link & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live Map</span>
          </Link>

          <button
            onClick={detectGPS}
            disabled={isLocating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-darkCard border border-darkBorder text-xs text-neutral-300 hover:border-pawAmber transition-colors"
          >
            <Compass className={`w-3.5 h-3.5 text-pawAmber ${isLocating ? "animate-spin" : ""}`} />
            <span>{userLocation ? "GPS Active" : "Detect GPS"}</span>
          </button>
        </div>

        {/* Hero Banner */}
        <div className="text-center space-y-2 relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-red-950/30 via-darkCard to-darkCard border border-red-800/30 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto shadow-lg shadow-red-500/20">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            24/7 Emergency Vet & Ambulance Directory
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-lg mx-auto leading-relaxed">
            Instant contact directory for nearest animal trauma hospitals, 24/7 ambulances, and free stray welfare centers with 1-tap direct calling and navigation.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 border border-darkBorder text-xs font-bold text-neutral-200 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-pawAmber" />
              <span>Submit a Local Vet / Ambulance</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hospital name, area, or city (e.g. Vasai, Virar, Mumbai, Thane)..."
              className="w-full bg-darkCard border border-darkBorder rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedType("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedType === "ALL"
                  ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                  : "bg-darkCard border border-darkBorder text-neutral-400 hover:text-white"
              }`}
            >
              All Facilities ({vets.length})
            </button>
            <button
              onClick={() => setSelectedType("HOSPITAL_24X7")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedType === "HOSPITAL_24X7"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "bg-darkCard border border-darkBorder text-neutral-400 hover:text-white"
              }`}
            >
              <span>🚨</span>
              <span>24/7 Hospitals</span>
            </button>
            <button
              onClick={() => setSelectedType("AMBULANCE")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedType === "AMBULANCE"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "bg-darkCard border border-darkBorder text-neutral-400 hover:text-white"
              }`}
            >
              <span>🚐</span>
              <span>Ambulances</span>
            </button>
            <button
              onClick={() => setSelectedType("NGO_SHELTER")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedType === "NGO_SHELTER"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-darkCard border border-darkBorder text-neutral-400 hover:text-white"
              }`}
            >
              <span>🐾</span>
              <span>NGO / Free Care</span>
            </button>
            <button
              onClick={() => setSelectedType("CLINIC")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedType === "CLINIC"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-darkCard border border-darkBorder text-neutral-400 hover:text-white"
              }`}
            >
              <span>🩺</span>
              <span>OPD Clinics</span>
            </button>
          </div>
        </div>

        {/* Directory Listing */}
        <div className="space-y-4">
          {filteredVets.length === 0 ? (
            <div className="text-center py-12 bg-darkCard border border-darkBorder rounded-3xl p-6 space-y-3">
              <Building2 className="w-10 h-10 text-neutral-600 mx-auto" />
              <div className="text-sm font-bold text-neutral-300">
                No matching clinics found
              </div>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Try searching for a different area or click below to add a local vet.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-pawAmber text-white text-xs font-bold"
              >
                + Add Vet Clinic
              </button>
            </div>
          ) : (
            filteredVets.map(({ vet, distance }) => {
              const labelInfo = VET_FACILITY_LABELS[vet.type] || VET_FACILITY_LABELS.CLINIC;
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${vet.latitude},${vet.longitude}`;

              return (
                <div
                  key={vet.id}
                  className="bg-darkCard border border-darkBorder hover:border-neutral-700 rounded-3xl p-5 sm:p-6 space-y-4 transition-all shadow-lg"
                >
                  {/* Top Bar: Badges & Distance */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${labelInfo.bg}`}
                        >
                          <span>{labelInfo.icon}</span>
                          <span>{labelInfo.label}</span>
                        </span>

                        {vet.is24x7 && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-800/60 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-red-400" />
                            <span>Open 24/7</span>
                          </span>
                        )}

                        {vet.isVerified && (
                          <span className="text-[11px] font-semibold text-cyan-400 flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-white pt-1">
                        {vet.name}
                      </h3>
                    </div>

                    {distance !== null && (
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-pawAmber bg-pawAmber/10 px-2.5 py-1 rounded-xl border border-pawAmber/20">
                          <MapPin className="w-3 h-3" />
                          <span>{formatDistance(distance)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Address & City */}
                  <div className="text-xs text-neutral-300 flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                    <span>
                      {vet.address}, <strong className="text-white">{vet.area}</strong>, {vet.city}
                    </span>
                  </div>

                  {/* Notes / Special Guidance */}
                  {vet.notes && (
                    <div className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-800/30 rounded-xl p-3">
                      💡 {vet.notes}
                    </div>
                  )}

                  {/* Facility Tags */}
                  {vet.facilities && vet.facilities.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5 pt-1">
                      {vet.facilities.map((fac, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-800/80 text-neutral-300 border border-darkBorder"
                        >
                          ✓ {fac}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons: Call & Directions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <a
                      href={`tel:${vet.emergencyPhone || vet.phone}`}
                      className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-95 text-center"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call Helpline</span>
                    </a>

                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-darkBorder text-neutral-100 font-bold text-xs sm:text-sm transition-all active:scale-95 text-center"
                    >
                      <Navigation className="w-4 h-4 text-pawAmber" />
                      <span>Get Directions</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Add Vet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-darkCard border border-darkBorder rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-darkBorder">
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <HeartPulse className="w-5 h-5 text-red-400" />
                <span>Submit Local Vet or Ambulance</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Hospital / Doctor / Ambulance Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Vasai Pet Emergency Hospital"
                  className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Facility Type *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as VetFacilityType)}
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="HOSPITAL_24X7">24/7 Trauma Hospital</option>
                    <option value="AMBULANCE">Animal Ambulance</option>
                    <option value="CLINIC">Veterinary Clinic</option>
                    <option value="NGO_SHELTER">NGO / Stray Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Phone / Helpline Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +91 98230 11223"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Area / Locality *
                  </label>
                  <input
                    type="text"
                    required
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="e.g. Vasai West"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Vasai-Virar"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Full Street Address (Optional)
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Near Station Road, Opp Bank"
                  className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is247"
                  checked={newIs24x7}
                  onChange={(e) => setNewIs24x7(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-0"
                />
                <label htmlFor="is247" className="text-xs text-neutral-300">
                  This facility operates 24 Hours (Round-the-clock emergency)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Key Facilities (Comma separated)
                </label>
                <input
                  type="text"
                  value={newFacilities}
                  onChange={(e) => setNewFacilities(e.target.value)}
                  placeholder="e.g. X-Ray, Surgery, Blood Test, Ambulance"
                  className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Special Notes / Feeder Discounts
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Free treatment for road accident dogs, call before bringing..."
                  className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-red-600/20"
                >
                  Save & Add to Directory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
