"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Building2, Upload, Loader2, Save, MapPin, FileText, Globe, Mail, Phone } from "lucide-react";
import { useCompany, useUpdateCompany, useUploadCompanyLogo } from "../hooks/use-company";
import { Button, Input, Card, Switch, Skeleton, Textarea, Select } from "@/components/ui";
import { getImageUrl } from "@/lib/utils";
import type { UpdateCompanyInput } from "../types";
import { usePincodeLookup } from "@/lib/pincode";

export function CompanySettingsForm() {
  const { data: company, isLoading } = useCompany();
  const updateMutation = useUpdateCompany();
  const uploadLogoMutation = useUploadCompanyLogo();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isLoading: isPincodeLoading,
    cityOptions,
    fetchPincode,
  } = usePincodeLookup();

  const [formData, setFormData] = useState<UpdateCompanyInput>({
    companyName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    website: "",
    isActive: true,
  });

  const companyCityOptions = React.useMemo(() => {
    const opts = cityOptions.map((c) => ({ value: c, label: c }));
    if (formData.city && !cityOptions.includes(formData.city)) {
      return [{ value: formData.city, label: formData.city }, ...opts];
    }
    return opts;
  }, [cityOptions, formData.city]);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (company && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setFormData({
        companyName: company.companyName || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        city: company.city || "",
        state: company.state || "",
        country: company.country || "India",
        pincode: company.pincode || "",
        gstNumber: company.gstNumber || "",
        panNumber: company.panNumber || "",
        website: company.website || "",
        isActive: company.isActive ?? true,
      });
      if (company.logo) {
        setLogoPreview(getImageUrl(company.logo));
      }
      if (company.pincode && company.pincode.length === 6) {
        fetchPincode(company.pincode);
      }
    }
  }, [company, fetchPincode]);

  const handleInputChange = (field: keyof UpdateCompanyInput, value: unknown) => {
    if (field === "pincode" && typeof value === "string") {
      const cleanDigits = value.replace(/\D/g, "").slice(0, 6);
      setFormData((prev) => ({ ...prev, pincode: cleanDigits }));

      if (cleanDigits.length === 6) {
        fetchPincode(cleanDigits, (data) => {
          setFormData((prev) => ({
            ...prev,
            state: data.state || prev.state,
            country: data.country || prev.country,
            city: data.cities.includes(prev.city || "")
              ? prev.city
              : data.defaultCity || prev.city,
          }));
        });
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show immediate local preview
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);

    try {
      const res = await uploadLogoMutation.mutateAsync(file);
      if (res.logo) {
        setLogoPreview(getImageUrl(res.logo));
      }
    } catch {
      // If upload failed, revert to existing company logo
      if (company?.logo) {
        setLogoPreview(getImageUrl(company.logo));
      } else {
        setLogoPreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateCompanyInput = {};

    // Helper to compare string fields (handling null vs empty string)
    const getChangedString = (
      newVal: string | undefined | null,
      oldVal: string | undefined | null
    ) => {
      const trimmedNew = (newVal ?? "").trim();
      const trimmedOld = (oldVal ?? "").trim();
      if (trimmedNew !== trimmedOld) {
        return trimmedNew || null;
      }
      return undefined;
    };

    if (formData.companyName !== undefined) {
      const trimmedName = formData.companyName.trim();
      const currentName = (company?.companyName || "").trim();
      if (trimmedName && trimmedName !== currentName) {
        payload.companyName = trimmedName;
      }
    }

    const changedEmail = getChangedString(formData.email, company?.email);
    if (changedEmail !== undefined) payload.email = changedEmail;

    const changedPhone = getChangedString(formData.phone, company?.phone);
    if (changedPhone !== undefined) payload.phone = changedPhone;

    const changedAddress = getChangedString(formData.address, company?.address);
    if (changedAddress !== undefined) payload.address = changedAddress;

    const changedCity = getChangedString(formData.city, company?.city);
    if (changedCity !== undefined) payload.city = changedCity;

    const changedState = getChangedString(formData.state, company?.state);
    if (changedState !== undefined) payload.state = changedState;

    const changedCountry = getChangedString(formData.country, company?.country || "India");
    if (changedCountry !== undefined) payload.country = changedCountry;

    const changedPincode = getChangedString(formData.pincode, company?.pincode);
    if (changedPincode !== undefined) payload.pincode = changedPincode;

    const changedGst = getChangedString(formData.gstNumber, company?.gstNumber);
    if (changedGst !== undefined) payload.gstNumber = changedGst;

    const changedPan = getChangedString(formData.panNumber, company?.panNumber);
    if (changedPan !== undefined) payload.panNumber = changedPan;

    const changedWebsite = getChangedString(formData.website, company?.website);
    if (changedWebsite !== undefined) payload.website = changedWebsite;

    if (
      formData.isActive !== undefined &&
      company?.isActive !== undefined &&
      Boolean(formData.isActive) !== Boolean(company.isActive)
    ) {
      payload.isActive = Boolean(formData.isActive);
    }

    // If no fields changed, avoid sending an empty/redundant network request
    if (Object.keys(payload).length === 0) {
      return;
    }

    await updateMutation.mutateAsync(payload);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const isSaving = updateMutation.isPending || uploadLogoMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mx-auto pb-12">
      {/* 1. General Profile & Logo */}
      <Card className="p-6 border border-neutral-200 shadow-sm rounded-xl bg-white space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="p-2 rounded-lg bg-secondary-50 text-secondary-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">General Information</h2>
            <p className="text-sm text-neutral-500">
              Basic company details displayed across customer receipts, footer, and branding.
            </p>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
          <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center overflow-hidden flex-shrink-0 group">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Company Logo"
                fill
                sizes="96px"
                className="object-contain p-2"
              />
            ) : (
              <Building2 className="w-8 h-8 text-neutral-400" />
            )}
            {uploadLogoMutation.isPending && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-800">Company Logo</h3>
            <p className="text-xs text-neutral-500">
              Recommended format: PNG or SVG with transparent background (Max 2MB).
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoSelect}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadLogoMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              {uploadLogoMutation.isPending ? "Uploading..." : "Upload Logo"}
            </Button>
          </div>
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-neutral-700">Company Name *</label>
            <Input
              required
              value={formData.companyName || ""}
              onChange={(e) => handleInputChange("companyName", e.target.value)}
              placeholder="Enter your company name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-neutral-400" />
              Primary Email
            </label>
            <Input
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter your email address"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-neutral-400" />
              Primary Phone / WhatsApp
            </label>
            <Input
              value={formData.phone || ""}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-neutral-700 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-neutral-400" />
              Website URL
            </label>
            <Input
              type="url"
              value={formData.website || ""}
              onChange={(e) => handleInputChange("website", e.target.value)}
              placeholder="Enter your website URL"
            />
          </div>
        </div>
      </Card>

      {/* 2. Address & Location */}
      <Card className="p-6 border border-neutral-200 shadow-sm rounded-xl bg-white space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="p-2 rounded-lg bg-secondary-50 text-secondary-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Address & Location</h2>
            <p className="text-sm text-neutral-500">
              Registered business location displayed on storefront maps and invoice headers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-neutral-700">Street Address</label>
            <Textarea
              rows={2}
              value={formData.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter your street address"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 flex items-center justify-between">
              <span>PIN Code</span>
              {isPincodeLoading && (
                <span className="text-xs text-primary font-normal flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Fetching area...
                </span>
              )}
            </label>
            <Input
              value={formData.pincode || ""}
              onChange={(e) => handleInputChange("pincode", e.target.value)}
              placeholder="Enter your PIN code"
              maxLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 flex items-center justify-between">
              <span>City / Area</span>
              {cityOptions.length > 0 && (
                <span className="text-xs text-neutral-500 font-normal">
                  ({cityOptions.length} areas found)
                </span>
              )}
            </label>
            {cityOptions.length > 0 ? (
              <Select
                value={formData.city || ""}
                onValueChange={(val) => handleInputChange("city", val)}
                options={companyCityOptions}
                placeholder="Select City / Area"
                className="bg-white border-neutral-200"
              />
            ) : (
              <Input
                value={formData.city || ""}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder="Enter your city"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">State</label>
            <Input
              value={formData.state || ""}
              onChange={(e) => handleInputChange("state", e.target.value)}
              placeholder="Enter your state"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Country</label>
            <Input
              value={formData.country ?? ""}
              onChange={(e) => handleInputChange("country", e.target.value)}
              placeholder="Enter your country"
            />
          </div>
        </div>
      </Card>

      {/* 3. Tax & Legal Compliance */}
      <Card className="p-6 border border-neutral-200 shadow-sm rounded-xl bg-white space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="p-2 rounded-lg bg-secondary-50 text-secondary-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Tax & Compliance</h2>
            <p className="text-sm text-neutral-500">
              Tax identification numbers used for GST invoice generation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">GST Number</label>
            <Input
              value={formData.gstNumber || ""}
              onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
              placeholder="Enter your GST number"
              maxLength={15}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">PAN Number</label>
            <Input
              value={formData.panNumber || ""}
              onChange={(e) => handleInputChange("panNumber", e.target.value.toUpperCase())}
              placeholder="Enter your PAN number"
              maxLength={10}
            />
          </div>

          <div className="flex items-center justify-between md:col-span-2 pt-2 border-t border-neutral-100">
            <div>
              <p className="text-sm font-medium text-neutral-800">Active Status</p>
              <p className="text-xs text-neutral-500">Enable or disable active company profile status.</p>
            </div>
            <Switch
              checked={formData.isActive ?? true}
              onCheckedChange={(checked) => handleInputChange("isActive", checked)}
            />
          </div>
        </div>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSaving}
          className="min-w-[140px] gap-2 cursor-pointer bg-secondary-600 hover:bg-secondary-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default CompanySettingsForm;
