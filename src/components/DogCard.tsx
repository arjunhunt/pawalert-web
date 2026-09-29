"use client";

import Link from "next/link";
import { Navigation, Clock, User, Dog, MapPin, ChevronRight } from "lucide-react";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatDistance, formatTimeAgo } from "@/lib/geo";

interface DogCardProps {
  report: DogReport;
  distanceMeters?: number | null;
}

export default function DogCard({ report, distanceMeters }: DogCardProps) {
  const catInfo = PROBLEM_TYPE_LABELS[report.problem_type] || PROBLEM_TYPE_LABELS.OTHER;
  const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.OPEN;

  const isResolved = report.status === "RESOLVED";
  const isInProgress = report.status === "IN_PROGRESS";

  return (
    <Link
      href={`/alert/${report.id}`}
      className="group block bg-white hover:bg-neutral-50/80 border border-brandBorder rounded-2xl overflow-hidden transition-all duration-200 shadow-card hover:shadow-cardHover hover:-translate-y-0.5 flex flex-col"
    >
      {/* Photo Container */}
      <div className="relative w-full h-48 sm:h-52 bg-neutral-100 overflow-hidden">
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
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 bg-neutral-100">
            <Dog className="w-12 h-12 text-neutral-300 mb-1" />
            <span className="text-xs font-semibold">Photo not available</span>
          </div>
        )}

        {/* Top-Left: Problem & Status Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white bg-black/75 backdrop-blur-md shadow-sm">
            <span>{catInfo.icon}</span>
            <span>{catInfo.label}</span>
          </span>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border ${
              isResolved
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : isInProgress
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-red-100 text-red-800 border-red-300"
            }`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Top-Right: Distance Badge */}
        {distanceMeters !== undefined && distanceMeters !== null && (
          <div className="absolute top-2.5 right-2.5">
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black text-white bg-black/75 backdrop-blur-md shadow-sm">
              <Navigation className="w-3 h-3 text-brandOrange fill-brandOrange" />
              <span>{formatDistance(distanceMeters)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Title / Description */}
          <h3 className="text-sm sm:text-base font-extrabold text-brandText line-clamp-1 group-hover:text-brandOrange transition-colors">
            {report.landmark || `${catInfo.label} Dog in need`}
          </h3>

          <p className="text-xs text-brandTextMuted line-clamp-2 leading-relaxed">
            {report.description}
          </p>
        </div>

        <div className="space-y-2 pt-2.5 border-t border-brandBorder">
          {/* Landmark or Address Tag */}
          <div className="flex items-center space-x-1 text-xs text-brandText font-semibold truncate">
            <MapPin className="w-3.5 h-3.5 text-brandOrange shrink-0" />
            <span className="truncate">{report.landmark || report.address || "Street location recorded"}</span>
          </div>

          {/* Footer: Feeder Name, Time Ago & View CTA */}
          <div className="flex items-center justify-between text-xs text-brandTextMuted pt-0.5">
            <div className="flex items-center space-x-1 truncate max-w-[160px]">
              <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
              <span>{formatTimeAgo(report.created_at)}</span>
              <span>•</span>
              <span className="truncate">{report.reporter_name}</span>
            </div>

            <div className="flex items-center space-x-0.5 text-xs font-black text-brandOrange group-hover:translate-x-0.5 transition-transform">
              <span>Help Dog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
