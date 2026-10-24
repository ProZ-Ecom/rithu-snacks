"use client";

import * as React from "react";
import Image from "next/image";
import { IndianRupee, AlertCircle, Search, Package, Star } from "lucide-react";
import { FormModal } from "@/components/common/FormModal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { variantKeys, productKeys } from "@/lib/api/query-keys";
import { useUpdateVariantUnitPrice } from "@/features/variants/hooks";
import type { AdminVariantResponse } from "@/features/variants/types";

interface ProductPriceEditModalProps {
  open: boolean;
  onClose: () => void;
  productUuid: string;
  productName: string;
  variants: AdminVariantResponse[];
  onSuccess?: () => void;
}

interface PriceRow {
  variantId: string;
  variantName: string;
  primaryImage: string | null;
  unitPriceId: string;
  sku: string;
  label: string;
  isDefault: boolean;
  originalPrice: number;
}

function formatMeasurement(m: any): string {
  if (!m) return "";
  if (typeof m === "string") return m;
  if (typeof m === "object" && "value" in m && "unit" in m) {
    return `${m.value} ${m.unit}`.trim();
  }
  return "";
}

export function ProductPriceEditModal({
  open,
  onClose,
  productUuid,
  productName,
  variants,
  onSuccess,
}: ProductPriceEditModalProps) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateVariantUnitPrice();

  const [isSaving, setIsSaving] = React.useState(false);
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Every sellable (variant, pack size) combination - a variant with multiple
  // pack sizes (e.g. 1 Nos and 12 Nos) gets one row per pack, so every price
  // is editable here, not just the default pack.
  const rows = React.useMemo<PriceRow[]>(() => {
    return variants.flatMap((v) =>
      (v.unitPrices ?? []).map((up) => ({
        variantId: v.id,
        variantName: v.variantName,
        primaryImage: v.primaryImage,
        unitPriceId: up.id,
        sku: up.sku,
        label: formatMeasurement(up.measurement) || `${up.unitValue ?? ""} ${up.unitCode ?? ""}`.trim(),
        isDefault: up.isDefault,
        originalPrice: up.basePrice,
      }))
    );
  }, [variants]);

  // Initialize or reset prices when modal opens or variants change
  React.useEffect(() => {
    if (open && rows.length > 0) {
      const initialPrices: Record<string, string> = {};
      rows.forEach((r) => {
        initialPrices[r.unitPriceId] = String(r.originalPrice ?? "");
      });
      setPrices(initialPrices);
      setErrors({});
      setGeneralError(null);
      setSearchQuery("");
    }
  }, [open, rows]);

  const handlePriceChange = (unitPriceId: string, value: string) => {
    setPrices((prev) => ({ ...prev, [unitPriceId]: value }));

    const numVal = parseFloat(value);
    let fieldError: string | undefined = undefined;

    if (value.trim() === "") {
      fieldError = "Required";
    } else if (isNaN(numVal)) {
      fieldError = "Invalid number";
    } else if (numVal < 0) {
      fieldError = "Must be ≥ 0";
    }

    setErrors((prev) => ({ ...prev, [unitPriceId]: fieldError }));
  };

  // Determine if any prices have changed
  const changedRows = React.useMemo(() => {
    return rows.filter((r) => {
      const current = prices[r.unitPriceId];
      if (current === undefined) return false;
      const newPrice = parseFloat(current);
      return !isNaN(newPrice) && newPrice !== r.originalPrice;
    });
  }, [rows, prices]);

  const hasValidationErrors = React.useMemo(() => {
    return Object.values(errors).some(Boolean);
  }, [errors]);

  // Filtered rows for search inside modal
  const filteredRows = React.useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.variantName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const handleSave = async () => {
    setGeneralError(null);

    let hasError = false;
    const newErrors: Record<string, string> = {};

    changedRows.forEach((r) => {
      const current = prices[r.unitPriceId];
      const num = parseFloat(current ?? "");
      if (!current || isNaN(num) || num < 0) {
        newErrors[r.unitPriceId] = "Must be ≥ 0";
        hasError = true;
      }
    });

    if (hasError) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      setGeneralError("Please fix invalid price values before saving.");
      return;
    }

    if (changedRows.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        changedRows.map((r) =>
          updateMutation.mutateAsync({
            productUuid,
            variantUuid: r.variantId,
            unitPriceUuid: r.unitPriceId,
            data: { basePrice: parseFloat(prices[r.unitPriceId]) },
          })
        )
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: variantKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);

      toast.success(
        "Prices Updated",
        `Successfully updated ${changedRows.length} price${changedRows.length > 1 ? "s" : ""}.`
      );

      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to update prices. Please try again.";
      setGeneralError(errorMsg);
      toast.error("Price Update Failed", errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title="Edit Prices"
      description={`Update the price of every pack size for all items under "${productName}".`}
      size="xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                changedRows.length > 0
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {changedRows.length} of {rows.length} price(s) modified
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || changedRows.length === 0 || hasValidationErrors}
              className="bg-secondary-600 hover:bg-secondary-700 text-white min-w-[130px] text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" className="mr-2 text-white" />
                  Saving...
                </>
              ) : (
                `Save ${changedRows.length > 0 ? `(${changedRows.length})` : ""} Changes`
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* General Error Banner */}
        {generalError && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-xs font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Search inside modal (if > 3 rows) */}
        {rows.length > 3 && (
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by item name, SKU or pack size..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-cream-border text-xs bg-cream-50/50 focus:bg-white focus:outline-none focus:border-secondary-600 transition-colors"
            />
          </div>
        )}

        {/* Prices Table */}
        {rows.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 text-xs">
            No pack sizes / prices set up for this product yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cream-border max-h-[420px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 z-20 bg-cream-50 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-cream-border shadow-[0_1px_0_var(--cream-border)]">
                <tr>
                  <th className="px-4 py-3 min-w-[220px]">Item / Pack</th>
                  <th className="px-4 py-3 min-w-[100px] text-right">Current Price</th>
                  <th className="px-4 py-3 min-w-[150px]">New Price (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-border-subtle bg-white">
                {filteredRows.map((r) => {
                  const currentValue = prices[r.unitPriceId] ?? String(r.originalPrice);
                  const currentError = errors[r.unitPriceId];
                  const isModified = changedRows.some((cr) => cr.unitPriceId === r.unitPriceId);

                  return (
                    <tr
                      key={r.unitPriceId}
                      className={`group transition-colors ${
                        isModified ? "bg-amber-50/40" : "hover:bg-cream-50/50"
                      }`}
                    >
                      {/* Item / Pack Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-cream-100 border border-cream-border relative overflow-hidden shrink-0 flex items-center justify-center">
                            {r.primaryImage ? (
                              <Image
                                src={r.primaryImage}
                                alt={r.variantName}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-neutral-400 opacity-60" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-neutral-900 truncate">
                                {r.variantName}
                              </span>
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cream-200 text-neutral-600 border border-cream-border whitespace-nowrap">
                                {r.label}
                              </span>
                              {r.isDefault && (
                                <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                              )}
                              {isModified && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-200 text-amber-900">
                                  Edited
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                              {r.sku}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Price */}
                      <td className="px-4 py-3 text-xs text-right text-neutral-500 font-semibold whitespace-nowrap tabular-nums">
                        ₹{r.originalPrice.toLocaleString("en-IN")}
                      </td>

                      {/* New Price Input */}
                      <td className="px-4 py-3">
                        <div className="relative rounded-lg shadow-2xs">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-neutral-400">
                            <IndianRupee className="h-3.5 w-3.5" />
                          </div>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={currentValue}
                            onChange={(e) => handlePriceChange(r.unitPriceId, e.target.value)}
                            disabled={isSaving}
                            className={`block w-full rounded-lg border py-1.5 pl-8 pr-2 text-xs font-semibold outline-none transition-colors ${
                              currentError
                                ? "border-red-400 bg-red-50/30 text-red-900 focus:border-red-500"
                                : "border-cream-border-hover focus:border-secondary-600 focus:bg-white"
                            }`}
                          />
                        </div>
                        {currentError && (
                          <p className="mt-1 text-xs text-red-500 font-medium">{currentError}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FormModal>
  );
}

export default ProductPriceEditModal;
