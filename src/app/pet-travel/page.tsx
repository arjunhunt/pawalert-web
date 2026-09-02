"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Car,
  HeartPulse,
  Phone,
  Navigation,
  MapPin,
  AlertTriangle,
  Flame,
  Activity,
  ShieldAlert,
  Sparkles,
  Search,
  ArrowLeft,
  Share2,
  CheckCircle2,
  X,
  PlusCircle,
  HelpCircle,
  Store,
  ChevronRight,
  Info,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { VetClinic, VET_FACILITY_LABELS } from "@/lib/types";
import { getStoredVets, fetchGlobalNearbyVets } from "@/lib/vetsData";
import {
  calculateDistanceMeters,
  formatDistance,
  getCachedCoordinates,
  getDeviceGeolocation,
  getFastestNavigationUrl,
} from "@/lib/geo";
import { sanitizeText } from "@/lib/security";

// Travel First Aid Medical Database
interface FirstAidTopic {
  id: string;
  title: string;
  icon: string;
  urgency: "CRITICAL" | "HIGH" | "MODERATE";
  badgeColor: string;
  summary: string;
  symptoms: string[];
  immediateSteps: string[];
  whatToAvoid: string[];
}

const TRAVEL_FIRST_AID_TOPICS: FirstAidTopic[] = [
  {
    id: "heatstroke",
    title: "Car Heatstroke & Overheating",
    icon: "☀️",
    urgency: "CRITICAL",
    badgeColor: "bg-red-950/60 text-red-400 border-red-800/60",
    summary: "Cars heat up to 50°C in minutes. Heatstroke is life-threatening and requires immediate cooling.",
    symptoms: [
      "Heavy rapid panting & excessive drooling",
      "Bright red or purple gums/tongue",
      "Weakness, glass-eyed stare or collapse",
      "Vomiting or unsteadiness while standing",
    ],
    immediateSteps: [
      "Move the pet to shade or AC vehicle immediately.",
      "Pour cool (ROOM TEMPERATURE) water over paws, ears, neck, and belly.",
      "Place a wet towel under the body (never cover the whole dog with wet heavy blankets as it traps heat).",
      "Offer small sips of cool water (do not force large gulps).",
      "Rush to the nearest vet clinic with car AC blowing.",
    ],
    whatToAvoid: [
      "NEVER use ice water or ice baths (causes blood vessels to constrict and traps core heat).",
      "Do NOT leave pet unattended in a vehicle with windows cracked (temperature still spikes).",
    ],
  },
  {
    id: "motion_sickness",
    title: "Motion Sickness, Vomiting & Acid Reflux",
    icon: "🤢",
    urgency: "MODERATE",
    badgeColor: "bg-amber-950/60 text-amber-400 border-amber-800/60",
    summary: "Common in puppies and road trips. Anxiety and inner ear motion cause nausea.",
    symptoms: [
      "Frequent yawning and lip-licking",
      "Excessive drooling inside the vehicle",
      "Whining, restlessness, or vomiting yellowish bile",
    ],
    immediateSteps: [
      "Stop the car safely and let the pet take a 10-minute walk on a leash in fresh air.",
      "Provide small sips of water with a pinch of pet electrolyte / ORS.",
      "Keep windows cracked 2 inches to equalize car air pressure.",
      "Fast the pet for 3-4 hours before starting long drives (feed only after arrival).",
    ],
    whatToAvoid: [
      "Do not feed heavy meals right before or during car travel.",
      "Avoid harsh air fresheners or strong perfumes inside the car.",
    ],
  },
  {
    id: "paw_injury",
    title: "Paw Cuts, Broken Nails & Highway Glass",
    icon: "🩹",
    urgency: "HIGH",
    badgeColor: "bg-orange-950/60 text-orange-400 border-orange-800/60",
    summary: "Highway rest stops and road shoulders often contain sharp gravel, broken beer glass, or thorns.",
    symptoms: [
      "Sudden limping or refusing to put weight on a paw",
      "Continuous licking of one foot",
      "Active bleeding from paw pad or broken nail",
    ],
    immediateSteps: [
      "Rinse the paw with clean bottled water to flush away grit/dirt.",
      "Apply firm, direct pressure with a clean cloth or gauze for 3-5 minutes to stop bleeding.",
      "Wrap loosely with a bandage or clean sock if traveling.",
      "Check for embedded thorns/glass — remove only if loose and surface-level.",
    ],
    whatToAvoid: [
      "Do NOT wrap the bandage too tightly (can cut off blood circulation).",
      "Avoid letting the dog walk on hot asphalt or gravel until inspected by a vet.",
    ],
  },
  {
    id: "bites_stings",
    title: "Bee Stings, Insect Bites & Snake Encounter",
    icon: "🐝",
    urgency: "HIGH",
    badgeColor: "bg-purple-950/60 text-purple-400 border-purple-800/60",
    summary: "Rest stop bushes and grassy areas expose pets to bees, wasps, or snakes.",
    symptoms: [
      "Sudden yelping followed by swelling on muzzle, face, or paws",
      "Hives, intense scratching, or facial puffiness",
      "If snake bite: puncture marks, heavy lethargy, trembling, or drooling",
    ],
    immediateSteps: [
      "If bee sting: Scrape the stinger off with a credit card edge (do not squeeze with tweezers).",
      "Apply an ice pack wrapped in a cloth to reduce local swelling.",
      "If snake bite: Keep the pet extremely calm and still (movement spreads venom). Keep bite area BELOW heart level.",
      "Call the nearest 24/7 trauma vet immediately for antivenom availability.",
    ],
    whatToAvoid: [
      "Do NOT cut or suck venom from a snake bite.",
      "Do NOT apply a tight tourniquet.",
    ],
  },
  {
    id: "toxic_ingestion",
    title: "Toxic Food & Foreign Object Ingestion",
    icon: "🧪",
    urgency: "CRITICAL",
    badgeColor: "bg-red-950/60 text-red-400 border-red-800/60",
    summary: "Ingesting chocolate, chewing gum (xylitol), cooked chicken bones, or roadside garbage.",
    symptoms: [
      "Sudden vomiting, diarrhoea, or abdominal pain",
      "Tremors, seizures, or rapid heartbeat",
      "Choking, gagging, or inability to swallow",
    ],
    immediateSteps: [
      "Take a photo or note the packaging/substance the pet ate.",
      "Estimate the amount ingested and time elapsed.",
      "Call the nearest vet immediately for advice on whether inducing vomiting is safe.",
    ],
    whatToAvoid: [
      "Do NOT induce vomiting without a vet's instruction (sharp bones or chemicals can burn/tear esophagus).",
      "Do NOT give human medicines (Paracetamol/Ibuprofen is fatal to dogs and cats).",
    ],
  },
];

