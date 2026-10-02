"use client";

import AuthFormLayout from "@/components/auth/AuthFormLayout";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useLogin } from "@/features/auth";
import { FormInput } from "@/components/forms/form-input";
import { FormPasswordInput } from "@/components/forms/FormPasswordInput";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Spinner } from "@/components/ui/spinner";
import { LockKeyhole, Mail, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const authError = searchParams.get("error");
  const loginMutation = useLogin();

  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    if (error === "AccessDenied") return "Your account has been deactivated or blocked.";
    if (error === "OAuthCallbackError" || error === "OAuthSignin")
      return "Failed to authenticate with Google. Please try again.";
    return "Authentication failed. Please try again.";
  };

  const methods = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(
      {
        email: data.email.trim(),
        password: data.password,
      },
      {
        onSuccess: async () => {
          try {
            // Sync NextAuth session and redirect
            await signIn("credentials", {
              email: data.email.trim(),
              password: data.password,
              redirect: false,
            });
          } catch {
            // Cookie auth is primary fallback
          }
          router.push(callbackUrl);
          router.refresh();
        },
        onError: (err: any) => {
          methods.setError("root", {
            type: "server",
            message:
              err?.message ||
              "Invalid email or password. Please check your credentials.",
          });
        },
      }
    );
  };

  return (
    <AuthFormLayout
      showLogo
      showFooter
      title="Welcome Back"
      subtitle="Sign in to access your favorite heritage snacks."
      bottomContent={
        <div className="text-sm text-neutral-600">
          New to RithuSnacks?{" "}
          <Link
            href={
              callbackUrl !== "/"
                ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/register"
            }
            className="font-medium text-secondary-600 hover:underline"
          >
            Create an account
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {/* URL Error (e.g. Google OAuth error) */}
        {authError && (
          <div className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {getErrorMessage(authError)}
          </div>
        )}

        {/* Google One-Click Login */}
        <GoogleAuthButton callbackUrl={callbackUrl} text="Continue with Google" />

        {/* Divider */}
        <div className="relative flex items-center justify-center py-1">
          <div className="w-full border-t border-neutral-200" />
          <span className="absolute bg-white px-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Or sign in with email
          </span>
        </div>

        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="space-y-5 md:space-y-6"
          >
            {/* Server Error */}
            {methods.formState.errors.root?.message && (
              <div className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {methods.formState.errors.root.message}
              </div>
            )}

          <FormInput
            name="email"
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            leftIcon={<Mail size={18} />}
            required
          />

          <FormPasswordInput
            name="password"
            label="Password"
            placeholder="Enter your password"
            leftIcon={<LockKeyhole size={18} />}
            required
          />

          <div className="flex items-center justify-end">
            {/* <Checkbox label="Remember Me" className="border-neutral-300" /> */}

            <Link
              href="/forgot-password"
              className="text-sm font-medium text-secondary-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <FormSubmitButton
            size="xl"
            disabled={loginMutation.isPending}
            className="mt-2 h-12 md:h-14 w-full rounded-lg bg-secondary-600 text-sm text-white hover:bg-secondary-700 cursor-pointer disabled:opacity-50"
          >
            {loginMutation.isPending ? <Spinner size="sm" className="text-white" /> : "Sign In"}
          </FormSubmitButton>
        </form>
      </FormProvider>
      </div>
    </AuthFormLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}