/**
 * Official Courier Partner Information & Portal Directory
 * Live tracking is handled directly in-app via LiveTrackingModal.
 */

export interface CourierPartnerInfo {
  code: string;
  name: string;
  officialUrl: string;
}

export const SUPPORTED_COURIERS: Record<string, CourierPartnerInfo> = {
  ST_COURIER: {
    code: "ST_COURIER",
    name: "ST Courier",
    officialUrl: "https://stcourier.com/track/shipment",
  },
};

export interface CourierTrackingDetails {
  courierName: string;
  courierCode: string;
  trackingNumber: string;
  officialUrl: string;
}

/**
 * Returns official courier information for any courier and AWB number.
 */
export function getCourierTrackingInfo(
  courierCode?: string | null,
  trackingNumber?: string | null,
  customName?: string | null
): CourierTrackingDetails | null {
  const awb = trackingNumber?.trim();
  if (!awb) return null;

  const normalizedCode = (courierCode || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const matched =
    SUPPORTED_COURIERS[normalizedCode] ||
    Object.values(SUPPORTED_COURIERS).find(
      (c) =>
        c.code === normalizedCode ||
        (customName && c.name.toLowerCase().includes(customName.toLowerCase())) ||
        (customName && customName.toLowerCase().includes(c.name.toLowerCase()))
    );

  if (matched) {
    return {
      courierName: customName || matched.name,
      courierCode: matched.code,
      trackingNumber: awb,
      officialUrl: matched.officialUrl,
    };
  }

  return {
    courierName: customName || "Courier",
    courierCode: normalizedCode || "OTHER",
    trackingNumber: awb,
    officialUrl: `https://www.google.com/search?q=${encodeURIComponent((customName || "courier") + " tracking " + awb)}`,
  };
}
