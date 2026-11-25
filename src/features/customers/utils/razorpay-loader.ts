/**
 * Asynchronously load the Razorpay checkout script into the browser.
 */
let scriptLoadingPromise: Promise<boolean> | null = null;

export const RAZORPAY_CHECKOUT_SCRIPT_URL =
  process.env.NEXT_PUBLIC_RAZORPAY_CHECKOUT_URL ||
  "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  // Already loaded and available on window
  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }

  // If already in-flight, return the existing promise
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    // Check if script tag already exists
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = "anonymous";

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      scriptLoadingPromise = null;
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}
