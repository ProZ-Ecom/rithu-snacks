import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { LoginFormClient } from "./LoginFormClient";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your RithuSnacks account to manage orders, wishlist, and enjoy faster checkout.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginFormClient />
    </Suspense>
  );
}
