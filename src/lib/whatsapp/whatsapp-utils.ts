/**
 * WhatsApp Utility Functions & Message Templates
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formattedJid: string | null;
  displayFormatted: string | null;
  errorMessage: string | null;
}

/**
 * Validates whether an input string is a valid WhatsApp phone number.
 * Supports:
 * - 10-digit Indian numbers (starting with 6, 7, 8, or 9, e.g. "9876543210")
 * - Numbers with leading zero (e.g. "09876543210")
 * - Numbers with +91 or 91 country code (e.g. "+91 98765 43210", "+919876543210")
 * - Standard international phone numbers (10 to 15 digits total as per E.164)
 */
export function validateWhatsAppPhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== "string") {
    return {
      isValid: false,
      formattedJid: null,
      displayFormatted: null,
      errorMessage: "Phone number is required",
    };
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return {
      isValid: false,
      formattedJid: null,
      displayFormatted: null,
      errorMessage: "Phone number cannot be empty",
    };
  }

  // Check if input contains invalid non-phone characters (letters, special symbols)
  if (/[^0-9+\s\-()]/i.test(trimmed)) {
    return {
      isValid: false,
      formattedJid: null,
      displayFormatted: null,
      errorMessage: "Phone number cannot contain letters or special symbols",
    };
  }

  // Extract digits only
  let digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return {
      isValid: false,
      formattedJid: null,
      displayFormatted: null,
      errorMessage: "Please enter valid numeric digits",
    };
  }

  // If starts with 0 and followed by 10 digits (e.g. 09876543210)
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.substring(1);
  }

  // Case 1: 10-digit Indian mobile number
  if (digits.length === 10) {
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        isValid: false,
        formattedJid: null,
        displayFormatted: null,
        errorMessage: "10-digit Indian mobile number must start with 6, 7, 8, or 9",
      };
    }
    const fullDigits = "91" + digits;
    return {
      isValid: true,
      formattedJid: `${fullDigits}@s.whatsapp.net`,
      displayFormatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      errorMessage: null,
    };
  }

  // Case 2: 12-digit Indian number with 91 country code (919876543210)
  if (digits.length === 12 && digits.startsWith("91")) {
    const mobilePart = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(mobilePart)) {
      return {
        isValid: false,
        formattedJid: null,
        displayFormatted: null,
        errorMessage: "Indian mobile number after +91 must start with 6, 7, 8, or 9",
      };
    }
    return {
      isValid: true,
      formattedJid: `${digits}@s.whatsapp.net`,
      displayFormatted: `+91 ${mobilePart.slice(0, 5)} ${mobilePart.slice(5)}`,
      errorMessage: null,
    };
  }

  // Case 3: International numbers (10 to 15 digits total as per ITU E.164)
  if (digits.length >= 10 && digits.length <= 15) {
    return {
      isValid: true,
      formattedJid: `${digits}@s.whatsapp.net`,
      displayFormatted: `+${digits}`,
      errorMessage: null,
    };
  }

  if (digits.length < 10) {
    return {
      isValid: false,
      formattedJid: null,
      displayFormatted: null,
      errorMessage: `Phone number is too short (${digits.length}/10 digits minimum)`,
    };
  }

  return {
    isValid: false,
    formattedJid: null,
    displayFormatted: null,
    errorMessage: "Phone number is too long (cannot exceed 15 digits)",
  };
}

export function formatToWhatsAppJid(phone: string): string {
  const result = validateWhatsAppPhone(phone);
  if (result.isValid && result.formattedJid) {
    return result.formattedJid;
  }

  // Fallback cleanup
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }

  return `${cleaned}@s.whatsapp.net`;
}

export function cleanPhoneDisplay(rawJidOrPhone: string): string {
  if (!rawJidOrPhone) return "";
  // 1. Remove domain (@s.whatsapp.net, @lid, etc.)
  const withoutDomain = rawJidOrPhone.split("@")[0];
  // 2. Remove multi-device index suffix (:22, :0, :1, etc.)
  const withoutDevice = withoutDomain.split(":")[0];
  // 3. Extract purely digits
  const digits = withoutDevice.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
}

export const WHATSAPP_TEMPLATES = [
  {
    id: "order_confirmed",
    name: "Order Confirmed",
    template: (orderId = "1001", customerName = "Customer", amount = "450") =>
      `Namaste ${customerName}! 🙏\n\nYour Rithu Snacks order *#${orderId}* for *₹${amount}* has been confirmed and is being freshly prepared! 🥨✨\n\nWe will notify you as soon as it is dispatched.\n\nThank you for choosing Rithu Snacks! ❤️`,
  },
  {
    id: "out_for_delivery",
    name: "Out for Delivery",
    template: (orderId = "1001", customerName = "Customer") =>
      `Hello ${customerName}! 🚚\n\nGreat news! Your Rithu Snacks order *#${orderId}* is out for delivery. Our delivery partner will reach you shortly.\n\nEnjoy your fresh and crispy snacks! 😋`,
  },
  {
    id: "order_delivered",
    name: "Order Delivered",
    template: (orderId = "1001", customerName = "Customer") =>
      `Dear ${customerName}, your Rithu Snacks order *#${orderId}* has been delivered successfully! 🎉\n\nWe hope you love every bite! If you have any feedback, please reply directly to this message.\n\nHave a delicious day! ❤️`,
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder",
    template: (orderId = "1001", customerName = "Customer", amount = "450") =>
      `Hello ${customerName},\n\nThis is a friendly reminder regarding your pending payment of *₹${amount}* for Rithu Snacks order *#${orderId}*.\n\nPlease complete your payment using UPI/card or contact us for assistance. Thank you! 🙏`,
  },
];
