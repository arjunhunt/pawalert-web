"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dog,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getUserName } from "@/lib/user";

export default function AuthPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<"quick" | "email">("email");
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form states
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    // Check if already signed in
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          router.push("/profile");
        }
      });
    }
    setDisplayName(getUserName());
  }, [router]);

  // Handle Quick Guest Feeder Sign In
  const handleQuickSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage("Please enter a feeder nickname or your name.");
      return;
    }

    localStorage.setItem("pawalert_user_name", displayName.trim());
    setSuccessMessage("Signed in as " + displayName.trim() + "!");
    setTimeout(() => router.push("/profile"), 600);
  };

  // Handle Email / Password Sign In & Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please fill in both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        // Fallback local simulation if Supabase is offline
        localStorage.setItem("pawalert_user_name", displayName.trim() || email.split("@")[0]);
        localStorage.setItem("pawalert_auth_user_id", `user_email_${Date.now()}`);
        setSuccessMessage("Account active!");
        setTimeout(() => router.push("/profile"), 800);
        return;
      }

      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              display_name: displayName.trim() || email.split("@")[0],
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          localStorage.setItem("pawalert_auth_user_id", data.user.id);
          localStorage.setItem(
            "pawalert_user_name",
            displayName.trim() || email.split("@")[0]
          );

          // Save profile to Supabase profiles table
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: displayName.trim() || email.split("@")[0],
            dogs_fed: parseInt(localStorage.getItem("pawalert_dogs_fed") || "0", 10),
            rescues: parseInt(localStorage.getItem("pawalert_rescues") || "0", 10),
            reports_made: parseInt(localStorage.getItem("pawalert_reports_made") || "0", 10),
          });

          setSuccessMessage("Account created successfully! Redirecting...");
          setTimeout(() => router.push("/profile"), 1000);
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        if (data.user) {
          localStorage.setItem("pawalert_auth_user_id", data.user.id);

          // Fetch user profile from Supabase and sync local stats
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (profile) {
            localStorage.setItem("pawalert_user_name", profile.display_name);
            localStorage.setItem("pawalert_dogs_fed", profile.dogs_fed.toString());
            localStorage.setItem("pawalert_rescues", profile.rescues.toString());
            localStorage.setItem("pawalert_reports_made", profile.reports_made.toString());
          }

          setSuccessMessage("Welcome back, " + (profile?.display_name || "Feeder") + "!");
          setTimeout(() => router.push("/profile"), 800);
        }
      }
    } catch (e: any) {
      console.error("Auth error", e);
      setErrorMessage(e.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      <Navbar />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 space-y-6 flex flex-col justify-center">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Feed</span>
        </Link>

        {/* Main Auth Container */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-pawAmber/20 border border-pawAmber/30 flex items-center justify-center text-pawAmber mx-auto shadow-lg shadow-pawAmber/10">
              <Dog className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-white">PawAlert Account</h1>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
              Sign in to sync your Karma points, dog rescues, and reports across all your devices!
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-darkBg p-1 rounded-2xl border border-darkBorder text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode("email");
                setErrorMessage("");
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                authMode === "email"
                  ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email & Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("quick");
                setErrorMessage("");
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                authMode === "quick"
                  ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quick Guest</span>
            </button>
          </div>

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-green-950/40 border border-green-800/60 text-green-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form 1: Email & Password Form */}
          {authMode === "email" ? (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-darkBorder">
                <span className="text-xs font-bold text-pawAmber uppercase tracking-wider">
                  {isSignUp ? "Create Feeder Account" : "Feeder Sign-In"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorMessage("");
                  }}
                  className="text-xs text-neutral-400 hover:text-pawAmber transition-colors underline"
                >
                  {isSignUp ? "Already have account? Sign In" : "New volunteer? Sign Up"}
                </button>
              </div>

              {/* Full Name (Sign Up only) */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Your Full Name / Feeder Nickname
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Arjun Patel"
                      className="w-full bg-darkBg border border-darkBorder rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                      required={isSignUp}
                    />
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-300">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="volunteer@example.com"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                    required
                  />
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                    required
                  />
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-neutral-500 hover:text-neutral-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs sm:text-sm font-bold shadow-lg shadow-pawAmber/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Please wait...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isSignUp ? "Create My Account & Sync" : "Sign In to Account"}</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Form 2: Quick Guest Feeder Form */
            <form onSubmit={handleQuickSignIn} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-300">
                  Your Volunteer Nickname
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Feeder #4821 or Brownie's Friend"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
                    required
                  />
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                </div>
                <p className="text-[11px] text-neutral-500 pt-1">
                  Allows you to report and claim dogs instantly without creating a password.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs sm:text-sm font-bold shadow-lg shadow-pawAmber/20 transition-all flex items-center justify-center space-x-2"
              >
                <Dog className="w-4 h-4" />
                <span>Enter as Community Feeder</span>
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
