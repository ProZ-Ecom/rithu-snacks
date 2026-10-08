"use client";

import { useState, useEffect, useMemo } from "react";
import { FormModal } from "@/components/common/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { useDeliveryPartners, useShipOrderCourier } from "../hooks";
import {
  Truck,
  Barcode,
  FileText,
  AlertCircle,
  Loader2,
  PackageCheck,
} from "lucide-react";

interface ShipOrderModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  orderNumber?: string;
  customerName?: string;
  initialPartnerCode?: string;
  initialTrackingNumber?: string;
  onSuccess?: () => void;
}

export function ShipOrderModal({
  open,
  onClose,
  orderId,
  orderNumber,
  customerName,
  initialPartnerCode,
  initialTrackingNumber,
  onSuccess,
}: ShipOrderModalProps) {
  const { data: partners = [], isLoading: partnersLoading } = useDeliveryPartners();
  const shipMutation = useShipOrderCourier();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");

  // Default to ST Courier or existing courier
  useEffect(() => {
    if (open) {
      if (initialTrackingNumber) {
        setTrackingNumber(initialTrackingNumber);
      } else {
        setTrackingNumber("");
      }

      setNotes("");
      setValidationError("");

      if (partners.length > 0) {
        // Try to match initialPartnerCode, or default to ST Courier, or first partner
        const stPartner = partners.find(
          (p) =>
            p.code === (initialPartnerCode || "ST_COURIER") ||
            p.name.toLowerCase().includes("st courier")
        );
        setSelectedPartnerId(stPartner ? stPartner.id : partners[0].id);
      }
    }
  }, [open, partners, initialPartnerCode, initialTrackingNumber]);

  const partnerOptions: SelectOption[] = useMemo(() => {
    return partners.map((partner) => ({
      value: String(partner.id),
      label: `${partner.name} (${partner.code})`,
    }));
  }, [partners]);

  const handleClose = () => {
    setTrackingNumber("");
    setNotes("");
    setValidationError("");
    onClose();
  };

  const handleShip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    if (!selectedPartnerId) {
      setValidationError("Please select a courier partner");
      return;
    }

    const trimmedAwb = trackingNumber.trim();
    if (!trimmedAwb || trimmedAwb.length < 3) {
      setValidationError("Please enter a valid AWB / Tracking number (min 3 digits)");
      return;
    }

    setValidationError("");

    shipMutation.mutate(
      {
        uuid: orderId,
        payload: {
          deliveryPartnerId: selectedPartnerId,
          trackingNumber: trimmedAwb,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        },
      }
    );
  };

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title="Ship Order via Courier"
      description={
        orderNumber
          ? `Add courier dispatch details & live tracking for Order #${orderNumber}${customerName ? ` (${customerName})` : ""}`
          : "Add courier dispatch details & live tracking"
      }
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="outline"
            type="button"
            onClick={handleClose}
            disabled={shipMutation.isPending}
            className="h-10 px-5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-secondary-600 hover:bg-secondary-700 text-white flex items-center gap-2 h-10 px-6 font-semibold cursor-pointer"
            onClick={handleShip}
            disabled={shipMutation.isPending}
          >
            {shipMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Shipping...
              </>
            ) : (
              <>
                <PackageCheck className="h-4 w-4" />
                Confirm & Mark Shipped
              </>
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleShip} className="space-y-6 py-2">
        {validationError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="font-medium">{validationError}</span>
          </div>
        )}

        {shipMutation.error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>
              {(shipMutation.error as any)?.message ||
                "Failed to update shipment tracking. Please try again."}
            </span>
          </div>
        )}

        {/* Courier Partner Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Courier Service Partner <span className="text-red-500">*</span>
          </label>
          {partnersLoading ? (
            <div className="h-11 w-full bg-neutral-100 rounded-xl animate-pulse" />
          ) : (
            <Select
              options={partnerOptions}
              value={selectedPartnerId}
              onValueChange={(val) => setSelectedPartnerId(val)}
              placeholder="Select Courier Partner"
              leftIcon={<Truck className="h-4 w-4 text-neutral-400" />}
              size="md"
            />
          )}
        </div>

        {/* Tracking / AWB Number Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Tracking / AWB Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Barcode className="h-4 w-4" />
            </div>
            <Input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 64414926026"
              className="pl-10 h-11 rounded-xl font-mono tracking-wider text-sm font-semibold text-neutral-900 border-neutral-300 focus:border-secondary-500 focus:ring-secondary-500"
              autoFocus
            />
          </div>
          <p className="text-[11.5px] text-neutral-500 pt-0.5">
            Enter the consignment note / AWB barcode number provided on the courier receipt.
          </p>
        </div>

        {/* Optional Notes */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Dispatch Notes / Remarks <span className="text-neutral-400 font-normal text-[11px] lowercase">(optional)</span>
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3.5 text-neutral-400 pointer-events-none">
              <FileText className="h-4 w-4" />
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dispatched via evening pickup from kitchen branch"
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-all resize-none"
            />
          </div>
        </div>
      </form>
    </FormModal>
  );
}
