"use client";

import React, { useRef, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import Image from "next/image";
import { Info, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageCropperModal } from "@/components/common";

interface FormImageUploadProps {
  name: string;
  label: string;
  folder?: string;
  cropWidth?: number;
  cropHeight?: number;
  enableCrop?: boolean;
  className?: string;
  aspectRatioClassName?: string;
  required?: boolean;
  maxSizeMB?: number;
  infoMessage?: string;
}

function FormImageUpload({
  name,
  label,
  folder = "categories",
  cropWidth = 500,
  cropHeight = 500,
  enableCrop = true,
  className,
  aspectRatioClassName = "h-48",
  required,
  maxSizeMB = 5,
  infoMessage,
}: FormImageUploadProps) {
  const { control } = useFormContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showInfo) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInfo]);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const imageUrl = field.value as string;

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setFileError(null);

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error(
          `Image size cannot exceed ${maxSizeMB}MB (Selected: ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB).`
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Image upload failed");
      }

      // Save uploaded image path in the form
      field.onChange(result.data.path);
    } catch (err: any) {
      console.error("Image upload error:", err);
      setFileError(err?.message || "Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFileError(
        `File size exceeds the maximum allowed limit of ${maxSizeMB}MB (Selected: ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)}MB).`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    setFileError(null);

    if (!enableCrop) {
      uploadFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
    setCropSrc(URL.createObjectURL(file));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropConfirm = async (croppedFile: File) => {
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
    }
    setCropSrc(null);
    setSelectedFile(null);
    await uploadFile(croppedFile);
  };

  const handleCropCancel = () => {
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
    }
    setCropSrc(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayError = fileError || error?.message;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-[var(--color-neutral-700)]">
            {label}
            {required && <span className="text-error-600 font-bold ml-1">*</span>}
          </label>
          {infoMessage && (
            <div className="relative inline-flex items-center" ref={infoRef}>
              <button
                type="button"
                onClick={() => setShowInfo((prev) => !prev)}
                className="text-neutral-400 hover:text-[var(--color-secondary-600)] transition-colors focus:outline-none cursor-pointer rounded-full p-0.5"
                title="Click for more information"
                aria-label="Information"
              >
                <Info className="h-3.5 w-3.5" />
              </button>

              {showInfo && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 rounded-xl bg-white border border-neutral-200/90 p-3 text-xs text-neutral-700 shadow-xl shadow-neutral-900/10 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-[var(--color-secondary-600)] shrink-0 mt-0.5" />
                      <p className="leading-relaxed text-[var(--color-neutral-800)]">{infoMessage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInfo(false)}
                      className="text-neutral-400 hover:text-neutral-700 font-bold text-sm leading-none ml-1 p-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-neutral-400">
          Max size: {maxSizeMB} MB
        </span>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] transition-all hover:border-[var(--color-primary-500)] hover:bg-white overflow-hidden",
          aspectRatioClassName,
          displayError && "border-[var(--color-error-500)]",
          className
        )}
      >
        {imageUrl ? (
          <>
            <div className="relative h-full w-full flex items-center justify-center bg-neutral-100">
              <Image
                src={imageUrl}
                alt="Preview"
                fill
                sizes="(max-width: 640px) 100vw, 300px"
                className="rounded-xl object-contain p-2"
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                field.onChange("");
                setFileError(null);
              }}
              className="absolute right-3 top-3 rounded-full bg-white p-2 shadow-md hover:bg-neutral-100 transition-colors z-10"
              title="Remove image"
            >
              <X className="h-4 w-4 text-[var(--color-neutral-700)]" />
            </button>
          </>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
            <p className="text-sm text-[var(--color-neutral-500)]">
              Uploading image...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 text-center px-4">
            <div className="rounded-full bg-white p-3 shadow-sm">
              <Upload className="h-6 w-6 text-[var(--color-neutral-500)]" />
            </div>

            <div>
              <p className="font-medium text-[var(--color-neutral-700)] text-sm">
                Upload Image
              </p>
              <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">
                JPG, JPEG, PNG, WebP • Max {maxSizeMB}MB • {cropWidth} × {cropHeight} px
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {displayError && (
        <p className="mt-1 text-xs text-red-500 font-medium">
          {displayError}
        </p>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        open={Boolean(cropSrc)}
        imageSrc={cropSrc}
        originalFileName={selectedFile?.name}
        mimeType={selectedFile?.type || "image/jpeg"}
        title={`Crop ${label || "Image"}`}
        description={`Reposition and zoom to fit the ${cropWidth} × ${cropHeight} px area (Max ${maxSizeMB}MB).`}
        cropWidth={cropWidth}
        cropHeight={cropHeight}
        onCropConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  );
}

export { FormImageUpload };