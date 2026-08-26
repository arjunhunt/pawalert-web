"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Navigation, Clock, User, HeartHandshake, Dog } from "lucide-react";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatDistance, formatTimeAgo } from "@/lib/geo";

interface DogCardProps {
  report: DogReport;
  distanceMeters?: number | null;
}

export default function DogCard({ report, distanceMeters }: DogCardProps) {
  const catInfo = PROBLEM_TYPE_LABELS[report.problem_type] || PROBLEM_TYPE_LABELS.OTHER;
  const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.OPEN;

  const isBase64Image = report.photo_url.startsWith("data:") || report.photo_url.includes("base64,");

  return (
    <Link
      href={`/alert/${report.id}`}
      className="group block bg-darkCard hover:bg-darkCardHover border border-darkBorder hover:border-pawAmber/40 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-pawAmber/5 flex flex-col"
    >
      {/* Photo Container */}
      <div className="relative w-full h-48 sm:h-52 bg-neutral-900 overflow-hidden">
        {report.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.photo_url}
            alt={catInfo.label}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-900">
            <Dog className="w-12 h-12 text-pawAmber/40 mb-2" />
            <span className="text-xs">Photo not available</span>
          </div>
        )}

        {/* Top-Left: Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide border backdrop-blur-md ${statusInfo.bg}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Top-Right: Distance Badge */}
        <div className="absolute top-3 right-3">
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-black/70 backdrop-blur-md border border-white/10">
            <Navigation className="w-3 h-3 text-pawAmber" />
            <span>{formatDistance(distanceMeters)}</span>
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Category & Time */}
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-pawAmber/15 text-pawAmber font-bold border border-pawAmber/20">
              <span>{catInfo.icon}</span>
              <span>{catInfo.label}</span>
            </span>
            <span className="flex items-center space-x-1 text-neutral-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimeAgo(report.created_at)}</span>
            </span>
          </div>

          {/* Description */}
          <p className="text-neutral-200 text-sm font-medium line-clamp-2 leading-relaxed">
            {report.description}
          </p>
        </div>

        {/* Location & Landmark */}
        <div className="pt-2 border-t border-darkBorder space-y-1.5">
          <div className="flex items-center space-x-1.5 text-xs text-neutral-300">
            <MapPin className="w-4 h-4 text-pawAmber shrink-0" />
            <span className="truncate font-semibold">{report.address || "Location captured"}</span>
          </div>

          {report.landmark && (
            <div className="text-[11px] text-pawAmber-light bg-pawAmber/10 px-2 py-1 rounded-md border border-pawAmber/20 truncate">
              📍 Landmark: {report.landmark}
            </div>
          )}

          {/* Rescuer Status */}
          {report.status === "IN_PROGRESS" && report.helper_name && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400 bg-amber-950/30 px-2 py-1 rounded-md border border-amber-800/30">
              <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Being helped by {report.helper_name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
