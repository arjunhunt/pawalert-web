"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Crosshair, Loader2, MapPin, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { escapeHtml } from "@/lib/security";
import { getDeviceGeolocation, setManualVerifiedLocation } from "@/lib/geo";

interface MapViewProps {
  reports: DogReport[];
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  onSelectCoordinate?: (lat: number, lng: number) => void;
  onLocationDetected?: (lat: number, lng: number, accuracy?: number) => void;
  interactiveSelect?: boolean;
  defaultMapType?: "satellite" | "street";
}

export default function MapView({
  reports,
  userLocation,
  onSelectCoordinate,
  onLocationDetected,
  interactiveSelect = false,
  defaultMapType = "satellite",
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletModuleRef = useRef<any>(null);
  const tileLayersRef = useRef<any[]>([]);
  const markersLayerRef = useRef<any>(null);
  const userLayerRef = useRef<any>(null);

  const lastCenteredLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasInitiallyCenteredRef = useRef<boolean>(false);

  // Keep latest callbacks in refs
  const interactiveSelectRef = useRef<boolean>(interactiveSelect);
  interactiveSelectRef.current = interactiveSelect;

  const onSelectCoordinateRef = useRef(onSelectCoordinate);
  onSelectCoordinateRef.current = onSelectCoordinate;

  const onLocationDetectedRef = useRef(onLocationDetected);
  onLocationDetectedRef.current = onLocationDetected;

  const [mapType, setMapType] = useState<"satellite" | "street">(defaultMapType);
  const [isLocatingMap, setIsLocatingMap] = useState<boolean>(false);

  // Pinpoint state
  const [isPinpointMode, setIsPinpointMode] = useState<boolean>(false);
  const isPinpointModeRef = useRef<boolean>(false);
  isPinpointModeRef.current = isPinpointMode;

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showCoarseWarning, setShowCoarseWarning] = useState<boolean>(true);

  // Cleanly apply or switch tile layers without rebuilding the map instance
  const applyTileLayer = useCallback((L: any, map: any, type: "satellite" | "street") => {
    tileLayersRef.current.forEach((layer) => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    tileLayersRef.current = [];

    if (type === "satellite") {
      // ESRI High-Resolution World Imagery
      const satLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: '&copy; <a href="https://www.esri.com">Esri</a>, Earthstar Geographics',
          maxNativeZoom: 18,
          maxZoom: 19,
        }
      ).addTo(map);

      // Hybrid Street Names, Roads & Landmark Reference Labels
      const labelsLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxNativeZoom: 18,
          maxZoom: 19,
        }
      ).addTo(map);

      tileLayersRef.current = [satLayer, labelsLayer];
    } else {
      // Standard OpenStreetMap Tile Layer
      const streetLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: ["a", "b", "c"],
          maxZoom: 19,
        }
      ).addTo(map);

      tileLayersRef.current = [streetLayer];
    }
  }, []);

  // 1. Initial Map Creation (Runs ONCE per container lifecycle)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof window === "undefined") return;

    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;
      leafletModuleRef.current = L;

      // Fix default Leaflet icon paths
      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
      } catch (e) {}

      // Initial center coordinates
      let centerLat = 21.7679;
      let centerLng = 78.8718;
      let initialZoom = 5;

      if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
        centerLat = userLocation.lat;
        centerLng = userLocation.lng;
        initialZoom = interactiveSelectRef.current ? 18 : 16;
        hasInitiallyCenteredRef.current = true;
        lastCenteredLocationRef.current = { lat: centerLat, lng: centerLng };
      } else if (reports.length > 0 && reports[0].latitude && reports[0].longitude) {
        const rLat = typeof reports[0].latitude === "number" ? reports[0].latitude : parseFloat(String(reports[0].latitude));
        const rLng = typeof reports[0].longitude === "number" ? reports[0].longitude : parseFloat(String(reports[0].longitude));
        if (!isNaN(rLat) && !isNaN(rLng) && (rLat !== 0 || rLng !== 0)) {
          centerLat = rLat;
          centerLng = rLng;
          initialZoom = interactiveSelectRef.current ? 18 : 14;
          hasInitiallyCenteredRef.current = true;
        }
      }

      // Avoid double initialization
      if (!mapInstanceRef.current && mapContainerRef.current) {
        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null;
        }

        try {
          const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            scrollWheelZoom: !interactiveSelectRef.current,
          }).setView([centerLat, centerLng], initialZoom);

          mapInstanceRef.current = map;

          // Dedicated LayerGroups
          markersLayerRef.current = L.layerGroup().addTo(map);
          userLayerRef.current = L.layerGroup().addTo(map);

          // Apply initial tiles
          applyTileLayer(L, map, defaultMapType);

          // Map Click Handler: Supports both Report Pin placement & "Pinpoint Spot" mode
          map.on("click", (e: any) => {
            if (interactiveSelectRef.current && onSelectCoordinateRef.current) {
              onSelectCoordinateRef.current(e.latlng.lat, e.latlng.lng);
            } else if (isPinpointModeRef.current) {
              // Manually pinpoint current location
              setManualVerifiedLocation(e.latlng.lat, e.latlng.lng);
              if (onLocationDetectedRef.current) {
                onLocationDetectedRef.current(e.latlng.lat, e.latlng.lng, 5);
              }
              setIsPinpointMode(false);
              setSuccessToast("Exact location pinpoint locked!");
              setTimeout(() => setSuccessToast(null), 3000);
            }
          });

          // Invalidate size immediately and on delayed ticks to prevent blank/gray tiles
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 150);

          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 500);

          // Auto-invalidate size when container dimensions change
          if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
            resizeObserver = new ResizeObserver(() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
              }
            });
            resizeObserver.observe(mapContainerRef.current);
          }
        } catch (err) {
          console.warn("Leaflet map initialization notice:", err);
        }
      }
    });

    return () => {
      isMounted = false;
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch (e) {}
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
      markersLayerRef.current = null;
      userLayerRef.current = null;
    };
  }, [applyTileLayer, defaultMapType]);

  // 2. Tile Layer Switcher
  useEffect(() => {
    if (mapInstanceRef.current && leafletModuleRef.current) {
      applyTileLayer(leafletModuleRef.current, mapInstanceRef.current, mapType);
    }
  }, [mapType, applyTileLayer]);

  // 3. Update Report Markers (Without destroying the map)
  useEffect(() => {
    const L = leafletModuleRef.current;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    if (!L || !map || !markersLayer) return;

    markersLayer.clearLayers();

    reports.forEach((report) => {
      if (!report) return;
      const rLat = typeof report.latitude === "number" ? report.latitude : parseFloat(String(report.latitude));
      const rLng = typeof report.longitude === "number" ? report.longitude : parseFloat(String(report.longitude));
      if (isNaN(rLat) || isNaN(rLng) || (rLat === 0 && rLng === 0)) return;

      const catInfo = (report.problem_type && PROBLEM_TYPE_LABELS[report.problem_type])
        ? PROBLEM_TYPE_LABELS[report.problem_type]
        : PROBLEM_TYPE_LABELS.OTHER;
      const statusInfo = (report.status && STATUS_LABELS[report.status])
        ? STATUS_LABELS[report.status]
        : STATUS_LABELS.OPEN;

      const pinColor =
        report.status === "RESOLVED"
          ? "#43A047"
          : report.status === "IN_PROGRESS"
          ? "#FFB300"
          : catInfo.color;

      const customPin = L.divIcon({
        className: "paw-pin",
        html: `
          <div style="
            background-color: ${pinColor};
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            cursor: pointer;
          ">
            <span style="transform: rotate(45deg); font-size: 18px;">${catInfo.icon}</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -34],
      });

      const popupContent = `
        <div style="min-width: 200px; color: #141210; font-family: system-ui, sans-serif;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${statusInfo.color}; margin-bottom: 4px;">
            ${statusInfo.label}
          </div>
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;">
            ${catInfo.icon} ${catInfo.label}
          </div>
          <div style="font-size: 12px; color: #444; margin-bottom: 8px;">
            ${escapeHtml(report.address) || "Location recorded"} ${report.landmark ? `<br><small style="color:#d97706">📍 ${escapeHtml(report.landmark)}</small>` : ""}
          </div>
          ${
            interactiveSelect
              ? `<div style="font-size: 11px; color: #777; font-style: italic;">Tap map or drag pin to adjust exact location</div>`
              : `<a href="/alert/${encodeURIComponent(report.id || "")}" style="
                  display: block;
                  text-align: center;
                  background-color: #EF6C00;
                  color: white;
                  text-decoration: none;
                  padding: 6px 12px;
                  border-radius: 8px;
                  font-size: 12px;
                  font-weight: 700;
                ">
                  View Alert & Help 🐾
                </a>`
          }
        </div>
      `;

      const marker = L.marker([rLat, rLng], {
        icon: customPin,
        draggable: interactiveSelect,
      }).addTo(markersLayer);

      if (interactiveSelect) {
        marker.on("dragend", (e: any) => {
          const pos = e.target.getLatLng();
          if (onSelectCoordinateRef.current) {
            onSelectCoordinateRef.current(pos.lat, pos.lng);
          }
        });
      }

      marker.bindPopup(popupContent);
    });
  }, [reports, interactiveSelect]);

  // 4. Update User Location Marker & Halo (Draggable & click-adjustable)
  useEffect(() => {
    const L = leafletModuleRef.current;
    const map = mapInstanceRef.current;
    const userLayer = userLayerRef.current;

    if (!L || !map || !userLayer) return;

    userLayer.clearLayers();

    if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
      const accuracyMeters = userLocation.accuracy ? Math.round(userLocation.accuracy) : 15;

      // Accuracy Halo Ring
      L.circle([userLocation.lat, userLocation.lng], {
        radius: Math.min(Math.max(accuracyMeters, 5), 100),
        color: accuracyMeters <= 20 ? "#10b981" : "#3b82f6",
        fillColor: accuracyMeters <= 20 ? "#10b981" : "#3b82f6",
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: "4, 4",
      }).addTo(userLayer);

      // High-Precision Core Pin (Draggable so user can move it to their actual house/spot!)
      const userIcon = L.divIcon({
        className: "user-loc-pin",
        html: `<div style="background-color: #2563eb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 14px rgba(37, 99, 235, 0.9); cursor: grab;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        draggable: true, // Allow user to drag their pin if Wi-Fi / IP drifted!
      }).addTo(userLayer);

      userMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 170px; color: #111;">
          <b>📍 Your Location</b><br>
          <small style="color:${accuracyMeters <= 35 ? "#10b981" : "#ef4444"}; font-weight: bold;">
            Accuracy: ±${accuracyMeters}m ${accuracyMeters > 500 ? "(Coarse Laptop/Wi-Fi)" : ""}
          </small>
          <div style="font-size: 11px; color: #555; margin-top: 6px; border-top: 1px solid #eee; pt-1;">
            💡 <b>Tip:</b> Drag this blue pin or tap Pinpoint to adjust your location.
          </div>
        </div>
      `);

      // When user drags their blue pin to their true location
      userMarker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        setManualVerifiedLocation(pos.lat, pos.lng);
        if (onLocationDetectedRef.current) {
          onLocationDetectedRef.current(pos.lat, pos.lng, 5);
        }
        setSuccessToast("Location pinpoint locked to your exact spot!");
        setTimeout(() => setSuccessToast(null), 3000);
      });

      // Initial center or smooth pan if not currently in manual pinpoint select mode
      if (!hasInitiallyCenteredRef.current) {
        const targetZoom = interactiveSelect ? 18 : 16;
        map.setView([userLocation.lat, userLocation.lng], targetZoom);
        hasInitiallyCenteredRef.current = true;
        lastCenteredLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };
      } else if (!interactiveSelect && !isPinpointModeRef.current) {
        const prev = lastCenteredLocationRef.current;
        if (prev) {
          const dLat = Math.abs(prev.lat - userLocation.lat);
          const dLng = Math.abs(prev.lng - userLocation.lng);
          // Only pan if user physically moved > 25 meters
          if (dLat > 0.00025 || dLng > 0.00025) {
            map.panTo([userLocation.lat, userLocation.lng]);
            lastCenteredLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };
          }
        }
      }
    }
  }, [userLocation, interactiveSelect]);

  const handleLocateMe = async () => {
    if (!mapInstanceRef.current) return;
    setIsLocatingMap(true);
    try {
      const res = await getDeviceGeolocation(true);
      if (res && res.lat !== 0 && res.lng !== 0) {
        const zoomLevel = interactiveSelect ? 18 : 17;
        mapInstanceRef.current.flyTo([res.lat, res.lng], zoomLevel, { duration: 1.2 });
        lastCenteredLocationRef.current = { lat: res.lat, lng: res.lng };
        hasInitiallyCenteredRef.current = true;

        if (interactiveSelect && onSelectCoordinateRef.current) {
          onSelectCoordinateRef.current(res.lat, res.lng);
        }
        if (onLocationDetectedRef.current) {
          onLocationDetectedRef.current(res.lat, res.lng, res.accuracy);
        }
      }
    } catch (e) {
      console.warn("Locate me error:", e);
    } finally {
      setIsLocatingMap(false);
    }
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-darkBorder bg-darkCard select-none">
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />

      {/* Floating Controls: Layer Switcher, Pinpoint Me & Locate Me Button */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center space-x-1.5">
        {/* GPS Satellite Accuracy Pill */}
        {userLocation?.accuracy !== undefined && userLocation.accuracy > 0 && (
          <div
            className={`hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border backdrop-blur-md shadow-2xl text-[10px] font-bold ${
              userLocation.accuracy <= 35
                ? "bg-emerald-950/85 border-emerald-700/80 text-emerald-400"
                : userLocation.accuracy <= 100
                ? "bg-amber-950/85 border-amber-700/80 text-amber-300"
                : "bg-red-950/85 border-red-700/80 text-red-300"
            }`}
            title={`GPS Precision: ±${Math.round(userLocation.accuracy)}m ${userLocation.accuracy > 500 ? "(Coarse Laptop/Wi-Fi)" : ""}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                userLocation.accuracy <= 35
                  ? "bg-emerald-400 animate-pulse"
                  : userLocation.accuracy <= 100
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
            />
            <span>
              {userLocation.accuracy > 999
                ? `±${(userLocation.accuracy / 1000).toFixed(1)}km`
                : `±${Math.round(userLocation.accuracy)}m`}
            </span>
          </div>
        )}

        {/* Pinpoint Mode Trigger (Tap to set location on map) */}
        {!interactiveSelect && (
          <button
            type="button"
            onClick={() => setIsPinpointMode((prev) => !prev)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-2xl backdrop-blur-md transition-all ${
              isPinpointMode
                ? "bg-emerald-600 border-emerald-400 text-white animate-pulse"
                : "bg-black/85 hover:bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:text-white"
            }`}
            title="Click to activate tap-to-set location on the map"
          >
            <MapPin className="w-3.5 h-3.5 text-pawAmber" />
            <span className="hidden md:inline">{isPinpointMode ? "Tap Map to Set" : "Pinpoint"}</span>
          </button>
        )}

        {/* Satellite vs Street Toggle */}
        <div className="bg-black/85 backdrop-blur-md border border-neutral-700/80 rounded-xl p-0.5 flex items-center space-x-0.5 shadow-2xl">
          <button
            type="button"
            onClick={() => setMapType("satellite")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center space-x-1 ${
              mapType === "satellite"
                ? "bg-pawAmber text-white shadow-md shadow-pawAmber/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>🛰️</span>
            <span>Satellite</span>
          </button>
          <button
            type="button"
            onClick={() => setMapType("street")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center space-x-1 ${
              mapType === "street"
                ? "bg-pawAmber text-white shadow-md shadow-pawAmber/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>🗺️</span>
            <span>Street</span>
          </button>
        </div>

        {/* Locate Me GPS Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocatingMap}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-black/85 hover:bg-neutral-900 border border-neutral-700/80 text-white text-[11px] font-bold shadow-2xl backdrop-blur-md active:scale-95 transition-all"
          title="Center map on device GPS"
        >
          {isLocatingMap ? (
            <Loader2 className="w-3.5 h-3.5 text-pawAmber animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-pawAmber" />
          )}
          <span className="hidden sm:inline">{isLocatingMap ? "Locating..." : "Locate Me"}</span>
        </button>
      </div>

      {/* Pinpoint Mode Guide Banner */}
      {isPinpointMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-950/95 border-2 border-emerald-500 text-emerald-200 px-4 py-1.5 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md flex items-center space-x-2 animate-bounce">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>Click anywhere on the map to set your exact location</span>
          <button
            type="button"
            onClick={() => setIsPinpointMode(false)}
            className="ml-2 text-white hover:text-emerald-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] bg-black/90 border border-emerald-500/80 text-emerald-300 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl backdrop-blur-md flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Coarse Location Warning & Quick Calibrate Banner (Shown when accuracy > 200m on laptops/PCs) */}
      {userLocation?.accuracy !== undefined && userLocation.accuracy > 200 && showCoarseWarning && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md z-[1000] bg-neutral-900/95 border border-amber-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-white text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-300">
                Laptop Wi-Fi Drift (±{userLocation.accuracy > 999 ? `${(userLocation.accuracy / 1000).toFixed(1)}km` : `${userLocation.accuracy}m`})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCoarseWarning(false)}
              className="text-neutral-400 hover:text-white text-sm font-bold"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Laptops lack satellite GPS hardware; Chrome estimates location via Wi-Fi/ISP. On smartphones, PawAlert locks onto real GNSS satellites with <b>7–8m accuracy</b>.
          </p>
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => {
                setIsPinpointMode(true);
                setShowCoarseWarning(false);
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-[11px] font-bold transition-all flex items-center justify-center space-x-1 shadow-md shadow-pawAmber/20"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tap Map to Place Pin</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
