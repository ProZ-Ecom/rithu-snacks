import Razorpay from "razorpay";

export function getRazorpayBaseUrl(): string {
  return process.env.RAZORPAY_BASE_URL || "https://api.razorpay.com";
}

export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay API credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the environment."
    );
  }

  const client = new Razorpay({
    key_id,
    key_secret,
  });

  const baseUrl = getRazorpayBaseUrl();
  if (client && (client as any).api) {
    (client as any).api.hostUrl = baseUrl;
  }

  return client;
}

export function getRazorpayPublicKey(): string {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  if (!key_id) {
    throw new Error("Razorpay Public Key ID is not configured.");
  }
  return key_id;
}
