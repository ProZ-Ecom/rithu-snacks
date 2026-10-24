"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  Truck,
  CheckCircle2,
  Package,
  MapPin,
  Calendar,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Building2,
  Clock,
} from "lucide-react";
import type { TrackingResult, TrackingCheckpoint } from "../services/courier-tracking.service";

export interface LiveTrackingModalProps {
  open: boolean;
  onClose: () => void;
  awb?: string;
  trackingNumber?: string;
  courierName?: string;
  orderNumber?: string;
}

export function LiveTrackingModal({
  open,
  onClose,
  awb,
  trackingNumber,
  courierName = "ST Courier",
  orderNumber,
}: LiveTrackingModalProps) {
  const activeAwb = awb || trackingNumber || "";
  const [data, setData] = useState<TrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTracking = async (awbNum: string) => {
    if (!awbNum) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/orders/track?awb=${encodeURIComponent(awbNum)}&courier=st-courier`
      );
      const json: TrackingResult = await res.json();

      if (!json.success && json.error) {
        setError(json.error);
        setData(json);
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch live tracking details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && activeAwb) {
      fetchTracking(activeAwb);
    } else {
      setData(null);
      setError(null);
    }
  }, [open, activeAwb]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDelivered =
    data?.summary?.currentStatus?.toLowerCase().includes("delivered") ||
    data?.checkpoints?.[0]?.isDelivered;

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-white border border-neutral-200 shadow-2xl [&>button:first-child]:text-white/80 [&>button:first-child]:hover:text-white [&>button:first-child]:hover:bg-white/20 [&>button:first-child]:z-20"
    >
      <div className="w-full">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-secondary-800 to-secondary-900 text-white px-6 py-5 rounded-t-2xl">
          <div className="flex items-center justify-between gap-4 pr-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-secondary-700/80 text-secondary-100 border border-secondary-600">
                  {courierName}
                </span>
                {orderNumber && (
                  <span className="text-xs text-secondary-200 font-mono">
                    Order {orderNumber}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black tracking-tight mt-1 text-white">
                Live Shipment Tracking
              </h2>
            </div>
          </div>

          {/* AWB Tag & Copy */}
          <div className="mt-4 pt-3 border-t border-secondary-700/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary-200 font-medium">AWB:</span>
              <span className="font-mono text-sm font-bold tracking-wider bg-black/20 px-2.5 py-0.5 rounded-md border border-white/10">
                {activeAwb}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(activeAwb)}
                className="p-1.5 rounded-md hover:bg-white/10 text-secondary-200 hover:text-white transition-colors cursor-pointer"
                title="Copy AWB Number"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Current Status Pill */}
            {data?.summary?.currentStatus && (
              <div
                className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs ${
                  isDelivered
                    ? "bg-emerald-500 text-white"
                    : "bg-secondary-600 text-secondary-50 border border-secondary-500"
                }`}
              >
                {isDelivered ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Truck className="h-3.5 w-3.5 animate-bounce" />
                )}
                <span>{data.summary.currentStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-500">
              <RefreshCw className="h-7 w-7 animate-spin text-secondary-600" />
              <p className="text-sm font-medium">Connecting to {courierName} live servers...</p>
              <p className="text-xs text-neutral-400">Fetching real-time scans and transit checkpoints</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">Tracking Notice</div>
                <div className="mt-0.5 leading-relaxed">{error}</div>
                {data?.officialUrl && (
                  <a
                    href={data.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-secondary-600 hover:underline"
                  >
                    Track directly on ST Courier Portal <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {!isLoading && data && (
            <>
              {/* Quick Status and Refresh Bar */}
              <div className="flex items-center justify-between gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-neutral-700">
                    Latest status: <strong className="text-neutral-900">{data.summary?.currentStatus || "In Transit"}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchTracking(activeAwb)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary-600 hover:text-secondary-800 transition-colors p-1.5 rounded-lg hover:bg-neutral-200/60 cursor-pointer"
                  title="Refresh live status"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {/* Summary Details Grid */}
              {data?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {data.summary.origin && (
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80">
                      <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-neutral-400" /> Origin
                      </div>
                      <div className="text-xs font-bold text-neutral-800 mt-1 font-mono truncate">
                        {data.summary.origin}
                      </div>
                    </div>
                  )}

                  {data.summary.destination && (
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80">
                      <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-secondary-600" /> Destination
                      </div>
                      <div className="text-xs font-bold text-neutral-800 mt-1 font-mono truncate">
                        {data.summary.destination}
                      </div>
                    </div>
                  )}

                  {data.summary.bookingDate && (
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80">
                      <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-neutral-400" /> Booked On
                      </div>
                      <div className="text-xs font-semibold text-neutral-800 mt-1 truncate">
                        {data.summary.bookingDate}
                      </div>
                    </div>
                  )}

                  {data.summary.deliveryDate && (
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80">
                      <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3 text-emerald-600" /> Delivered On
                      </div>
                      <div className="text-xs font-semibold text-neutral-800 mt-1 truncate">
                        {data.summary.deliveryDate}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Section */}
              <div className="pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3.5">
                  Shipment Checkpoints & Timeline
                </div>

                {data?.checkpoints && data.checkpoints.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                    {data.checkpoints.map((cp, idx) => {
                      const isLatest = idx === 0;
                      const isCpDelivered =
                        cp.isDelivered ||
                        cp.status.toLowerCase().includes("delivered");

                      return (
                        <div key={idx} className="relative group">
                          {/* Dot / Icon */}
                          <div
                            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                              isCpDelivered
                                ? "bg-emerald-600 text-white"
                                : isLatest
                                ? "bg-secondary-600 text-white animate-pulse"
                                : "bg-neutral-300 text-white"
                            }`}
                          >
                            {isCpDelivered ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>

                          {/* Content */}
                          <div
                            className={`rounded-xl p-3.5 border transition-all ${
                              isLatest
                                ? "bg-secondary-50/50 border-secondary-200 shadow-2xs"
                                : "bg-white border-neutral-200/70"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span
                                className={`text-sm font-bold ${
                                  isCpDelivered
                                    ? "text-emerald-700"
                                    : isLatest
                                    ? "text-secondary-900"
                                    : "text-neutral-800"
                                }`}
                              >
                                {cp.status}
                              </span>
                              <span className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
                                {cp.date}
                              </span>
                            </div>

                            {cp.location && (
                              <div className="text-xs text-neutral-600 mt-1 flex items-start gap-1">
                                <Building2 className="h-3.5 w-3.5 text-neutral-400 mt-0.5 shrink-0" />
                                <span>{cp.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
                    No checkpoints recorded yet. Package is awaiting initial dispatch scan.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200/80 flex items-center justify-between rounded-b-2xl">
          <span className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Verified live data from {courierName} network
          </span>

          <div className="flex items-center gap-2">
            {data?.officialUrl && (
              <a
                href={data.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
              >
                Official Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
