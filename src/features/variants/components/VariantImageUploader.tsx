"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Upload,
  X,
  Star,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/Toast";
import { ImageCropperModal } from "@/components/common";
import {
  useVariantImages,
  useCreateVariantImages,
  useSetPrimaryVariantImage,
  useDeleteVariantImage,
} from "../hooks";
import {
  uploadVariantImageFiles,
  uploadVariantImageFile,
} from "../api/get-variants";

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface VariantImageUploaderProps {
  productUuid: string;
  variantUuid: string;
  variantName?: string;
  isStepperMode?: boolean;
  onBack?: () => void;
  onFinish?: () => void;
  onSkip?: () => void;
}

export function VariantImageUploader({
  productUuid,
  variantUuid,
  variantName,
  isStepperMode = false,
  onBack,
  onFinish,
  onSkip,
}: VariantImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-image cropping queue state
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [currentCropIndex, setCurrentCropIndex] = useState<number>(0);
  const [currentCropSrc, setCurrentCropSrc] = useState<string | null>(null);

  const { data: existingImages = [] } =
    useVariantImages(productUuid, variantUuid);

  const createImagesMutation = useCreateVariantImages();
  const setPrimaryImageMutation = useSetPrimaryVariantImage();
  const deleteImageMutation = useDeleteVariantImage();

  const totalImageCount = existingImages.length + pendingImages.length;
  const maxAllowedImages = 4;
  const canAddMore = totalImageCount < maxAllowedImages;

  // Process incoming files through validation and queue for cropping
  const processFilesForCrop = (rawFiles: File[]) => {
    setErrorMessage(null);
    if (rawFiles.length === 0) return;

    const remainingSlots = maxAllowedImages - totalImageCount;
    if (remainingSlots <= 0) {
      setErrorMessage(`Maximum of ${maxAllowedImages} images allowed per variant.`);
      return;
    }

    const filesToProcess = rawFiles.slice(0, remainingSlots);
    const validFiles: File[] = [];

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    for (const file of filesToProcess) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isValidExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "");
      const isAllowedType = allowedTypes.includes(file.type.toLowerCase()) || isValidExt;

      if (!isAllowedType) {
        setErrorMessage("Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed.");
        return;
      }
      if (file.size > maxSizeBytes) {
        setErrorMessage(`File "${file.name}" exceeds the 5MB size limit.`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setCropQueue(validFiles);
      setCurrentCropIndex(0);
      setCurrentCropSrc(URL.createObjectURL(validFiles[0]));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFilesForCrop(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Called when a crop is confirmed for the current file in queue
  const handleCropConfirm = (croppedFile: File, previewUrl: string) => {
    if (currentCropSrc) {
      URL.revokeObjectURL(currentCropSrc);
    }

    const hasAnyPrimary =
      existingImages.some((img) => img.isPrimary) ||
      pendingImages.some((img) => img.isPrimary);

    setPendingImages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        file: croppedFile,
        previewUrl,
        isPrimary: !hasAnyPrimary && prev.length === 0 && existingImages.length === 0,
        sortOrder: existingImages.length + prev.length + 1,
      },
    ]);

    // Advance to next image in queue or finish
    const nextIndex = currentCropIndex + 1;
    if (nextIndex < cropQueue.length) {
      setCurrentCropIndex(nextIndex);
      setCurrentCropSrc(URL.createObjectURL(cropQueue[nextIndex]));
    } else {
      setCropQueue([]);
      setCurrentCropIndex(0);
      setCurrentCropSrc(null);
    }
  };

  // Called when the user cancels cropping
  const handleCropCancel = () => {
    if (currentCropSrc) {
      URL.revokeObjectURL(currentCropSrc);
    }
    setCropQueue([]);
    setCurrentCropIndex(0);
    setCurrentCropSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      // If we removed the primary image, make the first one primary if available
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary) && existingImages.length === 0) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const setPrimaryPendingImage = (id: string) => {
    setPendingImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    );
  };

  const handleUploadAndSave = async () => {
    if (pendingImages.length === 0) {
      if (onFinish) onFinish();
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);

      // 1. Upload files to multipart upload endpoint
      let uploadedPaths: string[] = [];

      if (pendingImages.length === 1) {
        const res = await uploadVariantImageFile(pendingImages[0].file, "variants");
        uploadedPaths = [res.path];
      } else {
        const res = await uploadVariantImageFiles(
          pendingImages.map((p) => p.file),
          "variants"
        );
        uploadedPaths = res.paths;
      }

      // 2. Associate image metadata with the variant
      const imagePayload = pendingImages.map((p, idx) => ({
        imageUrl: uploadedPaths[idx],
        sortOrder: p.sortOrder,
        isPrimary: p.isPrimary,
      }));

      const totalAfterUpload = existingImages.length + pendingImages.length;

      await createImagesMutation.mutateAsync({
        productUuid,
        variantUuid,
        images: imagePayload,
      });

      toast.success(
        totalAfterUpload >= maxAllowedImages
          ? `All ${maxAllowedImages} images added successfully!`
          : "Images uploaded and saved successfully!"
      );
      setPendingImages([]);

      // Auto-close modal after successful upload
      if (onFinish) {
        setTimeout(() => {
          onFinish();
        }, totalAfterUpload >= maxAllowedImages ? 450 : 600);
      }
    } catch (err: unknown) {
      console.error("Failed to upload variant images:", err);
      const msg = err instanceof Error ? err.message : "Failed to upload images. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetPrimaryExistingImage = async (imageUuid: string) => {
    try {
      setErrorMessage(null);
      await setPrimaryImageMutation.mutateAsync({
        productUuid,
        variantUuid,
        imageUuid,
      });
      toast.success("Primary image updated successfully.");
    } catch (err: unknown) {
      console.error("Failed to set primary image:", err);
      const msg = err instanceof Error ? err.message : "Failed to update primary image.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleDeleteExistingImage = async (imageUuid: string) => {
    try {
      setErrorMessage(null);
      await deleteImageMutation.mutateAsync({
        productUuid,
        variantUuid,
        imageUuid,
      });
      toast.success("Image deleted successfully.");
    } catch (err: unknown) {
      console.error("Failed to delete image:", err);
      const msg = err instanceof Error ? err.message : "Failed to delete image.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {variantName && (
        <div className="rounded-xl bg-[var(--color-primary-50)] p-4 border border-[var(--color-primary-100)]">
          <p className="text-sm font-medium text-[var(--color-primary-900)]">
            Managing images for: <span className="font-semibold">{variantName}</span>
          </p>
          <p className="text-xs text-[var(--color-neutral-600)] mt-1">
            Upload up to {maxAllowedImages} product images (JPG, PNG, WebP, GIF, max 5MB each). Mark one as primary.
          </p>
        </div>
      )}

      {/* Messages */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-error-50)] p-3 text-sm text-[var(--color-error-700)] border border-[var(--color-error-200)]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Existing Uploaded Images */}
      {existingImages.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-600)] mb-3">
            Current Images ({existingImages.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {existingImages.map((img) => (
              <div
                key={img.id}
                className={`group relative aspect-square rounded-xl overflow-hidden border ${
                  img.isPrimary
                    ? "border-secondary-600 ring-2 ring-secondary-600/20"
                    : "border-[var(--color-neutral-200)]"
                } bg-[var(--color-neutral-100)]`}
              >
                <Image
                  src={img.imageUrl}
                  alt="Variant Image"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                  className="object-cover"
                />
                {img.isPrimary ? (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-secondary-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    <Star className="h-3 w-3 fill-current" /> Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimaryExistingImage(img.id)}
                    disabled={
                      setPrimaryImageMutation.isPending ||
                      deleteImageMutation.isPending
                    }
                    className={`absolute top-2 left-2 rounded-lg bg-black/70 hover:bg-secondary-600 px-2 py-1 text-[10px] font-medium text-white transition-all flex items-center gap-1 cursor-pointer shadow-sm disabled:cursor-not-allowed ${
                      setPrimaryImageMutation.isPending &&
                      setPrimaryImageMutation.variables?.imageUuid === img.id
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                    title="Set as primary image"
                  >
                    {setPrimaryImageMutation.isPending &&
                    setPrimaryImageMutation.variables?.imageUuid === img.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Setting...</span>
                      </>
                    ) : (
                      <>
                        <Star className="h-3 w-3" />
                        <span>Set Primary</span>
                      </>
                    )}
                  </button>
                )}
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingImage(img.id)}
                    disabled={
                      deleteImageMutation.isPending ||
                      setPrimaryImageMutation.isPending
                    }
                    aria-label="Delete Image"
                    className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending / Selected Images for Upload */}
      {pendingImages.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-600)] mb-3">
            New Images To Upload ({pendingImages.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {pendingImages.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-[var(--color-primary-400)] bg-white p-1"
              >
                <div className="relative h-full w-full rounded-lg overflow-hidden">
                  <Image
                    src={img.previewUrl}
                    alt="Pending Image"
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePendingImage(img.id)}
                    aria-label="Remove Image"
                    className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-[var(--color-error-600)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrimaryPendingImage(img.id)}
                    className={`absolute bottom-1.5 left-1.5 right-1.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${
                      img.isPrimary
                        ? "bg-[var(--color-secondary-600)] text-white shadow"
                        : "bg-black/60 text-white hover:bg-black/80"
                    }`}
                  >
                    <Star className={`h-3 w-3 ${img.isPrimary ? "fill-current" : ""}`} />
                    {img.isPrimary ? "Primary" : "Set Primary"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      {canAddMore ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files) {
              processFilesForCrop(Array.from(e.dataTransfer.files));
            }
          }}
          className="relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] hover:bg-white hover:border-[var(--color-primary-500)] cursor-pointer transition-all text-center"
        >
          <div className="rounded-full bg-white p-3 shadow-sm mb-3">
            <Upload className="h-6 w-6 text-[var(--color-neutral-600)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-neutral-800)]">
            Click or drag & drop to upload images
          </p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-1">
            PNG, JPG, WebP, GIF up to 5MB (Remaining slots: {maxAllowedImages - totalImageCount})
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <p className="text-xs text-center text-[var(--color-neutral-500)] italic">
          Maximum limit of {maxAllowedImages} images reached for this variant.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-neutral-200)]">
        {isStepperMode ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onBack || onSkip}
              className="rounded-xl border-[var(--color-neutral-300)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] cursor-pointer"
            >
              Back
            </Button>

            <Button
              type="button"
              onClick={handleUploadAndSave}
              isLoading={isUploading}
              className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer"
            >
              {pendingImages.length > 0 ? "Upload & Finish" : "Finish"}
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onFinish) onFinish();
                else if (onSkip) onSkip();
              }}
              className="h-11 rounded-xl border-[var(--color-neutral-300)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] px-6 text-sm font-semibold cursor-pointer"
            >
              {pendingImages.length > 0 ? "Cancel" : "Done"}
            </Button>

            {pendingImages.length > 0 && (
              <Button
                type="button"
                onClick={handleUploadAndSave}
                isLoading={isUploading}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer"
              >
                Upload &amp; Save
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Image Cropper Modal (Configured to 500x500 for Product Variants) */}
      <ImageCropperModal
        open={Boolean(currentCropSrc)}
        imageSrc={currentCropSrc}
        originalFileName={cropQueue[currentCropIndex]?.name}
        mimeType={cropQueue[currentCropIndex]?.type || "image/jpeg"}
        title="Crop Product Variant Image"
        description="Reposition and zoom the image to fit the 500 × 500 px square area."
        cropWidth={500}
        cropHeight={500}
        queueIndex={currentCropIndex + 1}
        queueTotal={cropQueue.length}
        onCropConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  );
}
