"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, BellOff, X, Navigation, Sparkles, AlertTriangle } from "lucide-react";
import { DogReport, PROBLEM_TYPE_LABELS } from "@/lib/types";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from "@/lib/notifications";
import { formatDistance } from "@/lib/geo";

interface NotificationBannerProps {
  incomingAlert: { report: DogReport; distanceMeters: number | null } | null;
  onDismissAlert: () => void;
}

export default function NotificationBanner({
  incomingAlert,
  onDismissAlert,
}: NotificationBannerProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
    }
  }, []);

  const handleEnable = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
  };

  return (
    <>
      {/* 1. Floating In-App Live Distress Toast Banner */}
      {incomingAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-950/95 border-2 border-red-500 rounded-3xl p-4 shadow-2xl backdrop-blur-md text-white flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-xl shrink-0 animate-bounce">
                🚨
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-red-300 uppercase tracking-wider">
                    New Distress Alert!
                  </span>
                  {incomingAlert.distanceMeters !== null && (
                    <span className="px-2 py-0.5 rounded-full bg-red-900/60 text-red-200 text-[10px] font-bold">
                      {formatDistance(incomingAlert.distanceMeters)} away
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-200 truncate font-semibold">
                  {incomingAlert.report.description}
                </p>
                <div className="text-[11px] text-neutral-400 truncate">
                  📍 {incomingAlert.report.landmark || incomingAlert.report.address}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <Link
                href={`/alert/${incomingAlert.report.id}`}
                onClick={onDismissAlert}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all whitespace-nowrap"
              >
                View & Help →
              </Link>
              <button
                type="button"
                onClick={onDismissAlert}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Permission Prompt Banner at Top of Feed */}
      {isNotificationSupported() && permission === "default" && !isDismissed && (
        <div className="bg-gradient-to-r from-amber-950/30 via-neutral-900 to-amber-950/20 border border-amber-800/40 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-pawAmber/20 border border-pawAmber/30 flex items-center justify-center text-pawAmber shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>Enable Nearby Dog Distress Alerts</span>
                <Sparkles className="w-3.5 h-3.5 text-pawAmber" />
              </p>
              <p className="text-[11px] text-neutral-400">
                Get notified immediately when a stray dog needs food or medical rescue near you.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleEnable}
              className="px-4 py-2 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold transition-all shadow-md shadow-pawAmber/20 whitespace-nowrap"
            >
              Enable Notifications 🔔
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
