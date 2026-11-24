"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { Spinner } from "@/components/ui/spinner";

interface GoogleAuthButtonProps {
  callbackUrl?: string;
  text?: string;
  className?: string;
}

export function GoogleAuthButton({
  callbackUrl = "/",
  text = "Continue with Google",
  className = "",
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Listen to browser navigation/visibility events to reset loading state
  // when navigating back from Google OAuth (bfcache restore, popstate, tab visibility)
  useEffect(() => {
    const handleReset = () => {
      setIsLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // 1. pageshow fires when page is displayed/restored from browser Back-Forward Cache (bfcache)
    window.addEventListener("pageshow", handleReset);

    // 2. popstate fires on browser back/forward history navigation
    window.addEventListener("popstate", handleReset);

    // 3. visibilitychange fires when user navigates back to tab / browser becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleReset();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. focus fires when the window/tab regains focus
    window.addEventListener("focus", handleReset);

    return () => {
      window.removeEventListener("pageshow", handleReset);
      window.removeEventListener("popstate", handleReset);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleReset);
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      // Safety timeout: if redirect is aborted or user stays on page, auto-reset after 8s
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 8000);

      await signIn("google", {
        callbackUrl,
      });
    } catch {
      setIsLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      aria-label={text}
      className={`group relative flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-xs transition-all duration-200 hover:border-neutral-400 hover:bg-neutral-50/80 hover:text-neutral-900 hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${className}`}
    >
      {isLoading ? (
        <Spinner size="sm" className="text-neutral-600" />
      ) : (
        <svg
          className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      )}
      <span className="font-semibold tracking-tight">
        {isLoading ? "Redirecting to Google..." : text}
      </span>
    </button>
  );
}
