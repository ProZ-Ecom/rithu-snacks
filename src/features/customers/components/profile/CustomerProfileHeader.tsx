"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Mail,
  MapPin,
  MoreVertical,
  Ban,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUpdateCustomerStatus } from "../../hooks";
import type {
  AdminCustomerListItemDto,
  AdminCustomerDetailDto,
} from "../../types/admin-customer.types";

interface CustomerTopBarProps {
  customer: AdminCustomerListItemDto | AdminCustomerDetailDto;
}

export function CustomerTopBar({ customer }: CustomerTopBarProps) {
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);

  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateCustomerStatus();

  // Detect whether customer is blocked / inactive
  const isBlocked =
    customer.isBlocked === true ||
    customer.isActive === false ||
    customer.status === "banned" ||
    customer.status === "inactive";

  const customerId =
    customer.id || (customer as AdminCustomerListItemDto).userId || "";

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    }

    if (isMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  const handleConfirmStatusChange = () => {
    if (!customerId) return;
    updateStatus(
      {
        uuid: customerId,
        isActive: isBlocked, // If blocked, activate (true). If active, block (false).
      },
      {
        onSettled: () => {
          setIsConfirmOpen(false);
        },
      }
    );
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Breadcrumb: Customers > Customer Name + Status Badge */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium flex-wrap">
          <Link
            href="/admin/dashboard/customers"
            className="text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Customers
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
          <span className="font-bold text-neutral-900 truncate max-w-[200px] sm:max-w-md">
            {customer.name || "Customer Profile"}
          </span>

          {isBlocked ? (
            <Badge
              variant="destructive"
              className="ml-1.5 gap-1 bg-red-100 text-red-800 border-red-200"
            >
              <ShieldAlert className="h-3 w-3" />
              Blocked
            </Badge>
          ) : (
            <Badge
              variant="success"
              className="ml-1.5 gap-1 bg-emerald-100 text-emerald-800 border-emerald-200"
            >
              <ShieldCheck className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>

        {/* Action Buttons: Email & More (⋮) */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Email Button */}
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-secondary-600 text-secondary-600 bg-white hover:bg-secondary-50 text-xs font-semibold transition-colors shadow-2xs"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-neutral-300 text-neutral-400 bg-neutral-50 text-xs font-semibold cursor-not-allowed opacity-60"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </button>
          )}

          {/* More Button with Block / Unblock User Action */}
          <div className="relative inline-block text-left" ref={moreRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMoreOpen((prev) => !prev);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-border bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 transition-colors shadow-2xs cursor-pointer"
              aria-expanded={isMoreOpen}
              aria-haspopup="true"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMoreOpen && (
              <div
                className="absolute right-0 mt-1.5 w-44 rounded-xl border border-cream-border bg-white p-1.5 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {isBlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      setIsConfirmOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Unblock User</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      setIsConfirmOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5 text-red-500" />
                    <span>Block User</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Block / Unblock Action */}
      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={
          isBlocked ? "Unblock Customer Account" : "Block Customer Account"
        }
        description={
          isBlocked
            ? `Are you sure you want to unblock ${customer.name || "this customer"}? Their account will be reactivated, allowing them to sign in and place new orders.`
            : `Are you sure you want to block ${customer.name || "this customer"}? This will deactivate their account and prevent them from signing in or placing new orders.`
        }
        confirmText={
          isUpdatingStatus
            ? isBlocked
              ? "Unblocking..."
              : "Blocking..."
            : isBlocked
            ? "Unblock Customer"
            : "Block Customer"
        }
        cancelText="Cancel"
        variant={isBlocked ? "default" : "destructive"}
        isLoading={isUpdatingStatus}
      />
    </>
  );
}

interface CustomerProfileHeaderProps {
  customer: AdminCustomerListItemDto | AdminCustomerDetailDto;
  totalSpent?: number;
  totalOrders?: number;
  location?: string;
}

export function CustomerProfileHeader({
  customer,
  totalSpent = 0,
  totalOrders = 0,
  location,
}: CustomerProfileHeaderProps) {
  const initial = customer.name?.charAt(0)?.toUpperCase() || "C";

  const isBlocked =
    customer.isBlocked === true ||
    customer.isActive === false ||
    customer.status === "banned" ||
    customer.status === "inactive";

  const memberSince = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  const formattedSpent = totalSpent > 0
    ? `₹${totalSpent.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "₹0.00";

  return (
    <div className="rounded-2xl border border-cream-border bg-white p-4 sm:p-6 md:p-7 shadow-xs h-full flex flex-col justify-center">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 w-full my-auto">
        {/* Left Subsection: Avatar & Personal Details */}
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1 w-full sm:w-auto">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20 md:h-22 md:w-22 rounded-full overflow-hidden border border-cream-border bg-cream-100 flex items-center justify-center shrink-0 shadow-2xs">
            {customer.profileImage ? (
              <Image
                src={customer.profileImage}
                alt={customer.name || "Customer"}
                fill
                sizes="(max-width: 640px) 64px, 88px"
                className="object-cover"
              />
            ) : (
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-secondary-600">
                {initial}
              </span>
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-900 leading-tight truncate">
                {customer.name || "Customer"}
              </h2>
              {isBlocked ? (
                <Badge
                  variant="destructive"
                  className="gap-1 text-[11px] bg-red-100 text-red-800 border-red-200"
                >
                  <ShieldAlert className="h-3 w-3" />
                  Blocked
                </Badge>
              ) : (
                <Badge
                  variant="success"
                  className="gap-1 text-[11px] bg-emerald-100 text-emerald-800 border-emerald-200"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Active
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-neutral-600 pt-0.5">
              <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">{location || "Seattle, WA"}</span>
            </div>

            {memberSince && (
              <p className="text-xs sm:text-sm text-neutral-500 pt-0.5">
                Customer since {memberSince}
              </p>
            )}
          </div>
        </div>

        {/* Subtle Vertical Divider on Desktop / Tablet */}
        <div className="hidden sm:block w-px self-stretch bg-cream-border mx-2 md:mx-4 my-1" />

        {/* Right Subsection: Spent & Orders Stats (2-column on mobile, stacked on sm+) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-col justify-between sm:justify-center gap-3 sm:gap-4 w-full sm:w-auto pt-3.5 sm:pt-0 border-t sm:border-t-0 border-cream-border shrink-0 sm:min-w-[130px]">
          <div className="bg-cream-50/70 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-500 font-mono">
              Total Spent
            </p>
            <p className="text-base sm:text-xl md:text-2xl font-bold text-secondary-600 font-mono leading-tight mt-0.5 truncate">
              {formattedSpent}
            </p>
          </div>

          <div className="bg-cream-50/70 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-500 font-mono">
              Total Orders
            </p>
            <p className="text-base sm:text-xl md:text-2xl font-bold text-neutral-900 font-mono leading-tight mt-0.5 truncate">
              {totalOrders}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
