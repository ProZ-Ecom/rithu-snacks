"use client";

import * as React from "react";
import Image from "next/image";
import { FormModal } from "@/components/common/FormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Tag,
  Clock,
} from "lucide-react";
import type { AdminCustomerListItemDto } from "../types/admin-customer.types";

interface CustomerDetailModalProps {
  customer: AdminCustomerListItemDto | null;
  open: boolean;
  onClose: () => void;
}

export function CustomerDetailModal({
  customer,
  open,
  onClose,
}: CustomerDetailModalProps) {
  if (!customer) return null;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (
    status: string,
    isBlocked?: boolean,
    isActive?: boolean
  ) => {
    if (
      isBlocked ||
      isActive === false ||
      status?.toLowerCase() === "banned" ||
      status?.toLowerCase() === "inactive"
    ) {
      return <Badge variant="destructive">Blocked</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Customer Profile Details"
      description="Comprehensive customer account and profile information"
      size="lg"
    >
      <div className="space-y-6">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-xl bg-neutral-50 p-4 border border-neutral-200">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-sm bg-primary-100 flex items-center justify-center flex-shrink-0">
            {customer.profileImage ? (
              <Image
                src={customer.profileImage}
                alt={customer.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-primary-700">
                {customer.name?.charAt(0)?.toUpperCase() || "C"}
              </span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  {customer.name || "Customer"}
                </h3>
                <p className="text-xs text-neutral-500">
                  ID: {customer.customerId || customer.id || "-"}
                </p>
              </div>
              <div className="flex items-center gap-2 justify-center sm:justify-end">
                {getStatusBadge(
                  customer.status,
                  customer.isBlocked,
                  customer.isActive
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="rounded-xl border border-neutral-200 p-3 bg-white flex items-center gap-2.5">
            {customer.isActive ? (
              <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-neutral-400 shrink-0" />
            )}
            <div>
              <p className="text-xs text-neutral-500">Account</p>
              <p className="text-xs font-semibold text-neutral-900">
                {customer.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3 bg-white flex items-center gap-2.5">
            {customer.emailVerified ? (
              <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-neutral-400 shrink-0" />
            )}
            <div>
              <p className="text-xs text-neutral-500">Email</p>
              <p className="text-xs font-semibold text-neutral-900">
                {customer.emailVerified ? "Verified" : "Unverified"}
              </p>
            </div>
          </div>

          {/* <div className="rounded-xl border border-neutral-200 p-3 bg-white flex items-center gap-2.5">
            {customer.phoneVerified ? (
              <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-neutral-400 shrink-0" />
            )}
            <div>
              <p className="text-xs text-neutral-500">Phone</p>
              <p className="text-xs font-semibold text-neutral-900">
                {customer.phoneVerified ? "Verified" : "Unverified"}
              </p>
            </div>
          </div> */}

          <div className="rounded-xl border border-neutral-200 p-3 bg-white flex items-center gap-2.5">
            {customer.isWhatsapp ? (
              <MessageSquare className="h-5 w-5 text-success-600 shrink-0" />
            ) : (
              <MessageSquare className="h-5 w-5 text-neutral-400 shrink-0" />
            )}
            <div>
              <p className="text-xs text-neutral-500">WhatsApp</p>
              <p className="text-xs font-semibold text-neutral-900">
                {customer.isWhatsapp ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Personal Details */}
        <div className="rounded-xl border border-neutral-200 p-4 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Contact & Profile Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Email Address</p>
                <p className="font-medium text-neutral-900">
                  {customer.email || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Phone Number</p>
                <p className="font-medium text-neutral-900">
                  {customer.phone || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">WhatsApp Number</p>
                <p className="font-medium text-neutral-900">
                  {customer.whatsappNo || customer.phone || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Gender</p>
                <p className="font-medium text-neutral-900 capitalize">
                  {customer.gender || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Date of Birth</p>
                <p className="font-medium text-neutral-900">
                  {customer.dob || "-"}
                </p>
              </div>
            </div>

            {/* <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Referral Code</p>
                <p className="font-medium text-neutral-900 font-mono">
                  {customer.referralCode || "-"}
                </p>
              </div>
            </div> */}
          </div>
        </div>

        {/* Timestamps */}
        <div className="rounded-xl border border-neutral-200 p-4 space-y-3 bg-neutral-50/50">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Account Activity Timestamps
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <div>
                <p className="text-neutral-500">Registered</p>
                <p className="font-medium text-neutral-800">
                  {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <div>
                <p className="text-neutral-500">Last Login</p>
                <p className="font-medium text-neutral-800">
                  {customer.lastLoginAt ? formatDate(customer.lastLoginAt) : "Never"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <div>
                <p className="text-neutral-500">Profile Updated</p>
                <p className="font-medium text-neutral-800">
                  {formatDate(customer.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