export default function PetTravelPage() {
  const [activeTab, setActiveTab] = useState<"VETS" | "FIRST_AID" | "SUPPLIES" | "LOST_PET">("VETS");
  const [vets, setVets] = useState<VetClinic[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(() =>
    getCachedCoordinates()
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<FirstAidTopic | null>(null);

  // Lost Pet SOS Flyer Form States
  const [petName, setPetName] = useState<string>("");
  const [petBreed, setPetBreed] = useState<string>("");
  const [petCollar, setPetCollar] = useState<string>("");
  const [petLastSeen, setPetLastSeen] = useState<string>("");
  const [ownerPhone, setOwnerPhone] = useState<string>("");
  const [reward, setReward] = useState<string>("Handsome Reward");
  const [lostGenerated, setLostGenerated] = useState<boolean>(false);

  // Fetch verified clinics & auto-detect GPS
  useEffect(() => {
    const local = getStoredVets();
    setVets(local);

    getDeviceGeolocation(false).then((loc) => {
      if (loc && loc.lat !== 0 && loc.lng !== 0) {
        setUserLocation(loc);
        fetchGlobalNearbyVets(loc.lat, loc.lng).then((globalVets) => {
          if (globalVets.length > 0) {
            setVets(getStoredVets());
          }
        });
      }
    });
  }, []);

  const handleRefreshGPS = async () => {
    setIsLocating(true);
    try {
      const loc = await getDeviceGeolocation(true);
      if (loc && loc.lat !== 0 && loc.lng !== 0) {
        setUserLocation(loc);
        const globalVets = await fetchGlobalNearbyVets(loc.lat, loc.lng);
        if (globalVets.length > 0) {
          setVets(getStoredVets());
        }
      }
    } catch (e) {
      console.warn("GPS detection failed", e);
    } finally {
      setIsLocating(false);
    }
  };

  // Filter 24/7 Emergency and sorted by proximity
  const emergencyVets = useMemo(() => {
    return vets
      .map((vet) => {
        let distance: number | null = null;
        if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
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
        // Prioritize 24/7 first, then nearest distance
        if (a.vet.is24x7 && !b.vet.is24x7) return -1;
        if (!a.vet.is24x7 && b.vet.is24x7) return 1;
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return 0;
      });
  }, [vets, userLocation]);

  // Pet Supplies & Medical Pharmacies
  const supplyVets = useMemo(() => {
    return vets.filter(
      (v) =>
        v.type === "CLINIC" ||
        v.type === "HOSPITAL_24X7" ||
        v.facilities.some((f) => f.toLowerCase().includes("pharmacy") || f.toLowerCase().includes("opd") || f.toLowerCase().includes("care"))
    );
  }, [vets]);

  // Format WhatsApp Lost Pet Broadcast
  const handleShareLostPetWhatsApp = () => {
    const text = `🚨 *URGENT: LOST PET ROAD-TRIP SOS* 🚨\n\n` +
      `🐾 *Pet Name:* ${petName}\n` +
      `🐕 *Breed / Type:* ${petBreed}\n` +
      `📿 *Collar / Markings:* ${petCollar}\n` +
      `📍 *Last Seen Location:* ${petLastSeen}\n` +
      `💰 *Reward:* ${reward}\n\n` +
      `📞 *If spotted, please call immediately:* ${ownerPhone}\n\n` +
      `🙏 *Please forward to local animal lovers & community feeders in this area!*`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-darkBg text-neutral-100 flex flex-col font-sans pb-20">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb & GPS detector */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live Map</span>
          </Link>

          <button
            onClick={handleRefreshGPS}
            disabled={isLocating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-darkCard border border-darkBorder text-xs text-neutral-300 hover:border-pawAmber transition-colors"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? "animate-spin text-pawAmber" : ""}`} />
            <span>{isLocating ? "Locating..." : userLocation ? "Live Highway GPS" : "Detect GPS"}</span>
          </button>
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-neutral-900 via-darkCard to-neutral-900 border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-700/60 text-blue-300 text-xs font-bold">
              <Car className="w-3.5 h-3.5" />
              <span>Pet Travel & Road-Trip Companion</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Emergency Assistance for Pet Parents on the Move
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl leading-relaxed">
              Traveling with your dog or cat? Access instant 24/7 highway emergency veterinary clinics, road-trip first-aid guides, pet food stores, and lost pet SOS broadcasts.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-darkBorder/60">
            <div className="p-3 rounded-2xl bg-neutral-950/60 border border-darkBorder text-center">
              <div className="text-base sm:text-lg font-black text-red-400">24/7 Radar</div>
              <div className="text-[11px] text-neutral-400">Emergency Vets</div>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950/60 border border-darkBorder text-center">
              <div className="text-base sm:text-lg font-black text-amber-400">Offline Ready</div>
              <div className="text-[11px] text-neutral-400">Travel First-Aid</div>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950/60 border border-darkBorder text-center">
              <div className="text-base sm:text-lg font-black text-emerald-400">Food & Care</div>
              <div className="text-[11px] text-neutral-400">Supply Locator</div>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950/60 border border-darkBorder text-center">
              <div className="text-base sm:text-lg font-black text-purple-400">1-Tap SOS</div>
              <div className="text-[11px] text-neutral-400">Lost Pet Flyer</div>
            </div>
          </div>
        </div>

        {/* 4 Interactive Navigation Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("VETS")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center space-x-1.5 ${
              activeTab === "VETS"
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                : "bg-darkCard border border-darkBorder text-neutral-300 hover:text-white"
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>🚨 24/7 Vet & Ambulance Radar</span>
          </button>

          <button
            onClick={() => setActiveTab("FIRST_AID")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center space-x-1.5 ${
              activeTab === "FIRST_AID"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "bg-darkCard border border-darkBorder text-neutral-300 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>🩹 Road-Trip First-Aid Guide</span>
          </button>

          <button
            onClick={() => setActiveTab("SUPPLIES")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center space-x-1.5 ${
              activeTab === "SUPPLIES"
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                : "bg-darkCard border border-darkBorder text-neutral-300 hover:text-white"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>🍖 Food & Pet Meds</span>
          </button>

          <button
            onClick={() => setActiveTab("LOST_PET")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center space-x-1.5 ${
              activeTab === "LOST_PET"
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                : "bg-darkCard border border-darkBorder text-neutral-300 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>📢 Lost Pet Road SOS</span>
          </button>
        </div>

        {/* TAB 1: 24/7 EMERGENCY VET & AMBULANCE RADAR */}
        {activeTab === "VETS" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/40 text-xs text-red-300 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                <b>Highway Emergency Mode Active:</b> Showing nearest trauma hospitals and pet ambulances within 30 km. 1-tap dial connects you immediately to emergency doctors.
              </span>
            </div>

            <div className="space-y-3">
              {emergencyVets.map(({ vet, distance }) => {
                const navUrl = getFastestNavigationUrl(
                  vet.latitude,
                  vet.longitude,
                  userLocation?.lat,
                  userLocation?.lng,
                  "driving"
                );
                const tagInfo = VET_FACILITY_LABELS[vet.type] || VET_FACILITY_LABELS.CLINIC;

                return (
                  <div
                    key={vet.id}
                    className="bg-darkCard border border-darkBorder hover:border-red-700/60 rounded-3xl p-5 sm:p-6 space-y-4 transition-all shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${tagInfo.bg}`}>
                            {tagInfo.icon} {tagInfo.label}
                          </span>
                          {vet.is24x7 && (
                            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                              24/7 OPEN
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-white pt-1">{vet.name}</h3>
                        <p className="text-xs text-neutral-400">
                          {vet.address}, <strong>{vet.city}</strong>
                        </p>
                      </div>

                      {distance !== null && (
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-red-400 bg-red-950/40 px-3 py-1 rounded-xl border border-red-800/40">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{formatDistance(distance)}</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <a
                        href={`tel:${vet.emergencyPhone || vet.phone}`}
                        className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-red-600/20"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Emergency Vet ({vet.emergencyPhone || vet.phone})</span>
                      </a>

                      <a
                        href={navUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-darkBorder text-neutral-100 font-bold text-xs sm:text-sm transition-all active:scale-95"
                      >
                        <Navigation className="w-4 h-4 text-pawAmber" />
                        <span>Navigate (Fastest Route)</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ROAD-TRIP MEDICAL FIRST-AID GUIDE */}
        {activeTab === "FIRST_AID" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <b>Offline Emergency Reference:</b> Quick triage steps to stabilize your pet during travel before reaching the nearest veterinary hospital.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {TRAVEL_FIRST_AID_TOPICS.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className="bg-darkCard border border-darkBorder hover:border-amber-500/60 rounded-3xl p-5 space-y-3 cursor-pointer transition-all hover:scale-[1.01] shadow-lg group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{topic.icon}</span>
                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                          {topic.title}
                        </h4>
                        <p className="text-xs text-neutral-400 max-w-lg line-clamp-1">{topic.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${topic.badgeColor}`}>
                        {topic.urgency}
                      </span>
                      <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FOOD & PET SUPPLIES LOCATOR */}
        {activeTab === "SUPPLIES" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-start space-x-2.5">
              <Store className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <b>Pet Food & Emergency Medication Centers:</b> Clinics and stores carrying pet food brands, electrolytes, sterile dressings, and prescription meds.
              </span>
            </div>

            <div className="space-y-3">
              {supplyVets.map((vet) => (
                <div
                  key={vet.id}
                  className="bg-darkCard border border-darkBorder rounded-3xl p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">{vet.name}</h4>
                      <p className="text-xs text-neutral-400">{vet.address}, {vet.city}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-800/40">
                      Food & Meds Available
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    {vet.facilities.map((fac, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-300">
                        ✓ {fac}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center space-x-3">
                    <a
                      href={`tel:${vet.phone}`}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Store ({vet.phone})</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LOST PET ROAD-TRIP SOS */}
        {activeTab === "LOST_PET" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-300 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <b>Lost Pet Highway SOS:</b> Generate a high-contrast missing pet flyer and 1-tap WhatsApp broadcast to alert all local animal lovers, petrol pump attendants, and community feeders in this area!
              </span>
            </div>

            <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <h3 className="text-lg font-black text-white">Generate Emergency Missing Pet Flyer</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Pet's Name *</label>
                  <input
                    type="text"
                    required
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="e.g. Bruno, Max, Coco"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Breed / Type *</label>
                  <input
                    type="text"
                    required
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    placeholder="e.g. Golden Retriever, Indie, Persian Cat"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Collar / Distinguishing Markings *</label>
                  <input
                    type="text"
                    value={petCollar}
                    onChange={(e) => setPetCollar(e.target.value)}
                    placeholder="e.g. Red collar with bell, white patch on chest"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Last Seen Highway Spot / Hotel *</label>
                  <input
                    type="text"
                    value={petLastSeen}
                    onChange={(e) => setPetLastSeen(e.target.value)}
                    placeholder="e.g. HP Petrol Pump near Vapi Toll Plaza"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Owner Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Reward (Optional)</label>
                  <input
                    type="text"
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    placeholder="e.g. ₹5,000 Cash Reward"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {petName && ownerPhone && (
                <div className="pt-4 border-t border-darkBorder/60 space-y-4">
                  <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-800/50 space-y-2 text-center">
                    <span className="text-xs font-black text-purple-300 uppercase tracking-wider">
                      Preview Broadcast Card
                    </span>
                    <h4 className="text-xl font-black text-white">🚨 MISSING PET: {petName.toUpperCase()}</h4>
                    <p className="text-xs text-neutral-300">
                      {petBreed} • Collar: {petCollar || "None"} • Last seen: {petLastSeen || "Near current location"}
                    </p>
                    <p className="text-xs font-bold text-amber-400">💰 {reward}</p>
                    <p className="text-sm font-black text-emerald-400">📞 Call: {ownerPhone}</p>
                  </div>

                  <button
                    onClick={handleShareLostPetWhatsApp}
                    className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-green-600/20 flex items-center justify-center space-x-2 active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Broadcast Flyer to Local WhatsApp Groups & Rescuers</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* First Aid Topic Modal */}
      {selectedTopic && (
        <div
          onClick={() => setSelectedTopic(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150 my-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{selectedTopic.icon}</span>
                <div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${selectedTopic.badgeColor}`}>
                    {selectedTopic.urgency}
                  </span>
                  <h3 className="text-lg font-black text-white pt-1">{selectedTopic.title}</h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedTopic(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{selectedTopic.summary}</p>

            {/* Symptoms */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">⚠️ Key Symptoms:</h4>
              <ul className="text-xs text-neutral-300 space-y-1 pl-4 list-disc">
                {selectedTopic.symptoms.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Immediate Steps */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">✅ Immediate Action Steps:</h4>
              <ul className="text-xs text-neutral-200 space-y-1.5 pl-4 list-decimal font-medium">
                {selectedTopic.immediateSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">{step}</li>
                ))}
              </ul>
            </div>

            {/* What to Avoid */}
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 space-y-1 text-xs text-red-300">
              <h4 className="font-black text-red-400 uppercase tracking-wider text-[11px]">🚫 Critical: What NOT to do:</h4>
              <ul className="space-y-1 pl-4 list-disc">
                {selectedTopic.whatToAvoid.map((avoid, idx) => (
                  <li key={idx}>{avoid}</li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setSelectedTopic(null)}
              className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold"
            >
              Close First-Aid Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
