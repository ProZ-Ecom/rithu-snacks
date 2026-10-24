"use client";
import { useMemo, Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthFormLayout from "@/components/auth/AuthFormLayout";
import { useSendEmailOtp, authFlowState } from "@/features/auth";
import { FormInput } from "@/components/forms/form-input";
import { FormPasswordInput } from "@/components/forms/FormPasswordInput";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, LockKeyhole, User, Phone, AlertCircle } from "lucide-react";
import { z } from "zod";

const registerFormSchema = z
  .object({
    name: z
      .string({ message: "Full name is required" })
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be less than 100 characters"),
    email: z
      .string({ message: "Email is required" })
      .trim()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .transform((val) => val.toLowerCase()),
    phone: z
      .string({ message: "Mobile number is required" })
      .trim()
      .regex(
        /^[6-9]\d{9}$/,
        "Mobile number must be a valid 10-digit Indian number"
      ),
    password: z
      .string({ message: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z
      .string({ message: "Please confirm your password" })
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerFormSchema>;

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [acceptTerms, setAcceptTerms] = useState(false);
  const sendEmailOtpMutation = useSendEmailOtp();

  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Safely restore previously entered registration data on mount (e.g. when navigating back from OTP verification or Terms & Conditions)
  useEffect(() => {
    const saved = authFlowState.getPendingRegistration();
    if (saved) {
      methods.reset({
        name: saved.name || "",
        email: saved.email || "",
        phone: saved.phone || "",
        password: saved.password || "",
        confirmPassword: saved.confirmPassword || "",
      });
      if (typeof saved.acceptTerms === "boolean") {
        setAcceptTerms(saved.acceptTerms);
      } else if (saved.name || saved.email || saved.phone) {
        setAcceptTerms(true);
      }
    }
  }, [methods]);

  // Continuously persist form draft so navigating to Terms, Privacy, or back does not lose progress
  useEffect(() => {
    const subscription = methods.watch((values) => {
      authFlowState.setPendingRegistration({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        confirmPassword: values.confirmPassword,
        acceptTerms,
      });
    });
    return () => subscription.unsubscribe();
  }, [methods, acceptTerms]);

  const password = useWatch({
    control: methods.control,
    name: "password",
    defaultValue: "",
  }) || "";

  const strength = useMemo(() => {
    const trimmed = (password || "").trim();
    if (!trimmed) return null;

    let score = 0;

    if (trimmed.length >= 8) score++;
    if (/[A-Z]/.test(trimmed)) score++;
    if (/[a-z]/.test(trimmed)) score++;
    if (/\d/.test(trimmed)) score++;
    if (/[^A-Za-z0-9]/.test(trimmed)) score++;

    if (score <= 2) {
      return {
        width: "25%",
        label: "Weak",
        color: "bg-error-600",
        suggestion:
          "Use at least 8 characters with uppercase, lowercase, a number, and a special character.",
      };
    }

    if (score === 3) {
      return {
        width: "50%",
        label: "Fair",
        color: "bg-primary-400",
        suggestion: "Add an uppercase letter, number, or special character.",
      };
    }

    if (score === 4) {
      return {
        width: "75%",
        label: "Good",
        color: "bg-success-500",
        suggestion: "Add a special character to make it stronger.",
      };
    }

    return {
      width: "100%",
      label: "Strong",
      color: "bg-success-600",
      suggestion: "Your password is strong.",
    };
  }, [password]);

  const handleAcceptTermsChange = (checked: boolean) => {
    setAcceptTerms(checked);
    const currentValues = methods.getValues();
    authFlowState.setPendingRegistration({
      name: currentValues.name,
      email: currentValues.email,
      phone: currentValues.phone,
      password: currentValues.password,
      confirmPassword: currentValues.confirmPassword,
      acceptTerms: checked,
    });
  };

  const onSubmit = (data: RegisterFormData) => {
    methods.clearErrors("root");

    if (!acceptTerms) {
      methods.setError("root", {
        type: "manual",
        message: "Please accept Terms & Conditions.",
      });
      return;
    }

    const regData = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      password: data.password,
      confirmPassword: data.confirmPassword,
      acceptTerms: true,
    };

    authFlowState.setPendingRegistration(regData);

    sendEmailOtpMutation.mutate(
      { email: regData.email },
      {
        onSuccess: () => {
          const targetUrl = `/register/verify-otp${
            callbackUrl !== "/"
              ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
              : ""
          }`;
          router.push(targetUrl);
        },
        onError: (err: any) => {
          methods.setError("root", {
            type: "server",
            message:
              err?.message ||
              "Failed to send verification code. Please try again.",
          });
        },
      }
    );
  };

  return (
    <AuthFormLayout
      showLogo
      title="Create Account"
      subtitle="Welcome to Rithu&apos;s Snacks"
      bottomContent={
        <div className="text-sm text-neutral-600">
          Already have an account?{" "}
          <Link
            href={
              callbackUrl !== "/"
                ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/login"
            }
            className="font-medium text-secondary-600 hover:underline"
          >
            Sign In
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Google One-Click Registration */}
        <GoogleAuthButton callbackUrl={callbackUrl} text="Sign up with Google" />

        {/* Divider */}
        <div className="relative flex items-center justify-center py-1">
          <div className="w-full border-t border-neutral-200" />
          <span className="absolute bg-white px-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Or register with email
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
            name="name"
            label="Full Name"
            placeholder="Enter your full name"
            autoComplete="name"
            leftIcon={<User size={18} />}
            required
          />

          <FormInput
            name="email"
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            leftIcon={<Mail size={18} />}
            required
          />

          <FormInput
            name="phone"
            label="Mobile Number"
            type="tel"
            placeholder="Enter 10-digit mobile number"
            autoComplete="tel"
            maxLength={10}
            leftIcon={<Phone size={18} />}
            inputPrefix="+91"
            required
          />

          <FormPasswordInput
            name="password"
            label="Password"
            placeholder="Enter your password"
            leftIcon={<LockKeyhole size={18} />}
            required
          />

          {password.trim().length > 0 && strength && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                <span>Password Strength</span>
                <span>{strength.label}</span>
              </div>

              <div className="h-[4px] w-full rounded-full bg-neutral-200">
                <div
                  className={`h-[4px] rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                {strength.suggestion}
              </p>
            </div>
          )}

          <FormPasswordInput
            name="confirmPassword"
            label="Confirm Password"
            placeholder="Confirm your password"
            leftIcon={<LockKeyhole size={18} />}
            required
          />

          <div className="pt-1">
            <Checkbox
              checked={acceptTerms}
              onChange={(e) => handleAcceptTermsChange(e.target.checked)}
              label={
                <>
                  I agree to the{" "}
                  <Link
                    href="/terms-and-conditions"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentValues = methods.getValues();
                      authFlowState.setPendingRegistration({
                        name: currentValues.name,
                        email: currentValues.email,
                        phone: currentValues.phone,
                        password: currentValues.password,
                        confirmPassword: currentValues.confirmPassword,
                        acceptTerms,
                      });
                    }}
                    className="font-medium text-secondary-600 hover:underline"
                  >
                    Terms & Conditions
                  </Link>
                </>
              }
            />
          </div>

          <FormSubmitButton
            size="xl"
            disabled={sendEmailOtpMutation.isPending}
            className="mt-2 h-10 w-full rounded-lg bg-secondary-600 text-sm text-white transition-all hover:bg-secondary-700 cursor-pointer disabled:opacity-50"
          >
            {sendEmailOtpMutation.isPending ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              "Create Account"
            )}
          </FormSubmitButton>
        </form>
      </FormProvider>
      </div>
    </AuthFormLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
