"use client";

import Link from "next/link";
import { Navigation, Clock, User, Dog } from "lucide-react";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatDistance, formatTimeAgo } from "@/lib/geo";

interface DogCardProps {
  report: DogReport;
  distanceMeters?: number | null;
}

export default function DogCard({ report, distanceMeters }: DogCardProps) {
  const catInfo = PROBLEM_TYPE_LABELS[report.problem_type] || PROBLEM_TYPE_LABELS.OTHER;
  const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.OPEN;

  return (
    <Link
      href={`/alert/${report.id}`}
      className="group block bg-darkCard hover:bg-darkCardHover border border-darkBorder hover:border-pawAmber/40 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-pawAmber/5 flex flex-col"
    >
      {/* Photo Container with Lazy Loading & Skeleton */}
      <div className="relative w-full h-48 sm:h-52 bg-neutral-900 overflow-hidden">
        {report.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.photo_url}
            alt={catInfo.label}
            loading="lazy"
            decoding="async"
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
        <div className="space-y-2">
          {/* Problem Type & Time */}
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-pawAmber/10 text-pawAmber font-bold text-xs border border-pawAmber/20">
              <span>{catInfo.icon}</span>
              <span>{catInfo.label}</span>
            </span>
            <span className="flex items-center space-x-1 text-[11px] text-neutral-400">
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(report.created_at)}</span>
            </span>
          </div>

          {/* Description */}
          <p className="text-neutral-200 text-xs sm:text-sm line-clamp-2 leading-relaxed">
            {report.description}
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-darkBorder/60">
          {/* Landmark or Address */}
          <div className="text-[11px] text-neutral-400 truncate">
            📍 <b className="text-neutral-300">Location:</b> {report.landmark || report.address}
          </div>

          {/* Feeder / Reporter Name */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
            <div className="flex items-center space-x-1 truncate max-w-[150px]">
              <User className="w-3 h-3 text-neutral-500" />
              <span className="truncate">{report.reporter_name}</span>
            </div>

            {report.status === "IN_PROGRESS" && (
              <span className="text-amber-400 font-semibold text-[10px]">
                🐾 Being helped
              </span>
            )}
            {report.status === "RESOLVED" && (
              <span className="text-green-400 font-semibold text-[10px]">
                ✓ Safe & Fed
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
