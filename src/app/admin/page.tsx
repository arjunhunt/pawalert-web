"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  Dog,
  MessageSquare,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { DogReport, ReportComment, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { isAdmin, unlockAdminAsync, lockAdmin } from "@/lib/user";
import { formatTimeAgo } from "@/lib/geo";

export default function AdminPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Data states
  const [reports, setReports] = useState<DogReport[]>([]);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"reports" | "comments">("reports");

  useEffect(() => {
    const adminActive = isAdmin();
    setIsSuperAdmin(adminActive);
    if (adminActive) {
      loadAllAdminData();
    }
  }, []);

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // Fetch all reports
        const { data: repData } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (repData) setReports(repData as DogReport[]);

        // Fetch recent comments
        const { data: comData } = await supabase
          .from("comments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (comData) setComments(comData as ReportComment[]);
      }
    } catch (e) {
      console.error("Admin load error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const success = await unlockAdminAsync(passcode);
    if (success) {
      setIsSuperAdmin(true);
      setSuccessMsg("👑 Founder Super Admin Mode Unlocked!");
      loadAllAdminData();
    } else {
      setErrorMsg("Incorrect founder passcode. Access denied.");
    }
  };

  const handleLock = () => {
    lockAdmin();
    setIsSuperAdmin(false);
    setPasscode("");
    setSuccessMsg("");
  };

  // Master Take-Down of Report
  const handleTakeDownReport = async (reportId: string) => {
    if (!confirm("👑 Are you sure you want to MASTER DELETE this report? It will be removed permanently.")) {
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("reports").delete().eq("id", reportId);
      }
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (e) {
      console.error("Master delete failed", e);
      alert("Failed to delete report.");
    }
  };

  // Master Delete of Comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("comments").delete().eq("id", commentId);
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      console.error("Failed to delete comment", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live Feed</span>
          </Link>

          {isSuperAdmin && (
            <button
              onClick={handleLock}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Admin Mode</span>
            </button>
          )}
        </div>

        {/* Locked State: Login Form */}
        {!isSuperAdmin ? (
          <div className="max-w-md mx-auto my-12 bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 mx-auto shadow-lg shadow-red-950/40">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-white">
                Founder Admin Portal
              </h1>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Enter your master secret passcode to unlock emergency take-down and moderation powers across PawAlert.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-300">
                  Master Founder Passcode
                </label>
                <div className="relative">
                  <input
                    type={showPasscode ? "text" : "password"}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter admin passcode"
                    className="w-full bg-darkBg border border-darkBorder rounded-xl pl-10 pr-10 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-500"
                    required
                  />
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3.5 top-3 text-neutral-500 hover:text-neutral-300"
                  >
                    {showPasscode ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/20 transition-all flex items-center justify-center space-x-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Master Admin Powers</span>
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Admin Control Center */
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-red-950/60 to-amber-950/40 border border-red-800/50 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center space-x-2">
                    <span>👑 Founder Master Admin Control Center</span>
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Master take-down privileges are active. Any post you delete will be instantly wiped from the cloud.
                  </p>
                </div>
              </div>

              <button
                onClick={loadAllAdminData}
                disabled={isLoading}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-darkBg hover:bg-neutral-800 border border-darkBorder text-neutral-300 text-xs font-bold transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-pawAmber" : ""}`} />
                <span>Refresh Data</span>
              </button>
            </div>

            {/* Admin Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-darkCard border border-darkBorder rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-white">{reports.length}</div>
                <div className="text-xs text-neutral-400 font-semibold mt-1">Total Reports</div>
              </div>
              <div className="bg-darkCard border border-darkBorder rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-amber-400">
                  {reports.filter((r) => r.status !== "RESOLVED").length}
                </div>
                <div className="text-xs text-neutral-400 font-semibold mt-1">Active Alerts</div>
              </div>
              <div className="bg-darkCard border border-darkBorder rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-blue-400">{comments.length}</div>
                <div className="text-xs text-neutral-400 font-semibold mt-1">Total Comments</div>
              </div>
            </div>

            {/* Moderation Tabs */}
            <div className="flex items-center space-x-2 border-b border-darkBorder pb-2">
              <button
                onClick={() => setActiveTab("reports")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "reports"
                    ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Dog className="w-4 h-4" />
                <span>Dog Reports ({reports.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("comments")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "comments"
                    ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comments Stream ({comments.length})</span>
              </button>
            </div>

            {/* Tab 1: All Reports Moderation */}
            {activeTab === "reports" && (
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs">
                    No reports in database.
                  </div>
                ) : (
                  reports.map((report) => {
                    const catInfo = PROBLEM_TYPE_LABELS[report.problem_type] || PROBLEM_TYPE_LABELS.OTHER;
                    const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.OPEN;

                    return (
                      <div
                        key={report.id}
                        className="bg-darkCard border border-darkBorder rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-neutral-700 transition-all"
                      >
                        <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                          {/* Thumbnail */}
                          <div className="w-14 h-14 rounded-xl bg-neutral-900 overflow-hidden shrink-0 border border-darkBorder">
                            {report.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={report.photo_url}
                                alt={catInfo.label}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">
                                🐾
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-pawAmber">
                                {catInfo.icon} {catInfo.label}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusInfo.bg}`}>
                                {statusInfo.label}
                              </span>
                              <span className="text-[11px] text-neutral-500">
                                {formatTimeAgo(report.created_at)}
                              </span>
                            </div>

                            <p className="text-xs text-neutral-200 line-clamp-1">
                              {report.description}
                            </p>

                            <div className="text-[11px] text-neutral-400 truncate">
                              📍 {report.landmark || report.address} • By <b className="text-neutral-300">{report.reporter_name}</b>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                          <Link
                            href={`/alert/${report.id}`}
                            className="p-2 rounded-xl bg-darkBg hover:bg-neutral-800 border border-darkBorder text-neutral-300 text-xs font-semibold flex items-center space-x-1"
                            title="View Alert Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleTakeDownReport(report.id)}
                            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-red-950 hover:bg-red-900 border border-red-700/60 text-red-300 text-xs font-bold transition-colors"
                            title="Master Delete Report"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Take Down</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Comments Stream Moderation */}
            {activeTab === "comments" && (
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs">
                    No comments found.
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-darkCard border border-darkBorder rounded-2xl p-4 flex items-start justify-between gap-4 hover:border-neutral-700 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs">
                            {comment.author_name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                            Tag: {comment.comment_type}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>

                        <div className="text-[10px] text-neutral-500">
                          Report ID: <Link href={`/alert/${comment.report_id}`} className="text-pawAmber hover:underline">{comment.report_id.substring(0, 8)}...</Link>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 border border-red-700/60 text-red-300 text-xs font-bold transition-colors shrink-0"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
