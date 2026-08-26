"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  CheckCircle2,
  Dog,
  Lock,
} from "lucide-react";
import Navbar from "@/components/Navbar";

export default function ProfilePage() {
  const [name, setName] = useState<string>("");
  const [dogsFed, setDogsFed] = useState<number>(0);
  const [rescues, setRescues] = useState<number>(0);
  const [reportsMade, setReportsMade] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    // Load individual user profile from browser storage
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

  const karmaPoints = dogsFed * 30 + rescues * 100 + reportsMade * 50;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem("pawalert_user_name", name.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
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
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Feed</span>
        </Link>

        {/* Profile Card */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Avatar & Header */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-pawAmber/20 border border-pawAmber/30 flex items-center justify-center text-pawAmber">
              <Dog className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {name || "Community Feeder"}
              </h1>
              <p className="text-xs text-pawAmber font-semibold flex items-center space-x-1 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span>Verified Community Feeder</span>
              </p>
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
            <div className="bg-darkBg border border-darkBorder rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-amber-400">
                {karmaPoints}
              </div>
              <div className="text-[11px] text-neutral-400 font-semibold mt-1">
                Karma Pts
              </div>
            </div>
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
                  <span>Saved to device!</span>
                </>
              ) : (
                <span>Save Volunteer Name</span>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
