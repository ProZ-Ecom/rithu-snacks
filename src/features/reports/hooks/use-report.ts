"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "@/lib/api/api-client";
import { DEFAULT_PRESET, presetRange } from "../components/report-ui";
import type { ReportOptions } from "../services/report-options.service";

/** Filter keys the server never sees - `preset` only drives the UI. */
const CLIENT_ONLY = new Set(["preset"]);

export function initialFilters(extra: Record<string, string> = {}): Record<string, string> {
  return { preset: DEFAULT_PRESET, ...presetRange(DEFAULT_PRESET), ...extra };
}

/**
 * One hook per report page: holds the filter state, turns it into a query string
 * and fetches. Filters are applied immediately - every control is a picker, so
 * there is no half-typed state to guard against.
 */
export function useReport<T>(path: string, extraDefaults: Record<string, string> = {}) {
  const [filters, setFilters] = useState<Record<string, string>>(() => initialFilters(extraDefaults));

  const query = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && !CLIENT_ONLY.has(key)) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [filters]);

  const result = useQuery({
    queryKey: ["report", path, query],
    queryFn: async () => (await apiClient.get<T>(`${path}${query}`)).data as T,
    staleTime: 30_000,
  });

  return { filters, setFilters, query, ...result };
}

export function useReportOptions() {
  return useQuery({
    queryKey: ["report-options"],
    queryFn: async () => (await apiClient.get<ReportOptions>("/api/admin/reports/options")).data as ReportOptions,
    staleTime: 5 * 60_000,
  });
}

export function reportErrorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ApiClientError) {
    return err.errors?.length ? `${err.message}: ${err.errors.join(", ")}` : err.message;
  }
  return err instanceof Error ? err.message : fallback;
}
