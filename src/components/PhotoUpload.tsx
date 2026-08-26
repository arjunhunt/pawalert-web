"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Check, Image as ImageIcon } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface PhotoUploadProps {
  onPhotoReady: (photoUrl: string) => void;
  currentPhotoUrl?: string;
}

export default function PhotoUpload({
  onPhotoReady,
  currentPhotoUrl,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string>(currentPhotoUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress and process photo locally before upload
  const processImageFile = async (file: File) => {
    setIsUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const maxDim = 800;
      let { width, height } = bitmap;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(bitmap, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      setPreview(dataUrl);

      // If Supabase is configured with Storage, upload to bucket
      if (isSupabaseConfigured && supabase) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          const { data, error } = await supabase.storage
            .from("dog-photos")
            .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

          if (!error && data) {
            const { data: publicData } = supabase.storage
              .from("dog-photos")
              .getPublicUrl(fileName);

            if (publicData?.publicUrl) {
              onPhotoReady(publicData.publicUrl);
              setIsUploading(false);
              return;
            }
          }
        } catch (storageError) {
          console.warn("Storage upload failed, falling back to data URI", storageError);
        }
      }

      // Default / fallback: use optimized Base64 data URL directly
      onPhotoReady(dataUrl);
    } catch (e) {
      console.error("Error processing photo", e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const clearPhoto = () => {
    setPreview("");
    onPhotoReady("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-darkBorder bg-neutral-900 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Report Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-600 text-white p-2 rounded-xl backdrop-blur-md shadow-lg transition-transform active:scale-95"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-lg flex items-center space-x-1">
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span>Photo captured</span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-52 border-2 border-dashed border-darkBorder hover:border-pawAmber/60 bg-darkCard/50 hover:bg-darkCard rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-6 text-center group"
        >
          <div className="w-14 h-14 rounded-2xl bg-pawAmber/10 flex items-center justify-center text-pawAmber group-hover:scale-110 transition-transform mb-3 border border-pawAmber/20">
            <Camera className="w-7 h-7" />
          </div>
          <p className="text-neutral-200 text-sm font-bold">
            Take a Dog Photo or Upload
          </p>
          <p className="text-neutral-400 text-xs mt-1">
            Supports camera capture on phone and gallery images (JPEG, PNG)
          </p>

          {isUploading && (
            <p className="text-xs text-pawAmber font-semibold mt-3 animate-pulse">
              Optimizing photo...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
