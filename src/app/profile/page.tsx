"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  CheckCircle2,
  Dog,
  Lock,
  Sparkles,
  Info,
  X,
  LogOut,
  LogIn,
  Mail,
  User,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [dogsFed, setDogsFed] = useState<number>(0);
  const [rescues, setRescues] = useState<number>(0);
  const [reportsMade, setReportsMade] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showKarmaModal, setShowKarmaModal] = useState<boolean>(false);

  useEffect(() => {
    // Check Supabase Auth
    const client = supabase;
    if (isSupabaseConfigured && client) {
      client.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          setIsAuthenticated(true);
          setEmail(user.email || null);

          // Fetch cloud profile from Supabase
          const { data: profile } = await client
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profile) {
            setName(profile.display_name);
            setDogsFed(profile.dogs_fed);
            setRescues(profile.rescues);
            setReportsMade(profile.reports_made);
            localStorage.setItem("pawalert_user_name", profile.display_name);
            localStorage.setItem("pawalert_dogs_fed", profile.dogs_fed.toString());
            localStorage.setItem("pawalert_rescues", profile.rescues.toString());
            localStorage.setItem("pawalert_reports_made", profile.reports_made.toString());
            return;
          }
        }
      });
    }

    // Load local storage fallback
    const savedName = localStorage.getItem("pawalert_user_name");
    const savedFed = parseInt(localStorage.getItem("pawalert_dogs_fed") || "0", 10);
    const savedRescues = parseInt(localStorage.getItem("pawalert_rescues") || "0", 10);
    const savedReports = parseInt(localStorage.getItem("pawalert_reports_made") || "0", 10);

    if (savedName) {
      setName(savedName);
    } else {
      const defaultHandle = `Feeder #${Math.floor(1000 + Math.random() * 9000)}`;
      setName(defaultHandle);
      localStorage.setItem("pawalert_user_name", defaultHandle);
    }

    setDogsFed(savedFed);
    setRescues(savedRescues);
    setReportsMade(savedReports);
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowKarmaModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const karmaPoints = dogsFed * 30 + rescues * 100 + reportsMade * 50;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem("pawalert_user_name", name.trim());

      // If authenticated, sync name to Supabase profile
      const client = supabase;
      if (isSupabaseConfigured && client && isAuthenticated) {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          await client.from("profiles").upsert({
            id: user.id,
            display_name: name.trim(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  const handleSignOut = async () => {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      await client.auth.signOut();
    }
    localStorage.removeItem("pawalert_auth_user_id");
    setIsAuthenticated(false);
    setEmail(null);
    router.push("/auth");
  };

  const badges = [
    {
      icon: "🌱",
      title: "Community Member",
      desc: "Joined PawAlert to help stray dogs",
      unlocked: true,
    },
    {
      icon: "🍖",
      title: "Pack Feeder",
      desc: "Fed 3+ hungry stray dogs",
      unlocked: dogsFed >= 3,
    },
    {
      icon: "🚑",
      title: "Life Saver",
      desc: "Rescued or treated an injured/sick dog",
      unlocked: rescues >= 1,
    },
    {
      icon: "📢",
      title: "Watchful Guardian",
      desc: "Broadcasted 3+ community alerts",
      unlocked: reportsMade >= 3,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live Feed</span>
          </Link>

          {isAuthenticated ? (
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-darkCard hover:bg-neutral-800 border border-darkBorder text-neutral-400 hover:text-red-400 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              href="/auth"
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-pawAmber/15 hover:bg-pawAmber/25 border border-pawAmber/30 text-pawAmber text-xs font-bold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </Link>
          )}
        </div>

        {/* Sync Status Banner for Guests */}
        {!isAuthenticated && (
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-amber-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Sync Karma Across All Your Devices</span>
              </p>
              <p className="text-neutral-400 text-[11px]">
                Create a free account to keep your rescues, dogs fed, and karma safe on your phone and PC.
              </p>
            </div>
            <Link
              href="/auth"
              className="px-3.5 py-1.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white font-bold whitespace-nowrap shadow-md shadow-pawAmber/10"
            >
              Sign In Now →
            </Link>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Avatar & Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-pawAmber/20 border border-pawAmber/30 flex items-center justify-center text-pawAmber">
                <Dog className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {name || "Community Feeder"}
                </h1>
                <div className="flex items-center space-x-2 mt-0.5">
                  <p className="text-xs text-pawAmber font-semibold flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span>Verified Feeder</span>
                  </p>
                  {email && (
                    <span className="text-neutral-500 text-xs truncate max-w-[150px] sm:max-w-none">
                      • {email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Volunteer Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-darkBg border border-darkBorder rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-pawAmber">{dogsFed}</div>
              <div className="text-[11px] text-neutral-400 font-semibold mt-1">
                Dogs Fed
              </div>
            </div>
            <div className="bg-darkBg border border-darkBorder rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-green-400">{rescues}</div>
              <div className="text-[11px] text-neutral-400 font-semibold mt-1">
                Rescues
              </div>
            </div>

            {/* Clickable Karma Points Card */}
            <button
              type="button"
              onClick={() => setShowKarmaModal(true)}
              className="bg-darkBg hover:bg-amber-950/20 border border-darkBorder hover:border-amber-500/40 rounded-2xl p-4 text-center transition-all group relative cursor-pointer active:scale-95"
              title="Click to learn how Karma Points work"
            >
              <div className="flex items-center justify-center space-x-1">
                <span className="text-2xl font-black text-amber-400 group-hover:scale-105 transition-transform">
                  {karmaPoints}
                </span>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-amber-300 font-bold mt-1 flex items-center justify-center space-x-1">
                <span>Karma Pts</span>
                <Info className="w-3 h-3 text-amber-400/80" />
              </div>
            </button>
          </div>

          {/* Volunteer Badges */}
          <div className="space-y-3 pt-2 border-t border-darkBorder">
            <h3 className="text-xs font-bold text-pawAmber uppercase tracking-wider flex items-center space-x-1.5">
              <Award className="w-4 h-4" />
              <span>Your Community Badges</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {badges.map((badge, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border flex items-center space-x-3 transition-all ${
                    badge.unlocked
                      ? "bg-darkBg border-pawAmber/30 text-white"
                      : "bg-darkBg/40 border-darkBorder/40 text-neutral-500 opacity-60"
                  }`}
                >
                  <div className="text-2xl">{badge.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold flex items-center justify-between">
                      <span>{badge.title}</span>
                      {!badge.unlocked && <Lock className="w-3 h-3 text-neutral-500" />}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {badge.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Profile Form */}
          <form
            onSubmit={handleSave}
            className="space-y-4 pt-2 border-t border-darkBorder"
          >
            <h3 className="text-xs font-bold text-pawAmber uppercase tracking-wider">
              Your Feeder Handle & Settings
            </h3>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Your Public Volunteer Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun (Dog Lover)"
                className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold transition-all flex items-center space-x-2"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved to cloud & device!</span>
                </>
              ) : (
                <span>Save Volunteer Name</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Karma Points Explanation Modal */}
      {showKarmaModal && (
        <div
          onClick={() => setShowKarmaModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150 relative"
          >
            {/* Close Icon Button */}
            <button
              type="button"
              onClick={() => setShowKarmaModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1 pr-8">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-black text-white">
                  What are Karma Points?
                </h3>
              </div>
              <p className="text-xs text-neutral-400">
                Karma Points represent your community kindness score for helping, feeding, and rescuing stray dogs on PawAlert!
              </p>
            </div>

            {/* How to Earn Points Cards */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold text-pawAmber uppercase tracking-wider">
                How to Earn Karma Points
              </h4>

              {/* +100 Rescues */}
              <div className="p-3.5 rounded-2xl bg-darkBg border border-green-800/40 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-green-950/60 flex items-center justify-center text-xl shrink-0">
                  🚑
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      Rescuing Injured / Sick Dogs
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-green-950/60 text-green-400 border border-green-800/50">
                      +100 Pts
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Claim and resolve alerts for injured, sick, or trapped dogs.
                  </p>
                </div>
              </div>

              {/* +50 Reports */}
              <div className="p-3.5 rounded-2xl bg-darkBg border border-blue-800/40 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950/60 flex items-center justify-center text-xl shrink-0">
                  📢
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      Broadcasting Distress Alerts
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-400 border border-blue-800/50">
                      +50 Pts
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Spot a stray dog in need and broadcast a GPS location alert.
                  </p>
                </div>
              </div>

              {/* +30 Feeding */}
              <div className="p-3.5 rounded-2xl bg-darkBg border border-amber-800/40 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950/60 flex items-center justify-center text-xl shrink-0">
                  🍲
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      Feeding Stray Dogs
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-800/50">
                      +30 Pts
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Help hungry community dogs by resolving food alerts.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Formula Breakdown */}
            <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-200 space-y-1">
              <div className="font-bold text-[11px] uppercase tracking-wider text-amber-400">
                Your Current Score Calculation:
              </div>
              <div className="text-xs text-neutral-300 font-mono">
                ({rescues} Rescues × 100) + ({reportsMade} Alerts × 50) + ({dogsFed} Fed × 30) ={" "}
                <b className="text-amber-400">{karmaPoints} Karma Points</b>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setShowKarmaModal(false)}
              className="w-full py-3.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs sm:text-sm font-bold shadow-lg shadow-pawAmber/20 transition-all text-center"
            >
              Got it, keep helping dogs! 🐾
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
